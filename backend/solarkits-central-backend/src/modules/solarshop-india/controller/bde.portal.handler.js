/**
 * bde.portal.handler.js
 *
 * Comprehensive Controller for SolarKits BDE Portal APIs.
 * Covers:
 * 1. BDE Auth & Profile
 * 2. Scoped Territory, Goals & Notifications
 * 3. State & District Territory Dashboard
 * 4. Dedicated EPC Leads Management (10-stage lifecycle)
 * 5. GST-Based EPC Onboarding & Duplicate Prevention
 * 6. District-Matched Franchisee Assignment & In-App Notification
 * 7. Franchisee Goal vs Achievement Tracking (6 Performance Tiers)
 * 8. Franchisee Order History & Territory PO Explorer
 * 9. Highest / Average / Lowest Selling Kit Sales Analytics
 * 10. Territory Franchisee Performance Ranking Leaderboard
 */

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const {
  BDEProfile,
  BDEKYC,
  BDETerritoryAssignment,
  BDEPlanAssignment,
  BDEGoal,
  BDEActivityLog,
  BDENotification,
  BDELead,
  BDELeadActivity,
  BDEFollowUp,
  BDEReassignmentHistory,
  TerritoryExceptionRequest,
  Reseller,
  FranchiseLead,
  ResellerPlan,
  ResellerPlanSubscription,
  FranchiseePlanPoSetting,
  ResellerTerritory,
  StoreSetup,
  StoreSetupChecklist,
  StoreSetupDelay,
  StoreSetupVerification,
  EpcAccount,
  EpcResellerRelationship,
  EPCLead,
  EpcType,
  FranchiseeKitTarget,
  FranchiseeTargetProgress,
  FpoOrder,
  EpcOrder,
  WarehouseComboKit,
  FranchiseeAlert,
  EpcSignupRequest,
} = require('../../admin-panel/models/india_solarshop_db');
const {
  createPoDraft,
  submitPo,
  allocatePoProducts,
  recordEpcTokenPayment,
  validatePo,
} = require('../../admin-panel/services/franchisee.po.service');
const resellerPortalHandler = require('./reseller.portal.handler');
const EpcAccountLocation = require('../models/india_solarshop_db/epc_account_locations.schema');
const { EpcCompany } = require('../../admin-panel/models/india_core_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../../admin-panel/models/geolocation_db');
const { generate_token } = require('../utils/jsonwebtoken');
const {
  createLead,
  startFranchiseeSignup,
  getBdeDashboardMetrics,
} = require('../../admin-panel/services/bde.lead.service');
const { performGstVerification } = require('../../admin-panel/services/gst.verification.service');
const { resolveEffectiveTarget } = require('../../admin-panel/services/franchisee.goal.service');

// Helper to mask sensitive KYC fields
function maskAadhaar(val) {
  if (!val || val.length < 4) return 'XXXXXXXXXXXX';
  return 'XXXXXXXX' + val.slice(-4);
}

function maskPan(val) {
  if (!val || val.length < 4) return 'XXXXXXXXXX';
  return val.slice(0, 2) + 'XXXXXX' + val.slice(-2);
}

const GST_STATE_CODE_MAP = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

/**
 * Helper: Get all BDE's active territories (supports multiple assigned states)
 */
async function _getBdeTerritories(bdeId) {
  const territories = await BDETerritoryAssignment.find({ bde_id: bdeId, status: 'active' }).lean();
  return territories || [];
}

/**
 * Helper: Get BDE's primary active territory (state_id, state_name, district_names, district_ids)
 */
async function _getBdeTerritoryScope(bdeId) {
  const territories = await _getBdeTerritories(bdeId);
  return territories[0] || null;
}

/**
 * Helper: Generate next EPC Lead ID (EPC-LD-YYYY-XXXX)
 */
async function _generateNextEpcLeadId() {
  const year = new Date().getFullYear();
  const prefix = `EPC-LD-${year}-`;
  const lastLead = await EPCLead.findOne({
    lead_id: { $regex: `^${prefix}` },
  })
    .sort({ lead_id: -1 })
    .lean();

  let nextNum = 1;
  if (lastLead && lastLead.lead_id) {
    const parts = lastLead.lead_id.split('-');
    if (parts.length === 4) {
      const parsed = parseInt(parts[3], 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

/**
 * Helper: Dynamically resolve active EPC Classification Type from Admin master
 */
async function _resolveActiveEpcType(typeName, typeId) {
  if (typeName && String(typeName).trim()) {
    const cleanName = String(typeName).trim();
    const matched = await EpcType.findOne({
      name: new RegExp(`^${cleanName}$`, 'i'),
      deleted_at: null,
    }).lean();
    if (matched) return { name: matched.name, id: matched._id };
    return { name: cleanName, id: typeId || null };
  }
  const defaultActive = await EpcType.findOne({ is_active: true, deleted_at: null })
    .sort({ display_order: 1, created_at: 1 })
    .lean();
  if (defaultActive) {
    return { name: defaultActive.name, id: defaultActive._id };
  }
  return { name: '', id: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTHENTICATION & PROFILE
// ─────────────────────────────────────────────────────────────────────────────
exports.login_bde = async (req, res) => {
  try {
    const { identifier, email, mobile_number, password, pin, remember_me } = req.body;
    const loginId = identifier || email || mobile_number;
    const loginPin = pin || password;

    if (!loginId || !loginPin) {
      return res.status(400).json({
        status: 'error',
        message: 'Identifier (Email / Mobile / BDE ID) and 4-digit PIN are required',
      });
    }

    const cleanLoginId = String(loginId).trim();
    const cleanPin = String(loginPin).trim();

    if (!/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({
        status: 'error',
        message: 'PIN must be exactly 4 digits (0-9)',
      });
    }

    const bde = await BDEProfile.findOne({
      $or: [
        { email: cleanLoginId.toLowerCase() },
        { mobile_number: cleanLoginId },
        { bde_id: cleanLoginId.toUpperCase() },
      ],
      deleted_at: null,
    }).select('+password_hash');

    if (!bde) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials. No BDE account found with this identifier.',
      });
    }

    const isPinValid = await bcrypt.compare(cleanPin, bde.password_hash || '');
    if (!isPinValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid 4-digit PIN. Please verify or contact administrator.',
      });
    }

    if (bde.status === 'suspended') {
      return res.status(403).json({
        status: 'error',
        message: 'Your BDE account has been suspended by Admin. Please contact support.',
      });
    }

    if (bde.status === 'inactive') {
      return res.status(403).json({
        status: 'error',
        message: 'Your BDE account is currently inactive.',
      });
    }

    const kyc = await BDEKYC.findOne({ bde_id: bde._id });
    if (!kyc || kyc.kyc_status !== 'verified') {
      const kycState = kyc ? kyc.kyc_status : 'missing';
      return res.status(403).json({
        status: 'error',
        message: `BDE login requires verified KYC. Your current KYC status is: "${kycState.toUpperCase()}". Please wait for Admin verification.`,
      });
    }

    if (bde.status !== 'active' && bde.status !== 'kyc_verified') {
      return res.status(403).json({
        status: 'error',
        message: `Your account is currently in "${bde.status}" status. It must be activated by Admin before you can log in.`,
      });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
    bde.last_login_at = new Date();
    bde.last_login_ip = clientIp;
    await bde.save();

    const expiresIn = remember_me ? '30d' : '7d';
    const token = generate_token(
      {
        id: bde._id.toString(),
        bde_id: bde.bde_id,
        email: bde.email,
        full_name: bde.full_name,
        role: 'bde',
        token_version: bde.token_version || 0,
      },
      { expiresIn }
    );

    res.cookie('bde_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: (remember_me ? 30 : 7) * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      data: {
        id: bde._id,
        bde_id: bde.bde_id,
        full_name: bde.full_name,
        email: bde.email,
        mobile_number: bde.mobile_number,
        status: bde.status,
        is_first_login: bde.is_first_login,
        can_onboard_epc: bde.can_onboard_epc !== false,
        can_onboard_franchise: bde.can_onboard_franchise !== false,
      },
    });
  } catch (error) {
    console.error('[login_bde Error]', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error during login', error: error.message });
  }
};

exports.logout_bde = async (req, res) => {
  try {
    res.clearCookie('bde_access_token');
    return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    console.error('[logout_bde Error]', error);
    return res.status(500).json({ status: 'error', message: 'Logout failed', error: error.message });
  }
};

exports.change_password = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ status: 'error', message: 'New password must be at least 6 characters long' });
    }

    const bde = await BDEProfile.findById(req.user.id).select('+password_hash');
    if (!bde) return res.status(404).json({ status: 'error', message: 'BDE profile not found' });

    if (!bde.is_first_login && current_password) {
      const isMatch = await bcrypt.compare(current_password, bde.password_hash || '');
      if (!isMatch) return res.status(400).json({ status: 'error', message: 'Current password does not match' });
    }

    bde.password_hash = await bcrypt.hash(new_password, 10);
    bde.is_first_login = false;
    bde.token_version = (bde.token_version || 0) + 1;
    await bde.save();

    const token = generate_token({
      id: bde._id.toString(),
      bde_id: bde.bde_id,
      email: bde.email,
      full_name: bde.full_name,
      role: 'bde',
      token_version: bde.token_version,
    });

    res.cookie('bde_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ status: 'success', message: 'Password changed successfully', token });
  } catch (error) {
    console.error('[change_password Error]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to change password', error: error.message });
  }
};

exports.forgot_password = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ status: 'error', message: 'Email or Mobile number is required' });

    const clean = String(identifier).trim();
    const bde = await BDEProfile.findOne({
      $or: [{ email: clean.toLowerCase() }, { mobile_number: clean }],
      deleted_at: null,
    });
    if (!bde) return res.status(404).json({ status: 'error', message: 'No registered BDE found with this identifier' });

    return res.status(200).json({
      status: 'success',
      message: 'Password reset request submitted. Please contact your Solarkits Administrator to reset your password.',
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to process forgot password request', error: error.message });
  }
};

exports.get_bde_me = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const [bde, kyc, territories, plans] = await Promise.all([
      BDEProfile.findById(bdeId).lean(),
      BDEKYC.findOne({ bde_id: bdeId }).lean(),
      _getBdeTerritories(bdeId),
      BDEPlanAssignment.findOne({ bde_id: bdeId, status: 'active' }).populate('plan_ids').lean(),
    ]);

    if (!bde) return res.status(404).json({ status: 'error', message: 'BDE profile not found' });
    const territory = territories[0] || null;

    return res.status(200).json({
      status: 'success',
      data: {
        id: bde._id,
        bde_id: bde.bde_id,
        full_name: bde.full_name,
        profile_photo: bde.profile_photo,
        email: bde.email,
        mobile_number: bde.mobile_number,
        address: bde.address,
        country_name: bde.country_name,
        state_id: bde.state_id,
        state_name: territory ? territory.state_name : bde.state_name,
        district_id: bde.district_id,
        district_name: bde.district_name,
        joining_date: bde.joining_date,
        status: bde.status,
        is_first_login: bde.is_first_login,
        kyc: kyc ? {
          kyc_status: kyc.kyc_status,
          aadhaar_masked: maskAadhaar(kyc.aadhaar_number),
          pan_masked: maskPan(kyc.pan_number),
          verified_at: kyc.verified_at,
        } : null,
        territory: territory ? {
          state_name: territory.state_name,
          district_names: territory.district_names || [],
          priority: territory.priority,
          start_date: territory.assignment_start_date,
        } : null,
        territories: territories.map(t => ({
          id: t._id,
          state_id: t.state_id,
          state_name: t.state_name,
          district_names: t.district_names || [],
          priority: t.priority,
          start_date: t.assignment_start_date,
        })),
        plans: plans ? plans.plan_names : [],
        can_onboard_epc: bde.can_onboard_epc !== false,
        can_onboard_franchise: bde.can_onboard_franchise !== false,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch profile', error: error.message });
  }
};

exports.update_bde_me = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { address, profile_photo } = req.body;
    const bde = await BDEProfile.findById(bdeId);
    if (!bde) return res.status(404).json({ status: 'error', message: 'BDE profile not found' });

    if (address !== undefined) bde.address = address ? address.trim() : null;
    if (profile_photo !== undefined) bde.profile_photo = profile_photo;
    await bde.save();

    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { address: bde.address, profile_photo: bde.profile_photo },
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to update profile', error: error.message });
  }
};

