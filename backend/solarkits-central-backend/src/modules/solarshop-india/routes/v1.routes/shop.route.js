const express = require("express");
const router = express.Router();
const {
  get_combo_kits_by_district,
  get_best_seller_kits,
  get_inventory_status,
  get_checkout_settings,
  get_active_offers,
  reserve_stock,
  confirm_order,
  get_cart,
  update_cart,
  create_request_order,
  get_gst_status,
  gst_generate_otp,
  gst_verify_otp,
  checkout_send_phone_otp,
  checkout_verify_phone_otp,
  get_orders,
  update_order_address,
  get_bos_kits,
  save_bos_kits,
  create_or_update_bos_kit,
  delete_bos_kit,
  toggle_bos_kit_stock,
  get_bos_custom_catalog,
  save_bos_custom_catalog,
  get_nearby_stores,
  get_shop_hierarchy,
  get_company_bank_details,
  check_warehouse_stock,
  checkout_warehouse_capacity_check,
  calculate_pincode_delivery_cost,
  create_epc_offline_checkout,
  resubmit_epc_offline_payment,
  get_epc_order_invoice_data,
  get_epc_po_allocations,
  submit_epc_po_receipt,
  verify_epc_po_payment,
  pay_epc_po_token,
  get_epc_contract_details,
  send_epc_contract_otp,
  verify_epc_contract_otp,
  get_signed_contract_document,
  list_epc_po_orders,
  get_epc_active_po_quotas,
  create_epc_po_order,
  preview_epc_po_penalty,
  request_epc_po_refund,
  reorder_against_epc_po,
  upload_epc_po_receipt,
  submit_epc_milestone_payment,
  resolve_payment_milestones
} = require("../../controller/v1.handlers/shop.handler");

const { verify_reseller_auth } = require('../../middlewares/verify_reseller_auth');

const { verify_auth, optional_auth } = require("../../middlewares/auth");
const { upload_any_files } = require("../../../admin-panel/utils/upload.files");
const epcReceiptUpload = upload_any_files('public/uploads/epc_receipts', 10);

const { get_epc_catalogue } = require("../../controller/epc.catalogue.handler");

router.get("/hierarchy", get_shop_hierarchy);
router.get("/industry-types", get_shop_hierarchy);
router.get("/stores", get_nearby_stores);
router.get("/combo-kits", optional_auth, get_combo_kits_by_district);
router.get("/best-sellers", optional_auth, get_best_seller_kits);
router.get("/delivery-cost/calculate", calculate_pincode_delivery_cost);
router.get("/epc-catalogue", verify_auth, get_epc_catalogue);
router.get("/epc-catalogue/status", verify_auth, require("../../controller/epc.catalogue.handler").get_epc_catalogue_status);
router.get("/bos-kits", get_bos_kits);
router.post("/bos-kits", save_bos_kits);
router.post("/bos-kits/save-single", create_or_update_bos_kit);
router.delete("/bos-kits/:id", delete_bos_kit);
router.post("/bos-kits/delete", delete_bos_kit);
router.patch("/bos-kits/:id/stock", toggle_bos_kit_stock);
router.post("/bos-kits/toggle-stock", toggle_bos_kit_stock);
router.get("/bos-custom-catalog", get_bos_custom_catalog);
router.post("/bos-custom-catalog", save_bos_custom_catalog);
router.get("/inventory-status", get_inventory_status);
router.get("/checkout-settings", get_checkout_settings);
router.get("/active-offers", get_active_offers);
router.post("/reserve-stock", verify_auth, reserve_stock);
router.post("/confirm-order", verify_auth, confirm_order);
router.post("/request-order", verify_auth, create_request_order);
router.get("/gst/status", verify_auth, get_gst_status);
router.post("/gst/generate-otp", verify_auth, gst_generate_otp);
router.post("/gst/verify-otp", verify_auth, gst_verify_otp);

// ── EPC Profile, Multi-State GST Onboarding, Multi-District Offices & Sub-Users ─
const epcProfileHandler = require("../../controller/v1.handlers/epc.profile.handler");
const epcOfficePhotoUpload = upload_any_files('public/uploads/epc_offices', 10);

router.get("/epc/profile", verify_auth, epcProfileHandler.get_epc_profile);
router.post("/epc/gst/lookup", verify_auth, epcProfileHandler.lookup_gst_details);
router.post("/epc/onboard-state", verify_auth, epcProfileHandler.onboard_state_gst);
router.get("/epc/offices", verify_auth, epcProfileHandler.get_epc_offices);
router.post("/epc/offices", verify_auth, epcOfficePhotoUpload, epcProfileHandler.add_epc_office);
router.put("/epc/offices/:id", verify_auth, epcOfficePhotoUpload, epcProfileHandler.update_epc_office);
router.patch("/epc/offices/:id/set-home", verify_auth, epcProfileHandler.set_home_office);
router.delete("/epc/offices/:id", verify_auth, epcProfileHandler.delete_epc_office);

router.get("/epc/users", verify_auth, epcProfileHandler.get_epc_users);
router.post("/epc/users", verify_auth, epcProfileHandler.create_epc_user);
router.put("/epc/users/:id", verify_auth, epcProfileHandler.update_epc_user);
router.delete("/epc/users/:id", verify_auth, epcProfileHandler.delete_epc_user);

