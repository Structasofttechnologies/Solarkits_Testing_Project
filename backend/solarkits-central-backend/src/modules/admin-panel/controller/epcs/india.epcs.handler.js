const { EpcCompany } = require('../../models/india_core_db');
const { GeoLevel0, GeoLevel1 } = require('../../models/geolocation_db');
const { india_core_db, geolocation_db } = require('../../config/databases');

// 🔥 Email regex
const emailRegex = /^[A-Za-z0-9._%+&-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// 🔥 Normalize company name (Canonical Form)
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

// 🔥 Similarity function (Dice coefficient)
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

// Bulk add EPCs (Embedded Architecture)
const add_epcs = async (req, res) => {
    try {
        const { epcs } = req.body;
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

        const allStates = await GeoLevel1.find({ level_0: india._id });
        const stateMap = new Map(allStates.map(s => [s.name.toLowerCase(), s._id]));

        // 🚀 Optimization: Pre-fetch existing EPCs by email
        const emails = epcs.map(e => (e.email || "").trim().toLowerCase()).filter(Boolean);
        const existingEpcsList = await EpcCompany.find({ 
            email: { $in: emails }, 
            deleted_at: null 
        });

        // Group existing EPCs by email for fast lookup and pre-normalize names
        const existingEpcMap = new Map();
        existingEpcsList.forEach(epc => {
            if (!existingEpcMap.has(epc.email)) {
                existingEpcMap.set(epc.email, []);
            }
            existingEpcMap.get(epc.email).push({
                ...epc.toObject(),
                normalizedName: normalizeCompanyName(epc.name)
            });
        });

        const results = { 
            added: [], 
            merged: [], 
            duplicate: [], 
            email_conflict: [], 
            invalid_states: [], // Track missing states
            errors: [] 
        };

        const bulkOps = [];

        for (let i = 0; i < epcs.length; i++) {
            try {
                const epc = epcs[i];
                if (!epc.name || !epc.email || !Array.isArray(epc.states)) {
                    results.errors.push({ index: i, message: "Missing required fields (name, email, or states array)" });
                    continue;
                }

                const name = epc.name.trim();
                const email = epc.email.trim().toLowerCase();

                if (name.length < 2) {
                    results.errors.push({ index: i, name, message: "Name too short" });
                    continue;
                }

                if (!emailRegex.test(email)) {
                    results.errors.push({ index: i, email, message: "Invalid email format" });
                    continue;
                }

                const normalizedNewName = normalizeCompanyName(name);

                // Map states and track missing ones
                const missingStates = epc.states.filter(s => !stateMap.has(s.toLowerCase()));
                if (missingStates.length > 0) {
                    results.invalid_states.push({ index: i, name, missing: missingStates });
                }

                const stateIds = epc.states
                    .map(s => stateMap.get(s.toLowerCase()))
                    .filter(Boolean);

                if (stateIds.length === 0 && epc.states.length > 0) {
                    results.errors.push({ index: i, name, message: "None of the provided states are valid for India" });
                    continue;
                }

                const existingEPCs = existingEpcMap.get(email) || [];
                let matchedEpc = null;

                if (existingEPCs.length > 0) {
                    for (const existing of existingEPCs) {
                        // ⚡ Higher threshold for better accuracy (75%)
                        if (getSimilarity(existing.normalizedName, normalizedNewName) >= 0.75) {
                            matchedEpc = existing;
                            break;
                        }
                    }
                    if (!matchedEpc) {
                        results.email_conflict.push({ index: i, email, input_name: name, existing_names: existingEPCs.map(e => e.name) });
                        continue;
                    }
                }

                if (matchedEpc) {
                    const epcId = matchedEpc._id;
                    const currentStates = matchedEpc.working_states || [];
                    const newStates = stateIds.filter(id => !currentStates.map(s => s.toString()).includes(id.toString()));

                    if (newStates.length > 0) {
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: epcId },
                                update: { $addToSet: { working_states: { $each: newStates } } }
                            }
                        });
                        results.merged.push({ index: i, id: epcId, name, email, states_added: newStates.length });
                        
                        // 🔥 Update local map so subsequent items in SAME BATCH can merge correctly
                        matchedEpc.working_states = [...currentStates, ...newStates];
                    } else {
                        results.duplicate.push({ index: i, name, email });
                    }
                } else {
                    const newEpcId = new mongoose.Types.ObjectId();
                    bulkOps.push({
                        insertOne: {
                            document: {
                                _id: newEpcId,
                                name: normalizedNewName,
                                email: email,
                                source: 'government',
                                working_states: stateIds,
                                created_at: new Date()
                            }
                        }
                    });
                    results.added.push({ index: i, name: normalizedNewName, email });

                    // 🔥 Add to existingEpcMap so subsequent items in SAME BATCH can merge into this one
                    if (!existingEpcMap.has(email)) {
                        existingEpcMap.set(email, []);
                    }
                    existingEpcMap.get(email).push({
                        _id: newEpcId,
                        name: normalizedNewName,
                        email: email,
                        normalizedName: normalizedNewName,
                        working_states: stateIds
                    });
                }
            } catch (err) {
                results.errors.push({ index: i, message: err.message });
            }
        }

        // 🚀 Execute all operations in bulk
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
            status = 'all', source = 'all', fromDate = '', toDate = '', ids = '', stateIds = ''
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // 🏗️ Building Match Stage
        const matchStage = { deleted_at: null };
        if (search) {
            matchStage.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
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

        // 🏗️ Sort Stage
        const sortDir = sortOrder.toUpperCase() === 'ASC' ? 1 : -1;
        const sortField = sortBy === 'id' ? '_id' : sortBy;
        const sortStage = { [sortField]: sortDir };

        // 📊 Main Aggregation
        const [results] = await EpcCompany.aggregate([
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
                            total_valid_emails: { $sum: { $cond: [{ $regexMatch: { input: "$email", regex: "^[A-Za-z0-9._%+&-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$" } }, 1, 0] } },
                            total_invalid_emails: { $sum: { $cond: [{ $regexMatch: { input: "$email", regex: "^[A-Za-z0-9._%+&-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$" } }, 0, 1] } },
                            total_state_assignments: { $sum: { $size: { $ifNull: ["$working_states", []] } } }
                        }}
                    ]
                }
            }
        ]);

        const epcs = results.data;
        const totalRecords = results.pagination[0]?.total || 0;
        const overallStats = results.overallStats[0] || { total_epcs: 0, total_valid_emails: 0, total_invalid_emails: 0, total_state_assignments: 0 };

        // Bulk resolve state names
        const allStateIds = [...new Set(epcs.flatMap(e => e.working_states || []))];
        const stateNames = await GeoLevel1.find({ _id: { $in: allStateIds } });
        const stateMap = new Map(stateNames.map(s => [s._id.toString(), s.name]));

        const processedEpcs = epcs.map(epc => ({
            id: epc._id,
            name: epc.name,
            email: epc.email,
            source: epc.source || 'government',
            email_valid: emailRegex.test(epc.email),
            created_at: epc.created_at,
            created_at_formatted: new Date(epc.created_at).toLocaleString(),
            state_count: epc.state_count,
            states: (epc.working_states || []).map(sid => ({
                id: sid,
                name: stateMap.get(sid.toString()) || 'Unknown'
            }))
        }));

        // ✅ UNIQUE EMAIL COUNT (PAGE LEVEL)
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
                sort_by: sortBy,
                sort_order: sortOrder,
                date_range: { from: fromDate || null, to: toDate || null }
            }
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