exports.get_my_territory = async (req, res) => {
  try {
    const territories = await _getBdeTerritories(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: territories[0] || null,
      territories: territories.map(t => ({
        id: t._id,
        state_id: t.state_id,
        state_name: t.state_name,
        district_names: t.district_names || [],
        priority: t.priority,
        start_date: t.assignment_start_date,
      })),
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch territory', error: err.message });
  }
};

exports.get_my_plans = async (req, res) => {
  try {
    const plans = await BDEPlanAssignment.findOne({ bde_id: req.user.id, status: 'active' }).populate('plan_ids').lean();
    return res.status(200).json({ status: 'success', data: plans });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch plans', error: err.message });
  }
};

exports.get_my_goals = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const goals = await BDEGoal.find({ bde_id: bdeId }).sort({ createdAt: -1 }).lean();
    const current = goals.find(g => g.status === 'active') || goals[0] || null;

    // Fetch live territory & achievements (supports multiple assigned states)
    const activeTerritories = await BDETerritoryAssignment.find({ bde_id: bdeId, status: 'active' }).lean();
    const assignedDistricts = [...new Set(activeTerritories.flatMap(t => t.district_names || []))];
    const assignedStates = [...new Set(activeTerritories.map(t => t.state_name).filter(Boolean))];
    const stateNames = assignedStates.length > 0 ? assignedStates : (req.bde?.state_name ? [req.bde.state_name] : []);

    const resellerQuery = {
      deleted_at: null,
      $or: [{ bde_id: bdeId }],
    };
    if (stateNames.length > 0) {
      resellerQuery.$or.push({ 'address.state_name': { $in: stateNames.map(s => new RegExp(`^${s}$`, 'i')) } });
    }
    if (assignedDistricts.length > 0) resellerQuery.$or.push({ 'address.district_name': { $in: assignedDistricts } });

    const territoryFranchisees = await Reseller.find(resellerQuery).lean();
    const franchiseeIds = territoryFranchisees.map(f => f._id);
    const operationalCount = territoryFranchisees.filter(f => f.is_operational).length;

    const stateLeadFilter = stateNames.length > 0 ? [{ state_name: { $in: stateNames.map(s => new RegExp(`^${s}$`, 'i')) } }] : [];

    const [epcLeadsCount, epcsOnboardedCount, fpoOrders] = await Promise.all([
      EPCLead.countDocuments({
        deleted_at: null,
        $or: [{ current_bde_id: bdeId }, ...stateLeadFilter],
      }),
      EPCLead.countDocuments({
        deleted_at: null,
        lead_status: { $in: ['Onboarded', 'Assigned to Franchisee'] },
        $or: [{ current_bde_id: bdeId }, ...stateLeadFilter],
      }),
      FpoOrder.find({
        reseller_id: { $in: franchiseeIds },
        status: { $nin: ['CANCELLED', 'EXPIRED'] },
      }).lean(),
    ]);

    let totalKitsOrdered = 0;
    fpoOrders.forEach(order => {
      (order.items || []).forEach(item => {
        totalKitsOrdered += Number(item.quantity || 0);
      });
    });

    const enrichedCurrent = current ? {
      ...current,
      monthly_signup_achieved: territoryFranchisees.length,
      quarterly_signup_achieved: territoryFranchisees.length,
      operational_store_achieved: operationalCount,
      monthly_epc_leads_achieved: epcLeadsCount,
      monthly_epc_onboarded_achieved: epcsOnboardedCount,
      monthly_network_kits_achieved: totalKitsOrdered,
    } : null;

    return res.status(200).json({
      status: 'success',
      data: {
        current: enrichedCurrent,
        history: goals,
        achievements: {
          monthly_signup_achieved: territoryFranchisees.length,
          quarterly_signup_achieved: territoryFranchisees.length,
          operational_store_achieved: operationalCount,
          monthly_epc_leads_achieved: epcLeadsCount,
          monthly_epc_onboarded_achieved: epcsOnboardedCount,
          monthly_network_kits_achieved: totalKitsOrdered,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch goals', error: err.message });
  }
};

exports.get_notifications = async (req, res) => {
  try {
    const notifications = await BDENotification.find({ bde_id: req.user.id })
      .sort({ created_at: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const formatted = notifications.map((n) => ({
      ...n,
      createdAt: n.created_at || n.createdAt,
      created_at: n.created_at || n.createdAt,
    }));

    const unreadCount = await BDENotification.countDocuments({ bde_id: req.user.id, is_read: false });
    return res.status(200).json({ status: 'success', data: formatted, unread_count: unreadCount });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch notifications', error: error.message });
  }
};

exports.mark_notification_read = async (req, res) => {
  try {
    const { id } = req.params;
    await BDENotification.findOneAndUpdate({ _id: id, bde_id: req.user.id }, { is_read: true, read_at: new Date() });
    return res.status(200).json({ status: 'success', message: 'Notification marked as read' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to update notification', error: error.message });
  }
};

exports.mark_all_notifications_read = async (req, res) => {
  try {
    await BDENotification.updateMany(
      { bde_id: req.user.id, is_read: false },
      { $set: { is_read: true, read_at: new Date() } }
    );
    return res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Failed to mark notifications as read', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATE & DISTRICT TERRITORY DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
exports.get_bde_dashboard = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const [bde, kyc, activeTerritories, plans, goal, notifications] = await Promise.all([
      BDEProfile.findById(bdeId).lean(),
      BDEKYC.findOne({ bde_id: bdeId }).lean(),
      BDETerritoryAssignment.find({ bde_id: bdeId, status: 'active' }).lean(),
      BDEPlanAssignment.findOne({ bde_id: bdeId, status: 'active' }).populate('plan_ids').lean(),
      BDEGoal.findOne({ bde_id: bdeId, status: 'active' }).sort({ createdAt: -1 }).lean(),
      BDENotification.find({ bde_id: bdeId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    if (!bde) return res.status(404).json({ status: 'error', message: 'BDE not found' });

    const assignedDistricts = [...new Set((activeTerritories || []).flatMap(t => t.district_names || []))];
    const assignedStates = [...new Set((activeTerritories || []).map(t => t.state_name).filter(Boolean))];
    const stateNames = assignedStates.length > 0 ? assignedStates : (bde.state_name ? [bde.state_name] : ['Assigned Territory']);
    const stateName = stateNames.join(', ');
    const stateId = activeTerritories[0]?.state_id || bde.state_id;

    // ── Territory Aggregation (supports multiple assigned states) ──
    const resellerQuery = {
      deleted_at: null,
      $or: [
        { bde_id: bdeId },
        { 'address.state_name': { $in: stateNames.map(s => new RegExp(`^${s}$`, 'i')) } },
      ],
    };
    if (assignedDistricts.length > 0) {
      resellerQuery.$or.push({ 'address.district_name': { $in: assignedDistricts } });
    }

    const territoryFranchisees = await Reseller.find(resellerQuery).lean();
    const totalFranchisees = territoryFranchisees.length;
    const operationalFranchisees = territoryFranchisees.filter((f) => f.is_operational).length;
    const franchiseesUnderSetup = Math.max(0, totalFranchisees - operationalFranchisees);

    const franchiseeIds = territoryFranchisees.map((f) => f._id);

    const stateLeadFilter = stateNames.length > 0 ? [{ state_name: { $in: stateNames.map(s => new RegExp(`^${s}$`, 'i')) } }] : [];

    // EPC Leads in territory / by BDE
    const epcLeadsCount = await EPCLead.countDocuments({
      deleted_at: null,
      $or: [{ current_bde_id: bdeId }, ...stateLeadFilter],
    });

    const epcsOnboardedCount = await EPCLead.countDocuments({
      deleted_at: null,
      lead_status: { $in: ['Onboarded', 'Assigned to Franchisee'] },
      $or: [{ current_bde_id: bdeId }, ...stateLeadFilter],
    });

    const epcsAssignedCount = await EPCLead.countDocuments({
      deleted_at: null,
      lead_status: 'Assigned to Franchisee',
      $or: [{ current_bde_id: bdeId }, ...stateLeadFilter],
    });

    // PO & Kit orders in territory
    const dashboardFpoFilters = [
      { created_by: new mongoose.Types.ObjectId(bdeId) },
      { created_by_role: 'BDE' },
    ];
    if (franchiseeIds.length > 0) {
      dashboardFpoFilters.push({ reseller_id: { $in: franchiseeIds } });
      dashboardFpoFilters.push({ franchisee_id: { $in: franchiseeIds } });
    }
    if (stateNames.length > 0) {
      dashboardFpoFilters.push({ 'customer_details.state': { $in: stateNames.map((s) => new RegExp(`^${s}$`, 'i')) } });
      dashboardFpoFilters.push({ 'delivery_address.state_name': { $in: stateNames.map((s) => new RegExp(`^${s}$`, 'i')) } });
    }

    const [fpoOrders, epcOrders] = await Promise.all([
      FpoOrder.find({
        $or: dashboardFpoFilters,
        status: { $nin: ['CANCELLED', 'EXPIRED'] },
      }).lean(),
      EpcOrder.find({
        $or: [
          ...(franchiseeIds.length > 0 ? [{ reseller_id: { $in: franchiseeIds } }] : []),
          ...(stateNames.length > 0 ? [{ 'delivery_address.state_name': { $in: stateNames.map((s) => new RegExp(`^${s}$`, 'i')) } }] : [])
        ],
        order_status: { $nin: ['cancelled', 'rejected'] }
      }).lean().catch(() => [])
    ]);

    const totalOrdersCount = fpoOrders.length + epcOrders.length;
    let totalKitsOrdered = 0;
    fpoOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        totalKitsOrdered += Number(item.quantity || 0);
      });
    });
    epcOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        totalKitsOrdered += Number(item.quantity || 0);
      });
    });

    // ── District Breakdown Table ──
    const districtBreakdown = await Promise.all(
      (assignedDistricts.length > 0 ? assignedDistricts : ['Central District']).map(async (dName) => {
        const dFranchisees = territoryFranchisees.filter(
          (f) => f.address?.district_name && f.address.district_name.toLowerCase().trim() === dName.toLowerCase().trim()
        );

        const [dLeads, dOnboarded, dFpoOrders, dEpcOrders] = await Promise.all([
          EPCLead.countDocuments({
            deleted_at: null,
            district_name: new RegExp(`^${dName}$`, 'i'),
          }),
          EPCLead.countDocuments({
            deleted_at: null,
            district_name: new RegExp(`^${dName}$`, 'i'),
            lead_status: { $in: ['Onboarded', 'Assigned to Franchisee'] },
          }),
          FpoOrder.find({
            $or: [
              { 'customer_details.district': new RegExp(`^${dName}$`, 'i') },
              { 'delivery_address.district_name': new RegExp(`^${dName}$`, 'i') },
              ...(dFranchisees.length > 0 ? [{ reseller_id: { $in: dFranchisees.map(f => f._id) } }, { franchisee_id: { $in: dFranchisees.map(f => f._id) } }] : [])
            ],
            status: { $nin: ['CANCELLED', 'EXPIRED'] },
          }).lean().catch(() => []),
          EpcOrder.find({
            'delivery_address.district_name': new RegExp(`^${dName}$`, 'i'),
            order_status: { $nin: ['cancelled', 'rejected'] }
          }).lean().catch(() => [])
        ]);

        let dKits = 0;
        (dFpoOrders || []).forEach((o) => {
          (o.items || []).forEach((item) => {
            dKits += Number(item.quantity || 0);
          });
        });
        (dEpcOrders || []).forEach((o) => {
          (o.items || []).forEach((item) => {
            dKits += Number(item.quantity || 0);
          });
        });

        const dTarget = dFranchisees.length > 0 ? dFranchisees.length * 10 : 20;
        const dAchievement = dTarget > 0 ? Math.round((dKits / dTarget) * 100) : 0;

        return {
          district: dName,
          franchisees_count: dFranchisees.length,
          operational_count: dFranchisees.filter((f) => f.is_operational).length,
          epc_leads_count: dLeads,
          epcs_onboarded_count: dOnboarded,
          kits_ordered_count: dKits,
          monthly_goal: dTarget,
          goal_achievement_pct: dAchievement,
        };
      })
    );

    // Goal Metrics with exact nullish coalescing
    const monthlyGoal = goal?.monthly_franchisee_signup_goal ?? 0;
    const monthlyAchieved = totalFranchisees;
    const monthlyPct = monthlyGoal > 0 ? Math.min(100, Math.round((monthlyAchieved / monthlyGoal) * 100)) : 0;

    const monthlyEpcGoal = goal?.monthly_epc_lead_goal !== undefined && goal?.monthly_epc_lead_goal !== null
      ? Number(goal.monthly_epc_lead_goal)
      : 25;
    const monthlyEpcOnboardGoal = goal?.monthly_epc_onboard_goal !== undefined && goal?.monthly_epc_onboard_goal !== null
      ? Number(goal.monthly_epc_onboard_goal)
      : 10;
    const monthlyKitGoal = goal?.monthly_network_kit_goal !== undefined && goal?.monthly_network_kit_goal !== null
      ? Number(goal.monthly_network_kit_goal)
      : 200;

    return res.status(200).json({
      status: 'success',
      data: {
        bde: {
          id: bde._id,
          bde_id: bde.bde_id,
          full_name: bde.full_name,
          profile_photo: bde.profile_photo,
          email: bde.email,
          mobile_number: bde.mobile_number,
          status: bde.status,
          kyc_status: kyc ? kyc.kyc_status : 'pending',
          joining_date: bde.joining_date,
        },
        territory: {
          state_name: stateName,
          assigned_states: assignedStates,
          districts: assignedDistricts,
          district_names: assignedDistricts,
          district_count: assignedDistricts.length,
          priority: activeTerritories[0]?.priority || 'medium',
          start_date: activeTerritories[0]?.assignment_start_date || null,
        },
        territories: activeTerritories || [],
        state_summary: {
          total_assigned_districts: assignedDistricts.length,
          total_franchisees: totalFranchisees,
          operational_franchisees: operationalFranchisees,
          franchisees_under_setup: franchiseesUnderSetup,
          epc_leads: epcLeadsCount,
          epcs_onboarded: epcsOnboardedCount,
          epcs_assigned: epcsAssignedCount,
          total_orders: totalOrdersCount,
          total_kits_ordered: totalKitsOrdered,
        },
        district_breakdown: districtBreakdown,
        goals: {
          period_type: goal?.period_type || 'monthly',
          year: goal?.year || new Date().getFullYear(),
          notes: goal?.notes || '',
          monthly_franchisee_signup_goal: monthlyGoal,
          monthly_signup_achieved: monthlyAchieved,
          monthly_signup_progress_pct: monthlyPct,
          quarterly_franchisee_signup_goal: goal?.quarterly_franchisee_signup_goal ?? 0,
          quarterly_signup_achieved: totalFranchisees,
          operational_store_goal: goal?.operational_store_goal ?? 0,
          operational_store_achieved: operationalFranchisees,
          monthly_epc_lead_goal: monthlyEpcGoal,
          monthly_epc_leads_achieved: epcLeadsCount,
          monthly_epc_onboard_goal: monthlyEpcOnboardGoal,
          monthly_epc_onboarded_achieved: epcsOnboardedCount,
          monthly_network_kit_goal: monthlyKitGoal,
          monthly_network_kits_achieved: totalKitsOrdered,
          network_kit_achievement_pct: monthlyKitGoal > 0 ? Math.round((totalKitsOrdered / monthlyKitGoal) * 100) : 0,
        },
        notifications,
      },
    });
  } catch (error) {
    console.error('[get_bde_dashboard Error]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch dashboard data', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. EPC LEADS MANAGEMENT (10-Stage Lifecycle)
// ─────────────────────────────────────────────────────────────────────────────
exports.create_epc_lead = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const {
      company_name,
      contact_person,
      mobile_number,
      email,
      gst_number,
      state_name,
      district_name,
      pincode,
      address_line,
      lead_source,
      interested_products,
      follow_up_date,
      remarks,
      epc_type,
      epc_type_id,
    } = req.body;

    if (!company_name || !contact_person || !mobile_number || !email || !state_name || !district_name) {
      return res.status(400).json({
        status: 'error',
        message: 'Company name, contact person, mobile, email, state, and district are required.',
      });
    }

    // Strict validation for Indian 10-digit mobile number starting with 6, 7, 8, or 9
    const cleanMobile = String(mobile_number || '').trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
      });
    }

    // Email format validation
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter a valid email address.',
      });
    }

    // Optional Pincode validation: must be 6 digits
    const cleanPincode = pincode ? String(pincode).trim().replace(/\D/g, '') : null;
    if (cleanPincode && !/^\d{6}$/.test(cleanPincode)) {
      return res.status(400).json({
        status: 'error',
        message: 'Pincode must be a valid 6-digit number.',
      });
    }

    // Optional GST validation: 15-character GSTIN format
    const cleanGst = gst_number ? String(gst_number).trim().toUpperCase() : null;
    if (cleanGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid GSTIN format. Expected 15 characters (e.g. 27ABCDE1234F1Z5).',
      });
    }

    // Verify state belongs to BDE assigned territories (if any territory is assigned)
    const activeTerritories = await _getBdeTerritories(bdeId);
    if (activeTerritories && activeTerritories.length > 0) {
      const allowedStates = activeTerritories.map(t => t.state_name.toLowerCase());
      if (!allowedStates.includes(state_name.trim().toLowerCase())) {
        return res.status(400).json({
          status: 'error',
          message: `State "${state_name}" is outside your assigned territories (${activeTerritories.map(t => t.state_name).join(', ')}).`,
        });
      }
    }

    // Check duplicate in EPC leads
    const dupQuery = {
      deleted_at: null,
      $or: [{ mobile_number: cleanMobile }, { email: cleanEmail }],
    };
    if (cleanGst) dupQuery.$or.push({ gst_number: cleanGst });

    const existingLead = await EPCLead.findOne(dupQuery).lean();
    if (existingLead) {
      return res.status(409).json({
        status: 'error',
        message: `An EPC lead already exists with these credentials (${existingLead.lead_id} - ${existingLead.company_name}).`,
      });
    }

    // Check duplicate in EPC accounts
    if (cleanGst) {
      const existingAccount = await EpcAccount.findOne({ gstin: cleanGst, deleted_at: null }).lean();
      if (existingAccount) {
        return res.status(409).json({
          status: 'error',
          message: `An onboarded EPC account with GSTIN ${cleanGst} already exists in the system.`,
        });
      }
    }

    const leadId = await _generateNextEpcLeadId();
    const resolvedType = await _resolveActiveEpcType(epc_type, epc_type_id);

    const newLead = await EPCLead.create({
      lead_id: leadId,
      company_name: company_name.trim(),
      contact_person: contact_person.trim(),
      mobile_number: cleanMobile,
      email: cleanEmail,
      gst_number: cleanGst,
      gst_verified: false,
      state_name: state_name.trim(),
      district_name: district_name.trim(),
      pincode: pincode ? pincode.trim() : null,
      address_line: address_line ? address_line.trim() : null,
      lead_source: lead_source || 'direct_visit',
      interested_products: Array.isArray(interested_products) ? interested_products : [],
      epc_type: resolvedType.name,
      epc_type_id: resolvedType.id,
      created_by_bde_id: bdeId,
      current_bde_id: bdeId,
      lead_status: 'New',
      follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
      remarks: remarks ? remarks.trim() : null,
      history: [
        {
          activity_type: 'note',
          notes: `EPC Lead created by BDE ${req.user.full_name} (${req.user.bde_id})`,
          actor_id: bdeId,
          actor_name: req.user.full_name,
          new_status: 'New',
        },
      ],
    });

    await BDEActivityLog.create({
      bde_id: bdeId,
      actor_type: 'bde',
      actor_id: bdeId,
      actor_name: req.user.full_name,
      action: 'EPC_LEAD_CREATED',
      notes: `Generated EPC Lead: ${leadId} (${company_name}) in ${district_name}, ${state_name}`,
    });

    await BDENotification.create({
      bde_id: bdeId,
      title: `EPC Lead Created: ${company_name} ⚡`,
      message: `EPC Lead ${leadId} (${contact_person}) registered in ${district_name}, ${state_name}. Next action: Follow-up / GST verification.`,
      type: 'epc_lead',
      link: '/epc-leads',
      action_label: 'View EPC Lead',
      entity_type: 'epc_lead',
      entity_id: newLead._id,
    }).catch(() => { });

    return res.status(201).json({
      status: 'success',
      message: `EPC Lead ${leadId} successfully created.`,
      data: newLead,
    });
  } catch (err) {
    console.error('[create_epc_lead Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to create EPC lead', error: err.message });
  }
};

/**
 * Bulk Create EPC Leads (100–200+ leads at once)
 * POST /epc-leads/bulk-create
 */
exports.bulk_create_epc_leads = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { leads = [], default_settings = {} } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No EPC leads provided for bulk creation.',
      });
    }

    if (leads.length > 500) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum 500 leads can be uploaded in a single batch.',
      });
    }

    // 1. Get BDE active territories
    const activeTerritories = await _getBdeTerritories(bdeId);
    const allowedStates = (activeTerritories && activeTerritories.length > 0)
      ? activeTerritories.map(t => (t.state_name || '').toLowerCase())
      : [];

    // Fallback defaults from territory if not provided in default_settings
    const defaultState = default_settings.state_name || activeTerritories?.[0]?.state_name || '';
    const defaultDistrict = default_settings.district_name || activeTerritories?.[0]?.district_names?.[0] || '';
    const defaultSource = default_settings.lead_source || 'direct_visit';
    const resolvedBulkType = await _resolveActiveEpcType(default_settings.epc_type, default_settings.epc_type_id);
    const defaultEpcType = resolvedBulkType.name;
    const defaultEpcTypeId = resolvedBulkType.id;
    const defaultProducts = Array.isArray(default_settings.interested_products) && default_settings.interested_products.length > 0
      ? default_settings.interested_products
      : ['Residential On-Grid'];
    const defaultFollowUp = default_settings.follow_up_date ? new Date(default_settings.follow_up_date) : null;
    const defaultRemarks = default_settings.remarks ? String(default_settings.remarks).trim() : null;

    // 2. Pre-extract identifiers to query existing DB duplicates in one batch
    const candidateMobiles = [];
    const candidateEmails = [];
    const candidateGsts = [];

    leads.forEach((l) => {
      const m = String(l.mobile_number || '').trim().replace(/\D/g, '');
      if (/^[6-9]\d{9}$/.test(m)) candidateMobiles.push(m);

      const e = String(l.email || '').trim().toLowerCase();
      if (/^\S+@\S+\.\S+$/.test(e)) candidateEmails.push(e);

      const g = l.gst_number ? String(l.gst_number).trim().toUpperCase() : null;
      if (g && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) candidateGsts.push(g);
    });

    const [existingLeads, existingAccounts] = await Promise.all([
      EPCLead.find({
        deleted_at: null,
        $or: [
          ...(candidateMobiles.length ? [{ mobile_number: { $in: candidateMobiles } }] : []),
          ...(candidateEmails.length ? [{ email: { $in: candidateEmails } }] : []),
          ...(candidateGsts.length ? [{ gst_number: { $in: candidateGsts } }] : []),
        ],
      })
        .select('mobile_number email gst_number company_name lead_id')
        .lean(),
      candidateGsts.length
        ? EpcAccount.find({ deleted_at: null, gstin: { $in: candidateGsts } }).select('gstin company_name').lean()
        : [],
    ]);

    const existingMobileMap = new Map();
    const existingEmailMap = new Map();
    const existingGstMap = new Map();

    existingLeads.forEach((el) => {
      if (el.mobile_number) existingMobileMap.set(el.mobile_number, el);
      if (el.email) existingEmailMap.set(el.email.toLowerCase(), el);
      if (el.gst_number) existingGstMap.set(el.gst_number.toUpperCase(), el);
    });

    const existingAccountGstMap = new Map();
    existingAccounts.forEach((ea) => {
      if (ea.gstin) existingAccountGstMap.set(ea.gstin.toUpperCase(), ea);
    });

    // 3. Sequential Lead ID generator setup
    const currentYear = new Date().getFullYear();
    const prefix = `EPC-LD-${currentYear}-`;
    const lastLead = await EPCLead.findOne({
      lead_id: { $regex: `^${prefix}` },
    })
      .sort({ lead_id: -1 })
      .lean();

    let nextNum = 1;
    if (lastLead && lastLead.lead_id) {
      const parts = lastLead.lead_id.split('-');
      if (parts.length === 4) {
        const parsed = parseInt(parts[3], 10);
        if (!isNaN(parsed)) {
          nextNum = parsed + 1;
        }
      }
    }

    // 4. Validate and build documents
    const seenBatchMobiles = new Set();
    const seenBatchEmails = new Set();
    const seenBatchGsts = new Set();

    const validDocs = [];
    const skipped = [];

    for (let i = 0; i < leads.length; i++) {
      const raw = leads[i] || {};
      const rowNum = i + 1;

      const company_name = String(raw.company_name || '').trim();
      const contact_person = String(raw.contact_person || company_name || '').trim();
      const cleanMobile = String(raw.mobile_number || '').trim().replace(/\D/g, '');
      const cleanEmail = String(raw.email || '').trim().toLowerCase();
      const state_name = String(raw.state_name || defaultState || '').trim();
      const district_name = String(raw.district_name || defaultDistrict || '').trim();
      const cleanGst = raw.gst_number ? String(raw.gst_number).trim().toUpperCase() : null;
      const cleanPincode = raw.pincode ? String(raw.pincode).trim().replace(/\D/g, '') : null;
      const address_line = raw.address_line ? String(raw.address_line).trim() : null;
      const lead_source = raw.lead_source || defaultSource;
      const epc_type = raw.epc_type ? String(raw.epc_type).trim() : defaultEpcType;
      const epc_type_id = raw.epc_type_id || defaultEpcTypeId;

      let interested_products = defaultProducts;
      if (Array.isArray(raw.interested_products) && raw.interested_products.length > 0) {
        interested_products = raw.interested_products;
      } else if (typeof raw.interested_products === 'string' && raw.interested_products.trim()) {
        interested_products = raw.interested_products.split(',').map(s => s.trim()).filter(Boolean);
      }

      const follow_up_date = raw.follow_up_date ? new Date(raw.follow_up_date) : defaultFollowUp;
      const remarks = raw.remarks ? String(raw.remarks).trim() : defaultRemarks;

      // Validation
      if (!company_name) {
        skipped.push({ row: rowNum, company_name: 'Unnamed', mobile_number: cleanMobile, reason: 'Company Name is required' });
        continue;
      }
      if (!contact_person) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: 'Contact Person is required' });
        continue;
      }
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile || 'Empty', reason: 'Invalid Indian 10-digit mobile number' });
        continue;
      }
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: 'Invalid or missing email address' });
        continue;
      }
      if (!state_name || !district_name) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: 'State and District are required' });
        continue;
      }
      if (allowedStates.length > 0 && !allowedStates.includes(state_name.toLowerCase())) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: `State "${state_name}" is outside BDE territory` });
        continue;
      }
      if (cleanGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: `Invalid GST format: "${cleanGst}"` });
        continue;
      }
      if (cleanPincode && !/^\d{6}$/.test(cleanPincode)) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: `Invalid 6-digit Pincode: "${cleanPincode}"` });
        continue;
      }

      // Check within uploaded batch duplicates
      if (seenBatchMobiles.has(cleanMobile)) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: 'Duplicate mobile number in this batch' });
        continue;
      }
      if (seenBatchEmails.has(cleanEmail)) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: 'Duplicate email in this batch' });
        continue;
      }
      if (cleanGst && seenBatchGsts.has(cleanGst)) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: 'Duplicate GST in this batch' });
        continue;
      }

      // Check database duplicates
      if (existingMobileMap.has(cleanMobile)) {
        const dup = existingMobileMap.get(cleanMobile);
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: `Mobile already exists (${dup.lead_id} - ${dup.company_name})` });
        continue;
      }
      if (existingEmailMap.has(cleanEmail)) {
        const dup = existingEmailMap.get(cleanEmail);
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: `Email already exists (${dup.lead_id} - ${dup.company_name})` });
        continue;
      }
      if (cleanGst && existingGstMap.has(cleanGst)) {
        const dup = existingGstMap.get(cleanGst);
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: `GSTIN already exists (${dup.lead_id} - ${dup.company_name})` });
        continue;
      }
      if (cleanGst && existingAccountGstMap.has(cleanGst)) {
        skipped.push({ row: rowNum, company_name, mobile_number: cleanMobile, reason: 'GSTIN already onboarded as an EPC account' });
        continue;
      }

      seenBatchMobiles.add(cleanMobile);
      seenBatchEmails.add(cleanEmail);
      if (cleanGst) seenBatchGsts.add(cleanGst);

      // Generate sequential Lead ID
      const generatedLeadId = `${prefix}${String(nextNum).padStart(4, '0')}`;
      nextNum++;

      validDocs.push({
        lead_id: generatedLeadId,
        company_name,
        contact_person,
        mobile_number: cleanMobile,
        email: cleanEmail,
        gst_number: cleanGst,
        gst_verified: false,
        state_name,
        district_name,
        pincode: cleanPincode,
        address_line,
        lead_source,
        interested_products,
        epc_type,
        epc_type_id,
        created_by_bde_id: bdeId,
        current_bde_id: bdeId,
        lead_status: 'New',
        follow_up_date: (follow_up_date && !isNaN(follow_up_date.getTime())) ? follow_up_date : null,
        remarks,
        history: [
          {
            activity_type: 'note',
            notes: `EPC Lead imported via Bulk Upload by BDE ${req.user.full_name || 'BDE'} (${req.user.bde_id || ''})`,
            actor_id: bdeId,
            actor_name: req.user.full_name || 'BDE',
            new_status: 'New',
          },
        ],
      });
    }

    if (validDocs.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid leads found to import. All entries were either duplicates or had validation errors.',
        data: {
          total_submitted: leads.length,
          created_count: 0,
          skipped_count: skipped.length,
          skipped_leads: skipped,
        },
      });
    }

    // 5. Bulk Insert into DB
    const insertedLeads = await EPCLead.insertMany(validDocs, { ordered: false });

    // 6. Log activity & notification
    await BDEActivityLog.create({
      bde_id: bdeId,
      actor_type: 'bde',
      actor_id: bdeId,
      actor_name: req.user.full_name,
      action: 'EPC_LEADS_BULK_UPLOADED',
      notes: `Bulk imported ${insertedLeads.length} EPC leads into territory (${skipped.length} skipped).`,
    }).catch(() => { });

    await BDENotification.create({
      bde_id: bdeId,
      title: `Bulk EPC Leads Imported (${insertedLeads.length}) ⚡`,
      message: `Successfully added ${insertedLeads.length} new EPC contractor leads into your pipeline.`,
      type: 'epc_lead',
      link: '/epc-leads',
      action_label: 'View EPC Leads',
    }).catch(() => { });

    return res.status(201).json({
      status: 'success',
      message: `Successfully imported ${insertedLeads.length} EPC leads. ${skipped.length > 0 ? `(${skipped.length} skipped)` : ''}`,
      data: {
        total_submitted: leads.length,
        created_count: insertedLeads.length,
        skipped_count: skipped.length,
        skipped_leads: skipped,
        created_leads: insertedLeads.map(l => ({
          _id: l._id,
          lead_id: l.lead_id,
          company_name: l.company_name,
          contact_person: l.contact_person,
          mobile_number: l.mobile_number,
          district_name: l.district_name,
          state_name: l.state_name,
        })),
      },
    });
  } catch (err) {
    console.error('[bulk_create_epc_leads Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to bulk create EPC leads', error: err.message });
  }
};

