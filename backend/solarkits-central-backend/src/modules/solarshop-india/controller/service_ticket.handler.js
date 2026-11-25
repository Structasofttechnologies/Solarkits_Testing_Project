'use strict';
/**
 * service_ticket.handler.js
 *
 * Handles all Service Ticket / Kit Item Replacement operations for SolarKits.
 * - Franchisee (reseller) endpoints
 * - EPC Buyer endpoints
 * - Admin endpoints
 *
 * Routes prefix:
 *   Franchisee: /api/india/v1/reseller/service-tickets/*
 *   EPC Buyer:  /api/india/v1/reseller/epc/service-tickets/*
 *   Admin:      /admin-api/service-tickets/*
 */

const mongoose = require('mongoose');
const path = require('path');

// ── Lazy model loader ─────────────────────────────────────────────────────────
const getModel = (name) => mongoose.model(name);

// ── Ticket number counter ─────────────────────────────────────────────────────
/**
 * Generates next ticket number: SKT-{YEAR}-{6-digit}
 * Uses a lightweight in-DB counter approach via findOneAndUpdate with $inc.
 */
const { india_solarshop_db: db } = require('../config/databases');

const counterSchema = new mongoose.Schema({
  _id:     { type: String },
  seq:     { type: Number, default: 0 },
}, { collection: 'solarkits_ticket_counters' });

let TicketCounter;
try {
  TicketCounter = db.model('solarkits_ticket_counters');
} catch {
  TicketCounter = db.model('solarkits_ticket_counters', counterSchema);
}

async function generateTicketNumber() {
  const year = new Date().getFullYear();
  const key = `SKT-${year}`;
  const doc = await TicketCounter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `SKT-${year}-${String(doc.seq).padStart(6, '0')}`;
}

// ── Helper: build status history entry ───────────────────────────────────────
function buildHistoryEntry(status, actorType, actorId, actorName, comment = null) {
  return { status, actor_type: actorType, actor_id: actorId, actor_name: actorName, comment, timestamp: new Date() };
}

// ────────────────────────────────────────────────────────────────────────────
//  FRANCHISEE (RESELLER) ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/india/v1/reseller/service-tickets/raise
 * Create a new service ticket — Franchisee only
 */
const raise_ticket = async (req, res) => {
  try {
    const reseller = req.reseller;
    const ServiceTicket = getModel('solarkits_service_tickets');

    const {
      order_id, order_number, invoice_number,
      kit_id, kit_name, kit_capacity,
      item_name, item_serial_number,
      issue_category, problem_description,
      installation_date, installation_address,
      project_details, warranty_status,
    } = req.body;

    // Validate required fields
    if (!item_name || !issue_category || !problem_description) {
      return res.status(400).json({ success: false, message: 'item_name, issue_category and problem_description are required.' });
    }

    // Check for duplicate open ticket on same order + item
    if (order_id && item_name) {
      const existing = await ServiceTicket.findOne({
        raised_by_type: 'reseller',
        raised_by_id: reseller._id,
        order_id: order_id,
        item_name: { $regex: new RegExp(`^${item_name.trim()}$`, 'i') },
        ticket_status: { $nin: ['closed', 'rejected'] },
        deleted_at: null,
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `An open ticket (${existing.ticket_number}) already exists for this item in the same order.`,
        });
      }
    }

    const ticket_number = await generateTicketNumber();

    const ticket = new ServiceTicket({
      ticket_number,
      raised_by_type: 'reseller',
      raised_by_id: reseller._id,
      raised_by_name: reseller.business_name || reseller.email,
      order_id: order_id || null,
      order_number: order_number || null,
      invoice_number: invoice_number || null,
      kit_id: kit_id || null,
      kit_name: kit_name || null,
      kit_capacity: kit_capacity || null,
      item_name: item_name.trim(),
      item_serial_number: item_serial_number || null,
      issue_category,
      problem_description: problem_description.trim(),
      installation_date: installation_date ? new Date(installation_date) : null,
      installation_address: installation_address || {},
      project_details: project_details || null,
      warranty_status: warranty_status || 'unknown',
      ticket_status: 'raised',
      status_history: [buildHistoryEntry('raised', 'reseller', reseller._id, reseller.business_name, 'Ticket raised by Franchisee')],
    });

    await ticket.save();

    return res.status(201).json({
      success: true,
      message: 'Service ticket raised successfully.',
      data: { ticket_number: ticket.ticket_number, ticket_id: ticket._id, ticket_status: ticket.ticket_status },
    });
  } catch (error) {
    console.error('[raise_ticket] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to raise ticket. Please try again.' });
  }
};

