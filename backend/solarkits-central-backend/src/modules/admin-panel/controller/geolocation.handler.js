const { 
  GeoLevel0, GeoLevel1, GeoLevel2, GeoLevel3, GeoLevel4, 
  Cluster, Zone, ExcludedUrbanCity, ExcludedRuralCity 
} = require('../models/geolocation_db');
const { Level0: BoundaryLevel0, Level1: BoundaryLevel1, Level2: BoundaryLevel2 } = require('../models/boundary_db');
const { CmsUser, Otp } = require('../models/user_db');
const bcrypt = require('bcrypt');
const { sendOTP } = require("../utils/nodemailer");
const { geolocation_db } = require("../config/databases");
const mongoose = require("mongoose");
const { CompanyWarehouse } = require('../models/company_warehouse_db');

/**
 * Sends OTP for deactivation of country, state, or district.
 * Req Payload: { type, country, state, district }
 */
const deactivation_otp = async (req, res) => {
  try {
    const { type, country, state, district } = req.body;
    const { id } = req.user;

    if (!type) {
      return res.status(400).json({ status: "error", message: "type is required." });
    }
    if (!['country', 'state', 'district'].includes(type)) {
      return res.status(400).json({ status: "error", message: "Invalid type. Must be one of 'country', 'state', or 'district'." });
    }
    if (type === 'country' && !country) {
      return res.status(400).json({ status: "error", message: "country is required for type 'country'." });
    }
    if (type === 'state' && !state) {
      return res.status(400).json({ status: "error", message: "state is required for type 'state'." });
    }
    if (type === 'district' && !district) {
      return res.status(400).json({ status: "error", message: "district is required for type 'district'." });
    }

    const user = await CmsUser.findById(id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found." });
    }

    let entityName = "";
    let purpose = "";

    if (type === 'country') {
      const countryData = await GeoLevel0.findById(country);
      if (!countryData) return res.status(404).json({ status: "error", message: "Country not found." });
      entityName = countryData.name;
      purpose = 'deactivate_country';
    } else if (type === 'state') {
      const stateData = await GeoLevel1.findById(state);
      if (!stateData) return res.status(404).json({ status: "error", message: "State not found." });
      entityName = stateData.name;
      purpose = 'deactivate_state';
    } else if (type === 'district') {
      const districtData = await GeoLevel2.findById(district);
      if (!districtData) return res.status(404).json({ status: "error", message: "District not found." });
      entityName = districtData.name;
      purpose = 'deactivate_district';
    }

    const otp = await sendOTP(user.email, `Code for deactivate ${type}.`, `This OTP for deactivate ${entityName}.`);
    const hashed_otp = await bcrypt.hash(otp.otp, 10);
    const expires_at = new Date(Date.now() + 3 * 60 * 1000);

    await Otp.create({
      user_id: id,
      otp: hashed_otp,
      purpose,
      expires_at
    });

    return res.status(200).json({ status: "success", message: "OTP sent successfully." });
  } catch (err) {
    console.error("Γ¥î deactivation_otp error:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to send OTP",
      error: err.message,
    });
  }
};

/**
 * Fetches all countries with counts of active states, districts, clusters, and zones.
 * Optimized with parallel Promise.all execution and lean field projections.
 */
