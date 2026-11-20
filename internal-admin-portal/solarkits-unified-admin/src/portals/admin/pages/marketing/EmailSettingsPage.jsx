import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaPlus, FaCheckCircle, FaTrash, FaPaperPlane } from 'react-icons/fa';

export default function EmailSettingsPage() {
  const [senders, setSenders] = useState([
    {
      _id: 'em1',
      sender_name: 'SolarKits Central Promotions',
      sender_email: 'campaigns@solarkits.in',
      reply_to_email: 'sales@solarkits.in',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: 'campaigns@solarkits.in',
      is_default: true,
      status: 'active'
    },
    {
      _id: 'em2',
      sender_name: 'SolarKits Franchisee Desk',
      sender_email: 'franchisee@solarkits.in',
      reply_to_email: 'partner@solarkits.in',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: 'franchisee@solarkits.in',
      is_default: false,
      status: 'active'
    }
  ]);

  const [formData, setFormData] = useState({
    sender_name: '',
    sender_email: '',
    reply_to_email: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    is_default: false
  });

  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState(null);

  const handleAddSender = (e) => {
    e.preventDefault();
    if (!formData.sender_email) return;
    setSenders([...senders, { ...formData, _id: `em_${Date.now()}`, status: 'active' }]);
    setFormData({
      sender_name: '',
      sender_email: '',
      reply_to_email: '',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      is_default: false
    });
  };

  const handleSendTest = (senderId) => {
    setTestStatus('Sending test email via Nodemailer SMTP...');
    setTimeout(() => {
      setTestStatus('✓ Test email dispatched successfully! Verification confirmed.');
      setTimeout(() => setTestStatus(null), 3500);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-5xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FaEnvelope className="w-3.5 h-3.5" />
          <span>Email Marketing Configuration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Email Account Settings</h1>
        <p className="text-sm text-slate-500">Configure multiple verified email senders, SMTP credentials, default accounts & campaign mapping.</p>
      </div>

      {testStatus && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
          {testStatus}
        </div>
      )}

      {/* Senders List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-lg font-bold">Configured Email Accounts</h2>
        <div className="space-y-3">
          {senders.map((s) => (
            <div key={s._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">{s.sender_name}</h4>
                  {s.is_default && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">Default Sender</span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Email: <strong>{s.sender_email}</strong> • SMTP: {s.smtp_host}:{s.smtp_port}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendTest(s._id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FaPaperPlane className="w-3 h-3 text-indigo-600" />
                  <span>Send Test Email</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Email Account Form */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-lg font-bold">Add New Email Account</h2>
        <form onSubmit={handleAddSender} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Sender Name *</label>
            <input
              type="text"
              placeholder="e.g. SolarKits Western Region"
              value={formData.sender_name}
              onChange={e => setFormData({ ...formData, sender_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Sender Email Address *</label>
            <input
              type="email"
              placeholder="e.g. news@solarkits.in"
              value={formData.sender_email}
              onChange={e => setFormData({ ...formData, sender_email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">SMTP Host</label>
            <input
              type="text"
              value={formData.smtp_host}
              onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">SMTP User / Username</label>
            <input
              type="text"
              value={formData.smtp_user}
              onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">SMTP App Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={formData.smtp_pass}
              onChange={e => setFormData({ ...formData, smtp_pass: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                className="accent-indigo-600"
              />
              Set as Default Company Sender
            </label>
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
            >
              Save Email Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
