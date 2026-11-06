const EpcAccount = require('./EpcAccount.schema');
const EpcSignupRequest = require('./EpcSignupRequest.schema');
const EpcType = require('./epc_types.schema');
const EpcResellerRelationship = require('./epc_reseller_relationships.schema');
const EpcTransferRequest = require('./epc_transfer_requests.schema');
const WarehouseComboKit = require('./combo_kits.schema');
const PoSetting = require('./po_settings.schema');
const CompanyMargin = require('./company_margin.schema');
const BulkKitSetting = require('./bulk_kit_settings.schema');
const PurchaseOrder = require('./purchase_order.schema');
const OfferMaster = require('./offer_masters.schema');
const SolarShopSettings = require('./solarshop_settings.schema');
const InventoryReservation = require('./inventory_reservations.schema');
const ComboBundleMaster = require('./combo_bundle_masters.schema');
const ComboKitVariant = require('./combo_kit_variants.schema');
const PincodeDeliveryCost = require('./pincode_delivery_costs.schema');
const BestSellerKit = require('./best_seller_kits.schema');
const LooseOrderSettings = require('./loose_order_settings.schema');

// --- Phase 1: Reseller Management Masters ---
const ResellerType = require('./reseller_types.schema');
const FranchiseeSubtype = require('./franchisee_subtypes.schema');
const StoreStatusHistory = require('./store_status_history.schema');
const CompanyStoreBdeAssignment = require('./company_store_bde_assignments.schema');

// --- Phase 2: Reseller Accounts, KYC, Plans & Audit ---
const Reseller = require('./resellers.schema');
const ResellerKyc = require('./reseller_kyc.schema');
const ResellerPlan = require('./reseller_plans.schema');
const ResellerPlanSubscription = require('./reseller_plan_subscriptions.schema');
const ResellerAgreement = require('./reseller_agreements.schema');
const FranchiseLead = require('./franchise_leads.schema');
const GstVerificationLog = require('./gst_verification_logs.schema');
const AuditLog = require('./audit_logs.schema');

// --- Phase 3: Territory Management ---
const ResellerTerritory = require('./reseller_territories.schema');
const TerritoryAssignmentHistory = require('./territory_assignment_history.schema');

// --- Phase 4: Product Authorization Matrix ---
const ResellerProductAuthorization = require('./reseller_product_authorizations.schema');
const DistrictProductRule = require('./district_product_rules.schema');

// --- Phase R6: Reseller Procurement & Stock Ledger ---
const ResellerProcurementOrder = require('./reseller_procurement_orders.schema');
const ResellerInventoryLedger = require('./reseller_inventory_ledgers.schema');

// --- Phase R7: Listings & MAP Pricing Rules ---
const ResellerListing = require('./reseller_listings.schema');
const ResellerPricingRule = require('./reseller_pricing_rules.schema');

// --- Phase R8: EPC Purchase Flow & Checkout Logs ---
const EpcOrder = require('./epc_orders.schema');
const EpcCheckoutLog = require('./epc_checkout_logs.schema');
const ProductPaymentMilestone = require('./product_payment_milestones.schema');

// --- Phase 7: Commission Engine & Wallet Ledger ---
const ResellerWallet = require('./reseller_wallets.schema');
const ResellerWalletLedger = require('./reseller_wallet_ledgers.schema');
const ResellerPayoutRequest = require('./reseller_payout_requests.schema');

// --- Phase 8: EPC Wallet & Ledger ---
const EpcWallet = require('./epc_wallets.schema');
const EpcWalletLedger = require('./epc_wallet_ledgers.schema');
const RazorpayWebhookLog = require('./razorpay_webhook_logs.schema');

// --- Phase FPO: Franchisee PO Ordering, Commission, Goal & Performance System ---
const FranchiseeCommissionRule = require('./franchisee_commission_rules.schema');
const FranchiseeVariationCommission = require('./franchisee_variation_commissions.schema');
const FranchiseePlanPoSetting = require('./franchisee_plan_po_settings.schema');
const FranchiseeMoqRule = require('./franchisee_moq_rules.schema');
const FranchiseeKitTarget = require('./franchisee_kit_targets.schema');
const FranchiseeTargetProgress = require('./franchisee_target_progress.schema');
const FpoOrder = require('./fpo_orders.schema');
const FpoCommissionLedger = require('./fpo_commission_ledgers.schema');
const PoRefundRequest = require('./po_refund_requests.schema');
const FranchiseeAlert = require('./franchisee_alerts.schema');
const FranchiseeAlertConfig = require('./franchisee_alert_configs.schema');

