const mongoose = require('mongoose');
const {
  FranchiseeCluster,
  Reseller,
  BDEProfile,
  FranchiseeAgreement,
  FranchiseeClusterGoal,
  SolarKitsServiceTicket,
  EpcAccount,
  PurchaseOrder,
  FpoOrder,
} = require('../models/india_solarshop_db');
const { GeoLevel1, GeoLevel2, Level1, Level2 } = require('../models/geolocation_db');
const StateLevel = GeoLevel1 || Level1;
const DistrictLevel = GeoLevel2 || Level2;
const { Level2: BoundaryLevel2 } = require('../models/boundary_db');

/**
 * Helper to compute color status for a district
 */
const determineDistrictColor = (cluster, reseller) => {
  if (!cluster || !cluster.is_active || cluster.status === 'inactive') {
    return { color: '#94a3b8', statusKey: 'grey', label: 'Inactive / Unconfigured' }; // Grey
  }
  if (reseller && reseller.store_category === 'company_store') {
    return { color: '#2563eb', statusKey: 'blue', label: 'Company-Owned Store' }; // Blue
  }
  if (cluster.status === 'allotted' && cluster.assigned_franchisee_id) {
    return { color: '#16a34a', statusKey: 'green', label: 'Franchisee Allotted & Active' }; // Green
  }
  if (cluster.status === 'reserved') {
    return { color: '#eab308', statusKey: 'yellow', label: 'Application In Progress / Reserved' }; // Yellow
  }
  return { color: '#dc2626', statusKey: 'red', label: 'Available – Franchisee Pending' }; // Red
};

/**
 * 1. Get India Territory Map Overview Data
 * Returns summary counts and district metadata for map visualization.
 */
