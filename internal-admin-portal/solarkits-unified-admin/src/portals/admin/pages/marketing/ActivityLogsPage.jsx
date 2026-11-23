import React, { useState } from 'react';
import {
  FaHistory,
  FaSearch,
  FaFilter,
  FaDownload,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserShield,
  FaCalendarAlt,
  FaDesktop,
  FaEye,
  FaTimes
} from 'react-icons/fa';

export default function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  const [logs] = useState([
    {
      _id: 'log-001',
      timestamp: '18 Nov 2026, 08:30 PM',
      user: { name: 'Rahil Sunnovative', role: 'Super Admin', initials: 'RS' },
      action: 'Campaign Launched',
      target: 'Diwali 3kW EPC Wholesale Flash Sale (CMP-2026-11-001)',
      ipAddress: '103.21.58.14',
      location: 'Mumbai, MH',
      status: 'Success',
      details: 'Dispatched 9,840 deduplicated messages across Bhiwandi & Pune clusters via WhatsApp API and SMTP Sender #1.'
    },
    {
      _id: 'log-002',
      timestamp: '18 Nov 2026, 06:15 PM',
      user: { name: 'Pooja Verma', role: 'Campaign Manager', initials: 'PV' },
      action: 'Template Approved & Saved',
      target: 'Commercial Kit 3kW Diwali Slashed Price',
      ipAddress: '49.36.120.45',
      location: 'Pune, MH',
      status: 'Success',
      details: 'Updated HTML markup with verified solar kit pricing: ₹1,35,000 and updated tracking URL.'
    },
    {
      _id: 'log-003',
      timestamp: '18 Nov 2026, 04:45 PM',
      user: { name: 'Amitabh Sen', role: 'Operations Head', initials: 'AS' },
      action: 'Sender Added',
      target: 'WhatsApp Business Number (+91 98200 12345)',
      ipAddress: '115.111.45.9',
      location: 'Bhiwandi, MH',
      status: 'Success',
      details: 'Registered Meta Cloud API Phone Number ID: 109283746519283 with high-volume tier.'
    },
    {
      _id: 'log-004',
      timestamp: '18 Nov 2026, 02:10 PM',
      user: { name: 'Rahil Sunnovative', role: 'Super Admin', initials: 'RS' },
      action: 'Form Mapping Updated',
      target: 'Become Solar EPC Partner Form (#FRM-EPC-01)',
      ipAddress: '103.21.58.14',
      location: 'Mumbai, MH',
      status: 'Success',
      details: 'Mapped UTM parameters utm_source, utm_campaign, and set SLA routing to Bhiwandi BDE desk.'
    },
    {
      _id: 'log-005',
      timestamp: '17 Nov 2026, 11:20 PM',
      user: { name: 'System Scheduler', role: 'Cron Daemon', initials: 'SYS' },
      action: 'Auto-Pause Triggered',
      target: 'Rajasthan Solar Subsidy Push (CMP-2026-11-004)',
      ipAddress: '127.0.0.1 (Local)',
      location: 'Server Core',
      status: 'Warning',
      details: 'Bounce rate reached 5.2% due to invalid mobile list from external vendor. Dispatch automatically halted.'
    },
    {
      _id: 'log-006',
      timestamp: '17 Nov 2026, 05:40 PM',
      user: { name: 'Pooja Verma', role: 'Campaign Manager', initials: 'PV' },
      action: 'MIS Report Exported',
      target: 'Campaign Performance & Conversion Analytics (XLSX)',
      ipAddress: '49.36.120.45',
      location: 'Pune, MH',
      status: 'Success',
      details: 'Downloaded full 6-stage funnel attribution report for FY 2026-27 Q3 management review.'
    }
  ]);

  const filtered = logs.filter(item => {
    const matchesSearch =
      item.action.toLowerCase().includes(search.toLowerCase()) ||
      item.target.toLowerCase().includes(search.toLowerCase()) ||
      item.user.name.toLowerCase().includes(search.toLowerCase()) ||
      item.ipAddress.includes(search);

    const matchesAction =
      selectedAction === 'ALL' ||
      (selectedAction === 'LAUNCH' && item.action.includes('Launched')) ||
      (selectedAction === 'TEMPLATE' && item.action.includes('Template')) ||
      (selectedAction === 'SENDER' && item.action.includes('Sender')) ||
      (selectedAction === 'REPORT' && item.action.includes('Report'));

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaHistory className="w-3.5 h-3.5" />
            <span>Audit Trail & Security</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Campaign Activity & Audit Logs</h1>
          <p className="text-sm text-slate-500">Immutable chronological log of all campaign dispatches, sender modifications, template revisions, and user operations.</p>
        </div>

        <button
          onClick={() => alert('Exporting complete audit trail (CSV format)...')}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <FaDownload className="text-slate-500" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by User, Action, Target Campaign, IP address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-hidden"
          >
            <option value="ALL">All Activity Types</option>
            <option value="LAUNCH">Campaign Launches</option>
            <option value="TEMPLATE">Template Updates</option>
            <option value="SENDER">Sender & Number Changes</option>
            <option value="REPORT">MIS Reports & Exports</option>
          </select>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="p-3 pl-4">Timestamp</th>
                <th className="p-3">User & Role</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target Reference</th>
                <th className="p-3">IP & Location</th>
                <th className="p-3">Status</th>
                <th className="p-3 pr-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
              {filtered.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="p-3 pl-4 text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {log.user.initials}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">{log.user.name}</div>
                        <div className="text-[10px] text-slate-400">{log.user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">
                    {log.action}
                  </td>
                  <td className="p-3 max-w-xs truncate" title={log.target}>
                    {log.target}
                  </td>
                  <td className="p-3 text-[11px] text-slate-500">
                    <div>{log.ipAddress}</div>
                    <div className="text-[10px] text-slate-400">{log.location}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'Success'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 text-xs cursor-pointer"
                      title="View Full Payload Details"
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold">Audit Event Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <FaTimes />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-400">Event Action:</span>
                <span className="font-bold">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-400">Timestamp:</span>
                <span>{selectedLog.timestamp}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-400">Operator:</span>
                <span className="font-semibold">{selectedLog.user.name} ({selectedLog.user.role})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-400">Target Resource:</span>
                <span className="font-mono">{selectedLog.target}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-400">Network & Geolocation:</span>
                <span>{selectedLog.ipAddress} • {selectedLog.location}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Execution Audit Trail:</span>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {selectedLog.details}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
