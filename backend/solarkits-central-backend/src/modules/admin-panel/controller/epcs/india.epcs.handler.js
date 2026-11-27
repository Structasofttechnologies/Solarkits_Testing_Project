const mongoose = require('mongoose');
const { EpcCompany } = require('../../models/india_core_db');
const { GeoLevel0, GeoLevel1 } = require('../../models/geolocation_db');
const { india_core_db, geolocation_db } = require('../../config/databases');
const { cleanStateToken, cleanGeoToken, buildGeoAndClusterResolver } = require('../../marketing/services/segmentGeo.service');
const { EpcAccount, EpcOrder, EpcType } = require('../../models/india_solarshop_db');

// ðŸ”¥ Email regex
const emailRegex = /^[A-Za-z0-9._%+&-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// ðŸ”¥ Normalize company name (Canonical Form)
const normalizeCompanyName = (name) => {
    return name
        .toLowerCase()
        .replace(/\b(pvt|pvt\.)\b/g, 'private')
        .replace(/\b(ltd|ltd\.)\b/g, 'limited')
        .replace(/\b(corp|corp\.)\b/g, 'corporation')
        .replace(/\b(inc|inc\.)\b/g, 'incorporated')
        .replace(/[^a-z0-9\s]/g, ' ') // Replace dots/symbols with space to avoid word joining
        .replace(/\s+/g, ' ')         // Normalize spaces
        .trim();
};

// ðŸ”¥ Similarity function (Dice coefficient)
const getSimilarity = (str1, str2) => {
    const bigrams = (str) => {
        let pairs = [];
        for (let i = 0; i < str.length - 1; i++) {
            pairs.push(str.slice(i, i + 2));
        }
        return pairs;
    };
    const pairs1 = bigrams(str1);
    const pairs2 = bigrams(str2);
    const set = new Set(pairs1);
    let intersection = 0;
    for (const pair of pairs2) {
        if (set.has(pair)) intersection++;
    }
    return pairs1.length + pairs2.length === 0 ? 0 : (2 * intersection) / (pairs1.length + pairs2.length);
};

// Add single EPC with states (Embedded Architecture)
const add_single_epc = async (req, res) => {
    const session = await india_core_db.startSession();
    session.startTransaction();
    try {
        const { name, email, states } = req.body;
        if (!name || !email || !Array.isArray(states) || states.length === 0) {
            return res.status(400).json({ status: "error", message: "Name, email, and states are required" });
        }
        if (name.trim().length < 2) return res.status(400).json({ status: "error", message: "Invalid name" });
        if (!emailRegex.test(email)) return res.status(400).json({ status: "error", message: "Invalid email" });

        // Validate states (Restrict to India)
        const india = await GeoLevel0.findOne({ 
            $or: [
                { name: { $regex: /^india$/i } },
                { iso2: "IN" }
            ]
        });
        if (!india) {
            return res.status(404).json({ status: "error", message: "India not found in geolocation database. Please ensure country data is loaded." });
        }

        const stateValidation = await GeoLevel1.find({ 
            _id: { $in: states },
            level_0: india._id
        });

        if (stateValidation.length !== states.length) {
            return res.status(400).json({ status: "error", message: "Invalid states (one or more states not found or not in India)" });
        }

        const cleanEmail = email.trim().toLowerCase();
        const normalizedNewName = normalizeCompanyName(name);

        const existingEPCs = await EpcCompany.find({ email: cleanEmail, deleted_at: null }).session(session);
        let matchedEpc = null;

        if (existingEPCs.length > 0) {
            for (const existing of existingEPCs) {
                if (getSimilarity(normalizeCompanyName(existing.name), normalizedNewName) >= 0.75) {
                    matchedEpc = existing;
                    break;
                }
            }
            if (!matchedEpc) {
                throw new Error("Same email used for different company");
            }
        }

        let epcId;
        let statesAddedCount = 0;

        if (matchedEpc) {
            epcId = matchedEpc._id;
            const currentStates = matchedEpc.working_states || [];
            const newStates = states.filter(id => !currentStates.map(s => s.toString()).includes(id.toString()));
            
            if (newStates.length > 0) {
                await EpcCompany.findByIdAndUpdate(epcId, {
                    $addToSet: { working_states: { $each: newStates } }
                }, { session });
                statesAddedCount = newStates.length;
            }
        } else {
            const [result] = await EpcCompany.create([{
                name: normalizedNewName,
                email: cleanEmail,
                source: 'government',
                working_states: states
            }], { session });
            epcId = result._id;
            statesAddedCount = states.length;
        }

        await session.commitTransaction();
        return res.json({
            status: "success",
            epc_id: epcId,
            states_added: statesAddedCount,
            message: matchedEpc ? "Merged successfully" : "Created successfully"
        });
    } catch (error) {
        await session.abortTransaction();
        
        let statusCode = 500;
        let message = error.message;

        if (error.name === 'CastError') {
            statusCode = 400;
            message = `Invalid ID format: ${error.value}`;
        } else if (error.message === "Same email used for different company") {
            statusCode = 409;
        }

        return res.status(statusCode).json({ 
            status: "error", 
            message: message 
        });
    } finally {
        session.endSession();
    }
};

// Bulk add EPCs (Embedded Architecture with Dynamic Fields & Option B Duplicate Details)
const add_epcs = async (req, res) => {
    try {
        const { epcs, default_settings = {} } = req.body;
        if (!Array.isArray(epcs) || epcs.length === 0) {
            return res.status(400).json({ status: "error", message: "EPCS required" });
        }

        const india = await GeoLevel0.findOne({ 
            $or: [
                { name: { $regex: /^india$/i } },
                { iso2: "IN" }
            ]
        });
        if (!india) {
            return res.status(404).json({ status: "error", message: "India not found in geolocation database. Please ensure country data is loaded." });
        }

        const allStates = await GeoLevel1.find({ level_0: india._id, deleted_at: null }).lean();
        const stateMap = new Map();
        const stateNameById = new Map();
        for (const s of allStates) {
            stateMap.set(String(s.name).toLowerCase(), s._id);
            stateNameById.set(String(s._id), s.name);
            const tok = cleanStateToken(s.name);
            if (tok) stateMap.set(tok, s._id);
        }

        const geoResolver = await buildGeoAndClusterResolver().catch(() => null);
        const requiredFieldsArr = Array.isArray(default_settings.required_fields) && default_settings.required_fields.length > 0
            ? default_settings.required_fields
            : ['name', 'email', 'state_name'];
        const requiredSet = new Set(requiredFieldsArr);

        // ðŸš€ Optimization: Pre-fetch existing EPCs by email and mobile_number for Option B deduplication
        const emails = epcs.map(e => (e.email || "").trim().toLowerCase()).filter(Boolean);
        const mobiles = epcs
            .map(e => String(e.mobile_number || e.phone || e.mobile || '').replace(/\D/g, '').slice(-10))
            .filter(p => p.length === 10);
        const gstins = epcs
            .map(e => String(e.gst_number || e.gstin || '').trim().toUpperCase())
            .filter(Boolean);
        const existingOr = [];
        if (emails.length > 0) existingOr.push({ email: { $in: emails } });
        if (mobiles.length > 0) existingOr.push({ mobile_number: { $in: mobiles } });
        if (gstins.length > 0) existingOr.push({ gst_number: { $in: gstins } });

        const existingEpcsList = existingOr.length > 0
            ? await EpcCompany.find({ deleted_at: null, $or: existingOr })
            : [];

        // Group existing EPCs by email, phone & gst for fast lookup (no name-only duplicacy)
        const existingEpcMap = new Map();
        const existingEpcPhoneMap = new Map();
        const existingEpcGstMap = new Map();
        existingEpcsList.forEach(epc => {
            const normN = normalizeCompanyName(epc.name || '');
            const obj = {
                ...epc.toObject(),
                normalizedName: normN
            };
            if (epc.email) {
                const em = String(epc.email).trim().toLowerCase();
                if (!existingEpcMap.has(em)) existingEpcMap.set(em, []);
                existingEpcMap.get(em).push(obj);
            }
            if (epc.mobile_number) {
                const ph = String(epc.mobile_number).replace(/\D/g, '').slice(-10);
                if (ph.length === 10) {
                    if (!existingEpcPhoneMap.has(ph)) existingEpcPhoneMap.set(ph, []);
                    existingEpcPhoneMap.get(ph).push(obj);
                }
            }
            if (epc.gst_number) {
                const g = String(epc.gst_number).trim().toUpperCase();
                if (!existingEpcGstMap.has(g)) existingEpcGstMap.set(g, []);
                existingEpcGstMap.get(g).push(obj);
            }

        });

        // â”€â”€â”€ EPC CATEGORY PRE-FETCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Rules (highest priority first):
        //   Buyer    â†’ has an EpcAccount AND has placed at least one EpcOrder
        //   Verified â†’ has an EpcAccount with status='approved' AND GSTIN is verified
        //              (gst_verification_status in ['verified_automatic','verified_admin'])
        //   Registered â†’ data present in EpcCompany but above conditions not met
        // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        // 1. Fetch matching EpcAccounts by email or whatsapp (phone)
        const acctOrConds = [];
        if (emails.length > 0) acctOrConds.push({ email: { $in: emails } });
        if (mobiles.length > 0) acctOrConds.push({ whatsapp: { $in: mobiles } }, { registered_whatsapp: { $in: mobiles } });
        const epcAccountsList = acctOrConds.length > 0
            ? await EpcAccount.find({ deleted_at: null, $or: acctOrConds })
                .select('email whatsapp registered_whatsapp status gst_verification_status company_id _id')
                .lean()
            : [];

        // Build lookup: email/phone â†’ account doc
        const acctByEmail = new Map();
        const acctByPhone = new Map();
        const acctIds = [];
        for (const acct of epcAccountsList) {
            acctIds.push(acct._id);
            if (acct.email) acctByEmail.set(String(acct.email).toLowerCase(), acct);
            if (acct.whatsapp) {
                const ph = String(acct.whatsapp).replace(/\D/g, '').slice(-10);
                if (ph.length === 10) acctByPhone.set(ph, acct);
            }
            if (acct.registered_whatsapp) {
                const ph = String(acct.registered_whatsapp).replace(/\D/g, '').slice(-10);
                if (ph.length === 10 && !acctByPhone.has(ph)) acctByPhone.set(ph, acct);
            }
        }

        // 2. Fetch EpcOrders for matched accounts to identify Buyers
        const buyerAccountIds = new Set();
        if (acctIds.length > 0) {
            const buyerOrders = await EpcOrder.find({ epc_id: { $in: acctIds }, deleted_at: null })
                .select('epc_id')
                .lean();
            for (const ord of buyerOrders) {
                if (ord.epc_id) buyerAccountIds.add(String(ord.epc_id));
            }
        }

        // 3. Fetch or upsert the three canonical EpcType docs from DB (no static data â€” live lookup)
        const CATEGORY_CODES = ['buyer', 'verified_epc', 'registered_epc'];
        const CATEGORY_DEFAULTS = {
            buyer:          { name: 'Buyer EPC',       badge_color: 'emerald', display_order: 1, is_active: true },
            verified_epc:   { name: 'Verified EPC',    badge_color: 'blue',    display_order: 2, is_active: true },
            registered_epc: { name: 'Registered EPC',  badge_color: 'amber',   display_order: 3, is_active: true },
        };
        const epcTypeDocs = {};
        for (const code of CATEGORY_CODES) {
            const doc = await EpcType.findOneAndUpdate(
                { code, deleted_at: null },
                { $setOnInsert: { code, ...CATEGORY_DEFAULTS[code] } },
                { upsert: true, new: true, lean: true }
            );
            epcTypeDocs[code] = doc;
        }

        // 4. Helper: resolve category for one upload row
        const resolveEpcCategory = (email, phone) => {
            const acct = (email ? acctByEmail.get(email) : null) || (phone ? acctByPhone.get(phone) : null);
            if (!acct) return null; // No account â†’ "registered" handled per-row below
            const isBuyer    = buyerAccountIds.has(String(acct._id));
            const isVerified = acct.status === 'approved'
                && ['verified_automatic', 'verified_admin'].includes(acct.gst_verification_status);
            if (isBuyer)    return epcTypeDocs['buyer'];
            if (isVerified) return epcTypeDocs['verified_epc'];
            return null; // has account but neither buyer nor verified â†’ still "registered"
        };
        // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        const results = { 
            added: [], 
            merged: [], 
            duplicate: [], 
            email_conflict: [], 
            invalid_states: [],
            errors: [],
            skipped_details: []
        };
        const clusterSummary = {};
        const stateSummary = {};

        const bulkOps = [];

        const resolveStateIds = (rawStatesList) => {
            const ids = [];
            const missing = [];
            for (const s of rawStatesList) {
                const trimmed = String(s || '').trim();
                if (!trimmed) continue;
                const direct = stateMap.get(trimmed.toLowerCase()) || stateMap.get(cleanStateToken(trimmed));
                if (direct) ids.push(direct);
                else missing.push(trimmed);
            }
            return { ids, missing };
        };

        for (let i = 0; i < epcs.length; i++) {
            const epc = epcs[i] || {};
            try {
                const rawName = (epc.name || epc.company_name || epc.firm_name || '').toString().trim();
                const rawEmail = (epc.email || '').toString().trim().toLowerCase();
                const cleanPhone = String(epc.mobile_number || epc.phone || epc.mobile || '').replace(/\D/g, '').slice(-10) || null;
                const rawDistrict = (epc.district_name || epc.district || epc.city || default_settings.default_district || '').toString().trim();
                const rawCluster = (epc.cluster_name || epc.cluster || default_settings.default_cluster || '').toString().trim();

                let rawStatesInput = [];
                if (Array.isArray(epc.states) && epc.states.length > 0) {
                    rawStatesInput = epc.states;
                } else {
                    const stateStr = (epc.state_name || epc.state || default_settings.default_state || '').toString();
                    rawStatesInput = stateStr.split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
                }

                // Resolve District & State into existing configured Franchisee Cluster
                const resolvedGeo = geoResolver
                    ? geoResolver.resolve({
                        stateName: rawStatesInput[0] || '',
                        districtName: rawDistrict,
                        clusterName: rawCluster,
                      })
                    : null;

                if (rawStatesInput.length === 0 && resolvedGeo?.state) {
                    rawStatesInput = [resolvedGeo.state];
                }

                if (!rawName && !rawEmail && !cleanPhone) {
                    const msg = "Empty row (missing Company / EPC Name)";
                    results.errors.push({ index: i, message: msg });
                    results.skipped_details.push({ row_number: i + 1, name: 'Row ' + (i + 1), email: rawEmail, reason: msg });
                    continue;
                }

                if (requiredSet.has('name') && !rawName) {
                    const msg = "Missing required Company / EPC Name";
                    results.errors.push({ index: i, message: msg });
                    results.skipped_details.push({ row_number: i + 1, name: 'Row ' + (i + 1), email: rawEmail, reason: msg });
                    continue;
                }

                if (requiredSet.has('email') && !rawEmail) {
                    const msg = "Missing required Email Address";
                    results.errors.push({ index: i, message: msg });
                    results.skipped_details.push({ row_number: i + 1, name: rawName || 'Row ' + (i + 1), email: rawEmail, reason: msg });
                    continue;
                }

                if (requiredSet.has('mobile_number') && !cleanPhone) {
                    const msg = "Missing required 10-digit Mobile Number";
                    results.errors.push({ index: i, name: rawName, message: msg });
                    results.skipped_details.push({ row_number: i + 1, name: rawName || 'Row ' + (i + 1), email: rawEmail, reason: msg });
                    continue;
                }

                if (requiredSet.has('district_name') && !rawDistrict) {
                    const msg = "Missing required District / City";
                    results.errors.push({ index: i, name: rawName, message: msg });
                    results.skipped_details.push({ row_number: i + 1, name: rawName || 'Row ' + (i + 1), email: rawEmail, reason: msg });
                    continue;
                }

                if (requiredSet.has('state_name') && rawStatesInput.length === 0) {
                    const msg = "Missing required State(s) (and District did not match a known State)";
                    results.errors.push({ index: i, name: rawName, message: msg });
                    results.skipped_details.push({ row_number: i + 1, name: rawName || 'Row ' + (i + 1), email: rawEmail, reason: msg });
                    continue;
                }

                const name = rawName || cleanPhone || rawEmail;
                const email = rawEmail || null;

                if (name.length < 2) {
                    results.errors.push({ index: i, name, message: "Name too short" });
                    results.skipped_details.push({ row_number: i + 1, name, email: email || '', reason: "Name too short" });
                    continue;
                }

                if (email && !emailRegex.test(email)) {
                    results.errors.push({ index: i, email, message: "Invalid email format" });
                    results.skipped_details.push({ row_number: i + 1, name, email, reason: "Invalid email format" });
                    continue;
                }

                const normalizedNewName = normalizeCompanyName(name);
                const { ids: resolvedStateIds, missing: missingStates } = resolveStateIds(rawStatesInput);
                const stateIds = resolvedStateIds.length > 0
                    ? resolvedStateIds
                    : (resolvedGeo?.state_id ? [resolvedGeo.state_id] : []);

                if (missingStates.length > 0 && stateIds.length === 0) {
                    results.invalid_states.push({ index: i, name, missing: missingStates });
                }

                if (requiredSet.has('state_name') && stateIds.length === 0) {
                    const msg = missingStates.length > 0
                        ? `Invalid Indian state(s): ${missingStates.join(', ')}`
                        : 'Missing valid Indian State';
                    results.errors.push({ index: i, name, message: msg });
                    results.skipped_details.push({ row_number: i + 1, name, email: email || '', reason: msg });
                    continue;
                }

                const cleanGst = (epc.gst_number || epc.gstin) ? String(epc.gst_number || epc.gstin).trim().toUpperCase() : null;
                const cleanPerson = (epc.contact_person || '').toString().trim() || null;
                const cleanDistrict = resolvedGeo?.district || rawDistrict || null;
                const finalStateName = resolvedGeo?.state || (stateIds[0] ? stateNameById.get(String(stateIds[0])) : null) || rawStatesInput[0] || null;
                const rawClusterId = epc.cluster_id ? String(epc.cluster_id).trim() : null;
                const rawClusterCode = (epc.cluster_code || '').toString().trim().toUpperCase() || null;
                const finalClusterId = resolvedGeo?.cluster_id || (rawClusterId && mongoose.Types.ObjectId.isValid(rawClusterId) ? rawClusterId : null);
                const finalClusterName = resolvedGeo?.cluster_name || rawCluster || null;
                const finalClusterCode = resolvedGeo?.cluster_code || rawClusterCode || null;
                const cleanPincode = epc.pincode ? String(epc.pincode).replace(/\D/g, '').slice(0, 6) || null : null;
                const cleanAddress = (epc.address_line || epc.address || '').toString().trim() || null;
                // Auto-resolve EPC category from live DB (Buyer > Verified > Registered)
                // Buyer    = EpcAccount exists AND placed at least one EpcOrder
                // Verified = EpcAccount status='approved' AND GSTIN verified_automatic|verified_admin
                // Registered = default: data present in directory, no qualifying account
                const resolvedCategoryDoc = resolveEpcCategory(email, cleanPhone, cleanGst);
                const autoCategory = resolvedCategoryDoc != null ? resolvedCategoryDoc : epcTypeDocs['registered_epc'];
                const csvEpcType       = (epc.epc_type || default_settings.default_epc_type || '').toString().trim() || null;
                const cleanEpcType     = csvEpcType || (autoCategory ? autoCategory.name  : null);
                const cleanEpcTypeCode = csvEpcType ? null : (autoCategory ? autoCategory.code  : null);
                const cleanEpcTypeId   = csvEpcType ? null : (autoCategory ? (autoCategory._id || autoCategory.id || null) : null);
                const cleanRemarks = (epc.remarks || default_settings.default_remarks || '').toString().trim() || null;
                const cleanSource = (epc.source || epc.lead_source || default_settings.default_lead_source || 'government').toString().trim() || 'government';
                const cleanCustomAttrs = {};
                if (epc.custom_attributes && typeof epc.custom_attributes === 'object' && !Array.isArray(epc.custom_attributes)) {
                    for (const [ck, cv] of Object.entries(epc.custom_attributes)) {
                        const safeCk = String(ck || '').trim().replace(/[.$]/g, '_').replace(/^_+/, '');
                        const safeCv = cv !== undefined && cv !== null ? String(cv).trim() : '';
                        if (safeCk && safeCv) cleanCustomAttrs[safeCk] = safeCv;
                    }
                }

                const existingByEmail = email ? (existingEpcMap.get(email) || []) : [];
                const existingByPhone = cleanPhone ? (existingEpcPhoneMap.get(cleanPhone) || []) : [];
                const existingByGst = cleanGst ? (existingEpcGstMap.get(cleanGst) || []) : [];
                const candidateMap = new Map();
                for (const item of [...existingByEmail, ...existingByPhone, ...existingByGst]) {
                    candidateMap.set(String(item._id), item);
                }
                const candidateExisting = Array.from(candidateMap.values());
                let matchedEpc = null;

                if (candidateExisting.length > 0) {
                    for (const existing of candidateExisting) {
                        const sameGst = cleanGst && existing.gst_number && String(existing.gst_number).toUpperCase() === cleanGst;
                        const samePhone = cleanPhone && existing.mobile_number && String(existing.mobile_number).replace(/\D/g, '').slice(-10) === cleanPhone;
                        if (sameGst || getSimilarity(existing.normalizedName, normalizedNewName) >= 0.75 || (samePhone && getSimilarity(existing.normalizedName, normalizedNewName) >= 0.5)) {
                            matchedEpc = existing;
                            break;
                        }
                    }
                    if (!matchedEpc && existingByEmail.length > 0) {
                        results.email_conflict.push({ index: i, email, input_name: name, existing_names: existingByEmail.map(e => e.name) });
                        results.skipped_details.push({
                            row_number: i + 1,
                            name,
                            email,
                            phone: cleanPhone || '',
                            reason: `Email conflict - already registered under "${existingByEmail[0]?.name}"`
                        });
                        continue;
                    }
                    if (!matchedEpc && existingByPhone.length > 0) {
                        results.duplicate.push({ index: i, name, email: email || '' });
                        results.skipped_details.push({
                            row_number: i + 1,
                            name,
                            email: email || '',
                            phone: cleanPhone || '',
                            reason: `Duplicate mobile number - already registered under "${existingByPhone[0]?.name}"`
                        });
                        continue;
                    }
                }

                if (matchedEpc) {
                    const epcId = matchedEpc._id;
                    const currentStates = matchedEpc.working_states || [];
                    const newStates = stateIds.filter(id => !currentStates.map(s => s.toString()).includes(id.toString()));

                    const optionalSet = {};
                    if (cleanPhone && !matchedEpc.mobile_number) optionalSet.mobile_number = cleanPhone;
                    if (cleanGst && !matchedEpc.gst_number) optionalSet.gst_number = cleanGst;
                    if (cleanPerson && !matchedEpc.contact_person) optionalSet.contact_person = cleanPerson;
                    if (finalStateName && !matchedEpc.state_name) optionalSet.state_name = finalStateName;
                    if (resolvedGeo?.district_id && !matchedEpc.district_id) optionalSet.district_id = resolvedGeo.district_id;
                    if (cleanDistrict && !matchedEpc.district_name) optionalSet.district_name = cleanDistrict;
                    if (finalClusterId && !matchedEpc.cluster_id) optionalSet.cluster_id = finalClusterId;
                    if (finalClusterName && !matchedEpc.cluster_name) optionalSet.cluster_name = finalClusterName;
                    if (finalClusterCode && !matchedEpc.cluster_code) optionalSet.cluster_code = finalClusterCode;
                    if (cleanPincode && !matchedEpc.pincode) optionalSet.pincode = cleanPincode;
                    if (cleanAddress && !matchedEpc.address_line) optionalSet.address_line = cleanAddress;
                    if (cleanEpcType && !matchedEpc.epc_type) optionalSet.epc_type = cleanEpcType;
                    if (cleanEpcTypeCode && !matchedEpc.epc_type_code) optionalSet.epc_type_code = cleanEpcTypeCode;
                    if (cleanEpcTypeId && !matchedEpc.epc_type_id) optionalSet.epc_type_id = cleanEpcTypeId;
                    if (cleanRemarks && !matchedEpc.remarks) optionalSet.remarks = cleanRemarks;
                    if (Object.keys(cleanCustomAttrs).length > 0) {
                        const existingAttrs = (matchedEpc.custom_attributes && typeof matchedEpc.custom_attributes === 'object') ? matchedEpc.custom_attributes : {};
                        for (const [ck, cv] of Object.entries(cleanCustomAttrs)) {
                            if (!existingAttrs[ck]) optionalSet[`custom_attributes.${ck}`] = cv;
                        }
                    }

                    const addToSetDoc = {};
                    if (newStates.length > 0) addToSetDoc.working_states = { $each: newStates };
                    if (finalClusterId && !(matchedEpc.cluster_ids || []).some(cid => String(cid) === String(finalClusterId))) {
                        addToSetDoc.cluster_ids = finalClusterId;
                    }

                    if (Object.keys(addToSetDoc).length > 0 || Object.keys(optionalSet).length > 0) {
                        const updateDoc = {};
                        if (Object.keys(addToSetDoc).length > 0) updateDoc.$addToSet = addToSetDoc;
                        if (Object.keys(optionalSet).length > 0) updateDoc.$set = optionalSet;
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: epcId },
                                update: updateDoc
                            }
                        });
                        results.merged.push({ index: i, id: epcId, name, email: email || '', states_added: newStates.length, cluster_name: finalClusterName });
                        matchedEpc.working_states = [...currentStates, ...newStates];
                        if (finalStateName) stateSummary[finalStateName] = (stateSummary[finalStateName] || 0) + 1;
                        if (finalClusterName) clusterSummary[finalClusterName] = (clusterSummary[finalClusterName] || 0) + 1;
                    } else {
                        results.duplicate.push({ index: i, name, email: email || '' });
                        results.skipped_details.push({
                            row_number: i + 1,
                            name,
                            email: email || '',
                            phone: cleanPhone || '',
                            reason: 'Already registered EPC in selected state(s)'
                        });
                    }
                } else {
                    const newEpcId = new mongoose.Types.ObjectId();
                    bulkOps.push({
                        insertOne: {
                            document: {
                                _id: newEpcId,
                                name: normalizedNewName,
                                email: email || null,
                                contact_person: cleanPerson,
                                mobile_number: cleanPhone,
                                gst_number: cleanGst,
                                state_name: finalStateName,
                                district_id: resolvedGeo?.district_id || null,
                                district_name: cleanDistrict,
                                cluster_id: finalClusterId,
                                cluster_name: finalClusterName,
                                cluster_code: finalClusterCode,
                                cluster_ids: finalClusterId ? [finalClusterId] : [],
                                pincode: cleanPincode,
                                address_line: cleanAddress,
                                epc_type: cleanEpcType,
                                epc_type_code: cleanEpcTypeCode || null,
                                epc_type_id: cleanEpcTypeId || null,
                                remarks: cleanRemarks,
                                custom_attributes: cleanCustomAttrs,
                                source: cleanSource,
                                working_states: stateIds,
                                created_at: new Date()
                            }
                        }
                    });
                    results.added.push({ index: i, name: normalizedNewName, email: email || '', cluster_name: finalClusterName });
                    if (finalStateName) stateSummary[finalStateName] = (stateSummary[finalStateName] || 0) + 1;
                    if (finalClusterName) clusterSummary[finalClusterName] = (clusterSummary[finalClusterName] || 0) + 1;

                    const memEntry = {
                        _id: newEpcId,
                        name: normalizedNewName,
                        email: email || null,
                        mobile_number: cleanPhone,
                        gst_number: cleanGst,
                        normalizedName: normalizedNewName,
                        working_states: stateIds,
                        cluster_ids: finalClusterId ? [finalClusterId] : []
                    };
                    if (email) {
                        if (!existingEpcMap.has(email)) existingEpcMap.set(email, []);
                        existingEpcMap.get(email).push(memEntry);
                    }
                    if (cleanPhone) {
                        if (!existingEpcPhoneMap.has(cleanPhone)) existingEpcPhoneMap.set(cleanPhone, []);
                        existingEpcPhoneMap.get(cleanPhone).push(memEntry);
                    }
                    if (cleanGst) {
                        if (!existingEpcGstMap.has(cleanGst)) existingEpcGstMap.set(cleanGst, []);
                        existingEpcGstMap.get(cleanGst).push(memEntry);
                    }

                }
            } catch (err) {
                results.errors.push({ index: i, message: err.message });
                results.skipped_details.push({ row_number: i + 1, name: epc?.name || 'Row ' + (i + 1), reason: err.message });
            }
        }

        // ðŸš€ Execute all operations in bulk
        if (bulkOps.length > 0) {
            await EpcCompany.bulkWrite(bulkOps, { ordered: false });
        }

        return res.json({
            status: "success",
            summary: {
                total: epcs.length,
                added: results.added.length,
                merged: results.merged.length,
                duplicate: results.duplicate.length,
                email_conflict: results.email_conflict.length,
                invalid_states: results.invalid_states.length,
                failed: results.errors.length
            },
            cluster_summary: clusterSummary,
            state_summary: stateSummary,
            skipped_details: results.skipped_details,
            details: results
        });
    } catch (error) {
        console.error("Bulk EPC Upload Error:", error);
        return res.status(500).json({ status: "error", message: error.message });
    }
};

