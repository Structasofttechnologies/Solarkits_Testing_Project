const mongoose = require('mongoose');
const Supplier = require('../models/supplier_db/supplier.schema');
const SupplierWarehouse = require('../models/supplier_db/supplier_warehouse.schema');
const GeoLevel2 = require('../models/geolocation_db/geolocation_level_2.schema');
const { send_mail } = require('../utils/nodemailer');

const resolveStateNames = async (suppliers) => {
    const GeoLevel1 = require('../models/geolocation_db/geolocation_level_1.schema');

    // Collect all state IDs from suppliers
    const allStateIds = new Set();
    suppliers.forEach(s => {
        if (s.states) {
            s.states.forEach(st => {
                if (mongoose.Types.ObjectId.isValid(st)) allStateIds.add(st.toString());
            });
        }
        if (s.state_requests) {
            s.state_requests.forEach(sr => {
                if (mongoose.Types.ObjectId.isValid(sr.state)) allStateIds.add(sr.state.toString());
                if (sr.office_location && mongoose.Types.ObjectId.isValid(sr.office_location.state)) {
                    allStateIds.add(sr.office_location.state.toString());
                }
                if (sr.gst && mongoose.Types.ObjectId.isValid(sr.gst.state)) {
                    allStateIds.add(sr.gst.state.toString());
                }
            });
        }
        if (s.gst_list) {
            s.gst_list.forEach(g => {
                if (mongoose.Types.ObjectId.isValid(g.state)) allStateIds.add(g.state.toString());
            });
        }
        if (s.office_locations) {
            s.office_locations.forEach(ol => {
                if (mongoose.Types.ObjectId.isValid(ol.state)) allStateIds.add(ol.state.toString());
            });
        }
        if (s.warehouses) {
            s.warehouses.forEach(wh => {
                if (wh && wh.state && mongoose.Types.ObjectId.isValid(wh.state)) {
                    allStateIds.add(wh.state.toString());
                }
            });
        }
    });

    let stateMap = {};
    if (allStateIds.size > 0) {
        const statesList = await GeoLevel1.find({ _id: { $in: Array.from(allStateIds) } }).select('name').lean();
        stateMap = Object.fromEntries(statesList.map(st => [st._id.toString(), st.name]));
    }

    // Replace state IDs with state names
    suppliers.forEach(s => {
        if (s.states) {
            s.states = s.states.map(st => stateMap[st.toString()] || st);
        }
        if (s.state_requests) {
            s.state_requests.forEach(sr => {
                if (sr.state) sr.state = stateMap[sr.state.toString()] || sr.state;
                if (sr.office_location && sr.office_location.state) {
                    sr.office_location.state = stateMap[sr.office_location.state.toString()] || sr.office_location.state;
                }
                if (sr.gst && sr.gst.state) {
                    sr.gst.state = stateMap[sr.gst.state.toString()] || sr.gst.state;
                }
            });
        }
        if (s.gst_list) {
            s.gst_list.forEach(g => {
                if (g.state) g.state = stateMap[g.state.toString()] || g.state;
            });
        }
        if (s.office_locations) {
            s.office_locations.forEach(ol => {
                if (ol.state) ol.state = stateMap[ol.state.toString()] || ol.state;
            });
        }
        if (s.warehouses) {
            s.warehouses.forEach(wh => {
                if (wh.state) {
                    wh.state_name = stateMap[wh.state.toString()] || wh.state;
                }
            });
        }
    });
};

