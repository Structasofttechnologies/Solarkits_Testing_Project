'use strict';

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { generate_auth_tokens, set_auth_cookies, clear_auth_cookies, sign_token, decode_token } = require('../../utils/jsonwebtoken');
const { generateAndSendOtp, verifyOtp } = require('../../utils/otp.service');
const { logBoskitAudit } = require('../../utils/audit_logger');

/**
 * 1. Dealer Login
 */
const login = async (req, res) => {
  try {
    let { identifier, email, mobile, password } = req.body;

    const loginId = (identifier || email || mobile || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Email/Mobile and password are required.',
      });
    }

    const BoskitDealer = mongoose.model('boskit_dealers');
    const isEmail = loginId.includes('@');
    const query = isEmail ? { email: loginId.toLowerCase() } : { mobile: loginId };

    let dealer = await BoskitDealer.findOne({
      ...query,
      deleted_at: null,
    });

    // Development / Demo Account Auto-Provisioning for Dealer
    const demoEmails = [
      'dealer@solarkits.in',
      'dealer@boskit.in',
      'demo.dealer@solarkits.in',
      'demo.dealer@boskit.in',
    ];
    if (isEmail && demoEmails.includes(loginId.toLowerCase())) {
      const demoEmail = loginId.toLowerCase();
      const defaultDealerMobile = '9876500002';
      const password_hash = await bcrypt.hash(password || 'demo1234', 10);

      // Find or create a default distributor first
      const BoskitDistributor = mongoose.model('boskit_distributors');
      let parentDistributor = await BoskitDistributor.findOne({
        $or: [{ email: 'distributor@solarkits.in' }, { mobile: '9876500001' }],
      });
      if (!parentDistributor) {
        parentDistributor = await BoskitDistributor.create({
          business_name: 'SolarKits Master Distributor Pvt Ltd',
          email: 'distributor@solarkits.in',
          mobile: '9876500001',
          password_hash: await bcrypt.hash('demo1234', 10),
          lifecycle_status: 'active',
          activation_status: 'active',
          is_active: true,
        });
      }

      dealer = await BoskitDealer.findOne({
        $or: [{ email: demoEmail }, { mobile: defaultDealerMobile }],
      });

      if (!dealer) {
        dealer = await BoskitDealer.create({
          business_name: 'SolarKits Certified Solar Installer',
          email: demoEmail,
          mobile: defaultDealerMobile,
          password_hash,
          distributor_id: parentDistributor._id,
          lifecycle_status: 'active',
          activation_status: 'active',
          kyc_status: 'verified',
          is_active: true,
          can_see_mrp: true,
          can_place_orders: true,
        });
      } else {
        dealer.email = demoEmail;
        dealer.mobile = defaultDealerMobile;
        dealer.password_hash = password_hash;
        dealer.distributor_id = parentDistributor._id;
        dealer.lifecycle_status = 'active';
        dealer.activation_status = 'active';
        dealer.kyc_status = 'verified';
        dealer.is_active = true;
        dealer.can_see_mrp = true;
        dealer.can_place_orders = true;
        dealer.deleted_at = null;
        await dealer.save();
      }
    }

    if (!dealer) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Invalid credentials or dealer account not found.',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, dealer.password_hash);
    if (!isMatch) {
      await BoskitDealer.updateOne(
        { _id: dealer._id },
        {
          $inc: { failed_login_attempts: 1 },
          $set: { last_failed_login_at: new Date() },
        }
      );

      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Activation checks
    if (dealer.activation_status === 'pending') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Your dealer account is pending activation by your distributor or administrator.',
      });
    }

    if (dealer.activation_status === 'suspended') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Your dealer account is currently suspended.',
      });
    }

    if (dealer.activation_status === 'deactivated') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Your dealer account has been deactivated.',
      });
    }

    // Update login status
    await BoskitDealer.updateOne(
      { _id: dealer._id },
      {
        $set: {
          failed_login_attempts: 0,
          last_login_at: new Date(),
        },
      }
    );

    const tokens = generate_auth_tokens(dealer, 'boskit_dealer');
    set_auth_cookies(res, req, { ...tokens, prefix: 'boskit_dealer' });

    // Audit log
    logBoskitAudit({
      actor_type: 'boskit_dealer',
      actor_id: dealer._id,
      action: 'DEALER_LOGIN',
      entity_type: 'boskit_dealers',
      entity_id: dealer._id,
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Dealer login successful.',
      dealer: {
        id: dealer._id,
        business_name: dealer.business_name,
        email: dealer.email,
        mobile: dealer.mobile,
        distributor_id: dealer.distributor_id,
        lifecycle_status: dealer.lifecycle_status,
        activation_status: dealer.activation_status,
        can_see_mrp: dealer.can_see_mrp,
        can_place_orders: dealer.can_place_orders,
      },
      tokens,
    });
  } catch (error) {
    console.error('[dealer login Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Dealer login failed: ' + error.message,
    });
  }
};

