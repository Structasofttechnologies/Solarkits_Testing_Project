const {
  EpcAccount,
  EpcOrder,
  EpcQuote,
  Reseller,
  ResellerAgreement
} = require('../../models/india_solarshop_db');
const {
  LeadMaster,
  LeadMarketingSettings,
  LeadCampaign,
  LeadCampaignRecipient,
  LeadCampaignEmailEvent,
  LeadConversion,
  LeadActivity
} = require('../models');
const { normalizeEmail, normalizePhone10 } = require('./leadGeoResolver.service');

const sumOrderCapacityKw = (items = []) => {
  let kw = 0;
  for (const item of Array.isArray(items) ? items : []) {
    const capNum = parseFloat(String(item.capacity || '').replace(/[^0-9.]/g, ''));
    const qty = Number(item.quantity || 1);
    if (!Number.isNaN(capNum) && capNum > 0) {
      kw += capNum * qty;
    }
  }
  return Math.round(kw * 100) / 100;
};

const classifyOrderCategory = (ord, priorOrderCountForLead = 0) => {
  if (ord.is_trial_order || ord.order_type === 'trial_order') return 'trial_order';
  const reqId = String(ord.order_request_id || '').toLowerCase();
  if (reqId.includes('tender') || reqId.includes('govt')) return 'tender_order';
  if (priorOrderCountForLead > 0) return 'repeat_order';
  if (ord.order_type === 'loose_order') return 'loose_order';
  return 'po_order';
};

/**
 * Resolves First-Touch, Last-Touch, and Multi-Touch campaign history for a lead prior to conversion.
 */
const resolveTouchAttribution = async (leadId, eventDate, windowDays = 30) => {
  const cutoff = new Date(new Date(eventDate).getTime() - Number(windowDays || 30) * 86400000);
  const recipients = await LeadCampaignRecipient.find({
    lead_id: leadId,
    status: { $in: ['sent', 'delivered', 'queued'] },
    $or: [{ sent_at: { $gte: cutoff, $lte: eventDate } }, { created_at: { $gte: cutoff, $lte: eventDate } }]
  })
    .sort({ sent_at: 1, created_at: 1 })
    .lean();

  if (!recipients.length) {
    return { firstTouchId: null, lastTouchId: null, touchHistoryIds: [] };
  }

  const orderedCampaignIds = [];
  const seen = new Set();
  for (const r of recipients) {
    const cid = String(r.campaign_id);
    if (!seen.has(cid)) {
      seen.add(cid);
      orderedCampaignIds.push(r.campaign_id);
    }
  }

  return {
    firstTouchId: orderedCampaignIds[0] || null,
    lastTouchId: orderedCampaignIds[orderedCampaignIds.length - 1] || null,
    touchHistoryIds: orderedCampaignIds
  };
};

/**
 * Real read-only synchronization connecting lm_marketing_leads to live MongoDB entities:
 * - epc_accounts (EPC Registration verification -> epc_registered)
 * - resellers & reseller_agreements (Franchise conversion -> franchisee_converted)
 * - epc_orders & epc_quotes (Confirmed commercial orders -> epc_commercial_order)
 * Never modifies external modules or double-counts unique leads.
 */
