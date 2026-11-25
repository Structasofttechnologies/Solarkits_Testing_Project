import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Filter,
  RotateCw,
  Calendar,
  MapPin,
  TrendingUp,
  Award,
  ArrowUpRight,
  TrendingDown,
  ShoppingBag,
  Store,
  Layers,
  Zap,
} from 'lucide-react';
import api from '../services/api';

export default function BdeOrderHistoryAndKits() {
  const [activeTab, setActiveTab] = useState('franchisee'); // 'franchisee' | 'direct_epc' | 'kit_analytics'

  // Tab 1: Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');

  // Tab 2: Kit Analytics State
  const [kitAnalytics, setKitAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState('all');

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get('/orders/all', {
        params: { search: orderSearch, status: orderStatus },
      });
      if (res.data?.status === 'success') {
        setOrders(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [orderSearch, orderStatus]);

  const fetchKitAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get('/analytics/kit-sales', {
        params: { district_name: districtFilter },
      });
      if (res.data?.status === 'success') {
        setKitAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load kit analytics', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [districtFilter]);

  useEffect(() => {
    if (activeTab === 'franchisee' || activeTab === 'direct_epc') {
      fetchOrders();
    } else {
      fetchKitAnalytics();
    }
  }, [activeTab, fetchOrders, fetchKitAnalytics]);

  // Separate Franchisee Orders vs Direct EPC Orders (bina franchise ke direct aane wale)
  const isDirectOrder = (o) => {
    return o.epc_source === 'Direct EPC (HO/BDE)' ||
      o.franchisee_code === 'DIRECT-EPC' ||
      String(o.po_number || '').startsWith('SKO-') ||
      String(o.po_number || '').startsWith('ORD-EPC') ||
      String(o.franchisee_name || '').toLowerCase().includes('direct epc');
  };

  const franchiseeOrders = orders.filter((o) => !isDirectOrder(o));
  const directEpcOrders = orders.filter((o) => isDirectOrder(o));
  const displayedOrders = activeTab === 'direct_epc' ? directEpcOrders : franchiseeOrders;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Order History & Kit Sales Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Track Purchase Orders across all territory franchisees and analyze Highest, Average, and Lowest selling kits.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-xs self-start sm:self-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('franchisee')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'franchisee'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Franchisee Order History</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'franchisee' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {franchiseeOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('direct_epc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'direct_epc'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Direct EPC Orders</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'direct_epc' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {directEpcOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kit_analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'kit_analytics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Kit Sales Performance
          </button>
        </div>
      </div>

      {/* TAB 1 & 2: ORDERS (FRANCHISEE OR DIRECT EPC) */}
      {(activeTab === 'franchisee' || activeTab === 'direct_epc') && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder={activeTab === 'direct_epc' ? "Search by Order ID, EPC contractor, kit name, or district..." : "Search by PO number, Franchisee name, code, kit name, or district..."}
                className="w-full bg-transparent text-slate-800 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Order Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered</option>
                <option value="SUBMITTED">Submitted</option>
              </select>

              <button
                onClick={fetchOrders}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">{activeTab === "direct_epc" ? "Order ID / Date" : "PO Number / Date"}</th>
                    <th className="px-4 py-3.5">{activeTab === "direct_epc" ? "EPC Contractor" : "Franchisee Store"}</th>
                    <th className="px-4 py-3.5">District</th>
                    <th className="px-4 py-3.5">Kit Details</th>
                    <th className="px-4 py-3.5 text-center">Capacity</th>
                    <th className="px-4 py-3.5 text-center">Quantity</th>
                    <th className="px-4 py-3.5 text-right">Order Value</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordersLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        Loading territory orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400 italic">
                        {activeTab === 'direct_epc' ? 'No Direct EPC orders found.' : 'No Franchisee purchase orders found.'}
                      </td>
                    </tr>
                  ) : (
                    displayedOrders.map((o, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold text-blue-600">{o.po_number}</div>
                          <div className="text-slate-400 text-[11px]">
                            {new Date(o.order_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{o.franchisee_name}</div>
                          <div className="font-mono text-slate-500 text-[10px]">{o.franchisee_code}</div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">{o.district}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{o.kit_type}</div>
                          <div className="text-slate-400 text-[10px]">{o.project_type}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">{o.capacity}</td>
                        <td className="px-4 py-3.5 text-center font-black text-blue-700 text-sm">
                          {o.quantity} Units
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm">
                          ₹{o.order_value.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {o.order_status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-[11px] text-slate-500 font-medium">
                          {o.epc_source}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KIT SALES PERFORMANCE ANALYTICS */}
      {activeTab === 'kit_analytics' && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Total Territory Kits Sold</span>
              <div className="text-3xl font-black">{kitAnalytics?.total_kits_sold || 0} Units</div>
              <p className="text-xs text-blue-200">Across all assigned franchisee stores and EPC networks</p>
            </div>

            <div className="p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Total Kit Sales Value</span>
              <div className="text-3xl font-black">₹{(kitAnalytics?.total_sales_value_inr || 0).toLocaleString()}</div>
              <p className="text-xs text-emerald-200">Cumulative procurement volume</p>
            </div>
          </div>

          {/* Classification 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Highest Selling Kits */}
            <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Highest Selling Kits</h3>
                    <span className="text-[10px] text-slate-400">Top market demand</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Top Tier
                </span>
              </div>

              <div className="space-y-3">
                {kitAnalytics?.highest_selling && kitAnalytics.highest_selling.length > 0 ? (
                  kitAnalytics.highest_selling.map((k, i) => (
                    <div key={i} className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs">{k.kit_name}</h4>
                        <span className="font-black text-emerald-700 text-sm">{k.units_sold} Sold</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Capacity: {k.capacity}</span>
                        <span className="font-semibold text-emerald-700">{k.share_pct}% Market Share</span>
                      </div>
                      <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${k.share_pct}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 px-3 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No kits currently in top tier sales
                  </div>
                )}
              </div>
            </div>

            {/* Average Selling Kits */}
            <div className="bg-white rounded-3xl border border-teal-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Average Selling Kits</h3>
                    <span className="text-[10px] text-slate-400">Steady run-rate</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                  Moderate
                </span>
              </div>

              <div className="space-y-3">
                {kitAnalytics?.average_selling && kitAnalytics.average_selling.length > 0 ? (
                  kitAnalytics.average_selling.map((k, i) => (
                    <div key={i} className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs">{k.kit_name}</h4>
                        <span className="font-black text-teal-700 text-sm">{k.units_sold} Sold</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Capacity: {k.capacity}</span>
                        <span className="font-semibold text-teal-700">{k.share_pct}% Market Share</span>
                      </div>
                      <div className="w-full bg-teal-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-teal-600 h-full rounded-full" style={{ width: `${k.share_pct}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 px-3 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No kits currently in moderate sales tier
                  </div>
                )}
              </div>
            </div>

            {/* Lowest Selling Kits */}
            <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Lowest Selling Kits</h3>
                    <span className="text-[10px] text-slate-400">Low or zero orders</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  Needs Focus
                </span>
              </div>

              <div className="space-y-3">
                {kitAnalytics?.lowest_selling && kitAnalytics.lowest_selling.length > 0 ? (
                  kitAnalytics.lowest_selling.map((k, i) => (
                    <div key={i} className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs">{k.kit_name}</h4>
                        <span className="font-black text-rose-700 text-sm">{k.units_sold} Sold</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Capacity: {k.capacity}</span>
                        <span className="font-semibold text-rose-700">{k.share_pct}% Share</span>
                      </div>
                      <div className="w-full bg-rose-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-600 h-full rounded-full" style={{ width: `${k.share_pct}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 px-3 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No kits in lowest selling tier
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
