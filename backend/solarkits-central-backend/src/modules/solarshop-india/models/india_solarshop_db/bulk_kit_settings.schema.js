const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const bulkTierSchema = new mongoose.Schema(
    {
        quantity: { type: Number, required: true, min: 1 },
        margin: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const schema = new mongoose.Schema(
    {
        country_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        state_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        cluster_id: { type: mongoose.Schema.Types.ObjectId, default: null },
        warehouse_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        combo_kit_id: { type: mongoose.Schema.Types.ObjectId, required: true },

        is_bulk_enabled: { type: Boolean, default: false },
        kits_per_bulk: { type: Number, default: null },
        apply_to_variants: { type: Boolean, default: false },

        bulk_tiers: { type: [bulkTierSchema], default: [] },
        allowed_quantities: { type: [Number], default: [] },

        is_active: { type: Boolean, default: true },
        deleted_at: { type: Date, default: null },
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now },
    },
    {
        collection: 'bulk_kit_settings',
        timestamps: false,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('bulk_kit_settings', schema);
