import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  MessageSquare,
  Search,
  RotateCw,
  ArrowLeft,
  X,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import api from '../services/api';

const DATE_TABS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'today', label: 'Due Today' },
  { id: 'tomorrow', label: 'Due Tomorrow' },
  { id: 'this_week', label: 'This Week' },
  { id: 'overdue', label: 'Overdue' },
];

export default function BdeEpcQuoteFollowupList() {
  const [activeTab, setActiveTab] = useState('all');
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editingFu, setEditingFu] = useState(null);
  const [form, setForm] = useState({
    next_follow_up_date: '',
    follow_up_mode: 'call',
    remarks: '',
    probability_pct: 50,
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') params.date_filter = activeTab;
      const res = await api.get('/quotes/follow-ups/list', { params });
      if (res.data?.status === 'success') {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.followups)
          ? raw.followups
          : Array.isArray(res.data?.followups)
          ? res.data.followups
          : [];
        setFollowups(list);
      } else {
        setFollowups([]);
      }
    } catch (err) {
      console.error('Failed to load BDE follow-ups:', err);
      setFollowups([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const openEditModal = (fu) => {
    setEditingFu(fu);
    setForm({
      next_follow_up_date: fu.next_follow_up_date
        ? new Date(fu.next_follow_up_date).toISOString().split('T')[0]
        : '',
      follow_up_mode: fu.follow_up_mode || 'call',
      remarks: fu.remarks || '',
      probability_pct: fu.probability_pct ?? 50,
      status: fu.status || 'pending',
    });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/quotes/follow-ups/${editingFu._id}`, form);
      if (res.data?.status === 'success') {
        setEditingFu(null);
        fetchFollowups();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update follow-up.');
    } finally {
      setSaving(false);
    }
  };

  const safeFollowups = Array.isArray(followups) ? followups : [];
  const filtered = safeFollowups.filter((fu) => {
    if (!fu) return false;
    const q = (search || '').toLowerCase();
    const epcName = fu.epc_id?.company_name || fu.epc_id?.name || fu.epc_id?.gstin_legal_name || fu.quote_id?.epc_snapshot?.company_name || '';
    const quoteNum = fu.quote_id?.quote_number || '';
    const remarks = fu.remarks || '';
    return epcName.toLowerCase().includes(q) || quoteNum.toLowerCase().includes(q) || remarks.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/epc-quotes" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Territory Follow-up Manager</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitor client discussions, overdue calls, and expected deal close dates
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFollowups}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-sm"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <Link
            to="/epc-quotes"
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition"
          >
            Back to Quotes
          </Link>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {DATE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search EPC, quote #, remarks..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-slate-400">Loading follow-ups...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Follow-ups Found</h3>
          <p className="text-xs text-slate-400 mt-1">No scheduled tasks match your current view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fu) => {
            const isOverdue = fu.next_follow_up_date && new Date(fu.next_follow_up_date) < new Date();
            const quoteId = fu.quote_id?._id || fu.quote_id;
            const epcName = fu.epc_id?.company_name || fu.quote_id?.epc_snapshot?.company_name || 'EPC Client';
            const mobile = fu.epc_id?.mobile || fu.quote_id?.epc_snapshot?.mobile;

            return (
              <div
                key={fu._id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Link
                      to={`/epc-quotes/${quoteId}`}
                      className="text-xs font-mono font-bold text-indigo-600 hover:underline"
                    >
                      {fu.quote_id?.quote_number || 'View Quote'}
                    </Link>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOverdue ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : fu.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{epcName}</h3>

                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5 capitalize font-medium text-slate-700">
                      {fu.follow_up_mode === 'call' && <Phone className="w-3.5 h-3.5 text-blue-500" />}
                      {fu.follow_up_mode === 'whatsapp' && <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />}
                      {fu.follow_up_mode === 'email' && <Mail className="w-3.5 h-3.5 text-indigo-500" />}
                      <span>Mode: {fu.follow_up_mode}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Due:{' '}
                        <strong className={isOverdue ? 'text-red-500' : 'text-slate-800'}>
                          {new Date(fu.next_follow_up_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {fu.remarks && (
                    <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3">
                      "{fu.remarks}"
                    </p>
                  )}

                  {fu.probability_pct != null && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Win Probability</span>
                        <span className="font-bold text-slate-800">{fu.probability_pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            fu.probability_pct >= 70 ? 'bg-emerald-500' : fu.probability_pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
                          }`}
                          style={{ width: `${fu.probability_pct}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {mobile && (
                      <a
                        href={`tel:${mobile}`}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {mobile && (
                      <a
                        href={`https://wa.me/91${mobile}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg border border-slate-200 text-emerald-600 hover:bg-emerald-50"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => openEditModal(fu)}
                    className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition"
                  >
                    Update
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingFu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Update Follow-up</h3>
              <button onClick={() => setEditingFu(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Follow-up Date *
                  </label>
                  <input
                    type="date"
                    value={form.next_follow_up_date}
                    onChange={(e) => setForm({ ...form, next_follow_up_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mode</label>
                  <select
                    value={form.follow_up_mode}
                    onChange={(e) => setForm({ ...form, follow_up_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Discussion Notes *
                </label>
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Probability ({form.probability_pct}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={form.probability_pct}
                    onChange={(e) => setForm({ ...form, probability_pct: Number(e.target.value) })}
                    className="w-full accent-indigo-600 mt-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="interested">Interested</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="order_expected">Order Expected</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFu(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
