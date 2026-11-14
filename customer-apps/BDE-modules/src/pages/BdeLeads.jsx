import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  RotateCw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Sparkles,
  LayoutGrid,
  List,
  Eye,
  X,
  MapPin,
  Phone,
  Mail,
  Send,
  MessageSquare,
  FileCheck,
  ChevronRight,
  Building,
  Zap,
  Image as ImageIcon,
  Lock,
} from 'lucide-react';
import api from '../services/api';
import { useBdeAuth } from '../context/BdeAuthContext';
import BdeFranchiseOnboardingModal from '../components/BdeFranchiseOnboardingModal';

export default function BdeLeads() {
  const { canOnboardFranchise, canOnboardEpc } = useBdeAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [bdeTerritory, setBdeTerritory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [stageFilter, setStageFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadDetailLoading, setLeadDetailLoading] = useState(false);
  const [activityNote, setActivityNote] = useState('');
  const [activityType, setActivityType] = useState('call');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [stageReason, setStageReason] = useState('');
  const [targetStage, setTargetStage] = useState('');
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Lead Form State
  const [formData, setFormData] = useState({
    prospect_name: '',
    company_name: '',
    mobile_number: '',
    email: '',
    gst_number: '',
    state_name: 'Maharashtra',
    district_name: 'Pune',
    pincode: '',
    address_line: '',
    lead_source: 'direct_visit',
    bde_remarks: '',
    next_follow_up_date: '',
    outside_territory_reason: '',
  });

  const fetchLeadsAndPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const [resLeads, resPipe, resTerr] = await Promise.all([
        api.get(`/leads/list?search=${encodeURIComponent(search)}&stage=${encodeURIComponent(stageFilter)}`),
        api.get('/pipeline'),
        api.get('/territory/my').catch(() => ({ data: null })),
      ]);

      if (resLeads.data?.status === 'success') {
        setLeads(resLeads.data.data || []);
      }
      if (resPipe.data?.status === 'success') {
        setPipeline(resPipe.data.data);
      }
      if (resTerr.data?.status === 'success') {
        setBdeTerritory(resTerr.data);
      }
    } catch (err) {
      console.error('Failed to load leads pipeline', err);
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter]);

  useEffect(() => {
    fetchLeadsAndPipeline();
  }, [fetchLeadsAndPipeline]);

  const handleOpenLeadDetail = async (leadId) => {
    setLeadDetailLoading(true);
    try {
      const res = await api.get(`/leads/detail/${leadId}`);
      if (res.data?.status === 'success') {
        setSelectedLead(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load lead details');
    } finally {
      setLeadDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/leads/create', formData);
      if (res.data?.status === 'success') {
        alert(`Lead ${res.data.data.lead_id} successfully created.`);
        setCreateModalOpen(false);
        setFormData({
          prospect_name: '',
          company_name: '',
          mobile_number: '',
          email: '',
          gst_number: '',
          state_name: 'Maharashtra',
          district_name: 'Pune',
          pincode: '',
          address_line: '',
          lead_source: 'direct_visit',
          bde_remarks: '',
          next_follow_up_date: '',
          outside_territory_reason: '',
        });
        fetchLeadsAndPipeline();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSignup = async (leadId) => {
    if (!window.confirm('Initiate Franchisee Onboarding for this prospect? This will register an official partner record with permanent BDE attribution.')) {
      return;
    }
    try {
      const res = await api.post(`/leads/start-signup/${leadId}`);
      if (res.data?.status === 'success') {
        alert(res.data.message || 'Onboarding started!');
        fetchLeadsAndPipeline();
        if (selectedLead && selectedLead.lead._id === leadId) {
          handleOpenLeadDetail(leadId);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start signup');
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!activityNote.trim()) return;
    try {
      const res = await api.post(`/leads/activity/${selectedLead.lead._id}`, {
        activity_type: activityType,
        title: `${activityType.toUpperCase()} Log`,
        notes: activityNote.trim(),
        next_follow_up_date: nextFollowUpDate || null,
      });

      if (res.data?.status === 'success') {
        setActivityNote('');
        setNextFollowUpDate('');
        handleOpenLeadDetail(selectedLead.lead._id);
        fetchLeadsAndPipeline();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save note');
    }
  };

  const handleStageChangeSubmit = async (e) => {
    e.preventDefault();
    if (['lost', 'rejected'].includes(targetStage) && !stageReason.trim()) {
      alert('A specific reason is mandatory for marking lead as Lost or Rejected.');
      return;
    }

    try {
      const res = await api.put(`/leads/stage/${selectedLead.lead._id}`, {
        new_stage: targetStage,
        reason: stageReason,
      });

      if (res.data?.status === 'success') {
        setStageModalOpen(false);
        setStageReason('');
        handleOpenLeadDetail(selectedLead.lead._id);
        fetchLeadsAndPipeline();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stage');
    }
  };

  const kanbanStages = [
    { id: 'new_lead', title: 'New Leads', color: 'border-blue-200 bg-blue-50 text-blue-800' },
    { id: 'contacted', title: 'Contacted', color: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
    { id: 'interested', title: 'Qualified / Interested', color: 'border-teal-200 bg-teal-50 text-teal-800' },
    { id: 'signup_started', title: 'Signup In Progress', color: 'border-indigo-200 bg-indigo-50 text-indigo-800' },
    { id: 'approved', title: 'Admin Approved', color: 'border-purple-200 bg-purple-50 text-purple-800' },
    { id: 'fee_paid', title: 'Fee Paid & Converted', color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  ];

  const getStageItems = (stageId) => {
    if (!pipeline?.grouped) {
      return leads.filter((l) => {
        if (stageId === 'new_lead') return l.lead_status === 'new_lead';
        if (stageId === 'contacted') return l.lead_status === 'contacted' || l.lead_status === 'follow_up_scheduled';
        if (stageId === 'interested') return l.lead_status === 'interested';
        if (stageId === 'signup_started') return ['signup_started', 'gst_verification_pending', 'admin_review_pending'].includes(l.lead_status);
        if (stageId === 'approved') return ['approved', 'agreement_pending', 'agreement_signed', 'fee_payment_pending'].includes(l.lead_status);
        if (stageId === 'fee_paid') return l.lead_status === 'fee_paid';
        return false;
      });
    }

    if (stageId === 'contacted') {
      return [...(pipeline.grouped['contacted'] || []), ...(pipeline.grouped['follow_up_scheduled'] || [])];
    }
    if (stageId === 'signup_started') {
      return [
        ...(pipeline.grouped['signup_started'] || []),
        ...(pipeline.grouped['gst_verification_pending'] || []),
        ...(pipeline.grouped['admin_review_pending'] || []),
      ];
    }
    if (stageId === 'approved') {
      return [
        ...(pipeline.grouped['approved'] || []),
        ...(pipeline.grouped['agreement_pending'] || []),
        ...(pipeline.grouped['agreement_signed'] || []),
        ...(pipeline.grouped['fee_payment_pending'] || []),
      ];
    }
    return pipeline.grouped[stageId] || [];
  };

  return (
    <div className="space-y-6">
      {/* Lead Category Switcher */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-white text-blue-700 shadow-sm border border-blue-200/80"
        >
          <Building className="w-4 h-4 text-blue-600" />
          <span>Franchisee Partner Leads (HO Assigned)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-black">
            {leads.length}
          </span>
        </button>

        {canOnboardEpc !== false && (
          <button
            type="button"
            onClick={() => navigate('/epc-leads')}
            className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>EPC Contractor Leads (Field Pipeline)</span>
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Franchisee Leads Pipeline</h1>
          <p className="text-xs text-slate-500">
            Prospect, qualify, follow up, and initiate onboarding for solar franchisees in your territory.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Pipeline Board
            </button>
          </div>

          {canOnboardFranchise !== false ? (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Franchisee Lead
            </button>
          ) : (
            <div
              title="Franchise onboarding is disabled for your BDE account by Administrator"
              className="px-3.5 py-2 bg-slate-100 border border-slate-300 text-slate-500 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-not-allowed select-none"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Franchise Onboarding Restricted</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid - Fully Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Leads */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Leads</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-xs">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{leads.length}</div>
            <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">Territory pipeline prospects</span>
          </div>
        </div>

        {/* Card 2: Contacted & Interested */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Qualified / Warm</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-cyan-600 tracking-tight">
              {leads.filter((l) => ['new_lead', 'contacted', 'interested'].includes(l.lead_status || l.stage)).length}
            </div>
            <span className="text-[11px] font-medium text-cyan-600/80 mt-0.5 block">Pitching & follow-up phase</span>
          </div>
        </div>

        {/* Card 3: In Onboarding */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">In Signup Phase</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-indigo-600 tracking-tight">
              {leads.filter((l) => ['signup_started', 'approved', 'agreement_signed'].includes(l.lead_status || l.stage)).length}
            </div>
            <span className="text-[11px] font-medium text-indigo-600/80 mt-0.5 block">Documentation & Agreement</span>
          </div>
        </div>

        {/* Card 4: Fee Paid / Converted */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Converted (Won)</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">
              {leads.filter((l) => ['fee_paid', 'completed'].includes(l.lead_status || l.stage)).length}
            </div>
            <span className="text-[11px] font-medium text-emerald-600/80 mt-0.5 block">Fee paid & store created</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by prospect name, company, mobile, GST, or Lead ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Pipeline Stages</option>
            <option value="new_lead">New Lead</option>
            <option value="contacted">Contacted</option>
            <option value="follow_up_scheduled">Follow-up Scheduled</option>
            <option value="interested">Interested</option>
            <option value="signup_started">Signup Started</option>
            <option value="approved">Approved</option>
            <option value="agreement_signed">Agreement Signed</option>
            <option value="fee_paid">Fee Paid</option>
          </select>

          <button
            onClick={fetchLeadsAndPipeline}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold bg-slate-50/70">
                  <th className="py-3.5 px-4">Lead ID & Prospect</th>
                  <th className="py-3.5 px-4">Territory</th>
                  <th className="py-3.5 px-4">Follow-up Date</th>
                  <th className="py-3.5 px-4">Pipeline Stage</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RotateCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                      Loading pipeline...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No prospect leads found. Click "Add Franchisee Lead" to capture a new prospect.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{lead.company_name}</div>
                        <div className="text-amber-600 font-mono text-[11px] font-bold mt-0.5">{lead.lead_id}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{lead.prospect_name} &bull; {lead.mobile_number}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{lead.district_name}</div>
                        <div className="text-slate-400 text-[11px]">{lead.state_name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {lead.next_follow_up_date ? (
                          <div className="text-slate-700 flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(lead.next_follow_up_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <LeadStageBadge stage={lead.lead_status} />
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        {lead.lead_status === 'new_lead' || lead.lead_status === 'contacted' || lead.lead_status === 'interested' ? (
                          <button
                            onClick={() => handleStartSignup(lead._id)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-[11px] transition-all inline-flex items-center gap-1 shadow-sm"
                          >
                            <UserCheck className="w-3 h-3" />
                            Start Signup
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleOpenLeadDetail(lead._id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] transition-all inline-flex items-center gap-1 shadow-sm"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KANBAN PIPELINE BOARD */}
      {viewMode === 'kanban' && (
        <div className="w-full">
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start select-none">
            {kanbanStages.map((st) => {
              const items = getStageItems(st.id);
              return (
                <div
                  key={st.id}
                  className="w-72 sm:w-80 shrink-0 bg-slate-50 rounded-3xl p-3.5 border border-slate-200 flex flex-col shadow-xs min-h-[460px]"
                >
                  {/* Stage Header */}
                  <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xs ${st.color}`}>
                    <span className="font-bold tracking-tight">{st.title}</span>
                    <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                      {items.length}
                    </span>
                  </div>

                  {/* Cards List or Empty Placeholder */}
                  <div className="flex-1 mt-3 space-y-2.5 overflow-y-auto max-h-[580px] pr-1">
                    {items.length === 0 ? (
                      <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200/90 rounded-2xl bg-white/50">
                        <Users className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-500">No prospects</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Leads in this stage will appear here</p>
                      </div>
                    ) : (
                      items.map((lead) => (
                        <div
                          key={lead._id}
                          onClick={() => handleOpenLeadDetail(lead._id)}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-400 cursor-pointer space-y-2.5 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                              {lead.lead_id}
                            </span>
                            {lead.gst_verified && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                ✓ GST
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 text-xs leading-snug group-hover:text-blue-600 transition-colors">
                              {lead.company_name}
                            </h4>
                            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                              {lead.prospect_name}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {lead.district_name || lead.state_name || 'Territory'}
                            </span>
                            <span className="font-mono font-bold text-slate-700">{lead.mobile_number}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* 1. 5-Step Franchise Partner Onboarding Modal */}
      <BdeFranchiseOnboardingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onLeadCreated={() => {
          fetchLeadsAndPipeline();
        }}
        bdeTerritory={bdeTerritory}
      />

      {/* 2. Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-600">{selectedLead.lead.lead_id}</span>
                  {selectedLead.lead.gst_verified && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                      ✓ GST VERIFIED
                    </span>
                  )}
                  {selectedLead.lead.is_outside_territory && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">
                      ⚠️ OUTSIDE TERRITORY
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">{selectedLead.lead.company_name}</h3>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage and Quick Actions Bar */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block font-semibold">Current Pipeline Stage</span>
                <LeadStageBadge stage={selectedLead.lead.lead_status} />
              </div>

              <div className="flex items-center gap-2">
                {!['signup_started', 'approved', 'agreement_signed', 'fee_paid'].includes(selectedLead.lead.lead_status) && (
                  <button
                    onClick={() => handleStartSignup(selectedLead.lead._id)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Start Franchisee Signup
                  </button>
                )}

                <button
                  onClick={() => {
                    setTargetStage('contacted');
                    setStageReason('');
                    setStageModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
                >
                  Change Stage
                </button>
              </div>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Prospect Contact</span>
                <strong className="text-slate-900">{selectedLead.lead.prospect_name}</strong>
                <span className="text-slate-500 block font-mono">{selectedLead.lead.mobile_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Email & GSTIN</span>
                <strong className="text-slate-900 truncate block">{selectedLead.lead.email}</strong>
                <span className="font-mono text-slate-600">{selectedLead.lead.gst_number || 'No GST'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Territory</span>
                <strong className="text-slate-900">{selectedLead.lead.district_name}, {selectedLead.lead.state_name}</strong>
                {selectedLead.lead.address_line && (
                  <span className="text-slate-500 block text-[11px] truncate">{selectedLead.lead.address_line}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase">Plan Interest & Monthly Kits</span>
                <strong className="text-slate-900">{selectedLead.lead.interested_plan_name || 'Standard Franchisee'}</strong>
                <span className="text-slate-500 block text-[11px]">{selectedLead.lead.expected_monthly_kits || 5} Kits / Month</span>
              </div>
            </div>

            {/* Uploaded Shop Photos Gallery */}
            {selectedLead.lead.shop_photos && selectedLead.lead.shop_photos.length > 0 && (
              <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  Verified Storefront & Premises Photos ({selectedLead.lead.shop_photos.length})
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {selectedLead.lead.shop_photos.map((photo, pIdx) => (
                    <a
                      key={pIdx}
                      href={photo}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl overflow-hidden aspect-video border border-slate-200 bg-slate-200 block group relative"
                    >
                      <img src={photo} alt="Shop" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Add Call / Meeting Note Form */}
            <form onSubmit={handleAddActivity} className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                Log Interaction / Follow-up Note
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                >
                  <option value="call">Phone Call</option>
                  <option value="meeting">Physical Meeting</option>
                  <option value="site_visit">Shop Site Visit</option>
                  <option value="demo">Product Demo</option>
                  <option value="note">General Note</option>
                </select>

                <input
                  type="date"
                  placeholder="Next Follow-up Date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <textarea
                rows={2}
                placeholder="Details of call, discussion points, prospect feedback..."
                value={activityNote}
                onChange={(e) => setActivityNote(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              />

              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3 h-3" />
                Save Note & Schedule
              </button>
            </form>

            {/* Activity History Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase">Interaction Timeline ({selectedLead.activities?.length || 0})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedLead.activities?.map((act, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="font-bold text-slate-800">{act.title}</span>
                      <span>{new Date(act.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600">{act.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Stage Change Modal */}
      {stageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">Update Lead Stage</h3>
            <form onSubmit={handleStageChangeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select New Stage</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                >
                  <option value="contacted">Contacted</option>
                  <option value="follow_up_scheduled">Follow-up Scheduled</option>
                  <option value="interested">Qualified / Interested</option>
                  <option value="lost">Lost</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {['lost', 'rejected'].includes(targetStage) && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specific Reason (Mandatory) *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Budget constraints, opted for competitor, or unresponsive..."
                    value={stageReason}
                    onChange={(e) => setStageReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStageModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
                >
                  Save Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadStageBadge({ stage }) {
  const configs = {
    new_lead: { label: 'New Lead', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    contacted: { label: 'Contacted', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    follow_up_scheduled: { label: 'Follow-up Scheduled', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    interested: { label: 'Interested', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    signup_started: { label: 'Signup In Progress', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    gst_verification_pending: { label: 'GST Pending', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    admin_review_pending: { label: 'Admin Review', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    approved: { label: 'Admin Approved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    agreement_signed: { label: 'Agreement Signed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    fee_paid: { label: 'Fee Paid (Converted)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' },
    rejected: { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    lost: { label: 'Lost', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  };

  const c = configs[stage] || { label: stage, bg: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${c.bg}`}>
      {c.label}
    </span>
  );
}
