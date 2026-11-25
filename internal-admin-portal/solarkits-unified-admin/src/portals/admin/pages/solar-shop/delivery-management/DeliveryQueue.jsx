import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import {
  FaBoxes,
  FaClock,
  FaTruck,
  FaArrowUp,
  FaFilter,
  FaExclamationCircle,
  FaCheckCircle,
  FaBolt,
  FaPiggyBank,
  FaRoute,
  FaChevronDown,
} from 'react-icons/fa';
import { FiPackage } from 'react-icons/fi';
import PageHeader from '../../../components/PageHeader';
import Button from '../../../components/Button';
import CustomInput from '../../../components/CustomInput';
import Dialog from '../../../components/Dialog';
import Loader from '../../../components/Loader';
import CreateDeliveryModal from './CreateDeliveryModal';
import { deliveryApi } from '../../../api/deliveryApi';

export default function DeliveryQueue() {
  const dispatch = useDispatch();
  const [orders, setOrders] = useState([]);
  const [consolidationSuggestions, setConsolidationSuggestions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Quick Filters State (matching Screenshot 1) ───────────────────────
  const [quickFilters, setQuickFilters] = useState({
    industryType: 'all',
    category: 'all',
    subCategory: 'all',
    systemType: 'all',
    projectRange: 'all',
  });

  // ── New Plan SLA & Geographic Filters ─────────────────────────────────
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [daysOverdueThreshold, setDaysOverdueThreshold] = useState(0);
  const [clusterFilter, setClusterFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [pincodeFilter, setPincodeFilter] = useState('');
  const [paymentDateFrom, setPaymentDateFrom] = useState('');
  const [paymentDateTo, setPaymentDateTo] = useState('');

  // ── Hierarchy Data ───────────────────────────────────────────────────
  const [hierarchy, setHierarchy] = useState({
    shopHierarchy: [],
    industries: [],
    categories: [],
    subcategories: [],
    types: [],
    ranges: [],
  });

  const fetchHierarchy = async () => {
    try {
      const res = await deliveryApi.getHierarchyOptions();
      if (res?.status === 'success' && res.data) {
        setHierarchy(res.data);
      }
    } catch (err) {
      console.error('Failed to load hierarchy options:', err);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  // ── Cascading Quick Filter Options ────────────────────────────────────
  const shopHierarchy = useMemo(() => hierarchy.shopHierarchy || [], [hierarchy.shopHierarchy]);

  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (shopHierarchy && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name });
        }
      });
    } else if (hierarchy?.industries && hierarchy.industries.length > 0) {
      hierarchy.industries.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name });
        }
      });
    }
    return [{ value: 'all', text: 'All Industry Types' }, ...list];
  }, [shopHierarchy, hierarchy]);

  const categoryOptions = useMemo(() => {
    const catMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds = quickFilters.industryType === 'all'
        ? shopHierarchy
        : shopHierarchy.filter(
            (ind) =>
              ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
              String(ind.id) === String(quickFilters.industryType)
          );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
          }
        });
      });
    } else if (hierarchy?.categories && hierarchy.categories.length > 0) {
      const matchedInd = (hierarchy?.industries || []).find(
        (i) =>
          i.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
          String(i._id) === String(quickFilters.industryType)
      );
      (hierarchy.categories || []).forEach((cat) => {
        if (
          (quickFilters.industryType === 'all' || (matchedInd && String(cat.industry_type_id) === String(matchedInd._id))) &&
          cat.name &&
          !catMap.has(cat.name.toLowerCase())
        ) {
          catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
        }
      });
    }
    return [{ value: 'all', text: 'All Categories' }, ...Array.from(catMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType]);

  const subCategoryOptions = useMemo(() => {
    const subsMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds = quickFilters.industryType === 'all'
        ? shopHierarchy
        : shopHierarchy.filter(
            (ind) =>
              ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
              String(ind.id) === String(quickFilters.industryType)
          );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (
            quickFilters.category === 'all' ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
          ) {
            (cat.subcategories || []).forEach((sub) => {
              if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
                subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
              }
            });
          }
        });
      });
    } else if (hierarchy?.subcategories && hierarchy.subcategories.length > 0) {
      const matchedCat = (hierarchy?.categories || []).find(
        (c) =>
          c.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
          String(c._id) === String(quickFilters.category)
      );
      (hierarchy.subcategories || []).forEach((sub) => {
        if (
          (quickFilters.category === 'all' || (matchedCat && String(sub.category) === String(matchedCat._id))) &&
          sub.name &&
          !subsMap.has(sub.name.toLowerCase())
        ) {
          subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
        }
      });
    }
    return [{ value: 'all', text: 'All Sub-Categories' }, ...Array.from(subsMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category]);

  const systemTypeOptions = useMemo(() => {
    const typesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds = quickFilters.industryType === 'all'
        ? shopHierarchy
        : shopHierarchy.filter(
            (ind) =>
              ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
              String(ind.id) === String(quickFilters.industryType)
          );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (
            quickFilters.category === 'all' ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
          ) {
            (cat.subcategories || []).forEach((sub) => {
              if (
                quickFilters.subCategory === 'all' ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
                String(sub.id) === String(quickFilters.subCategory)
              ) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (mt.name && !typesMap.has(mt.name.toLowerCase())) {
                    typesMap.set(mt.name.toLowerCase(), { value: mt.name, text: mt.name });
                  }
                });
              }
            });
          }
        });
      });
    } else if (hierarchy?.types && hierarchy.types.length > 0) {
      hierarchy.types.forEach((t) => {
        if (t.name && !typesMap.has(t.name.toLowerCase())) {
          typesMap.set(t.name.toLowerCase(), { value: t.name, text: t.name });
        }
      });
    }
    return [{ value: 'all', text: 'All System Types' }, ...Array.from(typesMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category, quickFilters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    const rangesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds = quickFilters.industryType === 'all'
        ? shopHierarchy
        : shopHierarchy.filter(
            (ind) =>
              ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
              String(ind.id) === String(quickFilters.industryType)
          );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (
            quickFilters.category === 'all' ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
          ) {
            (cat.subcategories || []).forEach((sub) => {
              if (
                quickFilters.subCategory === 'all' ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
                String(sub.id) === String(quickFilters.subCategory)
              ) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (
                    quickFilters.systemType === 'all' ||
                    mt.name?.toLowerCase() === quickFilters.systemType.toLowerCase() ||
                    String(mt.id || mt.type_id) === String(quickFilters.systemType)
                  ) {
                    (mt.ranges || []).forEach((r) => {
                      const idVal = String(r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || 'kW'}`);
                      if (idVal && !rangesMap.has(idVal.toLowerCase())) {
                        rangesMap.set(idVal.toLowerCase(), {
                          value: r.range_label || idVal,
                          text: r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || 'kW'}`,
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      });
    } else if (hierarchy?.ranges && hierarchy.ranges.length > 0) {
      hierarchy.ranges.forEach((r) => {
        const idVal = String(r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_id?.symbol || 'kW'}`);
        if (idVal && !rangesMap.has(idVal.toLowerCase())) {
          rangesMap.set(idVal.toLowerCase(), {
            value: r.range_label || idVal,
            text: r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_id?.symbol || 'kW'}`,
          });
        }
      });
    }
    return [{ value: 'all', text: 'All Project Ranges' }, ...Array.from(rangesMap.values())];
  }, [
    shopHierarchy,
    hierarchy,
    quickFilters.industryType,
    quickFilters.category,
    quickFilters.subCategory,
    quickFilters.systemType,
  ]);

  const clearQuickFilters = () => {
    setQuickFilters({
      industryType: 'all',
      category: 'all',
      subCategory: 'all',
      systemType: 'all',
      projectRange: 'all',
    });
  };

  const hasActiveQuickFilters =
    quickFilters.industryType !== 'all' ||
    quickFilters.category !== 'all' ||
    quickFilters.subCategory !== 'all' ||
    quickFilters.systemType !== 'all' ||
    quickFilters.projectRange !== 'all';

  // ── Client-side Filtered & FIFO Sorted Orders ──────────────────────────
  const displayedOrders = useMemo(() => {
    const filtered = orders.filter((o) => {
      // SLA Overdue filter
      const payTime = o.payment_time || o.payment_confirmed_at || o.paid_at;
      const elapsedDays = payTime ? Math.max(0, Math.floor((Date.now() - new Date(payTime).getTime()) / (1000 * 60 * 60 * 24))) : 0;
      const overdueDays = Math.max(0, elapsedDays - 15);

      if (overdueOnly && overdueDays <= 0) return false;
      if (daysOverdueThreshold > 0 && overdueDays < daysOverdueThreshold) return false;

      // Geographic filters
      if (clusterFilter && !String(o.cluster_name || o.cluster || '').toLowerCase().includes(clusterFilter.toLowerCase())) {
        return false;
      }
      if (districtFilter && !String(o.destination?.district_name || '').toLowerCase().includes(districtFilter.toLowerCase())) {
        return false;
      }
      if (pincodeFilter && !String(o.destination?.pincode || '').includes(pincodeFilter)) {
        return false;
      }

      // Date range filter
      if (paymentDateFrom && payTime && new Date(payTime) < new Date(paymentDateFrom)) return false;
      if (paymentDateTo && payTime && new Date(payTime) > new Date(paymentDateTo + 'T23:59:59')) return false;

      if (quickFilters.industryType !== 'all') {
        const hasInd =
          (o.industry_types || []).some(
            (t) => t?.toLowerCase() === quickFilters.industryType.toLowerCase()
          ) ||
          (o.items || []).some(
            (it) => it.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase()
          );
        if (!hasInd) return false;
      }

      if (quickFilters.category !== 'all') {
        const hasCat =
          (o.categories || []).some(
            (c) => c?.toLowerCase() === quickFilters.category.toLowerCase()
          ) ||
          (o.items || []).some(
            (it) => it.category_name?.toLowerCase() === quickFilters.category.toLowerCase()
          );
        if (!hasCat) return false;
      }

      if (quickFilters.subCategory !== 'all') {
        const hasSub =
          (o.subcategories || []).some(
            (s) => s?.toLowerCase() === quickFilters.subCategory.toLowerCase()
          ) ||
          (o.items || []).some(
            (it) => it.subcategory_name?.toLowerCase() === quickFilters.subCategory.toLowerCase()
          );
        if (!hasSub) return false;
      }

      if (quickFilters.systemType !== 'all') {
        const hasSys =
          (o.system_types || []).some(
            (st) => st?.toLowerCase() === quickFilters.systemType.toLowerCase()
          ) ||
          (o.items || []).some(
            (it) => it.system_type_name?.toLowerCase() === quickFilters.systemType.toLowerCase()
          );
        if (!hasSys) return false;
      }

      if (quickFilters.projectRange !== 'all') {
        const hasRange =
          (o.project_ranges || []).some(
            (pr) => pr?.toLowerCase() === quickFilters.projectRange.toLowerCase()
          ) ||
          (o.items || []).some(
            (it) => it.project_range_name?.toLowerCase() === quickFilters.projectRange.toLowerCase()
          );
        if (!hasRange) return false;
      }

      return true;
    });

    // Default FIFO Sort: Oldest payment first (highest priority)
    return filtered.sort((a, b) => {
      const timeA = new Date(a.payment_time || a.payment_confirmed_at || 0).getTime();
      const timeB = new Date(b.payment_time || b.payment_confirmed_at || 0).getTime();
      return timeA - timeB;
    });
  }, [
    orders,
    quickFilters,
    overdueOnly,
    daysOverdueThreshold,
    clusterFilter,
    districtFilter,
    pincodeFilter,
    paymentDateFrom,
    paymentDateTo,
  ]);

  // Delivery Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [ordersToDeliver, setOrdersToDeliver] = useState([]);

  // Priority Reorder Modal
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [selectedOrderForPriority, setSelectedOrderForPriority] = useState(null);
  const [priorityReason, setPriorityReason] = useState('');

  // Manual Multi-Select for Combine Delivery
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());

  const handleToggleSelectOrder = (orderId) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.size === displayedOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(displayedOrders.map((o) => o._id)));
    }
  };

  const handleCombineSelected = () => {
    const selectedOrders = displayedOrders.filter((o) => selectedOrderIds.has(o._id));
    if (selectedOrders.length === 0) return;
    setOrdersToDeliver(selectedOrders);
    setModalOpen(true);
  };

  const selectedOrdersList = displayedOrders.filter((o) => selectedOrderIds.has(o._id));
  const selectedTotalKits = selectedOrdersList.reduce((sum, o) => sum + (o.kits || 0), 0);
  const selectedTotalKg = selectedOrdersList.reduce((sum, o) => sum + (o.total_kg || 0), 0);
  const selectedTotalKw = selectedOrdersList.reduce((sum, o) => sum + (o.total_kw || 0), 0);

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  const loadQueue = async () => {
    setLoading(true);
    try {
      const params = {
        warehouse_id: selectedWarehouse || undefined,
        limit: 100,
      };

      if (quickFilters.industryType !== 'all') params.industry_type_name = quickFilters.industryType;
      if (quickFilters.category !== 'all') params.category_name = quickFilters.category;
      if (quickFilters.subCategory !== 'all') params.subcategory_name = quickFilters.subCategory;
      if (quickFilters.systemType !== 'all') params.system_type_name = quickFilters.systemType;
      if (quickFilters.projectRange !== 'all') params.project_range_name = quickFilters.projectRange;

      const res = await deliveryApi.getDeliveryQueue(params);

      if (res.status === 'success') {
        setOrders(res.data || []);
        setConsolidationSuggestions(res.consolidation_suggestions || []);
      }

      // Load warehouses
      const whRes = await deliveryApi.getWarehouses().catch(() => ({ data: [] }));
      setWarehouses(whRes.data || []);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load delivery queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [selectedWarehouse, quickFilters]);

  const handleCreateIndividualDelivery = (order) => {
    setOrdersToDeliver([order]);
    setModalOpen(true);
  };

  const handleCombineSuggestion = (suggestion) => {
    setOrdersToDeliver(suggestion.orders);
    setModalOpen(true);
  };

  const handleOpenPriorityModal = (order) => {
    setSelectedOrderForPriority(order);
    setPriorityReason(order.priority_reason || '');
    setPriorityModalOpen(true);
  };

  const handleSavePriority = async (e) => {
    e.preventDefault();
    if (!priorityReason.trim()) {
      showAlert('Please enter a mandatory audit reason.', 'error');
      return;
    }

    try {
      await deliveryApi.updateOrderPriority(selectedOrderForPriority._id, {
        is_priority: !selectedOrderForPriority.is_priority,
        priority_reason: priorityReason,
        order_model: selectedOrderForPriority.order_model,
      });
      showAlert('Order priority updated successfully.');
      setPriorityModalOpen(false);
      loadQueue();
    } catch {
      showAlert('Failed to update priority', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Delivery Management Queue"
        subtitle="Paid orders queued strictly by Payment Received Date & Time (FIFO oldest first), with automatic route consolidation suggestions."
        icon={FaBoxes}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xs border border-white/25 px-3 py-1.5 rounded-xl">
              <label className="text-xs font-semibold text-white/80 uppercase">Warehouse:</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer [&>option]:text-slate-800"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.warehouse_code}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={loadQueue}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-xs font-semibold px-4 py-2 rounded-xl text-xs transition-all"
            >
              Refresh Queue
            </Button>
          </div>
        }
      />

      {/* ─── QUICK FILTERS BAR (Matching Screenshot 1) ─── */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <FiPackage className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Quick Filters
              </h3>
              {hasActiveQuickFilters && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  Filtered ({displayedOrders.length} orders)
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={clearQuickFilters}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer transition-colors"
          >
            Clear Main
          </button>
        </div>

        {/* 5 Cascading Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Industry Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Industry Type
            </label>
            <div className="relative">
              <select
                value={quickFilters.industryType}
                onChange={(e) =>
                  setQuickFilters({
                    industryType: e.target.value,
                    category: 'all',
                    subCategory: 'all',
                    systemType: 'all',
                    projectRange: 'all',
                  })
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {industryTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>

          {/* 2. Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="relative">
              <select
                value={quickFilters.category}
                onChange={(e) =>
                  setQuickFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                    subCategory: 'all',
                    systemType: 'all',
                    projectRange: 'all',
                  }))
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>

          {/* 3. Sub Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sub Category
            </label>
            <div className="relative">
              <select
                value={quickFilters.subCategory}
                onChange={(e) =>
                  setQuickFilters((prev) => ({
                    ...prev,
                    subCategory: e.target.value,
                    systemType: 'all',
                    projectRange: 'all',
                  }))
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {subCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>

          {/* 4. System Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              System Type
            </label>
            <div className="relative">
              <select
                value={quickFilters.systemType}
                onChange={(e) =>
                  setQuickFilters((prev) => ({
                    ...prev,
                    systemType: e.target.value,
                    projectRange: 'all',
                  }))
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {systemTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>

          {/* 5. Project Range */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Project Range
            </label>
            <div className="relative">
              <select
                value={quickFilters.projectRange}
                onChange={(e) =>
                  setQuickFilters((prev) => ({
                    ...prev,
                    projectRange: e.target.value,
                  }))
                }
                className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {projectRangeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.text}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── Additional Week Plan Filters: SLA Overdue & Geo Controls ── */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              SLA Priority Filter
            </label>
            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`w-full py-1.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                overdueOnly
                  ? "bg-red-500 text-white border-red-500 shadow-sm"
                  : "bg-slate-50 text-red-600 border-red-200 hover:bg-red-50"
              }`}
            >
              <FaClock size={11} /> {overdueOnly ? "Showing Overdue" : "Overdue Orders Only"}
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Min Overdue Days: {daysOverdueThreshold}d
            </label>
            <input
              type="range"
              min="0"
              max="45"
              step="5"
              value={daysOverdueThreshold}
              onChange={(e) => setDaysOverdueThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Cluster / Region
            </label>
            <input
              type="text"
              placeholder="e.g. North, West..."
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              District
            </label>
            <input
              type="text"
              placeholder="Search district..."
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Pincode
            </label>
            <input
              type="text"
              placeholder="Search pincode..."
              value={pincodeFilter}
              onChange={(e) => setPincodeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Payment Date From
            </label>
            <input
              type="date"
              value={paymentDateFrom}
              onChange={(e) => setPaymentDateFrom(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION 5: COMBINE DELIVERY AVAILABLE BANNER ─── */}
      {consolidationSuggestions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FaRoute className="text-indigo-600" /> Combine Delivery Available ({consolidationSuggestions.length} Routes Identified)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consolidationSuggestions.map((sug, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 rounded-xl p-5 border border-indigo-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded">
                      Route Clubbing Match
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{sug.route_name}</h4>
                    <div className="text-xs text-slate-500">
                      {sug.order_count} Orders • {sug.districts.join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium">Estimated Saving</span>
                    <div className="text-base font-extrabold text-emerald-700 font-mono">
                      +₹{sug.estimated_saving.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-white/80 p-2.5 rounded-lg border border-indigo-100 text-xs text-slate-700">
                  <div>
                    <div className="text-slate-400 text-[10px]">Total Cargo Load</div>
                    <div className="font-bold">{sug.total_weight_kg.toLocaleString()} KG</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Total Kits</div>
                    <div className="font-bold">{sug.total_kits} kits</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Stops & Range</div>
                    <div className="font-bold">{sug.total_stops} stops • {sug.estimated_route_distance_km} KM</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="text-slate-500 text-[11px]">
                    Separate: ₹{sug.separate_benchmark_total.toLocaleString()} → Combined: ₹{sug.combined_benchmark_cost.toLocaleString()}
                  </div>
                  <Button
                    onClick={() => handleCombineSuggestion(sug)}
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <FaTruck className="text-xs" /> Combine Orders ({sug.order_count})
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ─── MANUAL MULTI-SELECT COMBINE ACTION BAR ─── */}
      {selectedOrderIds.size > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-5 py-3.5 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 border border-indigo-700/50">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-500 text-white font-mono font-bold px-2.5 py-1 rounded-lg text-xs shadow-xs">
              {selectedOrderIds.size} Orders Selected
            </span>
            <div className="text-sm font-semibold text-indigo-100 flex items-center gap-3">
              <span>{selectedTotalKits} kits</span>
              <span>•</span>
              <span className="font-mono">{selectedTotalKg.toLocaleString()} KG</span>
              <span>•</span>
              <span className="font-mono">{selectedTotalKw} kW</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedOrderIds(new Set())}
              className="text-xs text-indigo-200 hover:text-white px-3 py-1.5 rounded-lg border border-indigo-600 hover:bg-indigo-700/50 transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={handleCombineSelected}
              className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <FaTruck />
              {selectedOrderIds.size > 1 ? `Combine & Deliver (${selectedOrderIds.size} Orders)` : `Deliver Selected Order`}
            </button>
          </div>
        </div>
      )}

      {/* ─── QUEUE TABLE (FIFO OLDEST PAID FIRST) ─── */}
      {loading ? (
        <Loader text="Loading paid order queue..." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={displayedOrders.length > 0 && selectedOrderIds.size === displayedOrders.length}
                      onChange={handleSelectAll}
                      className="rounded text-indigo-600 cursor-pointer"
                      title="Select all orders to combine"
                    />
                  </th>
                  <th className="py-3 px-4">Order # & Type</th>
                  <th className="py-3 px-4">Payment Time (FIFO)</th>
                  <th className="py-3 px-4">Days Elapsed</th>
                  <th className="py-3 px-4">Overdue Days</th>
                  <th className="py-3 px-4">Weight (kg)</th>
                  <th className="py-3 px-4">Industry / Project</th>
                  <th className="py-3 px-4">EPC / Franchisee</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-10 text-slate-500">
                      {hasActiveQuickFilters
                        ? "No paid orders matching the selected Quick Filters."
                        : "No paid orders awaiting delivery in queue."}
                    </td>
                  </tr>
                ) : (
                  displayedOrders.map((o) => {
                    const isSelected = selectedOrderIds.has(o._id);
                    const isApproachingDeadline = o.hours_waiting >= 36 && o.hours_waiting <= 48;
                    const isPastDeadline = o.hours_waiting > 48;
                    return (
                      <tr
                        key={o._id}
                        className={`transition-colors ${
                          isSelected ? 'bg-indigo-50/60' : o.is_priority ? 'bg-amber-50/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOrder(o._id)}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-blue-700">
                            <span>{o.order_number}</span>
                            {o.is_priority ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                Priority
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-400 capitalize">{o.order_type}</span>
                            {o.procurement_details?.overall_status === 'inward_completed' && (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                title={`Panel: ${o.procurement_details.panel_grn || 'Verified'} | Inverter: ${o.procurement_details.inverter_grn || 'Verified'}`}
                              >
                                ✓ Inward Verified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">
                            {new Date(o.payment_time).toLocaleDateString()}
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            {new Date(o.payment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Days Elapsed Column */}
                        <td className="py-3 px-4">
                          {(() => {
                            const payTime = o.payment_time || o.payment_confirmed_at;
                            if (!payTime) return <span className="text-xs text-slate-400">—</span>;
                            const elapsed = Math.max(0, Math.floor((Date.now() - new Date(payTime).getTime()) / (1000 * 60 * 60 * 24)));
                            let badge = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                            if (elapsed > 30) badge = "bg-red-500/10 text-red-600 border-red-500/20 font-black";
                            else if (elapsed > 15) badge = "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold";
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badge}`}>
                                {elapsed}d
                              </span>
                            );
                          })()}
                        </td>

                        {/* Overdue Days Column */}
                        <td className="py-3 px-4">
                          {(() => {
                            const payTime = o.payment_time || o.payment_confirmed_at;
                            if (!payTime) return <span className="text-xs text-slate-400">—</span>;
                            const elapsed = Math.max(0, Math.floor((Date.now() - new Date(payTime).getTime()) / (1000 * 60 * 60 * 24)));
                            const overdue = Math.max(0, elapsed - 15);
                            if (overdue > 0) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500/10 text-red-600 border border-red-500/20">
                                  +{overdue}d Overdue
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-emerald-600 bg-emerald-500/10">
                                Within SLA
                              </span>
                            );
                          })()}
                        </td>

                        {/* Shipment Weight (kg) */}
                        <td className="py-3 px-4 font-mono font-bold text-xs text-slate-800">
                          {(o.total_kg || o.weight_kg || 450).toLocaleString()} kg
                        </td>

                        {/* Industry & Project Type */}
                        <td className="py-3 px-4 text-xs">
                          <div className="font-semibold text-slate-800">
                            {o.industry_types?.[0] || o.items?.[0]?.industry_type_name || "Commercial & Rooftop"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {o.items?.[0]?.system_type_name || o.order_type || "Turnkey Kit"}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{o.customer_name}</div>
                          <div className="text-xs text-slate-500">{o.customer_phone}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {o.warehouse_code}
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-xs max-w-xs">
                          {o.destination?.address && o.destination.address !== 'Direct Site' ? (
                            <div className="font-medium text-slate-900 truncate" title={o.destination.address}>
                              {o.destination.address}
                            </div>
                          ) : null}
                          <div className="text-slate-600 font-medium">
                            {o.destination?.district_name || 'District'}, {o.destination?.state_name || 'State'}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">
                            PIN: {o.destination?.pincode || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{o.kits} kits</span>
                            <span className="text-xs text-slate-500 font-mono">
                              ({o.total_kg?.toLocaleString()} KG • {o.total_kw} kW)
                            </span>
                          </div>
                          {o.items && o.items.length > 0 ? (
                            <div className="mt-1 space-y-1.5">
                              {o.items.map((it, idx) => (
                                <div
                                  key={idx}
                                  className="text-[11px] bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 rounded-lg p-1.5 space-y-1 transition-colors"
                                  title={`${it.kit_name || it.item_name} - Qty: ${it.quantity} - ${it.capacity_kw || ''} kW`}
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="font-semibold text-slate-800 truncate">
                                      {it.kit_name || it.item_name}
                                    </span>
                                    <span className="font-bold text-indigo-700 text-[10px] shrink-0 font-mono">
                                      ×{it.quantity} {it.capacity_kw ? `(${it.capacity_kw}kW)` : ''}
                                    </span>
                                  </div>
                                  {(it.industry_type_name || it.category_name || it.system_type_name) && (
                                    <div className="flex flex-wrap items-center gap-1 text-[9px]">
                                      {it.industry_type_name && (
                                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                                          {it.industry_type_name}
                                        </span>
                                      )}
                                      {it.category_name && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-medium">
                                          {it.category_name}
                                        </span>
                                      )}
                                      {it.system_type_name && (
                                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-medium">
                                          {it.system_type_name}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                isPastDeadline
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : isApproachingDeadline
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {o.hours_waiting}h in Queue
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                            {o.order_status?.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenPriorityModal(o)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-100 text-xs"
                              title="Change Priority (with Audit Reason)"
                            >
                              <FaArrowUp />
                            </button>
                            <Button
                              onClick={() => handleCreateIndividualDelivery(o)}
                              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1"
                            >
                              <FaTruck className="text-xs" /> Deliver
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Delivery Modal */}
      <CreateDeliveryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        orders={ordersToDeliver}
        warehouses={warehouses}
        onSuccess={() => {
          loadQueue();
        }}
      />

      {/* Priority Change Modal (Section 8) */}
      <Dialog
        isOpen={priorityModalOpen}
        onClose={() => setPriorityModalOpen(false)}
        title={`Change Queue Priority: ${selectedOrderForPriority?.order_number}`}
        width="max-w-md"
      >
        <form onSubmit={handleSavePriority} className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Authorized users can change order priority where required. An audit reason is mandatory. Priority orders can bypass consolidation.
          </p>

          <CustomInput
            label="Mandatory Audit Reason *"
            placeholder="e.g. VIP Client request / Site civil work ready"
            value={priorityReason}
            onChange={(e) => setPriorityReason(e.target.value)}
            required
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="prio_chk"
              checked={Boolean(selectedOrderForPriority?.is_priority)}
              onChange={() =>
                setSelectedOrderForPriority({
                  ...selectedOrderForPriority,
                  is_priority: !selectedOrderForPriority.is_priority,
                })
              }
              className="rounded text-amber-600"
            />
            <label htmlFor="prio_chk" className="text-sm font-semibold text-slate-800">
              Set as Priority Order (Bypass Consolidation)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" onClick={() => setPriorityModalOpen(false)} className="bg-slate-100 text-slate-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 text-white">
              Save Priority & Audit
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
