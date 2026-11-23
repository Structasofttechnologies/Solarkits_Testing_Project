const nodemailer = require('nodemailer');
const axios = require('axios');
const { MarketingSender } = require('../models');

/**
 * Log helper for audit trail
 */
const logEmailEvent = (provider, status, details) => {
  const time = new Date().toISOString();
  const icon = status === 'SUCCESS' ? '✅' : status === 'SIMULATED' ? '✉️' : '❌';
  console.log(`${icon} [${time}] [EMAIL_${provider.toUpperCase()}] [${status}] ${details}`);
};

/**
 * Interpolate dynamic placeholders in template text (e.g. {{name}}, {{company_name}})
 */
const interpolate = (text, variables = {}) => {
  if (!text) return '';
  let result = text;
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, val !== undefined && val !== null ? val : '');
  }
  return result;
};

/**
 * 1. RESEND API Dispatcher
 * Directly calls Resend API (https://api.resend.com/emails)
 */
const sendViaResend = async ({ apiKey, fromEmail, fromName, to, subject, htmlContent, replyTo }) => {
  const cleanFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const url = 'https://api.resend.com/emails';

  try {
    const response = await axios.post(
      url,
      {
        from: cleanFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: htmlContent,
        reply_to: replyTo || fromEmail
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const messageId = response.data?.id || `resend_${Date.now()}`;
    logEmailEvent('RESEND', 'SUCCESS', `To: ${to} | Subject: "${subject}" | MessageId: ${messageId}`);

    return {
      success: true,
      provider: 'resend',
      messageId,
      simulated: false
    };
  } catch (error) {
    const errMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    logEmailEvent('RESEND', 'FAILED', `To: ${to} | Error: ${errMsg}`);
    return {
      success: false,
      provider: 'resend',
      error: errMsg
    };
  }
};

/**
 * 2. AWS SES Dispatcher (via AWS SES SMTP Credentials or Nodemailer)
 */
const sendViaAwsSes = async ({ host, port, secure, user, pass, fromEmail, fromName, to, subject, htmlContent, replyTo }) => {
  const sesHost = host || process.env.AWS_SES_SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com';
  const sesPort = parseInt(port || process.env.AWS_SES_SMTP_PORT || '587');
  const sesUser = user || process.env.AWS_SES_SMTP_USER;
  const sesPass = pass || process.env.AWS_SES_SMTP_PASS;

  if (!sesUser || !sesPass) {
    throw new Error('AWS SES SMTP credentials missing (User / Password).');
  }

  const transporter = nodemailer.createTransport({
    host: sesHost,
    port: sesPort,
    secure: sesPort === 465 || secure === true,
    auth: {
      user: sesUser,
      pass: sesPass
    }
  });

  const info = await transporter.sendMail({
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    to,
    replyTo: replyTo || fromEmail,
    subject,
    html: htmlContent
  });

  const messageId = info.messageId || `ses_${Date.now()}`;
  logEmailEvent('AWS_SES', 'SUCCESS', `To: ${to} | Subject: "${subject}" | MessageId: ${messageId}`);

  return {
    success: true,
    provider: 'aws_ses',
    messageId,
    simulated: false
  };
};

/**
 * 3. Standard SMTP Dispatcher (Gmail, Zoho, Hostinger, Custom)
 */
const sendViaSmtp = async ({ host, port, secure, user, pass, fromEmail, fromName, to, subject, htmlContent, replyTo }) => {
  const transporter = nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: parseInt(port || '587'),
    secure: port === 465 || secure === true,
    auth: {
      user,
      pass
    }
  });

  const info = await transporter.sendMail({
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    to,
    replyTo: replyTo || fromEmail,
    subject,
    html: htmlContent
  });

  const messageId = info.messageId || `smtp_${Date.now()}`;
  logEmailEvent('SMTP', 'SUCCESS', `To: ${to} | Subject: "${subject}" | MessageId: ${messageId}`);

  return {
    success: true,
    provider: 'smtp',
    messageId,
    simulated: false
  };
};

/**
 * Unified sendEmail function: automatically routes through Resend, AWS SES, or SMTP
 */
