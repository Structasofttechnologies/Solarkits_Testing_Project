const Supplier = require('../models/supplier.schema');

const isStateMatch = (stateName, locState, locAddress) => {
    if (!stateName) return false;
    const a = stateName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (locState && String(locState) !== 'undefined') {
        const b = String(locState).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (a.includes(b) || b.includes(a)) return true;
    }
    if (locAddress) {
        const addr = String(locAddress).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (addr.includes(a)) return true;
    }
    return false;
};

exports.create_state_request = async (req, res) => {
    try {
        const supplierId = req.supplier.id;
        const { state, office_location, gst } = req.body;

        if (!state || !office_location || !gst || !office_location.address || !gst.gst_number) {
            return res.status(400).json({ status: 'error', message: 'Requested state, office address, and GST number are required.' });
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found.' });
        }

        // 1. Check if already covers this state
        const alreadyCovers = supplier.states.some(s => s.toLowerCase() === state.toLowerCase());
        if (alreadyCovers) {
            return res.status(400).json({ status: 'error', message: `You already cover state "${state}".` });
        }

        // 2. Check if a request is already pending for this state
        const pending = (supplier.state_requests || []).find(r => r.state.toLowerCase() === state.toLowerCase() && r.status === 'pending');
        if (pending) {
            return res.status(400).json({ status: 'error', message: `A state request for "${state}" is already pending approval.` });
        }

        // 3. Match office location state
        if (!isStateMatch(state, office_location.state, office_location.address)) {
            return res.status(400).json({
                status: 'error',
                message: `Office location is in "${office_location.state || 'Unknown'}", but it must be in the requested state "${state}".`
            });
        }

        // 4. Validate GST and check PAN matching
        const gstin = gst.gst_number.trim().toUpperCase();
        if (gstin.length !== 15) {
            return res.status(400).json({ status: 'error', message: 'GST number must be exactly 15 characters.' });
        }

        // Check if GST is registered to another supplier
        const existingGstSupplier = await Supplier.findOne({
            _id: { $ne: supplierId },
            is_deleted: { $ne: true },
            $or: [
                { gst_number: gstin },
                { 'gst_list.gst_number': gstin }
            ]
        });
        if (existingGstSupplier) {
            return res.status(409).json({
                status: 'error',
                message: `GST number ${gstin} is already registered to another supplier account.`
            });
        }

        const newPan = gstin.substring(2, 12);
        
        // Find existing verified GST to match PAN
        const existingGst = (supplier.gst_list || []).find(g => g.is_verified && g.pan_number);
        const existingPan = existingGst?.pan_number || supplier.pan_number;
        const isDev = process.env.NODE_ENV !== 'production';
        if (existingPan && existingPan !== newPan) {
            if (isDev || existingPan === 'AAAAA1111A') {
                console.warn(`[DEV/MOCK] Bypassing PAN validation mismatch in create_state_request: GSTIN PAN (${newPan}) vs Registered PAN (${existingPan})`);
            } else {
                return res.status(400).json({
                    status: 'error',
                    message: `The GST number PAN (${newPan}) does not match your registered PAN (${existingPan}). All GSTINs must belong to the same business entity.`
                });
            }
        }

        // 5. Remove any old rejected requests for this state to keep history clean
        supplier.state_requests = (supplier.state_requests || []).filter(
            r => r.state.toLowerCase() !== state.toLowerCase()
        );

        // 6. Push new pending request
        supplier.state_requests.push({
            state,
            office_location: {
                address: office_location.address,
                lat: office_location.lat || 0,
                lng: office_location.lng || 0,
                state: office_location.state || state
            },
            gst: {
                gst_number: gstin,
                pan_number: newPan,
                state: state,
                is_verified: true
            },
            status: 'pending',
            rejection_reason: null
        });

        await supplier.save();

        return res.status(201).json({
            status: 'success',
            message: 'State request submitted successfully. It is now pending administrator review.',
            data: supplier.state_requests
        });
    } catch (err) {
        console.error('create_state_request error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

exports.get_state_requests = async (req, res) => {
    try {
        const supplierId = req.supplier.id;
        const supplier = await Supplier.findById(supplierId).lean();
        if (!supplier) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found.' });
        }

        return res.status(200).json({
            status: 'success',
            data: supplier.state_requests || []
        });
    } catch (err) {
        console.error('get_state_requests error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

exports.add_gst = async (req, res) => {
    try {
        const supplierId = req.supplier.id;
        const { gstin, state } = req.body;

        if (!gstin || !state) {
            return res.status(400).json({ status: 'error', message: 'GSTIN and state are required.' });
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found.' });
        }

        const formattedGstin = gstin.trim().toUpperCase();
        if (formattedGstin.length !== 15) {
            return res.status(400).json({ status: 'error', message: 'GST number must be exactly 15 characters.' });
        }

        // Check if GST is registered to another supplier
        const existingGstSupplier = await Supplier.findOne({
            _id: { $ne: supplierId },
            is_deleted: { $ne: true },
            $or: [
                { gst_number: formattedGstin },
                { 'gst_list.gst_number': formattedGstin }
            ]
        });
        if (existingGstSupplier) {
            return res.status(409).json({
                status: 'error',
                message: `GST number ${formattedGstin} is already registered to another supplier account.`
            });
        }

        const newPan = formattedGstin.substring(2, 12);
        const existingGst = (supplier.gst_list || []).find(g => g.is_verified && g.pan_number);
        const existingPan = existingGst?.pan_number || supplier.pan_number;
        const isDev = process.env.NODE_ENV !== 'production';
        if (existingPan && existingPan !== newPan) {
            if (isDev || existingPan === 'AAAAA1111A') {
                console.warn(`[DEV/MOCK] Bypassing PAN validation mismatch in add_gst: GSTIN PAN (${newPan}) vs Registered PAN (${existingPan})`);
            } else {
                return res.status(400).json({
                    status: 'error',
                    message: `Not able to add. GSTIN PAN (${newPan}) does not match your registered PAN (${existingPan}).`
                });
            }
        }

        // Remove old entry for this state if exists
        supplier.gst_list = (supplier.gst_list || []).filter(
            g => g.state.toLowerCase() !== state.toLowerCase()
        );

        supplier.gst_list.push({
            gst_number: formattedGstin,
            pan_number: newPan,
            state: state,
            is_verified: true
        });

        await supplier.save();

        return res.status(200).json({
            status: 'success',
            message: 'GST number verified and added successfully.',
            supplier: {
                id: supplier._id.toString(),
                company_name: supplier.company_name,
                email: supplier.email,
                phone: supplier.phone,
                phone_code: supplier.phone_code,
                status: supplier.status,
                rejection_reason: supplier.rejection_reason || null,
                is_verified: supplier.is_verified,
                office_location: supplier.office_location,
                office_locations: supplier.office_locations || [],
                states: supplier.states || [],
                gst_list: supplier.gst_list || [],
                supply_districts: supplier.supply_districts,
            }
        });
    } catch (err) {
        console.error('add_gst error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

exports.update_office_location = async (req, res) => {
    try {
        const supplierId = req.supplier.id;
        const { officeId } = req.params;
        const { address, lat, lng, state } = req.body;

        if (!address) {
            return res.status(400).json({ status: 'error', message: 'Office address is required.' });
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found.' });
        }

        const office = supplier.office_locations.id(officeId);
        if (!office) {
            return res.status(404).json({ status: 'error', message: 'Office location not found.' });
        }

        // Check if the updated location is still in the same state
        if (!isStateMatch(office.state, state, address)) {
            return res.status(400).json({
                status: 'error',
                message: `Office location was in "${office.state}", but the new address is in "${state || 'Unknown'}".`
            });
        }

        office.address = address;
        office.lat = lat ? parseFloat(lat) : null;
        office.lng = lng ? parseFloat(lng) : null;
        if (state) office.state = state;

        await supplier.save();

        return res.status(200).json({
            status: 'success',
            message: 'Office location updated successfully.',
            data: supplier.office_locations
        });
    } catch (err) {
        console.error('update_office_location error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

exports.update_profile = async (req, res) => {
    try {
        const supplierId = req.supplier.id;
        const { brand_name, brand_logo } = req.body;

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found.' });
        }

        if (brand_name !== undefined) {
            supplier.brand_name = brand_name.trim();
        }
        if (brand_logo !== undefined) {
            supplier.brand_logo = brand_logo;
        }

        await supplier.save();

        return res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully.',
            supplier: {
                id: supplier._id.toString(),
                company_name: supplier.company_name,
                brand_name: supplier.brand_name,
                brand_logo: supplier.brand_logo,
                email: supplier.email,
                phone: supplier.phone,
                phone_code: supplier.phone_code,
                status: supplier.status,
                rejection_reason: supplier.rejection_reason || null,
                is_verified: supplier.is_verified,
                office_location: supplier.office_location,
                office_locations: supplier.office_locations || [],
                states: supplier.states || [],
                gst_list: supplier.gst_list || [],
                supply_districts: supplier.supply_districts,
            }
        });
    } catch (err) {
        console.error('update_profile error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};
