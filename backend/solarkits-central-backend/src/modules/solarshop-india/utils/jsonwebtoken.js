'use strict';

const { signToken, verifyToken } = require('../../../utils/jwtKeyProvider');

const sign_token = (payload, options = {}) => {
  return signToken(payload, options);
};

const generate_token = sign_token;

const decode_token = (token) => {
  try {
    return verifyToken(token);
  } catch (err) {
    throw err;
  }
};

module.exports = { sign_token, generate_token, decode_token };