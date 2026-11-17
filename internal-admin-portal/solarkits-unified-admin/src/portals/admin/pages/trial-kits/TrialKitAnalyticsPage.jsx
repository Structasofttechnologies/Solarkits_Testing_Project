import React, { useState, useEffect, useCallback } from "react";
import {
  getTrialKitAnalyticsSummary,
  getTrialKitConversionComparison
} from "../../api/trialKitsApi";
import {
  FaChartLine,
  FaBoxes,
  FaTruck,
  FaCheckCircle,
  FaClock,
  FaUserCheck,
  FaUserTimes,
  FaWarehouse,
  FaExchangeAlt,
  FaCoins
} from "react-icons/fa";
import { FiRefreshCw, FiTrendingUp, FiArrowUpRight } from "react-icons/fi";

export default function TrialKitAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [conversionData, setConversionData] = useState(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [sumRes, convRes] = await Promise.all([
        getTrialKitAnalyticsSummary(),
        getTrialKitConversionComparison()
      ]);

      if (sumRes?.success) {
        setSummaryData(sumRes.data);
      }
      if (convRes?.success) {
        setConversionData(convRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load trial kit analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = summaryData?.summary || {};
  const warehouseTable = summaryData?.warehouse_table || [];
  const comparison = conversionData?.comparison_table;
  const channelA = comparison?.channel_a_trial;
  const channelB = comparison?.channel_b_direct;
  const biExtra = conversionData?.additional_analytics;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaChartLine className="text-blue-600" />
            Trial Kit Analytics & BI Conversion Engine
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Section 7 & 8: Performance overview across warehouses and critical Channel A (Trial Kit) vs Channel B (Direct Quote) conversion metrics.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-sm"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh Analytics
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs">{error}</div>
      )}

      {/* SECTION 7.A: OVERALL TRIAL KIT SUMMARY KPIS */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>A. Overall Trial Kit Summary</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-bold uppercase">Total Stock</span>
              <FaWarehouse />
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1">{summary.total_stock || 0}</p>
            <span className="text-[10px] text-gray-400">All warehouses</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-blue-500">
              <span className="text-[10px] font-bold uppercase text-gray-400">Total Orders</span>
              <FaBoxes />
            </div>
            <p className="text-xl font-bold text-blue-600 mt-1">{summary.total_orders || 0}</p>
            <span className="text-[10px] text-gray-400">Trial kits ordered</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-emerald-500">
              <span className="text-[10px] font-bold uppercase text-gray-400">Total Delivered</span>
              <FaTruck />
            </div>
            <p className="text-xl font-bold text-emerald-600 mt-1">{summary.total_delivered || 0}</p>
            <span className="text-[10px] text-gray-400">Successfully delivered</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-amber-500">
              <span className="text-[10px] font-bold uppercase text-gray-400">Pending Delivery</span>
              <FaClock />
            </div>
            <p className="text-xl font-bold text-amber-600 mt-1">{summary.pending_delivery || 0}</p>
            <span className="text-[10px] text-gray-400">Orders in transit</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-purple-500">
              <span className="text-[10px] font-bold uppercase text-gray-400">Feedback Pending</span>
              <FaClock />
            </div>
            <p className="text-xl font-bold text-purple-600 mt-1">{summary.feedback_pending || 0}</p>
            <span className="text-[10px] text-gray-400">Delivered, awaiting form</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-emerald-500">
              <span className="text-[10px] font-bold uppercase text-gray-400">Converted EPCs</span>
              <FaUserCheck />
            </div>
            <p className="text-xl font-bold text-emerald-600 mt-1">{summary.converted_epcs || 0}</p>
            <span className="text-[10px] text-gray-400">Commercial buyers</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-rose-500">
              <span className="text-[10px] font-bold uppercase text-gray-400">Non-converted</span>
              <FaUserTimes />
            </div>
            <p className="text-xl font-bold text-rose-600 mt-1">{summary.non_converted_epcs || 0}</p>
            <span className="text-[10px] text-gray-400">No commercial order</span>
          </div>
        </div>
      </div>

      {/* SECTION 7.B: WAREHOUSE-WISE DASHBOARD TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">B. Warehouse-wise Dashboard Table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-6">Warehouse</th>
                <th className="py-3 px-6 text-center">Available Stock</th>
                <th className="py-3 px-6 text-center">Ordered</th>
                <th className="py-3 px-6 text-center">Delivered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {warehouseTable.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">No warehouse stock data available.</td>
                </tr>
              ) : (
                warehouseTable.map((w, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-6 font-bold text-gray-900 flex items-center gap-2">
                      <FaWarehouse className="text-blue-500" />
                      {w.warehouse_name || "Regional Warehouse"}
                    </td>
                    <td className="py-3.5 px-6 text-center font-bold text-emerald-700">{w.available || 0}</td>
                    <td className="py-3.5 px-6 text-center font-semibold text-blue-700">{w.ordered || 0}</td>
                    <td className="py-3.5 px-6 text-center font-semibold text-purple-700">{w.delivered || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 8: CRITICAL BI CONVERSION ANALYSIS (Trial Kit vs Direct Quote) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <FiTrendingUp /> Section 8 &bull; Critical Business Intelligence
            </div>
            <h2 className="text-xl md:text-2xl font-black">
              Trial Kit vs. Direct Commercial Quote Conversion Analysis
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Strict Attribution: Unique EPCs are counted once per channel. Trial kits themselves are test units and do not count as commercial conversions.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-mono">Formula Applied</span>
            <code className="text-xs text-emerald-400 font-bold font-mono">
              (EPCs with Orders / Unique EPCs) * 100
            </code>
          </div>
        </div>

        {/* Channel A vs Channel B Comparison Table */}
        <div className="overflow-x-auto bg-slate-800/60 rounded-2xl border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-5">Metric</th>
                <th className="py-3.5 px-5 text-emerald-400 font-bold">Channel A – Trial Kit Conversion</th>
                <th className="py-3.5 px-5 text-blue-400 font-bold">Channel B – Direct Commercial Quote</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-medium">
              <tr className="hover:bg-slate-700/30">
                <td className="py-3 px-5 text-slate-300 font-semibold">Total EPC Leads</td>
                <td className="py-3 px-5 font-bold text-white text-sm">{channelA?.total_epc_leads ?? 0}</td>
                <td className="py-3 px-5 font-bold text-white text-sm">{channelB?.total_epc_leads ?? 0}</td>
              </tr>
              <tr className="hover:bg-slate-700/30">
                <td className="py-3 px-5 text-slate-300 font-semibold">Commercial Orders Received</td>
                <td className="py-3 px-5 font-bold text-white text-sm">{channelA?.orders_received ?? 0}</td>
                <td className="py-3 px-5 font-bold text-white text-sm">{channelB?.orders_received ?? 0}</td>
              </tr>
              <tr className="hover:bg-slate-700/30 bg-emerald-950/20">
                <td className="py-3.5 px-5 text-slate-200 font-bold">Conversion Ratio</td>
                <td className="py-3.5 px-5 font-black text-emerald-400 text-base">{channelA?.conversion_ratio ?? "0%"}</td>
                <td className="py-3.5 px-5 font-black text-blue-400 text-base">{channelB?.conversion_ratio ?? "0%"}</td>
              </tr>
              <tr className="hover:bg-slate-700/30">
                <td className="py-3 px-5 text-slate-300 font-semibold">Total Commercial Sales Value</td>
                <td className="py-3 px-5 font-bold text-white text-sm">₹{channelA?.total_sales_value_inr?.toLocaleString() ?? 0}</td>
                <td className="py-3 px-5 font-bold text-white text-sm">₹{channelB?.total_sales_value_inr?.toLocaleString() ?? 0}</td>
              </tr>
              <tr className="hover:bg-slate-700/30">
                <td className="py-3 px-5 text-slate-300 font-semibold">Average Order Value (AOV)</td>
                <td className="py-3 px-5 font-bold text-white text-sm">₹{channelA?.average_order_value_inr?.toLocaleString() ?? 0}</td>
                <td className="py-3 px-5 font-bold text-white text-sm">₹{channelB?.average_order_value_inr?.toLocaleString() ?? 0}</td>
              </tr>
              <tr className="hover:bg-slate-700/30">
                <td className="py-3 px-5 text-slate-300 font-semibold">Sales Cycle (Duration)</td>
                <td className="py-3 px-5 font-bold text-emerald-300">{channelA?.sales_cycle_days ?? "0 Days"}</td>
                <td className="py-3 px-5 font-bold text-blue-300">{channelB?.sales_cycle_days ?? "0 Days"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Additional Analytics Cards */}
        {biExtra && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Trial Kit Cost vs Revenue</span>
              <p className="text-sm font-bold text-emerald-400 mt-1">
                ₹{biExtra.commercial_sales_generated_inr?.toLocaleString()} Rev
              </p>
              <span className="text-[10px] text-slate-400">Cost: ₹{biExtra.estimated_trial_kit_cost_inr?.toLocaleString()}</span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Revenue Per Kit Delivered</span>
              <p className="text-sm font-bold text-white mt-1">
                ₹{biExtra.revenue_per_trial_kit_delivered_inr?.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400">Total delivered: {biExtra.total_trial_kits_delivered}</span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Avg Days to First Order</span>
              <p className="text-sm font-bold text-amber-300 mt-1">
                {biExtra.avg_days_to_first_commercial_order} Days
              </p>
              <span className="text-[10px] text-slate-400">From trial delivery</span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Repeat Commercial Orders</span>
              <p className="text-sm font-bold text-purple-300 mt-1">
                {biExtra.repeat_commercial_orders} Orders
              </p>
              <span className="text-[10px] text-slate-400">From converted EPCs</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
