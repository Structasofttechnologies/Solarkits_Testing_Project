import React, { useCallback, useEffect, useState } from 'react';
import {
  FaCog,
  FaTags,
  FaSlidersH,
  FaDatabase,
  FaShieldAlt,
  FaHistory,
  FaPlus,
  FaTrash,
  FaSave,
  FaLock
} from 'react-icons/fa';
import {
  leadMarketingHttp,
  extractError,
  SEGMENT_LABELS
} from '../services/leadMarketingApi';

const PERMISSION_KEYS = [
  { key: 'view_overview', label: 'View Overview' },
  { key: 'manage_leads', label: 'Manage Leads' },
  { key: 'import_leads', label: 'Import Excel/CSV' },
  { key: 'export_reports', label: 'Export Reports' },
  { key: 'manage_subgroups', label: 'Manage Sub-groups' },
  { key: 'create_campaigns', label: 'Create Campaigns' },
  { key: 'launch_campaigns', label: 'Launch Campaigns' },
  { key: 'view_analytics', label: 'View Analytics' },
  { key: 'manage_bde_followup', label: 'BDE Follow-ups' },
  { key: 'view_commercial_orders', label: 'Commercial Orders' },
  { key: 'view_franchisee_pipeline', label: 'Franchisee Pipeline' },
  { key: 'manage_settings', label: 'Manage Settings' }
];

