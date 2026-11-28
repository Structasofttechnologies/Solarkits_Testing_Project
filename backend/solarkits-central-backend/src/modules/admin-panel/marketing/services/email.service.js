const nodemailer = require('nodemailer');
const axios = require('axios');
const { MarketingSender, MarketingDeliveryLog } = require('../models');
const { decryptSecret } = require('../utils/crypto.util');

/**
 * Structured event logger for email provider dispatches.
 */
const logEmailEvent = (provider, status, details) => {
  const time = new Date().toISOString();
  const label = String(provider || 'UNKNOWN').toUpperCase();
  const message = `[${time}] [EMAIL_${label}] [${status}] ${details}`;
  if (status === 'FAILED') {
    console.error(`❌ ${message}`);
  } else if (status === 'SIMULATED' || status === 'WARNING') {
    console.warn(`⚠️ ${message}`);
  } else {
    console.log(`✅ ${message}`);
  }
};

/**
 * Persist an immutable email delivery log entry without blocking dispatch on logging failure.
 */
const persistEmailLog = async (payload) => {
  try {
    await MarketingDeliveryLog.create({
      channel: 'email',
      dispatched_at: new Date(),
      ...payload
    });
  } catch (err) {
    console.warn('⚠️ [EMAIL_LOG] Failed to persist MarketingDeliveryLog:', err.message);
  }
};

/**
 * Interpolate dynamic placeholders in template text (e.g. {{name}}, {{company_name}}).
 */
const interpolate = (text, variables = {}) => {
  if (!text) return '';
  let result = String(text);
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, val !== undefined && val !== null ? String(val) : '');
  }
  return result;
};

/**
 * Safely decrypt a credential if it is stored in enc:v1 format.
 */
const safeDecrypt = (value) => {
  if (!value) return value;
  return decryptSecret(value);
};

/**
 * 1. RESEND API Dispatcher
 */
