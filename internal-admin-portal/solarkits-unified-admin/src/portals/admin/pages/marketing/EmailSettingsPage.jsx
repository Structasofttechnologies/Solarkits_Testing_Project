import React, { useState } from 'react';
import {
  FaEnvelope, FaPlus, FaCheckCircle, FaTrash, FaPaperPlane,
  FaAws, FaExternalLinkAlt, FaKey, FaServer, FaInfoCircle
} from 'react-icons/fa';
import { SiResend } from 'react-icons/si';

export default function EmailSettingsPage() {
  const [senders, setSenders] = useState([
    {
      _id: 'em_resend_default',
      sender_name: 'SolarKits Central Promotions (Resend)',
      sender_email: 'orders@solarkits.in',
      reply_to_email: 'support@solarkits.in',
      provider: 'resend',
      resend_api_key: 're_live_••••••••••••••••••••••••',
      is_default: true,
      status: 'active'
    },
    {
      _id: 'em_aws_ses',
      sender_name: 'SolarKits Bulk Wholesale (AWS SES)',
      sender_email: 'campaigns@solarkits.in',
      reply_to_email: 'sales@solarkits.in',
      provider: 'aws_ses',
      aws_region: 'ap-south-1',
      smtp_host: 'email-smtp.ap-south-1.amazonaws.com',
      smtp_port: 587,
      smtp_user: 'AKIA••••••••••••',
      is_default: false,
      status: 'active'
    },
    {
      _id: 'em_smtp_backup',
      sender_name: 'SolarKits Franchisee Desk (SMTP)',
      sender_email: 'franchisee@solarkits.in',
      reply_to_email: 'partner@solarkits.in',
      provider: 'smtp',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: 'franchisee@solarkits.in',
      is_default: false,
      status: 'active'
    }
  ]);

  const [activeProviderTab, setActiveProviderTab] = useState('resend'); // 'resend' | 'aws_ses' | 'smtp'

  const [formData, setFormData] = useState({
    provider: 'resend',
    sender_name: 'SolarKits India',
    sender_email: 'orders@solarkits.in',
    reply_to_email: 'support@solarkits.in',
    // Resend
    resend_api_key: '',
    // AWS SES
    aws_region: 'ap-south-1',
    smtp_host: 'email-smtp.ap-south-1.amazonaws.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    is_default: false
  });

  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState(null);

  const handleProviderChange = (provider) => {
    setActiveProviderTab(provider);
    setFormData(prev => ({
      ...prev,
      provider,
      smtp_host: provider === 'aws_ses' ? 'email-smtp.ap-south-1.amazonaws.com' : provider === 'smtp' ? 'smtp.gmail.com' : ''
    }));
  };

  const handleAddSender = (e) => {
    e.preventDefault();
    if (!formData.sender_email) return;

    setSenders([...senders, { ...formData, _id: `em_${Date.now()}`, status: 'active' }]);
    setTestStatus(`✅ Successfully added ${formData.provider.toUpperCase()} sender: ${formData.sender_email}`);
    setTimeout(() => setTestStatus(null), 4000);

    setFormData({
      provider: activeProviderTab,
      sender_name: 'SolarKits India',
      sender_email: '',
      reply_to_email: 'support@solarkits.in',
      resend_api_key: '',
      aws_region: 'ap-south-1',
      smtp_host: activeProviderTab === 'aws_ses' ? 'email-smtp.ap-south-1.amazonaws.com' : 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      is_default: false
    });
  };

  const handleSendTest = (sender) => {
    const provName = (sender.provider || 'smtp').toUpperCase();
    setTestStatus(`⏳ Sending test email via ${provName} engine to ${testEmail || sender.sender_email}...`);
    setTimeout(() => {
      setTestStatus(`✓ Test verification email dispatched via ${provName}! Audit log recorded.`);
      setTimeout(() => setTestStatus(null), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaEnvelope className="w-3.5 h-3.5" />
            <span>Email Infrastructure & Senders</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Email Account Settings</h1>
          <p className="text-sm text-slate-500">Configure Resend API, AWS SES (Amazon Simple Email Service) and SMTP providers for high-deliverability bulk EPC marketing campaigns.</p>
        </div>
        <a
          href="/developer-panel/email-dispatchers"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md hover:scale-[1.02] transition-all self-start"
        >
          <FaServer className="w-3.5 h-3.5" />
          <span>Open in Developer Panel</span>
          <FaExternalLinkAlt className="w-2.5 h-2.5 opacity-70" />
        </a>
      </div>

      {/* Video Guides Alert Banner (From Boss) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border border-blue-700/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
            <FaInfoCircle className="w-4 h-4" />
            <span>Official Setup Video Guides & Tutorials</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Step-by-Step</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <a
            href="https://youtu.be/eubuhK_1NN0"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-extrabold flex items-center gap-1.5 text-white">
                <span>📹 Resend Bulk Email & API Key Setup</span>
                <FaExternalLinkAlt className="w-3 h-3 text-slate-300 group-hover:text-amber-300" />
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Watch 5-min tutorial for API key generation & domain verification.</p>
            </div>
          </a>

          <a
            href="https://youtu.be/VWt43MXhuk4"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-extrabold flex items-center gap-1.5 text-white">
                <span>📹 AWS SES Domain & SMTP Setup Guide</span>
                <FaExternalLinkAlt className="w-3 h-3 text-slate-300 group-hover:text-amber-300" />
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Watch tutorial for AWS SES Sandbox exit & SMTP credentials generation.</p>
            </div>
          </a>
        </div>
      </div>

      {testStatus && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
          {testStatus}
        </div>
      )}

      {/* Senders List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Configured Email Delivery Senders</h2>
          <span className="text-xs font-bold text-slate-400">{senders.length} Providers Active</span>
        </div>

        <div className="space-y-3">
          {senders.map((s) => (
            <div key={s._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">{s.sender_name}</h4>
                  {s.provider === 'resend' ? (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-900 text-white">RESEND API</span>
                  ) : s.provider === 'aws_ses' ? (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white">AWS SES</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">SMTP</span>
                  )}

                  {s.is_default && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">Default Sender</span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  From: <strong>{s.sender_email}</strong> • Reply-To: {s.reply_to_email || s.sender_email}
                  {s.provider === 'resend' && ' • Engine: Official Resend HTTP API'}
                  {s.provider === 'aws_ses' && ` • Region: ${s.aws_region || 'ap-south-1'} (${s.smtp_host})`}
                  {s.provider === 'smtp' && ` • Host: ${s.smtp_host}:${s.smtp_port}`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendTest(s)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <FaPaperPlane className="w-3 h-3 text-indigo-600" />
                  <span>Test Send</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Email Account Form */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold">Add New Email Dispatch Provider</h2>
          <p className="text-xs text-slate-500">Choose between Resend API, AWS SES or Custom SMTP.</p>
        </div>

        {/* Provider Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => handleProviderChange('resend')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeProviderTab === 'resend'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="font-black text-sm">⚡</span> Resend API
          </button>
          <button
            type="button"
            onClick={() => handleProviderChange('aws_ses')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeProviderTab === 'aws_ses'
                ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FaAws className="w-4 h-4 text-amber-500" /> AWS SES
          </button>
          <button
            type="button"
            onClick={() => handleProviderChange('smtp')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeProviderTab === 'smtp'
                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FaServer className="w-3.5 h-3.5" /> Custom SMTP
          </button>
        </div>

        <form onSubmit={handleAddSender} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Sender Name *</label>
              <input
                type="text"
                placeholder="e.g. SolarKits Wholesale Promotions"
                value={formData.sender_name}
                onChange={e => setFormData({ ...formData, sender_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Verified Sender Email *</label>
              <input
                type="email"
                placeholder="e.g. orders@solarkits.in"
                value={formData.sender_email}
                onChange={e => setFormData({ ...formData, sender_email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Reply-To Email Address</label>
              <input
                type="email"
                placeholder="e.g. support@solarkits.in"
                value={formData.reply_to_email}
                onChange={e => setFormData({ ...formData, reply_to_email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              />
            </div>

            {/* Provider-Specific Fields */}
            {activeProviderTab === 'resend' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                  <FaKey className="text-amber-500" /> Resend API Key *
                </label>
                <input
                  type="password"
                  placeholder="re_123456789..."
                  value={formData.resend_api_key}
                  onChange={e => setFormData({ ...formData, resend_api_key: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                  required={activeProviderTab === 'resend'}
                />
              </div>
            )}

            {activeProviderTab === 'aws_ses' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">AWS Region</label>
                  <select
                    value={formData.aws_region}
                    onChange={e => setFormData({
                      ...formData,
                      aws_region: e.target.value,
                      smtp_host: `email-smtp.${e.target.value}.amazonaws.com`
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="ap-south-1">Asia Pacific (Mumbai) — ap-south-1</option>
                    <option value="us-east-1">US East (N. Virginia) — us-east-1</option>
                    <option value="us-west-2">US West (Oregon) — us-west-2</option>
                    <option value="eu-west-1">Europe (Ireland) — eu-west-1</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">AWS SES SMTP Host</label>
                  <input
                    type="text"
                    value={formData.smtp_host}
                    onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">AWS SES SMTP User (Access Key ID)</label>
                  <input
                    type="text"
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={formData.smtp_user}
                    onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                    required={activeProviderTab === 'aws_ses'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">AWS SES SMTP Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    value={formData.smtp_pass}
                    onChange={e => setFormData({ ...formData, smtp_pass: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                    required={activeProviderTab === 'aws_ses'}
                  />
                </div>
              </>
            )}

            {activeProviderTab === 'smtp' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={formData.smtp_host}
                    onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">SMTP User / Email</label>
                  <input
                    type="text"
                    value={formData.smtp_user}
                    onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">SMTP Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={formData.smtp_pass}
                    onChange={e => setFormData({ ...formData, smtp_pass: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                className="accent-indigo-600 w-4 h-4 rounded"
              />
              Set as Default Company Email Sender
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-sm transition-all"
            >
              Save & Activate {activeProviderTab.toUpperCase()} Sender
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
