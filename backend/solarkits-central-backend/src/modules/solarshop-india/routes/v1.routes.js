const express = require("express");
const router = express.Router();

router.use("/auth", require("./v1.routes/auth.route"));
router.use("/geo", require("./v1.routes/geo.route"));
router.use("/shop", require("./v1.routes/shop.route"));
router.use("/reseller", require("./v1.routes/reseller.portal.route"));
router.use("/bde", require("./v1.routes/bde.portal.route"));
router.use("/estimator", require("./v1.routes/estimator.route"));
router.use("/estimates", require("./v1.routes/estimates.route"));
router.use("/website-leads", require("../../admin-panel/routes/website.epc.lead.route"));
router.use("/franchise-clusters", require("../../admin-panel/routes/franchisee.cluster.route"));

module.exports = router;
