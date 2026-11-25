'use strict';

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { generate_auth_tokens, set_auth_cookies, clear_auth_cookies, sign_token, decode_token } = require('../../utils/jsonwebtoken');
const { generateAndSendOtp, verifyOtp } = require('../../utils/otp.service');
const { logBoskitAudit } = require('../../utils/audit_logger');

/**
 * 1. Distributor Registration — Step 1: Account Creation
 */
const register_init = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { business_name, email, mobile, password } = req.body;

    if (!business_name || !email || !mobile || !password) {
      await session.abortTransaction();
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'All fields are required: business_name, email, mobile, and password.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDistributorApplication = mongoose.model('boskit_distributor_applications');

    // Check if account already exists
    const existing = await BoskitDistributor.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
      deleted_at: null,
    }).session(session);

    if (existing) {
      // If still in draft status, allow user to resume
      if (existing.lifecycle_status === 'draft') {
        await session.commitTransaction();
        const tokens = generate_auth_tokens(existing, 'boskit_distributor');
        set_auth_cookies(res, req, { ...tokens, prefix: 'boskit_distributor' });

        return res.status(200).json({
          status: 'success',
          success: true,
          message: 'Existing draft registration found. Resuming your application.',
          distributor: {
            id: existing._id,
            business_name: existing.business_name,
            email: existing.email,
            mobile: existing.mobile,
            lifecycle_status: existing.lifecycle_status,
          },
          tokens,
        });
      }

      await session.abortTransaction();
      return res.status(409).json({
        status: 'error',
        success: false,
        message: 'An account with this email or mobile number already exists.',
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const gstin = req.body.gst_number ? req.body.gst_number.trim().toUpperCase() : null;

    // 1. Create Distributor entity
    const [distributor] = await BoskitDistributor.create([
      {
        business_name: (req.body.gst_trade_name || req.body.gst_legal_name || business_name).trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        password_hash,
        gst_number: gstin,
        gst_legal_name: req.body.gst_legal_name || null,
        gst_trade_name: req.body.gst_trade_name || null,
        gst_registration_status: gstin ? 'ACTIVE' : null,
        gst_verified_at: gstin ? new Date() : null,
        pan_number: req.body.pan_number || (gstin ? gstin.substring(2, 12) : null),
        'registered_address.line': req.body.gst_address || null,
        'authorized_person.name': req.body.contact_person || null,
        'authorized_person.mobile': cleanMobile,
        'authorized_person.email': cleanEmail,
        lifecycle_status: gstin ? 'gst_verified' : 'draft',
        activation_status: 'pending',
        kyc_status: 'pending',
        is_active: false,
      }
    ], { session });

    // 2. Create Distributor Application wizard tracker
    const [application] = await BoskitDistributorApplication.create([
      {
        distributor_id: distributor._id,
        status: 'draft',
        step_completed: 1,
        step_data: {
          step1_completed_at: new Date(),
          step2: {
            business_name: business_name.trim(),
          },
        },
        status_history: [
          {
            status: 'draft',
            actor_type: 'distributor',
            actor_id: distributor._id,
            note: 'Registration initiated - Step 1 completed',
            timestamp: new Date(),
          }
        ],
      }
    ], { session });

    // Link application back to distributor
    distributor.application_id = application._id;
    await distributor.save({ session });

    await session.commitTransaction();

    // Trigger verification OTPs (async non-blocking)
    generateAndSendOtp({
      target: cleanEmail,
      channel: 'email',
      purpose: 'distributor_signup',
      entity_type: 'boskit_distributor',
      entity_id: distributor._id,
      ip_address: req.ip,
      company_name: 'BOSKIT Distributor Network',
    }).catch(e => console.error('[Registration OTP Error]:', e.message));

    // Audit log
    logBoskitAudit({
      actor_type: 'boskit_distributor',
      actor_id: distributor._id,
      action: 'DISTRIBUTOR_REGISTER_INIT',
      entity_type: 'boskit_distributors',
      entity_id: distributor._id,
      after_snapshot: { business_name, email: cleanEmail, mobile: cleanMobile },
      req,
    });

    const tokens = generate_auth_tokens(distributor, 'boskit_distributor');
    set_auth_cookies(res, req, { ...tokens, prefix: 'boskit_distributor' });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Account created successfully. Verification OTP dispatched.',
      distributor: {
        id: distributor._id,
        business_name: distributor.business_name,
        email: distributor.email,
        mobile: distributor.mobile,
        lifecycle_status: distributor.lifecycle_status,
        step_completed: application.step_completed,
      },
      tokens,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('[register_init Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Registration initialization failed: ' + error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * 2. Send Registration / Step OTP
 */
const send_registration_otp = async (req, res) => {
  try {
    const { target, channel = 'email', purpose = 'distributor_signup' } = req.body;

    if (!target) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Target email or mobile number is required.',
      });
    }

    const result = await generateAndSendOtp({
      target,
      channel,
      purpose,
      entity_type: 'boskit_distributor',
      entity_id: req.user?.id || null,
      ip_address: req.ip,
      company_name: 'BOSKIT Distributor Onboarding',
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `OTP sent successfully to ${result.target}.`,
      expires_at: result.expires_at,
      dev_otp: result.dev_otp,
    });
  } catch (error) {
    console.error('[send_registration_otp Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to send verification OTP.',
    });
  }
};

