const { EmailLog, EmailUsage, EmailQuota, EmailPayment } = require('../models');

/**
 * Email Analytics & Reporting Service
 */
class AnalyticsService {
  static async getDashboardKPIs() {
    const today = new Date().toISOString().split('T')[0];

    // Today's Usage
    const todayUsages = await EmailUsage.find({ date: today }).lean();
    let sentToday = 0;
    let deliveredToday = 0;
    let failedToday = 0;
    let bouncedToday = 0;

    todayUsages.forEach(u => {
      sentToday += u.total_sent || 0;
      deliveredToday += u.delivered || 0;
      failedToday += u.failed || 0;
      bouncedToday += u.bounced || 0;
    });

    // All Time Totals from EmailLog
    const totalSent = await EmailLog.countDocuments();
    const totalDelivered = await EmailLog.countDocuments({ status: 'delivered' });
    const totalFailed = await EmailLog.countDocuments({ status: 'failed' });
    const totalBounced = await EmailLog.countDocuments({ status: 'bounced' });

    // Quotas
    const quotas = await EmailQuota.find().lean();
    let totalAllocatedQuota = 0;
    let totalUsedQuota = 0;
    let totalRemainingQuota = 0;

    quotas.forEach(q => {
      totalAllocatedQuota += q.allocated_limit || 0;
      totalUsedQuota += q.used_count || 0;
      totalRemainingQuota += q.remaining_count || 0;
    });

    // Deliverability Rates
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '100.0';
    const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : '0.0';

    // Financial Overview
    const payments = await EmailPayment.find().lean();
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;

    payments.forEach(p => {
      totalInvoiced += p.amount_invoiced || 0;
      totalPaid += p.amount_paid || 0;
      totalPending += p.amount_pending || 0;
    });

    return {
      today: {
        sent: sentToday,
        delivered: deliveredToday,
        failed: failedToday,
        bounced: bouncedToday
      },
      all_time: {
        total_sent: totalSent,
        delivered: totalDelivered,
        failed: totalFailed,
        bounced: totalBounced,
        delivery_rate_pct: Number(deliveryRate),
        bounce_rate_pct: Number(bounceRate)
      },
      quota: {
        allocated: totalAllocatedQuota,
        used: totalUsedQuota,
        remaining: totalRemainingQuota,
        usage_pct: totalAllocatedQuota > 0 ? Math.round((totalUsedQuota / totalAllocatedQuota) * 100) : 0
      },
      financials: {
        invoiced: totalInvoiced,
        paid: totalPaid,
        pending: totalPending,
        currency: 'INR'
      }
    };
  }

  static async getTimeSeriesTrends(days = 14) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const dateLimitStr = dateLimit.toISOString().split('T')[0];

    const usages = await EmailUsage.find({ date: { $gte: dateLimitStr } })
      .sort({ date: 1 })
      .lean();

    // Group by Date
    const trendsByDate = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      trendsByDate[ds] = { date: ds, sent: 0, delivered: 0, bounced: 0, failed: 0 };
    }

    usages.forEach(u => {
      if (trendsByDate[u.date]) {
        trendsByDate[u.date].sent += u.total_sent || 0;
        trendsByDate[u.date].delivered += u.delivered || 0;
        trendsByDate[u.date].bounced += u.bounced || 0;
        trendsByDate[u.date].failed += u.failed || 0;
      }
    });

    return Object.values(trendsByDate);
  }

  static async getProviderComparison() {
    const providers = ['sender', 'aws_ses', 'smtp'];
    const comparison = [];

    for (const p of providers) {
      const sent = await EmailLog.countDocuments({ provider: p });
      const delivered = await EmailLog.countDocuments({ provider: p, status: 'delivered' });
      const failed = await EmailLog.countDocuments({ provider: p, status: 'failed' });
      const bounced = await EmailLog.countDocuments({ provider: p, status: 'bounced' });

      comparison.push({
        provider: p,
        sent,
        delivered,
        failed,
        bounced,
        delivery_rate: sent > 0 ? Math.round((delivered / sent) * 100) : 100
      });
    }

    return comparison;
  }
}

module.exports = AnalyticsService;
