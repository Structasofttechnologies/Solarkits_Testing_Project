'use strict';

const { signToken, verifyToken } = require('../../../utils/jwtKeyProvider');

/**
 * Sign JWT token
 */
const sign_token = (payload, options = {}) => {
  return signToken(payload, options);
};

/**
 * Decode / Verify JWT token
 */
const decode_token = (token) => {
  try {
    return verifyToken(token);
  } catch (err) {
    throw err;
  }
};

/**
 * Helper to generate Auth tokens pair (Access + Refresh)
 */
const generate_auth_tokens = (user, role = 'boskit_distributor') => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    mobile: user.mobile,
    business_name: user.business_name,
    role: role,
    token_version: user.token_version || 1,
  };

  const accessToken = sign_token(payload, { expiresIn: '15m' });
  const refreshToken = sign_token(payload, { expiresIn: '7d' });

  return { accessToken, refreshToken };
};

/**
 * Set standard BOSKIT HttpOnly auth cookies on response
 */
const set_auth_cookies = (res, req, { accessToken, refreshToken, prefix = 'boskit' }) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  
  const cookieOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
  };

  res.cookie(`${prefix}_access_token`, accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie(`${prefix}_refresh_token`, refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Also set generic token cookie for compatibility
  res.cookie('boskit_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
};

/**
 * Clear BOSKIT auth cookies on response
 */
const clear_auth_cookies = (res, prefix = 'boskit') => {
  res.clearCookie(`${prefix}_access_token`);
  res.clearCookie(`${prefix}_refresh_token`);
  res.clearCookie('boskit_token');
  res.clearCookie('boskit_distributor_access_token');
  res.clearCookie('boskit_dealer_access_token');
};

module.exports = {
  sign_token,
  decode_token,
  generate_auth_tokens,
  set_auth_cookies,
  clear_auth_cookies,
};
