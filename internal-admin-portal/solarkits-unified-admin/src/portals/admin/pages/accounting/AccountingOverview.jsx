import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBalanceScale,
  FaFileInvoiceDollar,
  FaClipboardCheck,
  FaMoneyBillWave,
  FaBook,
  FaExchangeAlt,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFilter,
  FaBoxes,
  FaTruck,
  FaMapMarkerAlt,
  FaBuilding,
  FaSearch,
  FaEye,
  FaCheck,
  FaTimes
} from "react-icons/fa";
import {
  getAccountingSummary,
  getGstSummary,
  getComplianceAlerts,
  getExpenseReports,
  getFranchiseClustersList,
  getStates
} from "../../../accounts/api/accounts";

// Standard seeded heads data for executive audit rollup
const MASTER_ACCOUNTING_HEADS = [
  { code: "AH-1001", name: "Kit Sales Revenue", category: "Sales Revenue", type: "Income", opening: 0, debit: 0, credit: 14850000, current: 14850000 },
  { code: "AH-1002", name: "Loose Product Sales", category: "Sales Revenue", type: "Income", opening: 0, debit: 0, credit: 3240000, current: 3240000 },
  { code: "AH-1003", name: "Franchisee Setup Sales", category: "Sales Revenue", type: "Income", opening: 0, debit: 0, credit: 1800000, current: 1800000 },
  { code: "AH-1004", name: "EPC Commercial Project Sales", category: "Sales Revenue", type: "Income", opening: 0, debit: 0, credit: 6500000, current: 6500000 },
  { code: "AH-2001", name: "Solar Panel OEM Purchases", category: "Purchase Accounts", type: "Expense", opening: 0, debit: 8400000, credit: 0, current: 8400000 },
  { code: "AH-2002", name: "Inverter OEM Purchases", category: "Purchase Accounts", type: "Expense", opening: 0, debit: 4100000, credit: 0, current: 4100000 },
  { code: "AH-2003", name: "MMS Structure Purchases", category: "Purchase Accounts", type: "Expense", opening: 0, debit: 2200000, credit: 0, current: 2200000 },
  { code: "AH-3001", name: "Inter-State Freight & Delivery", category: "Direct Expenses", type: "Expense", opening: 0, debit: 720000, credit: 0, current: 720000 },
  { code: "AH-3002", name: "Warehouse Inward Handling & Packaging", category: "Direct Expenses", type: "Expense", opening: 0, debit: 280000, credit: 0, current: 280000 },
  { code: "AH-4001", name: "Warehouse Rent & Property Taxes", category: "Warehouse Expenses", type: "Expense", opening: 0, debit: 450000, credit: 0, current: 450000 },
  { code: "AH-4002", name: "Warehouse Security & Electricity", category: "Warehouse Expenses", type: "Expense", opening: 0, debit: 180000, credit: 0, current: 180000 },
  { code: "AH-5001", name: "Staff Salaries & Field Allowances", category: "Employee Expenses", type: "Expense", opening: 0, debit: 920000, credit: 0, current: 920000 },
  { code: "AH-5002", name: "BDE Commission & Incentives", category: "Employee Expenses", type: "Expense", opening: 0, debit: 340000, credit: 0, current: 340000 },
  { code: "AH-6001", name: "Input CGST ITC (Claimable)", category: "Tax Accounts", type: "Asset", opening: 0, debit: 560000, credit: 0, current: 560000 },
  { code: "AH-6002", name: "Input SGST ITC (Claimable)", category: "Tax Accounts", type: "Asset", opening: 0, debit: 560000, credit: 0, current: 560000 },
  { code: "AH-6003", name: "Output CGST Payable", category: "Tax Accounts", type: "Liability", opening: 0, debit: 0, credit: 740000, current: 740000 },
  { code: "AH-6004", name: "Output SGST Payable", category: "Tax Accounts", type: "Liability", opening: 0, debit: 0, credit: 740000, current: 740000 }
];

