const mongoose = require('mongoose');
const {
  FranchiseeAgreement,
  FranchiseeCluster,
  Reseller,
  BDEProfile,
} = require('../models/india_solarshop_db');

/**
 * Helper to compute real-time status of agreement
 */
const evaluateAgreementStatus = (agreement) => {
  if (agreement.status === 'terminated' || agreement.status === 'renewed') {
    return agreement.status;
  }
  const now = new Date();
  const endDate = new Date(agreement.end_date);
  const alertDays = agreement.expiry_alert_days || 30;
  const alertThreshold = new Date(endDate.getTime() - alertDays * 24 * 60 * 60 * 1000);

  if (now > endDate) {
    return 'expired';
  }
  if (now >= alertThreshold) {
    return 'expiring_soon';
  }
  return 'active';
};

/**
 * 1. List All Agreements with Status Filtering
 */
exports.list_agreements = async (req, res) => {
  try {
    const { status, search, franchisee_id, cluster_id } = req.query;

    const query = { deleted_at: null };
    if (franchisee_id) query.franchisee_id = franchisee_id;
    if (cluster_id) query.cluster_id = cluster_id;

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { agreement_number: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { signer_name: { $regex: s, $options: 'i' } },
      ];
    }

    const agreements = await FranchiseeAgreement.find(query)
      .populate('franchisee_id', 'business_name mobile email store_category gst_number')
      .populate('cluster_id', 'cluster_name cluster_code state_name district_names setup_fee_config')
      .populate('assigned_bde_id', 'full_name mobile_number email bde_id')
      .sort({ created_at: -1 })
      .lean();

    // Dynamically evaluate status and filter if specific status tab is requested
    const processed = agreements.map(ag => {
      const computedStatus = evaluateAgreementStatus(ag);
      return {
        ...ag,
        computed_status: computedStatus,
      };
    });

    let filtered = processed;
    if (status && status !== 'all') {
      filtered = processed.filter(a => a.computed_status === status || a.status === status);
    }

    // Status counts for tabs
    const counts = {
      all: processed.length,
      active: processed.filter(a => a.computed_status === 'active').length,
      expiring_soon: processed.filter(a => a.computed_status === 'expiring_soon').length,
      expired: processed.filter(a => a.computed_status === 'expired').length,
      renewal_pending: processed.filter(a => a.status === 'renewal_pending').length,
      renewed: processed.filter(a => a.status === 'renewed').length,
      terminated: processed.filter(a => a.status === 'terminated').length,
    };

    return res.status(200).json({
      status: 'success',
      counts,
      data: filtered,
    });
  } catch (err) {
    console.error('Error in list_agreements:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 2. Get Single Agreement Details with Renewal History
 */
exports.get_agreement_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const agreement = await FranchiseeAgreement.findById(id)
      .populate('franchisee_id')
      .populate('cluster_id')
      .populate('assigned_bde_id')
      .populate('created_by', 'full_name email')
      .lean();

    if (!agreement || agreement.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Agreement not found.' });
    }

    const computedStatus = evaluateAgreementStatus(agreement);

    return res.status(200).json({
      status: 'success',
      data: {
        ...agreement,
        computed_status: computedStatus,
      },
    });
  } catch (err) {
    console.error('Error in get_agreement_detail:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 3. Create or Setup Agreement for a Franchisee Cluster
 */
exports.create_agreement = async (req, res) => {
  try {
    const {
      franchisee_id,
      cluster_id,
      start_date,
      end_date,
      agreement_duration_type,
      duration_months,
      document_url,
      document_name,
      setup_fee,
      renewal_fee,
      security_deposit,
      renewal_conditions,
      assigned_bde_id,
    } = req.body;

    if (!franchisee_id || !cluster_id || !start_date || !end_date) {
      return res.status(400).json({
        status: 'error',
        message: 'franchisee_id, cluster_id, start_date, and end_date are required.',
      });
    }

    const count = await FranchiseeAgreement.countDocuments();
    const currentYear = new Date().getFullYear();
    const agreement_number = `AGR-SKT-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const agreement = new FranchiseeAgreement({
      agreement_number,
      franchisee_id,
      cluster_id,
      agreement_duration_type: agreement_duration_type || '2_years',
      duration_months: duration_months || 24,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      document_url: document_url || null,
      document_name: document_name || null,
      setup_fee: setup_fee || 0,
      renewal_fee: renewal_fee || 0,
      security_deposit: security_deposit || 0,
      renewal_conditions: renewal_conditions || 'Standard renewal subject to performance metrics.',
      assigned_bde_id: assigned_bde_id || null,
      created_by: req.user?._id || null,
    });

    agreement.status = evaluateAgreementStatus(agreement);

    await agreement.save();

    // Sync cluster dates
    await FranchiseeCluster.findByIdAndUpdate(cluster_id, {
      agreement_start_date: agreement.start_date,
      agreement_expiry_date: agreement.end_date,
      assigned_franchisee_id,
      status: 'allotted',
    });

    return res.status(201).json({
      status: 'success',
      message: `Agreement "${agreement.agreement_number}" created successfully.`,
      data: agreement,
    });
  } catch (err) {
    console.error('Error in create_agreement:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 4. Renew Agreement (Preserves Historical Version)
 */
exports.renew_agreement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      new_start_date,
      new_end_date,
      renewal_fee_paid,
      payment_reference,
      remarks,
      document_url,
    } = req.body;

    const agreement = await FranchiseeAgreement.findById(id);
    if (!agreement || agreement.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Agreement not found.' });
    }

    // Record previous agreement state into renewal history
    agreement.renewal_history.push({
      previous_agreement_id: agreement._id,
      renewed_at: new Date(),
      renewed_by: req.user?._id || null,
      previous_start_date: agreement.start_date,
      previous_end_date: agreement.end_date,
      renewal_fee_paid: Number(renewal_fee_paid || 0),
      payment_reference: payment_reference || null,
      remarks: remarks || 'Agreement successfully renewed for new term.',
    });

    agreement.start_date = new Date(new_start_date || agreement.end_date);
    agreement.end_date = new Date(new_end_date);
    agreement.version = String((parseFloat(agreement.version || '1.0') + 1.0).toFixed(1));
    agreement.status = 'active';
    if (document_url) agreement.document_url = document_url;
    agreement.updated_by = req.user?._id || null;

    await agreement.save();

    // Update cluster expiry date
    if (agreement.cluster_id) {
      await FranchiseeCluster.findByIdAndUpdate(agreement.cluster_id, {
        agreement_start_date: agreement.start_date,
        agreement_expiry_date: agreement.end_date,
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Agreement "${agreement.agreement_number}" renewed successfully to Version ${agreement.version}.`,
      data: agreement,
    });
  } catch (err) {
    console.error('Error in renew_agreement:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 5. Terminate Agreement
 */
exports.terminate_agreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const agreement = await FranchiseeAgreement.findById(id);
    if (!agreement) {
      return res.status(404).json({ status: 'error', message: 'Agreement not found.' });
    }

    agreement.status = 'terminated';
    agreement.renewal_conditions = `Terminated by Admin on ${new Date().toLocaleDateString()}. Reason: ${reason || 'N/A'}`;
    agreement.updated_by = req.user?._id || null;

    await agreement.save();

    return res.status(200).json({
      status: 'success',
      message: `Agreement "${agreement.agreement_number}" terminated.`,
      data: agreement,
    });
  } catch (err) {
    console.error('Error in terminate_agreement:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};
