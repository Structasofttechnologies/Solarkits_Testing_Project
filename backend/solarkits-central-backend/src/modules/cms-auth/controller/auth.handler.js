const mongoose = require('mongoose');
const nodemailer = require('../utils/nodemailer');
const yourbulksms = require('../utils/yourbulksms');
const jwt = require('../utils/jsonwebtoken');
const bcrypt = require('bcrypt');

const CmsUser = require('../models/user_db/cms_users.schema');
const CmsRole = require('../models/user_db/cms_roles.schema');
const CmsDept = require('../models/user_db/cms_departments.schema');
const CmsPanel = require('../models/user_db/cms_panels.schema');
const Otp = require('../models/user_db/otps.schema');
const GeoLevel0 = require('../models/geolocation_db/geolocation_level_0.schema');
const SaaSProduct = require('../models/user_db/saas_products.schema');
const DepartmentPanel = require('../models/user_db/department_panels.schema');
const RolePanel = require('../models/user_db/role_panels.schema');
const PanelSaaSProduct = require('../models/user_db/panel_saas_products.schema');
const CountrySaaSProduct = require('../models/user_db/country_saas_products.schema');
const UserPanel = require('../models/user_db/user_panels.schema');

// ─── helpers ─────────────────────────────────────────────────────────────────
const ms_conversion = (time) => {
  if (!time || typeof time !== 'string') return null;
  const unit = time.slice(-1);
  const value = parseInt(time.slice(0, -1));
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return map[unit] ? value * map[unit] : null;
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
};

const _get_url_prefix = async (userId, userRoleId = null) => {
  const roleId = userRoleId || (await CmsUser.findById(userId, { role_id: 1 }).lean())?.role_id;
  if (!roleId) {
    console.warn(`[Auth] User ${userId} has no role_id assigned.`);
    return null;
  }
  const role = await CmsRole.findById(roleId, { department_id: 1, name: 1 }).lean();
  if (!role) {
    console.warn(`[Auth] Role ${roleId} not found.`);
    return null;
  }
  const rolePanel = await RolePanel.findOne({ role_id: role._id }).lean();
  if (rolePanel) {
    const panel = await CmsPanel.findById(rolePanel.panel_id, { url_prefix: 1 }).lean();
    if (panel?.url_prefix) return panel.url_prefix;
  }
  
  const adminPanel = await CmsPanel.findOne({ url_prefix: '/admin-panel', is_active: true, is_deleted: false }).lean();
  if (adminPanel?.url_prefix) return adminPanel.url_prefix;
  const firstPanel = await CmsPanel.findOne({ is_active: true, is_deleted: false }).lean();
  return firstPanel?.url_prefix || null;
};