// Cluster financial rollup data
const CLUSTER_FINANCIAL_ROLLUP = [
  {
    cluster_name: "Porbandar Cluster",
    cluster_code: "CLU-GJ-002",
    state: "Gujarat",
    districts: "Bhavnagar, Dahod, Gir Somnath, Porbandar, Junagadh",
    kits_dispatched: 44,
    revenue: 2950000,
    freight_incurred: 230100,
    freight_pct: 7.8,
    gross_surplus: 560500,
    gst_collected: 354000,
    compliance_status: "AUDITED_CLEAN"
  },
  {
    cluster_name: "Devbhumi Dwarka cluster",
    cluster_code: "CLU-GJ-001",
    state: "Gujarat",
    districts: "Sabarkantha, Surat, Surendranagar, Dwarka, Jamnagar, Morbi",
    kits_dispatched: 51,
    revenue: 3200000,
    freight_incurred: 259200,
    freight_pct: 8.1,
    gross_surplus: 608000,
    gst_collected: 384000,
    compliance_status: "AUDITED_CLEAN"
  },
  {
    cluster_name: "Pune & Western Maharashtra Cluster",
    cluster_code: "CLU-MH-001",
    state: "Maharashtra",
    districts: "Aurangabad, Mumbai City, Mumbai Suburban, Pune, PCMC, Thane, Nashik",
    kits_dispatched: 68,
    revenue: 4200000,
    freight_incurred: 205800,
    freight_pct: 4.9,
    gross_surplus: 882000,
    gst_collected: 504000,
    compliance_status: "AUDITED_CLEAN"
  },
  {
    cluster_name: "Rajkot Cluster",
    cluster_code: "CLU-GJ-003",
    state: "Gujarat",
    districts: "Jamnagar, Morbi, Rajkot",
    kits_dispatched: 28,
    revenue: 2100000,
    freight_incurred: 113400,
    freight_pct: 5.4,
    gross_surplus: 441000,
    gst_collected: 252000,
    compliance_status: "AUDITED_CLEAN"
  },
  {
    cluster_name: "Varanasi-Purvanchal Cluster",
    cluster_code: "CLU-UP-001",
    state: "Uttar Pradesh",
    districts: "Varanasi, Chandauli, Jaunpur, Ghazipur, Mirzapur",
    kits_dispatched: 58,
    revenue: 3450000,
    freight_incurred: 289800,
    freight_pct: 8.4,
    gross_surplus: 655500,
    gst_collected: 414000,
    compliance_status: "AUDIT_FLAG_PENDING"
  },
  {
    cluster_name: "Indore-Malwa Cluster",
    cluster_code: "CLU-MP-001",
    state: "Madhya Pradesh",
    districts: "Indore, Ujjain, Dewas, Dhar",
    kits_dispatched: 46,
    revenue: 2890000,
    freight_incurred: 208080,
    freight_pct: 7.2,
    gross_surplus: 549100,
    gst_collected: 346800,
    compliance_status: "AUDITED_CLEAN"
  },
  {
    cluster_name: "Jaipur-Marwar Cluster",
    cluster_code: "CLU-RJ-001",
    state: "Rajasthan",
    districts: "Jaipur, Dausa, Alwar, Sikar",
    kits_dispatched: 52,
    revenue: 3100000,
    freight_incurred: 213900,
    freight_pct: 6.9,
    gross_surplus: 589000,
    gst_collected: 372000,
    compliance_status: "AUDITED_CLEAN"
  }
];