const get_countries = async (req, res) => {
  try {
    // ΓöÇΓöÇ 1. Fetch countries & boundary metadata in parallel ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const [countries_raw, boundaries] = await Promise.all([
      GeoLevel0.find(
        { $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] },
        'name iso2 phone_code min_phone_length max_phone_length currency_name currency_code is_active'
      ).lean(),
      BoundaryLevel0.find({}, 'iso2 lat lng geometry_type').lean()
    ]);

    if (!countries_raw.length) {
      return res.status(200).json({ message: "Fetched all countries successfully.", status: "success", countries: [], data: [] });
    }

    const countryIds = countries_raw.map(c => c._id);

    // ΓöÇΓöÇ 2. Active states per country ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const stateGroups = await GeoLevel1.aggregate([
      { $match: { level_0: { $in: countryIds }, is_active: true, $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] } },
      { $project: { level_0: 1 } },
      { $group: { _id: '$level_0', stateIds: { $push: '$_id' }, count: { $sum: 1 } } }
    ]);
    const stateMap = {};
    const allStateIds = [];
    for (const sg of stateGroups) {
      stateMap[sg._id.toString()] = { count: sg.count, stateIds: sg.stateIds };
      allStateIds.push(...sg.stateIds);
    }

    // ΓöÇΓöÇ 3. Active districts & clusters in parallel ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const [districtGroups, clusterGroups] = await Promise.all([
      allStateIds.length > 0 
        ? GeoLevel2.aggregate([
            { $match: { level_1: { $in: allStateIds }, is_active: true, $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] } },
            { $project: { level_1: 1, pincodes_count: { $size: { $ifNull: ['$pincodes', []] } } } },
            { $group: { _id: '$level_1', count: { $sum: 1 }, pincodes_count: { $sum: '$pincodes_count' } } }
          ])
        : Promise.resolve([]),
      allStateIds.length > 0
        ? Cluster.aggregate([
            { $match: { level_1: { $in: allStateIds }, is_active: true, $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] } },
            { $project: { level_1: 1 } },
            { $group: { _id: '$level_1', clusterIds: { $push: '$_id' }, count: { $sum: 1 } } }
          ])
        : Promise.resolve([])
    ]);

    const districtByState = {};
    const pincodesByState = {};
    for (const d of districtGroups) {
      districtByState[d._id.toString()] = d.count;
      pincodesByState[d._id.toString()] = d.pincodes_count || 0;
    }

    const clusterByState = {};
    const allClusterIds = [];
    for (const cg of clusterGroups) {
      clusterByState[cg._id.toString()] = { count: cg.count, clusterIds: cg.clusterIds };
      allClusterIds.push(...cg.clusterIds);
    }

    // ΓöÇΓöÇ 4. Zone counts per cluster ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const zoneByCluster = {};
    if (allClusterIds.length > 0) {
      const zoneGroups = await Zone.aggregate([
        { $match: { cluster: { $in: allClusterIds }, $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] } },
        { $project: { cluster: 1 } },
        { $group: { _id: '$cluster', count: { $sum: 1 } } }
      ]);
      for (const z of zoneGroups) zoneByCluster[z._id.toString()] = z.count;
    }

    // ΓöÇΓöÇ 5. Build final response ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const bMap = boundaries.reduce((acc, b) => { acc[b.iso2] = b; return acc; }, {});

    const countries = countries_raw.map(country => {
      const cId = country._id.toString();
      const sg = stateMap[cId] || { count: 0, stateIds: [] };
      let districtCount = 0, clusterCount = 0, zoneCount = 0, totalPincodesCount = 0;
      for (const sId of sg.stateIds) {
        const sIdStr = sId.toString();
        districtCount += districtByState[sIdStr] || 0;
        totalPincodesCount += pincodesByState[sIdStr] || 0;
        const cg = clusterByState[sIdStr] || { count: 0, clusterIds: [] };
        clusterCount += cg.count;
        for (const clId of (cg.clusterIds || [])) {
          zoneCount += zoneByCluster[clId.toString()] || 0;
        }
      }
      const b = bMap[country.iso2] || {};
      return {
        id: cId,
        _id: country._id,
        name: country.name,
        iso2: country.iso2,
        phone_code: country.phone_code,
        currency_name: country.currency_name,
        currency_code: country.currency_code,
        is_active: country.is_active,
        active_states_count: sg.count,
        active_districts_count: districtCount,
        total_pincodes_count: totalPincodesCount,
        active_clusters_count: clusterCount,
        active_zones_count: zoneCount,
        lat: b.lat || 0,
        lng: b.lng || 0,
        geometry: { type: b.geometry_type || 'Point', coordinates: [] },
        boundary: []
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      message: "Fetched all countries successfully.",
      status: "success",
      countries,
      data: countries,
    });
  } catch (err) {
    console.error("Γ¥î get_countries error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Fetches all active countries.
 */
const get_active_countries = async (req, res) => {
  try {
    const countries = await GeoLevel0.find({ 
      is_active: true, 
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
    }).sort({ name: 1 });
    const formatted = countries.map(c => ({ ...c.toObject({ virtuals: true }), id: c._id.toString() }));
    return res.status(200).json({
      message: "Fetched all active countries successfully.",
      status: "success",
      countries: formatted,
      data: formatted,
    });
  } catch (err) {
    console.error("Γ¥î get_active_countries error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Fetches single country details by name.
 * Req Payload: { country }
 */
const get_country = async (req, res) => {
  try {
    const { country } = req.body;
    if (!country) {
      return res.status(400).json({
        message: "Country name is required.",
        status: "error",
      });
    }

    const geoData = await GeoLevel0.findOne({
      name: { $regex: new RegExp(`^${country}$`, "i") },
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    });

    if (!geoData) {
      return res.status(404).json({ message: "Country not found.", status: "error" });
    }

    const boundaryData = await BoundaryLevel0.findOne({ iso2: geoData.iso2 });

    return res.status(200).json({
      message: "Fetched country successfully.",
      status: "success",
      country: {
        id: geoData._id.toString(),
        name: geoData.name,
        iso2: geoData.iso2,
        lat: boundaryData?.lat || 0,
        lng: boundaryData?.lng || 0,
        geometry: {
          type: boundaryData?.geometry_type || (boundaryData?.coordinates ? boundaryData.coordinates.type : 'Point'),
          coordinates: boundaryData?.coordinates?.coordinates || [],
        },
        boundary: boundaryData?.coordinates?.coordinates || [],
      },
    });
  } catch (err) {
    console.error("Γ¥î get_country error:", err);
    res.status(500).json({ message: "Internal server error.", error: err.message });
  }
};

/**
 * Activates a country.
 * Req Payload: { country_id }
 */
const activate_country = async (req, res) => {
  try {
    const { country_id } = req.body;
    if (!country_id) {
      return res.status(400).json({
        message: "country is required",
        status: "error",
      });
    }

    const country = await GeoLevel0.findById(country_id);
    if (!country) {
      return res.status(404).json({
        message: "Country not found",
        status: "error",
      });
    }

    if (country.is_active) {
      return res.status(200).json({
        message: "Country is already active.",
        status: "success",
        country,
      });
    }

    await GeoLevel0.updateOne({ _id: country_id }, { $set: { is_active: true } });

    return res.status(200).json({
      message: `Country '${country.name}' has been activated successfully.`,
      status: "success",
      country_id: country_id.toString(),
    });
  } catch (err) {
    console.error("Γ¥î activate country error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Deactivates a country after OTP verification.
 * Req Payload: { country_id, otp }
 */
const deactivate_country = async (req, res) => {
  try {
    const { country_id, otp } = req.body;
    const { id } = req.user;

    if (!country_id || !otp) {
      return res.status(400).json({
        message: "country_id and otp are required",
        status: "error",
      });
    }

    const otp_record = await Otp.findOne({ user_id: id, purpose: 'deactivate_country' }).sort({ created_at: -1 });
    if (!otp_record) {
      return res.status(404).json({ status: "error", message: "No OTP found. Please request a new OTP." });
    }
    if (new Date(otp_record.expires_at) < new Date()) {
      return res.status(410).json({ status: "error", message: "OTP has expired. Please request a new one." });
    }
    const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
    if (!is_otp_valid) {
      return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });
    }

    const result = await deactivate_country_logic(country_id);
    if (!result.success) {
      return res.status(result.statusCode).json({ status: "error", message: result.message });
    }
    return res.status(result.statusCode).json({ 
      message: result.message, 
      status: "success", 
      country_id: result.data.id.toString() 
    });
  } catch (err) {
    console.error("Γ¥î deactivate_country error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  }
};

const deactivate_country_logic = async (country_id) => {
  try {
    const country = await GeoLevel0.findById(country_id);
    if (!country) return { success: false, statusCode: 404, message: "Country not found" };
    
    if (!country.is_active) {
      return { success: true, statusCode: 200, message: "Country is already deactivated.", data: country };
    }
    
    await GeoLevel0.updateOne({ _id: country_id }, { $set: { is_active: false } });
    return {
      success: true,
      statusCode: 200,
      message: `Country '${country.name}' has been deactivated successfully.`,
      data: { id: country_id.toString() }
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Fetches states for a country with counts.
 * Req Payload: { country_id }
 */
const get_states = async (req, res) => {
  try {
    let country_id = req.params?.country_id || req.body?.country_id || req.query?.country_id || req.body?.country;
    let countryObjId = null;

    if (country_id && mongoose.Types.ObjectId.isValid(country_id)) {
      countryObjId = new mongoose.Types.ObjectId(country_id);
    } else if (country_id && typeof country_id === 'string') {
      const geoByName = await GeoLevel0.findOne({
        name: { $regex: new RegExp(`^${country_id}$`, "i") },
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      });
      if (geoByName) countryObjId = geoByName._id;
    }

    if (!countryObjId) {
      const defaultCountry = await GeoLevel0.findOne({ 
        is_active: true, 
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
      }).sort({ name: 1 });
      if (defaultCountry) countryObjId = defaultCountry._id;
    }

    if (!countryObjId) {
      return res.status(400).json({
        message: "country_id is required",
        status: "error",
      });
    }

    const geoCountry = await GeoLevel0.findById(countryObjId);
    if (!geoCountry) {
      return res.status(404).json({ message: "Country not found", status: "error" });
    }

    const states_raw = await GeoLevel1.aggregate([
      { 
        $match: { 
          level_0: countryObjId, 
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
        } 
      },
      {
        $lookup: {
          from: 'geolocation_level_2',
          let: { stateId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [ 
                    { $eq: ['$level_1', '$$stateId'] }, 
                    { $eq: ['$is_active', true] }, 
                    { $or: [{ $eq: ['$deleted_at', null] }, { $not: ['$deleted_at'] }] } 
                  ] 
                } 
              } 
            }
          ],
          as: 'active_districts'
        }
      },
      {
        $lookup: {
          from: 'clusters',
          let: { stateId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [ 
                    { $eq: ['$level_1', '$$stateId'] }, 
                    { $eq: ['$is_active', true] }, 
                    { $or: [{ $eq: ['$deleted_at', null] }, { $not: ['$deleted_at'] }] } 
                  ] 
                } 
              } 
            }
          ],
          as: 'active_clusters'
        }
      },
      {
        $lookup: {
          from: 'zones',
          let: { clusterIds: { $ifNull: ['$active_clusters._id', []] } },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [ 
                    { $in: ['$cluster', '$$clusterIds'] }, 
                    { $or: [{ $eq: ['$deleted_at', null] }, { $not: ['$deleted_at'] }] } 
                  ] 
                } 
              } 
            }
          ],
          as: 'active_zones'
        }
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          is_active: 1,
          active_districts_count: { $size: { $ifNull: ['$active_districts', []] } },
          total_pincodes_count: {
            $sum: {
              $map: {
                input: { $ifNull: ['$active_districts', []] },
                as: 'd',
                in: { $size: { $ifNull: ['$$d.pincodes', []] } }
              }
            }
          },
          active_clusters_count: { $size: { $ifNull: ['$active_clusters', []] } },
          active_zones_count: { $size: { $ifNull: ['$active_zones', []] } }
        }
      },
      { $sort: { name: 1 } }
    ]);

    // Merge boundary data
    const boundaryCountry = await BoundaryLevel0.findOne({ iso2: geoCountry.iso2 }).select('_id').lean();
    let bMap = {};
    if (boundaryCountry) {
      const boundaries = await BoundaryLevel1.find({ level_0: boundaryCountry._id }).select('name lat lng geometry_type').lean();
      bMap = boundaries.reduce((acc, b) => { acc[b.name.toLowerCase()] = b; return acc; }, {});
    }

    const states = states_raw.map(s => {
      const b = bMap[s.name.toLowerCase()] || {};
      return {
        ...s,
        lat: b.lat || 0,
        lng: b.lng || 0,
        geometry: {
          type: b.geometry_type || 'Point',
          coordinates: []
        },
        boundary: []
      };
    });

    return res.status(200).json({
      message: "Fetched states successfully.",
      status: "success",
      states,
      data: states,
    });
  } catch (err) {
    console.error("Γ¥î get_states error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Fetches all active states for a country.
 * Req Payload: { country_id }
 */
const get_active_states = async (req, res) => {
  try {
    const country_id = req.body?.country_id || req.query?.country_id || req.body?.country;
    const query = { 
      is_active: true, 
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
    };
    if (country_id) query.level_0 = country_id;

    const states = await GeoLevel1.find(query).sort({ name: 1 });
    const formatted = states.map(s => ({ ...s.toObject({ virtuals: true }), id: s._id.toString(), country_id: s.level_0 ? s.level_0.toString() : null }));
    return res.status(200).json({
      message: "Fetched all active states successfully.",
      status: "success",
      states: formatted,
      data: formatted,
    });
  } catch (err) {
    console.error("Γ¥î get_active_states error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Fetches details for a single state.
 * Req Payload: { state, country }
 */
const get_state = async (req, res) => {
  try {
    const { state, country } = req.body;

    if (!state || !country) {
      return res.status(400).json({
        message: "Both state and country names are required.",
        status: "error",
      });
    }

    const country_doc = await GeoLevel0.findOne({
      name: { $regex: new RegExp(`^${country}$`, "i") },
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    });

    if (!country_doc) {
      return res.status(404).json({
        message: `Country "${country}" not found.`,
        status: "error",
      });
    }

    const geoData = await GeoLevel1.findOne({
      name: { $regex: new RegExp(`^${state}$`, "i") },
      level_0: country_doc._id,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    });

    if (!geoData) {
      return res.status(404).json({ message: `State "${state}" not found under country "${country}".`, status: "error" });
    }

    const boundaryCountry = await BoundaryLevel0.findOne({ iso2: country_doc.iso2 });
    let boundaryData = null;
    if (boundaryCountry) {
      boundaryData = await BoundaryLevel1.findOne({ level_0: boundaryCountry._id, name: { $regex: new RegExp(`^${state}$`, "i") } });
    }

    return res.status(200).json({
      message: "Fetched state successfully.",
      status: "success",
      state: {
        id: geoData._id.toString(),
        name: geoData.name,
        lat: boundaryData?.lat || 0,
        lng: boundaryData?.lng || 0,
        geometry: {
          type: boundaryData?.geometry_type || (boundaryData?.coordinates ? boundaryData.coordinates.type : 'Point'),
          coordinates: boundaryData?.coordinates?.coordinates || [],
        },
        boundary: boundaryData?.coordinates?.coordinates || [],
      },
    });
  } catch (err) {
    console.error("Γ¥î get_state error:", err);
    res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Activates a state.
 * Req Payload: { state_id }
 */
const activate_state = async (req, res) => {
  try {
    const { state_id } = req.body;
    if (!state_id) {
      return res.status(400).json({
        message: "state_id is required",
        status: "error",
      });
    }

    const state = await GeoLevel1.findById(state_id).populate('level_0');
    if (!state) {
      return res.status(404).json({
        message: "State not found",
        status: "error",
      });
    }

    if (!state.level_0 || !state.level_0.is_active) {
      return res.status(400).json({
        message: "Cannot activate state because its parent country is inactive.",
        status: "error",
      });
    }

    if (state.is_active) {
      return res.status(200).json({
        message: "State is already active.",
        status: "success",
        state,
      });
    }

    await GeoLevel1.updateOne({ _id: state_id }, { $set: { is_active: true } });

    return res.status(200).json({
      message: `State '${state.name}' has been activated successfully.`,
      status: "success",
      state_id: state_id.toString(),
    });
  } catch (err) {
    console.error("Γ¥î activate_state error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Deactivates a state after OTP verification.
 * Req Payload: { state_id, otp }
 */
const deactivate_state = async (req, res) => {
  try {
    const { state_id, otp } = req.body;
    const { id } = req.user;

    if (!state_id || !otp) {
      return res.status(400).json({
        message: "state_id and otp are required",
        status: "error",
      });
    }

    const otp_record = await Otp.findOne({ user_id: id, purpose: 'deactivate_state' }).sort({ created_at: -1 });
    if (!otp_record) {
      return res.status(404).json({ status: "error", message: "No OTP found. Please request a new OTP." });
    }
    if (new Date(otp_record.expires_at) < new Date()) {
      return res.status(410).json({ status: "error", message: "OTP has expired. Please request a new one." });
    }
    const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
    if (!is_otp_valid) {
      return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });
    }

    const result = await deactivate_state_logic(state_id);
    if (!result.success) {
      return res.status(result.statusCode).json({ status: "error", message: result.message });
    }
    return res.status(result.statusCode).json({ 
      message: result.message, 
      status: "success", 
      state_id: result.data.id.toString() 
    });
  } catch (err) {
    console.error("Γ¥î deactivate_state error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  }
};

const deactivate_state_logic = async (state_id) => {
  try {
    const state = await GeoLevel1.findById(state_id);
    if (!state) return { success: false, statusCode: 404, message: "State not found" };
    
    if (!state.is_active) {
      return { success: true, statusCode: 200, message: "State is already deactivated.", data: state };
    }
    
    await GeoLevel1.updateOne({ _id: state_id }, { $set: { is_active: false } });
    return {
      success: true,
      statusCode: 200,
      message: `State '${state.name}' has been deactivated successfully.`,
      data: { id: state_id.toString() }
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Fetches districts for a state with urban/rural city counts.
 * Req Payload: { state_id }
 */
const get_districts = async (req, res) => {
  try {
    const state_id = req.params?.state_id || req.body?.state_id || req.query?.state_id || req.body?.state;
    if (!state_id) {
      return res.status(400).json({
        message: "state_id is required",
        status: "error",
      });
    }

    let stateObjId = null;
    if (mongoose.Types.ObjectId.isValid(state_id)) {
      stateObjId = new mongoose.Types.ObjectId(state_id);
    } else if (typeof state_id === 'string') {
      const stateByName = await GeoLevel1.findOne({
        name: { $regex: new RegExp(`^${state_id}$`, "i") },
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      });
      if (stateByName) stateObjId = stateByName._id;
    }

    if (!stateObjId) {
      return res.status(404).json({ message: "State not found", status: "error" });
    }

    const geoState = await GeoLevel1.findById(stateObjId).populate('level_0');
    if (!geoState) {
      return res.status(404).json({ message: "State not found", status: "error" });
    }

    const districts_raw = await GeoLevel2.aggregate([
      { 
        $match: { 
          level_1: stateObjId, 
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
        } 
      },
      {
        $lookup: {
          from: 'geolocation_level_3',
          localField: '_id',
          foreignField: 'level_2',
          as: 'urban_cities'
        }
      },
      {
        $lookup: {
          from: 'geolocation_level_4',
          let: { urbanIds: { $ifNull: ['$urban_cities._id', []] } },
          pipeline: [
            { $match: { $expr: { $in: ['$level_3', '$$urbanIds'] } } }
          ],
          as: 'rural_cities'
        }
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          is_active: 1,
          urban_cities_count: { $size: { $ifNull: ['$urban_cities', []] } },
          rural_cities_count: { $size: { $ifNull: ['$rural_cities', []] } },
          pincodes_count: { $size: { $ifNull: ['$pincodes', []] } },
          pincodes: { $ifNull: ['$pincodes', []] },
          lat: 1,
          lng: 1
        }
      },
      { $sort: { name: 1 } }
    ]);

    // Merge boundary data
    const boundaryCountry = await BoundaryLevel0.findOne({ iso2: geoState.level_0.iso2 }).select('_id').lean();
    let bMap = {};
    if (boundaryCountry) {
      const boundaryState = await BoundaryLevel1.findOne({ level_0: boundaryCountry._id, name: { $regex: new RegExp(`^${geoState.name}$`, 'i') } }).select('_id').lean();
      if (boundaryState) {
        const boundaries = await BoundaryLevel2.find({ level_1: boundaryState._id }).select('name lat lng geometry_type').lean();
        bMap = boundaries.reduce((acc, b) => { acc[b.name.toLowerCase()] = b; return acc; }, {});
      }
    }

    const districts = districts_raw.map(d => {
      const b = bMap[d.name.toLowerCase()] || {};
      return {
        ...d,
        lat: d.lat || b.lat || 0,
        lng: d.lng || b.lng || 0,
        pincodes_count: d.pincodes_count || (d.pincodes ? d.pincodes.length : 0),
        pincodes: d.pincodes || [],
        geometry: {
          type: b.geometry_type || 'Point',
          coordinates: []
        },
        boundary: []
      };
    });

    return res.status(200).json({
      message: "Fetched districts successfully.",
      status: "success",
      districts,
      data: districts,
    });
  } catch (err) {
    console.error("Γ¥î get_districts error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Fetches all active districts for a state.
 * Req Payload: { state_id }
 */
const get_active_districts = async (req, res) => {
  try {
    const state_id = req.body?.state_id || req.query?.state_id || req.body?.state;
    const query = { 
      is_active: true, 
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
    };
    if (state_id) query.level_1 = state_id;

    const districts = await GeoLevel2.find(query).sort({ name: 1 });
    const formatted = districts.map(d => ({ ...d.toObject({ virtuals: true }), id: d._id.toString(), state_id: d.level_1 ? d.level_1.toString() : null }));
    return res.status(200).json({
      message: "Fetched all active districts successfully.",
      status: "success",
      districts: formatted,
      data: formatted,
    });
  } catch (err) {
    console.error("Γ¥î get_active_districts error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Fetches details for a single district.
 * Req Payload: { district, state, country }
 */
const get_district = async (req, res) => {
  try {
    const { district, state, country } = req.body;

    if (!district || !state || !country) {
      return res.status(400).json({
        message: "District, state, and country names are required.",
        status: "error",
      });
    }

    const country_doc = await GeoLevel0.findOne({ 
      name: { $regex: new RegExp(`^${country}$`, "i") }, 
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
    });
    if (!country_doc) {
      return res.status(404).json({ message: `Country "${country}" not found.`, status: "error" });
    }

    const state_doc = await GeoLevel1.findOne({ 
      name: { $regex: new RegExp(`^${state}$`, "i") }, 
      level_0: country_doc._id, 
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
    });
    if (!state_doc) {
      return res.status(404).json({ message: `State "${state}" not found under "${country}".`, status: "error" });
    }

    const district_doc = await GeoLevel2.findOne({ 
      name: { $regex: new RegExp(`^${district}$`, "i") }, 
      level_1: state_doc._id, 
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
    });
    if (!district_doc) {
      return res.status(404).json({ message: `District "${district}" not found under "${state}".`, status: "error" });
    }

    const boundaryCountry = await BoundaryLevel0.findOne({ iso2: country_doc.iso2 });
    let boundaryState = null;
    let boundaryData = null;
    if (boundaryCountry) {
      boundaryState = await BoundaryLevel1.findOne({ level_0: boundaryCountry._id, name: { $regex: new RegExp(`^${state}$`, "i") } });
      if (boundaryState) {
        boundaryData = await BoundaryLevel2.findOne({ level_1: boundaryState._id, name: { $regex: new RegExp(`^${district}$`, "i") } });
      }
    }

    return res.status(200).json({
      message: "Fetched district successfully.",
      status: "success",
      district: {
        id: district_doc._id.toString(),
        name: district_doc.name,
        lat: boundaryData?.lat || 0,
        lng: boundaryData?.lng || 0,
        geometry: {
          type: boundaryData?.geometry_type || (boundaryData?.coordinates ? boundaryData.coordinates.type : 'Point'),
          coordinates: boundaryData?.coordinates?.coordinates || [],
        },
        boundary: boundaryData?.coordinates?.coordinates || [],
      },
    });
  } catch (err) {
    console.error("Γ¥î get_district error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Activates a district.
 * Req Payload: { district_id }
 */
const activate_district = async (req, res) => {
  try {
    const { district_id } = req.body;
    if (!district_id) {
      return res.status(400).json({
        message: "district_id is required",
        status: "error",
      });
    }

    const district = await GeoLevel2.findById(district_id).populate({
      path: 'level_1',
      populate: { path: 'level_0' }
    });

    if (!district) {
      return res.status(404).json({
        message: "District not found",
        status: "error",
      });
    }

    if (!district.level_1 || !district.level_1.level_0 || !district.level_1.level_0.is_active) {
      return res.status(400).json({
        message: "Cannot activate district because its parent country is inactive.",
        status: "error",
      });
    }

    if (!district.level_1.is_active) {
      return res.status(400).json({
        message: "Cannot activate district because its parent state is inactive.",
        status: "error",
      });
    }

    if (district.is_active) {
      return res.status(200).json({
        message: "District is already active.",
        status: "success",
        district,
      });
    }

    await GeoLevel2.updateOne({ _id: district_id }, { $set: { is_active: true } });

    return res.status(200).json({
      message: `District '${district.name}' has been activated successfully.`,
      status: "success",
      district_id: district_id.toString(),
    });
  } catch (err) {
    console.error("Γ¥î activate_district error:", err);
    return res.status(500).json({
      message: "Internal server error.",
      status: "error",
      error: err.message,
    });
  }
};

/**
 * Deactivates a district after OTP verification.
 * Req Payload: { district_id, otp }
 */
const deactivate_district = async (req, res) => {
  try {
    const { district_id, otp } = req.body;
    const { id } = req.user;

    if (!district_id || !otp) {
      return res.status(400).json({
        message: "district_id and otp are required",
        status: "error",
      });
    }

    const otp_record = await Otp.findOne({ user_id: id, purpose: 'deactivate_district' }).sort({ created_at: -1 });
    if (!otp_record) {
      return res.status(404).json({ status: "error", message: "No OTP found. Please request a new OTP." });
    }
    if (new Date(otp_record.expires_at) < new Date()) {
      return res.status(410).json({ status: "error", message: "OTP has expired. Please request a new one." });
    }
    const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
    if (!is_otp_valid) {
      return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });
    }

    const result = await deactivate_district_logic(district_id);
    if (!result.success) {
      return res.status(result.statusCode).json({ status: "error", message: result.message });
    }
    return res.status(result.statusCode).json({ 
      message: result.message, 
      status: "success", 
      district_id: result.data.id.toString() 
    });
  } catch (err) {
    console.error("Γ¥î deactivate_district error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  }
};

const deactivate_district_logic = async (district_id) => {
  try {
    const district = await GeoLevel2.findById(district_id);
    if (!district) return { success: false, statusCode: 404, message: "District not found" };
    
    if (!district.is_active) {
      return { success: true, statusCode: 200, message: "District is already deactivated.", data: district };
    }
    
    await GeoLevel2.updateOne({ _id: district_id }, { $set: { is_active: false } });
    return {
      success: true,
      statusCode: 200,
      message: `District '${district.name}' has been deactivated successfully.`,
      data: { id: district_id.toString() }
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Fetches urban cities for a district.
 * Req Params: { district_id }
 */
const get_urban_cities = async (req, res) => {
  try {
    const { district_id } = req.params;
    if (!district_id) {
      return res.status(400).json({ message: "district_id is required", status: "error" });
    }
    const urban_cities = await GeoLevel3.find({ level_2: district_id }).sort({ name: 1 });
    return res.status(200).json({
      message: "Fetched urban cities successfully.",
      status: "success",
      urban_cities: urban_cities.map(u => ({ ...u.toObject({ virtuals: true }), id: u._id.toString(), district_id: u.level_2 ? u.level_2.toString() : null })),
    });
  } catch (err) {
    console.error("Γ¥î get_urban_cities error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  }
};

/**
 * Adds multiple urban cities to a district.
 * Req Payload: { district_id, cities: [{ name, lat, lng }] }
 */
const add_urban_cities = async (req, res) => {
  const session = await geolocation_db.startSession();
  session.startTransaction();
  try {
    const { district_id, cities } = req.body;
    if (!district_id || !cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({ message: "district_id and cities array are required", status: "error" });
    }

    const seen = new Set();
    for (const c of cities) {
      const key = `${c.lat}_${c.lng}`;
      if (seen.has(key)) {
        await session.abortTransaction();
        return res.status(409).json({ message: `Duplicate coordinates inside request: lat=${c.lat}, lng=${c.lng}`, status: "error" });
      }
      seen.add(key);
    }

    for (const city of cities) {
      await ExcludedUrbanCity.deleteOne({ lat: city.lat, lng: city.lng }).session(session);
      
      const existing = await GeoLevel3.findOne({ lat: city.lat, lng: city.lng }).populate('level_2').session(session);
      if (existing) {
        await session.abortTransaction();
        return res.status(409).json({
          message: `Urban city ${existing.name} already exists for lat=${city.lat}, lng=${city.lng} in district ${existing.level_2 ? existing.level_2.name : 'unknown'}.`,
          status: "error",
        });
      }

      const existingRural = await GeoLevel4.findOne({ lat: city.lat, lng: city.lng }).populate({ path: 'level_3', populate: { path: 'level_2' } }).session(session);
      if (existingRural) {
        await session.abortTransaction();
        return res.status(409).json({
          message: `Urban city conflicts with existing rural city ${existingRural.name} under urban city ${existingRural.level_3.name} in district ${existingRural.level_3.level_2.name} for lat=${city.lat}, lng=${city.lng}.`,
          status: "error",
        });
      }

      const existingExcludedRural = await ExcludedRuralCity.findOne({ lat: city.lat, lng: city.lng }).session(session);
      if (existingExcludedRural) {
        await session.abortTransaction();
        return res.status(409).json({ message: `Urban city conflicts with excluded rural city for lat=${city.lat}, lng=${city.lng}.`, status: "error" });
      }
    }

    const insertDocs = cities.map(city => ({
      level_2: district_id,
      name: city.name,
      lat: city.lat,
      lng: city.lng
    }));

    await GeoLevel3.insertMany(insertDocs, { session });
    await session.commitTransaction();

    return res.status(201).json({ message: "Urban cities added successfully.", status: "success" });
  } catch (err) {
    await session.abortTransaction();
    console.error("Γ¥î add_urban_cities error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Excludes an urban city.
 * Req Payload: { name, lat, lng, district_id? }
 */
const exclude_urban_city = async (req, res) => {
  const session = await geolocation_db.startSession();
  session.startTransaction();
  try {
    const { name, lat, lng, district_id } = req.body;
    if (!name || !lat || !lng) {
      return res.status(400).json({ message: "name, lat and lng are required", status: "error" });
    }

    if (district_id) {
      const district = await GeoLevel2.findById(district_id).session(session);
      if (!district) {
        await session.abortTransaction();
        return res.status(404).json({ message: "District not found.", status: "error" });
      }
      
      const alreadyExcluded = await ExcludedUrbanCity.findOne({ lat, lng }).session(session);
      if (alreadyExcluded) {
        await session.abortTransaction();
        return res.status(409).json({ message: "This urban city is already excluded.", status: "error" });
      }

      const existingUrban = await GeoLevel3.findOne({ lat, lng, level_2: district_id }).session(session);
      if (!existingUrban) {
        await session.abortTransaction();
        return res.status(409).json({ message: "This urban city does not exist in this district.", status: "error" });
      }

      const ruralCities = await GeoLevel4.find({ level_3: existingUrban._id }).session(session);
      if (ruralCities.length > 0) {
        const excludeRuralDocs = ruralCities.map(rc => ({ name: rc.name, lat: rc.lat, lng: rc.lng }));
        await ExcludedRuralCity.insertMany(excludeRuralDocs, { session });
        await GeoLevel4.deleteMany({ level_3: existingUrban._id }).session(session);
      }

      await GeoLevel3.deleteOne({ _id: existingUrban._id }).session(session);
      await ExcludedUrbanCity.create([{ name, lat, lng }], { session });
    } else {
      const alreadyExcluded = await ExcludedUrbanCity.findOne({ lat, lng }).session(session);
      if (alreadyExcluded) {
        await session.abortTransaction();
        return res.status(409).json({ message: "This urban city is already excluded.", status: "error" });
      }

      const existingUrban = await GeoLevel3.findOne({ lat, lng }).populate('level_2').session(session);
      if (existingUrban) {
        await session.abortTransaction();
        return res.status(409).json({ message: `This urban city already exists in another district: ${existingUrban.level_2.name}`, status: "error" });
      }

      const existingRural = await GeoLevel4.findOne({ lat, lng }).populate({ path: 'level_3', populate: { path: 'level_2' } }).session(session);
      if (existingRural) {
        await session.abortTransaction();
        return res.status(409).json({ message: `This urban city conflicts with an existing rural city ${existingRural.name}, district ${existingRural.level_3.level_2.name}`, status: "error" });
      }

      const existingExcludedRural = await ExcludedRuralCity.findOne({ lat, lng }).session(session);
      if (existingExcludedRural) {
        await session.abortTransaction();
        return res.status(409).json({ message: "This urban city conflicts with an excluded rural city.", status: "error" });
      }

      await ExcludedUrbanCity.create([{ name, lat, lng }], { session });
    }

    await session.commitTransaction();
    return res.status(201).json({ status: "success", message: "Urban city and its associated rural cities have been excluded successfully." });
  } catch (err) {
    await session.abortTransaction();
    console.error("Γ¥î exclude_urban_city error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  } finally {
    session.endSession();
  }
};

const delete_excluded_urban_city = async (req, res) => {
  try {
    const { city_id } = req.params;
    if (!city_id) return res.status(400).json({ message: "city_id is required", status: "error" });
    await ExcludedUrbanCity.findByIdAndDelete(city_id);
    return res.status(200).json({ message: "Excluded urban city deleted successfully.", status: "success" });
  } catch (err) {
    console.error("Γ¥î delete_excluded_urban_city error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  }
};

/**
 * Fetches all excluded urban cities.
 */
const get_excluded_urban_cities = async (req, res) => {
  try {
    const excluded_cities = await ExcludedUrbanCity.find().sort({ name: 1 });
    return res.status(200).json({ 
      message: "Fetched excluded urban cities successfully.", 
      status: "success", 
      excluded_cities: excluded_cities.map(c => ({ ...c.toObject({ virtuals: true }), id: c._id.toString() })) 
    });
  } catch (err) {
    console.error("Γ¥î get_excluded_urban_cities error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  }
};

/**
 * Fetches rural cities for an urban city.
 * Req Params: { urban_city_id }
 */
const get_rural_cities = async (req, res) => {
  try {
    const { urban_city_id } = req.params;
    if (!urban_city_id) return res.status(400).json({ message: "urban_city_id is required", status: "error" });
    const rural_cities = await GeoLevel4.find({ level_3: urban_city_id }).sort({ name: 1 });
    return res.status(200).json({
      message: "Fetched rural cities successfully.",
      status: "success",
      rural_cities: rural_cities.map(r => ({ ...r.toObject({ virtuals: true }), id: r._id.toString(), urban_city_id: r.level_3 ? r.level_3.toString() : null })),
    });
  } catch (err) {
    console.error("Γ¥î get_rural_cities error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  }
};

/**
 * Adds multiple rural cities to an urban city.
 * Req Payload: { urban_city_id, cities: [{ name, lat, lng }] }
 */
const add_rural_cities = async (req, res) => {
  const session = await geolocation_db.startSession();
  session.startTransaction();
  try {
    const { urban_city_id, cities } = req.body;
    if (!urban_city_id || !cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({ message: "urban_city_id and cities array are required", status: "error" });
    }

    const parentUrban = await GeoLevel3.findById(urban_city_id).session(session);
    if (!parentUrban) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Urban city not found.", status: "error" });
    }

    const seen = new Set();
    for (const c of cities) {
      const key = `${c.lat}_${c.lng}`;
      if (seen.has(key)) {
        await session.abortTransaction();
        return res.status(409).json({ message: `Duplicate coordinates: lat=${c.lat}, lng=${c.lng}`, status: "error" });
      }
      seen.add(key);
    }

    for (const city of cities) {
      await ExcludedRuralCity.deleteOne({ lat: city.lat, lng: city.lng }).session(session);

      const existingUrban = await GeoLevel3.findOne({ lat: city.lat, lng: city.lng }).session(session);
      if (existingUrban) {
        await session.abortTransaction();
        return res.status(409).json({ message: `Conflict: This location already exists as an Urban city: ${existingUrban.name} (lat=${city.lat}, lng=${city.lng})`, status: "error" });
      }

      const existingRural = await GeoLevel4.findOne({ lat: city.lat, lng: city.lng }).populate('level_3').session(session);
      if (existingRural) {
        await session.abortTransaction();
        return res.status(409).json({ message: `Conflict: Rural city '${existingRural.name}' already exists under urban '${existingRural.level_3.name}' (lat=${city.lat}, lng=${city.lng})`, status: "error" });
      }

      const existingExcludedUrban = await ExcludedUrbanCity.findOne({ lat: city.lat, lng: city.lng }).session(session);
      if (existingExcludedUrban) {
        await session.abortTransaction();
        return res.status(409).json({ message: `Conflict: This point exists inside Excluded Urban Cities (lat=${city.lat}, lng=${city.lng})`, status: "error" });
      }
    }

    const insertDocs = cities.map(city => ({
      level_3: urban_city_id,
      name: city.name,
      lat: city.lat,
      lng: city.lng
    }));

    await GeoLevel4.insertMany(insertDocs, { session });
    await session.commitTransaction();

    return res.status(201).json({ message: "Rural cities added successfully.", status: "success" });
  } catch (err) {
    await session.abortTransaction();
    console.error("Γ¥î add_rural_cities error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Excludes a rural city.
 * Req Payload: { name, lat, lng, urban_city_id? }
 */
const exclude_rural_city = async (req, res) => {
  const session = await geolocation_db.startSession();
  session.startTransaction();
  try {
    const { name, lat, lng, urban_city_id } = req.body;
    if (!name || !lat || !lng) return res.status(400).json({ message: "name, lat, lng are required", status: "error" });

    if (urban_city_id) {
      const urban = await GeoLevel3.findById(urban_city_id).session(session);
      if (!urban) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Urban city not found.", status: "error" });
      }

      const alreadyExcluded = await ExcludedRuralCity.findOne({ lat, lng }).session(session);
      if (alreadyExcluded) {
        await session.abortTransaction();
        return res.status(409).json({ message: "This rural city is already excluded.", status: "error" });
      }

      const existingRural = await GeoLevel4.findOne({ lat, lng, level_3: urban_city_id }).session(session);
      if (!existingRural) {
        await session.abortTransaction();
        return res.status(409).json({ message: "This rural city does not exist under this urban city.", status: "error" });
      }

      await GeoLevel4.deleteOne({ _id: existingRural._id }).session(session);
      await ExcludedRuralCity.create([{ name, lat, lng }], { session });
    } else {
      const alreadyExcluded = await ExcludedRuralCity.findOne({ lat, lng }).session(session);
      if (alreadyExcluded) {
        await session.abortTransaction();
        return res.status(409).json({ message: "This rural city is already excluded.", status: "error" });
      }

      const existingRural = await GeoLevel4.findOne({ lat, lng }).session(session);
      if (existingRural) {
        await GeoLevel4.deleteOne({ _id: existingRural._id }).session(session);
      }

      const excludedUrbanConflict = await ExcludedUrbanCity.findOne({ lat, lng }).session(session);
      if (excludedUrbanConflict) {
        await session.abortTransaction();
        return res.status(409).json({ message: "Conflict: This point belongs to excluded urban city.", status: "error" });
      }

      await ExcludedRuralCity.create([{ name, lat, lng }], { session });
    }

    await session.commitTransaction();
    return res.status(201).json({ status: "success", message: "Rural city excluded successfully." });
  } catch (err) {
    await session.abortTransaction();
    console.error("Γ¥î exclude_rural_city error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Deletes an excluded rural city by ID.
 */
const delete_excluded_rural_city = async (req, res) => {
  try {
    const { city_id } = req.params;
    if (!city_id) return res.status(400).json({ message: "city_id is required", status: "error" });
    await ExcludedRuralCity.findByIdAndDelete(city_id);
    return res.status(200).json({ message: "Excluded rural city deleted successfully.", status: "success" });
  } catch (err) {
    console.error("Γ¥î delete_excluded_rural_city error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  }
};

/**
 * Fetches all excluded rural cities.
 */
const get_excluded_rural_cities = async (req, res) => {
  try {
    const excluded_cities = await ExcludedRuralCity.find().sort({ name: 1 });
    return res.status(200).json({ 
      message: "Fetched excluded rural cities successfully.", 
      status: "success", 
      excluded_cities: excluded_cities.map(c => ({ ...c.toObject({ virtuals: true }), id: c._id.toString() })) 
    });
  } catch (err) {
    console.error("Γ¥î get_excluded_rural_cities error:", err);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: err.message });
  }
};

/**
 * Adds a new cluster and assigns districts to it.
 * Req Payload: { name, state_id, district_ids: [] }
 */
const add_cluster = async (req, res) => {
  const session = await geolocation_db.startSession();
  session.startTransaction();
  try {
    const { name, state_id, district_ids } = req.body;
    if (!name || !state_id) return res.status(400).json({ message: "name and state_id are required", status: "error" });
    if (!district_ids || district_ids.length === 0) return res.status(400).json({ message: "minimum one district_id is required to create a cluster", status: "error" });

    const existingCluster = await Cluster.findOne({ name, level_1: state_id, deleted_at: null }).session(session);
    if (existingCluster) {
      await session.abortTransaction();
      return res.status(409).json({ message: "Cluster already exists.", status: "error" });
    }

    const [newCluster] = await Cluster.create([{ name, level_1: state_id }], { session });
    
    for (const district_id of district_ids) {
      const updateRes = await GeoLevel2.updateOne({ _id: district_id }, { $set: { cluster: newCluster._id } }).session(session);
      if (updateRes.matchedCount === 0) {
        await session.abortTransaction();
        return res.status(404).json({ status: "error", message: `District with id ${district_id} not found` });
      }
    }

    const assignedDistricts = await GeoLevel2.find({ _id: { $in: district_ids } }).select('id name').session(session);
    await session.commitTransaction();

    return res.status(201).json({
      status: "success",
      message: "Cluster added successfully.",
      cluster: {
        id: newCluster._id.toString(),
        name,
        districts: assignedDistricts.map(d => ({ id: d._id.toString(), name: d.name })),
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Γ¥î add_cluster error:", error);
    return res.status(500).json({ status: "error", message: "Internal server error.", error: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Fetches clusters for a state.
 * Req Params: { state_id }
 */
const get_clusters = async (req, res) => {
  try {
    const { state_id } = req.params;
    if (!state_id) return res.status(400).json({ message: "state_id is required", status: "error" });

    // Find clusters in the state
    const allClusters = await Cluster.find({ level_1: state_id, deleted_at: null }).lean();
    
    const uniqueId = req.query.unique_id;
    let clusters = allClusters;

    const exemptModules = [
      'ADM_CLUSTER_SETUP',
      'ADM_WAREHOUSES',
      'ADM_BETCHMARK_PRICE_MASTER',
      'ADM_BENCHMARK_PRICE_MASTER',
      'ADM_WH_KIT_ACT',
      'ADM_BULK_COMBO',
      'ADM_PO_ORDERS',
      'ADM_CO_MARGIN',
      'ADM_ORDER_SETTINGS',
      'ADM_COMBO_KITS',
      'ADM_CUSTOMIZE_KITS'
    ];

    if (!exemptModules.includes(uniqueId)) {
      // Fetch active warehouse kit activations
      const { WarehouseKitActivation } = require('../models/core_db');
      const activations = await WarehouseKitActivation.find({
        is_active: true,
        deleted_at: null
      }).select('warehouse_id').lean();

      const activeWarehouseIds = activations.map(a => a.warehouse_id).filter(Boolean);

      // Find active warehouses for these activations
      const warehouses = await CompanyWarehouse.find({
        _id: { $in: activeWarehouseIds },
        is_active: true,
        deleted_at: null
      }).select('level_2').lean();

      const activeDistrictIds = warehouses.map(w => w.level_2).filter(Boolean);

      // Find districts to get their cluster IDs
      const districtsWithActiveKits = await GeoLevel2.find({
        _id: { $in: activeDistrictIds },
        deleted_at: null
      }).select('cluster').lean();

      const activeClusterIdsSet = new Set(
        districtsWithActiveKits.map(d => d.cluster?.toString()).filter(Boolean)
      );

      // Filter to keep only clusters that have active warehouse kits
      clusters = allClusters.filter(c => activeClusterIdsSet.has(c._id.toString()));
    }

    for (let cluster of clusters) {
      const districts = await GeoLevel2.find({ cluster: cluster._id }).select('name').lean();
      cluster.districts = districts.map(d => ({ id: d._id.toString(), name: d.name }));
      cluster.id = cluster._id.toString();
      cluster.state_id = cluster.level_1 ? cluster.level_1.toString() : null;
    }

    return res.status(200).json({ message: "Fetched clusters successfully.", status: "success", clusters });
  } catch (error) {
    console.error("Γ¥î get_clusters error:", error);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: error.message });
  }
};

/**
 * Assigns a district to a cluster.
 * Req Payload: { cluster_id, district_id }
 */
const assign_district_to_cluster = async (req, res) => {
  try {
    const { cluster_id, district_id } = req.body;
    if (!cluster_id || !district_id) return res.status(400).json({ message: "cluster_id and district_id are required", status: "error" });

    const cluster = await Cluster.findById(cluster_id);
    if (!cluster) return res.status(404).json({ status: "error", message: "Cluster not found" });

    const district = await GeoLevel2.findById(district_id).populate('cluster');
    if (!district) return res.status(404).json({ status: "error", message: "District not found" });

    if (district.cluster) {
      return res.status(400).json({ status: "error", message: `District is already assigned to a cluster ${district.cluster.name}.` });
    }

    if (district.level_1.toString() !== cluster.level_1.toString()) {
      return res.status(400).json({ status: "error", message: "Cluster and District do not belong to the same state." });
    }

    await GeoLevel2.updateOne({ _id: district_id }, { $set: { cluster: cluster_id } });
    return res.status(200).json({ status: "success", message: "Cluster assigned to district successfully." });
  } catch (error) {
    console.error("Γ¥î assign_district_to_cluster error:", error);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: error.message });
  }
};

/**
 * Sends OTP for reassigning a district to another cluster.
 * Req Payload: { cluster_id, district_id }
 */
const reassign_district_to_another_cluster_otp = async (req, res) => {
  try {
    const { cluster_id, district_id } = req.body;
    const { id } = req.user;
    if (!cluster_id || !district_id) return res.status(400).json({ message: "cluster_id, district_id are required." });

    const user = await CmsUser.findById(id);
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });

    const cluster = await Cluster.findById(cluster_id);
    if (!cluster) return res.status(404).json({ status: "error", message: "Cluster not found" });

    const district = await GeoLevel2.findById(district_id).populate('cluster');
    if (!district) return res.status(404).json({ status: "error", message: "District not found" });

    if (district.level_1.toString() !== cluster.level_1.toString()) {
      return res.status(400).json({ status: "error", message: "Cluster and District do not belong to the same state." });
    }

    const otp = await sendOTP(user.email, 'Code for reassigning districts to another cluster', `This is the OTP to reassign district ${district.name} from cluster ${district.cluster ? district.cluster.name : 'none'} to another cluster ${cluster.name}`);
    const hashed_otp = await bcrypt.hash(otp.otp, 10);
    const expires_at = new Date(Date.now() + 3 * 60 * 1000);

    await Otp.create({
      user_id: id,
      otp: hashed_otp,
      purpose: 'reassign_districts_to_another_cluster',
      expires_at
    });

    return res.status(200).json({ message: "OTP sent to registered email. Please verify to proceed.", status: "success" });
  } catch (error) {
    console.error("Γ¥î reassign_district_to_another_cluster_otp error:", error);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: error.message });
  }
};

/**
 * Reassigns a district to another cluster after OTP verification.
 * Req Payload: { cluster_id, district_id, otp }
 */
const reassign_district_to_another_cluster = async (req, res) => {
  try {
    const { cluster_id, district_id, otp } = req.body;
    const { id } = req.user;
    if (!cluster_id || !district_id || !otp) return res.status(400).json({ message: "cluster_id, district_id and otp are required." });

    const otp_record = await Otp.findOne({ user_id: id, purpose: 'reassign_districts_to_another_cluster' }).sort({ created_at: -1 });
    if (!otp_record) return res.status(400).json({ status: "error", message: "OTP not found. Please request a new OTP." });
    if (new Date() > otp_record.expires_at) return res.status(400).json({ status: "error", message: "OTP has expired. Please request a new OTP." });
    
    const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
    if (!is_otp_valid) return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });

    const cluster = await Cluster.findById(cluster_id);
    if (!cluster) return res.status(404).json({ status: "error", message: "Cluster not found" });

    const district = await GeoLevel2.findById(district_id);
    if (!district) return res.status(404).json({ status: "error", message: "District not found" });

    if (district.level_1.toString() !== cluster.level_1.toString()) {
      return res.status(400).json({ status: "error", message: "Cluster and District do not belong to the same state." });
    }

    const source_cluster_id = district.cluster;
    if (source_cluster_id && source_cluster_id.toString() !== cluster_id.toString()) {
      // Find if there is a warehouse in the district being moved
      const movingWarehouse = await CompanyWarehouse.findOne({ level_2: district_id, deleted_at: null });

      if (movingWarehouse) {
        // Find districts in target cluster
        const targetDistrictIds = await GeoLevel2.find({ cluster: cluster_id, deleted_at: null }).distinct('_id');
        
        // Find if target cluster has a Master warehouse
        const targetMaster = await CompanyWarehouse.findOne({
          level_2: { $in: targetDistrictIds },
          warehouse_type: 'master',
          deleted_at: null
        });

        if (movingWarehouse.warehouse_type === 'master') {
          // Rule 1: A cluster can have at most one Master warehouse.
          if (targetMaster) {
            return res.status(400).json({
              status: "error",
              message: "Reassignment blocked: The target cluster already has a Master warehouse. You cannot move another Master warehouse into it."
            });
          }

          // Rule 2: Sub warehouses in source cluster cannot be left without a Master warehouse.
          const sourceDistrictIds = await GeoLevel2.find({ cluster: source_cluster_id, deleted_at: null }).distinct('_id');
          // Find if there are sub warehouses in the source cluster
          const sourceSubs = await CompanyWarehouse.findOne({
            level_2: { $in: sourceDistrictIds },
            warehouse_type: 'sub',
            deleted_at: null
          });
          if (sourceSubs) {
            return res.status(400).json({
              status: "error",
              message: "Reassignment blocked: Moving this Master warehouse would leave Sub warehouses in the source cluster without a Master."
            });
          }

        } else if (movingWarehouse.warehouse_type === 'sub') {
          // Rule 3: Sub warehouses must have a Master warehouse in the cluster.
          if (!targetMaster) {
            return res.status(400).json({
              status: "error",
              message: "Reassignment blocked: The target cluster does not have a Master warehouse yet. You must have a Master warehouse in a cluster before moving a Sub warehouse into it."
            });
          }
        }
      }
    }

    await GeoLevel2.updateOne({ _id: district_id }, { $set: { cluster: cluster_id } });
    return res.status(200).json({ status: "success", message: "District reassigned to another cluster successfully." });
  } catch (error) {
    console.error("Γ¥î reassign_district_to_another_cluster error:", error);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: error.message });
  }
};

/**
 * Sends OTP for deleting a cluster.
 * Req Params: { cluster_id, state_id }
 */
const delete_cluster_otp = async (req, res) => {
  try {
    const { id } = req.user;
    const { cluster_id, state_id } = req.params;
    if (!cluster_id || !state_id) return res.status(400).json({ message: "cluster_id and state_id are required", status: "error" });

    const cluster = await Cluster.findById(cluster_id);
    if (!cluster) return res.status(404).json({ status: "error", message: "Cluster not found" });

    if (cluster.level_1.toString() !== state_id) {
      return res.status(400).json({ status: "error", message: "Cluster does not belong to the same state." });
    }

    const user = await CmsUser.findById(id);
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });

    const otp = await sendOTP(user.email, 'Code for deleting cluster', `This is the OTP to delete cluster ${cluster.name}`);
    const hashed_otp = await bcrypt.hash(otp.otp, 10);
    const expires_at = new Date(Date.now() + 3 * 60 * 1000);

    await Otp.create({
      user_id: id,
      otp: hashed_otp,
      purpose: 'delete_cluster',
      expires_at
    });

    return res.status(200).json({ status: 'success', message: 'OTP sent to registered email. Please verify to proceed.' });
  } catch (error) {
    console.error("Γ¥î delete_cluster_otp error:", error);
    return res.status(500).json({ message: "Internal server error.", status: "error", error: error.message });
  }
};

/**
 * Deletes a cluster after OTP verification.
 * Req Payload: { cluster_id, state_id, otp }
 */
const delete_cluster = async (req, res) => {
  const session = await geolocation_db.startSession();
  session.startTransaction();
  try {
    const { id } = req.user;
    const { cluster_id, state_id, otp } = req.body;
    if (!cluster_id || !state_id || !otp) return res.status(400).json({ message: "cluster_id, state_id and otp are required", status: "error" });

    const otp_record = await Otp.findOne({ user_id: id, purpose: 'delete_cluster' }).sort({ created_at: -1 });
    if (!otp_record) return res.status(400).json({ status: "error", message: "OTP not found. Please request a new OTP." });
    if (new Date() > otp_record.expires_at) return res.status(400).json({ status: "error", message: "OTP has expired. Please request a new OTP." });
    
    const is_otp_valid = await bcrypt.compare(otp, otp_record.otp);
    if (!is_otp_valid) return res.status(400).json({ status: "error", message: "Invalid OTP. Please try again." });

    const cluster = await Cluster.findById(cluster_id).session(session);
    if (!cluster) return res.status(404).json({ status: "error", message: "Cluster not found" });

    if (cluster.level_1.toString() !== state_id) {
      return res.status(400).json({ status: "error", message: "Cluster does not belong to the same state." });
    }

    await GeoLevel2.updateMany({ cluster: cluster_id }, { $set: { cluster: null } }).session(session);
    await Cluster.deleteOne({ _id: cluster_id }).session(session);
    
    await session.commitTransaction();
    return res.status(200).json({ status: 'success', message: 'Cluster deleted successfully.' });
  } catch (error) {
    await session.abortTransaction();
    console.error("Γ¥î delete_cluster error:", error);
    return res.status(500).json({ status: 'error', message: "Internal server error.", error: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Edits the name of an existing cluster.
 * Req Payload: { cluster_id, name }
 */
const edit_cluster_name = async (req, res) => {
  try {
    const { cluster_id, name } = req.body;
    if (!cluster_id || !name) {
      return res.status(400).json({ message: "cluster_id and name are required", status: "error" });
    }

    const cluster = await Cluster.findById(cluster_id);
    if (!cluster) {
      return res.status(404).json({ status: "error", message: "Cluster not found" });
    }

    const existingCluster = await Cluster.findOne({
      name: name.trim(),
      level_1: cluster.level_1,
      _id: { $ne: cluster_id },
      deleted_at: null
    });

    if (existingCluster) {
      return res.status(409).json({ message: "Another cluster with this name already exists in this state.", status: "error" });
    }

    cluster.name = name.trim();
    await cluster.save();

    return res.status(200).json({
      status: "success",
      message: "Cluster name updated successfully.",
      cluster: {
        id: cluster._id.toString(),
        name: cluster.name
      }
    });
  } catch (error) {
    console.error("Γ¥î edit_cluster_name error:", error);
    return res.status(500).json({ status: "error", message: "Internal server error.", error: error.message });
  }
};

const get_zones_by_cluster = async (req, res) => {
  try {
    const { cluster_id } = req.params;
    if (!cluster_id) {
      return res.status(400).json({ status: "error", message: "cluster_id is required." });
    }
    const zones = await Zone.find({ cluster: cluster_id, deleted_at: null })
      .populate('districts')
      .lean();
    return res.status(200).json({ status: "success", zones });
  } catch (error) {
    console.error("Error in get_zones_by_cluster:", error);
    return res.status(500).json({ status: "error", message: "Internal server error." });
  }
};

const add_zone = async (req, res) => {
  try {
    const { name, cluster_id, district_ids } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: "error", message: "Zone name is required." });
    }
    if (!cluster_id) {
      return res.status(400).json({ status: "error", message: "cluster_id is required." });
    }
    
    const zone = new Zone({
      name: name.trim(),
      cluster: cluster_id,
      districts: district_ids || []
    });
    await zone.save();
    
    const populated = await Zone.findById(zone._id).populate('districts').lean();
    return res.status(201).json({ status: "success", zone: populated });
  } catch (error) {
    console.error("Error in add_zone:", error);
    return res.status(500).json({ status: "error", message: "Internal server error." });
  }
};

const delete_zone = async (req, res) => {
  try {
    const { zone_id } = req.params;
    if (!zone_id) {
      return res.status(400).json({ status: "error", message: "zone_id is required." });
    }
    
    await Zone.findByIdAndUpdate(zone_id, { deleted_at: new Date() });
    return res.status(200).json({ status: "success", message: "Zone deleted successfully." });
  } catch (error) {
    console.error("Error in delete_zone:", error);
    return res.status(500).json({ status: "error", message: "Internal server error." });
  }
};

/**
 * Bulk upload / import locations (State, District, Pincode, Lat, Lng)
 * Body: { country_id, country_name, locations: [...] }
 */
const bulk_upload_locations = async (req, res) => {
  try {
    const { country_id, country_name, locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No locations data provided. Please provide an array of location records."
      });
    }

    // 1. Resolve Country
    let targetCountry = null;
    if (country_id && mongoose.Types.ObjectId.isValid(country_id)) {
      targetCountry = await GeoLevel0.findById(country_id);
    }
    if (!targetCountry && country_name) {
      targetCountry = await GeoLevel0.findOne({
        name: { $regex: new RegExp('^' + country_name.trim() + '$', 'i') },
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      });
    }
    if (!targetCountry) {
      targetCountry = await GeoLevel0.findOne({
        is_active: true,
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      }).sort({ name: 1 });
    }
    if (!targetCountry) {
      targetCountry = await GeoLevel0.create({
        name: "India",
        iso2: "IN",
        phone_code: "+91",
        currency_name: "Indian Rupee",
        currency_code: "INR",
        is_active: true
      });
    }

    // 2. Parse & Normalize rows
    const groupedData = new Map();

    for (const raw of locations) {
      if (!raw || typeof raw !== 'object') continue;

      const stateName = (raw.state || raw.State || raw.STATE || raw.state_name || raw['State Name'] || raw.StateName || '').toString().trim();
      const districtName = (raw.district || raw.District || raw.DISTRICT || raw.district_name || raw['District Name'] || raw.DistrictName || '').toString().trim();
      const pincodeRaw = (raw.pincode || raw.Pincode || raw.PINCODE || raw.pin || raw.PIN || raw['Pin Code'] || raw['Postal Code'] || raw.zip || raw.zipcode || '').toString().trim();

      const latVal = raw.latitude !== undefined ? raw.latitude : (raw.Latitude !== undefined ? raw.Latitude : (raw.lat !== undefined ? raw.lat : raw.Lat));
      const lat = (latVal !== undefined && latVal !== null && latVal !== '' && !isNaN(Number(latVal))) ? Number(latVal) : 0;

      const lngVal = raw.longitude !== undefined ? raw.longitude : (raw.Longitude !== undefined ? raw.Longitude : (raw.lng !== undefined ? raw.lng : (raw.Lng !== undefined ? raw.Lng : raw.long)));
      const lng = (lngVal !== undefined && lngVal !== null && lngVal !== '' && !isNaN(Number(lngVal))) ? Number(lngVal) : 0;

      const locality = (raw.locality || raw.Locality || raw.area || raw.Area || raw.city || raw.City || raw.taluk || raw.Taluk || '').toString().trim();

      if (!stateName || !districtName) continue;

      const stateKey = stateName.toLowerCase();
      const districtKey = districtName.toLowerCase();

      if (!groupedData.has(stateKey)) {
        groupedData.set(stateKey, {
          stateName: stateName,
          districts: new Map()
        });
      }

      const stateGroup = groupedData.get(stateKey);
      if (!stateGroup.districts.has(districtKey)) {
        stateGroup.districts.set(districtKey, {
          districtName: districtName,
          lat: lat !== 0 ? lat : 0,
          lng: lng !== 0 ? lng : 0,
          pincodesMap: new Map()
        });
      }

      const distGroup = stateGroup.districts.get(districtKey);
      if (distGroup.lat === 0 && lat !== 0) distGroup.lat = lat;
      if (distGroup.lng === 0 && lng !== 0) distGroup.lng = lng;

      if (pincodeRaw) {
        const cleanPin = pincodeRaw.replace(/\s+/g, '');
        distGroup.pincodesMap.set(cleanPin, {
          pincode: cleanPin,
          lat: lat !== 0 ? lat : (distGroup.lat || 0),
          lng: lng !== 0 ? lng : (distGroup.lng || 0),
          locality: locality || '',
          is_active: true
        });
      }
    }

    if (groupedData.size === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid State and District pairs found in uploaded data. Please check column headers (State, District, Pincode, Lat, Lng)."
      });
    }

    let statesCount = 0;
    let districtsCount = 0;
    let pincodesCount = 0;

    // 3. Process database upserts
    for (const [stateKey, stateObj] of groupedData.entries()) {
      const stateEscaped = stateObj.stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let stateDoc = await GeoLevel1.findOne({
        level_0: targetCountry._id,
        name: { $regex: new RegExp('^' + stateEscaped + '$', 'i') },
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      });

      if (!stateDoc) {
        stateDoc = await GeoLevel1.create({
          name: stateObj.stateName,
          level_0: targetCountry._id,
          is_active: true
        });
        statesCount++;
      } else {
        if (!stateDoc.is_active) {
          stateDoc.is_active = true;
          await stateDoc.save();
        }
        statesCount++;
      }

      // Process districts
      for (const [distKey, distObj] of stateObj.districts.entries()) {
        const distEscaped = distObj.districtName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let distDoc = await GeoLevel2.findOne({
          level_1: stateDoc._id,
          name: { $regex: new RegExp('^' + distEscaped + '$', 'i') },
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        });

        const newPincodes = Array.from(distObj.pincodesMap.values());

        if (!distDoc) {
          distDoc = await GeoLevel2.create({
            name: distObj.districtName,
            level_1: stateDoc._id,
            is_active: true,
            lat: distObj.lat || 0,
            lng: distObj.lng || 0,
            pincodes: newPincodes
          });
          districtsCount++;
          pincodesCount += newPincodes.length;
        } else {
          const existingPins = distDoc.pincodes || [];
          const pinMap = new Map();
          for (const p of existingPins) {
            if (p && p.pincode) pinMap.set(p.pincode.toString().trim(), p);
          }
          for (const np of newPincodes) {
            const key = np.pincode.toString().trim();
            if (pinMap.has(key)) {
              const curr = pinMap.get(key);
              if (np.lat && (!curr.lat || curr.lat === 0)) curr.lat = np.lat;
              if (np.lng && (!curr.lng || curr.lng === 0)) curr.lng = np.lng;
              if (np.locality && !curr.locality) curr.locality = np.locality;
            } else {
              pinMap.set(key, np);
              pincodesCount++;
            }
          }

          distDoc.pincodes = Array.from(pinMap.values());
          if ((!distDoc.lat || distDoc.lat === 0) && distObj.lat) distDoc.lat = distObj.lat;
          if ((!distDoc.lng || distDoc.lng === 0) && distObj.lng) distDoc.lng = distObj.lng;
          if (!distDoc.is_active) distDoc.is_active = true;

          await distDoc.save();
          districtsCount++;
        }
      }
    }

    return res.status(200).json({
      status: "success",
      message: `Successfully processed ${locations.length} records. Updated ${statesCount} states, ${districtsCount} districts, and ${pincodesCount} pincodes.`,
      stats: {
        total_rows: locations.length,
        states_count: statesCount,
        districts_count: districtsCount,
        pincodes_count: pincodesCount
      }
    });
  } catch (error) {
    console.error("bulk_upload_locations error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to process location bulk upload.",
      error: error.message
    });
  }
};

/**
 * Get all pincodes for a specific district
 */
const get_district_pincodes = async (req, res) => {
  try {
    const { district_id } = req.params;
    if (!district_id || !mongoose.Types.ObjectId.isValid(district_id)) {
      return res.status(400).json({ status: "error", message: "Valid district_id is required." });
    }

    const district = await GeoLevel2.findById(district_id).lean();
    if (!district) {
      return res.status(404).json({ status: "error", message: "District not found." });
    }

    return res.status(200).json({
      status: "success",
      district: {
        id: district._id,
        name: district.name,
        lat: district.lat || 0,
        lng: district.lng || 0,
        pincodes_count: (district.pincodes || []).length,
        pincodes: district.pincodes || []
      }
    });
  } catch (error) {
    console.error("get_district_pincodes error:", error);
    return res.status(500).json({ status: "error", message: "Internal server error.", error: error.message });
  }
};


module.exports = {
  bulk_upload_locations,
  get_district_pincodes,
  deactivation_otp,
  get_countries,
  get_active_countries,
  get_country,
  get_states,
  get_active_states,
  get_state,
  get_districts,
  get_active_districts,
  get_district,
  activate_country,
  activate_state,
  activate_district,
  deactivate_country,
  deactivate_state,
  deactivate_district,
  get_urban_cities,
  add_urban_cities,
  exclude_urban_city,
  get_excluded_urban_cities,
  delete_excluded_urban_city,
  get_rural_cities,
  add_rural_cities,
  exclude_rural_city,
  get_excluded_rural_cities,
  delete_excluded_rural_city,
  add_cluster,
  get_clusters,
  assign_district_to_cluster,
  reassign_district_to_another_cluster_otp,
  reassign_district_to_another_cluster,
  delete_cluster_otp,
  delete_cluster,
  edit_cluster_name,
  get_zones_by_cluster,
  add_zone,
  delete_zone
};
