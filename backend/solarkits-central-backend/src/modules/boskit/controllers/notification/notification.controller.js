'use strict';

const mongoose = require('mongoose');
const { sendNotification } = require('../../services/notification.service');

/**
 * 1. Get Notifications for current actor
 */
const get_notifications = async (req, res) => {
  try {
    const recipientId = req.user?.id || req.query.recipient_id;
    const recipientType = req.user?.role === 'dealer'
      ? 'boskit_dealer'
      : (req.user?.role === 'distributor' ? 'boskit_distributor' : 'cms_user');

    const BoskitNotification = mongoose.model('boskit_notifications');
    const query = {};

    if (recipientId && mongoose.Types.ObjectId.isValid(recipientId)) {
      query.recipient_id = new mongoose.Types.ObjectId(recipientId);
    }

    const notifications = await BoskitNotification.find(query)
      .sort({ created_at: -1 })
      .limit(30)
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      notifications: notifications.map((n) => ({
        id: n._id,
        event_type: n.event_type,
        title: n.title,
        message: n.message,
        action_url: n.action_url,
        read: n.channels?.in_app?.read || false,
        created_at: n.created_at,
      })),
      unread_count: notifications.filter((n) => !n.channels?.in_app?.read).length,
    });
  } catch (error) {
    console.error('[get_notifications Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch notifications: ' + error.message,
    });
  }
};

/**
 * 2. Mark Notification(s) as Read
 */
const mark_as_read = async (req, res) => {
  try {
    const { notification_id, mark_all = false } = req.body;
    const recipientId = req.user?.id || req.body.recipient_id;

    const BoskitNotification = mongoose.model('boskit_notifications');

    if (mark_all && recipientId && mongoose.Types.ObjectId.isValid(recipientId)) {
      await BoskitNotification.updateMany(
        { recipient_id: new mongoose.Types.ObjectId(recipientId) },
        { $set: { 'channels.in_app.read': true, 'channels.in_app.read_at': new Date() } }
      );
    } else if (notification_id && mongoose.Types.ObjectId.isValid(notification_id)) {
      await BoskitNotification.findByIdAndUpdate(notification_id, {
        $set: { 'channels.in_app.read': true, 'channels.in_app.read_at': new Date() },
      });
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Notifications marked as read.',
    });
  } catch (error) {
    console.error('[mark_as_read Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to update notifications: ' + error.message,
    });
  }
};

/**
 * 3. Test / Direct Dispatch
 */
const dispatch_notification = async (req, res) => {
  try {
    const {
      recipient_type = 'boskit_distributor',
      recipient_id,
      event_type = 'order_placed',
      title = 'Order Dispatched',
      message = 'Your solar kit consignment has been shipped from warehouse hub.',
      action_url = '/distributor/portal/orders',
      recipient_email,
    } = req.body;

    const notification = await sendNotification({
      recipient_type,
      recipient_id,
      event_type,
      title,
      message,
      action_url,
      recipient_email,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Notification queued & dispatched.',
      notification,
    });
  } catch (error) {
    console.error('[dispatch_notification Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to dispatch notification: ' + error.message,
    });
  }
};

module.exports = {
  get_notifications,
  mark_as_read,
  dispatch_notification,
};