// --- Phase BDE: SolarKits BDE Management, KYC, Territory & Goal System ---
const BDEProfile = require('./bde_profiles.schema');
const BDEKYC = require('./bde_kyc.schema');
const BDETerritoryAssignment = require('./bde_territory_assignments.schema');
const BDEPlanAssignment = require('./bde_plan_assignments.schema');
const BDEGoal = require('./bde_goals.schema');
const BDEActivityLog = require('./bde_activity_logs.schema');
const BDENotification = require('./bde_notifications.schema');

// --- Step 2: BDE Leads, Activities & Territory Exceptions ---
const BDELead = require('./bde_leads.schema');
const BDELeadActivity = require('./bde_lead_activities.schema');
const BDEFollowUp = require('./bde_follow_ups.schema');
const BDEReassignmentHistory = require('./bde_reassignment_histories.schema');
const TerritoryExceptionRequest = require('./territory_exception_requests.schema');

// --- Step 3: Franchisee Store Setup, Operations & Expansion Planning ---
const StoreSetup = require('./store_setups.schema');
const StoreSetupSetting = require('./store_setup_settings.schema');
const StoreSetupChecklist = require('./store_setup_checklists.schema');
const StoreSetupDelay = require('./store_setup_delays.schema');
const StoreSetupVerification = require('./store_setup_verifications.schema');
const ExpansionPlan = require('./expansion_plans.schema');

// --- BDE EPC Management ---
const EPCLead = require('./epc_leads.schema');

// --- Phase Q: EPC Quotation & Follow-up Module ---
const EpcQuote = require('./epc_quotes.schema');
const EpcQuoteFollowup = require('./epc_quote_followups.schema');
const EpcQuoteActivity = require('./epc_quote_activities.schema');
const QuoteSettings = require('./quote_settings.schema');
const QuoteWarrantyOption = require('./quote_warranty_options.schema');

// --- Phase KMM: Know My Margin Module ---
const ProjectBomItem = require('./project_bom_items.schema');
const BomRateHistory = require('./bom_rate_history.schema');
const EpcMarginEstimate = require('./epc_margin_estimates.schema');
const EstimatorSettings = require('./estimator_settings.schema');

// --- Delivery Management & Route Consolidation Module ---
const DeliveryVehicleMaster = require('./vehicle_master.schema');
const DeliveryServiceProvider = require('./delivery_service_provider.schema');
const DeliveryVehicleFleet = require('./delivery_vehicle_fleet.schema');
const ComboKitWeightMaster = require('./combokit_weight_master.schema');
const DeliveryCostBenchmark = require('./delivery_cost_benchmark.schema');
const KitDeliveryCostRule = require('./kit_delivery_cost_rule.schema');
const DeliveryRouteSetting = require('./delivery_route_setting.schema');
const DeliveryOrder = require('./delivery_order.schema');
const RegionPaymentConfig = require('./region_payment_configs.schema');
const AdminNotification = require('./admin_notifications.schema');
const BenchmarkApprovalConfig = require('./BenchmarkApprovalConfig.schema');

