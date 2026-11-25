const mongoose = require('mongoose');
const {
  IndustryType,
  ProjectCategory,
  ProjectSubcategory,
  SolarKit: SolarKitDefinition
} = require('../../../admin-panel/models/core_db');

const ComboKit = require('../../models/india_solarshop_db/combo_kits.schema');
const EpcAccount = require('../../models/india_solarshop_db/epc_accounts.schema');
const EpcPreference = require('../../models/india_solarshop_db/epc_preferences.schema');
const EpcMarketingConsent = require('../../models/india_solarshop_db/epc_marketing_consents.schema');

/**
 * 1. GET /india/v1/epc/preferences/config-options
 * Fetches Industry Types, Categories, and Configured Combo Kits dynamically from Admin configuration
 */
exports.get_config_options = async (req, res) => {
  try {
    const [industries, categories, subcategories, comboKits, blueprints] = await Promise.all([
      IndustryType.find({ deleted_at: null, is_active: true }).sort({ sort_order: 1, name: 1 }).lean().catch(() => []),
      ProjectCategory.find({ deleted_at: null, is_active: true }).sort({ sort_order: 1, name: 1 }).lean().catch(() => []),
      ProjectSubcategory.find({ deleted_at: null, is_active: true }).lean().catch(() => []),
      ComboKit.find({ deleted_at: null, is_active: true }).sort({ created_at: -1 }).lean().catch(() => []),
      SolarKitDefinition.find({ deleted_at: null }).lean().catch(() => [])
    ]);

    // Create lookup maps
    const blueprintMap = new Map();
    blueprints.forEach((b) => blueprintMap.set(String(b._id), b));

    // Map combo kits to their category & industry
    const kitList = comboKits.map((k) => {
      const bp = blueprintMap.get(String(k.solar_kit_id)) || {};
      const catId = String(bp.category_id || k.project_category_id || '');
      return {
        id: k._id,
        _id: k._id,
        name: k.name,
        capacity: k.capacity || 0,
        kit_image: k.kit_image,
        category_id: catId,
        blueprint_name: bp.name || k.name,
        selling_price: k.selling_price_cached || 0,
        moq: (k.order_quantities && k.order_quantities[0]) || 25,
        created_at: k.created_at
      };
    });

    // Build hierarchical industry -> category -> kits tree
    const hierarchy = industries.map((ind) => {
      const indId = String(ind._id);
      const indCategories = categories.filter((c) => String(c.industry_type_id || '') === indId);

      const categoryItems = indCategories.map((cat) => {
        const catId = String(cat._id);
        const matchedKits = kitList.filter((k) => k.category_id === catId);
        const matchedSubcategories = subcategories
          .filter((s) => String(s.category) === catId)
          .map((s) => ({
            id: s._id,
            _id: s._id,
            name: s.name,
            image: s.image || null,
            color: s.color || null,
            category_id: s.category
          }));

        return {
          id: cat._id,
          _id: cat._id,
          name: cat.name,
          description: cat.description || null,
          subcategories: matchedSubcategories,
          total_subcategories: matchedSubcategories.length,
          kits: matchedKits
        };
      });

      // Also gather all kits under this industry across all its categories
      const allIndustryKits = categoryItems.flatMap((c) => c.kits);

      return {
        id: ind._id,
        _id: ind._id,
        name: ind.name,
        slug: ind.slug || null,
        description: ind.description || `Solar solutions tailored for ${ind.name} sector`,
        categories: categoryItems,
        total_kits_count: allIndustryKits.length
      };
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        industries: hierarchy,
        total_industries: hierarchy.length,
        total_kits: comboKits.length
      }
    });
  } catch (error) {
    console.error('[epc_preferences.get_config_options] Error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to load business preference options: ' + error.message
    });
  }
};

/**
 * Helper to resolve EPC ID from session/token
 */
const getEpcIdFromReq = (req) => {
  return req.user?.account_id || req.user?.id || req.query.epc_id || req.body.epc_id || null;
};

/**
 * 2. GET /india/v1/epc/preferences/check-status
 * Checks if first-login preference popup should be shown, or if there are newly introduced kits
 */
