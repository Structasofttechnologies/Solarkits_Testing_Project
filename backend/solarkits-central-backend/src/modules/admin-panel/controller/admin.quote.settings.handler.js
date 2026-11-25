/**
 * admin.quote.settings.handler.js
 *
 * Admin CRUD for:
 *   - quote_settings (single document)
 *   - quote_warranty_options (full CRUD)
 *   - Admin analytics for all EPC quotes
 */

'use strict';

const mongoose = require('mongoose');
const {
  QuoteSettings,
  QuoteWarrantyOption,
  EpcQuote,
  EpcQuoteFollowup,
} = require('../../admin-panel/models/india_solarshop_db');
const epcQuotesHandler = require('../../solarshop-india/controller/epc.quotes.handler');

/* ── Quote Settings ──────────────────────────────────────────────────────── */

exports.get_settings = async (req, res) => {
  try {
    let settings = await QuoteSettings.findOne().lean();
    if (!settings) {
      settings = (await QuoteSettings.create({})).toObject();
    }
    const defaultTheme = {
      primary_color: '#ea580c',
      secondary_color: '#0f172a',
      accent_color: '#0284c7',
      light_bg_color: '#f8fafc',
      border_color: '#e2e8f0',
      company_name: 'SolarKits India',
      company_tagline: "India's Premier Solar ComboKit Distribution Platform",
      commercial_notes_title: 'COMMERCIAL & STATUTORY NOTES',
      commercial_notes: [
        'Prices quoted are in Indian Rupees (INR) and valid up to the expiration date.',
        'Dispatched directly through authorized distribution hubs with transit insurance.',
        'Refer to Page 2 for Detailed Technical Bill of Materials (BOM) & Equipment Specifications.',
        'Standard statutory warranty coverage applies as detailed in technical specifications.',
      ],
      bom_page_title: 'TECHNICAL SPECIFICATIONS & BILL OF MATERIALS (BOM)',
      footer_text: 'SolarKits India • Confidential Commercial Proposal • All Rights Reserved',
    };
    settings.pdf_theme = { ...defaultTheme, ...(settings.pdf_theme || {}) };
    return res.json({ status: 'success', data: settings });
  } catch (err) {
    console.error('[admin.quote.settings] get_settings:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch settings' });
  }
};

exports.update_settings = async (req, res) => {
  try {
    const body = req.body;
    const allowedFields = [
      'quote_number_prefix', 'quote_validity_days', 'gst_rate', 'currency',
      'delivery_modes', 'payment_terms_options', 'delivery_terms_text',
      'warranty_terms_text', 'default_terms_and_conditions',
      'default_follow_up_days', 'follow_up_modes', 'follow_up_statuses',
      'allow_duplicate_conversion', 'allow_revised_quote_conversion',
      'allow_expired_quote_conversion', 'allow_manual_discount', 'max_discount_pct',
      'pdf_theme',
    ];
    const update = {};
    allowedFields.forEach(f => { if (body[f] !== undefined) update[f] = body[f]; });

    if (req.user?.id) update.updated_by = req.user.id;

    const settings = await QuoteSettings.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    return res.json({ status: 'success', message: 'Quote settings updated', data: settings });
  } catch (err) {
    console.error('[admin.quote.settings] update_settings:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update settings' });
  }
};

/* ── Warranty Options ────────────────────────────────────────────────────── */

exports.list_warranty_options = async (req, res) => {
  try {
    const { include_inactive = 'false' } = req.query;
    const filter = { deleted_at: null };
    if (include_inactive !== 'true') filter.is_active = true;

    const options = await QuoteWarrantyOption.find(filter).sort({ sort_order: 1, created_at: -1 }).lean();
    return res.json({ status: 'success', data: options });
  } catch (err) {
    console.error('[admin.quote.settings] list_warranty_options:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to list warranty options' });
  }
};

exports.get_warranty_option = async (req, res) => {
  try {
    const option = await QuoteWarrantyOption.findOne({ _id: req.params.id, deleted_at: null }).lean();
    if (!option) return res.status(404).json({ status: 'error', message: 'Warranty option not found' });
    return res.json({ status: 'success', data: option });
  } catch (err) {
    console.error('[admin.quote.settings] get_warranty_option:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch warranty option' });
  }
};