/**
 * Auto-syncs any EPC accounts (e.g. onboarded via GST Wizard or Reseller) into EPCLead records
 * so they appear seamlessly in the EPC Leads Pipeline.
 */
async function _syncOnboardedEpcAccountsToLeads(bdeId, territory) {
  // Disabled: Leads must only be created when explicitly created or onboarded by BDE.
  // Prevents resurrecting deleted or demo seed accounts into the live pipeline.
  return;
}

exports.list_epc_leads = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { search = '', status = '', district = '', state = '', franchisee = '', epc_type = '', page = 1, limit = 50 } = req.query;

    const territories = await _getBdeTerritories(bdeId);
    const territory = territories[0] || null;
    const stateName = territory?.state_name;
    const districtNames = territory?.district_names || [];

    // Strictly scoped to leads belonging to this BDE
    const baseQuery = {
      deleted_at: null,
      $or: [
        { current_bde_id: bdeId },
        { created_by_bde_id: bdeId },
      ],
    };

    if (search && search.trim()) {
      const s = search.trim();
      baseQuery.$and = [
        {
          $or: [
            { company_name: { $regex: s, $options: 'i' } },
            { contact_person: { $regex: s, $options: 'i' } },
            { mobile_number: { $regex: s, $options: 'i' } },
            { email: { $regex: s, $options: 'i' } },
            { gst_number: { $regex: s, $options: 'i' } },
            { lead_id: { $regex: s, $options: 'i' } },
          ],
        },
      ];
    }

    if (district && district !== 'all') {
      baseQuery.district_name = new RegExp(`^${district}$`, 'i');
    }
    if (state && state !== 'all') {
      baseQuery.state_name = new RegExp(`^${state}$`, 'i');
    }
    if (franchisee && franchisee !== 'all') {
      baseQuery.assigned_franchisee_id = franchisee;
    }
    if (epc_type && epc_type !== 'all') {
      baseQuery.epc_type = new RegExp(`^${epc_type}$`, 'i');
    }

    const query = { ...baseQuery };
    if (status && status !== 'all') {
      query.lead_status = status;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [leads, total, totalAll] = await Promise.all([
      EPCLead.find(query)
        .populate('assigned_franchisee_id', 'business_name reseller_code mobile')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      EPCLead.countDocuments(query),
      EPCLead.countDocuments(baseQuery),
    ]);

    // Counts per status stage (computed across baseQuery so tabs always show counts)
    const stages = [
      'New',
      'Contacted',
      'Interested',
      'Follow-up',
      'Onboarding Started',
      'GST Verification Pending',
      'Onboarded',
      'Assigned to Franchisee',
      'Not Interested',
      'Closed',
    ];

    const stageCounts = {};
    for (const st of stages) {
      stageCounts[st] = await EPCLead.countDocuments({ ...baseQuery, lead_status: st });
    }

    // EPC Type aggregation counts for BDE leads
    const typeAgg = await EPCLead.aggregate([
      { $match: { ...baseQuery, epc_type: { $ne: null } } },
      { $group: { _id: '$epc_type', count: { $sum: 1 } } }
    ]);
    const epcTypeCounts = {};
    typeAgg.forEach(t => { if (t._id) epcTypeCounts[t._id] = t.count; });

    return res.status(200).json({
      status: 'success',
      data: leads,
      stage_counts: stageCounts,
      epc_type_counts: epcTypeCounts,
      total_all_leads: totalAll,
      pagination: {
        total: totalAll,
        filtered_total: total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
      territories: territories.map(t => ({
        id: t._id,
        state_id: t.state_id,
        state_name: t.state_name,
        district_names: t.district_names || [],
        priority: t.priority,
      })),
      territory: {
        state_name: stateName,
        district_names: districtNames,
      },
    });
  } catch (err) {
    console.error('[list_epc_leads Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to list EPC leads', error: err.message });
  }
};

exports.get_epc_lead_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await EPCLead.findOne({ _id: id, deleted_at: null })
      .populate('assigned_franchisee_id')
      .populate('created_by_bde_id', 'full_name bde_id email')
      .populate('onboarded_epc_account_id')
      .lean();

    if (!lead) return res.status(404).json({ status: 'error', message: 'EPC lead not found' });
    return res.status(200).json({ status: 'success', data: lead });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch lead detail', error: err.message });
  }
};

exports.update_epc_lead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData.lead_id; // immutable
    delete updateData.created_by_bde_id;

    if (updateData.mobile_number !== undefined) {
      const cleanMobile = String(updateData.mobile_number || '').trim().replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
        });
      }
      updateData.mobile_number = cleanMobile;
    }

    if (updateData.email !== undefined) {
      const cleanEmail = String(updateData.email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please enter a valid email address.',
        });
      }
      updateData.email = cleanEmail;
    }

    if (updateData.pincode !== undefined && updateData.pincode) {
      const cleanPincode = String(updateData.pincode).trim().replace(/\D/g, '');
      if (!/^\d{6}$/.test(cleanPincode)) {
        return res.status(400).json({
          status: 'error',
          message: 'Pincode must be a valid 6-digit number.',
        });
      }
      updateData.pincode = cleanPincode;
    }

    if (updateData.gst_number !== undefined && updateData.gst_number) {
      const cleanGst = String(updateData.gst_number).trim().toUpperCase();
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid GSTIN format. Expected 15 characters (e.g. 27ABCDE1234F1Z5).',
        });
      }
      updateData.gst_number = cleanGst;
    }

    if (updateData.state_name) {
      const activeTerritories = await _getBdeTerritories(req.user.id);
      if (activeTerritories && activeTerritories.length > 0) {
        const allowedStates = activeTerritories.map(t => t.state_name.toLowerCase());
        if (!allowedStates.includes(updateData.state_name.trim().toLowerCase())) {
          return res.status(400).json({
            status: 'error',
            message: `State "${updateData.state_name}" is outside your assigned territories (${activeTerritories.map(t => t.state_name).join(', ')}).`,
          });
        }
      }
    }

    const lead = await EPCLead.findOneAndUpdate({ _id: id, deleted_at: null }, { $set: updateData }, { new: true });
    if (!lead) return res.status(404).json({ status: 'error', message: 'EPC lead not found' });

    return res.status(200).json({ status: 'success', message: 'Lead updated successfully', data: lead });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update EPC lead', error: err.message });
  }
};