module.exports = {
  RegionPaymentConfig,
  AdminNotification,
  EpcAccount,
  EpcSignupRequest,
  EpcType,
  EpcResellerRelationship,
  EpcTransferRequest,
  WarehouseComboKit,
  ComboKit: WarehouseComboKit,
  PoSetting,
  CompanyMargin,
  BulkKitSetting,
  PurchaseOrder,
  OfferMaster,
  SolarShopSettings,
  InventoryReservation,
  ComboBundleMaster,
  ComboKitVariant,
  PincodeDeliveryCost,
  BestSellerKit,
  LooseOrderSettings,
  // --- Phase 1: Reseller Management Masters ---
  ResellerType,
  FranchiseeSubtype,
  StoreStatusHistory,
  CompanyStoreBdeAssignment,
  // --- Phase 2: Reseller Accounts, KYC, Plans & Audit ---
  Reseller,
  ResellerKyc,
  ResellerPlan,
  ResellerPlanSubscription,
  ResellerAgreement,
  FranchiseLead,
  GstVerificationLog,
  AuditLog,
  // --- Phase 3: Territory Management ---
  ResellerTerritory,
  TerritoryAssignmentHistory,
  // --- Phase 4: Product Authorization Matrix ---
  ResellerProductAuthorization,
  DistrictProductRule,
  // --- Phase R6: Reseller Procurement & Stock Ledger ---
  ResellerProcurementOrder,
  ResellerInventoryLedger,
  // --- Phase R7: Listings & MAP Pricing Rules ---
  ResellerListing,
  ResellerPricingRule,
  // --- Phase R8: EPC Purchase Flow & Checkout Logs ---
  EpcOrder,
  EpcCheckoutLog,
  // --- Phase 7: Wallet & Ledger ---
  ResellerWallet,
  ResellerWalletLedger,
  ResellerPayoutRequest,
  // --- Phase 8: EPC Wallet & Ledger ---
  EpcWallet,
  EpcWalletLedger,
  RazorpayWebhookLog,
  // --- Phase FPO: Franchisee PO Ordering, Commission, Goal & Performance ---
  FranchiseeCommissionRule,
  FranchiseeVariationCommission,
  FranchiseePlanPoSetting,
  FranchiseePlanPOSetting: FranchiseePlanPoSetting,
  FranchiseeMoqRule,
  FranchiseeKitTarget,
  FranchiseeTargetProgress,
  FpoOrder,
  FpoCommissionLedger,
  PoRefundRequest,
  FranchiseeAlert,
  FranchiseeAlertConfig,
  // --- Phase BDE: SolarKits BDE System ---
  BDEProfile,
  BdeProfile: BDEProfile,
  BDEKYC,
  BdeKyc: BDEKYC,
  BDETerritoryAssignment,
  BdeTerritoryAssignment: BDETerritoryAssignment,
  BDEPlanAssignment,
  BdePlanAssignment: BDEPlanAssignment,
  BDEGoal,
  BdeGoal: BDEGoal,
  BDEActivityLog,
  BdeActivityLog: BDEActivityLog,
  BDENotification,
  BdeNotification: BDENotification,
  // --- Step 2: BDE Leads, Activities & Reassignment ---
  BDELead,
  BdeLead: BDELead,
  BDELeadActivity,
  BdeLeadActivity: BDELeadActivity,
  BDEFollowUp,
  BdeFollowUp: BDEFollowUp,
  BDEReassignmentHistory,
  BdeReassignmentHistory: BDEReassignmentHistory,
  TerritoryExceptionRequest,
  // --- Step 3: Store Setup & Operations ---
  StoreSetup,
  StoreSetupSetting,
  StoreSetupChecklist,
  StoreSetupDelay,
  StoreSetupVerification,
  ExpansionPlan,
  EPCLead,
  EpcLead: EPCLead,
  // --- Phase Q: EPC Quotation & Follow-up Module ---
  EpcQuote,
  EpcQuoteFollowup,
  EpcQuoteActivity,
  QuoteSettings,
  QuoteWarrantyOption,
  // --- Phase KMM: Know My Margin Module ---
  ProjectBomItem,
  BomRateHistory,
  EpcMarginEstimate,
  EstimatorSettings,
  // --- Delivery Management & Route Consolidation Module ---
  DeliveryVehicleMaster,
  DeliveryServiceProvider,
  DeliveryVehicleFleet,
  ComboKitWeightMaster,
  DeliveryCostBenchmark,
  KitDeliveryCostRule,
  DeliveryRouteSetting,
  DeliveryOrder,
  // --- Payment Milestones Module ---
  ProductPaymentMilestone,
  // --- Benchmark Price Approval Module ---
  BenchmarkApprovalConfig,
  // --- Website EPC Bulk Leads Module ---
  WebsiteEpcLead: require('./website_epc_leads.schema'),
};
