const axios = require('axios');
const { MarketingSender, MarketingDeliveryLog } = require('../models');
const { decryptSecret } = require('../utils/crypto.util');

const META_BASE_URL = 'https://graph.facebook.com';
const META_VERSION = process.env.META_GRAPH_API_VERSION || 'v19.0';

/**
 * Persist WhatsApp delivery attempt log without crashing dispatch on logging error.
 */
const persistWhatsAppLog = async (payload) => {
  try {
    await MarketingDeliveryLog.create({
      channel: 'whatsapp',
      provider: 'meta_cloud_api',
      dispatched_at: new Date(),
      ...payload
    });
  } catch (err) {
    console.warn('⚠️ [WA_LOG] Failed to persist MarketingDeliveryLog:', err.message);
  }
};

/**
 * Normalize a phone number for Meta WhatsApp Cloud API (digits only, default 91 for 10-digit Indian numbers).
 */
const normalizePhone = (to) => {
  let cleanTo = String(to || '').replace(/[^0-9]/g, '');
  if (cleanTo.length === 10) cleanTo = `91${cleanTo}`;
  return cleanTo;
};

/**
 * Resolve WhatsApp sender credentials from MarketingSender or env vars.
 */
const getWhatsAppSender = async (senderId = null, allowInactive = false) => {
  let sender = null;
  if (senderId) {
    sender = await MarketingSender.findById(senderId).lean();
    if (!sender) {
      return { error: `Selected WhatsApp sender (${senderId}) not found.` };
    }
    if (!allowInactive && sender.status === 'inactive') {
      return { error: `WhatsApp sender "${sender.name || sender.wa_business_name}" is inactive.` };
    }
  } else {
    sender = await MarketingSender.findOne({
      type: 'whatsapp',
      is_default: true,
      status: { $in: ['active', 'connected'] }
    }).lean();
    if (!sender) {
      sender = await MarketingSender.findOne({
        type: 'whatsapp',
        status: { $in: ['active', 'connected'] }
      }).lean();
    }
  }

  const rawPhoneId = sender?.phone_number_id || process.env.META_PHONE_NUMBER_ID || '';
  const rawToken = sender?.meta_access_token || process.env.META_ACCESS_TOKEN || '';

  let accessToken = '';
  try {
    accessToken = rawToken ? decryptSecret(rawToken) : '';
  } catch (err) {
    return { sender, error: err.message };
  }

  const phoneNumberId = String(rawPhoneId || '').trim();
  const hasRealCredentials = Boolean(
    phoneNumberId &&
    accessToken &&
    !phoneNumberId.toLowerCase().startsWith('dummy') &&
    !String(accessToken).toLowerCase().startsWith('dummy')
  );

  return { phoneNumberId, accessToken, hasRealCredentials, sender };
};

/**
 * Verify Meta Cloud API connectivity for a WhatsApp Business Phone Number ID.
 */
const verifyWhatsAppConnection = async ({ senderId = null, allowInactive = true } = {}) => {
  const resolved = await getWhatsAppSender(senderId, allowInactive);
  if (resolved.error) {
    return {
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode: 'SENDER_CONFIG_ERROR',
      error: resolved.error
    };
  }

  const { phoneNumberId, accessToken, hasRealCredentials, sender } = resolved;
  if (!hasRealCredentials) {
    return {
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode: 'MISSING_META_CREDENTIALS',
      error: 'WhatsApp Cloud API credentials missing: configure Phone Number ID and Meta Permanent Access Token.'
    };
  }

  const url = `${META_BASE_URL}/${META_VERSION}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 12000
    });
    return {
      success: true,
      provider: 'meta_cloud_api',
      simulated: false,
      senderId: sender?._id || null,
      account: response.data
    };
  } catch (error) {
    const metaErr = error.response?.data?.error;
    const message = metaErr?.message || error.message;
    const errorCode = metaErr?.code ? `META_${metaErr.code}` : 'META_VERIFY_ERROR';
    console.error(`❌ [WA_VERIFY] Failed for phoneNumberId=${phoneNumberId}: ${message}`);
    return {
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode,
      error: message,
      details: metaErr || null
    };
  }
};

/**
 * Send WhatsApp Template Message via Meta Cloud API.
 */
const sendTemplateMessage = async ({
  senderId,
  to,
  templateName,
  language = 'en',
  components = [],
  allowInactiveSender = false,
  sourceType = 'campaign',
  campaignId = null,
  templateId = null,
  epcId = null,
  leadId = null,
  recipientName = null,
  jobId = null,
  attempt = 1,
  skipLog = false
}) => {
  const cleanTo = normalizePhone(to);

  const finalize = async (result, resolvedSender = null) => {
    if (!skipLog) {
      await persistWhatsAppLog({
        campaign_id: campaignId || null,
        template_id: templateId || null,
        sender_id: resolvedSender?._id || senderId || null,
        epc_id: epcId || null,
        lead_id: leadId || null,
        job_id: jobId || null,
        source_type: sourceType,
        recipient_name: recipientName || null,
        recipient_phone: cleanTo || String(to || ''),
        subject_or_template: templateName,
        status: result.simulated ? 'simulated' : (result.success ? 'sent' : 'failed'),
        simulated: Boolean(result.simulated),
        message_id: result.messageId || null,
        error_code: result.errorCode || null,
        error_message: result.error || null,
        provider_response: result.details || null,
        attempt
      });
    }
    return result;
  };

  if (!cleanTo || cleanTo.length < 10) {
    return finalize({
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode: 'INVALID_PHONE',
      error: 'Valid 10+ digit WhatsApp phone number is required.'
    });
  }

  const resolved = await getWhatsAppSender(senderId, allowInactiveSender);
  if (resolved.error) {
    return finalize({
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode: 'SENDER_CONFIG_ERROR',
      error: resolved.error
    }, resolved.sender);
  }

  const { phoneNumberId, accessToken, hasRealCredentials, sender } = resolved;

  if (!hasRealCredentials) {
    if (process.env.ALLOW_WHATSAPP_SIMULATOR === 'true') {
      console.warn(`⚠️ [WA SIMULATED] Template: "${templateName}" -> ${cleanTo}`);
      return finalize({
        success: true,
        provider: 'simulator',
        messageId: `sim_wa_${Date.now()}`,
        simulated: true
      }, sender);
    }

    const msg = 'Meta WhatsApp Cloud API credentials are not configured (missing Phone Number ID or Access Token).';
    console.error(`❌ [WA_TEMPLATE_FAILED] To: ${cleanTo} | ${msg}`);
    return finalize({
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode: 'MISSING_META_CREDENTIALS',
      error: msg
    }, sender);
  }

  const url = `${META_BASE_URL}/${META_VERSION}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: cleanTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 15000
    });
    const messageId = response.data?.messages?.[0]?.id || `wa_${Date.now()}`;
    console.log(`✅ [WA_TEMPLATE] Sent "${templateName}" -> ${cleanTo} | MessageId: ${messageId}`);
    return finalize({
      success: true,
      provider: 'meta_cloud_api',
      messageId,
      simulated: false,
      details: response.data
    }, sender);
  } catch (error) {
    const metaErr = error.response?.data?.error;
    const metaError = metaErr?.message || error.message;
    const errorCode = metaErr?.code ? `META_${metaErr.code}` : 'META_API_ERROR';
    console.error(`❌ [WA_TEMPLATE_ERROR] To: ${cleanTo} | Code: ${errorCode} | Error: ${metaError}`);
    return finalize({
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode,
      error: metaError,
      details: metaErr || null
    }, sender);
  }
};