exports.check_epc_preference_status = async (req, res) => {
  try {
    const epcId = getEpcIdFromReq(req);
    if (!epcId || !mongoose.Types.ObjectId.isValid(epcId)) {
      return res.status(200).json({
        status: 'success',
        data: {
          show_first_login_popup: false,
          show_new_kits_alert: false,
          new_kits: []
        }
      });
    }

    const epcPref = await EpcPreference.findOne({ epc_id: epcId, deleted_at: null }).lean();

    // Case 1: First login — EPC has never submitted or skipped preferences
    if (!epcPref || epcPref.status === 'not_prompted') {
      return res.status(200).json({
        status: 'success',
        data: {
          show_first_login_popup: true,
          show_new_kits_alert: false,
          status: epcPref ? epcPref.status : 'not_prompted',
          new_kits: []
        }
      });
    }

    // Case 2: EPC has submitted or skipped — check if any NEW kits were introduced
    const lastSeenDate = epcPref.last_seen_kit_at || epcPref.submitted_at || epcPref.created_at;
    const selectedKitIds = (epcPref.selected_kit_ids || []).map((id) => String(id));

    // Find kits created after lastSeenDate that are not already in EPC's preferences
    const newKitsRaw = await ComboKit.find({
      deleted_at: null,
      is_active: true,
      created_at: { $gt: lastSeenDate }
    })
      .sort({ created_at: -1 })
      .limit(5)
      .lean();

    const unselectedNewKits = newKitsRaw.filter((k) => !selectedKitIds.includes(String(k._id)));

    if (unselectedNewKits.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          show_first_login_popup: false,
          show_new_kits_alert: false,
          status: epcPref.status,
          new_kits: []
        }
      });
    }

    // Populate blueprint/industry metadata for new kits alert
    const blueprints = await SolarKitDefinition.find({
      _id: { $in: unselectedNewKits.map((k) => k.solar_kit_id) }
    }).lean();
    const bpMap = new Map();
    blueprints.forEach((b) => bpMap.set(String(b._id), b));

    const categories = await ProjectCategory.find({
      _id: { $in: blueprints.map((b) => b.category_id).filter(Boolean) }
    }).lean();
    const catMap = new Map();
    categories.forEach((c) => catMap.set(String(c._id), c));

    const subcategories = await ProjectSubcategory.find({
      _id: { $in: blueprints.map((b) => b.subcategory_id).filter(Boolean) }
    }).lean();
    const subcatMap = new Map();
    subcategories.forEach((s) => subcatMap.set(String(s._id), s));

    const industries = await IndustryType.find({
      _id: { $in: categories.map((c) => c.industry_type_id).filter(Boolean) }
    }).lean();
    const indMap = new Map();
    industries.forEach((i) => indMap.set(String(i._id), i));

    const enrichedNewKits = unselectedNewKits.map((k) => {
      const bp = bpMap.get(String(k.solar_kit_id)) || {};
      const cat = catMap.get(String(bp.category_id)) || {};
      const subcat = subcatMap.get(String(bp.subcategory_id)) || {};
      const ind = indMap.get(String(cat.industry_type_id)) || {};

      const capacity = k.capacity || 0;
      const sellingPrice = Math.round(k.selling_price_cached || 0);
      const basePrice = Math.round(k.base_price_cached || 0);
      const ratePerKw = capacity > 0 ? Math.round(sellingPrice / capacity) : 0;
      const moq = (k.order_quantities && k.order_quantities[0]) || 200;
      const looseMoq = (k.loose_order_quantities && k.loose_order_quantities[0]) || 25;

      return {
        id: k._id,
        _id: k._id,
        name: k.name,
        capacity: capacity,
        selling_price: sellingPrice,
        base_price: basePrice,
        rate_per_kw: ratePerKw,
        kit_image: k.kit_image,
        description: k.description || bp.description || 'Pre-Engineered Solar Kit with certified panels, high-efficiency inverter, and complete BOS components.',
        industry_name: ind.name || 'Solar PV',
        industry_id: ind._id || null,
        category_name: cat.name || 'Residential Solar',
        category_id: cat._id || null,
        subcategory_name: subcat.name || 'Individual Home',
        subcategory_id: subcat._id || null,
        blueprint_name: bp.name || k.name,
        system_type: bp.system_type || 'On-Grid',
        moq: moq,
        loose_moq: looseMoq,
        allow_trial_kit: Boolean(k.allow_trial_kit),
        trial_kit_quantity: k.trial_kit_quantity || 10,
        trial_kit_max_orders_per_buyer: k.trial_kit_max_orders_per_buyer || 1,
        order_quantities: k.order_quantities || [200, 500],
        loose_order_quantities: k.loose_order_quantities || [25, 50, 100],
        created_at: k.created_at
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        show_first_login_popup: false,
        show_new_kits_alert: enrichedNewKits.length > 0,
        status: epcPref.status,
        new_kits: enrichedNewKits
      }
    });
  } catch (error) {
    console.error('[epc_preferences.check_epc_preference_status] Error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to verify preference status: ' + error.message
    });
  }
};

