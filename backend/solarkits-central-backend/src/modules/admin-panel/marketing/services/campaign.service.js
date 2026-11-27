const {
  MarketingCampaign,
  MarketingUnsubscribe,
  MarketingTrackingLink,
  UtmVisit
} = require('../models');
const emailService = require('./email.service');
const whatsappService = require('./whatsapp.service');
const audienceService = require('./audience.service');
const emailQueueService = require('./emailQueue.service');

/**
 * Derive clean public backend origin for tracking & unsubscribe URLs.
 */
const resolveBackendBaseUrl = () => {
  const rawUnsub = process.env.UNSUBSCRIBE_BASE_URL || '';
  if (rawUnsub) {
    return rawUnsub.replace(/\/api\/(admin\/)?marketing\/unsubscribe.*$/i, '').replace(/\/+$/, '');
  }
  const pub = process.env.BACKEND_PUBLIC_URL || process.env.IPV4 || `http://localhost:${process.env.PORT || 5000}`;
  return String(pub).replace(/\/+$/, '');
};

/**
 * Build full destination URL with UTM parameters.
 */
const buildUtmDestinationUrl = (campaign) => {
  if (campaign.tracking_full_url && campaign.tracking_full_url.includes('utm_')) {
    return campaign.tracking_full_url;
  }
  const base = campaign.destination_url || 'https://solarkits.in';
  const params = new URLSearchParams();
  if (campaign.utm_source) params.set('utm_source', campaign.utm_source);
  if (campaign.utm_medium) params.set('utm_medium', campaign.utm_medium);
  if (campaign.utm_campaign) params.set('utm_campaign', campaign.utm_campaign);
  if (campaign.utm_content) params.set('utm_content', campaign.utm_content);
  if (campaign.utm_term) params.set('utm_term', campaign.utm_term);
  const sep = base.includes('?') ? '&' : '?';
  return params.toString() ? `${base}${sep}${params.toString()}` : base;
};

/**
 * Build WhatsApp Meta template body components dynamically from template placeholders & variables.
 */
const buildWhatsAppComponents = (waTemplate, vars) => {
  const bodyText = waTemplate?.body_text || '';
  const orderedFallback = [
    vars.name || 'Solar Partner',
    vars.kit_name || 'Solar Combo Kit',
    vars.campaign_price || vars.coupon_code || 'Wholesale Price',
    vars.tracking_url || 'https://solarkits.in'
  ];

  // Match {{1}}, {{2}} or named {{name}} tokens in order of appearance
  const tokens = bodyText.match(/\{\{[^}]+\}\}/g) || [];
  if (tokens.length === 0) {
    return [];
  }

  const parameters = tokens.map((rawToken, idx) => {
    const key = rawToken.replace(/[{}]/g, '').trim();
    if (/^\d+$/.test(key)) {
      const nIdx = parseInt(key, 10) - 1;
      return { type: 'text', text: String(orderedFallback[nIdx] || orderedFallback[idx] || 'SolarKits') };
    }
    const mapped = vars[key] || orderedFallback[idx] || '';
    return { type: 'text', text: String(mapped || 'SolarKits') };
  });

  return [{ type: 'body', parameters }];
};

/**
 * Atomic Campaign Launch Execution (supports initial launch and resume from paused).
 */
