const express = require("express");
const router = express.Router();

const check_auth = require("../middlewares/check.auth");
const check_permissions = require("../middlewares/check.permissions");
const handler = require("../controller/brand.manufacturer.handler");
const { upload_files } = require("../utils/upload.files");

// ================= BRAND ROUTES =================

// Add Brand (with logo upload)
router.post(
    "/add-brand",
    check_auth,
    check_permissions([{ unique_code: "ADM_MFG_BRANDS", permissions: ["add"] }]),
    upload_files("public/uploads/brands", 5, "logo", 1),
    handler.add_brand
);

// Get Brands
router.get(
    "/get-brands",
    check_auth,
    check_permissions([
        { unique_code: "ADM_MFG_BRANDS", permissions: ["view"] },
        { unique_code: "ADM_ORDER_SETTINGS", permissions: ["view"] }
    ]),
    handler.get_brands
);

router.get(
    "/get-brands-with-logo-name-only",
    check_auth,
    check_permissions([
        { unique_code: "ADM_PROD_TMPL", permissions: ["view"] },
        { unique_code: "ADM_SKU", permissions: ["view"] },
        { unique_code: "ADM_SOLAR_KITS", permissions: ["view"] },
        { unique_code: "ADM_CUSTOMIZE_KITS", permissions: ["view"] }
    ]),
    handler.get_brands_with_logo_name_only
);

// Update Brand - CHANGE FROM POST TO PUT
router.put(
    "/update-brand/:id",
    check_auth,
    check_permissions([{ unique_code: "ADM_MFG_BRANDS", permissions: ["edit"] }]),
    upload_files("public/uploads/brands", 5, "logo", 1),
    handler.update_brand
);

// Delete Brand - CHANGE FROM POST TO DELETE
router.delete(
    "/delete-brand/:id",
    check_auth,
    check_permissions([{ unique_code: "ADM_MFG_BRANDS", permissions: ["delete"] }]),
    handler.delete_brand
);

module.exports = router;