/**
 * Send WhatsApp Session Text Message via Meta Cloud API.
 */
const sendTextMessage = async ({
  senderId,
  to,
  text,
  allowInactiveSender = false,
  sourceType = 'sender_test',
  campaignId = null,
  epcId = null,
  leadId = null,
  recipientName = null,
  skipLog = false
}) => {
  const cleanTo = normalizePhone(to);

  const finalize = async (result, resolvedSender = null) => {
    if (!skipLog) {
      await persistWhatsAppLog({
        campaign_id: campaignId || null,
        sender_id: resolvedSender?._id || senderId || null,
        epc_id: epcId || null,
        lead_id: leadId || null,
        source_type: sourceType,
        recipient_name: recipientName || null,
        recipient_phone: cleanTo || String(to || ''),
        subject_or_template: text ? text.slice(0, 80) : 'text_message',
        status: result.simulated ? 'simulated' : (result.success ? 'sent' : 'failed'),
        simulated: Boolean(result.simulated),
        message_id: result.messageId || null,
        error_code: result.errorCode || null,
        error_message: result.error || null,
        provider_response: result.details || null
      });
    }
    return result;
  };

  if (!cleanTo || cleanTo.length < 10) {
    return finalize({
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode: 'INVALID_PHONE',
      error: 'Valid 10+ digit WhatsApp phone number is required.'
    });
  }

  const resolved = await getWhatsAppSender(senderId, allowInactiveSender);
  if (resolved.error) {
    return finalize({
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode: 'SENDER_CONFIG_ERROR',
      error: resolved.error
    }, resolved.sender);
  }

  const { phoneNumberId, accessToken, hasRealCredentials, sender } = resolved;

  if (!hasRealCredentials) {
    if (process.env.ALLOW_WHATSAPP_SIMULATOR === 'true') {
      console.warn(`⚠️ [WA SIMULATED TEXT] To: ${cleanTo} | Body: "${String(text || '').substring(0, 50)}"`);
      return finalize({
        success: true,
        provider: 'simulator',
        messageId: `sim_wa_txt_${Date.now()}`,
        simulated: true
      }, sender);
    }

    const msg = 'Meta WhatsApp Cloud API credentials are not configured (missing Phone Number ID or Access Token).';
    console.error(`❌ [WA_TEXT_FAILED] To: ${cleanTo} | ${msg}`);
    return finalize({
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode: 'MISSING_META_CREDENTIALS',
      error: msg
    }, sender);
  }

  const url = `${META_BASE_URL}/${META_VERSION}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: cleanTo,
    type: 'text',
    text: { body: text }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 15000
    });
    const messageId = response.data?.messages?.[0]?.id || `wa_txt_${Date.now()}`;
    console.log(`✅ [WA_TEXT] Sent to ${cleanTo} | MessageId: ${messageId}`);
    return finalize({
      success: true,
      provider: 'meta_cloud_api',
      messageId,
      simulated: false,
      details: response.data
    }, sender);
  } catch (error) {
    const metaErr = error.response?.data?.error;
    const metaError = metaErr?.message || error.message;
    const errorCode = metaErr?.code ? `META_${metaErr.code}` : 'META_API_ERROR';
    console.error(`❌ [WA_TEXT_ERROR] To: ${cleanTo} | Code: ${errorCode} | Error: ${metaError}`);
    return finalize({
      success: false,
      provider: 'meta_cloud_api',
      simulated: false,
      errorCode,
      error: metaError,
      details: metaErr || null
    }, sender);
  }
};

module.exports = {
  getWhatsAppSender,
  verifyWhatsAppConnection,
  sendTemplateMessage,
  sendTextMessage
};