const launchCampaign = async (campaignId) => {
  const campaign = await MarketingCampaign.findOneAndUpdate(
    { _id: campaignId, status: { $in: ['draft', 'scheduled', 'paused'] } },
    {
      $set: {
        status: 'running',
        start_date: new Date(),
        paused_at: null,
        last_error: null
      }
    },
    { new: true }
  )
    .populate('email_template_id')
    .populate('whatsapp_template_id')
    .populate('email_sender_id')
    .populate('whatsapp_sender_id');

  if (!campaign) {
    throw new Error('Campaign not found or is already running/completed/cancelled.');
  }

  const alreadySentKeys = new Set();
  for (const r of campaign.recipients || []) {
    if (['sent', 'delivered', 'read', 'opened', 'clicked', 'converted'].includes(r.status)) {
      const k = String(r.epc_id || r.lead_id || r.email || r.phone || r._id);
      alreadySentKeys.add(k);
    }
  }

  // Refresh audience when empty or explicitly requested (preserving already-sent statuses on resume)
  if (!campaign.recipients || campaign.recipients.length === 0 || (campaign.audience_refresh_on_send && alreadySentKeys.size === 0)) {
    const audience = await audienceService.resolveAudience({
      epc_groups: campaign.epc_groups,
      exclude_groups: campaign.exclude_groups,
      epc_types: campaign.epc_types,
      area_type: campaign.area_type,
      state_ids: campaign.state_ids,
      state_names: campaign.state_names,
      cluster_ids: campaign.cluster_ids,
      cluster_names: campaign.cluster_names,
      district_ids: campaign.district_ids,
      warehouse_ids: campaign.warehouse_ids,
      purchase_activity: campaign.purchase_activity,
      last_order_days: campaign.last_order_days,
      channel: campaign.campaign_type,
      industry_ids: campaign.industry_ids || [],
      kit_ids: campaign.kit_ids || [],
      subcategory_ids: campaign.subcategory_ids || [],
      include_imported_leads: campaign.include_imported_leads !== false,
      require_consent: campaign.require_consent !== false
    });

    campaign.recipients = audience.recipients.map((r) => ({
      epc_id: r.epc_id || null,
      lead_id: r.lead_id || null,
      source_type: r.source_type || 'epc_account',
      name: r.name,
      phone: r.phone,
      email: r.email,
      channel: campaign.campaign_type,
      status: 'queued'
    }));
    campaign.total_recipients = campaign.recipients.length;
    await campaign.save();
  }

  // Filter indices needing dispatch (queued or retrying failed when relaunched)
  const pendingIndices = [];
  campaign.recipients.forEach((r, idx) => {
    if (r.status === 'queued') {
      pendingIndices.push(idx);
    }
  });

  if (pendingIndices.length === 0) {
    const message =
      campaign.total_recipients === 0
        ? 'No eligible consented recipients matched this campaign audience.'
        : 'All recipients in this campaign have already been processed.';
    await MarketingCampaign.findByIdAndUpdate(campaign._id, {
      $set: {
        status: 'completed',
        end_date: new Date(),
        last_error: campaign.total_recipients === 0 ? message : null
      }
    });
    return {
      success: true,
      message,
      total_recipients: campaign.total_recipients,
      queued_for_dispatch: 0
    };
  }

  await enqueueCampaignDispatch(campaign, pendingIndices);

  return {
    success: true,
    message: `Campaign "${campaign.campaign_name}" launched (${pendingIndices.length} recipients queued).`,
    total_recipients: campaign.total_recipients,
    queued_for_dispatch: pendingIndices.length
  };
};

/**
 * Enqueue per-recipient campaign dispatch tasks into the unified sequential queue.
 */
