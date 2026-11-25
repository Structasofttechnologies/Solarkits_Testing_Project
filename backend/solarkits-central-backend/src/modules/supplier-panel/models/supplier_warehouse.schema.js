const mongoose = require('mongoose');
const { supplier_db } = require('../config/databases');

const supplierWarehouseSchema = new mongoose.Schema({
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'suppliers', required: true },
    unique_code: { type: String, required: true, unique: true },
    name:        { type: String, required: true, trim: true },
    address:     { type: String, required: true, trim: true },
    state:       { type: String, required: true, trim: true }, // The coverage state this warehouse belongs to
    lat:         { type: Number, default: null },
    lng:         { type: Number, default: null },
    capacity:    { type: String, default: '0%' }, // Utilization
    skus:        { type: Number, default: 0 },
    status:      { 
        type: String, 
        enum: ['Operational', 'Setting Up', 'Near Capacity'], 
        default: 'Operational' 
    },
    approval_status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejection_reason: {
        type: String,
        default: null
    },
    supply_type: {
        type: String,
        enum: ['Primary', 'Other', 'Both', null],
        default: null
    },
    supply_templates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'pc_product_templates'
    }],
    supply_brands: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'brands'
    }],
    supply_districts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'geolocation_level_2'
    }],
    is_active:   { type: Boolean, default: true }
}, { 
    collection: 'supplier_warehouses',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

module.exports = supplier_db.model('supplier_warehouses', supplierWarehouseSchema);
