const express = require("express");
const router = express.Router();

const check_auth = require("../middlewares/check.auth");
const check_permissions = require("../middlewares/check.permissions");
const handler = require("../controller/products.handler");
const dynamic_attribute_upload = require("../middlewares/dynamic.attribute.upload");

// ================= PRODUCT =================
router.post(
  "/create-product",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["add"] }]),
  dynamic_attribute_upload("product"),
  handler.create_product
);

router.put(
  "/update-product",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["edit"] }]),
  dynamic_attribute_upload("product"),
  handler.update_product
);

router.delete(
  "/delete-product",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["delete"] }]),
  handler.delete_product
);

router.get(
  "/get-products",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["view"] }, { unique_code: "ADM_BETCHMARK_PRICE_MASTER", permissions: ["view"] }, { unique_code: "RSL_PROD_AUTH", permissions: ["view"] }, { unique_code: "RSL_PRODAUTH", permissions: ["view"] }]),
  handler.get_products
);

const { upload_any_files } = require("../utils/upload.files");
const productUpload = upload_any_files("public/uploads/products", 5);

router.put(
  "/update-specifications",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["edit"] }]),
  handler.update_product_specifications
);

router.post(
  "/upload-datasheet",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["edit"] }]),
  productUpload,
  handler.upload_product_datasheet
);

router.post(
  "/remove-datasheet",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["edit"] }]),
  handler.remove_product_datasheet
);

// ================= SKU =================
router.post(
  "/add-sku",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["add"] }]),
  dynamic_attribute_upload("sku"),
  handler.add_sku
);

router.put(
  "/update-sku",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["edit"] }]),
  dynamic_attribute_upload("sku"),
  handler.update_sku
);

router.delete(
  "/delete-sku",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["delete"] }]),
  handler.delete_sku
);

router.get(
  "/get-skus-by-product",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["view"] }, { unique_code: "ADM_BETCHMARK_PRICE_MASTER", permissions: ["view"] }]),
  handler.get_skus_by_product
);

router.get(
  "/search-skus",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["view"] }, { unique_code: "ADM_SOLAR_KITS", permissions: ["view"] }, { unique_code: "ADM_COMBO_KITS", permissions: ["view"] }, { unique_code: "ADM_CUSTOMIZE_KITS", permissions: ["view"] }]),
  handler.search_skus
);

router.get(
  "/debug-search-skus",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["view"] }, { unique_code: "ADM_SOLAR_KITS", permissions: ["view"] }, { unique_code: "ADM_COMBO_KITS", permissions: ["view"] }, { unique_code: "ADM_CUSTOMIZE_KITS", permissions: ["view"] }]),
  handler.debug_search_skus
);

router.get(
  "/get-sku-details",
  check_auth,
  check_permissions([{ unique_code: "ADM_SKU", permissions: ["view"] }, { unique_code: "ADM_SOLAR_KITS", permissions: ["view"] }, { unique_code: "ADM_COMBO_KITS", permissions: ["view"] }, { unique_code: "ADM_CUSTOMIZE_KITS", permissions: ["view"] }, { unique_code: "ADM_BETCHMARK_PRICE_MASTER", permissions: ["view"] }]),
  handler.get_sku_details
);

module.exports = router;