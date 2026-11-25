const axios = require('axios');
const { sendOTP: nodemailerSendOTP } = require('./nodemailer');

/**
 * Send Transactional Email using Brevo (Sendinblue) API v3
 * Fallback to Nodemailer if Brevo API fails or key is missing.
 */
const sendBrevoEmail = async ({ to, subject, htmlContent, senderName, senderEmail }) => {
    const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    const fromEmail = senderEmail || process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'support@solarkits.com';
    const fromName = senderName || process.env.BREVO_SENDER_NAME || 'SolarKits Security';

    if (apiKey && apiKey.trim().length > 10) {
        try {
            console.log(`[BREVO API] Dispatching transactional email via Brevo REST API to: ${to}...`);
            const response = await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: { name: fromName, email: fromEmail },
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: htmlContent,
                },
                {
                    headers: {
                        'api-key': apiKey.trim(),
                        'content-type': 'application/json',
                        'accept': 'application/json',
                    },
                    timeout: 10000,
                }
            );

            console.log(`[BREVO API] Email sent successfully. MessageId: ${response.data?.messageId}`);
            return {
                success: true,
                provider: 'brevo',
                messageId: response.data?.messageId,
            };
        } catch (error) {
            console.error('[BREVO API Error]', error.response?.data || error.message);
            console.log('[BREVO API] Attempting fallback to Nodemailer...');
        }
    } else {
        console.log('[BREVO API] BREVO_API_KEY not configured or empty. Using Nodemailer transport.');
    }

    // Nodemailer fallback
    try {
        if (nodemailerSendOTP) {
            await nodemailerSendOTP(to, subject, htmlContent, fromName);
            return { success: true, provider: 'nodemailer' };
        }
    } catch (fallbackErr) {
        console.error('[Email Fallback Error]', fallbackErr.message);
    }

    return { success: false, provider: 'none', message: 'Email service unavailable' };
};

/**
 * Send 6-Digit PIN Reset OTP Email via Brevo API
 */
const sendPinResetOtpEmail = async (email, otp, companyName = 'Solar EPC Partner') => {
    const subject = `🔐 ${otp} is your SolarKits PIN Reset OTP`;
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 36px 16px; color: #1e293b;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #2563eb;">
              <h2 style="color: #f8fafc; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">SolarKits™</h2>
              <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 12px; font-weight: 500;">B2B Solar Ecosystem & EPC Network</p>
            </div>
            <!-- Body -->
            <div style="padding: 32px 28px; text-align: center;">
              <div style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; border: 1px solid #bfdbfe; margin-bottom: 16px;">
                🏢 ${companyName}
              </div>
              <h3 style="color: #0f172a; margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">Reset Unique 4-Digit Security PIN</h3>
              <p style="font-size: 14px; color: #64748b; margin: 0 0 24px 0; line-height: 1.5;">
                We received a request to set or reset the 4-digit security PIN for your account. Please use the verification code below to authorize this change:
              </p>
              
              <!-- OTP Box -->
              <div style="
                display: inline-block;
                background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
                color: #ffffff;
                padding: 16px 36px;
                border-radius: 14px;
                font-size: 32px;
                letter-spacing: 8px;
                font-weight: 800;
                box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
                margin: 8px 0 24px 0;
              ">
                ${otp}
              </div>

              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px; margin-top: 8px; text-align: left;">
                <p style="font-size: 12px; color: #991b1b; margin: 0; font-weight: 600;">
                  ⚠️ Security Notice:
                </p>
                <p style="font-size: 11px; color: #b91c1c; margin: 4px 0 0 0; line-height: 1.4;">
                  This code expires in <strong>10 minutes</strong>. Never share this OTP with anyone, including SolarKits representatives. If you did not request this PIN reset, please ignore this email.
                </p>
              </div>
            </div>
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 18px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0;">Sent via Brevo API to <strong>${email}</strong></p>
              <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} SolarKits. All rights reserved.</p>
            </div>
          </div>
        </div>
    `;

    return await sendBrevoEmail({
        to: email,
        subject,
        htmlContent,
        senderName: 'SolarKits Security',
        senderEmail: process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER,
    });
};

module.exports = {
    sendBrevoEmail,
    sendPinResetOtpEmail,
};
