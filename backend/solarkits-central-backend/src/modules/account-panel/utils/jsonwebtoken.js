'use strict';

const { verifyToken } = require('../../../utils/jwtKeyProvider');

const decode_token = (token) => {
    try {
        return verifyToken(token, { algorithms: ['RS512', 'RS256', 'HS256'] });
    } catch (err) {
        throw err;
    }
};

module.exports = { decode_token };
