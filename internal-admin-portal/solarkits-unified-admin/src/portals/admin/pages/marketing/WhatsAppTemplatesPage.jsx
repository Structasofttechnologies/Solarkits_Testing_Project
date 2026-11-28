import React, { useState, useEffect } from 'react';
import {
  FaWhatsapp, FaPlus, FaCheckCircle, FaMobileAlt, FaDesktop,
  FaTimes, FaTrash, FaEdit, FaPaperPlane, FaExclamationTriangle
} from 'react-icons/fa';
import WhatsAppStudio from './components/WhatsAppStudio';
import { marketingHttp, extractApiError } from './services/marketingApi';

const DEFAULT_WA_MODAL = {
  templateDisplayName: '',
  waTemplateName: '',
  language: 'en',
  category: 'MARKETING',
  waStatus: 'APPROVED',
  ctaText: 'View Solar Kits',
  couponCode: '',
  discountValue: 0,
  destinationUrl: 'https://solarkits.in/solar-kits',
  customCreative: {
    whatsapp: {
      body: 'Hello {{name}},\n\nExplore wholesale pricing on {{kit_name}} from SolarKits India.\n\nVisit: {{tracking_url}}',
      mediaType: 'none',
      mediaDetails: null,
      buttons: [
        { id: 'btn_1', type: 'url', text: 'View Kit Online', url: '{{tracking_url}}' }
      ]
    }
  }
};

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [previewDevice, setPreviewDevice] = useState('mobile');
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalFormData, setModalFormData] = useState(DEFAULT_WA_MODAL);

  const [testTargetPhone, setTestTargetPhone] = useState('');
  const [testingId, setTestingId] = useState(null);
  const [banner, setBanner] = useState(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await marketingHttp.get('/templates?channel=whatsapp');
      if (res.data?.success) {
        setTemplates(res.data.data || []);
        setSelectedIdx(0);
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to load WhatsApp templates') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const curr = templates[selectedIdx] || null;

  const openCreateModal = () => {
    setEditingId(null);
    setModalFormData(DEFAULT_WA_MODAL);
    setShowBuilderModal(true);
  };

  const openEditModal = (tmpl) => {
    setEditingId(tmpl._id);
    setModalFormData({
      ...DEFAULT_WA_MODAL,
      ...(tmpl.blocks_json || {}),
      templateDisplayName: tmpl.name || '',
      waTemplateName: tmpl.wa_template_name || '',
      language: tmpl.language || 'en',
      category: tmpl.category || 'MARKETING',
      waStatus: tmpl.wa_status || 'APPROVED',
      customCreative: {
        whatsapp: {
          body: tmpl.body_text || '',
          mediaType: tmpl.header_type === 'IMAGE' ? 'image' : tmpl.header_type === 'DOCUMENT' ? 'document' : 'none',
          mediaDetails: tmpl.header_media_url ? { url: tmpl.header_media_url, name: 'Uploaded Header' } : null,
          buttons: (tmpl.buttons || []).map((b, i) => ({
            id: `btn_${i}`,
            type: b.type === 'PHONE_NUMBER' ? 'call' : 'url',
            text: b.text,
            url: b.url,
            phone: b.phone_number
          }))
        }
      }
    });
    setShowBuilderModal(true);
  };

  const handleSaveTemplate = async () => {
    const wa = modalFormData.customCreative?.whatsapp || {};
    const displayName = modalFormData.templateDisplayName?.trim() || 'WhatsApp Campaign Template';
    const metaName =
      modalFormData.waTemplateName?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') ||
      displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    setSaving(true);
    setBanner(null);
    try {
      const payload = {
        name: displayName,
        channel: 'whatsapp',
        type: 'marketing',
        wa_template_name: metaName,
        language: modalFormData.language || 'en',
        category: modalFormData.category || 'MARKETING',
        wa_status: modalFormData.waStatus || 'APPROVED',
        header_type: wa.mediaType === 'image' ? 'IMAGE' : wa.mediaType === 'document' ? 'DOCUMENT' : 'NONE',
        header_media_url: wa.mediaDetails?.url || '',
        body_text: wa.body || '',
        footer_text: 'SolarKits India',
        buttons: (wa.buttons || []).map((b) => ({
          type: b.type === 'call' ? 'PHONE_NUMBER' : 'URL',
          text: b.text,
          url: b.url || undefined,
          phone_number: b.phone || undefined
        })),
        blocks_json: modalFormData
      };

      if (editingId) {
        await marketingHttp.put(`/templates/${editingId}`, payload);
        setBanner({ type: 'success', text: `WhatsApp template "${metaName}" updated in MongoDB.` });
      } else {
        await marketingHttp.post('/templates', payload);
        setBanner({ type: 'success', text: `WhatsApp template "${metaName}" saved to MongoDB.` });
      }
      setShowBuilderModal(false);
      setEditingId(null);
      await loadTemplates();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to save WhatsApp template') });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (tmpl) => {
    const nextStatus = tmpl.wa_status === 'APPROVED' ? 'DRAFT' : 'APPROVED';
    try {
      await marketingHttp.patch(`/templates/${tmpl._id}/status`, { wa_status: nextStatus });
      await loadTemplates();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to update status') });
    }
  };

  const handleDelete = async (tmpl) => {
    if (!window.confirm(`Delete WhatsApp template "${tmpl.name}"?`)) return;
    try {
      await marketingHttp.delete(`/templates/${tmpl._id}`);
      setBanner({ type: 'success', text: 'WhatsApp template deleted.' });
      await loadTemplates();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to delete template') });
    }
  };

  const handleTestTemplate = async (tmpl) => {
    const phone = testTargetPhone.trim() || window.prompt('Enter 10+ digit WhatsApp number for live test dispatch:');
    if (!phone) return;
    setTestTargetPhone(phone);
    setTestingId(tmpl._id);
    setBanner({ type: 'info', text: `Sending test WhatsApp message using "${tmpl.wa_template_name}" to ${phone}...` });
    try {
      const res = await marketingHttp.post(`/templates/${tmpl._id}/test`, { test_target: phone });
      const data = res.data || {};
      if (data.success) {
        setBanner({ type: 'success', text: `WhatsApp test sent to ${phone} (MessageId: ${data.messageId})` });
      } else {
        setBanner({ type: 'error', text: `WhatsApp Test FAILED [${data.errorCode || 'META_ERROR'}]: ${data.error}` });
      }
      await loadTemplates();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'WhatsApp template test failed') });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaWhatsapp className="w-3.5 h-3.5" />
            <span>Meta Cloud Message Templates</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">WhatsApp Message Templates</h1>
          <p className="text-sm text-slate-500">Create, edit, approve internally, and test live WhatsApp templates stored in MongoDB.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
        >
          <FaPlus /> Design New Meta Template
        </button>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${
            banner.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : banner.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {banner.type === 'error' ? <FaExclamationTriangle className="shrink-0" /> : <FaCheckCircle className="shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-slate-400 py-10 text-center">Loading WhatsApp templates from MongoDB...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
          <div className="text-sm font-bold text-slate-600 dark:text-slate-300">No WhatsApp templates saved yet</div>
          <p className="text-xs text-slate-500">Design a Meta template matching your Meta Business Manager approved template name & variables.</p>
          <button onClick={openCreateModal} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">
            + Create First WhatsApp Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Templates ({templates.length})</div>
              <input
                type="text"
                placeholder="Test phone (e.g. +919876543210)"
                value={testTargetPhone}
                onChange={(e) => setTestTargetPhone(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-56"
              />
            </div>

            <div className="space-y-3">
              {templates.map((t, idx) => (
                <div
                  key={t._id}
                  onClick={() => setSelectedIdx(idx)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                    selectedIdx === idx
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{t.wa_template_name || t.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleStatusToggle(t); }}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                        t.wa_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <FaCheckCircle className="w-2.5 h-2.5" /> {t.wa_status || 'DRAFT'}
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{t.body_text}</p>
                  {t.last_error && <p className="text-[11px] text-rose-600 mb-2">Last Test Error: {t.last_error}</p>}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={testingId === t._id}
                      onClick={() => handleTestTemplate(t)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <FaPaperPlane className="w-3 h-3" /> {testingId === t._id ? '...' : 'Test'}
                    </button>
                    <button type="button" onClick={() => openEditModal(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"><FaEdit /></button>
                    <button type="button" onClick={() => handleDelete(t)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {curr && (
            <div className="lg:col-span-5">
              <div className="sticky top-6 space-y-3">
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-2">Preview Mode:</span>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl">
                    <button type="button" onClick={() => setPreviewDevice('mobile')} className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${previewDevice === 'mobile' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
                      <FaMobileAlt /> Mobile
                    </button>
                    <button type="button" onClick={() => setPreviewDevice('desktop')} className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${previewDevice === 'desktop' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
                      <FaDesktop /> Desktop
                    </button>
                  </div>
                </div>

                <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'w-[320px]' : 'w-full'}`}>
                  <div className={`border-4 border-slate-800 bg-slate-900 p-3 shadow-2xl ${previewDevice === 'mobile' ? 'rounded-[42px]' : 'rounded-2xl'}`}>
                    {previewDevice === 'mobile' && <div className="w-28 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2"></div>}
                    <div className="bg-[#075E54] text-white p-3 rounded-2xl flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">SK</div>
                      <div>
                        <div className="text-xs font-bold leading-tight">SolarKits B2B Official</div>
                        <div className="text-[10px] text-emerald-200">WhatsApp Business Account</div>
                      </div>
                    </div>

                    <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-2xl p-3 min-h-[360px] flex flex-col justify-end text-xs">
                      <div className="bg-[#DCF8C6] dark:bg-[#005c4b] rounded-2xl p-3 shadow-md space-y-2">
                        {curr.header_type === 'IMAGE' && curr.header_media_url && (
                          <div className="rounded-xl overflow-hidden h-28 bg-slate-200">
                            <img src={curr.header_media_url} alt="Header" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="text-[11px] whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-100">
                          {(curr.body_text || '')
                            .replace(/\{\{\s*(1|name)\s*\}\}/gi, 'Aarav Patel')
                            .replace(/\{\{\s*(2|kit_name)\s*\}\}/gi, '3 kW Commercial Kit')
                            .replace(/\{\{\s*(3|campaign_price|price)\s*\}\}/gi, '₹1,35,000')}
                        </div>
                        {curr.footer_text && <div className="text-[9px] text-slate-500 border-t border-black/10 pt-1">{curr.footer_text}</div>}
                        {curr.buttons?.length > 0 && (
                          <div className="pt-1 space-y-1.5 border-t border-black/10">
                            {curr.buttons.map((b, i) => (
                              <div key={i} className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 font-bold text-[11px] text-center">
                                {b.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-center text-[10px] text-slate-400 mt-2 font-mono truncate">
                      Meta Template: {curr.wa_template_name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showBuilderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FaWhatsapp className="text-emerald-600" /> {editingId ? 'Edit WhatsApp Template' : 'WhatsApp Template Studio'}
                </h3>
                <p className="text-xs text-slate-500">Ensure the Meta template name matches your approved WhatsApp Manager template.</p>
              </div>
              <button type="button" onClick={() => setShowBuilderModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer">
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Display Name *</label>
                <input type="text" value={modalFormData.templateDisplayName} onChange={(e) => setModalFormData({ ...modalFormData, templateDisplayName: e.target.value })} placeholder="e.g. Q4 5kW Solar Promo" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Meta Template Name (snake_case) *</label>
                <input type="text" value={modalFormData.waTemplateName} onChange={(e) => setModalFormData({ ...modalFormData, waTemplateName: e.target.value })} placeholder="e.g. solarkits_5kw_promo" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                <select value={modalFormData.category} onChange={(e) => setModalFormData({ ...modalFormData, category: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold">
                  <option value="MARKETING">MARKETING</option>
                  <option value="UTILITY">UTILITY</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                <select value={modalFormData.waStatus} onChange={(e) => setModalFormData({ ...modalFormData, waStatus: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold">
                  <option value="APPROVED">APPROVED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
            </div>

            <WhatsAppStudio formData={modalFormData} setFormData={setModalFormData} selectedKitObjects={[]} />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setShowBuilderModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={handleSaveTemplate} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Update WhatsApp Template' : 'Save WhatsApp Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
