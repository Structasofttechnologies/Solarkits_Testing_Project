const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 250 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  category: {
    type: String,
    enum: ['configuration', 'orders', 'payments', 'inventory', 'service_tickets', 'system', 'general', 'epc', 'bde', 'leads'],
    default: 'general',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  action_url: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  is_read: { type: Boolean, default: false, index: true },
  read_at: { type: Date, default: null },
  deleted_at: { type: Date, default: null, index: true },
}, {
  collection: 'admin_notifications',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('admin_notifications', schema);
