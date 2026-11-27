import React, { useState, useEffect, useMemo } from 'react';
import {
  FaGift, FaPlus, FaSearch, FaCalendarAlt, FaBoxes, FaCheckCircle,
  FaEdit, FaTrash, FaCopy, FaChartLine, FaStore, FaShoppingCart,
  FaToggleOn, FaToggleOff, FaExclamationTriangle
} from 'react-icons/fa';
import {
  fetchLiveCoupons,
  createLiveCoupon,
  updateLiveCoupon,
  toggleLiveCoupon,
  deleteLiveCoupon,
  fetchLiveComboKits,
  fetchLiveClusters
} from './services/marketingDataService';
import { extractApiError } from './services/marketingApi';

const EMPTY_COUPON_FORM = {
  offer_name: '',
  coupon_code: '',
  discount_type: 'flat',
  discount_value: 5000,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  products_applicable: [],
  cluster_id: '',
  customer_category: 'all',
  max_qty: '',
  stackable: false,
  is_active: true
};

export default function SeasonalCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [liveKits, setLiveKits] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [banner, setBanner] = useState(null);
  const [formData, setFormData] = useState(EMPTY_COUPON_FORM);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cList, kList, clList] = await Promise.all([
        fetchLiveCoupons(),
        fetchLiveComboKits(),
        fetchLiveClusters()
      ]);
      setCoupons(cList || []);
      setLiveKits(kList || []);
      setClusters(clList || []);
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to load coupons from database') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData(EMPTY_COUPON_FORM);
    setShowModal(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      offer_name: coupon.offer_name || '',
      coupon_code: coupon.coupon_code || '',
      discount_type: coupon.discount_type || 'flat',
      discount_value: coupon.discount_value || 0,
      start_date: coupon.start_date ? String(coupon.start_date).slice(0, 10) : '',
      end_date: coupon.end_date ? String(coupon.end_date).slice(0, 10) : '',
      products_applicable: (coupon.products_applicable || []).map((k) => String(k._id || k.id || k)),
      cluster_id: coupon.cluster_id ? String(coupon.cluster_id) : '',
      customer_category: coupon.customer_category || 'all',
      max_qty: coupon.max_qty || '',
      stackable: Boolean(coupon.stackable),
      is_active: coupon.is_active !== false
    });
    setShowModal(true);
  };

  const handleToggleKitInForm = (kitId) => {
    setFormData((prev) => {
      const exists = prev.products_applicable.includes(kitId);
      const next = exists
        ? prev.products_applicable.filter((id) => id !== kitId)
        : [...prev.products_applicable, kitId];
      return { ...prev, products_applicable: next };
    });
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!formData.offer_name.trim() || !formData.coupon_code.trim()) return;

    setSaving(true);
    setBanner(null);
    try {
      const payload = {
        ...formData,
        coupon_code: formData.coupon_code.toUpperCase().trim(),
        discount_value: Number(formData.discount_value || 0),
        max_qty: formData.max_qty ? Number(formData.max_qty) : null,
        cluster_id: formData.cluster_id || null
      };

      if (editingCoupon) {
        await updateLiveCoupon(editingCoupon._id, payload);
        setBanner({ type: 'success', text: `Coupon "${payload.coupon_code}" updated in OfferMaster.` });
      } else {
        await createLiveCoupon(payload);
        setBanner({ type: 'success', text: `Coupon "${payload.coupon_code}" created in OfferMaster.` });
      }
      setShowModal(false);
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to save coupon') });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleLiveCoupon(id);
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to toggle coupon') });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete coupon "${name}" from OfferMaster?`)) return;
    try {
      await deleteLiveCoupon(id);
      setBanner({ type: 'success', text: `Coupon "${name}" deleted.` });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: extractApiError(err, 'Failed to delete coupon') });
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCoupons = useMemo(() => {
    const now = Date.now();
    return coupons.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (c.offer_name || '').toLowerCase().includes(q) ||
        (c.coupon_code || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      const expired = c.end_date && new Date(c.end_date).getTime() < now;
      if (statusFilter === 'ACTIVE') return c.is_active && !expired;
      if (statusFilter === 'PAUSED') return !c.is_active;
      if (statusFilter === 'EXPIRED') return expired;
      return true;
    });
  }, [coupons, search, statusFilter]);

  const aggregates = useMemo(() => {
    const activeCount = coupons.filter((c) => c.is_active).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.redemptions_count || 0), 0);
    const totalRevenue = coupons.reduce((sum, c) => sum + (c.revenue_generated || 0), 0);
    return { activeCount, totalCount: coupons.length, totalRedemptions, totalRevenue };
  }, [coupons]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
              <FaStore className="w-3 h-3 text-amber-600" /> OfferMaster Synced
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FaGift className="text-amber-500" /> Seasonal Coupons & Festive Offers
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Create and manage real MongoDB `offer_masters` coupon codes linked to combo kits, clusters, and marketing campaigns.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold text-xs shadow-md cursor-pointer shrink-0"
        >
          <FaPlus /> Create Seasonal Coupon
        </button>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2 ${
            banner.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-800'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-800'
          }`}
        >
          {banner.type === 'error' ? <FaExclamationTriangle className="shrink-0" /> : <FaCheckCircle className="shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Offers</span>
            <FaStore className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {aggregates.activeCount} <span className="text-xs font-semibold text-slate-400">/ {aggregates.totalCount} Total</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attributed Conversions</span>
            <FaShoppingCart className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {aggregates.totalRedemptions.toLocaleString('en-IN')} <span className="text-xs font-semibold text-indigo-600">Orders</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attributed Revenue</span>
            <FaChartLine className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₹{Number(aggregates.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <FaSearch className="text-slate-400" />
          <input
            type="text"
            placeholder="Search offer name or coupon code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-hidden text-xs font-medium"
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Coupons Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading coupons from OfferMaster...</div>
      ) : filteredCoupons.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No coupon offers found in MongoDB OfferMaster</p>
          <button onClick={handleOpenCreate} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer">
            + Create First Seasonal Coupon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoupons.map((coupon) => {
            const isActive = coupon.is_active;
            return (
              <div key={coupon._id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">{coupon.offer_name}</h3>
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">{coupon.customer_category || 'all'} EPCs</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {isActive ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Coupon Code</span>
                        <span className="text-base font-black font-mono text-slate-900 dark:text-white">{coupon.coupon_code}</span>
                      </div>
                      <button type="button" onClick={() => handleCopyCode(coupon.coupon_code)} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
                        <FaCopy className="w-3 h-3" /> {copiedCode === coupon.coupon_code ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60">
                        <span className="text-[10px] font-bold uppercase text-amber-700 block">Discount</span>
                        <p className="text-sm font-black">
                          {coupon.discount_type === 'percent' ? `${coupon.discount_value}% OFF` : `₹${Number(coupon.discount_value || 0).toLocaleString('en-IN')} Flat`}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Max Qty</span>
                        <p className="text-sm font-black">{coupon.max_qty ? `${coupon.max_qty} Kits` : 'Unlimited'}</p>
                      </div>
                    </div>

                    {coupon.products_applicable?.length > 0 && (
                      <div className="text-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <FaBoxes className="text-amber-600" /> Applicable Kits:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {coupon.products_applicable.map((k, idx) => (
                            <span key={k._id || idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] font-bold">
                              {k.name || k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt className="text-slate-400" />
                        {coupon.start_date ? new Date(coupon.start_date).toLocaleDateString('en-IN') : ''} to {coupon.end_date ? new Date(coupon.end_date).toLocaleDateString('en-IN') : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <button onClick={() => handleToggleStatus(coupon._id)} className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-indigo-600">
                    {isActive ? <><FaToggleOn className="w-4 h-4 text-emerald-500" /> Pause</> : <><FaToggleOff className="w-4 h-4 text-slate-400" /> Activate</>}
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenEdit(coupon)} className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer" title="Edit">
                      <FaEdit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(coupon._id, coupon.offer_name)} className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer" title="Delete">
                      <FaTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingCoupon ? 'Edit OfferMaster Coupon' : 'Create OfferMaster Seasonal Coupon'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Offer Title *</label>
                  <input type="text" required value={formData.offer_name} onChange={(e) => setFormData({ ...formData, offer_name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold" placeholder="e.g. Q4 Commercial Solar Offer" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Coupon Code *</label>
                  <input type="text" required value={formData.coupon_code} onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold uppercase" placeholder="e.g. SOLAR5000" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Discount Type *</label>
                  <select value={formData.discount_type} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                    <option value="flat">Flat Discount (₹)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Discount Value *</label>
                  <input type="number" required value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Max Qty Limit</label>
                  <input type="number" value={formData.max_qty} onChange={(e) => setFormData({ ...formData, max_qty: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold" placeholder="Optional" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Start Date *</label>
                  <input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">End Date *</label>
                  <input type="date" required value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase mb-1">Target Cluster</label>
                  <select value={formData.cluster_id} onChange={(e) => setFormData({ ...formData, cluster_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <option value="">All Clusters</option>
                    {clusters.map((cl) => (
                      <option key={cl._id} value={cl._id}>{cl.cluster_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase">Applicable Combo Kits (from MongoDB):</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl">
                  {liveKits.length === 0 ? (
                    <div className="text-xs text-slate-400 p-2">No active combo kits in DB (applies to all kits).</div>
                  ) : (
                    liveKits.map((k) => {
                      const checked = formData.products_applicable.includes(k.id);
                      return (
                        <div key={k.id} onClick={() => handleToggleKitInForm(k.id)} className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between ${checked ? 'bg-amber-50 border-amber-500' : 'border-slate-200 dark:border-slate-700'}`}>
                          <span className="text-xs font-bold truncate pr-2">{k.name}</span>
                          <span className="text-[10px] font-bold text-emerald-600">₹{Number(k.base_price || 0).toLocaleString('en-IN')}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                  {saving ? 'Saving...' : editingCoupon ? 'Update Offer' : 'Save Coupon to DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