export default function LeadMarketingSettingsPage() {
  const [activeTab, setActiveTab] = useState('subgroups'); // 'subgroups' | 'statuses' | 'custom_fields' | 'controls' | 'rbac' | 'audit'
  const [meta, setMeta] = useState({
    primary_segments: [],
    subgroups: [],
    custom_fields: [],
    settings: {
      lead_statuses: [],
      lead_sources: [],
      campaign_categories: [],
      attribution_config: {},
      email_sending_controls: {},
      data_retention_policy: {},
      rbac_permissions: []
    }
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  // Forms
  const [newSubgroup, setNewSubgroup] = useState({
    primary_segment_key: 'franchisee_leads',
    name: '',
    color: '#4F46E5',
    description: ''
  });
  const [newCustomField, setNewCustomField] = useState({
    label: '',
    field_type: 'text',
    optionsText: '',
    applicable_segments: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'],
    is_required: false
  });
  const [newStatus, setNewStatus] = useState({ name: '', category: 'engaged', color: '#0D9488' });
  const [newSource, setNewSource] = useState({ label: '' });
  const [newCategory, setNewCategory] = useState({ primary_segment_key: 'all', name: '', description: '' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [metaRes, auditRes] = await Promise.all([
        leadMarketingHttp.get('/meta'),
        leadMarketingHttp.get('/audit-logs')
      ]);
      if (metaRes.data?.success && metaRes.data?.data) setMeta(metaRes.data.data);
      if (auditRes.data?.success) setAuditLogs(auditRes.data.data || []);
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed loading settings') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddSubgroup = async (e) => {
    e.preventDefault();
    if (!newSubgroup.name.trim()) return;
    setSaving(true);
    setBanner(null);
    try {
      await leadMarketingHttp.post('/subgroups', newSubgroup);
      setNewSubgroup((s) => ({ ...s, name: '', description: '' }));
      setBanner({ type: 'success', text: 'Sub-group created cleanly.' });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed creating sub-group') });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubgroup = async (id) => {
    try {
      await leadMarketingHttp.delete(`/subgroups/${id}`);
      setBanner({ type: 'success', text: 'Sub-group archived cleanly.' });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed removing sub-group') });
    }
  };

  const handleCreateCustomField = async (e) => {
    e.preventDefault();
    if (!newCustomField.label.trim()) return;
    setSaving(true);
    try {
      await leadMarketingHttp.post('/custom-fields', {
        label: newCustomField.label.trim(),
        field_type: newCustomField.field_type,
        options: newCustomField.optionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        applicable_segments: newCustomField.applicable_segments,
        is_required: newCustomField.is_required
      });
      setNewCustomField({
        label: '',
        field_type: 'text',
        optionsText: '',
        applicable_segments: ['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'],
        is_required: false
      });
      setBanner({ type: 'success', text: 'Custom field saved & active on Central Database and Dynamic Upload.' });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed adding custom field') });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomField = async (id) => {
    try {
      await leadMarketingHttp.delete(`/custom-fields/${id}`);
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err) });
    }
  };

  const handlePersistSettings = async (overrideSettings = null, successMsg = 'Marketing settings saved cleanly.') => {
    setSaving(true);
    setBanner(null);
    try {
      const payload = overrideSettings || meta.settings;
      const res = await leadMarketingHttp.put('/settings', payload);
      if (res.data?.success) {
        setMeta((m) => ({ ...m, settings: res.data.data }));
        setBanner({ type: 'success', text: successMsg });
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed saving settings') });
    } finally {
      setSaving(false);
    }
  };

  const addStatusItem = () => {
    if (!newStatus.name.trim()) return;
    const updated = {
      ...meta.settings,
      lead_statuses: [
        ...(meta.settings.lead_statuses || []),
        { name: newStatus.name.trim(), category: newStatus.category, color: newStatus.color, is_system: false, sort_order: 99 }
      ]
    };
    setNewStatus({ name: '', category: 'engaged', color: '#0D9488' });
    handlePersistSettings(updated, 'Added custom Lead Status.');
  };

  const addSourceItem = () => {
    if (!newSource.label.trim()) return;
    const key = newSource.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const updated = {
      ...meta.settings,
      lead_sources: [...(meta.settings.lead_sources || []), { key, label: newSource.label.trim(), is_active: true }]
    };
    setNewSource({ label: '' });
    handlePersistSettings(updated, 'Added Lead Source option.');
  };

  const addCategoryItem = () => {
    if (!newCategory.name.trim()) return;
    const updated = {
      ...meta.settings,
      campaign_categories: [...(meta.settings.campaign_categories || []), { ...newCategory, name: newCategory.name.trim() }]
    };
    setNewCategory({ primary_segment_key: 'all', name: '', description: '' });
    handlePersistSettings(updated, 'Added Campaign Category.');
  };

  const toggleRbacPermission = (roleIdx, permKey) => {
    setMeta((prev) => {
      const nextRbac = [...(prev.settings.rbac_permissions || [])];
      const role = { ...nextRbac[roleIdx] };
      role.permissions = { ...role.permissions, [permKey]: !role.permissions?.[permKey] };
      nextRbac[roleIdx] = role;
      return { ...prev, settings: { ...prev.settings, rbac_permissions: nextRbac } };
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <FaCog className="text-teal-600" />
          <span>14 · Lead Marketing Settings, Sub-Groups &amp; RBAC</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure sub-groups inside the 3 locked Primary Segments, lead statuses, custom fields, first/last-touch attribution rules, RBAC permissions &amp; audit logs.
        </p>
      </div>

      {banner && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold border ${
            banner.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
        {[
          { id: 'subgroups', icon: FaTags, label: 'Segments & Sub-Groups' },
          { id: 'statuses', icon: FaSlidersH, label: 'Statuses, Sources & Categories' },
          { id: 'custom_fields', icon: FaDatabase, label: 'Custom Fields Builder' },
          { id: 'controls', icon: FaCog, label: 'Attribution, Email & Retention' },
          { id: 'rbac', icon: FaShieldAlt, label: 'RBAC Permissions' },
          { id: 'audit', icon: FaHistory, label: 'Audit Logs' }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl cursor-pointer transition ${
                activeTab === tab.id ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon /> {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
          Loading configuration from MongoDB...
        </div>
      ) : (
        <>
          {activeTab === 'subgroups' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 text-xs">
              <div className="xl:col-span-4 space-y-4">
                {/* Locked Primary Segments Card */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="font-black text-sm flex items-center gap-1.5">
                    <FaLock className="text-amber-500" /> 3 Locked Primary Segments
                  </div>
                  {(meta.primary_segments || []).map((ps) => (
                    <div key={ps.key} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white">{ps.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{ps.description}</div>
                      <div className="text-[10px] font-bold text-emerald-600 mt-1">Conversion Goal: {ps.conversion_event_label}</div>
                    </div>
                  ))}
                </div>

                {/* Add Sub-Group Form */}
                <form onSubmit={handleAddSubgroup} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="font-black text-sm">Create Unlimited Sub-Group Tag</div>
                  <select
                    value={newSubgroup.primary_segment_key}
                    onChange={(e) => setNewSubgroup((s) => ({ ...s, primary_segment_key: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
                  >
                    <option value="franchisee_leads">Franchisee Leads</option>
                    <option value="epc_signup_leads">EPC Signup Leads</option>
                    <option value="epc_sales_leads">EPC Sales Leads</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Sub-group Name (e.g. Solar Park High-Capacity)"
                    value={newSubgroup.name}
                    onChange={(e) => setNewSubgroup((s) => ({ ...s, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <label className="font-bold">Badge Color:</label>
                    <input
                      type="color"
                      value={newSubgroup.color}
                      onChange={(e) => setNewSubgroup((s) => ({ ...s, color: e.target.value }))}
                      className="h-8 w-14 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={newSubgroup.description}
                    onChange={(e) => setNewSubgroup((s) => ({ ...s, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                  >
                    <FaPlus /> Add Sub-Group
                  </button>
                </form>
              </div>

              <div className="xl:col-span-8 space-y-4">
                {['franchisee_leads', 'epc_signup_leads', 'epc_sales_leads'].map((segKey) => {
                  const list = (meta.subgroups || []).filter((sg) => sg.primary_segment_key === segKey);
                  return (
                    <div key={segKey} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="font-black text-sm mb-3">
                        {SEGMENT_LABELS[segKey]} — Active Sub-Groups ({list.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {list.map((sg) => (
                          <div
                            key={sg._id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sg.color || '#4F46E5' }} />
                            <span className="font-bold">{sg.name}</span>
                            {!sg.is_starter && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSubgroup(sg._id)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="Archive Sub-group"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'statuses' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
              {/* Lead Statuses */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-black text-sm">Lead Status Master ({(meta.settings.lead_statuses || []).length})</div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {(meta.settings.lead_statuses || []).map((st) => (
                    <div key={st.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color || '#64748B' }} />
                        <span className="font-bold">{st.name}</span>
                      </div>
                      <span className="text-[10px] uppercase text-slate-400">{st.category}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <input
                    type="text"
                    placeholder="New Lead Status"
                    value={newStatus.name}
                    onChange={(e) => setNewStatus((s) => ({ ...s, name: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newStatus.category}
                      onChange={(e) => setNewStatus((s) => ({ ...s, category: e.target.value }))}
                      className="flex-1 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="open">Open</option>
                      <option value="engaged">Engaged</option>
                      <option value="converted">Converted</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      type="button"
                      onClick={addStatusItem}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Lead Sources */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-black text-sm">Lead Sources Master ({(meta.settings.lead_sources || []).length})</div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {(meta.settings.lead_sources || []).map((src) => (
                    <div key={src.key} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <span className="font-bold">{src.label}</span>
                      <span className="font-mono text-[10px] text-slate-400">{src.key}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                  <input
                    type="text"
                    placeholder="New Lead Source (e.g. Trade Fair)"
                    value={newSource.label}
                    onChange={(e) => setNewSource({ label: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={addSourceItem}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Campaign Categories */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-black text-sm">Campaign Categories ({(meta.settings.campaign_categories || []).length})</div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {(meta.settings.campaign_categories || []).map((cat, idx) => (
                    <div key={`${cat.name}-${idx}`} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <div className="font-bold">{cat.name}</div>
                      <div className="text-[10px] text-slate-400">{SEGMENT_LABELS[cat.primary_segment_key] || cat.primary_segment_key}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <input
                    type="text"
                    placeholder="New Category Name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory((c) => ({ ...c, name: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={addCategoryItem}
                    className="w-full py-1.5 rounded-xl bg-teal-600 text-white font-bold cursor-pointer"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'custom_fields' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 text-xs">
              <form
                onSubmit={handleCreateCustomField}
                className="xl:col-span-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="font-black text-sm">Add Custom Lead Field</div>
                <input
                  type="text"
                  required
                  placeholder="Field Label (e.g. Monthly Installation Capacity kW)"
                  value={newCustomField.label}
                  onChange={(e) => setNewCustomField((f) => ({ ...f, label: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
                <select
                  value={newCustomField.field_type}
                  onChange={(e) => setNewCustomField((f) => ({ ...f, field_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="date">Date</option>
                  <option value="boolean">Yes / No</option>
                </select>
                {newCustomField.field_type === 'dropdown' && (
                  <input
                    type="text"
                    placeholder="Comma-separated options (e.g. <50kW, 50-500kW, >500kW)"
                    value={newCustomField.optionsText}
                    onChange={(e) => setNewCustomField((f) => ({ ...f, optionsText: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                >
                  <FaPlus className="inline mr-1" /> Create Custom Field
                </button>
              </form>

              <div className="xl:col-span-8 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="font-black text-sm mb-3">Active Custom Lead Schema Fields ({(meta.custom_fields || []).length})</div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(meta.custom_fields || []).map((cf) => (
                    <div key={cf._id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold">{cf.label} <span className="font-mono text-[10px] text-slate-400">({cf.field_key})</span></div>
                        <div className="text-[11px] text-slate-500">Type: {cf.field_type} {cf.options?.length ? `• Options: ${cf.options.join(', ')}` : ''}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomField(cf._id)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer p-1.5"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                  {(meta.custom_fields || []).length === 0 && (
                    <div className="py-8 text-center text-slate-400">No custom fields defined yet. Add one on the left to extend lead forms and Excel import mapping.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-5 text-xs">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="space-y-3">
                  <div className="font-black text-sm">Conversion Attribution Model</div>
                  <div>
                    <label className="block font-bold mb-1">Default Attribution Model</label>
                    <select
                      value={meta.settings.attribution_config?.default_model || 'last_touch'}
                      onChange={(e) =>
                        setMeta((m) => ({
                          ...m,
                          settings: {
                            ...m.settings,
                            attribution_config: { ...m.settings.attribution_config, default_model: e.target.value }
                          }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="last_touch">Last-Touch (Recommended)</option>
                      <option value="first_touch">First-Touch</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Attribution Window (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={meta.settings.attribution_config?.attribution_window_days ?? 30}
                      onChange={(e) =>
                        setMeta((m) => ({
                          ...m,
                          settings: {
                            ...m.settings,
                            attribution_config: { ...m.settings.attribution_config, attribution_window_days: Number(e.target.value) }
                          }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-black text-sm">Email Sending &amp; Suppression Controls</div>
                  <div>
                    <label className="block font-bold mb-1">Daily Campaign Email Cap</label>
                    <input
                      type="number"
                      value={meta.settings.email_sending_controls?.daily_limit ?? 10000}
                      onChange={(e) =>
                        setMeta((m) => ({
                          ...m,
                          settings: {
                            ...m.settings,
                            email_sending_controls: { ...m.settings.email_sending_controls, daily_limit: Number(e.target.value) }
                          }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Rate Limit (Emails / Minute)</label>
                    <input
                      type="number"
                      value={meta.settings.email_sending_controls?.rate_per_minute ?? 60}
                      onChange={(e) =>
                        setMeta((m) => ({
                          ...m,
                          settings: {
                            ...m.settings,
                            email_sending_controls: { ...m.settings.email_sending_controls, rate_per_minute: Number(e.target.value) }
                          }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-1 font-semibold">
                    <input
                      type="checkbox"
                      checked={meta.settings.email_sending_controls?.enforce_suppression_check !== false}
                      onChange={(e) =>
                        setMeta((m) => ({
                          ...m,
                          settings: {
                            ...m.settings,
                            email_sending_controls: { ...m.settings.email_sending_controls, enforce_suppression_check: e.target.checked }
                          }
                        }))
                      }
                    />
                    Enforce Mandatory Unsubscribe Suppression Check
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="font-black text-sm">Data Retention &amp; Inactivity Policy</div>
                  <div>
                    <label className="block font-bold mb-1">Audit Log Retention (Days)</label>
                    <input
                      type="number"
                      value={meta.settings.data_retention_policy?.audit_log_retention_days ?? 365}
                      onChange={(e) =>
                        setMeta((m) => ({
                          ...m,
                          settings: {
                            ...m.settings,
                            data_retention_policy: { ...m.settings.data_retention_policy, audit_log_retention_days: Number(e.target.value) }
                          }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Inactive Lead Threshold (Days)</label>
                    <input
                      type="number"
                      value={meta.settings.data_retention_policy?.inactive_lead_threshold_days ?? 90}
                      onChange={(e) =>
                        setMeta((m) => ({
                          ...m,
                          settings: {
                            ...m.settings,
                            data_retention_policy: { ...m.settings.data_retention_policy, inactive_lead_threshold_days: Number(e.target.value) }
                          }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handlePersistSettings()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                >
                  <FaSave /> {saving ? 'Saving...' : 'Save Global Controls'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'rbac' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="font-black text-sm">6-Role Lead Marketing Permission Matrix</div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handlePersistSettings(null, 'Saved RBAC permission matrix.')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                >
                  <FaSave /> Save RBAC Matrix
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Role</th>
                      {PERMISSION_KEYS.map((pk) => (
                        <th key={pk.key} className="px-2.5 py-3 text-center">{pk.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {(meta.settings.rbac_permissions || []).map((role, rIdx) => (
                      <tr key={role.role_key}>
                        <td className="px-4 py-2.5 font-bold whitespace-nowrap">{role.role_label}</td>
                        {PERMISSION_KEYS.map((pk) => (
                          <td key={pk.key} className="px-2.5 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(role.permissions?.[pk.key])}
                              onChange={() => toggleRbacPermission(rIdx, pk.key)}
                              className="cursor-pointer accent-teal-600"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-black text-sm">
                System Security &amp; Activity Audit Logs (Latest {auditLogs.length})
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Actor</th>
                      <th className="px-4 py-2.5">Action</th>
                      <th className="px-4 py-2.5">Collection</th>
                      <th className="px-4 py-2.5">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                          {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : ''}
                        </td>
                        <td className="px-4 py-2.5 font-bold">{log.actor_name || 'Admin'}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-teal-600 font-bold">{log.action}</td>
                        <td className="px-4 py-2.5 text-slate-500">{log.entity_type}</td>
                        <td className="px-4 py-2.5">{log.summary}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No audit entries logged yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