const syncLiveConversions = async () => {
  const settings = await LeadMarketingSettings.findOne({ key: 'global' }).lean().catch(() => null);
  const windowDays = Number(settings?.attribution_config?.attribution_window_days || 30);

  const [leads, epcAccounts, orders, quotes, resellers, signedAgreements] = await Promise.all([
    LeadMaster.find({ deleted_at: null }).lean(),
    EpcAccount ? EpcAccount.find({ deleted_at: null }).select('_id email whatsapp gstin status gst_verification_status is_gstin_active created_at gstin_verified_at').lean().catch(() => []) : [],
    EpcOrder ? EpcOrder.find({ order_status: { $nin: ['cancelled', 'rejected'] } }).select('_id order_number order_type order_request_id epc_id grand_total_paise order_status delivery_address customer_phone items created_at').sort({ created_at: 1 }).lean().catch(() => []) : [],
    EpcQuote ? EpcQuote.find({}).select('_id quote_number epc_id customer_phone customer_email status created_at').lean().catch(() => []) : [],
    Reseller ? Reseller.find({ is_deleted: { $ne: true } }).select('_id business_name email mobile gst_number is_active reseller_lifecycle_status created_at').lean().catch(() => []) : [],
    ResellerAgreement ? ResellerAgreement.find({ status: 'signed' }).select('_id reseller_id lead_id signed_at').lean().catch(() => []) : []
  ]);

  if (!leads.length) return { synced: 0 };

  // Build quick match maps from live DB records
  const epcByEmail = new Map();
  const epcByPhone = new Map();
  const epcByGstin = new Map();
  const epcById = new Map();
  for (const e of epcAccounts) {
    epcById.set(String(e._id), e);
    const em = normalizeEmail(e.email);
    const ph = normalizePhone10(e.whatsapp);
    const gst = String(e.gstin || '').trim().toUpperCase();
    if (em) epcByEmail.set(em, e);
    if (ph) epcByPhone.set(ph, e);
    if (gst.length >= 10) epcByGstin.set(gst, e);
  }

  const resellerByEmail = new Map();
  const resellerByPhone = new Map();
  const resellerByGstin = new Map();
  const signedResellerIds = new Set(signedAgreements.map((a) => String(a.reseller_id)));
  const agreementByResellerId = new Map(signedAgreements.map((a) => [String(a.reseller_id), a]));

  for (const r of resellers) {
    const em = normalizeEmail(r.email);
    const ph = normalizePhone10(r.mobile);
    const gst = String(r.gst_number || '').trim().toUpperCase();
    if (em) resellerByEmail.set(em, r);
    if (ph) resellerByPhone.set(ph, r);
    if (gst.length >= 10) resellerByGstin.set(gst, r);
  }

  // Group quotes per phone/email/epcId
  const quotesByKey = new Map();
  for (const q of quotes) {
    const keys = [
      q.epc_id ? `id:${String(q.epc_id)}` : null,
      normalizeEmail(q.customer_email) ? `e:${normalizeEmail(q.customer_email)}` : null,
      normalizePhone10(q.customer_phone) ? `p:${normalizePhone10(q.customer_phone)}` : null
    ].filter(Boolean);
    for (const k of keys) {
      quotesByKey.set(k, (quotesByKey.get(k) || 0) + 1);
    }
  }

  // Group orders by epc_id and phone
  const ordersByEpcId = new Map();
  const ordersByPhone = new Map();
  for (const ord of orders) {
    if (ord.epc_id) {
      const k = String(ord.epc_id);
      if (!ordersByEpcId.has(k)) ordersByEpcId.set(k, []);
      ordersByEpcId.get(k).push(ord);
    }
    const p10 = normalizePhone10(ord.delivery_address?.contact_phone || ord.customer_phone);
    if (p10) {
      if (!ordersByPhone.has(p10)) ordersByPhone.set(p10, []);
      ordersByPhone.get(p10).push(ord);
    }
  }

  let newConversionsCount = 0;

  for (const lead of leads) {
    const em = normalizeEmail(lead.email);
    const p10 = lead.mobile_normalized || normalizePhone10(lead.mobile_number);
    const gst = String(lead.gst_number || '').trim().toUpperCase();

    const matchedEpc =
      (lead.linked_epc_id && epcById.get(String(lead.linked_epc_id))) ||
      (em && epcByEmail.get(em)) ||
      (p10 && epcByPhone.get(p10)) ||
      (gst.length >= 10 && epcByGstin.get(gst)) ||
      null;

    const matchedReseller =
      (em && resellerByEmail.get(em)) ||
      (p10 && resellerByPhone.get(p10)) ||
      (gst.length >= 10 && resellerByGstin.get(gst)) ||
      null;

    const leadUpdate = {};
    if (matchedEpc && !lead.linked_epc_id) leadUpdate.linked_epc_id = matchedEpc._id;
    if (matchedReseller && !lead.linked_reseller_id) leadUpdate.linked_reseller_id = matchedReseller._id;

    // 1. EPC Signup / Verification Conversion (tracked strictly as epc_registered)
    if (matchedEpc) {
      const isVerified =
        ['verified_automatic', 'verified_admin'].includes(matchedEpc.gst_verification_status) ||
        matchedEpc.is_gstin_active === true ||
        matchedEpc.status === 'approved';
      if (isVerified) {
        const eventDt = matchedEpc.gstin_verified_at || matchedEpc.created_at || new Date();
        const exists = await LeadConversion.exists({
          conversion_type: 'epc_registered',
          source_entity_id: matchedEpc._id
        });
        if (!exists) {
          const touch = await resolveTouchAttribution(lead._id, eventDt, windowDays);
          await LeadConversion.create({
            lead_id: lead._id,
            lead_code: lead.lead_id,
            primary_segment_key: lead.primary_segment_key,
            conversion_type: 'epc_registered',
            source_entity_model: 'epc_accounts',
            source_entity_id: matchedEpc._id,
            first_touch_campaign_id: touch.firstTouchId,
            last_touch_campaign_id: touch.lastTouchId,
            touch_history_campaign_ids: touch.touchHistoryIds,
            assigned_bde_id: lead.assigned_bde_id || null,
            country_name: lead.country_name || 'India',
            state_name: lead.state_name || '',
            district_name: lead.district_name || '',
            cluster_name: lead.cluster_name || '',
            converted_at: eventDt
          });
          newConversionsCount += 1;
        }
        leadUpdate['milestones.epc_registered'] = {
          is_registered: true,
          epc_account_id: matchedEpc._id,
          gst_verified: true,
          registered_at: eventDt
        };
      }
    }

    // 2. Franchisee Onboarding / Agreement Conversion (tracked independently as franchisee_converted)
    if (matchedReseller) {
      const agr = agreementByResellerId.get(String(matchedReseller._id));
      const isFranchiseActivated =
        signedResellerIds.has(String(matchedReseller._id)) ||
        ['active', 'activated', 'approved', 'live'].includes(String(matchedReseller.reseller_lifecycle_status || '').toLowerCase()) ||
        matchedReseller.is_active === true;

      if (isFranchiseActivated) {
        const eventDt = agr?.signed_at || matchedReseller.created_at || new Date();
        const exists = await LeadConversion.exists({
          conversion_type: 'franchisee_converted',
          source_entity_id: matchedReseller._id
        });
        if (!exists) {
          const touch = await resolveTouchAttribution(lead._id, eventDt, windowDays);
          await LeadConversion.create({
            lead_id: lead._id,
            lead_code: lead.lead_id,
            primary_segment_key: lead.primary_segment_key,
            conversion_type: 'franchisee_converted',
            source_entity_model: 'resellers',
            source_entity_id: matchedReseller._id,
            reseller_id: matchedReseller._id,
            first_touch_campaign_id: touch.firstTouchId,
            last_touch_campaign_id: touch.lastTouchId,
            touch_history_campaign_ids: touch.touchHistoryIds,
            assigned_bde_id: lead.assigned_bde_id || null,
            country_name: lead.country_name || 'India',
            state_name: lead.state_name || '',
            district_name: lead.district_name || '',
            cluster_name: lead.cluster_name || '',
            converted_at: eventDt
          });
          newConversionsCount += 1;
        }
        leadUpdate['milestones.franchisee_converted'] = {
          is_converted: true,
          reseller_id: matchedReseller._id,
          agreement_id: agr?._id || null,
          converted_at: eventDt
        };
      }
    }

    // 3. Commercial Orders (epc_orders -> tracked as multiple orders, distinct conversion_type)
    const matchedOrderMap = new Map();
    if (matchedEpc) {
      for (const ord of ordersByEpcId.get(String(matchedEpc._id)) || []) {
        matchedOrderMap.set(String(ord._id), ord);
      }
    }
    if (p10) {
      for (const ord of ordersByPhone.get(p10) || []) {
        matchedOrderMap.set(String(ord._id), ord);
      }
    }

    if (matchedOrderMap.size > 0) {
      const sortedOrders = Array.from(matchedOrderMap.values()).sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      let totalInr = 0;
      let totalKw = 0;
      let hasTrial = false;

      for (let i = 0; i < sortedOrders.length; i += 1) {
        const ord = sortedOrders[i];
        const ordValueInr = Math.round((Number(ord.grand_total_paise || 0) / 100) * 100) / 100;
        const ordKw = sumOrderCapacityKw(ord.items);
        const category = classifyOrderCategory(ord, i);
        if (category === 'trial_order') hasTrial = true;
        totalInr += ordValueInr;
        totalKw += ordKw;

        const exists = await LeadConversion.exists({
          conversion_type: 'epc_commercial_order',
          source_entity_id: ord._id
        });
        if (!exists) {
          const eventDt = ord.created_at || new Date();
          const touch = await resolveTouchAttribution(lead._id, eventDt, windowDays);
          await LeadConversion.create({
            lead_id: lead._id,
            lead_code: lead.lead_id,
            primary_segment_key: lead.primary_segment_key,
            conversion_type: 'epc_commercial_order',
            source_entity_model: 'epc_orders',
            source_entity_id: ord._id,
            epc_id: ord.epc_id || matchedEpc?._id || null,
            order_number: ord.order_number,
            order_category: category,
            order_value_inr: ordValueInr,
            order_capacity_kw: ordKw,
            order_status: ord.order_status,
            first_touch_campaign_id: touch.firstTouchId,
            last_touch_campaign_id: touch.lastTouchId,
            touch_history_campaign_ids: touch.touchHistoryIds,
            assigned_bde_id: lead.assigned_bde_id || null,
            country_name: lead.country_name || 'India',
            state_name: lead.state_name || '',
            district_name: lead.district_name || '',
            cluster_name: lead.cluster_name || '',
            converted_at: eventDt
          });
          newConversionsCount += 1;

          // Update recipient converted timestamp for last-touch campaign if attributed
          if (touch.lastTouchId) {
            await LeadCampaignRecipient.updateOne(
              { campaign_id: touch.lastTouchId, lead_id: lead._id, converted_at: null },
              { $set: { converted_at: eventDt } }
            ).catch(() => {});
          }

          await LeadActivity.create({
            lead_id: lead._id,
            lead_code: lead.lead_id,
            activity_type: 'conversion_sync',
            notes: `Confirmed order ${ord.order_number} (${category}) worth ₹${ordValueInr.toLocaleString('en-IN')} (${ordKw} kW) synced from SolarKits Orders.`,
            actor_name: 'Order Attribution Sync',
            occurred_at: eventDt
          }).catch(() => {});
        }
      }

      leadUpdate['milestones.epc_sales_converted'] = {
        has_order: true,
        total_orders: sortedOrders.length,
        total_revenue_inr: Math.round(totalInr * 100) / 100,
        total_kw: Math.round(totalKw * 100) / 100,
        first_order_at: sortedOrders[0].created_at,
        last_order_at: sortedOrders[sortedOrders.length - 1].created_at
      };
      if (hasTrial) leadUpdate['milestones.trial_kit_ordered'] = true;
    }

    const qCount =
      (matchedEpc && quotesByKey.get(`id:${String(matchedEpc._id)}`)) ||
      (em && quotesByKey.get(`e:${em}`)) ||
      (p10 && quotesByKey.get(`p:${p10}`)) ||
      0;
    if (qCount > 0 && qCount !== lead.milestones?.quote_count) {
      leadUpdate['milestones.quote_count'] = qCount;
    }

    if (Object.keys(leadUpdate).length > 0) {
      await LeadMaster.updateOne({ _id: lead._id }, { $set: leadUpdate }).catch(() => {});
    }
  }

  return { synced: newConversionsCount };
};