const sendViaResend = async ({ apiKey, fromEmail, fromName, to, subject, htmlContent, replyTo, unsubscribeUrl }) => {
  const cleanFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const url = 'https://api.resend.com/emails';

  try {
    const decryptedKey = safeDecrypt(apiKey);
    if (!decryptedKey) {
      return {
        success: false,
        provider: 'resend',
        simulated: false,
        errorCode: 'MISSING_RESEND_KEY',
        error: 'Resend API key is missing.'
      };
    }

    const body = {
      from: cleanFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: htmlContent,
      reply_to: replyTo || fromEmail
    };

    if (unsubscribeUrl) {
      body.headers = {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };
    }

    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${decryptedKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const messageId = response.data?.id || `resend_${Date.now()}`;
    logEmailEvent('RESEND', 'SUCCESS', `To: ${to} | Subject: "${subject}" | MessageId: ${messageId}`);

    return {
      success: true,
      provider: 'resend',
      messageId,
      simulated: false
    };
  } catch (error) {
    const errData = error.response?.data || null;
    const errMsg = errData?.message || errData?.error || error.message;
    const errorCode = errData?.name || error.code || (error.response?.status ? `HTTP_${error.response.status}` : 'RESEND_ERROR');
    logEmailEvent('RESEND', 'FAILED', `To: ${to} | Code: ${errorCode} | Error: ${errMsg}`);
    return {
      success: false,
      provider: 'resend',
      simulated: false,
      errorCode,
      error: errMsg,
      details: errData
    };
  }
};

/**
 * Build nodemailer transport options and invoke verify + sendMail with detailed errors.
 */
const dispatchNodemailer = async ({
  provider,
  host,
  port,
  secure,
  user,
  pass,
  fromEmail,
  fromName,
  to,
  subject,
  htmlContent,
  replyTo,
  unsubscribeUrl
}) => {
  const parsedPort = parseInt(port || '587', 10);
  const isSecure = parsedPort === 465 || secure === true || secure === 'true';

  try {
    const decryptedUser = safeDecrypt(user);
    const decryptedPass = safeDecrypt(pass);

    if (!host || !decryptedUser || !decryptedPass) {
      const missingErr = `Missing ${provider.toUpperCase()} configuration (host/user/password).`;
      logEmailEvent(provider, 'FAILED', `To: ${to} | Error: ${missingErr}`);
      return {
        success: false,
        provider,
        simulated: false,
        errorCode: 'MISSING_SMTP_CREDENTIALS',
        error: missingErr
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parsedPort,
      secure: isSecure,
      auth: {
        user: decryptedUser,
        pass: decryptedPass
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });

    await transporter.verify();

    const mailOptions = {
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to,
      replyTo: replyTo || fromEmail,
      subject,
      html: htmlContent
    };

    if (unsubscribeUrl) {
      mailOptions.headers = {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };
    }

    const info = await transporter.sendMail(mailOptions);
    const messageId = info.messageId || `${provider}_${Date.now()}`;
    logEmailEvent(provider, 'SUCCESS', `To: ${to} | Subject: "${subject}" | MessageId: ${messageId}`);

    return {
      success: true,
      provider,
      messageId,
      simulated: false,
      details: { accepted: info.accepted, rejected: info.rejected, response: info.response }
    };
  } catch (error) {
    const errMsg = error.response || error.message || `${provider.toUpperCase()} dispatch failed`;
    const errorCode = error.code || (error.responseCode ? `SMTP_${error.responseCode}` : `${provider.toUpperCase()}_ERROR`);
    logEmailEvent(provider, 'FAILED', `To: ${to} | Host: ${host}:${parsedPort} | Code: ${errorCode} | Error: ${errMsg}`);
    return {
      success: false,
      provider,
      simulated: false,
      errorCode,
      error: errMsg,
      details: {
        host,
        port: parsedPort,
        secure: isSecure,
        responseCode: error.responseCode || null,
        command: error.command || null
      }
    };
  }
};

/**
 * 2. AWS SES Dispatcher (via AWS SES SMTP Credentials)
 */
const sendViaAwsSes = async (opts) => {
  return dispatchNodemailer({
    provider: 'aws_ses',
    host: opts.host || process.env.AWS_SES_SMTP_HOST || `email-smtp.${opts.region || process.env.AWS_SES_REGION || 'ap-south-1'}.amazonaws.com`,
    port: opts.port || process.env.AWS_SES_SMTP_PORT || '587',
    secure: opts.secure,
    user: opts.user || process.env.AWS_SES_SMTP_USER,
    pass: opts.pass || process.env.AWS_SES_SMTP_PASS,
    fromEmail: opts.fromEmail,
    fromName: opts.fromName,
    to: opts.to,
    subject: opts.subject,
    htmlContent: opts.htmlContent,
    replyTo: opts.replyTo,
    unsubscribeUrl: opts.unsubscribeUrl
  });
};

/**
 * 3. Standard SMTP Dispatcher (Gmail, Zoho, Hostinger, Custom)
 */
const sendViaSmtp = async (opts) => {
  return dispatchNodemailer({
    provider: 'smtp',
    host: opts.host || 'smtp.gmail.com',
    port: opts.port || '465',
    secure: opts.secure,
    user: opts.user,
    pass: opts.pass,
    fromEmail: opts.fromEmail,
    fromName: opts.fromName,
    to: opts.to,
    subject: opts.subject,
    htmlContent: opts.htmlContent,
    replyTo: opts.replyTo,
    unsubscribeUrl: opts.unsubscribeUrl
  });
};

/**
 * Resolve which MarketingSender document applies for a dispatch.
 */
const resolveEmailSender = async ({ senderId, purpose, allowInactive = false }) => {
  if (senderId) {
    const explicitSender = await MarketingSender.findById(senderId).lean();
    if (!explicitSender) {
      return { error: `Selected email sender (${senderId}) not found.` };
    }
    if (!allowInactive && explicitSender.status === 'inactive') {
      return { error: `Email sender "${explicitSender.name}" is inactive.` };
    }
    return { sender: explicitSender };
  }

  let sender = null;
  if (purpose) {
    sender = await MarketingSender.findOne({ type: 'email', purpose, status: 'active' }).lean();
  }
  if (!sender) {
    sender = await MarketingSender.findOne({ type: 'email', is_default: true, status: 'active' }).lean();
  }
  if (!sender) {
    sender = await MarketingSender.findOne({ type: 'email', status: 'active' }).lean();
  }
  return { sender };
};

/**
 * Unified sendEmail function: routes through Resend, AWS SES, or SMTP without silent simulator masking.
 */
const sendEmail = async ({
  senderId,
  purpose,
  to,
  subject,
  htmlContent,
  variables = {},
  trackingUrl = null,
  unsubscribeUrl = null,
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
  const cleanTo = String(to || '').trim();
  const resolvedTracking = trackingUrl || variables.tracking_url || 'https://solarkits.in';
  const resolvedUnsub = unsubscribeUrl || variables.unsubscribe_url || '';

  const mergedVars = {
    ...variables,
    name: variables.name || recipientName || 'Solar Partner',
    company: variables.company || variables.company_name || 'Solar Partner EPC',
    company_name: variables.company_name || variables.company || 'Solar Partner EPC',
    kit_name: variables.kit_name || 'Solar Combo Kit',
    price: variables.price || variables.campaign_price || '',
    campaign_price: variables.campaign_price || variables.price || '',
    tracking_url: resolvedTracking,
    unsubscribe_url: resolvedUnsub,
    year: new Date().getFullYear()
  };

  const finalSubject = interpolate(subject, mergedVars);
  const finalHtml = interpolate(htmlContent, mergedVars);

  const finalizeResult = async (result, resolvedSender = null) => {
    if (!skipLog) {
      await persistEmailLog({
        campaign_id: campaignId || null,
        template_id: templateId || null,
        sender_id: resolvedSender?._id || senderId || null,
        epc_id: epcId || null,
        lead_id: leadId || null,
        job_id: jobId || null,
        source_type: sourceType,
        provider: result.provider || resolvedSender?.email_provider || null,
        recipient_name: recipientName || mergedVars.name || null,
        recipient_email: cleanTo || null,
        subject_or_template: finalSubject,
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

  if (!cleanTo || !cleanTo.includes('@')) {
    return finalizeResult({
      success: false,
      provider: null,
      simulated: false,
      errorCode: 'INVALID_RECIPIENT',
      error: 'Recipient email address is missing or invalid.'
    });
  }

  let sender = null;
  try {
    const resolved = await resolveEmailSender({ senderId, purpose, allowInactive: allowInactiveSender });
    if (resolved.error) {
      return finalizeResult({
        success: false,
        provider: null,
        simulated: false,
        errorCode: 'SENDER_NOT_AVAILABLE',
        error: resolved.error
      });
    }
    sender = resolved.sender;

    // Determine exact provider when sender is present vs env fallback
    if (sender) {
      const provider = sender.email_provider || 'smtp';
      const fromEmail = sender.sender_email || process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || sender.smtp_user;
      const fromName = sender.sender_name || process.env.FROM_NAME || process.env.RESEND_FROM_NAME || 'SolarKits India';
      const replyTo = sender.reply_to_email || process.env.RESEND_REPLY_TO || fromEmail;

      if (provider === 'resend') {
        const res = await sendViaResend({
          apiKey: process.env.RESEND_API_KEY || sender.resend_api_key,
          fromEmail: fromEmail || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          fromName,
          to: cleanTo,
          subject: finalSubject,
          htmlContent: finalHtml,
          replyTo,
          unsubscribeUrl: resolvedUnsub
        });
        return finalizeResult(res, sender);
      }

      if (provider === 'aws_ses') {
        const res = await sendViaAwsSes({
          host: sender.smtp_host,
          port: sender.smtp_port,
          secure: sender.smtp_secure,
          region: sender.aws_region,
          user: sender.smtp_user || sender.aws_access_key_id || process.env.AWS_SES_SMTP_USER,
          pass: sender.smtp_pass || sender.aws_secret_access_key || process.env.AWS_SES_SMTP_PASS,
          fromEmail: fromEmail || process.env.FROM_EMAIL,
          fromName,
          to: cleanTo,
          subject: finalSubject,
          htmlContent: finalHtml,
          replyTo,
          unsubscribeUrl: resolvedUnsub
        });
        return finalizeResult(res, sender);
      }

      const res = await sendViaSmtp({
        host: sender.smtp_host || process.env.SMTP_HOST || process.env.NODEMAILER_HOST || 'smtp.gmail.com',
        port: sender.smtp_port || process.env.SMTP_PORT || process.env.NODEMAILER_PORT || '465',
        secure: sender.smtp_secure,
        user: sender.smtp_user || process.env.SMTP_USER || process.env.NODEMAILER_USER || process.env.EMAIL_USER,
        pass: sender.smtp_pass || process.env.SMTP_PASS || process.env.NODEMAILER_PASS || process.env.EMAIL_PASS,
        fromEmail: fromEmail || sender.smtp_user || process.env.SMTP_USER,
        fromName,
        to: cleanTo,
        subject: finalSubject,
        htmlContent: finalHtml,
        replyTo,
        unsubscribeUrl: resolvedUnsub
      });
      return finalizeResult(res, sender);
    }

    // No explicit/active DB sender: use env-configured providers in deterministic priority
    if (process.env.RESEND_API_KEY) {
      const res = await sendViaResend({
        apiKey: process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev',
        fromName: process.env.RESEND_FROM_NAME || process.env.FROM_NAME || 'SolarKits India',
        to: cleanTo,
        subject: finalSubject,
        htmlContent: finalHtml,
        replyTo: process.env.RESEND_REPLY_TO || process.env.REPLY_TO_EMAIL || process.env.RESEND_FROM_EMAIL,
        unsubscribeUrl: resolvedUnsub
      });
      return finalizeResult(res);
    }

    if (process.env.AWS_SES_SMTP_USER && process.env.AWS_SES_SMTP_PASS) {
      const res = await sendViaAwsSes({
        host: process.env.AWS_SES_SMTP_HOST,
        port: process.env.AWS_SES_SMTP_PORT,
        user: process.env.AWS_SES_SMTP_USER,
        pass: process.env.AWS_SES_SMTP_PASS,
        fromEmail: process.env.FROM_EMAIL || 'orders@solarkits.in',
        fromName: process.env.FROM_NAME || 'SolarKits India',
        to: cleanTo,
        subject: finalSubject,
        htmlContent: finalHtml,
        replyTo: process.env.REPLY_TO_EMAIL,
        unsubscribeUrl: resolvedUnsub
      });
      return finalizeResult(res);
    }

    const envSmtpUser = process.env.SMTP_USER || process.env.NODEMAILER_USER || process.env.EMAIL_USER;
    const envSmtpPass = process.env.SMTP_PASS || process.env.NODEMAILER_PASS || process.env.EMAIL_PASS;
    if (envSmtpUser && envSmtpPass) {
      const envPort = parseInt(process.env.SMTP_PORT || process.env.NODEMAILER_PORT || '465', 10);
      const res = await sendViaSmtp({
        host: process.env.SMTP_HOST || process.env.NODEMAILER_HOST || 'smtp.gmail.com',
        port: envPort,
        secure: envPort === 465 || process.env.SMTP_SECURE === 'true' || process.env.NODEMAILER_SECURE === 'true',
        user: envSmtpUser,
        pass: envSmtpPass,
        fromEmail: process.env.FROM_EMAIL || process.env.NODEMAILER_FROM || envSmtpUser,
        fromName: process.env.FROM_NAME || 'SolarKits India',
        to: cleanTo,
        subject: finalSubject,
        htmlContent: finalHtml,
        replyTo: process.env.REPLY_TO_EMAIL,
        unsubscribeUrl: resolvedUnsub
      });
      return finalizeResult(res);
    }

    // Explicit opt-in simulator ONLY (never default!)
    if (process.env.ALLOW_EMAIL_SIMULATOR === 'true') {
      logEmailEvent('SIMULATOR', 'SIMULATED', `To: ${cleanTo} | Subject: "${finalSubject}"`);
      return finalizeResult({
        success: true,
        provider: 'simulator',
        messageId: `sim_${Date.now()}`,
        simulated: true
      });
    }

    const noProviderMsg = 'No configured email provider found (add an active sender in Email Settings or set SMTP / RESEND / AWS_SES env credentials).';
    logEmailEvent('CONFIG', 'FAILED', `To: ${cleanTo} | Error: ${noProviderMsg}`);
    return finalizeResult({
      success: false,
      provider: 'none',
      simulated: false,
      errorCode: 'NO_EMAIL_PROVIDER_CONFIGURED',
      error: noProviderMsg
    });
  } catch (error) {
    logEmailEvent('UNKNOWN', 'FAILED', `To: ${cleanTo} | Error: ${error.message}`);
    return finalizeResult({
      success: false,
      provider: sender?.email_provider || null,
      simulated: false,
      errorCode: error.code || 'DISPATCH_EXCEPTION',
      error: error.message
    }, sender);
  }
};

/**
 * Verify email sender connectivity without relying on simulator fallbacks.
 */
const verifyEmailSenderConnection = async (sender) => {
  if (!sender) {
    return { success: false, simulated: false, errorCode: 'MISSING_SENDER', error: 'Sender not found' };
  }
  const provider = sender.email_provider || 'smtp';

  if (provider === 'resend') {
    const key = (process.env.RESEND_API_KEY && String(process.env.RESEND_API_KEY).trim()) || safeDecrypt(sender.resend_api_key);
    if (!key) {
      return { success: false, provider: 'resend', simulated: false, errorCode: 'MISSING_RESEND_KEY', error: 'Resend API key missing' };
    }
    try {
      const res = await axios.get('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 12000
      });
      return { success: true, provider: 'resend', simulated: false, domains: res.data?.data || [] };
    } catch (error) {
      const errName = error.response?.data?.name || '';
      const errMsg = error.response?.data?.message || error.message;
      // Resend returns 401/restricted_api_key on GET /domains for valid "Sending access" API keys
      if (errName === 'restricted_api_key') {
        return { success: true, provider: 'resend', simulated: false, sendingOnlyKey: true, domains: [] };
      }
      return {
        success: false,
        provider: 'resend',
        simulated: false,
        errorCode: errName || 'RESEND_AUTH_ERROR',
        error: errMsg
      };
    }
  }

  const host = provider === 'aws_ses'
    ? (sender.smtp_host || process.env.AWS_SES_SMTP_HOST || `email-smtp.${sender.aws_region || 'ap-south-1'}.amazonaws.com`)
    : (sender.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com');
  const port = parseInt(sender.smtp_port || (provider === 'aws_ses' ? '587' : '465'), 10);
  const user = safeDecrypt(sender.smtp_user || sender.aws_access_key_id || '');
  const pass = safeDecrypt(sender.smtp_pass || sender.aws_secret_access_key || '');

  if (!user || !pass) {
    return { success: false, provider, simulated: false, errorCode: 'MISSING_SMTP_CREDENTIALS', error: 'SMTP username or password is missing.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465 || sender.smtp_secure === true,
      auth: { user, pass },
      connectionTimeout: 12000
    });
    await transporter.verify();
    return { success: true, provider, simulated: false, host, port };
  } catch (error) {
    return {
      success: false,
      provider,
      simulated: false,
      errorCode: error.code || 'SMTP_VERIFY_FAILED',
      error: error.response || error.message
    };
  }
};

module.exports = {
  interpolate,
  sendViaResend,
  sendViaAwsSes,
  sendViaSmtp,
  sendEmail,
  verifyEmailSenderConnection
};