// Get EPCs with states (Embedded Architecture)
const get_epcs = async (req, res) => {
    try {
        const {
            page = 1, limit = 10, search = '', sortBy = 'created_at', sortOrder = 'DESC',
            status = 'all', source = 'all', fromDate = '', toDate = '', ids = '', stateIds = '',
            clusterId = '', clusterName = ''
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // ðŸ—ï¸ Building Match Stage
        const matchStage = { deleted_at: null };
        if (search) {
            matchStage.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { district_name: { $regex: search, $options: 'i' } },
                { cluster_name: { $regex: search, $options: 'i' } }
            ];
        }
        if (status === 'valid') matchStage.email = { $regex: emailRegex };
        else if (status === 'invalid') matchStage.email = { $not: emailRegex };
        if (source !== 'all') matchStage.source = source;
        if (fromDate || toDate) {
            matchStage.created_at = {};
            if (fromDate) matchStage.created_at.$gte = new Date(fromDate);
            if (toDate) matchStage.created_at.$lte = new Date(toDate);
        }
        if (ids) {
            const idArray = ids.split(',').filter(Boolean).map(id => id.trim());
            if (idArray.length) matchStage._id = { $in: idArray.map(id => id.length === 24 ? new india_core_db.base.Types.ObjectId(id) : id) };
        }
        if (stateIds) {
            const stateIdArray = stateIds.split(',').filter(Boolean).map(id => id.trim());
            if (stateIdArray.length) matchStage.working_states = { $in: stateIdArray.map(id => id.length === 24 ? new india_core_db.base.Types.ObjectId(id) : id) };
        }
        const geoResolver = await buildGeoAndClusterResolver().catch(() => null);

        if (clusterId && clusterId !== 'all') {
            if (clusterId === 'unassigned') {
                matchStage.cluster_id = null;
            } else if (clusterId.startsWith('unassigned::')) {
                const targetState = clusterId.slice('unassigned::'.length).trim();
                matchStage.cluster_id = null;
                if (targetState === 'Unspecified State') {
                    matchStage.$and = matchStage.$and || [];
                    matchStage.$and.push({
                        $or: [{ state_name: null }, { state_name: '' }],
                        $or2: undefined
                    });
                    delete matchStage.$and[matchStage.$and.length - 1].$or2;
                    matchStage.$and.push({
                        $or: [{ working_states: { $exists: false } }, { working_states: { $size: 0 } }]
                    });
                } else {
                    const matchedStates = await GeoLevel1.find({ name: new RegExp('^' + targetState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }).select('_id').lean();
                    const stateObjIds = matchedStates.map(s => s._id);
                    const stateConds = [{ state_name: new RegExp('^' + targetState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }];
                    if (stateObjIds.length > 0) stateConds.push({ working_states: { $in: stateObjIds } });
                    matchStage.$and = matchStage.$and || [];
                    matchStage.$and.push({ $or: stateConds });
                }
            } else if (mongoose.Types.ObjectId.isValid(clusterId)) {
                const cluObjId = new mongoose.Types.ObjectId(clusterId);
                const cluMeta = geoResolver?.clusterById?.get(String(clusterId));
                const orConds = [{ cluster_id: cluObjId }];
                if (cluMeta?.cluster_name) {
                    orConds.push({ cluster_name: cluMeta.cluster_name });
                }
                if (Array.isArray(cluMeta?.district_names) && cluMeta.district_names.length > 0) {
                    const distRegexes = cluMeta.district_names.map(d => new RegExp('^' + String(d).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'));
                    orConds.push({ cluster_id: null, district_name: { $in: distRegexes } });
                }
                matchStage.$and = matchStage.$and || [];
                matchStage.$and.push({ $or: orConds });
            }
        }
        if (clusterName && clusterName !== 'all') {
            matchStage.cluster_name = clusterName;
        }

        // Sort Stage
        const sortDir = sortOrder.toUpperCase() === 'ASC' ? 1 : -1;
        const sortField = sortBy === 'id' ? '_id' : sortBy;
        const sortStage = { [sortField]: sortDir };

        // Main Aggregation + Cluster/State Group Breakdown
        const [aggRes, allMatchingForGroups] = await Promise.all([
            EpcCompany.aggregate([
                { $match: matchStage },
                { $addFields: { state_count: { $size: { $ifNull: ["$working_states", []] } } } },
                { $sort: sortStage },
                {
                    $facet: {
                        data: [{ $skip: skip }, { $limit: limitNum }],
                        pagination: [{ $count: "total" }],
                        overallStats: [
                            { $group: {
                                _id: null,
                                total_epcs: { $sum: 1 },
                                total_valid_emails: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ["$email", ""] }, regex: "^[A-Za-z0-9._%+&-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$" } }, 1, 0] } },
                                total_invalid_emails: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ["$email", ""] }, regex: "^[A-Za-z0-9._%+&-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$" } }, 0, 1] } },
                                total_state_assignments: { $sum: { $size: { $ifNull: ["$working_states", []] } } }
                            }}
                        ]
                    }
                }
            ]),
            EpcCompany.find({ deleted_at: null })
                .select('state_name working_states district_name cluster_id cluster_name cluster_code')
                .lean(),
        ]);

        const [results] = aggRes;
        const epcs = results.data;
        const totalRecords = results.pagination[0]?.total || 0;
        const overallStats = results.overallStats[0] || { total_epcs: 0, total_valid_emails: 0, total_invalid_emails: 0, total_state_assignments: 0 };

        // Bulk resolve state names
        const allStateIds = [...new Set([
            ...epcs.flatMap(e => e.working_states || []),
            ...allMatchingForGroups.flatMap(e => e.working_states || [])
        ])];
        const stateNames = allStateIds.length > 0 ? await GeoLevel1.find({ _id: { $in: allStateIds } }) : [];
        const stateMap = new Map(stateNames.map(s => [s._id.toString(), s.name]));

        // Build State-wise and Cluster-wise Groups across EPC Directory
        const stateGroupsMap = new Map();
        const clusterGroupsMap = new Map();
        for (const doc of allMatchingForGroups) {
            const firstStName = doc.state_name || (doc.working_states?.[0] ? stateMap.get(String(doc.working_states[0])) : '') || '';
            const resolved = geoResolver && !doc.cluster_name && (doc.district_name || firstStName)
                ? geoResolver.resolve({ stateName: firstStName, districtName: doc.district_name || '' })
                : null;
            const stLabel = firstStName || resolved?.state || 'Unspecified State';
            const cluId = doc.cluster_id ? String(doc.cluster_id) : (resolved?.cluster_id ? String(resolved.cluster_id) : '');
            const cluName = doc.cluster_name || resolved?.cluster_name || '';
            const cluCode = doc.cluster_code || resolved?.cluster_code || '';

            if (!stateGroupsMap.has(stLabel)) {
                stateGroupsMap.set(stLabel, { state_name: stLabel, count: 0, clusters: new Set() });
            }
            const sg = stateGroupsMap.get(stLabel);
            sg.count += 1;
            if (cluName) sg.clusters.add(cluName);

            const cluKey = cluId || cluName || `UNASSIGNED::${stLabel}`;
            if (!clusterGroupsMap.has(cluKey)) {
                clusterGroupsMap.set(cluKey, {
                    cluster_id: cluId || null,
                    cluster_name: cluName || `${stLabel} (Unassigned District/Cluster)`,
                    cluster_code: cluCode || '',
                    state_name: stLabel,
                    is_assigned: Boolean(cluName),
                    count: 0,
                    districts: new Set()
                });
            }
            const cg = clusterGroupsMap.get(cluKey);
            cg.count += 1;
            if (doc.district_name) cg.districts.add(doc.district_name);
        }

        const processedEpcs = epcs.map(epc => {
            const firstStName = epc.state_name || (epc.working_states?.[0] ? stateMap.get(String(epc.working_states[0])) : '') || '';
            const resolved = geoResolver && !epc.cluster_name && (epc.district_name || firstStName)
                ? geoResolver.resolve({ stateName: firstStName, districtName: epc.district_name || '' })
                : null;
            return {
                id: epc._id,
                name: epc.name,
                email: epc.email,
                contact_person: epc.contact_person || null,
                mobile_number: epc.mobile_number || null,
                gst_number: epc.gst_number || null,
                state_name: firstStName || resolved?.state || null,
                district_name: epc.district_name || resolved?.district || null,
                cluster_id: epc.cluster_id || resolved?.cluster_id || null,
                cluster_name: epc.cluster_name || resolved?.cluster_name || null,
                cluster_code: epc.cluster_code || resolved?.cluster_code || null,
                pincode: epc.pincode || null,
                address_line: epc.address_line || null,
                epc_type: epc.epc_type || null,
                epc_type_code: epc.epc_type_code || null,
                epc_type_id: epc.epc_type_id || null,
                remarks: epc.remarks || null,
                custom_attributes: epc.custom_attributes || {},
                source: epc.source || 'government',
                email_valid: Boolean(epc.email && emailRegex.test(epc.email)),
                created_at: epc.created_at,
                created_at_formatted: new Date(epc.created_at).toLocaleString(),
                state_count: epc.state_count,
                states: (epc.working_states || []).map(sid => ({
                    id: sid,
                    name: stateMap.get(sid.toString()) || 'Unknown'
                }))
            };
        });

        // âœ… UNIQUE EMAIL COUNT (PAGE LEVEL)
        const uniqueEmails = new Map();
        processedEpcs.forEach(epc => {
            if (epc.email) {
                if (!uniqueEmails.has(epc.email)) {
                    uniqueEmails.set(epc.email, emailRegex.test(epc.email));
                }
            }
        });

        const response = {
            status: "success",
            data: processedEpcs,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_records: totalRecords,
                total_pages: Math.ceil(totalRecords / limitNum),
                has_next: pageNum < Math.ceil(totalRecords / limitNum),
                has_previous: pageNum > 1
            },
            summary: {
                current_page: {
                    total: processedEpcs.length,
                    valid_emails: [...uniqueEmails.values()].filter(v => v).length,
                    invalid_emails: [...uniqueEmails.values()].filter(v => !v).length,
                    total_states: processedEpcs.reduce((acc, epc) => acc + epc.state_count, 0)
                },
                overall: {
                    total_epcs: overallStats.total_epcs,
                    total_valid_emails: overallStats.total_valid_emails,
                    total_invalid_emails: overallStats.total_invalid_emails,
                    total_state_assignments: overallStats.total_state_assignments,
                    avg_states_per_epc: overallStats.total_epcs > 0 ? (overallStats.total_state_assignments / overallStats.total_epcs).toFixed(1) : 0
                }
            },
            filters: {
                search: search || null,
                status,
                source,
                cluster_id: clusterId || null,
                sort_by: sortBy,
                sort_order: sortOrder,
                date_range: { from: fromDate || null, to: toDate || null }
            },
            cluster_groups: Array.from(clusterGroupsMap.values())
                .map(g => ({ ...g, districts: Array.from(g.districts) }))
                .sort((a, b) => (b.is_assigned ? 1 : 0) - (a.is_assigned ? 1 : 0) || b.count - a.count),
            state_groups: Array.from(stateGroupsMap.values())
                .map(s => ({ state_name: s.state_name, count: s.count, clusters_count: s.clusters.size }))
                .sort((a, b) => b.count - a.count)
        };

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
};

// Get all Indian states
const get_indian_states = async (req, res) => {
    try {
        const india = await GeoLevel0.findOne({ 
            $or: [
                { name: { $regex: /^india$/i } },
                { iso2: "IN" }
            ]
        });
        if (!india) return res.status(404).json({ status: "error", message: 'India not found in geolocation database. Please ensure country data is loaded.' });

        const states = await GeoLevel1.find({ level_0: india._id }).sort({ name: 1 });
        return res.status(200).json({
            status: "success",
            message: "Indian states retrieved successfully",
            states: states.map(s => ({ id: s.id, name: s.name }))
        });
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
};

module.exports = {
    add_epcs,
    get_epcs,
    add_single_epc,
    get_indian_states
};