/**
 * GET /api/india/v1/reseller/service-tickets
 * List all tickets for logged-in reseller
 */
const get_my_tickets = async (req, res) => {
  try {
    const reseller = req.reseller;
    const ServiceTicket = getModel('solarkits_service_tickets');

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      raised_by_type: 'reseller',
      raised_by_id: reseller._id,
      deleted_at: null,
    };
    if (status && status !== 'all') filter.ticket_status = status;

    const [tickets, total] = await Promise.all([
      ServiceTicket.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-status_history -proof_files -admin_notes')
        .lean(),
      ServiceTicket.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: { tickets, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('[get_my_tickets] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch tickets.' });
  }
};

/**
 * GET /api/india/v1/reseller/service-tickets/:id
 * Get single ticket detail (reseller)
 */
const get_my_ticket_detail = async (req, res) => {
  try {
    const reseller = req.reseller;
    const ServiceTicket = getModel('solarkits_service_tickets');

    const ticket = await ServiceTicket.findOne({
      _id: req.params.id,
      raised_by_type: 'reseller',
      raised_by_id: reseller._id,
      deleted_at: null,
    }).lean();

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    return res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('[get_my_ticket_detail] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch ticket detail.' });
  }
};

/**
 * POST /api/india/v1/reseller/service-tickets/:id/confirm-delivery
 * Franchisee confirms replacement has been received → closes ticket
 */
const confirm_replacement_received = async (req, res) => {
  try {
    const reseller = req.reseller;
    const ServiceTicket = getModel('solarkits_service_tickets');

    const ticket = await ServiceTicket.findOne({
      _id: req.params.id,
      raised_by_type: 'reseller',
      raised_by_id: reseller._id,
      ticket_status: 'delivered',
      deleted_at: null,
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found or not yet delivered.' });
    }

    ticket.ticket_status = 'closed';
    ticket.resolution_confirmed_at = new Date();
    ticket.closed_at = new Date();
    ticket.status_history.push(buildHistoryEntry('closed', 'reseller', reseller._id, reseller.business_name, 'Replacement received and confirmed by Franchisee'));

    await ticket.save();

    return res.json({ success: true, message: 'Replacement confirmed. Ticket closed.', data: { ticket_status: 'closed' } });
  } catch (error) {
    console.error('[confirm_replacement_received] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to confirm delivery.' });
  }
};

/**
 * POST /api/india/v1/reseller/service-tickets/:id/upload-proof
 * Upload additional proof files to existing ticket
 */