exports.get_india_territory_map_data = async (req, res) => {
  try {
    const { state_id, cluster_id, status, bde_id } = req.query;

    // 1. Fetch all active clusters with populated franchisee and BDE
    const clusterQuery = { deleted_at: null, is_active: true };
    if (state_id) clusterQuery.state_id = state_id;
    if (cluster_id) clusterQuery._id = cluster_id;
    if (status && status !== 'all') clusterQuery.status = status;
    if (bde_id) clusterQuery.$or = [{ primary_bde_id: bde_id }, { support_bde_ids: bde_id }];

    const clusters = await FranchiseeCluster.find(clusterQuery)
      .populate('state_id', 'name iso2')
      .populate('assigned_franchisee_id', 'business_name mobile email store_category gst_number kyc_status reseller_lifecycle_status')
      .populate('primary_bde_id', 'full_name mobile_number email bde_id')
      .lean();

    // Index clusters by district ID
    const districtToClusterMap = {};
    for (const clu of clusters) {
      for (const dId of clu.district_ids || []) {
        districtToClusterMap[String(dId)] = clu;
      }
    }

    // 2. Fetch all districts (optionally filtered by state)
    const districtQuery = { is_active: true, $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] };
    if (state_id) districtQuery.level_1 = state_id;

    const allDistricts = await DistrictLevel.find(districtQuery)
      .populate('level_1', 'name iso2')
      .sort({ name: 1 })
      .lean();

    // 3. Compute counts & classify districts
    let allottedCount = 0;
    let availableCount = 0;
    let inProgressCount = 0;
    let companyStoreCount = 0;
    let unconfiguredCount = 0;

    const districtsWithStatus = allDistricts.map((d) => {
      const clu = districtToClusterMap[String(d._id)];
      const franchisee = clu?.assigned_franchisee_id;
      const colorMeta = determineDistrictColor(clu, franchisee);

      if (colorMeta.statusKey === 'green') allottedCount++;
      else if (colorMeta.statusKey === 'yellow') inProgressCount++;
      else if (colorMeta.statusKey === 'red') availableCount++;
      else if (colorMeta.statusKey === 'blue') companyStoreCount++;
      else unconfiguredCount++;

      return {
        id: d._id,
        district_name: d.name,
        state_id: d.level_1?._id || d.level_1,
        state_name: d.level_1?.name || '',
        lat: d.lat || 0,
        lng: d.lng || 0,
        color: colorMeta.color,
        status_key: colorMeta.statusKey,
        status_label: colorMeta.label,
        cluster_id: clu?._id || null,
        cluster_name: clu?.cluster_name || null,
        cluster_code: clu?.cluster_code || null,
        franchisee_id: franchisee?._id || null,
        franchisee_name: franchisee?.business_name || null,
        primary_bde_name: clu?.primary_bde_id?.full_name || null,
      };
    });

    // 4. Fetch boundary polygons if requested (for state drilldown)
    let boundaries = [];
    if (state_id) {
      boundaries = await BoundaryLevel2.find({ level_1: state_id })
        .select('name coordinates geometry_type lat lng')
        .lean();
    }

    const totalDistricts = allDistricts.length;
    const coveragePercentage = totalDistricts > 0 ? Math.round(((allottedCount + inProgressCount) / totalDistricts) * 100) : 0;

    return res.status(200).json({
      status: 'success',
      summary: {
        total_districts: totalDistricts,
        coverage_percentage: coveragePercentage,
        allotted_districts: allottedCount,
        available_districts: availableCount,
        in_progress_districts: inProgressCount,
        company_store_districts: companyStoreCount,
        unconfigured_districts: unconfiguredCount,
      },
      data: {
        districts: districtsWithStatus,
        boundaries: boundaries.map(b => ({
          id: b._id,
          name: b.name,
          geometry: {
            type: b.geometry_type || (b.coordinates?.type || 'Polygon'),
            coordinates: b.coordinates?.coordinates || b.coordinates || [],
          },
          lat: b.lat,
          lng: b.lng,
        })),
      },
    });
  } catch (err) {
    console.error('Error in get_india_territory_map_data:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 2. District Details Popup API
 * Returns all 10 fields when clicking on a district.
 */
exports.get_district_popup_details = async (req, res) => {
  try {
    const { district_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(district_id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid District ID.' });
    }

    const district = await DistrictLevel.findById(district_id).populate('level_1', 'name iso2').lean();
    if (!district) {
      return res.status(404).json({ status: 'error', message: 'District not found.' });
    }

    // Find if district belongs to any cluster
    const cluster = await FranchiseeCluster.findOne({
      district_ids: district._id,
      deleted_at: null,
      is_active: true,
    })
      .populate('assigned_franchisee_id')
      .populate('primary_bde_id')
      .lean();

    const franchisee = cluster?.assigned_franchisee_id;
    const primaryBde = cluster?.primary_bde_id;

    // 1. Agreement info
    let agreement = null;
    if (franchisee) {
      agreement = await FranchiseeAgreement.findOne({
        franchisee_id: franchisee._id,
        deleted_at: null,
      }).sort({ created_at: -1 }).lean();
    }

    // 2. Performance Goals & Achievements
    let goalsData = {
      annual_epc_goal: 0,
      annual_live_epc_goal: 0,
      actual_epcs: 0,
      actual_live_epcs: 0,
      epc_achievement_pct: 0,
      monthly_kit_target: 0,
      actual_kit_sales: 0,
      monthly_revenue_goal: 0,
      actual_revenue: 0,
      kit_achievement_pct: 0,
    };

    if (cluster) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const fyStr = currentMonth >= 4 ? `${currentYear}-${String(currentYear + 1).slice(2)}` : `${currentYear - 1}-${String(currentYear).slice(2)}`;

      const clusterGoal = await FranchiseeClusterGoal.findOne({
        cluster_id: cluster._id,
        financial_year: fyStr,
        is_active: true,
        deleted_at: null,
      }).lean();

      if (clusterGoal) {
        goalsData.annual_epc_goal = clusterGoal.annual_epc_goal || 0;
        goalsData.annual_live_epc_goal = clusterGoal.annual_live_epc_goal || 0;

        const currentMonthGoal = (clusterGoal.monthly_kit_goals || []).find(m => m.month === currentMonth);
        if (currentMonthGoal) {
          goalsData.monthly_kit_target = currentMonthGoal.target_kits_quantity || 0;
          goalsData.monthly_revenue_goal = currentMonthGoal.target_revenue || 0;
        }
      }

      // Auto-calculate actual EPCs if franchisee is mapped
      if (franchisee) {
        const approvedEpcs = await EpcAccount.find({
          $or: [
            { onboarded_by_reseller_id: franchisee._id },
            { primary_reseller_id: franchisee._id },
            { districts: district._id },
          ],
          status: 'approved',
          deleted_at: null,
        }).lean();

        goalsData.actual_epcs = approvedEpcs.length;

        // Live EPC: active in last 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        goalsData.actual_live_epcs = approvedEpcs.filter(e =>
          e.last_activity_at && new Date(e.last_activity_at) >= ninetyDaysAgo
        ).length;

        if (goalsData.annual_epc_goal > 0) {
          goalsData.epc_achievement_pct = Math.min(100, Math.round((goalsData.actual_epcs / goalsData.annual_epc_goal) * 100));
        }

        // Actual confirmed orders in current month (excluding cancelled/refunded)
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const fpoOrders = await FpoOrder.find({
          reseller_id: franchisee._id,
          status: { $in: ['CONFIRMED', 'PAID', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'COMPLETED'] },
          created_at: { $gte: startOfMonth, $lte: endOfMonth },
        }).lean();

        let totalKits = 0;
        let totalRevenue = 0;
        for (const order of fpoOrders) {
          totalKits += Number(order.total_kits_count || order.total_quantity || 1);
          totalRevenue += Number((order.total_amount_paise || 0) / 100);
        }

        goalsData.actual_kit_sales = totalKits;
        goalsData.actual_revenue = totalRevenue;

        if (goalsData.monthly_kit_target > 0) {
          goalsData.kit_achievement_pct = Math.min(100, Math.round((totalKits / goalsData.monthly_kit_target) * 100));
        }
      }
    }

    // 3. Open Support / Replacement Tickets
    let openTicketsCount = 0;
    if (franchisee) {
      openTicketsCount = await SolarKitsServiceTicket.countDocuments({
        raised_by_id: franchisee._id,
        ticket_status: { $in: ['open', 'assigned', 'in_progress', 'waiting', 'raised', 'under_review', 'replacement_processing'] },
        deleted_at: null,
      });
    }

    const colorMeta = determineDistrictColor(cluster, franchisee);

    return res.status(200).json({
      status: 'success',
      data: {
        district_id: district._id,
        district_name: district.name,
        state_id: district.level_1?._id || district.level_1,
        state_name: district.level_1?.name || '',
        cluster_id: cluster?._id || null,
        cluster_name: cluster?.cluster_name || 'Not In Cluster',
        cluster_code: cluster?.cluster_code || 'N/A',
        franchisee_status: colorMeta.label,
        status_key: colorMeta.statusKey,
        color: colorMeta.color,
        // Franchisee Store Info
        franchisee: franchisee ? {
          id: franchisee._id,
          business_name: franchisee.business_name,
          mobile: franchisee.mobile,
          email: franchisee.email,
          gst_number: franchisee.gst_number,
          store_category: franchisee.store_category,
          address: franchisee.address?.line || `${district.name}, ${district.level_1?.name}`,
        } : null,
        // BDE Info
        bde: primaryBde ? {
          id: primaryBde._id,
          bde_id: primaryBde.bde_id,
          full_name: primaryBde.full_name,
          mobile_number: primaryBde.mobile_number,
          email: primaryBde.email,
        } : null,
        // Setup Fee & Payment
        setup_fee_config: cluster?.setup_fee_config || null,
        payment_status: cluster?.payment_status || 'pending',
        // Agreement Validity
        agreement: agreement ? {
          agreement_number: agreement.agreement_number,
          status: agreement.status,
          start_date: agreement.start_date,
          end_date: agreement.end_date,
          duration_months: agreement.duration_months,
          is_signed: agreement.is_digitally_signed,
        } : null,
        // Performance
        performance: goalsData,
        // Tickets
        open_tickets_count: openTicketsCount,
      },
    });
  } catch (err) {
    console.error('Error in get_district_popup_details:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};
