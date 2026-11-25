const mongoose = require('mongoose');
const { supplier_db } = require('../config/databases');

// OTPs stored in the supplier DB
const schema = new mongoose.Schema({
    otp:        { type: String, required: true, maxlength: 200 },
    supplier_id:{ type: mongoose.Schema.Types.ObjectId, ref: 'suppliers', required: true },
    tries:      { type: Number, required: true, default: 0 },
    purpose: {
        type: String,
        required: true,
        enum: ['verify', 'forgot_password'],
    },
    expires_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
}, {
    collection: 'supplier_otps',
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

schema.index({ purpose: 1, expires_at: -1 });
schema.virtual('id').get(function () { return this._id; });
module.exports = supplier_db.model('supplier_otps', schema);
