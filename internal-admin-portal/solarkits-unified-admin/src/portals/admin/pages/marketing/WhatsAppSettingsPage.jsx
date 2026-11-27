import React, { useState, useEffect } from 'react';
import { FaWhatsapp, FaPaperPlane, FaTrash, FaEdit, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { marketingHttp, extractApiError } from './services/marketingApi';

const EMPTY_WA_FORM = {
  wa_business_name: '',
  wa_number: '',
  phone_number_id: '',
  waba_id: '',
  meta_access_token: '',
  is_default: false
};

export default function WhatsAppSettingsPage() {
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_WA_FORM);

  const [testTargetPhone, setTestTargetPhone] = useState('');
  const [testingId, setTestingId] = useState(null);
  const [statusBanner, setStatusBanner] = useState(null);

  const loadSenders = async () => {
    setLoading(true);
    try {
      const res = await marketingHttp.get('/senders?type=whatsapp');
      if (res.data?.success) {
        setNumbers(res.data.data || []);
      }
    } catch (err) {
      setStatusBanner({ type: 'error', text: extractApiError(err, 'Failed to load WhatsApp senders') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSenders();
  }, []);

  const handleSaveNumber = async (e) => {
    e.preventDefault();
    if (!formData.wa_number || !formData.wa_business_name) return;

    setSaving(true);
    setStatusBanner(null);
    try {
      const payload = {
        ...formData,
        type: 'whatsapp',
        name: formData.wa_business_name,
        api_provider: 'meta_cloud_api',
        status: 'disconnected'
      };
      if (editingId) {
        await marketingHttp.put(`/senders/${editingId}`, payload);
        setStatusBanner({ type: 'success', text: `Updated WhatsApp Business number "${formData.wa_business_name}". Click Verify API to check connection.` });
        setEditingId(null);
      } else {
        await marketingHttp.post('/senders', payload);
        setStatusBanner({ type: 'success', text: `Saved WhatsApp number "${formData.wa_number}". Click Test API Ping to verify Meta Graph credentials.` });
      }
      setFormData(EMPTY_WA_FORM);
      await loadSenders();
    } catch (err) {
      setStatusBanner({ type: 'error', text: extractApiError(err, 'Failed to save WhatsApp sender') });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (n) => {
    setEditingId(n._id);
    setFormData({
      wa_business_name: n.wa_business_name || n.name || '',
      wa_number: n.wa_number || '',
      phone_number_id: n.phone_number_id || '',
      waba_id: n.waba_id || '',
      meta_access_token: n.meta_access_token || '',
      is_default: Boolean(n.is_default)
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this WhatsApp Business number?')) return;
    try {
      await marketingHttp.delete(`/senders/${id}`);
      setStatusBanner({ type: 'success', text: 'WhatsApp sender removed.' });
      await loadSenders();
    } catch (err) {
      setStatusBanner({ type: 'error', text: extractApiError(err, 'Failed to delete WhatsApp sender') });
    }
  };

  const handleTestPing = async (sender, sendTestMessage = false) => {
    setTestingId(sender._id);
    setStatusBanner({
      type: 'info',
      text: sendTestMessage
        ? `Sending live WhatsApp message to ${testTargetPhone}...`
        : `Verifying Phone Number ID ${sender.phone_number_id} with Meta Graph API...`
    });
    try {
      const res = await marketingHttp.post('/senders/test', {
        sender_id: sender._id,
        verify_only: !sendTestMessage,
        test_target: sendTestMessage ? testTargetPhone.trim() : undefined
      });
      const data = res.data || {};
      if (data.success) {
        const verifiedName = data.account?.verified_name ? `Verified Name: ${data.account.verified_name}` : '';
        const msgId = data.messageId ? `MessageId: ${data.messageId}` : '';
        setStatusBanner({
          type: 'success',
          text: `Meta Cloud API Connected! ${verifiedName} ${msgId}`.trim()
        });
      } else {
        setStatusBanner({
          type: 'error',
          text: `WhatsApp API Failed [${data.errorCode || 'META_ERROR'}]: ${data.error || 'Connection refused'}`
        });
      }
      await loadSenders();
    } catch (err) {
      setStatusBanner({ type: 'error', text: extractApiError(err, 'Meta Graph API check failed') });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-5xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FaWhatsapp className="w-3.5 h-3.5" />
          <span>WhatsApp Marketing Configuration</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">WhatsApp Business API Setup</h1>
        <p className="text-sm text-slate-500">Connect official Meta WhatsApp Cloud API numbers with encrypted Permanent Access Tokens & real connectivity diagnostics.</p>
      </div>

      {statusBanner && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${
            statusBanner.type === 'error'
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

      {/* Connected Numbers List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Configured WhatsApp Numbers ({numbers.length})</h2>
          <input
            type="text"
            placeholder="Test phone (e.g. +919876543210)"
            value={testTargetPhone}
            onChange={(e) => setTestTargetPhone(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs w-full sm:w-64"
          />
        </div>

        {loading ? (
          <div className="text-xs text-slate-400 py-6 text-center">Loading WhatsApp numbers...</div>
        ) : numbers.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
            No WhatsApp Business numbers connected yet. Add your Meta Cloud API Phone Number ID & System User Token below.
          </div>
        ) : (
          <div className="space-y-3">
            {numbers.map((n) => {
              const connected = n.status === 'connected' || n.status === 'active';
              return (
                <div key={n._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white">{n.wa_business_name || n.name}</h4>
                      {n.is_default && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">Default Number</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {n.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Number: <strong>{n.wa_number}</strong> • Phone Number ID: <code>{n.phone_number_id}</code> • WABA ID: <code>{n.waba_id}</code>
                    </div>
                    {n.last_error && (
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                        API Error: {n.last_error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={testingId === n._id}
                      onClick={() => handleTestPing(n, false)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <FaPaperPlane className="w-3 h-3" />
                      <span>{testingId === n._id ? 'Checking...' : 'Test API Ping'}</span>
                    </button>
                    {testTargetPhone.trim() && (
                      <button
                        type="button"
                        disabled={testingId === n._id}
                        onClick={() => handleTestPing(n, true)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold cursor-pointer"
                      >
                        Send Test Msg
                      </button>
                    )}
                    <button type="button" onClick={() => handleEdit(n)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-xs cursor-pointer" title="Edit">
                      <FaEdit />
                    </button>
                    <button type="button" onClick={() => handleDelete(n._id)} className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-700 text-xs cursor-pointer" title="Delete">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit WhatsApp Number Form */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{editingId ? 'Edit WhatsApp Business Number' : 'Connect New WhatsApp Business Number'}</h2>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData(EMPTY_WA_FORM); }} className="text-xs font-bold text-slate-500 underline cursor-pointer">
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSaveNumber} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp Business Name *</label>
            <input type="text" placeholder="e.g. SolarKits Gujarat Desk" value={formData.wa_business_name} onChange={(e) => setFormData({ ...formData, wa_business_name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Registered Phone Number *</label>
            <input type="text" placeholder="+91 9913421453" value={formData.wa_number} onChange={(e) => setFormData({ ...formData, wa_number: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number ID *</label>
            <input type="text" placeholder="e.g. 109841285491024" value={formData.phone_number_id} onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp Business Account (WABA) ID *</label>
            <input type="text" placeholder="e.g. 984120938410294" value={formData.waba_id} onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Meta System User Permanent Access Token *</label>
            <input type="password" placeholder={editingId ? 'Leave masked to keep existing token' : 'EAA...'} value={formData.meta_access_token} onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" required={!editingId} />
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} className="accent-emerald-600" />
              Set as Default Campaign Number
            </label>
          </div>

          <div className="md:col-span-2 pt-2">
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Update WhatsApp Number' : 'Save & Configure WhatsApp Number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
