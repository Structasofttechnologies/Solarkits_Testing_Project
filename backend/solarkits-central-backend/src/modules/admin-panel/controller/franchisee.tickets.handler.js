const mongoose = require('mongoose');
const {
  SolarKitsServiceTicket,
  FranchiseeCluster,
  Reseller,
  BDEProfile,
} = require('../models/india_solarshop_db');

/**
 * Helper to compute default TAT hours by ticket type and priority
 */
const getTatHours = (type, priority) => {
  if (priority === 'critical') return 12;
  if (priority === 'high') return 24;
  if (type === 'payment' || type === 'business_support') return 24;
  if (priority === 'low') return 72;
  return 48; // Default medium
};

/**
 * 1. Admin / Centralized Ticket List with Full Filtering
 */
exports.list_tickets = async (req, res) => {
  try {
    const {
      ticket_type,
      priority,
      assigned_department,
      ticket_status,
      cluster_id,
      bde_id,
      franchisee_id,
      is_overdue,
      search,
    } = req.query;

    const query = { deleted_at: null };

    if (ticket_type && ticket_type !== 'all') query.ticket_type = ticket_type;
    if (priority && priority !== 'all') query.priority = priority;
    if (assigned_department && assigned_department !== 'all') query.assigned_department = assigned_department;
    if (ticket_status && ticket_status !== 'all') query.ticket_status = ticket_status;
    if (cluster_id) query.cluster_id = cluster_id;
    if (bde_id) query.assigned_bde_id = bde_id;
    const authFranchiseeId = franchisee_id || req.reseller?._id || (req.user?.role === 'reseller' ? (req.user._id || req.user.id) : null);
    if (authFranchiseeId) query.raised_by_id = authFranchiseeId;
    if (is_overdue === 'true') {
      query.tat_deadline = { $lt: new Date() };
      query.ticket_status = { $nin: ['resolved', 'closed', 'rejected'] };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { ticket_number: { $regex: s, $options: 'i' } },
        { problem_description: { $regex: s, $options: 'i' } },
        { raised_by_name: { $regex: s, $options: 'i' } },
        { item_name: { $regex: s, $options: 'i' } },
      ];
    }

    const tickets = await SolarKitsServiceTicket.find(query)
      .populate('cluster_id', 'cluster_name cluster_code')
      .populate('assigned_bde_id', 'full_name mobile_number email bde_id')
      .populate('raised_by_id', 'business_name mobile email')
      .sort({ created_at: -1 })
      .lean();

    const now = new Date();
    const processedTickets = tickets.map(t => {
      const isOverdueNow = Boolean(
        t.tat_deadline &&
        now > new Date(t.tat_deadline) &&
        !['resolved', 'closed', 'rejected'].includes(t.ticket_status)
      );
      return {
        ...t,
        is_overdue: isOverdueNow,
      };
    });

    // Summary Analytics
    const allActive = await SolarKitsServiceTicket.find({
      deleted_at: null,
      ticket_status: { $nin: ['resolved', 'closed', 'rejected'] },
    }).lean();

    const summary = {
      total_open: allActive.length,
      overdue_tickets: allActive.filter(t => t.tat_deadline && now > new Date(t.tat_deadline)).length,
      replacement_requests: allActive.filter(t => t.ticket_type === 'replacement').length,
      department_counts: {
        account: allActive.filter(t => t.assigned_department === 'account').length,
        admin: allActive.filter(t => t.assigned_department === 'admin').length,
        delivery: allActive.filter(t => t.assigned_department === 'delivery').length,
        support: allActive.filter(t => t.assigned_department === 'support').length,
      },
    };

    return res.status(200).json({
      status: 'success',
      summary,
      count: processedTickets.length,
      data: processedTickets,
    });
  } catch (err) {
    console.error('Error in list_tickets:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 2. Raise Ticket (Franchisee / Portal or Admin on their behalf)
 */
exports.create_ticket = async (req, res) => {
  try {
    const {
      franchisee_id,
      ticket_type,
      priority,
      problem_description,
      item_name,
      order_id,
      order_number,
      assigned_department,
      attachments,
    } = req.body;

    const resellerId = franchisee_id || req.user?._id;
    if (!resellerId) {
      return res.status(400).json({ status: 'error', message: 'Franchisee reference is required.' });
    }

    const franchisee = await Reseller.findById(resellerId).lean();
    if (!franchisee) {
      return res.status(404).json({ status: 'error', message: 'Franchisee not found.' });
    }

    // Auto-link cluster & BDE
    const cluster = await FranchiseeCluster.findOne({
      assigned_franchisee_id: franchisee._id,
      deleted_at: null,
      is_active: true,
    }).populate('primary_bde_id').lean();

    const prio = priority || 'medium';
    const type = ticket_type || 'business_support';
    const tatHours = getTatHours(type, prio);
    const tatDeadline = new Date(Date.now() + tatHours * 60 * 60 * 1000);

    const count = await SolarKitsServiceTicket.countDocuments();
    const currentYear = new Date().getFullYear();
    const ticket_number = `FST-${currentYear}-${String(count + 1).padStart(5, '0')}`;

    const proofFiles = Array.isArray(attachments) ? attachments.map(a => ({
      file_url: typeof a === 'string' ? a : a.file_url,
      file_name: a.file_name || 'attachment',
      file_type: a.file_type || 'image',
    })) : [];

    const ticket = new SolarKitsServiceTicket({
      ticket_number,
      raised_by_type: 'reseller',
      raised_by_id: franchisee._id,
      raised_by_name: franchisee.business_name,
      cluster_id: cluster?._id || null,
      cluster_name: cluster?.cluster_name || null,
      assigned_bde_id: cluster?.primary_bde_id?._id || franchisee.bde_id || null,
      assigned_bde_name: cluster?.primary_bde_id?.full_name || null,
      ticket_type: type,
      priority: prio,
      assigned_department: assigned_department || (type === 'payment' ? 'account' : type === 'delivery' ? 'delivery' : 'support'),
      resolution_tat_hours: tatHours,
      tat_deadline: tatDeadline,
      problem_description,
      item_name: item_name || `${type.replace(/_/g, ' ').toUpperCase()} Request`,
      order_id: order_id || null,
      order_number: order_number || null,
      proof_files: proofFiles,
      ticket_status: 'open',
      status_history: [{
        status: 'open',
        actor_type: req.user?.role ? 'admin' : 'reseller',
        actor_id: req.user?._id || franchisee._id,
        actor_name: req.user?.full_name || franchisee.business_name,
        comment: 'Ticket logged into system',
        timestamp: new Date(),
      }],
    });

    await ticket.save();

    return res.status(201).json({
      status: 'success',
      message: `Ticket "${ticket.ticket_number}" submitted successfully. TAT: ${tatHours} hours.`,
      data: ticket,
    });
  } catch (err) {
    console.error('Error in create_ticket:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 3. Update Ticket (Workflow: Status change, Reassign Dept/BDE, Add Resolution)
 */
exports.update_ticket = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      ticket_status,
      assigned_department,
      assigned_bde_id,
      admin_notes,
      rejection_reason,
      replacement_item_details,
      tracking_number,
      shipping_carrier,
    } = req.body;

    const ticket = await SolarKitsServiceTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ status: 'error', message: 'Ticket not found.' });
    }

    if (ticket_status && ticket_status !== ticket.ticket_status) {
      ticket.ticket_status = ticket_status;
      ticket.status_history.push({
        status: ticket_status,
        actor_type: req.user?.role ? 'admin' : 'reseller',
        actor_id: req.user?._id || null,
        actor_name: req.user?.full_name || 'Admin',
        comment: admin_notes || `Status changed to ${ticket_status}`,
        timestamp: new Date(),
      });
      if (ticket_status === 'resolved' || ticket_status === 'delivered') {
        ticket.resolution_confirmed_at = new Date();
      }
      if (ticket_status === 'closed') {
        ticket.closed_at = new Date();
      }
    }

    if (assigned_department) ticket.assigned_department = assigned_department;
    if (assigned_bde_id) {
      ticket.assigned_bde_id = assigned_bde_id;
      const bdeDoc = await BDEProfile.findById(assigned_bde_id).lean();
      if (bdeDoc) ticket.assigned_bde_name = bdeDoc.full_name;
    }
    if (admin_notes) ticket.admin_notes = admin_notes;
    if (rejection_reason) ticket.rejection_reason = rejection_reason;
    if (replacement_item_details) ticket.replacement_item_details = replacement_item_details;
    if (tracking_number) ticket.tracking_number = tracking_number;
    if (shipping_carrier) ticket.shipping_carrier = shipping_carrier;

    await ticket.save();

    return res.status(200).json({
      status: 'success',
      message: `Ticket "${ticket.ticket_number}" updated successfully.`,
      data: ticket,
    });
  } catch (err) {
    console.error('Error in update_ticket:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};