// ── Checkout phone OTP (same proven flow as forgot-password OTP) ──────────────
router.post("/checkout/send-phone-otp", verify_auth, checkout_send_phone_otp);
router.post("/checkout/verify-phone-otp", verify_auth, checkout_verify_phone_otp);

router.get("/cart", verify_auth, get_cart);
router.post("/cart", verify_auth, update_cart);
router.get("/orders", verify_auth, get_orders);
router.put("/orders/:id/address", verify_auth, update_order_address);

// ── EPC Offline Bank Transfer Checkout & Order Tracking Routes ─────────────
router.get("/bank-details", get_company_bank_details);
router.get("/check-warehouse-stock", optional_auth, check_warehouse_stock);
// Module 1.1: Pre-checkout warehouse capacity validation
router.get("/checkout/warehouse-capacity-check", optional_auth, checkout_warehouse_capacity_check);
router.post("/offline-checkout/create", verify_auth, epcReceiptUpload, create_epc_offline_checkout);
router.post("/offline-checkout/:id/resubmit", verify_auth, epcReceiptUpload, resubmit_epc_offline_payment);
router.get("/orders/:id/invoice-data", verify_auth, get_epc_order_invoice_data);
// Product-wise payment milestone routes
router.get("/payment-milestones/resolve", resolve_payment_milestones);
router.post("/orders/:id/milestone-payment", verify_auth, epcReceiptUpload, submit_epc_milestone_payment);

// ── EPC PO Allocations from Franchisees ───────────────────────────────────
router.get("/po-allocations", verify_auth, get_epc_po_allocations);
router.post("/po-allocations/:poId/upload-receipt", verify_auth, epcReceiptUpload, submit_epc_po_receipt);
router.post("/po-allocations/:poId/pay-token", verify_auth, pay_epc_po_token);

// ── EPC PO Contract & Mobile OTP Verification ─────────────────────────────
router.get("/po-allocations/:poId/contract", verify_auth, get_epc_contract_details);
router.post("/po-allocations/:poId/send-contract-otp", verify_auth, send_epc_contract_otp);
router.post("/po-allocations/:poId/verify-contract-otp", verify_auth, verify_epc_contract_otp);
router.get("/po-allocations/:poId/signed-contract", get_signed_contract_document);

// ── Reseller/Franchisee verifies an EPC buyer's payment receipt ────────────
// Called from the Reseller Portal /orders detail modal
// POST body: { epc_buyer_id, action: 'verify'|'reject', rejection_note? }
router.post("/po-allocations/:poId/verify-epc-receipt", verify_reseller_auth, verify_epc_po_payment);

// ── Direct Solar EPC PO Orders Lifecycle & Reordering ─────────────
router.get("/po/my-orders", verify_auth, list_epc_po_orders);
router.get("/po/active-quotas", verify_auth, get_epc_active_po_quotas);
router.post("/po/create", verify_auth, create_epc_po_order);
router.get("/po/:id/penalty-preview", verify_auth, preview_epc_po_penalty);
router.post("/po/:id/request-refund", verify_auth, request_epc_po_refund);
router.post("/po/upload-receipt", verify_auth, epcReceiptUpload, upload_epc_po_receipt);
router.post("/po/:id/reorder", verify_auth, reorder_against_epc_po);

// ── EPC Industry Content Dashboard Routes ─────────────────────────────────────
// These routes serve industry-aware content to authenticated EPC buyers.
// All requests validated: JWT + approved UserIndustryMap.
const epcIndustryHandler = require("../../controller/epc.industry.dashboard.handler");
router.get("/industry/my-industries", verify_auth, epcIndustryHandler.get_my_industries);
router.get("/industry/dashboard-content", verify_auth, epcIndustryHandler.get_dashboard_content);
router.get("/industry/theme", verify_auth, epcIndustryHandler.get_industry_theme);

// ── Technical Specifications & Combined Kit Datasheet (Storefront) ───────
const { get_or_create_settings } = require('../../../admin-panel/controller/datasheet_settings.handler');
const { getCombinedKitDatasheetData, generateCombinedDatasheetPdf } = require('../../../admin-panel/utils/datasheet.generator');

router.get("/datasheet-settings", async (req, res) => {
  try {
    const settings = await get_or_create_settings();
    return res.status(200).json({ status: "success", data: settings });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

router.get("/combokit/:id/combined-datasheet", async (req, res) => {
  try {
    const data = await getCombinedKitDatasheetData(req.params.id);
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

router.get("/combokit/:id/combined-datasheet-pdf", async (req, res) => {
  try {
    const data = await getCombinedKitDatasheetData(req.params.id);
    await generateCombinedDatasheetPdf(data, res);
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// ── EPC Quotations (BDE / Franchisee generated quotations for this EPC) ───────
const epcQuotesHandler = require("../../controller/epc.quotes.handler");
router.get("/quotes", verify_auth, epcQuotesHandler.list_quotes);
router.get("/quotes/dashboard", verify_auth, epcQuotesHandler.get_dashboard);
router.get("/quotes/:id", verify_auth, epcQuotesHandler.get_quote);
router.get("/quotes/:id/pdf", verify_auth, epcQuotesHandler.get_pdf);

module.exports = router;

