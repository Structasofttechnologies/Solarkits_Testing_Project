/**
 * EpcDirectorySection.jsx
 * EPC Directory with Behavioral Classification & Quick Action to Open EPC Profile Drawer
 */

import React, { useState } from 'react';
import {
  FiUsers,
  FiSearch,
  FiEdit,
  FiExternalLink,
  FiMapPin,
  FiPhone,
  FiMail,
  FiShoppingCart,
  FiRepeat,
  FiEye,
  FiDownload,
  FiCheckCircle,
  FiAlertTriangle,
} from 'react-icons/fi';

export default function EpcDirectorySection({
  epcs = [],
  onSelectEpc,
  searchQuery = '',
}) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = epcs.filter((e) => {
    // Quick status filter
    if (statusFilter !== 'all' && e.behaviorStatus !== statusFilter) {
      return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = e.name?.toLowerCase().includes(q);
      const matchContact = e.contactPerson?.toLowerCase().includes(q);
      const matchState = e.state?.toLowerCase().includes(q);
      const matchDistrict = e.district?.toLowerCase().includes(q);
      if (!matchName && !matchContact && !matchState && !matchDistrict) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (st) => {
    switch (st) {
      case 'loyal_repeat':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-700',
          label: 'Loyal Repeat',
          icon: FiRepeat,
        };
      case 'at_risk':
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-700',
          label: 'At Risk (Drop-off)',
          icon: FiAlertTriangle,
        };
      case 'dormant':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-700',
          label: 'Dormant',
          icon: FiAlertTriangle,
        };
      case 'active':
      default:
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-700',
          label: 'Active',
          icon: FiCheckCircle,
        };
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'Platinum Partner':
        return 'bg-purple-500/10 text-purple-700 border-purple-200';
      case 'Gold Partner':
        return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'Silver Partner':
        return 'bg-slate-500/10 text-slate-700 border-slate-200';
      default:
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs space-y-4">
      {/* Header & Quick Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <FiUsers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-text">EPC Behavioral Profile Directory</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                {filtered.length} EPCs
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Click &quot;Manage Profile&quot; on any EPC to inspect telemetry and update behavioral settings
            </p>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:bg-surface-subtle'
            }`}
          >
            All EPCs ({epcs.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('at_risk')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              statusFilter === 'at_risk'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            At Risk
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('loyal_repeat')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              statusFilter === 'loyal_repeat'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            Loyal Repeat
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('dormant')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              statusFilter === 'dormant'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-600 hover:bg-amber-50'
            }`}
          >
            Dormant
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
              <th className="py-2.5 px-3">EPC Contractor & Contact</th>
              <th className="py-2.5 px-3">Territory</th>
              <th className="py-2.5 px-3">Tier</th>
              <th className="py-2.5 px-3">Behavior Status</th>
              <th className="py-2.5 px-3 text-right">Store Visits</th>
              <th className="py-2.5 px-3 text-right">Downloads</th>
              <th className="py-2.5 px-3 text-right">Carts Created</th>
              <th className="py-2.5 px-3 text-right">Cart Abandonment</th>
              <th className="py-2.5 px-3 text-right">Orders Placed</th>
              <th className="py-2.5 px-3 text-right">Repeat Orders</th>
              <th className="py-2.5 px-3">Assigned BDE</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((e) => {
              const st = getStatusBadge(e.behaviorStatus);
              const StIcon = st.icon;

              return (
                <tr key={e.id} className="hover:bg-surface-subtle/40 transition-colors">
                  {/* EPC Contractor */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-text">{e.name}</div>
                    <div className="text-[10px] text-text-muted mt-0.5 flex items-center gap-2">
                      <span>{e.contactPerson}</span>
                      <span>•</span>
                      <span>{e.whatsapp || 'N/A'}</span>
                    </div>
                  </td>

                  {/* Territory */}
                  <td className="py-3 px-3 text-text-muted">
                    <div className="flex items-center gap-1 font-medium text-text">
                      <FiMapPin size={11} className="text-text-muted" />
                      <span>{e.district}</span>
                    </div>
                    <span className="text-[10px] text-text-muted">{e.state}</span>
                  </td>

                  {/* Customer Tier */}
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTierBadge(
                        e.customerTier
                      )}`}
                    >
                      {e.customerTier}
                    </span>
                  </td>

                  {/* Behavior Status */}
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bg} ${st.text}`}
                    >
                      <StIcon size={10} />
                      <span>{st.label}</span>
                    </span>
                  </td>

                  {/* Telemetry Metrics */}
                  <td className="py-3 px-3 text-right font-medium text-text">{e.storeVisits}</td>
                  <td className="py-3 px-3 text-right font-medium text-blue-600">
                    {e.datasheetDownloads}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-text">{e.cartsCreated}</td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`font-black ${
                        parseInt(e.abandonmentRatio) > 40 ? 'text-rose-600' : 'text-text'
                      }`}
                    >
                      {e.abandonmentRatio}
                    </span>
                    <span className="text-[10px] text-text-muted block">
                      ({e.cartsAbandoned} drops)
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600">{e.ordersCount}</td>
                  <td className="py-3 px-3 text-right font-bold text-primary">{e.repeatOrders}</td>

                  {/* Assigned BDE */}
                  <td className="py-3 px-3 text-text font-medium">
                    {e.assignedBde?.name || <span className="text-text-muted">Central Pool</span>}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectEpc(e.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-colors shadow-2xs cursor-pointer text-[11px]"
                    >
                      <FiEdit size={11} />
                      <span>Manage</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

