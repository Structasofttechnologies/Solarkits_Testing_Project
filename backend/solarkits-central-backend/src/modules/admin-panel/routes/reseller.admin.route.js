/**
 * reseller.admin.route.js
 *
 * Admin routes for Reseller Management (Reseller List, Detail, KYC Review, Activation Control).
 * Prefix: /admin-api/reseller-mgmt
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.admin.handler');

router.get(
  '/list',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['view'] },
    { unique_code: 'RSL_TERRITORY', permissions: ['view'] },
    { unique_code: 'RSL_PRODAUTH', permissions: ['view'] },
    { unique_code: 'RSL_PROD_AUTH', permissions: ['view'] },
    { unique_code: 'RSL_EPC', permissions: ['view'] },
    { unique_code: 'RSL_ORDER', permissions: ['view'] },
    { unique_code: 'RSL_WALLET', permissions: ['view'] },
    { unique_code: 'RSL_PLAN', permissions: ['view'] },
    { unique_code: 'RSL_KYC', permissions: ['view'] },
  ]),
  handler.list_resellers
);

router.get(
  '/detail/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_MGMT', permissions: ['view'] }]),
  handler.get_reseller_detail
);

router.put(
  '/kyc/review/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_KYC', permissions: ['edit'] }]),
  handler.review_kyc
);

router.put(
  '/activation-status/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_MGMT', permissions: ['edit'] }]),
  handler.change_activation_status
);

router.post(
  '/gst-verify',
  check_auth,
  check_permissions([{ unique_code: 'RSL_GST_VERIFY', permissions: ['add', 'edit'] }]),
  handler.verify_gstin_admin
);

router.get(
  '/activation-readiness/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_MGMT', permissions: ['view'] }]),
  handler.get_activation_readiness
);

router.get(
  '/epc-conflicts',
  check_auth,
  check_permissions([{ unique_code: 'RSL_EPC_CONFLICT', permissions: ['view'] }, { unique_code: 'RSL_EPC', permissions: ['view'] }]),
  handler.list_epc_conflicts
);

router.put(
  '/epc-transfer/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_EPC_TRANSFER', permissions: ['edit'] }, { unique_code: 'RSL_EPC', permissions: ['edit'] }]),
  handler.review_epc_transfer
);

router.put(
  '/fee-payment/verify/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_MGMT', permissions: ['edit'] }, { unique_code: 'RSL_PLAN', permissions: ['edit'] }]),
  handler.verify_fee_payment_receipt
);

router.put(
  '/:id/fee-payment/verify',
  check_auth,
  check_permissions([{ unique_code: 'RSL_MGMT', permissions: ['edit'] }, { unique_code: 'RSL_PLAN', permissions: ['edit'] }]),
  handler.verify_fee_payment_receipt
);

router.get('/razorpay/status', check_auth, handler.get_razorpay_status);
router.post('/refunds/process', check_auth, handler.process_order_refund_admin);
router.get('/webhook-logs', check_auth, handler.list_webhook_logs);

module.exports = router;

