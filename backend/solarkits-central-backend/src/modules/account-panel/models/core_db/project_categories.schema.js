const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true, maxlength: 250 },
  industry_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types', default: null },
  is_active:  { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
}, { collection: 'sys_filter_categories', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = db.model('sys_filter_categories', schema);
