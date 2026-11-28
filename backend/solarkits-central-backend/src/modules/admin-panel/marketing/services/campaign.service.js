const mongoose = require('mongoose');
const axios = require('axios');
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
const { resolveWebsiteInfo } = require('../constants/websiteRegistry');
const { normalizePagePath } = require('./webTelemetry.service');
const { sendAdminNotification } = require('../../services/admin.notification.service');
const { signTrackingPayload, verifyTrackingSignature } = require('../utils/crypto.util');

/**
 * Derive clean public backend origin for tracking & unsubscribe URLs.
 */
const isLocalOrigin = (urlStr = '') => /:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(String(urlStr || ''));

const resolveBackendBaseUrl = (req = null) => {
  const explicitPub = String(process.env.BACKEND_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  const renderUrl = String(process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');
  const rawUnsub = String(process.env.UNSUBSCRIBE_BASE_URL || '')
    .replace(/\/api\/(admin\/)?marketing\/unsubscribe.*$/i, '')
    .trim()
    .replace(/\/+$/, '');
  const reqHost = req && typeof req.get === 'function' ? req.get('host') : '';
  const reqProto = req?.headers?.['x-forwarded-proto']?.split(',')[0]?.trim() || req?.protocol || 'https';
  const reqOrigin = reqHost ? `${reqProto}://${reqHost}`.replace(/\/+$/, '') : '';

  if (explicitPub && !isLocalOrigin(explicitPub)) return explicitPub;
  if (rawUnsub && !isLocalOrigin(rawUnsub)) return rawUnsub;
  if (renderUrl && !isLocalOrigin(renderUrl)) return renderUrl;
  if (reqOrigin && !isLocalOrigin(reqOrigin)) return reqOrigin;
  if (rawUnsub) return rawUnsub;
  if (explicitPub) return explicitPub;

  const fallbackPort = process.env.PORT || 5000;
  const rawIpv4 = process.env.IPV4 ? String(process.env.IPV4).replace(/\/+$/, '') : '';
  const ipv4WithPort = rawIpv4 && !/:\d+$/.test(rawIpv4) ? `${rawIpv4}:${fallbackPort}` : rawIpv4;
  const pub = ipv4WithPort || reqOrigin || `http://localhost:${fallbackPort}`;
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

const PLATFORM_TRACKABLE_HOSTS = new Set([
  'solarkits.in',
  'www.solarkits.in',
  'store.solarkits.in',
  'franchise.solarkits.in',
  'solarkits-solarshop-india.onrender.com',
  'solar-store-9r0g.onrender.com',
  'solarkits-reseller-portal.onrender.com'
]);

const decodeHtmlEntities = (str = '') =>
  String(str)
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .trim();

const extractHtmlAttr = (attrsStr = '', attrName) => {
  const re = new RegExp(`(?:^|\\s)${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = String(attrsStr).match(re);
  return m ? decodeHtmlEntities(m[1] ?? m[2] ?? m[3] ?? '') : '';
};

const isSuspectedPrefetchUa = (ua = '') => {
  const s = String(ua || '').toLowerCase();
  if (!s) return false;
  return (
    s.includes('googleimageproxy') ||
    s.includes('barracuda') ||
    s.includes('mimecast') ||
    s.includes('proofpoint') ||
    s.includes('messagelabs') ||
    s.includes('fireeye') ||
    s.includes('mailscanner') ||
    s.includes('antispam') ||
    s.includes('safelinks') ||
    s.includes('slackbot') ||
    s.includes('facebookexternalhit') ||
    s.includes('linkedinbot') ||
    s.includes('twitterbot')
  );
};

const detectDeviceType = (ua = '') => {
  const s = String(ua || '').toLowerCase();
  if (!s) return 'unknown';
  if (isSuspectedPrefetchUa(s) || /bot|crawler|spider|preview/i.test(s)) return 'bot';
  if (/ipad|tablet|playbook|silk/i.test(s)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(s)) return 'mobile';
  return 'desktop';
};

const appendUtmIfPlatformUrl = (rawUrl, campaign, ctaLabel) => {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const isLocalHostApp = host === 'localhost' && ['5177', '5178', '5179'].includes(parsed.port);
    if (!PLATFORM_TRACKABLE_HOSTS.has(host) && !isLocalHostApp) {
      return parsed.toString();
    }
    if (campaign?.utm_source && !parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', campaign.utm_source);
    }
    if (campaign?.utm_medium && !parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', campaign.utm_medium || 'email');
    }
    if (campaign?.utm_campaign && !parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', campaign.utm_campaign);
    }
    if (ctaLabel && !parsed.searchParams.has('utm_content')) {
      parsed.searchParams.set('utm_content', ctaLabel.slice(0, 80));
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

const buildTrackedSignaturePayload = ({ cid, rid, slot, cta, dest, dl, t }) =>
  `${cid || ''}|${rid || ''}|${slot || ''}|${cta || ''}|${dest || ''}|${dl ? '1' : '0'}|${t ? '1' : '0'}`;

const buildTrackedCtaUrl = ({
  backendBase,
  destUrl,
  ctaLabel,
  ctaSlot,
  campaignId,
  recipientId,
  isPdf = false,
  isTest = false
}) => {
  const cidStr = campaignId ? String(campaignId) : isTest ? 'test' : '';
  const ridStr = recipientId ? String(recipientId) : '';
  const slotStr = String(ctaSlot || 'link').slice(0, 60);
  const labelStr = String(ctaLabel || 'Action Link').slice(0, 120);
  const safeDest = String(destUrl || 'https://solarkits.in').slice(0, 1800);
  const sig = signTrackingPayload(
    buildTrackedSignaturePayload({
      cid: cidStr,
      rid: ridStr,
      slot: slotStr,
      cta: labelStr,
      dest: safeDest,
      dl: isPdf,
      t: isTest
    })
  );

  const params = new URLSearchParams();
  if (cidStr) params.set('cid', cidStr);
  if (ridStr) params.set('rid', ridStr);
  params.set('slot', slotStr);
  params.set('cta', labelStr);
  params.set('dest', safeDest);
  if (isPdf) params.set('dl', '1');
  if (isTest) params.set('t', '1');
  params.set('sig', sig);

  return `${backendBase}/api/marketing/c/click?${params.toString()}`;
};

/**
 * Interpolate email HTML variables and rewrite trackable links into signed per-CTA analytics URLs.
 */
const prepareEmailHtmlWithTracking = (
  rawHtml,
  {
    variables = {},
    campaign = null,
    campaignId = null,
    recipientId = null,
    backendBase = resolveBackendBaseUrl(),
    fullDestinationUrl = null,
    isTest = false
  } = {}
) => {
  const interpolated = emailService.interpolate(rawHtml || '', variables);
  const shortCode = campaign?.tracking_short_code || '';
  let linkCounter = 0;

  return interpolated.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (fullMatch, attrsStr, innerHtml) => {
    const rawHref = extractHtmlAttr(attrsStr, 'href');
    if (!rawHref) return fullMatch;

    const trimmedHref = rawHref.trim();
    if (
      !trimmedHref ||
      trimmedHref.startsWith('#') ||
      /^mailto:/i.test(trimmedHref) ||
      /^tel:/i.test(trimmedHref) ||
      trimmedHref.includes('/marketing/unsubscribe') ||
      trimmedHref.includes('/marketing/c/')
    ) {
      return fullMatch;
    }

    if (!/^https?:\/\//i.test(trimmedHref)) {
      return fullMatch;
    }

    linkCounter += 1;

    let resolvedDest = trimmedHref;
    if (shortCode && trimmedHref.includes(`/marketing/t/${shortCode}`)) {
      resolvedDest = fullDestinationUrl || (campaign ? buildUtmDestinationUrl(campaign) : 'https://solarkits.in');
    }

    const explicitLabel = extractHtmlAttr(attrsStr, 'data-cta-label');
    const explicitSlot = extractHtmlAttr(attrsStr, 'data-cta-slot');
    const explicitDl = extractHtmlAttr(attrsStr, 'data-cta-dl');

    let extractedLabel = explicitLabel;
    if (!extractedLabel) {
      const stripped = decodeHtmlEntities(
        String(innerHtml || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
      );
      if (stripped) {
        extractedLabel = stripped;
      } else {
        const imgAlt = extractHtmlAttr(innerHtml || '', 'alt');
        if (imgAlt) {
          extractedLabel = imgAlt;
        } else {
          try {
            const u = new URL(resolvedDest);
            extractedLabel = u.pathname && u.pathname !== '/' ? `${u.hostname}${u.pathname}` : u.hostname;
          } catch {
            extractedLabel = `Link #${linkCounter}`;
          }
        }
      }
    }

    const ctaSlot = explicitSlot || `link_${linkCounter}`;
    const isPdf = explicitDl === '1' || /\.pdf(\?|$)/i.test(resolvedDest);
    const enrichedDest = isPdf ? resolvedDest : appendUtmIfPlatformUrl(resolvedDest, campaign, extractedLabel);

    const trackedHref = buildTrackedCtaUrl({
      backendBase,
      destUrl: enrichedDest,
      ctaLabel: extractedLabel,
      ctaSlot,
      campaignId: campaignId || campaign?._id || null,
      recipientId,
      isPdf,
      isTest
    });

    const cleanedAttrs = attrsStr
      .replace(/\sdata-cta-(?:label|slot|dl)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(\bhref\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `$1"${trackedHref}"`);

    return `<a${cleanedAttrs}>${innerHtml}</a>`;
  });
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
const launchCampaign = async (campaignId, options = {}) => {
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
      cluster_codes: campaign.cluster_codes,
      district_ids: campaign.district_ids,
      district_names: campaign.district_names,
      warehouse_ids: campaign.warehouse_ids,
      warehouse_names: campaign.warehouse_names,
      location_basis: campaign.location_basis,
      purchase_activity: campaign.purchase_activity,
      last_order_days_condition: campaign.last_order_days_condition,
      last_order_days: campaign.last_order_days,
      channel: campaign.campaign_type,
      industry_ids: campaign.industry_ids || [],
      kit_ids: Array.isArray(campaign.audience_kit_ids) ? campaign.audience_kit_ids : [],
      subcategory_ids: campaign.subcategory_ids || [],
      include_imported_leads: campaign.include_imported_leads !== false,
      lead_sources: Array.isArray(campaign.lead_sources) ? campaign.lead_sources : [],
      require_consent: campaign.require_consent !== false,
      selected_recipient_emails: campaign.selected_recipient_emails || [],
      segment_ids: campaign.segment_ids || [],
      segment_state_filter: campaign.segment_state_filter || '',
      segment_district_filter: campaign.segment_district_filter || ''
    });

    campaign.recipients = audience.recipients.map((r) => ({
      epc_id: r.epc_id || null,
      lead_id: r.lead_id || null,
      segment_id: r.segment_id || null,
      segment_contact_id: r.segment_contact_id || null,
      custom_fields: r.custom_fields || {},
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

  await enqueueCampaignDispatch(campaign, pendingIndices, options);

  sendAdminNotification({
    title: `EPC Campaign Started: ${campaign.campaign_name}`,
    message: `Campaign "${campaign.campaign_name}" (${campaign.campaign_code || ''}) is now running for ${pendingIndices.length} recipients.`,
    category: 'marketing',
    priority: 'normal',
    action_url: '/marketing-panel/campaigns',
    metadata: {
      panel: 'epc_marketing',
      event: 'campaign_started',
      campaign_id: String(campaign._id),
      campaign_code: campaign.campaign_code,
      queued: pendingIndices.length
    }
  }).catch(() => { });

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
const enqueueCampaignDispatch = async (campaign, pendingIndices, options = {}) => {
  const campaignId = String(campaign._id);
  const emailTemplate = campaign.email_template_id || (
    (campaign.email_html_content || campaign.email_subject)
      ? {
        subject: campaign.email_subject || campaign.campaign_name,
        html_content: campaign.email_html_content || ''
      }
      : null
  );
  const waTemplate = campaign.whatsapp_template_id;
  const channel = campaign.campaign_type || 'both';
  const backendBase = resolveBackendBaseUrl(options.req || null);
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
    if (latest.status === 'running') {
      sendAdminNotification({
        title: `EPC Campaign Completed: ${campaign.campaign_name}`,
        message: `Campaign "${campaign.campaign_name}" (${campaign.campaign_code || ''}) finished dispatching. Sent: ${totalSent}, Failed: ${totalFailed}, Skipped Opt-Out: ${summary.skipped_unsubscribed}.`,
        category: 'marketing',
        priority: totalFailed > 0 ? 'high' : 'normal',
        action_url: '/marketing-panel/campaigns',
        metadata: {
          panel: 'epc_marketing',
          event: 'campaign_completed',
          campaign_id: String(campaign._id),
          campaign_code: campaign.campaign_code,
          sent: totalSent,
          failed: totalFailed
        }
      }).catch(() => { });
    }
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
        const customFields = (recipient.custom_fields && typeof recipient.custom_fields === 'object')
          ? recipient.custom_fields
          : {};
        const vars = {
          ...customFields,
          name: recipient.name || customFields.name || 'Solar Partner',
          company: customFields.company || customFields.company_name || recipient.name || 'Solar Partner EPC',
          company_name: customFields.company_name || customFields.company || recipient.name || 'Solar Partner EPC',
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
          const rawHtml =
            campaign.email_html_override ||
            emailTemplate?.html_content ||
            `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;"><h2>${campaign.campaign_name}</h2><p>Hello {{name}},</p><p>Explore our latest B2B offer on <strong>{{kit_name}}</strong>.</p><p><a href="{{tracking_url}}" data-cta-label="View Offer Details" data-cta-slot="primary_cta" style="display:inline-block;padding:12px 20px;background:#263880;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View Offer Details</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/><p style="font-size:12px;color:#64748b;"><a href="{{unsubscribe_url}}">Unsubscribe from marketing emails</a></p></div>`;

          const trackedHtml = prepareEmailHtmlWithTracking(rawHtml, {
            variables: vars,
            campaign,
            campaignId: campaign._id,
            recipientId: recipient._id,
            backendBase,
            fullDestinationUrl,
            isTest: false
          });

          emailRes = await emailService.sendEmail({
            senderId: campaign.email_sender_id?._id || campaign.email_sender_id,
            purpose: campaign.purpose || 'marketing',
            to: cleanEmail,
            subject,
            htmlContent: trackedHtml,
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
    const targetUrl = standaloneLink.full_url || standaloneLink.base_url || 'https://solarkits.in';
    const siteInfo = resolveWebsiteInfo({ landing_url: targetUrl });
    await UtmVisit.create({
      campaign_id: standaloneLink.campaign_id || null,
      short_code: shortCode,
      website_key: siteInfo.website_key,
      site_domain: siteInfo.site_domain,
      site_url: siteInfo.site_url,
      utm_source: standaloneLink.utm_source,
      utm_medium: standaloneLink.utm_medium,
      utm_campaign: standaloneLink.utm_campaign,
      utm_content: standaloneLink.utm_content,
      utm_term: standaloneLink.utm_term,
      landing_url: normalizePagePath(targetUrl),
      page_path: normalizePagePath(targetUrl),
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

/**
 * Verify signed per-CTA tracking link, record analytics per CTA button & recipient,
 * and resolve final redirect or forced PDF attachment download.
 */
const recordCtaClick = async (query = {}, req = {}) => {
  const { dest, cta, slot, cid, rid, dl, t, sig } = query;
  const fallback = 'https://solarkits.in';

  let parsedDest = null;
  try {
    parsedDest = new URL(String(dest || ''));
    if (!['http:', 'https:'].includes(parsedDest.protocol)) {
      return { redirectUrl: fallback };
    }
  } catch {
    return { redirectUrl: fallback };
  }

  const sigPayload = buildTrackedSignaturePayload({
    cid: cid ? String(cid) : '',
    rid: rid ? String(rid) : '',
    slot: slot ? String(slot) : '',
    cta: cta ? String(cta) : '',
    dest: String(dest || ''),
    dl: dl === '1',
    t: t === '1'
  });

  if (!verifyTrackingSignature(sigPayload, sig)) {
    return { redirectUrl: fallback };
  }

  const safeDest = parsedDest.toString();
  const isPdfDownload =
    dl === '1' &&
    parsedDest.hostname.toLowerCase() === 'res.cloudinary.com' &&
    /\.pdf$/i.test(parsedDest.pathname);

  let downloadFilename = 'SolarKits_Datasheet.pdf';
  if (isPdfDownload) {
    const rawName = (parsedDest.pathname.split('/').pop() || 'SolarKits_Datasheet.pdf').replace(/[^A-Za-z0-9._-]/g, '_');
    downloadFilename = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;
  }

  if (String(req.method || '').toUpperCase() === 'HEAD') {
    return { headOnly: true, redirectUrl: safeDest };
  }

  const ua = String(req.headers?.['user-agent'] || '');
  const isBotPrefetch = isSuspectedPrefetchUa(ua);
  const deviceType = detectDeviceType(ua);
  const isTest = t === '1' || String(cid || '') === 'test';
  const ctaLabel = String(cta || slot || 'Action Button').trim().slice(0, 140);
  const ctaSlot = String(slot || 'link').trim().slice(0, 80);

  if (!isTest && cid && mongoose.Types.ObjectId.isValid(String(cid))) {
    const campaign = await MarketingCampaign.findById(cid).lean().catch(() => null);
    if (campaign) {
      const recipient =
        rid && mongoose.Types.ObjectId.isValid(String(rid))
          ? (campaign.recipients || []).find((r) => String(r._id) === String(rid)) || null
          : null;
      const siteInfo = resolveWebsiteInfo({ landing_url: safeDest });
      const now = new Date();

      await UtmVisit.create({
        campaign_id: campaign._id,
        recipient_id: recipient?._id || (rid && mongoose.Types.ObjectId.isValid(String(rid)) ? rid : null),
        recipient_name: recipient?.name || null,
        recipient_email: recipient?.email || null,
        recipient_phone: recipient?.phone || null,
        channel: 'email',
        cta_label: ctaLabel,
        cta_slot: ctaSlot,
        target_url: safeDest,
        is_suspected_bot_prefetch: isBotPrefetch,
        is_test_click: false,
        website_key: siteInfo.website_key,
        site_domain: siteInfo.site_domain,
        site_url: siteInfo.site_url,
        utm_source: parsedDest.searchParams.get('utm_source') || campaign.utm_source || 'solarkits_marketing',
        utm_medium: parsedDest.searchParams.get('utm_medium') || campaign.utm_medium || 'email',
        utm_campaign: parsedDest.searchParams.get('utm_campaign') || campaign.utm_campaign || '',
        utm_content: parsedDest.searchParams.get('utm_content') || ctaLabel,
        utm_term: parsedDest.searchParams.get('utm_term') || campaign.utm_term || '',
        landing_url: safeDest,
        page_path: normalizePagePath(safeDest),
        referrer: req.headers?.['referer'] || null,
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: ua || null,
        device_type: deviceType
      }).catch((e) => console.warn('CTA click log warning:', e.message));

      if (!isBotPrefetch) {
        await MarketingCampaign.findByIdAndUpdate(campaign._id, {
          $inc: { 'stats.link_clicks': 1, 'stats.website_visits': 1 }
        }).catch((e) => console.warn('Campaign stats click inc warning:', e.message));

        if (recipient) {
          const keepStatus = ['converted', 'submitted_form', 'visited'].includes(recipient.status);
          await MarketingCampaign.updateOne(
            { _id: campaign._id, 'recipients._id': recipient._id },
            {
              $inc: { 'recipients.$.click_count': 1 },
              $set: {
                'recipients.$.last_clicked_at': now,
                ...(recipient.clicked_at ? {} : { 'recipients.$.clicked_at': now }),
                ...(keepStatus ? {} : { 'recipients.$.status': 'clicked' })
              },
              $push: {
                'recipients.$.cta_clicks': {
                  cta_label: ctaLabel,
                  cta_slot: ctaSlot,
                  target_url: safeDest,
                  device_type: deviceType,
                  clicked_at: now
                }
              }
            }
          ).catch((e) => console.warn('Recipient CTA click update warning:', e.message));
        }
      }
    }
  }

  return {
    redirectUrl: safeDest,
    streamPdfUrl: isPdfDownload ? safeDest : null,
    downloadFilename
  };
};

module.exports = {
  resolveBackendBaseUrl,
  buildUtmDestinationUrl,
  prepareEmailHtmlWithTracking,
  launchCampaign,
  handleShortUrlClick,
  recordCtaClick
};
