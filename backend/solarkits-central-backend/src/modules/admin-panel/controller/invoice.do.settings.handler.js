const mongoose = require('mongoose');
const { SolarShopSettings } = require('../models/india_solarshop_db');
const { CompanyWarehouse } = require('../models/company_warehouse_db');
const { GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');

const DEFAULT_GLOBAL_SETTINGS = {
  scope_type: 'global',
  scope_id: null,
  scope_name: 'All India (Global Default)',
  invoice_prefix: 'SK',
  invoice_suffix: '',
  financial_year_format: 'YYYY-YY',
  current_invoice_sequence: 1000,
  sequence_padding: 4,
  invoice_generation_trigger: 'warehouse_dispatch',
  allow_manual_regeneration: true,
  prevent_duplicate_numbers: true,
  company_name: 'SolarKits Energy Private Limited',
  trade_name: 'SolarKits India',
  gstin: '07AAAAA0000A1Z5',
  cin: 'U40106DL2026PTC123456',
  pan: 'AAAAA0000A',
  logo_url: '',
  billing_address: 'SolarKits Industrial Tech Hub, Sector 62, Noida, UP - 201301',
  state_name: 'Uttar Pradesh',
  state_code: '09',
  support_phone: '+91 98765 43210',
  support_email: 'billing@solarkits.com',
  // Authorized Signatory & Official Seal
  signatory_name: 'Rahil Sunnovative',
  signatory_designation: 'Authorized Signatory & Finance Officer',
  signature_stamp_url: '',
  // Invoice Color Styling & Title
  brand_color: '#0f172a',
  accent_color: '#f97316',
  invoice_header_title: 'TAX INVOICE',
  // Bank & Settlement Details
  bank_name: 'HDFC Bank Ltd',
  bank_account_number: '50200012345678',
  bank_ifsc: 'HDFC0001234',
  bank_branch: 'Sector 62 Industrial Area, Noida',
  upi_id: 'solarkits@hdfcbank',
  // Solar Kit Line Itemization
  kit_itemization_mode: 'kit_package',
  selected_preset_kit_id: 'kit-5kw-ongrid',
  kit_name: 'SolarKits 5kW Commercial Tier-1 On-Grid System Kit',
  kit_panel_brand: 'Waaree Energies 550W TOPCon Bifacial',
  kit_inverter_brand: 'Growatt 5kW 3-Phase Dual MPPT',
  kit_capacity_kw: 5,
  kit_base_rate: 185000,
  kit_gst_rate: 12,
  kit_hsn_code: '85414300',
  show_oem_brands: true,
  show_warranty_terms: true,
  show_hsn_code: true,
  show_component_specs: true,
  terms_and_conditions: [
    'Goods once sold and dispatched will be accepted back only in accordance with SolarKits Replacement Policy.',
    'All disputes are subject to local state/district jurisdiction.',
    'Warranty on solar modules, inverters, and BOS components is provided by the respective OEMs as per their terms.',
    'Interest @ 18% per annum will be charged on payments delayed beyond the agreed payment credit period.'
  ],
  do_prefix: 'DO',
  do_numbering_format: '{PREFIX}-{WH}-{YYMM}-{SEQ}',
  current_do_sequence: 100,
  do_sequence_padding: 4,
  auto_generate_do_on_payment: true,
  require_cluster_staff_assignment: true,
  prevent_duplicate_do: true,
  is_active: true,
  updated_by_name: 'Super Admin',
  updated_at: new Date(),
};

/**
 * Helper: Formats the current or requested Financial Year string
 * e.g. FY 2026-27
 */
function getFormattedFinancialYear(format = 'YYYY-YY') {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = Jan, 3 = April
  const currentYear = now.getFullYear();

  let startYear = currentYear;
  let endYear = currentYear + 1;

  if (currentMonth < 3) { // Jan, Feb, Mar belong to previous FY
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  const startStr = String(startYear);
  const endStr = String(endYear);

  if (format === 'YYYY-YY') {
    return `${startStr}-${endStr.slice(-2)}`;
  } else if (format === 'YYYY-YYYY') {
    return `${startStr}-${endStr}`;
  } else if (format === 'YY-YY') {
    return `${startStr.slice(-2)}-${endStr.slice(-2)}`;
  }
  return '';
}

/**
 * Helper: Generates a sample formatted invoice string
 */
function generateSampleInvoiceNumber(settings) {
  const prefix = settings.invoice_prefix || 'SK';
  const suffix = settings.invoice_suffix ? `-${settings.invoice_suffix}` : '';
  const fy = settings.financial_year_format !== 'NONE' ? `/${getFormattedFinancialYear(settings.financial_year_format)}` : '';
  const seq = String(settings.current_invoice_sequence || 1000).padStart(settings.sequence_padding || 4, '0');
  return `${prefix}${fy}/${seq}${suffix}`;
}

/**
 * Helper: Generates a sample formatted DO string
 */
function generateSampleDoNumber(settings, warehouseCode = 'MW01') {
  const prefix = settings.do_prefix || 'DO';
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(settings.current_do_sequence || 100).padStart(settings.do_sequence_padding || 4, '0');
  
  let fmt = settings.do_numbering_format || '{PREFIX}-{WH}-{YYMM}-{SEQ}';
  fmt = fmt.replace('{PREFIX}', prefix)
           .replace('{WH}', warehouseCode)
           .replace('{YYMM}', yymm)
           .replace('{SEQ}', seq);
  return fmt;
}

/**
 * 1. GET /api/admin/invoice-do-settings
 * Fetch settings for specified scope (global default if not provided)
 */
exports.get_settings = async (req, res) => {
  try {
    const { scope_type = 'global', scope_id = null } = req.query;

    let doc = await SolarShopSettings.findOne().lean();
    if (!doc) {
      doc = await SolarShopSettings.create({});
      doc = doc.toObject ? doc.toObject() : doc;
    }

    const globalSettings = {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...(doc.invoice_and_do_settings || {})
    };

    let settings;
    if (scope_type === 'global' || !scope_id) {
      settings = { ...globalSettings };
    } else {
      const overrides = doc.invoice_and_do_overrides || [];
      const found = overrides.find(o => String(o.scope_id) === String(scope_id));
      if (found) {
        settings = { ...globalSettings, ...found, is_inherited: false };
      } else {
        settings = { ...globalSettings, is_inherited: true, scope_type, scope_id };
      }
    }

    settings.preview_invoice_number = generateSampleInvoiceNumber(settings);
    settings.preview_do_number = generateSampleDoNumber(settings);
    settings.current_fy = getFormattedFinancialYear(settings.financial_year_format);

    return res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (err) {
    console.error('Error fetching invoice/DO settings:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Server error' });
  }
};

/**
 * 2. POST /api/admin/invoice-do-settings
 * Save or update invoice & DO settings
 */
exports.save_settings = async (req, res) => {
  try {
    const {
      scope_type = 'global',
      scope_id = null,
      scope_name,
      invoice_prefix,
      invoice_suffix,
      financial_year_format,
      current_invoice_sequence,
      sequence_padding,
      invoice_generation_trigger,
      allow_manual_regeneration,
      prevent_duplicate_numbers,
      company_name,
      trade_name,
      gstin,
      cin,
      pan,
      logo_url,
      billing_address,
      state_name,
      state_code,
      support_phone,
      support_email,
      terms_and_conditions,
      signatory_name,
      signatory_designation,
      signature_stamp_url,
      brand_color,
      accent_color,
      invoice_header_title,
      bank_name,
      bank_account_number,
      bank_ifsc,
      bank_branch,
      upi_id,
      kit_itemization_mode,
      selected_preset_kit_id,
      kit_name,
      kit_panel_brand,
      kit_inverter_brand,
      kit_capacity_kw,
      kit_base_rate,
      kit_gst_rate,
      kit_hsn_code,
      show_oem_brands,
      show_warranty_terms,
      show_hsn_code,
      show_component_specs,
      do_prefix,
      do_numbering_format,
      current_do_sequence,
      do_sequence_padding,
      auto_generate_do_on_payment,
      require_cluster_staff_assignment,
      prevent_duplicate_do,
    } = req.body;

    const updateData = {
      scope_type,
      scope_id: scope_type !== 'global' ? scope_id : null,
      scope_name: scope_name || (scope_type === 'global' ? 'All India (Global Default)' : 'Custom Override'),
      invoice_prefix: invoice_prefix?.trim() || 'SK',
      invoice_suffix: invoice_suffix?.trim() || '',
      financial_year_format: financial_year_format || 'YYYY-YY',
      current_invoice_sequence: Number(current_invoice_sequence) || 1000,
      sequence_padding: Number(sequence_padding) || 4,
      invoice_generation_trigger: invoice_generation_trigger || 'warehouse_dispatch',
      allow_manual_regeneration: allow_manual_regeneration !== undefined ? Boolean(allow_manual_regeneration) : true,
      prevent_duplicate_numbers: prevent_duplicate_numbers !== undefined ? Boolean(prevent_duplicate_numbers) : true,
      company_name: company_name || 'SolarKits Energy Private Limited',
      trade_name: trade_name || 'SolarKits India',
      gstin: gstin ? gstin.trim().toUpperCase() : '',
      cin: cin ? cin.trim().toUpperCase() : '',
      pan: pan ? pan.trim().toUpperCase() : '',
      logo_url: logo_url || '',
      billing_address: billing_address || '',
      state_name: state_name || '',
      state_code: state_code || '',
      support_phone: support_phone || '',
      support_email: support_email || '',
      terms_and_conditions: Array.isArray(terms_and_conditions) ? terms_and_conditions : [],
      // Authorized Signatory
      signatory_name: signatory_name || 'Rahil Sunnovative',
      signatory_designation: signatory_designation || 'Authorized Signatory & Finance Officer',
      signature_stamp_url: signature_stamp_url || '',
      // Colors & Styling
      brand_color: brand_color || '#0f172a',
      accent_color: accent_color || '#f97316',
      invoice_header_title: invoice_header_title || 'TAX INVOICE',
      // Bank Details
      bank_name: bank_name || '',
      bank_account_number: bank_account_number || '',
      bank_ifsc: bank_ifsc || '',
      bank_branch: bank_branch || '',
      upi_id: upi_id || '',
      // Kit Itemization
      kit_itemization_mode: kit_itemization_mode || 'kit_package',
      selected_preset_kit_id: selected_preset_kit_id || 'kit-5kw-ongrid',
      kit_name: kit_name || 'SolarKits 5kW Commercial Tier-1 On-Grid System Kit',
      kit_panel_brand: kit_panel_brand || '',
      kit_inverter_brand: kit_inverter_brand || '',
      kit_capacity_kw: Number(kit_capacity_kw) || 5,
      kit_base_rate: Number(kit_base_rate) || 185000,
      kit_gst_rate: Number(kit_gst_rate) || 12,
      kit_hsn_code: kit_hsn_code || '85414300',
      show_oem_brands: show_oem_brands !== undefined ? Boolean(show_oem_brands) : true,
      show_warranty_terms: show_warranty_terms !== undefined ? Boolean(show_warranty_terms) : true,
      show_hsn_code: show_hsn_code !== undefined ? Boolean(show_hsn_code) : true,
      show_component_specs: show_component_specs !== undefined ? Boolean(show_component_specs) : true,
      do_prefix: do_prefix?.trim() || 'DO',
      do_numbering_format: do_numbering_format || '{PREFIX}-{WH}-{YYMM}-{SEQ}',
      current_do_sequence: Number(current_do_sequence) || 100,
      do_sequence_padding: Number(do_sequence_padding) || 4,
      auto_generate_do_on_payment: auto_generate_do_on_payment !== undefined ? Boolean(auto_generate_do_on_payment) : true,
      require_cluster_staff_assignment: require_cluster_staff_assignment !== undefined ? Boolean(require_cluster_staff_assignment) : true,
      prevent_duplicate_do: prevent_duplicate_do !== undefined ? Boolean(prevent_duplicate_do) : true,
      updated_by: req.user?.id || req.user?._id || null,
      updated_by_name: req.user?.name || 'Super Admin',
      updated_at: new Date(),
    };

    let doc = await SolarShopSettings.findOne();
    if (!doc) {
      doc = await SolarShopSettings.create({});
    }

    if (scope_type === 'global') {
      doc.invoice_and_do_settings = updateData;
    } else {
      const overrides = doc.invoice_and_do_overrides || [];
      const idx = overrides.findIndex(o => String(o.scope_id) === String(scope_id));
      if (idx >= 0) {
        overrides[idx] = { ...overrides[idx], ...updateData };
      } else {
        overrides.push({ ...updateData, _id: new mongoose.Types.ObjectId() });
      }
      doc.invoice_and_do_overrides = overrides;
    }

    doc.markModified('invoice_and_do_settings');
    doc.markModified('invoice_and_do_overrides');
    await doc.save();

    const result = { ...updateData };
    result.preview_invoice_number = generateSampleInvoiceNumber(result);
    result.preview_do_number = generateSampleDoNumber(result);
    result.current_fy = getFormattedFinancialYear(result.financial_year_format);

    return res.status(200).json({
      status: 'success',
      message: 'Invoice & Delivery Order settings saved successfully!',
      data: result,
    });
  } catch (err) {
    console.error('Error saving invoice/DO settings:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Server error' });
  }
};

/**
 * 3. GET /api/admin/invoice-do-settings/scopes
 * List all configured overrides (global, states, warehouses)
 */
exports.list_all_scope_settings = async (req, res) => {
  try {
    let doc = await SolarShopSettings.findOne().lean();
    const globalSettings = {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...(doc?.invoice_and_do_settings || {})
    };
    const overrides = doc?.invoice_and_do_overrides || [];

    const list = [
      {
        _id: 'global',
        scope_type: 'global',
        scope_name: globalSettings.scope_name || 'All India (Global Default)',
        invoice_prefix: globalSettings.invoice_prefix || 'SK',
        gstin: globalSettings.gstin,
        state_name: globalSettings.state_name,
        updated_by_name: globalSettings.updated_by_name || 'Super Admin',
        updated_at: globalSettings.updated_at || new Date(),
      },
      ...overrides.map(o => ({
        _id: o._id || o.scope_id,
        scope_type: o.scope_type,
        scope_id: o.scope_id,
        scope_name: o.scope_name,
        invoice_prefix: o.invoice_prefix,
        gstin: o.gstin,
        state_name: o.state_name,
        updated_by_name: o.updated_by_name || 'Admin',
        updated_at: o.updated_at || new Date(),
      }))
    ];

    return res.status(200).json({
      status: 'success',
      data: list,
    });
  } catch (err) {
    console.error('Error listing scope settings:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Server error' });
  }
};

