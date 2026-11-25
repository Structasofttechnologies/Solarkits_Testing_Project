import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RotateCw, 
  Check, 
  X, 
  MapPin, 
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { bdeApi } from '../../../api/bdeApi';

export default function TerritoryExceptions({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Review Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const res = await bdeApi.listTerritoryExceptions({ status: statusFilter }, moduleUniqueId);
      if (res?.status === 'success') {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load territory exceptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [statusFilter]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await bdeApi.reviewTerritoryException(selectedRequest._id, {
        decision,
        admin_remarks: remarks,
      }, moduleUniqueId);

      if (res?.status === 'success') {
        alert(`Request ${decision} successfully.`);
        setSelectedRequest(null);
        setRemarks('');
        fetchExceptions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review exception request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Outside-Territory Approval Requests
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            BDE requests to create prospect leads or sign partners in non-assigned states/districts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              statusFilter === ''
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Requests
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold bg-slate-50/80">
                <th className="py-3.5 px-4">BDE Officer</th>
                <th className="py-3.5 px-4">Prospect & Company</th>
                <th className="py-3.5 px-4">Requested Territory</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No territory exception requests matching criteria.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.bde_id?.full_name || r.bde_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{r.bde_id?.bde_id}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{r.company_name || r.lead_id?.company_name}</div>
                      <div className="text-xs text-slate-500">{r.prospect_name || r.lead_id?.prospect_name}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      <div className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        <span>{r.requested_district}, {r.requested_state}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {r.requested_plan_id?.name || r.requested_plan_name || 'Standard Franchisee'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-xs max-w-xs truncate">
                      {r.reason}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                        r.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : r.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {r.status === 'pending' ? (
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setDecision('approved');
                            setRemarks('');
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          Review Request
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Review Outside-Territory Request</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-1.5 text-slate-700">
              <div><strong>BDE Officer:</strong> {selectedRequest.bde_id?.full_name || selectedRequest.bde_name}</div>
              <div><strong>Prospect Company:</strong> {selectedRequest.company_name}</div>
              <div><strong>Requested Territory:</strong> {selectedRequest.requested_district}, {selectedRequest.requested_state}</div>
              <div><strong>BDE Justification:</strong> {selectedRequest.reason}</div>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="approved">Approve Outside-Territory Lead</option>
                  <option value="rejected">Reject Request</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Admin Remarks</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Notes explaining approval or rejection reason..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
