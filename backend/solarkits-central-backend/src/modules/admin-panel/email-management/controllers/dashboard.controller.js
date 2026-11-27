const AnalyticsService = require('../services/analytics.service');
const { EmailLog, seedInitialDataIfEmpty } = require('../models');

class DashboardController {
  static async getOverview(req, res) {
    try {
      await seedInitialDataIfEmpty();
      const kpis = await AnalyticsService.getDashboardKPIs();
      const trends = await AnalyticsService.getTimeSeriesTrends(14);
      const recentActivity = await EmailLog.find()
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      return res.status(200).json({
        success: true,
        data: {
          kpis,
          trends,
          recent_activity: recentActivity
        }
      });
    } catch (err) {
      console.error('[DashboardController] getOverview error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch dashboard metrics.'
      });
    }
  }
}

module.exports = DashboardController;