const sendEmail = async ({ senderId, purpose, to, subject, htmlContent, variables = {}, trackingUrl = null }) => {
  try {
    let sender = null;
    if (senderId) {
      sender = await MarketingSender.findById(senderId).lean();
    }
    if (!sender && purpose) {
      sender = await MarketingSender.findOne({ type: 'email', purpose, status: 'active' }).lean();
    }
    if (!sender) {
      sender = await MarketingSender.findOne({ type: 'email', is_default: true, status: 'active' }).lean();
    }
    if (!sender) {
      sender = await MarketingSender.findOne({ type: 'email', status: 'active' }).lean();
    }

    const mergedVars = {
      ...variables,
      tracking_url: trackingUrl || 'https://solarkits.in',
      year: new Date().getFullYear()
    };

    const finalSubject = interpolate(subject, mergedVars);
    const finalHtml = interpolate(htmlContent, mergedVars);

    // Determine Provider:
    // 1. Resend API
    const resendApiKey = sender?.resend_api_key || process.env.RESEND_API_KEY;
    const isResend = (sender?.email_provider === 'resend') || (!sender && resendApiKey);

    if (isResend && resendApiKey) {
      const fromEmail = sender?.sender_email || process.env.RESEND_FROM_EMAIL || 'orders@solarkits.in';
      const fromName = sender?.sender_name || 'SolarKits India';
      const replyTo = sender?.reply_to_email || 'support@solarkits.in';

      return await sendViaResend({
        apiKey: resendApiKey,
        fromEmail,
        fromName,
        to,
        subject: finalSubject,
        htmlContent: finalHtml,
        replyTo
      });
    }

    // 2. AWS SES (via SMTP or SES config)
    const isAwsSes = sender?.email_provider === 'aws_ses' ||
      sender?.smtp_host?.includes('amazonaws.com') ||
      process.env.AWS_SES_SMTP_USER;

    if (isAwsSes && (sender?.smtp_user || process.env.AWS_SES_SMTP_USER)) {
      return await sendViaAwsSes({
        host: sender?.smtp_host || process.env.AWS_SES_SMTP_HOST,
        port: sender?.smtp_port || process.env.AWS_SES_SMTP_PORT,
        secure: sender?.smtp_secure,
        user: sender?.smtp_user || process.env.AWS_SES_SMTP_USER,
        pass: sender?.smtp_pass || process.env.AWS_SES_SMTP_PASS,
        fromEmail: sender?.sender_email || process.env.FROM_EMAIL || 'orders@solarkits.in',
        fromName: sender?.sender_name || 'SolarKits India',
        to,
        subject: finalSubject,
        htmlContent: finalHtml,
        replyTo: sender?.reply_to_email || 'support@solarkits.in'
      });
    }

    // 3. Custom SMTP / Environment SMTP
    const smtpHost = sender?.smtp_host || process.env.SMTP_HOST || process.env.NODEMAILER_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(sender?.smtp_port || process.env.SMTP_PORT || process.env.NODEMAILER_PORT || '465');
    const smtpSecure = (smtpPort === 465) || (sender?.smtp_secure === true) || (process.env.SMTP_SECURE === 'true') || (process.env.NODEMAILER_SECURE === 'true');
    const smtpUser = sender?.smtp_user || process.env.SMTP_USER || process.env.NODEMAILER_USER || process.env.EMAIL_USER;
    const smtpPass = sender?.smtp_pass || process.env.SMTP_PASS || process.env.NODEMAILER_PASS || process.env.EMAIL_PASS;

    if (smtpUser && smtpPass) {
      return await sendViaSmtp({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        user: smtpUser,
        pass: smtpPass,
        fromEmail: sender?.sender_email || process.env.FROM_EMAIL || process.env.NODEMAILER_FROM || smtpUser,
        fromName: sender?.sender_name || process.env.FROM_NAME || 'SolarKits India',
        to,
        subject: finalSubject,
        htmlContent: finalHtml,
        replyTo: sender?.reply_to_email || process.env.REPLY_TO_EMAIL
      });
    }

    // 4. Fallback / Dev Simulator (Safe non-breaking fallback)
    const isDev = process.env.NODE_ENV !== 'production';
    logEmailEvent('SIMULATOR', 'SIMULATED', `To: ${to} | Subject: "${finalSubject}"`);
    return { success: true, provider: 'simulator', messageId: `sim_${Date.now()}`, simulated: true };

  } catch (error) {
    logEmailEvent('UNKNOWN', 'FAILED', `To: ${to} | Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  interpolate,
  sendViaResend,
  sendViaAwsSes,
  sendViaSmtp,
  sendEmail
};
