const express = require("express");
const router = express.Router();
const {
  get_states,
  get_districts_by_state,
  get_district_boundary,
  lookup_pincode,
  search_pincodes,
  get_district_pincodes
} = require("../../controller/v1.handlers/geo.handler");
const { optional_auth } = require("../../middlewares/auth");

router.get("/states", optional_auth, get_states);
router.get("/districts", optional_auth, get_districts_by_state);
router.get("/district-boundary", get_district_boundary);
router.get("/pincode-lookup", optional_auth, lookup_pincode);
router.get("/pincodes-search", optional_auth, search_pincodes);
router.get("/district-pincodes/:district_id", optional_auth, get_district_pincodes);
router.get("/district-pincodes", optional_auth, get_district_pincodes);

module.exports = router;
