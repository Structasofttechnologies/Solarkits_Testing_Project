const { MarketingCampaign, MarketingTemplate, MarketingSender, UtmVisit } = require('../models');
const emailService = require('./email.service');
const whatsappService = require('./whatsapp.service');
const audienceService = require('./audience.service');

/**
 * Atomic Campaign Launch Execution
 */
const launchCampaign = async (campaignId) => {
  // 1. Atomic guard to prevent double-execution
  const campaign = await MarketingCampaign.findOneAndUpdate(
    { _id: campaignId, status: { $in: ['draft', 'scheduled', 'paused'] } },
    { $set: { status: 'running', start_date: new Date() } },
    { new: true }
  )
    .populate('email_template_id')
    .populate('whatsapp_template_id')
    .populate('email_sender_id')
    .populate('whatsapp_sender_id');

  if (!campaign) {
    throw new Error('Campaign not found or already running/completed.');
  }

  // 2. Refresh audience if required and recipients array is empty or refresh enabled
  if (!campaign.recipients || campaign.recipients.length === 0 || campaign.audience_refresh_on_send) {
    const audience = await audienceService.resolveAudience({
      epc_groups: campaign.epc_groups,
      exclude_groups: campaign.exclude_groups,
      area_type: campaign.area_type,
      state_ids: campaign.state_ids,
      district_ids: campaign.district_ids,
      warehouse_ids: campaign.warehouse_ids,
      purchase_activity: campaign.purchase_activity,
      last_order_days: campaign.last_order_days
    });

    campaign.recipients = audience.recipients.map(r => ({
      epc_id: r.epc_id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      channel: campaign.campaign_type,
      status: 'queued'
    }));
    campaign.total_recipients = campaign.recipients.length;
    await campaign.save();
  }

  // 3. Dispatch messages in background (non-blocking for HTTP response)
  dispatchCampaignBatch(campaign).catch(err => {
    console.error(`❌ Background Campaign ${campaignId} dispatch error:`, err);
  });

  return {
    success: true,
    message: `Campaign "${campaign.campaign_name}" launched successfully.`,
    total_recipients: campaign.total_recipients
  };
};

/**
 * Internal worker that processes recipient queue
 */
const dispatchCampaignBatch = async (campaign) => {
  const emailTemplate = campaign.email_template_id;
  const waTemplate = campaign.whatsapp_template_id;
  const channel = campaign.campaign_type; // 'email' | 'whatsapp' | 'both'

  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;

  const trackingBase = campaign.tracking_full_url ||
    `https://solarkits.in?utm_source=${campaign.utm_source}&utm_medium=${campaign.utm_medium}&utm_campaign=${campaign.utm_campaign}&utm_content=${campaign.utm_content}`;

  for (let i = 0; i < campaign.recipients.length; i++) {
    const recipient = campaign.recipients[i];
    let emailSent = false;
    let waSent = false;

    const vars = {
      name: recipient.name || 'Solar Partner',
      company: 'Solar Partner EPC',
      kit_name: campaign.kit_category || 'Solar Commercial Kit',
      campaign_price: campaign.campaign_price ? `₹${campaign.campaign_price.toLocaleString('en-IN')}` : '',
      tracking_url: trackingBase
    };

    // Dispatch Email
    if ((channel === 'email' || channel === 'both') && recipient.email && emailTemplate) {
      const emailRes = await emailService.sendEmail({
        senderId: campaign.email_sender_id?._id,
        to: recipient.email,
        subject: emailTemplate.subject || campaign.campaign_name,
        htmlContent: emailTemplate.html_content || `<p>Hello {{name}}, check out our latest offer on {{kit_name}}: <a href="{{tracking_url}}">View Details</a></p>`,
        variables: vars,
        trackingUrl: trackingBase
      });

      if (emailRes.success) {
        emailSent = true;
        recipient.email_message_id = emailRes.messageId;
      }
    }

    // Dispatch WhatsApp
    if ((channel === 'whatsapp' || channel === 'both') && recipient.phone && waTemplate) {
      const waRes = await whatsappService.sendTemplateMessage({
        senderId: campaign.whatsapp_sender_id?._id,
        to: recipient.phone,
        templateName: waTemplate.wa_template_name || 'solarkits_epc_promo',
        language: waTemplate.language || 'en',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: recipient.name || 'Solar EPC' },
              { type: 'text', text: vars.kit_name },
              { type: 'text', text: vars.campaign_price || 'Best Wholesale Price' }
            ]
          }
        ]
      });

      if (waRes.success) {
        waSent = true;
        recipient.wa_message_id = waRes.messageId;
      }
    }

    if (emailSent || waSent) {
      recipient.status = 'delivered';
      recipient.delivered_at = new Date();
      sentCount++;
      deliveredCount++;
    } else {
      recipient.status = 'failed';
      recipient.error_message = 'Failed to deliver via chosen channel';
      failedCount++;
    }
  }

  // Update Campaign Stats and set status to completed
  campaign.status = 'completed';
  campaign.end_date = new Date();
  campaign.stats.messages_sent = (campaign.stats.messages_sent || 0) + sentCount;
  campaign.stats.delivered = (campaign.stats.delivered || 0) + deliveredCount;
  campaign.stats.failed = (campaign.stats.failed || 0) + failedCount;

  await campaign.save();
  console.log(`✅ Campaign "${campaign.campaign_name}" finished dispatch. Sent: ${sentCount}, Delivered: ${deliveredCount}, Failed: ${failedCount}`);
};

/**
 * Handle Short URL redirection and click attribution
 */
const handleShortUrlClick = async (shortCode, req) => {
  const campaign = await MarketingCampaign.findOne({ tracking_short_code: shortCode });
  if (!campaign) {
    return { redirectUrl: 'https://solarkits.in' };
  }

  // Record UtmVisit
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
  }).catch(e => console.warn('UTM log warning:', e.message));

  // Increment Campaign clicks
  await MarketingCampaign.findByIdAndUpdate(campaign._id, {
    $inc: { 'stats.link_clicks': 1, 'stats.website_visits': 1 }
  });

  // Construct full redirect URL with query params
  const sep = campaign.destination_url?.includes('?') ? '&' : '?';
  const fullTarget = `${campaign.destination_url || 'https://solarkits.in'}${sep}utm_source=${campaign.utm_source}&utm_medium=${campaign.utm_medium}&utm_campaign=${campaign.utm_campaign}&utm_content=${campaign.utm_content}`;

  return { redirectUrl: fullTarget };
};

module.exports = {
  launchCampaign,
  handleShortUrlClick
};
