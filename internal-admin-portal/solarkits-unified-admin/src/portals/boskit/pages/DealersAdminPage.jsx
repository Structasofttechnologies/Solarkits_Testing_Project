import React, { useState, useEffect } from "react";
import { FiUsers, FiSearch, FiRefreshCw } from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DealersAdminPage() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDealers = () => {
    setLoading(true);
    axios
      .get(`${API_BASE}/boskit/v1/admin/dealers`, {
        params: { search: search || undefined },
      })
      .then((res) => {
        if (res.data?.success) setDealers(res.data.dealers || []);
      })
      .catch((err) => console.error("Error fetching dealers:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDealers();
  }, [search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary">
            Dealer & Installer Network
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Overview of all local solar dealers registered under regional distributors.
          </p>
        </div>

        <button
          onClick={fetchDealers}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover text-text-primary border border-border shadow-sm flex items-center gap-2 self-start transition-colors cursor-pointer"
        >
          <FiRefreshCw className={loading ? "animate-spin text-primary" : "text-primary"} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dealer name, email, mobile..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-hover/50 border border-border text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:bg-surface focus:outline-none transition-colors"
          />
        </div>
        <span className="text-xs text-text-muted font-semibold hidden sm:inline">
          {dealers.length} Dealers Registered
        </span>
      </div>

      {/* Dealers Table */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
              <tr>
                <th className="p-3.5">Dealer Details</th>
                <th className="p-3.5">Dealer Code</th>
                <th className="p-3.5">Assigned Distributor Hub</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted">
                    <div className="inline-flex items-center gap-2">
                      <FiRefreshCw className="animate-spin text-primary" /> Loading dealers...
                    </div>
                  </td>
                </tr>
              ) : dealers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted font-medium">
                    No dealers registered yet.
                  </td>
                </tr>
              ) : (
                dealers.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-text-primary text-sm">{d.business_name}</div>
                      <div className="text-[11px] text-text-muted">{d.email} • {d.mobile}</div>
                    </td>
                    <td className="p-3.5 font-mono text-primary font-bold">
                      {d.dealer_code || 'BK-DLR-001'}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-amber-600">{d.distributor_name}</span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          d.activation_status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}
                      >
                        {d.activation_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-text-muted">
                      {new Date(d.created_at).toLocaleDateString('en-IN')}
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

