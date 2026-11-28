const mongoose = require('mongoose');
const InventoryReservation = require('../models/india_solarshop_db/inventory_reservations.schema');
const EpcAccount = require('../models/india_solarshop_db/epc_accounts.schema');
const Cart = require('../models/india_solarshop_db/cart.schema');
const SolarShopSettings = require('../models/india_solarshop_db/solarshop_settings.schema');

const sendWhatsAppMessage = async (phone, message) => {
  try {
    if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`[WhatsApp Mock] Sending to +91${phone}: ${message}`);
      return;
    }
    const twilioClient = require('twilio');
    const twClient = twilioClient(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    await twClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
      to: `whatsapp:+91${phone}`,
    });
  } catch (error) {
    console.error("WhatsApp Message Error:", error.message || error);
  }
};

const runScheduler = async () => {
  try {
    const now = new Date();

    // 1. Release any expired solar panel reservations and clear corresponding carts
    const expiredResvDocs = await InventoryReservation.find({
      status: 'reserved',
      expiry_time: { $lt: now }
    }).lean();

    if (expiredResvDocs.length > 0) {
      const customerIdsToClear = [...new Set(expiredResvDocs.map(r => r.customer_id.toString()))];
      
      // Clear carts for customers whose checkout reservations expired
      for (const customerId of customerIdsToClear) {
        await Cart.updateOne(
          { account_id: new mongoose.Types.ObjectId(customerId) },
          { $set: { cart: [], updated_at: new Date() } }
        );
        console.log(`[Scheduler] Cleared expired cart for customer ${customerId} due to expired checkout reservation`);
      }

      const releaseResult = await InventoryReservation.updateMany(
        { status: 'reserved', expiry_time: { $lt: now } },
        { $set: { status: 'released' } }
      );
      console.log(`[Scheduler] Released ${releaseResult.modifiedCount} expired solar panel reservations`);
    }

    // 3. Find reservations expiring in <= 5 minutes that haven't received a reminder
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const nearExpiryResvs = await InventoryReservation.find({
      status: 'reserved',
      expiry_time: { $lte: fiveMinutesFromNow, $gt: now },
      reminder_sent: false
    });

    for (const resv of nearExpiryResvs) {
      resv.reminder_sent = true;
      await resv.save();

      const account = await EpcAccount.findById(resv.customer_id).lean();
      if (account && account.whatsapp) {
        const message = `⚠️ Your SolarKits solar kit cart reservation is expiring in 5 minutes! Complete your checkout now to secure your solar panels.`;
        await sendWhatsAppMessage(account.whatsapp, message);
        console.log(`[Scheduler] Sent 5-min checkout reservation warning to +91${account.whatsapp}`);
      }
    }

    // 4. Auto-expire and calculate penalty settlement for PO orders past validity
    try {
      const { processDailyExpiredPos } = require('../../admin-panel/services/po.penalty.service');
      const expiredPoSummary = await processDailyExpiredPos();
      if (expiredPoSummary.processed > 0) {
        console.log(`⏰ [Scheduler] Automatically processed ${expiredPoSummary.processed} expired POs with penalty calculation.`);
      }
    } catch (poErr) {
      console.error("[Scheduler PO Expiry Error]:", poErr);
    }

  } catch (err) {
    console.error("[Scheduler Error]:", err);
  }
};

// Run every 1 minute
console.log("⏰ Auto-Scheduler for Inventory Reservations initialized...");
setInterval(runScheduler, 60000);

module.exports = { runScheduler };