const upload_ticket_proof = async (req, res) => {
  try {
    const reseller = req.reseller;
    const ServiceTicket = getModel('solarkits_service_tickets');

    const ticket = await ServiceTicket.findOne({
      _id: req.params.id,
      raised_by_type: 'reseller',
      raised_by_id: reseller._id,
      ticket_status: { $in: ['raised', 'under_review'] },
      deleted_at: null,
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found or cannot add proof at this stage.' });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const newFiles = files.map((f) => ({
      file_url: `/uploads/service-tickets/${f.filename}`,
      file_name: f.originalname,
      file_type: f.mimetype?.startsWith('image/') ? 'image' : f.mimetype?.startsWith('video/') ? 'video' : 'document',
      uploaded_at: new Date(),
    }));

    ticket.proof_files.push(...newFiles);
    await ticket.save();

    return res.json({ success: true, message: 'Proof files uploaded.', data: { proof_files: ticket.proof_files } });
  } catch (error) {
    console.error('[upload_ticket_proof] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to upload proof.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
//  EPC BUYER ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/india/v1/reseller/epc/service-tickets/raise
 * EPC Buyer raises a service ticket
 */
const raise_epc_ticket = async (req, res) => {
  try {
    const epc_user = req.user;
    const ServiceTicket = getModel('solarkits_service_tickets');

    const {
      order_id, order_number, invoice_number,
      kit_id, kit_name, kit_capacity,
      item_name, item_serial_number,
      issue_category, problem_description,
      installation_date, installation_address,
      project_details, warranty_status,
    } = req.body;

    if (!item_name || !issue_category || !problem_description) {
      return res.status(400).json({ success: false, message: 'item_name, issue_category and problem_description are required.' });
    }

    // Check for duplicate
    if (order_id && item_name) {
      const existing = await ServiceTicket.findOne({
        raised_by_type: 'epc_buyer',
        raised_by_id: epc_user.id,
        order_id,
        item_name: { $regex: new RegExp(`^${item_name.trim()}$`, 'i') },
        ticket_status: { $nin: ['closed', 'rejected'] },
        deleted_at: null,
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `An open ticket (${existing.ticket_number}) already exists for this item in the same order.`,
        });
      }
    }

    const ticket_number = await generateTicketNumber();

    const ticket = new ServiceTicket({
      ticket_number,
      raised_by_type: 'epc_buyer',
      raised_by_id: epc_user.id,
      raised_by_name: epc_user.name || epc_user.email,
      order_id: order_id || null,
      order_number: order_number || null,
      invoice_number: invoice_number || null,
      kit_id: kit_id || null,
      kit_name: kit_name || null,
      kit_capacity: kit_capacity || null,
      item_name: item_name.trim(),
      item_serial_number: item_serial_number || null,
      issue_category,
      problem_description: problem_description.trim(),
      installation_date: installation_date ? new Date(installation_date) : null,
      installation_address: installation_address || {},
      project_details: project_details || null,
      warranty_status: warranty_status || 'unknown',
      ticket_status: 'raised',
      status_history: [buildHistoryEntry('raised', 'epc_buyer', epc_user.id, epc_user.name || epc_user.email, 'Ticket raised by EPC Buyer')],
    });

    await ticket.save();

    return res.status(201).json({
      success: true,
      message: 'Service ticket raised successfully.',
      data: { ticket_number: ticket.ticket_number, ticket_id: ticket._id, ticket_status: ticket.ticket_status },
    });
  } catch (error) {
    console.error('[raise_epc_ticket] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to raise ticket.' });
  }
};

/**
 * GET /api/india/v1/reseller/epc/service-tickets
 */
const get_epc_tickets = async (req, res) => {
  try {
    const epc_user = req.user;
    const ServiceTicket = getModel('solarkits_service_tickets');

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      raised_by_type: 'epc_buyer',
      raised_by_id: epc_user.id,
      deleted_at: null,
    };
    if (status && status !== 'all') filter.ticket_status = status;

    const [tickets, total] = await Promise.all([
      ServiceTicket.find(filter).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)).select('-status_history -admin_notes').lean(),
      ServiceTicket.countDocuments(filter),
    ]);

    return res.json({ success: true, data: { tickets, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('[get_epc_tickets] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch tickets.' });
  }
};

/**
 * GET /api/india/v1/reseller/epc/service-tickets/:id
 */
const get_epc_ticket_detail = async (req, res) => {
  try {
    const epc_user = req.user;
    const ServiceTicket = getModel('solarkits_service_tickets');

    const ticket = await ServiceTicket.findOne({
      _id: req.params.id,
      raised_by_type: 'epc_buyer',
      raised_by_id: epc_user.id,
      deleted_at: null,
    }).lean();

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    return res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('[get_epc_ticket_detail] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch ticket.' });
  }
};

/**
 * POST /api/india/v1/reseller/epc/service-tickets/:id/confirm-delivery
 */
