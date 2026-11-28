import React, { useState, useEffect } from 'react';
import {
  FaFileAlt, FaPlus, FaSearch, FaEye, FaEdit, FaTrash,
  FaTag, FaMobileAlt, FaDesktop, FaTimes, FaPaperPlane, FaExclamationTriangle, FaCheckCircle
} from 'react-icons/fa';
import EmailStudio from './components/EmailStudio';
import { DEFAULT_EXECUTIVE_CREATIVE, generateResponsiveEmailHtml } from './services/emailTemplateGenerator';
import { marketingHttp, extractApiError } from './services/marketingApi';

const DEFAULT_MODAL_DATA = {
  templateName: '',
  emailSubject: 'SolarKits: Complete Solar Systems, Ready to Dispatch!',
  emailPreviewText: DEFAULT_EXECUTIVE_CREATIVE.subheading,
  ctaText: DEFAULT_EXECUTIVE_CREATIVE.primaryCtaText,
  destinationUrl: DEFAULT_EXECUTIVE_CREATIVE.destinationUrl,
  hasCoupon: false,
  couponCode: '',
  discountType: 'per_kit',
  discountValue: 0,
  minOrderQty: 1,
  includeKitDetailsInCreative: true,
  customCreative: {
    ...DEFAULT_EXECUTIVE_CREATIVE
  }
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [modalFormData, setModalFormData] = useState(DEFAULT_MODAL_DATA);

  const [testTargetEmail, setTestTargetEmail] = useState('');
  const [testingId, setTestingId] = useState(null);
  const [banner, setBanner] = useState(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await marketingHttp.get('/templates?channel=email');
      if (res.data?.success) {
        setTemplates(res.data.data || []);
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to fetch email templates') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filtered = templates.filter(
    (t) =>
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingId(null);
    setModalFormData(DEFAULT_MODAL_DATA);
    setShowBuilderModal(true);
  };

  const openEditModal = (tmpl) => {
    setEditingId(tmpl._id);
    const savedBlocks = tmpl.blocks_json || {};
    setModalFormData({
      ...DEFAULT_MODAL_DATA,
      ...savedBlocks,
      templateName: tmpl.name || '',
      emailSubject: tmpl.subject || '',
      emailPreviewText: tmpl.preview_text || ''
    });
    setShowBuilderModal(true);
  };

  const handleSaveTemplate = async () => {
    const cr = modalFormData.customCreative || {};
    const name = modalFormData.templateName?.trim() || cr.headline?.trim() || modalFormData.emailSubject?.trim() || 'Untitled Email Template';
    const subject = modalFormData.emailSubject?.trim() || name;
    const html_content = generateResponsiveEmailHtml({
      ...modalFormData,
      emailSubject: subject
    });

    setSaving(true);
    setBanner(null);
    try {
      const payload = {
        name,
        channel: 'email',
        type: 'marketing',
        tags: modalFormData.hasCoupon ? ['Coupon', 'Promotional'] : ['Promotional'],
        subject,
        preview_text: modalFormData.emailPreviewText || '',
        html_content,
        banner_url: cr.heroImageUrl || '',
        blocks_json: modalFormData,
        dynamic_variables: ['{{name}}', '{{company_name}}', '{{kit_name}}', '{{campaign_price}}', '{{coupon_code}}', '{{tracking_url}}', '{{unsubscribe_url}}']
      };

      if (editingId) {
        await marketingHttp.put(`/templates/${editingId}`, payload);
        setBanner({ type: 'success', text: `Template "${name}" updated in MongoDB.` });
      } else {
        await marketingHttp.post('/templates', payload);
        setBanner({ type: 'success', text: `Template "${name}" saved to MongoDB.` });
      }
      setShowBuilderModal(false);
      setEditingId(null);
      await loadTemplates();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to save template') });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (tmpl) => {
    if (!window.confirm(`Delete email template "${tmpl.name}"?`)) return;
    try {
      await marketingHttp.delete(`/templates/${tmpl._id}`);
      setBanner({ type: 'success', text: `Deleted template "${tmpl.name}".` });
      await loadTemplates();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to delete template') });
    }
  };

  const handleTestTemplate = async (tmpl) => {
    const target = testTargetEmail.trim() || window.prompt('Enter recipient email to test this template:');
    if (!target) return;
    setTestTargetEmail(target);
    setTestingId(tmpl._id);
    setBanner({ type: 'info', text: `Dispatching live test of "${tmpl.name}" to ${target}...` });
    try {
      const res = await marketingHttp.post(`/templates/${tmpl._id}/test`, { test_target: target });
      const data = res.data || {};
      if (data.success) {
        setBanner({ type: 'success', text: `Test email sent to ${target} via ${data.provider?.toUpperCase()} (MessageId: ${data.messageId})` });
      } else {
        setBanner({ type: 'error', text: `Template test failed (${data.errorCode || 'ERROR'}): ${data.error}` });
      }
      await loadTemplates();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Template test failed') });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaFileAlt className="w-3.5 h-3.5" />
            <span>Email Creative Studio</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Email Templates</h1>
          <p className="text-sm text-slate-500">Design, persist, preview, and test live responsive HTML templates in MongoDB.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
        >
          <FaPlus /> Design New Email Template
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

      {/* Dynamic Token Quick Reference */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-500 uppercase mr-2 flex items-center gap-1">
          <FaTag className="w-3 h-3 text-indigo-500" /> Supported Dynamic Tags:
        </span>
        {['{{name}}', '{{company_name}}', '{{kit_name}}', '{{campaign_price}}', '{{coupon_code}}', '{{warehouse_name}}', '{{tracking_url}}', '{{unsubscribe_url}}'].map((tag) => (
          <code key={tag} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-mono text-indigo-600 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-600">
            {tag}
          </code>
        ))}
      </div>

      {/* Search & Test Target Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <FaSearch className="text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search template title or subject line..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-hidden text-sm"
          />
        </div>
        <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center">
          <input
            type="email"
            placeholder="Default test email (for quick Test Send)"
            value={testTargetEmail}
            onChange={(e) => setTestTargetEmail(e.target.value)}
            className="w-full px-2 bg-transparent border-none outline-hidden text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-10 text-center">Loading templates from MongoDB...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
          <div className="text-sm font-bold text-slate-600 dark:text-slate-300">No email templates found in MongoDB</div>
          <p className="text-xs text-slate-500">Create your first reusable promotional or transactional template using Email Studio.</p>
          <button onClick={openCreateModal} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer">
            + Create First Email Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => (
            <div key={t._id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {t.type || 'marketing'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {t.updated_at ? new Date(t.updated_at).toLocaleDateString('en-IN') : ''}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">{t.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">Subject: <em>"{t.subject}"</em></p>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-center mb-4">
                  <div>
                    <div className="text-[10px] text-slate-400">Dispatched</div>
                    <div className="text-sm font-bold text-emerald-600">{t.sent_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Clicks</div>
                    <div className="text-sm font-bold text-indigo-600">{t.click_count || 0}</div>
                  </div>
                </div>
                {t.last_error && (
                  <p className="text-[11px] text-rose-600 mb-2">Last Test Error: {t.last_error}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 gap-2">
                <button
                  onClick={() => { setSelectedTemplate(t); setShowModal(true); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FaEye className="text-blue-600" /> Preview
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTestTemplate(t)}
                    disabled={testingId === t._id}
                    title="Send Test Email"
                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <FaPaperPlane className="w-3 h-3" /> {testingId === t._id ? '...' : 'Test'}
                  </button>
                  <button onClick={() => openEditModal(t)} title="Edit" className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"><FaEdit /></button>
                  <button onClick={() => handleDeleteTemplate(t)} title="Delete" className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"><FaTrash /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HTML Preview Modal */}
      {showModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedTemplate.name}</h3>
                <p className="text-xs text-slate-500">Live preview with sample dynamic tokens interpolated</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  <button type="button" onClick={() => setPreviewDevice('desktop')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${previewDevice === 'desktop' ? 'bg-white dark:bg-slate-800 text-blue-600' : 'text-slate-500'}`}>
                    <FaDesktop /> Desktop
                  </button>
                  <button type="button" onClick={() => setPreviewDevice('mobile')} className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${previewDevice === 'mobile' ? 'bg-white dark:bg-slate-800 text-blue-600' : 'text-slate-500'}`}>
                    <FaMobileAlt /> Mobile
                  </button>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 font-bold cursor-pointer">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-center">
              <div className={`transition-all ${previewDevice === 'mobile' ? 'w-[320px] border-4 border-slate-700 rounded-2xl p-2 bg-white' : 'w-full'}`}>
                <div dangerouslySetInnerHTML={{
                  __html: (selectedTemplate.html_content || '<p>No HTML content</p>')
                    .replace(/\{\{\s*name\s*\}\}/gi, 'Aarav Patel (Sample EPC)')
                    .replace(/\{\{\s*company_name\s*\}\}/gi, 'SunVolt Solar Solutions')
                    .replace(/\{\{\s*kit_name\s*\}\}/gi, '3 kW Commercial Solar Kit')
                    .replace(/\{\{\s*(campaign_price|price)\s*\}\}/gi, '₹1,35,000')
                    .replace(/\{\{\s*tracking_url\s*\}\}/gi, 'https://solarkits.in/solar-kits')
                    .replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, '#unsubscribe')
                }} />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EmailStudio Builder Modal */}
      {showBuilderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FaFileAlt className="text-blue-600" /> {editingId ? 'Edit Email Template' : 'Email Template Studio & Visual Builder'}
                </h3>
                <p className="text-xs text-slate-500">Design and save template straight into `marketing_templates`.</p>
              </div>
              <button type="button" onClick={() => setShowBuilderModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer">
                <FaTimes />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Internal Template Name *</label>
              <input
                type="text"
                placeholder="e.g. Q4 5kW Commercial Kit Announcement"
                value={modalFormData.templateName}
                onChange={(e) => setModalFormData({ ...modalFormData, templateName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
              />
            </div>

            <EmailStudio formData={modalFormData} setFormData={setModalFormData} selectedKitObjects={[]} />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setShowBuilderModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveTemplate}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Email Template' : 'Save Email Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
