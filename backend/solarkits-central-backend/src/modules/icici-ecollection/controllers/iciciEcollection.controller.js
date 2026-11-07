/**
 * ICICI Bank E-Collection Webhook & Transaction Controller
 *
 * Handles:
 * 1. MSG HOLD API (Real-time Validation)
 * 2. MIS POSTING API (Final Credit, Order Auto-Reconciliation & Real-time Alerting)
 * 3. Real-time SSE Payment Stream for Admin, Accounts, and Franchise Dashboards
 * 4. Virtual Account Info endpoint for EPC Buyer checkout
 */

const mongoose = require('mongoose');
const { decryptRequest, encryptResponse } = require('../utils/iciciCrypto.helper');
const { resolveVirtualAccount, getEpcVirtualAccount, getFranchiseVirtualAccount, ICICI_IFSC, BENEFICIARY_NAME } = require('../utils/virtualAccount.service');
const { registerClient, dispatchPaymentAlert } = require('../utils/paymentBroadcaster');
const IciciCollectionLog = require('../models/icici_collection_logs.schema');
const EpcAccount = require('../../admin-panel/models/india_solarshop_db/EpcAccount.schema');
const Reseller = require('../../admin-panel/models/india_solarshop_db/resellers.schema');
const EpcOrder = require('../../admin-panel/models/india_solarshop_db/epc_orders.schema');
const FpoOrder = require('../../admin-panel/models/india_solarshop_db/fpo_orders.schema');
const EpcWallet = require('../../admin-panel/models/india_solarshop_db/epc_wallets.schema');
const EpcWalletLedger = require('../../admin-panel/models/india_solarshop_db/epc_wallet_ledgers.schema');

/**
 * Helper to safely extract payload (supports both encrypted packets and testing packets)
 */
function extractPacketData(req) {
  const body = req.body;
  const isEncrypted = body && (body.encryptedData || body.encryptedKey);

  if (isEncrypted) {
    const decrypted = decryptRequest(body);
    return { payload: decrypted, isEncrypted: true, rawPacket: body };
  }

  // Raw JSON packet (for testing/UAT mock simulation)
  return { payload: body, isEncrypted: false, rawPacket: body };
}

/**
 * Format currency in Indian Rupees with commas
 */
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * 1. MSG HOLD API
 * Called by ICICI Bank when remitter initiates transaction to validate beneficiary before crediting.
 */
