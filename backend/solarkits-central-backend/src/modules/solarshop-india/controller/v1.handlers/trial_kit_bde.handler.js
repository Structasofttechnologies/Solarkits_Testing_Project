const mongoose = require('mongoose');
const {
  TrialKitOrder,
  EpcAccount,
  EpcQuote
} = require('../../../admin-panel/models/india_solarshop_db');
const EpcOrder = require('../../../admin-panel/models/india_solarshop_db/epc_orders.schema');
const BDEProfile = require('../../../admin-panel/models/india_solarshop_db/bde_profiles.schema');

/**
 * 1. GET BDE SALES FUNNEL LEADS (Section 6)
 * View all assigned EPC trial kit orders across the 7 funnel stages.
 */
exports.get_funnel_leads = async (req, res) => {
  try {
    const bdeId = req.user?.id || req.user?._id;
    const { stage, search } = req.query;

    const filter = {};
    if (bdeId && mongoose.Types.ObjectId.isValid(bdeId)) {
      filter.bde_id = bdeId;
    }

    if (stage && stage !== 'all') {
      filter['funnel.current_stage'] = stage;
    } else {
      filter['funnel.current_stage'] = { $ne: null };
    }

    if (search) {
      const sRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { order_number: sRegex },
        { epc_name: sRegex },
        { epc_company_name: sRegex },
        { gst_number: sRegex }
      ];
    }

    const leads = await TrialKitOrder.find(filter)
      .populate('epc_id', 'name email whatsapp gstin state_name district_name')
      .populate('warehouse_id', 'warehouse_name warehouse_code')
      .populate('funnel.commercial_quote_id', 'quote_number total_amount_paise status')
      .populate('funnel.commercial_order_id', 'order_number grand_total_paise order_status')
      .sort({ 'funnel.stage_updated_at': -1, order_date: -1 })
      .lean();

    // Group leads by funnel stages for kanban / pipeline view
    const stages = [
      'trial_kit_delivered',
      'feedback_pending',
      'feedback_received',
      'interested_in_purchase',
      'quotation_generated',
      'order_won',
      'not_converted'
    ];

    const grouped = {};
    stages.forEach(s => { grouped[s] = []; });

    leads.forEach(lead => {
      const curStage = lead.funnel?.current_stage || 'trial_kit_delivered';
      if (grouped[curStage]) {
        grouped[curStage].push(lead);
      } else {
        grouped.trial_kit_delivered.push(lead);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        total: leads.length,
        leads,
        grouped
      }
    });
  } catch (err) {
    console.error('❌ Error fetching BDE funnel leads:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. UPDATE FUNNEL STAGE (Section 6)
 */
exports.update_funnel_stage = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { stage, note } = req.body;

    const validStages = [
      'trial_kit_delivered',
      'feedback_pending',
      'feedback_received',
      'interested_in_purchase',
      'quotation_generated',
      'order_won',
      'not_converted'
    ];

    if (!validStages.includes(stage)) {
      return res.status(400).json({ success: false, message: `Invalid funnel stage: ${stage}` });
    }

    const order = await TrialKitOrder.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Trial kit order not found.' });
    }

    order.funnel.current_stage = stage;
    order.funnel.stage_updated_at = new Date();

    if (note) {
      order.funnel.call_notes.push({
        note: `Stage changed to [${stage}]: ${note}`,
        created_by_name: req.user?.full_name || req.user?.name || 'BDE',
        created_by_id: req.user?.id || req.user?._id || null,
        created_at: new Date()
      });
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Funnel stage updated to: ${stage}`,
      data: order
    });
  } catch (err) {
    console.error('❌ Error updating funnel stage:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. ADD REMARKS & CALL NOTES + SCHEDULE NEXT FOLLOW-UP (Section 6)
 */
exports.add_call_note = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { note, next_follow_up_date } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required.' });
    }

    const order = await TrialKitOrder.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Trial kit order not found.' });
    }

    const newNote = {
      note: note.trim(),
      next_follow_up_date: next_follow_up_date ? new Date(next_follow_up_date) : null,
      created_by_name: req.user?.full_name || req.user?.name || 'BDE',
      created_by_id: req.user?.id || req.user?._id || null,
      created_at: new Date()
    };

    order.funnel.call_notes.push(newNote);
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Call note and follow-up scheduled successfully.',
      data: order.funnel.call_notes
    });
  } catch (err) {
    console.error('❌ Error adding call note:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. LINK COMMERCIAL QUOTATION / RECORD WON ORDER (Section 6)
 */
exports.link_commercial_quote = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { commercial_quote_id } = req.body;

    if (!commercial_quote_id || !mongoose.Types.ObjectId.isValid(commercial_quote_id)) {
      return res.status(400).json({ success: false, message: 'Valid commercial quote ID required.' });
    }

    const quote = await EpcQuote.findById(commercial_quote_id).lean();
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Commercial quote not found.' });
    }

    const order = await TrialKitOrder.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Trial kit order not found.' });
    }

    order.funnel.commercial_quote_id = quote._id;
    order.funnel.commercial_quote_number = quote.quote_number;
    order.funnel.current_stage = 'quotation_generated';
    order.funnel.stage_updated_at = new Date();

    order.funnel.call_notes.push({
      note: `Commercial Quote generated: ${quote.quote_number}`,
      created_by_name: req.user?.full_name || req.user?.name || 'BDE',
      created_by_id: req.user?.id || req.user?._id || null,
      created_at: new Date()
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Commercial Quote ${quote.quote_number} linked. Funnel moved to [quotation_generated].`,
      data: order
    });
  } catch (err) {
    console.error('❌ Error linking commercial quote:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. BDE CONVERSION ANALYTICS FOR OWN ASSIGNED LEADS (Section 9)
 */
exports.get_my_lead_analytics = async (req, res) => {
  try {
    const bdeId = req.user?.id || req.user?._id;
    if (!bdeId) {
      return res.status(401).json({ success: false, message: 'BDE Authentication required.' });
    }

    const myLeads = await TrialKitOrder.find({ bde_id: bdeId }).lean();
    const totalAssigned = myLeads.length;
    const deliveredCount = myLeads.filter(l => l.order_status === 'delivered').length;
    const feedbackReceivedCount = myLeads.filter(l => l.feedback?.feedback_status === 'submitted').length;

    // Commercial orders from assigned EPCs
    const epcIds = myLeads.map(l => l.epc_id);
    const wonCommercialOrders = await EpcOrder.find({
      epc_id: { $in: epcIds },
      order_status: { $nin: ['cancelled', 'pending'] },
      is_trial_order: { $ne: true }
    }).lean();

    const wonOrderCount = wonCommercialOrders.length;
    const convertedEpcIds = new Set(wonCommercialOrders.map(o => o.epc_id.toString()));
    const conversionRate = totalAssigned > 0
      ? ((convertedEpcIds.size / totalAssigned) * 100).toFixed(1)
      : 0;

    const totalSalesValueInr = Math.round(
      wonCommercialOrders.reduce((acc, o) => acc + (o.grand_total_paise || 0), 0) / 100
    );

    return res.status(200).json({
      success: true,
      data: {
        total_assigned_trial_kits: totalAssigned,
        delivered_trial_kits: deliveredCount,
        feedback_received: feedbackReceivedCount,
        orders_won: wonOrderCount,
        conversion_rate: `${conversionRate}%`,
        total_commercial_sales_inr: totalSalesValueInr,
        non_converted_count: Math.max(0, totalAssigned - convertedEpcIds.size)
      }
    });
  } catch (err) {
    console.error('❌ Error fetching BDE lead analytics:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
