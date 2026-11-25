const SMS_API_URL = "http://control.yourbulksms.com/api/sendhttp.php";

const sendOTP = async (country, to) => {
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const message = `Dear user, ${otp} is the OTP for your login at Solarkits. In case you have not requested this, please contact us at office@sunnovative.com`;

        const queryParams = new URLSearchParams({
            authkey: process.env.SMS_AUTH_KEY,
            mobiles: to,
            message,
            sender: process.env.SMS_SENDER_ID,
            route: "2",
            country: country,
            DLT_TE_ID : process.env.DLT_TE_ID,
        });

        const url = `${SMS_API_URL}?${queryParams.toString()}`;
        const response = await fetch(url);
        const data = await response.text();

        return { success: true, response: data, otp };
    } catch (error) {
        console.error("Error sending OTP:", error.message);
        throw new Error("Failed to send OTP");
    }
};

module.exports = { sendOTP };
