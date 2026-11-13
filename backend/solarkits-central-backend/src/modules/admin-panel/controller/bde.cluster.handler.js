const mongoose = require('mongoose');
const {
  FranchiseeCluster,
  Reseller,
  BDEProfile,
  SolarKitsServiceTicket,
  FranchiseeClusterGoal,
  EpcAccount,
  FpoOrder,
  FranchiseeAgreement,
} = require('../models/india_solarshop_db');

/**
 * 1. Assign or Reassign BDE to Cluster (Primary & Support)
 */
exports.assign_bde_to_cluster = async (req, res) => {
  try {
    const {
      cluster_id,
      primary_bde_id,
      support_bde_ids,
      reason,
    } = req.body;

    if (!cluster_id) {
      return res.status(400).json({ status: 'error', message: 'cluster_id is required.' });
    }

    const cluster = await FranchiseeCluster.findById(cluster_id);
    if (!cluster || cluster.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
    }

    const oldPrimary = cluster.primary_bde_id;
    const oldSupport = cluster.support_bde_ids;

    if (primary_bde_id !== undefined) cluster.primary_bde_id = primary_bde_id || null;
    if (support_bde_ids !== undefined) cluster.support_bde_ids = Array.isArray(support_bde_ids) ? support_bde_ids : [];

    cluster.audit_history.push({
      user_id: req.user?._id || null,
      user_name: req.user?.full_name || 'Admin',
      action: 'BDE_MAPPED',
      timestamp: new Date(),
      old_state: { primary_bde_id: oldPrimary, support_bde_ids: oldSupport },
      new_state: { primary_bde_id: cluster.primary_bde_id, support_bde_ids: cluster.support_bde_ids },
      reason: reason || 'BDE assigned to cluster',
    });

    cluster.updated_by = req.user?._id || null;
    await cluster.save();

    // If cluster has an assigned franchisee, also update their primary BDE reference
    if (cluster.assigned_franchisee_id && cluster.primary_bde_id) {
      await Reseller.findByIdAndUpdate(cluster.assigned_franchisee_id, {
        bde_id: cluster.primary_bde_id,
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'BDE successfully assigned to cluster.',
      data: {
        cluster_id: cluster._id,
        primary_bde_id: cluster.primary_bde_id,
        support_bde_ids: cluster.support_bde_ids,
      },
    });
  } catch (err) {
    console.error('Error in assign_bde_to_cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 2. Get BDE Cluster Mappings List & History
 */
exports.get_bde_mappings = async (req, res) => {
  try {
    const { bde_id } = req.query;

    const bdeQuery = { deleted_at: null };
    if (bde_id) bdeQuery._id = bde_id;

    const bdes = await BDEProfile.find(bdeQuery).sort({ full_name: 1 }).lean();

    // Find all clusters mapped to these BDEs
    const allClusters = await FranchiseeCluster.find({
      deleted_at: null,
      is_active: true,
      $or: [
        { primary_bde_id: { $ne: null } },
        { support_bde_ids: { $exists: true, $not: { $size: 0 } } },
      ],
    })
      .populate('state_id', 'name')
      .populate('district_ids', 'name')
      .populate('assigned_franchisee_id', 'business_name mobile email store_category')
      .lean();

    const mappings = bdes.map((bde) => {
      const primaryClusters = allClusters.filter(c => String(c.primary_bde_id) === String(bde._id));
      const supportClusters = allClusters.filter(c =>
        (c.support_bde_ids || []).some(sId => String(sId) === String(bde._id))
      );

      const assignedFranchisees = [
        ...primaryClusters.map(c => c.assigned_franchisee_id),
        ...supportClusters.map(c => c.assigned_franchisee_id),
      ].filter(Boolean);

      return {
        bde_id: bde._id,
        bde_code: bde.bde_id,
        full_name: bde.full_name,
        mobile_number: bde.mobile_number,
        email: bde.email,
        primary_clusters: primaryClusters.map(c => ({
          id: c._id,
          cluster_name: c.cluster_name,
          cluster_code: c.cluster_code,
          state_name: c.state_name,
          district_names: c.district_names,
          franchisee_name: c.assigned_franchisee_id?.business_name || 'Unassigned',
        })),
        support_clusters: supportClusters.map(c => ({
          id: c._id,
          cluster_name: c.cluster_name,
          cluster_code: c.cluster_code,
          state_name: c.state_name,
        })),
        total_clusters_count: primaryClusters.length + supportClusters.length,
        total_franchisees_count: assignedFranchisees.length,
      };
    });

    return res.status(200).json({
      status: 'success',
      count: mappings.length,
      data: mappings,
    });
  } catch (err) {
    console.error('Error in get_bde_mappings:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 3. BDE Self-Service Dashboard Additions
 * Powers Section 6.3 in the BDE module for the logged-in BDE.
 */
exports.get_bde_cluster_dashboard = async (req, res) => {
  try {
    const bdeId = req.query.bde_id || req.user?._id || req.user?.id || req.bde?._id;
    if (!bdeId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized BDE access.' });
    }

    // Clusters where this BDE is Primary or Support
    const clusters = await FranchiseeCluster.find({
      $or: [{ primary_bde_id: bdeId }, { support_bde_ids: bdeId }],
      deleted_at: null,
      is_active: true,
    })
      .populate('state_id', 'name')
      .populate('assigned_franchisee_id', 'business_name mobile email store_category gst_number reseller_lifecycle_status')
      .lean();

    const clusterIds = clusters.map(c => c._id);
    const franchiseeIds = clusters.map(c => c.assigned_franchisee_id?._id).filter(Boolean);

    // Current Month Kit Goal vs Achievement
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const defaultFY = currentMonth >= 4 ? `${currentYear}-${String(currentYear + 1).slice(2)}` : `${currentYear - 1}-${String(currentYear).slice(2)}`;

    const clusterGoals = await FranchiseeClusterGoal.find({
      cluster_id: { $in: clusterIds },
      financial_year: defaultFY,
      deleted_at: null,
    }).lean();

    let totalMonthlyKitGoal = 0;
    let totalAnnualEpcGoal = 0;
    for (const g of clusterGoals) {
      totalAnnualEpcGoal += (g.annual_epc_goal || 0);
      const mGoal = (g.monthly_kit_goals || []).find(m => m.month === currentMonth);
      if (mGoal) totalMonthlyKitGoal += (mGoal.target_kits_quantity || 0);
    }

    // Actual EPC Onboarded by these Franchisees
    const approvedEpcs = await EpcAccount.find({
      onboarded_by_reseller_id: { $in: franchiseeIds },
      status: 'approved',
      deleted_at: null,
    }).lean();

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const liveEpcsCount = approvedEpcs.filter(e => e.last_activity_at && new Date(e.last_activity_at) >= ninetyDaysAgo).length;

    // Actual monthly kits sold
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const monthlyOrders = await FpoOrder.find({
      reseller_id: { $in: franchiseeIds },
      status: { $in: ['CONFIRMED', 'PAID', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'COMPLETED'] },
      created_at: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean();

    let actualMonthlyKits = 0;
    for (const o of monthlyOrders) {
      actualMonthlyKits += Number(o.total_kits_count || o.total_quantity || 1);
    }

    // Open Service & Replacement Tickets for this BDE
    const openTickets = await SolarKitsServiceTicket.find({
      $or: [{ assigned_bde_id: bdeId }, { raised_by_id: { $in: franchiseeIds } }],
      ticket_status: { $in: ['open', 'assigned', 'in_progress', 'waiting', 'raised', 'under_review'] },
      deleted_at: null,
    })
      .sort({ created_at: -1 })
      .lean();

    const overdueTickets = openTickets.filter(t => t.tat_deadline && new Date() > new Date(t.tat_deadline));

    // Expiring Agreements (next 30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringAgreements = await FranchiseeAgreement.find({
      franchisee_id: { $in: franchiseeIds },
      end_date: { $lte: thirtyDaysFromNow },
      status: { $in: ['active', 'expiring_soon', 'expired', 'renewal_pending'] },
      deleted_at: null,
    })
      .populate('franchisee_id', 'business_name mobile')
      .populate('cluster_id', 'cluster_name')
      .lean();

    return res.status(200).json({
      status: 'success',
      data: {
        assigned_clusters: clusters.map(c => ({
          id: c._id,
          cluster_name: c.cluster_name,
          cluster_code: c.cluster_code,
          state_name: c.state_name,
          districts_count: (c.district_ids || []).length,
          franchisee_name: c.assigned_franchisee_id?.business_name || 'Unassigned',
          is_primary: String(c.primary_bde_id) === String(bdeId),
        })),
        assigned_franchisees: clusters
          .filter(c => c.assigned_franchisee_id)
          .map(c => ({
            id: c.assigned_franchisee_id._id,
            business_name: c.assigned_franchisee_id.business_name,
            mobile: c.assigned_franchisee_id.mobile,
            cluster_name: c.cluster_name,
          })),
        metrics: {
          total_clusters: clusters.length,
          total_franchisees: franchiseeIds.length,
          annual_epc_goal: totalAnnualEpcGoal,
          actual_epc_onboarded: approvedEpcs.length,
          live_epc_count: liveEpcsCount,
          monthly_kit_target: totalMonthlyKitGoal,
          actual_monthly_kits: actualMonthlyKits,
          monthly_achievement_pct: totalMonthlyKitGoal > 0 ? Math.round((actualMonthlyKits / totalMonthlyKitGoal) * 100) : 0,
        },
        open_tickets: openTickets.slice(0, 10),
        open_tickets_count: openTickets.length,
        overdue_tickets_count: overdueTickets.length,
        expiring_agreements: expiringAgreements,
        expiring_agreements_count: expiringAgreements.length,
      },
    });
  } catch (err) {
    console.error('Error in get_bde_cluster_dashboard:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};
