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
      from: `"No Reply" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: message,
    });
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', err.message || err);
    throw new Error('Failed to send OTP email');
  }
}

module.exports = { sendOTP, send_mail };
