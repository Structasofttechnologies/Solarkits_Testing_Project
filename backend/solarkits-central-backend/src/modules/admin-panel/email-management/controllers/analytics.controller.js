const AnalyticsService = require('../services/analytics.service');

class AnalyticsController {
  static async getDeliverability(req, res) {
    try {
      const kpis = await AnalyticsService.getDashboardKPIs();
      const trends = await AnalyticsService.getTimeSeriesTrends(30);
      const providers = await AnalyticsService.getProviderComparison();

      return res.status(200).json({
        success: true,
        data: {
          metrics: kpis.all_time,
          trends,
          providers
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getProviderMetrics(req, res) {
    try {
      const providers = await AnalyticsService.getProviderComparison();
      return res.status(200).json({ success: true, data: providers });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = AnalyticsController;
