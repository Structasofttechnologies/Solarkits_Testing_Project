/**
 * FranchiseeStoreAnalytics.jsx
 * Section F: Franchisee Store Analytics & Performance Overview
 * Click opens detailed Franchisee store dashboard and order history.
 */

import React, { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiTrendingUp, FiSearch, FiArrowRight } from 'react-icons/fi';
import { FaStore } from 'react-icons/fa';

const formatLocation = (loc) => {
  if (!loc) return 'N/A';
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'object') {
    const parts = [
      loc.city,
      loc.district_name || (typeof loc.district_id === 'object' ? loc.district_id?.name : loc.district),
      loc.state_name || (typeof loc.state_id === 'object' ? loc.state_id?.name : loc.state),
      loc.pincode,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (loc.line) return loc.line;
    return 'N/A';
  }
  return String(loc);
};

const formatText = (val, fallback = 'N/A') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return val.name || val.company_name || val.title || val.label || fallback;
  }
  return String(val);
};

export default function FranchiseeStoreAnalytics({ franchiseeData = {}, onSelectFranchisee }) {
  const {
    totalStores = 0,
    activeStores = 0,
    inactiveStores = 0,
    newStores = 0,
    companyStores = 0,
    storeList = [],
  } = franchiseeData || {};

  const [search, setSearch] = useState('');

  const q = (search || '').toLowerCase().trim();
  const filteredStores = storeList.filter((s) => {
    if (!q) return true;
    const nameStr = formatText(s.name, '').toLowerCase();
    const ownerStr = formatText(s.owner, '').toLowerCase();
    const locStr = formatLocation(s.location).toLowerCase();
    const typeStr = formatText(s.type, '').toLowerCase();
    return (
      nameStr.includes(q) ||
      ownerStr.includes(q) ||
      locStr.includes(q) ||
      typeStr.includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
            <FaStore size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Franchisee Store Performance & Commercial Analytics</h2>
            <p className="text-xs text-text-muted">
              Analyze store network health, revenue contributions, kits sold, and repeat franchisee orders
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted">Total Stores</span>
          <div className="text-2xl font-black text-text mt-1">{totalStores}</div>
          <span className="text-[11px] text-text-muted">All physical locations</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600">Active Stores</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{activeStores}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Ordering & fulfilling</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-danger">Inactive Stores</span>
          <div className="text-2xl font-black text-danger mt-1">{inactiveStores}</div>
          <span className="text-[11px] text-text-muted">Dormant &gt; 30 days</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-primary">New Stores</span>
          <div className="text-2xl font-black text-primary mt-1">{newStores}</div>
          <span className="text-[11px] text-text-muted">Onboarded this quarter</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3.5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-600">Company Stores</span>
          <div className="text-2xl font-black text-purple-600 mt-1">{companyStores}</div>
          <span className="text-[11px] text-text-muted">Direct company owned</span>
        </div>
      </div>

      {/* Franchisee Store Performance Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-text">Store-Wise Performance Ledger</h3>
          <div className="relative">
            <FiSearch className="absolute left-3 top-2.5 text-text-muted" size={13} />
            <input
              type="text"
              placeholder="Search store or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-bg text-text focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Store Name</th>
                <th className="py-2.5 px-4">Owner / Contact</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4">Store Type</th>
                <th className="py-2.5 px-4">Revenue</th>
                <th className="py-2.5 px-4 text-center">Kits Sold</th>
                <th className="py-2.5 px-4">Gross Profit</th>
                <th className="py-2.5 px-4">AOV</th>
                <th className="py-2.5 px-4">Conversion %</th>
                <th className="py-2.5 px-4 text-center">Repeat Orders</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStores.length > 0 ? (
                filteredStores.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-surface-subtle transition-colors cursor-pointer group"
                    onClick={() => onSelectFranchisee && onSelectFranchisee(s)}
                  >
                    <td className="py-3 px-4 font-bold text-text group-hover:text-primary transition-colors">
                      {formatText(s.name, 'Solar Franchisee Store')}
                    </td>
                    <td className="py-3 px-4 text-text-muted">{formatText(s.owner, 'Store Director')}</td>
                    <td className="py-3 px-4 text-text-muted">{formatLocation(s.location)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-surface-subtle text-text">
                        {formatText(s.type, 'Franchisee')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{formatText(s.revenue, '₹0')}</td>
                    <td className="py-3 px-4 text-center font-bold text-text">{s.kitsSold ?? 0}</td>
                    <td className="py-3 px-4 font-bold text-primary">{formatText(s.grossProfit, '₹0')}</td>
                    <td className="py-3 px-4 text-text-muted">{formatText(s.aov, '₹0')}</td>
                    <td className="py-3 px-4 font-semibold text-primary">{formatText(s.conversionRatio, '0.0%')}</td>
                    <td className="py-3 px-4 text-center font-bold text-text">{s.repeatOrders ?? 0}</td>
                    <td className="py-3 px-4 text-right text-primary font-semibold">
                      <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Store Profile <FiArrowRight size={12} />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="py-6 text-center text-text-muted">
                    No franchisee stores recorded for the selected filter range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
