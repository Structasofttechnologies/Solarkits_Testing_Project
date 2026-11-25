const axios = require('axios');
const { MarketingSender } = require('../models');

const META_BASE_URL = 'https://graph.facebook.com';
const META_VERSION = process.env.META_GRAPH_API_VERSION || 'v19.0';

/**
 * Get active WhatsApp Sender credentials
 */
const getWhatsAppSender = async (senderId = null) => {
  let sender = null;
  if (senderId) {
    sender = await MarketingSender.findById(senderId).lean();
  }
  if (!sender) {
    sender = await MarketingSender.findOne({ type: 'whatsapp', is_default: true, status: { $in: ['active', 'connected'] } }).lean();
  }

  const phoneNumberId = sender?.phone_number_id || process.env.META_PHONE_NUMBER_ID || 'dummy_phone_id';
  const accessToken = sender?.meta_access_token || process.env.META_ACCESS_TOKEN || 'dummy_token';

  const isSimulated =
    !accessToken ||
    accessToken.startsWith('dummy') ||
    !phoneNumberId ||
    phoneNumberId.startsWith('dummy');

  return { phoneNumberId, accessToken, isSimulated, sender };
};

/**
 * Send WhatsApp Template Message
 */
const sendTemplateMessage = async ({ senderId, to, templateName, language = 'en', components = [] }) => {
  const { phoneNumberId, accessToken, isSimulated } = await getWhatsAppSender(senderId);

  // Clean phone number (strip whitespace, ensure +91 or country code)
  let cleanTo = String(to || '').replace(/[^0-9]/g, '');
  if (cleanTo.length === 10) cleanTo = `91${cleanTo}`;

  if (isSimulated) {
    console.log(`📱 [WA SIMULATED] Template: "${templateName}" → ${cleanTo}`);
    return { success: true, messageId: `sim_wa_${Date.now()}`, simulated: true };
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
    return { success: true, messageId, simulated: false };
  } catch (error) {
    const metaError = error.response?.data?.error?.message || error.message;
    console.error(`📱 Meta WA API Delivery Error: ${metaError}`);
    return { success: false, error: metaError, simulated: false };
  }
};

/**
 * Send WhatsApp Session Text Message (e.g. for quick OTP / notification)
 */
const sendTextMessage = async ({ senderId, to, text }) => {
  const { phoneNumberId, accessToken, isSimulated } = await getWhatsAppSender(senderId);

  let cleanTo = String(to || '').replace(/[^0-9]/g, '');
  if (cleanTo.length === 10) cleanTo = `91${cleanTo}`;

  if (isSimulated) {
    console.log(`📱 [WA SIMULATED TEXT] To: ${cleanTo} | Body: "${text.substring(0, 50)}..."`);
    return { success: true, messageId: `sim_wa_txt_${Date.now()}`, simulated: true };
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
    return { success: true, messageId, simulated: false };
  } catch (error) {
    const metaError = error.response?.data?.error?.message || error.message;
    return { success: false, error: metaError, simulated: false };
  }
};

module.exports = {
  getWhatsAppSender,
  sendTemplateMessage,
  sendTextMessage
};
