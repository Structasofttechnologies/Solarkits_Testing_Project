import React, { useState, useEffect } from 'react';
import {
  FiShield,
  FiSearch,
  FiRefreshCw,
  FiActivity,
  FiUser,
  FiClock,
  FiLock,
} from 'react-icons/fi';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    axios
      .get(`${API_BASE}/boskit/v1/admin/audit-logs`, {
        params: {
          actor_type: actorFilter !== 'all' ? actorFilter : undefined,
          search: search || undefined,
        },
      })
      .then((res) => {
        if (res.data?.success) setLogs(res.data.logs || []);
      })
      .catch((err) => console.error('Error fetching audit logs:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [actorFilter, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Security & Governance
          </span>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1.5">
            BOSKIT Business Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Immutable, append-only logs capturing all distributor activations, order commitments, and credential access.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover text-text-primary border border-border shadow-sm flex items-center gap-2 self-start sm:self-auto transition-colors cursor-pointer"
        >
          <FiRefreshCw className={loading ? 'animate-spin text-primary' : 'text-primary'} /> Refresh Stream
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-3 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, entity ID or module..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-border text-text-primary placeholder:text-text-muted text-xs focus:border-primary focus:outline-none shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', name: 'All Actors' },
            { id: 'cms_user', name: 'Admin Staff' },
            { id: 'boskit_distributor', name: 'Distributors' },
            { id: 'boskit_dealer', name: 'Dealers' },
            { id: 'system', name: 'Automated System' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActorFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                actorFilter === f.id
                  ? 'bg-primary text-white font-bold shadow-md shadow-primary/20'
                  : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
              <tr>
                <th className="p-3.5">Action Code</th>
                <th className="p-3.5">Actor Type</th>
                <th className="p-3.5">Entity Reference</th>
                <th className="p-3.5">Source IP</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted font-sans">
                    Querying audit stream...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted font-sans">
                    No audit records matching this filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="p-3.5">
                      <span className="font-bold text-amber-600 font-sans text-xs">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-hover text-text-secondary border border-border">
                        {log.actor_type}
                      </span>
                    </td>
                    <td className="p-3.5 text-[11px] text-text-secondary">
                      <div className="font-medium text-text-primary">{log.entity_type}</div>
                      <span className="text-[10px] text-text-muted">{log.entity_id || 'N/A'}</span>
                    </td>
                    <td className="p-3.5 text-text-muted text-[11px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="p-3.5 text-text-muted text-[11px]">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

