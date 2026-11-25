import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTruck, FaBuilding, FaTruckLoading, FaUsers, FaCogs } from 'react-icons/fa';

import PhysicalVehicles from '../../../admin/pages/solar-shop/delivery-management/PhysicalVehicles';
import TransportVendors from '../../../admin/pages/solar-shop/delivery-management/TransportVendors';
import VehicleMaster from '../../../admin/pages/solar-shop/delivery-management/VehicleMaster';

export default function UnifiedFleetManagement({ defaultTab = 'fleet' }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL or prop
  const getInitialTab = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('vehicle-master')) return 'master';
    if (path.includes('providers') || path.includes('vendors')) return 'vendors';
    if (path.includes('fleet') || path.includes('vehicles-drivers')) return 'fleet';

    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['fleet', 'vendors', 'master'].includes(tabParam)) {
      return tabParam;
    }
    return defaultTab;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname, location.search, defaultTab]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    // Determine path based on current location
    const prefix = location.pathname.startsWith('/warehouse-management-panel')
      ? '/warehouse-management-panel'
      : '/warehouse';

    if (tabKey === 'fleet') {
      navigate(`${prefix}/delivery-management/fleet`, { replace: true });
    } else if (tabKey === 'vendors') {
      navigate(`${prefix}/delivery-management/providers`, { replace: true });
    } else if (tabKey === 'master') {
      navigate(`${prefix}/delivery-management/vehicle-master`, { replace: true });
    }
  };

  const tabs = [
    {
      id: 'master',
      step: 'Step 1',
      label: 'Vehicle Master',
      sublabel: 'Model Catalog & Dimensions',
      icon: FaTruckLoading,
    },
    {
      id: 'vendors',
      step: 'Step 2',
      label: 'Transport Vendors',
      sublabel: 'Logistics Partners',
      icon: FaBuilding,
    },
    {
      id: 'fleet',
      step: 'Step 3',
      label: 'Live Fleet & Vehicles',
      sublabel: 'Drivers & Availability',
      icon: FaTruck,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Top Unified Tabs Header ── */}
      <div className="px-6 pt-5 pb-1">
        <div className="bg-surface/80 backdrop-blur-md p-2 rounded-2xl border border-border shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <FaTruck className="text-xl" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary leading-tight">
                  Vehicles, Drivers & Fleet Hub
                </h2>
                <p className="text-xs text-text-muted">
                  Unified control for Catalog Models (Step 1), Transport Vendors (Step 2), and Live Drivers & Fleet (Step 3)
                </p>
              </div>
            </div>

            {/* Segmented Control Bar */}
            <div className="flex items-center gap-1.5 p-1 bg-surface-hover/80 rounded-xl border border-border/60 w-full sm:w-auto overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeFleetTab"
                        className="absolute inset-0 bg-linear-to-r from-primary to-primary-end rounded-lg"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon className="text-sm" />
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-surface text-text-muted border border-border/50'
                        }`}
                      >
                        {tab.step}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Content Views ── */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'fleet' && (
            <motion.div
              key="fleet-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <PhysicalVehicles />
            </motion.div>
          )}

          {activeTab === 'vendors' && (
            <motion.div
              key="vendors-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <TransportVendors />
            </motion.div>
          )}

          {activeTab === 'master' && (
            <motion.div
              key="master-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <VehicleMaster />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
