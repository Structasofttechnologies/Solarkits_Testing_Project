import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Search,
  FileText,
  Layers,
  Users,
  Package,
  DollarSign,
  X,
  Check,
  Shield,
  Info,
  LayoutGrid,
  List,
  Eye,
  RotateCw,
  Target,
  Lock,
  Unlock,
  Truck,
  Store,
  Zap,
  UserCheck,
  Copy,
  ChevronRight,
  ChevronDown,
  Calendar,
  ArrowRight,
  Percent,
  Filter,
} from 'lucide-react';
import api from '../services/api';
import { useBdeAuth } from '../context/BdeAuthContext';

// ── STATUS CONFIGURATION (Exact match to Franchise PO Portal) ──
const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText },
  PENDING_ALLOCATION: { label: 'Pending Allocation', bg: 'bg-amber-50 text-amber-700 border-amber-300', icon: Package },
  AWAITING_TOKEN_PAYMENT: { label: 'Awaiting Token Payment', bg: 'bg-orange-50 text-orange-700 border-orange-300', icon: DollarSign },
  PO_STARTED: { label: 'PO Started', bg: 'bg-blue-50 text-blue-700 border-blue-300', icon: Zap },
  VALIDATING: { label: 'Validating...', bg: 'bg-cyan-50 text-cyan-700 border-cyan-300', icon: RotateCw },
  VALIDATED: { label: 'Validated ✓', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  SUBMITTED: { label: 'Submitted', bg: 'bg-blue-50 text-blue-700 border-blue-300', icon: Clock },
  PENDING_APPROVAL: { label: 'Pending Approval', bg: 'bg-amber-50 text-amber-700 border-amber-300', icon: Clock },
  CHANGES_REQUESTED: { label: 'Changes Requested', bg: 'bg-orange-50 text-orange-700 border-orange-300', icon: AlertCircle },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-300', icon: X },
  AWAITING_PAYMENT: { label: 'Awaiting Payment', bg: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: DollarSign },
  PARTIALLY_PAID: { label: 'Partially Paid', bg: 'bg-teal-50 text-teal-700 border-teal-300', icon: DollarSign },
  PAID: { label: 'Paid', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  PROCESSING: { label: 'Processing', bg: 'bg-cyan-50 text-cyan-700 border-cyan-300', icon: RotateCw },
  DISPATCHED: { label: 'Dispatched', bg: 'bg-purple-50 text-purple-700 border-purple-300', icon: Truck },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  EXPIRED: { label: 'Expired', bg: 'bg-rose-50 text-rose-700 border-rose-300', icon: Clock },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50 text-rose-700 border-rose-300', icon: X },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs whitespace-nowrap ${cfg.bg}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{cfg.label}</span>
    </span>
  );
}

