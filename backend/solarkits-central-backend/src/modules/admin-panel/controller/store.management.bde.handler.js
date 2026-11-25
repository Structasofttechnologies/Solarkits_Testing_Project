/**
 * store.management.bde.handler.js
 *
 * Company Store Direct BDE Assignment & Historical Tracking Sub-Module
 * Handles:
 *  - Assigning / re-assigning BDEs directly to Company Stores
 *  - Historical timeline audit (company_store_bde_assignments)
 *  - Active BDE lookup
 */

const mongoose = require('mongoose');
const {
  Reseller,
  StoreSetup,
  StoreStatusHistory,
  CompanyStoreBdeAssignment,
  BDEProfile,
} = require('../models/india_solarshop_db');

// ─── 1. ASSIGN BDE TO COMPANY STORE ───────────────────────────────────────────
const assign_bde_to_company_store = async (req, res) => {
  try {
    const { store_id, bde_id, remarks } = req.body;
    const actorId = req.user?.id || req.user?._id || null;

    if (!store_id || !mongoose.Types.ObjectId.isValid(store_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid store_id is required.' });
    }

    if (!bde_id || !mongoose.Types.ObjectId.isValid(bde_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid bde_id is required.' });
    }

    const store = await Reseller.findById(store_id);
    if (!store || store.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Store not found.' });
    }

    const bde = await BDEProfile.findById(bde_id).lean();
    // BDE schema uses 'status' field and 'deleted_at' (not is_active/is_deleted)
    const ACTIVE_BDE_STATUSES = ['active', 'kyc_verified', 'draft', 'kyc_pending'];
    if (!bde || bde.deleted_at || (bde.status && !ACTIVE_BDE_STATUSES.includes(bde.status) && !bde.is_active)) {
      return res.status(404).json({ status: 'error', message: 'BDE profile not found or inactive.' });
    }

    const now = new Date();
    const previousBdeId = store.company_store_bde_id;

    // 1. Deactivate previous active assignment in history
    await CompanyStoreBdeAssignment.updateMany(
      { store_id: store._id, is_active: true },
      { $set: { is_active: false, effective_to: now } }
    );

    // 2. Create new active assignment record
    const newAssignment = await CompanyStoreBdeAssignment.create({
      store_id: store._id,
      bde_id: bde._id,
      assigned_by: actorId,
      effective_from: now,
      is_active: true,
      remarks: remarks ? remarks.trim() : 'Company store BDE assigned/reassigned by Admin.',
    });

    const bdeName = bde.full_name || bde.name || 'BDE';
    const bdeEmpId = bde.bde_id || bde.employee_id || 'ID N/A';
    const bdeMobile = bde.mobile_number || bde.mobile || '';

    // 3. Update Reseller document — populate both company_store_bde_id and bde_id
    store.company_store_bde_id = bde._id;
    store.company_store_bde_assigned_at = now;
    store.company_store_bde_assigned_by = actorId;
    store.bde_id = bde._id;
    await store.save();

    // 4. Update StoreSetup current BDE
    const storeSetup = await StoreSetup.findOne({ franchisee_id: store._id });
    if (storeSetup) {
      storeSetup.current_bde_id = bde._id;
      await storeSetup.save();
    }

    // 5. Record StoreStatusHistory log
    await StoreStatusHistory.create({
      store_id: store._id,
      reseller_id: store._id,
      store_setup_id: storeSetup?._id || null,
      from_status: store.reseller_lifecycle_status || 'draft',
      to_status: store.reseller_lifecycle_status || 'draft',
      actor_type: 'admin',
      actor_id: actorId,
      remarks: `Company Store BDE updated to ${bdeName} (${bdeEmpId}). ${remarks ? `Remarks: ${remarks.trim()}` : ''}`,
      metadata: {
        previous_bde_id: previousBdeId,
        new_bde_id: bde._id,
        new_bde_name: bdeName,
      },
    });

    return res.json({
      status: 'success',
      data: {
        store_id: store._id,
        bde: {
          id: bde._id,
          name: bdeName,
          full_name: bdeName,
          employee_id: bdeEmpId,
          bde_id: bdeEmpId,
          mobile: bdeMobile,
          email: bde.email,
        },
        assigned_at: now,
        assignment_id: newAssignment._id,
      },
      message: `BDE ${bdeName} assigned to Company Store successfully.`,
    });
  } catch (error) {
    console.error('[store.management.bde] assign_bde_to_company_store error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to assign BDE.' });
  }
};

// ─── 2. GET COMPANY STORE BDE ASSIGNMENT HISTORY ──────────────────────────────
const get_company_store_bde_history = async (req, res) => {
  try {
    const { store_id } = req.params;
    if (!store_id || !mongoose.Types.ObjectId.isValid(store_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid store_id is required.' });
    }

    const history = await CompanyStoreBdeAssignment.find({ store_id })
      .populate('bde_id', 'name employee_id mobile email')
      .populate('assigned_by', 'name email')
      .sort({ effective_from: -1 })
      .lean();

    const data = history.map((item) => ({
      id: item._id,
      bde: item.bde_id ? {
        id: item.bde_id._id,
        name: item.bde_id.name,
        employee_id: item.bde_id.employee_id,
        mobile: item.bde_id.mobile,
        email: item.bde_id.email,
      } : null,
      assigned_by: item.assigned_by ? {
        id: item.assigned_by._id,
        name: item.assigned_by.name,
      } : null,
      effective_from: item.effective_from,
      effective_to: item.effective_to,
      is_active: item.is_active,
      remarks: item.remarks,
      created_at: item.created_at,
    }));

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[store.management.bde] get_company_store_bde_history error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch BDE history.' });
  }
};

// ─── 3. LIST AVAILABLE BDES ───────────────────────────────────────────────────
const list_available_bdes = async (req, res) => {
  try {
    const rows = await BDEProfile.find({
      deleted_at: null,
      $or: [
        { status: { $in: ['active', 'kyc_verified', 'draft', 'kyc_pending'] } },
        { status: { $exists: false } },
        { is_active: true },
      ],
    })
      .select('bde_id full_name email mobile_number status profile_photo name employee_id mobile')
      .sort({ full_name: 1, name: 1 })
      .lean();

    const data = rows.map((b) => ({
      id: b._id,
      _id: b._id,
      name: b.full_name || b.name || 'BDE',
      full_name: b.full_name || b.name || 'BDE',
      employee_id: b.bde_id || b.employee_id || 'BDE',
      bde_id: b.bde_id || b.employee_id || 'BDE',
      mobile: b.mobile_number || b.mobile || '',
      mobile_number: b.mobile_number || b.mobile || '',
      email: b.email || '',
      status: b.status || 'active',
    }));

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[store.management.bde] list_available_bdes error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch BDEs.' });
  }
};

module.exports = {
  assign_bde_to_company_store,
  get_company_store_bde_history,
  list_available_bdes,
};
