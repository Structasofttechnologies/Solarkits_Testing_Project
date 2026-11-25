const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

// geolocation_level_3 = Districts (Urban Cities)
const schema = new mongoose.Schema({
    name:      { type: String, required: true, trim: true, maxlength: 100 },
    level_2:   { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', required: true },
    deleted_at:{ type: Date, default: null },
    created_at:{ type: Date, default: Date.now },
}, {
    collection: 'geolocation_level_3',
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });
module.exports = geolocation_db.model('geolocation_level_3', schema);
