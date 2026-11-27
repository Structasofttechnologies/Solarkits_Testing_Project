import React, { useState, useEffect } from 'react';
import { FaMousePointer, FaCheckCircle, FaUsers, FaClock, FaSave, FaSpinner, FaGlobe, FaExclamationCircle } from 'react-icons/fa';
import { marketingHttp, extractApiError } from './services/marketingApi';

export default function WebsiteFormMappingPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(null);

  // Fetch real form mappings from backend MongoDB
  const fetchFormMappings = async () => {
    setLoading(true);
    try {
      const res = await marketingHttp.get('/form-mappings');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setForms(res.data.data);
      } else {
        setForms([]);
      }
    } catch (err) {
      setSavedNotice({ type: 'error', message: extractApiError(err, 'Failed to load website form mappings from backend') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormMappings();
  }, []);

  const handleUpdateSla = (id, newSla) => {
    setForms(forms.map(f => (f._id === id || f.id === id) ? { ...f, sla_hours: Number(newSla) } : f));
  };

  const handleToggleWa = (id) => {
    setForms(forms.map(f => (f._id === id || f.id === id) ? { ...f, auto_trigger_whatsapp: !f.auto_trigger_whatsapp } : f));
  };

  const handleToggleEmail = (id) => {
    setForms(forms.map(f => (f._id === id || f.id === id) ? { ...f, auto_trigger_email: !f.auto_trigger_email } : f));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSavedNotice(null);
    try {
      const res = await marketingHttp.put('/form-mappings/bulk-update', { mappings: forms });
      if (res.data?.success) {
        setSavedNotice({ type: 'success', message: 'Website form mappings and SLA routing saved to database.' });
      } else {
        setSavedNotice({ type: 'error', message: res.data?.message || 'Save rejected by server.' });
      }
    } catch (err) {
      setSavedNotice({ type: 'error', message: extractApiError(err, 'Failed to save website form mappings') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaMousePointer className="w-3.5 h-3.5" />
            <span>SOLARKITS Website Tracking Bridge</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Website Form Mapping</h1>
          <p className="text-sm text-slate-500">
            Map official website forms to marketing campaigns, capture UTM parameters, auto-create CRM leads & enforce SLAs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFormMappings}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            title="Refresh database mappings"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaGlobe />} Refresh
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-colors"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} Save Configuration
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${
          savedNotice.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-800 dark:text-rose-200'
            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-800 dark:text-emerald-200'
        }`}>
          {savedNotice.type === 'error' ? <FaExclamationCircle className="text-rose-500" /> : <FaCheckCircle className="text-emerald-500" />}
          <span>{savedNotice.message}</span>
        </div>
      )}

      {/* Forms Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Website Form Name</th>
                <th className="py-3.5 px-4">Page Route</th>
                <th className="py-3.5 px-4">Assigned Team</th>
                <th className="py-3.5 px-4">Contact SLA</th>
                <th className="py-3.5 px-4">Auto Notifications</th>
                <th className="py-3.5 px-4 text-right">Attributed Leads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {forms.map((f) => (
                <tr key={f._id || f.id || f.form_key} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{f.form_name}</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">{f.form_key}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                      {f.page_route}
                    </div>
                    {f.status_label && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {f.status_label}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-semibold">{f.target_team}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <FaClock className="text-slate-400" />
                      <select
                        value={f.sla_hours || 4}
                        onChange={(e) => handleUpdateSla(f._id || f.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                      >
                        <option value={2}>2 Hours</option>
                        <option value={4}>4 Hours</option>
                        <option value={6}>6 Hours</option>
                        <option value={8}>8 Hours</option>
                        <option value={12}>12 Hours</option>
                        <option value={24}>24 Hours</option>
                      </select>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!f.auto_trigger_email}
                          onChange={() => handleToggleEmail(f._id || f.id)}
                          className="accent-indigo-600"
                        />
                        Email
                      </label>
                      <label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!f.auto_trigger_whatsapp}
                          onChange={() => handleToggleWa(f._id || f.id)}
                          className="accent-emerald-600"
                        />
                        WhatsApp
                      </label>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="font-bold text-slate-900 dark:text-white">{f.total_leads_created || 0} Leads</div>
                    <div className="text-[10px] text-slate-400">from {f.total_submissions || 0} hits</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
