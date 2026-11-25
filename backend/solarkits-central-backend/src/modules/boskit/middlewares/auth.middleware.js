'use strict';

const mongoose = require('mongoose');
const { decode_token } = require('../utils/jsonwebtoken');

/**
 * Extract token from standard cookie keys or Authorization header
 */
const extractToken = (req, preferredCookieNames = []) => {
  for (const cookieName of preferredCookieNames) {
    if (req.cookies && req.cookies[cookieName]) {
      return req.cookies[cookieName];
    }
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  return null;
};

/**
 * Authenticate BOSKIT Distributor
 */
const authenticateBoskitDistributor = async (req, res, next) => {
  try {
    const token = extractToken(req, [
      'boskit_distributor_access_token',
      'boskit_access_token',
      'boskit_token',
    ]);

    if (!token) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Authentication token missing. Please sign in to your Distributor account.',
        auth: false,
      });
    }

    let decoded;
    try {
      decoded = decode_token(token);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Session expired or invalid. Please sign in again.',
        auth: false,
      });
    }

    if (!decoded || !decoded.id || decoded.role !== 'boskit_distributor') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Access denied: Distributor session required.',
        auth: false,
      });
    }

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const distributor = await BoskitDistributor.findOne({
      _id: decoded.id,
      deleted_at: null,
    }).lean();

    if (!distributor) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Distributor account not found.',
        auth: false,
      });
    }

    // Token version check (for forced logout / password reset)
    if (
      distributor.token_version !== undefined &&
      decoded.token_version !== undefined &&
      distributor.token_version !== decoded.token_version
    ) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Session invalidated. Please sign in again.',
        auth: false,
      });
    }

    // Account status check
    if (distributor.activation_status === 'suspended') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Your distributor account is currently suspended. Please contact support.',
        auth: false,
      });
    }

    if (distributor.activation_status === 'deactivated' || distributor.activation_status === 'terminated') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Your distributor account is inactive or terminated.',
        auth: false,
      });
    }

    // Attach contextual information
    req.distributor = distributor;
    req.user = {
      id: distributor._id,
      email: distributor.email,
      mobile: distributor.mobile,
      business_name: distributor.business_name,
      lifecycle_status: distributor.lifecycle_status,
      activation_status: distributor.activation_status,
      kyc_status: distributor.kyc_status,
      role: 'boskit_distributor',
    };

    next();
  } catch (error) {
    console.error('[authenticateBoskitDistributor Error]:', error.message);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Authentication internal failure.',
      auth: false,
    });
  }
};

/**
 * Authenticate BOSKIT Dealer
 */
const authenticateBoskitDealer = async (req, res, next) => {
  try {
    const token = extractToken(req, [
      'boskit_dealer_access_token',
      'boskit_access_token',
      'boskit_token',
    ]);

    if (!token) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Authentication token missing. Please sign in to your Dealer account.',
        auth: false,
      });
    }

    let decoded;
    try {
      decoded = decode_token(token);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Session expired or invalid. Please sign in again.',
        auth: false,
      });
    }

    if (!decoded || !decoded.id || decoded.role !== 'boskit_dealer') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Access denied: Dealer session required.',
        auth: false,
      });
    }

    const BoskitDealer = mongoose.model('boskit_dealers');
    const dealer = await BoskitDealer.findOne({
      _id: decoded.id,
      deleted_at: null,
    }).lean();

    if (!dealer) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Dealer account not found.',
        auth: false,
      });
    }

    if (
      dealer.token_version !== undefined &&
      decoded.token_version !== undefined &&
      dealer.token_version !== decoded.token_version
    ) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Session invalidated. Please sign in again.',
        auth: false,
      });
    }

    if (dealer.activation_status === 'suspended') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Your dealer account is suspended.',
        auth: false,
      });
    }

    if (dealer.activation_status === 'deactivated') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Your dealer account is deactivated.',
        auth: false,
      });
    }

    req.dealer = dealer;
    req.user = {
      id: dealer._id,
      email: dealer.email,
      mobile: dealer.mobile,
      business_name: dealer.business_name,
      distributor_id: dealer.distributor_id,
      lifecycle_status: dealer.lifecycle_status,
      activation_status: dealer.activation_status,
      can_see_mrp: dealer.can_see_mrp,
      can_place_orders: dealer.can_place_orders,
      role: 'boskit_dealer',
    };

    next();
  } catch (error) {
    console.error('[authenticateBoskitDealer Error]:', error.message);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Authentication internal failure.',
      auth: false,
    });
  }
};

/**
 * Authenticate any BOSKIT user (Distributor or Dealer)
 */
const authenticateBoskitUser = async (req, res, next) => {
  const token = extractToken(req, [
    'boskit_access_token',
    'boskit_token',
    'boskit_distributor_access_token',
    'boskit_dealer_access_token',
  ]);

  if (!token) {
    return res.status(401).json({
      status: 'error',
      success: false,
      message: 'Authentication token required.',
      auth: false,
    });
  }

  try {
    const decoded = decode_token(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Invalid session.',
        auth: false,
      });
    }

    if (decoded.role === 'boskit_distributor') {
      return authenticateBoskitDistributor(req, res, next);
    } else if (decoded.role === 'boskit_dealer') {
      return authenticateBoskitDealer(req, res, next);
    } else {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Invalid BOSKIT role credentials.',
        auth: false,
      });
    }
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      success: false,
      message: 'Session expired or invalid.',
      auth: false,
    });
  }
};

/**
 * Optional Authenticate BOSKIT Distributor
 * Attaches req.distributor and req.user if a valid token is provided,
 * but allows unauthenticated / guest requests to proceed.
 */
const optionalBoskitDistributorAuth = async (req, res, next) => {
  try {
    const token = extractToken(req, [
      'boskit_distributor_access_token',
      'boskit_access_token',
      'boskit_token',
    ]);

    if (!token) {
      return next();
    }

    let decoded;
    try {
      decoded = decode_token(token);
    } catch (err) {
      return next();
    }

    if (!decoded || !decoded.id || decoded.role !== 'boskit_distributor') {
      return next();
    }

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const distributor = await BoskitDistributor.findOne({
      _id: decoded.id,
      deleted_at: null,
    }).lean();

    if (distributor && distributor.activation_status !== 'suspended' && distributor.activation_status !== 'terminated') {
      req.distributor = distributor;
      req.user = {
        id: distributor._id,
        _id: distributor._id,
        email: distributor.email,
        mobile: distributor.mobile,
        business_name: distributor.business_name,
        lifecycle_status: distributor.lifecycle_status,
        activation_status: distributor.activation_status,
        kyc_status: distributor.kyc_status,
        role: 'boskit_distributor',
      };
    }

    return next();
  } catch (error) {
    return next();
  }
};

module.exports = {
  authenticateBoskitDistributor,
  authenticateBoskitDealer,
  authenticateBoskitUser,
  optionalBoskitDistributorAuth,
};