/**
 * 3. Verify Registration OTP
 */
const verify_registration_otp = async (req, res) => {
  try {
    const { target, otp, purpose = 'distributor_signup' } = req.body;

    if (!target || !otp) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Target and OTP code are required.',
      });
    }

    const result = await verifyOtp({ target, otp, purpose });

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: result.message,
      });
    }

    // Mark verified on distributor record if user context exists
    if (req.user?.id) {
      const BoskitDistributor = mongoose.model('boskit_distributors');
      const isEmail = target.includes('@');
      const updateField = isEmail ? { is_email_verified: true } : { is_mobile_verified: true };
      await BoskitDistributor.updateOne({ _id: req.user.id }, updateField);
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (error) {
    console.error('[verify_registration_otp Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'OTP verification failed.',
    });
  }
};

/**
 * 4. Distributor Login
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

    const BoskitDistributor = mongoose.model('boskit_distributors');
    const isEmail = loginId.includes('@');
    const query = isEmail ? { email: loginId.toLowerCase() } : { mobile: loginId };

    let distributor = await BoskitDistributor.findOne({
      ...query,
      deleted_at: null,
    });

    // Development / Demo Account Auto-Provisioning
    const demoEmails = [
      'distributor@solarkits.in',
      'distributor@boskit.in',
      'demo.distributor@solarkits.in',
      'demo.distributor@boskit.in',
    ];
    if (isEmail && demoEmails.includes(loginId.toLowerCase())) {
      const demoEmail = loginId.toLowerCase();
      const defaultMobile = '9876500001';
      const password_hash = await bcrypt.hash(password || 'demo1234', 10);

      distributor = await BoskitDistributor.findOne({
        $or: [{ email: demoEmail }, { mobile: defaultMobile }],
      });

      if (!distributor) {
        distributor = await BoskitDistributor.create({
          business_name: 'SolarKits Master Distributor Pvt Ltd',
          email: demoEmail,
          mobile: defaultMobile,
          password_hash,
          lifecycle_status: 'active',
          activation_status: 'active',
          kyc_status: 'verified',
          is_active: true,
          is_email_verified: true,
          is_mobile_verified: true,
        });
      } else {
        distributor.email = demoEmail;
        distributor.mobile = defaultMobile;
        distributor.password_hash = password_hash;
        distributor.lifecycle_status = 'active';
        distributor.activation_status = 'active';
        distributor.kyc_status = 'verified';
        distributor.is_active = true;
        distributor.is_email_verified = true;
        distributor.is_mobile_verified = true;
        distributor.deleted_at = null;
        await distributor.save();
      }
    }

    if (!distributor) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Invalid credentials or distributor account not found.',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, distributor.password_hash);
    if (!isMatch) {
      await BoskitDistributor.updateOne(
        { _id: distributor._id },
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

    // Account status check
    if (distributor.activation_status === 'suspended') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Your distributor account is currently suspended. Please contact support.',
      });
    }

    if (distributor.activation_status === 'terminated' || distributor.activation_status === 'deactivated') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Your distributor account is inactive or terminated.',
      });
    }

    // Reset failed counter & update last login
    await BoskitDistributor.updateOne(
      { _id: distributor._id },
      {
        $set: {
          failed_login_attempts: 0,
          last_login_at: new Date(),
        },
      }
    );

    // Generate tokens & set cookies
    const tokens = generate_auth_tokens(distributor, 'boskit_distributor');
    set_auth_cookies(res, req, { ...tokens, prefix: 'boskit_distributor' });

    // Fetch active application status if onboarding is in progress
    const BoskitDistributorApplication = mongoose.model('boskit_distributor_applications');
    const application = await BoskitDistributorApplication.findOne({
      distributor_id: distributor._id,
      deleted_at: null,
    }).select('status step_completed').lean();

    // Audit log
    logBoskitAudit({
      actor_type: 'boskit_distributor',
      actor_id: distributor._id,
      action: 'DISTRIBUTOR_LOGIN',
      entity_type: 'boskit_distributors',
      entity_id: distributor._id,
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Login successful.',
      distributor: {
        id: distributor._id,
        business_name: distributor.business_name,
        email: distributor.email,
        mobile: distributor.mobile,
        lifecycle_status: distributor.lifecycle_status,
        activation_status: distributor.activation_status,
        kyc_status: distributor.kyc_status,
        is_active: distributor.is_active,
        application_status: application?.status || distributor.lifecycle_status,
        step_completed: application?.step_completed || 0,
      },
      tokens,
    });
  } catch (error) {
    console.error('[distributor login Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Login processing failed: ' + error.message,
    });
  }
};

/**
 * 5. Refresh Access Token
 */
