const mongoose = require('mongoose');
const {
  LeadMaster,
  LeadPrimarySegment,
  LeadSubgroup,
  LeadSegmentMapping,
  LeadCustomField,
  LeadImportHistory,
  LeadImportMapping,
  LeadActivity,
  LeadBdeMapping,
  LeadMarketingSettings,
  LeadAuditLog,
  LeadCampaignRecipient,
  LeadConversion
} = require('../models');
const { MarketingSender, MarketingTemplate, MarketingUnsubscribe } = require('../../marketing/models');
const { BDEFollowUp, BDELead } = require('../../models/india_solarshop_db');
const { ensureLeadMarketingSeeded } = require('../services/seedLeadMarketing.service');
const {
  normalizeEmail,
  isValidEmail,
  normalizePhone10,
  slugify,
  buildDateRangeFilter,
  generateUniqueCode,
  buildMasterLookups,
  reserveLeadCodeSequence
} = require('../services/leadGeoResolver.service');
const { syncLiveConversions } = require('../services/leadAttribution.service');

const VALID_PRIMARY_SEGMENTS = ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'];

const logAudit = async (req, { action, entity_type, entity_id = null, summary = '', metadata = {} }) => {
  try {
    await LeadAuditLog.create({
      actor_id: req.user?._id || null,
      actor_name: req.user?.name || 'Admin',
      action,
      entity_type,
      entity_id: entity_id ? String(entity_id) : null,
      summary,
      metadata,
      ip_address: req.ip || null
    });
  } catch (err) {
    console.warn('⚠️ [LeadAuditLog] notice:', err.message);
  }
};

const syncLeadSubgroupMappings = async (leadDoc, subgroupIds = [], actorName = 'Admin') => {
  const validIds = (Array.isArray(subgroupIds) ? subgroupIds : [])
    .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(String(id)));

  await LeadSegmentMapping.deleteMany({ lead_id: leadDoc._id });
  if (validIds.length === 0) {
    leadDoc.subgroup_ids = [];
    leadDoc.subgroup_names = [];
    await leadDoc.save();
    return [];
  }

  const subgroups = await LeadSubgroup.find({
    _id: { $in: validIds },
    primary_segment_key: leadDoc.primary_segment_key,
    deleted_at: null
  }).lean();

  if (subgroups.length > 0) {
    await LeadSegmentMapping.insertMany(
      subgroups.map((sg) => ({
        lead_id: leadDoc._id,
        primary_segment_key: leadDoc.primary_segment_key,
        subgroup_id: sg._id,
        assigned_by_name: actorName
      })),
      { ordered: false }
    ).catch(() => { });
  }

  leadDoc.subgroup_ids = subgroups.map((s) => s._id);
  leadDoc.subgroup_names = subgroups.map((s) => s.name);
  await leadDoc.save();
  return subgroups;
};

/**
 * GET /meta — Single live endpoint returning all dynamic dropdowns, masters, RBAC & settings
 */
