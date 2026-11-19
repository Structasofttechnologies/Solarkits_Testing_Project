const nodemailer = require('nodemailer');
const { MarketingSender } = require('../models');

/**
 * Creates Nodemailer Transporter from MarketingSender config or environment variables
 */
const getTransporter = async (senderId = null) => {
  let sender = null;
  if (senderId) {
    sender = await MarketingSender.findById(senderId).lean();
  }
  if (!sender) {
    sender = await MarketingSender.findOne({ type: 'email', is_default: true, status: 'active' }).lean();
  }

  if (sender && sender.smtp_host && sender.smtp_user) {
    return {
      transporter: nodemailer.createTransport({
        host: sender.smtp_host,
        port: sender.smtp_port || 587,
        secure: sender.smtp_port === 465 || sender.smtp_secure,
        auth: {
          user: sender.smtp_user,
          pass: sender.smtp_pass
        }
      }),
      fromEmail: sender.sender_email || sender.smtp_user,
      fromName: sender.sender_name || 'SolarKits India',
      replyTo: sender.reply_to_email || sender.sender_email
    };
  }

  // Fallback to process.env or development console transporter
  return {
    transporter: nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER || 'noreply@solarkits.in',
        pass: process.env.SMTP_PASS || 'dummy_pass'
      }
    }),
    fromEmail: process.env.FROM_EMAIL || 'noreply@solarkits.in',
    fromName: process.env.FROM_NAME || 'SolarKits India',
    replyTo: process.env.REPLY_TO_EMAIL || 'support@solarkits.in'
  };
};

/**
 * Interpolate dynamic placeholders in template text
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
 * Send a single email (for tests or campaign item)
 */
const sendEmail = async ({ senderId, to, subject, htmlContent, variables = {}, trackingUrl = null }) => {
  try {
    const { transporter, fromEmail, fromName, replyTo } = await getTransporter(senderId);

    const mergedVars = {
      ...variables,
      tracking_url: trackingUrl || 'https://solarkits.in',
      year: new Date().getFullYear()
    };

    const finalSubject = interpolate(subject, mergedVars);
    const finalHtml = interpolate(htmlContent, mergedVars);

    // If in development and dummy credentials, simulate send safely
    if (process.env.NODE_ENV !== 'production' && (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'dummy_pass')) {
      console.log(`✉️ [SIMULATED EMAIL] To: ${to} | Subject: "${finalSubject}"`);
      return { success: true, messageId: `sim_email_${Date.now()}`, simulated: true };
    }

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      replyTo,
      subject: finalSubject,
      html: finalHtml
    });

    return { success: true, messageId: info.messageId, simulated: false };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getTransporter,
  interpolate,
  sendEmail
};
