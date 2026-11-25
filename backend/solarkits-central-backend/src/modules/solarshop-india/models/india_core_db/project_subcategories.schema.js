const mongoose = require('mongoose');
const { core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  category:       { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_categories', required: true },
  image:          { type: String, default: null },
  color:          { type: String, default: null },
  is_active:      { type: Boolean, default: true },
  deleted_at:     { type: Date, default: null },
}, { 
  collection: 'sys_filter_subcategories',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('sys_filter_subcategories', schema);
