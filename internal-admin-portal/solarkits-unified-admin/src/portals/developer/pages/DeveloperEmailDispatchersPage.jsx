import React, { useState, useEffect } from 'react';
import {
  FaPlus, FaTrash, FaPaperPlane, FaAws, FaExternalLinkAlt,
  FaServer, FaInfoCircle, FaTag, FaEdit, FaExclamationTriangle, FaCheckCircle
} from 'react-icons/fa';
import { SiResend } from 'react-icons/si';
import axios from 'axios';
import { authHeaderObj } from '../app/authHeader';

const PURPOSE_OPTIONS = [
  { value: 'all', label: 'Universal / All Purposes (Fallback)', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' },
  { value: 'wholesale', label: 'B2B Wholesale / Bulk Offers', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' },
  { value: 'product_launch', label: 'New Product Launch & Datasheets', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300' },
  { value: 'festive_offer', label: 'Festive / Seasonal Mega Offers', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' },
  { value: 'price_drop', label: 'Flash Price Drop & Clearance Alerts', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' },
  { value: 'onboarding', label: 'EPC Installer Onboarding & Welcome', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' },
  { value: 'marketing', label: 'General Bulk Marketing Campaigns', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300' },
  { value: 'transactional', label: 'Orders, Invoices & Dispatch Notes', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' },
  { value: 'system_alerts', label: 'Security Alerts & System OTPs', badge: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
  { value: 'support', label: 'Partner & Customer Support Desk', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300' }
];

const EMPTY_FORM = (provider) => ({
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
  smtp_user: '',
  smtp_pass: '',
  smtp_secure: provider === 'smtp',
  is_default: false
});

export default function DeveloperEmailDispatchersPage() {
  const [senders, setSenders] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [activeProviderTab, setActiveProviderTab] = useState('smtp');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM('smtp'));

  const [testTarget, setTestTarget] = useState('');
  const [testModalSender, setTestModalSender] = useState(null);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info', text: string }
  const [loading, setLoading] = useState(false);
  const [resendEnvConfigured, setResendEnvConfigured] = useState(null);

  const ADMIN_BASE = String(
    import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api'
  ).replace(/\/+$/, '');
  const MARKETING_BASE = `${ADMIN_BASE}/marketing`;

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchSenders = async () => {
    setFetching(true);
    try {
      const res = await axios.get(`${MARKETING_BASE}/senders?type=email`, { headers: authHeaderObj() });
      if (res.data?.success) {
        setSenders(res.data.data || []);
        if (res.data?.meta && typeof res.data.meta.resend_env_configured === 'boolean') {
          setResendEnvConfigured(res.data.meta.resend_env_configured);
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || `Failed to load email dispatchers: ${err.message}` });
    } finally {
      setFetching(false);
    }
  };

  const handleProviderChange = (provider) => {
    setActiveProviderTab(provider);
    setFormData((prev) => ({
      ...prev,
      provider,
      email_provider: provider,
      smtp_host: provider === 'aws_ses' ? 'email-smtp.ap-south-1.amazonaws.com' : provider === 'smtp' ? 'smtp.gmail.com' : '',
      smtp_port: provider === 'smtp' ? 465 : 587,
      smtp_secure: provider === 'smtp'
    }));
  };

  const handleSaveSender = async (e) => {
    e.preventDefault();
    if (!formData.sender_email || !formData.sender_name) return;

    setLoading(true);
    setFeedback(null);
    try {
      const payload = {
        ...formData,
        type: 'email',
        name: formData.sender_name,
        email_provider: activeProviderTab,
        provider: activeProviderTab
      };
      if (activeProviderTab === 'resend') {
        delete payload.resend_api_key;
      }

      if (editingId) {
        await axios.put(`${MARKETING_BASE}/senders/${editingId}`, payload, { headers: authHeaderObj() });
        setFeedback({ type: 'success', text: `Updated ${payload.sender_name} (${payload.purpose}) in MongoDB. Run Test Send to verify.` });
        setEditingId(null);
      } else {
        await axios.post(`${MARKETING_BASE}/senders`, payload, { headers: authHeaderObj() });
        setFeedback({ type: 'success', text: `Saved new ${activeProviderTab.toUpperCase()} dispatcher "${payload.sender_name}" (${payload.sender_email}). Click Test Send above to verify.` });
      }
      setFormData(EMPTY_FORM(activeProviderTab));
      await fetchSenders();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to save sender configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this email dispatcher from the database?')) return;
    try {
      await axios.delete(`${MARKETING_BASE}/senders/${id}`, { headers: authHeaderObj() });
      setFeedback({ type: 'success', text: 'Email dispatcher deleted.' });
      await fetchSenders();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message });
    }
  };

  const handleEdit = (sender) => {
    setEditingId(sender._id);
    const prov = sender.email_provider || sender.provider || 'smtp';
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
      smtp_user: sender.smtp_user || '',
      smtp_pass: sender.smtp_pass || '',
      smtp_secure: Boolean(sender.smtp_secure),
      is_default: Boolean(sender.is_default)
    });
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  const openTestModal = (sender) => {
    setTestModalSender(sender);
    setTestTarget(sender.sender_email || '');
  };

  const executeTestSend = async () => {
    if (!testModalSender || !testTarget) return;
    setTesting(true);
    setFeedback({ type: 'info', text: `Sending live test email via ${testModalSender.sender_name} to ${testTarget}...` });
    try {
      const res = await axios.post(
        `${MARKETING_BASE}/senders/test`,
        { sender_id: testModalSender._id, test_target: testTarget },
        { headers: authHeaderObj() }
      );
      const data = res.data || {};
      if (data.success && !data.simulated) {
        setFeedback({
          type: 'success',
          text: `Test email sent! Provider: ${data.provider} | Message ID: ${data.messageId || 'OK'}`
        });
      } else {
        setFeedback({
          type: 'error',
          text: `Delivery failed (${data.provider || 'config'} / ${data.errorCode || (data.simulated ? 'SIMULATED' : 'ERROR')}): ${data.error || data.message || 'Check backend .env RESEND_API_KEY credentials'}`
        });
      }
      await fetchSenders();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: `Test dispatch error: ${err.response?.data?.error || err.response?.data?.message || err.message}`
      });
    } finally {
      setTesting(false);
      setTestModalSender(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaServer className="w-3.5 h-3.5" />
            <span>Developer Panel • Delivery Infrastructure</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Email Dispatchers & Purpose-Wise Routing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure encrypted Resend API, AWS SES, and SMTP dispatchers persisted in MongoDB.
          </p>
        </div>
      </div>

      {/* Video Guides */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border border-blue-700/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
            <FaInfoCircle className="w-4 h-4" />
            <span>Official Setup Video Guides & Tutorials</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Developer Docs</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <a href="https://youtu.be/eubuhK_1NN0" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all flex items-center justify-between group">
            <div>
              <div className="text-xs font-extrabold flex items-center gap-1.5 text-white">
                <span>Resend Bulk Email & API Key Setup</span>
                <FaExternalLinkAlt className="w-3 h-3 text-slate-300 group-hover:text-amber-300" />
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Tutorial for API key generation & domain verification.</p>
            </div>
          </a>
          <a href="https://youtu.be/VWt43MXhuk4" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all flex items-center justify-between group">
            <div>
              <div className="text-xs font-extrabold flex items-center gap-1.5 text-white">
                <span>AWS SES Domain & SMTP Setup Guide</span>
                <FaExternalLinkAlt className="w-3 h-3 text-slate-300 group-hover:text-amber-300" />
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Tutorial for AWS SES Sandbox exit & SMTP credentials.</p>
            </div>
          </a>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : feedback.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {feedback.type === 'error' ? <FaExclamationTriangle className="shrink-0" /> : <FaCheckCircle className="shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Configured Senders List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Configured Delivery Senders & Purpose Map</h2>
            <p className="text-xs text-slate-500">Live records from `marketing_senders` (secrets encrypted & masked).</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
            {fetching ? 'Loading...' : `${senders.length} Configured`}
          </span>
        </div>

        {!fetching && senders.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
            No email senders configured in the database yet. Add your first SMTP, Resend, or AWS SES sender below.
          </div>
        ) : (
          <div className="space-y-3">
            {senders.map((s) => {
              const prov = s.email_provider || s.provider || 'smtp';
              const purpObj = PURPOSE_OPTIONS.find((p) => p.value === s.purpose) || PURPOSE_OPTIONS[0];
              const isOk = s.status === 'active' || s.status === 'connected';

              return (
                <div key={s._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{s.sender_name || s.name}</h4>
                      {prov === 'resend' ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-900 text-white flex items-center gap-1">
                          <SiResend className="w-2.5 h-2.5 text-white" /> RESEND API
                        </span>
                      ) : prov === 'aws_ses' ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                          <FaAws className="w-2.5 h-2.5" /> AWS SES
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                          <FaServer className="w-2.5 h-2.5" /> SMTP
                        </span>
                      )}

                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${purpObj.badge}`}>
                        <FaTag className="w-2.5 h-2.5 opacity-70" /> {purpObj.label}
                      </span>

                      {s.is_default && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">Default</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {s.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-2">
                      <span>From: <strong>{s.sender_email}</strong></span>
                      <span>•</span>
                      <span>Reply-To: <strong>{s.reply_to_email || s.sender_email}</strong></span>
                      {prov === 'resend' && <span>• Auth: Backend .env</span>}
                      {prov === 'aws_ses' && <span>• Region: {s.aws_region || 'ap-south-1'}</span>}
                      {prov === 'smtp' && <span>• Host: {s.smtp_host}:{s.smtp_port} ({s.smtp_user})</span>}
                    </div>

                    {s.last_error && (
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                        Last Error: {s.last_error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    <button
                      type="button"
                      onClick={() => openTestModal(s)}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FaPaperPlane className="w-3 h-3 text-blue-600" />
                      <span>Test Send</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(s)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
                      title="Edit Sender"
                    >
                      <FaEdit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s._id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 dark:bg-slate-700 text-xs cursor-pointer"
                      title="Delete Sender"
                    >
                      <FaTrash className="w-3.5 h-3.5" />
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
            <h2 className="text-lg font-bold">
              {editingId ? 'Edit Email Dispatch Provider' : 'Add New Purpose-Wise Email Dispatcher'}
            </h2>
            <p className="text-xs text-slate-500">Credentials are AES-256-GCM encrypted before saving to MongoDB.</p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData(EMPTY_FORM(activeProviderTab));
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => handleProviderChange('resend')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
              activeProviderTab === 'resend' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            <SiResend className="w-3.5 h-3.5" /> Resend API
          </button>
          <button
            type="button"
            onClick={() => handleProviderChange('aws_ses')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
              activeProviderTab === 'aws_ses' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            <FaAws className="w-4 h-4 text-amber-500" /> AWS SES
          </button>
          <button
            type="button"
            onClick={() => handleProviderChange('smtp')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
              activeProviderTab === 'smtp' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            <FaServer className="w-3.5 h-3.5 text-blue-500" /> Custom SMTP
          </button>
        </div>

        <form onSubmit={handleSaveSender} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-2xl border border-blue-200/60 dark:border-blue-900">
              <label className="block text-xs font-bold text-blue-900 dark:text-blue-300 mb-1 uppercase tracking-wider">
                Dedicated Business Purpose / Campaign Type *
              </label>
              <select
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-bold cursor-pointer"
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sender Name *</label>
              <input
                type="text"
                placeholder="e.g. SolarKits Marketing Desk"
                value={formData.sender_name}
                onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Verified Sender Email *</label>
              <input
                type="email"
                placeholder="e.g. rahil.sunnovative@gmail.com or orders@solarkits.in"
                value={formData.sender_email}
                onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Reply-To Email Address</label>
              <input
                type="email"
                placeholder="e.g. support@solarkits.in"
                value={formData.reply_to_email}
                onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              />
            </div>

            {activeProviderTab === 'resend' && (
              <div className="md:col-span-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-start gap-2">
                  <FaInfoCircle className="text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      Resend API Key is read directly from Backend <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">.env</code> (<code className="font-mono">RESEND_API_KEY</code>)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Save your verified <code className="font-mono">@solarkits.in</code> sender identity here, then click <strong>Test Send</strong> in the active senders list above.
                    </p>
                  </div>
                </div>
                {resendEnvConfigured !== null && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 ${
                      resendEnvConfigured
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {resendEnvConfigured ? '.env Key Configured' : '.env Key Missing'}
                  </span>
                )}
              </div>
            )}

            {activeProviderTab === 'aws_ses' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">AWS Region</label>
                  <input
                    type="text"
                    value={formData.aws_region}
                    onChange={(e) => setFormData({ ...formData, aws_region: e.target.value, smtp_host: `email-smtp.${e.target.value}.amazonaws.com` })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SES SMTP Host</label>
                  <input
                    type="text"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SES SMTP Username</label>
                  <input
                    type="text"
                    placeholder="AKIA..."
                    value={formData.smtp_user}
                    onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SES SMTP Password</label>
                  <input
                    type="password"
                    placeholder={editingId ? 'Leave masked to keep unchanged' : 'SES SMTP Password'}
                    value={formData.smtp_pass}
                    onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
              </>
            )}

            {activeProviderTab === 'smtp' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SMTP Host *</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SMTP Port *</label>
                  <input
                    type="number"
                    placeholder="465 or 587"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({ ...formData, smtp_port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SMTP Username / Email *</label>
                  <input
                    type="text"
                    placeholder="username@gmail.com"
                    value={formData.smtp_user}
                    onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SMTP App Password *</label>
                  <input
                    type="password"
                    placeholder={editingId ? 'Leave masked to keep unchanged' : '16-character App Password'}
                    value={formData.smtp_pass}
                    onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
            <label htmlFor="is_default" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              Set as Default Email Sender
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingId ? 'Update Email Dispatcher' : `Save ${activeProviderTab.toUpperCase()} Dispatcher`}
            </button>
          </div>
        </form>
      </div>

      {/* Test Send Modal */}
      {testModalSender && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaPaperPlane className="text-blue-600" /> Test Email Dispatch
              </h3>
              <button
                type="button"
                onClick={() => setTestModalSender(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Send a real verification email using <strong>{testModalSender.sender_name}</strong> ({(testModalSender.email_provider || 'smtp').toUpperCase()}).
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Target Recipient Email:</label>
                <input
                  type="email"
                  value={testTarget}
                  onChange={(e) => setTestTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTestModalSender(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={testing || !testTarget}
                onClick={executeTestSend}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {testing ? 'Sending...' : 'Send Test Email Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
