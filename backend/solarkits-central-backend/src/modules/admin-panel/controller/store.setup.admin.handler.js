/**
 * store.setup.admin.handler.js
 *
 * Controller handler for Admin Store Setup, Checklist, Delays, Verification,
 * Operations Start, Expansion Planning, and Performance Ranking.
 */

const mongoose = require('mongoose');
const {
  StoreSetup,
  StoreSetupSetting,
  StoreSetupChecklist,
  StoreSetupDelay,
  StoreSetupVerification,
  ExpansionPlan,
  Reseller,
  ResellerPlan,
  BDEProfile,
  AuditLog,
  FranchiseeTargetProgress,
  FpoOrder,
} = require('../models/india_solarshop_db');
const { CmsUser } = require('../models/user_db');
const {
  getOrCreateSettings,
  calculateStoreSetupProgress,
  startFranchiseeOperations,
  evaluateDelaysAndReminders,
  updateBdePerformanceMetrics,
  syncActiveStoreSetupsWithMasterSettings,
  ensureStoreSetupChecklist,
} = require('../services/store.setup.service');

// ── 1. DASHBOARD STATS ────────────────────────────────────────────────────────
const get_dashboard_stats = async (req, res) => {
  try {
    // Run delay & reminder evaluator
    await evaluateDelaysAndReminders();

    const [
      total,
      not_started,
      employee_assigned,
      in_progress,
      due_soon,
      delayed,
      delay_approval_pending,
      setup_completed,
      admin_verification_pending,
      correction_required,
      admin_verified,
      operations_started,
      recent_setups,
    ] = await Promise.all([
      StoreSetup.countDocuments(),
      StoreSetup.countDocuments({ status: 'not_started' }),
      StoreSetup.countDocuments({ status: 'employee_assigned' }),
      StoreSetup.countDocuments({ status: { $in: ['in_progress', 'on_track'] } }),
      StoreSetup.countDocuments({ status: 'due_soon' }),
      StoreSetup.countDocuments({ status: 'delayed' }),
      StoreSetup.countDocuments({ status: 'delay_approval_pending' }),
      StoreSetup.countDocuments({ status: 'setup_completed' }),
      StoreSetup.countDocuments({ status: 'admin_verification_pending' }),
      StoreSetup.countDocuments({ status: 'correction_required' }),
      StoreSetup.countDocuments({ status: 'admin_verified' }),
      StoreSetup.countDocuments({ status: 'operations_started' }),
      StoreSetup.find({})
        .sort({ created_at: -1 })
        .limit(6)
        .populate('current_bde_id', 'full_name bde_id')
        .populate('assigned_employee_id', 'name email phone')
        .lean(),
    ]);

    return res.json({
      status: 'success',
      data: {
        total_stores: total,
        not_started,
        employee_assigned,
        in_progress,
        due_soon,
        delayed,
        delay_approval_pending,
        setup_completed,
        admin_verification_pending,
        correction_required,
        admin_verified,
        operations_started,
        recent_setups,
      },
    });
  } catch (error) {
    console.error('[store.setup.admin] get_dashboard_stats error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 2. LIST & SEARCH STORE SETUPS ─────────────────────────────────────────────
const list_store_setups = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      state_id,
      district_id,
      plan_id,
      bde_id,
      assigned_employee_id,
      status,
      delay_status,
      operations_status,
      start_date,
      end_date,
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { store_setup_id: regex },
        { franchisee_name: regex },
        { gst_number: regex },
        { mobile: regex },
        { email: regex },
      ];
    }

    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) query.state_id = state_id;
    if (district_id && mongoose.Types.ObjectId.isValid(district_id)) query.district_id = district_id;
    if (plan_id && mongoose.Types.ObjectId.isValid(plan_id)) query.plan_id = plan_id;
    if (bde_id && mongoose.Types.ObjectId.isValid(bde_id)) query.current_bde_id = bde_id;
    if (assigned_employee_id && mongoose.Types.ObjectId.isValid(assigned_employee_id)) query.assigned_employee_id = assigned_employee_id;
    if (status) query.status = status;

    if (delay_status === 'delayed') {
      query.$or = [{ status: 'delayed' }, { delay_days: { $gt: 0 } }];
    } else if (delay_status === 'on_track') {
      query.delay_days = 0;
      query.status = { $ne: 'delayed' };
    }

    if (operations_status === 'operational') {
      query.status = 'operations_started';
    } else if (operations_status === 'in_setup') {
      query.status = { $ne: 'operations_started' };
    }

    if (start_date || end_date) {
      query.setup_start_date = {};
      if (start_date) query.setup_start_date.$gte = new Date(start_date);
      if (end_date) query.setup_start_date.$lte = new Date(end_date);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, setups] = await Promise.all([
      StoreSetup.countDocuments(query),
      StoreSetup.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('current_bde_id', 'full_name bde_id')
        .populate('assigned_employee_id', 'name email phone')
        .lean(),
    ]);

    return res.json({
      status: 'success',
      data: setups,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('[store.setup.admin] list_store_setups error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 3. GET STORE SETUP DETAIL ─────────────────────────────────────────────────
const get_store_setup_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const setup = await StoreSetup.findById(id)
      .populate('franchisee_id')
      .populate('current_bde_id', 'full_name bde_id email mobile_number')
      .populate('original_bde_id', 'full_name bde_id')
      .populate('assigned_employee_id', 'name email phone')
      .lean();

    if (!setup) {
      return res.status(404).json({ status: 'error', message: 'Store Setup not found' });
    }

    // Fetch checklist snapshot items grouped by category
    let checklistItems = await StoreSetupChecklist.find({ store_setup_id: setup._id })
      .sort({ display_order: 1 })
      .lean();

    if (!checklistItems || checklistItems.length === 0) {
      checklistItems = await ensureStoreSetupChecklist(setup._id, setup.franchisee_id?._id || setup.franchisee_id);
    }

    // Fetch delay requests
    const delays = await StoreSetupDelay.find({ store_setup_id: setup._id })
      .sort({ created_at: -1 })
      .lean();

    // Fetch verification history
    const verifications = await StoreSetupVerification.find({ store_setup_id: setup._id })
      .sort({ cycle_number: -1 })
      .lean();

    // Recalculate live progress
    const progress = await calculateStoreSetupProgress(setup._id);

    return res.json({
      status: 'success',
      data: {
        setup: {
          ...setup,
          ...progress,
        },
        checklist: checklistItems,
        delays,
        verifications,
      },
    });
  } catch (error) {
    console.error('[store.setup.admin] get_store_setup_detail error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 3.5. LIST STATE COORDINATORS (BDEs & Field Reps) ──────────────────────────
const list_coordinators = async (req, res) => {
  try {
    const { state_id, search } = req.query;

    const query = { deleted_at: null };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { full_name: regex },
        { email: regex },
        { mobile_number: regex },
        { bde_id: regex },
      ];
    }

    const bdes = await BDEProfile.find(query)
      .select('bde_id full_name email mobile_number state_id state_name district_id district_name assigned_districts status kyc_status profile_photo')
      .sort({ full_name: 1 })
      .lean();

    const formatted = bdes.map((b) => ({
      _id: b._id,
      id: b._id.toString(),
      bde_id: b.bde_id,
      name: `${b.full_name} (${b.bde_id})`,
      full_name: b.full_name,
      email: b.email,
      phone: b.mobile_number,
      mobile_number: b.mobile_number,
      state_id: b.state_id,
      state_name: b.state_name,
      district_id: b.district_id,
      district_name: b.district_name,
      assigned_districts: b.assigned_districts || [],
      assigned_districts_count: b.assigned_districts?.length || 0,
      status: b.status,
      kyc_status: b.kyc_status,
      profile_photo: b.profile_photo,
      is_state_match: state_id && b.state_id ? b.state_id.toString() === state_id.toString() : false,
    }));

    return res.json({
      status: 'success',
      data: formatted,
      coordinators: formatted,
      users: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error('[store.setup.admin] list_coordinators error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 4. ASSIGN STATE EMPLOYEE / BDE ─────────────────────────────────────────────
const assign_employee = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, notes } = req.body;

    const setup = await StoreSetup.findById(id);
    if (!setup) return res.status(404).json({ status: 'error', message: 'Store Setup not found' });

    let employeeDoc = null;
    let isBde = false;

    if (employee_id) {
      // 1. Look up in BDE Profiles
      employeeDoc = await BDEProfile.findById(employee_id);
      if (employeeDoc) {
        isBde = true;
        setup.assigned_employee_id = employeeDoc._id;
        setup.assigned_employee_name = `${employeeDoc.full_name} (${employeeDoc.bde_id})`;
        setup.assigned_employee_email = employeeDoc.email;
        setup.assigned_employee_phone = employeeDoc.mobile_number;
        setup.current_bde_id = employeeDoc._id;
      } else {
        // 2. Fallback to CMS User
        const cmsDoc = await CmsUser.findById(employee_id);
        if (cmsDoc) {
          setup.assigned_employee_id = cmsDoc._id;
          setup.assigned_employee_name = cmsDoc.name;
          setup.assigned_employee_email = cmsDoc.email;
          setup.assigned_employee_phone = cmsDoc.phone;
          employeeDoc = cmsDoc;
        } else {
          return res.status(404).json({ status: 'error', message: 'Selected BDE Coordinator not found' });
        }
      }
    }

    setup.employee_assigned_at = employeeDoc ? new Date() : null;

    if (employeeDoc && setup.status === 'not_started') {
      setup.status = 'employee_assigned';
    }

    if (notes) setup.employee_remarks = notes;
    await setup.save();

    await AuditLog.create({
      actor_type: 'cms_user',
      actor_id: req.user?.id || req.user?._id || null,
      action: 'STORE_SETUP_EMPLOYEE_ASSIGNED',
      entity_type: 'store_setups',
      entity_id: setup._id,
      after_snapshot: {
        assigned_employee_id: setup.assigned_employee_id,
        assigned_employee_name: setup.assigned_employee_name,
        status: setup.status,
      },
      req,
    });

    return res.json({
      status: 'success',
      message: `State Coordinator / BDE "${setup.assigned_employee_name}" assigned to store setup ${setup.store_setup_id}`,
      data: setup,
    });
  } catch (error) {
    console.error('[store.setup.admin] assign_employee error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 5. REVIEW DELAY REQUEST ───────────────────────────────────────────────────
const review_delay_request = async (req, res) => {
  try {
    const { delay_id } = req.params;
    const { decision, approved_days = 0, admin_remarks } = req.body;

    const delay = await StoreSetupDelay.findById(delay_id);
    if (!delay) return res.status(404).json({ status: 'error', message: 'Delay request not found' });

    const setup = await StoreSetup.findById(delay.store_setup_id);
    if (!setup) return res.status(404).json({ status: 'error', message: 'Store Setup not found' });

    const adminId = req.user?.id || req.user?._id || null;
    delay.decision_status = decision;
    delay.decision_by = adminId;
    delay.decision_at = new Date();
    delay.admin_remarks = admin_remarks || '';

    if (decision === 'approved') {
      const daysToAdd = Number(approved_days) || delay.additional_days_requested || 0;
      delay.approved_additional_days = daysToAdd;

      const baseDate = setup.revised_completion_date
        ? new Date(setup.revised_completion_date)
        : new Date(setup.original_completion_date);

      const newRevisedDate = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
      delay.approved_revised_date = newRevisedDate;
      setup.revised_completion_date = newRevisedDate;
      setup.status = 'delay_approved';
    } else if (decision === 'rejected') {
      setup.status = 'delay_rejected';
    } else if (decision === 'clarification_requested') {
      setup.status = 'delay_approval_pending';
    }

    await delay.save();
    await setup.save();

    await calculateStoreSetupProgress(setup._id);

    return res.json({
      status: 'success',
      message: `Delay request ${decision} successfully`,
      data: { delay, setup },
    });
  } catch (error) {
    console.error('[store.setup.admin] review_delay_request error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 6. REVIEW FINAL VERIFICATION ──────────────────────────────────────────────
const review_final_verification = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, admin_remarks, correction_items = [] } = req.body;

    const setup = await StoreSetup.findById(id);
    if (!setup) return res.status(404).json({ status: 'error', message: 'Store Setup not found' });

    const adminId = req.user?.id || req.user?._id || null;

    if (action === 'approve') {
      setup.status = 'admin_verified';
      setup.admin_verified_at = new Date();
      setup.admin_verified_by = adminId;
      setup.admin_remarks = admin_remarks || 'Store setup verified and approved for launch.';
      await setup.save();

      // Ensure franchisee's GST is recorded as verified upon Admin Store Verification approval
      if (setup.franchisee_id) {
        const reseller = await Reseller.findById(setup.franchisee_id);
        if (reseller && reseller.gst_number && !reseller.gst_verified_at) {
          reseller.gst_verified_at = new Date();
          reseller.gst_registration_status = reseller.gst_registration_status || 'ACTIVE';
          await reseller.save();
        }
      }

      // Record verification cycle
      await StoreSetupVerification.create({
        store_setup_id: setup._id,
        franchisee_id: setup.franchisee_id,
        cycle_number: (await StoreSetupVerification.countDocuments({ store_setup_id: setup._id })) + 1,
        submitted_by: setup.assigned_employee_id || adminId,
        submitted_by_name: setup.assigned_employee_name || 'Admin',
        admin_decision: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date(),
        admin_remarks: setup.admin_remarks,
      });

      return res.json({
        status: 'success',
        message: 'Store setup successfully verified by Admin! Ready to start operations.',
        data: setup,
      });
    } else {
      // Send back for correction
      if (!admin_remarks || !admin_remarks.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Admin remarks explaining required corrections are mandatory.',
        });
      }

      setup.status = 'correction_required';
      setup.admin_remarks = admin_remarks;
      await setup.save();

      // Flag specific checklist items as correction_required if provided
      if (correction_items.length > 0) {
        await StoreSetupChecklist.updateMany(
          { store_setup_id: setup._id, _id: { $in: correction_items } },
          { $set: { admin_verification_status: 'correction_required', status: 'in_progress' } }
        );
      }

      await StoreSetupVerification.create({
        store_setup_id: setup._id,
        franchisee_id: setup.franchisee_id,
        cycle_number: (await StoreSetupVerification.countDocuments({ store_setup_id: setup._id })) + 1,
        submitted_by: setup.assigned_employee_id || adminId,
        submitted_by_name: setup.assigned_employee_name || 'Admin',
        admin_decision: 'correction_required',
        reviewed_by: adminId,
        reviewed_at: new Date(),
        admin_remarks: admin_remarks,
        correction_items: correction_items,
      });

      return res.json({
        status: 'success',
        message: 'Store setup sent back for correction with mandatory remarks.',
        data: setup,
      });
    }
  } catch (error) {
    console.error('[store.setup.admin] review_final_verification error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 7. START OPERATIONS ───────────────────────────────────────────────────────
const start_operations = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id || null;

    const result = await startFranchiseeOperations(id, adminId);

    return res.json({
      status: 'success',
      message: 'Franchisee retail store operations officially activated! Partner is now live and performance tracking is running.',
      data: result,
    });
  } catch (error) {
    console.error('[store.setup.admin] start_operations error:', error);
    return res.status(400).json({ status: 'error', message: error.message || 'Failed to start operations' });
  }
};

// ── 8. SETTINGS & CHECKLIST MASTER TEMPLATE ───────────────────────────────────
const get_settings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return res.json({ status: 'success', data: settings });
  } catch (error) {
    console.error('[store.setup.admin] get_settings error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

const update_settings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const {
      default_setup_days,
      due_soon_threshold_days,
      master_checklist_activities,
      checklist_categories,
    } = req.body;

    if (default_setup_days) settings.default_setup_days = Number(default_setup_days);
    if (due_soon_threshold_days) settings.due_soon_threshold_days = Number(due_soon_threshold_days);
    if (checklist_categories) settings.checklist_categories = checklist_categories;
    if (master_checklist_activities) settings.master_checklist_activities = master_checklist_activities;

    settings.updated_by = req.user?.id || req.user?._id || null;
    await settings.save();

    // Auto-sync active setups if requested
    let syncResult = null;
    if (req.body.auto_sync_active_setups) {
      syncResult = await syncActiveStoreSetupsWithMasterSettings(req.user?.id || req.user?._id || null);
    }

    return res.json({
      status: 'success',
      message: 'Store setup document settings updated successfully' + (syncResult ? ` and synced across ${syncResult.synced_setups_count} active store setup(s).` : ''),
      data: settings,
      sync_result: syncResult,
    });
  } catch (error) {
    console.error('[store.setup.admin] update_settings error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

const sync_active_setups = async (req, res) => {
  try {
    const actorId = req.user?.id || req.user?._id || null;
    const syncResult = await syncActiveStoreSetupsWithMasterSettings(actorId);
    return res.json({
      status: 'success',
      message: `Master document settings synced across ${syncResult.synced_setups_count} active store setup(s). Added ${syncResult.items_added_total} new checklist item(s).`,
      data: syncResult,
    });
  } catch (error) {
    console.error('[store.setup.admin] sync_active_setups error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 9. EXPANSION PLANS CRUD & TRACKING ────────────────────────────────────────
const list_expansion_plans = async (req, res) => {
  try {
    const { financial_year, state_id, quarter, status } = req.query;
    const query = {};
    if (financial_year) query.financial_year = financial_year;
    if (state_id) query.state_id = state_id;
    if (quarter) query.quarter = Number(quarter);
    if (status) query.status = status;

    const plans = await ExpansionPlan.find(query)
      .sort({ created_at: -1 })
      .populate('assigned_bde_id', 'full_name bde_id')
      .lean();

    // Calculate real-time actuals for each expansion plan
    const enriched = await Promise.all(
      plans.map(async (p) => {
        const stateQuery = p.state_id ? { 'address.state_id': p.state_id } : {};
        const bdeQuery = p.assigned_bde_id ? { $or: [{ bde_id: p.assigned_bde_id._id }, { original_bde_id: p.assigned_bde_id._id }] } : {};

        const [signups, feePaid, operational] = await Promise.all([
          Reseller.countDocuments({ ...stateQuery, ...bdeQuery, deleted_at: null }),
          Reseller.countDocuments({ ...stateQuery, ...bdeQuery, fee_payment_status: 'verified', deleted_at: null }),
          Reseller.countDocuments({ ...stateQuery, ...bdeQuery, is_operational: true, deleted_at: null }),
        ]);

        const achievementPct = p.target_operational_stores > 0
          ? Math.min(100, Math.round((operational / p.target_operational_stores) * 100))
          : 0;

        let statusCalc = p.status;
        if (achievementPct >= 100) statusCalc = 'COMPLETED';
        else if (achievementPct >= 60) statusCalc = 'ON_TRACK';
        else if (achievementPct >= 30) statusCalc = 'AT_RISK';
        else statusCalc = 'BEHIND_TARGET';

        return {
          ...p,
          actual_signups: signups,
          actual_fee_paid: feePaid,
          actual_operational_stores: operational,
          achievement_pct: achievementPct,
          status: statusCalc,
        };
      })
    );

    return res.json({ status: 'success', data: enriched });
  } catch (error) {
    console.error('[store.setup.admin] list_expansion_plans error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

const create_expansion_plan = async (req, res) => {
  try {
    const {
      title,
      financial_year = '2026-2027',
      period_type = 'quarterly',
      quarter = 3,
      month,
      state_id,
      state_name,
      district_ids = [],
      district_names = [],
      plan_ids = [],
      plan_names = [],
      assigned_bde_id,
      assigned_bde_name,
      target_signups = 10,
      target_fee_paid = 8,
      target_operational_stores = 5,
      start_date,
      end_date,
      priority = 'high',
      notes,
    } = req.body;

    const count = await ExpansionPlan.countDocuments();
    const planCode = `EXP-${financial_year.split('-')[0]}-Q${quarter}-${String(count + 1).padStart(3, '0')}`;

    const newPlan = await ExpansionPlan.create({
      plan_code: planCode,
      title: title || `Solar Store Expansion Plan - ${state_name || 'Regional'}`,
      financial_year,
      period_type,
      quarter,
      month: month || undefined,
      state_id: state_id || null,
      state_name: state_name || null,
      district_ids,
      district_names,
      plan_ids,
      plan_names,
      assigned_bde_id: assigned_bde_id || null,
      assigned_bde_name: assigned_bde_name || null,
      target_signups: Number(target_signups),
      target_fee_paid: Number(target_fee_paid),
      target_operational_stores: Number(target_operational_stores),
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)),
      priority,
      notes,
      created_by: req.user?.id || req.user?._id || null,
    });

    return res.json({ status: 'success', message: 'Expansion plan created successfully', data: newPlan });
  } catch (error) {
    console.error('[store.setup.admin] create_expansion_plan error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 10. FRANCHISEE PERFORMANCE RANKING ─────────────────────────────────────────
const get_franchisee_performance_ranking = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), state_id } = req.query;

    const query = { is_operational: true, deleted_at: null };
    if (state_id) query['address.state_id'] = state_id;

    const operationalFranchisees = await Reseller.find(query)
      .populate('bde_id', 'full_name bde_id')
      .lean();

    const ranked = await Promise.all(
      operationalFranchisees.map(async (f) => {
        // Target progress
        const targetProgress = await FranchiseeTargetProgress.findOne({
          franchisee_id: f._id,
          target_month: Number(month),
          target_year: Number(year),
        }).lean();

        // PO Order Volume
        const orders = await FpoOrder.find({
          reseller_id: f._id,
          payment_status: { $in: ['captured', 'paid'] },
        }).lean();

        const totalOrdersVolume = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const kitsDelivered = targetProgress?.delivered_quantity || 0;
        const targetKits = targetProgress?.target_quantity || 10;
        const achievementPct = targetProgress?.achievement_pct || Math.round((kitsDelivered / targetKits) * 100);

        // Performance Tiering Rule:
        // Top Performer: >= 100% target or >= 500,000 INR order volume
        // Good Performer: >= 75% target
        // Average: >= 40% target
        // Under Performer: > 0% target
        // Critical / No Activity: 0% target and no orders
        let category = 'Average';
        let badgeColor = 'blue';

        if (achievementPct >= 100 || totalOrdersVolume >= 500000) {
          category = 'Top Performer';
          badgeColor = 'emerald';
        } else if (achievementPct >= 75) {
          category = 'Good Performer';
          badgeColor = 'teal';
        } else if (achievementPct >= 40) {
          category = 'Average';
          badgeColor = 'amber';
        } else if (achievementPct > 0 || totalOrdersVolume > 0) {
          category = 'Under Performer';
          badgeColor = 'orange';
        } else {
          category = 'Critical / No Activity';
          badgeColor = 'red';
        }

        return {
          franchisee_id: f._id,
          business_name: f.business_name,
          contact_person: f.contact_person,
          mobile: f.mobile,
          state_name: f.address?.state_name || f.state_name || 'Regional State',
          district_name: f.address?.district_name || f.district_name || 'Regional District',
          bde_name: f.bde_id?.full_name || 'Unassigned BDE',
          target_kits: targetKits,
          kits_delivered: kitsDelivered,
          achievement_pct: achievementPct,
          total_po_volume: totalOrdersVolume,
          orders_count: orders.length,
          category,
          badgeColor,
        };
      })
    );

    // Sort by achievement and order volume descending
    ranked.sort((a, b) => b.achievement_pct - a.achievement_pct || b.total_po_volume - a.total_po_volume);

    return res.json({
      status: 'success',
      data: {
        total_operational_stores: ranked.length,
        top_performers: ranked.filter(r => r.category === 'Top Performer').length,
        good_performers: ranked.filter(r => r.category === 'Good Performer').length,
        average_performers: ranked.filter(r => r.category === 'Average').length,
        under_performers: ranked.filter(r => r.category === 'Under Performer').length,
        critical_no_activity: ranked.filter(r => r.category === 'Critical / No Activity').length,
        ranking: ranked,
      },
    });
  } catch (error) {
    console.error('[store.setup.admin] get_franchisee_performance_ranking error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

module.exports = {
  get_dashboard_stats,
  list_store_setups,
  get_store_setup_detail,
  list_coordinators,
  assign_employee,
  review_delay_request,
  review_final_verification,
  start_operations,
  get_settings,
  update_settings,
  sync_active_setups,
  list_expansion_plans,
  create_expansion_plan,
  get_franchisee_performance_ranking,
};
