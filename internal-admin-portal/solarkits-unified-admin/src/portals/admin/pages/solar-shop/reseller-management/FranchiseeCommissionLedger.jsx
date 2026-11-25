import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FiBook, FiFilter, FiRefreshCw, FiUser, FiPackage,
  FiCalendar, FiCheckCircle, FiClock, FiXCircle, FiSearch,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "@/features/alert.slice";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination";

const API_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 20;

const STATUS_META = {
  PENDING:  { label: "Pending",   color: "text-warning",  bg: "bg-warning/10",  border: "border-warning/20",  icon: <FiClock /> },
  SETTLED:  { label: "Settled",   color: "text-success",  bg: "bg-success/10",  border: "border-success/20",  icon: <FiCheckCircle /> },
  REVERSED: { label: "Reversed",  color: "text-danger",   bg: "bg-danger/10",   border: "border-danger/20",   icon: <FiXCircle /> },
};

export default function FranchiseeCommissionLedger({ moduleUniqueId = "FPO_COMM" }) {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [resellers, setResellers] = useState([]);

  const [filterFranchisee, setFilterFranchisee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const fetchLedger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        unique_id: moduleUniqueId || "FPO_COMM",
        req_for: "view",
        page,
        limit: PAGE_SIZE,
      });
      if (filterFranchisee) params.append("franchisee_id", filterFranchisee);
      if (filterStatus) params.append("status", filterStatus);

      const [ledgerRes, resellersRes] = await Promise.all([
        axios.get(`${API_URL}/company/margin-goals/commission-ledger?${params}`, {
          headers: authHeaderObj(),
        }).catch((e) => {
          console.error("Failed to load commission ledger:", e);
          return { data: { data: [], total: 0 } };
        }),
        axios.get(`${API_URL}/reseller-mgmt/list?unique_id=RSL_MGMT&req_for=view&limit=200`, {
          headers: authHeaderObj(),
        }).catch((e) => {
          console.error("Failed to load resellers list:", e);
          return { data: { data: [] } };
        }),
      ]);

      setRows(ledgerRes.data?.data || []);
      setTotal(ledgerRes.data?.total || 0);
      setResellers(resellersRes.data?.data || resellersRes.data?.resellers || []);
    } catch (err) {
      console.error("Error in fetchLedger:", err);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, moduleUniqueId, page, filterFranchisee, filterStatus]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Search filter (client-side on po_number)
  const filtered = filterSearch
    ? rows.filter((r) =>
        (r.po_number || "").toLowerCase().includes(filterSearch.toLowerCase())
      )
    : rows;

  // KPI summary
  const totalComm = rows.reduce((s, r) => s + ((r.net_commission_paise || 0) / 100), 0);
  const pendingCount = rows.filter((r) => r.settlement_status === "PENDING").length;
  const settledCount = rows.filter((r) => r.settlement_status === "SETTLED").length;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative rounded-2xl bg-linear-120 from-primary to-primary-end shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]" />
        <div className="relative px-6 py-7 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
              <FiBook className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">Commission Ledger</h1>
              <p className="text-white/80 text-xs mt-0.5 font-medium">
                Per-franchisee commission records — order level, with payment status tracking.
              </p>
            </div>
          </div>
          <button
            onClick={fetchLedger}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-bold border border-white/30 hover:bg-white/30 cursor-pointer transition-colors shadow-md"
          >
            <FiRefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: total.toLocaleString(), icon: <FiBook />, color: "text-primary", bg: "bg-primary/10" },
          { label: "Total Commission", value: `₹${(totalComm / 1e5).toFixed(2)}L`, icon: <FaRupeeSign />, color: "text-warning", bg: "bg-warning/10" },
          { label: "Pending", value: pendingCount, icon: <FiClock />, color: "text-warning", bg: "bg-warning/10" },
          { label: "Settled", value: settledCount, icon: <FiCheckCircle />, color: "text-success", bg: "bg-success/10" },
        ].map((kpi, i) => (
          <div key={i} className="card p-5 border-2 border-border shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} border border-current/10`}>{kpi.icon}</div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{kpi.label}</p>
              <p className="text-xl font-black text-text-primary mt-0.5">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status Flow */}
      <div className="card border-2 border-border p-4">
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Commission Status Flow</p>
        <div className="flex items-center gap-2 flex-wrap">
          {["Calculated", "Pending Verification", "Approved", "Payable", "Paid / Adjusted"].map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-surface-hover text-text-secondary px-3 py-1.5 rounded-full border border-border">
                {s}
              </span>
              {i < arr.length - 1 && <span className="text-text-muted text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card border-2 border-border p-4 flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <Dropdown
            label="Franchisee"
            value={filterFranchisee}
            onChange={(v) => { setFilterFranchisee(v); setPage(1); }}
            placeholder="All Franchisees"
            options={[
              { value: "", text: "All Franchisees" },
              ...resellers.map((r) => ({ value: r._id || r.id, text: r.business_name || r.name || r.contact_name || "Franchisee" }))
            ]}
          />
        </div>
        <div className="w-full md:w-48">
          <Dropdown
            label="Status"
            value={filterStatus}
            onChange={(v) => { setFilterStatus(v); setPage(1); }}
            options={[
              { value: "", text: "All Statuses" },
              { value: "PENDING", text: "Pending" },
              { value: "SETTLED", text: "Settled" },
              { value: "REVERSED", text: "Reversed" },
            ]}
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5">PO Number Search</label>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search PO number..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border bg-surface text-text-primary text-xs font-medium outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
        {(filterFranchisee || filterStatus || filterSearch) && (
          <Button
            variant="secondary"
            onClick={() => { setFilterFranchisee(""); setFilterStatus(""); setFilterSearch(""); setPage(1); }}
            className="mt-5 md:mt-0 rounded-xl text-xs cursor-pointer"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <FiBook className="text-primary" /> Ledger Entries
          </h2>
          <span className="text-[10px] font-black text-text-muted bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
            {total} Total Records
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8"><Loader text="Loading commission ledger..." /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <FiBook className="mx-auto text-5xl mb-3 opacity-30" />
              <p className="font-bold text-sm">No commission records found.</p>
              <p className="text-xs mt-1 font-medium">
                Commission entries are generated automatically when eligible franchisee orders are processed.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["PO Number", "Franchisee", "Order Date", "Kit / Qty", "Commission Rate", "Total Commission", "Net (After TDS)", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const meta = STATUS_META[row.settlement_status] || STATUS_META.PENDING;
                  const franName = row.franchisee_id?.business_name || row.franchisee_id?.contact_name || "—";
                  const commPerKit = row.eligible_kit_quantity > 0
                    ? Math.round((row.commission_paise || 0) / row.eligible_kit_quantity / 100)
                    : 0;
                  return (
                    <tr key={row._id || row.id} className="border-b border-border/40 hover:bg-surface-hover/30 transition-colors">
                      <td className="px-4 py-3 font-black text-text-primary">{row.po_number || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-text-secondary flex items-center gap-1.5">
                          <FiUser size={11} className="text-text-muted" /> {franName}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-text-secondary whitespace-nowrap">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-text-primary">{row.eligible_kit_quantity} kits</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-warning">
                          ₹{commPerKit.toLocaleString()}/kit
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-text-primary">
                        ₹{((row.commission_paise || 0) / 100).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-bold text-success">
                        ₹{((row.net_commission_paise || 0) / 100).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${meta.color} ${meta.bg} ${meta.border}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
