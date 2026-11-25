import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBoxes, FaRoute, FaShippingFast, FaTruckLoading } from 'react-icons/fa';

import DeliveryQueue from '../../../admin/pages/solar-shop/delivery-management/DeliveryQueue';
import DeliveryTracking from '../../../admin/pages/solar-shop/delivery-management/DeliveryTracking';
import DeliveryManagement from './DeliveryManagement';
import OutForDeliveryStation from './OutForDeliveryStation';
import TrackDeliveryHub from './TrackDeliveryHub';

export default function UnifiedCustomerOutward({ defaultTab = 'dispatch' }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on pathname and search query
  const getInitialTab = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/tracking')) return 'tracking';
    if (path.includes('/queue')) return 'queue';
    if (path.includes('/map') || path.includes('/route-planner')) return 'map';

    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['dispatch', 'tracking', 'queue', 'map'].includes(tabParam)) {
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

    const prefix = location.pathname.startsWith('/warehouse-management-panel')
      ? '/warehouse-management-panel'
      : '/warehouse';

    if (tabKey === 'dispatch') {
      navigate(`${prefix}/delivery-management?tab=dispatch`, { replace: true });
    } else if (tabKey === 'queue') {
      navigate(`${prefix}/delivery-management/queue`, { replace: true });
    } else if (tabKey === 'map') {
      navigate(`${prefix}/delivery-management?tab=map`, { replace: true });
    } else if (tabKey === 'tracking') {
      navigate(`${prefix}/delivery-management/tracking`, { replace: true });
    }
  };

  const tabs = [
    {
      id: 'dispatch',
      badge: 'Dispatch Gate',
      label: 'Out for Delivery',
      sublabel: 'Vehicle, E-Way & Evidence Check',
      icon: FaTruckLoading,
    },
    {
      id: 'tracking',
      badge: 'Dual POD',
      label: 'Track Delivery & POD',
      sublabel: 'Live Dispatches, Photo & OTP POD',
      icon: FaShippingFast,
    },
    {
      id: 'queue',
      badge: 'FIFO Queue',
      label: 'FIFO Delivery Queue',
      sublabel: 'Auto-Consolidation & Fleet Match',
      icon: FaBoxes,
    },
    {
      id: 'map',
      badge: 'Interactive',
      label: 'Map & Route Planner',
      sublabel: 'Waypoints & Load Calculator',
      icon: FaRoute,
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
                <FaTruckLoading className="text-xl" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary leading-tight">
                  Customer Outward & Delivery Hub
                </h2>
                <p className="text-xs text-text-muted">
                  Unified dispatch management: FIFO Order Queue, Interactive Google Map Planner, and Live Trip Tracking
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
                        layoutId="activeCustomerOutwardTab"
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
                        {tab.badge}
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
          {activeTab === 'dispatch' && (
            <motion.div
              key="dispatch-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <OutForDeliveryStation onNavigateToTracking={() => handleTabChange('tracking')} />
            </motion.div>
          )}

          {activeTab === 'tracking' && (
            <motion.div
              key="tracking-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <TrackDeliveryHub />
            </motion.div>
          )}

          {activeTab === 'queue' && (
            <motion.div
              key="queue-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <DeliveryQueue />
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div
              key="map-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <DeliveryManagement />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
