const SenderProvider = require('./sender.provider');
const SesProvider = require('./ses.provider');
const SmtpProvider = require('./smtp.provider');
const { EmailProvider, EmailQuota } = require('../models');

/**
 * Provider Factory & Fallback Router
 * Resolves active providers from MongoDB and handles automatic failover.
 */
class ProviderFactory {
  static async getProviderInstance(providerKey, customCredentials = null) {
    let credentials = customCredentials;

    if (!credentials) {
      const providerDoc = await EmailProvider.findOne({ provider_key: providerKey, is_enabled: true });
      if (providerDoc) {
        credentials = providerDoc.credentials;
      }
    }

    switch (providerKey) {
      case 'sender':
      case 'resend':
        return new SenderProvider(credentials);
      case 'aws_ses':
        return new SesProvider(credentials);
      case 'smtp':
      case 'gmail_smtp':
      default:
        return new SmtpProvider(credentials);
    }
  }

  /**
   * Resolves the primary provider to use, with quota check and fallback resolution
   */
  static async resolveRouting(requestedProviderKey = null) {
    let primaryKey = requestedProviderKey;

    // If no provider requested, find the configured default
    if (!primaryKey) {
      const defaultProvider = await EmailProvider.findOne({ is_default: true, is_enabled: true });
      primaryKey = defaultProvider ? defaultProvider.provider_key : 'sender';
    }

    // Check primary provider quota
    const primaryQuota = await EmailQuota.findOne({ provider: primaryKey });
    let useFallback = false;
    let fallbackKey = null;

    if (primaryQuota && primaryQuota.remaining_count <= 0) {
      console.warn(`[ProviderFactory] Quota exhausted for primary provider: ${primaryKey}. Initiating fallback search.`);
      useFallback = true;
    }

    const providerConfig = await EmailProvider.findOne({ provider_key: primaryKey });
    if (providerConfig && providerConfig.fallback_enabled) {
      fallbackKey = providerConfig.fallback_provider_key;
    }

    // If primary has no remaining quota and fallback is configured, switch to fallback
    if (useFallback && fallbackKey) {
      const fallbackQuota = await EmailQuota.findOne({ provider: fallbackKey });
      if (!fallbackQuota || fallbackQuota.remaining_count > 0) {
        return {
          activeKey: fallbackKey,
          isFallbackActive: true,
          originalKey: primaryKey,
          reason: 'Primary quota exhausted'
        };
      }
    }

    return {
      activeKey: primaryKey,
      isFallbackActive: false,
      fallbackKey: fallbackKey
    };
  }
}

module.exports = ProviderFactory;
