const { decode_token } = require("../utils/jsonwebtoken");

const verify_auth = (req, res, next) => {
    try {
        let token = req.cookies?.access_token;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const decoded = decode_token(token);

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
};

const optional_auth = (req, res, next) => {
    try {
        let token = req.cookies?.token || req.cookies?.access_token;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (token) {
            req.user = decode_token(token);
        }
        next();
    } catch (error) {
        next();
    }
};

module.exports = { verify_auth, optional_auth };