exports.schedule_epc_follow_up = async (req, res) => {
  try {
    const { id } = req.params;
    const { follow_up_date, notes } = req.body;

    if (!follow_up_date) {
      return res.status(400).json({ status: 'error', message: 'follow_up_date is required' });
    }

    const lead = await EPCLead.findOne({ _id: id, deleted_at: null });
    if (!lead) return res.status(404).json({ status: 'error', message: 'EPC lead not found' });

    const prevStatus = lead.lead_status;
    lead.follow_up_date = new Date(follow_up_date);
    if (lead.lead_status === 'New' || lead.lead_status === 'Contacted') {
      lead.lead_status = 'Follow-up';
    }

    lead.history.push({
      activity_type: 'follow_up',
      notes: notes || `Follow-up scheduled for ${new Date(follow_up_date).toLocaleDateString()}`,
      actor_id: req.user.id,
      actor_name: req.user.full_name,
      previous_status: prevStatus,
      new_status: lead.lead_status,
    });

    await lead.save();

    await BDENotification.create({
      bde_id: req.user.id,
      title: `Follow-up Scheduled: ${lead.company_name} 📅`,
      message: `Follow-up confirmed for ${new Date(follow_up_date).toLocaleDateString('en-IN')}${notes ? `: ${notes}` : ''}. Click to open lead.`,
      type: 'follow_up',
      link: '/epc-leads',
      action_label: 'View EPC Follow-up',
      entity_type: 'epc_lead',
      entity_id: lead._id,
    }).catch(() => { });

    return res.status(200).json({
      status: 'success',
      message: 'Follow-up scheduled successfully',
      data: lead,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to schedule follow-up', error: err.message });
  }
};

exports.update_epc_lead_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStages = [
      'New',
      'Contacted',
      'Interested',
      'Follow-up',
      'Onboarding Started',
      'GST Verification Pending',
      'Onboarded',
      'Assigned to Franchisee',
      'Not Interested',
      'Closed',
    ];

    if (!status || !validStages.includes(status)) {
      return res.status(400).json({ status: 'error', message: `Invalid status. Must be one of: ${validStages.join(', ')}` });
    }

    const lead = await EPCLead.findOne({ _id: id, deleted_at: null });
    if (!lead) return res.status(404).json({ status: 'error', message: 'EPC lead not found' });

    const prevStatus = lead.lead_status;
    lead.lead_status = status;

    lead.history.push({
      activity_type: 'status_change',
      notes: notes || `Status transitioned from "${prevStatus}" to "${status}"`,
      actor_id: req.user.id,
      actor_name: req.user.full_name,
      previous_status: prevStatus,
      new_status: status,
    });

    await lead.save();

    await BDENotification.create({
      bde_id: req.user.id,
      title: `EPC Lead Status: ${lead.company_name} ⚡`,
      message: `Status transitioned to "${status}"${notes ? ` (${notes})` : ''}. Click to open pipeline.`,
      type: 'epc_lead',
      link: '/epc-leads',
      action_label: 'View Pipeline',
      entity_type: 'epc_lead',
      entity_id: lead._id,
    }).catch(() => { });

    return res.status(200).json({
      status: 'success',
      message: `Lead status updated to ${status}`,
      data: lead,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update lead status', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. GST VERIFICATION & EPC ONBOARDING JOURNEY
// ─────────────────────────────────────────────────────────────────────────────
async function _findDistrictFranchisee(districtName, stateName) {
  if (!districtName) return null;
  const cleanDistrict = districtName.trim();
  const districtRegex = new RegExp(`^${cleanDistrict}$`, 'i');

  try {
    // 1. Try finding district in Geolocation DB
    const geoDistrict = await GeoLevel2.findOne({
      name: districtRegex,
      deleted_at: null,
    }).lean();

    let matchedReseller = null;

    // 2. Check active ResellerTerritory for this district_id
    if (geoDistrict) {
      const activeTerritory = await ResellerTerritory.findOne({
        district_id: geoDistrict._id,
        status: 'active',
        deleted_at: null,
      })
        .populate({
          path: 'reseller_id',
          select: 'business_name reseller_code contact_person mobile email is_operational activation_status address gst_number',
        })
        .lean();

      if (activeTerritory?.reseller_id && !activeTerritory.reseller_id.deleted_at) {
        matchedReseller = activeTerritory.reseller_id;
      }
    }

    // 3. Fallback: Check Reseller direct address (district_id, city, district_name) or business_name
    if (!matchedReseller) {
      const fallbackQuery = {
        deleted_at: null,
        $or: [
          ...(geoDistrict ? [{ 'address.district_id': geoDistrict._id }] : []),
          { 'address.city': districtRegex },
          { 'address.district_name': districtRegex },
          { business_name: new RegExp(cleanDistrict, 'i') },
        ],
      };

      const candidates = await Reseller.find(fallbackQuery)
        .select('business_name reseller_code contact_person mobile email is_operational activation_status address gst_number')
        .lean();

      if (candidates && candidates.length > 0) {
        // Prioritize operational ones first, then active
        candidates.sort((a, b) => {
          if (a.is_operational && !b.is_operational) return -1;
          if (!a.is_operational && b.is_operational) return 1;
          if (a.activation_status === 'active' && b.activation_status !== 'active') return -1;
          return 0;
        });
        matchedReseller = candidates[0];
      }
    }

    if (!matchedReseller) return null;

    return {
      id: matchedReseller._id,
      reseller_code: matchedReseller.reseller_code,
      business_name: matchedReseller.business_name,
      contact_person: matchedReseller.contact_person,
      email: matchedReseller.email,
      mobile: matchedReseller.mobile,
      gst_number: matchedReseller.gst_number,
      district: cleanDistrict,
      is_operational: Boolean(matchedReseller.is_operational),
      activation_status: matchedReseller.activation_status,
    };
  } catch (err) {
    console.error('[_findDistrictFranchisee error]', err);
    return null;
  }
}

exports.verify_epc_gstin = async (req, res) => {
  try {
    const bdeId = req.user?.id || req.user?._id;
    const { gstin, lead_id } = req.body;

    if (!gstin) return res.status(400).json({ status: 'error', message: 'gstin is required' });

    const cleanGst = gstin.trim().toUpperCase();
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(cleanGst)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid GSTIN format. Must be a 15-character alphanumeric GST number (e.g. 27ABCDE1234F1Z5).',
      });
    }

    // 1. Strict Duplicate Check across existing EpcAccounts
    const existingAccount = await EpcAccount.findOne({
      gstin: cleanGst,
      deleted_at: null,
    })
      .populate('onboarded_by_reseller_id', 'business_name reseller_code')
      .lean();

    if (existingAccount) {
      return res.status(409).json({
        status: 'error',
        message: `An EPC with GST number ${cleanGst} is already registered under "${existingAccount.name}" (Account: ${existingAccount.email}).`,
        existing_account: {
          id: existingAccount._id,
          name: existingAccount.name,
          email: existingAccount.email,
          franchisee: existingAccount.onboarded_by_reseller_id?.business_name || null,
        },
      });
    }

    // 2. Identify State from first 2 digits
    const stateCode = cleanGst.substring(0, 2);
    const resolvedStateName = GST_STATE_CODE_MAP[stateCode] || 'Unknown State';

    // 3. Call GST Verification Engine (Quick eKYC)
    const verification = await performGstVerification({
      gstin: cleanGst,
      entity_type: 'epc_buyer',
      verified_by: req.user.bde_id || String(bdeId),
      options: { provider: process.env.QUICKEKYC_PROVIDER || process.env.GST_VERIFY_PROVIDER || 'quickekyc' },
    });

    if (!verification.is_valid) {
      return res.status(400).json({
        status: 'error',
        message: `GST verification failed: ${verification.error_message}`,
        data: verification,
      });
    }

    const companyName = verification.company_name || verification.trade_name || verification.legal_name || '';
    const stateName = verification.state_name || resolvedStateName || 'Gujarat';
    const districtName = verification.district_name || verification.district || 'Ahmedabad';
    const address = verification.address || '';
    const pincode = verification.pincode || '';

    // 4. Auto-detect district franchise match
    const matchedFranchisee = await _findDistrictFranchisee(districtName, stateName);

    // If lead_id provided, update lead
    if (lead_id) {
      const lead = await EPCLead.findById(lead_id);
      if (lead) {
        lead.gst_number = cleanGst;
        lead.gst_verified = true;
        lead.gst_legal_name = verification.legal_name || null;
        lead.gst_trade_name = verification.trade_name || null;
        lead.lead_status = 'GST Verification Pending';
        lead.history.push({
          activity_type: 'gst_verification',
          notes: `GST ${cleanGst} verified successfully via Quick eKYC. Legal Name: ${companyName}`,
          actor_id: bdeId,
          actor_name: req.user.full_name,
        });
        await lead.save();
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `GST ${cleanGst} successfully verified via Quick eKYC.`,
      data: {
        gstin: cleanGst,
        is_valid: true,
        provider: verification.provider || 'quickekyc',
        legal_name: verification.legal_name,
        trade_name: verification.trade_name,
        company_name: companyName,
        state_code: stateCode,
        state_name: stateName,
        district_name: districtName,
        address: address,
        pincode: pincode,
        registration_status: verification.business_status || verification.gstin_status || 'Active',
        matched_franchisee: matchedFranchisee || null,
        has_franchisee_in_district: Boolean(matchedFranchisee),
      },
    });
  } catch (err) {
    console.error('[verify_epc_gstin Error]', err);
    return res.status(500).json({ status: 'error', message: 'GST verification encountered an error', error: err.message });
  }
};

exports.onboard_epc_with_gst = async (req, res) => {
  try {
    const bdeId = req.user?.id || req.user?._id;
    if (bdeId) {
      const bdeProfile = await BDEProfile.findById(bdeId).select('can_onboard_epc').lean();
      if (bdeProfile && bdeProfile.can_onboard_epc === false) {
        return res.status(403).json({
          status: 'error',
          message: 'EPC onboarding is disabled for your BDE account by Administrator.',
        });
      }
    }
    const {
      lead_id,
      gstin,
      company_name,
      trade_name,
      legal_name,
      contact_person,
      mobile,
      phone,
      email,
      password,
      state_name,
      district_name,
      address,
      pincode,
      reseller_id,
      epc_type,
      epc_type_id,
    } = req.body;

    const epcCompanyName = company_name || trade_name || legal_name;
    const epcMobile = mobile || phone;
    if (!epcCompanyName || !email || !contact_person || !epcMobile) {
      return res.status(400).json({ status: 'error', message: 'Company name, contact person, mobile, and email are required' });
    }

    const cleanGst = gstin ? gstin.trim().toUpperCase() : null;
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = epcMobile.trim();
    const cleanName = epcCompanyName.trim();

    // Duplicate Check
    if (cleanGst) {
      const existing = await EpcAccount.findOne({ gstin: cleanGst, deleted_at: null }).lean();
      if (existing) {
        return res.status(409).json({ status: 'error', message: `An EPC account with GSTIN ${cleanGst} already exists.` });
      }
    }

    const gstPrefix = cleanGst ? cleanGst.substring(0, 2) : null;
    const gstStateName = gstPrefix ? GST_STATE_CODE_MAP[gstPrefix] : null;
    const territory = await _getBdeTerritoryScope(bdeId);
    const resolvedState = state_name || gstStateName || territory?.state_name || 'Gujarat';

    // Geolocation matching
    const geoState = await GeoLevel1.findOne({ name: new RegExp(`^${resolvedState.trim()}$`, 'i') }).lean();
    let geoDistrict = null;

    if (geoState) {
      if (district_name && district_name.trim()) {
        geoDistrict = await GeoLevel2.findOne({
          level_1: geoState._id,
          name: new RegExp(`^${district_name.trim()}$`, 'i'),
        }).lean();
      }

      // If district wasn't found or if address has a matching district in this state
      if ((!geoDistrict || geoDistrict.name === 'Ahmedabad') && address) {
        const districtsInState = await GeoLevel2.find({ level_1: geoState._id, is_active: true }).lean();
        const combinedText = (address + ' ' + (district_name || '')).toLowerCase();
        const sorted = [...districtsInState].sort((a, b) => b.name.length - a.name.length);
        for (const d of sorted) {
          const dName = d.name.trim().toLowerCase();
          const reg = new RegExp(`(\\b|,|\\s)${dName}(\\b|,|\\s)`, 'i');
          if (reg.test(combinedText) || combinedText.includes(dName)) {
            geoDistrict = d;
            break;
          }
        }
      }

      if (!geoDistrict) {
        geoDistrict = await GeoLevel2.findOne({
          level_1: geoState._id,
          name: new RegExp(`^${(district_name || (territory?.district_names && territory.district_names[0]) || 'Ahmedabad').trim()}$`, 'i'),
        }).lean();
      }
    }

    const finalStateName = geoState ? geoState.name : resolvedState;
    const finalDistrictName = geoDistrict ? geoDistrict.name : (district_name || 'Ahmedabad');

    // Only assign franchisee if explicitly passed or requested; otherwise direct Solar Store EPC onboarding
    let targetFranchisee = null;
    if (reseller_id) {
      targetFranchisee = await Reseller.findById(reseller_id)
        .select('business_name reseller_code contact_person mobile email is_operational activation_status address gst_number')
        .lean();
    } else if (req.body.auto_assign_franchisee === true) {
      targetFranchisee = await _findDistrictFranchisee(finalDistrictName, finalStateName);
    }

    // 1. Create or Find EpcCompany in Core DB
    let epcCompany = await EpcCompany.findOne({ email: cleanEmail, deleted_at: null });
    if (!epcCompany) {
      epcCompany = await EpcCompany.create({
        name: cleanName,
        email: cleanEmail,
        source: 'verified',
        working_states: geoState ? [geoState._id] : (territory?.state_id ? [territory.state_id] : []),
      });
    }

    // 2. Hash Password for EPC Account
    const initialPassword = password && password.trim() ? password.trim() : 'SolarEPC@2026';
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const isDirectStoreEpc = !targetFranchisee;
    const assignedResellerId = targetFranchisee ? (targetFranchisee.id || targetFranchisee._id) : null;
    const assignedResellerName = targetFranchisee ? targetFranchisee.business_name : null;

    // 3. Create EpcAccount with 'approved' status for instant Direct Solar Store access
    const resolvedEpcTypeDoc = await _resolveActiveEpcType(epc_type, epc_type_id);

    const epcAccount = await EpcAccount.create({
      name: cleanName,
      contact_person: contact_person.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      whatsapp: cleanMobile,
      company_id: epcCompany._id,
      company_name: cleanName,
      gstin: cleanGst,
      password_hash: passwordHash,
      states: geoState ? [geoState._id] : (territory?.state_id ? [territory.state_id] : []),
      districts: geoDistrict ? [geoDistrict._id] : [],
      state_name: finalStateName,
      district_name: finalDistrictName,
      address: address ? address.trim() : null,
      pincode: pincode ? pincode.trim() : null,
      status: 'approved', // Active Direct Solar Store access
      epc_type: resolvedEpcTypeDoc.name,
      epc_type_id: resolvedEpcTypeDoc.id,
      is_email_verified: true,
      onboarding_source: 'bde',
      onboarded_by_bde_id: bdeId,
      primary_reseller_id: assignedResellerId,
      onboarded_by_reseller_id: assignedResellerId,
    });

    // 3b. Create EpcAccountLocation for reliable primary location resolution
    if (geoState && geoDistrict) {
      await EpcAccountLocation.findOneAndUpdate(
        { account_id: epcAccount._id, is_primary: true },
        {
          account_id: epcAccount._id,
          state_id: geoState._id,
          district_id: geoDistrict._id,
          is_primary: true,
          deleted_at: null,
        },
        { upsert: true, new: true }
      );
    }

    // 4. Create EpcSignupRequest recorded as approved
    const signupRequest = await EpcSignupRequest.create({
      account_id: epcAccount._id,
      company_name: cleanName,
      email: cleanEmail,
      whatsapp: cleanMobile,
      status: 'approved',
      epc_type: resolvedEpcTypeDoc.name,
      epc_type_id: resolvedEpcTypeDoc.id,
      state_id: geoState?._id || territory?.state_id || null,
      district_id: geoDistrict?._id || null,
      state_name: finalStateName,
      district_name: finalDistrictName,
      gstin: cleanGst,
      onboarding_source: 'bde',
      onboarded_by_bde_id: bdeId,
      bde_name: req.user.full_name || 'BDE Representative',
      assigned_reseller_id: assignedResellerId,
      assigned_reseller_name: assignedResellerName,
      is_direct_store_epc: isDirectStoreEpc,
      auto_assigned: Boolean(assignedResellerId),
    });

    // 5. Update or Create EPCLead
    let linkedLead = null;
    if (lead_id) {
      linkedLead = await EPCLead.findById(lead_id);
    }
    if (!linkedLead && cleanGst) {
      linkedLead = await EPCLead.findOne({ gst_number: cleanGst, deleted_at: null });
    }
    if (!linkedLead && (cleanEmail || cleanMobile)) {
      linkedLead = await EPCLead.findOne({
        deleted_at: null,
        $or: [
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ...(cleanMobile ? [{ mobile_number: cleanMobile }] : []),
        ],
      });
    }

    const finalLeadStatus = assignedResellerId ? 'Assigned to Franchisee' : 'Onboarded';

    if (linkedLead) {
      await EPCLead.findByIdAndUpdate(linkedLead._id, {
        company_name: cleanName,
        contact_person: contact_person ? contact_person.trim() : linkedLead.contact_person,
        mobile_number: cleanMobile,
        email: cleanEmail,
        gst_number: cleanGst,
        gst_verified: true,
        state_name: finalStateName,
        district_name: finalDistrictName,
        pincode: pincode ? pincode.trim() : linkedLead.pincode,
        address_line: address ? address.trim() : linkedLead.address_line,
        lead_status: finalLeadStatus,
        epc_type: resolvedEpcTypeDoc.name || linkedLead.epc_type,
        epc_type_id: resolvedEpcTypeDoc.id || linkedLead.epc_type_id || null,
        onboarded_at: new Date(),
        onboarded_epc_account_id: epcAccount._id,
        onboarded_epc_company_id: epcCompany._id,
        assigned_franchisee_id: assignedResellerId,
        assigned_franchisee_name: assignedResellerName,
        $push: {
          history: {
            activity_type: 'status_change',
            notes: `EPC Onboarded via GST Wizard by BDE ${req.user.full_name || 'BDE'}${assignedResellerName ? ` (Auto-assigned to Franchisee ${assignedResellerName})` : ''}`,
            actor_id: bdeId,
            actor_name: req.user.full_name || 'BDE Representative',
            new_status: finalLeadStatus,
          },
        },
      });
    } else {
      const newLeadId = await _generateNextEpcLeadId();
      await EPCLead.create({
        lead_id: newLeadId,
        company_name: cleanName,
        contact_person: contact_person ? contact_person.trim() : cleanName,
        mobile_number: cleanMobile,
        email: cleanEmail,
        gst_number: cleanGst,
        gst_verified: true,
        state_name: finalStateName,
        district_name: finalDistrictName,
        pincode: pincode ? pincode.trim() : null,
        address_line: address ? address.trim() : null,
        lead_source: 'portal',
        interested_products: ['Residential On-Grid'],
        created_by_bde_id: bdeId,
        current_bde_id: bdeId,
        lead_status: finalLeadStatus,
        epc_type: resolvedEpcTypeDoc.name || linkedLead.epc_type,
        epc_type_id: resolvedEpcTypeDoc.id || linkedLead.epc_type_id || null,
        onboarded_at: new Date(),
        onboarded_epc_account_id: epcAccount._id,
        onboarded_epc_company_id: epcCompany._id,
        assigned_franchisee_id: assignedResellerId,
        assigned_franchisee_name: assignedResellerName,
        history: [
          {
            activity_type: 'status_change',
            notes: `EPC Onboarded via GST Wizard by BDE ${req.user.full_name || 'BDE'}${assignedResellerName ? ` (Auto-assigned to Franchisee ${assignedResellerName})` : ''}`,
            actor_id: bdeId,
            actor_name: req.user.full_name || 'BDE Representative',
            new_status: finalLeadStatus,
          },
        ],
      });
    }

    // 6. Log Activity
    await BDEActivityLog.create({
      bde_id: bdeId,
      actor_type: 'bde',
      actor_id: bdeId,
      actor_name: req.user.full_name,
      action: 'EPC_ONBOARDED',
      notes: assignedResellerId
        ? `Onboarded EPC "${cleanName}" (${cleanGst || 'No GST'}). Assigned to Franchisee "${assignedResellerName}" (${finalDistrictName}).`
        : `Onboarded EPC "${cleanName}" (${cleanGst || 'No GST'}). Activated with Direct Solar Store Access (${finalDistrictName}).`,
    });

    return res.status(201).json({
      status: 'success',
      message: assignedResellerId
        ? `EPC "${cleanName}" successfully onboarded and assigned to Franchise Partner "${assignedResellerName}".`
        : `EPC "${cleanName}" successfully onboarded with Direct Solar Store access!`,
      data: {
        epc_id: epcAccount._id,
        epc_account_id: epcAccount._id,
        request_id: signupRequest._id,
        signup_request_id: signupRequest._id,
        company_id: epcCompany._id,
        name: epcAccount.name,
        email: epcAccount.email,
        gstin: epcAccount.gstin,
        state_name: finalStateName,
        district_name: finalDistrictName,
        assigned_reseller_name: assignedResellerName,
        assigned_reseller_id: assignedResellerId,
        matched_franchisee: targetFranchisee ? {
          id: assignedResellerId,
          reseller_code: targetFranchisee.reseller_code,
          business_name: assignedResellerName,
          contact_person: targetFranchisee.contact_person,
          mobile: targetFranchisee.mobile,
          is_operational: targetFranchisee.is_operational,
        } : null,
        is_direct_store_epc: isDirectStoreEpc,
        store_access: true,
        status: 'approved',
      },
    });
  } catch (err) {
    console.error('[onboard_epc_with_gst Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to onboard EPC', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. DISTRICT-MATCHED FRANCHISEE ASSIGNMENT & NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────
exports.get_eligible_franchisees_for_epc = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { district_name, state_name, search = '' } = req.query;

    const territory = await _getBdeTerritoryScope(bdeId);
    const resolvedState = state_name || territory?.state_name;

    const matchQuery = { deleted_at: null };
    if (resolvedState) {
      matchQuery.$or = [{ 'address.state_name': new RegExp(`^${resolvedState}$`, 'i') }, { bde_id: bdeId }];
    }

    if (search && search.trim()) {
      const s = search.trim();
      matchQuery.$and = [
        {
          $or: [
            { business_name: { $regex: s, $options: 'i' } },
            { reseller_code: { $regex: s, $options: 'i' } },
            { contact_person: { $regex: s, $options: 'i' } },
          ],
        },
      ];
    }

    const franchisees = await Reseller.find(matchQuery)
      .select('business_name email mobile reseller_code contact_person is_operational activation_status agreement_status address gst_number')
      .lean();

    const fIds = franchisees.map((f) => f._id);
    const activeAssignments = await EpcResellerRelationship.find({
      reseller_id: { $in: fIds },
      status: 'active',
    }).lean();

    const countMap = {};
    activeAssignments.forEach((a) => {
      const key = a.reseller_id.toString();
      countMap[key] = (countMap[key] || 0) + 1;
    });

    const data = franchisees.map((f) => {
      const isDistrictMatch =
        district_name && f.address?.district_name
          ? f.address.district_name.toLowerCase().trim() === district_name.toLowerCase().trim()
          : false;

      return {
        id: f._id,
        reseller_code: f.reseller_code,
        business_name: f.business_name,
        contact_person: f.contact_person,
        email: f.email,
        mobile: f.mobile,
        gst_number: f.gst_number,
        is_operational: f.is_operational,
        activation_status: f.activation_status,
        district: f.address?.district_name || 'Regional',
        state: f.address?.state_name || resolvedState,
        is_district_match: isDistrictMatch,
        assigned_epc_count: countMap[f._id.toString()] || 0,
      };
    });

    // Sort: District matches first, then operational, then by least load
    data.sort((a, b) => {
      if (a.is_district_match && !b.is_district_match) return -1;
      if (!a.is_district_match && b.is_district_match) return 1;
      if (a.is_operational && !b.is_operational) return -1;
      if (!a.is_operational && b.is_operational) return 1;
      return a.assigned_epc_count - b.assigned_epc_count;
    });

    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch eligible franchisees', error: err.message });
  }
};

exports.assign_epc_to_franchisee = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { epc_account_id, reseller_id, lead_id, remarks } = req.body;

    let targetEpcAccountId = epc_account_id;
    let targetLead = null;

    if (lead_id) {
      targetLead = await EPCLead.findById(lead_id);
      if (!targetEpcAccountId && targetLead?.onboarded_epc_account_id) {
        targetEpcAccountId = targetLead.onboarded_epc_account_id;
      }
    }

    if (!targetEpcAccountId && targetLead && (targetLead.gst_number || targetLead.email)) {
      const match = await EpcAccount.findOne({
        deleted_at: null,
        $or: [
          ...(targetLead.gst_number ? [{ gstin: targetLead.gst_number }] : []),
          ...(targetLead.email ? [{ email: targetLead.email.toLowerCase() }] : []),
        ],
      });
      if (match) {
        targetEpcAccountId = match._id;
        targetLead.onboarded_epc_account_id = match._id;
        await targetLead.save();
      }
    }

    if (!targetEpcAccountId || !reseller_id) {
      return res.status(400).json({ status: 'error', message: 'epc_account_id and reseller_id are required' });
    }

    const [epcAccount, reseller] = await Promise.all([
      EpcAccount.findById(targetEpcAccountId),
      Reseller.findById(reseller_id),
    ]);

    if (!epcAccount) return res.status(404).json({ status: 'error', message: 'EPC account not found' });
    if (!reseller) return res.status(404).json({ status: 'error', message: 'Franchisee partner not found' });

    // Revoke any existing active relationship
    const existing = await EpcResellerRelationship.findOne({ epc_id: targetEpcAccountId, status: 'active' });
    if (existing) {
      existing.status = 'revoked';
      existing.effective_to = new Date();
      existing.transfer_reason = `Reassigned by BDE ${req.user.bde_id}`;
      await existing.save();
    }

    // Create new active relationship
    const newRel = await EpcResellerRelationship.create({
      epc_id: targetEpcAccountId,
      reseller_id: reseller._id,
      effective_from: new Date(),
      status: 'active',
      assigned_by_bde_id: bdeId,
      assigned_by_bde_name: req.user.full_name,
    });

    // Update EPC Account
    epcAccount.primary_reseller_id = reseller._id;
    epcAccount.onboarded_by_reseller_id = reseller._id;
    epcAccount.reseller_assigned_date = new Date();
    await epcAccount.save();

    // Update EPC Lead if present
    if (lead_id) {
      await EPCLead.findByIdAndUpdate(lead_id, {
        assigned_franchisee_id: reseller._id,
        assigned_franchisee_name: reseller.business_name,
        franchisee_assigned_at: new Date(),
        lead_status: 'Assigned to Franchisee',
      });
    }

    // Trigger In-App Alert / Notification for Franchisee
    const idempotencyKey = `ALERT-NEW_EPC_ASSIGNED-${reseller._id}-${epcAccount._id}-${Date.now()}`;
    await FranchiseeAlert.create({
      alert_type: 'GOAL_ACHIEVED', // or system notification
      franchisee_id: reseller._id,
      status: 'SENT',
      notified_via: ['inapp'],
      idempotency_key: idempotencyKey,
    }).catch(() => { }); // non-blocking

    // Log BDE activity
    await BDEActivityLog.create({
      bde_id: bdeId,
      actor_type: 'bde',
      actor_id: bdeId,
      actor_name: req.user.full_name,
      action: 'EPC_PARTNER_ASSIGNED',
      notes: `Assigned EPC "${epcAccount.name}" (GST: ${epcAccount.gstin || 'N/A'}) to Franchisee "${reseller.business_name}" (${reseller.reseller_code})`,
    });

    await BDENotification.create({
      bde_id: bdeId,
      title: `EPC Contractor Assigned to Franchisee 🤝`,
      message: `Contractor "${epcAccount.name || epcAccount.company_name}" assigned to partner "${reseller.business_name}".`,
      type: 'epc_lead',
      link: '/epc-leads',
      action_label: 'View EPC Pipeline',
      entity_type: 'epc_account',
      entity_id: epcAccount._id,
    }).catch(() => { });

    return res.status(200).json({
      status: 'success',
      message: `EPC "${epcAccount.name}" successfully assigned to Franchisee "${reseller.business_name}"!`,
      data: {
        relationship_id: newRel._id,
        epc_account_id: epcAccount._id,
        epc_name: epcAccount.name,
        reseller_id: reseller._id,
        reseller_name: reseller.business_name,
        reseller_code: reseller.reseller_code,
        assigned_at: newRel.effective_from,
      },
    });
  } catch (err) {
    console.error('[assign_epc_to_franchisee Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to assign EPC to franchisee', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. FRANCHISEE GOAL VS ACHIEVEMENT & PERFORMANCE TRACKING
// ─────────────────────────────────────────────────────────────────────────────
exports.get_my_franchisees = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const territory = await _getBdeTerritoryScope(bdeId);
    const stateName = territory?.state_name;

    const query = {
      deleted_at: null,
      $or: [{ bde_id: bdeId }, { original_bde_id: bdeId }],
    };
    if (stateName) {
      query.$or.push({ 'address.state_name': new RegExp(`^${stateName}$`, 'i') });
    }

    const franchisees = await Reseller.find(query).sort({ created_at: -1 }).lean();
    return res.status(200).json({ status: 'success', data: franchisees });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch franchisees', error: err.message });
  }
};

exports.get_franchisee_performance = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), search = '', tier = '' } = req.query;

    const territory = await _getBdeTerritoryScope(bdeId);
    const stateName = territory?.state_name;

    const query = { deleted_at: null };
    if (stateName) {
      query.$or = [{ bde_id: bdeId }, { 'address.state_name': new RegExp(`^${stateName}$`, 'i') }];
    } else {
      query.bde_id = bdeId;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$and = [
        {
          $or: [
            { business_name: { $regex: s, $options: 'i' } },
            { reseller_code: { $regex: s, $options: 'i' } },
            { contact_person: { $regex: s, $options: 'i' } },
          ],
        },
      ];
    }

    const franchisees = await Reseller.find(query).lean();

    const currMonth = Number(month);
    const currYear = Number(year);
    const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
    const prevYear = currMonth === 1 ? currYear - 1 : currYear;

    const results = await Promise.all(
      franchisees.map(async (f) => {
        // 1. Kit Target & Goals resolved via priority cascade (FRANCHISEE -> DISTRICT -> STATE -> PLAN -> GLOBAL)
        const targetRecord = await resolveEffectiveTarget({
          franchisee_id: f._id,
          month: currMonth,
          year: currYear,
        });

        const monthlyGoal = targetRecord?.target_quantity || (f.is_operational ? 10 : 5);

        // 2. Orders this month
        const startCurr = new Date(currYear, currMonth - 1, 1);
        const endCurr = new Date(currYear, currMonth, 0, 23, 59, 59);

        const currOrders = await FpoOrder.find({
          reseller_id: f._id,
          createdAt: { $gte: startCurr, $lte: endCurr },
          status: { $nin: ['CANCELLED', 'EXPIRED'] },
        }).lean();

        let actualKitsOrdered = 0;
        let totalOrderValue = 0;
        currOrders.forEach((o) => {
          totalOrderValue += (o.total_paise || 0) / 100;
          (o.items || []).forEach((it) => {
            actualKitsOrdered += Number(it.quantity || 0);
          });
        });

        // 3. Orders previous month
        const startPrev = new Date(prevYear, prevMonth - 1, 1);
        const endPrev = new Date(prevYear, prevMonth, 0, 23, 59, 59);

        const prevOrders = await FpoOrder.find({
          reseller_id: f._id,
          createdAt: { $gte: startPrev, $lte: endPrev },
          status: { $nin: ['CANCELLED', 'EXPIRED'] },
        }).lean();

        let prevKitsOrdered = 0;
        prevOrders.forEach((o) => {
          (o.items || []).forEach((it) => {
            prevKitsOrdered += Number(it.quantity || 0);
          });
        });

        // 4. Calculations
        const remainingGoal = Math.max(0, monthlyGoal - actualKitsOrdered);
        const achievementPct = monthlyGoal > 0 ? Math.round((actualKitsOrdered / monthlyGoal) * 100) : 0;
        const trend =
          prevKitsOrdered > 0
            ? Math.round(((actualKitsOrdered - prevKitsOrdered) / prevKitsOrdered) * 100)
            : actualKitsOrdered > 0
              ? 100
              : 0;

        // 5. Performance Status Tiering
        let performanceStatus = 'No Activity';
        let statusColor = 'slate';

        if (achievementPct > 100) {
          performanceStatus = 'Above Target';
          statusColor = 'purple';
        } else if (achievementPct === 100) {
          performanceStatus = 'Target Achieved';
          statusColor = 'emerald';
        } else if (achievementPct >= 75) {
          performanceStatus = 'On Track';
          statusColor = 'teal';
        } else if (achievementPct >= 40) {
          performanceStatus = 'Below Target';
          statusColor = 'amber';
        } else if (actualKitsOrdered > 0) {
          performanceStatus = 'Under Performer';
          statusColor = 'orange';
        } else {
          performanceStatus = 'No Activity';
          statusColor = 'rose';
        }

        return {
          franchisee_id: f._id,
          reseller_code: f.reseller_code,
          business_name: f.business_name,
          contact_person: f.contact_person,
          mobile: f.mobile,
          district: f.address?.district_name || 'Regional District',
          state: f.address?.state_name || stateName,
          is_operational: f.is_operational,
          monthly_kit_goal: monthlyGoal,
          actual_kits_ordered: actualKitsOrdered,
          remaining_goal: remainingGoal,
          achievement_pct: achievementPct,
          previous_month_kits: prevKitsOrdered,
          current_month_trend_pct: trend,
          total_order_value_inr: totalOrderValue,
          orders_count: currOrders.length,
          performance_status: performanceStatus,
          status_color: statusColor,
        };
      })
    );

    // Optional Filter by Tier
    const filtered = tier && tier !== 'all' ? results.filter((r) => r.performance_status === tier) : results;

    // Sort: highest achievement first
    filtered.sort((a, b) => b.achievement_pct - a.achievement_pct || b.actual_kits_ordered - a.actual_kits_ordered);

    return res.status(200).json({
      status: 'success',
      data: filtered,
      summary: {
        total_franchisees: results.length,
        above_target: results.filter((r) => r.performance_status === 'Above Target').length,
        target_achieved: results.filter((r) => r.performance_status === 'Target Achieved').length,
        on_track: results.filter((r) => r.performance_status === 'On Track').length,
        below_target: results.filter((r) => r.performance_status === 'Below Target').length,
        under_performer: results.filter((r) => r.performance_status === 'Under Performer').length,
        no_activity: results.filter((r) => r.performance_status === 'No Activity').length,
      },
    });
  } catch (err) {
    console.error('[get_franchisee_performance Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch performance data', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. FRANCHISEE ORDER HISTORY & TERRITORY PO EXPLORER
// ─────────────────────────────────────────────────────────────────────────────
exports.get_franchisee_order_history = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, project_type, search, month, year } = req.query;

    const franchisee = await Reseller.findById(id).lean();
    if (!franchisee) return res.status(404).json({ status: 'error', message: 'Franchisee not found' });

    const matchQuery = { reseller_id: franchisee._id };
    if (status && status !== 'all') matchQuery.status = status.toUpperCase();

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      matchQuery.createdAt = { $gte: start, $lte: end };
    }

    const fpoOrders = await FpoOrder.find(matchQuery).sort({ createdAt: -1 }).lean();

    const formattedOrders = [];
    fpoOrders.forEach((o) => {
      (o.items || []).forEach((item, idx) => {
        formattedOrders.push({
          order_id: o._id,
          po_number: o.po_number || `PO-${o._id.toString().slice(-6).toUpperCase()}`,
          order_date: o.createdAt,
          item_name: item.item_name || 'Solar Kit Bundle',
          kit_type: item.item_name || 'Standard Combo Kit',
          project_type: item.project_type_name || 'Residential On-Grid',
          capacity: item.capacity_kw || (item.item_name?.match(/(\d+(\.\d+)?)\s*kW/i) ? item.item_name.match(/(\d+(\.\d+)?)\s*kW/i)[0] : '2.2 kW'),
          quantity: item.quantity,
          unit_price: (item.unit_price_paise || 0) / 100,
          order_value: (item.total_price_paise || 0) / 100,
          order_status: o.status,
          customer_source: o.customer_source || 'Direct Franchisee Order',
          epc_source: o.epc_id ? 'EPC Buyer Network' : 'Franchisee Stock',
        });
      });
    });

    return res.status(200).json({
      status: 'success',
      data: {
        franchisee: {
          id: franchisee._id,
          business_name: franchisee.business_name,
          reseller_code: franchisee.reseller_code,
          contact_person: franchisee.contact_person,
          district: franchisee.address?.district_name,
          state: franchisee.address?.state_name,
        },
        orders: formattedOrders,
        total_orders: formattedOrders.length,
        total_order_value: formattedOrders.reduce((sum, o) => sum + o.order_value, 0),
        total_kits: formattedOrders.reduce((sum, o) => sum + o.quantity, 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch order history', error: err.message });
  }
};

exports.get_territory_order_history = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { search = '', status = '', district = '', month = '', year = '' } = req.query;

    const territory = await _getBdeTerritoryScope(bdeId);
    const stateName = territory?.state_name;

    const resellerQuery = { deleted_at: null };
    if (stateName) {
      resellerQuery.$or = [{ bde_id: bdeId }, { 'address.state_name': new RegExp('^' + stateName + '$', 'i') }];
    } else {
      resellerQuery.bde_id = bdeId;
    }

    const franchisees = await Reseller.find(resellerQuery).lean();
    const fMap = {};
    franchisees.forEach((f) => {
      fMap[f._id.toString()] = f;
    });
    const fIds = franchisees.map((f) => f._id);

    // 1. Franchisee FPO Orders
    const fpoOrFilters = [
      { created_by: new mongoose.Types.ObjectId(bdeId) },
      { 'status_history.changed_by': new mongoose.Types.ObjectId(bdeId) },
      { created_by_role: 'BDE' },
    ];
    if (fIds.length > 0) {
      fpoOrFilters.push({ reseller_id: { $in: fIds } });
      fpoOrFilters.push({ franchisee_id: { $in: fIds } });
    }
    if (stateName) {
      fpoOrFilters.push({ 'customer_details.state': new RegExp('^' + stateName + '$', 'i') });
      fpoOrFilters.push({ 'delivery_address.state_name': new RegExp('^' + stateName + '$', 'i') });
    }
    const matchQuery = { $or: fpoOrFilters };
    if (status && status !== 'all') matchQuery.status = status.toUpperCase();

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      matchQuery.createdAt = { $gte: start, $lte: end };
    }

    // 2. Direct EPC Orders
    const epcOrFilters = [{ reseller_id: { $in: fIds } }];
    if (stateName) {
      epcOrFilters.push({ 'delivery_address.state_name': new RegExp('^' + stateName + '$', 'i') });
    }
    const territoryEpcs = await EpcAccount.find({
      deleted_at: null,
      $or: [
        { bde_id: bdeId },
        ...(stateName ? [{ 'primaryLocation.state': new RegExp('^' + stateName + '$', 'i') }, { working_states: new RegExp('^' + stateName + '$', 'i') }] : [])
      ]
    }).select('_id name company_name business_name primaryLocation').lean();

    const epcMap = {};
    const epcIds = territoryEpcs.map(e => {
      epcMap[e._id.toString()] = e;
      return e._id;
    });
    if (epcIds.length > 0) {
      epcOrFilters.push({ epc_id: { $in: epcIds } });
    }

    const epcOrderMatch = { $or: epcOrFilters };
    if (status && status !== 'all') {
      epcOrderMatch.order_status = status.toLowerCase();
    }
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      epcOrderMatch.$and = [{ createdAt: { $gte: start, $lte: end } }];
    }

    const [fpoOrders, epcOrders] = await Promise.all([
      FpoOrder.find(matchQuery).sort({ createdAt: -1 }).limit(100).lean().catch(() => []),
      EpcOrder.find(epcOrderMatch).sort({ createdAt: -1 }).limit(100).lean().catch(() => []),
    ]);

    const flattened = [];

    // Map Franchisee Orders
    fpoOrders.forEach((o) => {
      const f = fMap[o.franchisee_id?.toString()] || fMap[o.reseller_id?.toString()] || {};
      const fName = f.business_name || o.customer_details?.company_name || o.customer_details?.name || 'Franchise Partner';
      const fCode = f.reseller_code || (o.franchisee_id ? 'FP-' + o.franchisee_id.toString().slice(-4).toUpperCase() : 'BDE-PO');
      const fDistrict = f.address?.district_name || o.customer_details?.district || 'Regional';
      (o.items || []).forEach((item) => {
        flattened.push({
          order_id: o._id,
          po_number: o.po_number || ('PO-' + o._id.toString().slice(-6).toUpperCase()),
          order_date: o.createdAt || o.created_at,
          franchisee_name: fName,
          franchisee_code: fCode,
          district: fDistrict,
          item_name: item.item_name || 'Standard Combo Kit',
          kit_type: item.item_name || 'Standard Combo Kit',
          project_type: item.project_type_name || 'Residential On-Grid',
          capacity: item.capacity_kw || (item.item_name?.match(/(\d+(\.\d+)?)\s*k\.?w\.?/i) ? item.item_name.match(/(\d+(\.\d+)?)\s*k\.?w\.?/i)[0] : '1 kW'),
          quantity: item.quantity,
          unit_price: (item.unit_price_paise || 0) / 100,
          order_value: (item.total_price_paise || 0) / 100,
          order_status: o.status,
          epc_source: o.is_token_booking ? 'Franchisee Token PO' : (o.epc_id ? 'EPC Buyer Network' : 'Franchisee PO'),
        });
      });
    });

    // Map Direct EPC Orders
    epcOrders.forEach((o) => {
      const f = fMap[o.reseller_id?.toString()] || {};
      const epcObj = epcMap[o.epc_id?.toString()] || {};
      const epcName = epcObj.company_name || epcObj.business_name || epcObj.name || 'Direct EPC';
      (o.items || []).forEach((item) => {
        flattened.push({
          order_id: o._id,
          po_number: o.order_number || ('SKO-' + o._id.toString().slice(-6).toUpperCase()),
          order_date: o.createdAt || o.created_at || new Date(),
          franchisee_name: f.business_name || (epcName + ' (Direct EPC)'),
          franchisee_code: f.reseller_code || 'DIRECT-EPC',
          district: o.delivery_address?.district_name || epcObj.primaryLocation?.district || f.address?.district_name || 'Territory',
          item_name: item.item_name || 'Solar Combo Kit',
          kit_type: item.item_name || 'Solar Combo Kit',
          project_type: item.capacity || 'Residential On-Grid',
          capacity: item.capacity || '2.2 kW',
          quantity: item.quantity,
          unit_price: (item.unit_price_paise || 0) / 100,
          order_value: (item.total_price_paise || o.grand_total_paise || 0) / 100,
          order_status: o.order_status ? o.order_status.toUpperCase() : 'PENDING',
          epc_source: o.routing_source === 'primary_reseller' ? 'Franchisee Partner' : 'Direct EPC (HO/BDE)',
        });
      });
    });

    flattened.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

    return res.status(200).json({ status: 'success', data: flattened });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch territory orders', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. KIT SALES PERFORMANCE ANALYTICS (Highest, Average, Lowest Selling)
