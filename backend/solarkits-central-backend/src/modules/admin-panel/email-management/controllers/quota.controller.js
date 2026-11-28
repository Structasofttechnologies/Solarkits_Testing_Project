const QuotaService = require('../services/quota.service');

class QuotaController {
  static async getOverview(req, res) {
    try {
      const data = await QuotaService.getQuotaOverview();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateConfig(req, res) {
    try {
      const { provider } = req.params;
      const { allocated_limit, low_quota_threshold, reset_period } = req.body;
      const updated = await QuotaService.updateQuotaConfig(provider, {
        allocated_limit,
        low_quota_threshold,
        reset_period
      });
      return res.status(200).json({ success: true, message: 'Quota limits updated.', data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async resetUsage(req, res) {
    try {
      const { provider } = req.params;
      const reset = await QuotaService.resetQuotaUsage(provider);
      return res.status(200).json({ success: true, message: `Usage counter for ${provider} reset successfully.`, data: reset });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = QuotaController;
