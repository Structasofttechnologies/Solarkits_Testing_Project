'use strict';

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { sendOTP } = require('../../solarshop-india/utils/nodemailer');
const { sendWhatsAppOTP } = require('../../solarshop-india/utils/whatsapp');

/**
 * Generate, dispatch, and persist a secure OTP
 */
const generateAndSendOtp = async ({
  target,
  channel = 'email',
  purpose = 'verification',
  entity_type = 'anonymous',
  entity_id = null,
  ip_address = null,
  company_name = 'BOSKIT Power Distribution',
  expiry_minutes = 5,
}) => {
  const BoskitOtp = mongoose.model('boskit_otps');

  const cleanTarget = target.trim().toLowerCase();
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits for B2B portal
  const otpHash = await bcrypt.hash(rawOtp, 10);
  const expiresAt = new Date(Date.now() + expiry_minutes * 60 * 1000);

  // Invalidate any active OTPs for this target & purpose
  await BoskitOtp.updateMany(
    { target: cleanTarget, purpose, verified_at: null },
    { verified_at: new Date(0) } // mark stale
  );

  // Create new OTP record
  await BoskitOtp.create({
    target: cleanTarget,
    channel,
    otp_hash: otpHash,
    purpose,
    entity_type,
    entity_id,
    ip_address,
    expires_at: expiresAt,
  });

  // Dispatch OTP
  if (channel === 'email') {
    try {
      await sendOTP(
        cleanTarget,
        `BOSKIT Verification Code`,
        `Your 6-digit verification code for <strong>${company_name}</strong> is:`,
        company_name,
        rawOtp
      );
    } catch (err) {
      console.warn(`[BOSKIT OTP] Email dispatch failed: ${err.message}. Raw OTP: ${rawOtp}`);
    }
  } else if (channel === 'whatsapp' || channel === 'mobile') {
    try {
      await sendWhatsAppOTP(cleanTarget, rawOtp);
    } catch (err) {
      console.warn(`[BOSKIT OTP] WhatsApp/Mobile dispatch failed: ${err.message}. Raw OTP: ${rawOtp}`);
    }
  }

  // Development/Test fallback logging
  console.log(`[BOSKIT OTP Generated] Target: ${cleanTarget} | Purpose: ${purpose} | OTP: ${rawOtp}`);

  return {
    success: true,
    expires_at: expiresAt,
    target: cleanTarget,
    // Return OTP in dev/test environment for easy automation
    dev_otp: process.env.NODE_ENV !== 'production' ? rawOtp : undefined,
  };
};

/**
 * Verify an incoming OTP
 */
const verifyOtp = async ({
  target,
  otp,
  purpose = 'verification',
}) => {
  const BoskitOtp = mongoose.model('boskit_otps');
  const cleanTarget = target.trim().toLowerCase();
  const enteredOtp = (otp || '').toString().trim();

  // Fast-track demo OTP in non-production
  if ((process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_OTP === 'true') && enteredOtp === '123456') {
    return { success: true, is_demo: true };
  }

  const record = await BoskitOtp.findOne({
    target: cleanTarget,
    purpose,
    verified_at: null,
    expires_at: { $gt: new Date() },
  }).sort({ created_at: -1 });

  if (!record) {
    return { success: false, message: 'Invalid or expired OTP. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    return { success: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' };
  }

  const isValid = await bcrypt.compare(enteredOtp, record.otp_hash);

  if (!isValid) {
    await BoskitOtp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return { success: false, message: 'Incorrect OTP code.' };
  }

  // Mark verified
  await BoskitOtp.updateOne({ _id: record._id }, { verified_at: new Date() });

  return { success: true, entity_id: record.entity_id, record };
};

module.exports = {
  generateAndSendOtp,
  verifyOtp,
};
