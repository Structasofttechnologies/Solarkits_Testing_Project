import React, { useState, useEffect, useMemo } from 'react';
import {
  FaGift,
  FaPlus,
  FaSearch,
  FaCalendarAlt,
  FaBoxes,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEdit,
  FaTrash,
  FaCopy,
  FaTag,
  FaChartLine,
  FaStore,
  FaShoppingCart,
  FaBullhorn,
  FaInfoCircle,
  FaToggleOn,
  FaToggleOff,
  FaCoins
} from 'react-icons/fa';
import {
  getSeasonalCoupons,
  saveSeasonalCoupon,
  toggleSeasonalCouponStatus,
  deleteSeasonalCoupon,
  fetchLiveComboKits,
  STORE_KITS_CATALOG
} from './services/marketingDataService';

const SEASON_CATEGORIES = [
  { id: 'ALL', label: 'All Seasonal Promos' },
  { id: 'FESTIVAL', label: 'Diwali & Festive Dhamaka' },
  { id: 'SEASONAL', label: 'Summer Peak & Monsoon' },
  { id: 'GOVT_SCHEME', label: 'PM Surya Ghar & Subsidy Schemes' },
  { id: 'YEAR_END', label: 'FY Year-End Tax Clearance' }
];

export default function SeasonalCouponsPage() {
  const [coupons, setCoupons] = useState(() => getSeasonalCoupons());
  const [liveKits, setLiveKits] = useState(STORE_KITS_CATALOG);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | ACTIVE | SCHEDULED | EXPIRED | PAUSED
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Live fetch combo kits from Solar Kit Registry
  useEffect(() => {
    let isMounted = true;
    fetchLiveComboKits().then(kList => {
      if (isMounted && Array.isArray(kList) && kList.length > 0) {
        setLiveKits(kList);
      }
    }).catch(err => console.warn('Live kits fetch notice:', err.message));
    return () => { isMounted = false; };
  }, []);

  // Form State for Create / Edit Modal
  const [formData, setFormData] = useState({
    name: '',
    season_name: 'Diwali Festive Dhamaka',
    season_category: 'FESTIVAL',
    coupon_code: '',
    discount_type: 'per_kit',
    discount_value: 5000,
    min_order_qty: 25,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'ACTIVE',
    auto_apply_cart: true,
    show_announcement_bar: true,
    announcement_text: '',
    eligible_kit_ids: ['kit-3kw-dcr'],
    kit_moqs: {
      'kit-3kw-dcr': 25
    },
    notes: ''
  });

  // Calculate required minimum loose batch MOQ for selected kits in modal
  const formRequiredMoq = useMemo(() => {
    const sel = liveKits.filter(k => formData.eligible_kit_ids.includes(k.id));
    if (sel.length === 0) return 25;
    return Math.min(...sel.map(k => k.moq || 25));
  }, [formData.eligible_kit_ids, liveKits]);

  const isFormMoqInvalid = Number(formData.min_order_qty) < formRequiredMoq;

  // Reload coupons from storage
  const reloadData = () => {
    setCoupons(getSeasonalCoupons());
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData({
      name: 'Diwali B2B Mega Solar Festival',
      season_name: 'Diwali Festive Dhamaka',
      season_category: 'FESTIVAL',
      coupon_code: 'DIWALI' + new Date().getFullYear(),
      discount_type: 'per_kit',
      discount_value: 5000,
      min_order_qty: 25,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: 'ACTIVE',
      auto_apply_cart: true,
      show_announcement_bar: true,
      announcement_text: 'Festive Offer Active: Use code at checkout for ₹5,000 Off per Kit on orders ≥ 25 kits! (Auto-Applies in Cart)',
      eligible_kit_ids: ['kit-3kw-dcr'],
      kit_moqs: {
        'kit-3kw-dcr': 25
      },
      notes: 'Store-wide festive discount active directly in Solar Shop cart.'
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    const selKits = liveKits.filter(k => (coupon.eligible_kit_ids || []).includes(k.id));
    const autoMoq = selKits.length > 0 ? Math.min(...selKits.map(k => k.moq || 25)) : (coupon.min_order_qty || 25);

    setFormData({
      name: coupon.name || '',
      season_name: coupon.season_name || '',
      season_category: coupon.season_category || 'FESTIVAL',
      coupon_code: coupon.coupon_code || '',
      discount_type: coupon.discount_type || 'per_kit',
      discount_value: coupon.discount_value || 5000,
      min_order_qty: coupon.min_order_qty || autoMoq,
      start_date: coupon.start_date || '',
      end_date: coupon.end_date || '',
      status: coupon.status || 'ACTIVE',
      auto_apply_cart: Boolean(coupon.auto_apply_cart),
      show_announcement_bar: Boolean(coupon.show_announcement_bar),
      announcement_text: coupon.announcement_text || '',
      eligible_kit_ids: coupon.eligible_kit_ids || ['kit-3kw-dcr'],
      kit_moqs: coupon.kit_moqs || { 'kit-3kw-dcr': 25 },
      notes: coupon.notes || ''
    });
    setShowModal(true);
  };

  // Toggle Kit Selection in Modal with auto-synced MOQ
  const handleToggleKitInForm = (kitId) => {
    setFormData(prev => {
      const exists = prev.eligible_kit_ids.includes(kitId);
      const next = exists
        ? prev.eligible_kit_ids.filter(id => id !== kitId)
        : [...prev.eligible_kit_ids, kitId];
      const selKits = liveKits.filter(k => next.includes(k.id));
      const autoMoq = selKits.length > 0 ? Math.min(...selKits.map(k => k.moq || 25)) : 25;
      const updatedKitMoqs = { ...prev.kit_moqs };
      if (!exists) {
        const found = liveKits.find(k => k.id === kitId);
        updatedKitMoqs[kitId] = found?.moq || 25;
      } else {
        delete updatedKitMoqs[kitId];
      }
      return {
        ...prev,
        eligible_kit_ids: next,
        min_order_qty: autoMoq,
        kit_moqs: updatedKitMoqs
      };
    });
  };

  // Save Coupon
  const handleSaveCoupon = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.coupon_code.trim()) {
      alert('Please provide a coupon name and valid coupon code.');
      return;
    }

    const eligibleNames = liveKits
      .filter(k => formData.eligible_kit_ids.includes(k.id))
      .map(k => k.name);

    const payload = {
      ...formData,
      _id: editingCoupon ? editingCoupon._id : undefined,
      coupon_code: formData.coupon_code.toUpperCase().trim(),
      discount_value: Number(formData.discount_value),
      min_order_qty: Number(formData.min_order_qty),
      eligible_kit_names: eligibleNames
    };

    saveSeasonalCoupon(payload);
    reloadData();
    setShowModal(false);
  };

  // Toggle Active/Paused Status
  const handleToggleStatus = (id) => {
    toggleSeasonalCouponStatus(id);
    reloadData();
  };

  // Delete Coupon
  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete seasonal coupon "${name}"?`)) {
      deleteSeasonalCoupon(id);
      reloadData();
    }
  };

  // Copy code helper
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered Coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.coupon_code.toLowerCase().includes(search.toLowerCase()) ||
        c.season_name.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === 'ALL' || c.season_category === selectedCategory;

      const matchesStatus =
        statusFilter === 'ALL' || c.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [coupons, search, selectedCategory, statusFilter]);

  // Overall Performance Aggregates
  const aggregates = useMemo(() => {
    const activeCount = coupons.filter(c => c.status === 'ACTIVE').length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.redemptions_count || 0), 0);
    const totalGMV = coupons.reduce((sum, c) => sum + (c.gross_merchandise_value || 0), 0);
    const totalDiscount = coupons.reduce((sum, c) => sum + (c.total_discount_availed || 0), 0);
    return { activeCount, totalRedemptions, totalGMV, totalDiscount };
  }, [coupons]);

  // Active store banner coupon (first active with banner enabled)
  const activeBannerCoupon = useMemo(() => {
    return coupons.find(c => c.status === 'ACTIVE' && c.show_announcement_bar);
  }, [coupons]);

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
              <FaStore className="w-3 h-3 text-amber-600" /> Solar Shop Native Promotions
            </span>
            <span className="text-xs text-slate-400">• No External Link Required</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FaGift className="text-amber-500" /> Seasonal Coupons & Festive Offers
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Create time-based festive discounts (Diwali, Summer Peak, Monsoon, PM Surya Ghar) that activate automatically on Solar Shop. EPCs receive the discount in cart as soon as order meets kit MOQ.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all cursor-pointer shrink-0"
        >
          <FaPlus /> Create Seasonal Coupon
        </button>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live On Solar Shop</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <FaStore className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {aggregates.activeCount} <span className="text-xs font-semibold text-emerald-600">Active Promos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Live in customer checkout cart</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Redemptions</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
              <FaShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {aggregates.totalRedemptions.toLocaleString('en-IN')}{' '}
            <span className="text-xs font-semibold text-indigo-600">Orders</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Contractors availed seasonal discount</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Discount Given</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <FaCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₹{(aggregates.totalDiscount / 100000).toFixed(1)} <span className="text-xs font-semibold text-amber-600">Lakhs</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Direct savings passed to EPCs</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Order Value (GMV)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
              <FaChartLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ₹{(aggregates.totalGMV / 10000000).toFixed(2)} <span className="text-xs font-semibold text-purple-600">Crores</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Generated via seasonal offers</p>
        </div>
      </div>

      {/* ── Live Solar Shop Announcement Bar Simulation ── */}
      {activeBannerCoupon && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-lg shrink-0">
              🎉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-black/25 px-2 py-0.5 rounded-full">
                  Live Solar Shop Header Announcement
                </span>
                <span className="text-xs font-bold text-amber-100">• Auto-Displays to Visiting Contractors</span>
              </div>
              <p className="text-xs md:text-sm font-bold mt-0.5 text-white">
                {activeBannerCoupon.announcement_text ||
                  `Special Festive Offer: Use code "${activeBannerCoupon.coupon_code}" for ₹${activeBannerCoupon.discount_value.toLocaleString('en-IN')} Off per kit on orders of ${activeBannerCoupon.min_order_qty}+ kits!`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-white text-slate-900 font-mono font-black text-xs shadow-xs">
              {activeBannerCoupon.coupon_code}
            </span>
            <span className="text-[11px] font-bold text-amber-100 bg-white/20 px-2.5 py-1 rounded-lg">
              Auto-Applies in Cart
            </span>
          </div>
        </div>
      )}

      {/* ── Search, Season Category Filter & Status Tabs ── */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-3 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search by seasonal offer name, coupon code or festival..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl overflow-x-auto">
            {['ALL', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'PAUSED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Season Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-700">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Season:
          </span>
          {SEASON_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                  : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Seasonal Coupons Cards Grid ── */}
      {filteredCoupons.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
          <FaGift className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Seasonal Coupons Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No seasonal offers match your current filter criteria. Create a new festive campaign to get started.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
          >
            + Create Seasonal Coupon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoupons.map(coupon => {
            const isActive = coupon.status === 'ACTIVE';
            const isScheduled = coupon.status === 'SCHEDULED';
            const isExpired = coupon.status === 'EXPIRED';

            return (
              <div
                key={coupon._id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 bg-gradient-to-r from-amber-50/70 to-slate-50/70 dark:from-slate-900/80 dark:to-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        {coupon.season_name}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mt-0.5">
                        {coupon.name}
                      </h3>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase shrink-0 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                          : isScheduled
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                          : isExpired
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border border-slate-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                      }`}
                    >
                      {coupon.status}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Coupon Code Pill & Copy */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher Code</span>
                        <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                          {coupon.coupon_code}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyCode(coupon.coupon_code)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                      >
                        <FaCopy className="w-3 h-3" />
                        {copiedCode === coupon.coupon_code ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    {/* Discount & Solar Shop MOQ Rule */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                        <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block mb-0.5">
                          Discount Value
                        </span>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          {coupon.discount_type === 'percent'
                            ? `${coupon.discount_value}% OFF`
                            : `₹${Number(coupon.discount_value).toLocaleString('en-IN')}${
                                coupon.discount_type === 'per_kit' ? ' / Kit' : ' Flat'
                              }`}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                          Solar Shop MOQ
                        </span>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          ≥ {coupon.min_order_qty} Kit{coupon.min_order_qty > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Eligible Kits with Live Store MOQs & Batch Slabs */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <FaBoxes className="text-amber-600" /> Eligible Kits & Store MOQs:
                        </span>
                        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-900">
                          Wholesale Batches
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {(coupon.eligible_kit_ids || []).map(kitId => {
                          const k = liveKits.find(cat => cat.id === kitId) || {
                            id: kitId,
                            name: kitId === 'kit-3kw-dcr' ? '3 KW SOLARKITS DCR COMBOKIT' : kitId === 'kit-1kw-dcr' ? '1 K.W. SOLARKITS DCR KIT' : '2 K.W. SOLARKITS DCR COMBOKIT',
                            moq: 25,
                            base_price: 89317,
                            loose_order_quantities: [25, 50, 100]
                          };
                          const kitMoqVal = coupon.kit_moqs?.[kitId] ?? k.moq ?? 25;

                          return (
                            <div
                              key={kitId}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-bold text-slate-900 dark:text-white block truncate">
                                  {k.name}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  ₹{Number(k.base_price || 89317).toLocaleString('en-IN')} / kit
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300">
                                  MOQ: ≥ {kitMoqVal} Kits
                                </span>
                                {k.loose_order_quantities && (
                                  <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">
                                    Batches: {k.loose_order_quantities.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Date Window */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt className="text-slate-400" />
                        {coupon.start_date} to {coupon.end_date}
                      </span>
                      {coupon.auto_apply_cart && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <FaCheckCircle className="w-3 h-3" /> Auto-Applies in Cart
                        </span>
                      )}
                    </div>

                    {/* Performance Metrics */}
                    <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Redemptions</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {coupon.redemptions_count || 0} EPCs
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">GMV Generated</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          ₹{((coupon.gross_merchandise_value || 0) / 100000).toFixed(1)}L
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleStatus(coupon._id)}
                    className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'text-amber-600 hover:text-amber-700'
                        : 'text-emerald-600 hover:text-emerald-700'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <FaToggleOn className="w-4 h-4 text-emerald-500" /> Pause Offer
                      </>
                    ) : (
                      <>
                        <FaToggleOff className="w-4 h-4 text-slate-400" /> Activate Offer
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(coupon)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Edit Coupon"
                    >
                      <FaEdit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon._id, coupon.name)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete Coupon"
                    >
                      <FaTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT SEASONAL COUPON MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                  <FaGift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingCoupon ? 'Edit Seasonal Coupon' : 'Create Seasonal Coupon / Festive Promo'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configures store-wide seasonal discount applied directly in Solar Shop.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Seasonal Offer Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    placeholder="e.g. Diwali B2B Mega Solar Festival"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Season Category *
                  </label>
                  <select
                    value={formData.season_category}
                    onChange={(e) => setFormData({ ...formData, season_category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    <option value="FESTIVAL">Diwali & Festive Dhamaka</option>
                    <option value="SEASONAL">Summer Peak & Monsoon</option>
                    <option value="GOVT_SCHEME">PM Surya Ghar & Subsidy Schemes</option>
                    <option value="YEAR_END">FY Year-End Tax Clearance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.coupon_code}
                    onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold uppercase"
                    placeholder="e.g. DIWALI2026"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    <option value="per_kit">Per Kit Discount (₹ / Kit)</option>
                    <option value="flat">Flat Discount on Order Total (₹)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    placeholder="5000"
                  />
                </div>
              </div>

              {/* Start & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              {/* Solar Shop MOQ Requirement */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                    <FaBoxes className="text-amber-600" /> Minimum Order Quantity (MOQ) Required in Cart *
                  </label>
                  <span className={`text-[11px] font-bold ${isFormMoqInvalid ? 'text-red-600' : 'text-emerald-600'}`}>
                    Store Requirement: ≥ {formRequiredMoq} Kits
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.min_order_qty}
                    onChange={(e) => setFormData({ ...formData, min_order_qty: Math.max(1, parseInt(e.target.value) || 1) })}
                    className={`w-28 px-3 py-1.5 rounded-lg border text-xs font-bold ${
                      isFormMoqInvalid
                        ? 'border-red-500 bg-white text-red-900'
                        : 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                    }`}
                  />
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Kits required in Solar Shop cart to unlock this coupon discount.
                  </p>
                </div>

                {isFormMoqInvalid && (
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 text-[11px] flex items-center justify-between">
                    <span>⚠ Minimum order quantity is below the Solar Shop batch requirement ({formRequiredMoq} Kits).</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, min_order_qty: formRequiredMoq }))}
                      className="px-2 py-0.5 rounded bg-red-600 text-white font-bold cursor-pointer"
                    >
                      Fix to {formRequiredMoq} Kits
                    </button>
                  </div>
                )}
              </div>

              {/* Target Kit Selection with Solar Shop MOQ */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                  Eligible Solar Kits & Combos (Configured Combo Kits Registry):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                  {liveKits.map(k => {
                    const checked = formData.eligible_kit_ids.includes(k.id);
                    return (
                      <div
                        key={k.id}
                        onClick={() => handleToggleKitInForm(k.id)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          checked
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-100'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="rounded-sm text-amber-600 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold block">{k.name}</span>
                            <span className="text-[10px] text-slate-400">
                              Store MOQ: ≥ {k.moq || 25} Kits • Batches: {(k.loose_order_quantities || []).join(', ')}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                          ₹{Number(k.base_price).toLocaleString('en-IN')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Toggles: Auto-Apply & Header Announcement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 cursor-pointer bg-slate-50 dark:bg-slate-900/30">
                  <input
                    type="checkbox"
                    checked={formData.auto_apply_cart}
                    onChange={(e) => setFormData({ ...formData, auto_apply_cart: e.target.checked })}
                    className="rounded-sm text-amber-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Auto-Apply in Store Cart</span>
                    <span className="text-[10px] text-slate-400">Applies discount automatically when MOQ is met</span>
                  </div>
                </label>

                <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 cursor-pointer bg-slate-50 dark:bg-slate-900/30">
                  <input
                    type="checkbox"
                    checked={formData.show_announcement_bar}
                    onChange={(e) => setFormData({ ...formData, show_announcement_bar: e.target.checked })}
                    className="rounded-sm text-amber-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Solar Shop Header Banner</span>
                    <span className="text-[10px] text-slate-400">Show top announcement bar across store</span>
                  </div>
                </label>
              </div>

              {/* Announcement text */}
              {formData.show_announcement_bar && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Announcement Banner Text
                  </label>
                  <input
                    type="text"
                    value={formData.announcement_text}
                    onChange={(e) => setFormData({ ...formData, announcement_text: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                    placeholder="e.g. Diwali Dhamaka: Use code DIWALI2026 for ₹5,000 Off per kit on orders of 2+ kits!"
                  />
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  {editingCoupon ? 'Update Seasonal Coupon' : 'Save & Publish to Solar Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
