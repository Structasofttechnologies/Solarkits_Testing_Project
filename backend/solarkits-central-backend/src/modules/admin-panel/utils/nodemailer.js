const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTP = async (to, title = "Your Verification Code", message = "Use this OTP to verify your account:") => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await transporter.sendMail({
      from: `"No Reply" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Your OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h2>${title}</h2>
          <p style="font-size: 18px;">${message}</p>
          <div style="
            display: inline-block;
            background-color: #f4f4f4;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 22px;
            letter-spacing: 2px;
            font-weight: bold;
            color: #2b6cb0;
          ">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #555;">This code will expire in 3 minutes.</p>
        </div>
      `,
    });

    return { otp };
  } catch (err) {
    console.error('Error sending OTP email:', err.message || err);
    throw new Error('Failed to send OTP email');
  }
};

const send_mail = async (to, subject, message) => {
  try {
    await transporter.sendMail({
      from: `"SolarKits Official" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: message,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error.message || error);
    return false;
  }
};

/**
 * Send franchise partner onboarding credentials email with login details & next steps
 */
const sendFranchisePartnerCredentialsEmail = async ({
  to,
  fullName,
  businessName,
  email,
  password,
  territory,
  agreementNumber,
  portalLoginUrl = 'http://localhost:5174/login',
}) => {
  try {
    const subject = `🎉 Welcome to SolarKits Franchise Network - Your Partner Login Credentials`;
    const html = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 36px 16px; color: #0f172a; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #0575B8 0%, #03426A 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); padding: 5px 16px; border-radius: 30px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
              ⚡ Official Partner Onboarding
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">SolarKits Franchise Network</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Partner Application Approved & Account Provisioned</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 32px 26px;">
            <p style="font-size: 15px; margin: 0 0 14px 0; color: #334155;">
              Dear <strong>${fullName || 'Franchise Partner'}</strong> (${businessName || 'Solar Enterprise'}),
            </p>
            <p style="font-size: 14px; margin: 0 0 22px 0; color: #475569; line-height: 1.6;">
              Congratulations! Your Franchise Partner application for <strong style="color: #0575B8;">${territory || 'Designated Territory'}</strong> has been reviewed and <strong style="color: #16a34a;">officially approved</strong> by the SolarKits Administration Team.
            </p>

            <!-- Login Credentials Highlight Box -->
            <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 16px; padding: 22px; margin: 0 0 24px 0;">
              <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">
                🔑 Your Franchise Partner Portal Credentials
              </h3>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 7px 0; color: #64748b; font-weight: 600; width: 140px;">Portal Login URL:</td>
                  <td style="padding: 7px 0;">
                    <a href="${portalLoginUrl}" style="color: #0575B8; font-weight: 700; text-decoration: none;">${portalLoginUrl}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 7px 0; color: #64748b; font-weight: 600;">Registered Email:</td>
                  <td style="padding: 7px 0; font-weight: 800; color: #0f172a; font-family: monospace; font-size: 14px;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 7px 0; color: #64748b; font-weight: 600;">Temporary Password:</td>
                  <td style="padding: 7px 0;">
                    <span style="background: #ffffff; border: 1px dashed #0284c7; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-weight: 900; font-size: 14px; color: #0369a1; letter-spacing: 1px;">
                      ${password}
                    </span>
                  </td>
                </tr>
                ${agreementNumber ? `
                <tr>
                  <td style="padding: 7px 0; color: #64748b; font-weight: 600;">Agreement Ref:</td>
                  <td style="padding: 7px 0; font-weight: 700; color: #334155; font-family: monospace;">#${agreementNumber}</td>
                </tr>` : ''}
              </table>

              <div style="margin-top: 18px; text-align: center;">
                <a href="${portalLoginUrl}" style="display: inline-block; background: #0575B8; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 13px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(5, 117, 184, 0.3);">
                  Log In to Partner Portal →
                </a>
              </div>
            </div>

            <!-- Next Steps Roadmap -->
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 0 0 22px 0;">
              <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">
                📋 Next Steps to Complete Onboarding:
              </h4>
              <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.7;">
                <li><strong>Log In:</strong> Access the Partner Portal using your email and password above.</li>
                <li><strong>Sign Digital Agreement:</strong> Review and digitally sign your official Franchise Partner Agreement.</li>
                <li><strong>Fee Payment & Receipt:</strong> Discuss payment with your dedicated Account Manager and upload the transfer receipt slip.</li>
                <li><strong>Activation:</strong> Once receipt is verified, your operational dashboard with factory-direct pricing and territory leads will unlock immediately.</li>
              </ol>
            </div>

            <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
              🔒 <em>Security Tip: We recommend updating your password upon your first successful login under Account Settings.</em>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748b;">SolarKits Clean Energy Solutions • Commercial Distribution Dept</p>
            <p style="margin: 0;">If you have any questions, reach out to your Account Manager or reply to this email.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"SolarKits Onboarding" <${process.env.EMAIL_USER || process.env.NODEMAILER_FROM}>`,
      to,
      subject,
      html,
    });
    console.log(`[nodemailer] Franchise credentials email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`[nodemailer] Error sending franchise credentials email to ${to}:`, error.message || error);
    return false;
  }
};

module.exports = { sendOTP, send_mail, sendFranchisePartnerCredentialsEmail };