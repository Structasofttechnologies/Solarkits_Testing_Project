const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null, trim: true },
  video_url: { type: String, required: true, trim: true },
  thumbnail_url: { type: String, default: null, trim: true },
  
  // Category / Module (flexible so admin can add new modules dynamically)
  category: { 
    type: String, 
    trim: true,
    default: 'how_to_use' 
  },
  category_name: { type: String, trim: true, default: 'How to Use / General' },

  // Target Audience
  target_audience: { 
    type: String, 
    enum: ['all', 'epc', 'franchisee'], 
    default: 'all' 
  },

  // Regional & Kit Filters (aligns with platform flows)
  kit_type: { type: String, default: 'All Kits' },
  state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
  state_name: { type: String, default: 'All States' },
  district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
  district_name: { type: String, default: 'All Districts' },

  tags: [{ type: String, trim: true }],
  duration_label: { type: String, default: '3:00 mins' },
  display_order: { type: Number, default: 0 },
  is_published: { type: Boolean, default: true },

  created_by: { type: String, default: 'Admin' },
  deleted_at: { type: Date, default: null }
}, {
  collection: 'knowledge_center_videos',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('headline').get(function() {
  return this.title;
});
schema.virtual('duration').get(function() {
  return this.duration_label;
});

schema.index({ target_audience: 1, category: 1, is_published: 1 });
schema.index({ state_name: 1, kit_type: 1 });

module.exports = india_solarshop_db.model('KnowledgeCenterVideo', schema);