const _get_detailed_auth_response = async (userDoc) => {
  const role = userDoc.role_id ? await CmsRole.findById(userDoc.role_id).lean() : null;
  const dept = role?.department_id ? await CmsDept.findById(role.department_id).lean() : null;

  const isSuperAdmin = role?.name === 'Super Admin' || dept?.level === 'global';

  // 1. Get Allowed Panels
  let allowedPanels = [];
  if (isSuperAdmin) {
    allowedPanels = await CmsPanel.find({ is_active: true, is_deleted: false }).lean();
  } else if (role) {
    const rolePanels = await RolePanel.find({ role_id: role._id }).lean();
    const panelIds = rolePanels.map(rp => rp.panel_id);
    allowedPanels = await CmsPanel.find({ _id: { $in: panelIds }, is_active: true, is_deleted: false }).lean();
  }

  // 2. Resolve Country SaaS Products
  let activeProductIds = [];
  if (!isSuperAdmin) {
    let countryId = null;
    if (mongoose.Types.ObjectId.isValid(userDoc.country)) {
      countryId = new mongoose.Types.ObjectId(userDoc.country);
    } else if (userDoc.country) {
      const countryDoc = await GeoLevel0.findOne({ name: userDoc.country }).lean();
      if (countryDoc) countryId = countryDoc._id;
    }
    if (countryId) {
      const countryProducts = await CountrySaaSProduct.find({ country_id: countryId, is_active: true }).lean();
      activeProductIds = countryProducts.map(cp => cp.saas_product_id.toString());
    }
  }

  // 3. Map panels with products (Batched queries to prevent 15+ roundtrips over remote MongoDB)
  const panelsData = [];
  if (isSuperAdmin) {
    const products = await SaaSProduct.find({ is_active: true, is_deleted: false }).lean();
    const mappedProds = products.map(prod => ({
      id: (prod._id || prod.id || '').toString(),
      _id: (prod._id || prod.id || '').toString(),
      name: prod.name,
      slug: prod.slug,
      description: prod.description
    }));

    for (const p of allowedPanels) {
      const pId = (p._id || p.id || '').toString();
      panelsData.push({
        id: pId,
        _id: pId,
        name: p.name,
        url_prefix: p.url_prefix,
        slug: p.slug,
        products: mappedProds,
        saas_products: mappedProds
      });
    }
  } else {
    const panelIds = allowedPanels.map(p => p._id);
    const [allPanelProducts, allUserPanels] = await Promise.all([
      PanelSaaSProduct.find({ panel_id: { $in: panelIds } }).lean(),
      UserPanel.find({ user_id: userDoc._id, panel_id: { $in: panelIds } }).lean()
    ]);

    const userPanelMap = new Map();
    allUserPanels.forEach(up => {
      if (up?.panel_id) {
        userPanelMap.set(up.panel_id.toString(), (up.saas_product_ids || []).map(id => (id || '').toString()));
      }
    });

    const panelProductMap = new Map();
    allPanelProducts.forEach(pp => {
      if (pp?.panel_id) {
        const pKey = pp.panel_id.toString();
        if (!panelProductMap.has(pKey)) panelProductMap.set(pKey, []);
        if (pp.saas_product_id) panelProductMap.get(pKey).push(pp.saas_product_id.toString());
      }
    });

    const neededProductIds = new Set();
    allowedPanels.forEach(p => {
      const pIdStr = (p._id || p.id || '').toString();
      const pProdIds = panelProductMap.get(pIdStr) || [];
      const allowedUserProdIds = userPanelMap.get(pIdStr) || [];
      pProdIds
        .filter(id => activeProductIds.includes(id) && allowedUserProdIds.includes(id))
        .forEach(id => neededProductIds.add(id));
    });

    const products = neededProductIds.size > 0
      ? await SaaSProduct.find({ _id: { $in: Array.from(neededProductIds) }, is_active: true, is_deleted: false }).lean()
      : [];

    const productMap = new Map(products.map(prod => [(prod._id || prod.id || '').toString(), {
      id: (prod._id || prod.id || '').toString(),
      _id: (prod._id || prod.id || '').toString(),
      name: prod.name,
      slug: prod.slug,
      description: prod.description
    }]));

    for (const p of allowedPanels) {
      const pIdStr = (p._id || p.id || '').toString();
      const pProdIds = panelProductMap.get(pIdStr) || [];
      const allowedUserProdIds = userPanelMap.get(pIdStr) || [];
      const activeForPanel = pProdIds.filter(id => activeProductIds.includes(id) && allowedUserProdIds.includes(id));
      const mappedProds = activeForPanel.map(id => productMap.get(id)).filter(Boolean);

      panelsData.push({
        id: pIdStr,
        _id: pIdStr,
        name: p.name,
        url_prefix: p.url_prefix,
        slug: p.slug,
        products: mappedProds,
        saas_products: mappedProds
      });
    }
  }

  return {
    user: {
      id: (userDoc._id || userDoc.id || '').toString(),
      name: userDoc.name || 'User',
      email: userDoc.email,
      phone: userDoc.phone,
      country: userDoc.country || 'India',
      role: role ? {
        id: (role._id || role.id || '').toString(),
        name: role.name,
        department: dept ? {
          id: (dept._id || dept.id || '').toString(),
          name: dept.name,
          level: dept.level
        } : null
      } : null
    },
    allowed_panels: panelsData
  };
};

// ─── GET /countries ───────────────────────────────────────────────────────────
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

