const {
  EmailLog,
  EmailAttempt,
  EmailQuota,
  EmailUsage,
  EmailAlert
} = require('../models');
const ProviderFactory = require('../providers/providerFactory');

/**
 * Central Email Manager Service
 * Centralizes logging, quota tracking, provider routing, failover, and metrics.
 */
class EmailManagerService {
  /**
   * Main dispatch method
   */
  static async sendManagedEmail({
    to,
    recipientName = '',
    subject,
    html = '',
    text = '',
    template = 'custom',
    purpose = 'transactional',
    provider = null,
    metadata = {}
  }) {
    if (!to || !subject) {
      throw new Error('Email recipient (to) and subject are strictly required.');
    }

    const cleanTo = to.trim().toLowerCase();
    const startTime = Date.now();

    // 1. Resolve Provider and Failover Routing
    const routing = await ProviderFactory.resolveRouting(provider);
    let activeKey = routing.activeKey;

    // 2. Create Initial Log Entry
    const log = await EmailLog.create({
      recipient: cleanTo,
      recipient_name: recipientName,
      subject: subject,
      template_name: template,
      purpose: purpose,
      provider: activeKey,
      status: 'queued',
      attempts_count: 1,
      max_attempts: 3,
      html_snippet: html ? html.substring(0, 300) : '',
      payload_metadata: {
        ...metadata,
        fallback_routing: routing.isFallbackActive ? routing.reason : null
      }
    });

    // 3. Obtain Provider Instance & Send
    let providerInstance = await ProviderFactory.getProviderInstance(activeKey);
    let sendResult = await providerInstance.sendEmail({
      to: cleanTo,
      subject,
      html,
      text
    });

    let finalAttempt = 1;

    // 4. Record First Attempt
    await EmailAttempt.create({
      email_log_id: log._id,
      attempt_number: 1,
      provider: activeKey,
      status: sendResult.success ? 'success' : 'failed',
      error: sendResult.error || null,
      duration_ms: sendResult.duration_ms || (Date.now() - startTime),
      response_data: sendResult.details || {}
    });

    // 5. Automatic Failover if Primary Failed and Fallback is Configured
    if (!sendResult.success && routing.fallbackKey && routing.fallbackKey !== activeKey) {
      console.warn(`[EmailManager] Primary provider ${activeKey} failed. Executing fallback to ${routing.fallbackKey}...`);
      finalAttempt = 2;
      const fallbackInstance = await ProviderFactory.getProviderInstance(routing.fallbackKey);
      const fallbackResult = await fallbackInstance.sendEmail({
        to: cleanTo,
        subject,
        html,
        text
      });

      await EmailAttempt.create({
        email_log_id: log._id,
        attempt_number: 2,
        provider: routing.fallbackKey,
        status: fallbackResult.success ? 'success' : 'failed',
        error: fallbackResult.error || null,
        duration_ms: fallbackResult.duration_ms || (Date.now() - startTime),
        response_data: fallbackResult.details || {}
      });

      if (fallbackResult.success) {
        sendResult = fallbackResult;
        activeKey = routing.fallbackKey;
      }
    }

    // 6. Update Log Record
    const isSuccess = sendResult.success === true;
    log.status = isSuccess ? 'delivered' : 'failed';
    log.provider = activeKey;
    log.message_id = sendResult.messageId || null;
    log.error_message = sendResult.error || null;
    log.attempts_count = finalAttempt;
    log.delivered_at = isSuccess ? new Date() : null;
    log.is_resend_eligible = !isSuccess;
    await log.save();

    // 7. Update Dynamic Quota & Check Thresholds
    await this._updateQuotaAndUsage(activeKey, purpose, isSuccess);

    return {
      success: isSuccess,
      logId: log._id,
      messageId: log.message_id,
      provider: activeKey,
      status: log.status,
      duration_ms: Date.now() - startTime,
      error: sendResult.error || null
    };
  }

  /**
   * Internal helper to record quota decrement and daily usage aggregates
   */
  static async _updateQuotaAndUsage(providerKey, purpose, isSuccess) {
    try {
      // Update Quota
      const quota = await EmailQuota.findOne({ provider: providerKey });
      if (quota) {
        quota.used_count += 1;
        quota.remaining_count = Math.max(0, quota.allocated_limit - quota.used_count);
        quota.last_synced_at = new Date();

        // Check Low Quota Alert
        if (quota.remaining_count <= quota.low_quota_threshold && !quota.is_low_quota_alert_sent) {
          quota.is_low_quota_alert_sent = true;
          await EmailAlert.create({
            type: 'low_quota',
            provider: providerKey,
            message: `Provider ${providerKey} quota is critically low. Remaining: ${quota.remaining_count} of ${quota.allocated_limit}.`,
            severity: 'high',
            threshold: quota.low_quota_threshold,
            current_value: quota.remaining_count
          });
        }
        await quota.save();
      }

      // Update Daily Usage Ledger
      const today = new Date().toISOString().split('T')[0];
      await EmailUsage.findOneAndUpdate(
        { date: today, provider: providerKey },
        {
          $inc: {
            total_sent: 1,
            delivered: isSuccess ? 1 : 0,
            accepted: isSuccess ? 1 : 0,
            failed: isSuccess ? 0 : 1
          },
          $setOnInsert: { purpose: purpose || 'all' }
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('[EmailManager] _updateQuotaAndUsage error:', err.message);
    }
  }
}

module.exports = EmailManagerService;
