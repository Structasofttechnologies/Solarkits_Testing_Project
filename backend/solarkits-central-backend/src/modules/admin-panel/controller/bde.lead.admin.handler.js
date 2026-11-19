/**
 * bde.lead.admin.handler.js
 *
 * Admin Controller for:
 * 1. Viewing all BDE-generated leads with comprehensive multi-filters
 * 2. Reassigning leads and attributed franchisees with mandatory audits
 * 3. Reviewing outside-territory approval requests
 * 4. Conversion funnel analytics across BDEs
 */

const {
  BDELead,
  BDELeadActivity,
  BDEFollowUp,
  BDEReassignmentHistory,
  TerritoryExceptionRequest,
  BDEProfile,
  Reseller,
} = require('../models/india_solarshop_db');
const {
  reassignLead,
  reassignFranchisee,
} = require('../services/bde.lead.service');

const cleanVal = (v) => (v && v !== 'undefined' && v !== 'null' && v !== 'all') ? String(v).trim() : null;

/**
 * GET /admin-api/bde-mgmt/leads/list
 */
const list_bde_leads = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      bde_id,
      state_name,
      district_name,
      lead_status,
      plan_id,
      start_date,
      end_date,
    } = req.query;

    search = cleanVal(search);
    bde_id = cleanVal(bde_id);
    state_name = cleanVal(state_name);
    district_name = cleanVal(district_name);
    lead_status = cleanVal(lead_status);
    plan_id = cleanVal(plan_id);
    start_date = cleanVal(start_date);
    end_date = cleanVal(end_date);

    const query = { deleted_at: null };

    if (search) {
      const s = search;
      query.$or = [
        { lead_id: { $regex: s, $options: 'i' } },
        { prospect_name: { $regex: s, $options: 'i' } },
        { company_name: { $regex: s, $options: 'i' } },
        { mobile_number: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { gst_number: { $regex: s, $options: 'i' } },
      ];
    }

    if (bde_id) query.current_bde_id = bde_id;
    if (state_name) query.state_name = state_name;
    if (district_name) query.district_name = district_name;
    if (lead_status) query.lead_status = lead_status;
    if (plan_id) query.interested_plan_id = plan_id;

    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;
    const [leads, total] = await Promise.all([
      BDELead.find(query)
        .populate('current_bde_id', 'full_name bde_id email mobile')
        .populate('original_bde_id', 'full_name bde_id email')
        .populate('interested_plan_id', 'name code')
        .populate('franchisee_id', 'reseller_code business_name activation_status agreement_status fee_payment_status is_operational')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      BDELead.countDocuments(query),
    ]);

    return res.status(200).json({
      status: 'success',
      data: leads,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    });
  } catch (err) {
    console.error('Failed to list BDE leads', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to list leads' });
  }
};

/**
 * GET /admin-api/bde-mgmt/leads/detail/:id
 */
const get_bde_lead_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await BDELead.findById(id)
      .populate('current_bde_id', 'full_name bde_id email mobile state district')
      .populate('original_bde_id', 'full_name bde_id email')
      .populate('interested_plan_id')
      .populate('franchisee_id')
      .lean();

    if (!lead) {
      return res.status(404).json({ status: 'error', message: 'Lead not found' });
    }

    const [activities, followUps, reassignments, exceptionRequest] = await Promise.all([
      BDELeadActivity.find({ lead_id: id }).sort({ created_at: -1 }).lean(),
      BDEFollowUp.find({ lead_id: id }).sort({ follow_up_date: -1 }).lean(),
      BDEReassignmentHistory.find({ entity_type: 'lead', lead_id: id }).sort({ reassigned_at: -1 }).lean(),
      lead.territory_exception_id ? TerritoryExceptionRequest.findById(lead.territory_exception_id).lean() : null,
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        lead,
        activities,
        follow_ups: followUps,
        reassignments,
        exception_request: exceptionRequest,
      },
    });
  } catch (err) {
    console.error('Failed to get BDE lead detail', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to get lead detail' });
  }
};

/**
 * POST /admin-api/bde-mgmt/leads/reassign/:id
 * Body: { new_bde_id, reason }
 */
const reassign_bde_lead = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_bde_id, reason } = req.body;
    const adminUser = req.user || { _id: req.body.admin_id, name: 'Admin' };

    const updatedLead = await reassignLead(id, new_bde_id, adminUser, reason);

    return res.status(200).json({
      status: 'success',
      data: updatedLead,
      message: `Lead ${updatedLead.lead_id} successfully reassigned.`,
    });
  } catch (err) {
    console.error('Failed to reassign lead', err);
    return res.status(err.statusCode || 500).json({ status: 'error', message: err.message || 'Failed to reassign lead' });
  }
};