function PoStageStepper({ stepNumber }) {
  const steps = [
    { num: 1, label: 'Allocation' },
    { num: 2, label: 'Token' },
    { num: 3, label: 'Under Review' },
    { num: 4, label: 'Active' },
  ];

  return (
    <div className="flex items-center gap-1 mt-1.5">
      {steps.map((s, idx) => {
        const isDone = stepNumber > s.num;
        const isCurrent = stepNumber === s.num;
        return (
          <React.Fragment key={s.num}>
            <div
              className={`flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black transition-all ${isDone
                ? 'bg-emerald-500 text-white shadow-xs'
                : isCurrent
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300 scale-105'
                  : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              title={`Stage ${s.num}: ${s.label}`}
            >
              {isDone ? <Check className="w-2.5 h-2.5" /> : s.num}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-2.5 rounded-full transition-all ${stepNumber > s.num ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── ESCROW BANK DETAILS FOR TOKEN BOOKING ──
const ESCROW_BANK = {
  account_name: 'SolarKits Technologies Pvt Ltd (Escrow Account)',
  bank_name: 'ICICI Bank Corporate Banking',
  account_number: '000205018899',
  ifsc_code: 'ICIC0000002',
  branch: 'Bandra Kurla Complex, Mumbai',
  upi_id: 'solarkits.token@icici',
};

export default function BdePoOrders() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useBdeAuth();

  // ── CORE DATA STATES ──
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryTab, setCategoryTab] = useState('ALL'); // 'ALL' | 'SINGLE_PO' | 'COMBINE_PO'

  // Master Data - Onboarded EPCs & Franchisees
  const [onboardedEpcs, setOnboardedEpcs] = useState([]);
  const [epcsLoading, setEpcsLoading] = useState(false);
  const [selectedEpcFilter, setSelectedEpcFilter] = useState('ALL');

  const [franchisees, setFranchisees] = useState([]);
  const [franchiseesLoading, setFranchiseesLoading] = useState(false);
  const [selectedFranchiseeFilter, setSelectedFranchiseeFilter] = useState('ALL');

  // Selected EPC & Franchisee for PO Creation
  const [modalEpcId, setModalEpcId] = useState('');
  const [modalFranchiseeId, setModalFranchiseeId] = useState('');
  const [companyKits, setCompanyKits] = useState([]);
  const [franchiseePlanData, setFranchiseePlanData] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [epcBuyers, setEpcBuyers] = useState([]);
  const [buyersLoading, setBuyersLoading] = useState(false);
  const [shopHierarchy, setShopHierarchy] = useState([]);

  // Copy Feedback State
  const [copiedField, setCopiedField] = useState('');
  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // ── MODAL STATES ──
  // 1. Create Modal
  const [createModal, setCreateModal] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState('');
  const [selectedPoQty, setSelectedPoQty] = useState(200);
  const [poCategory, setPoCategory] = useState('SINGLE_PO');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // 2. Allocate Modal (Stage 2)
  const [allocateModal, setAllocateModal] = useState(false);
  const [allocatingOrder, setAllocatingOrder] = useState(null);
  const [allocateSingleTarget, setAllocateSingleTarget] = useState('single_epc'); // 'single_epc' | 'warehouse'
  const [allocateSingleEpcId, setAllocateSingleEpcId] = useState('');
  const [allocateAllocations, setAllocateAllocations] = useState({}); // { [epcBuyerId]: quantity }
  const [allocateSubmitting, setAllocateSubmitting] = useState(false);
  const [allocateError, setAllocateError] = useState('');

  // 3. Token Payment Modal (Stage 3)
  const [tokenModal, setTokenModal] = useState(false);
  const [tokenOrder, setTokenOrder] = useState(null);
  const [tokenPayingEpcId, setTokenPayingEpcId] = useState('');
  const [tokenPayAmount, setTokenPayAmount] = useState(0);
  const [tokenUtr, setTokenUtr] = useState('');
  const [tokenBank, setTokenBank] = useState('ICICI Bank Corporate');
  const [tokenDate, setTokenDate] = useState(new Date().toISOString().slice(0, 10));
  const [tokenSubmitting, setTokenSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [tokenSuccess, setTokenSuccess] = useState(null);

  // 4. Detail Modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // 5. Reorder / Drawdown Modal
  const [reorderModal, setReorderModal] = useState(false);
  const [reorderOrder, setReorderOrder] = useState(null);
  const [reorderQty, setReorderQty] = useState(5);
  const [reorderUtr, setReorderUtr] = useState('');
  const [reorderBank, setReorderBank] = useState('ICICI Bank');
  const [reorderDate, setReorderDate] = useState(new Date().toISOString().slice(0, 10));
  const [reorderSubmitting, setReorderSubmitting] = useState(false);
  const [reorderError, setReorderError] = useState('');

  // 6. Validation Action State
  const [validatingOrderId, setValidatingOrderId] = useState(null);

  // ── Quick Filters for ComboKit Blueprints ──
  const [quickFilters, setQuickFilters] = useState({
    industryType: 'all',
    category: 'all',
    subCategory: 'all',
    systemType: 'all',
    projectRange: 'all',
  });

  // ── 1. Fetch Orders from Backend API ──
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setOrdersLoading(true);
    try {
      let url = '/po/orders';
      const params = new URLSearchParams();
      if (selectedEpcFilter !== 'ALL') {
        params.append('epc_id', selectedEpcFilter);
      }
      if (selectedFranchiseeFilter !== 'ALL') {
        params.append('franchisee_id', selectedFranchiseeFilter);
      }
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (categoryTab !== 'ALL') {
        params.append('po_category', categoryTab);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await api.get(url);
      if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load BDE PO orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [selectedEpcFilter, selectedFranchiseeFilter, statusFilter, categoryTab, search]);

  // ── 2. Fetch Onboarded EPCs (Onboarded by this BDE) ──
  const fetchOnboardedEpcs = useCallback(async () => {
    setEpcsLoading(true);
    try {
      const res = await api.get('/po/onboarded-epcs');
      if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
        setOnboardedEpcs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load onboarded EPCs:', err);
    } finally {
      setEpcsLoading(false);
    }
  }, []);

  // ── 3. Fetch Onboarded Franchisees ──
  const fetchFranchisees = useCallback(async () => {
    setFranchiseesLoading(true);
    try {
      const res = await api.get('/po/franchisees');
      if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
        setFranchisees(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load franchisees:', err);
    } finally {
      setFranchiseesLoading(false);
    }
  }, []);

  // ── 4. Fetch Shop Hierarchy for Blueprint Taxonomy Filters ──
  const fetchHierarchy = useCallback(async () => {
    try {
      let res = await api.get('/shop-hierarchy').catch(() => null);
      if (!res?.data?.data) {
        res = await api.get('/india/v1/shop/hierarchy').catch(() => null);
      }
      const data = res?.data?.data;
      if (Array.isArray(data)) {
        setShopHierarchy(data);
      } else if (Array.isArray(data?.shopHierarchy)) {
        setShopHierarchy(data.shopHierarchy);
      }
    } catch (err) {
      console.warn('Shop hierarchy load failed (non-fatal):', err);
    }
  }, []);


  // ── 5. Fetch Company ComboKit Blueprints for BDE PO Creation ──
  const fetchCompanyCombokits = useCallback(async (epcId = null, fId = null) => {
    setPlanLoading(true);
    try {
      const params = {};
      const targetEpc = epcId || modalEpcId || (selectedEpcFilter !== 'ALL' ? selectedEpcFilter : '');
      const targetFId = fId || modalFranchiseeId || (selectedFranchiseeFilter !== 'ALL' ? selectedFranchiseeFilter : '');
      if (targetEpc) params.epc_id = targetEpc;
      if (targetFId) params.franchisee_id = targetFId;

      let res = await api.get('/po/combokits', { params }).catch(() => null);
      if (!res?.data?.data?.combo_kits || res.data.data.combo_kits.length === 0) {
        res = await api.get('/po/franchisee/company/plan-settings').catch(() => null);
      }
      if (res?.data?.data?.combo_kits && res.data.data.combo_kits.length > 0) {
        setCompanyKits(res.data.data.combo_kits);
        setFranchiseePlanData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load company combokits:', err);
    } finally {
      setPlanLoading(false);
    }
  }, [modalEpcId, modalFranchiseeId, selectedEpcFilter, selectedFranchiseeFilter]);

  // ── 5b. Fetch Plan Settings for Selected Franchisee (For Network / Buyer Reference) ──
  const fetchFranchiseePlanSettings = useCallback(async (franchiseeId) => {
    if (!franchiseeId) return;
    setPlanLoading(true);
    try {
      const res = await api.get(`/po/franchisee/${franchiseeId}/plan-settings`);
      if (res.data?.status === 'success' && res.data.data) {
        setFranchiseePlanData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load franchisee plan settings:', err);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  // ── 6. Fetch EPC Buyers for Selected Franchisee ──
  const fetchEpcBuyers = useCallback(async (franchiseeId) => {
    if (!franchiseeId) return;
    setBuyersLoading(true);
    try {
      const res = await api.get(`/po/franchisee/${franchiseeId}/epc-buyers`);
      if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
        setEpcBuyers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load EPC buyers:', err);
      setEpcBuyers([]);
    } finally {
      setBuyersLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchOrders();
    fetchOnboardedEpcs();
    fetchFranchisees();
    fetchHierarchy();
    fetchCompanyCombokits();
  }, [fetchOrders, fetchOnboardedEpcs, fetchFranchisees, fetchHierarchy, fetchCompanyCombokits]);

  // Handle URL Query Params (e.g. from EPC Leads / Franchisee page ?action=create&epc_id=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    const epcId = params.get('epc_id');
    const fId = params.get('franchisee_id');
    if (epcId) {
      setSelectedEpcFilter(epcId);
      setModalEpcId(epcId);
    }
    if (fId) {
      setSelectedFranchiseeFilter(fId);
      setModalFranchiseeId(fId);
      fetchFranchiseePlanSettings(fId);
      fetchEpcBuyers(fId);
    }
    if (action === 'create') {
      setCreateModal(true);
    }
  }, [location.search, fetchFranchiseePlanSettings, fetchEpcBuyers]);

  // When modal Franchisee changes in Create Modal, load that franchisee's catalog and EPC network
  useEffect(() => {
    if (modalFranchiseeId) {
      fetchFranchiseePlanSettings(modalFranchiseeId);
      fetchEpcBuyers(modalFranchiseeId);
    }
  }, [modalFranchiseeId, fetchFranchiseePlanSettings, fetchEpcBuyers]);

  // Refresh helper
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchOrders(true),
      fetchOnboardedEpcs(),
      fetchFranchisees(),
      fetchHierarchy(),
      fetchCompanyCombokits(),
    ]);
    setIsRefreshing(false);
  };

  // ── Available ComboKit Blueprints (Pure Company Blueprints) ──
  const availableKits = useMemo(() => {
    const rawKits = companyKits;

    if (rawKits.length > 0) {
      return rawKits.map((k) => {
        const orderQtys = Array.isArray(k.order_quantities) && k.order_quantities.length > 0
          ? k.order_quantities.map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b)
          : (Array.isArray(k.po_order_pricing) && k.po_order_pricing.length > 0
            ? k.po_order_pricing.map((p) => Number(p.quantity)).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b)
            : []);
        const looseQtys = Array.isArray(k.loose_order_quantities) && k.loose_order_quantities.length > 0
          ? k.loose_order_quantities.map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b)
          : (Array.isArray(k.loose_order_pricing) && k.loose_order_pricing.length > 0
            ? k.loose_order_pricing.map((p) => Number(p.quantity)).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b)
            : []);
        const price = k.dealer_price || k.selling_price_cached || k.unit_price || k.price || 0;
        const gstRate = k.gst_rate != null && !isNaN(Number(k.gst_rate))
          ? Number(k.gst_rate)
          : (k.tax_pct != null && !isNaN(Number(k.tax_pct))
            ? Number(k.tax_pct)
            : (k.gst_pct != null && !isNaN(Number(k.gst_pct))
              ? Number(k.gst_pct)
              : (k.common_gst_rate != null && !isNaN(Number(k.common_gst_rate)) ? Number(k.common_gst_rate) : 0)));

        return {
          _id: (k._id || k.id)?.toString(),
          id: (k._id || k.id)?.toString(),
          name: k.name || k.kit_name || 'Solar ComboKit Blueprint',
          kit_name: k.name || k.kit_name || 'Solar ComboKit Blueprint',
          capacity_kw: k.capacity_kw || k.capacity || 5,
          system_type: k.system_type || (k.inverter_mode === 'hybrid' ? 'Hybrid' : k.inverter_mode === 'offgrid' ? 'Off-Grid' : 'On-Grid'),
          industry_type_name: k.industry_type_name || 'Solar PV',
          industry_type_id: k.industry_type_id,
          category_name: k.category_name || 'Residential Solar',
          category_id: k.category_id,
          subcategory_name: k.subcategory_name || 'Individual Home',
          subcategory_id: k.subcategory_id,
          project_type_name: k.project_type_name || 'Rooftop Solar',
          project_type_id: k.project_type_id,
          project_range_label: k.project_range_label || (k.capacity_kw ? `${k.capacity_kw} kW System` : 'Standard Range'),
          project_range_id: k.project_range_id,
          min_kw: k.min_kw ?? (k.capacity_kw || 0),
          max_kw: k.max_kw ?? (k.capacity_kw || 0),
          dealer_price: price,
          unit_price: price,
          price: price,
          base_price_paise: Math.round(price * 100),
          token_booking_enabled: k.token_booking_enabled !== false,
          token_type: k.token_type || 'FIXED_AMOUNT',
          token_value: k.token_value != null ? Number(k.token_value) : 0,
          token_rate_per_kit_paise: k.token_rate_per_kit_paise != null ? Number(k.token_rate_per_kit_paise) : 0,
          gst_rate: gstRate,
          tax_pct: gstRate,
          gst_pct: gstRate,
          common_gst_rate: gstRate,
          order_quantities: orderQtys,
          loose_order_quantities: looseQtys,
          min_po_quantity: orderQtys[0] || (k.min_po_quantity || 0),
          specifications: k.description || k.specifications || 'High performance solar kit with tier-1 inverter, solar panels, and GI mounting structure.',
          po_order_pricing: k.po_order_pricing || k.poOrderPricing || [],
        };
      });
    }
    return [];
  }, [companyKits, franchiseePlanData]);

  // ── Filter Blueprints by QuickFilters ──
  const filteredComboKits = useMemo(() => {
    return availableKits.filter((k) => {
      if (!k) return false;
      if (quickFilters.industryType !== 'all') {
        const indVal = quickFilters.industryType.toLowerCase();
        const kInd = (k.industry_type_name || '').toLowerCase();
        if (kInd !== indVal && !kInd.includes(indVal)) return false;
      }
      if (quickFilters.category !== 'all') {
        const catVal = quickFilters.category.toLowerCase();
        const kCat = (k.category_name || '').toLowerCase();
        if (kCat !== catVal && !kCat.includes(catVal)) return false;
      }
      if (quickFilters.subCategory !== 'all') {
        const subVal = quickFilters.subCategory.toLowerCase();
        const kSub = (k.subcategory_name || '').toLowerCase();
        if (kSub !== subVal && !kSub.includes(subVal)) return false;
      }
      if (quickFilters.systemType !== 'all') {
        const sysVal = quickFilters.systemType.toLowerCase();
        const kSys = (k.system_type || '').toLowerCase();
        if (kSys !== sysVal && !kSys.includes(sysVal)) return false;
      }
      if (quickFilters.projectRange !== 'all') {
        const rangeVal = quickFilters.projectRange.toLowerCase();
        const kRange = (k.project_range_label || '').toLowerCase();
        if (kRange !== rangeVal && !kRange.includes(rangeVal)) return false;
      }
      return true;
    });
  }, [availableKits, quickFilters]);

  // ── Cascading Quick Filter Options derived from shopHierarchy & availableKits with live counts ──
  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const getCount = (name, id) => {
      const targetName = (name || "").toLowerCase();
      const targetId = id ? String(id) : null;
      return availableKits.filter((k) => {
        const kName = (k.industry_type_name || "").toLowerCase();
        const kId = k.industry_type_id ? String(k.industry_type_id) : null;
        return (kName && (kName === targetName || kName.includes(targetName))) || (targetId && kId && kId === targetId);
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        const name = ind.name;
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          const count = getCount(name, ind.id || ind._id);
          list.push({ value: name, label: `${name} (${count})`, rawLabel: name, id: ind.id || ind._id, count });
        }
      });
    }

    availableKits.forEach((kit) => {
      const name = kit.industry_type_name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const count = getCount(name, kit.industry_type_id);
        list.push({ value: name, label: `${name} (${count})`, rawLabel: name, id: kit.industry_type_id, count });
      }
    });

    return [{ value: 'all', label: `All Industry Types (${availableKits.length})`, count: availableKits.length }, ...list];
  }, [shopHierarchy, availableKits]);

  const categoryOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // Kits matching current industry filter
    const kitsInCurrentIndustry = availableKits.filter((k) => {
      if (quickFilters.industryType === "all") return true;
      const indVal = quickFilters.industryType.toLowerCase();
      const kInd = (k.industry_type_name || "").toLowerCase();
      const kIndId = String(k.industry_type_id || "");
      return kInd === indVal || kIndId === indVal || kInd.includes(indVal);
    });

    const getCount = (name, id) => {
      const targetName = (name || "").toLowerCase();
      const targetId = id ? String(id) : null;
      return kitsInCurrentIndustry.filter((k) => {
        const kName = (k.category_name || "").toLowerCase();
        const kId = k.category_id ? String(k.category_id) : null;
        return (kName && (kName === targetName || kName.includes(targetName))) || (targetId && kId && kId === targetId);
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== 'all') {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (cat.name && !seen.has(cat.name.toLowerCase())) {
            seen.add(cat.name.toLowerCase());
            const count = getCount(cat.name, cat.id || cat._id);
            list.push({ value: cat.name, label: `${cat.name} (${count})`, rawLabel: cat.name, id: cat.id || cat._id, count });
          }
        });
      });
    }

    availableKits.forEach((kit) => {
      const indOk =
        quickFilters.industryType === 'all' ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase();
      if (indOk && kit.category_name && !seen.has(kit.category_name.toLowerCase())) {
        seen.add(kit.category_name.toLowerCase());
        const count = getCount(kit.category_name, kit.category_id);
        list.push({ value: kit.category_name, label: `${kit.category_name} (${count})`, rawLabel: kit.category_name, id: kit.category_id, count });
      }
    });

    return [{ value: 'all', label: `All Categories (${kitsInCurrentIndustry.length})`, count: kitsInCurrentIndustry.length }, ...list];
  }, [shopHierarchy, availableKits, quickFilters.industryType]);

  const subCategoryOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // Kits matching current industry and category filter
    const kitsInCurrentCat = availableKits.filter((k) => {
      if (quickFilters.industryType !== "all") {
        const indVal = quickFilters.industryType.toLowerCase();
        const kInd = (k.industry_type_name || "").toLowerCase();
        const kIndId = String(k.industry_type_id || "");
        if (kInd !== indVal && kIndId !== indVal && !kInd.includes(indVal)) return false;
      }
      if (quickFilters.category !== "all") {
        const catVal = quickFilters.category.toLowerCase();
        const kCat = (k.category_name || "").toLowerCase();
        const kCatId = String(k.category_id || "");
        if (kCat !== catVal && kCatId !== catVal && !kCat.includes(catVal)) return false;
      }
      return true;
    });

    const getCount = (name, id) => {
      const targetName = (name || "").toLowerCase();
      const targetId = id ? String(id) : null;
      return kitsInCurrentCat.filter((k) => {
        const kName = (k.subcategory_name || "").toLowerCase();
        const kId = k.subcategory_id ? String(k.subcategory_id) : null;
        return (kName && (kName === targetName || kName.includes(targetName))) || (targetId && kId && kId === targetId);
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== 'all') {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const catOk =
            quickFilters.category === 'all' ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id || cat._id) === String(quickFilters.category);
          if (catOk) {
            (cat.subcategories || []).forEach((sub) => {
              if (sub.name && !seen.has(sub.name.toLowerCase())) {
                seen.add(sub.name.toLowerCase());
                const count = getCount(sub.name, sub.id || sub._id);
                list.push({ value: sub.name, label: `${sub.name} (${count})`, rawLabel: sub.name, id: sub.id || sub._id, count });
              }
            });
          }
        });
      });
    }

    availableKits.forEach((kit) => {
      const indOk =
        quickFilters.industryType === 'all' ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase();
      const catOk =
        quickFilters.category === 'all' ||
        kit.category_name?.toLowerCase() === quickFilters.category.toLowerCase();
      if (indOk && catOk && kit.subcategory_name && !seen.has(kit.subcategory_name.toLowerCase())) {
        seen.add(kit.subcategory_name.toLowerCase());
        const count = getCount(kit.subcategory_name, kit.subcategory_id);
        list.push({ value: kit.subcategory_name, label: `${kit.subcategory_name} (${count})`, rawLabel: kit.subcategory_name, id: kit.subcategory_id, count });
      }
    });

    return [{ value: 'all', label: `All Sub-Categories (${kitsInCurrentCat.length})`, count: kitsInCurrentCat.length }, ...list];
  }, [shopHierarchy, availableKits, quickFilters.industryType, quickFilters.category]);

  const systemTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // Kits matching current industry, category, and subcategory filter
    const kitsInCurrentSub = availableKits.filter((k) => {
      if (quickFilters.industryType !== "all") {
        const indVal = quickFilters.industryType.toLowerCase();
        const kInd = (k.industry_type_name || "").toLowerCase();
        const kIndId = String(k.industry_type_id || "");
        if (kInd !== indVal && kIndId !== indVal && !kInd.includes(indVal)) return false;
      }
      if (quickFilters.category !== "all") {
        const catVal = quickFilters.category.toLowerCase();
        const kCat = (k.category_name || "").toLowerCase();
        const kCatId = String(k.category_id || "");
        if (kCat !== catVal && kCatId !== catVal && !kCat.includes(catVal)) return false;
      }
      if (quickFilters.subCategory !== "all") {
        const subVal = quickFilters.subCategory.toLowerCase();
        const kSub = (k.subcategory_name || "").toLowerCase();
        const kSubId = String(k.subcategory_id || "");
        if (kSub !== subVal && kSubId !== subVal && !kSub.includes(subVal)) return false;
      }
      return true;
    });

    const getCount = (name) => {
      const target = (name || "").toLowerCase();
      return kitsInCurrentSub.filter((k) => {
        const sys = (k.system_type || "").toLowerCase();
        return sys === target || sys.includes(target) || target.includes(sys);
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== 'all') {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const catOk =
            quickFilters.category === 'all' ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase();
          if (catOk) {
            (cat.subcategories || []).forEach((sub) => {
              const subOk =
                quickFilters.subCategory === 'all' ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
              if (subOk) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (mt.name && !seen.has(mt.name.toLowerCase())) {
                    seen.add(mt.name.toLowerCase());
                    const count = getCount(mt.name);
                    list.push({ value: mt.name, label: `${mt.name} (${count})`, rawLabel: mt.name, id: mt.id || mt.type_id, count });
                  }
                });
              }
            });
          }
        });
      });
    }

    availableKits.forEach((kit) => {
      const indOk =
        quickFilters.industryType === 'all' ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase();
      const catOk =
        quickFilters.category === 'all' ||
        kit.category_name?.toLowerCase() === quickFilters.category.toLowerCase();
      const subOk =
        quickFilters.subCategory === 'all' ||
        kit.subcategory_name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
      if (indOk && catOk && subOk) {
        const sys = kit.system_type || 'On-Grid';
        if (sys && !seen.has(sys.toLowerCase())) {
          seen.add(sys.toLowerCase());
          const count = getCount(sys);
          list.push({ value: sys, label: `${sys} (${count})`, rawLabel: sys, id: sys, count });
        }
      }
    });

    return [{ value: 'all', label: `All System Types (${kitsInCurrentSub.length})`, count: kitsInCurrentSub.length }, ...list];
  }, [shopHierarchy, availableKits, quickFilters.industryType, quickFilters.category, quickFilters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // Kits matching current industry, category, subcategory, and systemType
    const kitsInCurrentSys = availableKits.filter((k) => {
      if (quickFilters.industryType !== "all") {
        const indVal = quickFilters.industryType.toLowerCase();
        const kInd = (k.industry_type_name || "").toLowerCase();
        const kIndId = String(k.industry_type_id || "");
        if (kInd !== indVal && kIndId !== indVal && !kInd.includes(indVal)) return false;
      }
      if (quickFilters.category !== "all") {
        const catVal = quickFilters.category.toLowerCase();
        const kCat = (k.category_name || "").toLowerCase();
        const kCatId = String(k.category_id || "");
        if (kCat !== catVal && kCatId !== catVal && !kCat.includes(catVal)) return false;
      }
      if (quickFilters.subCategory !== "all") {
        const subVal = quickFilters.subCategory.toLowerCase();
        const kSub = (k.subcategory_name || "").toLowerCase();
        const kSubId = String(k.subcategory_id || "");
        if (kSub !== subVal && kSubId !== subVal && !kSub.includes(subVal)) return false;
      }
      if (quickFilters.systemType !== "all") {
        const sysVal = quickFilters.systemType.toLowerCase();
        const kSys = (k.system_type || "").toLowerCase();
        if (kSys !== sysVal && !kSys.includes(sysVal) && !sysVal.includes(kSys)) return false;
      }
      return true;
    });

    const getCount = (label, minKw, maxKw) => {
      const targetLabel = (label || "").toLowerCase();
      return kitsInCurrentSys.filter((k) => {
        const kLabel = (k.project_range_label || "").toLowerCase();
        if (kLabel && (kLabel === targetLabel || kLabel.includes(targetLabel))) return true;
        const cap = Number(k.capacity_kw);
        if (!isNaN(cap) && minKw != null && maxKw != null) {
          return cap >= Number(minKw) && cap <= Number(maxKw);
        }
        return false;
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== 'all') {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const catOk =
            quickFilters.category === 'all' ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase();
          if (catOk) {
            (cat.subcategories || []).forEach((sub) => {
              const subOk =
                quickFilters.subCategory === 'all' ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
              if (subOk) {
                (sub.mappedTypes || []).forEach((mt) => {
                  const typeOk =
                    quickFilters.systemType === 'all' ||
                    mt.name?.toLowerCase() === quickFilters.systemType.toLowerCase() ||
                    quickFilters.systemType.toLowerCase().includes(mt.name?.toLowerCase());
                  if (typeOk) {
                    (mt.ranges || []).forEach((r) => {
                      const label = r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || 'kW'}`;
                      if (label && !seen.has(label.toLowerCase())) {
                        seen.add(label.toLowerCase());
                        const count = getCount(label, r.min_value, r.max_value);
                        list.push({ value: label, label: `${label} (${count})`, rawLabel: label, id: r.id || r._id, min: r.min_value, max: r.max_value, count });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      });
    }

    availableKits.forEach((kit) => {
      const label = kit.project_range_label || (kit.capacity_kw ? `${kit.capacity_kw} kW System` : null);
      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        const count = getCount(label, kit.min_kw, kit.max_kw);
        list.push({ value: label, label: `${label} (${count})`, rawLabel: label, id: kit.project_range_id, min: kit.min_kw, max: kit.max_kw, count });
      }
    });

    return [{ value: 'all', label: `All Project Ranges (${kitsInCurrentSys.length})`, count: kitsInCurrentSys.length }, ...list];
  }, [shopHierarchy, availableKits, quickFilters.industryType, quickFilters.category, quickFilters.subCategory, quickFilters.systemType]);

  const handleClearMainFilters = () => {
    setQuickFilters({
      industryType: 'all',
      category: 'all',
      subCategory: 'all',
      systemType: 'all',
      projectRange: 'all',
    });
  };

  const hasActiveQuickFilters = useMemo(() => {
    return (
      quickFilters.industryType !== 'all' ||
      quickFilters.category !== 'all' ||
      quickFilters.subCategory !== 'all' ||
      quickFilters.systemType !== 'all' ||
      quickFilters.projectRange !== 'all'
    );
  }, [quickFilters]);


  // Selected Kit in Create Modal
  const selectedKit = useMemo(() => {
    return (
      filteredComboKits.find((k) => String(k._id) === String(selectedKitId)) ||
      filteredComboKits[0] ||
      availableKits.find((k) => String(k._id) === String(selectedKitId)) ||
      availableKits[0]
    );
  }, [filteredComboKits, availableKits, selectedKitId]);

  // Auto-sync selectedKitId when list changes
  useEffect(() => {
    if (filteredComboKits.length > 0) {
      const match = filteredComboKits.find((k) => String(k._id) === String(selectedKitId));
      if (!match) {
        setSelectedKitId(filteredComboKits[0]._id);
      }
    }
  }, [filteredComboKits, selectedKitId]);

  // Sync selectedPoQty on kit switch
  useEffect(() => {
    if (selectedKit) {
      const defaultQty = selectedKit.order_quantities?.[0] || selectedKit.min_po_quantity || 0;
      setSelectedPoQty((prev) => (selectedKit.order_quantities?.includes(Number(prev)) ? Number(prev) : defaultQty));
    }
  }, [selectedKit?._id, selectedKit?.order_quantities]);

  // Pricing calculations for Create Modal
  const targetQuantity = Math.max(1, parseInt(selectedPoQty, 10) || selectedKit?.min_po_quantity || 200);

  const kitUnitPrice = useMemo(() => {
    if (!selectedKit) return 0;
    const poPricing = selectedKit.po_order_pricing;
    if (Array.isArray(poPricing) && poPricing.length > 0) {
      const matchedTier = poPricing.find((t) => Number(t.quantity) === Number(targetQuantity));
      if (matchedTier && matchedTier.price_per_kit > 0) return matchedTier.price_per_kit;
      const lowerTiers = poPricing
        .filter((t) => Number(t.quantity) <= Number(targetQuantity) && t.price_per_kit > 0)
        .sort((a, b) => Number(b.quantity) - Number(a.quantity));
      if (lowerTiers.length > 0) return lowerTiers[0].price_per_kit;
    }
    return selectedKit.dealer_price || selectedKit.unit_price || 0;
  }, [selectedKit, targetQuantity]);

  const kitGstRate = useMemo(() => {
    if (!selectedKit) return 0;
    const rawRate = selectedKit.gst_rate ?? selectedKit.tax_pct ?? selectedKit.gst_pct ?? selectedKit.common_gst_rate;
    if (rawRate !== undefined && rawRate !== null && !isNaN(Number(rawRate))) {
      return Number(rawRate);
    }
    return 0;
  }, [selectedKit]);

  const isTokenBookingActive = selectedKit?.token_booking_enabled !== false && Number(selectedKit?.token_value || selectedKit?.token_rate_per_kit_paise || 0) > 0;
  const tokenBookingType = selectedKit?.token_type || 'FIXED_AMOUNT';
  const rawTokenValue = Number(selectedKit?.token_value || (selectedKit?.token_rate_per_kit_paise ? selectedKit.token_rate_per_kit_paise / 100 : 0));

  const estimatedSubtotal = targetQuantity * kitUnitPrice;
  const estimatedGst = Math.round((estimatedSubtotal * kitGstRate) / 100);
  const estimatedGrandTotal = estimatedSubtotal + estimatedGst;

  // PO-level Token Deposit: If FIXED_AMOUNT, flat tokenValue (e.g. ₹60,000 for the whole PO). If PERCENTAGE, X% of total PO value.
  const estimatedTokenDeposit = isTokenBookingActive
    ? (tokenBookingType === 'PERCENTAGE'
      ? Math.round(estimatedGrandTotal * (rawTokenValue / 100))
      : rawTokenValue)
    : 0;

  // Active Onboarded EPC Object
  const activeEpcObj = useMemo(() => {
    if (!modalEpcId) return null;
    return onboardedEpcs.find((e) => String(e._id || e.id) === String(modalEpcId)) || null;
  }, [onboardedEpcs, modalEpcId]);

  // Active Franchisee Object
  const activeFranchiseeObj = useMemo(() => {
    if (!modalFranchiseeId) return null;
    return franchisees.find((f) => (f._id || f.id) === modalFranchiseeId) || null;
  }, [franchisees, modalFranchiseeId]);

  // Combined EPC List (BDE's Onboarded EPCs + Franchisee's Registered EPC Buyers)
  const combinedEpcList = useMemo(() => {
    const map = new Map();
    onboardedEpcs.forEach((e) => {
      const id = String(e._id || e.id);
      map.set(id, e);
    });
    epcBuyers.forEach((b) => {
      const id = String(b._id || b.id);
      if (!map.has(id)) {
        map.set(id, b);
      }
    });
    return Array.from(map.values());
  }, [onboardedEpcs, epcBuyers]);

  // Sync Franchisee Store & Plan Settings when modal EPC is selected
  useEffect(() => {
    if (activeEpcObj) {
      const targetFId =
        activeEpcObj.assigned_franchisee_id ||
        activeEpcObj.assigned_franchisee?._id ||
        null;

      if (targetFId !== modalFranchiseeId) {
        setModalFranchiseeId(targetFId || '');
      }
    }
  }, [activeEpcObj, modalFranchiseeId]);

  // ── Open Create Modal ──
  const handleOpenCreateModal = (preselectedEpcId = null) => {
    setCreateError('');
    fetchCompanyCombokits();
    const targetEpcId =
      preselectedEpcId ||
      (selectedEpcFilter !== 'ALL' ? selectedEpcFilter : (onboardedEpcs[0]?._id || ''));

    if (targetEpcId) {
      setModalEpcId(targetEpcId);
      const epc = onboardedEpcs.find((e) => String(e._id || e.id) === String(targetEpcId));
      const targetFId =
        epc?.assigned_franchisee_id ||
        epc?.assigned_franchisee?._id ||
        null;

      setModalFranchiseeId(targetFId || '');
      if (targetFId) {
        fetchFranchiseePlanSettings(targetFId);
        fetchEpcBuyers(targetFId);
      }
    } else {
      setModalFranchiseeId('');
    }
    setCreateModal(true);
  };

  // ── Step 1: Submit PO Creation ──
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!modalEpcId) {
      setCreateError('Please select an Onboarded EPC Partner for whom this Purchase Order is being created.');
      return;
    }

    const resolvedFranchiseeId =
      modalFranchiseeId ||
      activeEpcObj?.assigned_franchisee_id ||
      activeEpcObj?.assigned_franchisee?._id ||
      null;

    if (!selectedKit) {
      setCreateError('Please select an authorized ComboKit blueprint.');
      return;
    }
    if (targetQuantity <= 0) {
      setCreateError('Please select a valid PO quota quantity.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const poTokenPaise = Math.round(estimatedTokenDeposit * 100);

      const itemPayload = {
        combo_kit_id: selectedKit._id || selectedKit.id,
        kit_id: selectedKit._id || selectedKit.id,
        item_name: selectedKit.name || selectedKit.kit_name,
        quantity: targetQuantity,
        unit_price_paise: Math.round(kitUnitPrice * 100),
        token_rate_paise: poTokenPaise,
        total_price_paise: targetQuantity * Math.round(kitUnitPrice * 100),
        subtotal_paise: targetQuantity * Math.round(kitUnitPrice * 100),
        gst_rate: kitGstRate,
        epc_allocations: [],
      };

      const payload = {
        epc_id: modalEpcId,
        franchisee_id: resolvedFranchiseeId,
        order_type: 'po_order',
        po_category: poCategory,
        target_committed_quantity: targetQuantity,
        is_token_booking: isTokenBookingActive,
        token_amount_paise: poTokenPaise,
        items: [itemPayload],
      };

      const res = await api.post('/po/create', payload);

      if (res.data?.status === 'success') {
        setCreateModal(false);
        await fetchOrders(true);
        const createdOrder = res.data.data;
        if (createdOrder) {
          // Immediately transition into Stage 2: EPC Loose Allocation!
          handleOpenAllocateModal(createdOrder);
        }
      } else {
        setCreateError(res.data?.message || 'Failed to create Purchase Order.');
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create Purchase Order.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Step 2: Open Allocate Modal (Assign to EPC) ──
  const handleOpenAllocateModal = (order) => {
    setAllocatingOrder(order);
    const existingAllocs = {};
    if (order.items?.[0]?.epc_allocations?.length > 0) {
      order.items[0].epc_allocations.forEach((a) => {
        const bId = a.epc_buyer_id || a.buyer_id;
        if (bId) existingAllocs[bId] = a.allocated_quantity;
      });
    }
    setAllocateAllocations(existingAllocs);

    const firstAlloc = order.items?.[0]?.epc_allocations?.[0];
    if (firstAlloc?.epc_buyer_id) {
      setAllocateSingleTarget('single_epc');
      setAllocateSingleEpcId(firstAlloc.epc_buyer_id);
    } else if (order.epc_id) {
      const epcIdStr = (order.epc_id?._id || order.epc_id)?.toString();
      setAllocateSingleTarget('single_epc');
      setAllocateSingleEpcId(epcIdStr);
    } else {
      setAllocateSingleTarget(epcBuyers.length > 0 ? 'single_epc' : 'warehouse');
      setAllocateSingleEpcId(epcBuyers[0]?._id || '');
    }

    // Ensure EPC list is fresh for this order's franchisee
    const orderFId = order.franchisee_id?._id || order.franchisee_id;
    if (orderFId) {
      fetchEpcBuyers(orderFId);
    }

    setAllocateError('');
    setAllocateModal(true);
  };

  const handleAllocateLooseChange = (buyerId, val) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    setAllocateAllocations((prev) => {
      const next = { ...prev };
      if (qty === 0) delete next[buyerId];
      else next[buyerId] = qty;
      return next;
    });
    setAllocateError('');
  };

  const handleSubmitAllocate = async (e) => {
    e.preventDefault();
    setAllocateError('');
    if (!allocatingOrder) return;

    const totalCommitted = allocatingOrder.target_committed_quantity || allocatingOrder.total_booked_quantity || 200;
    const allocItem = allocatingOrder.items?.[0];
    const poTotalTokenPaise = Number(
      allocatingOrder.token_amount_paise ||
      allocItem?.token_rate_paise ||
      (kitObj.token_value ? kitObj.token_value * 100 : (kitObj.token_rate_per_kit_paise || 0))
    );

    const isCombine = allocatingOrder.po_category === 'COMBINE_PO';
    let epcList = [];

    if (isCombine) {
      const sum = Object.values(allocateAllocations).reduce((acc, q) => acc + (parseInt(q, 10) || 0), 0);
      if (sum !== totalCommitted) {
        setAllocateError(`Allocations sum (${sum} kits) must exactly equal committed PO quota (${totalCommitted} kits).`);
        return;
      }
      epcList = Object.entries(allocateAllocations)
        .filter(([, q]) => parseInt(q, 10) > 0)
        .map(([buyerId, qty]) => {
          const buyer = combinedEpcList.find((b) => (b._id || b.id)?.toString() === buyerId?.toString());
          const allocQ = parseInt(qty, 10);
          const allocTokenPaise = totalCommitted > 0 ? Math.round(poTotalTokenPaise * (allocQ / totalCommitted)) : 0;
          return {
            epc_buyer_id: buyerId,
            buyer_id: buyerId,
            company_name: buyer?.company_name || buyer?.name || 'EPC Buyer',
            buyer_name: buyer?.buyer_name || buyer?.name || 'EPC Buyer',
            gstin: buyer?.gstin || null,
            allocated_quantity: allocQ,
            token_amount_paise: allocTokenPaise,
            payment_status: 'PENDING',
          };
        });
    } else {
      if (allocateSingleTarget === 'single_epc') {
        if (!allocateSingleEpcId) {
          setAllocateError('Please select an onboarded EPC Partner, or switch to Warehouse Stock.');
          return;
        }
        const buyer = combinedEpcList.find((b) => (b._id || b.id)?.toString() === allocateSingleEpcId?.toString());
        epcList = [
          {
            epc_buyer_id: allocateSingleEpcId,
            company_name: buyer?.company_name || buyer?.name || 'EPC Partner',
            buyer_name: buyer?.buyer_name || buyer?.name || 'EPC Partner',
            gstin: buyer?.gstin || null,
            allocated_quantity: totalCommitted,
            token_amount_paise: poTotalTokenPaise,
            payment_status: (allocatingOrder.token_paid_paise >= poTotalTokenPaise && poTotalTokenPaise > 0) ? 'PAID' : 'PENDING',
          },
        ];
      } else {
        epcList = [
          {
            epc_buyer_id: null,
            company_name: 'Franchise Warehouse Stock',
            buyer_name: 'Warehouse Stock',
            gstin: null,
            allocated_quantity: totalCommitted,
            token_amount_paise: poTotalTokenPaise,
            payment_status: (allocatingOrder.token_paid_paise >= poTotalTokenPaise && poTotalTokenPaise > 0) ? 'PAID' : 'PENDING',
          },
        ];
      }
    }

    const allocGstRate = allocatingOrder.items?.[0]?.gst_rate != null
      ? Number(allocatingOrder.items[0].gst_rate)
      : (kitObj?.gst_rate != null ? Number(kitObj.gst_rate) : 0);

    const itemPayload = {
      kit_id: allocatingOrder.items?.[0]?.kit_id || kitObj._id,
      item_name: allocatingOrder.items?.[0]?.item_name || kitObj.name,
      quantity: totalCommitted,
      unit_price_paise: allocatingOrder.items?.[0]?.unit_price_paise || kitObj.base_price_paise,
      gst_rate: allocGstRate,
      token_rate_paise: poTotalTokenPaise,
      epc_allocations: epcList,
    };

    setAllocateSubmitting(true);
    try {
      const res = await api.put(`/po/${allocatingOrder._id}/allocate`, {
        items: [itemPayload],
      });
      if (res.data?.status === 'success') {
        setAllocateModal(false);
        await fetchOrders(true);
        // Automatically open Stage 3 Token Modal
        const updated = res.data.data;
        if (updated) {
          handleOpenTokenModal(updated);
        }
      } else {
        setAllocateError(res.data?.message || 'Failed to allocate EPC to PO.');
      }
    } catch (err) {
      setAllocateError(err.response?.data?.message || err.message || 'Failed to allocate EPC to PO.');
    } finally {
      setAllocateSubmitting(false);
    }
  };

  // ── Step 3: Open Token Modal & Submit Token Payment ──
  const handleOpenTokenModal = (order, epcBuyerId = null) => {
    setTokenOrder(order);
    const totalTokenReq = Math.round((order.token_amount_paise || 0) / 100);
    const tokenPaidSoFar = Math.round((order.token_paid_paise || 0) / 100);
    const remainingToken = Math.max(0, totalTokenReq - tokenPaidSoFar);

    const defaultEpcId = epcBuyerId || (order.po_category === 'SINGLE_PO' && order.items?.[0]?.epc_allocations?.[0]?.epc_buyer_id) || '';
    setTokenPayingEpcId(defaultEpcId);

    let targetEpcAmount = 0;
    if (defaultEpcId && order.items?.[0]?.epc_allocations) {
      const matchedAlloc = order.items[0].epc_allocations.find(
        (a) => String(a.epc_buyer_id || a.buyer_id) === String(defaultEpcId)
      );
      if (matchedAlloc && matchedAlloc.token_amount_paise != null) {
        targetEpcAmount = Math.round(matchedAlloc.token_amount_paise / 100);
      }
    }

    setTokenPayAmount(targetEpcAmount > 0 ? targetEpcAmount : (remainingToken > 0 ? remainingToken : (totalTokenReq > 0 ? totalTokenReq : 0)));
    setTokenUtr(`ICICI-UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setTokenBank('ICICI Bank Corporate');
    setTokenDate(new Date().toISOString().slice(0, 10));
    setTokenError('');
    setTokenSuccess(null);
    setTokenModal(true);
  };

  const handleSubmitTokenPayment = async (e) => {
    e.preventDefault();
    setTokenError('');
    if (!tokenUtr.trim()) {
      setTokenError('Please enter the UTR / Payment Transaction reference number.');
      return;
    }
    if (!tokenPayAmount || tokenPayAmount <= 0) {
      setTokenError('Please enter a valid token deposit amount.');
      return;
    }

    setTokenSubmitting(true);
    try {
      const payload = {
        epc_buyer_id: tokenPayingEpcId || null,
        utr_number: tokenUtr.trim().toUpperCase(),
        amount_paid: Number(tokenPayAmount),
        sender_bank_name: tokenBank.trim() || 'Bank Transfer',
        payment_date: tokenDate,
      };
      const res = await api.post(`/po/${tokenOrder._id}/pay-token`, payload);
      if (res.data?.status === 'success') {
        setTokenSuccess(res.data.data);
        await fetchOrders(true);
        setTimeout(() => {
          setTokenModal(false);
        }, 1500);
      } else {
        setTokenError(res.data?.message || 'Failed to record token payment.');
      }
    } catch (err) {
      setTokenError(err.response?.data?.message || err.message || 'Failed to record token payment.');
    } finally {
      setTokenSubmitting(false);
    }
  };

  // ── Step 4: Validate PO Order ──
  const handleValidateOrder = async (order) => {
    if (!window.confirm(`Validate Purchase Order ${order.po_number}? This will officially lock in pricing and enable loose kit drawdowns.`)) {
      return;
    }
    setValidatingOrderId(order._id);
    try {
      const res = await api.post(`/po/${order._id}/validate`);
      if (res.data?.status === 'success') {
        await fetchOrders(true);
      } else {
        alert(res.data?.message || 'Failed to validate Purchase Order.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to validate Purchase Order.');
    } finally {
      setValidatingOrderId(null);
    }
  };

  // ── Step 5: Open Reorder Modal (Drawdown against PO Quota) ──
  const handleOpenReorderModal = (order) => {
    setReorderOrder(order);
    const booked = order.total_booked_quantity || order.items?.[0]?.quantity || 100;
    const fulfilled = order.fulfilled_quantity || 0;
    const remaining = order.remaining_quantity != null ? order.remaining_quantity : Math.max(1, booked - fulfilled);

    setReorderQty(Math.min(5, remaining));
    setReorderUtr(`DRAWDOWN-UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setReorderBank('ICICI Bank');
    setReorderDate(new Date().toISOString().slice(0, 10));
    setReorderError('');
    setReorderModal(true);
  };

  const handleSubmitReorder = async (e) => {
    e.preventDefault();
    setReorderError('');
    if (!reorderOrder) return;

    if (reorderQty <= 0) {
      setReorderError('Please enter a valid reorder quantity.');
      return;
    }

    setReorderSubmitting(true);
    try {
      const payload = {
        quantity: Number(reorderQty),
        kit_id: reorderOrder.items?.[0]?.kit_id,
        offline_payment: {
          utr_number: reorderUtr.trim().toUpperCase(),
          sender_bank_name: reorderBank,
          payment_date: reorderDate,
        },
      };

      const res = await api.post(`/po/${reorderOrder._id}/reorder`, payload);
      if (res.data?.status === 'success') {
        setReorderModal(false);
        await fetchOrders(true);
      } else {
        setReorderError(res.data?.message || 'Failed to place reorder drawdown.');
      }
    } catch (err) {
      setReorderError(err.response?.data?.message || err.message || 'Failed to place reorder drawdown.');
    } finally {
      setReorderSubmitting(false);
    }
  };

  // ── Step 6: View Details ──
  const handleOpenDetailModal = (order) => {
    setSelectedOrder(order);
    setDetailModal(true);
  };

  // ── Filtered Orders ──
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. EPC filter
      if (selectedEpcFilter !== 'ALL') {
        const orderEpcId = (o.epc_id?._id || o.epc_id || o.customer_details?.epc_id)?.toString();
        const allocEpcIds =
          o.items?.[0]?.epc_allocations?.map((a) => (a.epc_buyer_id || a.buyer_id)?.toString()) || [];
        if (orderEpcId !== selectedEpcFilter && !allocEpcIds.includes(selectedEpcFilter)) {
          return false;
        }
      }
      // 2. Franchisee filter
      if (selectedFranchiseeFilter !== 'ALL') {
        const orderFId = (o.franchisee_id?._id || o.franchisee_id || o.reseller_id)?.toString();
        if (orderFId !== selectedFranchiseeFilter) return false;
      }
      // 3. Category Tab
      if (categoryTab !== 'ALL') {
        if (o.po_category !== categoryTab) return false;
      }
      // 4. Status filter
      if (statusFilter !== 'ALL') {
        if (o.status !== statusFilter) return false;
      }
      // 5. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const poNum = (o.po_number || '').toLowerCase();
        const kitName = (o.items?.[0]?.item_name || '').toLowerCase();
        const fName = (o.customer_details?.company_name || o.customer_details?.name || o.franchisee_id?.business_name || '').toLowerCase();
        const epcName = (o.items?.[0]?.epc_allocations?.[0]?.company_name || o.epc_id?.company_name || '').toLowerCase();
        if (!poNum.includes(q) && !kitName.includes(q) && !fName.includes(q) && !epcName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [orders, selectedEpcFilter, selectedFranchiseeFilter, categoryTab, statusFilter, search]);

  // Counts for Category Tabs
  const allOrdersCount = orders.length;
  const singlePoCount = orders.filter((o) => o.po_category === 'SINGLE_PO').length;
  const combinePoCount = orders.filter((o) => o.po_category === 'COMBINE_PO').length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* ── 1. ROYAL HERO BANNER (Matches Franchise Portal Screenshot Exactly) ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            {/* Top pill badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-white text-[10px] font-black uppercase tracking-wider border border-white/20 backdrop-blur-xs">
                FRANCHISEE QUOTA HUB
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 text-[10px] font-bold border border-amber-400/30">
                BDE Allocation Engine
              </span>
            </div>

            {/* Title with Shopping Cart */}
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 tracking-tight">
              <ShoppingCart className="w-8 h-8 text-amber-300 shrink-0" />
              <span>Purchase Orders &amp; Quota Lock</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm md:text-base text-blue-100 max-w-2xl leading-relaxed">
              Choose configured ComboKit blueprints, lock bulk quotas, and allocate loose orders to your onboarded EPC network.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 backdrop-blur-xs transition shadow-xs disabled:opacity-50"
              title="Refresh Orders"
            >
              <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => handleOpenCreateModal()}
              className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-amber-400/30 transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span> Create Purchase Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. ONBOARDED EPC & FRANCHISEE SELECTOR / CONTEXT BAR ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* EPC Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Onboarded EPC:</span>
            </div>

            <select
              value={selectedEpcFilter}
              onChange={(e) => setSelectedEpcFilter(e.target.value)}
              className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
            >
              <option value="ALL">All Onboarded EPCs ({onboardedEpcs.length})</option>
              {onboardedEpcs.map((epc) => (
                <option key={epc._id || epc.id} value={epc._id || epc.id}>
                  {epc.company_name} • {epc.district} ({epc.gstin || 'Non-GST'})
                </option>
              ))}
            </select>
          </div>

          {(selectedEpcFilter !== 'ALL' || selectedFranchiseeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedEpcFilter('ALL');
                setSelectedFranchiseeFilter('ALL');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Quick status summary badge */}
        <div className="flex items-center gap-3">
          {selectedFranchiseeFilter !== 'ALL' && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-900">
                {franchisees.find((f) => (f._id || f.id) === selectedFranchiseeFilter)?.business_name}
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">
                {franchisees.find((f) => (f._id || f.id) === selectedFranchiseeFilter)?.plan_name || 'Active Hub'}
              </span>
            </div>
          )}
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{filteredOrders.length}</span> of {orders.length} orders
          </div>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH BAR (Matches Screenshot Exactly) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        {/* Left: Category Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategoryTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoryTab === 'ALL'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            All Orders ({allOrdersCount})
          </button>
          <button
            onClick={() => setCategoryTab('SINGLE_PO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoryTab === 'SINGLE_PO'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            Single PO ({singlePoCount})
          </button>
          <button
            onClick={() => setCategoryTab('COMBINE_PO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoryTab === 'COMBINE_PO'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            Combine PO ({combinePoCount})
          </button>
        </div>

        {/* Right: Search, Status, and View Mode */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO#, EPC, Kit..."
              className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 lg:w-64 shadow-2xs"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_ALLOCATION">Pending Allocation</option>
            <option value="AWAITING_TOKEN_PAYMENT">Awaiting Token Payment</option>
            <option value="PO_STARTED">PO Started</option>
            <option value="VALIDATED">Validated ✓</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'cards' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. ORDER LIST / EMPTY STATE ── */}
      {ordersLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading purchase orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* EXACT EMPTY STATE MATCHING SCREENSHOT */
        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 md:p-16 text-center bg-white/60 shadow-2xs">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Purchase Orders Found</h3>
          <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto mb-6">
            No PO orders match your current filter. Create a new purchase order and select an authorized ComboKit blueprint.
          </p>
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-md text-xs inline-flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Purchase Order</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">PO Number &amp; Date</th>
                  <th className="px-4 py-3.5">Onboarded EPC &amp; Franchise Hub</th>
                  <th className="px-4 py-3.5">Blueprint ComboKit</th>
                  <th className="px-4 py-3.5">Quota &amp; Fulfilled</th>
                  <th className="px-4 py-3.5">Commercial Value</th>
                  <th className="px-4 py-3.5">Escrow Token</th>
                  <th className="px-4 py-3.5">Stage &amp; Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const item = order.items?.[0] || {};
                  const orderGstRate = item.gst_rate != null ? Number(item.gst_rate) : (order.pricing?.tax_rate != null ? Number(order.pricing.tax_rate) : null);
                  const totalCommitted = order.target_committed_quantity || order.total_booked_quantity || item.quantity || 100;
                  const fulfilled = order.fulfilled_quantity || 0;
                  const remaining = order.remaining_quantity != null ? order.remaining_quantity : Math.max(0, totalCommitted - fulfilled);
                  const grandTotalInr = Math.round((order.grand_total_paise || 0) / 100);
                  const tokenReqInr = Math.round((order.token_amount_paise || 0) / 100);
                  const tokenPaidInr = Math.round((order.token_paid_paise || 0) / 100);
                  const isTokenPaid = order.token_payment_status === 'PAID' || tokenPaidInr >= tokenReqInr;
                  const stepNum = ['VALIDATED', 'CONFIRMED', 'PAID', 'COMPLETED'].includes(order.status)
                    ? 4
                    : ['PO_STARTED', 'VALIDATING'].includes(order.status)
                      ? 3
                      : ['AWAITING_TOKEN_PAYMENT'].includes(order.status)
                        ? 2
                        : 1;

                  const franchiseeName =
                    order.customer_details?.company_name ||
                    order.customer_details?.name ||
                    order.franchisee_id?.business_name ||
                    'Franchise Store';

                  const epcName =
                    order.epc_id?.company_name ||
                    order.customer_details?.buyer_name ||
                    order.items?.[0]?.epc_allocations?.[0]?.company_name ||
                    order.customer_details?.name ||
                    'Onboarded EPC';

                  return (
                    <tr key={order._id} className="hover:bg-slate-50/70 transition">
                      {/* PO Number */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-blue-700 flex items-center gap-1.5">
                          <span>{order.po_number}</span>
                          <button
                            onClick={() => handleCopy(order.po_number, `po-${order._id}`)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Copy PO Number"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(order.createdAt || order.order_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {order.po_category === 'COMBINE_PO' ? 'Combine PO' : 'Single PO'}
                        </span>
                      </td>

                      {/* Onboarded EPC & Franchise Hub */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[200px]">{epcName}</span>
                        </div>
                        <div className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1 mt-0.5">
                          <Store className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[180px]">Hub: {franchiseeName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {order.customer_details?.district || order.franchisee_id?.address?.district_name || 'Regional'}
                          {order.customer_details?.gstin ? ` • GST: ${order.customer_details.gstin}` : ''}
                        </div>
                      </td>

                      {/* Blueprint Kit */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{item.item_name || 'Solar ComboKit'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>₹{((item.unit_price_paise || 0) / 100).toLocaleString('en-IN')}/kit</span>
                        </div>
                      </td>

                      {/* Quota Progress */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{totalCommitted} Kits</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {fulfilled} fulfilled • {remaining} left
                        </div>
                        <div className="w-24 bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.round((fulfilled / Math.max(1, totalCommitted)) * 100))}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Commercial Value */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">₹{grandTotalInr.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] text-slate-500">
                          {orderGstRate != null ? `Incl. ${orderGstRate}% GST` : 'Incl. GST'}
                        </div>
                      </td>

                      {/* Token Deposit */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">₹{tokenReqInr.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] mt-0.5">
                          {isTokenPaid ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">PAID</span>
                          ) : (
                            <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">PENDING</span>
                          )}
                        </div>
                      </td>

                      {/* Stage & Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={order.status} />
                        <PoStageStepper stepNumber={stepNum} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                        {/* Allocate to EPC */}
                        {['DRAFT', 'PENDING_ALLOCATION', 'AWAITING_TOKEN_PAYMENT'].includes(order.status) && (
                          <button
                            onClick={() => handleOpenAllocateModal(order)}
                            className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition"
                          >
                            Allocate EPC
                          </button>
                        )}

                        {/* Pay Token */}
                        {!isTokenPaid && (
                          <button
                            onClick={() => handleOpenTokenModal(order)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg transition"
                          >
                            Pay Token
                          </button>
                        )}

                        {/* Validate PO */}
                        {isTokenPaid && order.status !== 'VALIDATED' && (
                          <button
                            onClick={() => handleValidateOrder(order)}
                            disabled={validatingOrderId === order._id}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition"
                          >
                            {validatingOrderId === order._id ? 'Validating...' : 'Validate PO ✓'}
                          </button>
                        )}

                        {/* Drawdown / Reorder */}
                        {['VALIDATED', 'CONFIRMED', 'PAID', 'PO_STARTED'].includes(order.status) && remaining > 0 && (
                          <button
                            onClick={() => handleOpenReorderModal(order)}
                            className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg transition"
                          >
                            Drawdown
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          onClick={() => handleOpenDetailModal(order)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg transition"
                          title="View PO Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const item = order.items?.[0] || {};
            const totalCommitted = order.target_committed_quantity || order.total_booked_quantity || item.quantity || 100;
            const fulfilled = order.fulfilled_quantity || 0;
            const remaining = order.remaining_quantity != null ? order.remaining_quantity : Math.max(0, totalCommitted - fulfilled);
            const grandTotalInr = Math.round((order.grand_total_paise || 0) / 100);
            const tokenReqInr = Math.round((order.token_amount_paise || 0) / 100);
            const tokenPaidInr = Math.round((order.token_paid_paise || 0) / 100);
            const isTokenPaid = order.token_payment_status === 'PAID' || tokenPaidInr >= tokenReqInr;
            const stepNum = ['VALIDATED', 'CONFIRMED', 'PAID', 'COMPLETED'].includes(order.status)
              ? 4
              : ['PO_STARTED', 'VALIDATING'].includes(order.status)
                ? 3
                : ['AWAITING_TOKEN_PAYMENT'].includes(order.status)
                  ? 2
                  : 1;

            const franchiseeName =
              order.customer_details?.company_name ||
              order.customer_details?.name ||
              order.franchisee_id?.business_name ||
              'Franchise Store';

            const epcPreviewName =
              order.items?.[0]?.epc_allocations?.[0]?.company_name ||
              order.epc_id?.company_name ||
              'Not Allocated';

            return (
              <div
                key={order._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-mono font-bold text-blue-700 text-sm flex items-center gap-1.5">
                        <span>{order.po_number}</span>
                        <button
                          onClick={() => handleCopy(order.po_number, `po-${order._id}`)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(order.createdAt || order.order_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  {/* EPC Partner & Franchise Hub */}
                  <div className="py-2 border-y border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[190px] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{epcPreviewName}</span>
                      </span>
                      <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        {order.po_category === 'COMBINE_PO' ? 'Combine PO' : 'Single PO'}
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                      <Store className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="truncate">Hub: {franchiseeName}</span>
                    </div>
                  </div>

                  {/* Blueprint Kit Details */}
                  <div className="mt-3">
                    <div className="font-bold text-slate-900 text-sm">{item.item_name || 'Solar ComboKit Blueprint'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Target Quota: <span className="font-bold text-slate-800">{totalCommitted} Kits</span>
                    </div>
                  </div>

                  {/* EPC Allocation preview */}
                  <div className="mt-2.5 p-2 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Assigned EPC:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[170px]">{epcPreviewName}</span>
                  </div>

                  {/* Quota Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {fulfilled} / {totalCommitted} Kits
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((fulfilled / Math.max(1, totalCommitted)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Financials & Token */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px] font-bold uppercase">Grand Total</div>
                      <div className="font-bold text-slate-900 mt-0.5">₹{grandTotalInr.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] font-bold uppercase">Token Deposit</div>
                      <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                        <span>₹{tokenReqInr.toLocaleString('en-IN')}</span>
                        {isTokenPaid ? (
                          <span className="text-[9px] font-black text-emerald-600">✓ PAID</span>
                        ) : (
                          <span className="text-[9px] font-black text-amber-600">PENDING</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="mt-3">
                    <PoStageStepper stepNumber={stepNum} />
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDetailModal(order)}
                    className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl transition"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    {['DRAFT', 'PENDING_ALLOCATION', 'AWAITING_TOKEN_PAYMENT'].includes(order.status) && (
                      <button
                        onClick={() => handleOpenAllocateModal(order)}
                        className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition"
                      >
                        Allocate EPC
                      </button>
                    )}

                    {!isTokenPaid && (
                      <button
                        onClick={() => handleOpenTokenModal(order)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-xl transition"
                      >
                        Pay Token
                      </button>
                    )}

                    {isTokenPaid && order.status !== 'VALIDATED' && (
                      <button
                        onClick={() => handleValidateOrder(order)}
                        disabled={validatingOrderId === order._id}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition"
                      >
                        {validatingOrderId === order._id ? 'Validating...' : 'Validate PO ✓'}
                      </button>
                    )}

                    {['VALIDATED', 'CONFIRMED', 'PAID', 'PO_STARTED'].includes(order.status) && remaining > 0 && (
                      <button
                        onClick={() => handleOpenReorderModal(order)}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition"
                      >
                        Drawdown
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. MODAL 1: CREATE PURCHASE ORDER ── */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded">
                  STAGE 1: BLUEPRINT &amp; PO QUOTA SELECTION
                </span>
                <h2 className="text-xl font-bold mt-1">Create Purchase Order for Onboarded EPC</h2>
                <p className="text-xs text-blue-100 mt-0.5">
                  Choose your Onboarded EPC partner, select an authorized ComboKit blueprint, and lock bulk quota pricing.
                </p>
              </div>
              <button
                onClick={() => setCreateModal(false)}
                className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Step 1: Onboarded EPC Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    1. Select Onboarded EPC Partner <span className="text-rose-500">*</span>
                  </label>
                  {epcsLoading && (
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading EPCs...
                    </span>
                  )}
                </div>

                <select
                  value={modalEpcId}
                  onChange={(e) => {
                    const chosenEpcId = e.target.value;
                    setModalEpcId(chosenEpcId);
                    const chosenEpc = onboardedEpcs.find((item) => String(item._id || item.id) === String(chosenEpcId));
                    const targetFId = chosenEpc?.assigned_franchisee_id || chosenEpc?.assigned_franchisee?._id || '';
                    setModalFranchiseeId(targetFId);
                    fetchCompanyCombokits(chosenEpcId, targetFId);
                    if (targetFId) {
                      fetchFranchiseePlanSettings(targetFId);
                      fetchEpcBuyers(targetFId);
                    }
                  }}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Onboarded EPC Partner --</option>
                  {onboardedEpcs.map((epc) => (
                    <option key={epc._id || epc.id} value={epc._id || epc.id}>
                      {epc.company_name} {epc.contact_person && epc.contact_person !== epc.company_name ? `(${epc.contact_person})` : ''} • {epc.district}, {epc.state} {epc.gstin ? `• GST: ${epc.gstin}` : ''}
                    </option>
                  ))}
                </select>

                {activeEpcObj && (
                  <div className="mt-2.5 p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-700 shrink-0" />
                        <span className="font-bold text-sm text-blue-900">{activeEpcObj.company_name}</span>
                        {activeEpcObj.gstin ? (
                          <span className="bg-blue-100 text-blue-800 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                            GST: {activeEpcObj.gstin}
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                            Registered EPC Partner
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                        📍 {activeEpcObj.district}, {activeEpcObj.state}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-100/90 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-500">Contact Person:</span>{' '}
                        <span className="font-semibold text-slate-800">{activeEpcObj.contact_person || activeEpcObj.name}</span>
                        {activeEpcObj.mobile && (
                          <span className="ml-1.5 font-mono text-slate-600">({activeEpcObj.mobile})</span>
                        )}
                      </div>

                      {/* PO Fulfillment: Direct Company Order */}
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-slate-500">Order Fulfillment:</span>
                        <span className="bg-white border border-blue-200 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-2xs">
                          SolarKits Direct (Company PO)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: PO Category Selection */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  2. Purchase Order Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPoCategory('SINGLE_PO')}
                    className={`p-3.5 rounded-xl border text-left transition ${poCategory === 'SINGLE_PO'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Single PO</span>
                      {poCategory === 'SINGLE_PO' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      100% committed quota allocated directly to this onboarded EPC ({activeEpcObj?.company_name || 'Selected EPC'}).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPoCategory('COMBINE_PO')}
                    className={`p-3.5 rounded-xl border text-left transition ${poCategory === 'COMBINE_PO'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Combine PO</span>
                      {poCategory === 'COMBINE_PO' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Bulk quota distributed and split across multiple onboarded EPC partners.
                    </p>
                  </button>
                </div>
              </div>

              {/* Step 3: Blueprint Selection with Taxonomy Filters */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    3. Select ComboKit Blueprint <span className="text-rose-500">*</span>
                  </label>
                  {planLoading && (
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading blueprints...
                    </span>
                  )}
                </div>

                {/* ── Quick Filters Bar (Matches Screenshot 1) ── */}
                <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs mb-4">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-800">Quick Filters</h4>
                        <span className="text-[11px] font-semibold text-slate-600 px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">
                          {filteredComboKits.length} of {availableKits.length} Kits
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearMainFilters}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition cursor-pointer"
                    >
                      Clear Main
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* 1. Industry Type */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-8 cursor-pointer shadow-2xs"
                        >
                          {industryTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* 2. Category */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-8 cursor-pointer shadow-2xs"
                        >
                          {categoryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* 3. Sub Category */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-8 cursor-pointer shadow-2xs"
                        >
                          {subCategoryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* 4. System Type */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-8 cursor-pointer shadow-2xs"
                        >
                          {systemTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* 5. Project Range */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-8 cursor-pointer shadow-2xs"
                        >
                          {projectRangeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blueprint Cards */}
                {availableKits.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                    <p className="text-xs font-bold text-slate-700">
                      No active blueprint ComboKits found.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Please ensure active ComboKit blueprints are configured in the system catalog.
                    </p>
                  </div>
                ) : filteredComboKits.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                    <p className="text-xs font-bold text-slate-800">
                      No ComboKits found matching the selected Quick Filters
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Try resetting or adjusting the Industry Type, Category, Sub Category, System Type, or Project Range filters above.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearMainFilters}
                      className="mt-1 px-4 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition border border-blue-200 cursor-pointer"
                    >
                      Clear Quick Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-84 overflow-y-auto p-1 pr-1.5">
                    {filteredComboKits.map((kit) => {
                      const isSel = String(kit._id) === String(selectedKitId);
                      return (
                        <div
                          key={kit._id}
                          onClick={() => {
                            setSelectedKitId(kit._id);
                            const firstQty = kit.order_quantities?.[0] || kit.min_po_quantity || 0;
                            setSelectedPoQty(firstQty);
                          }}
                          className={`p-4 sm:p-4.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${isSel
                            ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-blue-300 bg-white hover:shadow-xs'
                            }`}
                        >
                          <div>
                            {/* Card Header: Selection Circle + Kit Title + kW Badge */}
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs mt-0.5 shrink-0 transition-colors ${isSel
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'border-2 border-slate-300 text-transparent'
                                    }`}
                                >
                                  {isSel && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-slate-900 leading-snug">{kit.name}</h4>
                                  {kit.category_name && (
                                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                                      {kit.category_name} {kit.subcategory_name ? `• ${kit.subcategory_name}` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Capacity kW Pill */}
                              <div className="shrink-0 text-right">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-extrabold text-xs shadow-2xs">
                                  <Zap className="w-3 h-3 text-blue-600 shrink-0" />
                                  {kit.capacity_kw} kW
                                </span>
                              </div>
                            </div>

                            {/* Taxonomy Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200">
                                ☀️ {kit.system_type || 'On-Grid'}
                              </span>
                              {kit.project_range_label && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-200">
                                  📐 {kit.project_range_label}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                                ✓ Authorized Blueprint
                              </span>
                              {kit.gst_rate != null && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">
                                  GST: {kit.gst_rate}%
                                </span>
                              )}
                            </div>

                            {/* Specifications Summary */}
                            <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                              {kit.specifications}
                            </p>
                          </div>

                          {/* Card Bottom: Commercials & Pricing Section */}
                          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-end justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Committed Quota Base</span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-base font-extrabold text-slate-900">
                                  ₹{(kit.dealer_price || 0).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] font-bold text-slate-500">/ kit</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Token Booking</span>
                              {kit.token_booking_enabled !== false && (kit.token_value > 0 || kit.token_rate_per_kit_paise > 0) ? (
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 inline-block mt-0.5 shadow-2xs">
                                  {kit.token_type === 'PERCENTAGE'
                                    ? `${kit.token_value || 10}% PO Deposit`
                                    : `₹${Number(kit.token_value || (kit.token_rate_per_kit_paise ? kit.token_rate_per_kit_paise / 100 : 0)).toLocaleString('en-IN')} PO Deposit`}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 4: Quota Quantity Tiers */}
              {selectedKit && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      4. Select Committed PO Quota Quantity (Kits) <span className="text-rose-500">*</span>
                    </label>
                    {selectedKit.order_quantities?.length > 0 && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Configured MOQ: {selectedKit.order_quantities[0]} Kits
                      </span>
                    )}
                  </div>
                  {Array.isArray(selectedKit.order_quantities) && selectedKit.order_quantities.length > 0 ? (
                    <div
                      className={`grid gap-2.5 ${selectedKit.order_quantities.length === 1
                        ? 'grid-cols-1 sm:grid-cols-2'
                        : selectedKit.order_quantities.length === 2
                          ? 'grid-cols-2'
                          : selectedKit.order_quantities.length === 3
                            ? 'grid-cols-3'
                            : 'grid-cols-2 sm:grid-cols-4'
                        }`}
                    >
                      {selectedKit.order_quantities.map((qty) => {
                        const isSel = Number(selectedPoQty) === Number(qty);
                        return (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setSelectedPoQty(qty)}
                            className={`py-3 px-2 rounded-xl border text-center transition ${isSel
                              ? 'bg-blue-600 text-white font-extrabold border-blue-600 shadow-md shadow-blue-600/25 ring-2 ring-blue-500/20'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 font-bold'
                              }`}
                          >
                            <div className="text-base">{qty}</div>
                            <div className={`text-[10px] uppercase font-bold ${isSel ? 'text-blue-100' : 'text-slate-400'}`}>
                              Kits
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                      No PO Quota Quantities configured for this kit in Admin. Please configure them under Trial Kits / MOQ.
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Commercial & Financial Summary Card */}
              {selectedKit && (
                <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Commercial Financial Summary
                    </span>
                    <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded text-blue-200">
                      {targetQuantity} Kits Committed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Tier Unit Price</div>
                      <div className="font-bold text-sm text-white mt-0.5">₹{kitUnitPrice.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Subtotal (Excl. Tax)</div>
                      <div className="font-bold text-sm text-white mt-0.5">₹{estimatedSubtotal.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">GST ({kitGstRate}%)</div>
                      <div className="font-bold text-sm text-white mt-0.5">₹{estimatedGst.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Total PO Value</div>
                      <div className="font-extrabold text-sm text-emerald-400 mt-0.5">
                        ₹{estimatedGrandTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-200">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Required Escrow Token Deposit ({tokenBookingType === 'PERCENTAGE' ? `${rawTokenValue}% of PO Value` : 'Fixed PO Quota Token'}):
                      </span>
                    </div>
                    <span className="text-base font-black text-amber-300">
                      ₹{estimatedTokenDeposit.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createSubmitting || !modalEpcId || !selectedKit}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition flex items-center gap-2"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Purchase Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Purchase Order &amp; Proceed to Allocation</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. MODAL 2: ALLOCATE PO TO EPC (Stage 2) ── */}
      {allocateModal && allocatingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-200 bg-white/10 px-2 py-0.5 rounded">
                  STAGE 2: PRODUCT &amp; EPC NETWORK ALLOCATION
                </span>
                <h2 className="text-xl font-bold mt-1">Allocate PO Quota to EPC Partner(s)</h2>
                <p className="text-xs text-amber-100 mt-0.5">
                  Assign this purchase order ({allocatingOrder.po_number}) to your onboarded EPC network.
                </p>
              </div>
              <button
                onClick={() => setAllocateModal(false)}
                className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAllocate} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {allocateError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{allocateError}</span>
                </div>
              )}

              {/* Order Info & Rate Lock Badge */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Committed PO Quota</div>
                  <div className="font-extrabold text-base text-slate-900 mt-0.5">
                    {allocatingOrder.target_committed_quantity || allocatingOrder.total_booked_quantity || 200} Kits
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {allocatingOrder.items?.[0]?.item_name || 'Solar Kit Blueprint'}
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-1">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 w-fit">
                    {allocatingOrder.po_category === 'COMBINE_PO' ? 'Combine PO' : 'Single PO'}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>Locked: ₹{Math.round(((allocatingOrder.items?.[0]?.unit_price_paise || kitObj.base_price_paise || 0) / 100)).toLocaleString('en-IN')}/kit</span>
                  </div>
                </div>
              </div>

              {/* Single PO Allocation */}
              {allocatingOrder.po_category !== 'COMBINE_PO' ? (
                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Assign Quota Destination
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAllocateSingleTarget('single_epc')}
                      className={`p-3.5 rounded-xl border text-left transition ${allocateSingleTarget === 'single_epc'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">Onboarded EPC Partner</span>
                        {allocateSingleTarget === 'single_epc' && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Assign to an authorized EPC contractor.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAllocateSingleTarget('warehouse')}
                      className={`p-3.5 rounded-xl border text-left transition ${allocateSingleTarget === 'warehouse'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">Franchise Warehouse Stock</span>
                        {allocateSingleTarget === 'warehouse' && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Keep stock in Franchise Hub.</p>
                    </button>
                  </div>

                  {allocateSingleTarget === 'single_epc' && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                        Choose EPC Partner <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={allocateSingleEpcId}
                        onChange={(e) => setAllocateSingleEpcId(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select EPC Partner --</option>
                        {combinedEpcList.map((buyer) => (
                          <option key={buyer._id || buyer.id} value={buyer._id || buyer.id}>
                            {buyer.company_name || buyer.name} • GSTIN: {buyer.gstin || 'Unregistered'} (
                            {buyer.district || 'Regional'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                /* Combine PO Multi-EPC Distribution Table */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-slate-700">
                      Distribute Quota Across EPC Partners
                    </label>
                    <span className="text-xs font-bold text-slate-600">
                      Total Allocated:{' '}
                      <span
                        className={
                          Object.values(allocateAllocations).reduce((acc, q) => acc + (parseInt(q, 10) || 0), 0) ===
                            (allocatingOrder.target_committed_quantity || 200)
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }
                      >
                        {Object.values(allocateAllocations).reduce((acc, q) => acc + (parseInt(q, 10) || 0), 0)} /{' '}
                        {allocatingOrder.target_committed_quantity || 200} Kits
                      </span>
                    </span>
                  </div>

                  {combinedEpcList.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-xs text-slate-500">
                      No onboarded EPC partners found. Please onboard EPC partners first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {combinedEpcList.map((buyer) => {
                        const bId = buyer._id || buyer.id;
                        const val = allocateAllocations[bId] || '';
                        return (
                          <div
                            key={bId}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{buyer.company_name || buyer.name}</div>
                              <div className="text-[11px] text-slate-400">
                                GSTIN: {buyer.gstin || 'N/A'} • {buyer.district || 'Regional'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-semibold text-slate-500">Kits:</span>
                              <input
                                type="number"
                                min="0"
                                value={val}
                                onChange={(e) => handleAllocateLooseChange(bId, e.target.value)}
                                placeholder="0"
                                className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAllocateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={allocateSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition flex items-center gap-2"
                >
                  {allocateSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Allocating EPC...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Allocation &amp; Proceed to Token Payment</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. MODAL 3: PAY ESCROW TOKEN DEPOSIT (Stage 3) ── */}
      {tokenModal && tokenOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded">
                  STAGE 3: ESCROW TOKEN PAYMENT
                </span>
                <h2 className="text-xl font-bold mt-1">Record Token Deposit Payment</h2>
                <p className="text-xs text-blue-100 mt-0.5">
                  Confirm UTR and transfer details for PO {tokenOrder.po_number}.
                </p>
              </div>
              <button
                onClick={() => setTokenModal(false)}
                className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTokenPayment} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {tokenError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{tokenError}</span>
                </div>
              )}

              {tokenSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Token deposit recorded successfully! PO Started.</span>
                </div>
              )}

              {/* Escrow Bank Instructions Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-700 font-bold border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <Shield className="w-4 h-4" /> Company Escrow Bank Details
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">ICICI Corporate</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Account Number</span>
                    <span className="font-mono font-bold text-slate-900">{ESCROW_BANK.account_number}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ESCROW_BANK.account_number, 'acc')}
                      className="ml-2 text-blue-600 hover:underline text-[10px]"
                    >
                      {copiedField === 'acc' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">IFSC Code</span>
                    <span className="font-mono font-bold text-slate-900">{ESCROW_BANK.ifsc_code}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ESCROW_BANK.ifsc_code, 'ifsc')}
                      className="ml-2 text-blue-600 hover:underline text-[10px]"
                    >
                      {copiedField === 'ifsc' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span className="font-bold">UPI ID:</span> {ESCROW_BANK.upi_id}
                </div>
              </div>

              {/* Form Inputs */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Token Deposit Amount (INR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={tokenPayAmount}
                  onChange={(e) => setTokenPayAmount(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Payment UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tokenUtr}
                  onChange={(e) => setTokenUtr(e.target.value)}
                  placeholder="e.g. ICICI-UTR-98234821 or UPI Ref"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Sender Bank</label>
                  <input
                    type="text"
                    value={tokenBank}
                    onChange={(e) => setTokenBank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={tokenDate}
                    onChange={(e) => setTokenDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTokenModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={tokenSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition flex items-center gap-2"
                >
                  {tokenSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Token Payment...</span>
                    </>
                  ) : (
                    <span>Submit Token Payment Details</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. MODAL 4: REORDER / DRAWDOWN AGAINST PO ── */}
      {reorderModal && reorderOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-700 to-purple-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 bg-white/10 px-2 py-0.5 rounded">
                  STAGE 5: LOOSE REORDER / DRAWDOWN
                </span>
                <h2 className="text-xl font-bold mt-1">Place Drawdown against PO Quota</h2>
                <p className="text-xs text-indigo-100 mt-0.5">
                  Deduct loose quantities against locked PO {reorderOrder.po_number}.
                </p>
              </div>
              <button
                onClick={() => setReorderModal(false)}
                className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReorder} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {reorderError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reorderError}</span>
                </div>
              )}

              {/* Quota balance info */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase">Locked Quota Remaining</div>
                  <div className="font-extrabold text-base text-slate-900 mt-0.5">
                    {reorderOrder.remaining_quantity != null ? reorderOrder.remaining_quantity : 100} Kits Available
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {reorderOrder.items?.[0]?.item_name || 'ComboKit Blueprint'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                    Price: ₹{((reorderOrder.items?.[0]?.unit_price_paise || 0) / 100).toLocaleString('en-IN')}/kit
                  </span>
                </div>
              </div>

              {/* Reorder Quantity */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Drawdown Quantity (Kits) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 mb-2">
                  {[5, 10, 15, 20].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setReorderQty(q)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${Number(reorderQty) === q
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                    >
                      {q} Kits
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max={reorderOrder.remaining_quantity || 100}
                  value={reorderQty}
                  onChange={(e) => setReorderQty(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Commercials */}
              {(() => {
                const reorderItem = reorderOrder.items?.[0] || {};
                const reorderGstRate = reorderItem.gst_rate != null ? Number(reorderItem.gst_rate) : 0;
                const reorderUnitPrice = (reorderItem.unit_price_paise || 0) / 100;
                const reorderTaxPerKit = Math.round((reorderUnitPrice * reorderGstRate) / 100);
                const totalPoCommitted = Number(reorderOrder.total_booked_quantity || reorderOrder.target_committed_quantity || reorderItem.quantity || 1);
                const totalPoTokenInr = Number(reorderOrder.token_amount_paise || reorderOrder.token_paid_paise || 0) / 100;
                const reorderTokenPerKit = totalPoCommitted > 0 ? Math.round(totalPoTokenInr / totalPoCommitted) : 0;
                const numQty = Number(reorderQty) || 0;
                const reorderGrossValue = numQty * reorderUnitPriceWithTax;
                const reorderEscrowAdj = numQty * reorderTokenPerKit;
                const reorderNetPayable = Math.max(0, reorderGrossValue - reorderEscrowAdj);

                return (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross Value (Incl. {reorderGstRate}% GST):</span>
                      <span className="font-bold text-slate-900">
                        ₹{reorderGrossValue.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Pro-rata Token Escrow Adjusted ({numQty} × ₹{reorderTokenPerKit}):</span>
                      <span className="font-bold">-₹{reorderEscrowAdj.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-extrabold border-t border-indigo-200 pt-1.5">
                      <span>Net Payable Amount:</span>
                      <span className="text-indigo-900 font-black">
                        ₹{reorderNetPayable.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Details */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Drawdown Payment UTR <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={reorderUtr}
                  onChange={(e) => setReorderUtr(e.target.value)}
                  placeholder="Drawdown payment UTR"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReorderModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={reorderSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition flex items-center gap-2"
                >
                  {reorderSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Placing Drawdown...</span>
                    </>
                  ) : (
                    <span>Confirm Drawdown &amp; Deduct Quota</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 9. MODAL 5: PO FULL AUDIT & DETAILS ── */}
      {detailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/10 px-2 py-0.5 rounded">
                  PO AUDIT &amp; ALLOCATION BREAKDOWN
                </span>
                <h2 className="text-xl font-bold mt-1 flex items-center gap-2">
                  <span>{selectedOrder.po_number}</span>
                  <StatusBadge status={selectedOrder.status} />
                </h2>
              </div>
              <button
                onClick={() => setDetailModal(false)}
                className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Franchisee Details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Franchisee Store</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedOrder.customer_details?.company_name || selectedOrder.franchisee_id?.business_name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Location</span>
                  <span className="font-semibold text-slate-700">
                    {selectedOrder.customer_details?.district || selectedOrder.franchisee_id?.address?.district_name || 'Regional'},{' '}
                    {selectedOrder.customer_details?.state || 'Gujarat'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Created By</span>
                  <span className="font-bold text-blue-700">
                    {selectedOrder.creator_name || 'BDE Executive'} ({selectedOrder.created_by_role || 'BDE'})
                  </span>
                </div>
              </div>

              {/* Kit Specifications & Quota */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">ComboKit Blueprint Specifications</h4>
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedOrder.items?.[0]?.item_name || 'Solar Kit Blueprint'}
                    </span>
                    <span className="font-extrabold text-blue-800 text-sm">
                      {selectedOrder.target_committed_quantity || selectedOrder.total_booked_quantity || 100} Kits Quota
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-slate-600 pt-2 border-t border-blue-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Unit Price</span>
                      <span className="font-bold text-slate-900">
                        ₹{((selectedOrder.items?.[0]?.unit_price_paise || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Subtotal</span>
                      <span className="font-bold text-slate-900">
                        ₹{Math.round((selectedOrder.subtotal_paise || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Grand Total</span>
                      <span className="font-bold text-emerald-700">
                        ₹{Math.round((selectedOrder.grand_total_paise || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Allocated EPC Partners Table */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Allocated EPC Network</h4>
                {selectedOrder.items?.[0]?.epc_allocations?.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">EPC Partner Name</th>
                          <th className="px-3 py-2">Allocated Qty</th>
                          <th className="px-3 py-2">Token Deposit</th>
                          <th className="px-3 py-2">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrder.items[0].epc_allocations.map((alloc, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-slate-800">{alloc.company_name || alloc.buyer_name}</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{alloc.allocated_quantity} Kits</td>
                            <td className="px-3 py-2">₹{Math.round((alloc.token_amount_paise || 0) / 100).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${alloc.payment_status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                                  }`}
                              >
                                {alloc.payment_status || 'PENDING'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                    No EPC allocations recorded yet.
                  </div>
                )}
              </div>

              {/* Audit History Timeline */}
              {Array.isArray(selectedOrder.status_history) && selectedOrder.status_history.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2">Status &amp; Audit Trail</h4>
                  <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2">
                    {selectedOrder.status_history.map((hist, i) => (
                      <div key={i} className="relative">
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute -left-[21px] top-1" />
                        <div className="font-bold text-slate-900">{hist.status}</div>
                        <div className="text-[11px] text-slate-500">
                          {hist.note} • {new Date(hist.changed_at).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDetailModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