// ─────────────────────────────────────────────────────────────────────────────
exports.get_kit_sales_analytics = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { district_name, franchisee_id, month, year } = req.query;

    const territory = await _getBdeTerritoryScope(bdeId);
    const stateName = territory?.state_name;

    const resellerQuery = { deleted_at: null };
    if (franchisee_id && franchisee_id !== 'all') {
      resellerQuery._id = franchisee_id;
    } else if (district_name && district_name !== 'all') {
      resellerQuery['address.district_name'] = new RegExp(`^${district_name}$`, 'i');
    } else if (stateName) {
      resellerQuery.$or = [{ bde_id: bdeId }, { 'address.state_name': new RegExp(`^${stateName}$`, 'i') }];
    }

    const franchisees = await Reseller.find(resellerQuery).lean();
    const fIds = franchisees.map((f) => f._id);

    // 1. Load actual active Combo Kits from catalog (No hardcoded dummy kits)
    const catalogKits = await WarehouseComboKit.find({
      deleted_at: null,
      is_active: { $ne: false },
    }).select('_id name kit_name capacity capacity_kw sku is_active').lean();

    const kitMap = {};
    catalogKits.forEach((k) => {
      const kitName = (k.name || k.kit_name || 'Solar Kit').trim();
      const cap = k.capacity_kw
        ? `${k.capacity_kw} kW`
        : k.capacity
          ? `${k.capacity} kW`
          : kitName.match(/(\d+(\.\d+)?)\s*k\.?w\.?/i)
            ? kitName.match(/(\d+(\.\d+)?)\s*k\.?w\.?/i)[0]
            : '1 kW';

      kitMap[kitName] = {
        kit_id: k._id,
        kit_name: kitName,
        capacity: cap,
        units_sold: 0,
        order_value: 0,
      };
    });

    // 2. Query both Franchisee Orders (FpoOrder) and Direct EPC Orders (EpcOrder)
    const fpoOrFilters = [
      { created_by: new mongoose.Types.ObjectId(bdeId) },
      { 'status_history.changed_by': new mongoose.Types.ObjectId(bdeId) },
      { created_by_role: 'BDE' },
    ];
    if (fIds.length > 0) {
      fpoOrFilters.push({ reseller_id: { $in: fIds } });
      fpoOrFilters.push({ franchisee_id: { $in: fIds } });
    }
    if (stateName) {
      fpoOrFilters.push({ 'customer_details.state': new RegExp('^' + stateName + '$', 'i') });
      fpoOrFilters.push({ 'delivery_address.state_name': new RegExp('^' + stateName + '$', 'i') });
    }

    const fpoQuery = {
      $or: fpoOrFilters,
      status: { $nin: ['CANCELLED', 'EXPIRED'] },
    };
    if (franchisee_id && franchisee_id !== 'all') {
      fpoQuery.$and = [{ $or: [{ reseller_id: franchisee_id }, { franchisee_id }] }];
    }
    if (district_name && district_name !== 'all') {
      fpoQuery['customer_details.district'] = new RegExp(`^${district_name}$`, 'i');
    }
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      fpoQuery.createdAt = { $gte: start, $lte: end };
    }

    const epcOrFilters = [];
    if (fIds.length > 0) {
      epcOrFilters.push({ reseller_id: { $in: fIds } });
    }
    if (stateName) {
      epcOrFilters.push({ 'delivery_address.state_name': new RegExp('^' + stateName + '$', 'i') });
    }
    if (district_name && district_name !== 'all') {
      epcOrFilters.push({ 'delivery_address.district_name': new RegExp('^' + district_name + '$', 'i') });
    }
    const epcOrderMatch = epcOrFilters.length > 0
      ? { $or: epcOrFilters, order_status: { $nin: ['cancelled', 'rejected'] } }
      : { order_status: { $nin: ['cancelled', 'rejected'] } };
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      epcOrderMatch.createdAt = { $gte: start, $lte: end };
    }

    const [fpoOrders, epcOrders] = await Promise.all([
      FpoOrder.find(fpoQuery).lean().catch(() => []),
      EpcOrder.find(epcOrderMatch).lean().catch(() => []),
    ]);

    let totalKitsSold = 0;
    let totalTerritoryValue = 0;

    const processItem = (it) => {
      const rawName = (it.item_name || it.name || '').trim();
      if (!rawName) return;

      let matchedKey = Object.keys(kitMap).find(
        (k) => k.toLowerCase() === rawName.toLowerCase()
      );
      if (!matchedKey && it.kit_id) {
        matchedKey = Object.keys(kitMap).find(
          (k) => kitMap[k].kit_id && kitMap[k].kit_id.toString() === it.kit_id.toString()
        );
      }
      if (!matchedKey) {
        matchedKey = rawName;
        kitMap[matchedKey] = {
          kit_id: it.kit_id || null,
          kit_name: rawName,
          capacity: it.capacity || it.capacity_kw || (rawName.match(/(\d+(\.\d+)?)\s*k\.?w\.?/i) ? rawName.match(/(\d+(\.\d+)?)\s*k\.?w\.?/i)[0] : '1 kW'),
          units_sold: 0,
          order_value: 0,
        };
      }

      const qty = Number(it.quantity || 0);
      const val = ((it.total_price_paise || 0) > 10000)
        ? (it.total_price_paise || 0) / 100
        : Number(it.total_price || (it.unit_price ? it.unit_price * qty : 0));

      kitMap[matchedKey].units_sold += qty;
      kitMap[matchedKey].order_value += val;
      totalKitsSold += qty;
      totalTerritoryValue += val;
    };

    fpoOrders.forEach((o) => {
      (o.items || []).forEach(processItem);
    });

    epcOrders.forEach((o) => {
      (o.items || []).forEach(processItem);
    });

    // 3. Convert to array and calculate percentage share
    const kitList = Object.values(kitMap).map((k) => {
      const sharePct = totalKitsSold > 0 ? Math.round((k.units_sold / totalKitsSold) * 100) : 0;
      return { ...k, share_pct: sharePct };
    });

    // Sort descending by units sold, then order value
    kitList.sort((a, b) => b.units_sold - a.units_sold || b.order_value - a.order_value);

    // 4. Dynamic & accurate classification based on real sales
    const classifiedList = kitList.map((k, index) => {
      let classification = 'Lowest Selling';
      let badgeColor = 'rose';

      if (k.units_sold > 0) {
        if (index === 0 || k.share_pct >= 40) {
          classification = 'Highest Selling';
          badgeColor = 'emerald';
        } else if (k.share_pct >= 10) {
          classification = 'Average Selling';
          badgeColor = 'teal';
        } else {
          classification = 'Lowest Selling';
          badgeColor = 'rose';
        }
      } else {
        classification = 'Lowest Selling';
        badgeColor = 'rose';
      }

      return {
        ...k,
        classification,
        badge_color: badgeColor,
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        total_kits_sold: totalKitsSold,
        total_sales_value_inr: totalTerritoryValue,
        highest_selling: classifiedList.filter((k) => k.classification === 'Highest Selling'),
        average_selling: classifiedList.filter((k) => k.classification === 'Average Selling'),
        lowest_selling: classifiedList.filter((k) => k.classification === 'Lowest Selling'),
        all_kits: classifiedList,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch kit analytics', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. TERRITORY PERFORMANCE RANKING LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────
exports.get_franchisee_ranking = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const territory = await _getBdeTerritoryScope(bdeId);
    const stateName = territory?.state_name;

    const query = { deleted_at: null };
    if (stateName) {
      query.$or = [{ bde_id: bdeId }, { 'address.state_name': new RegExp(`^${stateName}$`, 'i') }];
    } else {
      query.bde_id = bdeId;
    }

    const franchisees = await Reseller.find(query).lean();
    const fIds = franchisees.map((f) => f._id);

    const fpoOrders = await FpoOrder.find({
      reseller_id: { $in: fIds },
      status: { $nin: ['CANCELLED', 'EXPIRED'] },
    }).lean();

    const ranked = franchisees.map((f) => {
      const fOrders = fpoOrders.filter((o) => o.reseller_id?.toString() === f._id.toString());
      let totalKits = 0;
      let totalVal = 0;
      fOrders.forEach((o) => {
        totalVal += (o.total_paise || 0) / 100;
        (o.items || []).forEach((it) => {
          totalKits += Number(it.quantity || 0);
        });
      });

      const target = f.is_operational ? 10 : 5;
      const achievement = Math.round((totalKits / target) * 100);

      let rankCategory = 'Average Performers';
      let rankBadge = 'teal';

      if (achievement >= 100 || totalKits >= 20) {
        rankCategory = 'Top Franchisees';
        rankBadge = 'emerald';
      } else if (achievement < 40 || totalKits === 0) {
        rankCategory = 'Under Performers';
        rankBadge = 'rose';
      }

      return {
        id: f._id,
        business_name: f.business_name,
        reseller_code: f.reseller_code,
        contact_person: f.contact_person,
        district: f.address?.district_name || 'Regional District',
        is_operational: f.is_operational,
        total_kits_ordered: totalKits,
        total_order_value: totalVal,
        target_achievement_pct: achievement,
        rank_category: rankCategory,
        rank_badge: rankBadge,
      };
    });

    ranked.sort((a, b) => b.total_kits_ordered - a.total_kits_ordered || b.target_achievement_pct - a.target_achievement_pct);

    return res.status(200).json({
      status: 'success',
      data: {
        top_franchisees: ranked.filter((r) => r.rank_category === 'Top Franchisees'),
        average_performers: ranked.filter((r) => r.rank_category === 'Average Performers'),
        under_performers: ranked.filter((r) => r.rank_category === 'Under Performers'),
        all_ranked: ranked,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch rankings', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. LEGACY BDE STORE SETUPS & FRANCHISEE LEADS (Backward Compatible)
// ─────────────────────────────────────────────────────────────────────────────
exports.create_bde_lead = async (req, res) => {
  try {
    const bdeId = req.user?.id || req.user?._id;
    if (bdeId) {
      const bdeProfile = await BDEProfile.findById(bdeId).select('can_onboard_franchise').lean();
      if (bdeProfile && bdeProfile.can_onboard_franchise === false) {
        return res.status(403).json({
          status: 'error',
          message: 'Franchise onboarding is disabled for your BDE account by Administrator.',
        });
      }
    }
    const result = await createLead(req.body, bdeId);
    return res.status(201).json({
      status: 'success',
      message: 'Franchisee lead created successfully',
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      status: 'error',
      message: err.message || 'Failed to create lead',
    });
  }
};

exports.list_bde_leads = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { search, stage } = req.query;

    // Auto-sync any FranchiseLead records assigned to this BDE
    const assignedFranchiseLeads = await FranchiseLead.find({
      bde_id: bdeId,
      deleted_at: null,
    }).lean();

    const { generateNextLeadId } = require('../../admin-panel/services/bde.lead.service');

    for (const fl of assignedFranchiseLeads) {
      let existingBdeLead = null;
      if (fl.bde_lead_id) {
        existingBdeLead = await BDELead.findById(fl.bde_lead_id);
      }
      if (!existingBdeLead) {
        existingBdeLead = await BDELead.findOne({
          deleted_at: null,
          $or: [
            { mobile_number: fl.mobile_number },
            { email: fl.email },
          ],
        });
      }

      if (!existingBdeLead) {
        const newLeadId = await generateNextLeadId();
        const createdLead = await BDELead.create({
          lead_id: newLeadId,
          prospect_name: fl.full_name,
          company_name: fl.business_name,
          mobile_number: fl.mobile_number,
          email: fl.email,
          gst_number: fl.gstin || null,
          gst_verified: fl.gst_verified || false,
          gst_legal_name: fl.gst_legal_name || null,
          gst_trade_name: fl.gst_trade_name || null,
          state_name: fl.state,
          district_name: fl.district,
          pincode: fl.pincode || null,
          address_line: `${fl.district}, ${fl.state}`,
          lead_source: 'head_office_assigned',
          lead_status: fl.status === 'APPROVED_CONVERTED' ? 'fee_paid' : 'new_lead',
          created_by_bde_id: bdeId,
          original_bde_id: bdeId,
          current_bde_id: bdeId,
          notes: fl.admin_remarks || 'Assigned by Head Office Admin',
        });
        await FranchiseLead.findByIdAndUpdate(fl._id, { bde_lead_id: createdLead._id });
      } else if (String(existingBdeLead.current_bde_id) !== String(bdeId)) {
        existingBdeLead.current_bde_id = bdeId;
        await existingBdeLead.save();
      }
    }

    const query = {
      $or: [
        { current_bde_id: bdeId },
        { created_by_bde_id: bdeId },
      ],
      deleted_at: null,
    };

    if (stage && stage.trim()) {
      query.lead_status = stage.trim();
    }

    if (search && search.trim()) {
      const sRegex = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { prospect_name: sRegex },
            { company_name: sRegex },
            { mobile_number: sRegex },
            { lead_id: sRegex },
            { gst_number: sRegex },
            { district_name: sRegex },
            { state_name: sRegex },
          ],
        },
      ];
    }

    const leads = await BDELead.find(query).sort({ created_at: -1, createdAt: -1 }).lean();
    return res.status(200).json({ status: 'success', data: leads });
  } catch (err) {
    console.error('[list_bde_leads error]:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to list leads', error: err.message });
  }
};

