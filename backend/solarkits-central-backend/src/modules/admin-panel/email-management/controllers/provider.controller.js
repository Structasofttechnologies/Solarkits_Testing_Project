const { EmailProvider } = require('../models');
const ProviderFactory = require('../providers/providerFactory');
const EmailManagerService = require('../services/emailManager.service');

class ProviderController {
  static async getAll(req, res) {
    try {
      const providers = await EmailProvider.find().sort({ priority: 1 }).lean();
      // Mask sensitive API keys / passwords for safe UI display
      const safeProviders = providers.map(p => {
        const creds = { ...(p.credentials || {}) };
        if (creds.api_key) creds.api_key_masked = creds.api_key.substring(0, 4) + '••••••••' + creds.api_key.slice(-4);
        if (creds.pass) creds.pass_masked = '••••••••';
        if (creds.secret_access_key) creds.secret_access_key_masked = creds.secret_access_key.substring(0, 3) + '••••••••' + creds.secret_access_key.slice(-3);
        return { ...p, credentials: creds };
      });

      return res.status(200).json({ success: true, data: safeProviders });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateProvider(req, res) {
    try {
      const { provider_key } = req.params;
      const { name, is_enabled, fallback_enabled, fallback_provider_key, priority, credentials, max_send_rate } = req.body;

      const provider = await EmailProvider.findOne({ provider_key });
      if (!provider) {
        return res.status(404).json({ success: false, message: `Provider '${provider_key}' not found.` });
      }

      if (name) provider.name = name;
      if (is_enabled !== undefined) provider.is_enabled = Boolean(is_enabled);
      if (fallback_enabled !== undefined) provider.fallback_enabled = Boolean(fallback_enabled);
      if (fallback_provider_key !== undefined) provider.fallback_provider_key = fallback_provider_key;
      if (priority !== undefined) provider.priority = Number(priority);
      if (max_send_rate !== undefined) provider.max_send_rate = Number(max_send_rate);

      if (credentials) {
        provider.credentials = {
          ...provider.credentials.toObject(),
          ...credentials
        };
      }

      await provider.save();
      return res.status(200).json({ success: true, message: 'Provider configuration saved.', data: provider });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async setDefault(req, res) {
    try {
      const { provider_key } = req.params;
      await EmailProvider.updateMany({}, { is_default: false });
      const updated = await EmailProvider.findOneAndUpdate(
        { provider_key },
        { is_default: true, is_enabled: true },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: `Provider '${provider_key}' is now set as the primary default email dispatcher.`,
        data: updated
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async testConnection(req, res) {
    try {
      const { provider_key } = req.params;
      const provider = await EmailProvider.findOne({ provider_key });
      if (!provider) {
        return res.status(404).json({ success: false, message: `Provider '${provider_key}' not found.` });
      }

      const instance = await ProviderFactory.getProviderInstance(provider_key, provider.credentials);
      const testResult = await instance.testConnection();

      provider.health_status = testResult.success ? 'healthy' : 'degraded';
      provider.last_tested_at = new Date();
      provider.last_error = testResult.success ? null : testResult.message;
      await provider.save();

      return res.status(200).json({
        success: testResult.success,
        message: testResult.message,
        duration_ms: testResult.duration_ms,
        health_status: provider.health_status
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async sendTestEmail(req, res) {
    try {
      const { to, provider_key, subject, message } = req.body;
      if (!to) {
        return res.status(400).json({ success: false, message: 'Target recipient email is required.' });
      }

      const result = await EmailManagerService.sendManagedEmail({
        to,
        subject: subject || 'SolarKits Email Delivery Test',
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">SolarKits Email Test Dispatch</h2>
          <p>This is a live test email sent via <strong>${provider_key || 'Default Provider'}</strong>.</p>
          <p>${message || 'If you received this message, your email dispatch and quota tracking are functioning perfectly.'}</p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <small style="color: #64748b;">Dispatched at: ${new Date().toISOString()} via SolarKits Central Platform</small>
        </div>`,
        purpose: 'transactional',
        provider: provider_key || null,
        metadata: { is_admin_test: true }
      });

      return res.status(200).json({
        success: result.success,
        message: result.success ? `Test email dispatched successfully via ${result.provider}.` : `Failed: ${result.error}`,
        data: result
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = ProviderController;
