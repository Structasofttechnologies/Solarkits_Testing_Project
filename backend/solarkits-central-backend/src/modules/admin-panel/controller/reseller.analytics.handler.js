/**
 * reseller.analytics.handler.js
 *
 * Executive Analytics Dashboard & Tax Compliance Audit Handler.
 * Phase R10 — Reseller Management System
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const {
  Reseller,
  ResellerType,
  ResellerKyc,
  ResellerTerritory,
  ResellerProcurementOrder,
  EpcOrder,
  ResellerWallet,
  GstVerificationLog,
} = require('../models/india_solarshop_db');

// ─── 1. EXECUTIVE DASHBOARD ANALYTICS ─────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/analytics/dashboard
 */
const get_executive_dashboard = async (req, res) => {
  try {
    const [
      totalResellers,
      activeResellers,
      pendingKycCount,
      typeBreakdown,
      territoryCount,
      procurementStats,
      epcStats,
      walletTotals,
    ] = await Promise.all([
      Reseller.countDocuments({ deleted_at: null }),
      Reseller.countDocuments({ activation_status: 'active', deleted_at: null }),
      ResellerKyc.countDocuments({ status: 'submitted' }),
      Reseller.aggregate([
        { $match: { deleted_at: null } },
        { $group: { _id: '$reseller_type_id', count: { $sum: 1 } } },
      ]),
      ResellerTerritory.countDocuments({ status: 'active' }),
      ResellerProcurementOrder.aggregate([
        {
          $group: {
            _id: null,
            total_orders: { $sum: 1 },
            total_revenue_paise: { $sum: '$grand_total_paise' },
          },
        },
      ]),
      EpcOrder.aggregate([
        {
          $group: {
            _id: null,
            total_orders: { $sum: 1 },
            total_sales_paise: { $sum: '$grand_total_paise' },
            total_margin_paise: { $sum: '$reseller_total_margin_paise' },
            total_commission_paise: { $sum: '$platform_total_commission_paise' },
          },
        },
      ]),
      ResellerWallet.aggregate([
        {
          $group: {
            _id: null,
            total_available_paise: { $sum: '$available_balance_paise' },
            total_earned_paise: { $sum: '$total_earned_paise' },
            total_tds_paise: { $sum: '$tds_deducted_paise' },
            total_tcs_paise: { $sum: '$tcs_deducted_paise' },
          },
        },
      ]),
    ]);

    const pStats = procurementStats[0] || { total_orders: 0, total_revenue_paise: 0 };
    const eStats = epcStats[0] || { total_orders: 0, total_sales_paise: 0, total_margin_paise: 0, total_commission_paise: 0 };
    const wStats = walletTotals[0] || { total_available_paise: 0, total_earned_paise: 0, total_tds_paise: 0, total_tcs_paise: 0 };

    return res.json({
      status: 'success',
      data: {
        network_overview: {
          total_resellers: totalResellers,
          active_resellers: activeResellers,
          pending_kyc_reviews: pendingKycCount,
          active_assigned_territories: territoryCount,
          type_distribution: typeBreakdown,
        },
        financial_summary: {
          total_procurement_revenue_inr: pStats.total_revenue_paise / 100,
          total_epc_sales_volume_inr: eStats.total_sales_paise / 100,
          total_reseller_earnings_inr: wStats.total_earned_paise / 100,
          total_platform_commission_inr: eStats.total_commission_paise / 100,
          total_tds_withheld_inr: wStats.total_tds_paise / 100,
          total_tcs_withheld_inr: wStats.total_tcs_paise / 100,
          total_available_wallet_balance_inr: wStats.total_available_paise / 100,
        },
        order_metrics: {
          b2b_procurement_orders_count: pStats.total_orders,
          epc_channel_orders_count: eStats.total_orders,
        },
      },
    });
  } catch (error) {
    console.error('[reseller.analytics] get_executive_dashboard error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. TAX & GST COMPLIANCE AUDIT ANALYTICS ──────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/analytics/tax-compliance
 */
const get_tax_compliance_report = async (req, res) => {
  try {
    const [
      gstLogStats,
      gstinConflictCount,
      walletsWithTax,
    ] = await Promise.all([
      GstVerificationLog.aggregate([
        {
          $group: {
            _id: '$is_valid',
            count: { $sum: 1 },
          },
        },
      ]),
      GstVerificationLog.countDocuments({ is_active_conflict: true }),
      ResellerWallet.find({
        $or: [{ tds_deducted_paise: { $gt: 0 } }, { tcs_deducted_paise: { $gt: 0 } }],
      })
        .populate('reseller_id', 'business_name gst_number pan_number email')
        .lean(),
    ]);

    const validCount = gstLogStats.find((s) => s._id === true)?.count || 0;
    const invalidCount = gstLogStats.find((s) => s._id === false)?.count || 0;

    const taxReport = walletsWithTax.map((w) => ({
      reseller: w.reseller_id,
      tds_deducted_inr: (w.tds_deducted_paise || 0) / 100,
      tcs_deducted_inr: (w.tcs_deducted_paise || 0) / 100,
      total_tax_withheld_inr: ((w.tds_deducted_paise || 0) + (w.tcs_deducted_paise || 0)) / 100,
    }));

    return res.json({
      status: 'success',
      data: {
        gst_verification_audit: {
          total_verifications: validCount + invalidCount,
          successful_verifications: validCount,
          failed_verifications: invalidCount,
          active_gstin_conflicts: gstinConflictCount,
        },
        withholding_tax_summary: taxReport,
      },
    });
  } catch (error) {
    console.error('[reseller.analytics] get_tax_compliance_report error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  get_executive_dashboard,
  get_tax_compliance_report,
};
