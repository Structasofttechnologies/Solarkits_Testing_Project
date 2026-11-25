const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * Sub-schema for individual milestone breakdown.
 */
const milestoneStageSchema = new mongoose.Schema({
  milestone_number: { type: Number, required: true },
  milestone_name:   { type: String, required: true },
  percentage:       { type: Number, required: true, min: 1, max: 100 },
  stage_trigger:    { type: String, enum: ['order_placement', 'before_dispatch', 'on_delivery', 'custom'], default: 'order_placement' },
  tat_hours:        { type: Number, default: 24 },
  tat_days:         { type: Number, default: 1 },
  description:      { type: String, default: null },
}, { _id: false });

/**
 * Sub-schema for configurable order lifecycle stages & TATs.
 */
const orderStageConfigSchema = new mongoose.Schema({
  stage_key:        { type: String, required: true },
  stage_name:       { type: String, required: true },
  sequence:         { type: Number, default: 1 },
  tat_hours:        { type: Number, default: 24 },
  tat_days:         { type: Number, default: 1 },
  tat_description:  { type: String, default: null },
  payment_required: { type: Boolean, default: false }, // true for stages requiring milestone payment before progression
}, { _id: false });

/**
 * product_payment_milestones — Admin-configured product/ComboKit payment milestones for EPC orders.
 *
 * Collection: product_payment_milestones
 */
const schema = new mongoose.Schema({
  kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_combo_kits',
    default: null, // null means global default rule for all products
  },
  kit_name: {
    type: String,
    default: 'Global Default (All ComboKits)',
    trim: true,
  },
  is_default: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  milestones: {
    type: [milestoneStageSchema],
    default: () => [
      {
        milestone_number: 1,
        milestone_name: 'Advance Payment at Order Placement',
        percentage: 30,
        stage_trigger: 'order_placement',
        tat_hours: 24,
        tat_days: 1,
        description: 'Advance payment collected at checkout to confirm order and initiate procurement.',
      },
      {
        milestone_number: 2,
        milestone_name: 'Remaining Payment Before Dispatch',
        percentage: 70,
        stage_trigger: 'before_dispatch',
        tat_hours: 48,
        tat_days: 2,
        description: 'Remaining balance payment collected when goods are packed and staged before dispatch.',
      },
    ],
  },
  order_stages_config: {
    type: [orderStageConfigSchema],
    default: () => [
      { stage_key: 'CONFIRMED',          stage_name: 'Confirmed (Payment Verified)', sequence: 1, tat_hours: 24,  tat_days: 1, tat_description: 'Advance Payment Verified by Accounts', payment_required: false },
      { stage_key: 'PROCESSING',         stage_name: 'Processing (Picking & Packing)', sequence: 2, tat_hours: 48,  tat_days: 2, tat_description: 'Warehouse BOM picking & packing', payment_required: false },
      { stage_key: 'VEHICLE_ASSIGNED',   stage_name: 'Vehicle Assigned', sequence: 3, tat_hours: 24,  tat_days: 1, tat_description: 'Vehicle & driver allocated to route', payment_required: false },
      { stage_key: 'READY_FOR_DISPATCH', stage_name: 'Ready for Dispatch / Before Dispatch', sequence: 4, tat_hours: 48,  tat_days: 2, tat_description: 'Staged at gate; 70% Remaining Payment verified before release', payment_required: true },
      { stage_key: 'DISPATCHED',         stage_name: 'Dispatched', sequence: 5, tat_hours: 12,  tat_days: 1, tat_description: 'Vehicle gate exit from warehouse', payment_required: false },
      { stage_key: 'IN_TRANSIT',         stage_name: 'In Transit', sequence: 6, tat_hours: 72,  tat_days: 3, tat_description: 'Carrier movement to destination', payment_required: false },
      { stage_key: 'REACHED_DESTINATION',stage_name: 'Reached Destination', sequence: 7, tat_hours: 12,  tat_days: 1, tat_description: 'Arrived at delivery location', payment_required: false },
      { stage_key: 'DELIVERED',          stage_name: 'Delivered', sequence: 8, tat_hours: 6,   tat_days: 1, tat_description: 'Sign-off and customer handover completed', payment_required: false },
    ],
  },
  notes: {
    type: String,
    default: null,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
}, {
  collection: 'product_payment_milestones',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ kit_id: 1 });
schema.index({ is_default: 1, is_active: 1 });

module.exports = india_solarshop_db.model('product_payment_milestones', schema);
