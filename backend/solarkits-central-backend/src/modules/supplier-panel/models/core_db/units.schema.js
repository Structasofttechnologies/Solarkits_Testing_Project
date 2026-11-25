const mongoose = require('mongoose');
const { core_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  deleted_at: { type: Date, default: null }
}, { collection: 'pc_units', timestamps: false });

schema.virtual('id').get(function () { return this._id; });

module.exports = core_db.model('pc_units', schema);
