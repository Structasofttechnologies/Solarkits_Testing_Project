/**
 * store.setup.employee.handler.js
 *
 * Controller handler for State-Level Employee Store Setup workflows.
 * Scoped strictly to assigned Store Setup records, states, and districts.
 */

const mongoose = require('mongoose');
const {
  StoreSetup,
  StoreSetupChecklist,
  StoreSetupDelay,
  StoreSetupVerification,
  AuditLog,
} = require('../models/india_solarshop_db');
const { calculateStoreSetupProgress } = require('../services/store.setup.service');

// ── 1. LIST ASSIGNED SETUPS ───────────────────────────────────────────────────
const list_assigned_setups = async (req, res) => {
  try {
    const employeeId = req.user?.id || req.user?._id;
    const { status, search } = req.query;

    const query = {
      $or: [
        { assigned_employee_id: employeeId },
        { assigned_employee_email: req.user?.email },
      ],
    };

    if (status) query.status = status;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { store_setup_id: regex },
            { franchisee_name: regex },
            { district_name: regex },
          ],
        },
      ];
    }

    const setups = await StoreSetup.find(query)
      .sort({ created_at: -1 })
      .populate('current_bde_id', 'full_name bde_id')
      .lean();

    return res.json({ status: 'success', data: setups });
  } catch (error) {
    console.error('[store.setup.employee] list_assigned_setups error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 2. START SETUP ────────────────────────────────────────────────────────────
const start_setup = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user?.id || req.user?._id;

    const setup = await StoreSetup.findById(id);
    if (!setup) return res.status(404).json({ status: 'error', message: 'Store Setup not found' });

    if (setup.status === 'not_started' || setup.status === 'employee_assigned') {
      setup.status = 'in_progress';
      await setup.save();
    }

    await AuditLog.create({
      actor_type: 'cms_user',
      actor_id: employeeId,
      action: 'STORE_SETUP_STARTED_BY_EMPLOYEE',
      entity_type: 'store_setups',
      entity_id: setup._id,
      after_snapshot: { status: setup.status },
      req,
    });

    return res.json({
      status: 'success',
      message: `Store setup ${setup.store_setup_id} marked as In Progress.`,
      data: setup,
    });
  } catch (error) {
    console.error('[store.setup.employee] start_setup error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 3. UPDATE CHECKLIST ACTIVITY ──────────────────────────────────────────────
const update_checklist_activity = async (req, res) => {
  try {
    const { id, activity_id } = req.params;
    const { status, employee_remarks, proofs = [] } = req.body;
    const employeeId = req.user?.id || req.user?._id;

    const setup = await StoreSetup.findById(id);
    if (!setup) return res.status(404).json({ status: 'error', message: 'Store Setup not found' });

    const item = await StoreSetupChecklist.findOne({
      _id: activity_id,
      store_setup_id: setup._id,
    });

    if (!item) return res.status(404).json({ status: 'error', message: 'Checklist activity item not found' });

    if (status) item.status = status;
    if (employee_remarks !== undefined) item.employee_remarks = employee_remarks;

    let newProofs = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      newProofs = req.files.map(f => ({
        url: f.path || f.secure_url || f.location || `/uploads/${f.filename}`,
        filename: f.originalname || f.filename || 'proof_image.jpg',
        file_type: f.mimetype?.startsWith('image') ? 'image' : 'document',
        uploaded_at: new Date(),
        uploaded_by: employeeId,
      }));
    } else if (req.file) {
      newProofs.push({
        url: req.file.path || req.file.secure_url || req.file.location || `/uploads/${req.file.filename}`,
        filename: req.file.originalname || req.file.filename || 'proof_image.jpg',
        file_type: req.file.mimetype?.startsWith('image') ? 'image' : 'document',
        uploaded_at: new Date(),
        uploaded_by: employeeId,
      });
    } else {
      // Only check body if no files were uploaded via multipart
      let parsedProofs = proofs;
      if (typeof proofs === 'string') {
        try { parsedProofs = JSON.parse(proofs); } catch (e) { parsedProofs = [proofs]; }
      }
      if (Array.isArray(parsedProofs) && parsedProofs.length > 0) {
        const formatted = parsedProofs.map(p => ({
          url: typeof p === 'string' ? p : p.url,
          filename: typeof p === 'string' ? 'proof_document.jpg' : (p.filename || 'proof_document.jpg'),
          file_type: typeof p === 'string' ? 'image' : (p.file_type || 'image'),
          uploaded_at: new Date(),
          uploaded_by: employeeId,
        }));
        newProofs = [...newProofs, ...formatted];
      } else if (req.body.proof_url) {
        newProofs.push({
          url: req.body.proof_url,
          filename: 'proof_photo.jpg',
          file_type: 'image',
          uploaded_at: new Date(),
          uploaded_by: employeeId,
        });
      }
    }

    if (req.body.clear_proofs === 'true' || req.body.clear_proofs === true) {
      item.proofs = [];
      if (status === 'completed' && item.proof_required) {
        item.status = 'in_progress';
      }
    } else if (req.body.replace_proofs === 'true' || req.body.replace_proofs === true) {
      if (newProofs.length > 0) {
        item.proofs = newProofs;
      }
    } else if (newProofs.length > 0) {
      const combined = [...(item.proofs || []), ...newProofs];
      // Deduplicate by URL
      const uniqueMap = new Map();
      combined.forEach(p => {
        if (p && p.url && !uniqueMap.has(p.url)) {
          uniqueMap.set(p.url, p);
        }
      });
      item.proofs = Array.from(uniqueMap.values());
    }

    if (status === 'completed') {
      // Validate proof requirement
      if (item.proof_required && (!item.proofs || item.proofs.length === 0)) {
        return res.status(400).json({
          status: 'error',
          message: `Activity "${item.title}" requires at least one proof/photo upload before marking completed.`,
        });
      }
      item.completed_at = new Date();
      item.completed_by = employeeId;
      item.admin_verification_status = 'pending';
    }

    await item.save();

    // Recalculate progress for the store setup
    const progress = await calculateStoreSetupProgress(setup._id);

    return res.json({
      status: 'success',
      message: `Activity "${item.title}" updated successfully`,
      data: {
        item,
        progress,
      },
    });
  } catch (error) {
    console.error('[store.setup.employee] update_checklist_activity error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 4. SUBMIT DELAY REQUEST ───────────────────────────────────────────────────
const submit_delay_request = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reason,
      description,
      responsible_party,
      supporting_proof_urls = [],
      corrective_action,
      additional_days_requested,
    } = req.body;

    const setup = await StoreSetup.findById(id);
    if (!setup) return res.status(404).json({ status: 'error', message: 'Store Setup not found' });

    if (!reason || !description || !corrective_action || !additional_days_requested) {
      return res.status(400).json({
        status: 'error',
        message: 'Reason, description, corrective action, and additional days requested are mandatory.',
      });
    }

    const employeeId = req.user?.id || req.user?._id;
    const employeeName = req.user?.name || setup.assigned_employee_name || 'State Employee';

    const baseDate = setup.revised_completion_date
      ? new Date(setup.revised_completion_date)
      : new Date(setup.original_completion_date);

    const proposedRevisedDate = new Date(baseDate.getTime() + (Number(additional_days_requested) * 24 * 60 * 60 * 1000));

    const delayRequest = await StoreSetupDelay.create({
      store_setup_id: setup._id,
      franchisee_id: setup.franchisee_id,
      requested_by: employeeId,
      requested_by_name: employeeName,
      reason,
      description,
      responsible_party: responsible_party || 'civil_work',
      supporting_proof_urls,
      corrective_action,
      additional_days_requested: Number(additional_days_requested),
      original_completion_date: baseDate,
      proposed_revised_date: proposedRevisedDate,
      decision_status: 'pending',
    });

    setup.status = 'delay_approval_pending';
    await setup.save();

    await AuditLog.create({
      actor_type: 'cms_user',
      actor_id: employeeId,
      action: 'STORE_SETUP_DELAY_REQUEST_SUBMITTED',
      entity_type: 'store_setups',
      entity_id: setup._id,
      after_snapshot: {
        delay_id: delayRequest._id,
        additional_days: additional_days_requested,
        proposed_date: proposedRevisedDate,
      },
      req,
    });

    return res.json({
      status: 'success',
      message: `Delay extension request for ${additional_days_requested} day(s) submitted for Admin approval.`,
      data: delayRequest,
    });
  } catch (error) {
    console.error('[store.setup.employee] submit_delay_request error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ── 5. SUBMIT FOR ADMIN VERIFICATION ──────────────────────────────────────────
const submit_for_admin_verification = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_final_remarks } = req.body;
    const employeeId = req.user?.id || req.user?._id;
    const employeeName = req.user?.name || 'State Employee';

    const setup = await StoreSetup.findById(id);
    if (!setup) return res.status(404).json({ status: 'error', message: 'Store Setup not found' });

    // Validate Checklist: all mandatory items must be completed with proofs
    const checklist = await StoreSetupChecklist.find({ store_setup_id: setup._id });
    const incompleteMandatory = checklist.filter(c => c.is_mandatory && c.status !== 'completed');

    if (incompleteMandatory.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot submit for verification: ${incompleteMandatory.length} mandatory checklist activity(ies) are still pending: ${incompleteMandatory.map(i => i.title).join(', ')}`,
      });
    }

    // Validate delay approvals: ensure no pending unapproved delay request
    const pendingDelays = await StoreSetupDelay.find({
      store_setup_id: setup._id,
      decision_status: 'pending',
    });

    if (pendingDelays.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot submit for verification: There is an unresolved timeline extension request pending Admin decision.',
      });
    }

    setup.status = 'admin_verification_pending';
    setup.employee_remarks = employee_final_remarks || setup.employee_remarks;
    setup.franchisee_confirmation_status = true;
    setup.franchisee_confirmed_at = new Date();
    await setup.save();

    const cycleCount = await StoreSetupVerification.countDocuments({ store_setup_id: setup._id });
    await StoreSetupVerification.create({
      store_setup_id: setup._id,
      franchisee_id: setup.franchisee_id,
      cycle_number: cycleCount + 1,
      submitted_by: employeeId,
      submitted_by_name: employeeName,
      submitted_at: new Date(),
      employee_remarks: employee_final_remarks,
      admin_decision: 'pending',
    });

    await AuditLog.create({
      actor_type: 'cms_user',
      actor_id: employeeId,
      action: 'STORE_SETUP_SUBMITTED_FOR_VERIFICATION',
      entity_type: 'store_setups',
      entity_id: setup._id,
      after_snapshot: { status: 'admin_verification_pending', cycle: cycleCount + 1 },
      req,
    });

    return res.json({
      status: 'success',
      message: 'Store setup successfully submitted for Admin verification!',
      data: setup,
    });
  } catch (error) {
    console.error('[store.setup.employee] submit_for_admin_verification error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

module.exports = {
  list_assigned_setups,
  start_setup,
  update_checklist_activity,
  submit_delay_request,
  submit_for_admin_verification,
};
