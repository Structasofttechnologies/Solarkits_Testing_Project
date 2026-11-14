import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FiLayers,
  FiMap,
  FiFileText,
  FiTarget,
  FiBarChart2,
  FiAward,
  FiTool,
} from 'react-icons/fi';

import ClusterManagement from './ClusterManagement';
import FranchiseeTerritoryMap from './FranchiseeTerritoryMap';
import FranchiseeAgreementManagement from './FranchiseeAgreementManagement';
import FranchiseeGoalSettings from './FranchiseeGoalSettings';
import FranchiseePerformanceDashboard from './FranchiseePerformanceDashboard';
import BdeClusterManagement from './BdeClusterManagement';
import FranchiseeTicketsAdmin from './FranchiseeTicketsAdmin';

export default function FranchiseClusterHub({ defaultTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || defaultTab || 'clusters';

  const tabs = [
    { key: 'clusters', label: 'Cluster Management', icon: FiLayers, desc: 'Create Cluster, Districts, Fees' },
    { key: 'map', label: 'India Territory Map', icon: FiMap, desc: 'Interactive Allocation Map' },
    { key: 'agreements', label: 'Agreement Management', icon: FiFileText, desc: 'Yearly Tracking & Renewals' },
    { key: 'goals', label: 'Goal Settings', icon: FiTarget, desc: 'Annual EPC & Monthly Kits' },
    { key: 'performance', label: 'Performance Dashboard', icon: FiBarChart2, desc: 'Achievements & KPI Analytics' },
    { key: 'bde', label: 'BDE Management', icon: FiAward, desc: 'Cluster Assignment & Support' },
    { key: 'tickets', label: 'Support & Tickets', icon: FiTool, desc: 'Centralized SLA & Replacement' },
  ];

  const handleTabChange = (key) => {
    setSearchParams({ tab: key });
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar with Quick Descriptions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {currentTab === 'clusters' && (
          <ClusterManagement
            onOpenMapWithDistrict={(district) => {
              handleTabChange('map');
            }}
          />
        )}
        {currentTab === 'map' && (
          <FranchiseeTerritoryMap
            onCreateClusterFromDistrict={(district) => {
              handleTabChange('clusters');
            }}
          />
        )}
        {currentTab === 'agreements' && <FranchiseeAgreementManagement />}
        {currentTab === 'goals' && <FranchiseeGoalSettings />}
        {currentTab === 'performance' && <FranchiseePerformanceDashboard />}
        {currentTab === 'bde' && <BdeClusterManagement />}
        {currentTab === 'tickets' && <FranchiseeTicketsAdmin />}
      </div>
    </div>
  );
}
