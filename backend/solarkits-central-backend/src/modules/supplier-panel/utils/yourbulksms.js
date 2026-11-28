const SMS_API_URL = "http://control.yourbulksms.com/api/sendhttp.php";

const sendOTP = async (country, to, customOtp = null) => {
    try {
        const cleanTo = String(to).replace(/\D/g, '').slice(-10);
        const otp = customOtp ? String(customOtp).trim() : Math.floor(100000 + Math.random() * 900000).toString();

        const message = `Dear user, ${otp} is the OTP for your login at Solarkits. In case you have not requested this, please contact us at office@sunnovative.com`;

        const authKey = process.env.SMS_AUTH_KEY || "3232617469766532323818";
        const sender = process.env.SMS_SENDER_ID || "SUNNOV";
        const dltTeId = process.env.DLT_TE_ID || "1707172191371418218";

        const queryParams = new URLSearchParams({
            authkey: authKey,
            mobiles: cleanTo,
            message,
            sender: sender,
            route: "2",
            country: country || "91",
            DLT_TE_ID: dltTeId,
        });

        const url = `${SMS_API_URL}?${queryParams.toString()}`;
        const response = await fetch(url);
        const data = await response.text();

        let parsed = null;
        try {
            parsed = JSON.parse(data);
        } catch (_) {}

        const isSuccess = (parsed && (parsed.Status === "Success" || parsed.Code === "000")) ||
                          (typeof data === "string" && (data.includes("Success") || /^\d+$/.test(data.trim())));

        if (!isSuccess) {
            const errorMsg = parsed?.Description || data;
            throw new Error(`SMS Gateway Error: ${errorMsg}`);
        }

        return { success: true, response: parsed || data, otp };
    } catch (error) {
        console.error("Error sending OTP:", error.message);
        throw error;
    }
};

module.exports = { sendOTP };

