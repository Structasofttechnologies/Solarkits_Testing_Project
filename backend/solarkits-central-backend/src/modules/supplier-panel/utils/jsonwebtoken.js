'use strict';

const { signToken, verifyToken } = require('../../../utils/jwtKeyProvider');

const generate_token = (data, expiresIn) => {
    try {
        return signToken(data, { expiresIn: expiresIn || '1d', algorithm: 'RS512' });
    } catch (err) {
        throw err;
    }
};

const decode_token = (token) => {
    try {
        return verifyToken(token, { algorithms: ['RS512', 'RS256', 'HS256'] });
    } catch (err) {
        throw err;
    }
};

const sign_supplier_token = (payload, expiresIn = '1d') => generate_token(payload, expiresIn);
const verify_supplier_token = (token) => decode_token(token);
const generate_access_token  = (data) => generate_token(data, '15m');
const generate_refresh_token = (data) => generate_token(data, '7d');

module.exports = {
    generate_token,
    decode_token,
    sign_supplier_token,
    verify_supplier_token,
    generate_access_token,
    generate_refresh_token,
};