exports.get_bde_lead_detail = async (req, res) => {
  try {
    const lead = await BDELead.findOne({
      _id: req.params.id,
      deleted_at: null,
      $or: [
        { current_bde_id: req.user.id },
        { created_by_bde_id: req.user.id },
      ],
    }).lean();

    if (!lead) return res.status(404).json({ status: 'error', message: 'Lead not found' });

    const activities = await BDELeadActivity.find({ lead_id: lead._id }).sort({ created_at: -1 }).lean();
    return res.status(200).json({ status: 'success', data: { lead, activities } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch lead', error: err.message });
  }
};

exports.update_bde_lead = async (req, res) => {
  try {
    const lead = await BDELead.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { current_bde_id: req.user.id },
          { created_by_bde_id: req.user.id },
        ],
      },
      { $set: req.body },
      { new: true }
    );
    return res.status(200).json({ status: 'success', message: 'Lead updated', data: lead });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update lead', error: err.message });
  }
};

exports.add_lead_activity = async (req, res) => {
  try {
    const { id } = req.params;
    const { activity_type, title, notes, next_follow_up_date, location } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid lead ID is required' });
    }

    const lead = await BDELead.findOne({ _id: id, deleted_at: null });
    if (!lead) {
      return res.status(404).json({ status: 'error', message: 'Lead not found' });
    }

    const bdeId = req.user?.id || req.user?._id || req.bde?._id || lead.current_bde_id;
    const bdeName = req.user?.full_name || req.bde?.full_name || 'BDE Executive';

    const rawType = (activity_type && typeof activity_type === 'string') ? activity_type.toLowerCase().trim() : 'note';
    const validTypes = ['call', 'meeting', 'site_visit', 'demo', 'email', 'note', 'stage_change', 'reassigned', 'signup_initiated'];
    const safeType = validTypes.includes(rawType) ? rawType : 'note';

    const actTitle = (title && typeof title === 'string' && title.trim())
      ? title.trim()
      : `${safeType.toUpperCase()} Log`;

    const act = await BDELeadActivity.create({
      lead_id: lead._id,
      bde_id: bdeId,
      bde_name: bdeName,
      activity_type: safeType,
      title: actTitle,
      notes: (notes && typeof notes === 'string') ? notes.trim() : '',
      location: location || null,
      next_follow_up_date: next_follow_up_date ? new Date(next_follow_up_date) : null,
    });

    if (next_follow_up_date) {
      const followUpDate = new Date(next_follow_up_date);
      await BDELead.findByIdAndUpdate(lead._id, {
        next_follow_up_date: followUpDate,
        bde_remarks: (notes && typeof notes === 'string') ? notes.trim() : lead.bde_remarks,
      });

      try {
        await BDEFollowUp.create({
          lead_id: lead._id,
          bde_id: bdeId,
          follow_up_date: followUpDate,
          purpose: actTitle,
          status: 'scheduled',
          outcome_notes: (notes && typeof notes === 'string') ? notes.trim() : null,
        });
      } catch (fErr) {
        console.warn('[add_lead_activity] Follow-up creation notice:', fErr.message);
      }

      try {
        await BDENotification.create({
          bde_id: bdeId,
          title: `Follow-up Scheduled: ${lead.company_name || lead.prospect_name} 📅`,
          message: `Follow-up set for ${followUpDate.toLocaleDateString('en-IN')}${notes ? `: ${notes}` : ''}`,
          type: 'follow_up',
          link: '/leads',
          action_label: 'View Franchisee Lead',
          entity_type: 'bde_lead',
          entity_id: lead._id,
        });
      } catch (nErr) {
        console.warn('[add_lead_activity] Notification creation notice:', nErr.message);
      }
    }

    return res.status(201).json({ status: 'success', message: 'Activity added successfully', data: act });
  } catch (err) {
    console.error('[add_lead_activity Error]:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to add activity', error: err.message });
  }
};

exports.get_lead_activities = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid lead ID is required' });
    }

    const activities = await BDELeadActivity.find({ lead_id: id }).sort({ created_at: -1 }).lean();
    return res.status(200).json({ status: 'success', data: activities });
  } catch (err) {
    console.error('[get_lead_activities Error]:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch lead activities', error: err.message });
  }
};

exports.schedule_follow_up = async (req, res) => {
  try {
    const { id } = req.params;
    const { follow_up_date, notes } = req.body;
    const lead = await BDELead.findByIdAndUpdate(
      id,
      { next_follow_up_date: new Date(follow_up_date), bde_remarks: notes },
      { new: true }
    );

    if (lead) {
      await BDENotification.create({
        bde_id: req.user.id,
        title: `Franchisee Follow-up Scheduled: ${lead.company_name || lead.prospect_name} 📅`,
        message: `Follow-up set for ${new Date(follow_up_date).toLocaleDateString('en-IN')}${notes ? `: ${notes}` : ''}`,
        type: 'follow_up',
        link: '/leads',
        action_label: 'View Franchisee Lead',
        entity_type: 'bde_lead',
        entity_id: lead._id,
      }).catch(() => { });
    }

    return res.status(200).json({ status: 'success', message: 'Follow-up scheduled', data: lead });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to schedule follow-up', error: err.message });
  }
};

exports.update_lead_stage = async (req, res) => {
  try {
    const { id } = req.params;
    const stage = req.body.new_stage || req.body.stage;
    const notes = req.body.reason || req.body.notes;

    if (!stage) {
      return res.status(400).json({ status: 'error', message: 'Target stage is required' });
    }

    const lead = await BDELead.findById(id);
    if (!lead) {
      return res.status(404).json({ status: 'error', message: 'Lead not found' });
    }

    const prevStage = lead.lead_status;
    lead.lead_status = stage;
    if (notes) lead.bde_remarks = notes;
    await lead.save();

    const bdeId = req.user?.id || req.user?._id || req.bde?._id || lead.current_bde_id;
    const bdeName = req.user?.full_name || req.bde?.full_name || 'BDE Executive';

    await BDELeadActivity.create({
      lead_id: lead._id,
      bde_id: bdeId,
      bde_name: bdeName,
      activity_type: 'stage_change',
      title: `Stage Changed: ${stage.replace(/_/g, ' ').toUpperCase()}`,
      notes: notes || `Lead transitioned to stage "${stage}"`,
      previous_stage: prevStage,
      new_stage: stage,
    }).catch((e) => console.warn('[update_lead_stage] Activity log notice:', e.message));

    await BDENotification.create({
      bde_id: bdeId,
      title: `Franchisee Lead Stage: ${lead.company_name || lead.prospect_name} 🎯`,
      message: `Lead transitioned to stage "${stage}"${notes ? ` (${notes})` : ''}`,
      type: 'lead',
      link: '/leads',
      action_label: 'View Lead Pipeline',
      entity_type: 'bde_lead',
      entity_id: lead._id,
    }).catch(() => { });

    return res.status(200).json({ status: 'success', message: `Lead updated to ${stage}`, data: lead });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update stage', error: err.message });
  }
};

exports.start_franchisee_signup = async (req, res) => {
  try {
    const bdeId = req.user?.id || req.user?._id || req.bde?._id;
    const result = await startFranchiseeSignup(req.params.id, bdeId);
    return res.status(200).json({ status: 'success', message: result?.message || 'Onboarding started', data: result });
  } catch (err) {
    console.error('[start_franchisee_signup Error]:', err);
    return res.status(err.statusCode || 500).json({ status: 'error', message: err.message || 'Failed to start signup' });
  }
};

exports.get_bde_pipeline = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const leads = await BDELead.find({
      $or: [{ current_bde_id: bdeId }, { created_by_bde_id: bdeId }],
      deleted_at: null,
    }).lean();

    const grouped = {};
    leads.forEach((l) => {
      const st = l.lead_status || 'new_lead';
      if (!grouped[st]) grouped[st] = [];
      grouped[st].push(l);
    });

    return res.status(200).json({
      status: 'success',
      data: {
        total_leads: leads.length,
        all_leads: leads,
        grouped,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch pipeline', error: err.message });
  }
};

exports.get_my_store_setups = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const bdeEmail = req.user.email;
    const setups = await StoreSetup.find({
      $or: [
        { current_bde_id: bdeId },
        { original_bde_id: bdeId },
        { assigned_employee_id: bdeId },
        { assigned_employee_email: bdeEmail },
      ],
    })
      .sort({ created_at: -1 })
      .populate('franchisee_id', 'business_name owner_name mobile_number email state_name district_name')
      .lean();

    return res.status(200).json({ status: 'success', data: setups });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch store setups', error: err.message });
  }
};

