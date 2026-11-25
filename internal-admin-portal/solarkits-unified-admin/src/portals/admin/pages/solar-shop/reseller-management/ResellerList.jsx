import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiEye,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiClock,
  FiLoader,
  FiChevronLeft,
  FiChevronRight,
  FiZap,
  FiShoppingBag,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "RSL_MGMT";

const KYC_BADGES = {
  verified:              { label: "Verified",    bg: "bg-success-soft", text: "text-success", icon: FiCheckCircle },
  submitted:             { label: "In Review",   bg: "bg-info-soft",    text: "text-info",    icon: FiClock },
  pending:               { label: "Pending Upload", bg: "bg-warning-soft", text: "text-warning", icon: FiClock },
  draft:                 { label: "Draft",       bg: "bg-surface-hover", text: "text-text-muted", icon: FiClock },
  rejected:              { label: "Rejected",    bg: "bg-danger-soft",  text: "text-danger",  icon: FiXCircle },
  resubmission_required: { label: "Resubmit",    bg: "bg-warning-soft", text: "text-warning", icon: FiAlertCircle },
};

const ACTIVATION_BADGES = {
  active:     { label: "Active",     bg: "bg-success-soft", text: "text-success" },
  pending:    { label: "Pending",    bg: "bg-warning-soft", text: "text-warning" },
  suspended:  { label: "Suspended",  bg: "bg-danger-soft",  text: "text-danger" },
  terminated: { label: "Terminated", bg: "bg-surface-hover", text: "text-text-muted" },
};

function KycBadge({ status }) {
  const cfg = KYC_BADGES[status] || KYC_BADGES.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border border-current/20`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function ActivationBadge({ status }) {
  const cfg = ACTIVATION_BADGES[status] || ACTIVATION_BADGES.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border border-current/20 capitalize`}>
      {cfg.label}
    </span>
  );
}

export default function ResellerList({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });

  // Filters
  const [search, setSearch] = useState("");
  const [kycStatusFilter, setKycStatusFilter] = useState("");
  const [activationFilter, setActivationFilter] = useState("");

  const fetchResellers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/reseller-mgmt/list?req_for=view&unique_id=${MODULE_UID}&page=${page}&limit=${pagination.limit}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (kycStatusFilter) url += `&kyc_status=${kycStatusFilter}`;
      if (activationFilter) url += `&activation_status=${activationFilter}`;

      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setResellers(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load franchisees" }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, search, kycStatusFilter, activationFilter, pagination.limit]);

  useEffect(() => {
    fetchResellers(1);
  }, [search, kycStatusFilter, activationFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiUsers className="text-primary" size={24} />
            Franchisee Accounts
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Manage franchisee profiles, KYC verification queue, and account activation statuses
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search by name, email, mobile, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        {/* KYC Status Filter */}
        <select
          value={kycStatusFilter}
          onChange={(e) => setKycStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="">All KYC Statuses</option>
          <option value="submitted">Submitted (In Review)</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending Upload</option>
          <option value="rejected">Rejected</option>
          <option value="resubmission_required">Resubmit Required</option>
        </select>

        {/* Activation Status Filter */}
        <select
          value={activationFilter}
          onChange={(e) => setActivationFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="">All Activation States</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted gap-3">
            <FiLoader className="animate-spin" size={20} />
            <span className="text-sm">Loading franchisee accounts...</span>
          </div>
        ) : resellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center">
              <FiUsers size={24} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No franchisees match your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left text-text-muted font-medium px-5 py-3.5">Business / Franchisee</th>
                  <th className="text-left text-text-muted font-medium px-5 py-3.5">Mode</th>
                  <th className="text-left text-text-muted font-medium px-5 py-3.5 hidden md:table-cell">Contact</th>
                  <th className="text-center text-text-muted font-medium px-4 py-3.5">KYC Status</th>
                  <th className="text-center text-text-muted font-medium px-4 py-3.5">Account Status</th>
                  <th className="text-right text-text-muted font-medium px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence>
                  {resellers.map((r) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-text-primary">{r.business_name}</div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {r.gst_number ? (
                            <span className="font-mono text-primary bg-info-soft px-1.5 py-0.5 rounded">
                              GST: {r.gst_number}
                            </span>
                          ) : (
                            <span className="italic">No GSTIN provided</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.commercial_mode === 'commission' ? 'bg-info-soft text-primary' : 'bg-warning-soft text-warning'
                        }`}>
                          {r.commercial_mode === 'commission' ? <FiZap size={10} /> : <FiShoppingBag size={10} />}
                          <span className="capitalize">{r.commercial_mode}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="text-text-primary text-xs font-medium">{r.email}</div>
                        <div className="text-text-muted text-xs mt-0.5">{r.mobile}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <KycBadge status={r.kyc_status} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <ActivationBadge status={r.activation_status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => navigate(`/admin-panel/solar-shop/reseller-management/resellers/${r.id}`)}
                          className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-primary hover:text-white hover:border-primary transition-all inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <FiEye size={13} />
                          View Profile
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-bg text-xs">
            <span className="text-text-muted">
              Page {pagination.page} of {pagination.pages} ({pagination.total} franchisees)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchResellers(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft size={16} />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchResellers(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
