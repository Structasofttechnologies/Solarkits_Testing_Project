const twilio = require("twilio");

const client = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const sendWhatsAppOTP = async (phone, customOtpOrMessage) => {
  try {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    let otp;
    let body;

    if (!customOtpOrMessage) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      body = `Your SolarKits verification OTP is: ${otp}\n\nValid for 10 minutes. Do not share with anyone.`;
    } else if (/^\d{4,6}$/.test(String(customOtpOrMessage).trim())) {
      otp = String(customOtpOrMessage).trim();
      body = `Your SolarKits verification OTP is: ${otp}\n\nValid for 10 minutes. Do not share with anyone.`;
    } else {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      body = String(customOtpOrMessage);
    }

    await client.messages.create({
      body,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:+91${cleanPhone}`,
    });

    return otp;

  } catch (error) {
    console.error("WhatsApp OTP Error:", error.message || error);
    throw new Error("WHATSAPP_OTP_FAILED");
  }
};

module.exports = { sendWhatsAppOTP };