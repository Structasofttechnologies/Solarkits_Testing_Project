import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Search,
  RotateCw,
  MapPin,
  Phone,
  Mail,
  FileCheck,
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  TrendingUp,
  Target,
  Package,
  ArrowRight,
  Eye,
  X,
  Calendar,
  AlertTriangle,
  Award,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import api from '../services/api';

function getStatusBadge(status) {
  const map = {
    'Above Target': 'bg-purple-50 text-purple-700 border-purple-200',
    'Target Achieved': 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
    'On Track': 'bg-teal-50 text-teal-700 border-teal-200',
    'Below Target': 'bg-amber-50 text-amber-800 border-amber-200',
    'Under Performer': 'bg-orange-50 text-orange-700 border-orange-200',
    'No Activity': 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return map[status] || 'bg-slate-50 text-slate-700 border-slate-200';
}

export default function BdeFranchisees() {
  const [performanceData, setPerformanceData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  // Order History Drawer State
  const [selectedFranchisee, setSelectedFranchisee] = useState(null);
  const [orderHistory, setOrderHistory] = useState(null);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/franchisees/performance', {
        params: { search, tier: tierFilter },
      });
      if (res.data?.status === 'success') {
        setPerformanceData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error('Failed to load franchisee performance', err);
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const handleOpenOrderHistory = async (franchisee) => {
    setSelectedFranchisee(franchisee);
    setOrderHistoryLoading(true);
    try {
      const res = await api.get(`/franchisees/${franchisee.franchisee_id}/orders`, {
        params: { status: orderStatusFilter },
      });
      if (res.data?.status === 'success') {
        setOrderHistory(res.data.data);
      }
    } catch (err) {
      alert('Failed to load order history');
    } finally {
      setOrderHistoryLoading(false);
    }
  };

  const totalPartners = summary.total_franchisees || performanceData.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full uppercase">
              Franchisee Network
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            Franchisee Monthly Goal vs Achievement
          </h1>
          <p className="text-xs text-slate-500">
            Monitor kit ordering goals, actual purchases, monthly performance status, and complete order history.
          </p>
        </div>

        <button
          onClick={fetchPerformance}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition self-start sm:self-auto"
          title="Refresh Performance"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* 6-Tier Performance KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setTierFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            tierFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${tierFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
            All Franchisees
          </span>
          <div className="text-2xl font-black mt-1">{totalPartners}</div>
        </button>

        <button
          onClick={() => setTierFilter('Above Target')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            tierFilter === 'Above Target'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md'
              : 'bg-white text-slate-900 border-purple-200 hover:border-purple-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${tierFilter === 'Above Target' ? 'text-purple-100' : 'text-purple-600'}`}>
            Above Target
          </span>
          <div className="text-2xl font-black mt-1 text-purple-700">{summary.above_target || 0}</div>
        </button>

        <button
          onClick={() => setTierFilter('Target Achieved')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            tierFilter === 'Target Achieved'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-white text-slate-900 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${tierFilter === 'Target Achieved' ? 'text-emerald-100' : 'text-emerald-600'}`}>
            Target Achieved
          </span>
          <div className="text-2xl font-black mt-1 text-emerald-700">{summary.target_achieved || 0}</div>
        </button>

        <button
          onClick={() => setTierFilter('On Track')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            tierFilter === 'On Track'
              ? 'bg-teal-600 text-white border-teal-600 shadow-md'
              : 'bg-white text-slate-900 border-teal-200 hover:border-teal-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${tierFilter === 'On Track' ? 'text-teal-100' : 'text-teal-600'}`}>
            On Track (&ge;75%)
          </span>
          <div className="text-2xl font-black mt-1 text-teal-700">{summary.on_track || 0}</div>
        </button>

        <button
          onClick={() => setTierFilter('Below Target')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            tierFilter === 'Below Target'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
              : 'bg-white text-slate-900 border-amber-200 hover:border-amber-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${tierFilter === 'Below Target' ? 'text-amber-100' : 'text-amber-600'}`}>
            Below Target
          </span>
          <div className="text-2xl font-black mt-1 text-amber-700">{summary.below_target || 0}</div>
        </button>

        <button
          onClick={() => setTierFilter('No Activity')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            tierFilter === 'No Activity'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-white text-slate-900 border-rose-200 hover:border-rose-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${tierFilter === 'No Activity' ? 'text-rose-100' : 'text-rose-600'}`}>
            No Activity
          </span>
          <div className="text-2xl font-black mt-1 text-rose-700">{summary.no_activity || 0}</div>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Filter partners by business name, code, contact person, or district..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 focus:outline-none placeholder-slate-400"
        />
      </div>

      {/* Main Goal vs Achievement Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Franchisee Kit Goals & Performance</h3>
            <p className="text-xs text-slate-500">Real-time kit order volume and monthly milestone achievement</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
            {performanceData.length} Partners
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            Loading franchisee performance...
          </div>
        ) : performanceData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Store className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No franchisee records match your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Franchisee Store</th>
                  <th className="px-4 py-3.5">District / Territory</th>
                  <th className="px-4 py-3.5 text-center">Monthly Goal</th>
                  <th className="px-4 py-3.5 text-center">Actual Kits Ordered</th>
                  <th className="px-4 py-3.5 text-center">Remaining Goal</th>
                  <th className="px-4 py-3.5 text-right">Achievement %</th>
                  <th className="px-4 py-3.5 text-center">Month Trend</th>
                  <th className="px-4 py-3.5 text-center">Performance Status</th>
                  <th className="px-4 py-3.5 text-right">Order History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performanceData.map((f) => (
                  <tr key={f.franchisee_id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                          {f.reseller_code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.is_operational ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {f.is_operational ? 'Live' : 'Setup'}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-1">{f.business_name}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">Contact: {f.contact_person}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{f.district}</div>
                      <div className="text-slate-500 text-[11px]">{f.state}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800 text-sm">
                      {f.monthly_kit_goal} Kits
                    </td>
                    <td className="px-4 py-3.5 text-center font-black text-blue-700 text-sm">
                      {f.actual_kits_ordered}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-500">
                      {f.remaining_goal} Kits
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              f.achievement_pct >= 100
                                ? 'bg-emerald-500'
                                : f.achievement_pct >= 75
                                ? 'bg-teal-500'
                                : f.achievement_pct >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, f.achievement_pct)}%` }}
                          />
                        </div>
                        <span className="font-black text-slate-900 w-10 text-right">{f.achievement_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-[11px] font-bold ${
                        f.current_month_trend_pct > 0
                          ? 'text-emerald-600'
                          : f.current_month_trend_pct < 0
                          ? 'text-rose-600'
                          : 'text-slate-500'
                      }`}>
                        {f.current_month_trend_pct > 0 ? `+${f.current_month_trend_pct}%` : `${f.current_month_trend_pct}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${getStatusBadge(f.performance_status)}`}>
                        {f.performance_status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/purchase-orders?action=create&franchisee_id=${f.franchisee_id}`}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition inline-flex items-center gap-1 shadow-2xs"
                          title="Create PO for this Franchisee"
                        >
                          <Plus className="w-3.5 h-3.5" /> Create PO
                        </Link>
                        <button
                          onClick={() => handleOpenOrderHistory(f)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Order History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DRAWER: Franchisee Complete Order History */}
      {selectedFranchisee && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="font-mono text-xs text-blue-600 font-bold">{selectedFranchisee.reseller_code}</span>
                <h3 className="text-base font-black text-slate-900">{selectedFranchisee.business_name}</h3>
                <p className="text-xs text-slate-500">Complete Purchase Orders & Kit Procurement History</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/purchase-orders?action=create&franchisee_id=${selectedFranchisee.franchisee_id}`}
                  className="px-3 py-1.5 bg-blue-600 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-sm hover:bg-blue-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> New PO
                </Link>
                <button
                  onClick={() => {
                    setSelectedFranchisee(null);
                    setOrderHistory(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {orderHistoryLoading ? (
                <div className="p-12 text-center text-slate-400">
                  <RotateCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  Loading order history...
                </div>
              ) : orderHistory?.orders?.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500">
                  No purchase orders found for this franchisee.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Total Procurement Value</span>
                      <div className="text-lg font-black text-blue-900 mt-0.5">
                        ₹{(orderHistory?.total_order_value || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Total Kits Ordered</span>
                      <div className="text-lg font-black text-blue-900 mt-0.5">
                        {orderHistory?.total_kits || 0} Units
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {orderHistory?.orders?.map((o, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-blue-700">{o.po_number}</span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {new Date(o.order_date).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{o.kit_type}</h4>
                            <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                              <span>Capacity: <strong>{o.capacity}</strong></span>
                              <span>•</span>
                              <span>Project: {o.project_type}</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {o.order_status}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            Quantity: <strong>{o.quantity} Units</strong> @ ₹{o.unit_price.toLocaleString()}
                          </span>
                          <span className="font-black text-slate-900 text-sm">
                            ₹{o.order_value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