const enqueueCampaignDispatch = async (campaign, pendingIndices) => {
  const campaignId = String(campaign._id);
  const emailTemplate = campaign.email_template_id;
  const waTemplate = campaign.whatsapp_template_id;
  const channel = campaign.campaign_type || 'both';
  const backendBase = resolveBackendBaseUrl();
  const fullDestinationUrl = buildUtmDestinationUrl(campaign);
  const shortTrackingUrl = campaign.tracking_short_code
    ? `${backendBase}/api/marketing/t/${campaign.tracking_short_code}`
    : fullDestinationUrl;

  const unsubRecords = await MarketingUnsubscribe.find({ is_active: true }).select('email phone').lean().catch(() => []);
  const unsubEmailSet = new Set(unsubRecords.filter((u) => u.email).map((u) => u.email.toLowerCase().trim()));
  const unsubPhoneSet = new Set(unsubRecords.filter((u) => u.phone).map((u) => String(u.phone).replace(/\D/g, '').slice(-10)));

  let remainingJobs = pendingIndices.length;

  const finalizeBatchIfDone = async () => {
    remainingJobs--;
    if (remainingJobs > 0) return;

    const latest = await MarketingCampaign.findById(campaign._id).lean();
    if (!latest) return;

    const recipients = latest.recipients || [];
    const summary = {
      email_sent: recipients.filter((r) => Boolean(r.email_message_id)).length,
      email_failed: recipients.filter((r) => (r.channel === 'email' || r.channel === 'both') && r.status === 'failed' && !r.email_message_id).length,
      wa_sent: recipients.filter((r) => Boolean(r.wa_message_id)).length,
      wa_failed: recipients.filter((r) => (r.channel === 'whatsapp' || r.channel === 'both') && r.status === 'failed' && !r.wa_message_id).length,
      skipped_unsubscribed: recipients.filter((r) => r.status === 'unsubscribed' || r.status === 'skipped_unsubscribed').length
    };

    const totalSent = recipients.filter((r) => ['sent', 'delivered', 'read', 'opened', 'clicked', 'converted'].includes(r.status)).length;
    const totalFailed = recipients.filter((r) => r.status === 'failed').length;
    const lastFailedRec = [...recipients].reverse().find((r) => r.status === 'failed' && r.error_message);

    const updateSet = {
      'stats.messages_sent': totalSent,
      'stats.failed': totalFailed,
      'stats.unsubscribed': summary.skipped_unsubscribed,
      delivery_summary: summary,
      last_error: lastFailedRec ? lastFailedRec.error_message : null
    };

    // Only transition to completed if admin did not pause or cancel mid-run
    if (latest.status === 'running') {
      updateSet.status = 'completed';
      updateSet.end_date = new Date();
    }

    await MarketingCampaign.findByIdAndUpdate(campaign._id, { $set: updateSet });
    console.log(`✅ [CAMPAIGN] "${campaign.campaign_name}" batch finished. Sent: ${totalSent}, Failed: ${totalFailed}, Unsubscribed: ${summary.skipped_unsubscribed}`);
  };

  const jobs = pendingIndices.map((recIdx) => {
    const recipient = campaign.recipients[recIdx];
    return {
      campaignId,
      to: recipient.email || recipient.phone,
      phone: recipient.phone,
      maxRetries: 1,
      run: async (job) => {
        // Check mid-batch Pause / Cancel status directly from MongoDB
        const liveState = await MarketingCampaign.findById(campaign._id).select('status').lean();
        if (!liveState || ['paused', 'cancelled'].includes(liveState.status)) {
          emailQueueService.clearCampaignJobs(campaign._id);
          return { cancelled: true };
        }

        const cleanEmail = (recipient.email || '').toLowerCase().trim();
        const cleanPhone10 = String(recipient.phone || '').replace(/\D/g, '').slice(-10);

        if ((cleanEmail && unsubEmailSet.has(cleanEmail)) || (cleanPhone10 && unsubPhoneSet.has(cleanPhone10))) {
          await MarketingCampaign.updateOne(
            { _id: campaign._id, 'recipients._id': recipient._id },
            {
              $set: {
                'recipients.$.status': 'unsubscribed',
                'recipients.$.error_message': 'Recipient is on the marketing opt-out / suppression list'
              }
            }
          );
          return { skipped: true };
        }

        const unsubsUrl = `${backendBase}/api/marketing/unsubscribe?email=${encodeURIComponent(cleanEmail)}&c=${campaign._id}`;
        const vars = {
          name: recipient.name || 'Solar Partner',
          company: recipient.name || 'Solar Partner EPC',
          company_name: recipient.name || 'Solar Partner EPC',
          kit_name: campaign.kit_category || 'Solar Combo Kit',
          campaign_price: campaign.campaign_price ? `₹${Number(campaign.campaign_price).toLocaleString('en-IN')}` : '',
          price: campaign.campaign_price ? `₹${Number(campaign.campaign_price).toLocaleString('en-IN')}` : '',
          coupon_code: campaign.coupon_code || '',
          warehouse_name: (campaign.warehouse_names && campaign.warehouse_names[0]) || 'Regional Warehouse',
          tracking_url: shortTrackingUrl,
          destination_url: fullDestinationUrl,
          unsubscribe_url: unsubsUrl
        };

        let emailRes = null;
        let waRes = null;

        if ((channel === 'email' || channel === 'both') && cleanEmail) {
          const subject = campaign.email_subject_override || emailTemplate?.subject || campaign.campaign_name;
          const html =
            campaign.email_html_override ||
            emailTemplate?.html_content ||
            `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;"><h2>${campaign.campaign_name}</h2><p>Hello {{name}},</p><p>Explore our latest B2B offer on <strong>{{kit_name}}</strong>.</p><p><a href="{{tracking_url}}" style="display:inline-block;padding:12px 20px;background:#263880;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View Offer Details</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/><p style="font-size:12px;color:#64748b;"><a href="{{unsubscribe_url}}">Unsubscribe from marketing emails</a></p></div>`;

          emailRes = await emailService.sendEmail({
            senderId: campaign.email_sender_id?._id || campaign.email_sender_id,
            purpose: campaign.purpose || 'marketing',
            to: cleanEmail,
            subject,
            htmlContent: html,
            variables: vars,
            trackingUrl: shortTrackingUrl,
            unsubscribeUrl: unsubsUrl,
            campaignId: campaign._id,
            templateId: emailTemplate?._id || null,
            epcId: recipient.epc_id || null,
            leadId: recipient.lead_id || null,
            recipientName: recipient.name,
            sourceType: 'campaign',
            jobId: job.id,
            attempt: job.retryCount + 1
          });
        }

        if ((channel === 'whatsapp' || channel === 'both') && cleanPhone10.length >= 10) {
          if (waTemplate?.wa_template_name) {
            waRes = await whatsappService.sendTemplateMessage({
              senderId: campaign.whatsapp_sender_id?._id || campaign.whatsapp_sender_id,
              to: recipient.phone,
              templateName: waTemplate.wa_template_name,
              language: waTemplate.language || 'en',
              components: buildWhatsAppComponents(waTemplate, vars),
              campaignId: campaign._id,
              templateId: waTemplate._id,
              epcId: recipient.epc_id || null,
              leadId: recipient.lead_id || null,
              recipientName: recipient.name,
              sourceType: 'campaign',
              jobId: job.id,
              attempt: job.retryCount + 1
            });
          } else {
            const msgBody = emailService.interpolate(
              campaign.whatsapp_body_override || waTemplate?.body_text || `Hello {{name}}, check out {{kit_name}} on SolarKits: {{tracking_url}}`,
              vars
            );
            waRes = await whatsappService.sendTextMessage({
              senderId: campaign.whatsapp_sender_id?._id || campaign.whatsapp_sender_id,
              to: recipient.phone,
              text: msgBody,
              campaignId: campaign._id,
              epcId: recipient.epc_id || null,
              leadId: recipient.lead_id || null,
              recipientName: recipient.name,
              sourceType: 'campaign'
            });
          }
        }

        const emailOk = Boolean(emailRes?.success);
        const waOk = Boolean(waRes?.success);
        const errors = [];
        if (emailRes && !emailRes.success) errors.push(`Email (${emailRes.provider || 'config'}): ${emailRes.error}`);
        if (waRes && !waRes.success) errors.push(`WhatsApp (${waRes.provider || 'config'}): ${waRes.error}`);
        if (!emailRes && !waRes) errors.push(`No valid contact channel (${channel}) for recipient.`);

        if (emailOk || waOk) {
          await MarketingCampaign.updateOne(
            { _id: campaign._id, 'recipients._id': recipient._id },
            {
              $set: {
                'recipients.$.status': 'sent',
                'recipients.$.sent_at': new Date(),
                'recipients.$.email_provider': emailOk ? emailRes.provider : null,
                'recipients.$.wa_provider': waOk ? waRes.provider : null,
                'recipients.$.email_message_id': emailOk ? emailRes.messageId : null,
                'recipients.$.wa_message_id': waOk ? waRes.messageId : null,
                'recipients.$.error_message': errors.length > 0 ? errors.join(' | ') : null
              }
            }
          );
          return { success: true, provider: emailOk ? emailRes.provider : waRes.provider };
        }

        const errMessage = errors.join(' | ');
        const errCode = emailRes?.errorCode || waRes?.errorCode || 'DELIVERY_FAILED';
        await MarketingCampaign.updateOne(
          { _id: campaign._id, 'recipients._id': recipient._id },
          {
            $set: {
              'recipients.$.status': 'failed',
              'recipients.$.error_code': errCode,
              'recipients.$.error_message': errMessage
            }
          }
        );

        return {
          success: false,
          provider: emailRes?.provider || waRes?.provider || null,
          errorCode: errCode,
          error: errMessage
        };
      },
      onComplete: finalizeBatchIfDone
    };
  });

  await emailQueueService.enqueue(jobs);
};

