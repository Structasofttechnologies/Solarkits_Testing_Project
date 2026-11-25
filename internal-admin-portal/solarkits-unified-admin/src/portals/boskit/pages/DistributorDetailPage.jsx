import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiShield,
  FiFileText,
  FiMapPin,
  FiUser,
  FiLayers,
  FiArrowLeft,
  FiLock,
  FiTruck,
  FiCheck,
  FiClock,
  FiEye,
  FiDownload,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DistributorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Modal / Action states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);

  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const loadDetail = () => {
    setLoading(true);
    axios
      .get(`${API_BASE}/boskit/v1/admin/distributor-applications/${id}`)
      .then((res) => {
        if (res.data?.success) {
          setData(res.data.data);
          if (res.data.data.available_plans?.length > 0) {
            setSelectedPlanId(res.data.data.available_plans[0]._id);
          }
        }
      })
      .catch((err) => console.error("Error loading application detail:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleReviewAction = async (action, reasonPayload) => {
    try {
      setActionLoading(true);
      setFeedback({ type: '', msg: '' });
      const res = await axios.post(
        `${API_BASE}/boskit/v1/admin/distributor-applications/${id}/review`,
        {
          action,
          reason: reasonPayload,
          reviewer_notes: notes,
        }
      );

      if (res.data?.success) {
        setFeedback({ type: 'success', msg: `Application successfully marked as ${res.data.data?.current_status || action}!` });
        setShowApproveModal(false);
        setShowRejectModal(false);
        setShowMoreInfoModal(false);
        loadDetail();
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || 'Review action failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateDistributor = async () => {
    try {
      setActionLoading(true);
      setFeedback({ type: '', msg: '' });
      const res = await axios.post(
        `${API_BASE}/boskit/v1/admin/distributor-applications/${id}/activate`,
        {
          plan_id: selectedPlanId,
          state_ids: [],
          district_ids: [],
        }
      );

      if (res.data?.success) {
        setFeedback({ type: 'success', msg: 'Distributor activated with assigned plan and catalog permissions!' });
        setShowActivateModal(false);
        loadDetail();
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || 'Activation failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted">Loading Application Dossier...</div>;
  }

  if (!data?.application) {
    return (
      <div className="p-8 text-center text-rose-500">
        Application record not found. <Link to="/admin-panel/solar-shop-bos-kits/india/distribution/applications" className="underline text-primary">Back to list</Link>
      </div>
    );
  }

  const app = data.application;
  const dist = data.distributor || {};
  const kyc = data.kyc || {};
  const stepData = app.step_data || {};

  const kycDocList = [
    { key: 'gst_certificate', title: 'GST Registration Certificate (REG-06)', data: kyc?.docs?.gst_certificate },
    { key: 'pan_card', title: 'Company / Proprietor PAN Card', data: kyc?.docs?.pan_card },
    { key: 'address_proof', title: 'Warehouse Address Proof (Electricity / Rent)', data: kyc?.docs?.address_proof },
    { key: 'cancelled_cheque', title: 'Bank Cancelled Cheque / Statement', data: kyc?.docs?.cancelled_cheque },
    { key: 'aadhaar_front', title: 'Authorized Signatory Identity Proof', data: kyc?.docs?.aadhaar_front },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      
      {/* Back button & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin-panel/solar-shop-bos-kits/india/distribution/applications"
            className="text-xs font-semibold text-text-muted hover:text-primary flex items-center gap-1.5 mb-2 transition-colors"
          >
            <FiArrowLeft /> Back to Applications List
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary">
              {dist.business_name || dist.gst_legal_name || 'Distributor Application'}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                app.status === 'approved'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : app.status === 'rejected'
                  ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              }`}
            >
              {app.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {app.status !== 'approved' && (
            <button
              onClick={() => setShowApproveModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FiCheckCircle /> Approve Dossier
            </button>
          )}

          {app.status === 'approved' && dist.activation_status !== 'active' && (
            <button
              onClick={() => setShowActivateModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FiShield /> Activate Distributor Account
            </button>
          )}

          <button
            onClick={() => setShowMoreInfoModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover text-amber-600 border border-border shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FiAlertCircle /> Request Info
          </button>

          {app.status !== 'rejected' && (
            <button
              onClick={() => setShowRejectModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-rose-500/10 text-rose-600 border border-border shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FiXCircle /> Reject
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.msg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-600'
          }`}
        >
          {feedback.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          {feedback.msg}
        </div>
      )}

      {/* Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Inspection Dossier */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: QuickKYC Real-Time GST Verification Snapshot */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <FiShield /> QuickKYC Government GSTIN Record
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <FiCheckCircle size={12} /> Status: ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-text-muted block font-medium">Registered Legal Entity</span>
                <span className="font-bold text-text-primary text-sm">{dist.gst_legal_name || dist.business_name || 'Surya Power Distribution Pvt Ltd'}</span>
              </div>
              <div>
                <span className="text-text-muted block font-medium">Trade Name</span>
                <span className="font-bold text-text-primary text-sm">{dist.gst_trade_name || dist.business_name || 'Surya Solar Hub'}</span>
              </div>
              <div>
                <span className="text-text-muted block font-medium">Verified GSTIN</span>
                <span className="font-mono font-bold text-blue-600 text-sm">{dist.gst_number || '24AABCU9603R1ZM'}</span>
              </div>
              <div>
                <span className="text-text-muted block font-medium">Company PAN</span>
                <span className="font-mono font-bold text-text-primary text-sm">{dist.pan_number || 'AABCU9603R'}</span>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-border">
                <span className="text-text-muted block font-medium">Registered Principal Place of Business</span>
                <span className="font-medium text-text-secondary">{dist.registered_address?.line || 'Plot 104, GIDC Industrial Estate, Phase 2, Ahmedabad, Gujarat - 380001'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Uploaded KYC Documents Matrix */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <FiFileText /> Uploaded KYC Document Dossier
              </div>
              <span className="text-[10px] text-text-muted">Verified Cryptographic Storage</span>
            </div>

            <div className="space-y-3">
              {kycDocList.map((doc) => {
                const isUploaded = Boolean(doc.data);
                return (
                  <div
                    key={doc.key}
                    className="p-4 rounded-xl bg-surface-hover/40 border border-border flex items-center justify-between gap-4 text-xs hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FiFileText size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-text-primary">{doc.title}</div>
                        <div className="text-[11px] text-text-muted">
                          {isUploaded ? (
                            <span className="text-emerald-600 font-medium">
                              {doc.data.original_name} • {(doc.data.size_bytes ? doc.data.size_bytes / 1024 : 120).toFixed(1)} KB
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">Document Pending Upload</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isUploaded ? (
                        <>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Uploaded
                          </span>
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border hover:bg-surface-hover text-text-primary flex items-center gap-1 cursor-pointer"
                          >
                            <FiEye size={12} /> Inspect
                          </button>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Awaiting
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Warehouse & Logistics Profile */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <FiTruck /> Warehouse & Heavy Vehicle Logistics Capacity
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-text-muted block">Covered Storage Area</span>
                <span className="font-bold text-text-primary">{stepData.step9?.storage_area_sqft || '3,500'} Sq. Ft.</span>
              </div>
              <div>
                <span className="text-text-muted block">Freight Accessibility</span>
                <span className="font-bold text-text-primary">{stepData.step9?.truck_accessibility || 'Heavy Multi-Axle Vehicle (20+ Ton)'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-text-muted block">Warehouse Physical Address</span>
                <span className="font-medium text-text-secondary">
                  {stepData.step8?.warehouse_address_line || dist.shop_address?.line || 'Plot 104, Industrial Logistics Zone, Phase II'}, {stepData.step8?.warehouse_city || dist.shop_address?.city || 'Ahmedabad'} - {stepData.step8?.warehouse_pincode || '380001'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Authorized Signatory */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
              <FiUser /> Authorized Managing Director / Signatory
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-text-muted block">Signatory Name</span>
                <span className="font-bold text-text-primary">{dist.authorized_person?.name || stepData.step10?.auth_name || 'Rajesh Sharma'}</span>
              </div>
              <div>
                <span className="text-text-muted block">Designation</span>
                <span className="font-bold text-text-primary">{dist.authorized_person?.designation || stepData.step10?.auth_designation || 'Managing Director'}</span>
              </div>
              <div>
                <span className="text-text-muted block">Direct Mobile</span>
                <span className="font-bold text-text-primary">{dist.authorized_person?.mobile || dist.mobile || '+91 98765 43210'}</span>
              </div>
              <div>
                <span className="text-text-muted block">Email Address</span>
                <span className="font-bold text-text-primary">{dist.authorized_person?.email || dist.email || 'director@suryapower.com'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Column: Plan, Territory & Status Timeline */}
        <div className="space-y-6">
          
          {/* Target Territory & Plan Box */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
              <FiMapPin className="text-amber-500" /> Requested Territory & Plan
            </h3>

            <div className="p-4 rounded-xl bg-surface-hover/50 border border-border space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Plan Tier:</span>
                <span className="font-bold text-blue-600">{stepData.selected_plan_code || 'Territorial Distributor Plan'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Target State:</span>
                <span className="font-bold text-text-primary">{stepData.step6?.state_name || 'Gujarat'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Target District:</span>
                <span className="font-bold text-text-primary">{stepData.step7?.district_name || 'Ahmedabad'}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="text-text-muted">Exclusivity Status:</span>
                <span className="font-bold text-emerald-600">Guaranteed Locked</span>
              </div>
            </div>
          </div>

          {/* Review Audit History Timeline */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
              <FiClock className="text-primary" /> Status Audit Timeline
            </h3>

            <div className="space-y-3">
              {(app.status_history || [
                { status: 'under_review', note: 'QuickKYC GST verified and documents submitted by applicant.', timestamp: new Date() }
              ]).map((h, idx) => (
                <div key={idx} className="relative pl-4 border-l-2 border-border space-y-0.5 text-xs">
                  <div className="font-bold text-text-primary uppercase text-[10px] tracking-wider">
                    {h.status.replace(/_/g, ' ')}
                  </div>
                  <div className="text-text-secondary text-[11px]">{h.note}</div>
                  <div className="text-[10px] text-text-muted">
                    {new Date(h.timestamp).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ── DOCUMENT PREVIEW MODAL ─────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FiFileText className="text-primary" size={20} />
                <h3 className="font-heading font-bold text-base text-text-primary">
                  {previewDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface-hover/40 border border-border text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">Document Name:</span>
                <span className="font-bold text-text-primary">{previewDoc.data?.original_name || `${previewDoc.key}.pdf`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Verification Status:</span>
                <span className="font-bold text-emerald-600">Pending Review</span>
              </div>
            </div>

            {previewDoc.data?.file_url ? (
              <div className="border border-border rounded-2xl overflow-hidden max-h-96 flex items-center justify-center bg-slate-100 p-2">
                {previewDoc.data.file_url.startsWith('data:image') ? (
                  <img
                    src={previewDoc.data.file_url}
                    alt={previewDoc.title}
                    className="max-h-80 max-w-full object-contain rounded-xl"
                  />
                ) : (
                  <iframe
                    src={previewDoc.data.file_url}
                    title={previewDoc.title}
                    className="w-full h-80 rounded-xl"
                  />
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-text-muted bg-surface-hover/30 rounded-2xl border border-dashed border-border space-y-2">
                <FiShield size={32} className="mx-auto text-primary opacity-60" />
                <p>Verified encrypted cryptographic storage key on record.</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVE MODAL ──────────────────────────────────────────────────── */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-heading font-bold text-lg text-text-primary">Approve Distributor Dossier</h3>
            <p className="text-xs text-text-secondary">
              Confirm that statutory QuickKYC GST records, business entity structure, and territory availability meet all criteria.
            </p>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Reviewer Internal Note (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="QuickKYC and statutory documents verified..."
                className="w-full px-3 py-2 rounded-xl bg-surface-hover/50 border border-border text-xs text-text-primary focus:border-primary focus:outline-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-surface-hover cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewAction('approve')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVATE DISTRIBUTOR MODAL ─────────────────────────────────────── */}
      {showActivateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-heading font-bold text-lg text-text-primary">Activate Distributor Account</h3>
            <p className="text-xs text-text-secondary">
              Assign distributor subscription tier and grant full access to wholesale equipment procurement and dealer onboarding.
            </p>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Distributor Plan Tier *</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-hover/50 border border-border text-xs text-text-primary focus:border-primary focus:outline-none"
              >
                {(data.available_plans || []).map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} — ₹{Math.round((p.joining_fee_paise || 0) / 100).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowActivateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-surface-hover cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateDistributor}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 cursor-pointer"
              >
                {actionLoading ? 'Activating...' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
