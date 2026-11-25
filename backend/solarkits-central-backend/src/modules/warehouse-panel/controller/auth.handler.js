const bcrypt = require('bcrypt');
const { WarehouseUser, CompanyWarehouse } = require('../models/company_warehouse_db');
const { Otp } = require('../models/user_db');
const GeoLevel0 = require('../models/geolocation_db/geolocation_level_0.schema');
const jwt = require('../utils/jsonwebtoken');
const { sendOTP } = require('../utils/nodemailer');

const ms_conversion = (time) => {
  if (!time || typeof time !== 'string') return null;
  const unit = time.slice(-1);
  const value = parseInt(time.slice(0, -1));
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return map[unit] ? value * map[unit] : null;
};

const login_identify = async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email || !phone) {
      return res.status(400).json({ status: "error", message: "Email and phone number are required." });
    }

    const user = await WarehouseUser.findOne({
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      is_deleted: { $ne: true }
    });

    if (!user) {
      return res.status(404).json({ status: "error", message: "No warehouse manager found with the provided email and phone number." });
    }

    if (!user.is_active) {
      return res.status(403).json({ status: "error", message: "Your manager account is inactive. Please contact support." });
    }

    if (!user.is_verified) {
      // Send OTP via email
      const { otp } = await sendOTP(user.email, "Warehouse Manager Verification", "Your verification OTP code is:");

      const otp_payload = { user_id: user._id.toString(), otp, token_type: 'otp_verification', is_warehouse_user: true };
      const verification_token = jwt.sign_warehouse_token(otp_payload, '3m'); // 3 minutes expiration

      return res.status(200).json({
        status: "success",
        state: "unverified",
        verification_token,
        message: "OTP sent to your registered email address."
      });
    }

    return res.status(200).json({
      status: "success",
      state: "verified",
      message: "User identified. Please enter your password."
    });
  } catch (error) {
    console.error("Error in login_identify:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

const verify_otp = async (req, res) => {
  try {
    const token = req.body.token || req.body.verification_token;
    const { otp } = req.body;
    if (!token || !otp) return res.status(400).json({ message: 'Token and OTP are required.', status: 'error' });

    let decoded;
    try {
      decoded = jwt.verify_warehouse_token(token);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired session token.', status: 'error' });
    }

    const userId = decoded.user_id || decoded.user?.id;
    const purpose = decoded.user?.purpose;

    if (!userId) return res.status(401).json({ message: 'Invalid token payload.', status: 'error' });

    if (purpose) {
      const otp_record = await Otp.findOne({
        user_id: userId, purpose,
        expires_at: { $gt: new Date() },
        tries: { $lt: 3 },
      }).sort({ created_at: -1 });

      if (!otp_record) return res.status(410).json({ message: 'OTP has expired or is invalid. Please request a new one.', status: 'error' });

      const valid = await bcrypt.compare(otp.trim(), otp_record.otp);
      if (!valid) {
        const new_tries = (otp_record.tries || 0) + 1;
        await Otp.findByIdAndUpdate(otp_record._id, { $set: { tries: new_tries } });
        if (new_tries >= 3) return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.', status: 'error' });
        const rem = 3 - new_tries;
        return res.status(400).json({ message: `Invalid OTP. You have ${rem} ${rem > 1 ? 'tries' : 'try'} remaining.`, status: 'error' });
      }

      await Otp.findByIdAndUpdate(otp_record._id, { $set: { tries: 3 } });

      const user = await WarehouseUser.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found.', status: 'error' });

      const token_code = Math.floor(100000 + Math.random() * 900000).toString();
      const encoded = await bcrypt.hash(token_code, 10);
      await WarehouseUser.findByIdAndUpdate(user._id, { $set: { token: encoded } });

      return res.status(200).json({
        message: 'OTP verified successfully.',
        status: 'success',
        token: jwt.sign_warehouse_token({ user: { id: user._id.toString(), token_code, is_warehouse_user: true } }, process.env.SET_PASSCODE_JWT_EXPIRES || '15m'),
      });
    } else {
      if (decoded.token_type !== 'otp_verification') {
        return res.status(400).json({ status: "error", message: "Invalid verification type." });
      }
      if (decoded.otp !== otp.trim()) {
        return res.status(400).json({ status: "error", message: "Invalid OTP code." });
      }
      const password_token = jwt.sign_warehouse_token({ user_id: userId, token_type: 'password_set', is_warehouse_user: true }, '10m');
      return res.status(200).json({
        status: "success",
        password_token,
        message: "OTP verified. Please set your password."
      });
    }
  } catch (error) {
    console.error("Error in verify_otp:", error);
    return res.status(500).json({ message: 'Internal server error.', status: 'error' });
  }
};

const get_active_countries = async (req, res) => {
  try {
    const rows = await GeoLevel0.find(
      { min_phone_length: { $ne: 0 }, max_phone_length: { $ne: 0 } },
      { _id: 1, name: 1, iso2: 1, phone_code: 1, min_phone_length: 1, max_phone_length: 1 }
    ).sort({ name: 1 }).lean();

    const data = rows.map(r => ({
      id: r._id.toString(),
      name: r.name,
      iso2: r.iso2,
      phone_code: r.phone_code,
      min_phone_length: r.min_phone_length,
      max_phone_length: r.max_phone_length,
    }));
    return res.status(200).json({ message: 'Get all active countries phone codes successfully.', status: 'success', data });
  } catch (err) {
    console.error("Error in get_active_countries:", err);
    return res.status(500).json({ message: 'Internal server error.', status: 'error' });
  }
};

const _send_otp = async (req, res, purpose) => {
  try {
    const { verification_type, email, phone, phone_code } = req.body;
    if (!verification_type) return res.status(400).json({ status: 'error', message: 'Verification type is required.' });

    if (verification_type === 'email') {
      if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ status: 'error', message: 'Invalid email format.' });

      const user = await WarehouseUser.findOne({ email: email.trim().toLowerCase(), is_deleted: { $ne: true } });
      if (!user) return res.status(404).json({ status: 'error', message: purpose === 'verify' ? 'This email is not registered.' : 'No account found with this email.' });
      if (purpose === 'verify' && user.is_verified) return res.status(409).json({ status: 'error', message: "Your account is already verified." });

      await Otp.updateMany({ user_id: user._id, purpose }, { $set: { tries: 3 } });

      const { otp } = await sendOTP(email, "Warehouse Manager OTP Request", "Your verification OTP code is:");
      const expires_at = new Date(Date.now() + 3 * 60 * 1000);
      const hashed = await bcrypt.hash(otp, 10);

      await Otp.create({ user_id: user._id, otp: hashed, purpose, expires_at, tries: 0 });

      const token = jwt.sign_warehouse_token({ user: { id: user._id.toString(), verification_type, value: email, purpose, is_warehouse_user: true } }, process.env.SET_PASSCODE_JWT_EXPIRES || '3m');
      return res.status(200).json({ status: 'success', message: 'OTP sent to email.', expire_time: expires_at, verification_type, value: email, token });
    }

    if (verification_type === 'phone') {
      if (!phone || !phone_code) return res.status(400).json({ status: 'error', message: 'Please provide both phone_code and phone.' });

      const country = await GeoLevel0.findOne({ phone_code: phone_code.trim(), is_active: true });
      if (!country) return res.status(404).json({ status: 'error', message: 'Invalid or inactive country code.' });

      const len = phone.trim().length;
      if (len < country.min_phone_length || len > country.max_phone_length) {
        return res.status(400).json({ status: 'error', message: `Phone must be ${country.min_phone_length}–${country.max_phone_length} digits.` });
      }

      const user = await WarehouseUser.findOne({ phone: phone.trim(), phone_code: phone_code.trim(), is_deleted: { $ne: true } });
      if (!user) return res.status(404).json({ status: 'error', message: 'This phone number is not registered.' });
      if (purpose === 'verify' && user.is_verified) return res.status(409).json({ status: 'error', message: 'Account already verified.' });

      await Otp.updateMany({ user_id: user._id, purpose }, { $set: { tries: 3 } });

      const yourbulksms = require('../utils/yourbulksms');
      const { otp } = await yourbulksms.sendOTP(country.phone_code, phone.trim());
      const expires_at = new Date(Date.now() + 3 * 60 * 1000);
      const hashed = await bcrypt.hash(otp, 10);

      await Otp.create({ user_id: user._id, otp: hashed, purpose, expires_at, tries: 0 });

      const token = jwt.sign_warehouse_token({ user: { id: user._id.toString(), verification_type, value: phone.trim(), phone_code: country.phone_code, purpose, is_warehouse_user: true } }, process.env.SET_PASSCODE_JWT_EXPIRES || '3m');
      return res.status(200).json({ status: 'success', message: 'OTP sent to phone.', expire_time: expires_at, verification_type, value: `${country.phone_code}${phone.trim()}`, token });
    }

    return res.status(400).json({ status: 'error', message: "Invalid verification_type. Must be 'email' or 'phone'." });
  } catch (error) {
    console.error(`Error in _send_otp (${purpose}):`, error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

const request_verify_account_otp = (req, res) => _send_otp(req, res, 'verify');
const request_forgot_password_otp = (req, res) => _send_otp(req, res, 'forgot_password');

const set_passcode = async (req, res) => {
  try {
    const { token, passcode, confirm_passcode } = req.body;
    if (!passcode || !confirm_passcode) return res.status(400).json({ status: 'error', message: 'Passcode and confirm passcode are required.' });
    if (passcode.length !== 4) return res.status(400).json({ status: 'error', message: 'Passcode must be exactly 4 digits.' });
    if (passcode !== confirm_passcode) return res.status(400).json({ status: 'error', message: 'Passcodes do not match.' });

    let decoded;
    try {
      decoded = jwt.verify_warehouse_token(token);
    } catch (err) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
    }

    if (!decoded?.user?.id) return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });

    const user = await WarehouseUser.findById(decoded.user.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found.' });
    if (!user.token) return res.status(401).json({ status: 'error', message: 'This session has already been used or is invalid.' });

    const token_valid = await bcrypt.compare(decoded.user.token_code, user.token);
    if (!token_valid) return res.status(401).json({ status: 'error', message: 'Invalid session token.' });

    const hashed = await bcrypt.hash(passcode, 10);
    user.passcode = hashed;
    user.is_verified = true;
    user.token = null;
    user.token_version = (user.token_version || 0) + 1;
    await user.save();

    // Auto-activate warehouse
    const warehouse = await CompanyWarehouse.findById(user.warehouse_id);
    if (warehouse) {
      warehouse.is_active = true;
      await warehouse.save();
    }

    const REFRESH_EXP = process.env.AUTH_JWT_REFRESH_EXPIRES || '2d';
    const ACCESS_EXP = process.env.AUTH_JWT_ACCESS_EXPIRES || process.env.AUTH_JWT_EXPIRES || '17m';

    const refresh_token = jwt.sign_warehouse_token(
      { user: { id: user._id.toString(), token_version: user.token_version, token_type: 'refresh', is_warehouse_user: true } },
      REFRESH_EXP
    );

    res.cookie('warehouse_refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: ms_conversion(REFRESH_EXP) || 2 * 24 * 60 * 60 * 1000
    });

    const loginToken = jwt.sign_warehouse_token({
      user: { id: user._id.toString(), token_version: user.token_version, token_type: 'access', is_warehouse_user: true }
    }, ACCESS_EXP);

    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      is_warehouse_user: true,
      warehouse_id: user.warehouse_id,
      warehouse_status: warehouse ? warehouse.status : null,
      rejection_reason: warehouse ? warehouse.rejection_reason : null
    };

    return res.status(200).json({
      status: 'success',
      message: 'Passcode set successfully. You are now logged in.',
      token: loginToken,
      user: userPayload
    });
  } catch (error) {
    console.error('Error in set_passcode:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

const login = async (req, res) => {
  try {
    const { auth_type, email, passcode, phone, phone_code } = req.body;
    if (!auth_type || !passcode) return res.status(400).json({ status: 'error', message: 'Please provide auth_type and passcode.' });
    if (!['email', 'phone'].includes(auth_type)) return res.status(400).json({ status: 'error', message: "auth_type must be 'email' or 'phone'." });

    let userDoc = null;

    if (auth_type === 'email') {
      if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });
      userDoc = await WarehouseUser.findOne({ email: email.trim().toLowerCase(), is_deleted: { $ne: true } });
    }

    if (auth_type === 'phone') {
      if (!phone || !phone_code) return res.status(400).json({ status: 'error', message: 'Provide both phone_code and phone.' });

      const country = await GeoLevel0.findOne({ phone_code: phone_code.trim() });
      if (!country) return res.status(400).json({ status: 'error', message: 'Invalid phone code.' });

      const len = phone.trim().length;
      if (len < country.min_phone_length || len > country.max_phone_length) {
        return res.status(400).json({ status: 'error', message: `Phone must be ${country.min_phone_length}–${country.max_phone_length} digits.` });
      }
      userDoc = await WarehouseUser.findOne({ phone: phone.trim(), phone_code: phone_code.trim(), is_deleted: { $ne: true } });
    }

    if (!userDoc) return res.status(404).json({ status: 'error', message: 'Warehouse manager not found.' });

    const TWO_MIN = 2 * 60 * 1000;
    if (userDoc.failed_login_attempts >= 3 && userDoc.last_failed_login_at) {
      const diff = Date.now() - new Date(userDoc.last_failed_login_at).getTime();
      if (diff < TWO_MIN) {
        const sec = Math.ceil((TWO_MIN - diff) / 1000);
        return res.status(429).json({ status: 'error', message: `Too many failed attempts. Try again in ${sec}s.` });
      }
      userDoc.failed_login_attempts = 0;
      userDoc.last_failed_login_at = null;
      await userDoc.save();
    }

    if (!userDoc.is_verified) return res.status(403).json({ status: 'error', message: 'User not verified. Please verify using OTP first.' });
    if (!userDoc.is_active) return res.status(403).json({ status: 'error', message: 'Your manager account is inactive. Please contact support.' });

    const valid = await bcrypt.compare(passcode, userDoc.passcode);
    if (!valid) {
      const attempts = (userDoc.failed_login_attempts || 0) + 1;
      userDoc.failed_login_attempts = attempts;
      userDoc.last_failed_login_at = new Date();
      await userDoc.save();
      return res.status(401).json({ status: 'error', message: 'Invalid passcode.' });
    }

    userDoc.failed_login_attempts = 0;
    userDoc.last_failed_login_at = null;
    userDoc.token_version = (userDoc.token_version || 0) + 1;
    await userDoc.save();

    const REFRESH_EXP = process.env.AUTH_JWT_REFRESH_EXPIRES || '2d';
    const ACCESS_EXP = process.env.AUTH_JWT_ACCESS_EXPIRES || process.env.AUTH_JWT_EXPIRES || '17m';

    const refresh_token = jwt.sign_warehouse_token(
      { user: { id: userDoc._id.toString(), token_version: userDoc.token_version, token_type: 'refresh', is_warehouse_user: true } },
      REFRESH_EXP
    );

    res.cookie('warehouse_refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: ms_conversion(REFRESH_EXP) || 2 * 24 * 60 * 60 * 1000,
    });

    const token = jwt.sign_warehouse_token({
      user: { id: userDoc._id.toString(), token_version: userDoc.token_version, token_type: 'access', is_warehouse_user: true }
    }, ACCESS_EXP);

    const warehouse = await CompanyWarehouse.findById(userDoc.warehouse_id);
    const userPayload = {
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      phone: userDoc.phone,
      is_warehouse_user: true,
      warehouse_id: userDoc.warehouse_id,
      warehouse_status: warehouse ? warehouse.status : null,
      rejection_reason: warehouse ? warehouse.rejection_reason : null
    };

    return res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

const set_password = async (req, res) => {
  try {
    const { password, password_token } = req.body;
    if (!password || !password_token) {
      return res.status(400).json({ status: "error", message: "Password and password token are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ status: "error", message: "Password must be at least 6 characters long." });
    }

    let decoded;
    try {
      decoded = jwt.verify_warehouse_token(password_token);
    } catch (err) {
      return res.status(401).json({ status: "error", message: "Password session expired. Please request a new OTP." });
    }

    if (decoded.token_type !== 'password_set') {
      return res.status(400).json({ status: "error", message: "Invalid session type." });
    }

    const user = await WarehouseUser.findById(decoded.user_id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found." });
    }

    const hashed = await bcrypt.hash(password, 10);
    user.passcode = hashed;
    user.is_verified = true;
    user.token_version = (user.token_version || 0) + 1;
    await user.save();

    // Auto-activate warehouse
    const warehouse = await CompanyWarehouse.findById(user.warehouse_id);
    if (warehouse) {
      warehouse.is_active = true;
      await warehouse.save();
    }

    const REFRESH_EXP = process.env.AUTH_JWT_REFRESH_EXPIRES || '2d';
    const ACCESS_EXP = process.env.AUTH_JWT_ACCESS_EXPIRES || process.env.AUTH_JWT_EXPIRES || '17m';

    const refresh_token = jwt.sign_warehouse_token(
      { user: { id: user._id.toString(), token_version: user.token_version, token_type: 'refresh', is_warehouse_user: true } },
      REFRESH_EXP
    );

    res.cookie('warehouse_refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: ms_conversion(REFRESH_EXP) || 2 * 24 * 60 * 60 * 1000
    });

    const payload = {
      user: {
        id: user._id.toString(),
        token_version: user.token_version,
        token_type: 'access',
        is_warehouse_user: true
      }
    };
    const token = jwt.sign_warehouse_token(payload, ACCESS_EXP);

    return res.status(200).json({
      status: "success",
      token,
      message: "Password set successfully. You are now logged in."
    });
  } catch (error) {
    console.error("Error in set_password:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

const login_password = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!email || !phone || !password) {
      return res.status(400).json({ status: "error", message: "Email, phone number, and password are required." });
    }

    const user = await WarehouseUser.findOne({
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      is_deleted: { $ne: true }
    });

    if (!user) {
      return res.status(404).json({ status: "error", message: "No warehouse manager found with the provided email and phone number." });
    }

    if (!user.is_active) {
      return res.status(403).json({ status: "error", message: "Your manager account is inactive. Please contact support." });
    }

    if (!user.is_verified) {
      return res.status(400).json({ status: "error", message: "Manager account not verified. Please verify using OTP first." });
    }

    const isMatch = await bcrypt.compare(password, user.passcode);
    if (!isMatch) {
      user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
      user.last_failed_login_at = new Date();
      await user.save();
      return res.status(401).json({ status: "error", message: "Invalid password." });
    }

    user.failed_login_attempts = 0;
    user.token_version = (user.token_version || 0) + 1;
    await user.save();

    const REFRESH_EXP = process.env.AUTH_JWT_REFRESH_EXPIRES || '2d';
    const ACCESS_EXP = process.env.AUTH_JWT_ACCESS_EXPIRES || process.env.AUTH_JWT_EXPIRES || '17m';

    const refresh_token = jwt.sign_warehouse_token(
      { user: { id: user._id.toString(), token_version: user.token_version, token_type: 'refresh', is_warehouse_user: true } },
      REFRESH_EXP
    );

    res.cookie('warehouse_refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: ms_conversion(REFRESH_EXP) || 2 * 24 * 60 * 60 * 1000
    });

    const payload = {
      user: {
        id: user._id.toString(),
        token_version: user.token_version,
        token_type: 'access',
        is_warehouse_user: true
      }
    };
    const token = jwt.sign_warehouse_token(payload, ACCESS_EXP);

    return res.status(200).json({
      status: "success",
      token,
      message: "Logged in successfully."
    });
  } catch (error) {
    console.error("Error in login_password:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

const me = async (req, res) => {
  try {
    if (!req.user.is_warehouse_user) {
      return res.status(200).json({
        status: "success",
        user: req.user
      });
    }

    const warehouse = await CompanyWarehouse.findById(req.user.warehouse_id);
    return res.status(200).json({
      status: "success",
      user: req.user,
      warehouse: warehouse ? {
        id: warehouse._id,
        status: warehouse.status,
        warehouse_code: warehouse.warehouse_code,
        warehouse_type: warehouse.warehouse_type
      } : null
    });
  } catch (error) {
    console.error("Error in me:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

const refresh_access_token = async (req, res) => {
  const clearCookie = () => res.clearCookie('warehouse_refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  });

  try {
    const { warehouse_refresh_token } = req.cookies || {};
    if (!warehouse_refresh_token) {
      return res.status(401).json({ message: 'Authentication token not found.', auth: false });
    }

    let decoded;
    try {
      decoded = jwt.verify_warehouse_token(warehouse_refresh_token);
    } catch (err) {
      clearCookie();
      return res.status(401).json({ message: 'Invalid or expired refresh token.', auth: false });
    }

    if (!decoded?.user?.id || decoded.user.token_version === undefined) {
      clearCookie();
      return res.status(401).json({ message: 'Invalid or expired refresh token.', auth: false });
    }

    if (decoded.user.token_type !== 'refresh') {
      clearCookie();
      return res.status(401).json({ message: 'Invalid token type.', auth: false });
    }

    const user = await WarehouseUser.findById(decoded.user.id);
    if (!user) {
      clearCookie();
      return res.status(401).json({ message: 'User not found.', auth: false });
    }

    if (user.token_version !== decoded.user.token_version) {
      clearCookie();
      return res.status(401).json({ message: 'Session expired. Please log in again.', auth: false });
    }

    const ACCESS_EXP = process.env.AUTH_JWT_ACCESS_EXPIRES || process.env.AUTH_JWT_EXPIRES || '17m';
    const token = jwt.sign_warehouse_token({
      user: {
        id: user._id.toString(),
        token_version: user.token_version,
        token_type: 'access',
        is_warehouse_user: true
      }
    }, ACCESS_EXP);

    return res.status(200).json({
      message: 'Token refreshed successfully.',
      auth: true,
      token
    });
  } catch (error) {
    console.error('Error in refresh_access_token:', error);
    clearCookie();
    return res.status(500).json({ message: 'Internal server error.', auth: false });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie('warehouse_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });
    return res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Error in logout:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Removed identify_user_panel as it is obsolete

module.exports = {
  login_identify,
  verify_otp,
  set_password,
  login_password,
  me,
  refresh_access_token,
  logout,
  get_active_countries,
  request_verify_account_otp,
  request_forgot_password_otp,
  set_passcode,
  login
};