/**
 * Handle Short URL redirection and click attribution for both Campaigns and standalone Tracking Links.
 */
const handleShortUrlClick = async (shortCode, req) => {
  const campaign = await MarketingCampaign.findOne({ tracking_short_code: shortCode });
  if (campaign) {
    await UtmVisit.create({
      campaign_id: campaign._id,
      short_code: shortCode,
      utm_source: campaign.utm_source,
      utm_medium: campaign.utm_medium,
      utm_campaign: campaign.utm_campaign,
      utm_content: campaign.utm_content,
      utm_term: campaign.utm_term,
      landing_url: campaign.destination_url || 'https://solarkits.in',
      referrer: req.headers['referer'] || null,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers['user-agent'] || null
    }).catch((e) => console.warn('UTM log warning:', e.message));

    await MarketingCampaign.findByIdAndUpdate(campaign._id, {
      $inc: { 'stats.link_clicks': 1, 'stats.website_visits': 1 }
    });

    return { redirectUrl: buildUtmDestinationUrl(campaign) };
  }

  const standaloneLink = await MarketingTrackingLink.findOne({ short_code: shortCode, is_active: true });
  if (standaloneLink) {
    await UtmVisit.create({
      campaign_id: standaloneLink.campaign_id || null,
      short_code: shortCode,
      utm_source: standaloneLink.utm_source,
      utm_medium: standaloneLink.utm_medium,
      utm_campaign: standaloneLink.utm_campaign,
      utm_content: standaloneLink.utm_content,
      utm_term: standaloneLink.utm_term,
      landing_url: standaloneLink.full_url || standaloneLink.base_url || 'https://solarkits.in',
      referrer: req.headers['referer'] || null,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers['user-agent'] || null
    }).catch((e) => console.warn('UTM standalone link log warning:', e.message));

    await MarketingTrackingLink.findByIdAndUpdate(standaloneLink._id, {
      $inc: { clicks: 1 },
      $set: { last_clicked_at: new Date() }
    });

    if (standaloneLink.campaign_id) {
      await MarketingCampaign.findByIdAndUpdate(standaloneLink.campaign_id, {
        $inc: { 'stats.link_clicks': 1, 'stats.website_visits': 1 }
      });
    }

    return { redirectUrl: standaloneLink.full_url || standaloneLink.base_url || 'https://solarkits.in' };
  }

  return { redirectUrl: 'https://solarkits.in' };
};

module.exports = {
  resolveBackendBaseUrl,
  buildUtmDestinationUrl,
  launchCampaign,
  handleShortUrlClick
};
