const mongoose = require('mongoose');
const { supplier_db } = require('../config/databases');

const supplierSchema = new mongoose.Schema({
    // ── Core credentials ──────────────────────────────────────────────────
    email:          { type: String, required: true, lowercase: true, trim: true },
    phone:          { type: String, required: true, trim: true },
    phone_code:     { type: String, required: true, trim: true, default: '+91' },
    country:        { type: String, trim: true, default: null },
    country_id:     { type: String, trim: true, default: null },
    passcode:       { type: String, default: null },   // bcrypt-hashed 4-digit passcode

    // ── Business info ─────────────────────────────────────────────────────
    company_name:   { type: String, required: true, trim: true },
    brand_name:     { type: String, required: true, trim: true },
    brand_logo:     { type: String, default: null },
    gst_number:     { type: String, trim: true, default: null },
    pan_number:     { type: String, trim: true, default: null },

    // ── Location ──────────────────────────────────────────────────────────
    office_location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: { type: [Number], default: [0, 0] },  // [lng, lat]
        address:     { type: String, default: null }
    },
    office_locations: [{
        address: { type: String, default: null },
        state:   { type: String, default: null },
        lat:     { type: Number, default: null },
        lng:     { type: Number, default: null }
    }],
    states: [{ type: String, trim: true }],
    gst_list: [{
        gst_number: { type: String, trim: true },
        pan_number: { type: String, trim: true },
        state:      { type: String, trim: true },
        is_verified:{ type: Boolean, default: false }
    }],
    supply_districts: [{ type: String, trim: true }],   // District names / IDs supplier can serve

    // ── KYC Documents ─────────────────────────────────────────────────────
    kyc_documents: [{
        doc_type:  String,
        file_path: String,
        status:    { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
    }],

    // ── Status & approval ─────────────────────────────────────────────────
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejection_reason: { type: String, default: null },

    // ── Auth tracking ─────────────────────────────────────────────────────
    is_verified:            { type: Boolean, default: false },
    is_active:              { type: Boolean, default: true },
    is_deleted:             { type: Boolean, default: false },
    token_version:          { type: Number, default: 0 },
    failed_login_attempts:  { type: Number, default: 0 },
    last_failed_login_at:   { type: Date, default: null },

    // ── Legacy / misc ─────────────────────────────────────────────────────
    modules_access: [String],

    state_requests: [{
        state: { type: String, required: true },
        office_location: {
            address: { type: String, required: true },
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            state: { type: String, default: null }
        },
        gst: {
            gst_number: { type: String, required: true },
            pan_number: { type: String, required: true },
            state: { type: String, required: true },
            is_verified: { type: Boolean, default: true }
        },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        rejection_reason: { type: String, default: null },
        created_at: { type: Date, default: Date.now }
    }]

}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Supplier = supplier_db.model('suppliers', supplierSchema);
Supplier.collection.dropIndex('email_1').catch(() => {});
module.exports = Supplier;
