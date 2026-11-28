const mongoose = require('mongoose');
const { TrialKitFeedbackConfig } = require('../models/india_solarshop_db');
const { GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');

const DEFAULT_LOOSE_QUANTITIES = [45, 75, 105];
const DEFAULT_PO_QUANTITIES = [200, 500, 1000];

/**
 * 1. GET ALL ACTIVE STATES
 * Fetches all states from geolocation_level_1 with district counts and config summary.
 */
exports.get_states = async (req, res) => {
  try {
    const states = await GeoLevel1.find({ deleted_at: null, is_active: true })
      .select('_id name')
      .sort({ name: 1 })
      .lean();

    // Fetch district counts grouped by state
    const districtCounts = await GeoLevel2.aggregate([
      { $match: { deleted_at: null } },
      { $group: { _id: '$level_1', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    districtCounts.forEach(c => {
      countMap[c._id.toString()] = c.count;
    });

    // Fetch states with configured overrides or defaults
    const configuredStates = await TrialKitFeedbackConfig.aggregate([
      {
        $group: {
          _id: '$state_id',
          has_state_default: { $max: '$is_state_default' },
          custom_districts_count: {
            $sum: {
              $cond: [{ $and: [{ $ne: ['$district_id', null] }, { $eq: ['$is_active', true] }] }, 1, 0]
            }
          }
        }
      }
    ]);
    const configMap = {};
    configuredStates.forEach(c => {
      configMap[c._id.toString()] = {
        has_state_default: Boolean(c.has_state_default),
        custom_districts_count: c.custom_districts_count || 0
      };
    });

    const enrichedStates = states.map(s => {
      const sId = s._id.toString();
      return {
        id: s._id,
        _id: s._id,
        name: s.name,
        total_districts: countMap[sId] || 0,
        has_state_default: configMap[sId]?.has_state_default || false,
        custom_districts_count: configMap[sId]?.custom_districts_count || 0
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedStates
    });
  } catch (err) {
    console.error('❌ Error fetching states for feedback config:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. GET ALL DISTRICTS FOR A STATE WITH CURRENT CONFIGURATION
 * Returns all districts in list format, merged with their custom or state-level configuration.
 * Satisfies the requirement: Admin sees all districts directly in a list without needing to "Add" any district.
 */
exports.get_districts_with_config = async (req, res) => {
  try {
    const { state_id } = req.query;
    if (!state_id || !mongoose.Types.ObjectId.isValid(state_id)) {
      return res.status(400).json({ success: false, message: 'Valid state_id is required.' });
    }

    const state = await GeoLevel1.findById(state_id).lean();
    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found.' });
    }

    // 1. Fetch State-level default configuration (district_id is null)
    let stateDefaultConfig = await TrialKitFeedbackConfig.findOne({
      state_id,
      district_id: null
    }).lean();

    if (!stateDefaultConfig) {
      stateDefaultConfig = {
        state_id: state._id,
        state_name: state.name,
        district_id: null,
        district_name: null,
        feedback_mode: 'both',
        loose_quantities: DEFAULT_LOOSE_QUANTITIES,
        po_quantities: DEFAULT_PO_QUANTITIES,
        default_mode: 'loose',
        is_active: true,
        is_state_default: true,
        is_persisted: false
      };
    } else {
      stateDefaultConfig.is_persisted = true;
    }

    // 2. Fetch all districts belonging to this state from GeoLevel2
    const allDistricts = await GeoLevel2.find({
      level_1: state_id,
      deleted_at: null
    })
      .select('_id name pincodes is_active')
      .sort({ name: 1 })
      .lean();

    // 3. Fetch all custom district configurations for this state
    const districtConfigs = await TrialKitFeedbackConfig.find({
      state_id,
      district_id: { $ne: null }
    }).lean();

    const districtConfigMap = {};
    districtConfigs.forEach(dc => {
      districtConfigMap[dc.district_id.toString()] = dc;
    });

    // 4. Merge each district with its config
    const mergedDistricts = allDistricts.map(d => {
      const dId = d._id.toString();
      const customConfig = districtConfigMap[dId];

      if (customConfig) {
        return {
          district_id: d._id,
          district_name: d.name,
          pincodes_count: d.pincodes?.length || 0,
          is_geo_active: d.is_active !== false,
          is_custom_override: true,
          config_id: customConfig._id,
          feedback_mode: customConfig.feedback_mode || 'both',
          loose_quantities: customConfig.loose_quantities?.length ? customConfig.loose_quantities : DEFAULT_LOOSE_QUANTITIES,
          po_quantities: customConfig.po_quantities?.length ? customConfig.po_quantities : DEFAULT_PO_QUANTITIES,
          default_mode: customConfig.default_mode || 'loose',
          is_active: customConfig.is_active !== false,
          updated_at: customConfig.updated_at
        };
      }

      // Inherit from state default
      return {
        district_id: d._id,
        district_name: d.name,
        pincodes_count: d.pincodes?.length || 0,
        is_geo_active: d.is_active !== false,
        is_custom_override: false,
        config_id: null,
        feedback_mode: stateDefaultConfig.feedback_mode || 'both',
        loose_quantities: stateDefaultConfig.loose_quantities?.length ? stateDefaultConfig.loose_quantities : DEFAULT_LOOSE_QUANTITIES,
        po_quantities: stateDefaultConfig.po_quantities?.length ? stateDefaultConfig.po_quantities : DEFAULT_PO_QUANTITIES,
        default_mode: stateDefaultConfig.default_mode || 'loose',
        is_active: stateDefaultConfig.is_active !== false,
        updated_at: null
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        state: {
          id: state._id,
          _id: state._id,
          name: state.name
        },
        state_default: stateDefaultConfig,
        districts: mergedDistricts,
        summary: {
          total_districts: mergedDistricts.length,
          custom_overrides_count: mergedDistricts.filter(d => d.is_custom_override).length,
          loose_only_count: mergedDistricts.filter(d => d.feedback_mode === 'loose_only').length,
          po_only_count: mergedDistricts.filter(d => d.feedback_mode === 'po_only').length,
          both_count: mergedDistricts.filter(d => d.feedback_mode === 'both').length,
        }
      }
    });
  } catch (err) {
    console.error('❌ Error fetching districts with config:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. SAVE / UPDATE DISTRICT CONFIGURATION
 * Upserts a custom override configuration for a single district.
 */
exports.save_district_config = async (req, res) => {
  try {
    const { district_id } = req.params;
    const {
      state_id,
      state_name,
      district_name,
      feedback_mode,
      loose_quantities,
      po_quantities,
      default_mode,
      is_active
    } = req.body;

    if (!district_id || !mongoose.Types.ObjectId.isValid(district_id)) {
      return res.status(400).json({ success: false, message: 'Valid district_id is required.' });
    }

    // Verify district exists
    const district = await GeoLevel2.findById(district_id).lean();
    if (!district) {
      return res.status(404).json({ success: false, message: 'District not found in geolocation database.' });
    }

    const resolvedStateId = state_id || district.level_1;
    const state = await GeoLevel1.findById(resolvedStateId).lean();

    // Clean & validate quantities
    const cleanedLoose = Array.isArray(loose_quantities)
      ? loose_quantities.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)
      : DEFAULT_LOOSE_QUANTITIES;

    const cleanedPo = Array.isArray(po_quantities)
      ? po_quantities.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)
      : DEFAULT_PO_QUANTITIES;

    const updateDoc = {
      state_id: resolvedStateId,
      state_name: state_name || state?.name || '',
      district_id: district._id,
      district_name: district_name || district.name,
      feedback_mode: ['loose_only', 'po_only', 'both'].includes(feedback_mode) ? feedback_mode : 'both',
      loose_quantities: cleanedLoose.length ? cleanedLoose : DEFAULT_LOOSE_QUANTITIES,
      po_quantities: cleanedPo.length ? cleanedPo : DEFAULT_PO_QUANTITIES,
      default_mode: ['loose', 'bulk_po'].includes(default_mode) ? default_mode : 'loose',
      is_active: is_active !== false,
      is_state_default: false,
      updated_by_name: req.user?.name || 'Admin',
      updated_at: new Date()
    };

    const saved = await TrialKitFeedbackConfig.findOneAndUpdate(
      { state_id: resolvedStateId, district_id: district._id },
      { $set: updateDoc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: `Configuration for district ${district.name} saved successfully.`,
      data: saved
    });
  } catch (err) {
    console.error('❌ Error saving district feedback config:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. SAVE / UPDATE STATE-LEVEL DEFAULT CONFIGURATION
 * Optionally applies state default policy to all districts in the state.
 */
exports.save_state_default_config = async (req, res) => {
  try {
    const { state_id } = req.params;
    const {
      state_name,
      feedback_mode,
      loose_quantities,
      po_quantities,
      default_mode,
      is_active,
      apply_to_all_districts
    } = req.body;

    if (!state_id || !mongoose.Types.ObjectId.isValid(state_id)) {
      return res.status(400).json({ success: false, message: 'Valid state_id is required.' });
    }

    const state = await GeoLevel1.findById(state_id).lean();
    if (!state) {
      return res.status(404).json({ success: false, message: 'State not found in geolocation database.' });
    }

    const cleanedLoose = Array.isArray(loose_quantities)
      ? loose_quantities.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)
      : DEFAULT_LOOSE_QUANTITIES;

    const cleanedPo = Array.isArray(po_quantities)
      ? po_quantities.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)
      : DEFAULT_PO_QUANTITIES;

    const updateDoc = {
      state_id: state._id,
      state_name: state_name || state.name,
      district_id: null,
      district_name: null,
      feedback_mode: ['loose_only', 'po_only', 'both'].includes(feedback_mode) ? feedback_mode : 'both',
      loose_quantities: cleanedLoose.length ? cleanedLoose : DEFAULT_LOOSE_QUANTITIES,
      po_quantities: cleanedPo.length ? cleanedPo : DEFAULT_PO_QUANTITIES,
      default_mode: ['loose', 'bulk_po'].includes(default_mode) ? default_mode : 'loose',
      is_active: is_active !== false,
      is_state_default: true,
      updated_by_name: req.user?.name || 'Admin',
      updated_at: new Date()
    };

    const savedStateDefault = await TrialKitFeedbackConfig.findOneAndUpdate(
      { state_id: state._id, district_id: null },
      { $set: updateDoc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // If apply_to_all_districts is true, delete custom overrides for this state so all districts inherit cleanly
    if (apply_to_all_districts === true) {
      await TrialKitFeedbackConfig.deleteMany({
        state_id: state._id,
        district_id: { $ne: null }
      });
    }

    return res.status(200).json({
      success: true,
      message: `State default configuration for ${state.name} saved successfully.${apply_to_all_districts ? ' Applied to all districts.' : ''}`,
      data: savedStateDefault
    });
  } catch (err) {
    console.error('❌ Error saving state default feedback config:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. RESET DISTRICT CONFIGURATION (REVERT TO STATE DEFAULT)
 * Removes the custom override for this district so it inherits state default policy.
 */
exports.reset_district_config = async (req, res) => {
  try {
    const { district_id } = req.params;
    if (!district_id || !mongoose.Types.ObjectId.isValid(district_id)) {
      return res.status(400).json({ success: false, message: 'Valid district_id is required.' });
    }

    const deleted = await TrialKitFeedbackConfig.findOneAndDelete({
      district_id
    });

    return res.status(200).json({
      success: true,
      message: deleted
        ? 'District configuration reset to inherit state default.'
        : 'District was already inheriting state default.'
    });
  } catch (err) {
    console.error('❌ Error resetting district feedback config:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. STOREFRONT / EPC RESOLVER ENDPOINT
 * Resolves the active feedback configuration for a given state & district (or from authenticated EPC user).
 * Used by TrialKitOrderModal.jsx to render dynamic Question 1 mode and Question 2 batch pills.
 */
exports.get_storefront_feedback_config = async (req, res) => {
  try {
    let stateName = (req.query.state_name || '').trim();
    let districtName = (req.query.district_name || '').trim();
    let stateId = req.query.state_id || null;
    let districtId = req.query.district_id || null;
    const pincode = (req.query.pincode || '').trim();

    // If EPC user is authenticated and location is not passed in query, fallback to user's profile
    if ((!stateName || !districtName) && req.user) {
      stateName = stateName || req.user.state_name || req.user.state || '';
      districtName = districtName || req.user.district_name || req.user.district || '';
      if (!stateId && req.user.states && req.user.states[0]) {
        stateId = req.user.states[0];
      }
      if (!districtId && req.user.districts && req.user.districts[0]) {
        districtId = req.user.districts[0];
      }
    }

    // If pincode is provided but state/district missing, look up pincode in GeoLevel2
    if ((!stateName || !districtName) && /^\d{6}$/.test(pincode)) {
      const geoDistrict = await GeoLevel2.findOne({
        'pincodes.pincode': pincode,
        deleted_at: null
      }).populate('level_1', 'name').lean();

      if (geoDistrict) {
        districtId = geoDistrict._id;
        districtName = geoDistrict.name;
        if (geoDistrict.level_1) {
          stateId = geoDistrict.level_1._id;
          stateName = geoDistrict.level_1.name;
        }
      }
    }

    // 1. Try to find custom district configuration
    let districtConfig = null;
    if (districtId && mongoose.Types.ObjectId.isValid(districtId)) {
      districtConfig = await TrialKitFeedbackConfig.findOne({
        district_id: districtId,
        is_active: true
      }).lean();
    }
    if (!districtConfig && districtName) {
      districtConfig = await TrialKitFeedbackConfig.findOne({
        district_name: { $regex: new RegExp(`^${districtName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        district_id: { $ne: null },
        is_active: true
      }).lean();
    }

    if (districtConfig) {
      return res.status(200).json({
        success: true,
        data: {
          feedback_mode: districtConfig.feedback_mode || 'both',
          loose_quantities: districtConfig.loose_quantities?.length ? districtConfig.loose_quantities : DEFAULT_LOOSE_QUANTITIES,
          po_quantities: districtConfig.po_quantities?.length ? districtConfig.po_quantities : DEFAULT_PO_QUANTITIES,
          default_mode: districtConfig.default_mode || 'loose',
          state_name: districtConfig.state_name || stateName,
          district_name: districtConfig.district_name || districtName,
          source: 'district_override'
        }
      });
    }

    // 2. Try to find State-level default configuration
    let stateConfig = null;
    if (stateId && mongoose.Types.ObjectId.isValid(stateId)) {
      stateConfig = await TrialKitFeedbackConfig.findOne({
        state_id: stateId,
        district_id: null,
        is_active: true
      }).lean();
    }
    if (!stateConfig && stateName) {
      stateConfig = await TrialKitFeedbackConfig.findOne({
        state_name: { $regex: new RegExp(`^${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        district_id: null,
        is_active: true
      }).lean();
    }

    if (stateConfig) {
      return res.status(200).json({
        success: true,
        data: {
          feedback_mode: stateConfig.feedback_mode || 'both',
          loose_quantities: stateConfig.loose_quantities?.length ? stateConfig.loose_quantities : DEFAULT_LOOSE_QUANTITIES,
          po_quantities: stateConfig.po_quantities?.length ? stateConfig.po_quantities : DEFAULT_PO_QUANTITIES,
          default_mode: stateConfig.default_mode || 'loose',
          state_name: stateConfig.state_name || stateName,
          district_name: districtName || null,
          source: 'state_default'
        }
      });
    }

    // 3. Fallback standard default
    return res.status(200).json({
      success: true,
      data: {
        feedback_mode: 'both',
        loose_quantities: DEFAULT_LOOSE_QUANTITIES,
        po_quantities: DEFAULT_PO_QUANTITIES,
        default_mode: 'loose',
        state_name: stateName || null,
        district_name: districtName || null,
        source: 'system_default'
      }
    });
  } catch (err) {
    console.error('❌ Error resolving storefront feedback config:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
