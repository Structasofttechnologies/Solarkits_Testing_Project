const Supplier = require('../models/supplier.schema');
const SupplierWarehouse = require('../models/supplier_warehouse.schema');
const GeoLevel1 = require('../models/geolocation_db/geolocation_level_1.schema');

const getSupplierInitials = (companyName) => {
    const clean = companyName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0] + (words[2] ? words[2][0] : '')).substring(0, 3).toUpperCase();
    }
    const alphanumericOnly = clean.replace(/\s+/g, '');
    if (alphanumericOnly.length >= 3) {
        return alphanumericOnly.substring(0, 3).toUpperCase();
    }
    return alphanumericOnly.toUpperCase().padEnd(3, 'X');
};

const getStateInitials = (stateName) => {
    const clean = stateName.replace(/[^a-zA-Z\s]/g, '').trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    if (clean.length >= 2) {
        return clean.substring(0, 2).toUpperCase();
    }
    return clean.toUpperCase().padEnd(2, 'X');
};

exports.create_warehouse = async (req, res) => {
    try {
        const { name, address, state, lat, lng } = req.body;
        const supplierId = req.supplier.id;

        if (!name || !address || !state) {
            return res.status(400).json({ status: 'error', message: 'Name, address, and state are required.' });
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found.' });
        }

        // Validate state coverage — states are stored as ObjectId strings
        const isCovered = supplier.states.some(s => s.toString() === state.toString());
        if (!isCovered) {
            return res.status(400).json({ 
                status: 'error', 
                message: `The selected state is not in your coverage states.` 
            });
        }

        // Validate GST is verified for this state (gst_list.state stores state IDs)
        const hasGst = (supplier.gst_list || []).some(
            g => g.state && g.state.toString() === state.toString() && g.is_verified
        );
        if (!hasGst) {
            return res.status(400).json({ 
                status: 'error', 
                message: `GST number is not verified for this state. Please verify it first before adding a warehouse.` 
            });
        }

        // Generate unique code
        const supInitials = getSupplierInitials(supplier.company_name);
        const stateInitials = getStateInitials(state);

        const count = await SupplierWarehouse.countDocuments({ supplier_id: supplierId });
        const index = String(count + 1).padStart(3, '0');

        let uniqueCode = `WH-${supInitials}-${stateInitials}-${index}`;

        // Double check uniqueness
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
            const existing = await SupplierWarehouse.findOne({ unique_code: uniqueCode });
            if (!existing) {
                isUnique = true;
            } else {
                attempts++;
                const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
                uniqueCode = `WH-${supInitials}-${stateInitials}-${index}-${rand}`;
            }
        }

        const newWh = new SupplierWarehouse({
            supplier_id: supplierId,
            unique_code: uniqueCode,
            name,
            address,
            state,
            lat: lat || null,
            lng: lng || null,
            approval_status: 'pending',
            rejection_reason: null,
            is_active: true
        });

        await newWh.save();

        return res.status(201).json({
            status: 'success',
            message: 'Warehouse registered successfully.',
            data: newWh
        });
    } catch (err) {
        console.error('create_warehouse error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

exports.get_warehouses = async (req, res) => {
    try {
        const supplierId = req.supplier.id;
        const warehouses = await SupplierWarehouse.find({ supplier_id: supplierId })
            .populate('supply_districts', 'name level_1')
            .sort({ created_at: -1 });

        return res.status(200).json({
            status: 'success',
            data: warehouses
        });
    } catch (err) {
        console.error('get_warehouses error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

exports.check_coverage = async (req, res) => {
    try {
        const supplierId = req.supplier.id;

        const supplier = await Supplier.findById(supplierId).lean();
        if (!supplier) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found.' });
        }

        const warehouses = await SupplierWarehouse.find({ supplier_id: supplierId }).lean();

        const stateIds = supplier.states || [];

        // Resolve state IDs to {_id, name} objects
        const stateRecords = await GeoLevel1.find({ _id: { $in: stateIds } }).select('name').lean();
        const stateMap = Object.fromEntries(stateRecords.map(s => [s._id.toString(), s.name]));

        const coverageStates = stateIds.map(id => ({
            _id: id.toString(),
            name: stateMap[id.toString()] || id.toString()
        }));

        const missingStates = coverageStates.filter(st => {
            const hasWh = warehouses.some(
                wh => wh.state && wh.state.toString() === st._id && wh.approval_status === 'approved'
            );
            return !hasWh;
        });

        return res.status(200).json({
            status: 'success',
            data: {
                has_warehouses_for_all_states: missingStates.length === 0,
                coverage_states: coverageStates,
                missing_states: missingStates,
                existing_warehouses: warehouses
            }
        });
    } catch (err) {
        console.error('check_coverage error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

exports.update_warehouse = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, state, lat, lng } = req.body;
        const supplierId = req.supplier.id;

        if (!name || !address || !state) {
            return res.status(400).json({ status: 'error', message: 'Name, address, and state are required.' });
        }

        const warehouse = await SupplierWarehouse.findOne({ _id: id, supplier_id: supplierId });
        if (!warehouse) {
            return res.status(404).json({ status: 'error', message: 'Warehouse not found or unauthorized.' });
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ status: 'error', message: 'Supplier not found.' });
        }

        // Validate state coverage — states are stored as ObjectId strings
        const isCovered = supplier.states.some(s => s.toString() === state.toString());
        if (!isCovered) {
            return res.status(400).json({ 
                status: 'error', 
                message: `The selected state is not in your coverage states.` 
            });
        }

        // Validate GST is verified for this state (gst_list.state stores state IDs)
        const hasGst = (supplier.gst_list || []).some(
            g => g.state && g.state.toString() === state.toString() && g.is_verified
        );
        if (!hasGst) {
            return res.status(400).json({ 
                status: 'error', 
                message: `GST number is not verified for this state. Please verify it first before modifying this warehouse.` 
            });
        }

        warehouse.name = name.trim();
        warehouse.address = address.trim();
        warehouse.state = state;
        warehouse.lat = lat ? parseFloat(lat) : null;
        warehouse.lng = lng ? parseFloat(lng) : null;
        warehouse.approval_status = 'pending';
        warehouse.rejection_reason = null;

        await warehouse.save();

        return res.status(200).json({
            status: 'success',
            message: 'Warehouse updated successfully.',
            data: warehouse
        });
    } catch (err) {
        console.error('update_warehouse error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};
