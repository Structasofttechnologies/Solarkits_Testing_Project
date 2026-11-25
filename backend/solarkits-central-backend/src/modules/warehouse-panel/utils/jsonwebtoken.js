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

const sign_warehouse_token = (payload, expiresIn = '1d') => {
    return generate_token(payload, expiresIn);
};

const verify_warehouse_token = (token) => {
    return decode_token(token);
};

module.exports = { 
    generate_token,
    decode_token, 
    sign_warehouse_token, 
    verify_warehouse_token 
};