async function handleMsgHold(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  let payload = {};
  let isEncrypted = false;
  let rawPacket = null;

  try {
    const extracted = extractPacketData(req);
    payload = extracted.payload;
    isEncrypted = extracted.isEncrypted;
    rawPacket = extracted.rawPacket;

    const {
      ClientCode,
      VirtualAccountNumber,
      Mode,
      UTR,
      SenderRemark,
      ClientAccountNo,
      Amount,
      PayerName,
      PayerAccNumber,
      PayerBankIFSC,
      PayerPaymentDate,
      BankInternalTransactionNumber,
      USERID
    } = payload || {};

    if (!VirtualAccountNumber) {
      const rejectResponse = { AcceptOrReject: 'N', Message: 'Reject - Missing Virtual Account', Code: '12' };
      return res.status(200).json(isEncrypted ? encryptResponse(rejectResponse) : rejectResponse);
    }

    // Resolve Virtual Account Number against EPC buyers and Franchisees
    const resolution = await resolveVirtualAccount(VirtualAccountNumber);

    const isUatBypass = process.env.ICICI_UAT_AUTO_ACCEPT !== 'false';
    const isAcceptable = resolution.matched || isUatBypass || VirtualAccountNumber.toUpperCase().startsWith('SLRK');

    const amountNum = parseFloat(Amount) || 0;
    const amountPaise = Math.round(amountNum * 100);

    const bankResponse = isAcceptable
      ? { AcceptOrReject: 'Y', Message: 'Accept', Code: '11' }
      : { AcceptOrReject: 'N', Message: 'Reject', Code: '12' };

    // Record audit log
    await IciciCollectionLog.create({
      api_type: 'MSG_HOLD',
      client_code: ClientCode,
      virtual_account_number: VirtualAccountNumber,
      mode: Mode || 'RTGS',
      user_id: USERID,
      utr: UTR,
      sender_remark: SenderRemark,
      client_account_no: ClientAccountNo,
      amount: amountNum,
      amount_paise: amountPaise,
      payer_name: PayerName || '-',
      payer_acc_number: PayerAccNumber,
      payer_bank_ifsc: PayerBankIFSC,
      payer_payment_date: PayerPaymentDate,
      bank_internal_txn_number: BankInternalTransactionNumber,
      status: isAcceptable ? 'accepted' : 'rejected',
      response_code: bankResponse.Code,
      response_message: bankResponse.Message,
      reconciled_order_type: resolution.type || 'unmatched',
      reconciled_order_id: resolution.pendingOrder?._id || resolution.pendingPo?._id || null,
      reconciled_order_number: resolution.pendingOrder?.order_number || resolution.pendingPo?.po_number || null,
      epc_account_id: resolution.epc?._id || null,
      reseller_id: resolution.targetResellerId || null,
      raw_encrypted_request: rawPacket,
      decrypted_payload: payload,
      response_sent: bankResponse,
      ip_address: ip
    });

    const finalResponse = isEncrypted ? encryptResponse(bankResponse) : bankResponse;
    return res.status(200).json(finalResponse);

  } catch (err) {
    console.error('❌ [ICICI MSG_HOLD Error]:', err);
    // Deemed Accept or Reject fallback
    const deemedResponse = { AcceptOrReject: 'Y', Message: 'Accept', Code: '11' };
    return res.status(200).json(isEncrypted ? encryptResponse(deemedResponse) : deemedResponse);
  }
}

/**
 * 2. MIS POSTING API
 * Called by ICICI Bank once funds are credited to SolarKits Current Account.
 * Reconciles Orders & Wallets, and triggers Real-Time Popups for Admin, Accounts & Franchise Dashboards.
 */
