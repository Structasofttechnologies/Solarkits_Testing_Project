/**
 * StoreDetailDrawer.jsx
 * Section J: Master Drill-Down Slide-Over Drawer for Store Dashboard
 * Maps directly to all 11 drill-down scenarios specified in Document Section 2.J.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDownload, FiDollarSign, FiBox, FiCheckCircle, FiUsers, FiShoppingCart } from 'react-icons/fi';
import AdminEpcBuyingAnalytics from './AdminEpcBuyingAnalytics';

const MotionDiv = motion.div;

export default function StoreDetailDrawer({ isOpen, onClose, title, kpiType, data, extra, recentOrders = [] }) {
  if (!isOpen) return null;

  const isEpcAnalytics = kpiType === 'Solar EPC Account Activity';

  // Filter matching records based on selected data entity
  const matchingOrders = (recentOrders || []).filter((ord) => {
    if (!data) return true;
    if (typeof data.kit === 'string' && ord.kit?.toLowerCase().includes(data.kit.toLowerCase())) return true;
    if (typeof data.name === 'string' && (
      ord.customer?.toLowerCase().includes(data.name.toLowerCase()) ||
      ord.franchisee?.toLowerCase().includes(data.name.toLowerCase()) ||
      ord.epc?.toLowerCase().includes(data.name.toLowerCase())
    )) return true;
    if (typeof data.district === 'string' && ord.district?.toLowerCase().includes(data.district.toLowerCase())) return true;
    if (typeof data.state === 'string' && ord.state?.toLowerCase().includes(data.state.toLowerCase())) return true;
    if (typeof data.area === 'string' && (
      ord.district?.toLowerCase().includes(data.area.toLowerCase()) ||
      ord.state?.toLowerCase().includes(data.area.toLowerCase())
    )) return true;
    return false;
  });

  const displayOrders = matchingOrders.length > 0 ? matchingOrders : (recentOrders || []);

  const handleDownloadLedgerCsv = () => {
    if (!displayOrders.length) return;
    const headers = ['Order Number', 'Customer', 'Amount', 'Date', 'Kit', 'Stage', 'Order Type', 'State', 'District'];
    const rows = displayOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.customer}"`,
      `"${o.amountFormatted}"`,
      `"${o.orderDate}"`,
      `"${o.kit}"`,
      `"${o.stage}"`,
      `"${o.orderType}"`,
      `"${o.state}"`,
      `"${o.district}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `store_audit_${(title || 'kpi').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <MotionDiv
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`w-screen ${isEpcAnalytics ? 'max-w-5xl' : 'max-w-2xl'} bg-surface shadow-2xl flex flex-col border-l border-border transition-all duration-300`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 gradient-primary text-text-inverse shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  {isEpcAnalytics ? 'EPC Commercial Intelligence & Buying Behavior' : 'Store Business Intelligence Drill-Down'}
                </span>
                <h2 className="text-base font-bold tracking-tight">{title || 'KPI Drill-Down'}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-text-inverse cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {isEpcAnalytics ? (
                <AdminEpcBuyingAnalytics
                  epcId={data?.id || data?._id}
                  initialEpc={data || {}}
                  epcList={extra?.epcList || []}
                />
              ) : (
                <>
                  {/* Context Summary Box */}
                  <div className="bg-surface-subtle p-4 rounded-2xl border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted font-medium">Metric Category:</span>
                      <span className="font-bold text-primary uppercase">{kpiType || 'COMMERCIAL_AUDIT'}</span>
                    </div>
                    {data?.revenue && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted font-medium">Revenue Contribution:</span>
                        <span className="font-black text-emerald-600 text-sm">
                          {typeof data.revenue === 'object' ? JSON.stringify(data.revenue) : String(data.revenue)}
                        </span>
                      </div>
                    )}
                    {data?.name && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted font-medium">Entity / Name:</span>
                        <span className="font-bold text-text">
                          {typeof data.name === 'object' ? (data.name?.name || data.name?.company_name || 'N/A') : String(data.name)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Live Detailed Records for this KPI */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-text text-sm">Underlying Transaction Ledger ({displayOrders.length} records)</h4>
                      <button
                        type="button"
                        onClick={handleDownloadLedgerCsv}
                        disabled={displayOrders.length === 0}
                        className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer disabled:opacity-40"
                      >
                        <FiDownload size={12} />
                        Download CSV
                      </button>
                    </div>

                    <div className="space-y-2">
                      {displayOrders.length > 0 ? (
                        displayOrders.slice(0, 15).map((ord) => (
                          <div
                            key={ord.id || ord.orderNumber}
                            className="p-3 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-primary">{ord.orderNumber}</span>
                              <span className="text-emerald-600 font-bold">{ord.amountFormatted}</span>
                            </div>
                            <div className="text-text font-medium flex items-center justify-between">
                              <span>Customer / EPC: {ord.customer}</span>
                              <span className="text-text-muted font-mono text-[11px]">{ord.orderDate}</span>
                            </div>
                            <div className="text-text-muted text-[11px] flex items-center justify-between">
                              <span>Kit: {ord.kit}</span>
                              <span className="px-2 py-0.5 rounded-md bg-surface-subtle text-text font-semibold">
                                {ord.stage}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-text-muted bg-surface-subtle rounded-xl border border-border">
                          No order transactions found for this selection in the current database filter.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface border border-border text-text hover:bg-surface-subtle cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </MotionDiv>
        </div>
      </div>
    </AnimatePresence>
  );
}

