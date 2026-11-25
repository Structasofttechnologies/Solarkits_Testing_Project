const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  level_0: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', required: true },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null }
}, { 
  collection: 'geolocation_level_1', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });
module.exports = geolocation_db.model('geolocation_level_1', schema);
