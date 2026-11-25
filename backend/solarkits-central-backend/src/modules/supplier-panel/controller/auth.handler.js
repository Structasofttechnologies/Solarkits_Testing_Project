const bcrypt = require('bcrypt');
const Supplier = require('../models/supplier.schema');
const SupplierOtp = require('../models/supplier_otp.schema');
const GeoLevel0 = require('../models/geolocation_db/geolocation_level_0.schema');
const GeoLevel1 = require('../models/geolocation_db/geolocation_level_1.schema');
const GeoLevel2 = require('../models/geolocation_db/geolocation_level_2.schema');
const GeoLevel3 = require('../models/geolocation_db/geolocation_level_3.schema');
const jwt = require('../utils/jsonwebtoken');
const { sendOTP } = require('../utils/nodemailer');
const yourbulksms = require('../utils/yourbulksms');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ms_conversion = (time) => {
    if (!time || typeof time !== 'string') return null;
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));
    const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return map[unit] ? value * map[unit] : null;
};

const REFRESH_EXP = () => process.env.AUTH_JWT_REFRESH_EXPIRES || '7d';
const ACCESS_EXP  = () => process.env.AUTH_JWT_ACCESS_EXPIRES  || process.env.AUTH_JWT_EXPIRES || '17m';

const set_refresh_cookie = (res, token) => {
    res.cookie('supplier_refresh_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: ms_conversion(REFRESH_EXP()) || 7 * 24 * 60 * 60 * 1000,
    });
};

const clear_refresh_cookie = (res) => {
    res.clearCookie('supplier_refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
    });
};

const build_supplier_payload = (supplier) => ({
    id: supplier._id.toString(),
    company_name: supplier.company_name,
    brand_name: supplier.brand_name,
    brand_logo: supplier.brand_logo,
    email: supplier.email,
    phone: supplier.phone,
    phone_code: supplier.phone_code,
    status: supplier.status,
    rejection_reason: supplier.rejection_reason || null,
    is_verified: supplier.is_verified,
    office_location: supplier.office_location,
    office_locations: supplier.office_locations || [],
    states: supplier.states || [],
    gst_list: supplier.gst_list || [],
    supply_districts: supplier.supply_districts,
});

// ─── GET /auth/countries ──────────────────────────────────────────────────────

