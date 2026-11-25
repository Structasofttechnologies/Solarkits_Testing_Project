const axios = require("axios");

const SMS_API_URL = "http://control.yourbulksms.com/api/sendhttp.php";

const sendOTP = async (country, to, customOtp = null) => {
    try {
        const otp = customOtp ? String(customOtp) : Math.floor(100000 + Math.random() * 900000).toString();

        const message = `Dear user, ${otp} is the OTP for your login at Solarkits. In case you have not requested this, please contact us at office@sunnovative.com`;

        const params = {
            authkey: process.env.SMS_AUTH_KEY,
            mobiles: to,
            message,
            sender: process.env.SMS_SENDER_ID,
            route: "2",
            country: country,
            DLT_TE_ID : process.env.DLT_TE_ID,
        };

        const response = await axios.get(SMS_API_URL, { params });

        return { success: true, response: response.data, otp };
    } catch (error) {
        console.error("Error sending OTP:", error.response?.data || error.message);
        throw new Error("Failed to send OTP");
    }
};

module.exports = { sendOTP };