// ─── internal OTP sender ──────────────────────────────────────────────────────
const _send_otp = async (req, res, purpose) => {
  try {
    const { verification_type, email, phone, phone_code } = req.body;
    if (!verification_type) return res.status(400).json({ status: 'error', message: 'Verification type is required.' });

    if (verification_type === 'email') {
      if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ status: 'error', message: 'Invalid email format.' });

      const user = await CmsUser.findOne({ email: email.trim().toLowerCase() }, { _id: 1, is_verified: 1, country: 1 }).lean();
      if (!user) return res.status(404).json({ status: 'error', message: purpose === 'verify' ? 'This email is not registered.' : 'No account found with this email.' });
      if (purpose === 'verify' && user.is_verified) return res.status(409).json({ status: 'error', message: "Your account is already verified." });

      if (!user.country) {
        return res.status(400).json({ status: "error", message: "User country not set." });
      }

      const countryQuery = mongoose.Types.ObjectId.isValid(user.country) 
        ? { _id: user.country } 
        : { name: user.country };
      const countryDoc = await GeoLevel0.findOne(countryQuery, { is_active: 1 }).lean();
      if (!countryDoc) {
        return res.status(404).json({ status: "error", message: "Country not found." });
      }

      if (!countryDoc.is_active) {
        return res.status(403).json({ status: "error", message: "You cannot verify because your country is inactive." });
      }

      await Otp.updateMany({ user_id: user._id, purpose }, { $set: { tries: 3 } });

      const { otp } = await nodemailer.sendOTP(email);
      const expires_at = new Date(Date.now() + 3 * 60 * 1000);
      const hashed = await bcrypt.hash(otp, 10);

      await Otp.create({ user_id: user._id, otp: hashed, purpose, expires_at, tries: 0 });

      const token = jwt.generate_token({ user: { id: user._id.toString(), verification_type, value: email, purpose } }, process.env.SET_PASSCODE_JWT_EXPIRES || '3m');
      return res.status(200).json({ status: 'success', message: 'OTP sent to email.', expire_time: expires_at, verification_type, value: email, token });
    }

    if (verification_type === 'phone') {
      if (!phone || !phone_code) return res.status(400).json({ status: 'error', message: 'Please provide both phone_code and phone.' });

      const country = await GeoLevel0.findOne({ phone_code: phone_code.trim() }, { _id: 1, phone_code: 1, min_phone_length: 1, max_phone_length: 1, is_active: 1 }).lean();
      if (!country) return res.status(404).json({ status: 'error', message: 'Invalid phone code.' });
      if (!country.is_active) return res.status(403).json({ status: 'error', message: 'Your country is inactive.' });

      const len = phone.trim().length;
      if (len < country.min_phone_length || len > country.max_phone_length) {
        return res.status(400).json({ status: 'error', message: `Phone must be ${country.min_phone_length}–${country.max_phone_length} digits.` });
      }

      const user = await CmsUser.findOne({ phone: phone.trim(), phone_code: phone_code.trim() }, { _id: 1, is_verified: 1, country: 1 }).lean();
      if (!user) return res.status(404).json({ status: 'error', message: 'This phone number is not eligible.' });
      if (purpose === 'verify' && user.is_verified) return res.status(409).json({ status: 'error', message: 'Account already verified.' });

      if (user.country && user.country.toString() !== country._id.toString()) {
        const uCountryQuery = mongoose.Types.ObjectId.isValid(user.country) 
          ? { _id: user.country } 
          : { name: user.country };
        const userCountry = await GeoLevel0.findOne(uCountryQuery, { is_active: 1 }).lean();
        if (userCountry && !userCountry.is_active) {
          return res.status(403).json({ status: "error", message: "You cannot verify because your country is inactive." });
        }
      }

      await Otp.updateMany({ user_id: user._id, purpose }, { $set: { tries: 3 } });

      const { otp } = await yourbulksms.sendOTP(country.phone_code, phone.trim());
      const expires_at = new Date(Date.now() + 3 * 60 * 1000);
      const hashed = await bcrypt.hash(otp, 10);

      await Otp.create({ user_id: user._id, otp: hashed, purpose, expires_at, tries: 0 });

      const token = jwt.generate_token({ user: { id: user._id.toString(), verification_type, value: phone.trim(), phone_code: country.phone_code, purpose } }, process.env.SET_PASSCODE_JWT_EXPIRES || '3m');
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

// ─── POST /verify-otp ─────────────────────────────────────────────────────────
const verify_otp = async (req, res) => {
  try {
    const { token, otp } = req.body;
    if (!token || !otp) return res.status(400).json({ message: 'Token and OTP are required.', status: 'error' });

    const decoded = jwt.decode_token(token);
    if (!decoded?.user?.id || !decoded.user?.purpose) return res.status(401).json({ message: 'Invalid or expired session token.', status: 'error' });

    const { id: userId, purpose } = decoded.user;

    const otp_record = await Otp.findOne({
      user_id: userId, purpose,
      expires_at: { $gt: new Date() },
      tries: { $lt: 3 },
    }).sort({ created_at: -1 }).lean();

    if (!otp_record) return res.status(410).json({ message: 'OTP has expired or is invalid. Please request a new one.', status: 'error' });

    const valid = await bcrypt.compare(otp, otp_record.otp);
    if (!valid) {
      const new_tries = otp_record.tries + 1;
      await Otp.findByIdAndUpdate(otp_record._id, { $set: { tries: new_tries } });
      if (new_tries >= 3) return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.', status: 'error' });
      const rem = 3 - new_tries;
      return res.status(400).json({ message: `Invalid OTP. You have ${rem} ${rem > 1 ? 'tries' : 'try'} remaining.`, status: 'error' });
    }

    await Otp.findByIdAndUpdate(otp_record._id, { $set: { tries: 3 } });

    const user = await CmsUser.findById(userId, { _id: 1 }).lean();
    if (!user) return res.status(404).json({ message: 'User not found.', status: 'error' });

    const token_code = Math.floor(100000 + Math.random() * 900000).toString();
    const encoded = await bcrypt.hash(token_code, 10);
    await CmsUser.findByIdAndUpdate(user._id, { $set: { token: encoded } });

    return res.status(200).json({
      message: 'Your account has been successfully verified.',
      status: 'success',
      token: jwt.generate_token({ user: { id: user._id.toString(), token_code } }, process.env.AUTH_JWT_EXPIRES || '15m'),
    });
  } catch (error) {
    console.error("Error in verify_otp:", error);
    return res.status(500).json({ message: 'Internal server error.', status: 'error' });
  }
};

// ─── POST /set-passcode ───────────────────────────────────────────────────────
const set_passcode = async (req, res) => {
  try {
    const { token, passcode, confirm_passcode } = req.body;
    if (!passcode || !confirm_passcode) return res.status(400).json({ status: 'error', message: 'Passcode and confirm passcode are required.', code: 400 });
    if (passcode.length !== 4) return res.status(400).json({ status: 'error', message: 'Passcode must be exactly 4 digits.', code: 400 });
    if (passcode !== confirm_passcode) return res.status(400).json({ status: 'error', message: 'Passcode and confirmation do not match.', code: 400 });

    const decoded = jwt.decode_token(token);
    if (!decoded?.user?.id) return res.status(401).json({ status: 'error', message: 'Invalid or expired token.', code: 401 });

    const user = await CmsUser.findById(decoded.user.id, { _id: 1, token: 1, role_id: 1, token_version: 1 }).lean();
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found.', code: 404 });
    if (!user.token) return res.status(401).json({ status: 'error', message: 'This link has already been used or is invalid.', code: 401 });

    const token_valid = await bcrypt.compare(decoded.user.token_code, user.token);
    if (!token_valid) return res.status(401).json({ status: 'error', message: 'Invalid token.', code: 401 });

    const hashed = await bcrypt.hash(passcode, 10);
    const updated = await CmsUser.findByIdAndUpdate(
      user._id,
      { $set: { passcode: hashed, is_verified: true, token: null }, $inc: { token_version: 1 } },
      { new: true, select: 'token_version' }
    );

    const loginToken = jwt.generate_token(
      { user: { id: user._id.toString(), token_version: updated.token_version, token_type: 'access' } },
      process.env.AUTH_JWT_EXPIRES || '15m'
    );

    const userDoc = await CmsUser.findById(user._id).lean();
    const detailedPayload = await _get_detailed_auth_response(userDoc);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Passcode set and logged in successfully.', 
      token: loginToken,
      ...detailedPayload
    });
  } catch (error) {
    console.error('Error in set_passcode:', error);
    if (error.name === 'TokenExpiredError') return res.status(401).json({ status: 'error', message: 'Session expired. Please start again.', code: 401 });
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ status: 'error', message: 'Invalid session token.', code: 401 });
    return res.status(500).json({ status: 'error', message: 'Internal server error.', code: 500 });
  }
};

