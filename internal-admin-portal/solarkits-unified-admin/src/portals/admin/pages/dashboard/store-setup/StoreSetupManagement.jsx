import React, { useState } from 'react';
import { 
  Store, 
  LayoutDashboard, 
  Sliders, 
  Award
} from 'lucide-react';
import StoreSetupDashboard from './StoreSetupDashboard';
import AllStoreSetups from './AllStoreSetups';
import StoreSetupDetail from './StoreSetupDetail';
import StoreSetupSettings from './StoreSetupSettings';
import FranchiseePerformanceRanking from './FranchiseePerformanceRanking';

export default function StoreSetupManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSetupId, setSelectedSetupId] = useState(null);

  const handleViewDetail = (setupId) => {
    setSelectedSetupId(setupId);
    setActiveTab('detail');
  };

  const handleBackToList = () => {
    setSelectedSetupId(null);
    setActiveTab('all-setups');
  };

  const tabs = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'all-setups', label: 'All Store Setups', icon: Store },
    { id: 'ranking', label: 'Franchisee Ranking', icon: Award },
    { id: 'settings', label: 'Document & Checklist Settings', icon: Sliders },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <Store className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Franchisee Store Setup & Operations
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage physical store execution, state employee assignments, delay approvals, verification & operations launch
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === 'all-setups' && activeTab === 'detail');
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'all-setups' && selectedSetupId) {
                  setSelectedSetupId(null);
                }
                setActiveTab(tab.id);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'dashboard' && (
        <StoreSetupDashboard
          onViewAll={() => setActiveTab('all-setups')}
          onViewDetail={handleViewDetail}
        />
      )}

      {activeTab === 'all-setups' && (
        <AllStoreSetups onViewDetail={handleViewDetail} />
      )}

      {activeTab === 'detail' && selectedSetupId && (
        <StoreSetupDetail
          setupId={selectedSetupId}
          onBack={handleBackToList}
        />
      )}

      {activeTab === 'ranking' && (
        <FranchiseePerformanceRanking />
      )}

      {activeTab === 'settings' && (
        <StoreSetupSettings />
      )}
    </div>
  );
}