exports.create_warranty_option = async (req, res) => {
  try {
    const {
      name, duration_months, covered_products, terms,
      pricing_mode, price_per_kit_paise, price_pct,
      eligible_industry_type_ids, eligible_project_type_ids,
      eligible_combo_kit_ids, sort_order, badge_color,
    } = req.body;

    if (!name) return res.status(400).json({ status: 'error', message: 'name is required' });
    if (!pricing_mode) return res.status(400).json({ status: 'error', message: 'pricing_mode is required' });

    const option = await QuoteWarrantyOption.create({
      name, duration_months: duration_months || 0, covered_products, terms,
      pricing_mode, price_per_kit_paise: price_per_kit_paise || 0,
      price_pct: price_pct || 0,
      eligible_industry_type_ids: eligible_industry_type_ids || [],
      eligible_project_type_ids: eligible_project_type_ids || [],
      eligible_combo_kit_ids: eligible_combo_kit_ids || [],
      sort_order: sort_order || 0,
      badge_color: badge_color || null,
      created_by: req.user?.id || null,
    });

    return res.status(201).json({ status: 'success', message: 'Warranty option created', data: option });
  } catch (err) {
    console.error('[admin.quote.settings] create_warranty_option:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to create warranty option' });
  }
};

exports.update_warranty_option = async (req, res) => {
  try {
    const option = await QuoteWarrantyOption.findOne({ _id: req.params.id, deleted_at: null });
    if (!option) return res.status(404).json({ status: 'error', message: 'Warranty option not found' });

    const allowedFields = [
      'name', 'duration_months', 'covered_products', 'terms',
      'pricing_mode', 'price_per_kit_paise', 'price_pct', 'is_active',
      'eligible_industry_type_ids', 'eligible_project_type_ids',
      'eligible_combo_kit_ids', 'sort_order', 'badge_color',
    ];
    allowedFields.forEach(f => { if (req.body[f] !== undefined) option[f] = req.body[f]; });
    option.updated_by = req.user?.id || null;
    await option.save();

    return res.json({ status: 'success', message: 'Warranty option updated', data: option });
  } catch (err) {
    console.error('[admin.quote.settings] update_warranty_option:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update warranty option' });
  }
};

exports.delete_warranty_option = async (req, res) => {
  try {
    const option = await QuoteWarrantyOption.findOne({ _id: req.params.id, deleted_at: null });
    if (!option) return res.status(404).json({ status: 'error', message: 'Warranty option not found' });
    option.deleted_at = new Date();
    option.updated_by = req.user?.id || null;
    await option.save();
    return res.json({ status: 'success', message: 'Warranty option deleted' });
  } catch (err) {
    console.error('[admin.quote.settings] delete_warranty_option:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to delete warranty option' });
  }
};

/* ── Admin Quote List ────────────────────────────────────────────────────── */

