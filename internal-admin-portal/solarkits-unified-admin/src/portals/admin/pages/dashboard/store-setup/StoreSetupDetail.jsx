import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  ArrowLeft,
  Clock,
  Calendar,
  Users,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  FileText,
  ExternalLink,
  RotateCw,
  Image as ImageIcon,
  Check,
  X,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Sparkles
} from 'lucide-react';
import { storeSetupApi } from '../../../api/storeSetupApi';

export default function StoreSetupDetail({ setupId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [coordinatorSearch, setCoordinatorSearch] = useState('');

  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [selectedDelay, setSelectedDelay] = useState(null);
  const [delayDecision, setDelayDecision] = useState('approved');
  const [approvedDays, setApprovedDays] = useState(7);
  const [delayRemarks, setDelayRemarks] = useState('');

  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationAction, setVerificationAction] = useState('approve');
  const [verificationRemarks, setVerificationRemarks] = useState('');

  const [previewImage, setPreviewImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [resDetail, empList] = await Promise.all([
        storeSetupApi.getStoreSetupDetail(setupId),
        storeSetupApi.listEmployees(),
      ]);
      if (resDetail?.status === 'success') {
        setData(resDetail.data);
      }
      setEmployees(empList || []);
    } catch (err) {
      console.error('Failed to fetch store setup detail', err);
    } finally {
      setLoading(false);
    }
  }, [setupId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const setup = data?.setup;
  const checklist = data?.checklist || [];
  const delays = data?.delays || [];
  const verifications = data?.verifications || [];

  // Group checklist by category dynamically
  const distinctCategories = Array.from(new Set(checklist.map((c) => c.category).filter(Boolean)));
  const categories = distinctCategories.length > 0 ? distinctCategories : [
    'Location and Documentation',
    'Store Infrastructure',
    'Solarkits Branding',
    'Product Display',
    'Software Setup',
    'Final Verification',
  ];

  const groupedChecklist = categories.map((cat) => ({
    category: cat,
    items: checklist.filter((c) => c.category === cat),
  })).filter(group => group.items.length > 0);

  // Handle Employee Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    setSubmitting(true);
    try {
      const res = await storeSetupApi.assignEmployee(setup._id, {
        employee_id: selectedEmployeeId,
        notes: assignNotes,
      });
      if (res?.status === 'success') {
        setAssignModalOpen(false);
        fetchDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign employee');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delay Review
  const handleDelayReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDelay) return;
    setSubmitting(true);
    try {
      const res = await storeSetupApi.reviewDelayRequest(selectedDelay._id, {
        decision: delayDecision,
        approved_days: Number(approvedDays),
        admin_remarks: delayRemarks,
      });
      if (res?.status === 'success') {
        setDelayModalOpen(false);
        fetchDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review delay request');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Final Verification Review
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (verificationAction === 'correction_required' && !verificationRemarks.trim()) {
      alert('Remarks explaining required corrections are mandatory.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await storeSetupApi.reviewFinalVerification(setup._id, {
        action: verificationAction,
        admin_remarks: verificationRemarks,
      });
      if (res?.status === 'success') {
        setVerificationModalOpen(false);
        fetchDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit verification review');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Operations Start
  const handleStartOperations = async () => {
    if (!window.confirm(`Activate retail operations for "${setup.franchisee_name}"? This enables live billing, distributor pricing, and official operational recognition.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await storeSetupApi.startOperations(setup._id);
      if (res?.status === 'success') {
        alert('Franchisee operations successfully launched!');
        fetchDetail();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start operations');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !setup) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RotateCw className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const deadline = setup.revised_completion_date
    ? new Date(setup.revised_completion_date)
    : new Date(setup.original_completion_date);

  const canStartOperations = setup.status === 'admin_verified' || setup.status === 'setup_completed';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store Setups List
        </button>

        <div className="flex items-center gap-3">
          {setup.status === 'admin_verification_pending' && (
            <button
              onClick={() => {
                setVerificationAction('approve');
                setVerificationRemarks('');
                setVerificationModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              Review Verification
            </button>
          )}

          {canStartOperations && setup.status !== 'operations_started' && (
            <button
              disabled={submitting}
              onClick={handleStartOperations}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
            >
              <Zap className="w-4 h-4" />
              Start Retail Operations
            </button>
          )}
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 font-mono text-xs font-bold rounded-xl">
                {setup.store_setup_id}
              </span>
              <StatusBadge status={setup.status} delayDays={setup.delay_days} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{setup.franchisee_name}</h2>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>{setup.plan_name || 'Standard Franchisee'}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1.5">
                GST: <strong className="font-mono text-slate-700">{setup.gst_number || setup.franchisee_id?.gst_number || 'N/A'}</strong>
                {(setup.franchisee_id?.gst_verified_at || setup.status === 'operations_started') ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                    Pending Verification (Auto-resolved on launch)
                  </span>
                )}
              </span>
              <span>&bull;</span>
              <span>Mobile: {setup.mobile}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Assigned BDE</span>
              <span className="text-xs font-bold text-slate-800">{setup.current_bde_id?.full_name || 'Direct / HO'}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Location</span>
              <span className="text-xs font-bold text-slate-800">{setup.district_name ? `${setup.district_name}, ${setup.state_name}` : 'Regional'}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Franchise Fee</span>
              <span className="text-xs font-bold text-emerald-600 font-mono">₹{(setup.fee_amount || 50000).toLocaleString('en-IN')} (Verified)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Timelines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Progress Card */}
        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Checklist Progress</span>
            <span className="text-xs font-black text-amber-600">{setup.progress_percentage || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${setup.progress_percentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              style={{ width: `${setup.progress_percentage || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Completed: <strong className="text-slate-800">{setup.completed_activities || 0}</strong></span>
            <span>Mandatory Pending: <strong className="text-rose-600">{setup.mandatory_pending_activities || 0}</strong></span>
          </div>
        </div>

        {/* Timelines Card */}
        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Setup Target Deadline</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Started: {new Date(setup.setup_start_date).toLocaleDateString()}</span>
            &bull;
            <span>Allowed: {setup.allowed_setup_days} days</span>
          </div>
        </div>

        {/* State Employee / BDE Assignment Card */}
        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Assigned State Coordinator / BDE</span>
            <button
              onClick={() => {
                setSelectedEmployeeId(setup.assigned_employee_id?._id || setup.assigned_employee_id || '');
                setAssignNotes('');
                setCoordinatorSearch('');
                setAssignModalOpen(true);
              }}
              className="text-xs text-[#0575B8] hover:text-[#045D93] font-bold transition cursor-pointer"
            >
              {setup.assigned_employee_name ? 'Reassign' : 'Assign Coordinator'}
            </button>
          </div>
          <div>
            {setup.assigned_employee_name ? (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-2xl text-[#0575B8] shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                    <span>{setup.assigned_employee_name}</span>
                    {setup.assigned_bde_id && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-[#0575B8] rounded font-mono text-[10px] font-bold">
                        {setup.assigned_bde_id}
                      </span>
                    )}
                  </div>
                  {setup.assigned_employee_email && (
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{setup.assigned_employee_email}</span>
                    </div>
                  )}
                  {setup.assigned_employee_phone && (
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{setup.assigned_employee_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">No state coordinator assigned yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Delay Requests Queue if any */}
      {delays.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              Timeline Extension & Delay Requests ({delays.length})
            </h3>
          </div>

          <div className="space-y-3">
            {delays.map((del) => (
              <div
                key={del._id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900">{del.reason}</span>
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${del.decision_status === 'approved'
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : del.decision_status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                      {del.decision_status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{del.description}</p>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                    <span>Requested by: <strong>{del.requested_by_name}</strong></span>
                    &bull;
                    <span>Additional Days: <strong className="text-amber-600">{del.additional_days_requested} days</strong></span>
                    &bull;
                    <span>Proposed Date: <strong>{new Date(del.proposed_revised_date).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                {del.decision_status === 'pending' && (
                  <button
                    onClick={() => {
                      setSelectedDelay(del);
                      setApprovedDays(del.additional_days_requested);
                      setDelayDecision('approved');
                      setDelayRemarks('');
                      setDelayModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm"
                  >
                    Review Extension
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Checklist Activities Accordion */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">Physical Store Setup Checklist</h3>
          <p className="text-xs text-slate-500">
            State employee site activities, proofs, and admin verification status
          </p>
        </div>

        <div className="space-y-6">
          {groupedChecklist.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                  {gIdx + 1}
                </span>
                <h4 className="text-sm font-bold text-slate-800">{group.category}</h4>
                <span className="text-xs text-slate-400">
                  ({group.items.filter(i => i.status === 'completed').length}/{group.items.length} completed)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {group.items.map((item) => (
                  <div
                    key={item._id}
                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{item.title}</span>
                        {item.is_mandatory && (
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded">
                            Mandatory
                          </span>
                        )}
                        {item.proof_required && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded">
                            Proof Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{item.description}</p>

                      {item.employee_remarks && (
                        <p className="text-xs text-slate-700 italic pt-1">
                          Remarks: "{item.employee_remarks}"
                        </p>
                      )}

                      {/* Proof Thumbnails */}
                      {item.proofs && item.proofs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          {item.proofs.map((proof, pIdx) => (
                            <button
                              key={pIdx}
                              onClick={() => setPreviewImage(proof.url)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                              View Proof #{pIdx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${item.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.status === 'in_progress'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification History Log if any */}
      {verifications.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
            Verification Review Cycles ({verifications.length})
          </h3>
          <div className="space-y-3">
            {verifications.map((v) => (
              <div key={v._id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">Cycle #{v.cycle_number} &bull; Decision: {v.admin_decision?.toUpperCase()}</span>
                  <span className="text-slate-400">{new Date(v.created_at || Date.now()).toLocaleString()}</span>
                </div>
                <p className="text-slate-600">{v.admin_remarks || 'No specific remarks'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* 1. Assign BDE State Coordinator Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign State Coordinator / BDE</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a registered BDE from Admin Panel for <span className="font-semibold text-slate-900">{setup?.franchisee_name}</span> ({setup?.state_name || 'Regional'})
                </p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search BDE by name, BDE ID, phone, email, state..."
                value={coordinatorSearch}
                onChange={(e) => setCoordinatorSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0575B8] focus:bg-white transition"
              />
            </div>

            {/* BDE List */}
            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Select State Coordinator / BDE ({
                    employees.filter((emp) => {
                      if (!coordinatorSearch.trim()) return true;
                      const term = coordinatorSearch.toLowerCase();
                      return (
                        (emp.full_name || emp.name || '').toLowerCase().includes(term) ||
                        (emp.bde_id || '').toLowerCase().includes(term) ||
                        (emp.email || '').toLowerCase().includes(term) ||
                        (emp.mobile_number || emp.phone || '').toLowerCase().includes(term) ||
                        (emp.state_name || '').toLowerCase().includes(term)
                      );
                    }).length
                  } available)
                </label>

                {employees.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                    No BDEs found in the system. Please create a BDE from BDE Management first.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                    {employees
                      .filter((emp) => {
                        if (!coordinatorSearch.trim()) return true;
                        const term = coordinatorSearch.toLowerCase();
                        return (
                          (emp.full_name || emp.name || '').toLowerCase().includes(term) ||
                          (emp.bde_id || '').toLowerCase().includes(term) ||
                          (emp.email || '').toLowerCase().includes(term) ||
                          (emp.mobile_number || emp.phone || '').toLowerCase().includes(term) ||
                          (emp.state_name || '').toLowerCase().includes(term)
                        );
                      })
                      .map((emp) => {
                        const empId = emp._id || emp.id;
                        const isSelected = selectedEmployeeId === empId;
                        const isStateMatch = setup?.state_id && emp.state_id && setup.state_id.toString() === emp.state_id.toString();

                        return (
                          <div
                            key={empId}
                            onClick={() => setSelectedEmployeeId(empId)}
                            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${isSelected
                              ? 'bg-blue-50 border-[#0575B8] shadow-xs'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`p-2.5 rounded-xl text-xs font-black shrink-0 ${isSelected ? 'bg-[#0575B8] text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                <Users className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-xs">{emp.full_name || emp.name}</span>
                                  {emp.bde_id && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-[#0575B8] rounded-md font-mono text-[10px] font-bold">
                                      {emp.bde_id}
                                    </span>
                                  )}
                                  {isStateMatch && (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5" /> State Match
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                                  {emp.email && <span>{emp.email}</span>}
                                  {(emp.mobile_number || emp.phone) && <span>&bull; {emp.mobile_number || emp.phone}</span>}
                                </div>
                                {(emp.state_name || emp.assigned_districts?.length > 0) && (
                                  <div className="text-[10px] text-slate-600 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{emp.state_name || 'Regional'} {emp.assigned_districts?.length > 0 ? `(${emp.assigned_districts.length} Districts)` : ''}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${isSelected ? 'border-[#0575B8] bg-[#0575B8] text-white' : 'border-slate-300 bg-white'
                              }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                  Assignment Notes / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Please conduct preliminary store branding and physical location inspection..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0575B8] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedEmployeeId}
                  className="px-5 py-2 bg-[#0575B8] hover:bg-[#045D93] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Assigning Coordinator...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Review Delay Request Modal */}
      {delayModalOpen && selectedDelay && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Review Delay Extension Request</h3>
              <button onClick={() => setDelayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1 text-slate-700">
              <div><strong>Reason:</strong> {selectedDelay.reason}</div>
              <div><strong>Requested:</strong> {selectedDelay.additional_days_requested} additional days</div>
              <div><strong>Proposed Completion:</strong> {new Date(selectedDelay.proposed_revised_date).toLocaleDateString()}</div>
            </div>

            <form onSubmit={handleDelayReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Decision</label>
                <select
                  value={delayDecision}
                  onChange={(e) => setDelayDecision(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="approved">Approve Extension</option>
                  <option value="rejected">Reject Request</option>
                  <option value="clarification_requested">Request Clarification</option>
                </select>
              </div>

              {delayDecision === 'approved' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Approved Additional Days</label>
                  <input
                    type="number"
                    min={1}
                    value={approvedDays}
                    onChange={(e) => setApprovedDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Admin Remarks</label>
                <textarea
                  rows={3}
                  value={delayRemarks}
                  onChange={(e) => setDelayRemarks(e.target.value)}
                  placeholder="Decision rationale..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDelayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  {submitting ? 'Submitting...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Review Verification Modal */}
      {verificationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Review Store Setup Verification</h3>
              <button onClick={() => setVerificationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerificationSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Review Action</label>
                <select
                  value={verificationAction}
                  onChange={(e) => setVerificationAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="approve">Approve Setup (Mark Admin Verified)</option>
                  <option value="correction_required">Request Correction (Send Back to Employee)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Admin Remarks {verificationAction === 'correction_required' && <span className="text-rose-600">*</span>}
                </label>
                <textarea
                  rows={3}
                  required={verificationAction === 'correction_required'}
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                  placeholder={verificationAction === 'correction_required' ? 'Specify required fixes...' : 'Approval notes...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVerificationModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Confirm Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Full Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={previewImage} alt="Site Proof Document" className="max-w-full max-h-[80vh] rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, delayDays }) {
  const configs = {
    not_started: { label: 'Not Started', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    employee_assigned: { label: 'Employee Assigned', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    in_progress: { label: 'In Progress', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    on_track: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    due_soon: { label: 'Due Soon', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    delayed: { label: `Delayed (${delayDays || 0}d)`, bg: 'bg-red-50 text-red-700 border-red-200' },
    delay_approval_pending: { label: 'Extension Pending', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    delay_approved: { label: 'Extension Approved', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    delay_rejected: { label: 'Extension Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    setup_completed: { label: 'Setup Completed', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    admin_verification_pending: { label: 'Verification Pending', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    correction_required: { label: 'Correction Required', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    admin_verified: { label: 'Admin Verified', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    operations_started: { label: 'Operations Live', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' },
    cancelled: { label: 'Cancelled', bg: 'bg-slate-100 text-slate-500 border-slate-200' },
  };

  const c = configs[status] || { label: status, bg: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${c.bg}`}>
      {c.label}
    </span>
  );
}
