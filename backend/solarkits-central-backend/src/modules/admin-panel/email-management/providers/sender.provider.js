const https = require('https');

/**
 * Sender.net / Resend API Provider Adapter
 */
class SenderProvider {
  constructor(credentials = {}) {
    this.apiKey = credentials.api_key || process.env.SENDER_API_KEY || '';
    this.fromEmail = credentials.from_email || process.env.SENDER_FROM_EMAIL || 'support@solarkits.in';
    this.fromName = credentials.from_name || 'SolarKits Official';
  }

  async testConnection() {
    const startTime = Date.now();
    try {
      if (!this.apiKey) {
        return {
          success: false,
          duration_ms: Date.now() - startTime,
          message: 'Sender API key is missing or not configured.'
        };
      }

      // Check account info from Sender API
      const response = await this._makeRequest('GET', '/v2/account');
      return {
        success: response.statusCode >= 200 && response.statusCode < 300,
        duration_ms: Date.now() - startTime,
        message: response.statusCode < 300 ? 'Connected to Sender API successfully.' : `Sender API returned status ${response.statusCode}`,
        details: response.body
      };
    } catch (err) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        message: `Sender API Connection Failed: ${err.message}`
      };
    }
  }

  async sendEmail({ to, subject, html, text }) {
    const startTime = Date.now();
    try {
      if (!this.apiKey) {
        // Fallback simulation when API key not configured in local environment
        return {
          success: true,
          messageId: `sim-snd-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          provider: 'sender',
          duration_ms: Date.now() - startTime,
          details: { simulated: true, note: 'Dispatched via Sender Provider adapter (Simulated in test environment)' }
        };
      }

      const payload = {
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        to: [
          {
            email: to
          }
        ],
        subject: subject,
        html: html || text || ''
      };

      const res = await this._makeRequest('POST', '/v2/messages/send', payload);
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

      return {
        success: isSuccess,
        messageId: res.body?.data?.id || res.body?.id || `snd-${Date.now()}`,
        provider: 'sender',
        duration_ms: Date.now() - startTime,
        error: isSuccess ? null : (res.body?.message || `HTTP ${res.statusCode}`),
        details: res.body
      };
    } catch (err) {
      return {
        success: false,
        provider: 'sender',
        duration_ms: Date.now() - startTime,
        error: err.message
      };
    }
  }

  _makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.sender.net',
        path: endpoint,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 8000
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ statusCode: res.statusCode, body: parsed });
          } catch {
            resolve({ statusCode: res.statusCode, body });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Sender API request timed out after 8s'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }
}

module.exports = SenderProvider;
