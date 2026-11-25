/**
 * OrderStatusGrid.jsx
 * 16 Order Status Cards with counts, indicators, and drill-down support
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiTruck,
  FiBox,
  FiDollarSign,
  FiPackage,
  FiXCircle,
  FiRotateCcw,
  FiArrowRight,
} from 'react-icons/fi';
import { MdOutlinePrecisionManufacturing, MdWarehouse, MdAssignmentTurnedIn } from 'react-icons/md';

const iconMap = {
  new_orders: <FiBox className="text-blue-500" size={20} />,
  approval_pending: <FiClock className="text-amber-500" size={20} />,
  po_pending: <MdAssignmentTurnedIn className="text-amber-600" size={20} />,
  procurement_in_progress: <FiPackage className="text-indigo-500" size={20} />,
  supplier_payment_pending: <FiDollarSign className="text-orange-500" size={20} />,
  production_in_progress: <MdOutlinePrecisionManufacturing className="text-purple-500" size={20} />,
  warehouse_inward_pending: <MdWarehouse className="text-sky-500" size={20} />,
  kit_preparation: <FiBox className="text-teal-500" size={20} />,
  ready_for_dispatch: <FiPackage className="text-cyan-500" size={20} />,
  vehicle_booking_pending: <FiTruck className="text-amber-500" size={20} />,
  dispatched: <FiTruck className="text-blue-600" size={20} />,
  in_transit: <FiTruck className="text-indigo-600" size={20} />,
  delivered: <FiCheckCircle className="text-emerald-500" size={20} />,
  completed: <FiCheckCircle className="text-green-600" size={20} />,
  cancelled: <FiXCircle className="text-red-500" size={20} />,
  returns_replacement: <FiRotateCcw className="text-rose-500" size={20} />,
};

const badgeClasses = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  green: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800',
  red: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

export default function OrderStatusGrid({ statusCards = [], onSelectStatus }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-text">Order Status Overview</h2>
          <p className="text-xs text-text-muted">
            End-to-end order operational lifecycle counts with interactive drill-down
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-subtle text-text-muted border border-border">
          16 Active Operational Stages
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {statusCards.map((card, idx) => {
          const colorClass = badgeClasses[card.color] || badgeClasses.blue;
          return (
            <motion.div
              key={card.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              onClick={() => onSelectStatus && onSelectStatus(card)}
              className="group relative bg-surface rounded-2xl border border-border hover:border-primary/50 p-3 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-surface-subtle">
                    {iconMap[card.id] || <FiBox size={18} />}
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
                    {card.count}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-text group-hover:text-primary transition-colors line-clamp-1">
                  {card.name}
                </h4>
                <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5" title={card.description}>
                  {card.description}
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-text-muted group-hover:text-primary font-medium">
                <span>View Details</span>
                <FiArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