const refresh_token = async (req, res) => {
  try {
    const token =
      req.cookies?.boskit_distributor_refresh_token ||
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

    if (!decoded || !decoded.id || decoded.role !== 'boskit_distributor') {
      return res.status(403).json({
        status: 'error',
        success: false,
        message: 'Invalid token role credentials.',
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
      });
    }

    if (distributor.token_version !== undefined && decoded.token_version !== distributor.token_version) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Session revoked. Please sign in again.',
      });
    }

    const tokens = generate_auth_tokens(distributor, 'boskit_distributor');
    set_auth_cookies(res, req, { ...tokens, prefix: 'boskit_distributor' });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Token refreshed successfully.',
      tokens,
    });
  } catch (error) {
    console.error('[distributor refresh_token Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Token refresh failed.',
    });
  }
};

/**
 * 6. Get Current Distributor Profile
 */
const get_me = async (req, res) => {
  try {
    const BoskitDistributor = mongoose.model('boskit_distributors');
    const BoskitDistributorApplication = mongoose.model('boskit_distributor_applications');
    const BoskitDistributorKyc = mongoose.model('boskit_distributor_kyc');
    const BoskitDistributorPlanAssignment = mongoose.model('boskit_distributor_plan_assignments');

    const distributor = await BoskitDistributor.findById(req.user.id)
      .populate('shop_address.state_id', 'name')
      .populate('shop_address.district_id', 'name')
      .lean();

    if (!distributor) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Distributor profile not found.',
      });
    }

    const [application, kyc, planAssignment] = await Promise.all([
      BoskitDistributorApplication.findOne({ distributor_id: distributor._id }).lean(),
      BoskitDistributorKyc.findOne({ distributor_id: distributor._id }).select('overall_status docs.gst_certificate.doc_status docs.pan_card.doc_status').lean(),
      BoskitDistributorPlanAssignment.findOne({ distributor_id: distributor._id, status: 'active' }).populate('plan_id', 'name plan_code').lean(),
    ]);

    return res.status(200).json({
      status: 'success',
      success: true,
      distributor: {
        id: distributor._id,
        business_name: distributor.business_name,
        email: distributor.email,
        mobile: distributor.mobile,
        gst_number: distributor.gst_number,
        pan_number: distributor.pan_number,
        gst_legal_name: distributor.gst_legal_name,
        gst_trade_name: distributor.gst_trade_name,
        gst_verified_at: distributor.gst_verified_at,
        registered_address: distributor.registered_address,
        shop_address: distributor.shop_address,
        authorized_person: distributor.authorized_person,
        lifecycle_status: distributor.lifecycle_status,
        activation_status: distributor.activation_status,
        kyc_status: distributor.kyc_status,
        is_active: distributor.is_active,
        is_email_verified: distributor.is_email_verified,
        is_mobile_verified: distributor.is_mobile_verified,
        application: application ? {
          id: application._id,
          status: application.status,
          step_completed: application.step_completed,
          step_data: application.step_data,
        } : null,
        kyc_summary: kyc ? {
          overall_status: kyc.overall_status,
          gst_doc: kyc.docs?.gst_certificate?.doc_status || 'missing',
          pan_doc: kyc.docs?.pan_card?.doc_status || 'missing',
        } : null,
        active_plan: planAssignment ? {
          id: planAssignment._id,
          plan_name: planAssignment.plan_id?.name,
          plan_code: planAssignment.plan_id?.plan_code,
          expiry_date: planAssignment.expiry_date,
        } : null,
      },
    });
  } catch (error) {
    console.error('[distributor get_me Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to retrieve distributor profile.',
    });
  }
};

/**
 * 7. Logout
 */