/**
 * 5. GET /api/admin/invoice-do-settings/warehouses
 * Fetch all available company warehouse facilities with state and address
 */
exports.get_available_warehouses = async (req, res) => {
  try {
    const rows = await CompanyWarehouse.find({ deleted_at: null })
      .select('_id warehouse_name name warehouse_code code level_0 level_1 level_2 address pincode status is_active')
      .sort({ created_at: -1 })
      .lean();

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: [],
        warehouses: [],
      });
    }

    const level1_ids = [...new Set(rows.map(r => r.level_1).filter(Boolean))];
    const level2_ids = [...new Set(rows.map(r => r.level_2).filter(Boolean))];

    const [states, districts] = await Promise.all([
      GeoLevel1.find({ _id: { $in: level1_ids } }).lean(),
      GeoLevel2.find({ _id: { $in: level2_ids } }).lean()
    ]);

    const stateMap = Object.fromEntries(states.map(s => [s._id.toString(), s.name]));
    const districtMap = Object.fromEntries(districts.map(d => [d._id.toString(), d.name]));

    const normalized = rows.map(wh => ({
      _id: String(wh._id || wh.id),
      id: String(wh._id || wh.id),
      warehouse_name: wh.warehouse_name || wh.name || wh.warehouse_code,
      warehouse_code: wh.warehouse_code || wh.code || 'MW01',
      state: stateMap[wh.level_1?.toString()] || wh.state || 'Other State',
      state_name: stateMap[wh.level_1?.toString()] || wh.state || 'Other State',
      city: districtMap[wh.level_2?.toString()] || wh.district || '',
      district: districtMap[wh.level_2?.toString()] || wh.district || '',
      address: wh.address || '',
      pincode: wh.pincode || '',
      status: wh.status,
      is_active: wh.is_active,
    }));

    return res.status(200).json({
      status: 'success',
      data: normalized,
      warehouses: normalized,
    });
  } catch (err) {
    console.error('Error in get_available_warehouses:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Server error' });
  }
};
exports.delete_scope_settings = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'global') {
      return res.status(400).json({ status: 'error', message: 'Cannot delete global default settings. You may update them instead.' });
    }

    let doc = await SolarShopSettings.findOne();
    if (doc) {
      const overrides = doc.invoice_and_do_overrides || [];
      doc.invoice_and_do_overrides = overrides.filter(o => String(o._id) !== String(id) && String(o.scope_id) !== String(id));
      doc.markModified('invoice_and_do_overrides');
      await doc.save();
    }

    return res.status(200).json({
      status: 'success',
      message: `Override removed. Fallback to Global settings restored.`,
    });
  } catch (err) {
    console.error('Error deleting scope settings:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Server error' });
  }
};
