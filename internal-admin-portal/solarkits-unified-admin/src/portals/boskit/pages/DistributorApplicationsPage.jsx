import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiFileText,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiEye,
  FiRefreshCw,
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_TABS = [
  { label: "All Applications", value: "all" },
  { label: "Under Review", value: "under_review" },
  { label: "GST Verified", value: "gst_verified" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default function DistributorApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("status") || "all";

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchApps = () => {
    setLoading(true);
    axios
      .get(`${API_BASE}/boskit/v1/admin/distributor-applications`, {
        params: {
          status: currentTab,
          search: search || undefined,
          page,
          limit: 10,
        },
      })
      .then((res) => {
        if (res.data?.success) {
          setApplications(res.data.applications || []);
          setTotalPages(res.data.totalPages || 1);
        }
      })
      .catch((err) => console.error("Error fetching applications:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApps();
  }, [currentTab, page, search]);

  const handleTabChange = (tabValue) => {
    setSearchParams({ status: tabValue });
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary">
            Distributor Dealership Applications
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Review 17-step onboarding dossiers, inspect statutory KYC documents, and approve exclusive territorial rights.
          </p>
        </div>

        <button
          onClick={fetchApps}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover text-text-primary border border-border shadow-sm flex items-center gap-2 self-start transition-colors cursor-pointer"
        >
          <FiRefreshCw className={loading ? "animate-spin text-primary" : "text-primary"} /> Refresh List
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = currentTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-white font-bold shadow-md shadow-primary/20"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[260px]">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search company, GSTIN, mobile..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-hover/50 border border-border text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:bg-surface focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Applications Table */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
              <tr>
                <th className="p-3.5">Company / Legal Entity</th>
                <th className="p-3.5">GSTIN</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5">Milestone</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    <div className="inline-flex items-center gap-2">
                      <FiRefreshCw className="animate-spin text-primary" /> Loading applications...
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted font-medium">
                    No distributor applications found matching criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-text-primary text-sm">{app.business_name}</div>
                      <div className="text-[10px] text-text-muted font-mono">App Ref: {app.id}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {app.gst_number || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3.5 text-text-secondary">
                      <div className="font-medium text-text-primary">{app.email}</div>
                      <div className="text-[11px] text-text-muted">{app.mobile}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-text-primary">Stage {app.step_completed} / 17</div>
                      <div className="text-[10px] text-text-muted">
                        {Math.round((app.step_completed / 17) * 100)}% Dossier Complete
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          app.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : app.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : app.status === 'more_info_required'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        {app.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        to={`/admin-panel/solar-shop-bos-kits/india/distribution/applications/${app.id}`}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-sm inline-flex items-center gap-1.5 transition-all"
                      >
                        <FiEye size={14} /> Review Dossier
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-6 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-surface-hover disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-surface-hover disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