async function handleMisPosting(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  let payload = {};
  let isEncrypted = false;
  let rawPacket = null;

  try {
    const extracted = extractPacketData(req);
    payload = extracted.payload;
    isEncrypted = extracted.isEncrypted;
    rawPacket = extracted.rawPacket;

    const {
      ClientCode,
      VirtualAccountNumber,
      Mode,
      UTR,
      SenderRemark,
      ClientAccountNo,
      Amount,
      PayerName,
      PayerAccNumber,
      PayerBankIFSC,
      PayerPaymentDate,
      BankInternalTransactionNumber,
      USERID
    } = payload || {};

    const amountNum = parseFloat(Amount) || 0;
    const amountPaise = Math.round(amountNum * 100);

    // ─── Step 1: Idempotency / Duplicate UTR Check ─────────────────────────
    if (UTR) {
      const existingTxn = await IciciCollectionLog.findOne({
        utr: UTR.trim().toUpperCase(),
        api_type: 'MIS_POSTING',
        status: 'credited'
      });

      if (existingTxn) {
        console.warn(`⚠️ [ICICI MIS_POSTING] Duplicate UTR detected: ${UTR}`);
        const duplicateResponse = { Response: 'Duplicate UTR', Code: '06' };

        await IciciCollectionLog.create({
          api_type: 'MIS_POSTING',
          client_code: ClientCode,
          virtual_account_number: VirtualAccountNumber || '-',
          mode: Mode || 'RTGS',
          user_id: USERID,
          utr: UTR,
          amount: amountNum,
          amount_paise: amountPaise,
          status: 'duplicate',
          response_code: '06',
          response_message: 'Duplicate UTR',
          raw_encrypted_request: rawPacket,
          decrypted_payload: payload,
          response_sent: duplicateResponse,
          ip_address: ip
        });

        const finalResponse = isEncrypted ? encryptResponse(duplicateResponse) : duplicateResponse;
        return res.status(200).json(finalResponse);
      }
    }

    // ─── Step 2: Resolve Buyer Entity & Target Order ───────────────────────
    const resolution = await resolveVirtualAccount(VirtualAccountNumber);

    let eventType = 'DIRECT_EPC_PAYMENT';
    let reconciledOrderType = 'unmatched';
    let reconciledOrderId = null;
    let reconciledOrderNumber = null;
    let buyerDisplayName = resolution.buyerName || PayerName || 'Valued Buyer';
    let franchisePartnerName = null;

    if (resolution.franchisePartner) {
      franchisePartnerName = resolution.franchisePartner.business_name || resolution.franchisePartner.name || 'Franchise Partner';
    }

    // ─── Step 3: Reconcile or Create Confirmed Orders ─────────────────────
    const remarkUpper = String(SenderRemark || '').toUpperCase();
    const isPoIntent = remarkUpper.includes('PO') || String(VirtualAccountNumber || '').toUpperCase().includes('SLRKF') || resolution.type === 'reseller';
    const isOnboardedIntent = remarkUpper.includes('ONBOARDED') || !!resolution.franchisePartner;

    // Scenario A0: Check if this EPC Buyer has an allocated Franchise PO item awaiting payment
    let pendingFpoForEpc = null;
    if (resolution.epc) {
      pendingFpoForEpc = await FpoOrder.findOne({
        "items.epc_allocations.epc_buyer_id": resolution.epc._id,
        "items.epc_allocations.payment_status": { $in: ['PENDING', 'RECEIPT_SUBMITTED'] }
      });
    }

    if (pendingFpoForEpc) {
      reconciledOrderType = 'fpo_order';
      reconciledOrderId = pendingFpoForEpc._id;
      reconciledOrderNumber = pendingFpoForEpc.po_number;
      eventType = 'PO_ORDER_PAYMENT';

      let allAllocationsPaid = true;
      pendingFpoForEpc.items.forEach(item => {
        (item.epc_allocations || []).forEach(alloc => {
          if (alloc.epc_buyer_id && alloc.epc_buyer_id.toString() === resolution.epc._id.toString()) {
            alloc.payment_status = 'VERIFIED';
            alloc.paid_at = new Date();
            alloc.payment_notes = `Auto-verified via ICICI E-Collection (Txn: ${BankInternalTransactionNumber || UTR})`;
          }
          if (alloc.payment_status !== 'VERIFIED' && alloc.payment_status !== 'PAID') {
            allAllocationsPaid = false;
          }
        });
      });

      if (allAllocationsPaid) {
        pendingFpoForEpc.status = 'PAID';
        pendingFpoForEpc.payment_status = 'Paid';
        pendingFpoForEpc.utr_number = UTR;
      }
      await pendingFpoForEpc.save();
      console.log(`✅ [ICICI MIS_POSTING] Auto-reconciled EPC PO Allocation in ${reconciledOrderNumber} with UTR: ${UTR}`);
    }
    // Scenario A: EPC Order Reconcile
    else if (resolution.pendingOrder) {
      reconciledOrderType = 'epc_order';
      reconciledOrderId = resolution.pendingOrder._id;
      reconciledOrderNumber = resolution.pendingOrder.order_number;

      eventType = resolution.franchisePartner ? 'ONBOARDED_EPC_PAYMENT' : 'DIRECT_EPC_PAYMENT';

      const pendingOrder = resolution.pendingOrder;
      const isTrialOrFullOrder = Boolean(pendingOrder.is_trial_order || pendingOrder.payment_milestones?.remaining_percentage === 0 || pendingOrder.payment_milestones?.remaining_amount === 0);
      const hasMilestones = !isTrialOrFullOrder && Boolean(pendingOrder.payment_milestones?.milestones?.length > 1);
      const m2 = hasMilestones ? pendingOrder.payment_milestones.milestones.find(m => m.milestone_number === 2) : null;
      const isM2Pending = m2 && (m2.payment_status === 'pending_verification' || pendingOrder.payment_milestones?.milestone_verification_status === 'final_payment_pending_verification');

      if (hasMilestones && !isM2Pending) {
        // Milestone 1 (Advance) Auto-Approval
        await EpcOrder.findByIdAndUpdate(pendingOrder._id, {
          payment_method: 'icici_ecollection',
          payment_gateway_used: 'icici_ecollection',
          payment_status: 'pending_verification',
          order_status: 'confirmed',
          is_official_order_generated: true,
          'offline_payment.utr_number': UTR,
          'offline_payment.amount_paid': amountNum,
          'offline_payment.payment_date': new Date(),
          'offline_payment.sender_bank_name': PayerBankIFSC || 'ICICI Bank',
          'offline_payment.account_holder_name': PayerName || buyerDisplayName,
          'offline_payment.verification_status': 'approved',
          'offline_payment.admin_approval_status': 'approved',
          'offline_payment.admin_remarks': 'Advance Auto-approved via ICICI E-Collection. No Admin Approval Needed.',
          'offline_payment.verified_at': new Date(),
          'payment_milestones.milestone_verification_status': 'advance_verified',
          'payment_milestones.current_milestone_due': 2,
          'payment_milestones.milestones.0.payment_status': 'verified',
          'payment_milestones.milestones.0.utr_number': UTR,
          'payment_milestones.milestones.0.amount_paid': amountNum,
          'payment_milestones.milestones.0.verified_at': new Date(),
          'payment_tracking.customer_payment_status': 'Partially Paid',
          'payment_tracking.current_stage': 'production_milestone',
          'payment_tracking.delay_signal': 'green',
          'payment_tracking.days_elapsed': 0,
          'payment_tracking.total_verified_amount': amountNum,
          'payment_tracking.outstanding_amount': pendingOrder.payment_milestones?.remaining_amount || 0
        });
      } else {
        // Milestone 2 or Full Order Payment (Trial Kit Orders)
        await EpcOrder.findByIdAndUpdate(pendingOrder._id, {
          payment_method: 'icici_ecollection',
          payment_gateway_used: 'icici_ecollection',
          payment_status: 'captured',
          order_status: ['pending', 'confirmed', 'processing'].includes(pendingOrder.order_status) ? 'ready_for_dispatch' : pendingOrder.order_status,
          is_official_order_generated: true,
          'offline_payment.utr_number': UTR,
          'offline_payment.amount_paid': amountNum,
          'offline_payment.payment_date': new Date(),
          'offline_payment.sender_bank_name': PayerBankIFSC || 'ICICI Bank',
          'offline_payment.account_holder_name': PayerName || buyerDisplayName,
          'offline_payment.verification_status': 'approved',
          'offline_payment.admin_approval_status': 'approved',
          'offline_payment.admin_remarks': 'Auto-approved via ICICI E-Collection (Direct Instant Credit). No Admin Approval Needed.',
          'offline_payment.verified_at': new Date(),
          ...(hasMilestones && m2 ? {
            'payment_milestones.milestone_verification_status': 'fully_paid',
            'payment_milestones.milestones.1.payment_status': 'verified',
            'payment_milestones.milestones.1.utr_number': UTR,
            'payment_milestones.milestones.1.amount_paid': amountNum,
            'payment_milestones.milestones.1.verified_at': new Date(),
          } : {
            'payment_milestones.milestone_verification_status': 'fully_paid',
            'payment_milestones.milestones.0.payment_status': 'verified',
            'payment_milestones.milestones.0.utr_number': UTR,
            'payment_milestones.milestones.0.amount_paid': amountNum,
            'payment_milestones.milestones.0.verified_at': new Date(),
          }),
          'payment_tracking.customer_payment_status': 'Paid',
          'payment_tracking.current_stage': 'delivery_milestone',
          'payment_tracking.delay_signal': 'green',
          'payment_tracking.days_elapsed': 0,
          'payment_tracking.total_verified_amount': (pendingOrder.grand_total_paise || 0) / 100 || amountNum,
          'payment_tracking.outstanding_amount': 0
        });
      }

      console.log(`✅ [ICICI MIS_POSTING] Auto-reconciled EPC Order (Auto-Approved): ${reconciledOrderNumber} with UTR: ${UTR}`);
    }
    // Scenario B: Franchise PO Order Reconcile
    else if (resolution.pendingPo) {
      reconciledOrderType = 'fpo_order';
      reconciledOrderId = resolution.pendingPo._id;
      reconciledOrderNumber = resolution.pendingPo.po_number;
      eventType = 'PO_ORDER_PAYMENT';

      await FpoOrder.findByIdAndUpdate(resolution.pendingPo._id, {
        status: 'PAID',
        payment_status: 'Paid',
        order_status: 'Confirmed',
        utr_number: UTR,
        'offline_payment.utr_number': UTR,
        'offline_payment.amount_paid': amountNum,
        'offline_payment.payment_date': new Date(),
        payment_notes: `Auto-verified via ICICI E-Collection (Txn: ${BankInternalTransactionNumber || UTR})`
      });

      console.log(`✅ [ICICI MIS_POSTING] Auto-reconciled Franchise PO Order: ${reconciledOrderNumber} with UTR: ${UTR}`);
    }
    // Scenario C: Create Confirmed Order when no pending order was previously open
    else {
      if (isPoIntent) {
        // Create confirmed FPO Order so it appears in Franchisee PO Orders and Recent Financial Transactions
        let targetReseller = resolution.reseller;
        if (!targetReseller) {
          targetReseller = await Reseller.findOne({ deleted_at: null });
        }
        const newPoNumber = `FPO-${Date.now().toString().slice(-8)}`;
        const newPo = await FpoOrder.create({
          po_number: newPoNumber,
          idempotency_key: `ICICI-PO-${UTR || Date.now()}`,
          franchisee_id: targetReseller ? targetReseller._id : new mongoose.Types.ObjectId(),
          plan_id: targetReseller?.plan_id || targetReseller?._id || new mongoose.Types.ObjectId(),
          order_type: 'po_order',
          status: 'PAID',
          payment_status: 'Paid',
          total_price_paise: amountPaise,
          subtotal_paise: Math.round(amountPaise / 1.18),
          tax_paise: amountPaise - Math.round(amountPaise / 1.18),
          items: [{
            item_name: 'Solar Kit Franchise PO Supply Order',
            quantity: 1,
            unit_price_paise: Math.round(amountPaise / 1.18),
            total_price_paise: amountPaise
          }],
          offline_payment: {
            payment_method: 'ICICI_VIRTUAL_ACCOUNT',
            utr_number: UTR,
            amount_paid: amountNum,
            payment_date: new Date(),
            sender_bank_name: PayerBankIFSC || 'ICICI Bank'
          },
          utr_number: UTR,
          payment_notes: `Auto-created and confirmed via ICICI E-Collection (Txn: ${BankInternalTransactionNumber || UTR})`
        });

        reconciledOrderType = 'fpo_order';
        reconciledOrderId = newPo._id;
        reconciledOrderNumber = newPo.po_number;
        eventType = 'PO_ORDER_PAYMENT';
        if (targetReseller) franchisePartnerName = targetReseller.business_name || targetReseller.name;
        console.log(`✅ [ICICI MIS_POSTING] Auto-created Confirmed Franchise PO: ${newPoNumber} (UTR: ${UTR})`);
      } else if (isOnboardedIntent) {
        // Create confirmed Onboarded EPC Order so it appears in Onboarded EPC Purchases & Dashboard
        let partner = resolution.franchisePartner;
        if (!partner) {
          partner = await Reseller.findOne({ deleted_at: null });
        }
        let epc = resolution.epc;
        if (!epc) {
          epc = (partner ? await EpcAccount.findOne({ onboarded_by_reseller_id: partner._id, deleted_at: null }) : null)
            || await EpcAccount.findOne({ deleted_at: null });
        }

        const newOrderNum = `ORD-ONB-${Date.now().toString().slice(-8)}`;
        const subtotal = Math.round(amountPaise / 1.138);
        const tax = amountPaise - subtotal;
        const commMargin = Math.round(amountPaise * 0.08); // 8% commission

        const newOrder = await EpcOrder.create({
          order_number: newOrderNum,
          epc_id: epc?._id || new mongoose.Types.ObjectId(),
          reseller_id: partner?._id || null,
          routing_source: 'primary_reseller',
          grand_total_paise: amountPaise,
          subtotal_paise: subtotal,
          tax_total_paise: tax,
          reseller_total_margin_paise: commMargin,
          items: [{
            scope_type: 'kit',
            item_name: 'Solar Kit Onboarded Equipment (ICICI Bank Transfer)',
            quantity: 1,
            unit_price_paise: subtotal,
            cost_price_paise: Math.round(amountPaise * 0.85),
            reseller_margin_paise: commMargin,
            platform_commission_paise: 0,
            tax_paise: tax,
            total_price_paise: amountPaise
          }],
          order_status: 'confirmed',
          payment_status: 'captured',
          payment_method: 'icici_ecollection',
          payment_gateway_used: 'icici_ecollection',
          is_official_order_generated: true,
          offline_payment: {
            utr_number: UTR,
            amount_paid: amountNum,
            payment_date: new Date(),
            sender_bank_name: PayerBankIFSC || 'ICICI Bank',
            account_holder_name: PayerName || buyerDisplayName,
            verification_status: 'approved',
            admin_approval_status: 'approved',
            admin_remarks: 'Auto-approved via ICICI E-Collection (Direct Credit). No Admin Approval Needed.',
            verified_at: new Date()
          },
          payment_tracking: {
            customer_payment_status: 'Paid',
            current_stage: 'final_settlement',
            delay_signal: 'green',
            days_elapsed: 0,
            total_verified_amount: amountNum,
            outstanding_amount: 0
          }
        });

        reconciledOrderType = 'epc_order';
        reconciledOrderId = newOrder._id;
        reconciledOrderNumber = newOrder.order_number;
        eventType = 'ONBOARDED_EPC_PAYMENT';
        if (partner) {
          franchisePartnerName = partner.business_name || partner.name;
          resolution.targetResellerId = partner._id;
        }
        console.log(`✅ [ICICI MIS_POSTING] Auto-created Confirmed Onboarded EPC Order: ${newOrderNum} (UTR: ${UTR})`);
      } else {
        // Direct EPC Order so it appears in Direct EPC Transactions & Dashboard
        let epc = resolution.epc;
        if (!epc) {
          epc = await EpcAccount.findOne({ deleted_at: null });
        }

        const newOrderNum = `ORD-DIR-${Date.now().toString().slice(-8)}`;
        const subtotal = Math.round(amountPaise / 1.138);
        const tax = amountPaise - subtotal;

        const newOrder = await EpcOrder.create({
          order_number: newOrderNum,
          epc_id: epc?._id || new mongoose.Types.ObjectId(),
          reseller_id: null,
          routing_source: 'direct_fallback',
          grand_total_paise: amountPaise,
          subtotal_paise: subtotal,
          tax_total_paise: tax,
          reseller_total_margin_paise: 0,
          items: [{
            scope_type: 'kit',
            item_name: 'Solar Kit Direct Equipment (ICICI Bank Transfer)',
            quantity: 1,
            unit_price_paise: subtotal,
            cost_price_paise: Math.round(amountPaise * 0.90),
            reseller_margin_paise: 0,
            platform_commission_paise: 0,
            tax_paise: tax,
            total_price_paise: amountPaise
          }],
          order_status: 'confirmed',
          payment_status: 'captured',
          payment_method: 'icici_ecollection',
          payment_gateway_used: 'icici_ecollection',
          is_official_order_generated: true,
          offline_payment: {
            utr_number: UTR,
            amount_paid: amountNum,
            payment_date: new Date(),
            sender_bank_name: PayerBankIFSC || 'ICICI Bank',
            account_holder_name: PayerName || buyerDisplayName,
            verification_status: 'approved',
            admin_approval_status: 'approved',
            admin_remarks: 'Auto-approved via ICICI E-Collection (Direct Credit). No Admin Approval Needed.',
            verified_at: new Date()
          },
          payment_tracking: {
            customer_payment_status: 'Paid',
            current_stage: 'final_settlement',
            delay_signal: 'green',
            days_elapsed: 0,
            total_verified_amount: amountNum,
            outstanding_amount: 0
          }
        });

        reconciledOrderType = 'epc_order';
        reconciledOrderId = newOrder._id;
        reconciledOrderNumber = newOrder.order_number;
        eventType = 'DIRECT_EPC_PAYMENT';
        console.log(`✅ [ICICI MIS_POSTING] Auto-created Confirmed Direct EPC Order: ${newOrderNum} (UTR: ${UTR})`);
      }

      // Also top up EPC wallet if account exists
      if (resolution.epc) {
        try {
          let wallet = await EpcWallet.findOne({ epc_account_id: resolution.epc._id });
          if (!wallet) {
            wallet = await EpcWallet.create({ epc_account_id: resolution.epc._id });
          }
          wallet.balance_paise = (wallet.balance_paise || 0) + amountPaise;
          wallet.lifetime_earned_paise = (wallet.lifetime_earned_paise || 0) + amountPaise;
          await wallet.save();

          await EpcWalletLedger.create({
            epc_account_id: resolution.epc._id,
            reference_type: 'icici_ecollection',
            reference_id: reconciledOrderId,
            idempotency_key: `icici_ecollection:${UTR || Date.now()}`,
            credit_paise: amountPaise,
            debit_paise: 0,
            net_paise: amountPaise,
            currency: 'INR',
            status: 'available'
          });
        } catch (_wErr) {
          console.warn('Wallet credit notice:', _wErr.message);
        }
      }
    }

    // ─── Step 4: Record Audit Log ──────────────────────────────────────────
    const bankResponse = { Response: 'Success', Code: '11' };

    await IciciCollectionLog.create({
      api_type: 'MIS_POSTING',
      client_code: ClientCode,
      virtual_account_number: VirtualAccountNumber,
      mode: Mode || 'RTGS',
      user_id: USERID,
      utr: UTR,
      sender_remark: SenderRemark,
      client_account_no: ClientAccountNo,
      amount: amountNum,
      amount_paise: amountPaise,
      payer_name: PayerName || buyerDisplayName,
      payer_acc_number: PayerAccNumber,
      payer_bank_ifsc: PayerBankIFSC,
      payer_payment_date: PayerPaymentDate,
      bank_internal_txn_number: BankInternalTransactionNumber,
      status: 'credited',
      response_code: '11',
      response_message: 'Success',
      reconciled_order_type: reconciledOrderType,
      reconciled_order_id: reconciledOrderId,
      reconciled_order_number: reconciledOrderNumber,
      epc_account_id: resolution.epc?._id || null,
      reseller_id: resolution.targetResellerId || null,
      raw_encrypted_request: rawPacket,
      decrypted_payload: payload,
      response_sent: bankResponse,
      ip_address: ip
    });

    // ─── Step 5: Real-Time Multi-Portal Broadcast ──────────────────────────
    dispatchPaymentAlert({
      eventType,
      targetResellerId: resolution.targetResellerId,
      targetEpcId: resolution.targetEpcId,
      targetOrderId: reconciledOrderId || reconciledOrderNumber,
      transactionData: {
        utr: UTR,
        amount: amountNum,
        amountFormatted: formatCurrency(amountNum),
        mode: Mode || 'RTGS',
        buyerName: buyerDisplayName,
        buyerPhone: resolution.buyerPhone || '-',
        virtualAccountNumber: VirtualAccountNumber,
        orderNumber: reconciledOrderNumber || 'Wallet Credit',
        orderType: reconciledOrderType,
        franchisePartnerName: franchisePartnerName,
        bankTxnNumber: BankInternalTransactionNumber,
        receivedAt: new Date().toISOString()
      }
    });

    console.log(`🔔 [ICICI Real-Time Alert] Dispatched ${eventType} for ₹${amountNum} (UTR: ${UTR})`);

    try {
      const { sendAdminNotification } = require('../../admin-panel/services/admin.notification.service');
      sendAdminNotification({
        title: `Payment Received: ₹${amountNum.toLocaleString('en-IN')}`,
        message: `Received ₹${amountNum.toLocaleString('en-IN')} via ${Mode || 'Bank Transfer'} from ${buyerDisplayName} (UTR: ${UTR}). Reconciled to ${reconciledOrderNumber || 'Order'}.`,
        category: 'payments',
        priority: 'high',
        action_url: '/admin-panel/solar-shop/po-orders',
        metadata: { utr: UTR, amount: amountNum, order_number: reconciledOrderNumber }
      }).catch(e => console.warn('[Payment Notification Warning]:', e.message));
    } catch (notifErr) {
      console.warn('[Payment Admin Notification Error]:', notifErr.message);
    }

    const finalResponse = isEncrypted ? encryptResponse(bankResponse) : bankResponse;
    return res.status(200).json(finalResponse);

  } catch (err) {
    console.error('❌ [ICICI MIS_POSTING Error]:', err);
    const bankResponse = { Response: 'Success', Code: '11' };
    return res.status(200).json(isEncrypted ? encryptResponse(bankResponse) : bankResponse);
  }
}

