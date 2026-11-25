/**
 * ConfigurationSummaryKpis.jsx
 *
 * Top Summary KPI Cards for Configuration Dashboard
 */

import React from 'react';
import { FiLayers, FiMapPin, FiUsers, FiShoppingBag, FiGlobe } from 'react-icons/fi';
import { HiCube } from 'react-icons/hi';
import { FaUserTie } from 'react-icons/fa';

export default function ConfigurationSummaryKpis({ stats, onSelectCategory, onToggleRegional }) {
  const cards = [
    {
      id: 'total',
      title: 'Total Config Modules',
      value: stats.totalModules,
      subtitle: 'Across entire SolarKits ecosystem',
      icon: <FiLayers className="text-primary" size={20} />,
      bg: 'from-primary/10 to-primary/5',
      border: 'border-primary/20',
      action: () => onSelectCategory('all'),
    },
    {
      id: 'regional',
      title: 'Regional Modules',
      value: stats.regionalModules,
      subtitle: 'State & District dependent',
      icon: <FiMapPin className="text-amber-500" size={20} />,
      bg: 'from-amber-500/10 to-amber-500/5',
      border: 'border-amber-500/20',
      action: onToggleRegional,
      badge: 'Location Impact',
    },
    {
      id: 'bde',
      title: 'BDE Management',
      value: stats.bdeModules,
      subtitle: 'Onboarding, territories & goals',
      icon: <FaUserTie className="text-blue-500" size={18} />,
      bg: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-500/20',
      action: () => onSelectCategory('bde'),
    },
    {
      id: 'catalog',
      title: 'SolarKits & SolarShop',
      value: stats.productShopModules,
      subtitle: 'Catalogs, margins & pricing',
      icon: <HiCube className="text-emerald-500" size={20} />,
      bg: 'from-emerald-500/10 to-emerald-500/5',
      border: 'border-emerald-500/20',
      action: () => onSelectCategory('solarkits'),
    },
    {
      id: 'states',
      title: 'Operative States',
      value: stats.activeStatesCount,
      subtitle: 'Active geographic territories',
      icon: <FiGlobe className="text-purple-500" size={20} />,
      bg: 'from-purple-500/10 to-purple-500/5',
      border: 'border-purple-500/20',
      action: () => onSelectCategory('location'),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.id}
          onClick={c.action}
          className={`card p-4 rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-text-secondary line-clamp-1">{c.title}</span>
            <div className="p-2 rounded-xl bg-card border border-border/60 shadow-2xs shrink-0 group-hover:scale-110 transition-transform">
              {c.icon}
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-text-primary tracking-tight">
              {c.value}
            </div>
            <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
              {c.subtitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
