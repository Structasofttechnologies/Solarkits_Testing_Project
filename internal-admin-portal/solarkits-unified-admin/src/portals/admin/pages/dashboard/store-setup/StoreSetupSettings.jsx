import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  Save,
  Plus,
  Trash2,
  Check,
  RotateCw,
  CheckCircle2,
  FileCheck,
  Clock,
  X,
  Search,
  Filter,
  FileText,
  AlertCircle,
  RefreshCw,
  Edit3,
  CheckSquare,
  Square,
  Shield,
  Camera,
  Layers,
  ArrowUpDown,
  Sparkles,
  Info
} from 'lucide-react';
import { storeSetupApi } from '../../../api/storeSetupApi';

export default function StoreSetupSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterMandatory, setFilterMandatory] = useState('all'); // all | mandatory | optional

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState({
    activity_code: '',
    title: '',
    description: '',
    category: 'Location and Documentation',
    is_mandatory: true,
    proof_required: true,
    proof_type: 'image_or_pdf',
    display_order: 1,
    is_active: true,
  });

  const defaultCategories = useMemo(() => [
    'Location and Documentation',
    'Store Infrastructure',
    'Solarkits Branding',
    'Product Display',
    'Software Setup',
    'Final Verification',
  ], []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await storeSetupApi.getSettings();
      if (res?.status === 'success') {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
      setFeedback({ type: 'error', message: 'Failed to load document settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const activities = settings?.master_checklist_activities || [];

  // Distinct categories from existing activities + defaults
  const allCategories = useMemo(() => {
    const set = new Set([...defaultCategories, ...(settings?.checklist_categories || [])]);
    activities.forEach(a => { if (a.category) set.add(a.category); });
    return Array.from(set);
  }, [activities, defaultCategories, settings?.checklist_categories]);

  // Filtered list
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchSearch =
        !searchTerm.trim() ||
        act.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.activity_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.category?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        selectedCategory === 'All' || act.category === selectedCategory;

      const matchMandatory =
        filterMandatory === 'all' ||
        (filterMandatory === 'mandatory' && act.is_mandatory) ||
        (filterMandatory === 'optional' && !act.is_mandatory);

      return matchSearch && matchCategory && matchMandatory;
    });
  }, [activities, searchTerm, selectedCategory, filterMandatory]);

  // Summary Metrics
  const totalCount = activities.length;
  const mandatoryCount = activities.filter((a) => a.is_mandatory).length;
  const optionalCount = activities.filter((a) => !a.is_mandatory).length;
  const proofCount = activities.filter((a) => a.proof_required).length;

  const handleSaveSettings = async (e, autoSync = false) => {
    if (e) e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const payload = {
        ...settings,
        auto_sync_active_setups: autoSync,
      };
      const res = await storeSetupApi.updateSettings(payload);
      if (res?.status === 'success') {
        setSettings(res.data);
        setFeedback({
          type: 'success',
          message: res.message || 'Store Setup document rules saved successfully!',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save document settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToActiveStores = async () => {
    if (!window.confirm('Sync latest master document rules to all active and in-progress store setups? Existing uploaded proofs and progress will be preserved.')) {
      return;
    }
    setSyncing(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await storeSetupApi.syncActiveSetups();
      if (res?.status === 'success') {
        setFeedback({
          type: 'success',
          message: res.message || 'Synced successfully across all active store setups!',
        });
        fetchSettings();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to sync with active stores.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleMandatory = (index) => {
    const list = [...activities];
    list[index].is_mandatory = !list[index].is_mandatory;
    setSettings({ ...settings, master_checklist_activities: list });
  };

  const handleToggleProof = (index) => {
    const list = [...activities];
    list[index].proof_required = !list[index].proof_required;
    setSettings({ ...settings, master_checklist_activities: list });
  };

  const handleToggleActive = (index) => {
    const list = [...activities];
    list[index].is_active = list[index].is_active === false ? true : false;
    setSettings({ ...settings, master_checklist_activities: list });
  };

  const handleDeleteActivity = (index) => {
    const item = activities[index];
    if (!window.confirm(`Remove "${item.title}" from master document rules?`)) return;
    const list = [...activities];
    list.splice(index, 1);
    setSettings({ ...settings, master_checklist_activities: list });
  };

  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormData({
      activity_code: `ACT_DOC_${String(activities.length + 1).padStart(2, '0')}`,
      title: '',
      description: '',
      category: 'Location and Documentation',
      is_mandatory: true,
      proof_required: true,
      proof_type: 'image_or_pdf',
      display_order: activities.length + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (index) => {
    setEditingIndex(index);
    const item = activities[index];
    const isCustom = !defaultCategories.includes(item.category);
    setIsCustomCategory(isCustom);
    setCustomCategoryInput(isCustom ? item.category : '');
    setFormData({
      activity_code: item.activity_code || `ACT_DOC_${index + 1}`,
      title: item.title || '',
      description: item.description || '',
      category: item.category || 'Location and Documentation',
      is_mandatory: item.is_mandatory !== false,
      proof_required: item.proof_required !== false,
      proof_type: item.proof_type || 'image_or_pdf',
      display_order: item.display_order || index + 1,
      is_active: item.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const resolvedCategory = isCustomCategory ? (customCategoryInput.trim() || 'General Store Requirements') : formData.category;
    const list = [...activities];

    const itemToSave = {
      ...formData,
      category: resolvedCategory,
      activity_code: formData.activity_code.trim().toUpperCase() || `ACT_${Date.now()}`,
    };

    if (editingIndex !== null) {
      list[editingIndex] = itemToSave;
    } else {
      list.push(itemToSave);
    }

    // Also update checklist_categories if custom category is new
    const catList = Array.from(new Set([...(settings.checklist_categories || []), resolvedCategory]));

    setSettings({
      ...settings,
      checklist_categories: catList,
      master_checklist_activities: list,
    });

    setModalOpen(false);
    setFeedback({
      type: 'success',
      message: editingIndex !== null ? 'Item updated in master draft. Click "Save Changes" to apply globally.' : 'New document item added to master draft. Click "Save Changes" to apply globally.',
    });
  };

  if (loading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RotateCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Loading universal document rules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Universal Onboarding & Store Verification Rules
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-400" />
            Franchisee Document & Verification Master Engine
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Configure dynamic documents, mandatory proofs, and physical store inspection criteria. Changes made here apply automatically across all Franchisee Onboardings and BDE Verification Desks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 self-start lg:self-center">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Document / Rule
          </button>

          <button
            onClick={handleSyncToActiveStores}
            disabled={syncing}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Push latest checklist items to already active/in-progress stores"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
            {syncing ? 'Syncing Stores...' : 'Sync to Active Stores'}
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4 stroke-[3]" />
            {saving ? 'Saving Rules...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2.5 font-bold">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', message: '' })}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Configured Items</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalCount}</div>
          <span className="text-[11px] text-slate-400 font-medium">Universal checklist size</span>
        </div>

        <div className="p-4 bg-white border border-rose-200 rounded-2xl shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-700 uppercase">Mandatory Requirements</span>
            <Shield className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">{mandatoryCount}</div>
          <span className="text-[11px] text-rose-600/80 font-medium">Strictly required for live launch</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Optional / Good-to-Have</span>
            <CheckSquare className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700 font-mono">{optionalCount}</div>
          <span className="text-[11px] text-slate-400 font-medium">Non-blocking criteria</span>
        </div>

        <div className="p-4 bg-white border border-blue-200 rounded-2xl shadow-xs bg-blue-50/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase">Proof Upload Required</span>
            <Camera className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono">{proofCount}</div>
          <span className="text-[11px] text-blue-600/80 font-medium">Requires photo/PDF attachment</span>
        </div>
      </div>

      {/* Global SLAs & Policies Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Default Store Setup Duration & SLAs
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Standard Allowed Setup Duration (Days)
            </label>
            <input
              type="number"
              min={1}
              value={settings.default_setup_days}
              onChange={(e) => setSettings({ ...settings, default_setup_days: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500 font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">Number of days allocated for showroom setup after payment.</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Due Soon Alert Threshold (Days)
            </label>
            <input
              type="number"
              min={1}
              value={settings.due_soon_threshold_days || 5}
              onChange={(e) => setSettings({ ...settings, due_soon_threshold_days: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500 font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">Days remaining before showing amber urgency warning to BDE.</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Delay Detection & Confirmation
            </label>
            <div className="space-y-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_delay_detection !== false}
                  onChange={(e) => setSettings({ ...settings, auto_delay_detection: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-semibold">Auto-mark delayed when SLA expires</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.require_franchisee_confirmation !== false}
                  onChange={(e) => setSettings({ ...settings, require_franchisee_confirmation: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-semibold">Require partner confirmation on launch</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Master Documents & Activities Management Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-600" />
              Configured Master Document & Inspection Rules ({filteredActivities.length} of {totalCount})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Toggle mandatory requirements, proof upload types, or create new custom criteria at any time
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              New Document Rule
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search document title, instructions, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mandatory Filter Toggle */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Filter:</span>
            <button
              onClick={() => setFilterMandatory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterMandatory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilterMandatory('mandatory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterMandatory === 'mandatory'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Mandatory ({mandatoryCount})
            </button>
            <button
              onClick={() => setFilterMandatory('optional')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterMandatory === 'optional'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Optional ({optionalCount})
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Master Activities Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-black bg-slate-50/80">
                <th className="py-3 px-4 w-16">#</th>
                <th className="py-3 px-4 min-w-[220px]">Document / Inspection Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Requirement</th>
                <th className="py-3 px-4 text-center">Proof / Upload Mode</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    No document items match the selected filter. Click "Add Document / Rule" to create one.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act, idx) => {
                  const originalIndex = activities.findIndex(a => a.activity_code === act.activity_code);
                  const isActActive = act.is_active !== false;

                  return (
                    <tr
                      key={act.activity_code || idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !isActActive ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Order & Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                          #{idx + 1}
                        </span>
                      </td>

                      {/* Title & Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{act.title}</div>
                        {act.description && (
                          <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-2" title={act.description}>
                            {act.description}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-amber-700 mt-1 font-semibold">
                          Code: {act.activity_code}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {act.category}
                        </span>
                      </td>

                      {/* Mandatory Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleMandatory(originalIndex)}
                          className={`px-3 py-1 rounded-full text-[11px] font-black border transition cursor-pointer ${
                            act.is_mandatory
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {act.is_mandatory ? 'MANDATORY' : 'OPTIONAL'}
                        </button>
                      </td>

                      {/* Proof Required Mode */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleProof(originalIndex)}
                          className={`px-3 py-1 rounded-full text-[11px] font-black border transition cursor-pointer ${
                            act.proof_required
                              ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {act.proof_required ? 'PHOTO / PDF REQUIRED' : 'CHECKMARK ONLY'}
                        </button>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(originalIndex)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border transition cursor-pointer ${
                            isActActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isActActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(originalIndex)}
                            className="p-1.5 rounded-xl text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Edit Document Item"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(originalIndex)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Master Activity Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 space-y-5 shadow-2xl my-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingIndex !== null ? 'Edit Document / Checklist Rule' : 'Create New Document / Inspection Rule'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure requirement rules that will apply to Franchisees and BDE Store Verification.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Document / Inspection Code (Unique ID) *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. ACT_STORE_LEASE or ACT_INVERTER_DEMO"
                  value={formData.activity_code}
                  onChange={(e) => setFormData({ ...formData, activity_code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Document / Activity Title *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Physical Store Lease / Ownership Document Verification"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Category *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-[11px] text-amber-700 hover:underline font-bold"
                  >
                    {isCustomCategory ? '← Choose from standard categories' : '+ Add custom category'}
                  </button>
                </div>

                {isCustomCategory ? (
                  <input
                    type="text"
                    required
                    placeholder="Type custom category name..."
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/50 border border-amber-300 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-amber-500"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Instructions & Guidance for Franchisee & BDE
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verify legal possession of commercial shop property with registered lease deed or property tax receipt."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Proof Type selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Proof Attachment Format</label>
                <select
                  value={formData.proof_type}
                  onChange={(e) => setFormData({ ...formData, proof_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="image_or_pdf">High-Res Photo or PDF Document</option>
                  <option value="photo_only">Site Photo Only (JPEG/PNG)</option>
                  <option value="document_only">PDF Agreement / Legal Certificate</option>
                  <option value="gps_photo">GPS Tagged Exterior Shop Photo</option>
                  <option value="checkbox">Inspection Checkmark (No File Required)</option>
                </select>
              </div>

              {/* Requirement Type Checkboxes */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Mandatory Document / Item</span>
                    <span className="text-[11px] text-slate-500">Franchisee cannot be activated without this verified item.</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer pt-1 border-t border-slate-200/60">
                  <input
                    type="checkbox"
                    checked={formData.proof_required}
                    onChange={(e) => setFormData({ ...formData, proof_required: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">File / Photo Proof Required</span>
                    <span className="text-[11px] text-slate-500">BDE or Franchisee must upload proof attachment.</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingIndex !== null ? 'Update Document Rule' : 'Add to Master Rules'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
