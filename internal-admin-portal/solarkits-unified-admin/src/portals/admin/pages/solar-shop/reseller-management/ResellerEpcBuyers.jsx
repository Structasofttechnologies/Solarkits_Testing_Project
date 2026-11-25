import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiUsers,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiLoader,
  FiMail,
  FiPhone,
  FiUserCheck,
  FiShield,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "RSL_EPC_BUYERS";

const apiFetch = (method, endpoint, data) =>
  axios({ method, url: `${API_BASE}/reseller-mgmt/epc-buyers${endpoint}`, headers: authHeaderObj(), data });

const STATUS_BADGES = {
  approved: { label: "Approved", bg: "bg-success-soft", text: "text-success", icon: FiCheckCircle },
  pending: { label: "Pending Review", bg: "bg-warning-soft", text: "text-warning", icon: FiClock },
  rejected: { label: "Rejected", bg: "bg-danger-soft", text: "text-danger", icon: FiXCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_BADGES[status] || STATUS_BADGES.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border border-current/20`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

export default function ResellerEpcBuyers({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [epcTypes, setEpcTypes] = useState([
    { name: "Government Contractor" },
    { name: "Tender Bidder" },
    { name: "New EPC" },
    { name: "Experienced EPC" }
  ]);

  useEffect(() => {
    const fetchEpcTypes = async () => {
      try {
        const res = await axios.get(`${API_BASE}/epc-types/active`, { headers: authHeaderObj() });
        if (res.data?.status === "success" && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setEpcTypes(res.data.data);
        }
      } catch {
        // keep fallback defaults
      }
    };
    fetchEpcTypes();
  }, []);

  const fetchBuyers = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/reseller-mgmt/epc-buyers/list?req_for=view&unique_id=${MODULE_UID}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&epc_type=${typeFilter}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") setBuyers(res.data.data);
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load franchisee EPC buyers" }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, statusFilter, typeFilter]);

  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);

  const handleReview = async (signupRequestId, decision) => {
    try {
      const res = await apiFetch("put", `/review/${signupRequestId}?req_for=edit&unique_id=${MODULE_UID}`, { decision });
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `EPC buyer signup ${decision}` }));
        fetchBuyers();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Review failed" }));
    }
  };

  const filtered = buyers.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()) ||
      (b.reseller?.business_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || typeFilter === "all" || (b.epc_type || "New EPC").toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiUserCheck className="text-primary" size={24} />
            Franchisee EPC Buyers
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Review and approve EPC Buyer sub-accounts onboarded by active Franchisees
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search EPC buyer name, email, or parent franchisee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Approval States</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-semibold"
        >
          <option value="">All EPC Types</option>
          {epcTypes.map((t) => (
            <option key={t._id || t.id || t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted gap-3">
            <FiLoader className="animate-spin" size={20} />
            <span className="text-sm">Loading franchisee EPC buyers...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center">
              <FiUsers size={24} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No franchisee-onboarded EPC buyers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left text-text-muted font-medium px-5 py-3.5">EPC Buyer Name</th>
                  <th className="text-left text-text-muted font-medium px-5 py-3.5">Attributed Franchisee</th>
                  <th className="text-left text-text-muted font-medium px-5 py-3.5 hidden md:table-cell">Contact</th>
                  <th className="text-center text-text-muted font-medium px-4 py-3.5">Approval Status</th>
                  <th className="text-right text-text-muted font-medium px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence>
                  {filtered.map((b) => (
                    <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-text-primary">{b.name}</div>
                        <div className="text-xs text-text-muted mt-0.5 font-mono">ID: {b.id}</div>
                        {b.epc_type && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              🏷️ {b.epc_type}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {b.reseller ? (
                          <div>
                            <div className="font-semibold text-primary">{b.reseller.business_name}</div>
                            <div className="text-xs text-text-muted capitalize">{b.reseller.commercial_mode} Mode</div>
                          </div>
                        ) : (
                          <span className="italic text-text-muted">Direct / Unattributed</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="text-text-primary text-xs flex items-center gap-1"><FiMail size={11} /> {b.email}</div>
                        <div className="text-text-muted text-xs mt-0.5 flex items-center gap-1"><FiPhone size={11} /> {b.whatsapp}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {b.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReview(b.signup_request_id || b.id, "approved")}
                              className="px-3 py-1.5 rounded-xl bg-success text-white text-xs font-semibold hover:bg-success-hover transition-all shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(b.signup_request_id || b.id, "rejected")}
                              className="px-3 py-1.5 rounded-xl bg-danger-soft text-danger text-xs font-semibold hover:bg-danger hover:text-white transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