const get_active_countries = async (req, res) => {
    try {
        const rows = await GeoLevel0.find(
            { min_phone_length: { $ne: 0 }, max_phone_length: { $ne: 0 }, is_active: true },
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

        return res.status(200).json({ status: 'success', message: 'Countries fetched.', data });
    } catch (err) {
        console.error('get_active_countries:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── GET /auth/states ─────────────────────────────────────────────────────────

const get_active_states = async (req, res) => {
    try {
        const { country_id } = req.query;
        const filter = { deleted_at: null, is_active: true };
        if (country_id) {
            filter.level_0 = country_id;
        }

        const rows = await GeoLevel1.find(filter, { _id: 1, name: 1 })
            .sort({ name: 1 })
            .lean();

        const data = rows.map(r => ({ id: r._id.toString(), name: r.name }));
        return res.status(200).json({ status: 'success', message: 'States fetched.', data });
    } catch (err) {
        console.error('get_active_states:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── GET /auth/districts ─────────────────────────────────────────────────────

const get_active_districts = async (req, res) => {
    try {
        const { state_ids } = req.query;
        const filter = { deleted_at: null, is_active: true };

        if (state_ids) {
            const ids = state_ids.split(',').filter(Boolean);
            if (ids.length > 0) {
                filter.level_1 = { $in: ids };
            }
        }

        const rows = await GeoLevel2.find(filter, { _id: 1, name: 1, level_1: 1 })
            .sort({ name: 1 })
            .lean();

        const data = rows.map(r => ({
            id: r._id.toString(),
            name: r.name,
            state_id: r.level_1.toString()
        }));

        return res.status(200).json({ status: 'success', message: 'Districts fetched.', data });
    } catch (err) {
        console.error('get_active_districts:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/register ─────────────────────────────────────────────────────

const register = async (req, res) => {
    try {
        const {
            email, phone, phone_code = '+91', company_name,
            brand_name, brand_logo,
            gst_number, pan_number,
            office_location, supply_districts,
            office_locations, states, gst_list,
            passcode, email_verification_token, phone_verification_token,
            country_id
        } = req.body;

        // Basic validation
        if (!email || !phone || !company_name || !brand_name) {
            return res.status(400).json({ status: 'error', message: 'Email, phone, company name, and brand name are required.' });
        }

        // Validate email verification token signature
        if (!email_verification_token) {
            return res.status(400).json({ status: 'error', message: 'Email must be verified via OTP first.' });
        }
        try {
            const decodedEmail = jwt.verify_supplier_token(email_verification_token);
            if (decodedEmail.type !== 'verified_email_sig' || decodedEmail.email !== email.trim().toLowerCase() || !decodedEmail.verified) {
                return res.status(400).json({ status: 'error', message: 'Email verification token is invalid or mismatched.' });
            }
        } catch (err) {
            return res.status(400).json({ status: 'error', message: 'Email verification session has expired. Please verify again.' });
        }

        // Validate phone verification token signature
        if (!phone_verification_token) {
            return res.status(400).json({ status: 'error', message: 'Phone number must be verified via OTP first.' });
        }
        try {
            const decodedPhone = jwt.verify_supplier_token(phone_verification_token);
            if (
                decodedPhone.type !== 'verified_phone_sig' ||
                decodedPhone.phone !== phone.trim() ||
                decodedPhone.phone_code !== phone_code.trim() ||
                !decodedPhone.verified
            ) {
                return res.status(400).json({ status: 'error', message: 'Phone verification token is invalid or mismatched.' });
            }
        } catch (err) {
            return res.status(400).json({ status: 'error', message: 'Phone verification session has expired. Please verify again.' });
        }

        // Validate GST PAN matching
        const targetGst = gst_list?.[0]?.gst_number || gst_number || null;
        const derivedPan = targetGst ? targetGst.substring(2, 12).toUpperCase() : null;
        const targetPan = gst_list?.[0]?.pan_number || derivedPan || (pan_number ? pan_number.trim().toUpperCase() : null);

        if (targetGst) {
            const formattedGst = targetGst.trim().toUpperCase();
            const existingGstSupplier = await Supplier.findOne({
                is_deleted: { $ne: true },
                $or: [
                    { gst_number: formattedGst },
                    { 'gst_list.gst_number': formattedGst }
                ]
            });
            if (existingGstSupplier) {
                return res.status(409).json({
                    status: 'error',
                    message: `An account with GST number ${formattedGst} is already registered.`
                });
            }
        }

        if (targetPan) {
            const existingPanSupplier = await Supplier.findOne({
                is_deleted: { $ne: true },
                $or: [
                    { pan_number: targetPan },
                    { 'gst_list.pan_number': targetPan }
                ]
            });
            if (existingPanSupplier) {
                if (existingPanSupplier.status === 'pending') {
                    return res.status(409).json({
                        status: 'duplicate_pending',
                        message: `An account with this PAN (${targetPan}) is already under review.`
                    });
                }
                if (existingPanSupplier.status === 'rejected') {
                    return res.status(409).json({
                        status: 'duplicate_rejected',
                        message: `This PAN (${targetPan}) was previously rejected.`,
                        reason: existingPanSupplier.rejection_reason
                    });
                }
                return res.status(409).json({
                    status: 'duplicate',
                    message: `An account with this PAN (${targetPan}) already exists. Please log in to expand coverage.`
                });
            }
        }

        if (gst_list && Array.isArray(gst_list) && gst_list.length > 0) {
            const firstPan = gst_list[0].pan_number;
            for (const item of gst_list) {
                if (item.pan_number !== firstPan) {
                    return res.status(400).json({ status: 'error', message: 'All GST numbers must belong to the same PAN number.' });
                }
            }
        }

        // Fetch country name from GeoLevel0
        let countryName = null;
        if (country_id) {
            const countryDoc = await GeoLevel0.findById(country_id).lean();
            if (countryDoc) {
                countryName = countryDoc.name;
            }
        }

        const supplier = new Supplier({
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            phone_code: phone_code.trim(),
            country: countryName,
            country_id: country_id || null,
            company_name: company_name.trim(),
            brand_name: brand_name.trim(),
            brand_logo: brand_logo || null,
            gst_number:   gst_list?.[0]?.gst_number || gst_number || null,
            pan_number:   targetPan,
            office_location: office_location || { type: 'Point', coordinates: [0, 0], address: null },
            office_locations: Array.isArray(office_locations) ? office_locations : [],
            states: Array.isArray(states) ? states : [],
            gst_list: Array.isArray(gst_list) ? gst_list : [],
            supply_districts: Array.isArray(supply_districts) ? supply_districts : [],
            passcode: null,
            is_verified: false,
            status: 'pending',
        });

        await supplier.save();

        return res.status(201).json({
            status: 'success',
            message: 'Registration submitted successfully. Your account is under manual review.',
            supplier: build_supplier_payload(supplier)
        });
    } catch (err) {
        console.error('register:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/send-register-email-otp ─────────────────────────────────────

const send_register_email_otp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });

        const emailLower = email.trim().toLowerCase();
        // Check duplicate email
        const existing = await Supplier.findOne({ email: emailLower, is_deleted: { $ne: true } });
        if (existing) {
            return res.status(409).json({ status: 'error', message: 'An account with this email already exists.' });
        }

        let otp;
        let sent = false;
        try {
            const result = await sendOTP(emailLower, 'Verify Your SolarKits Business Email', 'Your email verification OTP code is:');
            otp = result.otp;
            sent = true;
        } catch (mailErr) {
            console.warn(`[Nodemailer] Failed to send email to ${emailLower} due to SMTP credentials. Operating in MOCK mode.`);
            otp = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`[EMAIL OTP MOCK] To ${emailLower}: ${otp}`);
        }

        const hashed = await bcrypt.hash(otp, 10);

        const token = jwt.sign_supplier_token(
            { email: emailLower, otp: hashed, type: 'register_email_otp' },
            '5m'
        );

        return res.status(200).json({
            status: 'success',
            message: sent ? 'OTP sent to email.' : 'OTP generated (Mock Mode).',
            token
        });
    } catch (err) {
        console.error('send_register_email_otp:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to send verification email.' });
    }
};

// ─── POST /auth/verify-register-email-otp ──────────────────────────────────

const verify_register_email_otp = async (req, res) => {
    try {
        const { email, otp, token } = req.body;
        if (!email || !otp || !token) {
            return res.status(400).json({ status: 'error', message: 'Email, OTP, and Token are required.' });
        }

        let decoded;
        try {
            decoded = jwt.verify_supplier_token(token);
        } catch (err) {
            return res.status(401).json({ status: 'error', message: 'OTP session expired. Please request a new one.' });
        }

        if (decoded.type !== 'register_email_otp' || decoded.email !== email.trim().toLowerCase()) {
            return res.status(400).json({ status: 'error', message: 'Invalid OTP session.' });
        }

        const valid = await bcrypt.compare(otp.trim(), decoded.otp);
        if (!valid) {
            return res.status(400).json({ status: 'error', message: 'Invalid OTP entered.' });
        }

        const verify_token = jwt.sign_supplier_token(
            { email: email.trim().toLowerCase(), verified: true, type: 'verified_email_sig' },
            '30m'
        );

        return res.status(200).json({ status: 'success', message: 'Email verified successfully.', verify_token });
    } catch (err) {
        console.error('verify_register_email_otp:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/send-register-phone-otp ─────────────────────────────────────

const send_register_phone_otp = async (req, res) => {
    try {
        const { phone, phone_code } = req.body;
        if (!phone || !phone_code) {
            return res.status(400).json({ status: 'error', message: 'Phone and Phone Code are required.' });
        }

        const phoneTrim = phone.trim();
        const codeTrim = phone_code.trim();

        // Check duplicate phone
        const existing = await Supplier.findOne({ phone: phoneTrim, phone_code: codeTrim, is_deleted: { $ne: true } });
        if (existing) {
            return res.status(409).json({ status: 'error', message: 'An account with this phone number already exists.' });
        }

        let otp;
        let sent = false;
        try {
            const rawCode = codeTrim.replace('+', '');
            const result = await yourbulksms.sendOTP(rawCode, phoneTrim);
            otp = result.otp;
            sent = true;
        } catch (smsErr) {
            console.warn(`[YourBulkSMS] Failed to send SMS to ${codeTrim}${phoneTrim} due to configuration or balance. Operating in MOCK mode.`);
            otp = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`[PHONE OTP MOCK] To ${codeTrim}${phoneTrim}: ${otp}`);
        }

        const hashed = await bcrypt.hash(otp, 10);
        const token = jwt.sign_supplier_token(
            { phone: phoneTrim, phone_code: codeTrim, otp: hashed, type: 'register_phone_otp' },
            '5m'
        );

        return res.status(200).json({
            status: 'success',
            message: sent ? `OTP sent to ${codeTrim} ${phoneTrim}.` : `OTP generated (Mock Mode).`,
            token
        });
    } catch (err) {
        console.error('send_register_phone_otp:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to send phone OTP.' });
    }
};

// ─── POST /auth/verify-register-phone-otp ────────────────────────────────

const verify_register_phone_otp = async (req, res) => {
    try {
        const { phone, phone_code, otp, token } = req.body;
        if (!phone || !phone_code || !otp || !token) {
            return res.status(400).json({ status: 'error', message: 'Phone, Phone Code, OTP, and Token are required.' });
        }

        let decoded;
        try {
            decoded = jwt.verify_supplier_token(token);
        } catch (err) {
            return res.status(401).json({ status: 'error', message: 'OTP session expired. Please request a new one.' });
        }

        if (
            decoded.type !== 'register_phone_otp' ||
            decoded.phone !== phone.trim() ||
            decoded.phone_code !== phone_code.trim()
        ) {
            return res.status(400).json({ status: 'error', message: 'Invalid OTP session.' });
        }

        const valid = await bcrypt.compare(otp.trim(), decoded.otp);
        if (!valid) {
            return res.status(400).json({ status: 'error', message: 'Invalid OTP entered.' });
        }

        const verify_token = jwt.sign_supplier_token(
            { phone: phone.trim(), phone_code: phone_code.trim(), verified: true, type: 'verified_phone_sig' },
            '30m'
        );

        return res.status(200).json({ status: 'success', message: 'Phone verified successfully.', verify_token });
    } catch (err) {
        console.error('verify_register_phone_otp:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/request-verify-account-otp ───────────────────────────────────

const request_verify_account_otp = async (req, res) => {
    try {
        const { email, gst_number } = req.body;
        if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });

        let query = { email: email.trim().toLowerCase(), is_deleted: { $ne: true } };
        if (gst_number) {
            query.gst_number = gst_number.trim().toUpperCase();
        } else {
            query.is_verified = { $ne: true };
        }

        let supplier = await Supplier.findOne(query);
        if (!supplier) {
            // Fallback to any account with this email
            supplier = await Supplier.findOne({ email: email.trim().toLowerCase(), is_deleted: { $ne: true } });
        }

        if (!supplier) return res.status(404).json({ status: 'error', message: 'No account found with this email.' });

        if (supplier.status === 'pending') {
            return res.status(403).json({ status: 'pending', message: 'Your account is still under review.' });
        }
        if (supplier.status === 'rejected') {
            return res.status(403).json({ status: 'rejected', message: 'Your application has been rejected.', reason: supplier.rejection_reason });
        }

        if (supplier.is_verified) return res.status(409).json({ status: 'error', message: 'Account is already verified and passcode set.' });

        // Invalidate old OTPs
        await SupplierOtp.updateMany({ supplier_id: supplier._id, purpose: 'verify' }, { $set: { tries: 3 } });

        const { otp } = await sendOTP(supplier.email, 'Verify Your SolarKits Supplier Account', 'Your OTP verification code is:');
        const expires_at = new Date(Date.now() + 3 * 60 * 1000);
        const hashed = await bcrypt.hash(otp, 10);
        await SupplierOtp.create({ supplier_id: supplier._id, otp: hashed, purpose: 'verify', expires_at, tries: 0 });

        const token = jwt.sign_supplier_token(
            { supplier: { id: supplier._id.toString(), purpose: 'verify', is_supplier: true } },
            process.env.SET_PASSCODE_JWT_EXPIRES || '10m'
        );

        return res.status(200).json({ status: 'success', message: 'OTP sent to email.', token, expire_time: expires_at });
    } catch (err) {
        console.error('request_verify_account_otp:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/request-forgot-password-otp ──────────────────────────────────

const request_forgot_password_otp = async (req, res) => {
    try {
        const { email, phone, phone_code } = req.body;
        if (!email && !phone) return res.status(400).json({ status: 'error', message: 'Email or phone is required.' });

        let supplier = null;
        if (email) {
            supplier = await Supplier.findOne({ email: email.trim().toLowerCase(), is_deleted: { $ne: true } });
        } else if (phone && phone_code) {
            supplier = await Supplier.findOne({ phone: phone.trim(), phone_code: phone_code.trim(), is_deleted: { $ne: true } });
        }

        if (!supplier) {
            return res.status(404).json({ 
                status: 'error', 
                message: email ? 'No account found with this email.' : 'No account found with this phone number.' 
            });
        }
        if (!supplier.is_verified) {
            return res.status(403).json({ 
                status: 'error', 
                message: email 
                    ? 'Account not verified. Verify your email first.' 
                    : 'Account not verified. Verify your phone number first.' 
            });
        }

        await SupplierOtp.updateMany({ supplier_id: supplier._id, purpose: 'forgot_password' }, { $set: { tries: 3 } });

        let otp;
        let sent = false;
        if (email) {
            const result = await sendOTP(supplier.email, 'Reset Your SolarKits Supplier Passcode', 'Your password reset OTP is:');
            otp = result.otp;
            sent = true;
        } else {
            try {
                const rawCode = supplier.phone_code.replace('+', '');
                const result = await yourbulksms.sendOTP(rawCode, supplier.phone);
                otp = result.otp;
                sent = true;
            } catch (smsErr) {
                console.warn(`[YourBulkSMS] Failed to send SMS to ${supplier.phone_code}${supplier.phone} due to configuration or balance. Operating in MOCK mode.`);
                otp = Math.floor(100000 + Math.random() * 900000).toString();
                console.log(`[PHONE OTP MOCK] To ${supplier.phone_code}${supplier.phone}: ${otp}`);
            }
        }

        const expires_at = new Date(Date.now() + 3 * 60 * 1000);
        const hashed = await bcrypt.hash(otp, 10);
        await SupplierOtp.create({ supplier_id: supplier._id, otp: hashed, purpose: 'forgot_password', expires_at, tries: 0 });

        const token = jwt.sign_supplier_token(
            { supplier: { id: supplier._id.toString(), purpose: 'forgot_password', is_supplier: true } },
            process.env.SET_PASSCODE_JWT_EXPIRES || '10m'
        );

        return res.status(200).json({ 
            status: 'success', 
            message: sent ? (email ? 'OTP sent to email.' : `OTP sent to ${supplier.phone_code} ${supplier.phone}.`) : 'OTP generated (Mock Mode).', 
            token, 
            expire_time: expires_at 
        });
    } catch (err) {
        console.error('request_forgot_password_otp:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/verify-otp ───────────────────────────────────────────────────

const verify_otp = async (req, res) => {
    try {
        const { token, otp } = req.body;
        if (!token || !otp) return res.status(400).json({ status: 'error', message: 'Token and OTP are required.' });

        let decoded;
        try {
            decoded = jwt.verify_supplier_token(token);
        } catch (err) {
            return res.status(401).json({ status: 'error', message: 'Invalid or expired session token.' });
        }

        const supplierId = decoded?.supplier?.id;
        const purpose    = decoded?.supplier?.purpose;
        if (!supplierId || !purpose) return res.status(401).json({ status: 'error', message: 'Invalid token payload.' });

        const otp_record = await SupplierOtp.findOne({
            supplier_id: supplierId,
            purpose,
            expires_at: { $gt: new Date() },
            tries: { $lt: 3 },
        }).sort({ created_at: -1 });

        if (!otp_record) return res.status(410).json({ status: 'error', message: 'OTP has expired or is invalid. Please request a new one.' });

        const valid = await bcrypt.compare(otp.trim(), otp_record.otp);
        if (!valid) {
            const new_tries = (otp_record.tries || 0) + 1;
            await SupplierOtp.findByIdAndUpdate(otp_record._id, { $set: { tries: new_tries } });
            if (new_tries >= 3) return res.status(429).json({ status: 'error', message: 'Too many incorrect attempts. Please request a new code.' });
            const rem = 3 - new_tries;
            return res.status(400).json({ status: 'error', message: `Invalid OTP. You have ${rem} ${rem > 1 ? 'tries' : 'try'} remaining.` });
        }

        // Invalidate the OTP
        await SupplierOtp.findByIdAndUpdate(otp_record._id, { $set: { tries: 3 } });

        // Generate a set-passcode token
        const token_code = Math.floor(100000 + Math.random() * 900000).toString();
        const encoded = await bcrypt.hash(token_code, 10);
        await Supplier.findByIdAndUpdate(supplierId, { $set: { token: encoded } });

        const passcode_token = jwt.sign_supplier_token(
            { supplier: { id: supplierId, token_code, purpose, is_supplier: true } },
            process.env.SET_PASSCODE_JWT_EXPIRES || '15m'
        );

        return res.status(200).json({
            status: 'success',
            message: 'OTP verified successfully.',
            passcode_token,
            purpose,
        });
    } catch (err) {
        console.error('verify_otp:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/set-passcode ──────────────────────────────────────────────────

const set_passcode = async (req, res) => {
    try {
        const { passcode_token, passcode, confirm_passcode } = req.body;
        if (!passcode || !confirm_passcode || !passcode_token) {
            return res.status(400).json({ status: 'error', message: 'passcode_token, passcode, and confirm_passcode are required.' });
        }
        if (passcode !== confirm_passcode) {
            return res.status(400).json({ status: 'error', message: 'Passcodes do not match.' });
        }
        if (passcode.length < 4) {
            return res.status(400).json({ status: 'error', message: 'Passcode must be at least 4 characters.' });
        }

        let decoded;
        try {
            decoded = jwt.verify_supplier_token(passcode_token);
        } catch (err) {
            return res.status(401).json({ status: 'error', message: 'Invalid or expired passcode token.' });
        }

        const supplierId = decoded?.supplier?.id;
        const purpose    = decoded?.supplier?.purpose;
        const token_code = decoded?.supplier?.token_code;
        if (!supplierId) return res.status(401).json({ status: 'error', message: 'Invalid token payload.' });

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });

        const hashed_passcode = await bcrypt.hash(passcode, 10);
        supplier.passcode = hashed_passcode;
        supplier.is_verified = true;
        supplier.token = null;
        supplier.token_version = (supplier.token_version || 0) + 1;
        await supplier.save();

        // Issue tokens
        const refresh_token = jwt.sign_supplier_token(
            { supplier: { id: supplier._id.toString(), token_version: supplier.token_version, token_type: 'refresh', is_supplier: true } },
            REFRESH_EXP()
        );
        set_refresh_cookie(res, refresh_token);

        const access_token = jwt.sign_supplier_token(
            { supplier: { id: supplier._id.toString(), token_version: supplier.token_version, token_type: 'access', is_supplier: true } },
            ACCESS_EXP()
        );

        return res.status(200).json({
            status: 'success',
            message: purpose === 'verify'
                ? 'Account verified and passcode set. Welcome to SolarKits!'
                : 'Passcode reset successfully.',
            token: access_token,
            supplier: build_supplier_payload(supplier),
        });
    } catch (err) {
        console.error('set_passcode:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/login ─────────────────────────────────────────────────────────

const login = async (req, res) => {
    try {
        const { email, phone, phone_code, passcode, supplier_id } = req.body;
        if (!passcode) return res.status(400).json({ status: 'error', message: 'Passcode is required.' });
        if (!email && !phone && !supplier_id) return res.status(400).json({ status: 'error', message: 'Email, phone, or supplier_id is required.' });

        let matchingSuppliers = [];

        if (supplier_id) {
            const supplier = await Supplier.findOne({ _id: supplier_id, is_deleted: { $ne: true } });
            if (supplier) matchingSuppliers.push(supplier);
        } else if (email) {
            matchingSuppliers = await Supplier.find({ email: email.trim().toLowerCase(), is_deleted: { $ne: true } });
        } else if (phone && phone_code) {
            matchingSuppliers = await Supplier.find({ phone: phone.trim(), phone_code: phone_code.trim(), is_deleted: { $ne: true } });
        }

        if (matchingSuppliers.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No account found with these credentials.' });
        }

        // Filter suppliers by valid passcode
        const authenticatedSuppliers = [];
        for (const s of matchingSuppliers) {
            if (!s.passcode) continue;
            const valid = await bcrypt.compare(passcode, s.passcode);
            if (valid) {
                authenticatedSuppliers.push(s);
            }
        }

        if (authenticatedSuppliers.length === 0) {
            const firstSupplier = matchingSuppliers[0];
            const attempts = (firstSupplier.failed_login_attempts || 0) + 1;
            firstSupplier.failed_login_attempts = attempts;
            firstSupplier.last_failed_login_at = new Date();
            await firstSupplier.save();
            return res.status(401).json({ status: 'error', message: 'Invalid passcode.' });
        }

        if (authenticatedSuppliers.length > 1 && !supplier_id) {
            return res.status(200).json({
                status: 'multiple_accounts',
                message: 'Multiple accounts match these credentials. Please select one.',
                accounts: authenticatedSuppliers.map(s => ({
                    id: s._id.toString(),
                    company_name: s.company_name,
                    brand_name: s.brand_name,
                    brand_logo: s.brand_logo,
                    gst_number: s.gst_number,
                    pan_number: s.pan_number,
                    status: s.status
                }))
            });
        }

        const supplier = authenticatedSuppliers[0];

        if (!supplier.is_active) return res.status(403).json({ status: 'error', message: 'Your account is inactive. Please contact support.' });
        if (!supplier.is_verified) {
            return res.status(403).json({ status: 'unverified', message: 'Please verify your email before logging in.' });
        }

        // Rate limit check
        const TWO_MIN = 2 * 60 * 1000;
        if (supplier.failed_login_attempts >= 5 && supplier.last_failed_login_at) {
            const diff = Date.now() - new Date(supplier.last_failed_login_at).getTime();
            if (diff < TWO_MIN) {
                const sec = Math.ceil((TWO_MIN - diff) / 1000);
                return res.status(429).json({ status: 'error', message: `Too many failed attempts. Try again in ${sec}s.` });
            }
            supplier.failed_login_attempts = 0;
            supplier.last_failed_login_at = null;
            await supplier.save();
        }

        supplier.failed_login_attempts = 0;
        supplier.last_failed_login_at = null;
        supplier.token_version = (supplier.token_version || 0) + 1;
        await supplier.save();

        const refresh_token = jwt.sign_supplier_token(
            { supplier: { id: supplier._id.toString(), token_version: supplier.token_version, token_type: 'refresh', is_supplier: true } },
            REFRESH_EXP()
        );
        set_refresh_cookie(res, refresh_token);

        const access_token = jwt.sign_supplier_token(
            { supplier: { id: supplier._id.toString(), token_version: supplier.token_version, token_type: 'access', is_supplier: true } },
            ACCESS_EXP()
        );

        return res.status(200).json({
            status: 'success',
            message: 'Login successful.',
            token: access_token,
            supplier: build_supplier_payload(supplier),
        });
    } catch (err) {
        console.error('login:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/refresh-access-token ─────────────────────────────────────────

const refresh_access_token = async (req, res) => {
    try {
        const { supplier_refresh_token } = req.cookies || {};
        if (!supplier_refresh_token) {
            return res.status(401).json({ message: 'Authentication token not found.', auth: false });
        }

        let decoded;
        try {
            decoded = jwt.verify_supplier_token(supplier_refresh_token);
        } catch (err) {
            clear_refresh_cookie(res);
            return res.status(401).json({ message: 'Invalid or expired refresh token.', auth: false });
        }

        if (!decoded?.supplier?.id || decoded.supplier.token_type !== 'refresh') {
            clear_refresh_cookie(res);
            return res.status(401).json({ message: 'Invalid token type.', auth: false });
        }

        const supplier = await Supplier.findById(decoded.supplier.id);
        if (!supplier) {
            clear_refresh_cookie(res);
            return res.status(401).json({ message: 'Supplier not found.', auth: false });
        }

        if (supplier.token_version !== decoded.supplier.token_version) {
            clear_refresh_cookie(res);
            return res.status(401).json({ message: 'Session expired. Please log in again.', auth: false });
        }

        const access_token = jwt.sign_supplier_token(
            { supplier: { id: supplier._id.toString(), token_version: supplier.token_version, token_type: 'access', is_supplier: true } },
            ACCESS_EXP()
        );

        return res.status(200).json({ message: 'Token refreshed.', auth: true, token: access_token });
    } catch (err) {
        console.error('refresh_access_token:', err);
        clear_refresh_cookie(res);
        return res.status(500).json({ message: 'Internal server error.', auth: false });
    }
};

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

const me = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.supplier.id).lean();
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });
        return res.status(200).json({
            status: 'success',
            supplier: build_supplier_payload(supplier),
        });
    } catch (err) {
        console.error('me:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/logout ────────────────────────────────────────────────────────

const logout = async (req, res) => {
    try {
        clear_refresh_cookie(res);
        return res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/gst/generate-otp ──────────────────────────────────────────────

const gst_generate_otp = async (req, res) => {
    try {
        const { gstin } = req.body;
        if (!gstin) {
            return res.status(400).json({ status: 'error', message: 'GSTIN is required.' });
        }

        const formattedGst = gstin.trim().toUpperCase();
        const existingGstSupplier = await Supplier.findOne({
            is_deleted: { $ne: true },
            $or: [
                { gst_number: formattedGst },
                { 'gst_list.gst_number': formattedGst }
            ]
        });
        if (existingGstSupplier) {
            return res.status(409).json({
                status: 'error',
                message: `GST number ${formattedGst} is already registered.`
            });
        }

        const apiKey = process.env.QUICKEKYC_API_KEY;
        if (!apiKey) {
            return res.status(400).json({ status: 'error', message: 'QuickeKYC API key is not configured.' });
        }

        const baseUrl = 'https://api.quickekyc.com';
        const response = await fetch(`${baseUrl}/api/v1/corporate/gst-verification-v2/generate-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: apiKey,
                id_number: gstin,
                send_on_email: true,
                send_on_mobile: true
            })
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('QuickeKYC generate-otp response was not JSON:', text);
            return res.status(response.status || 500).json({
                status: 'error',
                message: `QuickeKYC server returned non-JSON response (HTTP ${response.status}).`
            });
        }
        if (data.status !== 'success') {
            return res.status(data.status_code || response.status || 400).json(data);
        }
        return res.status(200).json(data);
    } catch (err) {
        console.error('gst_generate_otp error:', err);
        return res.status(500).json({
            status: 'error',
            message: err.message || 'Failed to send OTP.'
        });
    }
};

const GST_STATE_CODES = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh"
};

const getAddressFromGstData = (data) => {
    if (data.address) return data.address;
    if (data.prb && data.prb.addr) {
        const a = data.prb.addr;
        return [
            a.bno, a.flno, a.st, a.loc, a.dst, a.stcd, a.pn
        ].filter(Boolean).join(', ');
    }
    return '';
};

// ─── POST /auth/gst/submit-otp ────────────────────────────────────────────────

const gst_submit_otp = async (req, res) => {
    try {
        const { request_id, otp, gstin } = req.body;
        if (!request_id || !otp || !gstin) {
            return res.status(400).json({ status: 'error', message: 'request_id, otp, and gstin are required.' });
        }

        const apiKey = process.env.QUICKEKYC_API_KEY;
        if (!apiKey) {
            return res.status(400).json({ status: 'error', message: 'QuickeKYC API key is not configured.' });
        }

        const baseUrl = 'https://api.quickekyc.com';
        const response = await fetch(`${baseUrl}/api/v1/corporate/gst-verification-v2/submit-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: apiKey,
                request_id: request_id,
                otp: otp
            })
        });

        const text = await response.text();
        let resJson;
        try {
            resJson = JSON.parse(text);
        } catch (e) {
            console.error('QuickeKYC submit-otp response was not JSON:', text);
            return res.status(response.status || 500).json({
                status: 'error',
                message: `QuickeKYC server returned non-JSON response (HTTP ${response.status}).`
            });
        }
        if (resJson.status !== 'success' || !resJson.data) {
            return res.status(resJson.status_code || response.status || 400).json(resJson);
        }

        const gstinStatus = resJson.data.gstin_status || resJson.data.gstinStatus || resJson.data.status || resJson.data.gstStatus || '';
        if (gstinStatus && gstinStatus.toLowerCase() !== 'active') {
            return res.status(400).json({
                status: 'error',
                message: `GSTIN is inactive (Status: ${gstinStatus}). Only active GSTINs are allowed.`
            });
        }

        const email = resJson.data.email_id || '';
        const phone = String(resJson.data.mobile_no || '');
        const phone_code = '+91';

        const email_verification_token = jwt.sign_supplier_token(
            { email: email.trim().toLowerCase(), verified: true, type: 'verified_email_sig' },
            '30m'
        );
        const phone_verification_token = jwt.sign_supplier_token(
            { phone: phone.trim(), phone_code: phone_code, verified: true, type: 'verified_phone_sig' },
            '30m'
        );

        const address = getAddressFromGstData(resJson.data);
        const stateCode = gstin.substring(0, 2);
        const state = GST_STATE_CODES[stateCode] || 'Delhi';

        return res.status(200).json({
            ...resJson,
            email_verification_token,
            phone_verification_token,
            address,
            state
        });
    } catch (err) {
        console.error('gst_submit_otp error:', err);
        return res.status(400).json({ status: 'error', message: err.message || 'GST verification failed.' });
    }
};

// ─── GET /auth/my-accounts ────────────────────────────────────────────────────

const get_my_accounts = async (req, res) => {
    try {
        const currentSupplier = await Supplier.findById(req.supplier.id);
        if (!currentSupplier) return res.status(404).json({ status: 'error', message: 'Current supplier not found.' });

        const query = {
            _id: { $ne: currentSupplier._id },
            is_deleted: { $ne: true },
            status: 'approved',
            is_active: true,
            $or: []
        };
        if (currentSupplier.email) query.$or.push({ email: currentSupplier.email });
        if (currentSupplier.phone) query.$or.push({ phone: currentSupplier.phone });

        if (query.$or.length === 0) {
            return res.status(200).json({ status: 'success', accounts: [] });
        }

        const accounts = await Supplier.find(query).select('company_name brand_name brand_logo gst_number pan_number status').lean();

        return res.status(200).json({ status: 'success', accounts });
    } catch (err) {
        console.error('get_my_accounts error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── POST /auth/select-account ────────────────────────────────────────────────

const select_account = async (req, res) => {
    try {
        const { supplier_id } = req.body;
        if (!supplier_id) return res.status(400).json({ status: 'error', message: 'supplier_id is required.' });

        const currentSupplier = await Supplier.findById(req.supplier.id);
        if (!currentSupplier) return res.status(404).json({ status: 'error', message: 'Current supplier not found.' });

        const targetSupplier = await Supplier.findOne({
            _id: supplier_id,
            is_deleted: { $ne: true },
            status: 'approved',
            is_active: true
        });

        if (!targetSupplier) {
            return res.status(404).json({ status: 'error', message: 'Target account not found or not active.' });
        }

        const isAssociated =
            (currentSupplier.email && targetSupplier.email && currentSupplier.email === targetSupplier.email) ||
            (currentSupplier.phone && targetSupplier.phone && currentSupplier.phone === targetSupplier.phone);

        if (!isAssociated) {
            return res.status(403).json({ status: 'error', message: 'Unauthorized access to this account.' });
        }

        targetSupplier.token_version = (targetSupplier.token_version || 0) + 1;
        await targetSupplier.save();

        const refresh_token = jwt.sign_supplier_token(
            { supplier: { id: targetSupplier._id.toString(), token_version: targetSupplier.token_version, token_type: 'refresh', is_supplier: true } },
            REFRESH_EXP()
        );
        set_refresh_cookie(res, refresh_token);

        const access_token = jwt.sign_supplier_token(
            { supplier: { id: targetSupplier._id.toString(), token_version: targetSupplier.token_version, token_type: 'access', is_supplier: true } },
            ACCESS_EXP()
        );

        return res.status(200).json({
            status: 'success',
            message: 'Switched account successfully.',
            token: access_token,
            supplier: build_supplier_payload(targetSupplier),
        });
    } catch (err) {
        console.error('select_account error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    get_active_countries,
    get_active_states,
    get_active_districts,
    register,
    request_verify_account_otp,
    request_forgot_password_otp,
    verify_otp,
    set_passcode,
    login,
    refresh_access_token,
    me,
    logout,
    gst_generate_otp,
    gst_submit_otp,
    send_register_email_otp,
    verify_register_email_otp,
    send_register_phone_otp,
    verify_register_phone_otp,
    get_my_accounts,
    select_account,
};
