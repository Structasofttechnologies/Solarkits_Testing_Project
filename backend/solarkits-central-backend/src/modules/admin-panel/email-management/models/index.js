const EmailLog = require('./EmailLog');
const EmailAttempt = require('./EmailAttempt');
const EmailQuota = require('./EmailQuota');
const EmailUsage = require('./EmailUsage');
const EmailProvider = require('./EmailProvider');
const EmailPayment = require('./EmailPayment');
const EmailAlert = require('./EmailAlert');

/**
 * Ensures initial default providers and quotas exist in MongoDB if database is fresh.
 * All subsequent data, updates, emails, and balances are 100% dynamic in MongoDB.
 */
async function seedInitialDataIfEmpty() {
  try {
    const providerCount = await EmailProvider.countDocuments();
    if (providerCount === 0) {
      console.log('[EmailManagement] Initializing default dynamic providers in MongoDB...');
      await EmailProvider.insertMany([
        {
          provider_key: 'sender',
          name: 'Sender.net API Service',
          is_enabled: true,
          is_default: true,
          fallback_enabled: true,
          fallback_provider_key: 'aws_ses',
          priority: 1,
          credentials: {
            api_key: process.env.SENDER_API_KEY || '',
            from_email: process.env.SENDER_FROM_EMAIL || 'support@solarkits.in',
            from_name: 'SolarKits Official'
          },
          max_send_rate: 20,
          health_status: 'healthy'
        },
        {
          provider_key: 'aws_ses',
          name: 'Amazon Simple Email Service (SES)',
          is_enabled: true,
          is_default: false,
          fallback_enabled: true,
          fallback_provider_key: 'smtp',
          priority: 2,
          credentials: {
            region: process.env.AWS_REGION || 'ap-south-1',
            access_key_id: process.env.AWS_ACCESS_KEY_ID || '',
            secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || '',
            from_email: process.env.AWS_SES_FROM_EMAIL || 'notifications@solarkits.in',
            from_name: 'SolarKits Cloud'
          },
          max_send_rate: 14,
          health_status: 'healthy'
        },
        {
          provider_key: 'smtp',
          name: 'Dedicated SMTP Relay',
          is_enabled: true,
          is_default: false,
          fallback_enabled: false,
          priority: 3,
          credentials: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
            pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
            from_email: process.env.SMTP_FROM || 'noreply@solarkits.in',
            from_name: 'SolarKits Relay'
          },
          max_send_rate: 10,
          health_status: 'healthy'
        }
      ]);
    }

    const quotaCount = await EmailQuota.countDocuments();
    if (quotaCount === 0) {
      console.log('[EmailManagement] Initializing dynamic quota ledgers in MongoDB...');
      const now = new Date();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      await EmailQuota.insertMany([
        {
          provider: 'sender',
          display_name: 'Sender.net Monthly Limit',
          allocated_limit: 50000,
          used_count: 0,
          remaining_count: 50000,
          reset_period: 'monthly',
          period_start: new Date(now.getFullYear(), now.getMonth(), 1),
          period_end: monthEnd,
          low_quota_threshold: 5000
        },
        {
          provider: 'aws_ses',
          display_name: 'AWS SES 24h Rolling Quota',
          allocated_limit: 10000,
          used_count: 0,
          remaining_count: 10000,
          reset_period: 'rolling_24h',
          period_start: now,
          low_quota_threshold: 1500
        },
        {
          provider: 'smtp',
          display_name: 'Direct SMTP Relay Quota',
          allocated_limit: 5000,
          used_count: 0,
          remaining_count: 5000,
          reset_period: 'monthly',
          period_start: new Date(now.getFullYear(), now.getMonth(), 1),
          period_end: monthEnd,
          low_quota_threshold: 500
        }
      ]);
    }
  } catch (err) {
    console.warn('[EmailManagement] seedInitialData error (non-fatal):', err.message);
  }
}

module.exports = {
  EmailLog,
  EmailAttempt,
  EmailQuota,
  EmailUsage,
  EmailProvider,
  EmailPayment,
  EmailAlert,
  seedInitialDataIfEmpty
};