/**
 * 3. POST /india/v1/epc/preferences/submit
 * Submits first-login or profile preferences & marketing consents
 */
exports.submit_preferences = async (req, res) => {
  try {
    const epcId = getEpcIdFromReq(req);
    if (!epcId || !mongoose.Types.ObjectId.isValid(epcId)) {
      return res.status(400).json({ status: 'error', message: 'Valid EPC Account ID is required' });
    }

    const {
      selected_industry_ids = [],
      selected_category_ids = [],
      selected_subcategory_ids = [],
      selected_kit_ids = [],
      email_marketing_consent = false,
      whatsapp_marketing_consent = false
    } = req.body;

    const indObjIds = selected_industry_ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const catObjIds = selected_category_ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const subObjIds = selected_subcategory_ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const kitObjIds = selected_kit_ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    // Fetch names for denormalized search & quick display
    const [indDocs, catDocs, subDocs, kitDocs] = await Promise.all([
      IndustryType.find({ _id: { $in: indObjIds } }).lean().catch(() => []),
      ProjectCategory.find({ _id: { $in: catObjIds } }).lean().catch(() => []),
      ProjectSubcategory.find({ _id: { $in: subObjIds } }).lean().catch(() => []),
      ComboKit.find({ _id: { $in: kitObjIds } }).lean().catch(() => [])
    ]);

    const indNames = indDocs.map((i) => i.name);
    const catNames = catDocs.map((c) => c.name);
    const subNames = subDocs.map((s) => s.name);
    const kitNames = kitDocs.map((k) => k.name);

    const now = new Date();

    const updateSet = {
      selected_industry_ids: indObjIds,
      selected_industry_names: indNames,
      selected_category_ids: catObjIds,
      selected_category_names: catNames,
      selected_subcategory_ids: subObjIds,
      selected_subcategory_names: subNames,
      selected_kit_ids: kitObjIds,
      selected_kit_names: kitNames,
      status: 'submitted',
      submitted_at: now,
      last_seen_kit_at: now,
      updated_at: now
    };

    if (req.body.email_marketing_consent !== undefined) {
      updateSet.email_marketing_consent = Boolean(email_marketing_consent);
    }
    if (req.body.whatsapp_marketing_consent !== undefined) {
      updateSet.whatsapp_marketing_consent = Boolean(whatsapp_marketing_consent);
    }

    const preferenceDoc = await EpcPreference.findOneAndUpdate(
      { epc_id: epcId },
      {
        $set: updateSet,
        $push: {
          history: {
            action: 'PREFERENCE_SUBMITTED',
            details: {
              industries_count: indObjIds.length,
              kits_count: kitObjIds.length,
              email_consent: Boolean(email_marketing_consent),
              whatsapp_consent: Boolean(whatsapp_marketing_consent)
            },
            created_at: now
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Save formal consent audit record
    await EpcMarketingConsent.create({
      epc_id: epcId,
      email_consent: Boolean(email_marketing_consent),
      whatsapp_consent: Boolean(whatsapp_marketing_consent),
      consent_source: req.body.consent_source || 'first_login_popup',
      consent_version: 'v1.0'
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Business industry and kit preferences saved successfully!',
      data: preferenceDoc
    });
  } catch (error) {
    console.error('[epc_preferences.submit_preferences] Error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to save preferences: ' + error.message
    });
  }
};

/**
 * 4. POST /india/v1/epc/preferences/skip
 * Allows EPC to skip preference selection without blocking store access
 */
exports.skip_preferences = async (req, res) => {
  try {
    const epcId = getEpcIdFromReq(req);
    if (!epcId || !mongoose.Types.ObjectId.isValid(epcId)) {
      return res.status(400).json({ status: 'error', message: 'Valid EPC Account ID is required' });
    }

    const now = new Date();
    const doc = await EpcPreference.findOneAndUpdate(
      { epc_id: epcId },
      {
        $set: {
          status: 'skipped',
          last_seen_kit_at: now,
          updated_at: now
        },
        $push: {
          history: {
            action: 'FIRST_LOGIN_SKIP',
            details: { skipped_at: now },
            created_at: now
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Preference selection skipped. You can configure it anytime from your profile.',
      data: doc
    });
  } catch (error) {
    console.error('[epc_preferences.skip_preferences] Error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to process skip: ' + error.message
    });
  }
};

/**
 * 5. POST /india/v1/epc/preferences/add-kit-preference
 * Handles "Add this type of kits to your preferences" 1-click action from New Kit Alert Popup
 */
exports.add_kit_to_preferences = async (req, res) => {
  try {
    const epcId = getEpcIdFromReq(req);
    const { kit_id } = req.body;

    if (!epcId || !mongoose.Types.ObjectId.isValid(epcId)) {
      return res.status(400).json({ status: 'error', message: 'Valid EPC Account ID is required' });
    }
    if (!kit_id || !mongoose.Types.ObjectId.isValid(kit_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid Kit ID is required' });
    }

    const kit = await ComboKit.findById(kit_id).lean();
    if (!kit) {
      return res.status(404).json({ status: 'error', message: 'Solar Kit not found' });
    }

    // Resolve kit's blueprint -> category -> industry & subcategory
    let categoryId = null;
    let subcategoryId = null;
    let industryId = null;
    if (kit.solar_kit_id) {
      const bp = await SolarKitDefinition.findById(kit.solar_kit_id).lean();
      if (bp?.category_id) {
        categoryId = bp.category_id;
        const cat = await ProjectCategory.findById(categoryId).lean();
        if (cat?.industry_type_id) {
          industryId = cat.industry_type_id;
        }
      }
      if (bp?.subcategory_id) {
        subcategoryId = bp.subcategory_id;
      }
    }

    const now = new Date();
    const updateQuery = {
      $addToSet: {
        selected_kit_ids: kit._id,
        ...(kit.name ? { selected_kit_names: kit.name } : {}),
        ...(categoryId ? { selected_category_ids: categoryId } : {}),
        ...(subcategoryId ? { selected_subcategory_ids: subcategoryId } : {}),
        ...(industryId ? { selected_industry_ids: industryId } : {})
      },
      $set: {
        status: 'submitted',
        last_seen_kit_at: now,
        updated_at: now
      },
      $push: {
        history: {
          action: 'ADD_NEW_KIT_PREFERENCE',
          details: { kit_id: kit._id, kit_name: kit.name, industry_id: industryId },
          created_at: now
        }
      }
    };

    const updated = await EpcPreference.findOneAndUpdate(
      { epc_id: epcId },
      updateQuery,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      status: 'success',
      success: true,
      message: `"${kit.name}" has been added to your kit preferences! You will now receive relevant updates and offers for this kit.`,
      data: updated
    });
  } catch (error) {
    console.error('[epc_preferences.add_kit_to_preferences] Error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to add kit to preferences: ' + error.message
    });
  }
};

/**
 * 6. POST /india/v1/epc/preferences/dismiss-kit-alert
 * Dismisses the new kit alert without adding it to preferences
 */
exports.dismiss_kit_alert = async (req, res) => {
  try {
    const epcId = getEpcIdFromReq(req);
    if (!epcId || !mongoose.Types.ObjectId.isValid(epcId)) {
      return res.status(400).json({ status: 'error', message: 'Valid EPC Account ID is required' });
    }

    const now = new Date();
    await EpcPreference.findOneAndUpdate(
      { epc_id: epcId },
      { $set: { last_seen_kit_at: now, updated_at: now } },
      { upsert: true }
    );

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Alert dismissed'
    });
  } catch (error) {
    console.error('[epc_preferences.dismiss_kit_alert] Error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to dismiss alert: ' + error.message
    });
  }
};

/**
 * 7. GET /india/v1/epc/preferences/my-preferences
 * Returns current EPC's saved preferences for profile settings
 */
exports.get_my_preferences = async (req, res) => {
  try {
    const epcId = getEpcIdFromReq(req);
    if (!epcId || !mongoose.Types.ObjectId.isValid(epcId)) {
      return res.status(400).json({ status: 'error', message: 'Valid EPC Account ID is required' });
    }

    const pref = await EpcPreference.findOne({ epc_id: epcId, deleted_at: null }).lean();
    const defaultData = {
      selected_industry_ids: [],
      selected_category_ids: [],
      selected_subcategory_ids: [],
      selected_kit_ids: [],
      email_marketing_consent: false,
      whatsapp_marketing_consent: false,
      status: 'not_prompted'
    };
    const finalData = pref || defaultData;
    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        preferences: finalData,
        ...finalData
      }
    });
  } catch (error) {
    console.error('[epc_preferences.get_my_preferences] Error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch preferences: ' + error.message
    });
  }
};