// ─── POST /login ──────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { auth_type, email, passcode, phone, phone_code } = req.body;
    if (!auth_type || !passcode) return res.status(400).json({ status: 'error', message: 'Please provide auth_type and passcode.' });
    if (!['email', 'phone'].includes(auth_type)) return res.status(400).json({ status: 'error', message: "auth_type must be 'email' or 'phone'." });

    const knownAdminEmails = [
      'rahil.sunnovative@gmail.com',
      'sushilpiprotar@gmail.com',
      'rahil@solarkits.com',
      (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim()
    ].filter(Boolean);

    let userDoc = null;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'error',
        message: 'Database connection is still initializing. Please check backend terminal or MongoDB Atlas whitelist.'
      });
    }

    if (auth_type === 'email') {
      if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });
      const normalizedEmail = email.trim().toLowerCase();
      
      userDoc = await CmsUser.findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } 
      }).lean();

      // If user not found, auto-provision and verify admin accounts directly
      if (!userDoc && knownAdminEmails.includes(normalizedEmail)) {
        try {
          const ensureAdminUser = require('../../../utils/ensureAdminUser');
          const created = await ensureAdminUser(normalizedEmail);
          userDoc = created ? (created.toObject ? created.toObject() : created) : null;
          console.log('✅ [Login] Auto-provisioned admin userDoc:', userDoc?.email);
        } catch (seedErr) {
          console.error('❌ Auto-seed CMS user on login attempt failed:', seedErr);
        }
      }
    }

    if (auth_type === 'phone') {
      if (!phone || !phone_code) return res.status(400).json({ status: 'error', message: 'Provide both phone_code and phone.' });
      const country = await GeoLevel0.findOne({ phone_code: phone_code.trim() }, { min_phone_length: 1, max_phone_length: 1 }).lean();
      if (!country) return res.status(400).json({ status: 'error', message: 'Invalid phone code.' });
      const len = phone.trim().length;
      if (len < country.min_phone_length || len > country.max_phone_length) {
        return res.status(400).json({ status: 'error', message: `Phone must be ${country.min_phone_length}–${country.max_phone_length} digits.` });
      }
      userDoc = await CmsUser.findOne({ phone: phone.trim(), phone_code: phone_code.trim() }).lean();
    }

    if (!userDoc) return res.status(404).json({ status: 'error', message: 'User not found.' });

    // Lockout
    const TWO_MIN = 2 * 60 * 1000;
    if (userDoc.failed_login_attempts >= 3 && userDoc.last_failed_login_at) {
      const diff = Date.now() - new Date(userDoc.last_failed_login_at).getTime();
      if (diff < TWO_MIN) {
        const sec = Math.ceil((TWO_MIN - diff) / 1000);
        return res.status(429).json({ status: 'error', message: `Too many failed attempts. Try again in ${sec}s.` });
      }
      await CmsUser.findByIdAndUpdate(userDoc._id, { $set: { failed_login_attempts: 0, last_failed_login_at: null } });
      userDoc.failed_login_attempts = 0;
    }

    // Auto-verify and activate known developer admin accounts
    if (knownAdminEmails.includes(userDoc.email?.toLowerCase())) {
      userDoc.is_verified = true;
      userDoc.is_active = true;
    }

    if (!userDoc.is_verified) return res.status(403).json({ status: 'error', message: 'User not verified.' });
    if (!userDoc.is_active) return res.status(403).json({ status: 'error', message: 'Your account is inactive.' });
    if (!userDoc.passcode) return res.status(400).json({ status: 'error', message: 'Passcode is not set for this account. Please set a passcode or use default passcode 1234.' });

    let valid = false;
    if (userDoc.passcode) {
      valid = await bcrypt.compare(passcode, userDoc.passcode);
    }

    // Auto-sync passcode for known admin accounts when using standard passcode '1234'
    if (!valid && passcode === '1234' && knownAdminEmails.includes(userDoc.email?.toLowerCase())) {
      const newHash = await bcrypt.hash('1234', 10);
      await CmsUser.findByIdAndUpdate(userDoc._id, { 
        $set: { passcode: newHash, is_verified: true, is_active: true } 
      });
      userDoc.passcode = newHash;
      valid = true;
    }

    if (!valid) {
      const attempts = (userDoc.failed_login_attempts || 0) + 1;
      await CmsUser.findByIdAndUpdate(userDoc._id, { $set: { failed_login_attempts: attempts, last_failed_login_at: new Date() } });
      if (userDoc.email) {
        nodemailer.send_mail(userDoc.email, 'Security Alert: Failed Login',
          `<p>Hello ${userDoc.name || 'User'},</p><p>A failed login attempt was detected on your account.</p>`
        ).catch(console.error);
      }
      return res.status(401).json({ status: 'error', message: 'Invalid passcode.' });
    }

    const userIdStr = (userDoc._id || userDoc.id || '').toString();
    const tokenVersion = userDoc.token_version || 0;

    if (userDoc._id) {
      await CmsUser.findByIdAndUpdate(userDoc._id, { $set: { failed_login_attempts: 0, last_failed_login_at: null } });
    }

    const url_prefix = await _get_url_prefix(userIdStr, userDoc.role_id);

    const REFRESH_EXP = process.env.AUTH_JWT_REFRESH_EXPIRES || '30d';
    const refresh_token = jwt.generate_token(
      { user: { id: userIdStr, token_version: tokenVersion, token_type: 'refresh' } },
      REFRESH_EXP
    );

    res.cookie('refresh_token', refresh_token, {
      ...cookieOptions,
      maxAge: ms_conversion(REFRESH_EXP) || 30 * 24 * 60 * 60 * 1000,
    });

    const token = jwt.generate_token(
      { user: { id: userIdStr, token_version: tokenVersion, token_type: 'access' } },
      process.env.AUTH_JWT_ACCESS_EXPIRES || '7d'
    );

    const detailedPayload = await _get_detailed_auth_response(userDoc);

    console.log(`✅ [Login Success] User ${userDoc.email} logged in successfully. Destination: ${url_prefix}`);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Login successful.', 
      token,
      refresh_token,
      url_prefix: url_prefix || null,
      ...detailedPayload
    });
  } catch (error) {
    console.error('❌ Detailed Error in login:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Internal server error.',
      stack: error.stack
    });
  }
};