exports.get_bde_store_setup_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const bdeId = req.user.id;
    const bdeEmail = req.user.email;

    const setup = await StoreSetup.findOne({
      _id: id,
      $or: [
        { current_bde_id: bdeId },
        { original_bde_id: bdeId },
        { assigned_employee_id: bdeId },
        { assigned_employee_email: bdeEmail },
      ],
    })
      .populate('franchisee_id')
      .populate('current_bde_id', 'full_name bde_id email mobile_number')
      .lean();

    let checklist = await StoreSetupChecklist.find({ store_setup_id: setup._id }).sort({ display_order: 1 }).lean();
    if (!checklist || checklist.length === 0) {
      const { ensureStoreSetupChecklist } = require('../../admin-panel/services/store.setup.service');
      checklist = await ensureStoreSetupChecklist(setup._id, setup.franchisee_id?._id || setup.franchisee_id);
    }
    const delays = await StoreSetupDelay.find({ store_setup_id: setup._id }).sort({ created_at: -1 }).lean();
    const verifications = await StoreSetupVerification.find({ store_setup_id: setup._id }).sort({ cycle_number: -1 }).lean();

    const { calculateStoreSetupProgress } = require('../../admin-panel/services/store.setup.service');
    const progress = await calculateStoreSetupProgress(setup._id);

    return res.status(200).json({
      status: 'success',
      data: {
        setup: { ...setup, ...progress },
        checklist,
        delays,
        verifications,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch store setup detail', error: err.message });
  }
};

// ── Legacy EPC Stubs (Backward Compatible) ──
exports.get_bde_epc_stats = async (req, res) => {
  return exports.get_bde_dashboard(req, res);
};

exports.get_bde_epc_list = async (req, res) => {
  return exports.list_epc_leads(req, res);
};

exports.onboard_epc = async (req, res) => {
  return exports.onboard_epc_with_gst(req, res);
};

exports.get_bde_franchise_partners = async (req, res) => {
  return exports.get_eligible_franchisees_for_epc(req, res);
};

exports.assign_franchise_partner = async (req, res) => {
  return exports.assign_epc_to_franchisee(req, res);
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. BDE PURCHASE ORDER CREATION & EPC ALLOCATION LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 0. Fetch Onboarded EPC Partners for BDE
 */
exports.get_bde_onboarded_epcs = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const territory = await _getBdeTerritoryScope(bdeId);
    const stateName = territory?.state_name;

    const query = {
      deleted_at: null,
      $or: [
        { onboarded_by_bde_id: bdeId },
        { assigned_bde_id: bdeId },
      ],
    };

    let epcs = await EpcAccount.find(query)
      .populate('primary_reseller_id', 'business_name reseller_code contact_person mobile address')
      .populate('onboarded_by_reseller_id', 'business_name reseller_code contact_person mobile address')
      .sort({ createdAt: -1 })
      .lean();

    const epcIds = epcs.map((e) => e._id);
    const relationships = await EpcResellerRelationship.find({
      epc_id: { $in: epcIds },
      status: 'active',
    })
      .populate('reseller_id', 'business_name reseller_code contact_person mobile address')
      .lean();

    const relMap = new Map();
    relationships.forEach((r) => {
      if (r.epc_id && r.reseller_id) {
        relMap.set(r.epc_id.toString(), r.reseller_id);
      }
    });

    const defaultFranchisee = await Reseller.findOne({ deleted_at: null, is_operational: true }).lean();

    const result = epcs.map((e) => {
      const assignedFranchisee = relMap.get(e._id.toString()) || e.primary_reseller_id || e.onboarded_by_reseller_id || defaultFranchisee;
      const companyName = e.gstin_trade_name || e.gstin_legal_name || e.name || 'EPC Solar Partner';

      return {
        _id: e._id,
        id: e._id,
        epc_id: e.epc_id || e._id,
        company_name: companyName,
        name: e.name || companyName,
        contact_person: e.name || companyName,
        mobile: e.whatsapp || e.registered_whatsapp || e.mobile || '',
        phone: e.whatsapp || e.registered_whatsapp || e.mobile || '',
        email: e.email || '',
        gstin: e.gstin || '',
        district: e.district_name || 'Surat',
        state: e.state_name || stateName || 'Gujarat',
        address: e.address || '',
        pincode: e.pincode || '',
        status: e.status,
        onboarded_by_bde_id: e.onboarded_by_bde_id,
        assigned_franchisee_id: assignedFranchisee?._id || assignedFranchisee?.id || null,
        assigned_franchisee_name: assignedFranchisee?.business_name || assignedFranchisee?.name || 'Franchise Partner',
        assigned_franchisee_code: assignedFranchisee?.reseller_code || 'FR-N/A',
        assigned_franchisee: assignedFranchisee || null,
      };
    });

    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('[get_bde_onboarded_epcs Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch onboarded EPCs', error: err.message });
  }
};

/**
 * 1. Fetch Active Franchisees for PO creation (with Plan & Territory info)
 */
exports.get_bde_po_franchisees = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const territory = await _getBdeTerritoryScope(bdeId);
    const stateName = territory?.state_name;

    const query = { deleted_at: null };
    const orConditions = [{ bde_id: bdeId }, { original_bde_id: bdeId }];
    if (stateName) {
      orConditions.push({ 'address.state_name': new RegExp(`^${stateName}$`, 'i') });
    }
    query.$or = orConditions;

    const franchisees = await Reseller.find(query)
      .select('business_name email mobile reseller_code contact_person is_operational activation_status agreement_status address gst_number reseller_lifecycle_status')
      .sort({ business_name: 1 })
      .lean();

    const fIds = franchisees.map((f) => f._id);

    // Fetch active plan subscriptions
    const subscriptions = await ResellerPlanSubscription.find({
      reseller_id: { $in: fIds },
      status: 'active',
    })
      .populate('plan_id', 'name code order_type_allowed target_monthly_turnover_inr allowed_combo_kit_ids')
      .lean();

    const subMap = new Map();
    subscriptions.forEach((s) => {
      if (s.reseller_id) {
        subMap.set(s.reseller_id.toString(), s);
      }
    });

    // Count existing active POs
    const poCounts = await FpoOrder.aggregate([
      { $match: { franchisee_id: { $in: fIds }, deleted_at: null } },
      { $group: { _id: '$franchisee_id', count: { $sum: 1 } } },
    ]);
    const poCountMap = new Map(poCounts.map((c) => [c._id.toString(), c.count]));

    const result = franchisees.map((f) => {
      const sub = subMap.get(f._id.toString());
      return {
        _id: f._id,
        franchisee_id: f.reseller_code || f._id,
        id: f._id,
        business_name: f.business_name || f.contact_person || 'Franchise Partner',
        name: f.business_name || f.contact_person || 'Franchise Partner',
        contact_person: f.contact_person,
        email: f.email,
        mobile: f.mobile,
        gst_number: f.gst_number,
        is_operational: f.is_operational,
        activation_status: f.activation_status,
        reseller_lifecycle_status: f.reseller_lifecycle_status,
        district: f.address?.district_name || 'Regional',
        state: f.address?.state_name || stateName || 'Gujarat',
        plan: sub?.plan_id || null,
        plan_name: sub?.plan_id?.name || 'Standard Franchise',
        active_po_count: poCountMap.get(f._id.toString()) || 0,
      };
    });

    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('[get_bde_po_franchisees Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch franchisees for PO', error: err.message });
  }
};

/**
 * 2a. Get Available Company ComboKits for BDE PO Creation (Direct Company PO for EPCs)
 */
exports.get_bde_company_combokits = async (req, res) => {
  try {
    const {
      WarehouseComboKit,
      CompanyMargin,
      FranchiseePlanPoSetting,
      ResellerPlanSubscription,
      EpcAccount,
      ResellerPlan,
    } = require('../../admin-panel/models/india_solarshop_db');
    const {
      SolarKit,
      ProjectCategory,
      IndustryType,
      ProjectSubcategory,
      ProjectSubcategoryType,
      ProjectType,
      ProjectRange,
    } = require('../../admin-panel/models/core_db');

    const epcId = req.query.epc_id;
    const fId = req.query.franchisee_id;
    let targetPlanId = null;

    if (fId && mongoose.Types.ObjectId.isValid(fId)) {
      const sub = await ResellerPlanSubscription.findOne({ reseller_id: fId, status: 'active' }).sort({ start_date: -1 }).lean();
      if (sub?.plan_id) targetPlanId = sub.plan_id;
    } else if (epcId && mongoose.Types.ObjectId.isValid(epcId)) {
      const epc = await EpcAccount.findById(epcId).lean();
      const resellerId = epc?.primary_reseller_id || epc?.onboarded_by_reseller_id || epc?.assigned_franchisee_id;
      if (resellerId && mongoose.Types.ObjectId.isValid(resellerId)) {
        const sub = await ResellerPlanSubscription.findOne({ reseller_id: resellerId, status: 'active' }).sort({ start_date: -1 }).lean();
        if (sub?.plan_id) targetPlanId = sub.plan_id;
      }
    }

    const companyPlan = await ResellerPlan.findOne({
      deleted_at: null,
      $or: [{ store_category: 'company_store' }, { slug: 'company-store' }, { name: /company/i }],
    }).lean();

    const allPoSettings = await FranchiseePlanPoSetting.find({ deleted_at: null, po_enabled: true }).sort({ updated_at: -1, created_at: -1 }).lean();

    const kits = await WarehouseComboKit.find({ deleted_at: null, is_active: { $ne: false } }).lean();
    const kitIds = kits.map((k) => k._id);

    const activeMargins = await CompanyMargin.find({
      combo_kit_id: { $in: kitIds },
      deleted_at: null,
      is_active: true,
    }).lean();

    const marginMap = new Map();
    activeMargins.forEach((m) => {
      const kId = String(m.combo_kit_id);
      if (!marginMap.has(kId)) {
        marginMap.set(kId, m);
      }
    });

    const solarKitIds = kits.map((k) => k.solar_kit_id).filter(Boolean);
    const [solarDefs, allRanges] = await Promise.all([
      solarKitIds.length > 0 ? SolarKit.find({ _id: { $in: solarKitIds } }).lean() : [],
      ProjectRange.find({ deleted_at: null }).lean(),
    ]);

    const defMap = new Map(solarDefs.map((d) => [d._id.toString(), d]));
    const catIds = solarDefs.map((d) => d.category_id).filter(Boolean);
    const subcatIds = solarDefs.map((d) => d.subcategory_id).filter(Boolean);
    const typeIds = solarDefs.map((d) => d.type_id).filter(Boolean);

    const [categories, subcategories, subcatTypes, projTypes] = await Promise.all([
      catIds.length > 0 ? ProjectCategory.find({ _id: { $in: catIds } }).lean() : [],
      subcatIds.length > 0 ? ProjectSubcategory.find({ _id: { $in: subcatIds } }).lean() : [],
      typeIds.length > 0 ? ProjectSubcategoryType.find({ _id: { $in: typeIds } }).populate('type').populate('subcategory').lean() : [],
      typeIds.length > 0 ? ProjectType.find({ _id: { $in: typeIds } }).lean() : [],
    ]);

    const catMap = new Map(categories.map((c) => [c._id.toString(), c]));
    const indIds = categories.map((c) => c.industry_type_id).filter(Boolean);
    const industries = indIds.length > 0 ? await IndustryType.find({ _id: { $in: indIds } }).lean() : [];
    const indMap = new Map(industries.map((i) => [i._id.toString(), i]));
    const subcatMap = new Map(subcategories.map((s) => [s._id.toString(), s]));
    const subcatTypeMap = new Map(subcatTypes.map((st) => [st._id.toString(), st]));
    const projTypeMap = new Map(projTypes.map((p) => [p._id.toString(), p]));

    const enrichedKits = kits.map((k) => {
      const margin = marginMap.get(String(k._id));
      const def = defMap.get(k.solar_kit_id?.toString());
      const cat = def ? catMap.get(def.category_id?.toString()) : null;
      const ind = cat ? indMap.get(cat.industry_type_id?.toString()) : null;
      const subcatType = def ? subcatTypeMap.get(def.type_id?.toString()) : null;
      const directSubcat = def ? subcatMap.get(def.subcategory_id?.toString()) : null;
      const directProjType = def ? projTypeMap.get(def.type_id?.toString()) : null;

      const subcatId = subcatType?.subcategory?._id || directSubcat?._id || null;
      const subcatName = subcatType?.subcategory?.name || directSubcat?.name || 'Individual Home';

      let projTypeName = 'Rooftop Solar';
      let projTypeId = null;
      if (subcatType?.type) {
        projTypeId = subcatType.type._id;
        projTypeName = subcatType.type.name;
        if (subcatType.subcategory?.name) {
          projTypeName = `${subcatType.subcategory.name} - ${projTypeName}`;
        }
      } else if (directProjType) {
        projTypeId = directProjType._id;
        projTypeName = directProjType.name;
      }

      const kitCap = Number(k.capacity || 0);
      const matchedRange = allRanges.find((r) =>
        (subcatType && String(r.subcategory_type) === String(subcatType._id)) ||
        (kitCap >= Number(r.min_value || 0) && kitCap <= Number(r.max_value || 999999))
      );

      const price = Number(k.selling_price_cached || k.base_price_cached || 0);
      const gstRate = margin?.gst_rate != null ? Number(margin.gst_rate) : (k.gst_rate != null ? Number(k.gst_rate) : 0);

      const poPricing = Array.isArray(margin?.po_order_pricing) && margin.po_order_pricing.length > 0
        ? margin.po_order_pricing
        : (k.po_order_pricing || []);
      const loosePricing = Array.isArray(margin?.loose_order_pricing) && margin.loose_order_pricing.length > 0
        ? margin.loose_order_pricing
        : (k.loose_order_pricing || []);

      // Prioritize Admin configured order_quantities and loose_order_quantities from ComboKit ("Trial Kits / MOQ")
      const kitOrderQtys = Array.isArray(k.order_quantities) && k.order_quantities.length > 0
        ? k.order_quantities.map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b)
        : [];
      const poQtysFromPricing = poPricing
        .map((p) => Number(p.quantity))
        .filter((n) => !isNaN(n) && n > 0)
        .sort((a, b) => a - b);
      const resolvedPoQtys = kitOrderQtys.length > 0 ? kitOrderQtys : poQtysFromPricing;

      const kitLooseQtys = Array.isArray(k.loose_order_quantities) && k.loose_order_quantities.length > 0
        ? k.loose_order_quantities.map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b)
        : [];
      const looseQtysFromPricing = loosePricing
        .map((p) => Number(p.quantity))
        .filter((n) => !isNaN(n) && n > 0)
        .sort((a, b) => a - b);
      const resolvedLooseQtys = kitLooseQtys.length > 0 ? kitLooseQtys : looseQtysFromPricing;

      // Dynamically resolve kit-specific PO settings
      const kIdStr = String(k._id);
      let matchedSetting = null;

      // 1. Dedicated kit-specific rule for Company Store plan
      if (companyPlan) {
        matchedSetting = allPoSettings.find((s) =>
          String(s.plan_id) === String(companyPlan._id) &&
          Array.isArray(s.allowed_combo_kit_ids) &&
          s.allowed_combo_kit_ids.map(String).includes(kIdStr)
        );
      }

      // 2. Any dedicated kit-specific rule across all PO settings
      if (!matchedSetting) {
        matchedSetting = allPoSettings.find((s) =>
          Array.isArray(s.allowed_combo_kit_ids) &&
          s.allowed_combo_kit_ids.map(String).includes(kIdStr)
        );
      }

      // 3. Specific rule for this kit on targetPlanId (if requested)
      if (!matchedSetting && targetPlanId) {
        matchedSetting = allPoSettings.find((s) =>
          String(s.plan_id) === String(targetPlanId) &&
          Array.isArray(s.allowed_combo_kit_ids) &&
          s.allowed_combo_kit_ids.map(String).includes(kIdStr)
        );
      }

      // 4. Fallback to Company Store plan-wide default (empty allowed_combo_kit_ids)
      if (!matchedSetting && companyPlan) {
        matchedSetting = allPoSettings.find((s) =>
          String(s.plan_id) === String(companyPlan._id) &&
          (!s.allowed_combo_kit_ids || s.allowed_combo_kit_ids.length === 0)
        );
      }

      // 5. Fallback to targetPlanId plan-wide default (empty allowed_combo_kit_ids)
      if (!matchedSetting && targetPlanId) {
        matchedSetting = allPoSettings.find((s) =>
          String(s.plan_id) === String(targetPlanId) &&
          (!s.allowed_combo_kit_ids || s.allowed_combo_kit_ids.length === 0)
        );
      }

      // 6. Generic plan-wide default
      if (!matchedSetting) {
        matchedSetting = allPoSettings.find((s) =>
          s.token_booking_enabled &&
          (!s.allowed_combo_kit_ids || s.allowed_combo_kit_ids.length === 0)
        ) || allPoSettings[0] || null;
      }

      let resolvedTokenRatePaise = 0;
      let tokenBookingEnabled = false;
      let tokenType = 'FIXED_AMOUNT';
      let tokenValue = 0;

      if (matchedSetting) {
        tokenBookingEnabled = matchedSetting.token_booking_enabled !== false;
        tokenType = matchedSetting.token_type || 'FIXED_AMOUNT';
        tokenValue = Number(matchedSetting.token_value || 0);

        if (tokenBookingEnabled) {
          if (matchedSetting.token_rate_per_kit_paise != null && Number(matchedSetting.token_rate_per_kit_paise) > 0) {
            resolvedTokenRatePaise = Number(matchedSetting.token_rate_per_kit_paise);
          } else if (tokenType === 'FIXED_AMOUNT' && tokenValue > 0) {
            resolvedTokenRatePaise = Math.round(tokenValue * 100);
          } else if (tokenType === 'PERCENTAGE' && tokenValue > 0) {
            resolvedTokenRatePaise = Math.round((price * 100) * (tokenValue / 100));
          }
        }
      }

      return {
        _id: k._id,
        id: k._id,
        name: k.name,
        kit_name: k.name,
        capacity_kw: k.capacity || (matchedRange ? matchedRange.min_value : 5),
        capacity: k.capacity || (matchedRange ? matchedRange.min_value : 5),
        price,
        unit_price: price,
        dealer_price: price,
        base_price_paise: Math.round(price * 100),
        token_rate_per_kit_paise: resolvedTokenRatePaise,
        token_booking_enabled: tokenBookingEnabled,
        token_type: tokenType,
        token_value: tokenValue,
        gst_rate: gstRate,
        tax_pct: gstRate,
        gst_pct: gstRate,
        common_gst_rate: gstRate,
        industry_type_id: ind?._id || cat?.industry_type_id || null,
        industry_type_name: ind?.name || 'Solar PV',
        category_id: cat?._id || null,
        category_name: cat?.name || 'Residential Solar',
        subcategory_id: subcatId,
        subcategory_name: subcatName,
        project_type_id: projTypeId,
        project_type_name: projTypeName,
        system_type: k.system_type || (k.inverter_mode === 'hybrid' ? 'Hybrid' : (k.inverter_mode === 'offgrid' ? 'Off-Grid' : 'On-Grid')),
        project_range_id: matchedRange?._id || null,
        project_range_label: matchedRange ? `${matchedRange.min_value} - ${matchedRange.max_value} kW` : (k.capacity ? `${k.capacity} kW System` : 'Standard Range'),
        min_kw: matchedRange?.min_value ?? (k.capacity || 0),
        max_kw: matchedRange?.max_value ?? (k.capacity || 0),
        order_quantities: resolvedPoQtys,
        loose_order_quantities: resolvedLooseQtys,
        min_po_quantity: resolvedPoQtys[0] || (kitOrderQtys[0] || 0),
        is_trial_available: k.is_trial_available ?? false,
        max_trial_count_per_buyer: k.max_trial_count_per_buyer || 10,
        specifications: k.description || 'High performance solar kit with tier-1 inverter, solar panels, and GI mounting structure.',
        po_order_pricing: poPricing,
        loose_order_pricing: loosePricing,
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        combo_kits: enrichedKits,
        has_active_plan: true,
      },
    });
  } catch (err) {
    console.error('[get_bde_company_combokits Error]', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to fetch company combokits' });
  }
};

