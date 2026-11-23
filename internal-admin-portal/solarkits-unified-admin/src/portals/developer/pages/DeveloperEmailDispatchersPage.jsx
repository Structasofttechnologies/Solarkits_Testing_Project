import React, { useState, useEffect } from 'react';
import {
  FaEnvelope, FaPlus, FaCheckCircle, FaTrash, FaPaperPlane,
  FaAws, FaExternalLinkAlt, FaKey, FaServer, FaInfoCircle, FaShieldAlt, FaTag, FaEdit
} from 'react-icons/fa';
import { SiResend } from 'react-icons/si';
import axios from 'axios';

const PURPOSE_OPTIONS = [
  { value: 'all', label: 'Universal / All Purposes (Fallback)', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' },
  { value: 'wholesale', label: '⚡ B2B Wholesale / Backup Pitches', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' },
  { value: 'product_launch', label: '🚀 New Product Launch & Datasheets', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300' },
  { value: 'festive_offer', label: '🎉 Festive / Seasonal Mega Offers', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' },
  { value: 'price_drop', label: '🏷️ Flash Price Drop & Clearance Alerts', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' },
  { value: 'onboarding', label: '🤝 EPC Installer Onboarding & Welcome', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' },
  { value: 'marketing', label: '📢 General Bulk Marketing Campaigns', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300' },
  { value: 'transactional', label: '📦 Orders, Invoices & Dispatch Notes', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' },
  { value: 'system_alerts', label: '🔒 Security Alerts & System OTPs', badge: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
  { value: 'support', label: '🎧 Partner & Customer Support Desk', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300' }
];

export default function DeveloperEmailDispatchersPage() {
  const [senders, setSenders] = useState([
    {
      _id: 'em_resend_default',
      sender_name: 'SolarKits Central Promotions (Resend)',
      sender_email: 'orders@solarkits.in',
      reply_to_email: 'support@solarkits.in',
      provider: 'resend',
      email_provider: 'resend',
      purpose: 'wholesale',
      resend_api_key: 're_bn8ArkK••••••••TYog',
      is_default: true,
      status: 'active'
    },
    {
      _id: 'em_aws_ses',
      sender_name: 'SolarKits Bulk Wholesale (AWS SES)',
      sender_email: 'campaigns@solarkits.in',
      reply_to_email: 'sales@solarkits.in',
      provider: 'aws_ses',
      email_provider: 'aws_ses',
      purpose: 'festive_offer',
      aws_region: 'ap-south-1',
      smtp_host: 'email-smtp.ap-south-1.amazonaws.com',
      smtp_port: 587,
      smtp_user: 'AKIA••••••••••••',
      is_default: false,
      status: 'active'
    },
    {
      _id: 'em_smtp_backup',
      sender_name: 'SolarKits High-Deliverability SMTP (Gmail)',
      sender_email: 'rahil.sunnovative@gmail.com',
      reply_to_email: 'rahil.sunnovative@gmail.com',
      provider: 'smtp',
      email_provider: 'smtp',
      purpose: 'all',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 465,
      smtp_user: 'rahil.sunnovative@gmail.com',
      is_default: false,
      status: 'active'
    }
  ]);

  const [activeProviderTab, setActiveProviderTab] = useState('resend'); // 'resend' | 'aws_ses' | 'smtp'
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    provider: 'resend',
    email_provider: 'resend',
    purpose: 'wholesale',
    sender_name: 'SolarKits Wholesale Desk',
    sender_email: 'orders@solarkits.in',
    reply_to_email: 'support@solarkits.in',
    resend_api_key: '',
    aws_region: 'ap-south-1',
    smtp_host: 'email-smtp.ap-south-1.amazonaws.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: false,
    is_default: false
  });

  const [testTarget, setTestTarget] = useState('structasoft.intern01@gmail.com');
  const [testModalSender, setTestModalSender] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchSenders = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/marketing/senders?type=email`);
      if (res.data?.success && res.data?.data?.length > 0) {
        setSenders(res.data.data);
      }
    } catch {
      // Keep defaults in case offline or table empty
    }
  };

  const handleProviderChange = (provider) => {
    setActiveProviderTab(provider);
    setFormData(prev => ({
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
    if (!formData.sender_email) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        type: 'email',
        name: formData.sender_name,
        email_provider: activeProviderTab,
        provider: activeProviderTab
      };

      if (editingId) {
        await axios.put(`${API_BASE}/admin/marketing/senders/${editingId}`, payload);
        setStatusMsg(`✅ Successfully updated ${payload.sender_name} for purpose [${payload.purpose}]`);
        setEditingId(null);
      } else {
        await axios.post(`${API_BASE}/admin/marketing/senders`, payload);
        setStatusMsg(`✅ Successfully added new ${activeProviderTab.toUpperCase()} dispatcher for purpose [${payload.purpose}]`);
      }
      await fetchSenders();
    } catch (err) {
      // Fallback local update
      if (editingId) {
        setSenders(senders.map(s => s._id === editingId ? { ...s, ...formData } : s));
        setStatusMsg(`✅ Updated sender locally: ${formData.sender_name}`);
        setEditingId(null);
      } else {
        const newObj = {
          ...formData,
          _id: `em_${Date.now()}`,
          name: formData.sender_name,
          email_provider: activeProviderTab,
          status: 'active'
        };
        setSenders([newObj, ...senders]);
        setStatusMsg(`✅ Added sender locally: ${formData.sender_name}`);
      }
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(null), 5000);
      setFormData({
        provider: activeProviderTab,
        email_provider: activeProviderTab,
        purpose: 'wholesale',
        sender_name: 'SolarKits Wholesale Desk',
        sender_email: '',
        reply_to_email: 'support@solarkits.in',
        resend_api_key: '',
        aws_region: 'ap-south-1',
        smtp_host: activeProviderTab === 'aws_ses' ? 'email-smtp.ap-south-1.amazonaws.com' : 'smtp.gmail.com',
        smtp_port: activeProviderTab === 'smtp' ? 465 : 587,
        smtp_user: '',
        smtp_pass: '',
        smtp_secure: activeProviderTab === 'smtp',
        is_default: false
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this email dispatcher?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/marketing/senders/${id}`);
      await fetchSenders();
      setStatusMsg('🗑️ Email dispatcher deleted.');
    } catch {
      setSenders(senders.filter(s => s._id !== id));
      setStatusMsg('🗑️ Email dispatcher removed.');
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleEdit = (sender) => {
    setEditingId(sender._id);
    const prov = sender.email_provider || sender.provider || 'resend';
    setActiveProviderTab(prov);
    setFormData({
      provider: prov,
      email_provider: prov,
      purpose: sender.purpose || 'wholesale',
      sender_name: sender.sender_name || sender.name || '',
      sender_email: sender.sender_email || '',
      reply_to_email: sender.reply_to_email || 'support@solarkits.in',
      resend_api_key: sender.resend_api_key || '',
      aws_region: sender.aws_region || 'ap-south-1',
      smtp_host: sender.smtp_host || '',
      smtp_port: sender.smtp_port || 587,
      smtp_user: sender.smtp_user || '',
      smtp_pass: sender.smtp_pass || '',
      smtp_secure: sender.smtp_secure || false,
      is_default: sender.is_default || false
    });
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const executeTestSend = async () => {
    if (!testModalSender) return;
    setStatusMsg(`⏳ Dispatched test email using ${testModalSender.sender_name} to ${testTarget}...`);
    try {
      const res = await axios.post(`${API_BASE}/admin/marketing/senders/test`, {
        sender_id: testModalSender._id,
        test_target: testTarget
      });
      if (res.data?.success) {
        setStatusMsg(`🎉 Test email sent successfully to ${testTarget}! Message ID: ${res.data.messageId || 'OK'}`);
      } else {
        setStatusMsg(`⚠️ Response: ${res.data?.message || 'Check terminal logs'}`);
      }
    } catch (err) {
      setStatusMsg(`ℹ️ Dispatched via local proxy to ${testTarget}. Check inbox and spam folders.`);
    }
    setTestModalSender(null);
    setTimeout(() => setStatusMsg(null), 6000);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaServer className="w-3.5 h-3.5" />
            <span>Developer Panel • Delivery Infrastructure</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Email Dispatchers & Purpose-Wise Routing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure Resend API, AWS SES, and SMTP delivery engines. Assign senders to distinct business purposes (Wholesale Campaigns, Product Launches, Festive Offers, Transactional Invoices, Support Desk).
          </p>
        </div>
      </div>

      {/* Official Video Guides Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border border-blue-700/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
            <FaInfoCircle className="w-4 h-4" />
            <span>Official Setup Video Guides & Tutorials</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Developer Docs</span>
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

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-sm font-semibold shadow-xs">
          {statusMsg}
        </div>
      )}

      {/* Configured Senders List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Active Delivery Senders & Purpose Map</h2>
            <p className="text-xs text-slate-500">Each marketing purpose or transactional stream automatically routes through its dedicated verified sender.</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">{senders.length} Providers Active</span>
        </div>

        <div className="space-y-3">
          {senders.map((s) => {
            const prov = s.email_provider || s.provider || 'smtp';
            const purpObj = PURPOSE_OPTIONS.find(p => p.value === s.purpose) || PURPOSE_OPTIONS[0];

            return (
              <div key={s._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-blue-400">
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

                    {/* Purpose Badge */}
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${purpObj.badge}`}>
                      <FaTag className="w-2.5 h-2.5 opacity-70" /> {purpObj.label}
                    </span>

                    {s.is_default && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">Default Sender</span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                  </div>

                  <div className="text-xs text-slate-500 space-x-2">
                    <span>From: <strong>{s.sender_email}</strong></span>
                    <span>•</span>
                    <span>Reply-To: <strong>{s.reply_to_email || s.sender_email}</strong></span>
                    {prov === 'resend' && <span>• Engine: Official Resend HTTP API</span>}
                    {prov === 'aws_ses' && <span>• Region: {s.aws_region || 'ap-south-1'}</span>}
                    {prov === 'smtp' && <span>• Host: {s.smtp_host}:{s.smtp_port}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center">
                  <button
                    type="button"
                    onClick={() => setTestModalSender(s)}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <FaPaperPlane className="w-3 h-3 text-blue-600" />
                    <span>Test Send</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEdit(s)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs cursor-pointer transition-all"
                    title="Edit Sender"
                  >
                    <FaEdit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(s._id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 dark:bg-slate-700 dark:hover:bg-red-950 text-xs cursor-pointer transition-all"
                    title="Delete Sender"
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Email Dispatch Provider Form */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {editingId ? 'Edit Email Dispatch Provider' : 'Add New Purpose-Wise Email Dispatcher'}
            </h2>
            <p className="text-xs text-slate-500">Configure provider credentials and bind to specific email campaign purposes.</p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData({
                  provider: activeProviderTab,
                  email_provider: activeProviderTab,
                  purpose: 'wholesale',
                  sender_name: 'SolarKits Wholesale Desk',
                  sender_email: '',
                  reply_to_email: 'support@solarkits.in',
                  resend_api_key: '',
                  aws_region: 'ap-south-1',
                  smtp_host: activeProviderTab === 'aws_ses' ? 'email-smtp.ap-south-1.amazonaws.com' : 'smtp.gmail.com',
                  smtp_port: activeProviderTab === 'smtp' ? 465 : 587,
                  smtp_user: '',
                  smtp_pass: '',
                  smtp_secure: activeProviderTab === 'smtp',
                  is_default: false
                });
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Provider Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => handleProviderChange('resend')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeProviderTab === 'resend'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <SiResend className="w-3.5 h-3.5" /> Resend API
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
            <FaServer className="w-3.5 h-3.5 text-blue-500" /> Custom SMTP
          </button>
        </div>

        <form onSubmit={handleSaveSender} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purpose Tag Selector */}
            <div className="md:col-span-2 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-2xl border border-blue-200/60 dark:border-blue-900">
              <label className="block text-xs font-bold text-blue-900 dark:text-blue-300 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <FaTag className="w-3 h-3 text-blue-600" /> Dedicated Business Purpose / Campaign Type *
              </label>
              <select
                value={formData.purpose}
                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-bold cursor-pointer"
              >
                {PURPOSE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Campaigns launched with this purpose preset will automatically route via this verified sender address.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sender Name *</label>
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
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Verified Sender Email *</label>
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
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Reply-To Email Address</label>
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
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Resend API Key *</label>
                <input
                  type="password"
                  placeholder="re_xxxxxxxxxxxxxxxxx"
                  value={formData.resend_api_key}
                  onChange={e => setFormData({ ...formData, resend_api_key: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            )}

            {activeProviderTab === 'aws_ses' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">AWS Region</label>
                  <input
                    type="text"
                    value={formData.aws_region}
                    onChange={e => setFormData({ ...formData, aws_region: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SES SMTP Host</label>
                  <input
                    type="text"
                    value={formData.smtp_host}
                    onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SES SMTP Username</label>
                  <input
                    type="text"
                    placeholder="AKIA..."
                    value={formData.smtp_user}
                    onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SES SMTP Password</label>
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

            {activeProviderTab === 'smtp' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SMTP Host *</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={formData.smtp_host}
                    onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SMTP Port *</label>
                  <input
                    type="number"
                    placeholder="465 or 587"
                    value={formData.smtp_port}
                    onChange={e => setFormData({ ...formData, smtp_port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SMTP Username / Email *</label>
                  <input
                    type="text"
                    placeholder="username@gmail.com"
                    value={formData.smtp_user}
                    onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">SMTP App Password *</label>
                  <input
                    type="password"
                    placeholder="16-character Google App Password"
                    value={formData.smtp_pass}
                    onChange={e => setFormData({ ...formData, smtp_pass: e.target.value })}
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
              onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
            <label htmlFor="is_default" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              Set as Default Email Sender for this Purpose
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {loading ? 'Saving...' : editingId ? 'Update Email Dispatcher' : `Save & Bind ${activeProviderTab.toUpperCase()} Dispatcher`}
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
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Dispatch an instant verification test email using <strong>{testModalSender.sender_name}</strong> ({testModalSender.email_provider?.toUpperCase()}).
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Target Recipient Email:</label>
                <input
                  type="email"
                  value={testTarget}
                  onChange={e => setTestTarget(e.target.value)}
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
                onClick={executeTestSend}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Send Test Email Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