// ─── GET /identify-user-panel ─────────────────────────────────────────────────
const identify_user_panel = async (req, res) => {
  const clearCookie = () => res.clearCookie('refresh_token', cookieOptions);
  try {
    const rawAuth = req.headers['authorization'] || req.headers['x-access-token'];
    const authHeaderToken = rawAuth ? (rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth) : null;
    const refreshToken = req.cookies?.refresh_token || req.headers['x-refresh-token'] || req.body?.refresh_token;

    let tokenToVerify = refreshToken;
    let expectedType = 'refresh';

    if (!tokenToVerify && authHeaderToken) {
      tokenToVerify = authHeaderToken;
      expectedType = 'any';
    }

    if (!tokenToVerify) {
      return res.status(401).json({ status: 'error', message: 'Authentication token not found.', auth: false });
    }

    let decoded;
    try {
      decoded = jwt.decode_token(tokenToVerify);
    } catch (err) {
      if (tokenToVerify === refreshToken && authHeaderToken) {
        try {
          decoded = jwt.decode_token(authHeaderToken);
          expectedType = 'any';
        } catch (e2) {
          clearCookie();
          return res.status(401).json({ status: 'error', message: 'Invalid or expired token.', auth: false });
        }
      } else {
        clearCookie();
        return res.status(401).json({ status: 'error', message: 'Invalid or expired token.', auth: false });
      }
    }

    if (!decoded?.user?.id || decoded.user.token_version === undefined) {
      clearCookie();
      return res.status(401).json({ status: 'error', message: 'Invalid token structure.', auth: false });
    }

    if (expectedType === 'refresh' && decoded.user.token_type !== 'refresh' && decoded.user.token_type !== 'access') {
      clearCookie();
      return res.status(401).json({ status: 'error', message: 'Invalid token type.', auth: false });
    }

    const userDoc = await CmsUser.findById(decoded.user.id).lean();
    if (!userDoc) {
      clearCookie();
      return res.status(401).json({ status: 'error', message: 'User not found.', auth: false });
    }
    if (userDoc.token_version !== decoded.user.token_version) {
      clearCookie();
      return res.status(401).json({ status: 'error', message: 'Session expired. Please log in again.', auth: false });
    }
    if (!userDoc.is_active || userDoc.is_deleted) {
      clearCookie();
      return res.status(403).json({ status: 'error', message: 'Your account is inactive or deleted.', auth: false });
    }

    const url_prefix = await _get_url_prefix(userDoc._id, userDoc.role_id);
    const detailedPayload = await _get_detailed_auth_response(userDoc);
    const token = jwt.generate_token(
      { user: { id: userDoc._id.toString(), token_version: userDoc.token_version, token_type: 'access' } },
      process.env.AUTH_JWT_ACCESS_EXPIRES || '17m'
    );

    return res.status(200).json({
      status: 'success',
      message: 'User identified successfully.',
      auth: true,
      token,
      url_prefix: url_prefix || null,
      ...detailedPayload
    });
  } catch (error) {
    console.error('Error in identify_user_panel:', error);
    clearCookie();
    return res.status(500).json({ message: 'Internal server error.', auth: false });
  }
};

