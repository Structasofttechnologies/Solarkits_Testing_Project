'use strict';

const mongoose = require('mongoose');
const {
  EpcSignupRequest,
  ComboKit: IndiaComboKit,
  CompanyMargin: IndiaCompanyMargin,
  FpoOrder,
  PoRefundRequest,
  EpcOrder,
  DeliveryOrder,
  Reseller,
  ResellerPayoutRequest,
  EpcQuote,
  ProjectBomItem,
  BulkKitSetting,
  ComboKitVariant,
  PincodeDeliveryCost,
  BestSellerKit,
  OfferMaster,
  DeliveryVehicleFleet,
  DeliveryVehicleMaster,
  DeliveryServiceProvider,
  ComboKitWeightMaster,
  KitDeliveryCostRule,
  DeliveryRouteSetting,
  FranchiseLead,
  WebsiteEpcLead,
} = require('../../models/india_solarshop_db');
const { CompanyMargin: CoreCompanyMargin } = require('../../models/core_db');
const WarehouseKitActivation = require('../../../solarshop-india/models/india_core_db/warehouse_kit_activations.schema');
const { PurchaseIndent } = require('../../../account-panel/models/company_warehouse_db');

/**
 * GET /admin-api/solarshop/sidebar-counts
 * Returns real-time pending work / movement counts for all 16 Solar Shop connected sidebar modules
 * and granular breakdown counts for all submenu pages.
 */
