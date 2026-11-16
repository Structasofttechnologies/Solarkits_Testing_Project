const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  vendor_code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // e.g. 3PL-VND-001
  company_name: { type: String, required: true, trim: true },
  vendor_type: { 
    type: String, 
    enum: ['proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited', 'other'], 
    required: true,
    default: 'private_limited'
  },
  contact_person: {
    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true, default: 'Logistics Manager' },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    phone_code: { type: String, default: '+91', trim: true }
  },
  gstin: { type: String, uppercase: true, trim: true, default: null },
  pan_number: { type: String, uppercase: true, trim: true, default: null },
  registered_address: {
    address_line: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  bank_details: {
    account_name: { type: String, trim: true, default: null },
    account_number: { type: String, trim: true, default: null },
    bank_name: { type: String, trim: true, default: null },
    ifsc_code: { type: String, uppercase: true, trim: true, default: null },
    branch: { type: String, trim: true, default: null }
  },
  documents: {
    gst_certificate: { 
      url: { type: String, default: null }, 
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }, 
      verified_at: { type: Date, default: null },
      rejection_reason: { type: String, default: null }
    },
    pan_document: { 
      url: { type: String, default: null }, 
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }, 
      verified_at: { type: Date, default: null },
      rejection_reason: { type: String, default: null }
    },
    business_registration: { 
      url: { type: String, default: null }, 
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }, 
      verified_at: { type: Date, default: null },
      rejection_reason: { type: String, default: null }
    },
    bank_proof: { 
      url: { type: String, default: null }, 
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }, 
      verified_at: { type: Date, default: null },
      rejection_reason: { type: String, default: null }
    },
    service_agreement: { 
      url: { type: String, default: null }, 
      agreement_no: { type: String, default: null }, 
      valid_from: { type: Date, default: null }, 
      valid_to: { type: Date, default: null }, 
      status: { type: String, enum: ['draft', 'approved', 'rejected', 'expired'], default: 'draft' } 
    }
  },
  service_regions: [{
    state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_geolocation_level_1', default: null },
    state_name: { type: String, default: null },
    districts: [{ type: String }]
  }],
  status: { 
    type: String, 
    enum: ['draft', 'pending_verification', 'approved', 'rejected', 'inactive'], 
    default: 'draft' 
  },
  verification_remarks: { type: String, default: null },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null }
}, {
  collection: 'logistics_3pl_vendors',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('logistics_3pl_vendors', schema);
