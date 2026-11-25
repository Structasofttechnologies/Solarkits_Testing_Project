'use strict';

const mongoose = require('mongoose');
const AdminNotification = require('../models/india_solarshop_db/admin_notifications.schema');
const {
  addSseClient,
  removeSseClient,
  getUnreadCount,
  broadcastCountUpdate,
  sendAdminNotification,
} = require('../services/admin.notification.service');

/**
 * GET /admin-api/notifications
 * Get paginated list of admin notifications
 */
const get_notifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const query = { deleted_at: null };

    if (req.query.unread === 'true') {
      query.is_read = false;
    }

    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      AdminNotification.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminNotification.countDocuments(query),
      getUnreadCount(),
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        notifications,
        total,
        unread_count: unreadCount,
        page,
        limit,
        has_more: skip + notifications.length < total,
      },
    });
  } catch (error) {
    console.error('[get_notifications error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch admin notifications',
      error: error.message,
    });
  }
};

/**
 * GET /admin-api/notifications/unread-count
 * Fast endpoint to get current unread count for badge
 */
const get_unread_count = async (req, res) => {
  try {
    const unreadCount = await getUnreadCount();
    return res.status(200).json({
      status: 'success',
      data: {
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    console.error('[get_unread_count error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch unread count',
      error: error.message,
    });
  }
};

/**
 * PATCH /admin-api/notifications/:id/read
 * Mark a single notification as read
 */
const mark_as_read = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid notification ID' });
    }

    const updated = await AdminNotification.findByIdAndUpdate(
      id,
      { is_read: true, read_at: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' });
    }

    await broadcastCountUpdate();

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    console.error('[mark_as_read error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

/**
 * POST /admin-api/notifications/mark-all-read
 * Mark all unread notifications as read
 */
const mark_all_read = async (req, res) => {
  try {
    await AdminNotification.updateMany(
      { is_read: false, deleted_at: null },
      { is_read: true, read_at: new Date() }
    );

    await broadcastCountUpdate();

    return res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('[mark_all_read error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

/**
 * DELETE /admin-api/notifications/:id
 * Soft delete a notification
 */
const delete_notification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid notification ID' });
    }

    await AdminNotification.findByIdAndUpdate(id, { deleted_at: new Date() });
    await broadcastCountUpdate();

    return res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('[delete_notification error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};

/**
 * DELETE /admin-api/notifications/clear-all
 * Clear all notifications (soft delete)
 */
const clear_all_notifications = async (req, res) => {
  try {
    await AdminNotification.updateMany(
      { deleted_at: null },
      { deleted_at: new Date() }
    );
    await broadcastCountUpdate();

    return res.status(200).json({
      status: 'success',
      message: 'All notifications cleared',
    });
  } catch (error) {
    console.error('[clear_all_notifications error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to clear notifications',
      error: error.message,
    });
  }
};

/**
 * GET /admin-api/notifications/stream
 * Server-Sent Events (SSE) endpoint for real-time notifications
 */
const sse_stream = async (req, res) => {
  // SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx proxy buffering
  });

  // Flush initial connection heartbeat and current unread count
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Admin Notifications SSE Connected' })}\n\n`);

  try {
    const unreadCount = await getUnreadCount();
    res.write(`data: ${JSON.stringify({ type: 'UNREAD_COUNT_UPDATE', data: { unread_count: unreadCount } })}\n\n`);
  } catch (e) {
    // Ignore error on initial count
  }

  // Register client
  addSseClient(res);

  // Keep-alive heartbeat every 25 seconds
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatInterval);
      removeSseClient(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    removeSseClient(res);
  });
};

/**
 * POST /admin-api/notifications/seed-sample
 * Ensure admin panel has sample/welcome notifications if empty
 */
const seed_sample = async (req, res) => {
  try {
    const existing = await AdminNotification.countDocuments({ deleted_at: null });
    if (existing === 0) {
      await sendAdminNotification({
        title: 'Welcome to SolarKits Admin Panel',
        message: 'Real-time notifications are now active. All system alerts, orders and kit pipeline events will appear here.',
        category: 'system',
        priority: 'normal',
        action_url: '/admin-panel/solar-shop/combokit-configurations/combo-kits',
      });
      await sendAdminNotification({
        title: 'Combo Kit Pipeline Active',
        message: 'Ensure Company Margin and Warehouse Kit Activations are configured for newly created kits.',
        category: 'configuration',
        priority: 'high',
        action_url: '/admin-panel/solar-shop/company-margin',
      });
    }

    const unreadCount = await getUnreadCount();
    return res.status(200).json({
      status: 'success',
      message: 'Sample notifications seeded',
      unread_count: unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  get_notifications,
  get_unread_count,
  mark_as_read,
  mark_all_read,
  delete_notification,
  clear_all_notifications,
  sse_stream,
  seed_sample,
};