/**
 * 2. Dealer Token Refresh
 */
const refresh_token = async (req, res) => {
  try {
    const token =
      req.cookies?.boskit_dealer_refresh_token ||
      req.cookies?.boskit_refresh_token ||
      req.body?.refreshToken ||
      req.headers['x-refresh-token'];

    if (!token) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Refresh token missing.',
      });
    }

    let decoded;
    try {
      decoded = decode_token(token);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }

    if (!decoded || !decoded.id || decoded.role !== 'boskit_dealer') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Invalid dealer token credentials.',
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
      });
    }

    if (dealer.token_version !== undefined && decoded.token_version !== dealer.token_version) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Session invalidated. Please sign in again.',
      });
    }

    const tokens = generate_auth_tokens(dealer, 'boskit_dealer');
    set_auth_cookies(res, req, { ...tokens, prefix: 'boskit_dealer' });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Token refreshed successfully.',
      tokens,
    });
  } catch (error) {
    console.error('[dealer refresh_token Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Dealer token refresh failed.',
    });
  }
};

/**
 * 3. Get Current Dealer Profile
 */
const get_me = async (req, res) => {
  try {
    const BoskitDealer = mongoose.model('boskit_dealers');
    const BoskitDistributorDealerMap = mongoose.model('boskit_distributor_dealer_maps');

    const dealer = await BoskitDealer.findById(req.user.id)
      .populate('distributor_id', 'business_name email mobile gst_trade_name')
      .populate('assigned_state_id', 'name')
      .populate('assigned_district_id', 'name')
      .populate('shop_address.state_id', 'name')
      .populate('shop_address.district_id', 'name')
      .lean();

    if (!dealer) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Dealer profile not found.',
      });
    }

    const mapping = await BoskitDistributorDealerMap.findOne({
      dealer_id: dealer._id,
      distributor_id: dealer.distributor_id?._id || dealer.distributor_id,
      status: 'active',
    }).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      dealer: {
        id: dealer._id,
        business_name: dealer.business_name,
        email: dealer.email,
        mobile: dealer.mobile,
        gst_number: dealer.gst_number,
        pan_number: dealer.pan_number,
        gst_legal_name: dealer.gst_legal_name,
        gst_trade_name: dealer.gst_trade_name,
        distributor: dealer.distributor_id ? {
          id: dealer.distributor_id._id,
          business_name: dealer.distributor_id.business_name,
          email: dealer.distributor_id.email,
          mobile: dealer.distributor_id.mobile,
        } : null,
        assigned_territory: {
          state: dealer.assigned_state_id ? { id: dealer.assigned_state_id._id, name: dealer.assigned_state_id.name } : null,
          district: dealer.assigned_district_id ? { id: dealer.assigned_district_id._id, name: dealer.assigned_district_id.name } : null,
        },
        shop_address: dealer.shop_address,
        lifecycle_status: dealer.lifecycle_status,
        activation_status: dealer.activation_status,
        kyc_status: dealer.kyc_status,
        permissions: {
          can_see_mrp: dealer.can_see_mrp,
          can_place_orders: dealer.can_place_orders,
          can_change_dealer_price: mapping?.can_change_dealer_price || false,
          uses_admin_price_slabs_only: mapping?.uses_admin_price_slabs_only !== false,
        },
      },
    });
  } catch (error) {
    console.error('[dealer get_me Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to retrieve dealer profile.',
    });
  }
};

