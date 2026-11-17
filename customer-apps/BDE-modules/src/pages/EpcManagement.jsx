import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap,
  Search,
  RotateCw,
  Plus,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Mail,
  Phone,
  ChevronRight,
  X,
  Link2,
  UserCheck,
  Store,
  BadgeCheck,
  ShieldCheck,
  ArrowRight,
  Briefcase,
  LayoutGrid,
  UserPlus,
  Info,
} from 'lucide-react';
import api from '../services/api';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, sub }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', val: 'text-blue-700', border: 'border-blue-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', val: 'text-amber-700', border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', val: 'text-purple-700', border: 'border-purple-100' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-500', val: 'text-slate-800', border: 'border-slate-200' },
  };
  const c = colorMap[color] || colorMap.slate;
  return (
    <div className={`p-5 bg-white rounded-3xl border ${c.border} shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${c.icon}`}>{label}</span>
        <div className={`w-9 h-9 rounded-2xl ${c.bg} ${c.icon} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div>
        <div className={`text-3xl font-black tracking-tight ${c.val}`}>{value ?? '—'}</div>
        {sub && <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">{sub}</span>}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${active
          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {count != null && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Assign Partner Modal ─────────────────────────────────────────────────────

function formatTerritoryState(name) {
  if (!name) return '';
  const list = name.includes(',') ? name.split(',').map((s) => s.trim()) : [name];
  if (list.length >= 25) return `Pan India (${list.length} States)`;
  if (list.length > 2) return `${list.slice(0, 2).join(', ')} +${list.length - 2} More`;
  return name;
}

function AssignPartnerModal({ epc, onClose, onSuccess, territory }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/epc/franchise-partners', { params: { search, limit: 50 } });
      setPartners(res.data?.data || []);
    } catch (err) {
      setError('Failed to load franchise partners');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchPartners, 300);
    return () => clearTimeout(t);
  }, [fetchPartners]);

  const handleAssign = async () => {
    if (!selected || !epc?.account_id) {
      setError('Please select a franchise partner. Note: This EPC must have an account to assign a partner.');
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      const res = await api.post('/epc/assign-partner', {
        epc_account_id: epc.account_id,
        reseller_id: selected.id,
      });
      if (res.data?.status === 'success') {
        onSuccess(res.data.message);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign partner');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Link2 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-black text-slate-900">Assign Franchise Partner</h2>
            </div>
            <p className="text-xs text-slate-500">
              Assigning to: <span className="font-bold text-slate-800">{epc?.name}</span>
              {territory?.state_name && <span className="ml-1 text-blue-600">• {formatTerritoryState(territory.state_name)}</span>}
            </p>
            {!epc?.account_id && (
              <div className="mt-2 flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>This EPC company hasn't created an account yet. Partner assignment requires an active EPC account.</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search franchise partners by name, code, mobile..."
              className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <RotateCw className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading partners...</p>
            </div>
          ) : partners.length === 0 ? (
            <div className="p-8 text-center">
              <Store className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              <p className="text-xs text-slate-400">No franchise partners found in your territory.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {partners.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  className={`w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center gap-4 ${selected?.id === p.id ? 'bg-blue-50/70 border-l-4 border-blue-500' : ''
                    }`}
                >
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${selected?.id === p.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                    {p.business_name?.charAt(0) || 'F'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900">{p.business_name}</span>
                      <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-mono font-bold rounded-lg">
                        {p.reseller_code}
                      </span>
                      {p.is_operational && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                      <span>{p.mobile}</span>
                      {p.district && <span>• {p.district}</span>}
                      {p.assigned_epc_count > 0 && (
                        <span className="text-amber-600 font-semibold">• {p.assigned_epc_count} EPC assigned</span>
                      )}
                    </div>
                  </div>
                  {selected?.id === p.id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selected || assigning || !epc?.account_id}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-600/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {assigning ? (
                <><RotateCw className="w-3.5 h-3.5 animate-spin" /> Assigning...</>
              ) : (
                <><Link2 className="w-3.5 h-3.5" /> Assign Partner</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EPC List Tab ─────────────────────────────────────────────────────────────

function EpcListTab({ territory, onRefreshStats }) {
  const [epcs, setEpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [assignModal, setAssignModal] = useState(null); // epc object
  const [toast, setToast] = useState(null);

  const fetchEpcs = useCallback(async (q = search, p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/epc/list', { params: { search: q, page: p, limit: 15 } });
      setEpcs(res.data?.data || []);
      setPagination(res.data?.pagination || { total: 0, pages: 1, page: 1 });
    } catch (err) {
      console.error('Failed to load EPCs', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchEpcs(search, 1), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchEpcs(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAssignSuccess = (msg) => {
    showToast(msg);
    fetchEpcs(search, pagination.page);
    onRefreshStats();
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold shadow-xl animate-slideIn ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
          <CheckCircle2 className="w-4 h-4" />
          {toast.msg}
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="Search EPCs by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 focus:outline-none placeholder-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">EPC Companies</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Territory: <span className="font-semibold text-blue-600">{formatTerritoryState(territory?.state_name) || 'Loading...'}</span>
              {territory?.district_names?.length > 0 && (
                <span className="ml-1 text-slate-500">({territory.district_names.length} districts)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">{pagination.total} EPCs</span>
            <button onClick={() => fetchEpcs(search, 1)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition">
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RotateCw className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading EPCs...</p>
          </div>
        ) : epcs.length === 0 ? (
          <div className="p-12 text-center">
            <Zap className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-bold text-slate-400">No EPCs found in your territory</p>
            <p className="text-xs text-slate-400 mt-1">Use the "Onboard EPC" tab to add EPC companies.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {epcs.map(epc => (
              <div key={epc.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* EPC Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">
                      {epc.name?.charAt(0)?.toUpperCase() || 'E'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-sm font-black text-slate-900 truncate">{epc.name}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${epc.source === 'government'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                          {epc.source === 'government' ? 'GOV' : 'VERIFIED'}
                        </span>
                        {epc.account_status && (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${epc.account_status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : epc.account_status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {epc.account_status.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{epc.email}</span>
                        <span className="text-slate-300">•</span>
                        <span>{epc.state_count} state{epc.state_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Partner Status */}
                  <div className="flex items-center gap-3">
                    {epc.has_partner ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-emerald-600 font-bold uppercase">Partner Assigned</div>
                          <div className="text-xs font-black text-emerald-800">{epc.franchise_partner?.business_name || 'Active Partner'}</div>
                          {epc.franchise_partner?.reseller_code && (
                            <div className="text-[10px] font-mono text-emerald-600">{epc.franchise_partner.reseller_code}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-2xl">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <div className="text-[10px] text-amber-600 font-bold uppercase">No Partner</div>
                          <div className="text-xs text-amber-700">Pending assignment</div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setAssignModal(epc)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${epc.has_partner
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/30'
                        }`}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {epc.has_partner ? 'Reassign' : 'Assign Partner'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchEpcs(search, pagination.page - 1)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchEpcs(search, pagination.page + 1)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Partner Modal */}
      {assignModal && (
        <AssignPartnerModal
          epc={assignModal}
          territory={territory}
          onClose={() => setAssignModal(null)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}

// ─── Onboard EPC Tab ──────────────────────────────────────────────────────────

function OnboardEpcTab({ territory, onRefreshStats }) {
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await api.post('/epc/onboard', { name: form.name.trim(), email: form.email.trim() });
      if (res.data?.status === 'success') {
        setResult(res.data);
        setForm({ name: '', email: '' });
        onRefreshStats();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to onboard EPC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Territory Banner */}
      {territory && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <p className="text-xs font-black text-blue-900">Your Active Territory</p>
            <p className="text-xs text-blue-700">
              <span className="font-bold">{territory.state_name}</span>
              {territory.district_names?.length > 0 && (
                <span className="ml-1 font-medium">
                  — {territory.district_names.slice(0, 3).join(', ')}
                  {territory.district_names.length > 3 && ` +${territory.district_names.length - 3} more`}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Onboard EPC Company</h3>
              <p className="text-xs text-slate-400">Register a new EPC company in your territory state</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              EPC Company Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g. SunPower Energy Private Limited"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition placeholder-slate-400"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Official Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="contact@epccompany.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition placeholder-slate-400"
              />
            </div>
          </div>

          {/* Territory (read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Territory State</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={territory?.state_name || 'No territory assigned'}
                readOnly
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              State is automatically set from your territory assignment.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>EPC Onboarded Successfully!</span>
              </div>
              <p className="text-xs text-emerald-700">{result.message}</p>
              <div className="flex items-center gap-3 text-[11px] text-emerald-600 font-mono">
                <span>Name: <strong>{result.data?.name}</strong></span>
                <span>•</span>
                <span>State: <strong>{result.data?.state}</strong></span>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !territory || !form.name.trim() || !form.email.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black rounded-xl transition shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><RotateCw className="w-4 h-4 animate-spin" /> Onboarding EPC...</>
            ) : (
              <><Zap className="w-4 h-4" /> Onboard EPC Company</>
            )}
          </button>

          {!territory && (
            <p className="text-center text-xs text-amber-600 font-semibold">
              ⚠ No active territory assigned to your account. Please contact admin.
            </p>
          )}
        </form>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" /> What happens after onboarding?
        </p>
        <ul className="space-y-1.5 text-[11px] text-slate-500">
          <li className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-blue-400 shrink-0" /> EPC company is registered in your territory state</li>
          <li className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-blue-400 shrink-0" /> They will receive an invitation to create their EPC account</li>
          <li className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-blue-400 shrink-0" /> Once account is active, you can assign a franchise partner to them</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Franchise Partners Tab ───────────────────────────────────────────────────

function FranchisePartnersTab({ territory }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const fetchPartners = useCallback(async (q = search, p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/epc/franchise-partners', { params: { search: q, page: p, limit: 15 } });
      setPartners(res.data?.data || []);
      setPagination(res.data?.pagination || { total: 0, pages: 1, page: 1 });
    } catch (err) {
      console.error('Failed to load partners', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchPartners(search, 1), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchPartners(); }, []);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="Search franchise partners by name, code, mobile..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 focus:outline-none placeholder-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Franchise Partners</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Territory: <span className="font-semibold text-blue-600">{territory?.state_name || 'Loading...'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">{pagination.total} Partners</span>
            <button onClick={() => fetchPartners(search, 1)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition">
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RotateCw className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading franchise partners...</p>
          </div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center">
            <Store className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-bold text-slate-400">No franchise partners in your territory</p>
            <p className="text-xs text-slate-400 mt-1">Partners appear here once they are onboarded in your state.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {partners.map(p => (
              <div key={p.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Partner Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 flex items-center justify-center font-black text-sm shrink-0">
                      {p.business_name?.charAt(0)?.toUpperCase() || 'F'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-sm font-black text-slate-900 truncate">{p.business_name}</h4>
                        <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-mono font-bold rounded-lg">
                          {p.reseller_code}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${p.is_operational
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                          {p.is_operational ? 'LIVE' : p.activation_status?.toUpperCase() || 'SETUP'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        {p.contact_person && <span>{p.contact_person}</span>}
                        {p.contact_person && <span className="text-slate-300">•</span>}
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.mobile}</span>
                        {p.district && <><span className="text-slate-300">•</span><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.district}</span></>}
                      </div>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs shrink-0">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Agreement</div>
                      <div className={`font-black text-xs ${p.agreement_status === 'signed' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {p.agreement_status === 'signed' ? '✓ Signed' : 'Pending'}
                      </div>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">EPC Links</div>
                      <div className={`font-black text-xs ${p.assigned_epc_count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {p.assigned_epc_count > 0 ? `${p.assigned_epc_count} Active` : 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPartners(search, pagination.page - 1)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchPartners(search, pagination.page + 1)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main EpcManagement Page ──────────────────────────────────────────────────

export default function EpcManagement() {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [territory, setTerritory] = useState(null);
  const [activeTab, setActiveTab] = useState('list');

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [statsRes, territoryRes] = await Promise.all([
        api.get('/epc/stats'),
        api.get('/territory/my'),
      ]);
      setStats(statsRes.data?.data || null);
      const t = territoryRes.data?.data || territoryRes.data?.assignments?.[0] || null;
      setTerritory(t);
    } catch (err) {
      console.error('Failed to fetch EPC stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25">
              <Zap className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">EPC Management</h1>
          </div>
          <p className="text-xs text-slate-500 ml-0.5">
            Onboard EPC companies and assign franchise partners within your territory.
            {territory?.state_name && (
              <span className="ml-1.5 font-semibold text-blue-600">Territory: {formatTerritoryState(territory.state_name)}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition self-start sm:self-auto"
        >
          <RotateCw className={`w-4 h-4 ${statsLoading ? 'animate-spin text-blue-500' : ''}`} />
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total EPCs"
          value={statsLoading ? '...' : stats?.total_epcs ?? 0}
          icon={Zap}
          color="blue"
          sub="In your territory state"
        />
        <StatCard
          label="With Partner"
          value={statsLoading ? '...' : stats?.epcs_with_partner ?? 0}
          icon={CheckCircle2}
          color="emerald"
          sub="Active franchise link"
        />
        <StatCard
          label="Pending Partner"
          value={statsLoading ? '...' : stats?.epcs_pending_partner ?? 0}
          icon={Clock}
          color="amber"
          sub="Awaiting assignment"
        />
        <StatCard
          label="Available Partners"
          value={statsLoading ? '...' : stats?.franchise_partners_available ?? 0}
          icon={Store}
          color="purple"
          sub="Franchise partners in state"
        />
      </div>

      {/* ── No Territory Warning ── */}
      {!statsLoading && !territory && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-black text-amber-900">No Active Territory Assigned</p>
            <p className="text-xs text-amber-700">You don't have an active territory assignment. Please contact your admin to assign a state/district territory before using EPC management.</p>
          </div>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm flex gap-1 overflow-x-auto">
        <TabButton
          active={activeTab === 'list'}
          onClick={() => setActiveTab('list')}
          icon={LayoutGrid}
          label="EPC List"
          count={stats?.total_epcs > 0 ? stats.total_epcs : null}
        />
        <TabButton
          active={activeTab === 'onboard'}
          onClick={() => setActiveTab('onboard')}
          icon={UserPlus}
          label="Onboard EPC"
        />
        <TabButton
          active={activeTab === 'partners'}
          onClick={() => setActiveTab('partners')}
          icon={Store}
          label="Franchise Partners"
          count={stats?.franchise_partners_available > 0 ? stats.franchise_partners_available : null}
        />
      </div>

      {/* ── Tab Content ── */}
      <div>
        {activeTab === 'list' && (
          <EpcListTab territory={territory} onRefreshStats={fetchStats} />
        )}
        {activeTab === 'onboard' && (
          <OnboardEpcTab territory={territory} onRefreshStats={fetchStats} />
        )}
        {activeTab === 'partners' && (
          <FranchisePartnersTab territory={territory} />
        )}
      </div>

      {/* Inline animation styles */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slideIn { animation: slideIn 0.3s ease; }
      `}</style>
    </div>
  );
}