// Sample flagged purchase invoices requiring executive audit
const INITIAL_AUDIT_EXCEPTIONS = [
  {
    id: "INV-EX-001",
    invoice_number: "WAA-2026-9041",
    supplier_name: "Waaree Energies Ltd",
    supplier_gstin: "24AAACW8891P1ZK",
    date: "12-11-2026",
    taxable_amount: 1450000,
    gst_amount: 174000,
    total_amount: 1624000,
    mismatch_issue: "PO Reference Amount Mismatch: Bill ₹16,24,000 vs Approved PO ₹15,90,000",
    status: "FLAGGED_MISMATCH",
    override_allowed: true
  },
  {
    id: "INV-EX-002",
    invoice_number: "GRW-INV-8120",
    supplier_name: "Growatt New Energy India",
    supplier_gstin: "27AABCG1204K1ZV",
    date: "14-11-2026",
    taxable_amount: 880000,
    gst_amount: 105600,
    total_amount: 985600,
    mismatch_issue: "GSTR-2B Verification Pending: Supplier upload not yet reflected in GST Portal",
    status: "AWAITING_2B",
    override_allowed: true
  },
  {
    id: "INV-EX-003",
    invoice_number: "LOG-DEL-4410",
    supplier_name: "VRL Logistics Fleet Services",
    supplier_gstin: "29AABCV6742N1ZX",
    date: "15-11-2026",
    taxable_amount: 125000,
    gst_amount: 22500,
    total_amount: 147500,
    mismatch_issue: "Distance / Toll Deviation: Inward freight billed 18% over route quote",
    status: "UNDER_REVIEW",
    override_allowed: true
  }
];

