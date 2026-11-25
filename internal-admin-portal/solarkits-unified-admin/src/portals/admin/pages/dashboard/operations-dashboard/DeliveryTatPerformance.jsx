/**
 * DeliveryTatPerformance.jsx
 * Average Delivery Time, Stage TAT Matching Matrix, and Configuration Controller
 */

import React, { useState } from 'react';
import {
  FiClock,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertTriangle,
  FiSliders,
  FiArrowUpRight,
  FiArrowDownRight,
} from 'react-icons/fi';
import { MdOutlineLocalShipping } from 'react-icons/md';

export default function DeliveryTatPerformance({
  deliveryTatMetrics = {},
  stageTatMatching = [],
  tatConfig = {},
  setTatConfig,
}) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempConfig, setTempConfig] = useState({ ...tatConfig });

  const {
    avgOrderToDelivery = 17.8,
    avgProductionTime = 7.9,
    avgSupplierDispatchTime = 2.1,
    avgWarehouseInwardTime = 1.2,
    avgVehicleBookingTime = 1.1,
    avgDispatchToDeliveryTime = 3.8,
    avgTimeToCompleteOrder = 19.4,
    byKitType = [],
    byOrderType = [],
    byStoreOrigin = [],
    delayDrivers = [],
    summaryComparison = {},
  } = deliveryTatMetrics;

  const handleSaveConfig = () => {
    if (setTatConfig) {
      setTatConfig(tempConfig);
    }
    setShowConfigModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <MdOutlineLocalShipping size={18} />
            </div>
            <h2 className="text-base font-bold text-text">Average Time to Delivery & Stage TAT Compliance</h2>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Monitor platform-wide actual delivery duration against configured SLA / TAT benchmarks
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTempConfig({ ...tatConfig });
            setShowConfigModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface border border-border text-text hover:bg-surface-subtle shadow-xs transition-colors cursor-pointer"
        >
          <FiSliders size={13} className="text-primary" />
          Configure Target TATs
        </button>
      </div>

      {/* Top Level Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-text-muted">Order-to-Delivery</span>
          <div className="text-xl font-black text-primary mt-1">{avgOrderToDelivery} Days</div>
          <span className="text-[10px] text-text-muted">Customer received</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-text-muted">Production Time</span>
          <div className="text-xl font-black text-text mt-1">{avgProductionTime} Days</div>
          <span className="text-[10px] text-amber-600 font-medium">+0.9d vs target</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-text-muted">Supplier Dispatch</span>
          <div className="text-xl font-black text-text mt-1">{avgSupplierDispatchTime} Days</div>
          <span className="text-[10px] text-emerald-600 font-medium">Within target</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-text-muted">Warehouse Inward</span>
          <div className="text-xl font-black text-text mt-1">{avgWarehouseInwardTime} Days</div>
          <span className="text-[10px] text-emerald-600 font-medium">Fast turn-around</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-text-muted">Vehicle Booking</span>
          <div className="text-xl font-black text-text mt-1">{avgVehicleBookingTime} Days</div>
          <span className="text-[10px] text-text-muted">Fleet allocation</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-text-muted">Dispatch-to-Delivery</span>
          <div className="text-xl font-black text-text mt-1">{avgDispatchToDeliveryTime} Days</div>
          <span className="text-[10px] text-danger font-medium">+0.8d vs target</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-text-muted">Total Order Closure</span>
          <div className="text-xl font-black text-text mt-1">{avgTimeToCompleteOrder} Days</div>
          <span className="text-[10px] text-text-muted">Finance & POD closed</span>
        </div>
      </div>

      {/* Grid: TAT Benchmark Summary & Stage Matching Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Card: Configured vs Actual Summary (Document Metric Card) */}
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text">Platform TAT Performance</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                {summaryComparison.status || 'Needs Improvement'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Consolidated delivery time against target SLA benchmark
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/60">
                <span className="text-text-muted font-medium">Configured TAT</span>
                <span className="font-bold text-text">{summaryComparison.configuredTat || '15 days'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/60">
                <span className="text-text-muted font-medium">Actual Average Time</span>
                <span className="font-bold text-text">{summaryComparison.actualAverage || '17.8 days'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/60">
                <span className="text-text-muted font-medium">Variance (Difference)</span>
                <span className="font-bold text-danger">{summaryComparison.difference || '+2.8 days above TAT'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/60">
                <span className="text-text-muted font-medium">Compliance Rate</span>
                <span className="font-bold text-emerald-600">{summaryComparison.tatPerformance || '81.5%'}</span>
              </div>
            </div>
          </div>

          {/* Top Stages Contributing to Delivery Delays */}
          <div className="pt-3 border-t border-border">
            <h4 className="text-xs font-bold text-text mb-2">Top Delay Contributing Stages</h4>
            <div className="space-y-1.5">
              {delayDrivers.map((driver) => (
                <div key={driver.stage} className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted truncate">{driver.stage}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-danger font-semibold">+{driver.excessDays}d</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-subtle font-mono text-text">
                      {driver.impactPct}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Stage-Wise TAT Matching Table (Document Table E) */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text">Stage-Wise Configured TAT vs Actual Processing Time</h3>
                <p className="text-xs text-text-muted">
                  Matching scenario identifying within-target vs overdue operational nodes
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4">Stage</th>
                    <th className="py-2.5 px-4">Configured TAT</th>
                    <th className="py-2.5 px-4">Actual Time</th>
                    <th className="py-2.5 px-4">Variance</th>
                    <th className="py-2.5 px-4">Compliance %</th>
                    <th className="py-2.5 px-4 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stageTatMatching.map((item) => {
                    const isWithin = item.result === 'Within TAT';
                    return (
                      <tr key={item.stage} className="hover:bg-surface-subtle transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text">{item.stage}</td>
                        <td className="py-2.5 px-4 text-text-muted">{item.configuredTat}</td>
                        <td className="py-2.5 px-4 font-medium text-text">{item.actualTime}</td>
                        <td className="py-2.5 px-4 font-medium">
                          <span className={item.difference.startsWith('-') ? 'text-emerald-600' : 'text-danger'}>
                            {item.difference}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-text font-semibold">{item.compliancePct}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isWithin
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800'
                            }`}
                          >
                            {isWithin ? <FiCheckCircle size={11} /> : <FiAlertTriangle size={11} />}
                            {item.result}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Comparison Strips (Loose vs PO and Company vs Franchisee) */}
          <div className="p-3 bg-surface-subtle border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-text">Loose Quantity vs PO Orders:</span>
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>Loose Quantity Orders: <b className="text-text">12.4 days</b> (TAT: 10d)</span>
                <span className="text-emerald-600 font-semibold">88% Within</span>
              </div>
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>PO Orders (Full Kit): <b className="text-text">18.6 days</b> (TAT: 15d)</span>
                <span className="text-amber-600 font-semibold">80% Within</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-text">Company Store vs Franchisee Store:</span>
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>Company Store Orders: <b className="text-text">14.5 days</b> (TAT: 14d)</span>
                <span className="text-emerald-600 font-semibold">96% Within</span>
              </div>
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>Franchisee Store Orders: <b className="text-text">17.9 days</b> (TAT: 15d)</span>
                <span className="text-amber-600 font-semibold">83% Within</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TAT Configurator Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-text">Configure Stage Target TAT (Days)</h3>
              <p className="text-xs text-text-muted">
                Set baseline turnaround times used across calculations and escalation triggers
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-text-muted font-medium mb-1">Order Approval (Days)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempConfig.orderApprovalDays || 1}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, orderApprovalDays: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text"
                />
              </div>

              <div>
                <label className="block text-text-muted font-medium mb-1">PO Approval (Days)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempConfig.poApprovalDays || 1}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, poApprovalDays: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text"
                />
              </div>

              <div>
                <label className="block text-text-muted font-medium mb-1">Supplier Production (Days)</label>
                <input
                  type="number"
                  step="1"
                  value={tempConfig.supplierProductionDays || 7}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, supplierProductionDays: parseFloat(e.target.value) || 7 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text"
                />
              </div>

              <div>
                <label className="block text-text-muted font-medium mb-1">Warehouse Inward (Days)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempConfig.warehouseInwardDays || 2}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, warehouseInwardDays: parseFloat(e.target.value) || 2 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text"
                />
              </div>

              <div>
                <label className="block text-text-muted font-medium mb-1">Vehicle Booking (Days)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempConfig.vehicleBookingDays || 1}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, vehicleBookingDays: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text"
                />
              </div>

              <div>
                <label className="block text-text-muted font-medium mb-1">Customer Delivery (Days)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tempConfig.deliveryDays || 3}
                  onChange={(e) =>
                    setTempConfig({ ...tempConfig, deliveryDays: parseFloat(e.target.value) || 3 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border text-text hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover"
              >
                Save TAT Benchmarks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

