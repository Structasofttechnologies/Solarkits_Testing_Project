import React, { useState, useEffect, useCallback } from 'react';
import { FaDownload, FaTable, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { marketingHttp, extractApiError } from './services/marketingApi';

export default function MarketingReportsPage() {
  const [selectedReport, setSelectedReport] = useState('performance');
  const [dateFilter, setDateFilter] = useState('last_30_days');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const reportTypes = [
    { id: 'performance', name: '1. Campaign Performance Report' },
    { id: 'email_delivery', name: '2. Email Delivery & Engagement Report' },
    { id: 'wa_delivery', name: '3. WhatsApp Delivery & Read Report' },
    { id: 'url_tracking', name: '4. Website Visits & URL Tracking Report' },
    { id: 'form_submissions', name: '5. Website Form Submission Report' },
    { id: 'lead_generation', name: '6. Lead Generation & Qualification Report' },
    { id: 'conversion_revenue', name: '7. Campaign Conversion & Revenue Report' },
    { id: 'budget_roi', name: '8. Campaign Budget & ROI Report' },
    { id: 'manager_perf', name: '9. Campaign Manager Performance Report' },
    { id: 'delivery_errors', name: '10. Failed Messages & Delivery Error Report' }
  ];

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await marketingHttp.get('/reports', {
        params: { report_type: selectedReport, period: dateFilter }
      });
      if (res.data?.success) {
        setRows(res.data.data || []);
      } else {
        setRows([]);
      }
    } catch (err) {
      setErrorMsg(extractApiError(err, 'Failed to load campaign report from database'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = () => {
    const headers = [
      'Campaign Name',
      'Code',
      'Channel',
      'Status',
      'Manager',
      'Sent',
      'Delivered',
      'Failed',
      'Delivery Rate',
      'Opened/Read',
      'Clicks',
      'Unique Clickers',
      'Top CTA',
      'CTA Breakdown',
      'Visits',
      'Leads',
      'Conversions',
      'Revenue (INR)',
      'Budget (INR)',
      'ROI'
    ];
    const csvRows = rows.map((r) => [
      `"${String(r.campaign_name || '').replace(/"/g, '""')}"`,
      `"${r.campaign_code || ''}"`,
      r.channel || '',
      r.status || '',
      `"${String(r.manager || 'Unassigned').replace(/"/g, '""')}"`,
      Number(r.messages_sent || 0),
      Number(r.delivered || 0),
      Number(r.failed || 0),
      r.delivery_rate || '0.0%',
      Number(r.opened_or_read || 0),
      Number(r.clicks || 0),
      Number(r.unique_clickers || 0),
      `"${String(r.top_cta || '').replace(/"/g, '""')}"`,
      `"${String(r.cta_breakdown_summary || '').replace(/"/g, '""')}"`,
      Number(r.website_visits || 0),
      Number(r.leads_generated || 0),
      Number(r.conversions || 0),
      Number(r.revenue || 0),
      Number(r.budget || 0),
      r.roi || '0.0%'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `solarkits_${selectedReport}_${dateFilter}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaTable className="w-3.5 h-3.5" />
            <span>Live MongoDB Marketing Intelligence</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Campaign Reports & Export</h1>
          <p className="text-sm text-slate-500">
            Live database reports with real dispatch telemetry, attribution, and CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <FaDownload />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Select Report Type & Date Filter */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase">Select Report:</label>
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold cursor-pointer"
          >
            {reportTypes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase">Date Period:</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days (Current Month)</option>
            <option value="this_quarter">Current Quarter</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <FaExclamationTriangle className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Database Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-semibold">Loading live campaign metrics from MongoDB...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-semibold">
            No campaigns found in database for the selected report type and period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Campaign Name</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Manager</th>
                  <th className="py-3.5 px-4">Sent</th>
                  <th className="py-3.5 px-4">Delivered</th>
                  <th className="py-3.5 px-4">Failed</th>
                  <th className="py-3.5 px-4">Delivery Rate</th>
                  <th className="py-3.5 px-4">Clicks &amp; Top CTA</th>
                  <th className="py-3.5 px-4">Leads</th>
                  <th className="py-3.5 px-4">Orders</th>
                  <th className="py-3.5 px-4">Revenue</th>
                  <th className="py-3.5 px-4">Budget</th>
                  <th className="py-3.5 px-4 text-right">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {rows.map((r, i) => (
                  <tr key={r.campaign_code || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-[220px]">
                      <div>{r.campaign_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{r.campaign_code} • {r.status}</div>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-xs font-bold">{r.channel}</td>
                    <td className="py-3.5 px-4 text-slate-500">{r.manager || 'Unassigned'}</td>
                    <td className="py-3.5 px-4">{Number(r.messages_sent || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">{Number(r.delivered || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-rose-600">{Number(r.failed || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600">{r.delivery_rate || '0.0%'}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold">{Number(r.clicks || 0).toLocaleString('en-IN')}</div>
                      {r.top_cta && (
                        <div className="text-[10px] text-indigo-600 font-semibold truncate max-w-[160px]" title={r.cta_breakdown_summary || r.top_cta}>
                          {r.top_cta}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold">{Number(r.leads_generated || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">{Number(r.conversions || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-bold">₹{Number(r.revenue || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-slate-500">₹{Number(r.budget || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">{r.roi || '0.0%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
