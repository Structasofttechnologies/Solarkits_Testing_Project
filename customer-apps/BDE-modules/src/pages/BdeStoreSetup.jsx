import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  RotateCw,
  MapPin,
  Users,
  Calendar,
  Eye,
  X,
  Info,
  Upload,
  Camera,
  Check,
  Image as ImageIcon,
  FileText,
  Send,
  ChevronRight,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import api from '../services/api';

export default function BdeStoreSetup() {
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Store Execution Modal State
  const [activeSetupId, setActiveSetupId] = useState(null);
  const [setupDetail, setSetupDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  // Checklist Item Upload / Update State
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [employeeRemarks, setEmployeeRemarks] = useState('');
  const [updatingActivity, setUpdatingActivity] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Verification Submission State
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [finalRemarks, setFinalRemarks] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Image Preview Modal
  const [previewImageModal, setPreviewImageModal] = useState(null);

  const fetchSetups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/store-setup');
      if (res.data?.status === 'success') {
        setSetups(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch store setups', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetups();
  }, []);

  // Fetch full detail for a selected store setup
  const fetchSetupDetail = useCallback(async (setupId) => {
    if (!setupId) return;
    setLoadingDetail(true);
    setFeedbackMsg({ type: '', text: '' });
    try {
      const res = await api.get(`/store-setup/${setupId}`);
      if (res.data?.status === 'success') {
        setSetupDetail(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch store setup detail', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleOpenExecutionModal = (setup) => {
    setActiveSetupId(setup._id);
    setSelectedActivity(null);
    setProofFile(null);
    setProofPreview('');
    setEmployeeRemarks('');
    fetchSetupDetail(setup._id);
  };

  const handleCloseExecutionModal = () => {
    setActiveSetupId(null);
    setSetupDetail(null);
    setSelectedActivity(null);
    fetchSetups();
  };

  // Handle Photo File selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Demo Photo helper (useful for local simulation)
  const handleSetSamplePhoto = () => {
    const samplePhotos = {
      ACT_LOC_01: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=800&q=80',
      ACT_LOC_03: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
      ACT_INF_01: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
      ACT_INF_02: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
      ACT_BRD_01: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
      ACT_BRD_02: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      ACT_PRD_01: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
      ACT_PRD_02: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
      ACT_SFT_01: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
      ACT_FIN_01: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    };
    const photoUrl = samplePhotos[selectedActivity?.activity_code] || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80';
    setProofPreview(photoUrl);
    setProofFile(null);
  };

  // Submit activity update & proof upload
  const handleUpdateActivity = async (statusToSet = 'completed') => {
    if (!selectedActivity || !activeSetupId) return;

    if (statusToSet === 'completed' && selectedActivity.proof_required) {
      const hasExistingProof = selectedActivity.proofs && selectedActivity.proofs.length > 0;
      if (!hasExistingProof && !proofFile && !proofPreview) {
        setFeedbackMsg({
          type: 'error',
          text: `Photo/Proof upload is mandatory for "${selectedActivity.title}" before marking it completed.`,
        });
        return;
      }
    }

    setUpdatingActivity(true);
    setFeedbackMsg({ type: '', text: '' });

    try {
      let res;
      if (proofFile) {
        const formData = new FormData();
        formData.append('status', statusToSet);
        formData.append('employee_remarks', employeeRemarks || 'Verified on-site by BDE');
        formData.append('file', proofFile);
        formData.append('replace_proofs', 'true');

        res = await api.put(
          `/store-setup/${activeSetupId}/checklist/${selectedActivity._id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      } else {
        const payload = {
          status: statusToSet,
          employee_remarks: employeeRemarks || 'Verified on-site by BDE Coordinator',
          replace_proofs: true,
        };
        if (proofPreview) {
          payload.proof_url = proofPreview;
          payload.proofs = [
            {
              url: proofPreview,
              filename: `${selectedActivity.activity_code}_proof.jpg`,
              file_type: 'image',
            },
          ];
        }
        res = await api.put(
          `/store-setup/${activeSetupId}/checklist/${selectedActivity._id}`,
          payload
        );
      }

      if (res.data?.status === 'success') {
        setFeedbackMsg({
          type: 'success',
          text: `Activity "${selectedActivity.title}" marked as ${statusToSet.toUpperCase()}!`,
        });
        setProofFile(null);
        setProofPreview('');
        setEmployeeRemarks('');
        setSelectedActivity(null);
        await fetchSetupDetail(activeSetupId);
        fetchSetups();
      }
    } catch (err) {
      console.error('Failed to update activity', err);
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update activity. Please try again.',
      });
    } finally {
      setUpdatingActivity(false);
    }
  };

  // Delete a specific proof photo from a checklist item
  const handleDeleteProof = async (e, item, proofUrl) => {
    e.stopPropagation();
    if (!item || !activeSetupId) return;
    if (!window.confirm('Are you sure you want to remove this proof photo?')) return;

    try {
      const remaining = (item.proofs || []).filter(p => p.url !== proofUrl);
      const res = await api.put(`/store-setup/${activeSetupId}/checklist/${item._id}`, {
        status: remaining.length === 0 && item.proof_required ? 'in_progress' : item.status,
        proofs: remaining,
        replace_proofs: true,
        clear_proofs: remaining.length === 0,
      });

      if (res.data?.status === 'success') {
        setFeedbackMsg({
          type: 'success',
          text: 'Proof photo removed successfully.',
        });
        await fetchSetupDetail(activeSetupId);
        fetchSetups();
      }
    } catch (err) {
      console.error('Failed to remove proof', err);
    }
  };

  const [verificationSetupId, setVerificationSetupId] = useState(null);

  // Final Verification Submission
  const handleSubmitFinalVerification = async (e) => {
    if (e) e.preventDefault();
    const targetId = verificationSetupId || activeSetupId || currentSetup?._id;
    if (!targetId) {
      alert('No store setup selected.');
      return;
    }

    setSubmittingVerification(true);
    try {
      const res = await api.post(`/store-setup/${targetId}/submit-verification`, {
        employee_final_remarks: finalRemarks || 'Showroom 100% physically inspected & verified. Ready for Admin launch approval.',
      });

      if (res.data?.status === 'success') {
        setVerificationModalOpen(false);
        setVerificationSetupId(null);
        handleCloseExecutionModal();
        alert('🎉 Store setup successfully submitted for Admin Final Launch Approval!');
        await fetchSetups();
      }
    } catch (err) {
      console.error('Failed to submit for verification', err);
      alert(err.response?.data?.message || 'Failed to submit verification request');
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RotateCw className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const totalStores = setups.length;
  const operationalStores = setups.filter((s) => s.status === 'operations_started').length;
  const inProgressStores = setups.filter((s) => !['operations_started', 'cancelled'].includes(s.status)).length;
  const delayedStores = setups.filter((s) => s.status === 'delayed' || s.delay_days > 0).length;

  const currentSetup = setupDetail?.setup;
  const checklist = setupDetail?.checklist || [];

  const distinctCategories = Array.from(new Set(checklist.map((c) => c.category).filter(Boolean)));
  const categories = ['All', ...(distinctCategories.length > 0 ? distinctCategories : [
    'Location and Documentation',
    'Store Infrastructure',
    'Solarkits Branding',
    'Product Display',
    'Software Setup',
    'Final Verification',
  ])];

  const filteredChecklist = activeCategory === 'All'
    ? checklist
    : checklist.filter((item) => item.category === activeCategory);

  const completedCount = checklist.filter((c) => c.status === 'completed').length;
  const mandatoryPendingCount = checklist.filter((c) => c.is_mandatory && c.status !== 'completed').length;
  const canSubmitVerification = checklist.length > 0 && mandatoryPendingCount === 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
              Field Operations & Inspection
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
            Franchisee Store Setups
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect physical showroom readiness, upload site inspection photos, and submit verification for partner activation.
          </p>
        </div>

        <button
          onClick={fetchSetups}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold"
        >
          <RotateCw className="w-4 h-4" />
          <span>Refresh Pipeline</span>
        </button>
      </div>

      {/* KPI Cards Grid - Fully Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Attributed Stores */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Franchisee Stores</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-xs">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{totalStores}</div>
            <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">Total signed partners in pipeline</span>
          </div>
        </div>

        {/* Card 2: Under Setup */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Under Physical Setup</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-600 tracking-tight">{inProgressStores}</div>
            <span className="text-[11px] font-medium text-amber-600/80 mt-0.5 block">Checklist inspection ongoing</span>
          </div>
        </div>

        {/* Card 3: Overdue / Delayed */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Overdue / Delayed</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-rose-600 tracking-tight">{delayedStores}</div>
            <span className="text-[11px] font-medium text-rose-500 mt-0.5 block">SLA attention required</span>
          </div>
        </div>

        {/* Card 4: Live Operational */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Live Operational</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">{operationalStores}</div>
            <span className="text-[11px] font-medium text-emerald-600/80 mt-0.5 block">100% active retail stores</span>
          </div>
        </div>
      </div>

      {/* Main Setups List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-900">Partner Store Setup Pipeline</h3>
            <p className="text-xs text-slate-500">
              Click &quot;Inspect & Upload Proofs&quot; to complete the 16-step showroom verification checklist.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold self-start sm:self-auto">
            {setups.length} Stores Tracked
          </span>
        </div>

        {setups.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            No store setups assigned to your account yet. Store setups trigger automatically when your franchisee leads sign their agreements and verify fee payment.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {setups.map((setup) => {
              const deadline = setup.revised_completion_date
                ? new Date(setup.revised_completion_date)
                : new Date(setup.original_completion_date);

              return (
                <div key={setup._id} className="p-6 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-300 text-amber-800 font-mono text-xs font-bold rounded-lg">
                          {setup.store_setup_id}
                        </span>
                        <StatusBadge status={setup.status} delayDays={setup.delay_days} />
                      </div>
                      <h4 className="text-lg font-black text-slate-900">{setup.franchisee_name}</h4>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {setup.district_name ? `${setup.district_name}, ${setup.state_name}` : 'Regional Area'}
                        </span>
                        &bull;
                        <span>Plan: <strong className="text-slate-800">{setup.plan_name || 'District Franchisee'}</strong></span>
                        &bull;
                        <span>Mobile: <strong className="text-slate-800">{setup.mobile}</strong></span>
                        &bull;
                        <span>Email: {setup.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenExecutionModal(setup)}
                        className={`px-4 py-2.5 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${setup.status === 'admin_verification_pending'
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                          : setup.status === 'operations_started'
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                          }`}
                      >
                        <Camera className="w-4 h-4" />
                        <span>
                          {setup.status === 'admin_verification_pending'
                            ? 'Under Admin Review (Desk)'
                            : setup.status === 'operations_started'
                              ? 'View Live Store Desk'
                              : 'Inspect & Upload Proofs'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Checklist Progress</span>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${setup.progress_percentage === 100
                            ? 'bg-emerald-500'
                            : setup.delay_days > 0
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                            }`}
                          style={{ width: `${setup.progress_percentage || 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{setup.completed_activities || 0}/{setup.total_activities || 16} completed</span>
                        <strong className="text-slate-800">{setup.progress_percentage || 0}%</strong>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Target Completion Date</span>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {setup.delay_days > 0 ? (
                        <span className="text-rose-600 font-semibold text-[11px] mt-0.5 block">
                          Overdue by {setup.delay_days} days
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[11px] mt-0.5 block">On target</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Assigned State Coordinator</span>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        {setup.assigned_employee_name || 'Vikram Sharma (BDE-2026-0001)'}
                      </div>
                      <span className="text-slate-500 text-[11px] mt-0.5 block">
                        {setup.assigned_employee_email || 'vikram.bde@solarkits.com'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── STORE SETUP EXECUTION & PHOTO UPLOAD MODAL ──────────────────────── */}
      {activeSetupId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
          <div className="bg-white rounded-3xl w-full max-w-5xl p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 my-4 sm:my-8 relative text-slate-900">
            <button
              onClick={handleCloseExecutionModal}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer z-10"
              title="Close Desk"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDetail ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RotateCw className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Loading Checklist & Proofs...
                </p>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                      Showroom Execution & Verification Desk
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      ID: {currentSetup?.store_setup_id}
                    </span>
                    <StatusBadge status={currentSetup?.status} delayDays={currentSetup?.delay_days} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentSetup?.franchisee_name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload physical inspection proof photos for each item below. Once all mandatory activities are complete, submit the store for Admin launch approval.
                  </p>
                </div>

                {/* Progress Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Execution SLA</span>
                    <strong className="text-slate-900 text-sm block mt-0.5">
                      {currentSetup?.allowed_setup_days || 30} Days Allowed
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Deadline: {new Date(currentSetup?.original_completion_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Mandatory Steps Pending</span>
                    <strong className={`text-sm block mt-0.5 ${checklist.length === 0 ? 'text-slate-500' : mandatoryPendingCount === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {checklist.length === 0 ? 'No Steps Initialized' : mandatoryPendingCount === 0 ? '✓ All Mandatory Completed!' : `${mandatoryPendingCount} Mandatory Remaining`}
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      {completedCount} of {checklist.length} total steps finished
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Overall Completion</span>
                    <strong className="text-slate-900 text-sm block mt-0.5">
                      {currentSetup?.progress_percentage || 0}%
                    </strong>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${currentSetup?.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Feedback Notification Banner */}
                {feedbackMsg.text && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${feedbackMsg.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                    {feedbackMsg.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    )}
                    <span className="font-semibold">{feedbackMsg.text}</span>
                  </div>
                )}

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-100 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeCategory === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* 16 Checklist Items List */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredChecklist.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">No Checklist / Document Activities Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {checklist.length === 0
                          ? 'Checklist activities have not been initialized yet.'
                          : `No activities found in category "${activeCategory}".`}
                      </p>
                    </div>
                  ) : (
                    filteredChecklist.map((item, idx) => {
                    const isSelected = selectedActivity?._id === item._id;
                    const isCompleted = item.status === 'completed';

                    return (
                      <div
                        key={item._id || idx}
                        className={`p-4 rounded-2xl border transition-all ${isCompleted
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isSelected
                            ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                #{item.display_order || idx + 1}. {item.title}
                              </span>
                              {item.is_mandatory && (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
                                  Mandatory
                                </span>
                              )}
                              {item.proof_required && (
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                  Photo Proof Required
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 text-xs">{item.description}</p>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                              Category: {item.category}
                            </span>

                            {/* Existing Uploaded Proofs Preview */}
                            {item.proofs && item.proofs.length > 0 && (
                              <div className="pt-2">
                                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                                  Attached Proof Photos ({item.proofs.length}):
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {item.proofs.map((pr, pIdx) => (
                                    <div
                                      key={pIdx}
                                      onClick={() => setPreviewImageModal(pr.url)}
                                      className="relative group w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer shadow-xs"
                                      title="Click to zoom"
                                    >
                                      <img
                                        src={pr.url}
                                        alt="Proof"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white transition-opacity">
                                        <Eye className="w-3.5 h-3.5" />
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteProof(e, item, pr.url)}
                                          className="p-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                                          title="Remove photo"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Employee Remarks */}
                            {item.employee_remarks && (
                              <p className="text-[11px] text-slate-600 italic bg-white/80 p-2 rounded-xl border border-slate-200 mt-1.5">
                                <strong>BDE Note:</strong> {item.employee_remarks}
                              </p>
                            )}
                          </div>

                          {/* Action Button & Status Pill */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : item.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-200 text-slate-700 border-slate-300'
                              }`}>
                              {item.status ? item.status.toUpperCase() : 'PENDING'}
                            </span>

                            <button
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedActivity(null);
                                } else {
                                  setSelectedActivity(item);
                                  setEmployeeRemarks(item.employee_remarks || '');
                                  setProofFile(null);
                                  setProofPreview('');
                                  setFeedbackMsg({ type: '', text: '' });
                                }
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isSelected
                                ? 'bg-slate-900 text-white'
                                : isCompleted
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
                                }`}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>{isCompleted ? 'Re-Upload Photo' : 'Upload Proof Photo'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Interactive Upload & Mark Completed Drawer for this Activity */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t border-amber-200/80 space-y-3 bg-white p-4 rounded-2xl shadow-xs">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <Upload className="w-4 h-4 text-amber-600" />
                                <span>Upload Inspection Proof for #{item.display_order}. {item.title}</span>
                              </h5>
                              <button
                                onClick={handleSetSamplePhoto}
                                className="text-[11px] text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
                              >
                                Quick Sample Photo
                              </button>
                            </div>

                            {/* Photo Picker */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Select Photo from Device / Camera
                                </label>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={handleFileChange}
                                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50"
                                />
                              </div>

                              {/* Live Photo Preview */}
                              {proofPreview && (
                                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200">
                                  <img
                                    src={proofPreview}
                                    alt="Preview"
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                                  />
                                  <div className="text-[11px] text-slate-600">
                                    <strong className="block text-emerald-700">Photo Ready</strong>
                                    <span>Click Complete below to save</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Notes / Remarks */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                BDE Inspection Notes / Site Remarks
                              </label>
                              <input
                                type="text"
                                value={employeeRemarks}
                                onChange={(e) => setEmployeeRemarks(e.target.value)}
                                placeholder="e.g. Verified on-site, signboard mounted securely, inverter test run OK"
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-slate-50"
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-2">
                              <button
                                onClick={() => setSelectedActivity(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={updatingActivity}
                                onClick={() => handleUpdateActivity('completed')}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                {updatingActivity ? (
                                  <>
                                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Upload Proof & Mark Complete</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }))}
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    {canSubmitVerification ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        All {checklist.length} activities verified. Ready to submit for Admin Launch Approval!
                      </span>
                    ) : (
                      <span>
                        Complete all <strong>{mandatoryPendingCount} mandatory activities</strong> with photos to unlock Admin Final Approval.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCloseExecutionModal}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Close Desk
                    </button>

                    {currentSetup?.status === 'admin_verification_pending' ? (
                      <span className="px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-200">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>Submitted — Under Admin Review</span>
                      </span>
                    ) : (
                      <button
                        disabled={!canSubmitVerification}
                        onClick={() => {
                          setVerificationSetupId(currentSetup?._id);
                          setVerificationModalOpen(true);
                        }}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all ${canSubmitVerification
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit for Admin Verification</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FINAL VERIFICATION CONFIRMATION MODAL ───────────────────────────── */}
      {verificationModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Submit for Admin Final Launch</h4>
                <p className="text-xs text-slate-500">Confirm showroom inspection is 100% complete</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are certifying that you have physically inspected this showroom and verified all 16 setup criteria with attached proof photos. Admin will review and officially activate partner retail operations.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Final Inspection Summary / Remarks
              </label>
              <textarea
                rows={3}
                value={finalRemarks}
                onChange={(e) => setFinalRemarks(e.target.value)}
                placeholder="e.g. Full 360 showroom walkthrough completed. Glow signboard live, starter kits displayed, inverter tested. Ready for launch."
                className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setVerificationModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={submittingVerification}
                onClick={handleSubmitFinalVerification}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {submittingVerification ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE FULL PREVIEW MODAL ────────────────────────────────────────── */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-70 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex items-center justify-center">
            <img
              src={previewImageModal}
              alt="Full Preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
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
    in_progress: { label: 'In Progress', bg: 'bg-amber-50 text-amber-800 border-amber-300 font-bold' },
    on_track: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    due_soon: { label: 'Due Soon', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    delayed: { label: `Delayed (${delayDays || 0}d)`, bg: 'bg-red-50 text-red-700 border-red-200' },
    delay_approval_pending: { label: 'Extension Pending', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    delay_approved: { label: 'Extension Approved', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    delay_rejected: { label: 'Extension Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    setup_completed: { label: 'Setup Completed', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    admin_verification_pending: { label: 'Verification Pending', bg: 'bg-cyan-50 text-cyan-800 border-cyan-300 font-bold' },
    correction_required: { label: 'Correction Required', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    admin_verified: { label: 'Admin Verified', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' },
    operations_started: { label: 'Operations Live', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black' },
    cancelled: { label: 'Cancelled', bg: 'bg-slate-100 text-slate-500 border-slate-200' },
  };

  const c = configs[status] || { label: status, bg: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${c.bg}`}>
      {c.label}
    </span>
  );
}
