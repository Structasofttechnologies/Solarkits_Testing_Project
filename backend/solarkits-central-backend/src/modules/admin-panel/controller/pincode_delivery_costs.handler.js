const mongoose = require('mongoose');
const { PincodeDeliveryCost } = require('../models/india_solarshop_db');
const ComboKit = require('../models/india_solarshop_db/combo_kits.schema');
const { GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');
const { WarehouseClusterMapping } = require('../models/core_db');
const { CompanyWarehouse } = require('../../warehouse-panel/models/company_warehouse_db');

/**
 * Haversine formula: calculate aerial distance in kilometers between two geo coordinates
 */
function calculate_distance_km(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return 0;

  const R = 6371; // Earth's mean radius in km
  const dLat = (numLat2 - numLat1) * (Math.PI / 180);
  const dLon = (numLon2 - numLon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(numLat1 * (Math.PI / 180)) *
    Math.cos(numLat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * GET /admin-api/pincode-delivery-costs/fulfillment-warehouses
 * Fetch real warehouses from WarehouseClusterMapping and CompanyWarehouse
 * No static or dummy data.
 */
const get_fulfillment_warehouses = async (req, res) => {
  try {
    const mappings = await WarehouseClusterMapping.find({ deleted_at: null, status: 'Active' })
      .sort({ warehouse_name: 1 })
      .lean();

    let compWarehouses = [];
    try {
      compWarehouses = await CompanyWarehouse.find({ deleted_at: null }).lean();
    } catch (e) {
      console.warn('CompanyWarehouse lookup error:', e.message);
    }

    const result = mappings.map(m => {
      // Find matching company warehouse to get precise GPS coordinates & address
      const matched = compWarehouses.find(cw =>
        (m.warehouse_code && cw.warehouse_code && m.warehouse_code.toLowerCase() === cw.warehouse_code.toLowerCase()) ||
        (m.warehouse_name && cw.address && (
          (m.warehouse_name.includes('Ahmedabad') && cw.address.includes('Ahmedabad')) ||
          (m.warehouse_name.includes('Bhiwandi') && cw.address.includes('Bhiwandi')) ||
          (m.warehouse_name.includes('Bengaluru') && cw.address.includes('Bengaluru')) ||
          (m.warehouse_name.includes('Gurgaon') && (cw.address.includes('Delhi') || cw.address.includes('Gurgaon')))
        ))
      );

      return {
        id: m._id.toString(),
        warehouse_id: matched ? matched._id.toString() : m._id.toString(),
        warehouse_code: m.warehouse_code,
        warehouse_name: m.warehouse_name,
        cluster_name: m.cluster_name,
        states: m.states || [],
        kit_types: m.kit_types || [],
        warehouse_type: matched?.warehouse_type || 'master',
        lat: matched?.lat || null,
        lng: matched?.lng || null,
        address: matched?.address || '',
        pincode: matched?.pincode || '',
        status: m.status
      };
    });

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error in get_fulfillment_warehouses:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};

/**
 * GET /admin-api/pincode-delivery-costs
 * List configured pincode delivery freight rules with filters & pagination
 */
const get_delivery_costs = async (req, res) => {
  try {
    const {
      state_name,
      district_name,
      pincode,
      combo_kit_id,
      warehouse_code,
      pricing_mode,
      is_active,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (state_name && state_name.trim()) {
      query.state_name = new RegExp(`^${state_name.trim()}$`, 'i');
    }

    if (district_name && district_name.trim()) {
      const d = district_name.trim();
      const flexible = d
        .replace(/oo|u/gi, '(?:oo|u)')
        .replace(/ee|i/gi, '(?:ee|i)')
        .replace(/\s+/g, '\\s*');
      query.district_name = new RegExp(`^${flexible}$`, 'i');
    }

    if (pincode && pincode.trim()) {
      query.pincode = new RegExp(pincode.trim(), 'i');
    }

    if (warehouse_code && warehouse_code.trim()) {
      query.warehouse_code = warehouse_code.trim();
    }

    if (pricing_mode && pricing_mode.trim()) {
      query.pricing_mode = pricing_mode.trim();
    }

    if (combo_kit_id) {
      if (combo_kit_id === 'default' || combo_kit_id === 'null') {
        query.combo_kit_id = null;
      } else if (mongoose.Types.ObjectId.isValid(combo_kit_id)) {
        query.combo_kit_id = new mongoose.Types.ObjectId(combo_kit_id);
      }
    }

    if (is_active !== undefined && is_active !== '') {
      query.is_active = is_active === 'true' || is_active === true;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const flexibleQ = q
        .replace(/oo|u/gi, '(?:oo|u)')
        .replace(/ee|i/gi, '(?:ee|i)');
      query.$or = [
        { pincode: new RegExp(q, 'i') },
        { state_name: new RegExp(q, 'i') },
        { district_name: new RegExp(flexibleQ, 'i') },
        { combo_kit_name: new RegExp(q, 'i') },
        { warehouse_name: new RegExp(q, 'i') },
        { warehouse_code: new RegExp(q, 'i') },
      ];
    }

    const isExport = req.query.is_export === 'true' || req.query.export === 'true';
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const maxLimit = isExport ? 10000 : 200;
    const limitNum = Math.max(1, Math.min(maxLimit, parseInt(limit, 10) || 20));
    const skip = isExport ? 0 : (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      PincodeDeliveryCost.find(query)
        .populate('combo_kit_id', 'name kit_image capacity')
        .sort({ updated_at: -1, created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PincodeDeliveryCost.countDocuments(query),
    ]);

    // Summary stats
    const [totalActive, distinctPincodes, distinctDistricts] = await Promise.all([
      PincodeDeliveryCost.countDocuments({ is_active: true }),
      PincodeDeliveryCost.distinct('pincode'),
      PincodeDeliveryCost.distinct('district_name'),
    ]);

    return res.status(200).json({
      status: 'success',
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalActive,
        distinctPincodesCount: distinctPincodes.length,
        distinctDistrictsCount: distinctDistricts.length,
      },
    });
  } catch (error) {
    console.error('Error in get_delivery_costs:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};

/**
 * POST /admin-api/pincode-delivery-costs
 * Create or upsert a new single delivery cost rule
 */
const create_delivery_cost = async (req, res) => {
  try {
    const {
      state_name,
      district_name,
      pincode,
      combo_kit_id,
      delivery_cost,
      loose_delivery_cost,
      po_delivery_cost,
      trial_delivery_cost,
      warehouse_id,
      warehouse_code,
      warehouse_name,
      warehouse_type,
      pricing_mode = 'fixed',
      distance_km = 0,
      rate_per_km_loose = 0,
      rate_per_km_po = 0,
      rate_per_km_trial = 0,
      base_delivery_cost = 0,
      estimated_days_min = 3,
      estimated_days_max = 7,
      is_active = true,
      notes = null,
      country_id = null,
      state_id = null,
      district_id = null,
    } = req.body;

    const finalDeliveryCost = delivery_cost !== undefined && delivery_cost !== null
      ? parseFloat(delivery_cost)
      : (loose_delivery_cost !== undefined && loose_delivery_cost !== null ? parseFloat(loose_delivery_cost) : NaN);

    if (!state_name || !district_name || !pincode || isNaN(finalDeliveryCost)) {
      return res.status(400).json({
        status: 'error',
        message: 'State, District, Pincode, and Delivery Cost are required.',
      });
    }

    const cleanPincode = String(pincode).trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter a valid 6-digit Indian PIN code.',
      });
    }

    let targetKitId = null;
    let comboKitName = null;
    if (combo_kit_id && combo_kit_id !== 'default' && combo_kit_id !== 'null') {
      if (!mongoose.Types.ObjectId.isValid(combo_kit_id)) {
        return res.status(400).json({ status: 'error', message: 'Invalid combo_kit_id format.' });
      }
      targetKitId = new mongoose.Types.ObjectId(combo_kit_id);
      const kitDoc = await ComboKit.findById(targetKitId).select('name').lean();
      if (kitDoc) comboKitName = kitDoc.name;
    }

    const costNum = Math.max(0, finalDeliveryCost);
    const looseCostNum = loose_delivery_cost !== undefined && loose_delivery_cost !== null && !isNaN(parseFloat(loose_delivery_cost))
      ? Math.max(0, parseFloat(loose_delivery_cost))
      : costNum;
    const poCostNum = po_delivery_cost !== undefined && po_delivery_cost !== null && !isNaN(parseFloat(po_delivery_cost))
      ? Math.max(0, parseFloat(po_delivery_cost))
      : costNum;
    const trialCostNum = trial_delivery_cost !== undefined && trial_delivery_cost !== null && !isNaN(parseFloat(trial_delivery_cost))
      ? Math.max(0, parseFloat(trial_delivery_cost))
      : costNum;

    // Check if duplicate rule exists
    const existing = await PincodeDeliveryCost.findOne({
      pincode: cleanPincode,
      combo_kit_id: targetKitId,
    });

    if (existing) {
      existing.state_name = state_name.trim();
      existing.district_name = district_name.trim();
      existing.delivery_cost = costNum;
      existing.loose_delivery_cost = looseCostNum;
      existing.po_delivery_cost = poCostNum;
      existing.trial_delivery_cost = trialCostNum;
      existing.warehouse_id = warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id) ? warehouse_id : existing.warehouse_id;
      existing.warehouse_code = warehouse_code || existing.warehouse_code;
      existing.warehouse_name = warehouse_name || existing.warehouse_name;
      existing.warehouse_type = warehouse_type || existing.warehouse_type;
      existing.pricing_mode = pricing_mode || existing.pricing_mode || 'fixed';
      existing.distance_km = Number(distance_km) || existing.distance_km || 0;
      existing.rate_per_km_loose = Number(rate_per_km_loose) || 0;
      existing.rate_per_km_po = Number(rate_per_km_po) || 0;
      existing.rate_per_km_trial = Number(rate_per_km_trial) || 0;
      existing.base_delivery_cost = Number(base_delivery_cost) || 0;
      existing.estimated_days_min = Number(estimated_days_min) || 3;
      existing.estimated_days_max = Number(estimated_days_max) || 7;
      existing.is_active = is_active !== false;
      existing.notes = notes || existing.notes;
      existing.combo_kit_name = comboKitName;
      existing.updated_at = new Date();
      await existing.save();

      return res.status(200).json({
        status: 'success',
        message: 'Pincode delivery cost rule updated successfully.',
        data: existing,
      });
    }

    const newRule = new PincodeDeliveryCost({
      country_id: country_id || null,
      state_id: state_id || null,
      state_name: state_name.trim(),
      district_id: district_id || null,
      district_name: district_name.trim(),
      pincode: cleanPincode,
      combo_kit_id: targetKitId,
      combo_kit_name: comboKitName,
      warehouse_id: warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id) ? warehouse_id : null,
      warehouse_code: warehouse_code || null,
      warehouse_name: warehouse_name || null,
      warehouse_type: warehouse_type || null,
      pricing_mode: pricing_mode || 'fixed',
      distance_km: Number(distance_km) || 0,
      rate_per_km_loose: Number(rate_per_km_loose) || 0,
      rate_per_km_po: Number(rate_per_km_po) || 0,
      rate_per_km_trial: Number(rate_per_km_trial) || 0,
      base_delivery_cost: Number(base_delivery_cost) || 0,
      delivery_cost: costNum,
      loose_delivery_cost: looseCostNum,
      po_delivery_cost: poCostNum,
      trial_delivery_cost: trialCostNum,
      estimated_days_min: Number(estimated_days_min) || 3,
      estimated_days_max: Number(estimated_days_max) || 7,
      is_active: is_active !== false,
      notes: notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await newRule.save();

    return res.status(201).json({
      status: 'success',
      message: 'Pincode delivery cost rule created successfully.',
      data: newRule,
    });
  } catch (error) {
    console.error('Error in create_delivery_cost:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};

/**
 * PUT /admin-api/pincode-delivery-costs/:id
 * Update an existing delivery cost rule
 */
const update_delivery_cost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid delivery cost ID.' });
    }

    const existing = await PincodeDeliveryCost.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Delivery cost rule not found.' });
    }

    const {
      state_name,
      district_name,
      pincode,
      combo_kit_id,
      delivery_cost,
      loose_delivery_cost,
      po_delivery_cost,
      trial_delivery_cost,
      warehouse_id,
      warehouse_code,
      warehouse_name,
      warehouse_type,
      pricing_mode,
      distance_km,
      rate_per_km_loose,
      rate_per_km_po,
      rate_per_km_trial,
      base_delivery_cost,
      estimated_days_min,
      estimated_days_max,
      is_active,
      notes,
    } = req.body;

    if (state_name) existing.state_name = state_name.trim();
    if (district_name) existing.district_name = district_name.trim();
    if (pincode) {
      const clean = String(pincode).trim();
      if (!/^\d{6}$/.test(clean)) {
        return res.status(400).json({ status: 'error', message: 'Please enter a valid 6-digit PIN code.' });
      }
      existing.pincode = clean;
    }

    if (combo_kit_id !== undefined) {
      if (!combo_kit_id || combo_kit_id === 'null' || combo_kit_id === 'default') {
        existing.combo_kit_id = null;
        existing.combo_kit_name = null;
      } else if (mongoose.Types.ObjectId.isValid(combo_kit_id)) {
        existing.combo_kit_id = new mongoose.Types.ObjectId(combo_kit_id);
        const kitDoc = await ComboKit.findById(existing.combo_kit_id).select('name').lean();
        if (kitDoc) existing.combo_kit_name = kitDoc.name;
      }
    }

    if (warehouse_id !== undefined) {
      existing.warehouse_id = warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id) ? warehouse_id : null;
    }
    if (warehouse_code !== undefined) existing.warehouse_code = warehouse_code;
    if (warehouse_name !== undefined) existing.warehouse_name = warehouse_name;
    if (warehouse_type !== undefined) existing.warehouse_type = warehouse_type;
    if (pricing_mode !== undefined) existing.pricing_mode = pricing_mode;
    if (distance_km !== undefined) existing.distance_km = Number(distance_km) || 0;
    if (rate_per_km_loose !== undefined) existing.rate_per_km_loose = Number(rate_per_km_loose) || 0;
    if (rate_per_km_po !== undefined) existing.rate_per_km_po = Number(rate_per_km_po) || 0;
    if (rate_per_km_trial !== undefined) existing.rate_per_km_trial = Number(rate_per_km_trial) || 0;
    if (base_delivery_cost !== undefined) existing.base_delivery_cost = Number(base_delivery_cost) || 0;

    if (delivery_cost !== undefined) {
      const costNum = parseFloat(delivery_cost);
      if (isNaN(costNum) || costNum < 0) {
        return res.status(400).json({ status: 'error', message: 'Delivery cost must be a non-negative number.' });
      }
      existing.delivery_cost = costNum;
    }

    if (loose_delivery_cost !== undefined) {
      const lCost = parseFloat(loose_delivery_cost);
      if (!isNaN(lCost) && lCost >= 0) {
        existing.loose_delivery_cost = lCost;
        if (delivery_cost === undefined) existing.delivery_cost = lCost;
      }
    }

    if (po_delivery_cost !== undefined) {
      const pCost = parseFloat(po_delivery_cost);
      if (!isNaN(pCost) && pCost >= 0) {
        existing.po_delivery_cost = pCost;
      }
    }

    if (trial_delivery_cost !== undefined) {
      const tCost = parseFloat(trial_delivery_cost);
      if (!isNaN(tCost) && tCost >= 0) {
        existing.trial_delivery_cost = tCost;
      }
    }

    if (estimated_days_min !== undefined) existing.estimated_days_min = Number(estimated_days_min) || 3;
    if (estimated_days_max !== undefined) existing.estimated_days_max = Number(estimated_days_max) || 7;
    if (is_active !== undefined) existing.is_active = is_active === true || is_active === 'true';
    if (notes !== undefined) existing.notes = notes;

    existing.updated_at = new Date();
    await existing.save();

    return res.status(200).json({
      status: 'success',
      message: 'Delivery cost rule updated successfully.',
      data: existing,
    });
  } catch (error) {
    console.error('Error in update_delivery_cost:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};

/**
 * DELETE /admin-api/pincode-delivery-costs/:id
 * Delete a delivery cost rule
 */
const delete_delivery_cost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid delivery cost ID.' });
    }

    const deleted = await PincodeDeliveryCost.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Delivery cost rule not found.' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Delivery cost rule deleted successfully.',
    });
  } catch (error) {
    console.error('Error in delete_delivery_cost:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};

/**
 * POST /admin-api/pincode-delivery-costs/apply-district-rates
 * Automatically fetch all pincodes for the given state and district(s) from Geolocation DB
 * and apply rates across all pincodes for the 3 order types (Loose, PO, Trial).
 * Supports both:
 * 1. Fixed Price Mode: flat rate for loose, po, trial
 * 2. KM-Wise Mode: calculates distance (KM) from warehouse coordinates to destination pincode/district
 *    and computes freight = base + (distance * rate_per_km).
 */
const apply_district_rates = async (req, res) => {
  try {
    const {
      combo_kit_id,
      state_id,
      state_name,
      selected_states, // array of state names or IDs
      state_names,
      district_ids, // array or string
      apply_to_all_districts = false,
      
      // Warehouse Mapping
      warehouse_id = null,
      warehouse_code = null,
      warehouse_name = null,
      warehouse_type = null,
      warehouse_lat = null,
      warehouse_lng = null,

      // Pricing Mode: 'fixed' | 'per_km'
      pricing_mode = 'fixed',
      distance_km = 0,
      rate_per_km_loose = 0,
      rate_per_km_po = 0,
      rate_per_km_trial = 0,
      base_delivery_cost = 0,

      // Fixed Rates (fallback or when pricing_mode === 'fixed')
      loose_delivery_cost = 0,
      po_delivery_cost = 0,
      trial_delivery_cost = 0,
      delivery_cost,

      estimated_days_min = 3,
      estimated_days_max = 7,
      is_active = true,
      notes = null,
    } = req.body;

    // 1. Resolve All Specified States (Supports single or multiple mapped states)
    let rawStateInputs = [];
    if (Array.isArray(selected_states) && selected_states.length > 0) {
      rawStateInputs = selected_states;
    } else if (Array.isArray(state_names) && state_names.length > 0) {
      rawStateInputs = state_names;
    } else if (state_name) {
      rawStateInputs = [state_name];
    } else if (state_id) {
      rawStateInputs = [state_id];
    }

    if (rawStateInputs.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one state is required to apply district rates.',
      });
    }

    // Match by ID or clean name
    const stateRegexes = rawStateInputs.map(s => {
      const clean = String(s).replace(/\s*\(.*?\)/, '').trim();
      return new RegExp(`^${clean}`, 'i');
    });

    const stateDocs = await GeoLevel1.find({
      $and: [
        {
          $or: [
            { name: { $in: stateRegexes } },
            ...(rawStateInputs.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => ({ _id: new mongoose.Types.ObjectId(id) })))
          ]
        },
        {
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        }
      ]
    }).lean();

    if (!stateDocs || stateDocs.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'None of the selected states were found in geolocation master.',
      });
    }

    const stateMap = {};
    stateDocs.forEach(s => {
      stateMap[s._id.toString()] = { id: s._id, name: s.name };
    });
    const resolvedStateIds = stateDocs.map(s => s._id);
    const resolvedStateNames = stateDocs.map(s => s.name);

    // 2. Resolve Districts across all resolved states
    const districtFilter = {
      level_1: { $in: resolvedStateIds },
      is_active: true,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }],
    };

    const isAll = apply_to_all_districts === true ||
      apply_to_all_districts === 'true' ||
      district_ids === 'all' ||
      (Array.isArray(district_ids) && district_ids.includes('all'));

    if (!isAll && district_ids) {
      let idsArr = Array.isArray(district_ids) ? district_ids : [district_ids];
      idsArr = idsArr
        .map(id => String(id).trim())
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (idsArr.length > 0) {
        districtFilter._id = { $in: idsArr };
      }
    }

    const districts = await GeoLevel2.find(districtFilter)
      .select('_id name level_1 lat lng pincodes')
      .lean();

    if (!districts || districts.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No active districts found for the specified state/selection.',
      });
    }

    // 3. Resolve Target Combo Kit
    let targetKitId = null;
    let comboKitName = null;
    if (combo_kit_id && combo_kit_id !== 'default' && combo_kit_id !== 'null') {
      if (mongoose.Types.ObjectId.isValid(combo_kit_id)) {
        targetKitId = new mongoose.Types.ObjectId(combo_kit_id);
        const kitDoc = await ComboKit.findById(targetKitId).select('name').lean();
        if (kitDoc) comboKitName = kitDoc.name;
      }
    }

    // 4. Resolve Warehouse Coordinates for KM Calculation
    let whLat = warehouse_lat != null ? Number(warehouse_lat) : null;
    let whLng = warehouse_lng != null ? Number(warehouse_lng) : null;

    if (pricing_mode === 'per_km' && (whLat == null || whLng == null)) {
      if (warehouse_code) {
        const cw = await CompanyWarehouse.findOne({
          warehouse_code: new RegExp(`^${warehouse_code.trim()}$`, 'i'),
          deleted_at: null
        }).lean();
        if (cw && cw.lat != null && cw.lng != null) {
          whLat = cw.lat;
          whLng = cw.lng;
        }
      }
    }

    // Parse KM rate inputs
    const isKmMode = pricing_mode === 'per_km';
    const rateKmLoose = Math.max(0, parseFloat(rate_per_km_loose) || 0);
    const rateKmPo = Math.max(0, parseFloat(rate_per_km_po) || 0);
    const rateKmTrial = Math.max(0, parseFloat(rate_per_km_trial) || 0);
    const baseCost = Math.max(0, parseFloat(base_delivery_cost) || 0);

    // Parse Fixed rate inputs
    const fixedLoose = Math.max(0, parseFloat(loose_delivery_cost !== undefined ? loose_delivery_cost : delivery_cost) || 0);
    const fixedPo = Math.max(0, parseFloat(po_delivery_cost !== undefined ? po_delivery_cost : delivery_cost) || 0);
    const fixedTrial = Math.max(0, parseFloat(trial_delivery_cost !== undefined ? trial_delivery_cost : delivery_cost) || 0);
    const fixedFallback = delivery_cost !== undefined && !isNaN(parseFloat(delivery_cost))
      ? Math.max(0, parseFloat(delivery_cost))
      : fixedLoose;

    const estMin = Math.max(1, parseInt(estimated_days_min, 10) || 3);
    const estMax = Math.max(estMin, parseInt(estimated_days_max, 10) || 7);
    const isActiveBool = is_active !== false && is_active !== 'false';

    // 5. Build bulk operations with per-pincode or per-district distance calculation
    const bulkOps = [];
    const seenPincodes = new Set();
    let totalPincodesCount = 0;

    for (const dist of districts) {
      const pinList = dist.pincodes || [];
      const distLat = dist.lat != null ? Number(dist.lat) : null;
      const distLng = dist.lng != null ? Number(dist.lng) : null;

      for (const pItem of pinList) {
        const rawPin = pItem?.pincode || (typeof pItem === 'string' ? pItem : null);
        const cleanPin = String(rawPin || '').trim();
        if (!/^\d{6}$/.test(cleanPin)) continue;
        if (seenPincodes.has(cleanPin)) continue;

        seenPincodes.add(cleanPin);
        totalPincodesCount++;

        let effectiveLoose = fixedLoose;
        let effectivePo = fixedPo;
        let effectiveTrial = fixedTrial;
        let effectiveFallback = fixedFallback;
        let effectiveDistKm = Number(distance_km) || 0;

        if (isKmMode) {
          const pinLat = pItem?.lat != null ? Number(pItem.lat) : distLat;
          const pinLng = pItem?.lng != null ? Number(pItem.lng) : distLng;

          if (whLat != null && whLng != null && pinLat != null && pinLng != null) {
            effectiveDistKm = calculate_distance_km(whLat, whLng, pinLat, pinLng);
          }

          effectiveLoose = Math.round(baseCost + (effectiveDistKm * rateKmLoose));
          effectivePo = Math.round(baseCost + (effectiveDistKm * rateKmPo));
          effectiveTrial = Math.round(baseCost + (effectiveDistKm * rateKmTrial));
          effectiveFallback = effectiveLoose;
        }

        const distState = dist.level_1 && stateMap[dist.level_1.toString()]
          ? stateMap[dist.level_1.toString()]
          : { id: resolvedStateIds[0], name: resolvedStateNames[0] };

        bulkOps.push({
          updateOne: {
            filter: {
              pincode: cleanPin,
              combo_kit_id: targetKitId,
            },
            update: {
              $set: {
                state_id: distState.id,
                state_name: distState.name,
                district_id: dist._id,
                district_name: dist.name,
                pincode: cleanPin,
                combo_kit_id: targetKitId,
                combo_kit_name: comboKitName,
                warehouse_id: warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id) ? warehouse_id : null,
                warehouse_code: warehouse_code || null,
                warehouse_name: warehouse_name || null,
                warehouse_type: warehouse_type || null,
                pricing_mode: isKmMode ? 'per_km' : 'fixed',
                distance_km: effectiveDistKm,
                rate_per_km_loose: rateKmLoose,
                rate_per_km_po: rateKmPo,
                rate_per_km_trial: rateKmTrial,
                base_delivery_cost: baseCost,
                delivery_cost: effectiveFallback,
                loose_delivery_cost: effectiveLoose,
                po_delivery_cost: effectivePo,
                trial_delivery_cost: effectiveTrial,
                estimated_days_min: estMin,
                estimated_days_max: estMax,
                is_active: isActiveBool,
                notes: notes || `${isKmMode ? 'KM-based rate' : 'Fixed rate'} applied from ${warehouse_name || 'Hub'} for ${dist.name}, ${distState.name}`,
                updated_at: new Date(),
              },
              $setOnInsert: {
                created_at: new Date(),
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid 6-digit pincodes found in the selected district(s). Please verify the geolocation master.',
      });
    }

    const bulkResult = await PincodeDeliveryCost.bulkWrite(bulkOps, { ordered: false });

    return res.status(200).json({
      status: 'success',
      message: `${isKmMode ? 'KM-wise' : 'Fixed'} delivery rates successfully applied to ${totalPincodesCount} pincodes across ${districts.length} district(s) in ${resolvedStateNames.join(', ')}.`,
      data: {
        state_names: resolvedStateNames,
        state_name: resolvedStateNames.join(', '),
        districts_count: districts.length,
        pincodes_count: totalPincodesCount,
        warehouse_code,
        warehouse_name,
        pricing_mode: isKmMode ? 'per_km' : 'fixed',
        upserted_count: bulkResult.upsertedCount || 0,
        modified_count: bulkResult.modifiedCount || 0,
        rates_summary: isKmMode ? {
          mode: 'per_km',
          base_delivery_cost: baseCost,
          rate_per_km_loose: rateKmLoose,
          rate_per_km_po: rateKmPo,
          rate_per_km_trial: rateKmTrial,
        } : {
          mode: 'fixed',
          loose_delivery_cost: fixedLoose,
          po_delivery_cost: fixedPo,
          trial_delivery_cost: fixedTrial,
        },
      },
    });
  } catch (error) {
    console.error('Error in apply_district_rates:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal Server Error while applying district rates.',
    });
  }
};

