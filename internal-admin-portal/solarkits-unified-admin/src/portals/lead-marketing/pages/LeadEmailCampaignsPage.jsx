import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaEnvelopeOpenText,
  FaPlus,
  FaPaperPlane,
  FaUsers,
  FaCheck,
  FaSearch,
  FaDesktop,
  FaMobileAlt,
  FaBullseye,
  FaRocket,
  FaExclamationTriangle,
  FaCode
} from 'react-icons/fa';
import {
  leadMarketingHttp,
  extractError,
  SEGMENT_LABELS,
  SEGMENT_BADGE_COLORS
} from '../services/leadMarketingApi';
import {
  DEFAULT_EXECUTIVE_CREATIVE,
  PURPOSE_BASED_PRESETS,
  COLOR_PALETTES,
  generateResponsiveEmailHtml
} from '../../admin/pages/marketing/services/emailTemplateGenerator';
import CampaignLifecycleButtons from '../../admin/pages/marketing/CampaignLifecycleButtons';

const PRIMARY_SEGMENTS = [
  { key: 'franchisee_leads', label: 'Franchisee Leads' },
  { key: 'epc_signup_leads', label: 'EPC Signup Leads' },
  { key: 'epc_sales_leads', label: 'EPC Sales Leads' }
];

const buildDefaultLeadForm = () => ({
  campaign_name: '',
  campaign_objective: 'Generate High-Intent Solar Inquiries & Conversions',
  campaign_category: 'General Promotional',
  campaign_owner_name: 'Admin',
  attribution_window_days: 30,
  audience_mode: 'dynamic', // 'dynamic' | 'manual'
  target_primary_segments: [],
  target_subgroup_ids: [],
  country_names: [],
  state_names: [],
  district_names: [],
  cluster_names: [],
  target_lead_statuses: [],
  target_bde_ids: [],
  manual_lead_ids: [],
  email_sender_id: '',
  email_template_id: '',
  subject: PURPOSE_BASED_PRESETS[0]?.emailSubject || 'SolarKits: Direct Factory Solar Systems Ready to Dispatch',
  preview_text: PURPOSE_BASED_PRESETS[0]?.emailPreviewText || '',
  cta_text: PURPOSE_BASED_PRESETS[0]?.primaryCtaText || 'Claim Partner Pricing',
  landing_page_url: 'https://solarkits.in/solar-kits',
  composer_mode: 'visual', // 'visual' | 'raw_html'
  raw_html_content: '',
  schedule_mode: 'draft', // 'draft' | 'immediate' | 'scheduled'
  scheduled_at: ''
});

