const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  delivery_order_id: { type: String, required: true, unique: true, trim: true },
  delivery_number:   { type: String, default: '' },
  order_id:          { type: String, required: true, trim: true },
  order_number:      { type: String, required: true, trim: true },
  warehouse_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', default: null },
  warehouse_code:    { type: String, default: 'MW-01' },
  customer_id:       { type: mongoose.Schema.Types.ObjectId, default: null },
  customer_name:     { type: String, required: true },
  customer_phone:    { type: String, required: true },
  customer_email:    { type: String, default: '' },
  destination: {
    address:         { type: String, required: true },
    state:           { type: String, required: true },
    district:        { type: String, required: true },
    pincode:         { type: String, required: true },
    landmark:        { type: String, default: '' }
  },
  required_vehicle:   { type: String, default: 'Tata Ace (1.5 Ton)' },
  order_date:        { type: Date, default: Date.now },
  num_kits:          { type: Number, default: 1 },
  system_capacity:   { type: String, default: '' },
  solarkit_model:    { type: String, default: '' },
  items: [{
    sku:             { type: String, required: true },
    product_name:    { type: String, required: true },
    category:        { type: String, default: 'BOS Kit' },
    ordered_qty:     { type: Number, required: true, min: 1 },
    received_qty:    { type: Number, default: 0 },
    pending_qty:     { type: Number, required: true },
    available_inventory_stock: { type: Number, default: 0 },
    allocated_stock: { type: Number, default: 0 },
    rack_location:   { type: String, default: '' },
    qc_status:       { type: String, default: 'Passed' },
    sourcing_type:   { type: String, enum: ['warehouse_inventory', 'supplier_procurement'], default: 'supplier_procurement' },
    supply_fulfilment_method: { type: String, enum: ['company_pickup', 'supplier_delivery', 'warehouse_stock'], default: 'supplier_delivery' },
    supplier_name:   { type: String, default: '' },
    supplier_id:     { type: String, default: '' },
    supplier_warehouse: {
      name:           { type: String, default: '' },
      address:        { type: String, default: '' },
      city:           { type: String, default: '' },
      state:          { type: String, default: '' },
      pincode:        { type: String, default: '' },
      contact_person: { type: String, default: '' },
      phone:          { type: String, default: '' }
    },
    pi_reference: {
      pi_number:      { type: String, default: '' },
      pi_date:        { type: Date, default: null },
      pi_value:       { type: Number, default: 0 }
    },
    transport_responsibility: { type: String, enum: ['company', 'supplier', 'third_party'], default: 'supplier' },
    transport_cost:  { type: Number, default: 0 },
    expected_pickup_date:    { type: Date, default: null },
    actual_pickup_date:      { type: Date, default: null },
    expected_dispatch_date:  { type: Date, default: null },
    actual_dispatch_date:    { type: Date, default: null },
    expected_inward_date:    { type: Date, default: null },
    actual_inward_date:      { type: Date, default: null },
    supplier_dispatch_reference: { type: String, default: '' },
    supply_status:   {
      type: String,
      enum: ['pending', 'ready_for_pickup', 'picked_up', 'dispatched', 'in_transit', 'inward_completed', 'inward_discrepancy'],
      default: 'pending'
    },
    damaged_qty:     { type: Number, default: 0 },
    missing_qty:     { type: Number, default: 0 }
  }],
  epcs: [{
    epc_id:          { type: String, required: true },
    epc_name:        { type: String, required: true },
    contact_person:  { type: String, default: '' },
    phone:           { type: String, default: '' },
    email:           { type: String, default: '' },
    destination: {
      address:       { type: String, default: '' },
      district:      { type: String, default: '' },
      state:         { type: String, default: '' },
      pincode:       { type: String, default: '' }
    },
    payment_first_half: {
      status:        { type: String, enum: ['done', 'pending'], default: 'done' },
      percentage:    { type: Number, default: 50 },
      amount:        { type: Number, default: 0 },
      paid_at:       { type: Date, default: Date.now },
      verified_by:   { type: String, default: 'Account Manager' }
    },
    payment_second_half: {
      status:        { type: String, enum: ['done', 'pending'], default: 'pending' },
      percentage:    { type: Number, default: 50 },
      amount:        { type: Number, default: 0 },
      paid_at:       { type: Date, default: null },
      verified_by:   { type: String, default: '' }
    },
    solarkit_model:  { type: String, default: '' },
    system_capacity: { type: String, default: '' },
    panels_qty:      { type: String, default: '' },
    inverter_qty:    { type: String, default: '' },
    boskit_qty:      { type: String, default: '' },
    structure_qty:   { type: String, default: '' },
    share_percentage:{ type: Number, default: 100 },
    items: [{
      sku:           { type: String, default: 'SKU-GEN' },
      product_name:  { type: String, default: 'SolarKit Component' },
      category:      { type: String, default: 'SolarKit' },
      ordered_qty:   { type: Number, default: 1 },
      received_qty:  { type: Number, default: 0 },
      pending_qty:   { type: Number, default: 0 },
      rack_location: { type: String, default: '' }
    }],
    is_removed_by_account: { type: Boolean, default: false },
    removed_at:      { type: Date, default: null },
    removal_reason:  { type: String, default: '' },
    dispatch_status: { type: String, default: 'pending' },
    tracking_consignment_id: { type: String, default: '' }
  }],
  is_ungrouped:      { type: Boolean, default: false },
  sent_for_delivery_at: { type: Date, default: null },
  sent_for_delivery_by: { type: String, default: '' },
  inward_history: [{
    batch_id:        { type: String, default: '' },
    inwarded_items:  [{
      sku:          { type: String },
      product_name: { type: String },
      qty:          { type: Number }
    }],
    inward_type:     { type: String, default: 'warehouse' },
    inward_mode:     { type: String, default: 'manual' },
    scanned_serials: [{
      sku:          { type: String },
      serial_code:  { type: String },
      scanned_at:   { type: Date, default: Date.now }
    }],
    inwarded_by_name:{ type: String, default: 'Delivery Manager' },
    timestamp:       { type: Date, default: Date.now },
    remarks:         { type: String, default: '' }
  }],
  inward_type: { type: String, default: 'warehouse' },
  pickup_location_details: {
    location_name: { type: String, default: '' },
    address: { type: String, default: '' },
    contact_person: { type: String, default: '' },
    contact_phone: { type: String, default: '' }
  },
  scanned_serials: [{
    sku: { type: String },
    serial_code: { type: String },
    inwarded_at: { type: Date, default: Date.now },
    verified_for_outward: { type: Boolean, default: false },
    outwarded_at: { type: Date, default: null }
  }],
  delivery_status: {
    type: String,
    enum: [
      'confirmed_procurement',
      'new_order',
      'partially_inwarded',
      'inward_completed',
      'inward_done',
      'ready_for_dispatch',
      'awaiting_eway_bill',
      'ready_to_initiate',
      'in_transit',
      'delivered',
      'delivery_exception'
    ],
    default: 'new_order'
  },
  delivery_method: { type: String, enum: ['manual', 'auto'], default: 'manual' },
  sla_days: { type: Number, default: 2 },
  incoming_truck_group: {
    group_id:                 { type: String, default: '' },
    group_name:               { type: String, default: '' },
    vehicle_number:           { type: String, default: '' },
    vehicle_type:             { type: String, default: '' },
    transporter_name:         { type: String, default: '' },
    driver_name:              { type: String, default: '' },
    driver_mobile:            { type: String, default: '' },
    lr_number:                { type: String, default: '' },
    total_epc_orders_in_truck:{ type: Number, default: 1 },
    unloaded_dock:            { type: String, default: 'Receiving Dock #1' },
    is_claimed:               { type: Boolean, default: false },
    claimed_at:               { type: Date, default: null },
    claimed_by_name:          { type: String, default: '' }
  },
  transport_details: {
    vehicle_number:         { type: String, default: '' },
    vehicle_type:           { type: String, default: '' },
    transporter_name:       { type: String, default: '' },
    transporter_id:         { type: String, default: '' },
    driver_name:            { type: String, default: '' },
    driver_mobile:          { type: String, default: '' },
    dispatch_date:          { type: Date, default: null },
    expected_delivery_date: { type: Date, default: null },
    docket_number:          { type: String, default: '' },
    lr_number:              { type: String, default: '' },
    notes:                  { type: String, default: '' }
  },
  eway_bill: {
    requested:        { type: Boolean, default: false },
    requested_at:     { type: Date, default: null },
    requested_by_name:{ type: String, default: '' },
    status:           { type: String, enum: ['not_requested', 'pending', 'generated', 'rejected'], default: 'not_requested' },
    eway_bill_number: { type: String, default: '' },
    valid_until:      { type: Date, default: null },
    eway_bill_pdf:    { type: String, default: '' },
    verified_at:      { type: Date, default: null }
  },
  dispatch_evidence: {
    vehicle_rear_photo: { type: String, default: '' },
    docket_doc:         { type: String, default: '' },
    dispatched_at:      { type: Date, default: null },
    dispatched_by_name: { type: String, default: '' }
  },
  delivery_completion: {
    completed_at:        { type: Date, default: null },
    completed_by_name:   { type: String, default: '' },
    method:              { type: String, enum: ['manual_photo', 'auto_otp'], default: 'manual_photo' },
    destination_photo:   { type: String, default: '' },
    remarks:             { type: String, default: '' },
    receiver_name:       { type: String, default: '' },
    otp_code:            { type: String, default: '' },
    otp_generated_at:    { type: Date, default: null },
    otp_verified:        { type: Boolean, default: false },
    failed_otp_attempts: { type: Number, default: 0 }
  },
  kit_preparation_status: {
    type: String,
    enum: ['not_required', 'awaiting_components', 'ready_for_assembly', 'in_assembly', 'kit_ready'],
    default: 'ready_for_assembly'
  },
  kit_assembly_details: {
    picked_at:           { type: Date, default: null },
    picked_by:           { type: String, default: '' },
    assembly_status:     { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    assembled_at:        { type: Date, default: null },
    assembled_by:        { type: String, default: '' },
    qc_status:           { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
    qc_verified:         { type: Boolean, default: false },
    qc_verified_by:      { type: String, default: '' },
    packed_and_labeled:  { type: Boolean, default: false },
    packed_at:           { type: Date, default: null },
    kit_serial_barcode:  { type: String, default: '' }
  },
  discrepancy_details: [{
    sku:                { type: String },
    product_name:       { type: String },
    expected_qty:       { type: Number },
    received_qty:       { type: Number },
    damaged_qty:        { type: Number, default: 0 },
    missing_qty:        { type: Number, default: 0 },
    remarks:            { type: String, default: '' },
    reported_at:        { type: Date, default: Date.now },
    reported_by:        { type: String, default: 'Delivery Manager' },
    accounts_notified:  { type: Boolean, default: true }
  }],
  audit_trail: [{
    action:             { type: String, required: true },
    performed_by_name:  { type: String, default: 'Delivery Manager' },
    timestamp:          { type: Date, default: Date.now },
    notes:              { type: String, default: '' }
  }],
  procurement_requested:      { type: Boolean, default: false },
  procurement_request_number: { type: String, default: '' },
  procurement_details:        { type: mongoose.Schema.Types.Mixed, default: null },
  // PO Allocation Origin Linkage (for PO Drawdowns / Loose Kit Orders placed under Parent PO)
  po_origin: {
    is_po_drawdown:   { type: Boolean, default: false },
    parent_po_id:     { type: mongoose.Schema.Types.ObjectId, default: null },
    parent_po_number: { type: String, default: null },
    epc_id:           { type: mongoose.Schema.Types.ObjectId, default: null },
    epc_name:         { type: String, default: null },
    epc_company:      { type: String, default: null },
  }
}, {
  collection: 'delivery_orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('warehouse_delivery_orders', schema, 'delivery_orders');
