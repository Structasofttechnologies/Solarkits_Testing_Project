import React, { useState, useEffect } from "react";
import {
  FaChartLine,
  FaCoins,
  FaHandHoldingUsd,
  FaWarehouse,
  FaBoxes,
  FaSolarPanel,
  FaUsers,
  FaMapMarkedAlt,
  FaClock,
  FaSpinner
} from "react-icons/fa";
import { getExecutiveOverview } from "../../api/accounts";

export default function ExecutiveFinanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getExecutiveOverview()
      .then((res) => setData(res?.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatInr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  // Dynamic percentage of receivables within 60 days
  const agingTotal = (data?.receivables_aging?.current_0_30_days || 0) +
    (data?.receivables_aging?.aging_31_60_days || 0) +
    (data?.receivables_aging?.aging_61_90_days || 0) +
    (data?.receivables_aging?.over_90_days || 0);
  const within60Days = (data?.receivables_aging?.current_0_30_days || 0) + (data?.receivables_aging?.aging_31_60_days || 0);
  const within60Pct = agingTotal > 0 ? Math.round((within60Days / agingTotal) * 100) : 100;

  if (loading && !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-3 text-slate-500">
        <FaSpinner className="animate-spin text-3xl text-indigo-600" />
        <span className="text-sm font-medium">Loading live executive financial metrics...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg text-lg">
              <FaChartLine />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Executive Finance & Business Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Consolidated financial oversight across turnover, cash collections, inventory valuation, and regional performance.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
          <span>FY: {data?.financial_year || "2026-2027"}</span>
          <span>•</span>
          <span className="text-emerald-700">Live Data</span>
        </div>
      </div>

      {/* Top Level Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Invoiced Turnover</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{formatInr(data?.kpis?.total_invoiced_turnover)}</p>
          <span className="text-xs text-slate-500 mt-1 block">Gross billing to EPCs & Retailers</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Collections Received</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{formatInr(data?.kpis?.total_collections_received)}</p>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-slate-500">Collection Efficiency:</span>
            <span className="font-bold text-emerald-700">{data?.kpis?.collection_efficiency_pct ?? 0}%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outstanding Receivables</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">{formatInr(data?.kpis?.outstanding_receivables)}</p>
          <span className="text-xs text-amber-600 mt-1 block">Due from Customers & EPCs</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivered Solar Kits</span>
          <p className="text-2xl font-extrabold text-indigo-600 mt-2">{data?.kpis?.total_delivered_kits ?? 0} Kits</p>
          <span className="text-xs text-slate-500 mt-1 block">Active Partners: {data?.kpis?.active_epc_partners ?? 0} EPCs</span>
        </div>
      </div>

      {/* Row 2: Real-Time Inventory Valuation & Receivables Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Valuation Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center gap-2">
              <FaBoxes className="text-blue-600 text-lg" />
              <h3 className="font-bold text-slate-900 text-base">Real-Time Inventory Valuation</h3>
            </div>
            <span className="text-base font-extrabold text-blue-700">
              {formatInr(data?.inventory_valuation?.total_valuation)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-slate-500 block">Physical in Warehouse</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {formatInr(data?.inventory_valuation?.physical_in_warehouse)}
              </span>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="text-slate-500 block">Reserved for Orders</span>
              <span className="text-sm font-bold text-amber-800 mt-1 block">
                {formatInr(data?.inventory_valuation?.reserved_for_orders)}
              </span>
            </div>
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
              <span className="text-slate-500 block">In-Transit from OEMs</span>
              <span className="text-sm font-bold text-purple-800 mt-1 block">
                {formatInr(data?.inventory_valuation?.in_transit_from_oem)}
              </span>
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span>📦 Complete Solar Kits: <strong>{data?.inventory_valuation?.total_kit_units_stock ?? 0} Units</strong></span>
            <span>⚡ Solar Panels: <strong>{data?.inventory_valuation?.total_solar_panels_stock ?? 0} Units</strong></span>
            <span>🔋 Inverters: <strong>{data?.inventory_valuation?.total_inverters_stock ?? 0} Units</strong></span>
          </div>
        </div>

        {/* Receivables Aging Analysis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center gap-2">
              <FaClock className="text-amber-500 text-lg" />
              <h3 className="font-bold text-slate-900 text-base">Receivables Aging Analysis</h3>
            </div>
            <span className="text-xs text-slate-500">Credit Risk Tracking</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-emerald-700 block font-semibold">0 - 30 Days</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {formatInr(data?.receivables_aging?.current_0_30_days)}
              </span>
              <span className="text-[10px] text-emerald-600">Healthy</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-blue-700 block font-semibold">31 - 60 Days</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {formatInr(data?.receivables_aging?.aging_31_60_days)}
              </span>
              <span className="text-[10px] text-blue-600">Normal</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-amber-700 block font-semibold">61 - 90 Days</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {formatInr(data?.receivables_aging?.aging_61_90_days)}
              </span>
              <span className="text-[10px] text-amber-600">Follow-up</span>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-rose-700 block font-semibold">90+ Days</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {formatInr(data?.receivables_aging?.over_90_days)}
              </span>
              <span className="text-[10px] text-rose-600">High Risk</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            * Over {within60Pct}% of outstanding receivables remain within the standard 60-day solar commercial credit window.
          </p>
        </div>
      </div>

      {/* Row 3: Regional State Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FaMapMarkedAlt className="text-indigo-600 text-lg" />
            <h3 className="font-bold text-slate-900 text-base">State & Cluster Financial Distribution</h3>
          </div>
          <span className="text-xs text-slate-500">Drill-down by State, Warehouse & Delivered Kits</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
                <th className="p-3 pl-5">State</th>
                <th className="p-3 text-right">Invoiced Turnover</th>
                <th className="p-3 text-right">National Share</th>
                <th className="p-3 text-center">Active Hubs</th>
                <th className="p-3 text-center">Clusters</th>
                <th className="p-3 text-right pr-5">Kits Delivered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.regional_breakdown && data.regional_breakdown.length > 0 ? (
                data.regional_breakdown.map((reg, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 pl-5 font-bold text-slate-800">{reg.state}</td>
                    <td className="p-3 text-right font-medium text-slate-900">{formatInr(reg.turnover)}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md">
                        {reg.share_pct}%
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-600">{reg.active_warehouses}</td>
                    <td className="p-3 text-center text-slate-600">{reg.clusters}</td>
                    <td className="p-3 text-right pr-5 font-bold text-emerald-700">{reg.kits_delivered}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    No regional financial distribution data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
