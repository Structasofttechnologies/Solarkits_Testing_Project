import React, { useState, useEffect } from 'react';
import {
  FaEnvelope, FaTrash, FaPaperPlane, FaAws, FaExternalLinkAlt,
  FaKey, FaServer, FaInfoCircle, FaEdit, FaExclamationTriangle, FaCheckCircle
} from 'react-icons/fa';
import { marketingHttp, extractApiError } from './services/marketingApi';

const EMPTY_EMAIL_FORM = (provider = 'smtp') => ({
  provider,
  email_provider: provider,
  purpose: 'marketing',
  sender_name: '',
  sender_email: '',
  reply_to_email: '',
  resend_api_key: '',
  aws_region: 'ap-south-1',
  smtp_host: provider === 'aws_ses' ? 'email-smtp.ap-south-1.amazonaws.com' : provider === 'smtp' ? 'smtp.gmail.com' : '',
  smtp_port: provider === 'smtp' ? 465 : 587,
  smtp_secure: provider === 'smtp',
  smtp_user: '',
  smtp_pass: '',
  is_default: false
});

export default function EmailSettingsPage() {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeProviderTab, setActiveProviderTab] = useState('smtp');
  const [formData, setFormData] = useState(EMPTY_EMAIL_FORM('smtp'));

  const [testEmail, setTestEmail] = useState('');
  const [testingId, setTestingId] = useState(null);
  const [statusBanner, setStatusBanner] = useState(null);
  const [resendEnvConfigured, setResendEnvConfigured] = useState(null);

  const loadSenders = async () => {
    setLoading(true);
    try {
      const res = await marketingHttp.get('/senders?type=email');
      if (res.data?.success) {
        setSenders(res.data.data || []);
        if (res.data?.meta && typeof res.data.meta.resend_env_configured === 'boolean') {
          setResendEnvConfigured(res.data.meta.resend_env_configured);
        }
      }
    } catch (err) {
      setStatusBanner({ type: 'error', text: extractApiError(err, 'Failed to fetch email senders') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSenders();
  }, []);

  const handleProviderChange = (provider) => {
    setActiveProviderTab(provider);
    setFormData((prev) => ({
      ...prev,
      provider,
      email_provider: provider,
      smtp_host: provider === 'aws_ses' ? `email-smtp.${prev.aws_region || 'ap-south-1'}.amazonaws.com` : provider === 'smtp' ? 'smtp.gmail.com' : '',
      smtp_port: provider === 'smtp' ? 465 : 587,
      smtp_secure: provider === 'smtp'
    }));
  };

  const handleSaveSender = async (e) => {
    e.preventDefault();
    if (!formData.sender_email || !formData.sender_name) return;

    setSaving(true);
    setStatusBanner(null);
    try {
      const payload = {
        ...formData,
        type: 'email',
        name: formData.sender_name,
        email_provider: activeProviderTab,
        status: 'verification_pending'
      };
      if (editingId) {
        await marketingHttp.put(`/senders/${editingId}`, payload);
        setStatusBanner({ type: 'success', text: `Updated ${activeProviderTab.toUpperCase()} sender "${formData.sender_name}". Run Test Send to verify.` });
        setEditingId(null);
      } else {
        await marketingHttp.post('/senders', payload);
        setStatusBanner({ type: 'success', text: `Saved ${activeProviderTab.toUpperCase()} sender "${formData.sender_email}". Click Test Send to verify live delivery.` });
      }
      setFormData(EMPTY_EMAIL_FORM(activeProviderTab));
      await loadSenders();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStatusBanner({ type: 'error', text: extractApiError(err, 'Failed to save sender') });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (sender) => {
    const prov = sender.email_provider || sender.provider || 'smtp';
    setEditingId(sender._id);
    setActiveProviderTab(prov);
    setFormData({
      provider: prov,
      email_provider: prov,
      purpose: sender.purpose || 'marketing',
      sender_name: sender.sender_name || sender.name || '',
      sender_email: sender.sender_email || '',
      reply_to_email: sender.reply_to_email || '',
      resend_api_key: sender.resend_api_key || '',
      aws_region: sender.aws_region || 'ap-south-1',
      smtp_host: sender.smtp_host || '',
      smtp_port: sender.smtp_port || (prov === 'smtp' ? 465 : 587),
      smtp_secure: Boolean(sender.smtp_secure),
      smtp_user: sender.smtp_user || '',
      smtp_pass: sender.smtp_pass || '',
      is_default: Boolean(sender.is_default)
    });
    window.scrollTo({ top: 360, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this email sender configuration?')) return;
    try {
      await marketingHttp.delete(`/senders/${id}`);
      setStatusBanner({ type: 'success', text: 'Email sender deleted.' });
      await loadSenders();
    } catch (err) {
      setStatusBanner({ type: 'error', text: extractApiError(err, 'Failed to delete sender') });
    }
  };

  const handleSendTest = async (sender) => {
    const target = testEmail.trim() || sender.sender_email;
    if (!target) {
      setStatusBanner({ type: 'error', text: 'Enter a recipient test email address first.' });
      return;
    }
    setTestingId(sender._id);
    setStatusBanner({ type: 'info', text: `Testing ${(sender.email_provider || 'smtp').toUpperCase()} connection & sending email to ${target}...` });
    try {
      const res = await marketingHttp.post('/senders/test', {
        sender_id: sender._id,
        test_target: target
      });
      const data = res.data || {};
      if (data.success && !data.simulated) {
        setStatusBanner({
          type: 'success',
          text: `Verified & sent via ${data.provider?.toUpperCase()} (MessageId: ${data.messageId})`
        });
      } else {
        setStatusBanner({
          type: 'error',
          text: `Test FAILED via ${(data.provider || sender.email_provider || 'unknown').toUpperCase()} [${data.errorCode || (data.simulated ? 'SIMULATED' : 'ERROR')}]: ${data.error || 'Simulated fallback rejected — verify backend .env credentials'}`
        });
      }
      await loadSenders();
    } catch (err) {
      setStatusBanner({ type: 'error', text: extractApiError(err, 'Test send failed') });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaEnvelope className="w-3.5 h-3.5" />
            <span>Email Infrastructure & Senders</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Email Account Settings</h1>
          <p className="text-sm text-slate-500">Configure encrypted Resend API, AWS SES, and SMTP email senders with real verification testing.</p>
        </div>

        <a
          href="/developer-panel/email-dispatchers"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md transition-all self-start"
        >
          <FaServer className="w-3.5 h-3.5" />
          <span>Open in Developer Panel</span>
          <FaExternalLinkAlt className="w-2.5 h-2.5 opacity-70" />
        </a>
      </div>

      {/* Video Guides */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border border-blue-700/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
            <FaInfoCircle className="w-4 h-4" />
            <span>Official Setup Video Guides & Tutorials</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Step-by-Step</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <a href="https://youtu.be/eubuhK_1NN0" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-between">
            <div>
              <div className="text-xs font-extrabold text-white">Resend Bulk Email & API Key Setup</div>
              <p className="text-[11px] text-slate-300 mt-1">Watch 5-min tutorial for API key generation & domain verification.</p>
            </div>
            <FaExternalLinkAlt className="w-3 h-3 text-slate-300" />
          </a>
          <a href="https://youtu.be/VWt43MXhuk4" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-between">
            <div>
              <div className="text-xs font-extrabold text-white">AWS SES Domain & SMTP Setup Guide</div>
              <p className="text-[11px] text-slate-300 mt-1">Watch tutorial for AWS SES Sandbox exit & SMTP credentials.</p>
            </div>
            <FaExternalLinkAlt className="w-3 h-3 text-slate-300" />
          </a>
        </div>
      </div>

      {statusBanner && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${statusBanner.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            : statusBanner.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            }`}
        >
          {statusBanner.type === 'error' ? <FaExclamationTriangle className="shrink-0" /> : <FaCheckCircle className="shrink-0" />}
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* Senders List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Configured Email Delivery Senders ({senders.length})</h2>
            <p className="text-xs text-slate-500">Live records from database; enter an optional recipient address before clicking Test Send.</p>
          </div>
          <input
            type="email"
            placeholder="Optional test recipient email (e.g. you@gmail.com)"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs w-full sm:w-72"
          />
        </div>

        {loading ? (
          <div className="text-xs text-slate-400 py-6 text-center">Loading email senders from server...</div>
        ) : senders.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
            No email senders saved in MongoDB yet. Add one below (or use .env SMTP/Resend).
          </div>
        ) : (
          <div className="space-y-3">
            {senders.map((s) => {
              const prov = s.email_provider || s.provider || 'smtp';
              return (
                <div key={s._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white">{s.sender_name || s.name}</h4>
                      {prov === 'resend' ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-900 text-white">RESEND API</span>
                      ) : prov === 'aws_ses' ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white">AWS SES</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">SMTP</span>
                      )}
                      {s.is_default && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">Default</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      From: <strong>{s.sender_email}</strong> • Reply-To: {s.reply_to_email || s.sender_email} • Purpose: <strong>{s.purpose || 'marketing'}</strong>
                      {prov === 'smtp' && ` • ${s.smtp_host}:${s.smtp_port}`}
                      {prov === 'aws_ses' && ` • ${s.aws_region || 'ap-south-1'}`}
                    </div>
                    {s.last_error && (
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Error: {s.last_error}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={testingId === s._id}
                      onClick={() => handleSendTest(s)}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <FaPaperPlane className="w-3 h-3" />
                      <span>{testingId === s._id ? 'Sending...' : 'Test Send'}</span>
                    </button>
                    <button type="button" onClick={() => handleEdit(s)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-xs cursor-pointer" title="Edit">
                      <FaEdit />
                    </button>
                    <button type="button" onClick={() => handleDelete(s._id)} className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-700 text-xs cursor-pointer" title="Delete">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Form */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{editingId ? 'Edit Email Dispatch Provider' : 'Add New Email Dispatch Provider'}</h2>
            <p className="text-xs text-slate-500">Choose Resend API, AWS SES, or Custom SMTP (Gmail/Zoho/Hostinger).</p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setFormData(EMPTY_EMAIL_FORM(activeProviderTab)); }}
              className="text-xs font-bold text-slate-500 underline cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => handleProviderChange('resend')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${activeProviderTab === 'resend' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
          >
            Resend API
          </button>
          <button
            type="button"
            onClick={() => handleProviderChange('aws_ses')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${activeProviderTab === 'aws_ses' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-xs' : 'text-slate-500'
              }`}
          >
            <FaAws className="w-4 h-4 text-amber-500" /> AWS SES
          </button>
          <button
            type="button"
            onClick={() => handleProviderChange('smtp')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${activeProviderTab === 'smtp' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs' : 'text-slate-500'
              }`}
          >
            <FaServer className="w-3.5 h-3.5" /> Custom SMTP
          </button>
        </div>

        <form onSubmit={handleSaveSender} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Sender Name *</label>
              <input
                type="text"
                placeholder="e.g. SolarKits Marketing"
                value={formData.sender_name}
                onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Routing Purpose</label>
              <select
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="marketing">Bulk Marketing</option>
                <option value="wholesale">Wholesale Offers</option>
                <option value="product_launch">Product Launch</option>
                <option value="festive_offer">Festive Offers</option>
                <option value="onboarding">EPC Onboarding</option>
                <option value="all">Universal Fallback</option>
              </select>
            </div>

            {activeProviderTab === 'resend' && (
              <div className="md:col-span-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <FaKey className="text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">
                        Resend API Key (Saved Encrypted in DB or Backend <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">.env</code> <code className="font-mono">RESEND_API_KEY</code>)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {resendEnvConfigured
                          ? 'Server .env RESEND_API_KEY is ready. Paste a key below only if you want a sender-specific override.'
                          : 'Server .env key is missing on this deployment — paste your Resend API key (re_...) below OR set RESEND_API_KEY in Render Environment Variables.'}
                      </p>
                    </div>
                  </div>
                  {resendEnvConfigured !== null && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 ${resendEnvConfigured
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                    >
                      {resendEnvConfigured ? '.env Key Ready' : '.env Key Missing'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Resend API Key {resendEnvConfigured ? '(Optional override)' : '*'}
                  </label>
                  <input
                    type="password"
                    placeholder={
                      editingId && formData.resend_api_key
                        ? 'Leave masked to keep saved DB key'
                        : resendEnvConfigured
                          ? 'Leave blank to use Backend .env RESEND_API_KEY'
                          : 're_xxxxxxxxxxxxxxxxxxxxxxxxxx'
                    }
                    value={formData.resend_api_key}
                    onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    required={!resendEnvConfigured && !editingId}
                  />
                </div>
              </div>
            )}

            {activeProviderTab === 'aws_ses' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">AWS Region</label>
                  <select
                    value={formData.aws_region}
                    onChange={(e) => setFormData({ ...formData, aws_region: e.target.value, smtp_host: `email-smtp.${e.target.value}.amazonaws.com` })}
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
                  <input type="text" value={formData.smtp_host} onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">AWS SES SMTP User *</label>
                  <input type="text" placeholder="AKIA..." value={formData.smtp_user} onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono" required={!editingId} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">AWS SES SMTP Password *</label>
                  <input type="password" placeholder="••••••••••••" value={formData.smtp_pass} onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono" required={!editingId} />
                </div>
              </>
            )}

            {activeProviderTab === 'smtp' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">SMTP Host *</label>
                  <input type="text" placeholder="smtp.gmail.com" value={formData.smtp_host} onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">SMTP Port *</label>
                  <input type="number" value={formData.smtp_port} onChange={(e) => setFormData({ ...formData, smtp_port: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">SMTP User / Email *</label>
                  <input type="text" value={formData.smtp_user} onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required={!editingId} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">SMTP App Password *</label>
                  <input type="password" placeholder={editingId ? 'Leave masked to keep unchanged' : 'App Password'} value={formData.smtp_pass} onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required={!editingId} />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} className="accent-indigo-600 w-4 h-4 rounded" />
              Set as Default Company Email Sender
            </label>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Update Email Sender' : `Save ${activeProviderTab.toUpperCase()} Sender`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