/**
 * GET /admin-api/bde-mgmt/leads/franchisees
 */
const list_attributed_franchisees = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      bde_id,
      state_name,
      district_name,
      activation_status,
      agreement_status,
      fee_payment_status,
      is_operational,
    } = req.query;

    search = cleanVal(search);
    bde_id = cleanVal(bde_id);
    state_name = cleanVal(state_name);
    district_name = cleanVal(district_name);
    activation_status = cleanVal(activation_status);
    agreement_status = cleanVal(agreement_status);
    fee_payment_status = cleanVal(fee_payment_status);

    const query = {
      $or: [{ bde_id: { $ne: null } }, { original_bde_id: { $ne: null } }],
    };

    if (search) {
      const s = search;
      query.$and = [
        {
          $or: [
            { reseller_code: { $regex: s, $options: 'i' } },
            { business_name: { $regex: s, $options: 'i' } },
            { contact_person: { $regex: s, $options: 'i' } },
            { mobile: { $regex: s, $options: 'i' } },
            { gst_number: { $regex: s, $options: 'i' } },
          ],
        },
      ];
    }

    if (bde_id) query.bde_id = bde_id;
    if (state_name) query['address.state_name'] = state_name;
    if (district_name) query['address.district_name'] = district_name;
    if (activation_status) query.activation_status = activation_status;
    if (agreement_status) query.agreement_status = agreement_status;
    if (fee_payment_status) query.fee_payment_status = fee_payment_status;
    if (is_operational !== undefined && is_operational !== '' && is_operational !== 'undefined' && is_operational !== 'null') {
      query.is_operational = is_operational === 'true';
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;
    const [franchisees, total] = await Promise.all([
      Reseller.find(query)
        .populate('bde_id', 'full_name bde_id email mobile')
        .populate('original_bde_id', 'full_name bde_id email')
        .populate('lead_id', 'lead_id lead_source created_at')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reseller.countDocuments(query),
    ]);

    return res.status(200).json({
      status: 'success',
      data: franchisees,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('Failed to list attributed franchisees', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to list franchisees' });
  }
};

/**
 * POST /admin-api/bde-mgmt/leads/franchisees/reassign/:id
 * Body: { new_bde_id, reason }
 */
const reassign_franchisee_bde = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_bde_id, reason } = req.body;
    const adminUser = req.user || { _id: req.body.admin_id, name: 'Admin' };

    const updatedReseller = await reassignFranchisee(id, new_bde_id, adminUser, reason);

    return res.status(200).json({
      status: 'success',
      data: updatedReseller,
      message: `Franchisee partner ${updatedReseller.business_name} successfully reassigned.`,
    });
  } catch (err) {
    console.error('Failed to reassign franchisee', err);
    return res.status(err.statusCode || 500).json({ status: 'error', message: err.message || 'Failed to reassign franchisee' });
  }
};

/**
 * GET /admin-api/bde-mgmt/leads/territory-exceptions
 */
const list_territory_exceptions = async (req, res) => {
  try {
    let { status = 'pending', bde_id } = req.query;
    status = cleanVal(status);
    bde_id = cleanVal(bde_id);
    const query = {};
    if (status) query.status = status;
    if (bde_id) query.bde_id = bde_id;

    const list = await TerritoryExceptionRequest.find(query)
      .populate('bde_id', 'full_name bde_id email mobile')
      .populate('lead_id', 'lead_id prospect_name company_name')
      .populate('requested_plan_id', 'name code')
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      data: list,
    });
  } catch (err) {
    console.error('Failed to list territory exceptions', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to list exceptions' });
  }
};

/**
 * POST /admin-api/bde-mgmt/leads/territory-exceptions/review/:id
 * Body: { decision: 'approved'|'rejected', admin_remarks }
 */
