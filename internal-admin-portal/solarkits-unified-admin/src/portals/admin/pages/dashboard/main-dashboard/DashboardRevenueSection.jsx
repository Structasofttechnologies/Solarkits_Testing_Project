import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { FiDollarSign, FiExternalLink, FiPieChart, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';

const COLORS = ['#0d9488', '#0284c7', '#6366f1', '#e11d48', '#d97706', '#16a34a'];

const formatInr = (num) => `₹${(Number(num) || 0).toLocaleString('en-IN')}`;

export default function DashboardRevenueSection({ data = {}, onDrillDown }) {
  const { kpis = {}, revenueByKitType = [] } = data;

  const financeComparison = [
    { name: 'Total Order Value', amount: kpis.totalOrderValue || 0, fill: '#0284c7' },
    { name: 'Approved COGS', amount: kpis.approvedCogs || 0, fill: '#64748b' },
    { name: 'Gross Margin', amount: kpis.grossMargin || 0, fill: '#0d9488' },
    { name: 'Realized Revenue', amount: kpis.realizedRevenue || 0, fill: '#16a34a' },
    { name: 'Pending Collections', amount: kpis.pendingCollections || 0, fill: '#d97706' },
  ];

  return (
    <div id="section-revenue" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <FiDollarSign className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Revenue & Margin Analytics
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Financial reconciliation: Order value, actual realized collections, approved COGS & gross margin
            </p>
          </div>
        </div>
        <button
          onClick={() => onDrillDown && onDrillDown('orders', 'Confirmed Financial & Sales Orders')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <span>View Order Ledger</span>
          <FiExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Accounting Compliance Notice */}
      <div className="mb-5 px-3.5 py-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 text-xs text-teal-900 dark:text-teal-300 flex items-center justify-between">
        <span>
          <strong>Accounting Rules:</strong> Gross Margin represents confirmed sales revenue minus approved product COGS. Realized revenue counts verified payments. Cancelled orders are strictly excluded.
        </span>
      </div>

      {/* 11 Documented KPIs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Total Order Value</span>
          <span className="text-base font-black text-text-primary dark:text-text-primary-dark">{formatInr(kpis.totalOrderValue)}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Average Order Size</span>
          <span className="text-base font-black text-text-primary dark:text-text-primary-dark">{formatInr(kpis.averageOrderSize)}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Approved COGS</span>
          <span className="text-base font-black text-slate-600 dark:text-slate-400">{formatInr(kpis.approvedCogs)}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Gross Margin (INR)</span>
          <span className="text-base font-black text-teal-600 dark:text-teal-400">{formatInr(kpis.grossMargin)}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Gross Margin %</span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{kpis.grossMarginPct || 0}%</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Realized Revenue</span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatInr(kpis.realizedRevenue)}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Pending Collections</span>
          <span className="text-base font-black text-amber-600 dark:text-amber-400">{formatInr(kpis.pendingCollections)}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Overdue Collections</span>
          <span className="text-base font-black text-rose-600 dark:text-rose-400">{formatInr(kpis.overdueCollections)}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Total Orders</span>
          <span className="text-base font-black text-text-primary dark:text-text-primary-dark">{(kpis.totalOrders || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary block mb-1">Cancelled Value</span>
          <span className="text-base font-black text-rose-500">{formatInr(kpis.cancelledOrderValue)}</span>
        </div>
      </div>

      {/* Financial Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Breakdown Bar Chart */}
        <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
            Financial Reconciliation Breakdown (₹ INR)
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeComparison}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-10} textAnchor="end" height={35} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(value) => [formatInr(value), 'Amount']} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {financeComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Kit Type Donut Chart */}
        <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
            Revenue Distribution by Solar Kit Type
          </h3>
          <div className="h-60">
            {revenueByKitType && revenueByKitType.some((r) => r.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByKitType}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueByKitType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [formatInr(val), 'Revenue']} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-text-secondary">
                No confirmed sales by kit type in the selected period.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
