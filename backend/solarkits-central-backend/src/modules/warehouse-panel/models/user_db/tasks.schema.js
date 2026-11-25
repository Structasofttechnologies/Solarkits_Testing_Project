const mongoose = require('mongoose');
const { user_db } = require('../../config/databases');

// tasks — assigned_to, assigned_by SAME DB → ObjectId
const schema = new mongoose.Schema({

  title:               { type: String, required: true, trim: true },
  description:         { type: String, default: null },
  assigned_to:         { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  assigned_by:         { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  status:              { type: String, enum: ['pending','in_progress','completed','cancelled'], default: 'pending' },
  deleted_at:          { type: Date, default: null },
  created_at:          { type: Date, default: Date.now },
  updated_at:          { type: Date, default: Date.now },
}, { collection: 'tasks', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = user_db.model('tasks', schema);
