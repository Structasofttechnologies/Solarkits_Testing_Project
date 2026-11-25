/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLARKITS MULTI-PROVIDER EMAIL TEST DISPATCHER (RESEND, AWS SES & SMTP)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Usage:
 *   node test_email_providers.js --provider=resend --to=your_email@gmail.com
 *   node test_email_providers.js --provider=smtp --to=your_email@gmail.com
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// 1. Locate and auto-load backend .env
const possibleEnvPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, 'SolarKits v2.0/backend/solarkits-central-backend/.env'),
  path.join(__dirname, '../solarkits-central-backend/.env'),
  'D:/SolarKits/SolarKits v2.0/backend/solarkits-central-backend/.env'
];

let loadedEnv = null;
for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    const envContent = fs.readFileSync(p, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const k = trimmed.substring(0, eqIdx).trim();
          const v = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[k]) process.env[k] = v;
        }
      }
    });
    loadedEnv = p;
    break;
  }
}

// 2. Resilient module loading (no need for extra npm install)
let axios, nodemailer;
try {
  axios = require('axios');
} catch (e) {
  axios = require('D:/SolarKits/SolarKits v2.0/backend/solarkits-central-backend/node_modules/axios');
}
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = require('D:/SolarKits/SolarKits v2.0/backend/solarkits-central-backend/node_modules/nodemailer');
}

// 3. Parse CLI Arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

const provider = (args.provider || 'resend').toLowerCase();
const to = args.to || 'structasoft.intern01@gmail.com';
const apiKey = args.apiKey || process.env.RESEND_API_KEY;
const fromEmail = args.from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const fromName = args.fromName || 'SolarKits India';
const user = args.user || process.env.SMTP_USER || process.env.NODEMAILER_USER;
const pass = args.pass || process.env.SMTP_PASS || process.env.NODEMAILER_PASS;
const host = args.host || process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(args.port || process.env.SMTP_PORT || '465', 10);

console.log('====================================================');
console.log('☀️  SolarKits Email Infrastructure Test Dispatcher');
console.log('====================================================');
console.log(`📁 Loaded Env From   : ${loadedEnv || 'System env'}`);
console.log(`📡 Selected Provider : ${provider.toUpperCase()}`);
console.log(`🎯 Recipient Target   : ${to}`);
console.log(`✉️  Sender ("From")    : ${fromName} <${fromEmail}>`);

// 4. Load Template
const possibleTemplatePaths = [
  path.join(__dirname, 'solarkits_epc_email_template.html'),
  path.join(__dirname, '../../solarkits_epc_email_template.html'),
  'D:/SolarKits/solarkits_epc_email_template.html'
];

let htmlContent = '<p>Test verification email from SolarKits India.</p>';
for (const tp of possibleTemplatePaths) {
  if (fs.existsSync(tp)) {
    htmlContent = fs.readFileSync(tp, 'utf8');
    const unsubsBase = process.env.UNSUBSCRIBE_BASE_URL || 'http://10.252.78.244:5000/api/admin/marketing/unsubscribe';
    const unsubsUrl = `${unsubsBase}?email=${encodeURIComponent(to)}`;
    htmlContent = htmlContent.replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, unsubsUrl);
    console.log(`📄 Template Loaded   : ${path.basename(tp)} (${htmlContent.length} bytes)`);
    break;
  }
}

// 5. Dispatch Logic
async function run() {
  if (provider === 'resend') {
    if (!apiKey) {
      console.error('❌ Error: RESEND_API_KEY is missing in .env and --apiKey was not passed.');
      process.exit(1);
    }

    console.log(`🚀 Dispatching via Resend HTTP API (https://api.resend.com/emails)...`);
    console.log(`🔑 Using Key         : ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);

    try {
      const res = await axios.post(
        'https://api.resend.com/emails',
        {
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject: 'Special Wholesale Offer: 3 kW & 5 kW Commercial Solar Kits | SolarKits India',
          html: htmlContent,
          reply_to: process.env.RESEND_REPLY_TO || to
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      console.log('✅ Resend Dispatch SUCCESS!');
      console.log('📦 Message ID :', res.data?.id);
      console.log(`🎉 Check your inbox at: ${to} (Also check Spam/Promotions tab)`);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      console.error('❌ Resend API Error:', errorMsg);
      if (err.response?.data) {
        console.error('📋 Full Error Details:', JSON.stringify(err.response.data, null, 2));
      }
    }

  } else if (provider === 'smtp') {
    console.log(`🚀 Dispatching via SMTP (${host}:${port})...`);
    console.log(`👤 SMTP User : ${user}`);

    if (!user || !pass) {
      console.error('❌ Error: SMTP_USER or SMTP_PASS missing in .env.');
      process.exit(1);
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${user}>`,
        to,
        subject: 'Special Wholesale Offer: SolarKits B2B Commercial Kit',
        html: htmlContent
      });

      console.log('✅ SMTP Dispatch SUCCESS!');
      console.log('📦 Message ID :', info.messageId);
      console.log(`🎉 Check your inbox at: ${to}`);
    } catch (err) {
      console.error('❌ SMTP Error:', err.message);
    }
  } else {
    console.log('✉️ [SIMULATOR MODE] Simulated successful send to:', to);
  }
}

run();