const confirm_epc_replacement = async (req, res) => {
  try {
    const epc_user = req.user;
    const ServiceTicket = getModel('solarkits_service_tickets');

    const ticket = await ServiceTicket.findOne({
      _id: req.params.id,
      raised_by_type: 'epc_buyer',
      raised_by_id: epc_user.id,
      ticket_status: 'delivered',
      deleted_at: null,
    });

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found or not yet delivered.' });

    ticket.ticket_status = 'closed';
    ticket.resolution_confirmed_at = new Date();
    ticket.closed_at = new Date();
    ticket.status_history.push(buildHistoryEntry('closed', 'epc_buyer', epc_user.id, epc_user.name, 'Replacement received and confirmed by EPC Buyer'));

    await ticket.save();
    return res.json({ success: true, message: 'Replacement confirmed. Ticket closed.', data: { ticket_status: 'closed' } });
  } catch (error) {
    console.error('[confirm_epc_replacement] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to confirm delivery.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
//  ADMIN ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /admin-api/service-tickets/stats
 * Aggregate stats for admin dashboard
 */
const admin_ticket_stats = async (req, res) => {
  try {
    const ServiceTicket = getModel('solarkits_service_tickets');

    const statusCounts = await ServiceTicket.aggregate([
      { $match: { deleted_at: null } },
      { $group: { _id: '$ticket_status', count: { $sum: 1 } } },
    ]);

    const stats = {
      total: 0,
      raised: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      replacement_processing: 0,
      dispatched: 0,
      delivered: 0,
      closed: 0,
    };

    statusCounts.forEach(({ _id, count }) => {
      if (_id in stats) stats[_id] = count;
      stats.total += count;
    });

    // Average resolution time (raised → closed) in hours
    const closedTickets = await ServiceTicket.aggregate([
      { $match: { ticket_status: 'closed', closed_at: { $ne: null }, deleted_at: null } },
      {
        $project: {
          resolution_hours: {
            $divide: [{ $subtract: ['$closed_at', '$created_at'] }, 3600000],
          },
        },
      },
      { $group: { _id: null, avg_hours: { $avg: '$resolution_hours' } } },
    ]);

    stats.avg_resolution_hours = closedTickets[0]?.avg_hours
      ? Math.round(closedTickets[0].avg_hours)
      : 0;

    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[admin_ticket_stats] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};

/**
 * GET /admin-api/service-tickets/list
 * Paginated list with filters
 */
const admin_list_tickets = async (req, res) => {
  try {
    const ServiceTicket = getModel('solarkits_service_tickets');

    const {
      status, raised_by_type, search,
      from_date, to_date,
      page = 1, limit = 25,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { deleted_at: null };

    if (status && status !== 'all') filter.ticket_status = status;
    if (raised_by_type && raised_by_type !== 'all') filter.raised_by_type = raised_by_type;
    if (search) {
      filter.$or = [
        { ticket_number: { $regex: search, $options: 'i' } },
        { raised_by_name: { $regex: search, $options: 'i' } },
        { item_name: { $regex: search, $options: 'i' } },
        { order_number: { $regex: search, $options: 'i' } },
      ];
    }
    if (from_date || to_date) {
      filter.created_at = {};
      if (from_date) filter.created_at.$gte = new Date(from_date);
      if (to_date) filter.created_at.$lte = new Date(to_date);
    }

    const [tickets, total] = await Promise.all([
      ServiceTicket.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-status_history')
        .lean(),
      ServiceTicket.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: { tickets, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('[admin_list_tickets] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to list tickets.' });
  }
};

/**
 * GET /admin-api/service-tickets/:id
 * Full ticket detail for admin
 */
const admin_get_ticket = async (req, res) => {
  try {
    const ServiceTicket = getModel('solarkits_service_tickets');

    const ticket = await ServiceTicket.findOne({ _id: req.params.id, deleted_at: null }).lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    return res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('[admin_get_ticket] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch ticket.' });
  }
};

/**
 * PATCH /admin-api/service-tickets/:id/review
 * Admin updates ticket status
 *
 * Body:
 *   action: 'approve' | 'reject' | 'mark_processing' | 'dispatch' | 'mark_delivered'
 *   rejection_reason: string (required if action='reject')
 *   tracking_number: string (required if action='dispatch')
 *   shipping_carrier: string (for action='dispatch')
 *   replacement_item_details: string (optional)
 *   admin_notes: string (optional)
 */
const admin_review_ticket = async (req, res) => {
  try {
    const ServiceTicket = getModel('solarkits_service_tickets');
    const admin = req.user; // CMS user from check_auth

    const { action, rejection_reason, tracking_number, shipping_carrier, replacement_item_details, admin_notes } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: 'action is required.' });
    }

    const ticket = await ServiceTicket.findOne({ _id: req.params.id, deleted_at: null });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    const adminName = admin?.name || admin?.email || 'Admin';
    const adminId = admin?.id || null;

    const VALID_TRANSITIONS = {
      approve:         { from: ['raised', 'under_review'], to: 'approved' },
      reject:          { from: ['raised', 'under_review', 'approved'], to: 'rejected' },
      mark_processing: { from: ['approved'], to: 'replacement_processing' },
      dispatch:        { from: ['approved', 'replacement_processing'], to: 'dispatched' },
      mark_delivered:  { from: ['dispatched'], to: 'delivered' },
      under_review:    { from: ['raised'], to: 'under_review' },
    };

    const transition = VALID_TRANSITIONS[action];
    if (!transition) {
      return res.status(400).json({ success: false, message: `Invalid action: ${action}` });
    }
    if (!transition.from.includes(ticket.ticket_status)) {
      return res.status(422).json({
        success: false,
        message: `Cannot perform '${action}' on a ticket with status '${ticket.ticket_status}'.`,
      });
    }

    // Action-specific validation
    if (action === 'reject' && !rejection_reason?.trim()) {
      return res.status(400).json({ success: false, message: 'rejection_reason is required when rejecting a ticket.' });
    }
    if (action === 'dispatch' && !tracking_number?.trim()) {
      return res.status(400).json({ success: false, message: 'tracking_number is required when dispatching.' });
    }

    // Apply changes
    ticket.ticket_status = transition.to;

    if (action === 'reject') {
      ticket.rejection_reason = rejection_reason.trim();
    }
    if (action === 'dispatch') {
      ticket.tracking_number = tracking_number.trim();
      ticket.shipping_carrier = shipping_carrier?.trim() || null;
      ticket.dispatched_at = new Date();
    }
    if (action === 'mark_delivered') {
      ticket.delivered_at = new Date();
    }
    if (replacement_item_details) {
      ticket.replacement_item_details = replacement_item_details.trim();
    }
    if (admin_notes !== undefined) {
      ticket.admin_notes = admin_notes?.trim() || null;
    }

    ticket.reviewed_by_id = adminId;

    const commentMap = {
      approve:         'Ticket approved by admin. Replacement will be processed.',
      reject:          `Ticket rejected: ${rejection_reason}`,
      mark_processing: 'Replacement item is being processed.',
      dispatch:        `Replacement dispatched via ${shipping_carrier || 'courier'}. Tracking: ${tracking_number}`,
      mark_delivered:  'Replacement marked as delivered by admin.',
      under_review:    'Ticket taken under review by support team.',
    };

    ticket.status_history.push(buildHistoryEntry(transition.to, 'admin', adminId, adminName, commentMap[action]));

    await ticket.save();

    return res.json({
      success: true,
      message: `Ticket status updated to '${transition.to}'.`,
      data: {
        ticket_status: ticket.ticket_status,
        tracking_number: ticket.tracking_number,
        dispatched_at: ticket.dispatched_at,
      },
    });
  } catch (error) {
    console.error('[admin_review_ticket] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update ticket.' });
  }
};

module.exports = {
  // Franchisee
  raise_ticket,
  get_my_tickets,
  get_my_ticket_detail,
  confirm_replacement_received,
  upload_ticket_proof,
  // EPC Buyer
  raise_epc_ticket,
  get_epc_tickets,
  get_epc_ticket_detail,
  confirm_epc_replacement,
  // Admin
  admin_ticket_stats,
  admin_list_tickets,
  admin_get_ticket,
  admin_review_ticket,
};