const getLeadMarketingMeta = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const [
      primarySegments,
      subgroups,
      settings,
      customFields,
      lookups,
      senders,
      templates
    ] = await Promise.all([
      LeadPrimarySegment.find({ is_active: true }).sort({ sort_order: 1 }).lean(),
      LeadSubgroup.find({ deleted_at: null, is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
      LeadMarketingSettings.findOne({ key: 'global' }).lean(),
      LeadCustomField.find({ is_active: true }).sort({ created_at: 1 }).lean(),
      buildMasterLookups(),
      MarketingSender ? MarketingSender.find({}).select('name email_provider from_email from_name type is_active is_default').lean().catch(() => []) : [],
      MarketingTemplate ? MarketingTemplate.find({ channel: 'email', is_active: true }).select('name subject preview_text type tags').sort({ created_at: -1 }).lean().catch(() => []) : []
    ]);

    res.json({
      success: true,
      data: {
        primary_segments: primarySegments,
        subgroups,
        settings,
        custom_fields: customFields,
        countries: lookups.countries,
        states: lookups.states,
        districts: lookups.districts,
        clusters: lookups.clusters,
        bdes: lookups.bdes,
        email_senders: senders.filter((s) => s.type === 'email' || !s.type),
        email_templates: templates
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Build reusable Mongo filter from query/body parameters (shared across leads list, campaigns & exports)
 */
const buildLeadFilterQuery = (params = {}) => {
  const q = { deleted_at: null };
  if (params.primary_segment_key && VALID_PRIMARY_SEGMENTS.includes(params.primary_segment_key)) {
    q.primary_segment_key = params.primary_segment_key;
  }
  if (Array.isArray(params.primary_segments) && params.primary_segments.length > 0) {
    q.primary_segment_key = { $in: params.primary_segments.filter((k) => VALID_PRIMARY_SEGMENTS.includes(k)) };
  }
  if (params.subgroup_id && mongoose.Types.ObjectId.isValid(String(params.subgroup_id))) {
    q.subgroup_ids = new mongoose.Types.ObjectId(String(params.subgroup_id));
  }
  if (Array.isArray(params.subgroup_ids) && params.subgroup_ids.length > 0) {
    const validSub = params.subgroup_ids.filter((id) => mongoose.Types.ObjectId.isValid(String(id))).map((id) => new mongoose.Types.ObjectId(String(id)));
    if (validSub.length > 0) q.subgroup_ids = { $in: validSub };
  }
  if (params.country_name && params.country_name !== 'ALL') {
    q.country_name = new RegExp(`^${String(params.country_name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  if (params.state_name && params.state_name !== 'ALL') {
    q.state_name = new RegExp(`^${String(params.state_name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  if (params.district_name && params.district_name !== 'ALL') {
    q.district_name = new RegExp(`^${String(params.district_name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  if (params.cluster_name && params.cluster_name !== 'ALL') {
    q.cluster_name = new RegExp(`^${String(params.cluster_name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  if (params.lead_status && params.lead_status !== 'ALL') {
    q.lead_status = params.lead_status;
  }
  if (params.lead_source && params.lead_source !== 'ALL') {
    q.lead_source = params.lead_source;
  }
  if (params.assigned_bde_id && params.assigned_bde_id !== 'ALL') {
    if (params.assigned_bde_id === 'UNASSIGNED') {
      q.assigned_bde_id = null;
    } else if (mongoose.Types.ObjectId.isValid(String(params.assigned_bde_id))) {
      q.assigned_bde_id = new mongoose.Types.ObjectId(String(params.assigned_bde_id));
    }
  }
  if (params.is_active === 'true' || params.is_active === true) q.is_active = true;
  if (params.is_active === 'false' || params.is_active === false) q.is_active = false;
  if (params.is_unsubscribed === 'true') q.is_unsubscribed = true;

  const dateRange = buildDateRangeFilter(params.date_preset, params.start_date, params.end_date);
  if (dateRange) q.created_at = dateRange;

  if (params.search && String(params.search).trim()) {
    const rx = new RegExp(String(params.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [
      { lead_id: rx },
      { company_name: rx },
      { contact_person: rx },
      { email: rx },
      { mobile_number: rx },
      { gst_number: rx }
    ];
  }
  return q;
};

/**
 * GET /leads — Central Lead Database (search, multi-filter, paginate)
 */
const listLeads = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const filter = buildLeadFilterQuery(req.query);

    const [leads, total, segmentCounts] = await Promise.all([
      LeadMaster.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LeadMaster.countDocuments(filter),
      LeadMaster.aggregate([
        { $match: { deleted_at: null } },
        {
          $group: {
            _id: '$primary_segment_key',
            count: { $sum: 1 },
            active: { $sum: { $cond: ['$is_active', 1, 0] } },
            unsubscribed: { $sum: { $cond: ['$is_unsubscribed', 1, 0] } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        leads,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        segment_summary: segmentCounts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /leads — Create a single lead with mandatory Primary Segment + Duplicate Detection
 */
const createLead = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const body = req.body || {};
    if (!body.company_name || !String(body.company_name).trim()) {
      return res.status(400).json({ success: false, message: 'Company Name is mandatory.' });
    }
    if (!VALID_PRIMARY_SEGMENTS.includes(body.primary_segment_key)) {
      return res.status(400).json({ success: false, message: 'Valid Primary Segment (Franchisee Leads / EPC Signup Leads / EPC Sales Leads) is mandatory.' });
    }

    const email = normalizeEmail(body.email);
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }
    const mobileNormalized = normalizePhone10(body.mobile_number);
    const gstNumber = body.gst_number ? String(body.gst_number).trim().toUpperCase() : null;

    // Duplicate check across email / mobile / GST
    const dupOr = [];
    if (email) dupOr.push({ email });
    if (mobileNormalized && mobileNormalized.length >= 8) dupOr.push({ mobile_normalized: mobileNormalized });
    if (gstNumber && gstNumber.length >= 10) dupOr.push({ gst_number: gstNumber });

    if (dupOr.length > 0 && !body.allow_merge_update) {
      const existing = await LeadMaster.findOne({ deleted_at: null, $or: dupOr }).lean();
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Duplicate lead detected (${existing.lead_id} - ${existing.company_name}). Update existing record or edit instead.`,
          duplicate: existing
        });
      }
    }

    const lookups = await buildMasterLookups();
    const resolved = lookups.resolve({
      country: body.country_name,
      state: body.state_name,
      district: body.district_name,
      cluster: body.cluster_name,
      bde: body.assigned_bde_id || body.assigned_bde_name
    });

    const leadCode = await generateUniqueCode(LeadMaster, 'lead_id', 'LD');
    const actorName = req.user?.name || 'Admin';

    // Check global MarketingUnsubscribe
    const isGloballyUnsubscribed =
      MarketingUnsubscribe && email
        ? Boolean(await MarketingUnsubscribe.exists({ email, is_active: true }))
        : false;

    const leadDoc = await LeadMaster.create({
      lead_id: leadCode,
      company_name: String(body.company_name).trim(),
      contact_person: String(body.contact_person || '').trim(),
      email: email || null,
      country_code: String(body.country_code || '+91').trim(),
      mobile_number: body.mobile_number ? String(body.mobile_number).trim() : null,
      mobile_normalized: mobileNormalized || null,
      ...resolved,
      pincode: body.pincode ? String(body.pincode).trim() : null,
      primary_segment_key: body.primary_segment_key,
      lead_source: String(body.lead_source || 'manual').trim(),
      source_histories: [
        {
          source: String(body.lead_source || 'manual').trim(),
          primary_segment_key: body.primary_segment_key,
          recorded_at: new Date()
        }
      ],
      gst_number: gstNumber,
      lead_status: isGloballyUnsubscribed ? 'Unsubscribed' : String(body.lead_status || 'New').trim(),
      remarks: String(body.remarks || '').trim(),
      custom_fields: body.custom_fields || {},
      is_unsubscribed: isGloballyUnsubscribed,
      unsubscribed_at: isGloballyUnsubscribed ? new Date() : null,
      created_by: req.user?._id || null
    });

    await syncLeadSubgroupMappings(leadDoc, body.subgroup_ids || [], actorName);

    if (leadDoc.assigned_bde_id) {
      await LeadBdeMapping.create({
        lead_id: leadDoc._id,
        bde_id: leadDoc.assigned_bde_id,
        bde_name: leadDoc.assigned_bde_name || '',
        assigned_by_name: actorName
      });
    }

    await LeadActivity.create({
      lead_id: leadDoc._id,
      lead_code: leadDoc.lead_id,
      activity_type: 'note',
      notes: `Lead created under segment "${leadDoc.primary_segment_key}" (${leadDoc.lead_source}).`,
      actor_name: actorName
    });

    await logAudit(req, {
      action: 'CREATE_LEAD',
      entity_type: 'lm_marketing_leads',
      entity_id: leadDoc.lead_id,
      summary: `Created lead ${leadDoc.company_name} (${leadDoc.lead_id})`
    });

    res.status(201).json({ success: true, data: leadDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /leads/:id — Complete Lead Profile + Campaigns + Activities + Conversions + Merge History
 */
const getLeadDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id, deleted_at: null } : { lead_id: id, deleted_at: null };
    const lead = await LeadMaster.findOne(query).lean();
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const [activities, campaignHistory, conversions, bdeHistory] = await Promise.all([
      LeadActivity.find({ lead_id: lead._id }).sort({ occurred_at: -1 }).limit(100).lean(),
      LeadCampaignRecipient.find({ lead_id: lead._id })
        .populate('campaign_id', 'campaign_code campaign_name subject status started_at')
        .sort({ created_at: -1 })
        .lean(),
      LeadConversion.find({ lead_id: lead._id })
        .populate('first_touch_campaign_id', 'campaign_code campaign_name')
        .populate('last_touch_campaign_id', 'campaign_code campaign_name')
        .sort({ converted_at: -1 })
        .lean(),
      LeadBdeMapping.find({ lead_id: lead._id }).sort({ assigned_at: -1 }).lean()
    ]);

    res.json({
      success: true,
      data: {
        lead,
        activities,
        campaign_history: campaignHistory,
        conversions,
        bde_history: bdeHistory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /leads/:id — Update lead fields, primary segment, subgroups, BDE, status, suppression
 */
const updateLead = async (req, res) => {
  try {
    const lead = await LeadMaster.findOne({ _id: req.params.id, deleted_at: null });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const body = req.body || {};
    const actorName = req.user?.name || 'Admin';
    const prevStatus = lead.lead_status;
    const prevBdeId = lead.assigned_bde_id ? String(lead.assigned_bde_id) : null;
    const prevSeg = lead.primary_segment_key;

    if (body.company_name) lead.company_name = String(body.company_name).trim();
    if (body.contact_person !== undefined) lead.contact_person = String(body.contact_person || '').trim();
    if (body.email !== undefined) {
      const cleanEm = normalizeEmail(body.email);
      if (cleanEm && !isValidEmail(cleanEm)) {
        return res.status(400).json({ success: false, message: 'Invalid Email ID format' });
      }
      lead.email = cleanEm || null;
    }
    if (body.country_code !== undefined) lead.country_code = String(body.country_code || '+91').trim();
    if (body.mobile_number !== undefined) {
      lead.mobile_number = body.mobile_number ? String(body.mobile_number).trim() : null;
      lead.mobile_normalized = normalizePhone10(body.mobile_number) || null;
    }
    if (body.gst_number !== undefined) {
      lead.gst_number = body.gst_number ? String(body.gst_number).trim().toUpperCase() : null;
    }
    if (body.lead_source !== undefined) lead.lead_source = String(body.lead_source || 'manual').trim();
    if (body.remarks !== undefined) lead.remarks = String(body.remarks || '').trim();
    if (body.custom_fields !== undefined) lead.custom_fields = { ...(lead.custom_fields || {}), ...(body.custom_fields || {}) };
    if (body.is_active !== undefined) lead.is_active = Boolean(body.is_active);
    if (body.is_unsubscribed !== undefined) {
      lead.is_unsubscribed = Boolean(body.is_unsubscribed);
      lead.unsubscribed_at = lead.is_unsubscribed ? (lead.unsubscribed_at || new Date()) : null;
      if (lead.is_unsubscribed) lead.lead_status = 'Unsubscribed';
    }
    if (body.lead_status && !lead.is_unsubscribed) {
      lead.lead_status = String(body.lead_status).trim();
    }
    if (body.primary_segment_key && VALID_PRIMARY_SEGMENTS.includes(body.primary_segment_key)) {
      lead.primary_segment_key = body.primary_segment_key;
    }

    if (
      body.country_name !== undefined ||
      body.state_name !== undefined ||
      body.district_name !== undefined ||
      body.cluster_name !== undefined ||
      body.assigned_bde_id !== undefined
    ) {
      const lookups = await buildMasterLookups();
      const resolved = lookups.resolve({
        country: body.country_name ?? lead.country_name,
        state: body.state_name ?? lead.state_name,
        district: body.district_name ?? lead.district_name,
        cluster: body.cluster_name ?? lead.cluster_name,
        bde: body.assigned_bde_id !== undefined ? body.assigned_bde_id : lead.assigned_bde_id
      });
      Object.assign(lead, resolved);
    }

    await lead.save();

    if (Array.isArray(body.subgroup_ids)) {
      await syncLeadSubgroupMappings(lead, body.subgroup_ids, actorName);
    }

    if (prevStatus !== lead.lead_status) {
      await LeadActivity.create({
        lead_id: lead._id,
        lead_code: lead.lead_id,
        activity_type: 'status_change',
        old_value: prevStatus,
        new_value: lead.lead_status,
        notes: `Status changed from "${prevStatus}" to "${lead.lead_status}"`,
        actor_name: actorName
      });
    }
    if (prevSeg !== lead.primary_segment_key) {
      await LeadActivity.create({
        lead_id: lead._id,
        lead_code: lead.lead_id,
        activity_type: 'segment_change',
        old_value: prevSeg,
        new_value: lead.primary_segment_key,
        notes: `Primary segment switched from "${prevSeg}" to "${lead.primary_segment_key}"`,
        actor_name: actorName
      });
    }
    const newBdeId = lead.assigned_bde_id ? String(lead.assigned_bde_id) : null;
    if (newBdeId && newBdeId !== prevBdeId) {
      await LeadBdeMapping.updateMany({ lead_id: lead._id, is_current: true }, { $set: { is_current: false, unassigned_at: new Date() } });
      await LeadBdeMapping.create({
        lead_id: lead._id,
        bde_id: lead.assigned_bde_id,
        bde_name: lead.assigned_bde_name || '',
        assigned_by_name: actorName
      });
      await LeadActivity.create({
        lead_id: lead._id,
        lead_code: lead.lead_id,
        activity_type: 'bde_assigned',
        bde_id: lead.assigned_bde_id,
        bde_name: lead.assigned_bde_name,
        notes: `Lead assigned to BDE: ${lead.assigned_bde_name}`,
        actor_name: actorName
      });
    }

    await logAudit(req, {
      action: 'UPDATE_LEAD',
      entity_type: 'lm_marketing_leads',
      entity_id: lead.lead_id,
      summary: `Updated lead ${lead.company_name}`
    });

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /leads/bulk-action — Assign BDE, update status, tag subgroups, enable/disable, suppress
 */
const bulkUpdateLeads = async (req, res) => {
  try {
    const { lead_ids = [], action, value } = req.body || {};
    const validIds = (Array.isArray(lead_ids) ? lead_ids : [])
      .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
      .map((id) => new mongoose.Types.ObjectId(String(id)));

    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one lead.' });
    }
    const actorName = req.user?.name || 'Admin';
    let modified = 0;

    if (action === 'assign_bde') {
      const lookups = await buildMasterLookups();
      const resolved = lookups.resolve({ bde: value });
      if (!resolved.assigned_bde_id) {
        return res.status(400).json({ success: false, message: 'Invalid BDE selected.' });
      }
      const r = await LeadMaster.updateMany(
        { _id: { $in: validIds }, deleted_at: null },
        { $set: { assigned_bde_id: resolved.assigned_bde_id, assigned_bde_name: resolved.assigned_bde_name } }
      );
      modified = r.modifiedCount;
      await LeadBdeMapping.updateMany({ lead_id: { $in: validIds }, is_current: true }, { $set: { is_current: false, unassigned_at: new Date() } });
      await LeadBdeMapping.insertMany(
        validIds.map((lid) => ({
          lead_id: lid,
          bde_id: resolved.assigned_bde_id,
          bde_name: resolved.assigned_bde_name,
          assigned_by_name: actorName
        }))
      );
    } else if (action === 'update_status' && value) {
      const r = await LeadMaster.updateMany(
        { _id: { $in: validIds }, deleted_at: null },
        { $set: { lead_status: String(value).trim() } }
      );
      modified = r.modifiedCount;
    } else if (action === 'enable') {
      const r = await LeadMaster.updateMany({ _id: { $in: validIds } }, { $set: { is_active: true } });
      modified = r.modifiedCount;
    } else if (action === 'disable') {
      const r = await LeadMaster.updateMany({ _id: { $in: validIds } }, { $set: { is_active: false } });
      modified = r.modifiedCount;
    } else if (action === 'unsubscribe') {
      const r = await LeadMaster.updateMany(
        { _id: { $in: validIds } },
        { $set: { is_unsubscribed: true, unsubscribed_at: new Date(), lead_status: 'Unsubscribed' } }
      );
      modified = r.modifiedCount;
    } else if (action === 'add_subgroups' && Array.isArray(value)) {
      const docs = await LeadMaster.find({ _id: { $in: validIds }, deleted_at: null });
      for (const d of docs) {
        const merged = Array.from(new Set([...(d.subgroup_ids || []).map(String), ...value.map(String)]));
        await syncLeadSubgroupMappings(d, merged, actorName);
        modified += 1;
      }
    } else if (action === 'change_segment' && VALID_PRIMARY_SEGMENTS.includes(value)) {
      const r = await LeadMaster.updateMany(
        { _id: { $in: validIds }, deleted_at: null },
        { $set: { primary_segment_key: value, subgroup_ids: [], subgroup_names: [] } }
      );
      await LeadSegmentMapping.deleteMany({ lead_id: { $in: validIds } });
      modified = r.modifiedCount;
    }

    await logAudit(req, {
      action: `BULK_${String(action || 'UPDATE').toUpperCase()}`,
      entity_type: 'lm_marketing_leads',
      summary: `Bulk updated ${modified} leads (${action})`
    });

    res.json({ success: true, modified_count: modified });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /leads/:id/merge — Merges duplicate lead into target master lead retaining campaign & source history
 */
const mergeLeads = async (req, res) => {
  try {
    const targetId = req.params.id;
    const { duplicate_lead_id } = req.body || {};
    if (!targetId || !duplicate_lead_id || targetId === duplicate_lead_id) {
      return res.status(400).json({ success: false, message: 'Provide distinct target and duplicate lead IDs.' });
    }
    const [target, dup] = await Promise.all([
      LeadMaster.findOne({ _id: targetId, deleted_at: null }),
      LeadMaster.findOne({ _id: duplicate_lead_id, deleted_at: null })
    ]);
    if (!target || !dup) {
      return res.status(404).json({ success: false, message: 'Lead record not found for merge.' });
    }

    const actorName = req.user?.name || 'Admin';
    target.source_histories = [...(target.source_histories || []), ...(dup.source_histories || [])];
    target.import_batch_ids = Array.from(new Set([...(target.import_batch_ids || []), ...(dup.import_batch_ids || [])]));
    target.merge_history.push({
      merged_from_id: dup._id,
      merged_from_lead_id: dup.lead_id,
      matched_on: 'admin_merge',
      merged_by_name: actorName,
      notes: `Merged ${dup.lead_id} (${dup.company_name}) into ${target.lead_id}`
    });
    if (!target.email && dup.email) target.email = dup.email;
    if (!target.mobile_number && dup.mobile_number) {
      target.mobile_number = dup.mobile_number;
      target.mobile_normalized = dup.mobile_normalized;
    }
    if (!target.gst_number && dup.gst_number) target.gst_number = dup.gst_number;
    await target.save();

    // Reparent activities, conversions, recipients
    await Promise.all([
      LeadActivity.updateMany({ lead_id: dup._id }, { $set: { lead_id: target._id, lead_code: target.lead_id } }),
      LeadConversion.updateMany({ lead_id: dup._id }, { $set: { lead_id: target._id, lead_code: target.lead_id } }),
      LeadBdeMapping.updateMany({ lead_id: dup._id }, { $set: { lead_id: target._id } })
    ]);
    const dupRecipients = await LeadCampaignRecipient.find({ lead_id: dup._id }).lean();
    for (const r of dupRecipients) {
      const existsInTarget = await LeadCampaignRecipient.exists({ campaign_id: r.campaign_id, lead_id: target._id });
      if (!existsInTarget) {
        await LeadCampaignRecipient.updateOne({ _id: r._id }, { $set: { lead_id: target._id, lead_code: target.lead_id } });
      }
    }

    dup.deleted_at = new Date();
    dup.is_active = false;
    await dup.save();

    await LeadActivity.create({
      lead_id: target._id,
      lead_code: target.lead_id,
      activity_type: 'merge',
      notes: `Merged duplicate lead ${dup.lead_id} into this master record.`,
      actor_name: actorName
    });

    res.json({ success: true, data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /leads/:id/activities & GET /bde-tracking
 */
const addLeadActivity = async (req, res) => {
  try {
    const lead = await LeadMaster.findOne({ _id: req.params.id, deleted_at: null });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const { activity_type = 'call', notes = '', outcome = '', next_followup_at = null, new_status = null } = req.body || {};
    const actorName = req.user?.name || 'Admin';

    const activity = await LeadActivity.create({
      lead_id: lead._id,
      lead_code: lead.lead_id,
      activity_type,
      bde_id: lead.assigned_bde_id || null,
      bde_name: lead.assigned_bde_name || actorName,
      notes,
      outcome,
      next_followup_at: next_followup_at ? new Date(next_followup_at) : null,
      new_value: new_status || null,
      actor_name: actorName,
      occurred_at: new Date()
    });

    lead.last_followup_at = new Date();
    if (next_followup_at) lead.next_followup_at = new Date(next_followup_at);
    if (new_status && !lead.is_unsubscribed) lead.lead_status = new_status;
    await lead.save();

    res.status(201).json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBdeTracking = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    if (req.query.sync === 'true') {
      await syncLiveConversions().catch(() => { });
    }

    const lookups = await buildMasterLookups();
    const filter = buildLeadFilterQuery({
      primary_segment_key: req.query.primary_segment_key,
      assigned_bde_id: req.query.bde_id,
      lead_status: req.query.lead_status
    });

    const [leads, recentActivities, liveBdeFollowups, liveBdeLeads] = await Promise.all([
      LeadMaster.find(filter).sort({ last_followup_at: 1, created_at: -1 }).limit(300).lean(),
      LeadActivity.find({}).sort({ occurred_at: -1 }).limit(80).lean(),
      BDEFollowUp ? BDEFollowUp.find({}).sort({ follow_up_date: -1 }).limit(50).lean().catch(() => []) : [],
      BDELead ? BDELead.find({}).select('lead_id company_name prospect_name mobile_number email lead_status current_bde_id created_at').limit(100).lean().catch(() => []) : []
    ]);

    const workloadByBde = new Map();
    for (const b of lookups.bdes) {
      workloadByBde.set(String(b._id), {
        bde_id: b._id,
        bde_code: b.bde_id,
        full_name: b.full_name,
        state_name: b.state_name || '',
        total_leads: 0,
        franchisee_leads: 0,
        epc_signup_leads: 0,
        epc_sales_leads: 0,
        pending_followups: 0,
        converted_leads: 0
      });
    }

    for (const l of leads) {
      if (!l.assigned_bde_id) continue;
      const entry = workloadByBde.get(String(l.assigned_bde_id));
      if (!entry) continue;
      entry.total_leads += 1;
      if (entry[l.primary_segment_key] !== undefined) entry[l.primary_segment_key] += 1;
      if (['New', 'Not Contacted', 'Follow-up Required'].includes(l.lead_status)) entry.pending_followups += 1;
      if (
        l.lead_status === 'Converted' ||
        l.milestones?.franchisee_converted?.is_converted ||
        l.milestones?.epc_registered?.is_registered ||
        l.milestones?.epc_sales_converted?.has_order
      ) {
        entry.converted_leads += 1;
      }
    }

    res.json({
      success: true,
      data: {
        bde_workload: Array.from(workloadByBde.values()),
        leads,
        recent_activities: recentActivities,
        live_bde_followups: liveBdeFollowups,
        live_bde_leads_count: liveBdeLeads.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /imports/preview & POST /imports/execute — Multi-sheet Excel/CSV Dynamic Upload
 */
const previewLeadImport = async (req, res) => {
  try {
    const { rows = [], primary_segment_key } = req.body || {};
    if (!VALID_PRIMARY_SEGMENTS.includes(primary_segment_key)) {
      return res.status(400).json({ success: false, message: 'Select a valid Primary Segment first.' });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows uploaded for preview.' });
    }

    const existingLeads = await LeadMaster.find({ deleted_at: null })
      .select('_id lead_id company_name email mobile_normalized gst_number primary_segment_key')
      .lean();

    const byEmail = new Map();
    const byPhone = new Map();
    const byGst = new Map();
    for (const l of existingLeads) {
      if (l.email) byEmail.set(normalizeEmail(l.email), l);
      if (l.mobile_normalized) byPhone.set(l.mobile_normalized, l);
      if (l.gst_number) byGst.set(String(l.gst_number).toUpperCase(), l);
    }

    const seenEmailFile = new Set();
    const seenPhoneFile = new Set();
    let newValid = 0;
    let duplicatesDb = 0;
    let duplicatesFile = 0;
    let invalidCount = 0;

    const previewRows = rows.slice(0, 500).map((row, idx) => {
      const company = String(row.company_name || '').trim();
      const email = normalizeEmail(row.email);
      const phone10 = normalizePhone10(row.mobile_number);
      const gst = row.gst_number ? String(row.gst_number).trim().toUpperCase() : '';

      const errors = [];
      if (!company) errors.push('Missing Company Name');
      if (row.email && !isValidEmail(email)) errors.push('Invalid Email');
      if (!email && (!phone10 || phone10.length < 7)) errors.push('Provide valid Email or Mobile Number');

      let duplicateMatch = null;
      if (email && byEmail.has(email)) duplicateMatch = { matched_on: 'email', existing: byEmail.get(email) };
      else if (phone10 && byPhone.has(phone10)) duplicateMatch = { matched_on: 'mobile', existing: byPhone.get(phone10) };
      else if (gst.length >= 10 && byGst.has(gst)) duplicateMatch = { matched_on: 'gst', existing: byGst.get(gst) };

      const isFileDup = (email && seenEmailFile.has(email)) || (phone10 && seenPhoneFile.has(phone10));
      if (email) seenEmailFile.add(email);
      if (phone10) seenPhoneFile.add(phone10);

      let status = 'valid_new';
      if (errors.length > 0) {
        status = 'invalid';
        invalidCount += 1;
      } else if (duplicateMatch) {
        status = 'duplicate_db';
        duplicatesDb += 1;
      } else if (isFileDup) {
        status = 'duplicate_file';
        duplicatesFile += 1;
      } else {
        newValid += 1;
      }

      return {
        row_index: idx + 1,
        status,
        errors,
        duplicate_match: duplicateMatch
          ? { lead_id: duplicateMatch.existing.lead_id, company_name: duplicateMatch.existing.company_name, matched_on: duplicateMatch.matched_on }
          : null,
        company_name: company,
        contact_person: String(row.contact_person || '').trim(),
        email,
        mobile_number: phone10 || String(row.mobile_number || '').trim()
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          total_rows: rows.length,
          valid_new: newValid,
          duplicates_in_db: duplicatesDb,
          duplicates_in_file: duplicatesFile,
          invalid_rows: invalidCount
        },
        preview_rows: previewRows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const executeLeadImport = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const {
      rows = [],
      file_name = 'upload.xlsx',
      sheet_names = ['Sheet1'],
      primary_segment_key,
      subgroup_ids = [],
      lead_source = 'upload',
      duplicate_rule = 'skip',
      column_mapping = {},
      default_country = 'India',
      default_state = '',
      default_district = '',
      default_cluster = '',
      default_bde_id = '',
      default_status = 'New',
      default_remarks = '',
      required_fields = null
    } = req.body || {};

    if (!VALID_PRIMARY_SEGMENTS.includes(primary_segment_key)) {
      return res.status(400).json({ success: false, message: 'Mandatory Primary Segment missing.' });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows supplied to import.' });
    }

    const reqSet = Array.isArray(required_fields) ? new Set(required_fields) : null;
    const batchId = await generateUniqueCode(LeadImportHistory, 'batch_id', 'IMP');
    const actorName = req.user?.name || 'Admin';
    const nextLeadCode = await reserveLeadCodeSequence(rows.length);
    const lookups = await buildMasterLookups();

    const validSubgroupIds = (Array.isArray(subgroup_ids) ? subgroup_ids : [])
      .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
      .map((id) => new mongoose.Types.ObjectId(String(id)));
    const subgroups = validSubgroupIds.length
      ? await LeadSubgroup.find({ _id: { $in: validSubgroupIds }, primary_segment_key, deleted_at: null }).lean()
      : [];
    const subgroupNames = subgroups.map((s) => s.name);

    const existingLeads = await LeadMaster.find({ deleted_at: null });
    const byEmail = new Map();
    const byPhone = new Map();
    const byGst = new Map();
    for (const l of existingLeads) {
      if (l.email) byEmail.set(normalizeEmail(l.email), l);
      if (l.mobile_normalized) byPhone.set(l.mobile_normalized, l);
      if (l.gst_number) byGst.set(String(l.gst_number).toUpperCase(), l);
    }

    const unsubEmails = new Set(
      MarketingUnsubscribe
        ? (await MarketingUnsubscribe.find({ is_active: true }).select('email').lean()).map((u) => normalizeEmail(u.email)).filter(Boolean)
        : []
    );

    let insertedCount = 0;
    let updatedCount = 0;
    let duplicatesSkipped = 0;
    let invalidCount = 0;
    const errorsSample = [];
    const skippedDetails = [];
    const bdeAssignmentsToInsert = [];

    for (let i = 0; i < rows.length; i += 1) {
      const raw = rows[i] || {};
      const rawCompany = String(raw.company_name || '').trim();
      const contactPerson = String(raw.contact_person || '').trim();
      const email = normalizeEmail(raw.email);
      const phoneRaw = raw.mobile_number ? String(raw.mobile_number).trim() : '';
      const phone10 = normalizePhone10(phoneRaw);
      const gst = raw.gst_number ? String(raw.gst_number).trim().toUpperCase() : null;
      const pincode = raw.pincode ? String(raw.pincode).replace(/\D/g, '').slice(0, 6) || null : null;
      const addressLine = raw.address_line ? String(raw.address_line).trim() : null;

      const geo = lookups.resolve({
        country: raw.country_name || default_country,
        state: raw.state_name || default_state,
        district: raw.district_name || default_district,
        cluster: raw.cluster_name || raw.cluster_id || default_cluster,
        bde: raw.assigned_bde || raw.assigned_bde_id || raw.assigned_bde_name || default_bde_id
      });

      let invalidReason = '';
      if (reqSet) {
        if (reqSet.has('company_name') && !rawCompany) invalidReason = 'Missing Company Name';
        else if (reqSet.has('contact_person') && !contactPerson) invalidReason = 'Missing Contact Person';
        else if (reqSet.has('mobile_number') && phone10.length < 7) invalidReason = 'Missing valid Mobile Number';
        else if (reqSet.has('email') && (!email || !isValidEmail(email))) invalidReason = 'Missing or invalid Email';
        else if (reqSet.has('gst_number') && !gst) invalidReason = 'Missing GSTIN / GST Number';
        else if (reqSet.has('state_name') && !geo.state_name) invalidReason = 'Missing State';
        else if (reqSet.has('district_name') && !geo.district_name) invalidReason = 'Missing District / City';
      } else if (!rawCompany) {
        invalidReason = 'Missing Company Name';
      }

      if (!invalidReason) {
        if (raw.email && !isValidEmail(email)) invalidReason = 'Invalid Email';
        else if (!email && phone10.length < 7) invalidReason = 'Missing valid Email/Phone';
        else if (!rawCompany && !contactPerson && !email && phone10.length < 7) invalidReason = 'Empty lead row';
      }

      const company = rawCompany || contactPerson || email || phone10 || phoneRaw;

      if (invalidReason) {
        invalidCount += 1;
        if (errorsSample.length < 100) {
          errorsSample.push({
            row_number: i + 1,
            company_name: company || '(empty)',
            email,
            reason: invalidReason
          });
        }
        if (skippedDetails.length < 300) {
          skippedDetails.push({
            row_number: i + 1,
            name: company || `Row ${i + 1}`,
            phone: phone10 || phoneRaw,
            email,
            reason: invalidReason,
            status: 'invalid'
          });
        }
        continue;
      }

      const existing =
        (email && byEmail.get(email)) ||
        (phone10 && byPhone.get(phone10)) ||
        (gst && gst.length >= 10 && byGst.get(gst)) ||
        null;

      const sheetLabel = String(raw.__sheet || sheet_names[0] || 'Sheet1');
      const sourceEntry = {
        source: String(raw.lead_source || lead_source || 'upload').trim(),
        batch_id: batchId,
        file_name,
        sheet_name: sheetLabel,
        primary_segment_key,
        subgroup_names: subgroupNames,
        recorded_at: new Date()
      };

      if (existing) {
        // Retain source history & prevent duplicate master record (FRD Section 2 & 5)
        existing.source_histories.push(sourceEntry);
        if (!existing.import_batch_ids.includes(batchId)) existing.import_batch_ids.push(batchId);

        if (duplicate_rule === 'update') {
          if (contactPerson) existing.contact_person = contactPerson;
          if (email && !existing.email) existing.email = email;
          if (phoneRaw && !existing.mobile_number) {
            existing.mobile_number = phoneRaw;
            existing.mobile_normalized = phone10;
          }
          if (gst && !existing.gst_number) existing.gst_number = gst;
          if (pincode && !existing.pincode) existing.pincode = pincode;
          if (addressLine && !existing.address_line) existing.address_line = addressLine;
          if (geo.state_name && !existing.state_name) {
            existing.state_id = geo.state_id;
            existing.state_name = geo.state_name;
          }
          if (geo.district_name && !existing.district_name) {
            existing.district_id = geo.district_id;
            existing.district_name = geo.district_name;
          }
          if (geo.cluster_name && !existing.cluster_name) {
            existing.cluster_id = geo.cluster_id;
            existing.cluster_name = geo.cluster_name;
            existing.cluster_code = geo.cluster_code;
          }
          if (geo.assigned_bde_id && !existing.assigned_bde_id) {
            existing.assigned_bde_id = geo.assigned_bde_id;
            existing.assigned_bde_name = geo.assigned_bde_name;
          }
          if (raw.custom_fields && typeof raw.custom_fields === 'object') {
            existing.custom_fields = { ...(existing.custom_fields || {}), ...raw.custom_fields };
          }
          const incomingRemark = String(raw.remarks || '').trim();
          if (incomingRemark) existing.remarks = `${existing.remarks ? `${existing.remarks} | ` : ''}${incomingRemark}`;
          await existing.save();

          if (existing.primary_segment_key === primary_segment_key && subgroups.length > 0) {
            const combinedIds = Array.from(new Set([...(existing.subgroup_ids || []).map(String), ...subgroups.map((s) => String(s._id))]));
            await syncLeadSubgroupMappings(existing, combinedIds, actorName);
          }
          updatedCount += 1;
        } else {
          await existing.save();
          duplicatesSkipped += 1;
          if (skippedDetails.length < 300) {
            skippedDetails.push({
              row_number: i + 1,
              name: company,
              phone: phone10 || phoneRaw,
              email,
              reason: `Duplicate of ${existing.lead_id} (${existing.company_name}) — skipped & source history recorded`,
              status: 'duplicate_skipped'
            });
          }
        }
        continue;
      }

      const leadCode = nextLeadCode();
      const isUnsub = email ? unsubEmails.has(email) : false;
      const finalRemarks = String(raw.remarks || default_remarks || '').trim();

      const created = await LeadMaster.create({
        lead_id: leadCode,
        company_name: company,
        contact_person: contactPerson,
        email: email || null,
        country_code: String(raw.country_code || '+91').trim(),
        mobile_number: phoneRaw || null,
        mobile_normalized: phone10 || null,
        ...geo,
        pincode,
        address_line: addressLine,
        primary_segment_key,
        subgroup_ids: subgroups.map((s) => s._id),
        subgroup_names: subgroupNames,
        lead_source: sourceEntry.source,
        source_histories: [sourceEntry],
        import_batch_ids: [batchId],
        gst_number: gst,
        lead_status: isUnsub ? 'Unsubscribed' : String(raw.lead_status || default_status || 'New').trim(),
        remarks: finalRemarks,
        custom_fields: raw.custom_fields || {},
        is_unsubscribed: isUnsub,
        unsubscribed_at: isUnsub ? new Date() : null,
        created_by: req.user?._id || null
      });

      if (created.assigned_bde_id) {
        bdeAssignmentsToInsert.push({
          lead_id: created._id,
          bde_id: created.assigned_bde_id,
          bde_name: created.assigned_bde_name || '',
          assigned_by_name: actorName
        });
      }

      if (subgroups.length > 0) {
        await LeadSegmentMapping.insertMany(
          subgroups.map((sg) => ({
            lead_id: created._id,
            primary_segment_key,
            subgroup_id: sg._id,
            assigned_by_name: actorName
          })),
          { ordered: false }
        ).catch(() => { });
      }

      if (created.email) byEmail.set(created.email, created);
      if (created.mobile_normalized) byPhone.set(created.mobile_normalized, created);
      if (created.gst_number) byGst.set(created.gst_number, created);
      insertedCount += 1;
    }

    if (bdeAssignmentsToInsert.length > 0) {
      await LeadBdeMapping.insertMany(bdeAssignmentsToInsert, { ordered: false }).catch(() => { });
    }

    const history = await LeadImportHistory.create({
      batch_id: batchId,
      file_name,
      sheet_names,
      primary_segment_key,
      subgroup_ids: subgroups.map((s) => s._id),
      subgroup_names: subgroupNames,
      lead_source,
      duplicate_rule,
      column_mapping,
      total_rows: rows.length,
      inserted_count: insertedCount,
      updated_count: updatedCount,
      duplicates_skipped: duplicatesSkipped,
      invalid_count: invalidCount,
      errors_sample: errorsSample,
      uploaded_by_id: req.user?._id || null,
      uploaded_by_name: actorName
    });

    const summaryMsg = `Batch ${batchId}: ${insertedCount} new lead(s) imported${updatedCount ? `, ${updatedCount} updated` : ''}${duplicatesSkipped ? `, ${duplicatesSkipped} duplicate(s) skipped` : ''}${invalidCount ? `, ${invalidCount} invalid` : ''}.`;

    await logAudit(req, {
      action: 'IMPORT_LEADS',
      entity_type: 'lm_import_histories',
      entity_id: batchId,
      summary: `Imported ${insertedCount} new, ${updatedCount} updated, ${duplicatesSkipped} duplicates skipped (${file_name})`
    });

    res.json({
      success: true,
      message: summaryMsg,
      data: history,
      skipped_details: skippedDetails
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getImportHistory = async (req, res) => {
  try {
    const [histories, mappings] = await Promise.all([
      LeadImportHistory.find({}).sort({ imported_at: -1 }).limit(50).lean(),
      LeadImportMapping.find({}).sort({ created_at: -1 }).lean()
    ]);
    res.json({ success: true, data: { histories, mappings } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveImportMapping = async (req, res) => {
  try {
    const { template_name, primary_segment_key = 'all', column_mapping, custom_field_keys = [], duplicate_rule = 'skip' } = req.body || {};
    if (!template_name || !column_mapping) {
      return res.status(400).json({ success: false, message: 'Template name and column mapping are required.' });
    }
    const doc = await LeadImportMapping.create({
      template_name: String(template_name).trim(),
      primary_segment_key,
      column_mapping,
      custom_field_keys,
      duplicate_rule,
      created_by_name: req.user?.name || 'Admin'
    });
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteImportMapping = async (req, res) => {
  try {
    await LeadImportMapping.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Subgroups, Custom Fields & Settings Management (FRD Section 16.1)
 */
const createSubgroup = async (req, res) => {
  try {
    const { primary_segment_key, name, color = '#4F46E5', description = '' } = req.body || {};
    if (!VALID_PRIMARY_SEGMENTS.includes(primary_segment_key) || !name) {
      return res.status(400).json({ success: false, message: 'Primary segment and sub-group name are required.' });
    }
    const slug = slugify(name);
    const exists = await LeadSubgroup.findOne({ primary_segment_key, slug, deleted_at: null }).lean();
    if (exists) {
      return res.status(409).json({ success: false, message: 'Sub-group with this name already exists in this segment.' });
    }
    const doc = await LeadSubgroup.create({
      primary_segment_key,
      name: String(name).trim(),
      slug,
      color,
      description,
      is_starter: false,
      created_by: req.user?._id || null
    });
    await logAudit(req, { action: 'CREATE_SUBGROUP', entity_type: 'lm_subgroups', entity_id: doc._id, summary: `Created subgroup "${doc.name}" under ${primary_segment_key}` });
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSubgroup = async (req, res) => {
  try {
    const doc = await LeadSubgroup.findByIdAndUpdate(req.params.id, { deleted_at: new Date(), is_active: false }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Sub-group not found' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCustomField = async (req, res) => {
  try {
    const { label, field_type = 'text', options = [], applicable_segments = VALID_PRIMARY_SEGMENTS, is_required = false } = req.body || {};
    if (!label) return res.status(400).json({ success: false, message: 'Field label is required.' });
    const field_key = slugify(label);
    const doc = await LeadCustomField.findOneAndUpdate(
      { field_key },
      { label: String(label).trim(), field_key, field_type, options, applicable_segments, is_required, is_active: true, created_by: req.user?._id || null },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCustomField = async (req, res) => {
  try {
    await LeadCustomField.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    await ensureLeadMarketingSeeded();
    const doc = await LeadMarketingSettings.findOne({ key: 'global' });
    const body = req.body || {};
    if (Array.isArray(body.lead_statuses)) doc.lead_statuses = body.lead_statuses;
    if (Array.isArray(body.lead_sources)) doc.lead_sources = body.lead_sources;
    if (Array.isArray(body.campaign_categories)) doc.campaign_categories = body.campaign_categories;
    if (body.attribution_config) doc.attribution_config = { ...doc.attribution_config, ...body.attribution_config };
    if (body.email_sending_controls) doc.email_sending_controls = { ...doc.email_sending_controls, ...body.email_sending_controls };
    if (body.data_retention_policy) doc.data_retention_policy = { ...doc.data_retention_policy, ...body.data_retention_policy };
    if (Array.isArray(body.rbac_permissions)) doc.rbac_permissions = body.rbac_permissions;
    await doc.save();

    await logAudit(req, { action: 'UPDATE_SETTINGS', entity_type: 'lm_settings', summary: 'Updated Lead Marketing System Settings & RBAC Matrix' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await LeadAuditLog.find({}).sort({ created_at: -1 }).limit(100).lean();
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  VALID_PRIMARY_SEGMENTS,
  buildLeadFilterQuery,
  logAudit,
  getLeadMarketingMeta,
  listLeads,
  createLead,
  getLeadDetail,
  updateLead,
  bulkUpdateLeads,
  mergeLeads,
  addLeadActivity,
  getBdeTracking,
  previewLeadImport,
  executeLeadImport,
  getImportHistory,
  saveImportMapping,
  deleteImportMapping,
  createSubgroup,
  deleteSubgroup,
  createCustomField,
  deleteCustomField,
  updateSettings,
  getAuditLogs
};
