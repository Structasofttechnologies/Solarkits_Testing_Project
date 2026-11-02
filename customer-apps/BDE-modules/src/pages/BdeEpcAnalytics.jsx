/**
 * BdeEpcAnalytics.jsx
 * BDE Customer Store Behavior & EPC Profile Management Dashboard
 * Route: /epc-analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCw,
  ShoppingCart,
  TrendingUp,
  Users,
  Eye,
  Download,
  ShoppingBag,
  Repeat,
  AlertTriangle,
  Activity,
  Filter,
  Search,
  MapPin,
  Calendar,
  Layers,
  Box,
  Store,
  Clock,
  Edit,
  X,
  CheckCircle2,
  Save,
  Shield,
  Percent,
} from 'lucide-react';
import api from '../services/api';

export default function BdeEpcAnalytics() {
  const [filters, setFilters] = useState({
    dateRange: 'last_30_days',
    state: 'all',
    kitType: 'all',
    orderType: 'all',
    customerType: 'all',
    search: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics states
  const [metrics, setMetrics] = useState({});
  const [cartAbandonment, setCartAbandonment] = useState({});
  const [repeatOrders, setRepeatOrders] = useState({});
  const [epcDirectory, setEpcDirectory] = useState([]);
  const [bdeList, setBdeList] = useState([]);
  const [states, setStates] = useState([]);
  const [kitTypes, setKitTypes] = useState([]);

  // Active view tab
  const [activeTab, setActiveTab] = useState('all');
  const [abandonmentSubTab, setAbandonmentSubTab] = useState('byKit');
  const [repeatSubTab, setRepeatSubTab] = useState('byKit');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEpcId, setSelectedEpcId] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const setFilter = (k, v) => setFilters((prev) => ({ ...prev, [k]: v }));
  const resetFilters = () =>
    setFilters({
      dateRange: 'last_30_days',
      state: 'all',
      kitType: 'all',
      orderType: 'all',
      customerType: 'all',
      search: '',
    });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'all') queryParams.append(k, v);
      });

      const res = await api.get(`/epc-analytics/behavior?${queryParams.toString()}`);
      if (res.data?.data) {
        const d = res.data.data;
        setMetrics(d.storeActivityMetrics || {});
        setCartAbandonment(d.cartAbandonmentSection || {});
        setRepeatOrders(d.repeatOrderSection || {});
        setEpcDirectory(d.epcDirectory || []);
        setBdeList(d.bdeList || []);
        setStates(d.states || []);
        setKitTypes(d.kitTypes || []);
      }
    } catch (err) {
      console.warn('BDE epc-analytics notice:', err.message || err);
      setError('Unable to load real-time analytics data: ' + (err.response?.data?.message || err.message || 'Connection error'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle open drawer
  const handleOpenDrawer = async (id) => {
    setSelectedEpcId(id);
    setDrawerOpen(true);
    setDrawerLoading(true);

    try {
      const res = await api.get(`/epc-analytics/epc-profile/${id}?dateRange=${filters.dateRange || 'last_30_days'}`);
      if (res.data?.data) {
        setProfileData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load EPC profile:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // 10 Core Store Metrics Cards
  const coreMetricsCards = [
    { label: 'Store Visits', val: metrics.totalStoreVisits ?? 0, sub: 'All traffic sessions', icon: Activity, col: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Unique Visitors', val: metrics.uniqueVisitors ?? 0, sub: 'Unique device IDs', icon: Users, col: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Logged-in Users', val: metrics.loggedInUsers ?? 0, sub: 'EPCs & partners', icon: Users, col: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Kit Views', val: metrics.kitCardViews ?? 0, sub: 'Kit configurations', icon: Eye, col: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Datasheets', val: metrics.datasheetDownloads ?? 0, sub: 'Intent downloads', icon: Download, col: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Add-to-Carts', val: metrics.addToCartEvents ?? 0, sub: 'Carts created', icon: ShoppingCart, col: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Checkouts', val: metrics.checkoutInitiated ?? 0, sub: 'Initiated checkout', icon: TrendingUp, col: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Orders Placed', val: metrics.ordersPlaced ?? 0, sub: 'Completed checkout', icon: ShoppingBag, col: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Abandoned Carts', val: metrics.abandonedCarts ?? 0, sub: 'Dropped before pay', icon: AlertTriangle, col: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Repeat Purchases', val: metrics.repeatPurchases ?? 0, sub: 'Returning orders', icon: Repeat, col: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
            BDE Commercial Analytics & CRM
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            EPC Store Behavior Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyze customer visits, kit drop-offs, cart abandonment ratios, and adjust EPC behavioral parameters
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Telemetry'}</span>
        </button>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${activeTab === 'all'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Full Behavioral Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('abandonment')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${activeTab === 'abandonment'
            ? 'bg-rose-600 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Cart Abandonment Ratio</span>
        </button>
        <button
          onClick={() => setActiveTab('repeat')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${activeTab === 'repeat'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Repeat Order Ratio</span>
        </button>
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${activeTab === 'directory'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>EPC Directory & Profiles</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span className="uppercase text-[10px] tracking-wider">Filters & Period</span>
          </div>
          <button
            onClick={resetFilters}
            className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Time Horizon</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilter('dateRange', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days (Standard)</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="all">All Time History</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">State Territory</label>
            <select
              value={filters.state}
              onChange={(e) => setFilter('state', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
            >
              <option value="all">All States</option>
              {states.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Kit Type</label>
            <select
              value={filters.kitType}
              onChange={(e) => setFilter('kitType', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
            >
              <option value="all">All Kit Capacities</option>
              {kitTypes.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Order Type</label>
            <select
              value={filters.orderType}
              onChange={(e) => setFilter('orderType', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
            >
              <option value="all">All Order Types</option>
              <option value="po_order">PO Order (Bulk)</option>
              <option value="loose_order">Loose Quantity (Components)</option>
              <option value="combo_kit">Combo Kit Package</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Search EPC</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Name, phone, city..."
                className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 1. Store Activity Metrics Strip (10 Core Metrics) */}
      {(activeTab === 'all' || activeTab === 'abandonment' || activeTab === 'repeat') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Store Activity Metrics (Live Telemetry)</span>
            <span>Comprehensive buyer engagement strip</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
            {coreMetricsCards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 truncate">{c.label}</span>
                    <div className={`p-1 rounded-md ${c.bg} ${c.col}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>
                  <div>
                    <div className={`text-base font-black ${c.col}`}>{c.val.toLocaleString()}</div>
                    <span className="text-[9px] text-slate-400 mt-0.5 block truncate">{c.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Cart Abandonment Ratio Section */}
      {(activeTab === 'all' || activeTab === 'abandonment') && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900">Cart Abandonment Ratio</h2>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-md">
                    {cartAbandonment.ratio || '0.0%'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track dropped carts, incomplete purchases, and unblock high-friction products
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded-xl font-mono text-[11px]">
              <span className="font-bold text-[10px] font-sans uppercase mr-1">Formula:</span>
              (Eligible Carts Abandoned / Eligible Carts Created) × 100
            </div>
          </div>

          {/* Top Drop-Off Detection Banner */}
          {cartAbandonment.detectionAlert && (
            <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-rose-900 uppercase tracking-wide text-[10px]">
                    BDE Action Alert — Top Drop-off Detection:
                  </span>
                  <div className="text-slate-800 mt-0.5">
                    Highest Abandoned Kit: <b className="text-rose-700">{cartAbandonment.detectionAlert?.mostAbandonedKit}</b> | Most Abandoned Area: <b className="text-rose-700">{cartAbandonment.detectionAlert?.mostAbandonedArea}</b>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {cartAbandonment.detectionAlert?.recommendedAction}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Total Dropped Carts</span>
                <span className="text-lg font-black text-rose-600">
                  {cartAbandonment.totalAbandoned || 0} of {cartAbandonment.totalCreated || 0}
                </span>
              </div>
            </div>
          )}

          {/* Sub tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1 text-xs">
            {['byKit', 'byOrder', 'byGeo', 'byCustomer', 'byStore'].map((tName) => {
              const labels = {
                byKit: 'By Kit Type',
                byOrder: 'By Order Type',
                byGeo: 'By State / District',
                byCustomer: 'By Customer Type',
                byStore: 'By Store / Franchisee',
              };
              return (
                <button
                  key={tName}
                  onClick={() => setAbandonmentSubTab(tName)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${abandonmentSubTab === tName ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  {labels[tName]}
                </button>
              );
            })}
          </div>

          {/* Table content for Kit Type */}
          {abandonmentSubTab === 'byKit' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">Kit Configuration</th>
                    <th className="py-2.5 px-3 text-right">Carts Created</th>
                    <th className="py-2.5 px-3 text-right">Abandoned</th>
                    <th className="py-2.5 px-3 text-right">Orders Converted</th>
                    <th className="py-2.5 px-3 text-right">Abandonment Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(cartAbandonment.byKitType || []).map((k) => (
                    <tr key={k.kit} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{k.kit}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{k.cartsCreated}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{k.cartsAbandoned}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{k.converted}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600">{k.ratio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table content for Order Type */}
          {abandonmentSubTab === 'byOrder' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(cartAbandonment.byOrderType || []).map((o) => (
                <div key={o.orderType} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{o.orderType}</span>
                  <div className="text-xl font-black text-rose-600">{o.ratio}</div>
                  <span className="text-[11px] text-slate-500">{o.cartsAbandoned} dropped of {o.cartsCreated} created</span>
                </div>
              ))}
            </div>
          )}

          {/* Table content for Geo */}
          {abandonmentSubTab === 'byGeo' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">State / District</th>
                    <th className="py-2.5 px-3 text-right">Created</th>
                    <th className="py-2.5 px-3 text-right">Abandoned</th>
                    <th className="py-2.5 px-3 text-right">Abandonment Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(cartAbandonment.byGeo || []).map((g) => (
                    <tr key={g.area} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{g.area}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{g.cartsCreated}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{g.cartsAbandoned}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600">{g.ratio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table content for Customer Type */}
          {abandonmentSubTab === 'byCustomer' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">Customer Tier / Category</th>
                    <th className="py-2.5 px-3 text-right">Created</th>
                    <th className="py-2.5 px-3 text-right">Abandoned</th>
                    <th className="py-2.5 px-3 text-right">Abandonment Ratio</th>
                    <th className="py-2.5 px-3">Primary Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(cartAbandonment.byCustomerType || []).map((c) => (
                    <tr key={c.customerType} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{c.customerType}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{c.cartsCreated}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{c.cartsAbandoned}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600">{c.ratio}</td>
                      <td className="py-2.5 px-3 text-slate-500 italic">{c.primaryDropReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table content for Store */}
          {abandonmentSubTab === 'byStore' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">Store Location</th>
                    <th className="py-2.5 px-3">Territory</th>
                    <th className="py-2.5 px-3 text-right">Created</th>
                    <th className="py-2.5 px-3 text-right">Abandoned</th>
                    <th className="py-2.5 px-3 text-right">Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(cartAbandonment.byPartnerStore || []).map((s, idx) => (
                    <tr key={s.name + idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{s.district}, {s.state}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{s.cartsCreated}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{s.cartsAbandoned}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600">{s.ratio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Repeat Order Ratio Section */}
      {(activeTab === 'all' || activeTab === 'repeat') && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900">Repeat Order & Retention Ratio</h2>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-md">
                    {repeatOrders.repeatRatio || '0.0%'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Analyze repeat purchasing cycles, customer loyalty, and recurring volume
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-1.5 rounded-xl font-mono text-[11px]">
              <span className="font-bold text-[10px] font-sans uppercase mr-1">Formula:</span>
              (Customers with Repeat Orders / Eligible First Order Customers) × 100
            </div>
          </div>

          {/* Metric Highlight: Avg time between first and repeat order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Repeat Order Ratio</span>
              <div className="text-2xl font-black text-emerald-700 mt-0.5">{repeatOrders.repeatRatio || '0.0%'}</div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {repeatOrders.repeatCustomersCount || 0} recurring EPCs
              </span>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Avg Time Between Orders</span>
              <div className="text-2xl font-black text-blue-700 mt-0.5">
                {repeatOrders.avgDaysBetweenRepeatOrders || '0.0'} Days
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Average repurchase cadence from first delivery
              </span>
            </div>

            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
              <span className="text-[10px] font-bold text-purple-700 uppercase">Re-order Frequency</span>
              <div className="text-2xl font-black text-purple-700 mt-0.5">
                {repeatOrders.repeatCustomersCount || 0} Buyers
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {repeatOrders.repeatCustomersCount > 0 ? `${repeatOrders.repeatCustomersCount} active recurring EPCs` : 'No repeat orders yet'}
              </span>
            </div>
          </div>

          {/* Sub tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1 text-xs">
            {['byKit', 'byOrder', 'byCustomer', 'byFranchisee', 'byGeo', 'byCohort'].map((tName) => {
              const labels = {
                byKit: 'By Kit Type',
                byOrder: 'By Order Type',
                byCustomer: 'Top Repeat EPCs',
                byFranchisee: 'By Franchisee',
                byGeo: 'By State / District',
                byCohort: 'By Month & Quarter',
              };
              return (
                <button
                  key={tName}
                  onClick={() => setRepeatSubTab(tName)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${repeatSubTab === tName ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  {labels[tName]}
                </button>
              );
            })}
          </div>

          {/* Repeat by Kit Type */}
          {repeatSubTab === 'byKit' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">Kit Configuration</th>
                    <th className="py-2.5 px-3 text-right">First Buyers</th>
                    <th className="py-2.5 px-3 text-right">Repeat Customers</th>
                    <th className="py-2.5 px-3 text-right">Repeat Rate</th>
                    <th className="py-2.5 px-3 text-right">Cadence (Days)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(repeatOrders.byKitType || []).map((k) => (
                    <tr key={k.kit} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{k.kit}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{k.totalFirstBuyers}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{k.repeatCustomers}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">{k.repeatRate}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{k.avgCadenceDays}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Repeat by Customer */}
          {repeatSubTab === 'byCustomer' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">EPC Partner</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3 text-right">Repeat Orders</th>
                    <th className="py-2.5 px-3 text-right">Total kW</th>
                    <th className="py-2.5 px-3 text-right">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(repeatOrders.topRepeatEpcs || []).map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{e.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{e.district}, {e.state}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                          {e.tier}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">{e.repeatOrdersCount}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{e.totalKwPurchased}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-600">{e.totalSpendFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Repeat by Cohort */}
          {repeatSubTab === 'byCohort' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-3">Acquisition Period</th>
                    <th className="py-2.5 px-3 text-right">Cohort Size</th>
                    <th className="py-2.5 px-3 text-right">Repeated in 30d</th>
                    <th className="py-2.5 px-3 text-right">Repeated in 60d</th>
                    <th className="py-2.5 px-3 text-right">Total Repeat Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(repeatOrders.cohorts || []).map((c) => (
                    <tr key={c.period} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{c.period}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{c.cohortSize}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{c.repeatedIn30d}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{c.repeatedIn60d}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">{c.totalRepeatRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. EPC Directory & Behavioral Profile Manager */}
      {(activeTab === 'all' || activeTab === 'directory') && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">EPC Behavioral Profile Directory</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click &quot;Manage&quot; to review live telemetry and modify EPC behavioral parameters
              </p>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold">
              {epcDirectory.length} Total Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2.5 px-3">EPC Partner</th>
                  <th className="py-2.5 px-3">Territory</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3">Behavior Status</th>
                  <th className="py-2.5 px-3 text-right">Store Visits</th>
                  <th className="py-2.5 px-3 text-right">Downloads</th>
                  <th className="py-2.5 px-3 text-right">Carts Created</th>
                  <th className="py-2.5 px-3 text-right">Abandonment %</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {epcDirectory.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{e.name}</div>
                      <div className="text-[10px] text-slate-400">{e.contactPerson} • {e.whatsapp}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{e.district}, {e.state}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {e.customerTier}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.behaviorStatus === 'loyal_repeat'
                          ? 'bg-emerald-50 text-emerald-700'
                          : e.behaviorStatus === 'at_risk'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-blue-50 text-blue-700'
                          }`}
                      >
                        {e.behaviorStatus?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">{e.storeVisits}</td>
                    <td className="py-3 px-3 text-right text-blue-600 font-bold">{e.datasheetDownloads}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{e.cartsCreated}</td>
                    <td className="py-3 px-3 text-right font-black text-rose-600">{e.abandonmentRatio}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">{e.ordersCount}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenDrawer(e.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shadow-2xs transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Slide-Over EPC Profile & Behavior Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {profileData?.profile?.name || 'EPC Behavioral Profile'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {profileData?.profile?.contactPerson} • {profileData?.profile?.district}, {profileData?.profile?.state}
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {drawerLoading ? (
                <div className="py-12 text-center text-slate-400">Loading EPC behavioral data...</div>
              ) : (
                <>
                  {/* Telemetry Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Store Visits</span>
                      <span className="text-base font-black text-slate-800">{profileData?.telemetry?.storeVisits ?? 0}</span>
                      {profileData?.telemetry?.allTimeStoreVisits !== undefined && profileData?.telemetry?.allTimeStoreVisits !== profileData?.telemetry?.storeVisits && (
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {profileData?.telemetry?.allTimeStoreVisits} all-time
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Downloads</span>
                      <span className="text-base font-black text-blue-600">{profileData?.telemetry?.datasheetDownloads ?? 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Abandonment %</span>
                      <span className="text-base font-black text-rose-600">{profileData?.telemetry?.cartAbandonmentRatio || '0.0%'}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Repeat Orders</span>
                      <span className="text-base font-black text-emerald-600">{profileData?.telemetry?.repeatOrdersCount ?? 0}</span>
                    </div>
                  </div>

                  {/* Abandonment History Log */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Recent Abandoned Carts Log
                    </span>
                    {(profileData?.abandonmentHistory || []).map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{item.kit}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.reason} • {item.abandonedDate}</div>
                        </div>
                        <span className="font-black text-rose-600">{item.estimatedValue}</span>
                      </div>
                    ))}
                  </div>

                  {/* Customer Overview (Read-Only) */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-800 uppercase">Customer Profile Overview</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold">
                        {profileData?.profile?.customerTier || 'Standard EPC'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Person / Phone</span>
                        <span className="font-semibold text-slate-800">
                          {profileData?.profile?.contactPerson} ({profileData?.profile?.whatsapp || 'N/A'})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {profileData?.profile?.email || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Territory</span>
                        <span className="font-semibold text-slate-800">
                          {profileData?.profile?.district}, {profileData?.profile?.state}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned BDE</span>
                        <span className="font-semibold text-slate-800">
                          {profileData?.profile?.assignedBde?.name || 'Central BDE Pool'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Orders Log */}
                  {(profileData?.recentOrders || []).length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Recent Confirmed Orders ({(profileData?.recentOrders || []).length})
                      </span>
                      {(profileData?.recentOrders || []).map((ord) => (
                        <div key={ord.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800">{ord.orderNumber}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{ord.orderType} • {ord.date}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-600 block">{ord.amountFormatted}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