/**
 * 4. Dealer Logout
 */
const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      logBoskitAudit({
        actor_type: 'boskit_dealer',
        actor_id: req.user.id,
        action: 'DEALER_LOGOUT',
        entity_type: 'boskit_dealers',
        entity_id: req.user.id,
        req,
      });
    }

    clear_auth_cookies(res, 'boskit_dealer');

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Dealer logged out successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Logout failed.',
    });
  }
};

/**
 * 5. Forgot Password — Send OTP
 */
const forgot_password_send_otp = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Email or mobile number is required.',
      });
    }

    const cleanId = identifier.trim();
    const isEmail = cleanId.includes('@');
    const BoskitDealer = mongoose.model('boskit_dealers');

    const dealer = await BoskitDealer.findOne({
      ...(isEmail ? { email: cleanId.toLowerCase() } : { mobile: cleanId }),
      deleted_at: null,
    });

    if (!dealer) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'No dealer account found with this identifier.',
      });
    }

    const result = await generateAndSendOtp({
      target: isEmail ? dealer.email : dealer.mobile,
      channel: isEmail ? 'email' : 'mobile',
      purpose: 'forgot_password',
      entity_type: 'boskit_dealer',
      entity_id: dealer._id,
      ip_address: req.ip,
      company_name: 'BOSKIT Dealer Recovery',
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Password reset code sent to ${result.target}.`,
      expires_at: result.expires_at,
      dev_otp: result.dev_otp,
    });
  } catch (error) {
    console.error('[dealer forgot_password_send_otp Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to send reset code.',
    });
  }
};

/**
 * 6. Forgot Password — Verify OTP
 */
const forgot_password_verify_otp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Identifier and OTP code are required.',
      });
    }

    const cleanId = identifier.trim();
    const isEmail = cleanId.includes('@');
    const BoskitDealer = mongoose.model('boskit_dealers');

    const dealer = await BoskitDealer.findOne({
      ...(isEmail ? { email: cleanId.toLowerCase() } : { mobile: cleanId }),
      deleted_at: null,
    });

    if (!dealer) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Dealer account not found.',
      });
    }

    const target = isEmail ? dealer.email : dealer.mobile;
    const result = await verifyOtp({ target, otp, purpose: 'forgot_password' });

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: result.message,
      });
    }

    const resetToken = sign_token(
      {
        id: dealer._id,
        role: 'boskit_dealer',
        type: 'forgot_password_reset',
      },
      { expiresIn: '10m' }
    );

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.cookie('boskit_dealer_reset_token', resetToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 10 * 60 * 1000,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'OTP verified. You can now reset your password.',
      resetToken,
    });
  } catch (error) {
    console.error('[dealer forgot_password_verify_otp Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to verify reset OTP.',
    });
  }
};

/**
 * 7. Reset Password
 */
const reset_password = async (req, res) => {
  try {
    const { new_password, resetToken } = req.body;
    const token = req.cookies?.boskit_dealer_reset_token || resetToken;

    if (!token) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Reset authorization token missing or expired.',
      });
    }

    let decoded;
    try {
      decoded = decode_token(token);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Reset token invalid or expired.',
      });
    }

    if (decoded.type !== 'forgot_password_reset' || decoded.role !== 'boskit_dealer') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Invalid reset authorization.',
      });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    const BoskitDealer = mongoose.model('boskit_dealers');

    await BoskitDealer.updateOne(
      { _id: decoded.id },
      {
        $set: { password_hash },
        $inc: { token_version: 1 },
      }
    );

    res.clearCookie('boskit_dealer_reset_token');

    logBoskitAudit({
      actor_type: 'boskit_dealer',
      actor_id: decoded.id,
      action: 'DEALER_PASSWORD_RESET',
      entity_type: 'boskit_dealers',
      entity_id: decoded.id,
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    console.error('[dealer reset_password Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to reset password.',
    });
  }
};

module.exports = {
  login,
  refresh_token,
  get_me,
  logout,
  forgot_password_send_otp,
  forgot_password_verify_otp,
  reset_password,
};
