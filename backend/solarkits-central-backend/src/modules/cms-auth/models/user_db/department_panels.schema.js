const mongoose = require('mongoose');
const { USER_DB } = require('../../config/databases');

const schema = new mongoose.Schema({
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_departments', required: true },
  panel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_panels', required: true }
}, { collection: 'department_panels', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ department_id: 1, panel_id: 1 }, { unique: true });
schema.virtual('id').get(function () { return this._id; });
module.exports = USER_DB.model('department_panels', schema);