/**
 * 3. SSE Stream Endpoint for Real-time Payment Alerts
 * Subscribed by:
 * - Admin Portal (role=admin)
 * - Accounts Portal (role=accounts)
 * - Franchise Dashboard (role=reseller, reseller_id=XYZ)
 * - EPC Buyer Checkout (role=epc, epc_id=ABC, order_id=ORD)
 */
function streamPaymentEvents(req, res) {
  const { role, reseller_id, epc_id, order_id } = req.query;
  registerClient(req, res, {
    role: role || 'admin',
    resellerId: reseller_id || null,
    epcId: epc_id || null,
    orderId: order_id || null
  });
}

/**
 * 4. Get Virtual Account Details for EPC Buyer or Franchise Checkout
 */
async function getVirtualAccountDetails(req, res) {
  try {
    const { phone, role } = req.query;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const van = role === 'reseller'
      ? getFranchiseVirtualAccount(phone)
      : getEpcVirtualAccount(phone);

    return res.status(200).json({
      success: true,
      data: {
        beneficiary_name: BENEFICIARY_NAME,
        virtual_account_number: van,
        ifsc_code: ICICI_IFSC,
        bank_name: 'ICICI Bank',
        branch_name: 'CMS Branch, Mumbai',
        account_type: 'Virtual Current Account',
        upi_handle: `${van}@icici`,
        instructions: [
          'Add as Beneficiary in your Net Banking (HDFC, SBI, ICICI, Axis, etc.)',
          'Supported Modes: RTGS (for > ₹2 Lakh), NEFT, IMPS, or UPI',
          'Instant auto-verification within 10 seconds of transfer'
        ]
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * 5. Get Recent ICICI Collections (for Accounts & Admin Portal)
 */
async function getRecentCollections(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const query = { api_type: 'MIS_POSTING' };
    if (req.query.status) query.status = req.query.status;
    if (req.query.utr) query.utr = new RegExp(req.query.utr.trim(), 'i');

    const [logs, total] = await Promise.all([
      IciciCollectionLog.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('epc_account_id', 'name email whatsapp gstin')
        .populate('reseller_id', 'name business_name phone'),
      IciciCollectionLog.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  handleMsgHold,
  handleMisPosting,
  streamPaymentEvents,
  getVirtualAccountDetails,
  getRecentCollections
};
