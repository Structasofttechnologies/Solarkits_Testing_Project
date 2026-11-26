const RetryService = require('../services/retry.service');
const { EmailLog } = require('../models');

class ResendController {
  static async getFailedQueue(req, res) {
    try {
      const { provider } = req.query;
      const filter = {
        status: { $in: ['failed', 'bounced'] }
      };

      if (provider && provider !== 'all') {
        filter.provider = provider;
      }

      const failedEmails = await EmailLog.find(filter)
        .sort({ updated_at: -1 })
        .limit(100)
        .lean();

      return res.status(200).json({
        success: true,
        data: failedEmails
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async retrySingle(req, res) {
    try {
      const { id } = req.params;
      const result = await RetryService.retrySingleEmail(id);
      return res.status(200).json({
        success: result.success,
        message: result.success ? 'Email resent successfully.' : 'Retry attempt failed.',
        data: result
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async retryBulk(req, res) {
    try {
      const { provider, limit } = req.body;
      const result = await RetryService.retryBulkEligibleEmails({ provider, limit: limit || 25 });
      return res.status(200).json({
        success: true,
        message: `Processed ${result.total_found} failed emails: ${result.succeeded} recovered, ${result.failed} failed.`,
        data: result
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = ResendController;
