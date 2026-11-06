const mongoose = require("mongoose");
const GeoLevel0 = require("../../models/geolocation_db/geo_level_0.schema");
const GeoLevel1 = require("../../models/geolocation_db/geo_level_1.schema");
const GeoLevel2 = require("../../models/geolocation_db/geo_level_2.schema");
const CompanyWarehouse = require("../../models/india_core_db/company_warehouses.schema");
const EpcAccount = require("../../models/india_solarshop_db/epc_accounts.schema");
const EpcAccountLocation = require("../../models/india_solarshop_db/epc_account_locations.schema");

const get_states = async (req, res) => {
    try {
        // Query active states (as configured/activated from admin panel)
        const india = await GeoLevel0.findOne({ name: { $regex: /^India$/i } });

        const query = {
            is_active: true,
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        };

        if (india) {
            query.level_0 = india._id;
        }

        // 🔒 If authenticated EPC user, restrict strictly to their registered state(s)
        const epcId = req.user?.account_id || req.user?.id;
        if (epcId && mongoose.Types.ObjectId.isValid(epcId)) {
            const epc = await EpcAccount.findById(epcId).lean();
            if (epc) {
                let allowedStateIds = (epc.states && epc.states.length > 0) ? [...epc.states] : [];
                if (allowedStateIds.length === 0) {
                    const epcLoc = await EpcAccountLocation.findOne({ account_id: epcId, is_primary: true, deleted_at: null }).lean();
                    if (epcLoc?.state_id) allowedStateIds.push(epcLoc.state_id);
                }
                if (allowedStateIds.length === 0 && epc.state_name) {
                    const matchedState = await GeoLevel1.findOne({ name: new RegExp(`^${epc.state_name.trim()}$`, 'i') }).lean();
                    if (matchedState) allowedStateIds.push(matchedState._id);
                }
                if (allowedStateIds.length > 0) {
                    query._id = { $in: allowedStateIds };
                }
            }
        }

        const states = await GeoLevel1.find(query).sort({ name: 1 }).select('_id name is_active');

        // Map response to match standard format (id instead of _id)
        const formattedStates = states.map(s => ({
            id: s._id.toString(),
            _id: s._id.toString(),
            name: s.name,
            is_active: s.is_active
        }));

        return res.status(200).json({ states: formattedStates, data: formattedStates });

    } catch (error) {
        console.error("get_states error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const get_districts_by_state = async (req, res) => {
    try {
        const { state_id } = req.query;

        const query = {
            is_active: true,
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        };

        if (state_id && state_id !== 'all') {
            if (mongoose.Types.ObjectId.isValid(state_id)) {
                query.level_1 = new mongoose.Types.ObjectId(state_id);
            } else {
                // Find by state name
                const stateDoc = await GeoLevel1.findOne({
                    name: { $regex: new RegExp(`^${state_id.trim()}$`, "i") },
                    $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
                });
                if (stateDoc) {
                    query.level_1 = stateDoc._id;
                } else {
                    return res.status(200).json({ districts: [], data: [] });
                }
            }
        }

        // 🔒 If authenticated EPC user, restrict strictly to their registered district(s)
        const epcId = req.user?.account_id || req.user?.id;
        if (epcId && mongoose.Types.ObjectId.isValid(epcId)) {
            const epc = await EpcAccount.findById(epcId).lean();
            if (epc) {
                let allowedDistrictIds = (epc.districts && epc.districts.length > 0) ? [...epc.districts] : [];
                if (allowedDistrictIds.length === 0) {
                    const epcLoc = await EpcAccountLocation.findOne({ account_id: epcId, is_primary: true, deleted_at: null }).lean();
                    if (epcLoc?.district_id) allowedDistrictIds.push(epcLoc.district_id);
                }
                if (allowedDistrictIds.length === 0 && epc.district_name && query.level_1) {
                    const matchedDistrict = await GeoLevel2.findOne({
                        level_1: query.level_1,
                        name: new RegExp(`^${epc.district_name.trim()}$`, 'i')
                    }).lean();
                    if (matchedDistrict) allowedDistrictIds.push(matchedDistrict._id);
                }
                if (allowedDistrictIds.length > 0) {
                    query._id = { $in: allowedDistrictIds };
                }
            }
        }

        // Fetch active districts (optionally filtered by state)
        const districts = await GeoLevel2.find(query).populate('level_1', 'name is_active').sort({ name: 1 }).select('_id name level_1 is_active pincodes');

        // Map response to match standard format
        const formattedDistricts = districts.map(d => ({
            id: d._id.toString(),
            _id: d._id.toString(),
            name: d.name,
            state_id: d.level_1?._id ? d.level_1._id.toString() : (d.level_1 ? d.level_1.toString() : null),
            state_name: d.level_1?.name || '',
            pincodes_count: d.pincodes?.length || 0,
            pincodes: d.pincodes || [],
            is_active: d.is_active
        }));

        return res.status(200).json({ districts: formattedDistricts, data: formattedDistricts });

    } catch (error) {
        console.error("get_districts_by_state error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// -------------------------------------------------------------
// Boundary DB Setup and District Boundary Lookup Endpoint
// -------------------------------------------------------------
const { geolocation_boundary_db } = require("../../../../config/databases");
const boundaryDb = geolocation_boundary_db || mongoose;

const boundaryCountrySchema = new mongoose.Schema({
  iso2: { type: String, required: true }
}, { collection: 'geolocation_level_0' });

const boundaryStateSchema = new mongoose.Schema({
  level_0: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0' },
  name: { type: String, required: true }
}, { collection: 'geolocation_level_1' });

const boundaryDistrictSchema = new mongoose.Schema({
  level_1: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' },
  name: { type: String, required: true },
  lat: { type: Number },
  lng: { type: Number },
  geometry_type: { type: String },
  coordinates: {
    type: { type: String },
    coordinates: { type: Array }
  }
}, { collection: 'geolocation_level_2' });

const BoundaryCountry = boundaryDb.model('geolocation_level_0', boundaryCountrySchema);
const BoundaryState = boundaryDb.model('geolocation_level_1', boundaryStateSchema);
const BoundaryDistrict = boundaryDb.model('geolocation_level_2', boundaryDistrictSchema);

const get_district_boundary = async (req, res) => {
    try {
        const { district, state, country } = req.query;

        if (!district || !state || !country) {
            return res.status(400).json({ error: "district, state, and country are required" });
        }

        const countryDoc = await GeoLevel0.findOne({ name: { $regex: new RegExp(`^${country}$`, "i") }, deleted_at: null });
        if (!countryDoc) {
            return res.status(404).json({ error: `Country "${country}" not found.` });
        }

        const stateDoc = await GeoLevel1.findOne({ name: { $regex: new RegExp(`^${state}$`, "i") }, level_0: countryDoc._id, deleted_at: null });
        if (!stateDoc) {
            return res.status(404).json({ error: `State "${state}" not found under "${country}".` });
        }

        const districtDoc = await GeoLevel2.findOne({ name: { $regex: new RegExp(`^${district}$`, "i") }, level_1: stateDoc._id, deleted_at: null });
        if (!districtDoc) {
            return res.status(404).json({ error: `District "${district}" not found under "${state}".` });
        }

        const boundaryCountry = await BoundaryCountry.findOne({ iso2: countryDoc.iso2 });
        let boundaryData = null;
        if (boundaryCountry) {
            const boundaryState = await BoundaryState.findOne({ level_0: boundaryCountry._id, name: { $regex: new RegExp(`^${state}$`, "i") } });
            if (boundaryState) {
                boundaryData = await BoundaryDistrict.findOne({ level_1: boundaryState._id, name: { $regex: new RegExp(`^${district}$`, "i") } });
            }
        }

        return res.status(200).json({
            success: true,
            district: {
                id: districtDoc._id.toString(),
                name: districtDoc.name,
                lat: boundaryData?.lat || 0,
                lng: boundaryData?.lng || 0,
                geometry: {
                    type: boundaryData?.geometry_type || (boundaryData?.coordinates ? boundaryData.coordinates.type : 'Point'),
                    coordinates: boundaryData?.coordinates?.coordinates || [],
                },
                boundary: boundaryData?.coordinates?.coordinates || [],
            }
        });

    } catch (error) {
        console.error("get_district_boundary error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// -------------------------------------------------------------
// Curated Directory of Known Indian Hubs & Cities for instant zero-latency PIN resolution
// -------------------------------------------------------------
const KNOWN_PINCODE_HUBS = {
    // Gujarat
    '360001': { district: 'Rajkot', state: 'Gujarat', locality: 'Rajkot Main' },
    '360002': { district: 'Rajkot', state: 'Gujarat', locality: 'Rajkot Bedipara' },
    '360003': { district: 'Rajkot', state: 'Gujarat', locality: 'Rajkot Bhaktinagar' },
    '360004': { district: 'Rajkot', state: 'Gujarat', locality: 'Rajkot Junction' },
    '360005': { district: 'Rajkot', state: 'Gujarat', locality: 'Rajkot Mavdi' },
    '360006': { district: 'Rajkot', state: 'Gujarat', locality: 'Rajkot Kalawad Road' },
    '360007': { district: 'Rajkot', state: 'Gujarat', locality: 'Rajkot Kotharia' },
    '361001': { district: 'Jamnagar', state: 'Gujarat', locality: 'Jamnagar HO' },
    '361320': { district: 'Devbhumi Dwarka', state: 'Gujarat', locality: 'Dwarka' },
    '361305': { district: 'Devbhumi Dwarka', state: 'Gujarat', locality: 'Khambhalia' },
    '360575': { district: 'Porbandar', state: 'Gujarat', locality: 'Porbandar HO' },
    '363641': { district: 'Morbi', state: 'Gujarat', locality: 'Morbi Main' },
    '364001': { district: 'Bhavnagar', state: 'Gujarat', locality: 'Bhavnagar HO' },
    '362001': { district: 'Junagadh', state: 'Gujarat', locality: 'Junagadh HO' },
    '363001': { district: 'Surendranagar', state: 'Gujarat', locality: 'Surendranagar' },
    '365601': { district: 'Amreli', state: 'Gujarat', locality: 'Amreli HO' },
    '370001': { district: 'Kachchh', state: 'Gujarat', locality: 'Bhuj HO' },
    '370201': { district: 'Kachchh', state: 'Gujarat', locality: 'Gandhidham' },
    '380001': { district: 'Ahmedabad', state: 'Gujarat', locality: 'Ahmedabad GPO' },
    '380006': { district: 'Ahmedabad', state: 'Gujarat', locality: 'Ellisbridge' },
    '380009': { district: 'Ahmedabad', state: 'Gujarat', locality: 'Navrangpura' },
    '380015': { district: 'Ahmedabad', state: 'Gujarat', locality: 'Vastrapur' },
    '380054': { district: 'Ahmedabad', state: 'Gujarat', locality: 'Thaltej' },
    '382010': { district: 'Gandhinagar', state: 'Gujarat', locality: 'Gandhinagar Sector 16' },
    '384001': { district: 'Mahesana', state: 'Gujarat', locality: 'Mehsana HO' },
    '384265': { district: 'Patan', state: 'Gujarat', locality: 'Patan HO' },
    '385001': { district: 'Banaskantha', state: 'Gujarat', locality: 'Palanpur HO' },
    '385565': { district: 'Banaskantha', state: 'Gujarat', locality: 'Tharad' },
    '388001': { district: 'Anand', state: 'Gujarat', locality: 'Anand HO' },
    '387001': { district: 'Kheda', state: 'Gujarat', locality: 'Nadiad HO' },
    '390001': { district: 'Vadodara', state: 'Gujarat', locality: 'Vadodara HO' },
    '392001': { district: 'Bharuch', state: 'Gujarat', locality: 'Bharuch HO' },
    '395001': { district: 'Surat', state: 'Gujarat', locality: 'Surat HO' },
    '395002': { district: 'Surat', state: 'Gujarat', locality: 'Surat Nanpura' },
    '395003': { district: 'Surat', state: 'Gujarat', locality: 'Surat Varachha' },
    '395007': { district: 'Surat', state: 'Gujarat', locality: 'Surat Vesu' },
    '396001': { district: 'Valsad', state: 'Gujarat', locality: 'Valsad HO' },
    '396445': { district: 'Navsari', state: 'Gujarat', locality: 'Navsari HO' },
    // Maharashtra
    '400001': { district: 'Mumbai', state: 'Maharashtra', locality: 'Mumbai GPO' },
    '400050': { district: 'Mumbai Suburban', state: 'Maharashtra', locality: 'Bandra' },
    '400601': { district: 'Thane', state: 'Maharashtra', locality: 'Thane HO' },
    '411001': { district: 'Pune', state: 'Maharashtra', locality: 'Pune HO' },
    '411014': { district: 'Pune', state: 'Maharashtra', locality: 'Viman Nagar' },
    '411045': { district: 'Pune', state: 'Maharashtra', locality: 'Baner' },
    '422001': { district: 'Nashik', state: 'Maharashtra', locality: 'Nashik HO' },
    '431001': { district: 'Aurangabad', state: 'Maharashtra', locality: 'Chhatrapati Sambhajinagar' },
    '440001': { district: 'Nagpur', state: 'Maharashtra', locality: 'Nagpur GPO' },
    '416001': { district: 'Kolhapur', state: 'Maharashtra', locality: 'Kolhapur HO' },
    // Rajasthan
    '302001': { district: 'Jaipur', state: 'Rajasthan', locality: 'Jaipur GPO' },
    '302020': { district: 'Jaipur', state: 'Rajasthan', locality: 'Mansarovar' },
    '302022': { district: 'Jaipur', state: 'Rajasthan', locality: 'Sitapura Industrial Area' },
    '342001': { district: 'Jodhpur', state: 'Rajasthan', locality: 'Jodhpur HO' },
    '313001': { district: 'Udaipur', state: 'Rajasthan', locality: 'Udaipur HO' },
    '324001': { district: 'Kota', state: 'Rajasthan', locality: 'Kota HO' },
    '305001': { district: 'Ajmer', state: 'Rajasthan', locality: 'Ajmer HO' },
    '334001': { district: 'Bikaner', state: 'Rajasthan', locality: 'Bikaner HO' },
    // Delhi
    '110001': { district: 'New Delhi', state: 'Delhi', locality: 'Connaught Place' },
    '110020': { district: 'South Delhi', state: 'Delhi', locality: 'Okhla' },
    // Karnataka
    '560001': { district: 'Bengaluru Urban', state: 'Karnataka', locality: 'Bengaluru GPO' },
    '560058': { district: 'Bengaluru Urban', state: 'Karnataka', locality: 'Peenya' },
    '570001': { district: 'Mysuru', state: 'Karnataka', locality: 'Mysuru HO' },
    // Telangana
    '500001': { district: 'Hyderabad', state: 'Telangana', locality: 'Hyderabad GPO' },
    '500032': { district: 'Hyderabad', state: 'Telangana', locality: 'Gachibowli' },
    // Andhra Pradesh
    '516001': { district: 'YSR Kadapa', state: 'Andhra Pradesh', locality: 'Kadapa HO' },
    '517501': { district: 'Chittoor', state: 'Andhra Pradesh', locality: 'Tirupati' },
    '518001': { district: 'Kurnool', state: 'Andhra Pradesh', locality: 'Kurnool HO' },
    '520001': { district: 'Krishna', state: 'Andhra Pradesh', locality: 'Vijayawada' },
    '522001': { district: 'Guntur', state: 'Andhra Pradesh', locality: 'Guntur HO' },
    '530001': { district: 'Visakhapatnam', state: 'Andhra Pradesh', locality: 'Visakhapatnam HO' },
    // Uttar Pradesh
    '226001': { district: 'Lucknow', state: 'Uttar Pradesh', locality: 'Lucknow GPO' },
    '201301': { district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', locality: 'Noida Sector 1' },
    '208001': { district: 'Kanpur Nagar', state: 'Uttar Pradesh', locality: 'Kanpur HO' },
    '221001': { district: 'Varanasi', state: 'Uttar Pradesh', locality: 'Varanasi Cantt' },
    '282001': { district: 'Agra', state: 'Uttar Pradesh', locality: 'Agra Fort' },
    // Haryana
    '122001': { district: 'Gurugram', state: 'Haryana', locality: 'Gurugram Sadar Bazar' },
    '121001': { district: 'Faridabad', state: 'Haryana', locality: 'Faridabad NIT' },
    // Madhya Pradesh
    '462001': { district: 'Bhopal', state: 'Madhya Pradesh', locality: 'Bhopal GPO' },
    '452001': { district: 'Indore', state: 'Madhya Pradesh', locality: 'Indore GPO' },
    // Tamil Nadu
    '600001': { district: 'Chennai', state: 'Tamil Nadu', locality: 'Chennai GPO' },
    '600032': { district: 'Chennai', state: 'Tamil Nadu', locality: 'Guindy' },
    // West Bengal
    '700001': { district: 'Kolkata', state: 'West Bengal', locality: 'Kolkata GPO' },
    // Kerala
    '682001': { district: 'Ernakulam', state: 'Kerala', locality: 'Kochi' },
    '695001': { district: 'Thiruvananthapuram', state: 'Kerala', locality: 'Trivandrum GPO' },
    // Bihar
    '800001': { district: 'Patna', state: 'Bihar', locality: 'Patna GPO' },
    // Punjab & Chandigarh
    '141001': { district: 'Ludhiana', state: 'Punjab', locality: 'Ludhiana HO' },
    '160001': { district: 'Chandigarh', state: 'Chandigarh', locality: 'Chandigarh Sector 17' }
};

/**
 * GET /india/v1/geo/pincode-lookup?pincode=302001
 * Fast lookup of State and District for any 6-digit Pincode from Setup Location database
 */
const lookup_pincode = async (req, res) => {
    try {
        const rawPin = (req.query.pincode || req.query.pin || req.query.q || '').toString().trim().replace(/\s+/g, '');
        if (!rawPin || rawPin.length < 3) {
            return res.status(400).json({ success: false, message: 'Valid pincode (at least 3 digits) is required.' });
        }

        const pinNum = parseInt(rawPin, 10);
        let matchType = 'exact';

        // 1. Exact match search in GeoLevel2 pincodes array (supports both string and number)
        // CRITICAL FIX: Wrap in $and so deleted_at filter doesn't overwrite pincode filter
        let districtDoc = await GeoLevel2.findOne({
            $and: [
                {
                    $or: [
                        { 'pincodes.pincode': rawPin },
                        ...(isNaN(pinNum) ? [] : [{ 'pincodes.pincode': pinNum }])
                    ]
                },
                {
                    $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
                }
            ]
        }).populate('level_1').lean();

        // 2. Check PincodeDeliveryCost table if not yet registered in GeoLevel2
        if (!districtDoc) {
            try {
                const { PincodeDeliveryCost } = require("../../../admin-panel/models/india_solarshop_db");
                const pdc = await PincodeDeliveryCost.findOne({
                    pincode: rawPin,
                    is_active: true
                }).lean();
                if (pdc && pdc.district_name) {
                    const stDoc = await GeoLevel1.findOne({
                        name: { $regex: new RegExp(`^${pdc.state_name.trim()}$`, 'i') },
                        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
                    }).lean();
                    const dtDoc = await GeoLevel2.findOne({
                        name: { $regex: new RegExp(`^${pdc.district_name.trim()}$`, 'i') },
                        ...(stDoc ? { level_1: stDoc._id } : {}),
                        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
                    }).populate('level_1').lean();
                    if (dtDoc) {
                        districtDoc = dtDoc;
                        matchType = 'delivery_rates';
                    }
                }
            } catch (err) {
                // Silently continue to next fallback
            }
        }

        // 3. Check curated prominent Indian hubs dictionary
        if (!districtDoc && KNOWN_PINCODE_HUBS[rawPin]) {
            const hub = KNOWN_PINCODE_HUBS[rawPin];
            const stDoc = await GeoLevel1.findOne({
                name: { $regex: new RegExp(`^${hub.state}$`, 'i') },
                $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
            }).lean();
            const dtDoc = await GeoLevel2.findOne({
                name: { $regex: new RegExp(`^${hub.district}$`, 'i') },
                ...(stDoc ? { level_1: stDoc._id } : {}),
                $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
            }).populate('level_1').lean();

            if (dtDoc) {
                districtDoc = dtDoc;
                matchType = 'hub_directory';
            }
        }

        // 4. Online India Post API Lookup (gracefully times out in 2.5s if offline/sandboxed)
        if (!districtDoc && rawPin.length === 6) {
            try {
                const axios = require('axios');
                const postRes = await axios.get(`https://api.postalpincode.in/pincode/${rawPin}`, { timeout: 2500 });
                if (postRes.data && postRes.data[0] && postRes.data[0].Status === 'Success') {
                    const po = postRes.data[0].PostOffice?.[0];
                    if (po && po.District && po.State) {
                        const apiDist = po.District.trim();
                        const apiState = po.State.trim();
                        const stDoc = await GeoLevel1.findOne({
                            name: { $regex: new RegExp(`^${apiState}$`, 'i') },
                            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
                        }).lean();
                        const dtDoc = await GeoLevel2.findOne({
                            name: { $regex: new RegExp(`^${apiDist}$`, 'i') },
                            ...(stDoc ? { level_1: stDoc._id } : {}),
                            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
                        }).populate('level_1').lean();
                        if (dtDoc) {
                            districtDoc = dtDoc;
                            matchType = 'online_registry';
                        }
                    }
                }
            } catch (e) {
                // Timeout or network unavailable, continue safely
            }
        }

        // 5. Prefix match fallback if exact 6-digit not found
        if (!districtDoc && rawPin.length >= 3) {
            districtDoc = await GeoLevel2.findOne({
                'pincodes.pincode': new RegExp('^' + rawPin),
                $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
            }).populate('level_1').lean();
            if (districtDoc) matchType = 'prefix';
        }

        if (!districtDoc) {
            return res.status(404).json({
                success: false,
                message: `Pincode ${rawPin} not found in active serviceable locations.`
            });
        }

        const matchedPin = (districtDoc.pincodes || []).find(p => {
            if (!p || !p.pincode) return false;
            const pStr = p.pincode.toString().trim();
            return matchType === 'exact' ? pStr === rawPin : pStr.startsWith(rawPin);
        });

        const stateObj = districtDoc.level_1 || {};
        const stateName = stateObj.name || '';
        const stateId = stateObj._id ? stateObj._id.toString() : '';
        const districtName = districtDoc.name || '';
        const districtId = districtDoc._id.toString();
        const pinCode = matchedPin?.pincode ? String(matchedPin.pincode) : rawPin;
        const locality = matchedPin?.locality || KNOWN_PINCODE_HUBS[rawPin]?.locality || '';

        // Auto-cache resolved pincode into GeoLevel2 for future sub-millisecond lookups
        if (districtDoc._id && rawPin.length === 6 && !matchedPin) {
            GeoLevel2.updateOne(
                { _id: districtDoc._id, 'pincodes.pincode': { $ne: rawPin } },
                { $push: { pincodes: { pincode: rawPin, locality: locality || '', is_active: true } } }
            ).catch(() => {});
        }

        const dataPayload = {
            pincode: pinCode,
            locality: locality,
            district_id: districtId,
            district_name: districtName,
            state_id: stateId,
            state_name: stateName,
            is_active: districtDoc.is_active,
            lat: matchedPin?.lat || districtDoc.lat || 0,
            lng: matchedPin?.lng || districtDoc.lng || 0
        };

        return res.status(200).json({
            success: true,
            data: dataPayload,
            match_type: matchType,
            pincode: pinCode,
            district: {
                id: districtId,
                _id: districtId,
                name: districtName,
                is_active: districtDoc.is_active
            },
            state: {
                id: stateId,
                _id: stateId,
                name: stateName,
                is_active: stateObj.is_active
            },
            coordinates: {
                lat: dataPayload.lat,
                lng: dataPayload.lng
            }
        });

    } catch (error) {
        console.error('lookup_pincode error:', error);
        return res.status(500).json({ success: false, message: 'Failed to lookup pincode.' });
    }
};

/**
 * GET /india/v1/geo/pincodes-search?q=360
 * Autocomplete / live suggestions for Pincodes
 */
const search_pincodes = async (req, res) => {
    try {
        const q = (req.query.q || req.query.query || '').toString().trim().replace(/\s+/g, '');
        if (!q || q.length < 2) {
            return res.status(200).json({ success: true, results: [] });
        }

        const districts = await GeoLevel2.find({
            'pincodes.pincode': new RegExp('^' + q),
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        }).populate('level_1').limit(15).lean();

        const results = [];
        const seenPins = new Set();

        for (const dist of districts) {
            const stateObj = dist.level_1 || {};
            const matchingPins = (dist.pincodes || []).filter(p => p.pincode && p.pincode.toString().startsWith(q));

            for (const p of matchingPins) {
                const pinStr = p.pincode.toString();
                if (!seenPins.has(pinStr)) {
                    seenPins.add(pinStr);
                    results.push({
                        pincode: pinStr,
                        locality: p.locality || '',
                        district: {
                            id: dist._id.toString(),
                            _id: dist._id.toString(),
                            name: dist.name
                        },
                        state: {
                            id: stateObj._id ? stateObj._id.toString() : '',
                            _id: stateObj._id ? stateObj._id.toString() : '',
                            name: stateObj.name || ''
                        }
                    });
                }
            }
        }

        return res.status(200).json({ success: true, results });

    } catch (error) {
        console.error('search_pincodes error:', error);
        return res.status(500).json({ success: false, message: 'Failed to search pincodes.' });
    }
};

/**
 * GET /india/v1/geo/district-pincodes/:district_id
 * Returns all pincodes for a specific district
 */
const get_district_pincodes = async (req, res) => {
    try {
        const districtId = req.params?.district_id || req.query?.district_id;
        if (!districtId || !mongoose.Types.ObjectId.isValid(districtId)) {
            return res.status(400).json({ success: false, message: "Valid district_id is required." });
        }

        const dist = await GeoLevel2.findById(districtId).select('name pincodes level_1 is_active').populate('level_1', 'name').lean();
        if (!dist) {
            return res.status(404).json({ success: false, message: "District not found." });
        }

        return res.status(200).json({
            success: true,
            district: {
                id: dist._id.toString(),
                name: dist.name,
                state_name: dist.level_1?.name || '',
                pincodes: dist.pincodes || []
            },
            pincodes: dist.pincodes || []
        });
    } catch (error) {
        console.error('get_district_pincodes error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch district pincodes.' });
    }
};

module.exports = {
    get_states,
    get_districts_by_state,
    get_district_boundary,
    lookup_pincode,
    search_pincodes,
    get_district_pincodes
};
