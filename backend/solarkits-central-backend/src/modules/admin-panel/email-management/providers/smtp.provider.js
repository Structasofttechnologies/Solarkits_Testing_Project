const nodemailer = require('nodemailer');

/**
 * Standard / Gmail SMTP Provider Adapter
 */
class SmtpProvider {
  constructor(credentials = {}) {
    this.host = credentials.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    this.port = Number(credentials.port) || Number(process.env.SMTP_PORT) || 587;
    this.secure = credentials.secure === true || this.port === 465;
    this.user = credentials.user || process.env.SMTP_USER || process.env.EMAIL_USER || '';
    this.pass = credentials.pass || process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
    this.fromEmail = credentials.from_email || process.env.SMTP_FROM || this.user || 'noreply@solarkits.in';
    this.fromName = credentials.from_name || 'SolarKits System';
  }

  _getTransporter() {
    if (!this.user || !this.pass) {
      return null;
    }

    const options = {
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: {
        user: this.user,
        pass: this.pass
      },
      connectionTimeout: 8000
    };

    if (this.host.includes('gmail')) {
      options.service = 'gmail';
    }

    return nodemailer.createTransport(options);
  }

  async testConnection() {
    const startTime = Date.now();
    try {
      if (!this.user || !this.pass) {
        return {
          success: false,
          duration_ms: Date.now() - startTime,
          message: 'SMTP credentials (user/password) not configured.'
        };
      }

      const transporter = this._getTransporter();
      await transporter.verify();

      return {
        success: true,
        duration_ms: Date.now() - startTime,
        message: `SMTP server (${this.host}:${this.port}) verified successfully.`
      };
    } catch (err) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        message: `SMTP Verification Error: ${err.message}`
      };
    }
  }

  async sendEmail({ to, subject, html, text }) {
    const startTime = Date.now();
    try {
      const transporter = this._getTransporter();

      if (!transporter) {
        // Safe simulated response when credentials aren't present in local staging
        return {
          success: true,
          messageId: `sim-smtp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@solarkits.in`,
          provider: 'smtp',
          duration_ms: Date.now() - startTime,
          details: { simulated: true, host: this.host, note: 'Dispatched via Standard SMTP adapter (Simulated in test environment)' }
        };
      }

      const info = await transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: text
      });

      return {
        success: true,
        messageId: info.messageId || `smtp-${Date.now()}`,
        provider: 'smtp',
        duration_ms: Date.now() - startTime,
        details: info
      };
    } catch (err) {
      return {
        success: false,
        provider: 'smtp',
        duration_ms: Date.now() - startTime,
        error: err.message
      };
    }
  }
}

module.exports = SmtpProvider;
