const { EmailLog, EmailAttempt, EmailQuota } = require('../models');
const ProviderFactory = require('../providers/providerFactory');

/**
 * Resend & Retry Management Service
 * Enforces strict permanent bounce security locks and manages retry attempts.
 */
class RetryService {
  /**
   * Retries an individual failed email
   */
  static async retrySingleEmail(logId) {
    const log = await EmailLog.findById(logId);
    if (!log) {
      throw new Error('Email log entry not found.');
    }

    // Strict Security Guard: Bounced or Complained emails cannot be retried
    if (log.is_locked_bounce || log.status === 'bounced' || log.status === 'complained') {
      throw new Error('Permanent Bounce Guard Active: Retrying bounced or complained recipients is strictly prohibited to prevent domain reputation damage.');
    }

    if (log.attempts_count >= log.max_attempts) {
      throw new Error(`Maximum retry attempts (${log.max_attempts}) already exhausted for this email.`);
    }

    const nextAttempt = log.attempts_count + 1;
    const startTime = Date.now();

    // Select provider (use existing or fallback)
    const providerInstance = await ProviderFactory.getProviderInstance(log.provider);
    const sendResult = await providerInstance.sendEmail({
      to: log.recipient,
      subject: log.subject,
      html: log.html_snippet || ''
    });

    // Record attempt
    await EmailAttempt.create({
      email_log_id: log._id,
      attempt_number: nextAttempt,
      provider: log.provider,
      status: sendResult.success ? 'success' : 'failed',
      error: sendResult.error || null,
      duration_ms: sendResult.duration_ms || (Date.now() - startTime),
      response_data: sendResult.details || {}
    });

    // Update log
    log.attempts_count = nextAttempt;
    if (sendResult.success) {
      log.status = 'delivered';
      log.is_resend_eligible = false;
      log.delivered_at = new Date();
      log.error_message = null;
    } else {
      log.status = 'failed';
      log.error_message = sendResult.error || 'Retry attempt failed.';
      log.is_resend_eligible = nextAttempt < log.max_attempts;
    }

    await log.save();

    return {
      success: sendResult.success,
      attemptNumber: nextAttempt,
      status: log.status,
      error: sendResult.error || null
    };
  }

  /**
   * Retries all eligible failed emails in bulk
   */
  static async retryBulkEligibleEmails({ provider = null, limit = 50 } = {}) {
    const query = {
      status: 'failed',
      is_locked_bounce: { $ne: true },
      is_resend_eligible: true,
      attempts_count: { $lt: 3 }
    };

    if (provider) {
      query.provider = provider;
    }

    const eligibleLogs = await EmailLog.find(query).limit(Number(limit));
    const results = {
      total_found: eligibleLogs.length,
      succeeded: 0,
      failed: 0,
      details: []
    };

    for (const log of eligibleLogs) {
      try {
        const res = await this.retrySingleEmail(log._id);
        if (res.success) {
          results.succeeded += 1;
        } else {
          results.failed += 1;
        }
        results.details.push({ logId: log._id, recipient: log.recipient, success: res.success });
      } catch (err) {
        results.failed += 1;
        results.details.push({ logId: log._id, recipient: log.recipient, success: false, error: err.message });
      }
    }

    return results;
  }
}

module.exports = RetryService;
