import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FiBarChart2, FiRefreshCw, FiMapPin, FiPackage,
  FiTrendingUp,
} from "react-icons/fi";
import { FaCoins, FaPercent, FaRupeeSign } from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "@/features/alert.slice";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";
import Loader from "@/components/Loader";

const API_URL = import.meta.env.VITE_API_URL;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function MarginAnalytics({ moduleUniqueId = "ADM_CO_MARGIN" }) {
  const dispatch = useDispatch();
  const { countryName } = useParams();
  const token = useSelector((s) => s.auth.token);

  const [states, setStates] = useState([]);
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [filterState, setFilterState] = useState("");
  const [filterKit, setFilterKit] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch active country
      const countriesRes = await axios.get(
        `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      ).catch(() => ({ data: { countries: [] } }));

      const current = (countriesRes.data?.countries || []).find(
        (c) => c.name?.toLowerCase() === countryName?.toLowerCase()
      ) || countriesRes.data?.countries?.[0] || null;

      const isIndia = current?.iso2?.toLowerCase() === "in" || current?.name?.toLowerCase() === "india";

      // 2. Fetch states and kits for filters
      const [statesRes, kitsRes] = await Promise.all([
        current ? axios.post(
          `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: current.id || current._id },
          { headers: authHeaderObj() }
        ).catch((e) => {
          console.error("Failed to load states:", e);
          return { data: { states: [] } };
        }) : Promise.resolve({ data: { states: [] } }),

        current ? axios.get(
          `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false&country_id=${current.id || current._id}`,
          { headers: authHeaderObj() }
        ).catch((e) => {
          console.error("Failed to load kits:", e);
          return { data: { data: [] } };
        }) : Promise.resolve({ data: { data: [] } }),
      ]);

      const stateList = statesRes.data?.states || [];
      const kitList = kitsRes.data?.data || [];
      setStates(stateList);
      setKits(kitList);

      // 3. Fetch real aggregated analytics from backend
      const params = new URLSearchParams({
        unique_id: moduleUniqueId || "ADM_CO_MARGIN",
        req_for: "view",
        country_id: current ? (current.id || current._id) : "",
        target_month: filterMonth,
        target_year: filterYear,
      });
      if (filterState) params.append("state_id", filterState);
      if (filterKit) params.append("combo_kit_id", filterKit);

      const analyticsRes = await axios.get(
        `${API_URL}/company/margin-goals/analytics?${params.toString()}`,
        { headers: authHeaderObj() }
      ).catch((e) => {
        console.error("Failed to load real analytics:", e);
        return { data: { data: [] } };
      });

      setRows(analyticsRes.data?.data || []);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load analytics data" }));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [moduleUniqueId, token, countryName, filterMonth, filterYear, filterState, filterKit, dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate KPIs from real data
  const totalSales = rows.reduce((s, r) => s + (Number(r.total_sales) || 0), 0);
  const totalValue = rows.reduce((s, r) => s + (Number(r.sales_value) || 0), 0);
  const avgEffMargin = rows.length > 0
    ? (rows.reduce((s, r) => s + (Number(r.effective_margin_pct) || 0), 0) / rows.length).toFixed(2)
    : "0.00";
  const avgNetMargin = rows.length > 0
    ? (rows.reduce((s, r) => s + (Number(r.net_margin_pct) || 0), 0) / rows.length).toFixed(2)
    : "0.00";
  const totalComm = rows.reduce((s, r) => s + (Number(r.franchisee_commission) || 0), 0);

  const yearOptions = [];
  for (let y = new Date().getFullYear() - 2; y <= new Date().getFullYear() + 2; y++) {
    yearOptions.push({ value: y, text: String(y) });
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative rounded-2xl bg-linear-120 from-info to-info-hover shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]" />
        <div className="relative px-6 py-7 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
              <FiBarChart2 className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">Margin Analytics</h1>
              <p className="text-white/80 text-xs mt-0.5 font-medium">
                Real-time commercial analytics: Kit Sales → Discount → Company Margin → Commission → Net Margin.
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-bold border border-white/30 hover:bg-white/30 cursor-pointer transition-colors shadow-md"
          >
            <FiRefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-2 border-border p-4 flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <Dropdown
            label="State"
            value={filterState}
            onChange={setFilterState}
            placeholder="All States"
            options={[
              { value: "", text: "All States" },
              ...states.map((s) => ({ value: s.id || s._id, text: s.name }))
            ]}
          />
        </div>
        <div className="flex-1 w-full">
          <Dropdown
            label="Kit"
            value={filterKit}
            onChange={setFilterKit}
            placeholder="All Kits"
            options={[
              { value: "", text: "All Kits" },
              ...kits.map((k) => ({ value: k.id || k._id, text: k.name || k.kit_name || "Kit" }))
            ]}
          />
        </div>
        <div className="w-full md:w-40">
          <Dropdown
            label="Month"
            value={filterMonth}
            onChange={(v) => setFilterMonth(Number(v))}
            options={MONTHS.map((m, i) => ({ value: i + 1, text: m }))}
          />
        </div>
        <div className="w-full md:w-32">
          <Dropdown
            label="Year"
            value={filterYear}
            onChange={(v) => setFilterYear(Number(v))}
            options={yearOptions}
          />
        </div>
        {(filterState || filterKit) && (
          <Button
            variant="secondary"
            onClick={() => { setFilterState(""); setFilterKit(""); }}
            className="mt-5 md:mt-0 rounded-xl text-xs cursor-pointer"
          >
            Clear
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Kit Sales", value: totalSales.toLocaleString(), icon: <FiPackage />, color: "text-primary", bg: "bg-primary/10" },
          { label: "Total Value", value: `₹${(totalValue / 1e7).toFixed(2)}Cr`, icon: <FaRupeeSign />, color: "text-success", bg: "bg-success/10" },
          { label: "Avg Effective Margin", value: `${avgEffMargin}%`, icon: <FaPercent />, color: "text-info", bg: "bg-info/10" },
          { label: "Avg Net Margin", value: `${avgNetMargin}%`, icon: <FiTrendingUp />, color: "text-success", bg: "bg-success/10" },
          { label: "Total Commission", value: `₹${(totalComm / 1e5).toFixed(2)}L`, icon: <FaCoins />, color: "text-warning", bg: "bg-warning/10" },
        ].map((kpi, i) => (
          <div key={i} className="card p-5 border-2 border-border shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color} border border-current/10 shrink-0`}>{kpi.icon}</div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-tight">{kpi.label}</p>
              <p className="text-lg font-black text-text-primary mt-0.5">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Table — Commercial Breakdown */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <FiBarChart2 className="text-info" /> Kit-wise Margin Breakdown (Real Data)
          </h2>
          <span className="text-[10px] text-text-muted bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40 font-black uppercase">
            {MONTHS[filterMonth - 1]} {filterYear}
          </span>
        </div>
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <Loader text="Loading real margin analytics..." />
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <FiBarChart2 className="mx-auto text-4xl mb-3 opacity-30" />
              <p className="font-bold text-sm">No kit configurations or orders found for selected filters.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "Kit", "State", "Units Sold", "Sales Value",
                    "Std Margin %", "Offer Disc %", "Eff Margin %",
                    "Comm Paid", "Net Margin %"
                  ].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/40 hover:bg-surface-hover/30 transition-colors">
                    <td className="px-3 py-3 font-black text-text-primary whitespace-nowrap">{row.kit_name}</td>
                    <td className="px-3 py-3 text-text-secondary font-medium whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <FiMapPin size={11} className="text-text-muted" /> {row.state_name}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-text-primary whitespace-nowrap">
                      {row.total_sales > 0 ? `${row.total_sales.toLocaleString()} kits` : "0 kits"}
                    </td>
                    <td className="px-3 py-3 font-medium text-text-secondary whitespace-nowrap">
                      {row.sales_value > 0 ? `₹${(row.sales_value / 1e5).toFixed(2)}L` : "₹0"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-primary font-bold">{row.standard_margin_pct}%</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.offer_discount_pct > 0 ? (
                        <span className="text-warning font-bold">−{row.offer_discount_pct}%</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`font-black ${row.effective_margin_pct >= 8 ? "text-success" : row.effective_margin_pct >= 5 ? "text-warning" : "text-danger"}`}>
                        {row.effective_margin_pct}%
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-text-secondary whitespace-nowrap">
                      {row.franchisee_commission > 0 ? `₹${(row.franchisee_commission / 1e5).toFixed(2)}L` : "₹0"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`font-black ${row.net_margin_pct >= 6 ? "text-success" : row.net_margin_pct >= 3 ? "text-warning" : "text-danger"}`}>
                        {row.net_margin_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-surface-hover/30">
                  <td colSpan={2} className="px-3 py-3 font-black text-text-primary text-[10px] uppercase tracking-wider">Totals / Averages</td>
                  <td className="px-3 py-3 font-black text-text-primary whitespace-nowrap">{totalSales.toLocaleString()} kits</td>
                  <td className="px-3 py-3 font-black text-text-primary whitespace-nowrap">₹{(totalValue / 1e7).toFixed(2)}Cr</td>
                  <td className="px-3 py-3 font-black text-primary">—</td>
                  <td className="px-3 py-3 font-black text-warning">—</td>
                  <td className="px-3 py-3 font-black text-info whitespace-nowrap">{avgEffMargin}%</td>
                  <td className="px-3 py-3 font-black text-text-secondary whitespace-nowrap">₹{(totalComm / 1e5).toFixed(2)}L</td>
                  <td className="px-3 py-3 font-black text-success whitespace-nowrap">{avgNetMargin}%</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Order-level Commercial View Info */}
      <div className="card border-2 border-border p-5 flex items-start gap-4 bg-info/5">
        <div className="p-2.5 rounded-xl bg-info/10 text-info border border-info/10 shrink-0">
          <FiBarChart2 />
        </div>
        <div>
          <h3 className="font-black text-text-primary text-sm">Real-time Commercial Margin View</h3>
          <p className="text-xs text-text-secondary mt-1 font-medium leading-relaxed">
            Data shown here is computed directly from configured Kits, Warehouse Margins, active Offer Discounts, and completed Purchase Orders. When new orders are placed in the selected month/year, the sales volume and commission metrics update automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
