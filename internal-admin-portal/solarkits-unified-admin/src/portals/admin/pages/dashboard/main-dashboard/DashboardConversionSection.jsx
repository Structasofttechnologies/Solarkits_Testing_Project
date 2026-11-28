import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { FiPercent, FiInfo, FiExternalLink, FiChevronRight } from 'react-icons/fi';
import ConversionVerifyModal from './ConversionVerifyModal';

const COLORS = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

export default function DashboardConversionSection({ data = {}, onDrillDown }) {
  const { conversions = [] } = data;
  const [selectedMetric, setSelectedMetric] = useState(null);

  return (
    <div id="section-conversion" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
            <FiPercent className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Conversion Analytics
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              End-to-end funnel ratios with mathematical verification inspector
            </p>
          </div>
        </div>
        <div className="text-xs text-text-secondary flex items-center gap-1.5 bg-bg-light/80 dark:bg-bg-dark px-3 py-1.5 rounded-lg border border-border/60">
          <FiInfo className="w-3.5 h-3.5 text-primary" />
          <span>Click any card to inspect numerator & denominator</span>
        </div>
      </div>

      {/* 6 Documented Conversion Ratio Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {conversions.map((conv, idx) => (
          <div
            key={conv.id}
            onClick={() => setSelectedMetric(conv)}
            className="group relative bg-bg-light/50 dark:bg-bg-dark border border-border/70 dark:border-border-dark hover:border-primary/60 rounded-xl p-3.5 cursor-pointer transition-all duration-200 hover:shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] font-bold text-text-secondary dark:text-text-secondary-dark line-clamp-1">
                  {conv.metric}
                </span>
                <FiChevronRight className="w-3 h-3 text-text-secondary group-hover:text-primary transition-colors" />
              </div>
              <div className="text-2xl font-black text-text-primary dark:text-text-primary-dark mb-1">
                {conv.ratio}%
              </div>
            </div>
            <div className="text-[10px] font-mono text-text-secondary border-t border-border/40 pt-1.5 flex items-center justify-between">
              <span>{conv.numerator} / {conv.denominator}</span>
              <span className="text-primary font-semibold group-hover:underline">Verify</span>
            </div>
          </div>
        ))}
      </div>

      {/* Conversion Funnel Bar Chart */}
      <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
        <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
          Stage-Wise Conversion Percentage Funnel
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conversions}>
              <XAxis dataKey="metric" stroke="#94a3b8" fontSize={10} interval={0} angle={-10} textAnchor="end" height={40} />
              <YAxis unit="%" stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Conversion Rate']} />
              <Bar dataKey="ratio" fill="#ec4899" radius={[6, 6, 0, 0]}>
                {conversions.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal Inspector */}
      <ConversionVerifyModal
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        metric={selectedMetric}
        onDrillDown={onDrillDown}
      />
    </div>
  );
}
