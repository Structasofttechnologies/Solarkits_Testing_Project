const { EmailLog, EmailUsage, EmailAlert } = require('../models');

/**
 * Webhooks Controller for AWS SES and Sender.net Delivery & Bounce Events
 */
class WebhooksController {
  static async handleSesWebhook(req, res) {
    try {
      let payload = req.body;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch {}
      }

      // Handle AWS SNS Subscription Confirmation
      if (payload?.Type === 'SubscriptionConfirmation' && payload?.SubscribeURL) {
        console.log('[Webhooks] AWS SES SNS Subscription URL:', payload.SubscribeURL);
        return res.status(200).send('OK');
      }

      // Handle AWS SES Notification Events
      const message = payload?.Message ? (typeof payload.Message === 'string' ? JSON.parse(payload.Message) : payload.Message) : payload;
      const notificationType = message?.notificationType || message?.eventType;

      if (notificationType === 'Bounce') {
        const bounce = message.bounce;
        const bounceType = bounce?.bounceType; // 'Permanent' or 'Transient'
        const bouncedRecipients = bounce?.bouncedRecipients || [];

        for (const recipient of bouncedRecipients) {
          const email = recipient.emailAddress?.toLowerCase();
          const isPermanent = bounceType === 'Permanent';

          await EmailLog.updateMany(
            { recipient: email, provider: 'aws_ses' },
            {
              status: 'bounced',
              bounce_type: isPermanent ? 'permanent' : 'transient',
              is_locked_bounce: isPermanent,
              is_resend_eligible: !isPermanent,
              error_message: `SES Bounce: ${bounceType} (${recipient.diagnosticCode || 'Undelivered'})`
            }
          );

          if (isPermanent) {
            await EmailAlert.create({
              type: 'high_bounce',
              provider: 'aws_ses',
              message: `Permanent bounce detected for ${email}. Recipient permanently locked from retry queue.`,
              severity: 'medium'
            });
          }
        }
      } else if (notificationType === 'Delivery') {
        const delivery = message.delivery;
        const mail = message.mail;
        if (mail?.messageId) {
          await EmailLog.findOneAndUpdate(
            { message_id: mail.messageId },
            {
              status: 'delivered',
              delivered_at: new Date(delivery?.timestamp || Date.now())
            }
          );
        }
      }

      return res.status(200).json({ success: true, message: 'SES webhook processed.' });
    } catch (err) {
      console.error('[Webhooks] SES webhook error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async handleSenderWebhook(req, res) {
    try {
      const payload = req.body;
      const event = payload?.event || payload?.type;
      const email = payload?.recipient || payload?.email;

      if (event === 'bounce' || event === 'complaint') {
        await EmailLog.updateMany(
          { recipient: email?.toLowerCase(), provider: 'sender' },
          {
            status: event === 'complaint' ? 'complained' : 'bounced',
            is_locked_bounce: true,
            is_resend_eligible: false,
            error_message: `Sender.net reported: ${event}`
          }
        );
      } else if (event === 'delivered') {
        await EmailLog.updateMany(
          { recipient: email?.toLowerCase(), provider: 'sender', status: 'queued' },
          {
            status: 'delivered',
            delivered_at: new Date()
          }
        );
      }

      return res.status(200).json({ success: true, message: 'Sender webhook processed.' });
    } catch (err) {
      console.error('[Webhooks] Sender webhook error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = WebhooksController;