const review_territory_exception = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, admin_remarks } = req.body;
    const adminUser = req.user || { _id: req.body.admin_id, name: 'Admin' };

    const reqDoc = await TerritoryExceptionRequest.findById(id);
    if (!reqDoc) {
      return res.status(404).json({ status: 'error', message: 'Exception request not found' });
    }

    reqDoc.status = decision === 'approved' ? 'approved' : 'rejected';
    reqDoc.reviewed_by = adminUser._id || adminUser.id;
    reqDoc.reviewed_at = new Date();
    reqDoc.admin_remarks = admin_remarks || null;
    await reqDoc.save();

    // If approved, update lead territory exception status
    if (reqDoc.lead_id) {
      await BDELead.findByIdAndUpdate(reqDoc.lead_id, {
        is_outside_territory: decision !== 'approved',
      });

      await BDELeadActivity.create({
        lead_id: reqDoc.lead_id,
        bde_id: reqDoc.bde_id,
        activity_type: 'note',
        title: `Territory Exception ${decision.toUpperCase()}`,
        notes: `Admin reviewed outside-territory request: ${decision.toUpperCase()}. Remarks: ${admin_remarks || 'None'}`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: reqDoc,
      message: `Territory exception request ${decision} successfully.`,
    });
  } catch (err) {
    console.error('Failed to review territory exception', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to review request' });
  }
};

/**
 * GET /admin-api/bde-mgmt/leads/conversion-funnel
 */
const get_conversion_funnel = async (req, res) => {
  try {
    const { bde_id, start_date, end_date } = req.query;
    const query = { deleted_at: null };
    if (bde_id) query.current_bde_id = bde_id;

    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    const allLeads = await BDELead.find(query).lean();

    const totalLeads = allLeads.length;
    const contacted = allLeads.filter((l) => ['contacted', 'follow_up_scheduled', 'interested', 'signup_started', 'approved', 'fee_paid', 'completed', 'converted', 'onboarded'].includes(l.lead_status)).length;
    const interested = allLeads.filter((l) => ['interested', 'signup_started', 'approved', 'fee_paid', 'completed', 'converted', 'onboarded'].includes(l.lead_status)).length;
    const signupStarted = allLeads.filter((l) => ['signup_started', 'gst_verification_pending', 'admin_review_pending', 'approved', 'agreement_pending', 'agreement_signed', 'fee_payment_pending', 'fee_paid', 'completed', 'converted', 'onboarded'].includes(l.lead_status)).length;
    const approved = allLeads.filter((l) => ['approved', 'agreement_pending', 'agreement_signed', 'fee_payment_pending', 'fee_paid', 'completed', 'converted', 'onboarded'].includes(l.lead_status)).length;
    const agreementSigned = allLeads.filter((l) => ['agreement_signed', 'fee_payment_pending', 'fee_paid', 'completed', 'converted', 'onboarded'].includes(l.lead_status)).length;
    const feePaid = allLeads.filter((l) => ['fee_paid', 'completed', 'converted', 'onboarded'].includes(l.lead_status)).length;
    const rejected = allLeads.filter((l) => l.lead_status === 'rejected').length;
    const lost = allLeads.filter((l) => l.lead_status === 'lost').length;

    return res.status(200).json({
      status: 'success',
      data: {
        total_leads: totalLeads,
        stages: [
          { stage: 'Total Leads Generated', count: totalLeads, conversion_pct: 100 },
          { stage: 'Prospect Contacted', count: contacted, conversion_pct: totalLeads ? Math.round((contacted / totalLeads) * 100) : 0 },
          { stage: 'Interested & Qualified', count: interested, conversion_pct: totalLeads ? Math.round((interested / totalLeads) * 100) : 0 },
          { stage: 'Onboarding Signup Started', count: signupStarted, conversion_pct: totalLeads ? Math.round((signupStarted / totalLeads) * 100) : 0 },
          { stage: 'Admin Approved Partner', count: approved, conversion_pct: totalLeads ? Math.round((approved / totalLeads) * 100) : 0 },
          { stage: 'Agreement Signed', count: agreementSigned, conversion_pct: totalLeads ? Math.round((agreementSigned / totalLeads) * 100) : 0 },
          { stage: 'Franchise Fee Paid (Converted)', count: feePaid, conversion_pct: totalLeads ? Math.round((feePaid / totalLeads) * 100) : 0 },
        ],
        outcomes: {
          converted: feePaid,
          rejected,
          lost,
          active_pipeline: totalLeads - (feePaid + rejected + lost),
        },
      },
    });
  } catch (err) {
    console.error('Failed to get conversion funnel', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to get conversion funnel' });
  }
};

module.exports = {
  list_bde_leads,
  get_bde_lead_detail,
  reassign_bde_lead,
  list_attributed_franchisees,
  reassign_franchisee_bde,
  list_territory_exceptions,
  review_territory_exception,
  get_conversion_funnel,
};