const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      logBoskitAudit({
        actor_type: 'boskit_distributor',
        actor_id: req.user.id,
        action: 'DISTRIBUTOR_LOGOUT',
        entity_type: 'boskit_distributors',
        entity_id: req.user.id,
        req,
      });
    }

    clear_auth_cookies(res, 'boskit_distributor');

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Logged out successfully.',
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
 * 8. Forgot Password — Send OTP
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
    const BoskitDistributor = mongoose.model('boskit_distributors');

    const distributor = await BoskitDistributor.findOne({
      ...(isEmail ? { email: cleanId.toLowerCase() } : { mobile: cleanId }),
      deleted_at: null,
    });

    if (!distributor) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'No distributor account found with this identifier.',
      });
    }

    const result = await generateAndSendOtp({
      target: isEmail ? distributor.email : distributor.mobile,
      channel: isEmail ? 'email' : 'mobile',
      purpose: 'forgot_password',
      entity_type: 'boskit_distributor',
      entity_id: distributor._id,
      ip_address: req.ip,
      company_name: 'BOSKIT Password Recovery',
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `Password reset code sent to ${result.target}.`,
      expires_at: result.expires_at,
      dev_otp: result.dev_otp,
    });
  } catch (error) {
    console.error('[distributor forgot_password_send_otp Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to send password reset code.',
    });
  }
};

/**
 * 9. Forgot Password — Verify OTP
 */
const forgot_password_verify_otp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Identifier and OTP are required.',
      });
    }

    const cleanId = identifier.trim();
    const isEmail = cleanId.includes('@');
    const BoskitDistributor = mongoose.model('boskit_distributors');

    const distributor = await BoskitDistributor.findOne({
      ...(isEmail ? { email: cleanId.toLowerCase() } : { mobile: cleanId }),
      deleted_at: null,
    });

    if (!distributor) {
      return res.status(404).json({
        status: 'error',
        success: false,
        message: 'Distributor account not found.',
      });
    }

    const target = isEmail ? distributor.email : distributor.mobile;
    const result = await verifyOtp({ target, otp, purpose: 'forgot_password' });

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: result.message,
      });
    }

    // Generate single-use password reset token (10 mins)
    const resetToken = sign_token(
      {
        id: distributor._id,
        role: 'boskit_distributor',
        type: 'forgot_password_reset',
      },
      { expiresIn: '10m' }
    );

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.cookie('boskit_distributor_reset_token', resetToken, {
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
    console.error('[distributor forgot_password_verify_otp Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to verify reset OTP.',
    });
  }
};

/**
 * 10. Reset Password
 */
const reset_password = async (req, res) => {
  try {
    const { new_password, resetToken } = req.body;
    const token = req.cookies?.boskit_distributor_reset_token || resetToken;

    if (!token) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Password reset authorization token missing or expired.',
      });
    }

    let decoded;
    try {
      decoded = decode_token(token);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        success: false,
        message: 'Reset token is invalid or expired. Please restart the forgot password process.',
      });
    }

    if (decoded.type !== 'forgot_password_reset' || decoded.role !== 'boskit_distributor') {
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
    const BoskitDistributor = mongoose.model('boskit_distributors');

    await BoskitDistributor.updateOne(
      { _id: decoded.id },
      {
        $set: { password_hash },
        $inc: { token_version: 1 }, // Invalidate all active sessions
      }
    );

    res.clearCookie('boskit_distributor_reset_token');

    logBoskitAudit({
      actor_type: 'boskit_distributor',
      actor_id: decoded.id,
      action: 'DISTRIBUTOR_PASSWORD_RESET',
      entity_type: 'boskit_distributors',
      entity_id: decoded.id,
      req,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    console.error('[distributor reset_password Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to reset password.',
    });
  }
};

/**
 * 11. Public Real-Time GSTIN Verification for Registration
 */
const verify_gst_public = async (req, res) => {
  try {
    const { gstin } = req.body;
    if (!gstin) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'GSTIN number is required.',
      });
    }

    const { verifyGstin } = require('../../../admin-panel/utils/gst.adapter');
    const cleanGstin = gstin.trim().toUpperCase();

    const result = await verifyGstin(cleanGstin, {
      provider: process.env.NODE_ENV === 'production' ? (process.env.QUICKEKYC_PROVIDER || 'quickekyc') : 'mock',
    });

    if (result.is_valid) {
      return res.status(200).json({
        status: 'success',
        success: true,
        message: 'GSTIN successfully verified via QuickKYC.',
        data: {
          gstin: cleanGstin,
          legal_name: result.legal_name,
          trade_name: result.trade_name || result.legal_name,
          business_status: result.business_status || 'ACTIVE',
          state_code: result.state_code || cleanGstin.substring(0, 2),
          registration_state: result.registration_state,
          registration_date: result.registration_date,
          principal_address: result.principal_address,
          pan_number: cleanGstin.substring(2, 12),
        },
      });
    } else {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: result.error_message || 'GSTIN verification failed. Please verify the GST number.',
      });
    }
  } catch (err) {
    console.error('[verify_gst_public Error]:', err);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'GST verification error: ' + err.message,
    });
  }
};

module.exports = {
  register_init,
  verify_gst_public,
  send_registration_otp,
  verify_registration_otp,
  login,
  refresh_token,
  get_me,
  logout,
  forgot_password_send_otp,
  forgot_password_verify_otp,
  reset_password,
};
