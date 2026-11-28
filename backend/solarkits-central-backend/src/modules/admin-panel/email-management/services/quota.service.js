const { EmailQuota, EmailAlert, EmailProvider } = require('../models');

/**
 * Quota Management Service
 */
class QuotaService {
  static async getQuotaOverview() {
    const quotas = await EmailQuota.find().sort({ provider: 1 }).lean();
    const providers = await EmailProvider.find().lean();
    const providerMap = {};
    providers.forEach(p => { providerMap[p.provider_key] = p; });

    return quotas.map(q => {
      const p = providerMap[q.provider] || {};
      const usagePercentage = q.allocated_limit > 0
        ? Math.min(100, Math.round((q.used_count / q.allocated_limit) * 100))
        : 0;

      return {
        ...q,
        provider_name: p.name || q.display_name,
        is_enabled: p.is_enabled ?? true,
        is_default: p.is_default ?? false,
        usage_percentage: usagePercentage,
        is_low: q.remaining_count <= q.low_quota_threshold
      };
    });
  }

  static async updateQuotaConfig(provider, { allocated_limit, low_quota_threshold, reset_period }) {
    const quota = await EmailQuota.findOne({ provider });
    if (!quota) {
      throw new Error(`Quota record for provider '${provider}' not found.`);
    }

    if (allocated_limit !== undefined) {
      quota.allocated_limit = Number(allocated_limit);
      quota.remaining_count = Math.max(0, quota.allocated_limit - quota.used_count);
    }
    if (low_quota_threshold !== undefined) {
      quota.low_quota_threshold = Number(low_quota_threshold);
    }
    if (reset_period) {
      quota.reset_period = reset_period;
    }

    // Reset alert flag if remaining is now above threshold
    if (quota.remaining_count > quota.low_quota_threshold) {
      quota.is_low_quota_alert_sent = false;
    }

    quota.last_synced_at = new Date();
    await quota.save();
    return quota;
  }

  static async resetQuotaUsage(provider) {
    const quota = await EmailQuota.findOne({ provider });
    if (!quota) throw new Error(`Provider '${provider}' quota not found.`);

    quota.used_count = 0;
    quota.remaining_count = quota.allocated_limit;
    quota.is_low_quota_alert_sent = false;
    quota.period_start = new Date();
    quota.last_synced_at = new Date();
    await quota.save();
    return quota;
  }
}

module.exports = QuotaService;
