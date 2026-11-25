/**
 * ExpansionBreadcrumbs.jsx
 *
 * Clickable breadcrumb navigation for the Vision Dashboard drill-down.
 * Hierarchy: India → Cluster → State → District → Franchisee → Warehouse
 *
 * Each crumb is clickable to navigate back to that level.
 * Current level is displayed as non-clickable active state.
 */

import { motion } from 'framer-motion';
import { FiChevronRight, FiGlobe } from 'react-icons/fi';
import { DRILL_LEVELS } from './useVisionData';

const LEVEL_ICONS = {
  india:       '🇮🇳',
  cluster:     '🗺️',
  state:       '📍',
  district:    '🏙️',
  franchisee:  '🏪',
  warehouse:   '🏭',
};

const LEVEL_LABELS = {
  india:       'India',
  cluster:     'Cluster',
  state:       'State',
  district:    'District',
  franchisee:  'Franchisee',
  warehouse:   'Warehouse',
};

export default function ExpansionBreadcrumbs({ drillLevel, drillPath, drillBackTo }) {
  // Build the full crumb array: always start with India
  const crumbs = [
    { level: 'india', id: null, name: 'India' },
    ...drillPath,
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb trail */}
      <div className="flex items-center flex-wrap gap-1">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          const isActive = crumb.level === drillLevel;
          return (
            <motion.span
              key={`${crumb.level}-${crumb.id || 'root'}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-1"
            >
              {idx > 0 && <FiChevronRight size={12} className="text-text-muted shrink-0" />}
              <button
                type="button"
                onClick={() => !isActive && drillBackTo(crumb.level)}
                disabled={isActive}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-primary text-white cursor-default shadow-sm'
                    : 'text-text-secondary hover:text-primary hover:bg-primary/8 cursor-pointer'}`}
              >
                <span>{LEVEL_ICONS[crumb.level]}</span>
                <span>{crumb.name || LEVEL_LABELS[crumb.level]}</span>
              </button>
            </motion.span>
          );
        })}
      </div>

      {/* Level indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-3 py-1 bg-surface border border-border rounded-full">
          <FiGlobe size={11} className="text-primary" />
          <span className="text-[11px] text-text-secondary">
            Viewing: <span className="font-semibold text-text-primary">{LEVEL_LABELS[drillLevel]} Level</span>
          </span>
        </div>

        {/* Hierarchy pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {DRILL_LEVELS.map((lvl, i) => (
            <div key={lvl} className="flex items-center gap-1 shrink-0">
              {i > 0 && <span className="text-text-muted text-[10px]">→</span>}
              <span className={`text-[10px] px-2 py-0.5 rounded-full
                ${lvl === drillLevel
                  ? 'bg-primary text-white font-semibold'
                  : DRILL_LEVELS.indexOf(lvl) < DRILL_LEVELS.indexOf(drillLevel)
                    ? 'bg-primary/15 text-primary/70'
                    : 'bg-surface-hover text-text-muted border border-border'}`}
              >
                {LEVEL_LABELS[lvl]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