/**
 * Dynamically recalculates individual campaign KPI caches from recipients, events & conversions.
 */
const recalculateCampaignStats = async (campaignId) => {
  const [recipients, conversions] = await Promise.all([
    LeadCampaignRecipient.find({ campaign_id: campaignId }).lean(),
    LeadConversion.find({
      $or: [{ last_touch_campaign_id: campaignId }, { first_touch_campaign_id: campaignId }]
    }).lean()
  ]);

  let sent = 0;
  let delivered = 0;
  let bounced = 0;
  let failed = 0;
  let uniqueOpens = 0;
  let uniqueClicks = 0;
  let unsubscribed = 0;
  let inquiries = 0;
  let quotations = 0;

  for (const r of recipients) {
    if (['sent', 'delivered'].includes(r.status) || r.sent_at) sent += 1;
    if (r.status === 'delivered' || r.delivered_at) delivered += 1;
    if (r.status === 'bounced' || r.bounced_at) bounced += 1;
    if (r.status === 'failed') failed += 1;
    if (r.first_opened_at) uniqueOpens += 1;
    if (r.first_clicked_at) uniqueClicks += 1;
    if (r.unsubscribed_at) unsubscribed += 1;
    if (r.inquired_at) inquiries += 1;
    if (r.quoted_at) quotations += 1;
  }

  const convertedLeadIds = new Set(conversions.map((c) => String(c.lead_id)));
  // Any recipient whose lead had a direct conversion record
  for (const r of recipients) {
    if (r.converted_at) convertedLeadIds.add(String(r.lead_id));
  }

  const update = {
    total_target_leads: recipients.length,
    sent_count: sent,
    delivered_count: delivered,
    bounced_count: bounced,
    failed_count: failed,
    unique_opens_count: uniqueOpens,
    unique_clicks_count: uniqueClicks,
    unsubscribed_count: unsubscribed,
    inquiries_count: inquiries,
    quotations_count: quotations,
    converted_leads_count: convertedLeadIds.size
  };

  await LeadCampaign.updateOne({ _id: campaignId }, { $set: update });
  return update;
};

module.exports = {
  syncLiveConversions,
  recalculateCampaignStats,
  resolveTouchAttribution
};
