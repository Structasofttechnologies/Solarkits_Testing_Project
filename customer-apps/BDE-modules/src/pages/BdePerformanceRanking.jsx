import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  RotateCw,
  Medal,
  TrendingUp,
  Package,
  Store,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Trophy,
} from 'lucide-react';
import api from '../services/api';

export default function BdePerformanceRanking() {
  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/ranking/franchisees');
      if (res.data?.status === 'success') {
        setRankingData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load franchisee rankings', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const allRanked = rankingData?.all_ranked || [];
  const filtered =
    categoryFilter === 'all'
      ? allRanked
      : allRanked.filter((r) => r.rank_category === categoryFilter);

  const topCount = rankingData?.top_franchisees?.length || 0;
  const avgCount = rankingData?.average_performers?.length || 0;
  const underCount = rankingData?.under_performers?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full uppercase flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Performance Leaderboard
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            Territory Franchisee Performance Ranking
          </h1>
          <p className="text-xs text-slate-500">
            Network leaderboard ranking your assigned franchisees based on goal achievement, kit order volume, and consistency.
          </p>
        </div>

        <button
          onClick={fetchRankings}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 self-start sm:self-auto"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tier Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${categoryFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
            All Franchisees
          </span>
          <div className="text-2xl font-black mt-1">{allRanked.length}</div>
        </button>

        <button
          onClick={() => setCategoryFilter('Top Franchisees')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            categoryFilter === 'Top Franchisees'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-white text-slate-900 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${categoryFilter === 'Top Franchisees' ? 'text-emerald-100' : 'text-emerald-600'}`}>
            Top Franchisees
          </span>
          <div className="text-2xl font-black mt-1 text-emerald-700">{topCount}</div>
        </button>

        <button
          onClick={() => setCategoryFilter('Average Performers')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            categoryFilter === 'Average Performers'
              ? 'bg-teal-600 text-white border-teal-600 shadow-md'
              : 'bg-white text-slate-900 border-teal-200 hover:border-teal-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${categoryFilter === 'Average Performers' ? 'text-teal-100' : 'text-teal-600'}`}>
            Average Performers
          </span>
          <div className="text-2xl font-black mt-1 text-teal-700">{avgCount}</div>
        </button>

        <button
          onClick={() => setCategoryFilter('Under Performers')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            categoryFilter === 'Under Performers'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-white text-slate-900 border-rose-200 hover:border-rose-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase block ${categoryFilter === 'Under Performers' ? 'text-rose-100' : 'text-rose-600'}`}>
            Under Performers
          </span>
          <div className="text-2xl font-black mt-1 text-rose-700">{underCount}</div>
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            Loading performance rankings...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">
            No franchisee performance rankings available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 text-center">Rank</th>
                  <th className="px-4 py-3.5">Franchisee Store</th>
                  <th className="px-4 py-3.5">District</th>
                  <th className="px-4 py-3.5 text-center">Total Kits Ordered</th>
                  <th className="px-4 py-3.5 text-right">Order Value</th>
                  <th className="px-4 py-3.5 text-right">Goal Achievement</th>
                  <th className="px-4 py-3.5 text-center">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((f, idx) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 text-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black mx-auto text-xs ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-100'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800 ring-4 ring-slate-100'
                            : idx === 2
                            ? 'bg-amber-700 text-white ring-4 ring-amber-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-blue-700 text-[11px]">{f.reseller_code}</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{f.business_name}</div>
                      <div className="text-slate-500 text-[11px]">Contact: {f.contact_person}</div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{f.district}</td>
                    <td className="px-4 py-3.5 text-center font-black text-blue-700 text-sm">
                      {f.total_kits_ordered} Kits
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm">
                      ₹{f.total_order_value.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-black text-emerald-700 text-sm">{f.target_achievement_pct}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border inline-block ${
                          f.rank_category === 'Top Franchisees'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : f.rank_category === 'Average Performers'
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {f.rank_category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
