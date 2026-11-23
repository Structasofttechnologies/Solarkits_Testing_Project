import React, { useState } from 'react';
import { FaFileExcel, FaDownload, FaFilter, FaChartBar, FaTable } from 'react-icons/fa';

export default function MarketingReportsPage() {
  const [selectedReport, setSelectedReport] = useState('performance');
  const [dateFilter, setDateFilter] = useState('last_30_days');

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

  const demoRows = [
    {
      campaign: 'Maharashtra Cluster — 3 kW Repeat Orders',
      channel: 'Both',
      manager: 'Rahul Sharma',
      sent: 4200,
      delivered: 3950,
      delivery_rate: '94.0%',
      clicks: 680,
      visits: 620,
      leads: 95,
      qualified: 52,
      orders: 28,
      revenue: '₹37,80,000',
      budget: '₹45,000',
      roi: '+8300%'
    },
    {
      campaign: 'Gujarat Commercial EPC Onboarding & Reward Trip',
      channel: 'WhatsApp',
      manager: 'Priya Patel',
      sent: 3500,
      delivered: 3350,
      delivery_rate: '95.7%',
      clicks: 810,
      visits: 760,
      leads: 120,
      qualified: 68,
      orders: 18,
      revenue: '₹24,30,000',
      budget: '₹30,000',
      roi: '+8000%'
    },
    {
      campaign: 'BOS Kit & Inverter Flash Coupon Clearance',
      channel: 'Email',
      manager: 'Amit Verma',
      sent: 5800,
      delivered: 5500,
      delivery_rate: '94.8%',
      clicks: 920,
      visits: 850,
      leads: 110,
      qualified: 48,
      orders: 34,
      revenue: '₹18,50,000',
      budget: '₹20,000',
      roi: '+9150%'
    }
  ];

  const handleExportCsv = () => {
    const headers = ['Campaign', 'Channel', 'Manager', 'Sent', 'Delivered', 'Delivery Rate', 'Clicks', 'Visits', 'Leads', 'Qualified', 'Orders', 'Revenue', 'Budget', 'ROI'];
    const rows = demoRows.map(r => [
      `"${r.campaign}"`,
      r.channel,
      r.manager,
      r.sent,
      r.delivered,
      r.delivery_rate,
      r.clicks,
      r.visits,
      r.leads,
      r.qualified,
      r.orders,
      `"${r.revenue}"`,
      `"${r.budget}"`,
      r.roi
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `solarkits_${selectedReport}_report.csv`);
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
            <span>Consolidated Marketing Intelligence</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Campaign Reports & Export</h1>
          <p className="text-sm text-slate-500">
            Generate 10 specialized marketing reports with full channel attribution and download CSV/Excel exports.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
        >
          <FaDownload />
          <span>Export Excel / CSV</span>
        </button>
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
            {reportTypes.map(r => (
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

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Campaign Name</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Manager</th>
                <th className="py-3.5 px-4">Sent</th>
                <th className="py-3.5 px-4">Delivered</th>
                <th className="py-3.5 px-4">Delivery Rate</th>
                <th className="py-3.5 px-4">Clicks</th>
                <th className="py-3.5 px-4">Leads</th>
                <th className="py-3.5 px-4">Qualified</th>
                <th className="py-3.5 px-4">Orders</th>
                <th className="py-3.5 px-4">Revenue</th>
                <th className="py-3.5 px-4">Budget</th>
                <th className="py-3.5 px-4 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {demoRows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-[220px]">{r.campaign}</td>
                  <td className="py-3.5 px-4">{r.channel}</td>
                  <td className="py-3.5 px-4 text-slate-500">{r.manager}</td>
                  <td className="py-3.5 px-4">{r.sent.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4">{r.delivered.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 font-bold text-indigo-600">{r.delivery_rate}</td>
                  <td className="py-3.5 px-4">{r.clicks}</td>
                  <td className="py-3.5 px-4 font-bold">{r.leads}</td>
                  <td className="py-3.5 px-4 text-blue-600">{r.qualified}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600">{r.orders}</td>
                  <td className="py-3.5 px-4 font-bold">{r.revenue}</td>
                  <td className="py-3.5 px-4 text-slate-500">{r.budget}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">{r.roi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
