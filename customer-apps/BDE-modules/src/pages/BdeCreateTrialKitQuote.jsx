import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  Truck,
  Box,
  ShieldCheck,
  DollarSign,
  FileText,
  Users,
  AlertTriangle,
  Layers,
  Store,
  CheckCircle2,
  Package,
  ChevronDown,
  Plus,
  Building2,
  MapPin,
  Filter,
  RotateCcw,
  LayoutGrid,
  List,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  Shield,
  Cpu,
  Sun,
  Info,
} from 'lucide-react';
import api from '../services/api';

const STEPS = [
  { num: 1, title: 'EPC Buyer', desc: 'Client & Franchisee attribution', icon: Users },
  { num: 2, title: 'Delivery Site', desc: 'Dispatch mode & destination', icon: Truck },
  { num: 3, title: 'Choose ComboKit', desc: 'Admin trial packs & locked qty', icon: Box },
  { num: 4, title: 'Review & Issue', desc: 'Commercial breakdown', icon: DollarSign },
];

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return '₹0';
  const rupees = Math.round(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN');
}

/**
 * Dedicated Trial Kit Card for BDE Portal:
 * Strictly locked to Admin-configured trial quantity.
 * Zero Bulk PO or Loose Pack options.
 */
function BdeTrialKitCard({ kit, isSelected, onSelectKit }) {
  const trialQty = useMemo(() => {
    return kit.trial_kit_quantity !== undefined && kit.trial_kit_quantity !== null
      ? Math.max(1, Number(kit.trial_kit_quantity))
      : 10;
  }, [kit.trial_kit_quantity]);

  const unitPricePaise =
    kit.price_paise || kit.mrp_paise || (kit.selling_price_cached ? kit.selling_price_cached * 100 : 0);
  const totalBatchPaise = unitPricePaise * trialQty;
  const gstRate = Number(kit.gst_rate ?? kit.tax_pct ?? kit.gst_pct ?? 5);
  const gstIncludedPaise = Math.round(totalBatchPaise - totalBatchPaise / (1 + gstRate / 100));

  const capacityKW = Number(kit.capacity || kit.kit_capacity_kw || 1);
  const panelCount = Math.max(2, Math.round(capacityKW * 2));
  const warrantyYears = kit.warranty_years || 12;

  const kitImage =
    kit.kit_image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80';

  return (
    <div
      onClick={() => onSelectKit(kit, trialQty)}
      className={`rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between overflow-hidden bg-white shadow-sm hover:shadow-md cursor-pointer ${
        isSelected
          ? 'border-purple-600 ring-2 ring-purple-600/20 shadow-md'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Top Header: Badge & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[180px]">
            {kit.project_type_name || kit.industry_type_name || 'Individual Home - On-Grid'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
              <Box className="w-2.5 h-2.5" /> Trial Kit
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-2.5 h-2.5" /> Authorized
            </span>
          </div>
        </div>

        {/* Kit Image Container */}
        <div className="relative mb-3.5 flex justify-center items-center bg-gradient-to-tr from-slate-50 to-slate-100 rounded-xl overflow-hidden border border-slate-100 w-full h-44 group">
          <img
            src={kitImage}
            alt={kit.name}
            className="w-full h-full p-2.5 object-contain transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80';
            }}
          />
          {isSelected && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Check className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="font-bold text-sm text-slate-900 line-clamp-1 leading-snug mb-1">
          {kit.name || kit.kit_name}
        </h4>
        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-3">
          {kit.description ||
            `${capacityKW} kW complete solar kit featuring DCR-certified solar panels, inverter and essential BOS components for residential rooftop solar installation.`}
        </p>

        {/* Specs Badges Row (kW & Warranty) */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold px-2.5 py-1 rounded-lg">
            <Zap className="w-3 h-3 text-purple-600" />
            <span>{capacityKW} kW System</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-lg">
            <Shield className="w-3 h-3 text-blue-600" />
            <span>{warrantyYears} Years</span>
          </div>
        </div>

        {/* Visual Component Breakdown Row */}
        <div className="flex items-center justify-start gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200/80 mb-3.5 overflow-x-auto select-none">
          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-2xs border border-slate-200/50">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[68px]">
              1 Inverter
            </span>
          </div>

          <span className="text-xs font-black text-slate-400 shrink-0">+</span>

          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-amber-600 shadow-2xs border border-slate-200/50">
              <Sun className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[68px]">
              {panelCount} Panels
            </span>
          </div>

          <span className="text-xs font-black text-slate-400 shrink-0">+</span>

          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-2xs border border-slate-200/50">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[68px]">
              Wiring & BOS
            </span>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="mb-3.5 pt-3 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
            Trial Unit Price
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 leading-none">
              {formatINR(unitPricePaise)}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">/ kit</span>
          </div>

          <div className="text-xs font-black text-purple-700 mt-1 flex items-center gap-1">
            <span>Trial Pack Total:</span>
            <span>{formatINR(totalBatchPaise)}</span>
            <span className="text-[10px] font-normal text-slate-400">({trialQty} kits)</span>
          </div>

          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
            (Includes {formatINR(gstIncludedPaise)} GST @ {gstRate}%)
          </span>
        </div>

        {/* Admin Configured Trial Pack Locked Box (No PO & No Loose options) */}
        <div className="mt-auto pt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 mb-1">
              <span className="flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin Trial Configuration</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-200 text-purple-800">
                Quantity Locked
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-800">
                {trialQty} Kits Pack
              </span>
              <span className="text-[10px] text-purple-600 font-medium">
                Admin Locked
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-1.5">
            {isSelected ? (
              <div className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm">
                <Check className="w-3.5 h-3.5" /> Selected ({trialQty} Kits Trial Pack)
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectKit(kit, trialQty);
                }}
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Select This Trial Pack ({trialQty} Kits)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BdeCreateTrialKitQuote() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramEpcId = searchParams.get('epc_id');
  const paramKitId = searchParams.get('combo_kit_id') || searchParams.get('kit_id');

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Selections
  const [selectedEpc, setSelectedEpc] = useState(null);
  const [selectedFranchisee, setSelectedFranchisee] = useState(null);
  const [deliveryType, setDeliveryType] = useState('epc_location');
  const [deliveryDetails, setDeliveryDetails] = useState({
    shipping_address_line1: '',
    state_name: '',
    district_name: '',
    pincode: '',
    contact_person: '',
    mobile: '',
  });

  const [selectedKit, setSelectedKit] = useState(null);
  const [quantity, setQuantity] = useState(10);

  // Data lists
  const [epcList, setEpcList] = useState([]);
  const [clusterList, setClusterList] = useState([]);
  const [epcSearch, setEpcSearch] = useState('');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState('all');
  const [selectedStateFilter, setSelectedStateFilter] = useState('all');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('all');
  const [epcViewMode, setEpcViewMode] = useState('table'); // 'table' | 'grid'
  const [epcPage, setEpcPage] = useState(1);
  const epcPageSize = 10;
  const [franchisees, setFranchisees] = useState([]);
  const [kitList, setKitList] = useState([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [kitSearch, setKitSearch] = useState('');

  // Quick Filters State & Shop Hierarchy
  const [shopHierarchy, setShopHierarchy] = useState([]);
  const [quickFilters, setQuickFilters] = useState({
    industryType: 'all',
    category: 'all',
    subCategory: 'all',
    systemType: 'all',
    projectRange: 'all',
  });

  // Pricing
  const [pricing, setPricing] = useState({
    price_per_kit_paise: 0,
    product_subtotal_paise: 0,
    warranty_charges_paise: 0,
    delivery_charges_paise: 0,
    taxable_amount_paise: 0,
    gst_rate: 5,
    gst_amount_paise: 0,
    total_amount_paise: 0,
  });

  // Fetch initial data
  const fetchEpcs = useCallback(async () => {
    try {
      const res = await api.get('/quotes/eligible-epcs');
      if (res.data?.status === 'success') {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.epcs)
          ? raw.epcs
          : Array.isArray(res.data?.epcs)
          ? res.data.epcs
          : [];
        setEpcList(list);

        if (Array.isArray(res.data?.clusters)) {
          setClusterList(res.data.clusters);
        }
      } else {
        setEpcList([]);
      }
    } catch (err) {
      console.error('Failed to load eligible EPCs:', err);
      setEpcList([]);
    }
  }, []);

  const fetchFranchisees = useCallback(async () => {
    try {
      const res = await api.get('/franchisees');
      if (res.data?.status === 'success') {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.franchisees)
          ? raw.franchisees
          : Array.isArray(res.data?.franchisees)
          ? res.data.franchisees
          : [];
        setFranchisees(list);
      } else {
        setFranchisees([]);
      }
    } catch (err) {
      console.error('Failed to load franchisees:', err);
      setFranchisees([]);
    }
  }, []);

  const fetchHierarchy = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL?.replace(/\/bde(\/v1)?$/, '') || 'http://localhost:5000/api';
      const res = await axios.get(`${apiBase}/india/v1/shop/hierarchy`);
      if (res.data?.success || res.data?.status === 'success') {
        setShopHierarchy(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load shop hierarchy:', err);
    }
  }, []);

  // Fetch Kits strictly for Trial Kits (trial_only=true)
  const fetchKits = useCallback(async (franchiseeId) => {
    setLoadingKits(true);
    try {
      const params = {
        trial_only: 'true',
        quote_type: 'trial_kit',
      };
      const fId = franchiseeId || selectedFranchisee?._id;
      if (fId) params.franchisee_id = fId;

      const res = await api.get('/quotes/eligible-kits', { params });
      if (res.data?.status === 'success') {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.kits)
          ? raw.kits
          : Array.isArray(res.data?.kits)
          ? res.data.kits
          : [];
        // Strictly filter to kits that allow trial kit
        const trialKits = list.filter((k) => k.allow_trial_kit !== false);
        setKitList(trialKits);
      } else {
        setKitList([]);
      }
    } catch (err) {
      console.error('Failed to load trial kits:', err);
      setKitList([]);
    } finally {
      setLoadingKits(false);
    }
  }, [selectedFranchisee]);

  useEffect(() => {
    fetchEpcs();
    fetchFranchisees();
    fetchKits();
    fetchHierarchy();
  }, [fetchEpcs, fetchFranchisees, fetchKits, fetchHierarchy]);

  // Auto-select EPC from URL query param if present
  useEffect(() => {
    if (paramEpcId && epcList.length > 0 && !selectedEpc) {
      const found = epcList.find((e) => (e._id || e.id) === paramEpcId);
      if (found) handleSelectEpc(found);
    }
  }, [paramEpcId, epcList, selectedEpc]);

  // Auto-select ComboKit from URL query param if present
  useEffect(() => {
    if (paramKitId && kitList.length > 0 && !selectedKit) {
      const found = kitList.find((k) => (k._id || k.id) === paramKitId);
      if (found) {
        setSelectedKit(found);
        setQuantity(Number(found.trial_kit_quantity) || 10);
      }
    }
  }, [paramKitId, kitList, selectedKit]);

  // Recalculate price
  useEffect(() => {
    if (!selectedKit) return;

    const baseUnitPaise =
      selectedKit.price_paise ||
      selectedKit.mrp_paise ||
      (selectedKit.selling_price_cached ? selectedKit.selling_price_cached * 100 : 0);
    const subtotalPaise = baseUnitPaise * quantity;

    const deliveryPaise = deliveryType === 'franchisee_warehouse' ? 0 : 250000 * quantity;
    const taxablePaise = subtotalPaise + deliveryPaise;
    const gstRate = Number(selectedKit?.gst_rate ?? selectedKit?.tax_pct ?? selectedKit?.gst_pct ?? 5);
    const gstPaise = Math.round((taxablePaise * gstRate) / 100);
    const totalPaise = taxablePaise + gstPaise;

    setPricing({
      price_per_kit_paise: baseUnitPaise,
      product_subtotal_paise: subtotalPaise,
      warranty_charges_paise: 0,
      delivery_charges_paise: deliveryPaise,
      taxable_amount_paise: taxablePaise,
      gst_rate: gstRate,
      gst_amount_paise: gstPaise,
      total_amount_paise: totalPaise,
    });
  }, [selectedKit, quantity, deliveryType]);

  const handleSelectEpc = (epc) => {
    setSelectedEpc(epc);
    const addr =
      epc.address ||
      epc.street_address ||
      epc.address_line1 ||
      (typeof epc.address === 'object' ? epc.address?.street_address : '') ||
      '';
    const state =
      epc.state_name || (typeof epc.address === 'object' ? epc.address?.state : '') || 'Gujarat';
    const dist =
      epc.district_name || (typeof epc.address === 'object' ? epc.address?.district : '') || 'Surat';
    const pin =
      epc.pincode || (typeof epc.address === 'object' ? epc.address?.pincode : '') || '395001';
    const contact = epc.contact_person || epc.name || '';
    const mobile = epc.mobile || epc.phone || epc.whatsapp || '';

    setDeliveryDetails({
      shipping_address_line1: addr || `Plot 42, GIDC Industrial Zone, ${dist}, ${state} - ${pin}`,
      state_name: state,
      district_name: dist,
      pincode: pin,
      contact_person: contact,
      mobile: mobile,
    });
  };

  const handleDeliveryModeSelect = (modeId) => {
    setDeliveryType(modeId);
    if (modeId === 'franchisee_warehouse') {
      const frAddr = selectedFranchisee?.address || {};
      setDeliveryDetails({
        shipping_address_line1:
          frAddr.line ||
          (selectedFranchisee
            ? `${selectedFranchisee.business_name} Store Depot`
            : 'Plot 101, GIDC Electronic Estate, Sachin, Surat'),
        state_name: frAddr.state || 'Gujarat',
        district_name: frAddr.city || selectedFranchisee?.district || 'Surat',
        pincode: frAddr.pincode || '394230',
        contact_person: selectedFranchisee?.business_name || 'Store Manager',
        mobile: selectedFranchisee?.mobile || '9876543210',
      });
    } else if (selectedEpc) {
      handleSelectEpc(selectedEpc);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedEpc;
      case 2:
        return (
          deliveryType === 'franchisee_warehouse' ||
          (deliveryDetails.pincode && deliveryDetails.pincode.length >= 6)
        );
      case 3:
        return !!selectedKit && quantity > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      setError('Please complete all required fields for this step.');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit Trial Kit Quote
  const handleGenerateQuote = async (isDraft = false) => {
    setError('');
    setGenerating(true);
    try {
      const payload = {
        epc_id: selectedEpc._id,
        franchisee_id: selectedFranchisee?._id || undefined,
        quote_source: selectedFranchisee ? 'bde_for_franchisee' : 'bde_direct',
        is_trial_kit: true,
        quote_type: 'trial_kit',
        quote_mode: 'trial_quote',
        trial_kit_quantity: Number(selectedKit?.trial_kit_quantity || quantity || 10),
        quantity: Number(selectedKit?.trial_kit_quantity || quantity || 10),
        delivery_type: deliveryType,
        delivery_address: deliveryDetails,
        delivery_address_snapshot: deliveryDetails,
        industry_type_id: selectedKit?.industry_type_id || undefined,
        project_type_id: selectedKit?.project_type_id || undefined,
        combo_kit_id: selectedKit._id,
        warranty_id: undefined,
        price_per_kit_paise: pricing.price_per_kit_paise,
        warranty_charges_paise: 0,
        delivery_charges_paise: pricing.delivery_charges_paise,
        taxable_amount_paise: pricing.taxable_amount_paise,
        gst_rate: pricing.gst_rate,
        gst_amount_paise: pricing.gst_amount_paise,
        total_amount_paise: pricing.total_amount_paise,
      };

      const draftRes = await api.post('/quotes', payload);
      if (draftRes.data?.status !== 'success') {
        throw new Error(draftRes.data?.message || 'Failed to create trial kit quote.');
      }

      const quoteId = draftRes.data.data._id;

      if (!isDraft) {
        const genRes = await api.post(`/quotes/${quoteId}/generate`);
        if (genRes.data?.status === 'success') {
          navigate(`/epc-quotes/${quoteId}`);
          return;
        }
      }

      navigate(`/epc-quotes/${quoteId}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create quotation.');
    } finally {
      setGenerating(false);
    }
  };

  const safeEpcList = Array.isArray(epcList) ? epcList : [];

  // 1. Available States strictly from Admin-assigned clusters
  const availableStates = useMemo(() => {
    const set = new Set();
    (clusterList || []).forEach((c) => {
      if (c.state_name) set.add(c.state_name.trim());
    });
    if (set.size === 0) {
      safeEpcList.forEach((e) => {
        if (e.state_name) set.add(e.state_name.trim());
      });
    }
    return Array.from(set).sort();
  }, [clusterList, safeEpcList]);

  // 2. Available Districts strictly from selected cluster / state
  const availableDistricts = useMemo(() => {
    const set = new Set();
    (clusterList || []).forEach((c) => {
      const matchState =
        selectedStateFilter === 'all' ||
        (c.state_name && c.state_name.trim() === selectedStateFilter.trim());
      const matchCluster =
        selectedClusterFilter === 'all' ||
        c._id === selectedClusterFilter ||
        c.cluster_name === selectedClusterFilter;

      if (matchState && matchCluster && Array.isArray(c.districts)) {
        c.districts.forEach((d) => {
          const dName = typeof d === 'string' ? d : d.name || d.district_name;
          if (dName) set.add(dName.trim());
        });
      }
    });

    if (set.size === 0) {
      safeEpcList.forEach((e) => {
        const matchState =
          selectedStateFilter === 'all' ||
          (e.state_name && e.state_name.trim() === selectedStateFilter.trim());
        const matchCluster =
          selectedClusterFilter === 'all' || e.cluster_id === selectedClusterFilter;
        if (matchState && matchCluster && e.district_name) {
          set.add(e.district_name.trim());
        }
      });
    }

    return Array.from(set).sort();
  }, [clusterList, safeEpcList, selectedStateFilter, selectedClusterFilter]);

  // 3. Filter EPCs with Active State & District Constraints
  const filteredEpcs = useMemo(() => {
    return safeEpcList.filter((epc) => {
      if (epcSearch.trim()) {
        const q = epcSearch.toLowerCase();
        const matchSearch =
          epc.name?.toLowerCase().includes(q) ||
          epc.company_name?.toLowerCase().includes(q) ||
          epc.gstin?.toLowerCase().includes(q) ||
          epc.contact_person?.toLowerCase().includes(q) ||
          epc.mobile?.includes(q) ||
          epc.email?.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      if (selectedClusterFilter !== 'all') {
        const matchedCluster = (clusterList || []).find(
          (c) => c._id === selectedClusterFilter || c.cluster_name === selectedClusterFilter
        );
        if (matchedCluster) {
          const clusterDistricts = (matchedCluster.districts || []).map((d) =>
            typeof d === 'string' ? d.toLowerCase() : (d.name || d.district_name || '').toLowerCase()
          );
          const epcDist = (epc.district_name || '').toLowerCase();
          const epcClusterId = String(epc.cluster_id || epc.assigned_cluster_id || '');
          const matchDist = clusterDistricts.includes(epcDist);
          const matchId = epcClusterId === String(matchedCluster._id);
          if (!matchDist && !matchId) return false;
        }
      }

      if (selectedStateFilter !== 'all') {
        if ((epc.state_name || '').trim() !== selectedStateFilter.trim()) {
          return false;
        }
      }

      if (selectedDistrictFilter !== 'all') {
        if ((epc.district_name || '').trim() !== selectedDistrictFilter.trim()) {
          return false;
        }
      }

      return true;
    });
  }, [safeEpcList, epcSearch, selectedClusterFilter, selectedStateFilter, selectedDistrictFilter, clusterList]);

  // Pagination for EPC Table
  const totalEpcPages = Math.max(1, Math.ceil(filteredEpcs.length / epcPageSize));
  const paginatedEpcs = useMemo(() => {
    const start = (epcPage - 1) * epcPageSize;
    return filteredEpcs.slice(start, start + epcPageSize);
  }, [filteredEpcs, epcPage, epcPageSize]);

  useEffect(() => {
    setEpcPage(1);
  }, [epcSearch, selectedClusterFilter, selectedStateFilter, selectedDistrictFilter]);

  // Hierarchical Filter Options for Trial ComboKits
  const industryTypeOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ value: 'all', label: 'All Industry Types' }];
    (shopHierarchy || []).forEach((ind) => {
      if (ind.name && !seen.has(ind.name)) {
        seen.add(ind.name);
        opts.push({ value: ind.name, label: ind.name });
      }
    });
    if (opts.length === 1 && kitList.length > 0) {
      kitList.forEach((k) => {
        if (k.industry_type_name && !seen.has(k.industry_type_name)) {
          seen.add(k.industry_type_name);
          opts.push({ value: k.industry_type_name, label: k.industry_type_name });
        }
      });
    }
    return opts;
  }, [shopHierarchy, kitList]);

  const categoryOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ value: 'all', label: 'All Categories' }];
    (shopHierarchy || []).forEach((ind) => {
      if (
        quickFilters.industryType === 'all' ||
        ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase()
      ) {
        (ind.categories || []).forEach((cat) => {
          if (cat.name && !seen.has(cat.name)) {
            seen.add(cat.name);
            opts.push({ value: cat.name, label: cat.name });
          }
        });
      }
    });
    return opts;
  }, [shopHierarchy, quickFilters.industryType]);

  const subCategoryOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ value: 'all', label: 'All Sub-Categories' }];
    (shopHierarchy || []).forEach((ind) => {
      (ind.categories || []).forEach((cat) => {
        if (
          quickFilters.category === 'all' ||
          cat.name?.toLowerCase() === quickFilters.category.toLowerCase()
        ) {
          (cat.subcategories || []).forEach((sub) => {
            if (sub.name && !seen.has(sub.name)) {
              seen.add(sub.name);
              opts.push({ value: sub.name, label: sub.name });
            }
          });
        }
      });
    });
    return opts;
  }, [shopHierarchy, quickFilters.category]);

  const systemTypeOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ value: 'all', label: 'All System Types' }];
    (shopHierarchy || []).forEach((ind) => {
      (ind.categories || []).forEach((cat) => {
        (cat.subcategories || []).forEach((sub) => {
          if (
            quickFilters.subCategory === 'all' ||
            sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase()
          ) {
            (sub.types || []).forEach((t) => {
              if (t.name && !seen.has(t.name)) {
                seen.add(t.name);
                opts.push({ value: t.name, label: t.name });
              }
            });
          }
        });
      });
    });
    return opts;
  }, [shopHierarchy, quickFilters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ value: 'all', label: 'All Project Ranges' }];
    (shopHierarchy || []).forEach((ind) => {
      (ind.categories || []).forEach((cat) => {
        (cat.subcategories || []).forEach((sub) => {
          (sub.types || []).forEach((t) => {
            (t.ranges || []).forEach((r) => {
              const label =
                r.min_value != null && r.max_value != null
                  ? `${r.min_value} - ${r.max_value} kW`
                  : r.name;
              if (label && !seen.has(label)) {
                seen.add(label);
                opts.push({ value: label, label });
              }
            });
          });
        });
      });
    });
    return opts;
  }, [shopHierarchy]);

  const handleClearMainFilters = () => {
    setQuickFilters({
      industryType: 'all',
      category: 'all',
      subCategory: 'all',
      systemType: 'all',
      projectRange: 'all',
    });
    setKitSearch('');
  };

  const filteredKits = useMemo(() => {
    return kitList.filter((kit) => {
      if (kitSearch.trim()) {
        const q = kitSearch.toLowerCase();
        const matchSearch =
          kit.name?.toLowerCase().includes(q) ||
          kit.code?.toLowerCase().includes(q) ||
          kit.brand_name?.toLowerCase().includes(q) ||
          kit.industry_type_name?.toLowerCase().includes(q) ||
          kit.project_type_name?.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      if (quickFilters.industryType !== 'all') {
        if (
          kit.industry_type_name &&
          kit.industry_type_name.toLowerCase() !== quickFilters.industryType.toLowerCase()
        ) {
          return false;
        }
      }

      if (quickFilters.category !== 'all') {
        if (
          kit.category_name &&
          kit.category_name.toLowerCase() !== quickFilters.category.toLowerCase()
        ) {
          return false;
        }
      }

      if (quickFilters.subCategory !== 'all') {
        if (
          kit.subcategory_name &&
          kit.subcategory_name.toLowerCase() !== quickFilters.subCategory.toLowerCase()
        ) {
          return false;
        }
      }

      if (quickFilters.systemType !== 'all') {
        if (
          kit.project_type_name &&
          !kit.project_type_name.toLowerCase().includes(quickFilters.systemType.toLowerCase())
        ) {
          return false;
        }
      }

      if (quickFilters.projectRange !== 'all') {
        if (
          kit.project_range_label &&
          kit.project_range_label.toLowerCase() !== quickFilters.projectRange.toLowerCase()
        ) {
          return false;
        }
      }

      return true;
    });
  }, [kitList, kitSearch, quickFilters]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/trial-kit-funnel"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Trial Kit Funnel
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              to="/epc-quotes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              EPC Quotes List
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Create Trial Kit Quotation
            </h1>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              <Box className="w-3.5 h-3.5 text-purple-600" /> Trial Kit Proposal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue official evaluation trial kit quotation strictly locked to Admin configured kit quantities.
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-400 self-start sm:self-auto">
          Step {currentStep} of 4
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Progress Steps Header */}
      <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-2xs overflow-x-auto">
        <div className="flex items-center min-w-[700px]">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;

            return (
              <React.Fragment key={s.num}>
                <div
                  onClick={() => {
                    if (isCompleted) setCurrentStep(s.num);
                  }}
                  className={`flex-1 flex items-center gap-3 p-2.5 rounded-xl transition ${
                    isCurrent
                      ? 'bg-purple-50 text-purple-900 ring-1 ring-purple-600/30 font-bold'
                      : isCompleted
                      ? 'text-slate-800 hover:bg-slate-50 cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                      isCurrent
                        ? 'bg-purple-600 text-white shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate leading-tight">{s.title}</div>
                    <div className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                      {s.desc}
                    </div>
                  </div>
                </div>

                {idx < STEPS.length - 1 && (
                  <div className="w-6 flex items-center justify-center text-slate-300 shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Step Content */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        {/* STEP 1: EPC BUYER */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Select Territory EPC Buyer</h2>
                <p className="text-xs text-slate-500">
                  Choose the approved EPC client to receive this Trial Kit quotation. Filter by Cluster, State, or District.
                </p>
              </div>

              {/* View Switcher & Counter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                  {filteredEpcs.length} of {safeEpcList.length} EPCs
                </span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-slate-600">
                  <button
                    type="button"
                    onClick={() => setEpcViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                      epcViewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                    }`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEpcViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                      epcViewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                    }`}
                    title="Cards View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Franchisee Attribution Option */}
            <div className="p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 bg-purple-50/40 border-purple-200/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-900 text-white">
                  Franchisee Attribution
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  Optional: Associate this trial quote with a local Franchisee for territory commission & warehouse pickup.
                </p>
              </div>
              <div className="w-full md:w-80">
                <select
                  value={selectedFranchisee?._id || ''}
                  onChange={(e) => {
                    const found = franchisees.find((f) => f._id === e.target.value);
                    setSelectedFranchisee(found || null);
                    fetchKits(found?._id);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">Direct SolarKits Quote (No Franchisee)</option>
                  {franchisees.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.business_name} ({f.city || f.district || 'Hub'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filters Row */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* 1. Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={epcSearch}
                    onChange={(e) => setEpcSearch(e.target.value)}
                    placeholder="Search Company, GSTIN, Contact..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                {/* 2. Cluster Filter */}
                <div className="relative">
                  <select
                    value={selectedClusterFilter}
                    onChange={(e) => {
                      setSelectedClusterFilter(e.target.value);
                      setSelectedDistrictFilter('all');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="all">All Clusters ({clusterList?.length || 0})</option>
                    {(clusterList || []).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.cluster_name || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. State Filter */}
                <div className="relative">
                  <select
                    value={selectedStateFilter}
                    onChange={(e) => {
                      setSelectedStateFilter(e.target.value);
                      setSelectedDistrictFilter('all');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="all">All States ({availableStates.length})</option>
                    {availableStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. District Filter */}
                <div className="relative">
                  <select
                    value={selectedDistrictFilter}
                    onChange={(e) => setSelectedDistrictFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="all">All Districts ({availableDistricts.length})</option>
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reset Filters */}
              {(epcSearch ||
                selectedClusterFilter !== 'all' ||
                selectedStateFilter !== 'all' ||
                selectedDistrictFilter !== 'all') && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>Filtered: {filteredEpcs.length} EPCs matched</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEpcSearch('');
                      setSelectedClusterFilter('all');
                      setSelectedStateFilter('all');
                      setSelectedDistrictFilter('all');
                    }}
                    className="text-purple-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Filters
                  </button>
                </div>
              )}
            </div>

            {/* EPC List: Table View */}
            {epcViewMode === 'table' ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3 text-center w-12">Select</th>
                        <th className="py-3 px-4">EPC Company & Trade Name</th>
                        <th className="py-3 px-4">GSTIN</th>
                        <th className="py-3 px-4">Cluster & State</th>
                        <th className="py-3 px-4">District & Pin</th>
                        <th className="py-3 px-4">Contact Person</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedEpcs.map((epc) => {
                        const isSel = selectedEpc?._id === epc._id;
                        return (
                          <tr
                            key={epc._id}
                            onClick={() => handleSelectEpc(epc)}
                            className={`cursor-pointer transition duration-150 ${
                              isSel
                                ? 'bg-purple-50/70 border-l-4 border-l-purple-600 font-medium'
                                : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <div
                                className={`w-4 h-4 rounded-full border-2 mx-auto flex items-center justify-center transition ${
                                  isSel
                                    ? 'border-purple-600 bg-purple-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-sm">
                                {epc.company_name || epc.name}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {epc.business_type || 'Registered EPC Contractor'}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">
                              {epc.gstin || '—'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">
                                {epc.cluster_name || 'No Cluster'}
                              </div>
                              <div className="text-[11px] text-slate-400">{epc.state_name || '—'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">
                                {epc.district_name || '—'}
                              </div>
                              <div className="text-[11px] text-slate-400">Pin: {epc.pincode || '—'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">
                                {epc.contact_person || '—'}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {epc.mobile || epc.phone || '—'}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectEpc(epc);
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                                  isSel
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {isSel ? 'Selected' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                {totalEpcPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
                    <span className="text-slate-500">
                      Page {epcPage} of {totalEpcPages} ({filteredEpcs.length} total)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={epcPage === 1}
                        onClick={() => setEpcPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={epcPage === totalEpcPages}
                        onClick={() => setEpcPage((p) => Math.min(totalEpcPages, p + 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Grid Cards View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedEpcs.map((epc) => {
                  const isSel = selectedEpc?._id === epc._id;
                  return (
                    <div
                      key={epc._id}
                      onClick={() => handleSelectEpc(epc)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                        isSel
                          ? 'border-purple-600 bg-purple-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                            {epc.company_name || epc.name}
                          </h4>
                          <span
                            className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                              isSel ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                          GST: {epc.gstin || '—'}
                        </div>
                        <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {epc.district_name}, {epc.state_name} - {epc.pincode}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{epc.contact_person}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{epc.mobile || epc.phone || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">
                          {epc.cluster_name || 'Assigned Territory'}
                        </span>
                        <span
                          className={`font-bold ${isSel ? 'text-purple-700' : 'text-slate-600'}`}
                        >
                          {isSel ? '✓ Selected' : 'Choose'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: DELIVERY SITE */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Step 2: Delivery Site & Logistics</h2>
              <p className="text-xs text-slate-500">
                Specify delivery destination and dispatch mode for this Trial Kit pack
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDeliveryModeSelect('epc_location')}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  deliveryType === 'epc_location'
                    ? 'border-purple-600 bg-purple-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900">EPC Partner Site Delivery</span>
                  <Truck className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-slate-500">
                  Direct door-to-door dispatch to the EPC client's registered site or warehouse.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleDeliveryModeSelect('franchisee_warehouse')}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  deliveryType === 'franchisee_warehouse'
                    ? 'border-purple-600 bg-purple-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900">
                    Franchisee Warehouse Self-Pickup
                  </span>
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-slate-500">
                  EPC client collects directly from local Franchisee Depot (Zero freight charges).
                </p>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Shipping Address Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="block text-slate-600 mb-1 font-semibold">
                    Address Line (Plot, Survey, Street) *
                  </label>
                  <input
                    type="text"
                    value={deliveryDetails.shipping_address_line1}
                    onChange={(e) =>
                      setDeliveryDetails({
                        ...deliveryDetails,
                        shipping_address_line1: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                    placeholder="Plot 42, GIDC Industrial Zone"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    District / City *
                  </label>
                  <input
                    type="text"
                    value={deliveryDetails.district_name}
                    onChange={(e) =>
                      setDeliveryDetails({ ...deliveryDetails, district_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">State *</label>
                  <input
                    type="text"
                    value={deliveryDetails.state_name}
                    onChange={(e) =>
                      setDeliveryDetails({ ...deliveryDetails, state_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Pincode *</label>
                  <input
                    type="text"
                    value={deliveryDetails.pincode}
                    onChange={(e) =>
                      setDeliveryDetails({ ...deliveryDetails, pincode: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    Site Contact Person
                  </label>
                  <input
                    type="text"
                    value={deliveryDetails.contact_person}
                    onChange={(e) =>
                      setDeliveryDetails({ ...deliveryDetails, contact_person: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CHOOSE COMBOKIT (STRICTLY TRIAL KITS & LOCKED ADMIN QUANTITY) */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Choose Authorized Trial ComboKit
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                    Strict Admin Quantities
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Showing only solar system kits configured by Admin for trial evaluation with strictly locked quantities.
                </p>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={kitSearch}
                  onChange={(e) => setKitSearch(e.target.value)}
                  placeholder="Search by trial kit, brand, kW, industry..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* Admin Enforced Trial Notice (Bulk PO & Loose Order Disabled) */}
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex items-start gap-2.5 text-xs text-purple-950">
              <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Admin Configuration Rule:</strong> Trial kit quantities for these products are strictly locked to the quantity configured in the Admin Portal (e.g. 10 kits). Arbitrary Bulk PO and Loose pack quantity options are disabled for Trial Kit proposals.
              </div>
            </div>

            {/* Quick Filters Component */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-800">Quick Filters</h3>
                </div>
                <button
                  type="button"
                  onClick={handleClearMainFilters}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-800 hover:underline transition cursor-pointer"
                >
                  Clear Main
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Industry Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Industry Type
                  </label>
                  <div className="relative">
                    <select
                      value={quickFilters.industryType}
                      onChange={(e) =>
                        setQuickFilters((prev) => ({
                          ...prev,
                          industryType: e.target.value,
                          category: 'all',
                          subCategory: 'all',
                          systemType: 'all',
                          projectRange: 'all',
                        }))
                      }
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 pr-8 cursor-pointer"
                    >
                      {industryTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
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
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 pr-8 cursor-pointer"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Sub-Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Sub-Category
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
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 pr-8 cursor-pointer"
                    >
                      {subCategoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* 4. System Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
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
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 pr-8 cursor-pointer"
                    >
                      {systemTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* 5. Project Range */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
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
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 pr-8 cursor-pointer"
                    >
                      {projectRangeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Trial Kit Grid */}
            {loadingKits ? (
              <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span>Loading authorized Trial ComboKits...</span>
              </div>
            ) : filteredKits.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Box className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No authorized Trial ComboKits found</p>
                <p className="mt-1">
                  No combo kits are currently marked as available for trial kit evaluation by Admin configuration.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredKits.map((kit) => (
                  <BdeTrialKitCard
                    key={kit._id}
                    kit={kit}
                    isSelected={selectedKit?._id === kit._id}
                    onSelectKit={(k, q) => {
                      setSelectedKit(k);
                      setQuantity(q);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: REVIEW & ISSUE */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Trial Quotation Summary & Pricing
                </h2>
                <p className="text-xs text-slate-500">
                  Confirm evaluation terms before issuing formal Trial Kit quotation
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 self-start sm:self-auto">
                <Box className="w-3.5 h-3.5 text-purple-600" /> Trial Kit Proposal ({quantity} Kits)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">EPC Client</span>
                <div className="font-bold text-slate-900 text-sm mt-1">
                  {selectedEpc?.company_name || selectedEpc?.name}
                </div>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  <div>GST: {selectedEpc?.gstin || '—'}</div>
                  <div>Contact: {selectedEpc?.contact_person}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Attribution</span>
                <div className="font-bold text-slate-900 text-sm mt-1">
                  {selectedFranchisee ? selectedFranchisee.business_name : 'SolarKits Direct'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {selectedFranchisee ? 'Franchisee Territory Channel' : 'BDE Direct Deal'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Destination</span>
                <div className="font-bold text-slate-900 text-sm mt-1">
                  {deliveryType === 'franchisee_warehouse'
                    ? 'Franchisee Store Depot (Self Pickup)'
                    : 'EPC Registered Site Delivery'}
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">
                  {deliveryDetails.shipping_address_line1}, {deliveryDetails.district_name}
                </div>
              </div>
            </div>

            {/* Selected Kit & Commercial Summary */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Selected Trial Kit</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedKit?.name || selectedKit?.kit_name}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-purple-700 text-white font-extrabold text-xs">
                  {quantity} Kits (Admin Locked)
                </span>
              </div>

              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Unit Price per Kit (excl. GST)</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatINR(pricing.price_per_kit_paise)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Product Subtotal ({quantity} kits)</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatINR(pricing.product_subtotal_paise)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Delivery Charges</span>
                  <span className="font-mono font-bold text-slate-800">
                    {pricing.delivery_charges_paise === 0
                      ? 'FREE (Warehouse Pickup)'
                      : formatINR(pricing.delivery_charges_paise)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-700 font-semibold">
                  <span>Taxable Amount</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatINR(pricing.taxable_amount_paise)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>GST ({pricing.gst_rate}%)</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatINR(pricing.gst_amount_paise)}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                  <span className="text-sm font-black text-slate-900">Total Proposal Value (incl. GST)</span>
                  <span className="text-xl font-black text-purple-700 font-mono">
                    {formatINR(pricing.total_amount_paise)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <Link
              to="/trial-kit-funnel"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
          )}

          <div className="flex items-center gap-2">
            {currentStep === 4 ? (
              <>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleGenerateQuote(true)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleGenerateQuote(false)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  <Check className="w-4 h-4" /> Generate Official Trial Quotation
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
