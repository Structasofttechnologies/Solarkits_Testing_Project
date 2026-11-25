const mongoose = require('mongoose');
const { supplier_db } = require('../../config/databases');

const supplierSchema = new mongoose.Schema({
    email:          { type: String, required: true, lowercase: true, trim: true },
    phone:          { type: String, required: true, trim: true },
    phone_code:     { type: String, required: true, trim: true, default: '+91' },
    country:        { type: String, trim: true, default: null },
    country_id:     { type: String, trim: true, default: null },
    passcode:       { type: String, default: null },
    company_name:   { type: String, required: true, trim: true },
    brand_name:     { type: String, required: true, trim: true },
    brand_logo:     { type: String, default: null },
    gst_number:     { type: String, trim: true, default: null },
    pan_number:     { type: String, trim: true, default: null },
    states:         [{ type: String, trim: true }],
    is_verified:    { type: Boolean, default: false },
    is_active:      { type: Boolean, default: true },
    is_deleted:     { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Supplier = supplier_db.model('suppliers', supplierSchema);
module.exports = Supplier;
