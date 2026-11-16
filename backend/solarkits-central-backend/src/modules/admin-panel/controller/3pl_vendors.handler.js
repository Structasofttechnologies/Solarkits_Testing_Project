const { ThirdPartyLogisticsVendor, CompanyWarehouse } = require('../models/company_warehouse_db');
const mongoose = require('mongoose');

/**
 * Auto-generates unique 3PL Vendor code: 3PL-VND-001, 3PL-VND-002, etc.
 */
async function generateVendorCode() {
  const last = await ThirdPartyLogisticsVendor.findOne({ vendor_code: /^3PL-VND-/ })
    .sort({ vendor_code: -1 })
    .lean();

  let nextNum = 1;
  if (last && last.vendor_code) {
    const parts = last.vendor_code.split('-');
    const parsed = parseInt(parts[2], 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }
  return `3PL-VND-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Register a new 3PL Vendor
 */
const register_vendor = async (req, res) => {
  try {
    const {
      company_name,
      vendor_type,
      contact_person,
      gstin,
      pan_number,
      registered_address,
      bank_details,
      documents,
      service_regions
    } = req.body;

    if (!company_name || !contact_person?.name || !contact_person?.email || !contact_person?.phone || !registered_address?.address_line) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing mandatory vendor details: Company Name, Contact Person (Name, Email, Phone), and Registered Address are required.'
      });
    }

    // Check duplicate email
    const duplicate = await ThirdPartyLogisticsVendor.findOne({
      'contact_person.email': contact_person.email.trim().toLowerCase(),
      deleted_at: null
    });
    if (duplicate) {
      return res.status(400).json({
        status: 'error',
        message: `A 3PL vendor with email '${contact_person.email}' is already registered.`
      });
    }

    const vendor_code = await generateVendorCode();

    const hasDocs = documents && (documents.gst_certificate?.url || documents.pan_document?.url || documents.service_agreement?.url);
    const initialStatus = hasDocs ? 'pending_verification' : 'draft';

    const newVendor = await ThirdPartyLogisticsVendor.create({
      vendor_code,
      company_name: company_name.trim(),
      vendor_type: vendor_type || 'private_limited',
      contact_person: {
        name: contact_person.name.trim(),
        designation: contact_person.designation?.trim() || 'Logistics Head',
        email: contact_person.email.trim().toLowerCase(),
        phone: contact_person.phone.trim(),
        phone_code: contact_person.phone_code?.trim() || '+91'
      },
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      pan_number: pan_number ? pan_number.trim().toUpperCase() : null,
      registered_address: {
        address_line: registered_address.address_line.trim(),
        state: registered_address.state?.trim() || '',
        district: registered_address.district?.trim() || '',
        pincode: registered_address.pincode?.trim() || ''
      },
      bank_details: {
        account_name: bank_details?.account_name?.trim() || (company_name ? company_name.trim() : null),
        account_number: bank_details?.account_number?.trim() || null,
        bank_name: bank_details?.bank_name?.trim() || null,
        ifsc_code: bank_details?.ifsc_code ? bank_details.ifsc_code.trim().toUpperCase() : null,
        branch: bank_details?.branch?.trim() || null
      },
      documents: documents || {},
      service_regions: service_regions || [],
      status: initialStatus
    });

    return res.status(201).json({
      status: 'success',
      message: `3PL Vendor registered successfully with code ${vendor_code}.`,
      vendor: newVendor
    });
  } catch (error) {
    console.error('Error in register_vendor:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Fetch all 3PL Vendors with summary metrics
 */
const get_vendors = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = { deleted_at: null };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { company_name: regex },
        { vendor_code: regex },
        { 'contact_person.name': regex },
        { 'contact_person.email': regex },
        { gstin: regex }
      ];
    }

    const [vendors, allVendors] = await Promise.all([
      ThirdPartyLogisticsVendor.find(filter).sort({ created_at: -1 }).lean(),
      ThirdPartyLogisticsVendor.find({ deleted_at: null }).select('_id status').lean()
    ]);

    // Attach warehouse counts per vendor
    const vendorIds = vendors.map(v => v._id);
    const warehouseCounts = await CompanyWarehouse.aggregate([
      { $match: { vendor_id: { $in: vendorIds }, deleted_at: null } },
      { $group: { _id: '$vendor_id', total_warehouses: { $sum: 1 }, active_warehouses: { $sum: { $cond: ['$is_active', 1, 0] } } } }
    ]);
    const whMap = Object.fromEntries(warehouseCounts.map(w => [w._id.toString(), w]));

    const enrichedVendors = vendors.map(v => ({
      ...v,
      id: v._id.toString(),
      total_warehouses: whMap[v._id.toString()]?.total_warehouses || 0,
      active_warehouses: whMap[v._id.toString()]?.active_warehouses || 0
    }));

    const summary = {
      total: allVendors.length,
      approved: allVendors.filter(v => v.status === 'approved').length,
      pending_verification: allVendors.filter(v => v.status === 'pending_verification').length,
      rejected: allVendors.filter(v => v.status === 'rejected').length,
      draft: allVendors.filter(v => v.status === 'draft').length
    };

    return res.status(200).json({
      status: 'success',
      summary,
      vendors: enrichedVendors
    });
  } catch (error) {
    console.error('Error in get_vendors:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Fetch approved 3PL vendors for warehouse creation dropdown
 */
const get_approved_vendors = async (req, res) => {
  try {
    const vendors = await ThirdPartyLogisticsVendor.find({
      status: 'approved',
      is_active: true,
      deleted_at: null
    })
      .select('_id vendor_code company_name contact_person service_regions')
      .sort({ company_name: 1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      vendors: vendors.map(v => ({
        id: v._id.toString(),
        vendor_code: v.vendor_code,
        company_name: v.company_name,
        contact_name: v.contact_person?.name,
        contact_phone: v.contact_person?.phone,
        service_regions: v.service_regions || []
      }))
    });
  } catch (error) {
    console.error('Error in get_approved_vendors:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Get single 3PL Vendor details
 */
const get_vendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await ThirdPartyLogisticsVendor.findOne({ _id: id, deleted_at: null }).lean();
    if (!vendor) {
      return res.status(404).json({ status: 'error', message: '3PL Vendor not found.' });
    }

    const warehouses = await CompanyWarehouse.find({ vendor_id: id, deleted_at: null })
      .select('_id warehouse_name warehouse_code address pincode is_active status status_code')
      .lean();

    return res.status(200).json({
      status: 'success',
      vendor: {
        ...vendor,
        id: vendor._id.toString(),
        warehouses: warehouses.map(w => ({ ...w, id: w._id.toString() }))
      }
    });
  } catch (error) {
    console.error('Error in get_vendor:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Update 3PL Vendor Details
 */
const update_vendor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const vendor = await ThirdPartyLogisticsVendor.findOne({ _id: id, deleted_at: null });
    if (!vendor) {
      return res.status(404).json({ status: 'error', message: '3PL Vendor not found.' });
    }

    if (updates.company_name) vendor.company_name = updates.company_name.trim();
    if (updates.vendor_type) vendor.vendor_type = updates.vendor_type;
    if (updates.gstin) vendor.gstin = updates.gstin.trim().toUpperCase();
    if (updates.pan_number) vendor.pan_number = updates.pan_number.trim().toUpperCase();

    if (updates.contact_person) {
      vendor.contact_person = { ...vendor.contact_person.toObject(), ...updates.contact_person };
    }
    if (updates.registered_address) {
      vendor.registered_address = { ...vendor.registered_address.toObject(), ...updates.registered_address };
    }
    if (updates.bank_details) {
      vendor.bank_details = { ...vendor.bank_details.toObject(), ...updates.bank_details };
    }
    if (updates.documents) {
      vendor.documents = { ...vendor.documents.toObject(), ...updates.documents };
      if (vendor.status === 'draft') {
        vendor.status = 'pending_verification';
      }
    }
    if (updates.service_regions) vendor.service_regions = updates.service_regions;

    await vendor.save();

    return res.status(200).json({
      status: 'success',
      message: '3PL Vendor details updated successfully.',
      vendor
    });
  } catch (error) {
    console.error('Error in update_vendor:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Verify or Reject a specific KYC document
 */
const verify_document = async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type, status, rejection_reason } = req.body;

    const validDocTypes = ['gst_certificate', 'pan_document', 'business_registration', 'bank_proof', 'service_agreement'];
    if (!validDocTypes.includes(document_type)) {
      return res.status(400).json({ status: 'error', message: `Invalid document_type. Must be one of: ${validDocTypes.join(', ')}` });
    }

    const vendor = await ThirdPartyLogisticsVendor.findOne({ _id: id, deleted_at: null });
    if (!vendor) {
      return res.status(404).json({ status: 'error', message: '3PL Vendor not found.' });
    }

    if (!vendor.documents) vendor.documents = {};
    if (!vendor.documents[document_type]) vendor.documents[document_type] = {};

    vendor.documents[document_type].status = status;
    vendor.documents[document_type].verified_at = new Date();
    if (status === 'rejected') {
      vendor.documents[document_type].rejection_reason = rejection_reason || 'Document verification failed.';
    } else {
      vendor.documents[document_type].rejection_reason = null;
    }

    await vendor.save();

    return res.status(200).json({
      status: 'success',
      message: `Document '${document_type}' status updated to '${status}'.`,
      vendor
    });
  } catch (error) {
    console.error('Error in verify_document:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Admin Vendor Approval / Rejection
 */
const change_vendor_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['approved', 'rejected', 'inactive', 'pending_verification'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid vendor status.' });
    }

    const vendor = await ThirdPartyLogisticsVendor.findOne({ _id: id, deleted_at: null });
    if (!vendor) {
      return res.status(404).json({ status: 'error', message: '3PL Vendor not found.' });
    }

    // If approving, verify required documents
    if (status === 'approved') {
      const docs = vendor.documents || {};
      const pendingDocs = [];
      if (!docs.service_agreement?.url) pendingDocs.push('Service Agreement');
      if (pendingDocs.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Cannot approve vendor. Missing mandatory items: ${pendingDocs.join(', ')}.`
        });
      }
    }

    vendor.status = status;
    vendor.verification_remarks = remarks || null;
    vendor.verified_by = req.user?._id || req.user?.id || null;
    vendor.is_active = status === 'approved';

    await vendor.save();

    return res.status(200).json({
      status: 'success',
      message: `3PL Vendor status changed to '${status}'.`,
      vendor
    });
  } catch (error) {
    console.error('Error in change_vendor_status:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  register_vendor,
  get_vendors,
  get_approved_vendors,
  get_vendor,
  update_vendor,
  verify_document,
  change_vendor_status
};
