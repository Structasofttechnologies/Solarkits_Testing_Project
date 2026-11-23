import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import {
  Package,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  PhoneCall,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  X,
  MessageSquare,
  ArrowRight,
  UserCheck,
  Star,
  Target
} from 'lucide-react';

const FUNNEL_STAGES = [
  { key: 'all', label: 'All Stages', color: 'bg-slate-100 text-slate-800' },
  { key: 'trial_kit_delivered', label: '1. Delivered', color: 'bg-blue-100 text-blue-800' },
  { key: 'feedback_pending', label: '2. Feedback Pending', color: 'bg-amber-100 text-amber-800' },
  { key: 'feedback_received', label: '3. Feedback Received', color: 'bg-purple-100 text-purple-800' },
  { key: 'interested_in_purchase', label: '4. Buying Potential', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'quotation_generated', label: '5. Quote Generated', color: 'bg-cyan-100 text-cyan-800' },
  { key: 'order_won', label: '6. Order Won', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'not_converted', label: '7. Not Converted', color: 'bg-rose-100 text-rose-800' }
];

export default function BdeTrialKitFunnel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedStage, setSelectedStage] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Lead Modal / Drawer
  const [activeLead, setActiveLead] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  // New Note Form
  const [newNote, setNewNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState('');

  // Fetch Funnel Leads
  const fetchFunnelData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, analyticsRes] = await Promise.all([
        api.get(`/trial-kits/funnel${selectedStage !== 'all' ? `?stage=${selectedStage}` : ''}`),
        api.get('/trial-kits/analytics/my-leads')
      ]);

      if (leadsRes.data?.success) {
        setLeads(leadsRes.data.data.leads || []);
      }
      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch BDE trial kit funnel data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStage]);

  useEffect(() => {
    fetchFunnelData();
  }, [fetchFunnelData]);

  // Filter Leads
  const filteredLeads = leads.filter((lead) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.order_number?.toLowerCase().includes(term) ||
      lead.epc_name?.toLowerCase().includes(term) ||
      lead.epc_company_name?.toLowerCase().includes(term) ||
      lead.gst_number?.toLowerCase().includes(term)
    );
  });

  // Open Lead Detail
  const handleOpenLead = (lead) => {
    setActiveLead(lead);
    setNewNote('');
    setNextFollowUpDate('');
    setNoteSuccess('');
    setIsDetailModalOpen(true);
  };

  // Update Funnel Stage
  const handleUpdateStage = async (newStage) => {
    if (!activeLead) return;
    try {
      setUpdatingStage(true);
      const res = await api.put(`/trial-kits/funnel/${activeLead._id}/status`, {
        stage: newStage,
        note: `Updated status to ${newStage}`
      });
      if (res.data?.success) {
        setActiveLead(res.data.data);
        fetchFunnelData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update funnel stage.');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Save Call Note
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setSavingNote(true);
      setNoteSuccess('');
      const res = await api.post(`/trial-kits/funnel/${activeLead._id}/notes`, {
        note: newNote.trim(),
        next_follow_up_date: nextFollowUpDate || null
      });

      if (res.data?.success) {
        setNoteSuccess('Call note saved.');
        setNewNote('');
        setNextFollowUpDate('');
        // Refresh active lead
        const updatedNotes = res.data.data;
        setActiveLead((prev) => ({
          ...prev,
          funnel: { ...prev.funnel, call_notes: updatedNotes }
        }));
        fetchFunnelData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-amber-600" />
            Trial Kit Sales Funnel
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 6: Track delivered trial kits, feedback, call notes, and quotation-to-order conversions.
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search EPC, Company, GSTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white shadow-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <Link
            to="/trial-kit-quotes/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Trial Quote
          </Link>
        </div>
      </div>

      {/* Analytics KPI Ribbon (Section 9 Own Leads Dashboard) */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Kits</span>
            <p className="text-xl font-black text-slate-800 mt-0.5">{analytics.total_assigned_trial_kits}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Delivered</span>
            <p className="text-xl font-black text-blue-600 mt-0.5">{analytics.delivered_trial_kits}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Feedback Recv.</span>
            <p className="text-xl font-black text-purple-600 mt-0.5">{analytics.feedback_received}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Orders Won</span>
            <p className="text-xl font-black text-emerald-600 mt-0.5">{analytics.orders_won}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Conversion Ratio</span>
            <p className="text-xl font-black text-amber-600 mt-0.5">{analytics.conversion_rate}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Commercial Sales</span>
            <p className="text-xl font-black text-slate-900 mt-0.5">₹{analytics.total_commercial_sales_inr.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Stage Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {FUNNEL_STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => setSelectedStage(s.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedStage === s.key
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Funnel Leads Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-semibold">Loading funnel leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Leads Found</h3>
          <p className="text-xs text-slate-400 mt-1">No trial kits match this funnel stage filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => {
            const curStage = lead.funnel?.current_stage || 'trial_kit_delivered';
            const stageConfig = FUNNEL_STAGES.find((s) => s.key === curStage) || FUNNEL_STAGES[1];

            return (
              <div
                key={lead._id}
                onClick={() => handleOpenLead(lead)}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-700">{lead.order_number}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${stageConfig.color}`}>
                      {stageConfig.label}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2 truncate">
                    {lead.epc_company_name || lead.epc_name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Contact: {lead.epc_name} &bull; GSTIN: {lead.gst_number}
                  </p>

                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Trial Kit:</span>
                      <span className="font-bold text-slate-800">{lead.kit_type}</span>
                    </div>
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-slate-400 font-medium shrink-0">Warehouse:</span>
                      <span className="text-slate-700 font-semibold text-right truncate">
                        {lead.warehouse_id?.warehouse_name || lead.warehouse_name || 'Ahmedabad Central Warehouse'}
                      </span>
                    </div>
                    {lead.delivery_details?.delivered_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Delivered:</span>
                        <span className="text-emerald-700 font-semibold">
                          {new Date(lead.delivery_details.delivered_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Future Purchase Intent Badge (Submitted at checkout) */}
                  {lead.future_intent && (lead.future_intent.expected_quantity > 0 || lead.future_intent.loose_quantity > 0 || lead.future_intent.po_quantity > 0) && (
                    <div className="mt-2.5 p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-amber-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Future Intent:
                        </span>
                        <span className="uppercase text-[10px] px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-black">
                          {lead.future_intent.future_purchase_mode === 'loose' ? 'Loose Kits' : (lead.future_intent.future_purchase_mode === 'bulk_po' ? 'Bulk PO' : 'Loose & PO')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-amber-800">
                        <span>Planned Qty: <strong>{lead.future_intent.expected_quantity || (lead.future_intent.loose_quantity + lead.future_intent.po_quantity)} Kits</strong></span>
                        {lead.future_intent.estimated_timeline && (
                          <span className="text-[10px] text-slate-500 font-medium">{lead.future_intent.estimated_timeline}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Feedback Summary Badge if received */}
                  {lead.feedback?.feedback_status === 'submitted' && (
                    <div className="mt-2.5 flex items-center justify-between p-2 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-medium">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                        Rating: {lead.feedback.product_quality_rating}/5
                      </span>
                      <span>Req: {lead.feedback.expected_monthly_kit_purchase_quantity} Kits/Mo</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>{lead.funnel?.call_notes?.length || 0} Call Notes</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    Manage &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LEAD DETAIL & FUNNEL MANAGEMENT MODAL */}
      {isDetailModalOpen && activeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500">{activeLead.order_number}</span>
                <h2 className="text-lg font-black text-slate-900 mt-0.5">
                  {activeLead.epc_company_name || activeLead.epc_name}
                </h2>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-xs">
              {/* Top Contact Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Contact Person</span>
                  <p className="font-bold text-slate-800 mt-0.5">{activeLead.epc_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Mobile / WhatsApp</span>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{activeLead.delivery_details?.shipping_address?.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">GSTIN</span>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{activeLead.gst_number}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Location</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {activeLead.delivery_details?.shipping_address?.district || 'India'}
                  </p>
                </div>
              </div>

              {/* 7 Funnel Stage Progression Picker */}
              <div>
                <label className="block text-slate-700 font-bold mb-2">
                  Funnel Stage Progression (Section 6)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {FUNNEL_STAGES.filter((s) => s.key !== 'all').map((stage) => {
                    const isActive = activeLead.funnel?.current_stage === stage.key;
                    return (
                      <button
                        key={stage.key}
                        type="button"
                        onClick={() => handleUpdateStage(stage.key)}
                        disabled={updatingStage}
                        className={`p-2.5 rounded-xl text-left border font-bold transition flex flex-col justify-between ${isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-[11px]">{stage.label}</span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-1 self-end" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pre-Order Future Purchase Intent Card (Filled by EPC before checkout) */}
              {activeLead.future_intent && (activeLead.future_intent.expected_quantity > 0 || activeLead.future_intent.loose_quantity > 0 || activeLead.future_intent.po_quantity > 0) && (
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                        Pre-Order Future Purchase Intent (EPC Questionnaire)
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                      {activeLead.future_intent.future_purchase_mode === 'loose'
                        ? 'Loose Kits Model'
                        : activeLead.future_intent.future_purchase_mode === 'bulk_po'
                          ? 'Bulk PO Model'
                          : 'Both Loose & PO'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/70 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Planned Qty</span>
                      <span className="text-base font-black text-amber-700">
                        {activeLead.future_intent.expected_quantity ||
                          ((Number(activeLead.future_intent.loose_quantity) || 0) +
                            (Number(activeLead.future_intent.po_quantity) || 0))}{' '}
                        Kits
                      </span>
                    </div>

                    <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/70 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Loose Kits Qty</span>
                      <span className="text-sm font-bold text-slate-800">
                        {activeLead.future_intent.loose_quantity || 0} Kits
                      </span>
                    </div>

                    <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/70 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Bulk PO Qty</span>
                      <span className="text-sm font-bold text-slate-800">
                        {activeLead.future_intent.po_quantity || 0} Kits
                      </span>
                    </div>

                    <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/70 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Timeline</span>
                      <span className="text-xs font-bold text-slate-800">
                        {activeLead.future_intent.estimated_timeline || 'Immediate'}
                      </span>
                    </div>
                  </div>

                  {activeLead.future_intent.remarks && (
                    <div className="p-2.5 bg-white/95 rounded-xl border border-amber-200/70 text-xs">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        EPC Project Remarks / Requirements:
                      </span>
                      <p className="text-slate-800 font-medium mt-0.5">{activeLead.future_intent.remarks}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Submitted Feedback Review (Section 5) */}
              {activeLead.feedback?.feedback_status === 'submitted' ? (
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-900 uppercase text-[10px] tracking-wider">
                      EPC Submitted Feedback
                    </span>
                    <span className="flex items-center gap-1 font-bold text-purple-800 text-xs">
                      <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                      Quality: {activeLead.feedback.product_quality_rating}/5
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-purple-950 text-xs pt-1">
                    <p><strong>Testing Exp:</strong> {activeLead.feedback.installation_testing_experience || 'Smooth'}</p>
                    <p><strong>Performance:</strong> {activeLead.feedback.inverter_module_performance || 'Optimal generation'}</p>
                    <p><strong>Issues/Complaint:</strong> {activeLead.feedback.technical_issue_complaint || 'None'}</p>
                    <p><strong>Expected Monthly Qty:</strong> {activeLead.feedback.expected_monthly_kit_purchase_quantity} Kits</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-xl text-amber-800 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>EPC Feedback is currently pending submission via portal.</span>
                </div>
              )}

              {/* Call Notes History */}
              <div>
                <span className="font-bold text-slate-700 block mb-1.5">
                  Call Notes & Interaction History ({activeLead.funnel?.call_notes?.length || 0})
                </span>
                <div className="max-h-36 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {(!activeLead.funnel?.call_notes || activeLead.funnel.call_notes.length === 0) ? (
                    <p className="text-slate-400 text-center py-4">No call notes logged yet.</p>
                  ) : (
                    activeLead.funnel.call_notes.map((cn, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>{cn.created_by_name || 'BDE'}</span>
                          <span>{new Date(cn.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800 font-medium mt-1">{cn.note}</p>
                        {cn.next_follow_up_date && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 mt-1">
                            <Calendar className="w-3 h-3" /> Follow-up: {new Date(cn.next_follow_up_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add New Call Note Form */}
              <form onSubmit={handleSaveNote} className="space-y-3 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 block">Add Follow-up Remark & Schedule</span>
                {noteSuccess && <p className="text-emerald-600 font-semibold">{noteSuccess}</p>}
                <textarea
                  rows={2}
                  required
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record EPC discussion, buying potential, commercial requirements..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-slate-500 font-medium">Next Follow-up:</span>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => navigate(`/trial-kit-quotes/create?epc_id=${activeLead.epc_id?._id || activeLead.epc_id}&combo_kit_id=${activeLead.combo_kit_id || ''}`)}
                      className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <Package className="w-3.5 h-3.5 text-purple-600" />
                      Generate Trial Kit Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/epc-quotes/create?epc_id=${activeLead.epc_id?._id || activeLead.epc_id}`)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Create Commercial Quote
                    </button>
                    <button
                      type="submit"
                      disabled={savingNote}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-50"
                    >
                      {savingNote ? 'Saving...' : 'Save Call Note'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
