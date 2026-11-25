const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send a 6-digit OTP email.
 * @returns {{ otp: string }}
 */
const sendOTP = async (to, title = 'Your Verification Code', message = 'Use this OTP to verify your account:') => {
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await transporter.sendMail({
            from: `"SolarKits" <${process.env.EMAIL_USER}>`,
            to,
            subject: title,
            html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 32px;">
          <h2 style="color: #f97316;">${title}</h2>
          <p style="font-size: 16px; color: #555;">${message}</p>
          <div style="
            display: inline-block;
            background: linear-gradient(135deg, #f97316, #f59e0b);
            color: #fff;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 28px;
            letter-spacing: 6px;
            font-weight: bold;
            margin: 16px 0;
          ">${otp}</div>
          <p style="font-size: 13px; color: #888;">This code expires in 3 minutes. Do not share it with anyone.</p>
          <hr style="margin: 24px 0; border-color: #eee;" />
          <p style="font-size: 11px; color: #aaa;">SolarKits Solar Ecosystem — Supplier Portal</p>
        </div>
      `,
        });

        return { otp };
    } catch (err) {
        console.error('Error sending OTP email:', err.message || err);
        throw new Error('Failed to send OTP email');
    }
};

/**
 * Send a plain email.
 */
const send_mail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `"SolarKits" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        return true;
    } catch (err) {
        console.error('Error sending email:', err.message || err);
        throw new Error('Failed to send email');
    }
};

module.exports = { sendOTP, send_mail };