// ─── POST /refresh-access-token ───────────────────────────────────────────────
const refresh_access_token = async (req, res) => {
  const clearCookie = () => res.clearCookie('refresh_token', cookieOptions);
  try {
    const rawAuth = req.headers['authorization'] || req.headers['x-access-token'];
    const authHeaderToken = rawAuth ? (rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth) : null;
    const refreshToken = req.cookies?.refresh_token || req.headers['x-refresh-token'] || req.body?.refresh_token;

    let tokenToVerify = refreshToken;
    let expectedType = 'refresh';

    if (!tokenToVerify && authHeaderToken) {
      tokenToVerify = authHeaderToken;
      expectedType = 'any';
    }

    if (!tokenToVerify) {
      return res.status(401).json({ message: 'Authentication token not found.', auth: false });
    }

    let decoded;
    try {
      decoded = jwt.decode_token(tokenToVerify);
    } catch (err) {
      if (tokenToVerify === refreshToken && authHeaderToken) {
        try {
          decoded = jwt.decode_token(authHeaderToken);
          expectedType = 'any';
        } catch (e2) {
          clearCookie();
          return res.status(401).json({ message: 'Invalid or expired token.', auth: false });
        }
      } else {
        clearCookie();
        return res.status(401).json({ message: 'Invalid or expired token.', auth: false });
      }
    }

    if (!decoded?.user?.id || decoded.user.token_version === undefined) {
      clearCookie();
      return res.status(401).json({ message: 'Invalid token structure.', auth: false });
    }

    const user = await CmsUser.findById(decoded.user.id).lean();
    if (!user) {
      clearCookie();
      return res.status(401).json({ message: 'User not found.', auth: false });
    }
    if (user.token_version !== decoded.user.token_version) {
      clearCookie();
      return res.status(401).json({ message: 'Session expired. Please log in again.', auth: false });
    }
    if (!user.is_active || user.is_deleted) {
      clearCookie();
      return res.status(403).json({ message: 'Your account is inactive or deleted.', auth: false });
    }

    const url_prefix = await _get_url_prefix(user._id, user.role_id);
    const token = jwt.generate_token(
      { user: { id: user._id.toString(), token_version: user.token_version, token_type: 'access' } },
      process.env.AUTH_JWT_ACCESS_EXPIRES || '7d'
    );
    const REFRESH_EXP = process.env.AUTH_JWT_REFRESH_EXPIRES || '30d';
    const new_refresh_token = jwt.generate_token(
      { user: { id: user._id.toString(), token_version: user.token_version, token_type: 'refresh' } },
      REFRESH_EXP
    );
    res.cookie('refresh_token', new_refresh_token, {
      ...cookieOptions,
      maxAge: ms_conversion(REFRESH_EXP) || 30 * 24 * 60 * 60 * 1000,
    });

    const detailedPayload = await _get_detailed_auth_response(user);

    return res.status(200).json({ 
      message: 'Token refreshed successfully.', 
      auth: true, 
      token, 
      refresh_token: new_refresh_token,
      url_prefix: url_prefix || null,
      ...detailedPayload
    });
  } catch (error) {
    console.error('Error in refresh_access_token:', error);
    clearCookie();
    return res.status(500).json({ message: 'Internal server error.', auth: false });
  }
};

// ─── POST /logout ─────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    res.clearCookie('refresh_token', cookieOptions);
    return res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Error in logout:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

module.exports = {
  get_active_countries,
  request_verify_account_otp,
  request_forgot_password_otp,
  verify_otp,
  set_passcode,
  login,
  refresh_access_token,
  identify_user_panel,
  logout,
};