import React, { useState, useEffect } from 'react';
import {
  FiX,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiFilter,
  FiExternalLink,
} from 'react-icons/fi';
import { mainDashboardApi } from '../../../api/mainDashboardApi';

export default function DashboardDrilldownDrawer({
  isOpen,
  onClose,
  section = 'enquiries',
  kpiId = null,
  title = 'Detailed Records',
  filters = {},
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');

  // Fetch detailed records when open, section, kpiId, page, or filters change
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);

    mainDashboardApi
      .getDrillDownRecords({
        section,
        kpiId,
        page,
        limit: 15,
        dateRange: filters.dateRange,
        startDate: filters.startDate,
        endDate: filters.endDate,
        state: filters.state,
        district: filters.district,
      })
      .then((res) => {
        if (!isMounted) return;
        if (res?.success) {
          setRecords(res.records || []);
          setTotalPages(res.totalPages || 1);
          setTotalCount(res.totalCount || 0);
        }
      })
      .catch((err) => {
        console.warn('Drill-down error:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, section, kpiId, page, filters.dateRange, filters.startDate, filters.endDate, filters.state, filters.district]);

  if (!isOpen) return null;

  // Filter records locally by search term
  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.lead_id && r.lead_id.toLowerCase().includes(s)) ||
      (r.name && r.name.toLowerCase().includes(s)) ||
      (r.company_name && r.company_name.toLowerCase().includes(s)) ||
      (r.prospect_name && r.prospect_name.toLowerCase().includes(s)) ||
      (r.contact_name && r.contact_name.toLowerCase().includes(s)) ||
      (r.customer_name && r.customer_name.toLowerCase().includes(s)) ||
      (r.mobile_number && r.mobile_number.toLowerCase().includes(s)) ||
      (r.phone && r.phone.toLowerCase().includes(s)) ||
      (r.order_number && r.order_number.toLowerCase().includes(s)) ||
      (r.quote_number && r.quote_number.toLowerCase().includes(s)) ||
      (r.state_name && r.state_name.toLowerCase().includes(s)) ||
      (r.district_name && r.district_name.toLowerCase().includes(s)) ||
      (r.gstin && r.gstin.toLowerCase().includes(s)) ||
      (r._id && String(r._id).toLowerCase().includes(s))
    );
  });

  // Export to CSV
  const handleExportCsv = () => {
    if (records.length === 0) return;
    const headers = Object.keys(records[0]).filter(k => typeof records[0][k] !== 'object');
    const csvContent = [
      headers.join(','),
      ...records.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${section}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-card-dark h-full shadow-2xl flex flex-col justify-between border-l border-border dark:border-border-dark animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-border/70 dark:border-border-dark flex items-center justify-between bg-bg-light/40 dark:bg-bg-dark/40">
          <div>
            <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">{title}</h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Total {totalCount.toLocaleString()} matching records in selected date & location filters
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-secondary hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar inside Drawer */}
        <div className="px-6 py-3 border-b border-border/50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <FiSearch className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by ID, name, company or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="text-xs text-text-secondary">
            Page {page} of {totalPages}
          </div>
        </div>

        {/* Table Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-text-secondary">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading detailed records...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-text-secondary text-xs">
              No matching records found for this view.
            </div>
          ) : (
            <div className="border border-border/80 dark:border-border-dark rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-light/70 dark:bg-bg-dark/70 text-text-secondary border-b border-border/60">
                  {section === 'website' && (
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Session ID</th>
                      <th className="py-2.5 px-3 font-semibold">Traffic Source</th>
                      <th className="py-2.5 px-3 font-semibold">Landing Page</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Form Submitted</th>
                    </tr>
                  )}
                  {section === 'enquiries' && (
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Enquiry ID</th>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Customer / Company</th>
                      <th className="py-2.5 px-3 font-semibold">Source</th>
                      <th className="py-2.5 px-3 font-semibold">State & District</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  )}
                  {section === 'epcs' && (
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">EPC ID</th>
                      <th className="py-2.5 px-3 font-semibold">Company Name</th>
                      <th className="py-2.5 px-3 font-semibold">GSTIN</th>
                      <th className="py-2.5 px-3 font-semibold">State</th>
                      <th className="py-2.5 px-3 font-semibold">Verification Status</th>
                      <th className="py-2.5 px-3 font-semibold">Behavior Status</th>
                    </tr>
                  )}
                  {(section === 'revenue' || section === 'orders') && (
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Order Number</th>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">State / Location</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Order Value</th>
                      <th className="py-2.5 px-3 font-semibold">Order Status</th>
                      <th className="py-2.5 px-3 font-semibold">Payment Status</th>
                    </tr>
                  )}
                  {(section === 'quotes' || section === 'demand') && (
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Quote Number</th>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Customer / EPC</th>
                      <th className="py-2.5 px-3 font-semibold">Location</th>
                      <th className="py-2.5 px-3 font-semibold">Capacity</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Quantity</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Total Amount</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  )}
                  {(section === 'pipeline' || section === 'leads') && (
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Lead ID</th>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Type</th>
                      <th className="py-2.5 px-3 font-semibold">Prospect / Company</th>
                      <th className="py-2.5 px-3 font-semibold">Contact</th>
                      <th className="py-2.5 px-3 font-semibold">State & District</th>
                      <th className="py-2.5 px-3 font-semibold">Source</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredRecords.map((r, i) => (
                    <tr key={r._id || i} className="hover:bg-primary/5 transition-colors">
                      {section === 'website' && (
                        <>
                          <td className="py-2.5 px-3">{new Date(r.created_at || Date.now()).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">{r.visitor_session_id?.slice(0, 12) || 'Direct'}</td>
                          <td className="py-2.5 px-3 font-medium">{r.utm_source || r.referrer || 'Direct'}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{r.landing_url || '/'}</td>
                          <td className="py-2.5 px-3 text-center">
                            {r.has_form_submitted ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Yes</span>
                            ) : (
                              <span className="text-text-secondary">No</span>
                            )}
                          </td>
                        </>
                      )}
                      {section === 'enquiries' && (
                        <>
                          <td className="py-2.5 px-3 font-bold text-primary">{r.lead_id}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{new Date(r.created_at || Date.now()).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 font-semibold">{r.company_name || r.name || 'Contractor'}</td>
                          <td className="py-2.5 px-3">{r.lead_source || 'website'}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{r.state_name || 'N/A'}, {r.district_name || ''}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              {r.lead_status || 'New'}
                            </span>
                          </td>
                        </>
                      )}
                      {section === 'epcs' && (
                        <>
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">{r._id?.slice(-6).toUpperCase()}</td>
                          <td className="py-2.5 px-3 font-semibold">{r.company_name || r.name || 'Contractor'}</td>
                          <td className="py-2.5 px-3 font-mono">{r.gstin || 'Pending'}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{r.state_name || 'All India'}</td>
                          <td className="py-2.5 px-3">
                            {r.is_verified || r.is_gstin_active || (r.gstin && r.gstin.length >= 10) || r.gst_verification_status === 'verified' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                GST Verified
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                Pending Verification
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.behavior_status === 'active' || r.is_active || r.is_behavior_active
                                ? 'bg-primary/10 text-primary'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {r.behavior_status || (r.is_active || r.is_behavior_active ? 'active' : 'inactive')}
                            </span>
                          </td>
                        </>
                      )}
                      {(section === 'revenue' || section === 'orders') && (
                        <>
                          <td className="py-2.5 px-3 font-bold text-primary">{r.order_number}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{new Date(r.created_at || Date.now()).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3">{r.delivery_address?.state_name || 'Regional'}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                            ₹{Math.round((r.grand_total_paise || 0) / 100).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                              {r.order_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">{r.payment_status || 'pending'}</td>
                        </>
                      )}
                      {(section === 'quotes' || section === 'demand') && (
                        <>
                          <td className="py-2.5 px-3 font-bold text-primary font-mono">{r.quote_number || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{new Date(r.created_at || Date.now()).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 font-semibold text-text-primary dark:text-text-primary-dark">
                            {r.customer_name || r.epc_snapshot?.company_name || r.epc_snapshot?.contact_person || 'EPC Contractor'}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">
                            {r.location || r.territory?.state_name || r.epc_snapshot?.state_name || 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">{r.capacity_display || (r.kit_capacity_kw ? `${r.kit_capacity_kw} kW` : (r.total_kw ? `${r.total_kw} kW` : 'N/A'))}</td>
                          <td className="py-2.5 px-3 text-right font-bold">{r.quantity || 1}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                            ₹{(r.total_amount || Math.round((r.total_amount_paise || 0) / 100)).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 capitalize">
                              {r.status || 'generated'}
                            </span>
                          </td>
                        </>
                      )}
                      {(section === 'pipeline' || section === 'leads') && (
                        <>
                          <td className="py-2.5 px-3 font-bold text-primary font-mono">{r.lead_id}</td>
                          <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{new Date(r.created_at || Date.now()).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.lead_type === 'BDE Sales Lead'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                            }`}>
                              {r.lead_type || 'Sales Lead'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-text-primary dark:text-text-primary-dark">
                            {r.company_name || r.contact_name || r.prospect_name || r.name || 'Prospect'}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary font-mono text-[11px]">
                            {r.mobile_number || r.phone || 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">
                            {[r.state_name, r.district_name].filter(Boolean).join(', ') || 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary capitalize">
                            {(r.lead_source || 'direct').replace(/_/g, ' ')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 capitalize">
                              {r.status_label || r.lead_status || 'New'}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drawer Footer with Pagination */}
        <div className="px-6 py-3.5 border-t border-border/70 dark:border-border-dark flex items-center justify-between bg-bg-light/40 dark:bg-bg-dark/40 text-xs">
          <div className="text-text-secondary">
            Showing records {(page - 1) * 15 + 1} to {Math.min(page * 15, totalCount)} of {totalCount}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-border/70 hover:bg-bg-light disabled:opacity-40 transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-bold text-text-primary dark:text-text-primary-dark">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-border/70 hover:bg-bg-light disabled:opacity-40 transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
