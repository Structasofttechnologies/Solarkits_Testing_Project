/**
 * EpcProfileDrawer.jsx
 * Slide-Over Drawer for EPC Customer Behavior & Telemetry Inspection.
 * Displays both the full Buying Behavior & Order Analytics suite (matching Screenshot 1)
 * and the Customer Account Overview & Telemetry logs (matching Screenshot 3).
 */

import React, { useState, useEffect } from 'react';
import {
  FiX,
  FiUser,
  FiAlertTriangle,
  FiRefreshCw,
  FiPhone,
  FiMail,
  FiMapPin,
  FiShoppingCart,
  FiPackage,
  FiFileText,
  FiClock,
  FiTrendingUp,
  FiActivity,
} from 'react-icons/fi';
import { epcAnalyticsApi } from '../../../api/epcAnalyticsApi';
import AdminIndividualEpcBuyingAnalytics from './AdminIndividualEpcBuyingAnalytics';

export default function EpcProfileDrawer({
  isOpen,
  onClose,
  epcId,
  dateRange = 'last_30_days',
  bdeList = [],
  onProfileUpdated,
}) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'telemetry'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);

  // Fetch Full Profile Telemetry on open
  useEffect(() => {
    if (!isOpen || !epcId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    epcAnalyticsApi
      .getEpcProfileDetail(epcId, { dateRange })
      .then((res) => {
        if (!isMounted) return;
        if (res) {
          setProfileData(res);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Failed to load EPC telemetry detail');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, epcId, dateRange]);

  if (!isOpen) return null;

  const p = profileData?.profile || {};
  const t = profileData?.telemetry || {};
  const recentOrders = profileData?.recentOrders || [];
  const recentQuotes = profileData?.recentQuotes || [];
  const abandonmentHistory = profileData?.abandonmentHistory || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-5xl xl:max-w-6xl bg-surface border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
              <FiUser size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-text">{p.name || 'EPC Account Profile'}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${p.behaviorStatus === 'loyal_repeat'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : p.behaviorStatus === 'at_risk'
                        ? 'bg-rose-500/10 text-rose-600'
                        : 'bg-blue-500/10 text-blue-600'
                    }`}
                >
                  {(p.behaviorStatus || 'active').replace('_', ' ')}
                </span>
                {p.customerTier && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                    {p.customerTier}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {p.contactPerson || 'Authorized Representative'} • {p.district || 'District'}, {p.state || 'State'} • GSTIN: {p.gstin || 'Unregistered'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-surface shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'analytics'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text hover:bg-surface-subtle'
              }`}
          >
            <FiTrendingUp size={15} />
            <span>1. Buying Behavior & Order Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'telemetry'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-text hover:bg-surface-subtle'
              }`}
          >
            <FiActivity size={15} />
            <span>2. Account Overview & Telemetry Log</span>
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {activeTab === 'analytics' && (
            <AdminIndividualEpcBuyingAnalytics
              epcId={epcId}
              onNavigateToTelemetryTab={() => setActiveTab('telemetry')}
            />
          )}

          {activeTab === 'telemetry' && (
            <>
              {loading && (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
                  <FiRefreshCw className="animate-spin text-primary" size={24} />
                  <span>Loading complete EPC telemetry...</span>
                </div>
              )}

              {!loading && (
                <>
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-200 text-rose-700 flex items-center gap-2">
                      <FiAlertTriangle size={15} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Section 1: Real-Time Behavior Telemetry Strip */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      Store Engagement & Purchase Telemetry
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-surface-subtle/50 p-2.5 rounded-xl border border-border">
                        <span className="text-[10px] text-text-muted block">Store Visits</span>
                        <span className="text-base font-black text-text">{t.storeVisits ?? 0}</span>
                        {t.allTimeStoreVisits !== undefined && t.allTimeStoreVisits !== t.storeVisits && (
                          <span className="text-[9px] text-text-muted block mt-0.5">
                            {t.allTimeStoreVisits} all-time
                          </span>
                        )}
                      </div>
                      <div className="bg-surface-subtle/50 p-2.5 rounded-xl border border-border">
                        <span className="text-[10px] text-text-muted block">Datasheet Downloads</span>
                        <span className="text-base font-black text-blue-600">{t.datasheetDownloads ?? 0}</span>
                      </div>
                      <div className="bg-surface-subtle/50 p-2.5 rounded-xl border border-border">
                        <span className="text-[10px] text-text-muted block">Cart Abandonment Ratio</span>
                        <span className="text-base font-black text-rose-600">{t.cartAbandonmentRatio || '0.0%'}</span>
                      </div>
                      <div className="bg-surface-subtle/50 p-2.5 rounded-xl border border-border">
                        <span className="text-[10px] text-text-muted block">Repeat Purchases</span>
                        <span className="text-base font-black text-emerald-600">{t.repeatOrdersCount ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Account Overview (Read-Only) */}
                  <div className="bg-surface-subtle/30 rounded-2xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="font-bold text-text text-xs uppercase tracking-wider">
                        Customer Account Overview
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                        {p.customerTier || 'Standard EPC'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-text">
                        <FiPhone className="text-text-muted shrink-0" size={13} />
                        <span className="text-text-muted">WhatsApp:</span>
                        <span className="font-semibold">{p.whatsapp || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-text">
                        <FiMail className="text-text-muted shrink-0" size={13} />
                        <span className="text-text-muted">Email:</span>
                        <span className="font-semibold truncate">{p.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-text">
                        <FiMapPin className="text-text-muted shrink-0" size={13} />
                        <span className="text-text-muted">Location:</span>
                        <span className="font-semibold">{p.district}, {p.state}</span>
                      </div>
                      <div className="flex items-center gap-2 text-text">
                        <FiUser className="text-text-muted shrink-0" size={13} />
                        <span className="text-text-muted">Assigned BDE:</span>
                        <span className="font-semibold">{p.assignedBde?.name || 'Central Pool'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Abandoned Carts History */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      Cart Abandonment Log
                    </span>
                    <div className="space-y-2">
                      {abandonmentHistory.length === 0 ? (
                        <div className="text-text-muted p-3 bg-surface-subtle/20 rounded-xl text-center">
                          No active abandoned cart items recorded.
                        </div>
                      ) : (
                        abandonmentHistory.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-surface-subtle/30 rounded-xl border border-border p-3 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-text">{item.kit}</div>
                              <div className="text-[11px] text-text-muted mt-0.5">
                                {item.reason} • {item.abandonedDate}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-rose-600 text-xs block">{item.estimatedValue}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Section 4: Recent Orders */}
                  {recentOrders.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1.5">
                        <FiPackage size={13} className="text-primary" />
                        <span>Recent Confirmed Orders ({recentOrders.length})</span>
                      </span>
                      <div className="space-y-2">
                        {recentOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className="bg-surface-subtle/30 rounded-xl border border-border p-3 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-text">{ord.orderNumber}</div>
                              <div className="text-[11px] text-text-muted mt-0.5">
                                {ord.orderType} • {ord.date}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-600 block">{ord.amountFormatted}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                                {ord.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 5: Recent Quotes */}
                  {recentQuotes.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1.5">
                        <FiFileText size={13} className="text-blue-600" />
                        <span>Recent Quotes & Inquiries ({recentQuotes.length})</span>
                      </span>
                      <div className="space-y-2">
                        {recentQuotes.map((q) => (
                          <div
                            key={q.id}
                            className="bg-surface-subtle/30 rounded-xl border border-border p-3 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-text">{q.quoteNumber}</div>
                              <div className="text-[11px] text-text-muted mt-0.5">
                                {q.date}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-text block">{q.totalAmount}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold uppercase">
                                {q.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
