/**
 * company_margin_goals.handler.js
 *
 * Admin CRUD + analytics for Company Monthly Margin & Sales Goals.
 * Permission code: ADM_CO_MARGIN
 * Prefix: /admin-api/company/margin-goals
 */

const mongoose = require('mongoose');
const CompanyMarginGoal = require('../models/india_solarshop_db/company_margin_goals.schema');
const { CompanyMargin, FpoCommissionLedger, Reseller } = require('../models/india_solarshop_db');
const { logAudit } = require('../utils/audit.service');

// ── LIST / GET GOALS ──────────────────────────────────────────────────────────
const list_goals = async (req, res) => {
  try {
    const { country_id, state_id, district_id, combo_kit_id, target_month, target_year, include_history } = req.query;

    const query = { deleted_at: null };
    if (country_id)   query.country_id   = country_id;
    if (state_id)     query.state_id     = state_id;
    if (district_id)  query.district_id  = district_id;
    if (combo_kit_id) query.combo_kit_id = combo_kit_id;
    if (target_month) query.target_month = Number(target_month);
    if (target_year)  query.target_year  = Number(target_year);
    if (include_history !== 'true') query.is_active = true;

    const goals = await CompanyMarginGoal.find(query)
      .sort({ target_year: -1, target_month: -1 })
      .lean();

    return res.json({ status: 'success', data: goals });
  } catch (error) {
    console.error('[margin_goals] list error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ADD GOAL ──────────────────────────────────────────────────────────────────
const add_goal = async (req, res) => {
  try {
    const {
      country_id, state_id, district_id, combo_kit_id,
      target_month, target_year,
      target_quantity, target_sales_value, target_margin_pct,
      on_track_threshold, critical_threshold,
    } = req.body;

    if (!country_id) return res.status(400).json({ status: 'error', message: 'country_id is required' });
    if (!target_month || !target_year) return res.status(400).json({ status: 'error', message: 'target_month and target_year are required' });
    if (target_quantity == null || target_quantity < 0) return res.status(400).json({ status: 'error', message: 'target_quantity (>= 0) is required' });

    const doc = await CompanyMarginGoal.create({
      country_id,
      state_id:          state_id || null,
      district_id:       district_id || null,
      combo_kit_id:      combo_kit_id || null,
      target_month:      Number(target_month),
      target_year:       Number(target_year),
      target_quantity:   Number(target_quantity),
      target_sales_value: target_sales_value != null ? Number(target_sales_value) : 0,
      target_margin_pct:  target_margin_pct != null ? Number(target_margin_pct) : null,
      on_track_threshold: on_track_threshold != null ? Number(on_track_threshold) : 80,
      critical_threshold: critical_threshold != null ? Number(critical_threshold) : 50,
      created_by: req.user?.id,
      updated_by: req.user?.id,
    });

    await logAudit({
      actor_type: 'cms_user', actor_id: req.user?.id,
      action: 'COMPANY_MARGIN_GOAL_CREATE',
      entity_type: 'company_margin_goals', entity_id: doc._id,
      after_snapshot: doc.toObject(), req,
    });

    return res.status(201).json({ status: 'success', data: { id: doc._id } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'A goal already exists for this scope and period. Use update to modify it.' });
    }
    console.error('[margin_goals] add error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── UPDATE GOAL ───────────────────────────────────────────────────────────────
const update_goal = async (req, res) => {
  try {
    const { id, ...fields } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }

    const doc = await CompanyMarginGoal.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Goal not found' });

    const before = doc.toObject();
    const editable = [
      'target_quantity', 'target_sales_value', 'target_margin_pct',
      'on_track_threshold', 'critical_threshold', 'is_active',
    ];
    for (const key of editable) {
      if (fields[key] !== undefined) doc[key] = fields[key];
    }
    doc.updated_by = req.user?.id;
    await doc.save();

    await logAudit({
      actor_type: 'cms_user', actor_id: req.user?.id,
      action: 'COMPANY_MARGIN_GOAL_UPDATE',
      entity_type: 'company_margin_goals', entity_id: id,
      before_snapshot: before, after_snapshot: doc.toObject(), req,
    });

    return res.json({ status: 'success', data: { id: doc._id } });
  } catch (error) {
    console.error('[margin_goals] update error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── DELETE GOAL ───────────────────────────────────────────────────────────────
const delete_goal = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

    const doc = await CompanyMarginGoal.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Goal not found' });

    doc.deleted_at = new Date();
    doc.is_active = false;
    doc.updated_by = req.user?.id;
    await doc.save();

    await logAudit({
      actor_type: 'cms_user', actor_id: req.user?.id,
      action: 'COMPANY_MARGIN_GOAL_DELETE',
      entity_type: 'company_margin_goals', entity_id: id, req,
    });

    return res.json({ status: 'success', message: 'Goal deleted' });
  } catch (error) {
    console.error('[margin_goals] delete error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ANALYTICS — Achievement Summary ─────────────────────────────────────────
const get_achievement_summary = async (req, res) => {
  try {
    const { country_id, state_id, district_id, combo_kit_id, target_month, target_year } = req.query;

    if (!country_id || !target_month || !target_year) {
      return res.status(400).json({ status: 'error', message: 'country_id, target_month, target_year are required' });
    }

    // Fetch goals matching scope
    const goalQuery = {
      deleted_at: null,
      country_id,
      target_month: Number(target_month),
      target_year: Number(target_year),
    };
    if (state_id)     goalQuery.state_id     = state_id;
    if (district_id)  goalQuery.district_id  = district_id;
    if (combo_kit_id) goalQuery.combo_kit_id = combo_kit_id;

    const goals = await CompanyMarginGoal.find(goalQuery).lean();

    // Return goals with placeholders for actual (frontend or future aggregation can fill actuals from orders)
    const result = goals.map(g => ({
      ...g,
      actual_quantity:    null, // To be populated by a future orders aggregation
      achievement_pct:    null,
      performance_class:  null,
    }));

    return res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('[margin_goals] achievement error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── COMMISSION LEDGER (admin view of fpo_commission_ledgers) ─────────────────
const get_commission_ledger = async (req, res) => {
  try {
    const { franchisee_id, status, page = 1, limit = 30 } = req.query;

    const query = {};
    if (franchisee_id) query.franchisee_id = franchisee_id;
    if (status) query.settlement_status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [rows, total] = await Promise.all([
      FpoCommissionLedger.find(query)
        .populate('franchisee_id', 'business_name contact_name')
        .populate('fpo_order_id', 'po_number kit_name quantity')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FpoCommissionLedger.countDocuments(query),
    ]);

    return res.json({ status: 'success', data: rows, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('[commission_ledger] get error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── MARGIN ANALYTICS (real data calculation) ─────────────────────────────────
const get_margin_analytics = async (req, res) => {
  try {
    const { country_id, state_id, combo_kit_id, target_month, target_year } = req.query;

    const {
      WarehouseComboKit,
      CompanyMargin,
      OfferMaster,
      PurchaseOrder,
    } = require('../models/india_solarshop_db');
    const { GeoLevel1 } = require('../models/geolocation_db');

    // 1. Fetch relevant kits
    const kitQuery = { deleted_at: null, is_custom: false };
    if (country_id && mongoose.Types.ObjectId.isValid(country_id)) {
      kitQuery.country_id = new mongoose.Types.ObjectId(country_id);
    }
    if (combo_kit_id && mongoose.Types.ObjectId.isValid(combo_kit_id)) {
      kitQuery._id = new mongoose.Types.ObjectId(combo_kit_id);
    }

    const [kits, states, margins, offers] = await Promise.all([
      WarehouseComboKit.find(kitQuery).select('_id name kit_name country_id').lean(),
      state_id && mongoose.Types.ObjectId.isValid(state_id)
        ? GeoLevel1.find({ _id: state_id, deleted_at: null }).select('_id name').lean()
        : GeoLevel1.find({ deleted_at: null }).select('_id name').lean(),
      CompanyMargin.find({ deleted_at: null }).lean(),
      OfferMaster.find({ is_active: true, deleted_at: null }).lean(),
    ]);

    // 2. Build date filters for orders if month and year provided
    let dateFilter = {};
    if (target_month && target_year) {
      const start = new Date(Number(target_year), Number(target_month) - 1, 1);
      const end = new Date(Number(target_year), Number(target_month), 0, 23, 59, 59);
      dateFilter = { created_at: { $gte: start, $lte: end } };
    }

    // 3. Query real purchase orders matching filters
    const poQuery = { ...dateFilter };
    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      poQuery.state_id = new mongoose.Types.ObjectId(state_id);
    }
    if (combo_kit_id && mongoose.Types.ObjectId.isValid(combo_kit_id)) {
      poQuery.combo_kit_id = new mongoose.Types.ObjectId(combo_kit_id);
    }

    const purchaseOrders = await PurchaseOrder.find(poQuery).lean();

    // Map analytics rows by kit
    const rows = kits.map((kit) => {
      const kitIdStr = (kit._id || kit.id).toString();

      // Real orders for this kit
      const kitOrders = purchaseOrders.filter(
        (po) => po.combo_kit_id?.toString() === kitIdStr
      );

      const total_sales = kitOrders.length;
      const sales_value = kitOrders.reduce((sum, po) => sum + (po.selling_price_snapshot || 0), 0);

      // Configured standard margin for this kit
      const kitMarginDoc = margins.find((m) => m.combo_kit_id?.toString() === kitIdStr);
      const standard_margin_pct = kitMarginDoc
        ? (kitMarginDoc.standard_margin !== undefined ? kitMarginDoc.standard_margin : 10)
        : 10;

      // Active offer for this kit
      const kitOffer = offers.find((o) =>
        (o.products_applicable || []).some((p) => p?.toString() === kitIdStr)
      );
      const offer_discount_pct = kitOffer
        ? (kitOffer.discount_type === 'percent' ? Number(kitOffer.discount_value || 0) : 0)
        : 0;

      const effective_margin_pct = parseFloat(Math.max(0, standard_margin_pct - offer_discount_pct).toFixed(2));

      // Real commission paid
      const franchisee_commission = kitOrders.reduce(
        (sum, po) => sum + (po.reseller_commission_amount || 0),
        0
      );

      const commPct = sales_value > 0 ? (franchisee_commission / sales_value) * 100 : 0;
      const net_margin_pct = parseFloat((effective_margin_pct - commPct).toFixed(2));

      let state_name = "All States";
      if (state_id) {
        const stateObj = states.find((s) => s._id?.toString() === state_id?.toString());
        if (stateObj) state_name = stateObj.name;
      }

      return {
        kit_id: kitIdStr,
        kit_name: kit.name || kit.kit_name || "Combo Kit",
        state_name,
        total_sales,
        sales_value,
        standard_margin_pct,
        offer_discount_pct,
        effective_margin_pct,
        franchisee_commission,
        net_margin_pct,
      };
    });

    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[margin_analytics] error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  list_goals,
  add_goal,
  update_goal,
  delete_goal,
  get_achievement_summary,
  get_commission_ledger,
  get_margin_analytics,
};