exports.list_all_quotes = async (req, res) => {
  try {
    const {
      page = 1, limit = 30, status, franchisee_id, bde_id,
      epc_id, date_from, date_to, search, sort_by = 'created_at', sort_dir = '-1',
    } = req.query;

    const filter = { deleted_at: null };
    if (status) filter.status = { $in: status.split(',') };
    if (franchisee_id && mongoose.Types.ObjectId.isValid(franchisee_id)) {
      filter.franchisee_id = new mongoose.Types.ObjectId(franchisee_id);
    }
    if (bde_id && mongoose.Types.ObjectId.isValid(bde_id)) {
      filter.bde_id = new mongoose.Types.ObjectId(bde_id);
    }
    if (epc_id && mongoose.Types.ObjectId.isValid(epc_id)) {
      filter.epc_id = new mongoose.Types.ObjectId(epc_id);
    }
    if (date_from || date_to) {
      filter.created_at = {};
      if (date_from) filter.created_at.$gte = new Date(date_from);
      if (date_to)   filter.created_at.$lte = new Date(date_to);
    }
    if (search) filter.$or = [
      { quote_number: { $regex: search, $options: 'i' } },
      { 'epc_snapshot.company_name': { $regex: search, $options: 'i' } },
      { 'franchisee_snapshot.business_name': { $regex: search, $options: 'i' } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [quotes, total] = await Promise.all([
      EpcQuote.find(filter).sort({ [sort_by]: parseInt(sort_dir) }).skip(skip).limit(parseInt(limit)).lean(),
      EpcQuote.countDocuments(filter),
    ]);

    return res.json({ status: 'success', data: { quotes, total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error('[admin.quote.settings] list_all_quotes:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to list quotes' });
  }
};

exports.get_admin_quote = async (req, res) => {
  try {
    const quote = await EpcQuote.findOne({ _id: req.params.id, deleted_at: null }).lean();
    if (!quote) return res.status(404).json({ status: 'error', message: 'Quote not found' });
    return res.json({ status: 'success', data: quote });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch quote' });
  }
};

exports.get_quote_pdf = async (req, res) => {
  try {
    return epcQuotesHandler.get_pdf(req, res);
  } catch (err) {
    console.error('[admin.quote.settings] get_quote_pdf:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to stream quote PDF' });
  }
};

/* ── Analytics ────────────────────────────────────────────────────────────── */

exports.get_analytics = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const matchFilter = { deleted_at: null };
    if (date_from || date_to) {
      matchFilter.created_at = {};
      if (date_from) matchFilter.created_at.$gte = new Date(date_from);
      if (date_to)   matchFilter.created_at.$lte = new Date(date_to);
    }

    const [statusAgg, valueAgg, topFranchisees, topBDEs] = await Promise.all([
      EpcQuote.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      EpcQuote.aggregate([
        { $match: matchFilter },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          total_quoted_paise: { $sum: '$total_amount_paise' },
          total_converted_paise: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, '$total_amount_paise', 0] } },
          converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
        }},
      ]),
      EpcQuote.aggregate([
        { $match: matchFilter },
        { $group: {
          _id: '$franchisee_id',
          franchisee_name: { $first: '$franchisee_snapshot.business_name' },
          total_quotes: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
          pipeline_paise: { $sum: '$total_amount_paise' },
        }},
        { $sort: { total_quotes: -1 } },
        { $limit: 10 },
      ]),
      EpcQuote.aggregate([
        { $match: { ...matchFilter, bde_id: { $ne: null } } },
        { $group: {
          _id: '$bde_id',
          bde_name: { $first: '$bde_snapshot.full_name' },
          total_quotes: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
          pipeline_paise: { $sum: '$total_amount_paise' },
        }},
        { $sort: { total_quotes: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const summary = valueAgg[0] || {};
    const conversion_rate = summary.total > 0 ? ((summary.converted / summary.total) * 100).toFixed(1) : '0.0';

    const by_status_map = {};
    (statusAgg || []).forEach((s) => {
      by_status_map[s._id] = s.count;
    });

    return res.json({
      status: 'success',
      data: {
        summary: {
          total: summary.total || 0,
          total_quotes: summary.total || 0,
          converted: summary.converted || 0,
          converted_quotes: summary.converted || 0,
          lost: summary.lost || 0,
          lost_quotes: summary.lost || 0,
          conversion_rate_pct: parseFloat(conversion_rate),
          total_quoted_paise: summary.total_quoted_paise || 0,
          total_pipeline_value_paise: summary.total_quoted_paise || 0,
          total_converted_paise: summary.total_converted_paise || 0,
          total_converted_value_paise: summary.total_converted_paise || 0,
          avg_deal_paise: summary.total > 0 ? Math.round((summary.total_quoted_paise || 0) / summary.total) : 0,
        },
        by_status: statusAgg,
        by_status_map: by_status_map,
        top_franchisees: topFranchisees,
        top_bdes: topBDEs,
      },
    });
  } catch (err) {
    console.error('[admin.quote.settings] get_analytics:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to get analytics' });
  }
};
