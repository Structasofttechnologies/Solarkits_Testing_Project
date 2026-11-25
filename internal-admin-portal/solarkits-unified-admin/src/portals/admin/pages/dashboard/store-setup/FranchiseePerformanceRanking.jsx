import React, { useState, useEffect } from 'react';
import {
  Award,
  RotateCw,
  Filter,
  TrendingUp,
  Package,
  Zap,
  AlertCircle,
  Medal,
  ChevronDown
} from 'lucide-react';
import { storeSetupApi } from '../../../api/storeSetupApi';

export default function FranchiseePerformanceRanking() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('');

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const res = await storeSetupApi.getPerformanceRanking();
      if (res?.status === 'success') {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load performance ranking', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RotateCw className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const ranking = data?.ranking || [];
  const filtered = tierFilter ? ranking.filter(r => r.category === tierFilter) : ranking;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            Operational Franchisee Performance Ranking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Network leaderboard based on kit targets, PO ordering volume, and operational consistency
          </p>
        </div>
      </div>

      {/* Tier Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <button
          onClick={() => setTierFilter('')}
          className={`p-4 rounded-2xl border text-left transition-all ${tierFilter === ''
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
            }`}
        >
          <span className={`text-[11px] font-semibold block ${tierFilter === '' ? 'text-slate-300' : 'text-slate-500'}`}>
            All Live Stores
          </span>
          <div className="text-2xl font-black mt-1">{data?.total_operational_stores || 0}</div>
        </button>

        <button
          onClick={() => setTierFilter('Top Performer')}
          className={`p-4 rounded-2xl border text-left transition-all ${tierFilter === 'Top Performer'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-white text-slate-900 border-emerald-200 hover:border-emerald-300'
            }`}
        >
          <span className={`text-[11px] font-semibold block ${tierFilter === 'Top Performer' ? 'text-emerald-100' : 'text-emerald-600'}`}>
            Top Performers
          </span>
          <div className="text-2xl font-black mt-1">{data?.top_performers || 0}</div>
        </button>

        <button
          onClick={() => setTierFilter('Good Performer')}
          className={`p-4 rounded-2xl border text-left transition-all ${tierFilter === 'Good Performer'
              ? 'bg-teal-600 text-white border-teal-600 shadow-md'
              : 'bg-white text-slate-900 border-teal-200 hover:border-teal-300'
            }`}
        >
          <span className={`text-[11px] font-semibold block ${tierFilter === 'Good Performer' ? 'text-teal-100' : 'text-teal-600'}`}>
            Good Performers
          </span>
          <div className="text-2xl font-black mt-1">{data?.good_performers || 0}</div>
        </button>

        <button
          onClick={() => setTierFilter('Average Performer')}
          className={`p-4 rounded-2xl border text-left transition-all ${tierFilter === 'Average Performer'
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
              : 'bg-white text-slate-900 border-amber-200 hover:border-amber-300'
            }`}
        >
          <span className={`text-[11px] font-semibold block ${tierFilter === 'Average Performer' ? 'text-slate-900' : 'text-amber-600'}`}>
            Average
          </span>
          <div className="text-2xl font-black mt-1">{data?.average_performers || 0}</div>
        </button>

        <button
          onClick={() => setTierFilter('Underperformer')}
          className={`p-4 rounded-2xl border text-left transition-all ${tierFilter === 'Underperformer'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-white text-slate-900 border-rose-200 hover:border-rose-300'
            }`}
        >
          <span className={`text-[11px] font-semibold block ${tierFilter === 'Underperformer' ? 'text-rose-100' : 'text-rose-600'}`}>
            Needs Attention
          </span>
          <div className="text-2xl font-black mt-1">{data?.underperformers || 0}</div>
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold bg-slate-50/80">
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">Franchisee Store</th>
                <th className="py-3.5 px-4">Territory</th>
                <th className="py-3.5 px-4">Assigned BDE</th>
                <th className="py-3.5 px-4 text-right">Orders Volume</th>
                <th className="py-3.5 px-4 text-right">Kits Ordered</th>
                <th className="py-3.5 px-4 text-right">Target Achieved</th>
                <th className="py-3.5 px-4 text-center">Category Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No active operational franchisees in this category yet.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const isTop3 = idx < 3;
                  const rankColors = [
                    'bg-amber-100 text-amber-800 border-amber-300 font-bold',
                    'bg-slate-100 text-slate-700 border-slate-300 font-bold',
                    'bg-amber-50 text-amber-700 border-amber-200 font-bold',
                  ];

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs border ${isTop3 ? rankColors[idx] : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                          {item.rank}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 text-sm">{item.franchisee_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.reseller_code}</div>
                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{item.district_name || 'Regional'}</div>
                        <div className="text-slate-400 text-[11px]">{item.state_name || 'State'}</div>
                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{item.bde_name || 'Direct / HO'}</div>
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{(item.total_order_amount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-semibold text-slate-800">
                        {item.total_kits_ordered || 0} Kits
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className={`font-bold font-mono ${item.achievement_percentage >= 100
                            ? 'text-emerald-600'
                            : item.achievement_percentage >= 70
                              ? 'text-teal-600'
                              : item.achievement_percentage >= 40
                                ? 'text-amber-600'
                                : 'text-rose-600'
                          }`}>
                          {item.achievement_percentage || 0}%
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${item.category === 'Top Performer'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.category === 'Good Performer'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : item.category === 'Average Performer'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                          {item.category}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