export default function AccountingOverview() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("clusters");
  const [loading, setLoading] = useState(false);

  // Master Filters
  const [selectedCluster, setSelectedCluster] = useState("ALL");
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState("FY 2026-27");
  const [headSearch, setHeadSearch] = useState("");

  // Live Lists from API
  const [franchiseClusters, setFranchiseClusters] = useState([]);
  const [liveStates, setLiveStates] = useState([]);
  const [auditExceptions, setAuditExceptions] = useState(INITIAL_AUDIT_EXCEPTIONS);
  const [overrideNotice, setOverrideNotice] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getFranchiseClustersList().catch(() => null),
      getStates().catch(() => null)
    ]).then(([fcRes, stRes]) => {
      if (fcRes?.data && Array.isArray(fcRes.data)) {
        setFranchiseClusters(fcRes.data);
      }
      if (stRes?.data && Array.isArray(stRes.data)) {
        setLiveStates(stRes.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const formatInr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  // Unique list of cluster names combining static and live
  const allClusterOptions = useMemo(() => {
    const names = new Set([
      ...CLUSTER_FINANCIAL_ROLLUP.map(c => c.cluster_name),
      ...franchiseClusters.map(c => c.cluster_name)
    ]);
    return Array.from(names).filter(Boolean);
  }, [franchiseClusters]);

  const allStateOptions = useMemo(() => {
    const states = new Set([
      ...CLUSTER_FINANCIAL_ROLLUP.map(c => c.state),
      ...liveStates.map(s => s.name)
    ]);
    return Array.from(states).filter(Boolean);
  }, [liveStates]);

  // Filtered Cluster Rollup
  const filteredClusters = useMemo(() => {
    return CLUSTER_FINANCIAL_ROLLUP.filter((item) => {
      if (selectedCluster !== "ALL" && item.cluster_name !== selectedCluster) return false;
      if (selectedState !== "ALL" && item.state !== selectedState) return false;
      return true;
    });
  }, [selectedCluster, selectedState]);

  // Executive Rollup Totals based on filtered clusters
  const totalKitsSold = filteredClusters.reduce((sum, c) => sum + c.kits_dispatched, 0);
  const totalRevenue = filteredClusters.reduce((sum, c) => sum + c.revenue, 0);
  const totalFreight = filteredClusters.reduce((sum, c) => sum + c.freight_incurred, 0);
  const totalGrossSurplus = filteredClusters.reduce((sum, c) => sum + c.gross_surplus, 0);
  const totalGstCollected = filteredClusters.reduce((sum, c) => sum + c.gst_collected, 0);

  // Filtered Accounting Heads
  const filteredHeads = useMemo(() => {
    if (!headSearch.trim()) return MASTER_ACCOUNTING_HEADS;
    const q = headSearch.toLowerCase();
    return MASTER_ACCOUNTING_HEADS.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.code.toLowerCase().includes(q) ||
      h.category.toLowerCase().includes(q)
    );
  }, [headSearch]);

  const handleAdminOverride = (id, newStatus) => {
    setAuditExceptions(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
    setOverrideNotice(`Executive Override Applied: Invoice ${id} marked as ${newStatus}!`);
    setTimeout(() => setOverrideNotice(null), 4000);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg text-lg">
              <FaBalanceScale />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Executive Accounting & Financial Control Overview</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Consolidated financial oversight across all States, Districts, Franchisee Clusters, Dynamic Heads, GST returns, and Invoice audits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/account-panel/home")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            title="Open Account Panel for full voucher entry, reconciliation, and bookkeeping"
          >
            <FaExternalLinkAlt size={12} /> Open Full Accountant Panel
          </button>
        </div>
      </div>

      {/* Override Notice */}
      {overrideNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm">
          <span>{overrideNotice}</span>
          <button onClick={() => setOverrideNotice(null)} className="font-bold px-2">✕</button>
        </div>
      )}

      {/* EXECUTIVE MASTER FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <FaFilter />
          </span>
          <span className="font-bold text-slate-800 text-sm">Executive Financial Filter</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 text-[11px]">Dynamic rollups by Cluster & State</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mr-2">Franchise Cluster:</label>
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-xs bg-slate-50 text-slate-800 focus:bg-white"
            >
              <option value="ALL">All Franchise Clusters ({allClusterOptions.length})</option>
              {allClusterOptions.map((cName) => (
                <option key={cName} value={cName}>{cName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 mr-2">State / Territory:</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-xs bg-slate-50 text-slate-800 focus:bg-white"
            >
              <option value="ALL">All States ({allStateOptions.length})</option>
              {allStateOptions.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 mr-2">Financial Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-xs bg-slate-50 text-slate-800 focus:bg-white"
            >
              <option value="FY 2026-27">FY 2026-27 (Current)</option>
              <option value="Q3 2026">Q3 (Oct - Dec 2026)</option>
              <option value="November 2026">November 2026 (Live)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5 CONSOLIDATED EXECUTIVE METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Solar Kits</span>
            <FaBoxes className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalKitsSold} Kits</p>
          <span className="text-xs text-blue-600 font-semibold block">Revenue: {formatInr(totalRevenue)}</span>
          <span className="text-[10px] text-slate-400 block">Surplus: {formatInr(totalGrossSurplus)}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Dynamic Heads</span>
            <FaBook className="text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">42 Heads</p>
          <span className="text-xs text-slate-600 block">Income: 6 • Expense: 21</span>
          <span className="text-[10px] text-slate-400 block">Assets: 8 • Liabilities: 6 • Equity: 1</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Net GST Tax Position</span>
            <FaFileInvoiceDollar className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatInr(totalGstCollected - 1120000)}</p>
          <span className="text-xs text-emerald-600 font-semibold block">Output: {formatInr(totalGstCollected)}</span>
          <span className="text-[10px] text-slate-500 block">Input ITC: {formatInr(1120000)}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Invoice Audit Control</span>
            <FaClipboardCheck className="text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600">{auditExceptions.length} Exceptions</p>
          <span className="text-xs text-emerald-600 font-semibold block">49 Validated Clean</span>
          <span className="text-[10px] text-rose-600 block">Requires Admin Override / Action</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Direct Freight Logistics</span>
            <FaTruck className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatInr(totalFreight)}</p>
          <span className="text-xs text-purple-600 font-semibold block">
            Ratio: {totalRevenue > 0 ? ((totalFreight / totalRevenue) * 100).toFixed(1) : "0"}% of Sales
          </span>
          <span className="text-[10px] text-slate-400 block">Across {filteredClusters.length} Target Clusters</span>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION FOR EXECUTIVE OVERVIEW */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm gap-2 overflow-x-auto">
        {[
          { id: "clusters", label: "1. Cluster & District Kits Financial Rollup", icon: <FaBoxes /> },
          { id: "heads", label: "2. Chart of Accounts & Head Balance Rollup", icon: <FaBook /> },
          { id: "gst", label: "3. GST & Statutory Tax Compliance", icon: <FaFileInvoiceDollar /> },
          { id: "audit", label: "4. Invoice Audit Exceptions & Admin Overrides", icon: <FaClipboardCheck /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3.5 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CLUSTER & DISTRICT KITS ROLLUP */}
      {activeTab === "clusters" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Territory & Cluster Financial Summary</h3>
              <p className="text-xs text-slate-500">
                Performance rollup showing Solar Kits sold, Revenue generated, Logistics expenditure, and Tax contribution by cluster.
              </p>
            </div>
            <button
              onClick={() => navigate("/account-panel/accounting")}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <FaExternalLinkAlt size={10} /> Open Accounting Ledgers
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Cluster & Code</th>
                  <th className="py-3 px-4">State & Districts Covered</th>
                  <th className="py-3 px-4 text-center">Kits Sold</th>
                  <th className="py-3 px-4 text-right">Kit Revenue (₹)</th>
                  <th className="py-3 px-4 text-right">Freight Cost (₹)</th>
                  <th className="py-3 px-4 text-right">Gross Surplus (₹)</th>
                  <th className="py-3 px-4 text-center">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredClusters.map((row) => (
                  <tr key={row.cluster_code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{row.cluster_name}</div>
                      <span className="text-[10px] text-indigo-600 font-semibold">{row.cluster_code}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      <span className="font-semibold text-slate-800">{row.state}</span>
                      <p className="text-[10px] text-slate-400 truncate">{row.districts}</p>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-700">
                      <span className="px-2.5 py-1 bg-blue-50 rounded-lg">{row.kits_dispatched} Kits</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatInr(row.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={row.freight_pct > 6.5 ? "text-rose-600 font-bold" : "text-slate-700 font-medium"}>
                        {formatInr(row.freight_incurred)} ({row.freight_pct}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatInr(row.gross_surplus)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.compliance_status === "AUDITED_CLEAN" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Audited Clean ✓
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                          Audit Flag Pending ⚠️
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                  <td className="py-3 px-4" colSpan={2}>
                    National Total ({filteredClusters.length} Clusters)
                  </td>
                  <td className="py-3 px-4 text-center text-blue-800">{totalKitsSold} Kits</td>
                  <td className="py-3 px-4 text-right">{formatInr(totalRevenue)}</td>
                  <td className="py-3 px-4 text-right text-rose-700">{formatInr(totalFreight)}</td>
                  <td className="py-3 px-4 text-right text-emerald-800">{formatInr(totalGrossSurplus)}</td>
                  <td className="py-3 px-4 text-center text-slate-500">100% Tracked</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CHART OF ACCOUNTS & HEADS BREAKDOWN */}
      {activeTab === "heads" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Dynamic Chart of Accounts Balance Rollup</h3>
              <p className="text-xs text-slate-500">
                Centralized account head ledger balances configured by Admin across Sales, Purchases, Logistics, and Statutory Taxes.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <FaSearch className="absolute left-3 top-3 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search heads or code..."
                  value={headSearch}
                  onChange={(e) => setHeadSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
                />
              </div>
              <button
                onClick={() => navigate("/account-panel/accounting")}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition whitespace-nowrap"
              >
                <FaBook size={10} /> Open Heads in Account Panel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Head Code</th>
                  <th className="py-3 px-4">Accounting Head Name</th>
                  <th className="py-3 px-4">Accounting Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Debit Total (₹)</th>
                  <th className="py-3 px-4 text-right">Credit Total (₹)</th>
                  <th className="py-3 px-4 text-right">Net Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredHeads.map((h) => (
                  <tr key={h.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">{h.code}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{h.name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{h.category}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        h.type === "Income" ? "bg-emerald-100 text-emerald-800" :
                        h.type === "Expense" ? "bg-rose-100 text-rose-800" :
                        h.type === "Asset" ? "bg-blue-100 text-blue-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {h.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{formatInr(h.debit)}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{formatInr(h.credit)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatInr(h.current)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GST & STATUTORY TAX COMPLIANCE */}
      {activeTab === "gst" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">GST Filing & Input Tax Credit (ITC) Summary</h3>
              <p className="text-xs text-slate-500">
                Executive statutory tax position for GSTR-1 (Outward Supplies), GSTR-3B (Net Tax Payment), and GSTR-2B reconciliation.
              </p>
            </div>
            <button
              onClick={() => navigate("/account-panel/gst")}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <FaFileInvoiceDollar size={10} /> Open GST Module in Account Panel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-xs font-bold text-slate-600">GSTR-1 Outward Sales Register</span>
              <p className="text-xl font-bold text-slate-900">{formatInr(totalRevenue)}</p>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Output Tax Generated:</span>
                <span className="font-bold text-emerald-700">{formatInr(totalGstCollected)}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-block mt-1">
                Filing Prepared & Reconciled ✓
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-xs font-bold text-slate-600">GSTR-2B Inward ITC Claim</span>
              <p className="text-xl font-bold text-slate-900">{formatInr(1120000)}</p>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Eligible Supplier Credits:</span>
                <span className="font-bold text-blue-700">{formatInr(1040000)}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 inline-block mt-1">
                92.8% Verified with 2B Match
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-xs font-bold text-slate-600">Net GST Cash Liability (GSTR-3B)</span>
              <p className="text-xl font-bold text-amber-600">{formatInr(totalGstCollected - 1120000)}</p>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Due Date:</span>
                <span className="font-bold text-slate-800">20th of Current Month</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 inline-block mt-1">
                Ready for Authorized Filing
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INVOICE AUDIT EXCEPTIONS & ADMIN OVERRIDES */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Invoice Validation Control Center (Audit Exceptions)</h3>
              <p className="text-xs text-slate-500">
                Supplier invoices flagged for 10-point check failures (PO mismatch, GSTIN discrepancy, or toll leakage). Admin can review and override.
              </p>
            </div>
            <button
              onClick={() => navigate("/account-panel/invoice-validation")}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <FaClipboardCheck size={10} /> Open Full Invoice Center
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice # & Date</th>
                  <th className="py-3 px-4">Supplier & GSTIN</th>
                  <th className="py-3 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4">Mismatch / Exception Reason</th>
                  <th className="py-3 px-4 text-center">Audit Status</th>
                  <th className="py-3 px-4 text-center">Admin Override Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {auditExceptions.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block">{inv.invoice_number}</span>
                      <span className="text-[10px] text-slate-400">{inv.date}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 block">{inv.supplier_name}</span>
                      <span className="text-[10px] text-indigo-600 font-mono">{inv.supplier_gstin}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{formatInr(inv.taxable_amount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatInr(inv.total_amount)}</td>
                    <td className="py-3 px-4 max-w-xs text-rose-700 text-[11px] font-semibold">
                      {inv.mismatch_issue}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === "APPROVED_OVERRIDE" ? "bg-emerald-100 text-emerald-800" :
                        inv.status === "REJECTED" ? "bg-rose-100 text-rose-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.status === "APPROVED_OVERRIDE" ? (
                        <span className="text-emerald-700 font-bold text-[11px] flex items-center justify-center gap-1">
                          <FaCheck size={10} /> Overridden & Approved
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleAdminOverride(inv.id, "APPROVED_OVERRIDE")}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition"
                          >
                            Approve Override
                          </button>
                          <button
                            onClick={() => handleAdminOverride(inv.id, "REJECTED")}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}