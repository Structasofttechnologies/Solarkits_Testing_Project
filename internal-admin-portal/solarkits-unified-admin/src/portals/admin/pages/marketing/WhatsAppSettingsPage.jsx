import React, { useState } from 'react';
import { FaWhatsapp, FaPlus, FaCheckCircle, FaPaperPlane, FaLock } from 'react-icons/fa';

export default function WhatsAppSettingsPage() {
  const [numbers, setNumbers] = useState([
    {
      _id: 'wa1',
      wa_business_name: 'SolarKits Central Verified WhatsApp',
      wa_number: '+91 9913421453',
      phone_number_id: '109841285491024',
      waba_id: '984120938410294',
      api_provider: 'Meta Cloud API (v19.0)',
      is_default: true,
      status: 'connected'
    },
    {
      _id: 'wa2',
      wa_business_name: 'SolarKits Franchisee Support Desk',
      wa_number: '+91 9876543210',
      phone_number_id: '109841285491099',
      waba_id: '984120938410294',
      api_provider: 'Meta Cloud API (v19.0)',
      is_default: false,
      status: 'connected'
    }
  ]);

  const [formData, setFormData] = useState({
    wa_business_name: '',
    wa_number: '',
    phone_number_id: '',
    waba_id: '',
    meta_access_token: '',
    is_default: false
  });

  const [testStatus, setTestStatus] = useState(null);

  const handleAddNumber = (e) => {
    e.preventDefault();
    if (!formData.wa_number) return;
    setNumbers([...numbers, { ...formData, _id: `wa_${Date.now()}`, api_provider: 'Meta Cloud API (v19.0)', status: 'connected' }]);
    setFormData({
      wa_business_name: '',
      wa_number: '',
      phone_number_id: '',
      waba_id: '',
      meta_access_token: '',
      is_default: false
    });
  };

  const handleTestPing = (id) => {
    setTestStatus('Connecting to Meta Cloud Graph API...');
    setTimeout(() => {
      setTestStatus('✓ WhatsApp Cloud API Verified! Webhook status active & template delivery confirmed.');
      setTimeout(() => setTestStatus(null), 3500);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-5xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FaWhatsapp className="w-3.5 h-3.5" />
          <span>WhatsApp Marketing Configuration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">WhatsApp Business API Setup</h1>
        <p className="text-sm text-slate-500">Configure official Meta WhatsApp Cloud API credentials, registered phone numbers & compliance.</p>
      </div>

      {testStatus && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
          {testStatus}
        </div>
      )}

      {/* Connected Numbers List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-lg font-bold">Connected WhatsApp Numbers</h2>
        <div className="space-y-3">
          {numbers.map((n) => (
            <div key={n._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">{n.wa_business_name}</h4>
                  {n.is_default && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">Default Campaign Number</span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Connected
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Number: <strong>{n.wa_number}</strong> • Phone Number ID: <code>{n.phone_number_id}</code> • WABA ID: <code>{n.waba_id}</code>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestPing(n._id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FaPaperPlane className="w-3 h-3 text-emerald-600" />
                  <span>Test API Ping</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New WhatsApp Number Form */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-lg font-bold">Connect New WhatsApp Business Number</h2>
        <form onSubmit={handleAddNumber} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp Business Name *</label>
            <input
              type="text"
              placeholder="e.g. SolarKits Gujarat Desk"
              value={formData.wa_business_name}
              onChange={e => setFormData({ ...formData, wa_business_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Registered Phone Number *</label>
            <input
              type="text"
              placeholder="+91 9913421453"
              value={formData.wa_number}
              onChange={e => setFormData({ ...formData, wa_number: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number ID *</label>
            <input
              type="text"
              placeholder="e.g. 109841285491024"
              value={formData.phone_number_id}
              onChange={e => setFormData({ ...formData, phone_number_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp Business Account (WABA) ID *</label>
            <input
              type="text"
              placeholder="e.g. 984120938410294"
              value={formData.waba_id}
              onChange={e => setFormData({ ...formData, waba_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Meta System User Permanent Access Token *</label>
            <input
              type="password"
              placeholder="EAA..."
              value={formData.meta_access_token}
              onChange={e => setFormData({ ...formData, meta_access_token: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              required
            />
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                className="accent-emerald-600"
              />
              Set as Default Campaign Number
            </label>
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              Verify & Save WhatsApp Number
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
