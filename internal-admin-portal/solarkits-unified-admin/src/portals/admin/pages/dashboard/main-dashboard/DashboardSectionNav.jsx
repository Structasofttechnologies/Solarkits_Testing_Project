import React from 'react';
import {
  FiGrid,
  FiGlobe,
  FiFileText,
  FiUsers,
  FiTrendingUp,
  FiPercent,
  FiBox,
  FiMap,
  FiLayers,
  FiDollarSign,
  FiSend,
  FiCpu,
} from 'react-icons/fi';

const SECTIONS = [
  { id: 'section-overview', label: 'Overview', icon: FiGrid },
  { id: 'section-website', label: 'Website Performance', icon: FiGlobe },
  { id: 'section-enquiry', label: 'Enquiry Funnel', icon: FiFileText },
  { id: 'section-epc', label: 'EPC Network', icon: FiUsers },
  { id: 'section-pipeline', label: 'Sales Pipeline', icon: FiTrendingUp },
  { id: 'section-conversion', label: 'Conversion Analytics', icon: FiPercent },
  { id: 'section-demand', label: 'Kit Demand', icon: FiBox },
  { id: 'section-geography', label: 'State Map', icon: FiMap },
  { id: 'section-cluster-geography', label: 'Cluster Map', icon: FiLayers },
  { id: 'section-insights-ai', label: 'Insights & AI', icon: FiCpu },
  { id: 'section-revenue', label: 'Revenue & Margin', icon: FiDollarSign },
  { id: 'section-campaign', label: 'Campaigns', icon: FiSend },
];

export default function DashboardSectionNav({ activeSection, onSelectSection }) {
  const scrollTo = (id) => {
    onSelectSection && onSelectSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="sticky top-0 z-20 bg-white/90 dark:bg-card-dark/90 backdrop-blur-md border-y border-border/80 dark:border-border-dark py-2.5 px-2 mb-6 -mx-4 md:-mx-6 px-4 md:px-6 shadow-xs">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => scrollTo(sec.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary dark:text-text-secondary-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-text-primary dark:hover:text-text-primary-dark'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