// GET /admin/suppliers?status=pending&page=1&limit=20
const list_suppliers = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search = '' } = req.query;
        const filter = { is_deleted: { $ne: true } };

        if (status === 'pending_expansion') {
            filter['state_requests.status'] = 'pending';
        } else if (status === 'pending_warehouses') {
            const pendingWhs = await SupplierWarehouse.find({ approval_status: 'pending' }).distinct('supplier_id');
            filter._id = { $in: pendingWhs };
        } else if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }
        if (search) {
            filter.$or = [
                { company_name: { $regex: search, $options: 'i' } },
                { email:        { $regex: search, $options: 'i' } },
                { phone:        { $regex: search, $options: 'i' } },
            ];
        }

        const total = await Supplier.countDocuments(filter);
        const suppliers = await Supplier.find(filter)
            .sort({ created_at: -1 })
            .skip((+page - 1) * +limit)
            .limit(+limit)
            .lean();

        const supplierIds = suppliers.map(s => s._id);
        const pendingWhs = await SupplierWarehouse.find({
            supplier_id: { $in: supplierIds },
            approval_status: 'pending'
        }).distinct('supplier_id');

        const pendingWhsSet = new Set(pendingWhs.map(id => id.toString()));
        suppliers.forEach(s => {
            s.has_pending_warehouses = pendingWhsSet.has(s._id.toString());
        });

        await resolveStateNames(suppliers);

        return res.status(200).json({
            status: 'success',
            data: suppliers,
            pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / +limit) },
        });
    } catch (err) {
        console.error('list_suppliers:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// GET /admin/suppliers/:id
const get_supplier = async (req, res) => {
    try {
        const supplier = await Supplier.findOne({ _id: req.params.id, is_deleted: { $ne: true } }).lean();
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });

        // Fetch warehouses
        const warehouses = await SupplierWarehouse.find({ supplier_id: req.params.id })
            .sort({ created_at: -1 })
            .lean();

        // Resolve supply_districts manually
        const allDistrictIds = [];
        warehouses.forEach(wh => {
            (wh.supply_districts || []).forEach(id => {
                if (id && mongoose.Types.ObjectId.isValid(id)) allDistrictIds.push(id);
            });
        });
        let districtMap = {};
        if (allDistrictIds.length > 0) {
            const districts = await GeoLevel2.find({ _id: { $in: allDistrictIds } })
                .select('name level_1')
                .lean();
            districtMap = Object.fromEntries(districts.map(d => [d._id.toString(), d]));
        }
        warehouses.forEach(wh => {
            wh.supply_districts = (wh.supply_districts || []).map(id =>
                districtMap[id?.toString()] || id
            );
        });
        const gstList = supplier.gst_list || [];
        supplier.warehouses = warehouses.map(wh => {
            const stateGst = gstList.find(g => g.state && g.state.toLowerCase() === wh.state.toLowerCase());
            return {
                ...wh,
                gst_number: stateGst?.gst_number || null,
                gst_verified: stateGst?.is_verified || false
            };
        });

        await resolveStateNames([supplier]);

        return res.status(200).json({ status: 'success', data: supplier });
    } catch (err) {
        console.error('get_supplier:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// PATCH /admin/suppliers/:id/approve
const approve_supplier = async (req, res) => {
    try {
        const supplier = await Supplier.findOne({ _id: req.params.id, is_deleted: { $ne: true } });
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });

        supplier.status = 'approved';
        supplier.rejection_reason = null;
        await supplier.save();

        const activationLink = `http://localhost:5181/auth/activate-account?email=${encodeURIComponent(supplier.email)}`;
        try {
            await send_mail(
                supplier.email,
                'SolarKits Supplier Account Approved',
                `
                <div style="font-family: Arial, sans-serif; padding: 32px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px;">
                  <h2 style="color: #f97316;">Congratulations, ${supplier.company_name}!</h2>
                  <p style="font-size: 16px; color: #374151; line-height: 1.5;">Your application for the SolarKits Supplier Ecosystem has been approved.</p>
                  <p style="font-size: 16px; color: #374151; line-height: 1.5;">To get started, please activate your account by verifying your email and setting up your secure passcode.</p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${activationLink}" style="background-color: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Activate Your Account</a>
                  </div>
                  <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">If the button doesn't work, copy and paste this URL into your browser:</p>
                  <p style="font-size: 13px; color: #2563eb; word-break: break-all;">${activationLink}</p>
                  <hr style="margin: 24px 0; border: 0; border-top: 1px solid #e5e7eb;" />
                  <p style="font-size: 11px; color: #9ca3af; text-align: center;">SolarKits Solar Ecosystem — Supplier Portal</p>
                </div>
                `
            );
        } catch (mailErr) {
            console.error('Failed to send approval email:', mailErr);
        }

        return res.status(200).json({ status: 'success', message: 'Supplier approved successfully.', data: supplier });
    } catch (err) {
        console.error('approve_supplier:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// PATCH /admin/suppliers/:id/reject
const reject_supplier = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ status: 'error', message: 'Rejection reason is required.' });

        const supplier = await Supplier.findOne({ _id: req.params.id, is_deleted: { $ne: true } });
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });

        supplier.status = 'rejected';
        supplier.rejection_reason = reason.trim();
        await supplier.save();

        return res.status(200).json({ status: 'success', message: 'Supplier rejected.', data: supplier });
    } catch (err) {
        console.error('reject_supplier:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// PATCH /admin/suppliers/:id/state-requests/:requestId/approve
const approve_state_request = async (req, res) => {
    try {
        const { id, requestId } = req.params;
        const supplier = await Supplier.findOne({ _id: id, is_deleted: { $ne: true } });
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });

        const request = (supplier.state_requests || []).find(r => r._id.toString() === requestId);
        if (!request) return res.status(404).json({ status: 'error', message: 'State request not found.' });

        if (request.status !== 'pending') {
            return res.status(400).json({ status: 'error', message: `Request is already ${request.status}.` });
        }

        // Update request status
        request.status = 'approved';
        request.rejection_reason = null;

        // Add state if not present
        if (!supplier.states.includes(request.state)) {
            supplier.states.push(request.state);
        }

        // Add office location
        supplier.office_locations.push(request.office_location);

        // Add GST (remove any unverified or existing for that state first)
        supplier.gst_list = (supplier.gst_list || []).filter(
            g => g.state.toLowerCase() !== request.state.toLowerCase()
        );
        supplier.gst_list.push(request.gst);

        await supplier.save();

        return res.status(200).json({
            status: 'success',
            message: `State "${request.state}" approved and added to supplier's active profile.`,
            data: supplier
        });
    } catch (err) {
        console.error('approve_state_request:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// PATCH /admin/suppliers/:id/state-requests/:requestId/reject
const reject_state_request = async (req, res) => {
    try {
        const { id, requestId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ status: 'error', message: 'Rejection reason is required.' });
        }

        const supplier = await Supplier.findOne({ _id: id, is_deleted: { $ne: true } });
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });

        const request = (supplier.state_requests || []).find(r => r._id.toString() === requestId);
        if (!request) return res.status(404).json({ status: 'error', message: 'State request not found.' });

        if (request.status !== 'pending') {
            return res.status(400).json({ status: 'error', message: `Request is already ${request.status}.` });
        }

        // Update request status
        request.status = 'rejected';
        request.rejection_reason = reason.trim();

        await supplier.save();

        return res.status(200).json({
            status: 'success',
            message: `State "${request.state}" request rejected.`,
            data: supplier
        });
    } catch (err) {
        console.error('reject_state_request:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// PATCH /admin/suppliers/:id/warehouses/:warehouseId/approve
const approve_warehouse = async (req, res) => {
    try {
        const { id, warehouseId } = req.params;
        const supplier = await Supplier.findOne({ _id: id, is_deleted: { $ne: true } });
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });

        const warehouse = await SupplierWarehouse.findOne({ _id: warehouseId, supplier_id: id });
        if (!warehouse) return res.status(404).json({ status: 'error', message: 'Warehouse not found.' });

        if (warehouse.approval_status !== 'pending') {
            return res.status(400).json({ status: 'error', message: `Warehouse is already ${warehouse.approval_status}.` });
        }

        warehouse.approval_status = 'approved';
        warehouse.rejection_reason = null;
        await warehouse.save();

        return res.status(200).json({
            status: 'success',
            message: `Warehouse "${warehouse.name}" approved successfully.`,
            data: warehouse
        });
    } catch (err) {
        console.error('approve_warehouse:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// PATCH /admin/suppliers/:id/warehouses/:warehouseId/reject
const reject_warehouse = async (req, res) => {
    try {
        const { id, warehouseId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ status: 'error', message: 'Rejection reason is required.' });
        }

        const supplier = await Supplier.findOne({ _id: id, is_deleted: { $ne: true } });
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });

        const warehouse = await SupplierWarehouse.findOne({ _id: warehouseId, supplier_id: id });
        if (!warehouse) return res.status(404).json({ status: 'error', message: 'Warehouse not found.' });

        if (warehouse.approval_status !== 'pending') {
            return res.status(400).json({ status: 'error', message: `Warehouse is already ${warehouse.approval_status}.` });
        }

        warehouse.approval_status = 'rejected';
        warehouse.rejection_reason = reason.trim();
        await warehouse.save();

        return res.status(200).json({
            status: 'success',
            message: `Warehouse "${warehouse.name}" rejected.`,
            data: warehouse
        });
    } catch (err) {
        console.error('reject_warehouse:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

const assign_warehouse_districts = async (req, res) => {
    try {
        const { id, warehouseId } = req.params;
        const { districts } = req.body;

        if (!Array.isArray(districts)) {
            return res.status(400).json({ status: 'error', message: 'Districts must be an array.' });
        }

        const supplier = await Supplier.findOne({ _id: id, is_deleted: { $ne: true } });
        if (!supplier) return res.status(404).json({ status: 'error', message: 'Supplier not found.' });

        const warehouse = await SupplierWarehouse.findOne({ _id: warehouseId, supplier_id: id });
        if (!warehouse) return res.status(404).json({ status: 'error', message: 'Warehouse not found.' });

        warehouse.supply_districts = districts;
        await warehouse.save();

        await warehouse.populate('supply_districts', 'name level_1');

        return res.status(200).json({
            status: 'success',
            message: `Districts assigned to warehouse "${warehouse.name}" successfully.`,
            data: warehouse
        });
    } catch (err) {
        console.error('assign_warehouse_districts error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

const get_active_districts = async (req, res) => {
    try {
        const { state_ids } = req.query;
        const filter = { deleted_at: null, is_active: true };

        if (state_ids) {
            const ids = state_ids.split(',').filter(Boolean);
            if (ids.length > 0) {
                filter.level_1 = { $in: ids };
            }
        }

        const rows = await GeoLevel2.find(filter, { _id: 1, name: 1, level_1: 1 })
            .sort({ name: 1 })
            .lean();

        const data = rows.map(r => ({
            id: r._id.toString(),
            name: r.name,
            state_id: r.level_1.toString()
        }));

        return res.status(200).json({ status: 'success', message: 'Districts fetched.', data });
    } catch (err) {
        console.error('get_active_districts:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

module.exports = {
    list_suppliers,
    get_supplier,
    approve_supplier,
    reject_supplier,
    approve_state_request,
    reject_state_request,
    approve_warehouse,
    reject_warehouse,
    assign_warehouse_districts,
    get_active_districts
};
