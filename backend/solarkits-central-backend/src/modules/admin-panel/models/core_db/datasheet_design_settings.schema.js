const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  // Appearance Configuration
  table_header_bg:       { type: String, default: '#1E3A8A' },
  table_header_text:     { type: String, default: '#FFFFFF' },
  table_bg:              { type: String, default: '#FFFFFF' },
  alternate_row_bg:      { type: String, default: '#F8FAFC' },
  text_color:            { type: String, default: '#1E293B' },
  border_color:          { type: String, default: '#E2E8F0' },
  border_thickness:      { type: String, default: '1px' },
  border_radius:         { type: String, default: '12px' },
  font_family:           { type: String, default: 'Inter' },
  font_size:             { type: String, default: '13px' },
  heading_size:          { type: String, default: '15px' },
  cell_padding:          { type: String, default: 'normal' }, // compact, normal, relaxed
  table_width:           { type: String, default: '100%' },
  section_header_bg:     { type: String, default: '#F1F5F9' },
  section_heading_style: { type: String, default: 'accent-bar' }, // bold, uppercase, pill, accent-bar

  // Layout Configuration
  column_headings: {
    component:     { type: String, default: 'Component Category' },
    specification: { type: String, default: 'Technical Specification' },
    value:         { type: String, default: 'Value / Details' }
  },
  column_visibility: {
    component:     { type: Boolean, default: true },
    specification: { type: Boolean, default: true },
    value:         { type: Boolean, default: true }
  },
  column_order:            { type: [String], default: ['component', 'specification', 'value'] },
  component_section_order: { type: [String], default: ['Solar Panel', 'Solar Inverter', 'BOS Kit'] },
  show_section_title:      { type: Boolean, default: true },
  show_product_name:       { type: Boolean, default: true },
  show_brand_name:         { type: Boolean, default: true },
  show_download_button:    { type: Boolean, default: true },

  is_active:  { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'datasheet_design_settings', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('datasheet_design_settings', schema);
