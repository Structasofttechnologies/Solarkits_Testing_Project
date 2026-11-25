const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const piItemSchema = new mongoose.Schema({
  sku_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', default: null },
  sku_code: { type: String, required: true },
  product_name: { type: String, required: true },
  parent_sku_code: { type: String, default: null, trim: true },
  component_type: { type: String, default: null, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unit_rate: { type: Number, required: true, min: 0 },
  gst_rate: { type: Number, default: 13.8 },
  tax_amount: { type: Number, default: 0 },
  total_value: { type: Number, required: true, min: 0 }
}, { _id: true });

const schema = new mongoose.Schema({
  pi_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  customer_order_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  customer_order_number: {
    type: String,
    required: true,
    trim: true
  },
  order_group_id: {
    type: String,
    default: null,
    trim: true
  },
  bom_sku_code: {
    type: String,
    default: null,
    trim: true
  },
  component_type: {
    type: String,
    default: null,
    trim: true
  },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'suppliers',
    required: true
  },
  supplier_name: {
    type: String,
    required: true
  },
  supplier_brand: {
    type: String,
    default: null
  },
  supplier_gst: {
    type: String,
    default: null
  },
  is_oem_partner: {
    type: Boolean,
    default: false
  },
  destination_warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    required: true
  },
  destination_warehouse_name: {
    type: String,
    default: null
  },
  destination_warehouse_code: {
    type: String,
    default: null
  },

  items: [piItemSchema],
  total_pi_value: {
    type: Number,
    required: true,
    min: 0
  },

  // Benchmark Pricing & Admin Approval Flags
  is_above_benchmark: {
    type: Boolean,
    default: false
  },
  benchmark_cost: {
    type: Number,
    default: 0
  },
  benchmark_total_cost: {
    type: Number,
    default: 0
  },
  requires_admin_approval: {
    type: Boolean,
    default: false
  },

  // Stage 1: PO Approval Independent Tracking
  po_approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'returned', 'rejected', 'Draft', 'Submitted', 'Approved', 'Returned', 'Rejected'],
      default: 'pending',
      index: true
    },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    approved_by_name: { type: String, default: null },
    approved_at: { type: Date, default: null },
    rejection_reason: { type: String, default: null },
    return_reason: { type: String, default: null },
    remarks: { type: String, default: null },
    submitted_at: { type: Date, default: Date.now }
  },

  // Supply Fulfilment Method (PART 2)
  fulfilment: {
    method: {
      type: String,
      enum: ['Company Pickup', 'Supplier Delivery'],
      required: true,
      default: 'Company Pickup'
    },
    supplier_warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    supplier_warehouse_address: {
      type: String,
      default: null
    },
    destination_warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    transport_responsibility: {
      type: String,
      enum: ['Company', 'Supplier', 'Third-party'],
      default: 'Company'
    },
    transport_cost: {
      type: Number,
      default: 0
    },
    expected_pickup_date: {
      type: Date,
      default: null
    },
    expected_dispatch_date: {
      type: Date,
      default: null
    },
    expected_inward_date: {
      type: Date,
      default: null
    },
    actual_pickup_date: {
      type: Date,
      default: null
    },
    actual_dispatch_date: {
      type: Date,
      default: null
    },
    actual_inward_date: {
      type: Date,
      default: null
    },
    vehicle_details: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    carrier_name: {
      type: String,
      default: null
    },
    tracking_reference: {
      type: String,
      default: null
    },
    dispatch_reference: {
      type: String,
      default: null
    },
    supply_status: {
      type: String,
      enum: ['Pending', 'Ready for Pickup', 'Picked Up', 'Dispatched', 'In Transit', 'Inward Completed'],
      default: 'Pending'
    }
  },

  // Supplier Payment Terms & Lifecycle (PART 1.6 & PART 3)
  payment: {
    payment_terms: {
      type: String,
      default: '30% Advance, 70% Before Dispatch'
    },
    advance_percentage: {
      type: Number,
      default: 30
    },
    advance_amount: {
      type: Number,
      default: 0
    },
    balance_percentage: {
      type: Number,
      default: 70
    },
    balance_amount: {
      type: Number,
      default: 0
    },
    total_paid_amount: {
      type: Number,
      default: 0
    },
    balance_due: {
      type: Number,
      default: 0
    },
    production_tat_days: {
      type: Number,
      default: 5
    },
    supply_tat_days: {
      type: Number,
      default: 3
    },
    payment_status: {
      type: String,
      enum: [
        'PI Draft',
        'PI Submitted',
        'Payment Initiated',
        'Awaiting Admin Approval',
        'Advance Requested',
        'Balance Requested',
        'Approved',
        'Payment Processing',
        'Advance Paid',
        'Balance Due',
        'Partially Paid',
        'Paid',
        'Rejected / Returned',
        'Payment Failed'
      ],
      default: 'PI Draft'
    },
    admin_approval: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'returned', 'rejected', 'Awaiting Admin Approval', 'Approved', 'Returned', 'Rejected'],
        default: 'pending'
      },
      approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cms_users',
        default: null
      },
      approved_at: {
        type: Date,
        default: null
      },
      remarks: {
        type: String,
        default: null
      }
    },
    // Stage 2: Supplier First Payment (Advance) Approval
    advance_approval: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'returned', 'rejected', 'Awaiting Admin Approval', 'Approved', 'Returned', 'Rejected', null],
        default: null,
        index: true
      },
      requested_at: { type: Date, default: null },
      requested_amount: { type: Number, default: 0 },
      approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      approved_by_name: { type: String, default: null },
      approved_at: { type: Date, default: null },
      rejection_reason: { type: String, default: null },
      remarks: { type: String, default: null }
    },
    // Stage 3: Supplier Second Payment (Balance) Approval
    balance_approval: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'returned', 'rejected', 'Awaiting Admin Approval', 'Approved', 'Returned', 'Rejected', null],
        default: null,
        index: true
      },
      requested_at: { type: Date, default: null },
      requested_amount: { type: Number, default: 0 },
      approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      approved_by_name: { type: String, default: null },
      approved_at: { type: Date, default: null },
      rejection_reason: { type: String, default: null },
      return_reason: { type: String, default: null },
      remarks: { type: String, default: null }
    },
    advance_payment: {
      utr_number: { type: String, default: null, trim: true },
      paid_amount: { type: Number, default: 0 },
      payment_date: { type: Date, default: null },
      payment_mode: { type: String, default: null },
      receipt_url: { type: String, default: null },
      remarks: { type: String, default: null },
      recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      recorded_at: { type: Date, default: null }
    },
    balance_payment: {
      utr_number: { type: String, default: null, trim: true },
      paid_amount: { type: Number, default: 0 },
      payment_date: { type: Date, default: null },
      payment_mode: { type: String, default: null },
      receipt_url: { type: String, default: null },
      remarks: { type: String, default: null },
      recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      recorded_at: { type: Date, default: null }
    },
    payment_history: [{
      milestone: { type: String, default: 'advance' },
      utr_number: { type: String, trim: true },
      paid_amount: { type: Number, default: 0 },
      payment_date: { type: Date, default: Date.now },
      payment_mode: { type: String, default: 'RTGS' },
      receipt_url: { type: String, default: null },
      remarks: { type: String, default: null },
      recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      recorded_at: { type: Date, default: Date.now }
    }],
    actual_payment: {
      utr_number: { type: String, default: null, trim: true },
      paid_amount: { type: Number, default: 0 },
      payment_date: { type: Date, default: null },
      payment_mode: { type: String, default: null },
      receipt_url: { type: String, default: null }
    }
  },

  pi_status: {
    type: String,
    enum: [
      'Draft',
      'Submitted',
      'Pending Admin Price Approval',
      'Approved',
      'In Production',
      'Ready for Inward',
      'Completed',
      'Cancelled'
    ],
    default: 'Draft'
  },

  audit_history: [{
    action: { type: String, required: true },
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    performer_name: { type: String, default: 'System' },
    role: { type: String, default: 'Accounts' },
    timestamp: { type: Date, default: Date.now },
    remarks: { type: String, default: null }
  }],

  created_by: {
    user_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, default: 'Account User' },
    email: { type: String, default: null },
    role: { type: String, default: 'Accounts' }
  }
}, {
  collection: 'purchase_indents',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('purchase_indents', schema);