export default function LeadEmailCampaignsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editQueryId = searchParams.get('edit') || '';
  const handledEditQueryRef = useRef('');
  const [editingCampaignId, setEditingCampaignId] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create'
  const [builderStep, setBuilderStep] = useState(1); // 1: Audience, 2: Email Composer, 3: Schedule & Launch

  const [meta, setMeta] = useState({
    subgroups: [],
    countries: [],
    states: [],
    districts: [],
    clusters: [],
    bdes: [],
    email_senders: [],
    email_templates: [],
    settings: { lead_statuses: [], campaign_categories: [], attribution_config: { default_window_days: 30 } }
  });

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchList, setSearchList] = useState('');
  const [banner, setBanner] = useState(null);
  const [launchingId, setLaunchingId] = useState('');

  // Campaign Form State
  const [form, setForm] = useState(buildDefaultLeadForm);

  const [creative, setCreative] = useState({ ...DEFAULT_EXECUTIVE_CREATIVE, ...PURPOSE_BASED_PRESETS[0] });
  const [previewViewport, setPreviewViewport] = useState('desktop');
  const [audiencePreview, setAudiencePreview] = useState({ eligible_count: 0, suppressed_skipped: 0, no_email_skipped: 0, sample: [] });
  const [previewLoading, setPreviewLoading] = useState(false);

  // Manual Lead Picker State
  const [manualSearch, setManualSearch] = useState('');
  const [manualCandidates, setManualCandidates] = useState([]);
  const [selectedManualLeads, setSelectedManualLeads] = useState([]);

  // Test Email & Submit State
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metaRes, cmpRes] = await Promise.all([
        leadMarketingHttp.get('/meta'),
        leadMarketingHttp.get('/campaigns')
      ]);
      if (metaRes.data?.success && metaRes.data?.data) {
        const md = metaRes.data.data;
        setMeta(md);
        const defaultSender = (md.email_senders || []).find((s) => s.is_default && s.is_active) ||
          (md.email_senders || []).find((s) => s.is_active) ||
          (md.email_senders || [])[0];
        setForm((prev) => ({
          ...prev,
          email_sender_id: prev.email_sender_id || defaultSender?._id || '',
          campaign_category:
            prev.campaign_category ||
            md.settings?.campaign_categories?.[0]?.name ||
            md.settings?.campaign_categories?.[0] ||
            'General Promotional',
          attribution_window_days: Number(
            md.settings?.attribution_config?.attribution_window_days ||
              md.settings?.attribution_config?.default_window_days ||
              30
          )
        }));
      }
      if (cmpRes.data?.success) {
        setCampaigns(cmpRes.data.data || []);
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed loading lead campaigns') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Computed HTML Output
  const generatedHtml = useMemo(() => {
    if (form.composer_mode === 'raw_html') return form.raw_html_content;
    return generateResponsiveEmailHtml({
      emailSubject: form.subject,
      emailPreviewText: form.preview_text,
      ctaText: form.cta_text,
      destinationUrl: form.landing_page_url,
      customCreative: { ...creative, primaryCtaText: form.cta_text, destinationUrl: form.landing_page_url }
    });
  }, [form.composer_mode, form.raw_html_content, form.subject, form.preview_text, form.cta_text, form.landing_page_url, creative]);

  // Live Eligible Audience Count
  const refreshAudiencePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const payload =
        form.audience_mode === 'manual'
          ? { manual_lead_ids: form.manual_lead_ids }
          : {
              target_primary_segments: form.target_primary_segments,
              target_subgroup_ids: form.target_subgroup_ids,
              country_names: form.country_names,
              state_names: form.state_names,
              district_names: form.district_names,
              cluster_names: form.cluster_names,
              target_lead_statuses: form.target_lead_statuses,
              target_bde_ids: form.target_bde_ids
            };
      const res = await leadMarketingHttp.post('/campaigns/preview-audience', payload);
      if (res.data?.success && res.data?.data) {
        setAudiencePreview(res.data.data);
      }
    } catch {
      // non-fatal during rapid filter changes
    } finally {
      setPreviewLoading(false);
    }
  }, [form]);

  useEffect(() => {
    if (viewMode !== 'create') return undefined;
    const t = setTimeout(refreshAudiencePreview, 300);
    return () => clearTimeout(t);
  }, [viewMode, refreshAudiencePreview]);

  // Search manual leads
  useEffect(() => {
    if (viewMode !== 'create' || form.audience_mode !== 'manual') return undefined;
    const t = setTimeout(async () => {
      try {
        const res = await leadMarketingHttp.get(`/leads?search=${encodeURIComponent(manualSearch)}&limit=15`);
        if (res.data?.success) setManualCandidates(res.data.data?.leads || []);
      } catch {
        setManualCandidates([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [viewMode, form.audience_mode, manualSearch]);

  const filteredSubgroups = useMemo(() => {
    if (form.target_primary_segments.length === 0) return meta.subgroups;
    return meta.subgroups.filter((sg) => form.target_primary_segments.includes(sg.primary_segment_key));
  }, [meta.subgroups, form.target_primary_segments]);

  const toggleArrayVal = (field, val) => {
    setForm((prev) => {
      const arr = prev[field] || [];
      const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
      return { ...prev, [field]: next };
    });
  };

  const applyPreset = (preset) => {
    setCreative({ ...DEFAULT_EXECUTIVE_CREATIVE, ...preset });
    setForm((prev) => ({
      ...prev,
      composer_mode: 'visual',
      subject: preset.emailSubject || prev.subject,
      preview_text: preset.emailPreviewText || prev.preview_text,
      cta_text: preset.primaryCtaText || prev.cta_text
    }));
  };

  const handleSendTest = async () => {
    if (!testEmailTo) {
      setBanner({ type: 'error', text: 'Enter a test recipient email address first.' });
      return;
    }
    setSendingTest(true);
    setBanner(null);
    try {
      const res = await leadMarketingHttp.post('/campaigns/test-send', {
        to: testEmailTo,
        subject: form.subject,
        html_content: generatedHtml,
        email_sender_id: form.email_sender_id || undefined
      });
      if (res.data?.success) {
        setBanner({ type: 'success', text: `Test email dispatched to ${testEmailTo}.` });
      } else {
        setBanner({ type: 'error', text: res.data?.error || 'Test send returned error' });
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed sending test email') });
    } finally {
      setSendingTest(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!form.campaign_name.trim() || !form.subject.trim()) {
      setBanner({ type: 'error', text: 'Campaign Name and Subject Line are required.' });
      return;
    }
    setSavingCampaign(true);
    setBanner(null);
    try {
      const payload = {
        campaign_name: form.campaign_name.trim(),
        campaign_objective: form.campaign_objective,
        campaign_category: form.campaign_category,
        campaign_owner_name: form.campaign_owner_name,
        attribution_window_days: Number(form.attribution_window_days || 30),
        target_primary_segments: form.audience_mode === 'dynamic' ? form.target_primary_segments : [],
        target_subgroup_ids: form.audience_mode === 'dynamic' ? form.target_subgroup_ids : [],
        country_names: form.audience_mode === 'dynamic' ? form.country_names : [],
        state_names: form.audience_mode === 'dynamic' ? form.state_names : [],
        district_names: form.audience_mode === 'dynamic' ? form.district_names : [],
        cluster_names: form.audience_mode === 'dynamic' ? form.cluster_names : [],
        target_lead_statuses: form.audience_mode === 'dynamic' ? form.target_lead_statuses : [],
        target_bde_ids: form.audience_mode === 'dynamic' ? form.target_bde_ids : [],
        manual_lead_ids: form.audience_mode === 'manual' ? form.manual_lead_ids : [],
        email_sender_id: form.email_sender_id || null,
        email_template_id: form.email_template_id || null,
        subject: form.subject.trim(),
        preview_text: form.preview_text,
        html_content: generatedHtml,
        cta_text: form.cta_text,
        landing_page_url: form.landing_page_url,
        blocks_json: creative,
        schedule_mode: form.schedule_mode,
        scheduled_at: form.schedule_mode === 'scheduled' && form.scheduled_at ? form.scheduled_at : null,
        launch_immediately: form.schedule_mode === 'immediate'
      };
      const res = editingCampaignId
        ? await leadMarketingHttp.put(`/campaigns/${editingCampaignId}`, payload)
        : await leadMarketingHttp.post('/campaigns', payload);
      if (res.data?.success) {
        setBanner({
          type: 'success',
          text: `${editingCampaignId ? 'Updated' : 'Saved'} campaign "${res.data.data.campaign_name}" (${res.data.data.campaign_code}) (${res.data.data.total_target_leads} leads targeted).`
        });
        setEditingCampaignId('');
        setSearchParams({});
        setViewMode('list');
        setBuilderStep(1);
        await loadData();
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed saving campaign') });
    } finally {
      setSavingCampaign(false);
    }
  };

  const openCampaignEditor = useCallback((camp) => {
    if (!camp) return;
    const isManual = Array.isArray(camp.manual_lead_ids) && camp.manual_lead_ids.length > 0;
    const hasBlocks = camp.blocks_json && typeof camp.blocks_json === 'object';
    setEditingCampaignId(String(camp._id));
    setForm((prev) => ({
      ...buildDefaultLeadForm(),
      email_sender_id: String(camp.email_sender_id || prev.email_sender_id || ''),
      email_template_id: String(camp.email_template_id || ''),
      campaign_name: camp.campaign_name || '',
      campaign_objective: camp.campaign_objective || prev.campaign_objective,
      campaign_category: camp.campaign_category || prev.campaign_category,
      campaign_owner_name: camp.campaign_owner_name || 'Admin',
      attribution_window_days: Number(camp.attribution_window_days || 30),
      audience_mode: isManual ? 'manual' : 'dynamic',
      target_primary_segments: camp.target_primary_segments || [],
      target_subgroup_ids: (camp.target_subgroup_ids || []).map(String),
      country_names: camp.country_names || [],
      state_names: camp.state_names || [],
      district_names: camp.district_names || [],
      cluster_names: camp.cluster_names || [],
      target_lead_statuses: camp.target_lead_statuses || [],
      target_bde_ids: (camp.target_bde_ids || []).map(String),
      manual_lead_ids: (camp.manual_lead_ids || []).map(String),
      subject: camp.subject || prev.subject,
      preview_text: camp.preview_text || '',
      cta_text: camp.cta_text || prev.cta_text,
      landing_page_url: camp.landing_page_url || prev.landing_page_url,
      composer_mode: hasBlocks ? 'visual' : (camp.html_content ? 'raw_html' : 'visual'),
      raw_html_content: !hasBlocks && camp.html_content ? camp.html_content : '',
      schedule_mode: 'draft',
      scheduled_at: camp.scheduled_at ? new Date(camp.scheduled_at).toISOString().slice(0, 16) : ''
    }));
    if (hasBlocks) {
      setCreative({ ...DEFAULT_EXECUTIVE_CREATIVE, ...camp.blocks_json });
    }
    setBuilderStep(1);
    setViewMode('create');
  }, []);

  useEffect(() => {
    if (!editQueryId || campaigns.length === 0 || handledEditQueryRef.current === editQueryId) return;
    const target = campaigns.find((c) => String(c._id) === String(editQueryId));
    if (target) {
      handledEditQueryRef.current = editQueryId;
      openCampaignEditor(target);
    }
  }, [editQueryId, campaigns, openCampaignEditor]);

  const [statusFilter, setStatusFilter] = useState('all');

  const handleLifecycleAction = async (campaignId, action) => {
    const campObj = campaigns.find((c) => String(c._id) === String(campaignId));
    if (action === 'edit') {
      openCampaignEditor(campObj);
      return;
    }
    if (action === 'rerun' && !window.confirm('Reset and rerun this Lead campaign now?')) return;
    setLaunchingId(campaignId);
    setBanner(null);
    try {
      const res = await leadMarketingHttp.post(`/campaigns/${campaignId}/${action}`);
      if (res.data?.success) {
        if (action === 'draft') {
          openCampaignEditor(res.data.data || campObj);
          setBanner({ type: 'success', text: `Moved "${(res.data.data || campObj)?.campaign_name || ''}" to Draft for editing.` });
          await loadData();
          return;
        }
        setBanner({ type: 'success', text: res.data.message || `Campaign ${action} executed cleanly.` });
        await loadData();
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, `Campaign ${action} failed`) });
    } finally {
      setLaunchingId('');
    }
  };

  useEffect(() => {
    const hasRunning = campaigns.some((c) => c.status === 'running');
    if (!hasRunning) return undefined;
    const t = setInterval(loadData, 5000);
    return () => clearInterval(t);
  }, [campaigns, loadData]);

  const statusCounts = useMemo(() => ({
    all: campaigns.length,
    running: campaigns.filter((c) => c.status === 'running').length,
    scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
    paused: campaigns.filter((c) => c.status === 'paused').length,
    draft: campaigns.filter((c) => c.status === 'draft').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    cancelled: campaigns.filter((c) => c.status === 'cancelled').length,
    failed: campaigns.filter((c) => c.status === 'failed').length
  }), [campaigns]);

  const visibleCampaigns = useMemo(() => {
    const q = searchList.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(c.campaign_name || '').toLowerCase().includes(q) ||
        String(c.campaign_code || '').toLowerCase().includes(q) ||
        String(c.campaign_category || '').toLowerCase().includes(q)
      );
    });
  }, [campaigns, searchList, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaEnvelopeOpenText className="text-teal-600" />
            <span>08 · Email Campaign Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            De-duplicated audience builder across Primary Segments, Sub-groups &amp; Geography with open/click/conversion attribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              viewMode === 'list'
                ? 'bg-slate-900 dark:bg-teal-600 text-white'
                : 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900'
            }`}
          >
            All Campaigns ({campaigns.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingCampaignId('');
              setSearchParams({});
              setForm((prev) => ({ ...buildDefaultLeadForm(), email_sender_id: prev.email_sender_id || '' }));
              setCreative({ ...DEFAULT_EXECUTIVE_CREATIVE, ...PURPOSE_BASED_PRESETS[0] });
              setViewMode('create');
              setBuilderStep(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              viewMode === 'create'
                ? 'bg-teal-600 text-white'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            <FaPlus /> Create Email Campaign
          </button>
        </div>
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

      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Status Summary Filter Pills */}
          <div className="px-4 pt-4 pb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold">
            {[
              { id: 'all', label: `All (${statusCounts.all})`, cls: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' },
              { id: 'running', label: `Running (${statusCounts.running})`, cls: 'bg-emerald-600 text-white' },
              { id: 'scheduled', label: `Scheduled (${statusCounts.scheduled})`, cls: 'bg-blue-600 text-white' },
              { id: 'paused', label: `Paused (${statusCounts.paused})`, cls: 'bg-amber-600 text-white' },
              { id: 'draft', label: `Draft (${statusCounts.draft})`, cls: 'bg-slate-600 text-white' },
              { id: 'completed', label: `Completed (${statusCounts.completed})`, cls: 'bg-teal-600 text-white' },
              { id: 'cancelled', label: `Stopped / Cancelled (${statusCounts.cancelled})`, cls: 'bg-rose-600 text-white' },
              { id: 'failed', label: `Failed (${statusCounts.failed})`, cls: 'bg-red-700 text-white' }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1 rounded-full cursor-pointer transition ${
                  statusFilter === st.id
                    ? st.cls
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <FaSearch className="absolute left-3 top-2.5 text-slate-400 text-xs" />
              <input
                type="text"
                value={searchList}
                onChange={(e) => setSearchList(e.target.value)}
                placeholder="Search campaigns by code, name or category..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs"
              />
            </div>
            <div className="text-xs text-slate-500">Showing {visibleCampaigns.length} campaigns</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Target Segments &amp; Geo</th>
                  <th className="px-4 py-3 text-right">Target Leads</th>
                  <th className="px-4 py-3 text-right">Delivered</th>
                  <th className="px-4 py-3 text-right">Opens / Clicks</th>
                  <th className="px-4 py-3 text-right">Converted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {visibleCampaigns.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[10px] text-teal-600 font-bold">{c.campaign_code}</div>
                      <div className="font-bold text-slate-900 dark:text-white">{c.campaign_name}</div>
                      <div className="text-[11px] text-slate-400">{c.campaign_category} • {c.subject}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.target_primary_segments || []).length === 0 ? (
                          <span className="text-[11px] text-slate-400">All / Manual Selection</span>
                        ) : (
                          c.target_primary_segments.map((sk) => (
                            <span key={sk} className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${SEGMENT_BADGE_COLORS[sk] || ''}`}>
                              {SEGMENT_LABELS[sk] || sk}
                            </span>
                          ))
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {[...(c.country_names || []), ...(c.state_names || []), ...(c.cluster_names || [])].slice(0, 4).join(', ') || 'All Regions'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black">{c.total_target_leads || 0}</td>
                    <td className="px-4 py-3 text-right">{c.delivered_count || 0} / {c.sent_count || 0}</td>
                    <td className="px-4 py-3 text-right">
                      {c.unique_opens_count || 0} / {c.unique_clicks_count || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      {c.conversions_count || 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.status === 'running'
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            : c.status === 'completed'
                              ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
                              : c.status === 'paused'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                : c.status === 'cancelled' || c.status === 'failed'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                  : c.status === 'scheduled'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <CampaignLifecycleButtons
                          campaignId={c._id}
                          status={c.status}
                          disabled={launchingId === c._id}
                          onAction={handleLifecycleAction}
                        />
                        <button
                          type="button"
                          onClick={() => navigate(`/lead-marketing-panel/campaign-analytics?id=${c._id}`)}
                          title="View Campaign Analytics"
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                        >
                          <FaBullseye className="w-2.5 h-2.5 shrink-0" /> Analytics
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && visibleCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No lead email campaigns created yet. Click <strong>Create Email Campaign</strong> to build your first targeted campaign.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Multi-Step Campaign Builder */
        <div className="space-y-4">
          {/* Stepper Bar */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              {[
                { num: 1, title: '1. Metadata & Audience Filters' },
                { num: 2, title: '2. Email Studio & Preview' },
                { num: 3, title: '3. Test Send, Schedule & Launch' }
              ].map((st) => (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => setBuilderStep(st.num)}
                  className={`px-3.5 py-2 rounded-xl cursor-pointer transition ${
                    builderStep === st.num
                      ? 'bg-teal-600 text-white'
                      : builderStep > st.num
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                  }`}
                >
                  {st.title}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
              <FaUsers className="text-teal-600" />
              <span className="text-slate-600 dark:text-slate-300">Eligible Audience:</span>
              <strong className="text-teal-700 dark:text-teal-300 text-sm">
                {previewLoading ? '...' : audiencePreview.eligible_count}
              </strong>
            </div>
          </div>

          {builderStep === 1 && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-8 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Campaign Name *</label>
                    <input
                      type="text"
                      value={form.campaign_name}
                      onChange={(e) => setForm((f) => ({ ...f, campaign_name: e.target.value }))}
                      placeholder="e.g., Q4 Gujarat EPC Trial Kit Reactivation"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Campaign Category</label>
                    <select
                      value={form.campaign_category}
                      onChange={(e) => setForm((f) => ({ ...f, campaign_category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    >
                      {(meta.settings?.campaign_categories || ['General Promotional']).map((cat) => {
                        const label = typeof cat === 'string' ? cat : cat.name;
                        return <option key={label} value={label}>{label}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Campaign Objective</label>
                    <input
                      type="text"
                      value={form.campaign_objective}
                      onChange={(e) => setForm((f) => ({ ...f, campaign_objective: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold mb-1">Owner Name</label>
                      <input
                        type="text"
                        value={form.campaign_owner_name}
                        onChange={(e) => setForm((f) => ({ ...f, campaign_owner_name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Attribution Window (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={form.attribution_window_days}
                        onChange={(e) => setForm((f) => ({ ...f, attribution_window_days: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm">Target Audience Source</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, audience_mode: 'dynamic' }))}
                        className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                          form.audience_mode === 'dynamic' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700'
                        }`}
                      >
                        Dynamic Filters &amp; Geo
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, audience_mode: 'manual' }))}
                        className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                          form.audience_mode === 'manual' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700'
                        }`}
                      >
                        Manual Lead Picker
                      </button>
                    </div>
                  </div>

                  {form.audience_mode === 'dynamic' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold mb-1.5">Primary Marketing Segments (Leave empty for all)</label>
                        <div className="flex flex-wrap gap-2">
                          {PRIMARY_SEGMENTS.map((ps) => {
                            const active = form.target_primary_segments.includes(ps.key);
                            return (
                              <button
                                key={ps.key}
                                type="button"
                                onClick={() => toggleArrayVal('target_primary_segments', ps.key)}
                                className={`px-3 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1.5 ${
                                  active
                                    ? 'bg-teal-600 text-white border-teal-600'
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600'
                                }`}
                              >
                                {active && <FaCheck />} {ps.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold mb-1.5">Sub-Groups (Multi-select)</label>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          {filteredSubgroups.map((sg) => {
                            const active = form.target_subgroup_ids.includes(sg._id);
                            return (
                              <button
                                key={sg._id}
                                type="button"
                                onClick={() => toggleArrayVal('target_subgroup_ids', sg._id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                                  active
                                    ? 'bg-teal-600 text-white border-teal-600'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                                }`}
                              >
                                {sg.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold mb-1">Countries (Multi-select)</label>
                          <select
                            multiple
                            value={form.country_names}
                            onChange={(e) => setForm((f) => ({ ...f, country_names: Array.from(e.target.selectedOptions, (o) => o.value) }))}
                            className="w-full h-24 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                          >
                            {meta.countries.map((c) => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold mb-1">States (Multi-select)</label>
                          <select
                            multiple
                            value={form.state_names}
                            onChange={(e) => setForm((f) => ({ ...f, state_names: Array.from(e.target.selectedOptions, (o) => o.value) }))}
                            className="w-full h-24 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                          >
                            {meta.states.map((s) => <option key={s._id || s.name} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Districts (Multi-select)</label>
                          <select
                            multiple
                            value={form.district_names}
                            onChange={(e) => setForm((f) => ({ ...f, district_names: Array.from(e.target.selectedOptions, (o) => o.value) }))}
                            className="w-full h-24 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                          >
                            {meta.districts.map((d) => <option key={d._id || d.name} value={d.name}>{d.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Clusters (Multi-select)</label>
                          <select
                            multiple
                            value={form.cluster_names}
                            onChange={(e) => setForm((f) => ({ ...f, cluster_names: Array.from(e.target.selectedOptions, (o) => o.value) }))}
                            className="w-full h-24 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                          >
                            {meta.clusters.map((cl) => {
                              const lbl = cl.cluster_name || cl.name;
                              return <option key={cl._id || lbl} value={lbl}>{lbl}</option>;
                            })}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold mb-1">Lead Status Filter</label>
                          <div className="flex flex-wrap gap-1.5">
                            {(meta.settings?.lead_statuses || []).map((st) => {
                              const statusName = typeof st === 'string' ? st : st.name;
                              const active = form.target_lead_statuses.includes(statusName);
                              return (
                                <button
                                  key={statusName}
                                  type="button"
                                  onClick={() => toggleArrayVal('target_lead_statuses', statusName)}
                                  className={`px-2 py-1 rounded-lg border text-[11px] cursor-pointer ${
                                    active ? 'bg-slate-900 text-white border-slate-900 dark:bg-teal-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {statusName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Assigned BDE Owner(s)</label>
                          <select
                            multiple
                            value={form.target_bde_ids}
                            onChange={(e) => setForm((f) => ({ ...f, target_bde_ids: Array.from(e.target.selectedOptions, (o) => o.value) }))}
                            className="w-full h-24 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                          >
                            {meta.bdes.map((b) => (
                              <option key={b._id} value={b._id}>{b.full_name || b.name || b.email}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Manual Picker */
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        placeholder="Search Central Lead Database by company, email or Lead ID..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                      <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700">
                        {manualCandidates.map((lead) => {
                          const picked = form.manual_lead_ids.includes(lead._id);
                          return (
                            <div key={lead._id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <div className="font-bold">{lead.company_name} <span className="font-mono text-slate-400">({lead.lead_id})</span></div>
                                <div className="text-[11px] text-slate-500">{lead.email || 'No Email'} • {lead.state_name || '—'}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  toggleArrayVal('manual_lead_ids', lead._id);
                                  setSelectedManualLeads((prev) =>
                                    prev.some((x) => x._id === lead._id) ? prev.filter((x) => x._id !== lead._id) : [...prev, lead]
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                                  picked ? 'bg-rose-100 text-rose-700' : 'bg-teal-600 text-white'
                                }`}
                              >
                                {picked ? 'Remove' : 'Add Lead'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Manually selected leads: {selectedManualLeads.length} ({form.manual_lead_ids.length} IDs)
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setBuilderStep(2)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                  >
                    Next: Email Composer →
                  </button>
                </div>
              </div>

              {/* Right Live Eligibility Card */}
              <div className="xl:col-span-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
                <h3 className="text-sm font-black">Live Audience De-duplication Preview</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30">
                    <div className="text-[10px] font-bold text-teal-600">Eligible</div>
                    <div className="text-xl font-black text-teal-800 dark:text-teal-300">{audiencePreview.eligible_count}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                    <div className="text-[10px] font-bold text-amber-600">Suppressed</div>
                    <div className="text-xl font-black text-amber-700 dark:text-amber-300">{audiencePreview.suppressed_skipped}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900">
                    <div className="text-[10px] font-bold text-slate-500">No Email</div>
                    <div className="text-xl font-black">{audiencePreview.no_email_skipped}</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Unsubscribed and blocked emails are automatically stripped prior to campaign queue insertion.
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {(audiencePreview.sample || []).map((row) => (
                    <div key={row._id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold truncate">{row.company_name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{row.email} • {row.state_name || 'India'}</div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">{row.lead_id}</span>
                    </div>
                  ))}
                  {(audiencePreview.sample || []).length === 0 && (
                    <div className="text-center py-6 text-slate-400">No eligible email leads matched current criteria.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {builderStep === 2 && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 text-xs">
              <div className="xl:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div>
                  <label className="block font-bold mb-1">Email Sender Profile *</label>
                  <select
                    value={form.email_sender_id}
                    onChange={(e) => setForm((f) => ({ ...f, email_sender_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="">Auto-Select Default Sender</option>
                    {meta.email_senders.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.from_name || s.name} &lt;{s.from_email}&gt; {s.is_active ? '' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                  {meta.email_senders.length === 0 && (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <FaExclamationTriangle /> No active sender found in Marketing Email Settings. Configure a sender before launching.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold mb-1">Load SolarKits Branded Preset</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {PURPOSE_BASED_PRESETS.slice(0, 5).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="text-left px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {meta.email_templates.length > 0 && (
                  <div>
                    <label className="block font-bold mb-1">Link Saved DB Email Template (Optional)</label>
                    <select
                      value={form.email_template_id}
                      onChange={(e) => {
                        const tplId = e.target.value;
                        const tpl = meta.email_templates.find((t) => String(t._id) === tplId);
                        setForm((f) => ({
                          ...f,
                          email_template_id: tplId,
                          subject: tpl?.subject || f.subject,
                          preview_text: tpl?.preview_text || f.preview_text
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="">-- Custom / Preset Below --</option>
                      {meta.email_templates.map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <label className="block font-bold mb-1">Subject Line *</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Preview / Preheader Text</label>
                    <input
                      type="text"
                      value={form.preview_text}
                      onChange={(e) => setForm((f) => ({ ...f, preview_text: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold mb-1">Primary CTA Button Text</label>
                      <input
                        type="text"
                        value={form.cta_text}
                        onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Landing / Tracked URL</label>
                      <input
                        type="text"
                        value={form.landing_page_url}
                        onChange={(e) => setForm((f) => ({ ...f, landing_page_url: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Visual vs Raw HTML Toggle */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">Editor Mode</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, composer_mode: 'visual' }))}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${form.composer_mode === 'visual' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}
                      >
                        Visual Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, composer_mode: 'raw_html', raw_html_content: f.raw_html_content || generatedHtml }));
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer flex items-center gap-1 ${form.composer_mode === 'raw_html' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}
                      >
                        <FaCode /> Raw HTML
                      </button>
                    </div>
                  </div>

                  {form.composer_mode === 'visual' ? (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_PALETTES.map((pal) => (
                          <button
                            key={pal.id}
                            type="button"
                            onClick={() => setCreative((c) => ({ ...c, themeColor: pal.themeColor, accentColor: pal.accentColor, stripColor: pal.stripColor }))}
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-[11px] flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: pal.themeColor }} />
                            {pal.name}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Hero Headline"
                        value={creative.headline || ''}
                        onChange={(e) => setCreative((c) => ({ ...c, headline: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                      <textarea
                        rows={4}
                        placeholder="Email Body Message (supports {{company_name}}, {{contact_person}}, {{state}}, {{district}})"
                        value={creative.customBodyText || ''}
                        onChange={(e) => setCreative((c) => ({ ...c, customBodyText: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Optional Hero Image / Banner GIF URL"
                        value={creative.heroImageUrl || ''}
                        onChange={(e) => setCreative((c) => ({ ...c, heroImageUrl: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  ) : (
                    <textarea
                      rows={10}
                      value={form.raw_html_content}
                      onChange={(e) => setForm((f) => ({ ...f, raw_html_content: e.target.value }))}
                      className="w-full p-3 font-mono text-[11px] rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-950 text-emerald-300"
                    />
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setBuilderStep(1)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 font-bold cursor-pointer"
                  >
                    ← Audience
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuilderStep(3)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                  >
                    Next: Schedule &amp; Launch →
                  </button>
                </div>
              </div>

              {/* Live Responsive Email Iframe */}
              <div className="xl:col-span-7 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Live Email Render Preview</div>
                    <div className="text-[11px] text-slate-400">Variables such as {'{{company_name}}'} personalize per recipient upon send</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('desktop')}
                      className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer ${previewViewport === 'desktop' ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}
                    >
                      <FaDesktop /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('mobile')}
                      className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer ${previewViewport === 'mobile' ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}
                    >
                      <FaMobileAlt /> Mobile
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex-1 flex justify-center bg-slate-100 dark:bg-slate-900 rounded-xl p-3 overflow-auto">
                  <iframe
                    title="Lead Email Preview"
                    srcDoc={generatedHtml}
                    style={{ width: previewViewport === 'mobile' ? '375px' : '100%', height: '600px' }}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {builderStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-sm font-black">1. Send QA Test Email</h3>
                <p className="text-slate-500">Verify formatting, CTA links, and sender credentials before targeting {audiencePreview.eligible_count} unique leads.</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    placeholder="qa@solarkits.in"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    disabled={sendingTest}
                    onClick={handleSendTest}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold cursor-pointer disabled:opacity-50"
                  >
                    <FaPaperPlane /> {sendingTest ? 'Sending...' : 'Send Test'}
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <h3 className="text-sm font-black">2. Delivery Schedule</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'draft', label: 'Save as Draft' },
                      { id: 'immediate', label: 'Launch Immediately' },
                      { id: 'scheduled', label: 'Schedule Time' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, schedule_mode: opt.id }))}
                        className={`p-2.5 rounded-xl border font-bold cursor-pointer ${
                          form.schedule_mode === opt.id
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {form.schedule_mode === 'scheduled' && (
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                      className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-sm font-black">Campaign Launch Summary</h3>
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <div className="flex justify-between"><span className="text-slate-500">Campaign Name</span><strong>{form.campaign_name || '—'}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Category</span><strong>{form.campaign_category}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Subject</span><strong>{form.subject}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Eligible Recipients</span><strong className="text-teal-600">{audiencePreview.eligible_count} Leads</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Attribution Window</span><strong>{form.attribution_window_days} Days</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Delivery Mode</span><strong className="uppercase">{form.schedule_mode}</strong></div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setBuilderStep(2)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 font-bold cursor-pointer"
                  >
                    ← Back to Studio
                  </button>
                  <button
                    type="button"
                    disabled={savingCampaign}
                    onClick={handleCreateCampaign}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black cursor-pointer disabled:opacity-50"
                  >
                    <FaRocket /> {savingCampaign ? 'Saving...' : form.schedule_mode === 'immediate' ? (editingCampaignId ? 'Update & Dispatch Campaign' : 'Create & Dispatch Campaign') : editingCampaignId ? 'Update Campaign Draft' : 'Save Campaign'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