/**
 * 2. Get Franchisee's Plan PO Settings & Available Blueprint ComboKits (Falls back to Company ComboKits)
 */
exports.get_franchisee_po_plan_settings = async (req, res) => {
  try {
    const franchiseeId = req.params.franchiseeId || req.query.franchisee_id;
    if (!franchiseeId || franchiseeId === 'company' || franchiseeId === 'direct') {
      return await exports.get_bde_company_combokits(req, res);
    }
    const simulatedReq = {
      ...req,
      reseller: { _id: franchiseeId, id: franchiseeId },
    };

    let capturedBody = null;
    let capturedStatus = 200;
    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      },
    };

    await resellerPortalHandler.get_my_plan_po_settings(simulatedReq, mockRes);

    if (
      !capturedBody ||
      !capturedBody.data ||
      !Array.isArray(capturedBody.data.combo_kits) ||
      capturedBody.data.combo_kits.length === 0
    ) {
      return await exports.get_bde_company_combokits(req, res);
    }

    return res.status(capturedStatus).json(capturedBody);
  } catch (err) {
    console.error('[get_franchisee_po_plan_settings Error]', err);
    return await exports.get_bde_company_combokits(req, res);
  }
};

/**
 * 3. Get Eligible EPC Network for Allocation (both Franchisee-assigned & Territory EPCs)
 */
exports.get_franchisee_epc_buyers = async (req, res) => {
  try {
    const franchiseeId = req.params.franchiseeId || req.query.franchisee_id;
    const bdeId = req.user.id;

    // 1. Fetch EPCs actively assigned to this franchisee
    let relationships = [];
    if (franchiseeId && mongoose.Types.ObjectId.isValid(franchiseeId)) {
      relationships = await EpcResellerRelationship.find({
        reseller_id: franchiseeId,
        status: 'active',
      })
        .populate('epc_id')
        .lean();
    }

    const assignedEpcMap = new Map();
    relationships.forEach((r) => {
      const epc = r.epc_id;
      if (epc && (epc._id || epc.id)) {
        assignedEpcMap.set(String(epc._id || epc.id), {
          _id: epc._id,
          id: epc._id,
          epc_id: epc.epc_id || epc._id,
          company_name: epc.company_name || epc.business_name || epc.contact_person || 'EPC Partner',
          name: epc.contact_person || epc.company_name || 'EPC Partner',
          buyer_name: epc.contact_person || epc.company_name || 'EPC Partner',
          phone: epc.mobile || epc.phone || '',
          mobile: epc.mobile || epc.phone || '',
          email: epc.email || '',
          gstin: epc.gstin || epc.gst_number || '',
          district: epc.address?.district_name || epc.district || '',
          state: epc.address?.state_name || epc.state || '',
          is_assigned_to_franchise: true,
        });
      }
    });

    // 2. Also fetch active EPC accounts assigned to this franchisee or onboarded by this BDE
    const epcQuery = {
      deleted_at: null,
      $or: [
        { primary_reseller_id: franchiseeId },
        { onboarded_by_reseller_id: franchiseeId },
        { onboarded_by_bde_id: bdeId },
        { assigned_bde_id: bdeId },
      ],
    };

    const allTerritoryEpcs = await EpcAccount.find(epcQuery).lean();
    allTerritoryEpcs.forEach((epc) => {
      const eId = String(epc._id || epc.id);
      if (!assignedEpcMap.has(eId)) {
        assignedEpcMap.set(eId, {
          _id: epc._id,
          id: epc._id,
          epc_id: epc.epc_id || epc._id,
          company_name: epc.company_name || epc.business_name || epc.contact_person || 'EPC Partner',
          name: epc.contact_person || epc.company_name || 'EPC Partner',
          buyer_name: epc.contact_person || epc.company_name || 'EPC Partner',
          phone: epc.mobile || epc.phone || '',
          mobile: epc.mobile || epc.phone || '',
          email: epc.email || '',
          gstin: epc.gstin || epc.gst_number || '',
          district: epc.address?.district_name || epc.district || '',
          state: epc.address?.state_name || epc.state || '',
          is_assigned_to_franchise: false,
        });
      }
    });

    const epcList = Array.from(assignedEpcMap.values());
    return res.status(200).json({ status: 'success', data: epcList });
  } catch (err) {
    console.error('[get_franchisee_epc_buyers Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch EPC buyers', error: err.message });
  }
};

/**
 * 4. List Purchase Orders for BDE (with filtering by franchisee, category, status, search)
 */
exports.list_bde_po_orders = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { franchisee_id, epc_id, status, po_category, search } = req.query;

    const territory = await _getBdeTerritoryScope(bdeId);
    const stateName = territory?.state_name;

    const fQuery = { deleted_at: null };
    const orConds = [{ bde_id: bdeId }, { original_bde_id: bdeId }];
    if (stateName) orConds.push({ 'address.state_name': new RegExp(`^${stateName}$`, 'i') });
    fQuery.$or = orConds;

    const franchisees = await Reseller.find(fQuery).select('_id business_name reseller_code contact_person mobile address').lean();
    const fIds = franchisees.map((f) => f._id);
    const fMap = new Map(franchisees.map((f) => [f._id.toString(), f]));

    const matchQuery = {
      deleted_at: null,
      order_type: { $in: ['po_order', 'bulk_po'] },
    };

    if (epc_id && mongoose.Types.ObjectId.isValid(epc_id)) {
      matchQuery.$or = [
        { epc_id: new mongoose.Types.ObjectId(epc_id) },
        { 'customer_details.epc_id': new mongoose.Types.ObjectId(epc_id) },
        { 'items.epc_allocations.epc_buyer_id': new mongoose.Types.ObjectId(epc_id) },
        { 'items.epc_allocations.buyer_id': new mongoose.Types.ObjectId(epc_id) },
      ];
    } else if (franchisee_id && mongoose.Types.ObjectId.isValid(franchisee_id)) {
      matchQuery.$or = [{ franchisee_id }, { reseller_id: franchisee_id }];
    } else {
      matchQuery.$or = [
        { franchisee_id: { $in: fIds } },
        { reseller_id: { $in: fIds } },
        { created_by_role: 'BDE' },
        { 'status_history.changed_by': bdeId },
      ];
    }

    if (status && status !== 'ALL' && status !== 'all') {
      matchQuery.status = status.toUpperCase();
    }

    if (po_category && po_category !== 'ALL' && po_category !== 'all') {
      matchQuery.po_category = po_category.toUpperCase();
    }

    if (search && search.trim()) {
      const s = search.trim();
      matchQuery.$and = [
        {
          $or: [
            { po_number: { $regex: s, $options: 'i' } },
            { 'items.item_name': { $regex: s, $options: 'i' } },
            { 'customer_details.name': { $regex: s, $options: 'i' } },
            { 'customer_details.company_name': { $regex: s, $options: 'i' } },
            { 'items.epc_allocations.company_name': { $regex: s, $options: 'i' } },
          ],
        },
      ];
    }

    const orders = await FpoOrder.find(matchQuery)
      .populate('franchisee_id', 'business_name reseller_code contact_person mobile address')
      .populate('plan_id', 'name code')
      .populate('epc_id', 'company_name contact_person mobile gstin')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich order customer_details if missing
    orders.forEach((o) => {
      const f = o.franchisee_id || fMap.get(String(o.reseller_id));
      if (f && (!o.customer_details || !o.customer_details.name)) {
        o.customer_details = {
          name: f.business_name || f.contact_person,
          company_name: f.business_name || f.contact_person,
          mobile: f.mobile,
          district: f.address?.district_name,
          state: f.address?.state_name,
        };
      }
    });

    return res.status(200).json({ status: 'success', data: orders });
  } catch (err) {
    console.error('[list_bde_po_orders Error]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch PO orders', error: err.message });
  }
};

/**
 * 5. Create Purchase Order on behalf of Onboarded Franchisee
 */
exports.create_bde_po_order = async (req, res) => {
  try {
    const bdeId = req.user.id;
    let {
      epc_id,
      franchisee_id,
      items = [],
      target_committed_quantity,
      auto_submit,
      order_type,
      po_category,
      is_token_booking,
      destination_type,
      destination_address,
      destination_pincode,
      offline_payment,
    } = req.body;

    let epcAccount = null;
    if (epc_id && mongoose.Types.ObjectId.isValid(epc_id)) {
      epcAccount = await EpcAccount.findById(epc_id).lean();
    }

    // Optional Franchisee association (BDE creates PO for EPC on behalf of company)
    let resolvedFranchiseeId = franchisee_id || epcAccount?.primary_reseller_id || epcAccount?.onboarded_by_reseller_id || null;
    if (!resolvedFranchiseeId && epc_id) {
      const rel = await EpcResellerRelationship.findOne({ epc_id, status: 'active' }).lean();
      if (rel) resolvedFranchiseeId = rel.reseller_id;
    }

    let franchisee = null;
    if (resolvedFranchiseeId && mongoose.Types.ObjectId.isValid(resolvedFranchiseeId)) {
      franchisee = await Reseller.findOne({ _id: resolvedFranchiseeId, deleted_at: null }).lean();
    }

    const epcDisplayName = epcAccount?.gstin_trade_name || epcAccount?.gstin_legal_name || epcAccount?.name || 'Onboarded EPC';
    const epcMobile = epcAccount?.whatsapp || epcAccount?.registered_whatsapp || epcAccount?.mobile || '';

    const custDetails = {
      epc_id: epcAccount?._id || epc_id || null,
      name: epcDisplayName,
      company_name: epcDisplayName,
      buyer_name: epcAccount?.name || epcDisplayName,
      mobile: epcMobile,
      email: epcAccount?.email || '',
      gstin: epcAccount?.gstin || null,
      gst_number: epcAccount?.gstin || null,
      district: epcAccount?.district_name || epcAccount?.district || 'Regional',
      state: epcAccount?.state_name || epcAccount?.state || 'Gujarat',
      franchisee_id: resolvedFranchiseeId || null,
      franchisee_name: franchisee ? franchisee.business_name : 'SolarKits Direct (Company PO)',
    };

    const committedQty = Number(target_committed_quantity) || items[0]?.quantity || 100;

    // Compute total PO token amount (in paise)
    let poTokenAmountPaise = 0;
    const isTokenBooking = is_token_booking !== undefined ? Boolean(is_token_booking) : true;
    if (isTokenBooking) {
      if (req.body.token_amount_paise != null && Number(req.body.token_amount_paise) >= 0) {
        poTokenAmountPaise = Number(req.body.token_amount_paise);
      } else if (items[0]?.token_rate_paise != null && Number(items[0].token_rate_paise) >= 0) {
        poTokenAmountPaise = Number(items[0].token_rate_paise);
      }
    }

    // If Single PO and EPC is chosen, pre-allocate to this EPC with full PO token
    if (epcAccount && po_category !== 'COMBINE_PO' && items.length > 0) {
      if (!items[0].epc_allocations || items[0].epc_allocations.length === 0) {
        items[0].epc_allocations = [
          {
            epc_buyer_id: epcAccount._id,
            buyer_id: epcAccount._id,
            company_name: epcDisplayName,
            buyer_name: epcAccount.name || epcDisplayName,
            gstin: epcAccount.gstin || null,
            allocated_quantity: committedQty,
            token_amount_paise: poTokenAmountPaise,
            payment_status: 'PENDING',
          },
        ];
      }
    }

    const result = await createPoDraft({
      franchisee_id: resolvedFranchiseeId,
      epc_id: epcAccount?._id || epc_id || null,
      created_by_role: 'BDE',
      creator_name: req.user.full_name,
      creator_code: req.user.bde_id,
      customer_details: custDetails,
      items: Array.isArray(items) ? items : [],
      target_committed_quantity: committedQty,
      order_type: order_type || 'po_order',
      po_category: po_category || 'SINGLE_PO',
      is_token_booking: isTokenBooking,
      token_amount_paise: poTokenAmountPaise,
      destination_type: destination_type || 'hub_stock',
      destination_address: destination_address || null,
      destination_pincode: destination_pincode || null,
      offline_payment: offline_payment || null,
      actor_id: bdeId,
      req,
    });

    let finalOrder = result.order;
    if (auto_submit && finalOrder?._id && finalOrder.status !== 'PENDING_ALLOCATION') {
      finalOrder = await submitPo({
        po_id: finalOrder._id,
        franchisee_id: resolvedFranchiseeId,
        actor_id: bdeId,
        req,
      });
    }

    return res.status(201).json({
      status: 'success',
      message: finalOrder.status === 'PENDING_ALLOCATION'
        ? 'Purchase Order created. Please allocate products/EPC to proceed.'
        : 'Purchase Order created and assigned to Onboarded EPC successfully',
      data: finalOrder,
    });
  } catch (error) {
    console.error('[create_bde_po_order Error]', error);
    return res.status(400).json({ status: 'error', message: error.message || 'Failed to create PO order' });
  }
};

/**
 * 6. Allocate Products / Assign EPC to Purchase Order
 */
exports.allocate_bde_po_products = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { id } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Items array with allocated quantities is required' });
    }

    const updatedOrder = await allocatePoProducts({
      po_id: id,
      items,
      actor_id: bdeId,
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Products and EPC allocated successfully. Token payment required to start PO.',
      data: updatedOrder,
    });
  } catch (error) {
    console.error('[allocate_bde_po_products Error]', error);
    return res.status(400).json({ status: 'error', message: error.message || 'Failed to allocate products' });
  }
};

/**
 * 7. Record Token Deposit Payment
 */
exports.pay_bde_po_token = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { id } = req.params;
    const {
      epc_buyer_id,
      utr_number,
      amount_paid,
      sender_bank_name,
      payment_date,
      payment_receipt_url,
    } = req.body;

    const updatedOrder = await recordEpcTokenPayment({
      po_id: id,
      epc_buyer_id: epc_buyer_id || null,
      utr_number: utr_number ? String(utr_number).trim().toUpperCase() : 'OFFLINE_VERIFIED',
      amount_paid_inr: amount_paid,
      sender_bank_name: sender_bank_name || 'Bank Transfer',
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      payment_receipt_url: payment_receipt_url || null,
      actor_id: bdeId,
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Token payment recorded successfully. PO is now active.',
      data: updatedOrder,
    });
  } catch (error) {
    console.error('[pay_bde_po_token Error]', error);
    return res.status(400).json({ status: 'error', message: error.message || 'Failed to record token payment' });
  }
};

/**
 * 8. Validate Purchase Order (Lock Quota & Prices)
 */
exports.validate_bde_po = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { id } = req.params;

    const updatedOrder = await validatePo({
      po_id: id,
      actor_id: bdeId,
      notes: `PO Validated by BDE ${req.user.full_name || req.user.bde_id}`,
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Purchase Order validated. Price lock and reorder drawdowns are active.',
      data: updatedOrder,
    });
  } catch (error) {
    console.error('[validate_bde_po Error]', error);
    return res.status(400).json({ status: 'error', message: error.message || 'Failed to validate Purchase Order' });
  }
};

/**
 * 9. Reorder / Drawdown against Locked PO Quota
 */
exports.reorder_bde_po = async (req, res) => {
  try {
    const bdeId = req.user.id;
    const { id } = req.params;
    let {
      items,
      quantity,
      kit_id,
      destination_type,
      destination_address,
      destination_pincode,
      offline_payment,
    } = req.body;

    const parentPo = await FpoOrder.findById(id).lean();
    if (!parentPo) {
      return res.status(404).json({ status: 'error', message: 'Parent PO not found' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      const parentItem = parentPo.items?.[0] || {};
      const reorderQty = Number(quantity) || 1;
      const targetKitId = kit_id || parentItem.kit_id || parentItem.product_id;
      if (!targetKitId) {
        return res.status(400).json({ status: 'error', message: 'Kit ID or Items array is required for reorder' });
      }

      items = [{
        kit_id: targetKitId,
        product_id: targetKitId,
        item_name: parentItem.item_name || 'Solar Kit',
        item_code: parentItem.item_code || null,
        quantity: reorderQty,
        unit_price_paise: parentItem.unit_price_paise || 0,
        gst_rate: parentItem.gst_rate || 12,
        project_type_id: parentItem.project_type_id || null,
      }];
    }

    const result = await createPoDraft({
      franchisee_id: parentPo.franchisee_id,
      created_by_role: 'BDE',
      creator_name: req.user.full_name,
      creator_code: req.user.bde_id,
      items,
      order_type: 'loose_kit_order',
      parent_po_id: id,
      destination_type: destination_type || 'hub_stock',
      destination_address: destination_address || parentPo.destination_address || null,
      destination_pincode: destination_pincode || parentPo.destination_pincode || null,
      offline_payment: offline_payment || null,
      actor_id: bdeId,
      req,
    });

    let finalOrder = result.order;
    if (finalOrder?._id) {
      finalOrder = await submitPo({
        po_id: finalOrder._id,
        franchisee_id: parentPo.franchisee_id,
        actor_id: bdeId,
        req,
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Linked reorder placed successfully against PO',
      data: {
        order: finalOrder,
        token_adjustment: {
          token_adjusted_inr: Math.round((finalOrder.token_adjusted_paise || 0) / 100),
          net_payable_inr: Math.round((finalOrder.net_payable_paise || finalOrder.grand_total_paise || 0) / 100),
        },
      },
    });
  } catch (error) {
    console.error('[reorder_bde_po Error]', error);
    return res.status(400).json({ status: 'error', message: error.message || 'Failed to place reorder' });
  }
};

/**
 * 10. Get Full PO Detail
 */
exports.get_bde_po_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await FpoOrder.findById(id)
      .populate('franchisee_id', 'business_name reseller_code contact_person mobile address email gst_number')
      .populate('plan_id', 'name code order_type_allowed')
      .populate('epc_id', 'company_name contact_person mobile gstin district')
      .lean();

    if (!order) {
      return res.status(404).json({ status: 'error', message: 'PO not found' });
    }

    return res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    console.error('[get_bde_po_detail Error]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve PO detail', error: error.message });
  }
};



/**
 * 11. BDE Sidebar Counts & Live Badges
 * GET /api/india/v1/bde/sidebar-counts
 */
exports.get_sidebar_counts = async (req, res) => {
  try {
    const bdeId = req.bde?._id;
    if (!bdeId) {
      return res.status(401).json({ success: false, message: 'BDE unauthorized' });
    }

    const [unreadNotifs, epcLeadsCount, franchiseeLeadsCount] = await Promise.all([
      BDENotification.countDocuments({
        bde_id: bdeId,
        is_read: false,
      }).catch(() => 0),

      EPCLead.countDocuments({
        $or: [{ assigned_bde_id: bdeId }, { current_bde_id: bdeId }],
        deleted_at: null,
        status: { $nin: ['onboarded', 'converted'] },
      }).catch(() => 0),

      BDELead.countDocuments({
        bde_id: bdeId,
        stage: { $nin: ['converted_won', 'lost'] },
        deleted_at: null,
      }).catch(() => 0),
    ]);

    return res.status(200).json({
      success: true,
      counts: {
        unread_notifications: unreadNotifs,
        epc_leads: epcLeadsCount,
        franchisee_leads: franchiseeLeadsCount,
      },
    });
  } catch (error) {
    console.error('[get_sidebar_counts Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve BDE sidebar counts',
      error: error.message,
    });
  }
};