/**
 * POST /admin-api/pincode-delivery-costs/bulk-import
 * Batch import or upload delivery freight rules
 */
const bulk_import_delivery_costs = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Items array cannot be empty.' });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const {
          state_name,
          district_name,
          pincode,
          combo_kit_id,
          delivery_cost,
          loose_delivery_cost,
          po_delivery_cost,
          trial_delivery_cost,
          warehouse_code,
          warehouse_name,
          pricing_mode = 'fixed',
          distance_km = 0,
          estimated_days_min = 3,
          estimated_days_max = 7,
          is_active = true,
          notes,
        } = item;

        const cleanPincode = String(pincode || '').trim();
        if (!state_name || !district_name || !/^\d{6}$/.test(cleanPincode)) {
          failedCount++;
          errors.push(`Row ${i + 1}: Missing fields or invalid 6-digit pincode (${cleanPincode})`);
          continue;
        }

        const cost = parseFloat(delivery_cost);
        const lCost = loose_delivery_cost !== undefined && !isNaN(parseFloat(loose_delivery_cost))
          ? parseFloat(loose_delivery_cost)
          : (!isNaN(cost) ? cost : 0);
        const pCost = po_delivery_cost !== undefined && !isNaN(parseFloat(po_delivery_cost))
          ? parseFloat(po_delivery_cost)
          : (!isNaN(cost) ? cost : 0);
        const tCost = trial_delivery_cost !== undefined && !isNaN(parseFloat(trial_delivery_cost))
          ? parseFloat(trial_delivery_cost)
          : (!isNaN(cost) ? cost : 0);
        const finalCost = !isNaN(cost) ? cost : lCost;

        let targetKitId = null;
        let comboKitName = null;
        if (combo_kit_id && mongoose.Types.ObjectId.isValid(combo_kit_id)) {
          targetKitId = new mongoose.Types.ObjectId(combo_kit_id);
          const kit = await ComboKit.findById(targetKitId).select('name').lean();
          if (kit) comboKitName = kit.name;
        }

        await PincodeDeliveryCost.findOneAndUpdate(
          { pincode: cleanPincode, combo_kit_id: targetKitId },
          {
            $set: {
              state_name: state_name.trim(),
              district_name: district_name.trim(),
              delivery_cost: finalCost,
              loose_delivery_cost: lCost,
              po_delivery_cost: pCost,
              trial_delivery_cost: tCost,
              warehouse_code: warehouse_code || null,
              warehouse_name: warehouse_name || null,
              pricing_mode: pricing_mode || 'fixed',
              distance_km: Number(distance_km) || 0,
              estimated_days_min: Number(estimated_days_min) || 3,
              estimated_days_max: Number(estimated_days_max) || 7,
              is_active: is_active !== false,
              notes: notes || null,
              combo_kit_name: comboKitName,
              updated_at: new Date(),
            },
            $setOnInsert: {
              created_at: new Date(),
            },
          },
          { upsert: true, new: true }
        );

        successCount++;
      } catch (err) {
        failedCount++;
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Bulk import completed: ${successCount} processed, ${failedCount} failed.`,
      data: { successCount, failedCount, errors },
    });
  } catch (error) {
    console.error('Error in bulk_import_delivery_costs:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};

/**
 * GET /admin-api/pincode-delivery-costs/kit-stats
 * Returns aggregated pincode count and price ranges grouped by combo_kit_id
 */
const get_kit_stats = async (req, res) => {
  try {
    const stats = await PincodeDeliveryCost.aggregate([
      {
        $group: {
          _id: '$combo_kit_id',
          total_pincodes: { $sum: 1 },
          min_cost: { $min: '$delivery_cost' },
          max_cost: { $max: '$delivery_cost' },
          min_loose_cost: { $min: '$loose_delivery_cost' },
          max_loose_cost: { $max: '$loose_delivery_cost' },
          min_po_cost: { $min: '$po_delivery_cost' },
          max_po_cost: { $max: '$po_delivery_cost' },
          min_trial_cost: { $min: '$trial_delivery_cost' },
          max_trial_cost: { $max: '$trial_delivery_cost' },
          active_count: {
            $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] },
          },
        },
      },
    ]);

    return res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Error in get_kit_stats:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};

module.exports = {
  get_fulfillment_warehouses,
  get_delivery_costs,
  get_kit_stats,
  create_delivery_cost,
  update_delivery_cost,
  delete_delivery_cost,
  bulk_import_delivery_costs,
  apply_district_rates,
};
