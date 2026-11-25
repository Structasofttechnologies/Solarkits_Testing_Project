import React, { useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaShieldAlt, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';

export default function KycReviewModal({ isOpen, onClose, bde, onReviewSuccess }) {
  const [action, setAction] = useState('verify');
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !bde) return null;

  const kyc = bde.kyc || {
    aadhaar_masked: bde.aadhaar_masked,
    pan_masked: bde.pan_masked,
    aadhaar_document_url: bde.aadhaar_document_url,
    pan_document_url: bde.pan_document_url,
    kyc_status: bde.kyc_status,
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError(null);
    setLoading(true);

    try {
      if (action === 'reject' && !rejectionReason.trim()) {
        setError('Please provide a rejection reason.');
        setLoading(false);
        return;
      }

      await onReviewSuccess({
        action,
        remarks,
        rejection_reason: rejectionReason,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit KYC review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-slate-50 to-white">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-100 text-[#0575B8] rounded-2xl shadow-xs">
              <FaShieldAlt className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">BDE KYC Verification</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Review documents for <span className="font-bold text-slate-900">{bde.full_name}</span> ({bde.bde_id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2 font-semibold">
              <FaTimesCircle className="text-rose-600 shrink-0" /> {error}
            </div>
          )}

          {/* KYC Details Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Aadhaar Number</span>
              <div className="text-base font-bold text-slate-900 font-mono">
                {kyc.aadhaar_masked || 'XXXXXXXXXXXX'}
              </div>
              {kyc.aadhaar_document_url ? (
                <a
                  href={kyc.aadhaar_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0575B8] hover:underline mt-1"
                >
                  <FaExternalLinkAlt className="text-[10px]" /> View Aadhaar Proof
                </a>
              ) : (
                <span className="text-xs text-amber-600 font-medium">No document attached</span>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">PAN Number</span>
              <div className="text-base font-bold text-slate-900 font-mono uppercase">
                {kyc.pan_masked || 'XXXXXXXXXX'}
              </div>
              {kyc.pan_document_url ? (
                <a
                  href={kyc.pan_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0575B8] hover:underline mt-1"
                >
                  <FaExternalLinkAlt className="text-[10px]" /> View PAN Proof
                </a>
              ) : (
                <span className="text-xs text-amber-600 font-medium">No document attached</span>
              )}
            </div>
          </div>

          {/* Review Decision Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Review Decision *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAction('verify')}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                    action === 'verify'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FaCheckCircle className={action === 'verify' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>Verify & Approve KYC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('reject')}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                    action === 'reject'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FaTimesCircle className={action === 'reject' ? 'text-rose-600' : 'text-slate-400'} />
                  <span>Reject KYC Request</span>
                </button>
              </div>
            </div>

            {action === 'reject' && (
              <div className="space-y-1.5">
                <label className="font-bold text-rose-700 uppercase tracking-wider block text-[11px]">Rejection Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why KYC was rejected (e.g. Blurry Aadhaar copy or PAN mismatch)..."
                  className="w-full px-3.5 py-2.5 bg-rose-50/50 border border-rose-300 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Admin Remarks / Internal Notes</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional audit remarks..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-[#0575B8] focus:bg-white"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
                  action === 'verify'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {loading ? 'Submitting...' : action === 'verify' ? 'Confirm KYC Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
