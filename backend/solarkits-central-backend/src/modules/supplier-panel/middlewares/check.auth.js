const jwt = require('../utils/jsonwebtoken');
const Supplier = require('../models/supplier.schema');

const check_auth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ status: 'error', message: 'Authorization header missing.', auth: false });
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

        let decoded;
        try {
            decoded = jwt.verify_supplier_token(token);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ status: 'error', message: 'Session has expired. Please log in again.', auth: false, error: 'token_expired' });
            }
            return res.status(401).json({ status: 'error', message: 'Invalid token.', auth: false, error: 'invalid_token' });
        }

        if (!decoded?.supplier?.id || decoded.supplier.token_type !== 'access') {
            return res.status(401).json({ status: 'error', message: 'Invalid or malformed token.', auth: false });
        }

        const supplier = await Supplier.findById(decoded.supplier.id).lean();
        if (!supplier) {
            return res.status(401).json({ status: 'error', message: 'Supplier not found.', auth: false });
        }

        if (supplier.token_version !== decoded.supplier.token_version) {
            return res.status(401).json({ status: 'error', message: 'Session expired. Please log in again.', auth: false });
        }

        if (!supplier.is_active || supplier.is_deleted) {
            return res.status(403).json({ status: 'error', message: 'Account is inactive or deleted.', auth: false });
        }

        req.supplier = {
            id: supplier._id.toString(),
            company_name: supplier.company_name,
            email: supplier.email,
            status: supplier.status,
            is_supplier: true,
        };

        return next();
    } catch (err) {
        console.error('check_auth error:', err);
        return res.status(401).json({ status: 'error', message: 'Unauthorized.', auth: false });
    }
};

module.exports = check_auth;