const get_sidebar_counts = async (req, res) => {
  try {
    const isIndia = (req.query.country || 'india').toLowerCase() === 'india';

    // 1. Approve New EPC / Website EPC Leads (pending inquiries & un-onboarded EPCs)
    const epcApprovalPromise = Promise.all([
      EpcSignupRequest.countDocuments({ status: 'pending' }).catch(() => 0),
      WebsiteEpcLead.countDocuments({
        deleted_at: null,
        status: { $nin: ['onboarded', 'converted'] },
        lead_status: { $nin: ['Onboarded', 'Converted', 'Assigned to Franchisee'] },
      }).catch(() => 0),
    ]).then(([signups, leads]) => signups + leads).catch(() => 0);

    // 2. Solar Kit Configurations (total active configured combo kits)
    const kitConfigsPromise = IndiaComboKit.countDocuments({
      is_active: true,
      deleted_at: null,
      is_custom: false,
    }).catch(() => 0);

    // 3. Franchisee PO Orders in movement (pending approvals or submitted) + pending refund requests
    const poOrdersPromise = Promise.all([
      FpoOrder.countDocuments({
        status: { $in: ['PENDING_APPROVAL', 'SUBMITTED', 'CHANGES_REQUESTED'] },
        is_loose: { $ne: true },
      }).catch(() => 0),
      PoRefundRequest.countDocuments({ status: 'pending' }).catch(() => 0),
    ]).then(([orders, refunds]) => orders + refunds).catch(() => 0);

    // 4. Loose Orders in active processing pipeline
    const looseOrdersPromise = FpoOrder.countDocuments({
      is_loose: true,
      status: { $in: ['PENDING_APPROVAL', 'SUBMITTED', 'CONFIRMED', 'PROCESSING'] },
    }).catch(() => 0);

    // 5. EPC Orders pending payment verification or approval
    const epcOrdersPromise = EpcOrder.countDocuments({
      $or: [
        { order_status: 'pending' },
        { payment_status: { $in: ['pending_verification', 'pending', 'partial'] } },
      ],
    }).catch(() => 0);

    // 6. Order & Stage Approvals (8-stage gatekeeper queue)
    const stageApprovalsPromise = Promise.all([
      // Pending orders awaiting order stage approval
      EpcOrder.countDocuments({
        $or: [
          { order_status: 'pending' },
          { payment_status: 'pending_verification' },
        ],
      }).catch(() => 0),
      FpoOrder.countDocuments({ status: { $in: ['PENDING_APPROVAL', 'SUBMITTED'] } }).catch(() => 0),
      // Pending POs awaiting approval
      PurchaseIndent.countDocuments({ 'po_approval.status': 'pending' }).catch(() => 0),
      // Pending 1st Payment
      PurchaseIndent.countDocuments({
        $or: [
          { 'payment.advance_approval.status': 'pending' },
          { 'payment.payment_status': 'Advance Requested' },
        ],
      }).catch(() => 0),
      // Pending 2nd Payment
      PurchaseIndent.countDocuments({
        $or: [
          { 'payment.balance_approval.status': 'pending' },
          { 'payment.payment_status': 'Balance Requested' },
        ],
      }).catch(() => 0),
      // Pending delivery variance approvals
      DeliveryOrder.countDocuments({ approval_status: 'pending' }).catch(() => 0),
    ]).then(([epcOrders, fpoOrders, pos, adv, bal, deliv]) => epcOrders + fpoOrders + pos + adv + bal + deliv).catch(() => 0);

    // 7. Delivery Management (Approval queue + Active dispatches)
    const deliveryMgmtPromise = DeliveryOrder.countDocuments({
      $or: [
        { approval_status: 'pending' },
        { current_stage: { $in: ['vehicle_assigned', 'ready_for_dispatch'] } },
      ],
    }).catch(() => 0);

    // 8 & 9. Pipeline Margin & Warehouse Activation checks
    const pipelinePromise = (async () => {
      try {
        const kitQuery = { is_active: true, deleted_at: null, is_custom: false };
        const kits = await IndiaComboKit.find(kitQuery).select('_id').lean();
        if (!kits || kits.length === 0) {
          return { marginCount: 0, activationCount: 0 };
        }
        const kitIds = kits.map(k => k._id);

        const MarginModel = isIndia ? IndiaCompanyMargin : CoreCompanyMargin;
        const [margins, activations] = await Promise.all([
          MarginModel.find({
            combo_kit_id: { $in: kitIds },
            deleted_at: null,
            $or: [
              { standard_margin: { $gt: 0 } },
              { showcase_margin: { $gt: 0 } },
              { is_active: true },
            ],
          }).select('combo_kit_id').lean(),
          WarehouseKitActivation.find({
            combo_kit_id: { $in: kitIds },
            is_combokit_active: true,
            deleted_at: null,
          }).select('combo_kit_id').lean(),
        ]);

        const marginSet = new Set(margins.map(m => m.combo_kit_id?.toString()).filter(Boolean));
        const activationSet = new Set(activations.map(a => a.combo_kit_id?.toString()).filter(Boolean));

        const marginCount = kits.filter(k => !marginSet.has(k._id.toString())).length;
        const activationCount = kits.filter(k => !activationSet.has(k._id.toString())).length;

        return { marginCount, activationCount };
      } catch (err) {
        console.warn('Pipeline calculation failed in sidebar counts:', err.message);
        return { marginCount: 0, activationCount: 0 };
      }
    })();

    // 10. Service Tickets (Open / In-Progress Tickets)
    const serviceTicketsPromise = (async () => {
      try {
        const ServiceTicket = mongoose.models.solarkits_service_tickets;
        if (!ServiceTicket) return 0;
        return await ServiceTicket.countDocuments({
          status: { $in: ['open', 'in_progress', 'pending_customer', 'escalated'] },
        });
      } catch {
        return 0;
      }
    })();

    // 11. Franchisee Management (Pending store onboardings + pending wallet payout requests)
    const franchiseeMgmtPromise = Promise.all([
      Reseller.countDocuments({
        status: { $in: ['pending', 'under_review', 'kyc_submitted'] },
      }).catch(() => 0),
      ResellerPayoutRequest.countDocuments({ status: 'pending' }).catch(() => 0),
    ]).then(([resellers, payouts]) => resellers + payouts).catch(() => 0);

    // 12. EPC Quote Management (Pending custom quote requests)
    const quoteMgmtPromise = EpcQuote.countDocuments({
      status: { $in: ['submitted', 'pending', 'under_review'] },
    }).catch(() => 0);

    // 13. Know My Margin (Project BOM Items active)
    const knowMyMarginPromise = ProjectBomItem.countDocuments({
      is_active: true,
    }).catch(() => 0);

    // 14. Payment Configuration (Offline approvals queue)
    const paymentConfigPromise = EpcOrder.countDocuments({
      $or: [
        { 'offline_payment.status': 'pending' },
        { payment_mode: 'offline', payment_status: 'pending_verification' },
      ],
    }).catch(() => 0);

    // ── Sub-menu Specific Breakdown Promises ──────────────────────────
    // Solar Kit Configurations sub-pages
    const customKitsPromise = IndiaComboKit.countDocuments({ is_active: true, deleted_at: null, is_custom: true }).catch(() => 0);
    const bulkKitsPromise = BulkKitSetting.countDocuments({ is_active: true, deleted_at: null }).catch(() => 0);
    const kitVariantsPromise = ComboKitVariant.countDocuments({ is_active: true, deleted_at: null }).catch(() => 0);
    const pincodeCostsPromise = PincodeDeliveryCost.countDocuments({ is_active: true }).catch(() => 0);
    const bestSellersPromise = BestSellerKit.countDocuments({ is_active: true, deleted_at: null }).catch(() => 0);
    const missingDatasheetsPromise = IndiaComboKit.countDocuments({
      is_active: true,
      deleted_at: null,
      is_custom: false,
      $or: [{ datasheet_url: { $in: [null, ''] } }, { datasheet_url: { $exists: false } }],
    }).catch(() => 0);

    // Delivery Management sub-pages
    const deliveryApprovalQueuePromise = DeliveryOrder.countDocuments({ approval_status: 'pending' }).catch(() => 0);
    const liveFleetPromise = DeliveryVehicleFleet.countDocuments({ is_active: true, deleted_at: null }).catch(() => 0);
    const transportVendorsPromise = DeliveryServiceProvider.countDocuments({ is_active: true, deleted_at: null }).catch(() => 0);
    const vehicleMasterPromise = DeliveryVehicleMaster.countDocuments({ is_active: true, deleted_at: null }).catch(() => 0);
    const kitWeightsPromise = ComboKitWeightMaster.countDocuments({ is_active: true }).catch(() => 0);
    const deliveryCostRulesPromise = KitDeliveryCostRule.countDocuments({ is_active: true }).catch(() => 0);
    const deliveryRoutesPromise = DeliveryRouteSetting.countDocuments({ is_active: true }).catch(() => 0);
    const deliveryDispatchesPromise = DeliveryOrder.countDocuments({ current_stage: { $in: ['vehicle_assigned', 'ready_for_dispatch'] } }).catch(() => 0);

    // Margin & Commission sub-pages
    const offersPromise = OfferMaster.countDocuments({ is_active: true, deleted_at: null }).catch(() => 0);

    // Franchisee Management sub-pages
    const storeOnboardingPromise = Reseller.countDocuments({ status: { $in: ['pending', 'under_review', 'kyc_submitted'] }, deleted_at: null }).catch(() => 0);
    const franchiseLeadsPromise = FranchiseLead.countDocuments({ status: { $in: ['NEW', 'GST_VERIFIED', 'CONTACTED', 'IN_REVIEW'] }, deleted_at: null }).catch(() => 0);
    const franchiseeOrdersPromise = FpoOrder.countDocuments({ status: { $in: ['PENDING_APPROVAL', 'SUBMITTED', 'CONFIRMED'] } }).catch(() => 0);
    const franchiseePayoutsPromise = ResellerPayoutRequest.countDocuments({ status: { $in: ['pending', 'processing'] } }).catch(() => 0);
    const activeStoresPromise = Reseller.countDocuments({ status: 'active', deleted_at: null }).catch(() => 0);

    // Order Management Settings sub-pages
    const overdueOrdersPromise = FpoOrder.countDocuments({
      is_overdue: true,
      status: { $nin: ['DELIVERED', 'CANCELLED'] },
    }).catch(() => 0);

    // Execute all queries in parallel with ultra-low latency
    const [
      epcApprovals,
      kitConfigs,
      poOrders,
      looseOrders,
      epcOrders,
      stageApprovals,
      deliveryMgmt,
      pipeline,
      serviceTickets,
      franchiseeMgmt,
      quoteMgmt,
      knowMyMargin,
      paymentConfig,
      // Sub-menu results
      customKitsCount,
      bulkKitsCount,
      kitVariantsCount,
      pincodeCostsCount,
      bestSellersCount,
      missingDatasheetsCount,
      deliveryApprovalQueueCount,
      liveFleetCount,
      transportVendorsCount,
      vehicleMasterCount,
      kitWeightsCount,
      deliveryCostRulesCount,
      deliveryRoutesCount,
      deliveryDispatchesCount,
      offersCount,
      storeOnboardingCount,
      franchiseLeadsCount,
      franchiseeOrdersCount,
      franchiseePayoutsCount,
      activeStoresCount,
      overdueOrdersCount,
    ] = await Promise.all([
      epcApprovalPromise,
      kitConfigsPromise,
      poOrdersPromise,
      looseOrdersPromise,
      epcOrdersPromise,
      stageApprovalsPromise,
      deliveryMgmtPromise,
      pipelinePromise,
      serviceTicketsPromise,
      franchiseeMgmtPromise,
      quoteMgmtPromise,
      knowMyMarginPromise,
      paymentConfigPromise,
      // Sub-menu promises
      customKitsPromise,
      bulkKitsPromise,
      kitVariantsPromise,
      pincodeCostsPromise,
      bestSellersPromise,
      missingDatasheetsPromise,
      deliveryApprovalQueuePromise,
      liveFleetPromise,
      transportVendorsPromise,
      vehicleMasterPromise,
      kitWeightsPromise,
      deliveryCostRulesPromise,
      deliveryRoutesPromise,
      deliveryDispatchesPromise,
      offersPromise,
      storeOnboardingPromise,
      franchiseLeadsPromise,
      franchiseeOrdersPromise,
      franchiseePayoutsPromise,
      activeStoresPromise,
      overdueOrdersPromise,
    ]);

    // Sub-menu breakdown counts mapped by last segment, unique_id, and badgeKey
    const sub_counts = {
      // ── Website EPC Leads ────────────────────────────────────
      "website-epc-leads": { count: epcApprovals, is_urgent: epcApprovals > 0, tooltip: `${epcApprovals} Website EPC Lead(s) pending onboarding` },
      "approve-new-epc": { count: epcApprovals, is_urgent: epcApprovals > 0, tooltip: `${epcApprovals} Website EPC Lead(s) pending onboarding` },
      "ADM_APPROVE_EPC": { count: epcApprovals, is_urgent: epcApprovals > 0, tooltip: `${epcApprovals} Website EPC Lead(s) pending onboarding` },
      // ── Solar Kit Configurations ─────────────────────────────
      "combo-kits": { count: kitConfigs, is_urgent: false, tooltip: `${kitConfigs} standard combo kit(s) configured` },
      "ADM_COMBO_KITS": { count: kitConfigs, is_urgent: false, tooltip: `${kitConfigs} standard combo kit(s) configured` },
      "customize-kits": { count: customKitsCount, is_urgent: false, tooltip: `${customKitsCount} custom kit(s) configured` },
      "ADM_CUSTOMIZE_KITS": { count: customKitsCount, is_urgent: false, tooltip: `${customKitsCount} custom kit(s) configured` },
      "bulk-combo-kits": { count: bulkKitsCount, is_urgent: false, tooltip: `${bulkKitsCount} bulk combo kit rule(s)` },
      "ADM_BULK_COMBO": { count: bulkKitsCount, is_urgent: false, tooltip: `${bulkKitsCount} bulk combo kit rule(s)` },
      "combo-kit-variants": { count: kitVariantsCount, is_urgent: false, tooltip: `${kitVariantsCount} combo kit variant(s)` },
      "ADM_COMBO_KIT_VARIANTS": { count: kitVariantsCount, is_urgent: false, tooltip: `${kitVariantsCount} combo kit variant(s)` },
      "pincode-delivery-costs": { count: pincodeCostsCount, is_urgent: false, tooltip: `${pincodeCostsCount} pincode delivery rate(s)` },
      "ADM_PINCODE_COSTS": { count: pincodeCostsCount, is_urgent: false, tooltip: `${pincodeCostsCount} pincode delivery rate(s)` },
      "best-seller": { count: bestSellersCount, is_urgent: false, tooltip: `${bestSellersCount} best seller kit(s)` },
      "ADM_BEST_SELLER": { count: bestSellersCount, is_urgent: false, tooltip: `${bestSellersCount} best seller kit(s)` },
      "product-datasheets": { count: missingDatasheetsCount, is_urgent: missingDatasheetsCount > 0, tooltip: `${missingDatasheetsCount} kit(s) missing datasheet` },
      "ADM_PRODUCT_DATASHEETS": { count: missingDatasheetsCount, is_urgent: missingDatasheetsCount > 0, tooltip: `${missingDatasheetsCount} kit(s) missing datasheet` },

      // ── Delivery Management ──────────────────────────────────
      "approval-queue": { count: deliveryApprovalQueueCount, is_urgent: deliveryApprovalQueueCount > 0, tooltip: `${deliveryApprovalQueueCount} order(s) awaiting delivery approval` },
      "fleet": { count: liveFleetCount, is_urgent: false, tooltip: `${liveFleetCount} vehicle(s) in active fleet` },
      "providers": { count: transportVendorsCount, is_urgent: false, tooltip: `${transportVendorsCount} transport vendor(s)` },
      "vehicle-master": { count: vehicleMasterCount, is_urgent: false, tooltip: `${vehicleMasterCount} vehicle model(s) in catalog` },
      "kit-weights": { count: kitWeightsCount, is_urgent: false, tooltip: `${kitWeightsCount} kit weight rule(s)` },
      "cost-settings": { count: deliveryCostRulesCount, is_urgent: false, tooltip: `${deliveryCostRulesCount} delivery cost benchmark(s)` },
      "routes": { count: deliveryRoutesCount, is_urgent: false, tooltip: `${deliveryRoutesCount} active delivery route(s)` },
      "delivery-dashboard": { count: deliveryDispatchesCount, is_urgent: false, tooltip: `${deliveryDispatchesCount} active dispatch movement(s)` },

      // ── Margin & Commission ──────────────────────────────────
      "company-margin": { count: pipeline.marginCount, is_urgent: pipeline.marginCount > 0, tooltip: `${pipeline.marginCount} kit(s) pending company margin` },
      "offers": { count: offersCount, is_urgent: false, tooltip: `${offersCount} active promotional offer(s)` },
      "offers-management": { count: offersCount, is_urgent: false, tooltip: `${offersCount} active promotional offer(s)` },

      // ── Order Management Settings ────────────────────────────
      "overdue-settings": { count: overdueOrdersCount, is_urgent: overdueOrdersCount > 0, tooltip: `${overdueOrdersCount} overdue order(s) requiring action` },

      // ── Franchisee Management ────────────────────────────────
      "onboarding": { count: storeOnboardingCount, is_urgent: storeOnboardingCount > 0, tooltip: `${storeOnboardingCount} store onboarding request(s) awaiting review` },
      "leads": { count: franchiseLeadsCount, is_urgent: false, tooltip: `${franchiseLeadsCount} franchise lead(s) in review` },
      "orders": { count: franchiseeOrdersCount, is_urgent: true, tooltip: `${franchiseeOrdersCount} franchise order(s) in pipeline` },
      "wallet": { count: franchiseePayoutsCount, is_urgent: franchiseePayoutsCount > 0, tooltip: `${franchiseePayoutsCount} payout request(s) awaiting review` },
      "resellers": { count: activeStoresCount, is_urgent: false, tooltip: `${activeStoresCount} active franchise store(s)` },

      // ── EPC Quote Management ─────────────────────────────────
      "quote-settings": { count: quoteMgmt, is_urgent: false, tooltip: `${quoteMgmt} active custom quote request(s)` },

      // ── Know My Margin ───────────────────────────────────────
      "project-bom-settings": { count: knowMyMargin, is_urgent: false, tooltip: `${knowMyMargin} active project BOM item(s)` },

      // ── Payment Configuration ────────────────────────────────
      "offline-approvals": { count: paymentConfig, is_urgent: paymentConfig > 0, tooltip: `${paymentConfig} offline payment(s) awaiting verification` },
    };

    const counts = {
      // Step indices (01 to 16)
      "01": 0, // Dashboard overview
      "02": epcApprovals,
      "03": kitConfigs,
      "04": poOrders,
      "05": looseOrders,
      "06": epcOrders,
      "07": stageApprovals,
      "08": deliveryMgmt,
      "09": pipeline.marginCount,
      "10": pipeline.activationCount,
      "11": overdueOrdersCount, // Order Management Settings (overdue orders)
      "12": serviceTickets,
      "13": franchiseeMgmt,
      "14": quoteMgmt,
      "15": knowMyMargin,
      "16": paymentConfig,

      // Unique ID & module key mapping
      ADM_DASHBOARD: 0,
      ADM_APPROVE_EPC: epcApprovals,
      ADM_COMBO_CFG: kitConfigs,
      ADM_PO_ORDERS: poOrders,
      ADM_LOOSE_ORDERS: looseOrders,
      ADM_EPC_ORDERS: epcOrders,
      ADM_ORDER_APPROVALS: stageApprovals,
      ADM_DELIVERY_MGMT: deliveryMgmt,
      ADM_CO_MARGIN: pipeline.marginCount,
      ADM_WH_KIT_ACT: pipeline.activationCount,
      ADM_ORDER_SETTINGS: overdueOrdersCount,
      ADM_SKT_MGMT: serviceTickets,
      RSL_MGMT: franchiseeMgmt,
      ADM_QUOTE_MGMT: quoteMgmt,
      ADM_KMM: knowMyMargin,
      ADM_PAYMENT_CONFIG: paymentConfig,

      // Direct pending alert flags
      company_margin: {
        has_pending: pipeline.marginCount > 0,
        count: pipeline.marginCount,
      },
      kit_activations: {
        has_pending: pipeline.activationCount > 0,
        count: pipeline.activationCount,
      },
      total_active_movements:
        epcApprovals +
        poOrders +
        looseOrders +
        epcOrders +
        stageApprovals +
        deliveryMgmt +
        pipeline.marginCount +
        pipeline.activationCount +
        serviceTickets +
        franchiseeMgmt +
        quoteMgmt +
        paymentConfig,

      // Sub-menu granular breakdown counts
      sub_counts,
    };

    return res.status(200).json({
      status: 'success',
      data: counts,
    });
  } catch (error) {
    console.error('[get_sidebar_counts error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to calculate sidebar counts',
      error: error.message,
    });
  }
};

module.exports = {
  get_sidebar_counts,
};
