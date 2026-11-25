const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTP = async (to, title = "Your Verification Code", message = "Use this OTP to verify your account:", companyName = "", customOtp = null) => {
  try {
<<<<<<< HEAD
    const otp = customOtp || Math.floor(100000 + Math.random() * 900000).toString();

    const senderName = companyName ? `${companyName} (via SolarKits)` : "SolarKits Solar Ecosystem";
    const subjectLine = companyName ? `🔐 ${companyName} - OTP Access Code: ${otp}` : `SolarKits - Your 6-Digit Email Verification Code: ${otp}`;
=======
    const otp = customOtp || Math.floor(1000 + Math.random() * 9000).toString();

    const senderName = companyName ? `${companyName} (via SolarKits)` : "SolarKits Solar Ecosystem";
    const subjectLine = companyName ? `🔐 ${companyName} - OTP Access Code` : `${title}`;
>>>>>>> origin/main

    await transporter.sendMail({
      from: `"${senderName}" <${process.env.EMAIL_USER}>`,
      to,
      subject: subjectLine,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 32px 16px; color: #1e293b;">
          <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #f97316;">
              <h2 style="color: #f97316; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">SolarKits</h2>
              <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Solar Ecosystem & EPC Management</p>
            </div>
            <!-- Body -->
            <div style="padding: 32px 28px; text-align: center;">
              ${companyName ? `
                <div style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 20px; border: 1px solid #bfdbfe; margin-bottom: 18px;">
                  🏢 ${companyName}
                </div>
              ` : ''}
              <h3 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">${title}</h3>
              <p style="font-size: 14px; color: #64748b; margin: 0 0 24px 0; line-height: 1.5;">${message}</p>
              
              <!-- OTP Box -->
              <div style="
                display: inline-block;
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                color: #ffffff;
                padding: 16px 36px;
                border-radius: 14px;
                font-size: 34px;
                letter-spacing: 10px;
                font-weight: 800;
                box-shadow: 0 6px 20px rgba(249, 115, 22, 0.35);
                margin: 8px 0 24px 0;
              ">
                ${otp}
              </div>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-top: 8px;">
                <p style="font-size: 12px; color: #64748b; margin: 0; font-weight: 500;">
                  ⏳ This OTP code expires in <strong>5 minutes</strong>. Please do not share this code with anyone.
                </p>
              </div>
            </div>
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 18px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0;">Sent to registered Email address for <strong>${companyName || 'SolarKits Account'}</strong></p>
              <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} SolarKits Solar Ecosystem. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    });

    return otp;
  } catch (err) {
    console.error('Error sending OTP email:', err.message || err);
    throw new Error('Failed to send OTP email');
  }
};

const send_mail = async (to, subject, message) => {
  try {
    await transporter.sendMail({
      from: `"SolarKits Ecosystem" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: message,
    });
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error.message || error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { sendOTP, send_mail };