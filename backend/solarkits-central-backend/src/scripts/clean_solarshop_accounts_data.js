require('dotenv').config();
require('../keys/config/databases');
const {
  Reseller,
  ResellerPlanSubscription,
  EpcOrder,
  ResellerWallet,
  ResellerWalletLedger,
  ResellerPayoutRequest,
  EpcCheckoutLog,
  RazorpayWebhookLog,
  ResellerInventoryLedger
} = require('../modules/admin-panel/models/india_solarshop_db');
const Cart = require('../modules/solarshop-india/models/india_solarshop_db/cart.schema');
const InventoryReservation = require('../modules/solarshop-india/models/india_solarshop_db/inventory_reservations.schema');

setTimeout(async () => {
  try {
    console.log('🧹 Starting Solar Shop accounts data cleanup...');

    // 1. Delete all plan subscriptions
    const subRes = await ResellerPlanSubscription.deleteMany({});
    console.log('Deleted Plan Subscriptions:', subRes.deletedCount);

    // 2. Delete all EPC Orders
    const orderRes = await EpcOrder.deleteMany({});
    console.log('Deleted EPC Orders:', orderRes.deletedCount);

    // 3. Delete all Wallet Ledgers
    const ledgerRes = await ResellerWalletLedger.deleteMany({});
    console.log('Deleted Wallet Ledgers:', ledgerRes.deletedCount);

    // 4. Delete all Payout Requests
    const payoutRes = await ResellerPayoutRequest.deleteMany({});
    console.log('Deleted Payout Requests:', payoutRes.deletedCount);

    // 5. Delete all Wallets
    const walletRes = await ResellerWallet.deleteMany({});
    console.log('Deleted Reseller Wallets:', walletRes.deletedCount);

    // 6. Delete all Checkout Logs
    const checkoutRes = await EpcCheckoutLog.deleteMany({});
    console.log('Deleted Checkout Logs:', checkoutRes.deletedCount);

    // 7. Delete all Webhook Logs
    const webhookRes = await RazorpayWebhookLog.deleteMany({});
    console.log('Deleted Webhook Logs:', webhookRes.deletedCount);

    // 8. Delete all Reseller Inventory Ledgers
    const invRes = await ResellerInventoryLedger.deleteMany({});
    console.log('Deleted Reseller Inventory Ledgers:', invRes.deletedCount);

    // 9. Delete Carts and Stock Reservations
    if (Cart) {
      const cartRes = await Cart.deleteMany({});
      console.log('Deleted Carts:', cartRes.deletedCount);
    }
    if (InventoryReservation) {
      const resRes = await InventoryReservation.deleteMany({});
      console.log('Deleted Inventory Reservations:', resRes.deletedCount);
    }

    // 10. Reset Reseller plan_subscription_id and activation status
    const resellerReset = await Reseller.updateMany({}, {
      $set: {
        plan_subscription_id: null,
        activation_status: 'pending'
      }
    });
    console.log('Reset Resellers plan status:', resellerReset.modifiedCount);

    console.log('✅ ALL Solar Shop Account & Transaction data successfully cleared for fresh testing!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }
}, 3000);
