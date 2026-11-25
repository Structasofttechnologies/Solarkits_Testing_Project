'use strict';

const mongoose = require('mongoose');
const { sendOTP } = require('../../solarshop-india/utils/nodemailer');

/**
 * Dispatches an in-app and optional email notification to a BOSKIT actor.
 */
const sendNotification = async ({
  recipient_type, // 'boskit_distributor' | 'boskit_dealer' | 'cms_user'
  recipient_id,
  event_type,
  title,
  message,
  action_url = null,
  entity_type = null,
  entity_id = null,
  recipient_email = null,
}) => {
  try {
    const BoskitNotification = mongoose.model('boskit_notifications');

    const notification = await BoskitNotification.create({
      recipient_type,
      recipient_id: mongoose.Types.ObjectId.isValid(recipient_id)
        ? new mongoose.Types.ObjectId(recipient_id)
        : new mongoose.Types.ObjectId(),
      event_type,
      title,
      message,
      action_url,
      entity_type,
      entity_id: entity_id && mongoose.Types.ObjectId.isValid(entity_id)
        ? new mongoose.Types.ObjectId(entity_id)
        : null,
      channels: {
        in_app: { sent: true, read: false },
        email: { sent: Boolean(recipient_email), sent_at: recipient_email ? new Date() : null },
        sms: { sent: false },
        whatsapp: { sent: false },
      },
    });

    // If recipient email is provided, trigger email notification
    if (recipient_email) {
      try {
        await sendOTP(
          recipient_email,
          `BOSKIT Alert: ${title}`,
          `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #d97706;">BOSKIT Business Update</h2>
            <p style="font-size: 14px;">${message}</p>
            ${action_url ? `<p><a href="${action_url}" style="background: #f59e0b; color: #0f172a; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Details</a></p>` : ''}
          </div>`
        );
      } catch (emailErr) {
        console.warn('[sendNotification Email Warning]:', emailErr.message);
      }
    }

    return notification;
  } catch (error) {
    console.error('[sendNotification Error]:', error);
    return null;
  }
};

module.exports = {
  sendNotification,
};
