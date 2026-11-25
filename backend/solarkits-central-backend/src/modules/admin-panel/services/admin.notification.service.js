'use strict';

const AdminNotification = require('../models/india_solarshop_db/admin_notifications.schema');

// Active Server-Sent Events (SSE) connections
const sseClients = new Set();

/**
 * Register an SSE client connection
 */
const addSseClient = (res) => {
  sseClients.add(res);
  console.log(`[Admin Notifications SSE] Client connected. Total active clients: ${sseClients.size}`);
};

/**
 * Remove an SSE client connection
 */
const removeSseClient = (res) => {
  sseClients.delete(res);
  console.log(`[Admin Notifications SSE] Client disconnected. Total active clients: ${sseClients.size}`);
};

/**
 * Broadcast an event payload to all active SSE clients
 */
const broadcastToClients = (eventType, payload) => {
  const data = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (err) {
      console.warn('[Admin Notifications SSE] Failed to write to client, removing:', err.message);
      sseClients.delete(client);
    }
  }
};

/**
 * Get total unread count for admin notifications
 */
const getUnreadCount = async () => {
  try {
    return await AdminNotification.countDocuments({
      is_read: false,
      deleted_at: null,
    });
  } catch (err) {
    console.error('[getUnreadCount Error]:', err.message);
    return 0;
  }
};

/**
 * Create and broadcast a new admin notification
 */
const sendAdminNotification = async ({
  title,
  message,
  category = 'general',
  priority = 'normal',
  action_url = null,
  metadata = {},
}) => {
  try {
    if (!title || !message) {
      console.warn('[sendAdminNotification Warning] Title and message are required.');
      return null;
    }

    const notification = await AdminNotification.create({
      title,
      message,
      category,
      priority,
      action_url,
      metadata,
      is_read: false,
      read_at: null,
      deleted_at: null,
    });

    const unreadCount = await getUnreadCount();

    // Real-time broadcast to all connected admin panels
    broadcastToClients('NEW_NOTIFICATION', {
      notification,
      unread_count: unreadCount,
    });

    return notification;
  } catch (error) {
    console.error('[sendAdminNotification Error]:', error);
    return null;
  }
};

/**
 * Broadcast updated unread count (e.g. after mark read or delete)
 */
const broadcastCountUpdate = async () => {
  const unreadCount = await getUnreadCount();
  broadcastToClients('UNREAD_COUNT_UPDATE', { unread_count: unreadCount });
};

module.exports = {
  addSseClient,
  removeSseClient,
  sendAdminNotification,
  getUnreadCount,
  broadcastCountUpdate,
  broadcastToClients,
};
