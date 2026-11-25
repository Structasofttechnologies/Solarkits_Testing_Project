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
} from 'lucide-react';
import api from '../services/api';
<<<<<<< HEAD
=======
import StoreKitCard from '../components/StoreKitCard';
>>>>>>> origin/main

const STEPS = [
  { num: 1, title: 'EPC Buyer', desc: 'Client & Franchisee attribution', icon: Users },
  { num: 2, title: 'Delivery Site', desc: 'Dispatch mode & destination', icon: Truck },
  { num: 3, title: 'Choose ComboKit', desc: 'Authorized solar kit & quantity', icon: Box },
  { num: 4, title: 'Warranty Option', desc: 'Coverage & protection', icon: ShieldCheck },
  { num: 5, title: 'Review & Issue', desc: 'Commercial breakdown', icon: DollarSign },
];

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return '₹0';
  const rupees = Math.round(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN');
}

export default function BdeCreateEpcQuote() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
<<<<<<< HEAD
  const initialQuoteType = searchParams.get('quote_type') === 'trial_kit' || searchParams.get('is_trial') === 'true' ? 'trial_kit' : 'standard';
  const paramEpcId = searchParams.get('epc_id');
  const paramKitId = searchParams.get('combo_kit_id') || searchParams.get('kit_id');

  const [quoteType, setQuoteType] = useState(initialQuoteType); // 'standard' | 'trial_kit'
=======
  const paramEpcId = searchParams.get('epc_id');
  const paramKitId = searchParams.get('combo_kit_id') || searchParams.get('kit_id');

  // Commercial Standard quote only (Trial Kit quotes are handled exclusively on /trial-kit-quotes/create)
  const [quoteType, setQuoteType] = useState('standard');
  const [selectedQuoteMode, setSelectedQuoteMode] = useState('loose_quote');
  const [backendQuotePermissions, setBackendQuotePermissions] = useState(null);
  const effectiveQuotePermissions = useMemo(() => {
    if (Array.isArray(backendQuotePermissions) && backendQuotePermissions.length > 0) {
      return backendQuotePermissions.filter((p) => p !== 'trial_quote');
    }
    return ['po_quote', 'loose_quote'];
  }, [backendQuotePermissions]);

  // If accessed with trial_kit param, gracefully redirect to the dedicated trial kit quotation page
  useEffect(() => {
    if (searchParams.get('quote_type') === 'trial_kit' || searchParams.get('is_trial') === 'true') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('quote_type');
      newParams.delete('is_trial');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      navigate(`/trial-kit-quotes/create${queryStr}`, { replace: true });
    }
  }, [searchParams, navigate]);
>>>>>>> origin/main
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

  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedKit, setSelectedKit] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedWarranty, setSelectedWarranty] = useState(null);

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
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState('all');
  const [warrantyList, setWarrantyList] = useState([]);

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

  const fetchKits = useCallback(async (franchiseeId) => {
    setLoadingKits(true);
    try {
      const params = {};
      const fId = franchiseeId || selectedFranchisee?._id;
      if (fId) params.franchisee_id = fId;

      const res = await api.get('/quotes/eligible-kits', { params });
      if (res.data?.status === 'success') {
<<<<<<< HEAD
=======
        if (Array.isArray(res.data?.quote_permissions)) {
          setBackendQuotePermissions(res.data.quote_permissions);
        }
>>>>>>> origin/main
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.kits)
            ? raw.kits
            : Array.isArray(res.data?.kits)
              ? res.data.kits
              : [];
        setKitList(list);
      } else {
        setKitList([]);
      }
    } catch (err) {
      console.error('Failed to load kits:', err);
      setKitList([]);
    } finally {
      setLoadingKits(false);
    }
  }, [selectedFranchisee]);

  const fetchWarranties = useCallback(async (kitId) => {
    try {
      const params = {};
      if (kitId) params.combo_kit_id = kitId;
      const res = await api.get('/quotes/eligible-warranties', { params });
      if (res.data?.status === 'success') {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.warranties)
            ? raw.warranties
            : Array.isArray(res.data?.warranties)
              ? res.data.warranties
              : [];
        setWarrantyList(list);
      } else {
        setWarrantyList([]);
      }
    } catch (err) {
      console.error('Failed to load warranties:', err);
      setWarrantyList([]);
    }
  }, []);

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
<<<<<<< HEAD
        if (quoteType === 'trial_kit') {
          setQuantity(Number(found.trial_kit_quantity) || 10);
        }
      }
    }
  }, [paramKitId, kitList, selectedKit, quoteType]);
=======
      }
    }
  }, [paramKitId, kitList, selectedKit]);
>>>>>>> origin/main

  // Recalculate price
  useEffect(() => {
    if (!selectedKit) return;

    const baseUnitPaise = selectedKit.price_paise || selectedKit.mrp_paise || (selectedKit.selling_price_cached ? selectedKit.selling_price_cached * 100 : 0);
    const subtotalPaise = baseUnitPaise * quantity;

    let warrantyPaise = 0;
    if (selectedWarranty) {
      if (selectedWarranty.pricing_mode === 'percentage' && selectedWarranty.price_pct) {
        warrantyPaise = Math.round((subtotalPaise * selectedWarranty.price_pct) / 100);
      } else if (selectedWarranty.price_per_kit_paise) {
        warrantyPaise = selectedWarranty.price_per_kit_paise * quantity;
      }
    }

    const deliveryPaise = deliveryType === 'franchisee_warehouse' ? 0 : 250000 * quantity;
    const taxablePaise = subtotalPaise + warrantyPaise + deliveryPaise;
    const gstRate = Number(selectedKit?.gst_rate ?? selectedKit?.tax_pct ?? selectedKit?.gst_pct ?? 5);
    const gstPaise = Math.round((taxablePaise * gstRate) / 100);
    const totalPaise = taxablePaise + gstPaise;

    setPricing({
      price_per_kit_paise: baseUnitPaise,
      product_subtotal_paise: subtotalPaise,
      warranty_charges_paise: warrantyPaise,
      delivery_charges_paise: deliveryPaise,
      taxable_amount_paise: taxablePaise,
      gst_rate: gstRate,
      gst_amount_paise: gstPaise,
      total_amount_paise: totalPaise,
    });
  }, [selectedKit, quantity, selectedWarranty, deliveryType]);

  const handleSelectEpc = (epc) => {
    setSelectedEpc(epc);
    const addr = epc.address || epc.street_address || epc.address_line1 || (typeof epc.address === 'object' ? epc.address?.street_address : '') || '';
    const state = epc.state_name || (typeof epc.address === 'object' ? epc.address?.state : '') || 'Gujarat';
    const dist = epc.district_name || (typeof epc.address === 'object' ? epc.address?.district : '') || 'Surat';
    const pin = epc.pincode || (typeof epc.address === 'object' ? epc.address?.pincode : '') || '395001';
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
        shipping_address_line1: frAddr.line || (selectedFranchisee ? `${selectedFranchisee.business_name} Store Depot` : 'Plot 101, GIDC Electronic Estate, Sachin, Surat'),
        state_name: 'Gujarat',
        district_name: frAddr.city || selectedFranchisee?.district || 'Surat',
        pincode: frAddr.pincode || '394230',
        contact_person: selectedFranchisee?.business_name || 'Store Incharge',
        mobile: selectedFranchisee?.mobile || '',
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
        return deliveryType === 'franchisee_warehouse' || (deliveryDetails.pincode && deliveryDetails.pincode.length >= 6);
      case 3:
        return !!selectedKit;
      case 4:
        return quantity >= 1;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    setError('');
    if (!canProceed()) {
      setError('Please complete all required fields for this step.');
      return;
    }
    if (currentStep === 3 && selectedKit) fetchWarranties(selectedKit._id);
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit
  const handleGenerateQuote = async (isDraft = false) => {
    setError('');
    setGenerating(true);
    try {
      const payload = {
        epc_id: selectedEpc._id,
        franchisee_id: selectedFranchisee?._id || undefined,
        quote_source: selectedFranchisee ? 'bde_for_franchisee' : 'bde_direct',
<<<<<<< HEAD
        is_trial_kit: quoteType === 'trial_kit',
        quote_type: quoteType,
        trial_kit_quantity: quoteType === 'trial_kit' ? Number(selectedKit?.trial_kit_quantity || quantity || 10) : undefined,
=======
        is_trial_kit: false,
        quote_type: 'standard',
        quote_mode: selectedQuoteMode || (quantity >= 200 ? 'po_quote' : 'loose_quote'),
        trial_kit_quantity: undefined,
>>>>>>> origin/main
        delivery_type: deliveryType,
        delivery_address: deliveryDetails,
        delivery_address_snapshot: deliveryDetails,
        industry_type_id: selectedKit?.industry_type_id || undefined,
        project_type_id: selectedKit?.project_type_id || undefined,
        combo_kit_id: selectedKit._id,
        quantity: Number(quantity),
        warranty_id: selectedWarranty?._id || undefined,
        price_per_kit_paise: pricing.price_per_kit_paise,
        warranty_charges_paise: pricing.warranty_charges_paise,
        delivery_charges_paise: pricing.delivery_charges_paise,
        taxable_amount_paise: pricing.taxable_amount_paise,
        gst_rate: pricing.gst_rate,
        gst_amount_paise: pricing.gst_amount_paise,
        total_amount_paise: pricing.total_amount_paise,
      };

      const draftRes = await api.post('/quotes', payload);
      if (draftRes.data?.status !== 'success') {
        throw new Error(draftRes.data?.message || 'Failed to create quote.');
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

  // 1. Available States strictly from Admin-assigned clusters (zero outside states)
  const availableStates = useMemo(() => {
    const set = new Set();
    (clusterList || []).forEach((c) => {
      if (c.state_name) set.add(c.state_name.trim());
    });
    // Fallback only if no clusters assigned
    if (set.size === 0) {
      safeEpcList.forEach((e) => {
        if (e.state_name) set.add(e.state_name.trim());
      });
    }
    return Array.from(set).filter(Boolean).sort();
  }, [safeEpcList, clusterList]);

  // 2. Available Clusters strictly assigned to this BDE by Admin
  const availableClusters = useMemo(() => {
    let list = clusterList || [];
    if (selectedStateFilter !== 'all') {
      list = list.filter((c) => c.state_name?.trim().toLowerCase() === selectedStateFilter.trim().toLowerCase());
    }
    return list;
  }, [clusterList, selectedStateFilter]);

  // 3. Available Districts strictly belonging to Admin-assigned clusters
  const availableDistricts = useMemo(() => {
    const set = new Set();

    if (selectedClusterFilter !== 'all') {
      const clu = (clusterList || []).find(
        (c) => c.cluster_name === selectedClusterFilter || String(c.id) === String(selectedClusterFilter)
      );
      if (clu && Array.isArray(clu.district_names)) {
        clu.district_names.forEach((d) => {
          const val = typeof d === 'string' ? d : d?.name || '';
          if (val) set.add(val.trim());
        });
      }
    } else if (selectedStateFilter !== 'all') {
      (clusterList || []).forEach((c) => {
        if (c.state_name?.trim().toLowerCase() === selectedStateFilter.trim().toLowerCase() && Array.isArray(c.district_names)) {
          c.district_names.forEach((d) => {
            const val = typeof d === 'string' ? d : d?.name || '';
            if (val) set.add(val.trim());
          });
        }
      });
    } else {
      (clusterList || []).forEach((c) => {
        if (Array.isArray(c.district_names)) {
          c.district_names.forEach((d) => {
            const val = typeof d === 'string' ? d : d?.name || '';
            if (val) set.add(val.trim());
          });
        }
      });
      if (set.size === 0) {
        safeEpcList.forEach((e) => {
          if (e.district_name) set.add(e.district_name.trim());
        });
      }
    }

    return Array.from(set).filter(Boolean).sort();
  }, [clusterList, safeEpcList, selectedClusterFilter, selectedStateFilter]);

  // Handlers for filter cascading
  const handleClusterFilterChange = (clusterVal) => {
    setSelectedClusterFilter(clusterVal);
    setEpcPage(1);
    if (clusterVal !== 'all') {
      const clu = (clusterList || []).find(
        (c) => c.cluster_name === clusterVal || String(c.id) === String(clusterVal)
      );
      if (clu && clu.state_name) {
        setSelectedStateFilter(clu.state_name);
      }
      setSelectedDistrictFilter('all');
    }
  };

  const handleStateFilterChange = (stateVal) => {
    setSelectedStateFilter(stateVal);
    setEpcPage(1);
    if (stateVal === 'all') {
      setSelectedClusterFilter('all');
    } else {
      const currentClu = (clusterList || []).find(
        (c) => c.cluster_name === selectedClusterFilter || String(c.id) === String(selectedClusterFilter)
      );
      if (currentClu && currentClu.state_name?.trim().toLowerCase() !== stateVal.trim().toLowerCase()) {
        setSelectedClusterFilter('all');
      }
    }
    setSelectedDistrictFilter('all');
  };

  const handleDistrictFilterChange = (districtVal) => {
    setSelectedDistrictFilter(districtVal);
    setEpcPage(1);
  };

  const handleResetEpcFilters = () => {
    setEpcSearch('');
    setSelectedClusterFilter('all');
    setSelectedStateFilter('all');
    setSelectedDistrictFilter('all');
    setEpcPage(1);
  };

  // Filtered EPCs
  const filteredEpcs = useMemo(() => {
    return safeEpcList.filter((epc) => {
      if (!epc) return false;

      // 1. Search Query
      const q = (epcSearch || '').trim().toLowerCase();
      if (q) {
        const company = (epc.company_name || epc.name || epc.gstin_legal_name || epc.gstin_trade_name || '').toLowerCase();
        const contact = (epc.contact_person || epc.name || '').toLowerCase();
        const gstin = (epc.gstin || '').toLowerCase();
        const mobile = (epc.mobile || epc.phone || epc.whatsapp || '').toLowerCase();
        const district = (epc.district_name || '').toLowerCase();
        const state = (epc.state_name || '').toLowerCase();
        const cluster = (epc.cluster_name || '').toLowerCase();

        const matches =
          company.includes(q) ||
          contact.includes(q) ||
          gstin.includes(q) ||
          mobile.includes(q) ||
          district.includes(q) ||
          state.includes(q) ||
          cluster.includes(q);

        if (!matches) return false;
      }

      // 2. Cluster Filter
      if (selectedClusterFilter !== 'all') {
        const clu = (clusterList || []).find(
          (c) => c.cluster_name === selectedClusterFilter || String(c.id) === String(selectedClusterFilter)
        );
        if (clu) {
          const directMatch =
            (epc.cluster_name && epc.cluster_name.toLowerCase() === clu.cluster_name.toLowerCase()) ||
            String(epc.cluster_id) === String(clu.id);
          const districtMatch =
            Array.isArray(clu.district_names) &&
            clu.district_names.some(
              (d) =>
                (typeof d === 'string' ? d : d?.name || '').trim().toLowerCase() ===
                (epc.district_name || '').trim().toLowerCase()
            );
          if (!directMatch && !districtMatch) return false;
        }
      }

      // 3. State Filter
      if (selectedStateFilter !== 'all') {
        if ((epc.state_name || '').trim().toLowerCase() !== selectedStateFilter.trim().toLowerCase()) {
          return false;
        }
      }

      // 4. District Filter
      if (selectedDistrictFilter !== 'all') {
        if ((epc.district_name || '').trim().toLowerCase() !== selectedDistrictFilter.trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [safeEpcList, epcSearch, selectedClusterFilter, selectedStateFilter, selectedDistrictFilter, clusterList]);

  // Pagination for EPC table
  const totalEpcPages = Math.ceil(filteredEpcs.length / epcPageSize) || 1;
  const paginatedEpcs = useMemo(() => {
    const start = (epcPage - 1) * epcPageSize;
    return filteredEpcs.slice(start, start + epcPageSize);
  }, [filteredEpcs, epcPage, epcPageSize]);

  const safeKitList = Array.isArray(kitList) ? kitList : [];

  // Cascading Quick Filter Options derived from shopHierarchy & loaded kits with live counts
  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const getCount = (name, id) => {
      const targetName = (name || "").toLowerCase();
      const targetId = id ? String(id) : null;
      return safeKitList.filter((k) => {
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

    safeKitList.forEach((kit) => {
      const name = kit.industry_type_name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const count = getCount(name, kit.industry_type_id);
        list.push({ value: name, label: `${name} (${count})`, rawLabel: name, id: kit.industry_type_id, count });
      }
    });

    return [{ value: 'all', label: `All Industry Types (${safeKitList.length})`, count: safeKitList.length }, ...list];
  }, [shopHierarchy, safeKitList]);

  const categoryOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // Kits matching current industry filter
    const kitsInCurrentIndustry = safeKitList.filter((k) => {
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

    safeKitList.forEach((kit) => {
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
  }, [shopHierarchy, safeKitList, quickFilters.industryType]);

  const subCategoryOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // Kits matching current industry and category filter
    const kitsInCurrentCat = safeKitList.filter((k) => {
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

    safeKitList.forEach((kit) => {
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
  }, [shopHierarchy, safeKitList, quickFilters.industryType, quickFilters.category]);

  const systemTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // Kits matching current industry, category, and subcategory filter
    const kitsInCurrentSub = safeKitList.filter((k) => {
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
        const sys = (k.project_type_name || k.system_type || "").toLowerCase();
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

    safeKitList.forEach((kit) => {
      const indOk =
        quickFilters.industryType === 'all' ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase();
      const catOk =
        quickFilters.category === 'all' ||
        kit.category_name?.toLowerCase() === quickFilters.category.toLowerCase();
      const subOk =
        quickFilters.subCategory === 'all' ||
        kit.subcategory_name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
      if (indOk && catOk && subOk && kit.project_type_name) {
        const cleanType = kit.project_type_name.includes('-')
          ? kit.project_type_name.split('-').pop().trim()
          : kit.project_type_name.trim();
        if (cleanType && !seen.has(cleanType.toLowerCase())) {
          seen.add(cleanType.toLowerCase());
          const count = getCount(cleanType);
          list.push({ value: cleanType, label: `${cleanType} (${count})`, rawLabel: cleanType, id: kit.project_type_id, count });
        }
      }
    });

    return [{ value: 'all', label: `All System Types (${kitsInCurrentSub.length})`, count: kitsInCurrentSub.length }, ...list];
  }, [shopHierarchy, safeKitList, quickFilters.industryType, quickFilters.category, quickFilters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // Kits matching current industry, category, subcategory, and systemType
    const kitsInCurrentSys = safeKitList.filter((k) => {
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
        const kSys = (k.project_type_name || k.system_type || "").toLowerCase();
        if (kSys !== sysVal && !kSys.includes(sysVal) && !sysVal.includes(kSys)) return false;
      }
      return true;
    });

    const getCount = (label, minKw, maxKw) => {
      const targetLabel = (label || "").toLowerCase();
      return kitsInCurrentSys.filter((k) => {
        const kLabel = (k.project_range_label || "").toLowerCase();
        if (kLabel && (kLabel === targetLabel || kLabel.includes(targetLabel))) return true;
        const cap = Number(k.capacity || k.capacity_kw);
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

    safeKitList.forEach((kit) => {
      const label = kit.project_range_label || (kit.capacity ? `${kit.capacity} kW System` : null);
      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        const count = getCount(label, kit.min_kw, kit.max_kw);
        list.push({ value: label, label: `${label} (${count})`, rawLabel: label, id: kit.project_range_id, min: kit.min_kw, max: kit.max_kw, count });
      }
    });

    return [{ value: 'all', label: `All Project Ranges (${kitsInCurrentSys.length})`, count: kitsInCurrentSys.length }, ...list];
  }, [shopHierarchy, safeKitList, quickFilters.industryType, quickFilters.category, quickFilters.subCategory, quickFilters.systemType]);

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

  const filteredKits = safeKitList.filter((k) => {
    if (!k) return false;

<<<<<<< HEAD
    // Trial Kit Proposal mode: only show kits authorized by Admin for trial
    if (quoteType === 'trial_kit' && !k.allow_trial_kit) {
      return false;
    }

=======
>>>>>>> origin/main
    // 1. Industry filter
    if (quickFilters.industryType !== 'all') {
      const indVal = quickFilters.industryType.toLowerCase();
      const kInd = (k.industry_type_name || '').toLowerCase();
      const kIndId = String(k.industry_type_id || '');
      if (kInd !== indVal && kIndId !== indVal && !kInd.includes(indVal)) {
        return false;
      }
    }

    // 2. Category filter
    if (quickFilters.category !== 'all') {
      const catVal = quickFilters.category.toLowerCase();
      const kCat = (k.category_name || '').toLowerCase();
      const kCatId = String(k.category_id || '');
      if (kCat !== catVal && kCatId !== catVal && !kCat.includes(catVal)) {
        return false;
      }
    }

    // 3. Sub Category filter
    if (quickFilters.subCategory !== 'all') {
      const subVal = quickFilters.subCategory.toLowerCase();
      const kSub = (k.subcategory_name || '').toLowerCase();
      const kSubId = String(k.subcategory_id || '');
      if (kSub !== subVal && kSubId !== subVal && !kSub.includes(subVal)) {
        return false;
      }
    }

    // 4. System Type filter
    if (quickFilters.systemType !== 'all') {
      const sysVal = quickFilters.systemType.toLowerCase();
      const kSys = (k.project_type_name || '').toLowerCase();
      const kSysId = String(k.project_type_id || '');
      if (kSys !== sysVal && kSysId !== sysVal && !kSys.includes(sysVal)) {
        return false;
      }
    }

    // 5. Project Range filter
    if (quickFilters.projectRange !== 'all') {
      const rangeVal = quickFilters.projectRange.toLowerCase();
      const kRange = (k.project_range_label || '').toLowerCase();
      const kRangeId = String(k.project_range_id || '');
      const rangeObj = projectRangeOptions.find((o) => o.value === quickFilters.projectRange);
      if (rangeObj && rangeObj.min != null && rangeObj.max != null) {
        const cap = Number(k.capacity || 0);
        if (cap < rangeObj.min || cap > rangeObj.max) {
          return false;
        }
      } else if (kRange !== rangeVal && kRangeId !== rangeVal && !kRange.includes(rangeVal)) {
        return false;
      }
    }

    // 6. Search query
    const q = (kitSearch || '').toLowerCase();
    if (!q) return true;
    const name = k.name || k.kit_name || '';
    const code = k.code || k.kit_code || '';
    const cap = (k.capacity ?? k.kit_capacity_kw ?? '').toString();
    const ind = (k.industry_type_name || '').toLowerCase();
    const proj = (k.project_type_name || '').toLowerCase();
    const brand = (k.brand_name || '').toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q) ||
      cap.includes(q) ||
      ind.includes(q) ||
      proj.includes(q) ||
      brand.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/epc-quotes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quotations
        </Link>
        <span className="text-xs text-slate-400 font-medium">
          Step {currentStep} of {STEPS.length}
        </span>
      </div>

      {/* Stepper Progress */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isDone = s.num < currentStep;
            const isCurr = s.num === currentStep;

            return (
              <div
                key={s.num}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition ${isCurr
                  ? 'bg-indigo-50 text-indigo-700'
                  : isDone
                    ? 'text-emerald-600'
                    : 'text-slate-400 opacity-60'
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs mb-1.5 transition ${isCurr
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                    }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-[11px] font-bold truncate max-w-full">{s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        {/* STEP 1: SELECT EPC + FRANCHISEE */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              {/* Header with Title & View Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span>Select Territory EPC Buyer</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose the approved EPC client to receive this quotation. Filter by Cluster, State, or District.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEpcViewMode('table')}
                      title="Table View"
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${epcViewMode === 'table'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEpcViewMode('grid')}
                      title="Grid Cards View"
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${epcViewMode === 'grid'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>
                  </div>

                  {/* Active Count Badge */}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {filteredEpcs.length} of {safeEpcList.length} EPCs
                  </span>
                </div>
              </div>

              {/* Cascading Filter Bar */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* 1. Keyword Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={epcSearch}
                      onChange={(e) => {
                        setEpcSearch(e.target.value);
                        setEpcPage(1);
                      }}
                      placeholder="Search Company, GSTIN, Contact..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    {epcSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setEpcSearch('');
                          setEpcPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* 2. Cluster Filter */}
                  <div className="relative">
                    <select
                      value={selectedClusterFilter}
                      onChange={(e) => handleClusterFilterChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="all">🌐 All Clusters</option>
                      {availableClusters.map((c) => (
                        <option key={c.id || c.cluster_code || c.cluster_name} value={c.cluster_name}>
                          📍 {c.cluster_name} {c.state_name ? `(${c.state_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. State Filter */}
                  <div className="relative">
                    <select
                      value={selectedStateFilter}
                      onChange={(e) => handleStateFilterChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="all">🗺️ All States</option>
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
                      onChange={(e) => handleDistrictFilterChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="all">🏙️ All Districts</option>
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filter Meta & Reset */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-600">Active Filters:</span>
                    {selectedClusterFilter !== 'all' && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100/90 text-purple-700 font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {selectedClusterFilter}
                      </span>
                    )}
                    {selectedStateFilter !== 'all' && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-700 font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {selectedStateFilter}
                      </span>
                    )}
                    {selectedDistrictFilter !== 'all' && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100/90 text-blue-700 font-bold flex items-center gap-1">
                        🏙️ {selectedDistrictFilter}
                      </span>
                    )}
                    {epcSearch && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-800 font-bold flex items-center gap-1">
                        🔍 "{epcSearch}"
                      </span>
                    )}
                    {selectedClusterFilter === 'all' && selectedStateFilter === 'all' && selectedDistrictFilter === 'all' && !epcSearch && (
                      <span className="text-slate-400 italic">None (showing all available territory EPCs)</span>
                    )}
                  </div>

                  {(selectedClusterFilter !== 'all' || selectedStateFilter !== 'all' || selectedDistrictFilter !== 'all' || epcSearch) && (
                    <button
                      type="button"
                      onClick={handleResetEpcFilters}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Selected EPC Confirmation Preview Card */}
              {selectedEpc && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-indigo-50/90 border-2 border-indigo-500/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          ✓ Active Quotation Recipient
                        </span>
                        {selectedEpc.cluster_name && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {selectedEpc.cluster_name}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Territory Verified
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mt-0.5">
                        {selectedEpc.company_name || selectedEpc.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                        <span>GSTIN: <strong className="font-mono text-slate-800">{selectedEpc.gstin || '—'}</strong></span>
                        <span>•</span>
                        <span>Contact: <strong>{selectedEpc.contact_person || selectedEpc.name || '—'}</strong> ({selectedEpc.mobile || selectedEpc.phone || selectedEpc.whatsapp || '—'})</span>
                        <span>•</span>
                        <span>Location: <strong>{selectedEpc.district_name || 'District'}, {selectedEpc.state_name || 'State'} - {selectedEpc.pincode || '—'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedEpc(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              {/* Main Content: Table or Grid */}
              {filteredEpcs.length > 0 ? (
                epcViewMode === 'table' ? (
                  /* ── TABLE VIEW (DEFAULT) ── */
                  <div className="mt-4 space-y-3">
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50/90 text-slate-700 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3 w-12 text-center">Select</th>
                            <th className="py-3 px-4">EPC Company & Trade Name</th>
                            <th className="py-3 px-4">GSTIN</th>
                            <th className="py-3 px-4">Cluster & State</th>
                            <th className="py-3 px-4">District & Pin</th>
                            <th className="py-3 px-4">Contact Person</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paginatedEpcs.map((epc) => {
                            const isSel = selectedEpc?._id === epc._id;
                            return (
                              <tr
                                key={epc._id}
                                onClick={() => handleSelectEpc(epc)}
                                className={`cursor-pointer transition duration-150 ${isSel
                                  ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600 font-medium'
                                  : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                                  }`}
                              >
                                {/* Radio Indicator */}
                                <td className="py-3 px-3 text-center">
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 mx-auto flex items-center justify-center transition ${isSel
                                      ? 'border-indigo-600 bg-indigo-600 text-white'
                                      : 'border-slate-300 bg-white'
                                      }`}
                                  >
                                    {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </div>
                                </td>

                                {/* EPC Company */}
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 text-sm">
                                    {epc.company_name || epc.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {epc.gstin_legal_name && epc.gstin_legal_name !== epc.company_name
                                      ? epc.gstin_legal_name
                                      : 'Registered EPC Contractor'}
                                  </div>
                                  <div className="mt-1">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                      <CheckCircle2 className="w-3 h-3" /> Territory Verified
                                    </span>
                                  </div>
                                </td>

                                {/* GSTIN */}
                                <td className="py-3 px-4">
                                  <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded text-xs">
                                    {epc.gstin || '—'}
                                  </span>
                                </td>

                                {/* Cluster & State */}
                                <td className="py-3 px-4">
                                  <div className="space-y-1">
                                    {epc.cluster_name ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                                        <Layers className="w-3 h-3" /> {epc.cluster_name}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">No Cluster</span>
                                    )}
                                    <div className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-emerald-600" />
                                      <span>{epc.state_name || 'Gujarat'}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* District & Pin */}
                                <td className="py-3 px-4">
                                  <div className="font-medium text-slate-900">{epc.district_name || '—'}</div>
                                  <div className="text-[10px] text-slate-500">Pin: {epc.pincode || '—'}</div>
                                </td>

                                {/* Contact Person */}
                                <td className="py-3 px-4">
                                  <div className="font-medium text-slate-800 flex items-center gap-1.5">
                                    <Users className="w-3 h-3 text-slate-400" />
                                    <span>{epc.contact_person || epc.name || '—'}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{epc.mobile || epc.phone || epc.whatsapp || '—'}</span>
                                  </div>
                                </td>

                                {/* Action */}
                                <td className="py-3 px-4 text-right">
                                  {isSel ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
                                      <Check className="w-3.5 h-3.5" /> Selected
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/50 text-slate-700 font-semibold text-xs transition"
                                    >
                                      Select
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {filteredEpcs.length > epcPageSize && (
                      <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-2 text-xs text-slate-500 gap-2">
                        <div>
                          Showing <span className="font-bold text-slate-800">{(epcPage - 1) * epcPageSize + 1}</span> to{' '}
                          <span className="font-bold text-slate-800">
                            {Math.min(epcPage * epcPageSize, filteredEpcs.length)}
                          </span>{' '}
                          of <span className="font-bold text-slate-800">{filteredEpcs.length}</span> EPC buyers
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={epcPage === 1}
                            onClick={() => setEpcPage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                          </button>
                          <span className="px-3 py-1 font-semibold text-slate-700">
                            Page {epcPage} of {totalEpcPages}
                          </span>
                          <button
                            type="button"
                            disabled={epcPage >= totalEpcPages}
                            onClick={() => setEpcPage((p) => Math.min(totalEpcPages, p + 1))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── CARDS GRID VIEW ── */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {filteredEpcs.map((epc) => {
                      const isSel = selectedEpc?._id === epc._id;
                      return (
                        <div
                          key={epc._id}
                          onClick={() => handleSelectEpc(epc)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${isSel
                            ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                                {epc.company_name || epc.name}
                              </h4>
                              {isSel && (
                                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>

                            <div className="text-[11px] font-mono text-slate-500 mt-1">GSTIN: {epc.gstin || '—'}</div>
                            <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                              <div>Contact: {epc.contact_person || epc.name || '—'}</div>
                              <div>Phone: {epc.mobile || epc.phone || epc.whatsapp || '—'}</div>
                              <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{epc.district_name || 'District'}, {epc.state_name || 'State'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
                              Territory Verified
                            </span>
                            {epc.cluster_name ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200/60 truncate max-w-[120px]">
                                {epc.cluster_name}
                              </span>
                            ) : (
                              <span>Pin: {epc.pincode || '—'}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* ── EMPTY STATE ── */
                <div className="p-8 my-4 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {epcSearch || selectedClusterFilter !== 'all' || selectedStateFilter !== 'all' || selectedDistrictFilter !== 'all'
                        ? 'No matching EPC clients found'
                        : 'No Onboarded EPC Clients Found'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mt-1">
                      {epcSearch || selectedClusterFilter !== 'all' || selectedStateFilter !== 'all' || selectedDistrictFilter !== 'all'
                        ? 'No approved EPC matched the selected filters. Try resetting the filters or modifying your search.'
                        : 'You can only generate quotations for EPC contractors you have onboarded. Please onboard an EPC partner first.'}
                    </p>
                  </div>
                  {(epcSearch || selectedClusterFilter !== 'all' || selectedStateFilter !== 'all' || selectedDistrictFilter !== 'all') ? (
                    <button
                      type="button"
                      onClick={handleResetEpcFilters}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('/epc-onboarding')}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Onboard New EPC
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Franchisee Partner Attribution (Optional) */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-amber-500" />
                <span>Franchisee Partner Attribution (Optional)</span>
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                If generating this quote on behalf of a territory franchisee, select them here. Otherwise leave as BDE Direct.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <div
                  onClick={() => setSelectedFranchisee(null)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition ${selectedFranchisee === null
                    ? 'border-indigo-600 bg-indigo-50/40 font-bold'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <div className="text-xs font-bold text-slate-900">BDE Direct Deal</div>
                  <div className="text-[10px] text-slate-400">SolarKits central quotation</div>
                </div>

                {franchisees.map((f) => {
                  const isSel = selectedFranchisee?._id === f._id;
                  return (
                    <div
                      key={f._id}
                      onClick={() => setSelectedFranchisee(f)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition ${isSel
                        ? 'border-indigo-600 bg-indigo-50/40 font-bold'
                        : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="text-xs font-bold text-slate-900 line-clamp-1">{f.business_name || f.name}</div>
                      <div className="text-[10px] text-slate-400">Store Partner • {f.district || 'Territory'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DELIVERY */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Delivery Mode & Site Details</h2>
              <p className="text-xs text-slate-500">Configure logistics destination and delivery contact person</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'epc_location', title: 'EPC Registered Address', desc: 'Dispatch directly to EPC registered office / godown' },
              ].map((mode) => {
                const isSel = deliveryType === mode.id;
                return (
                  <div
                    key={mode.id}
                    onClick={() => handleDeliveryModeSelect(mode.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition ${isSel ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="font-bold text-sm text-slate-900">{mode.title}</div>
                    <p className="text-xs text-slate-500 mt-1">{mode.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Destination Info Banner */}
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 flex items-center gap-2">
              <Truck className="w-4 h-4 shrink-0 text-indigo-600" />
              <span>
                EPC Registered Address: Auto-fetched from verified EPC registration & GST records.
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Site Contact Person *</label>
                  <input
                    type="text"
                    value={deliveryDetails.contact_person}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, contact_person: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    placeholder="Receiver name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Contact Mobile *</label>
                  <input
                    type="text"
                    value={deliveryDetails.mobile}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    placeholder="10-digit mobile"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Street Address *</label>
                <input
                  type="text"
                  value={deliveryDetails.shipping_address_line1}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, shipping_address_line1: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  placeholder="Plot / Site location"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">State</label>
                  <input
                    type="text"
                    value={deliveryDetails.state_name}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, state_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">District</label>
                  <input
                    type="text"
                    value={deliveryDetails.district_name}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, district_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Pincode *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={deliveryDetails.pincode}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold"
                    placeholder="6 digits"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: COMBOKIT (DIRECT DISPLAY WITH INDUSTRY & PROJECT TYPE) */}
        {currentStep === 3 && (
          <div className="space-y-4">
<<<<<<< HEAD
            {/* Proposal Mode Switcher: Standard Commercial vs Trial Kit */}
            <div className="p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-purple-50/50 to-indigo-50/50 border-slate-200">
=======
            {/* Commercial Proposal Mode Banner & Dedicated Trial Quote Navigation */}
            <div className="p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-slate-100/60 to-slate-50 border-slate-200">
>>>>>>> origin/main
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white">
                    Quotation Mode
                  </span>
<<<<<<< HEAD
                  {quoteType === 'trial_kit' ? (
                    <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                      <Box className="w-3.5 h-3.5" /> Trial Kit Proposal (Admin Enforced)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> Commercial Proposal (Standard)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {quoteType === 'trial_kit'
                    ? 'Orders generated in Trial Mode are strictly locked to the quantity configured by Admin on the ComboKit.'
                    : 'Standard commercial quotation allowing flexible loose-pack quantities.'}
                </p>
              </div>

              <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setQuoteType('standard');
                    if (selectedKit) {
                      const loose = selectedKit.loose_order_quantities?.[0] || 1;
                      setQuantity(Number(loose));
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    quoteType === 'standard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Commercial Quote</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuoteType('trial_kit');
                    if (selectedKit) {
                      setQuantity(Number(selectedKit.trial_kit_quantity) || 10);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    quoteType === 'trial_kit'
                      ? 'bg-purple-700 text-white shadow-xs ring-2 ring-purple-600/30'
                      : 'text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Trial Kit Quote</span>
                </button>
              </div>
=======
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-700" /> Commercial Proposal (Loose & Bulk PO)
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Standard commercial quotation for full batch requirements and flexible loose-pack quantities.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const queryStr = selectedEpc?._id ? `?epc_id=${selectedEpc._id}` : '';
                  navigate(`/trial-kit-quotes/create${queryStr}`);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition shadow-2xs shrink-0 self-start md:self-auto"
              >
                <Box className="w-3.5 h-3.5" />
                <span>Need a Trial Kit? Create Trial Quote &rarr;</span>
              </button>
>>>>>>> origin/main
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Choose Authorized ComboKit</h2>
                <p className="text-xs text-slate-500">
                  {selectedFranchisee
                    ? `Authorized products for ${selectedFranchisee.business_name} with Industry & Project Type`
                    : 'Authorized solar system products with pre-configured specs & industry categorization'}
                </p>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={kitSearch}
                  onChange={(e) => setKitSearch(e.target.value)}
                  placeholder="Search by kit, brand, kW, industry, project..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Quick Filters Component */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-800">Quick Filters</h3>
                </div>
                <button
                  type="button"
                  onClick={handleClearMainFilters}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition cursor-pointer"
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
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer"
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
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
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer"
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

                {/* 3. Sub Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Sub Category
                  </label>
                  <div className="relative">
                    <select
                      value={quickFilters.subCategory}
                      onChange={(e) =>
                        setQuickFilters((prev) => ({
                          ...prev,
                          subCategory: e.target.value,
                        }))
                      }
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer"
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
                        }))
                      }
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer"
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
                      className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8 cursor-pointer"
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

            {loadingKits ? (
              <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span>Loading authorized ComboKits...</span>
              </div>
            ) : filteredKits.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Box className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No authorized ComboKits found</p>
                <p className="mt-1">
                  {selectedFranchisee
                    ? `No kits assigned to ${selectedFranchisee.business_name}. Check franchise plan product authorizations.`
                    : 'Check franchise assignment or catalog configuration.'}
                </p>
              </div>
            ) : (
<<<<<<< HEAD
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredKits.map((kit) => {
                  const isSel = selectedKit?._id === kit._id;
                  const pricePaise = kit.price_paise || kit.mrp_paise || (kit.selling_price_cached ? kit.selling_price_cached * 100 : 0);
                  const looseQtys = (Array.isArray(kit.loose_order_quantities) && kit.loose_order_quantities.length > 0)
                    ? kit.loose_order_quantities
                    : [5, 10, 25, 50];

                  return (
                    <div
                      key={kit._id}
                      onClick={() => {
                        setSelectedKit(kit);
                        if (quoteType === 'trial_kit') {
                          setQuantity(Number(kit.trial_kit_quantity) || 10);
                        } else if (!selectedKit || selectedKit._id !== kit._id) {
                          setQuantity(Number(looseQtys[0]) || 1);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between hover:shadow-md ${isSel
                        ? (quoteType === 'trial_kit' ? 'border-purple-600 bg-purple-50/40 shadow-md ring-2 ring-purple-500/20' : 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20')
                        : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                      <div>
                        {/* Tags: Industry Type & Project Type badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                          {quoteType === 'trial_kit' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              <Box className="w-3 h-3 text-purple-600" /> Trial Authorized
                            </span>
                          )}
                          {kit.industry_type_name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Layers className="w-3 h-3 text-amber-600" /> {kit.industry_type_name}
                            </span>
                          )}
                          {kit.project_type_name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <FileText className="w-3 h-3 text-blue-600" /> {kit.project_type_name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-900 text-white">
                            {kit.capacity || kit.kit_capacity_kw || 3} kW System
                          </span>
                          {isSel ? (
                            <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center shadow-sm ${quoteType === 'trial_kit' ? 'bg-purple-600' : 'bg-indigo-600'}`}>
                              <Check className="w-3 h-3" />
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Authorized
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{kit.name || kit.kit_name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                          <span>Code: {kit.code || kit.kit_code || 'SK-KIT'}</span>
                          {kit.brand_name && <span className="font-semibold text-slate-600">• {kit.brand_name}</span>}
                        </div>

                        <div className="mt-3 text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="truncate">• <span className="font-semibold">Panels:</span> {kit.panel_brand || 'Tier-1 Mono PERC / TOPCon'}</div>
                          <div className="truncate">• <span className="font-semibold">Inverter:</span> {kit.inverter_brand || 'High-Efficiency Inverter'}</div>
                          <div className="truncate">• <span className="font-semibold">BOS:</span> {kit.bos_details || 'Full AC/DC DB, Structure & Cables'}</div>
                        </div>
                      </div>

                      {/* Quantity Selection Area: Admin locked for Trial Kit, flexible loose for Commercial */}
                      {quoteType === 'trial_kit' ? (
                        <div className="mt-3.5 pt-3 border-t border-slate-100">
                          <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-purple-950">
                            <span className="font-bold flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                              Admin Trial Qty:
                            </span>
                            <span className="font-black px-2.5 py-0.5 rounded-md bg-purple-700 text-white text-xs">
                              {kit.trial_kit_quantity || 10} Kits (Locked)
                            </span>
                          </div>
                          <p className="text-[10px] text-purple-600 mt-1 pl-1">
                            Pre-configured in Admin ComboKit Settings. Alteration disabled.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3.5 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 flex items-center gap-1">
                              <Package className="w-3 h-3 text-sky-600" /> Loose Qty:
                            </span>
                            {isSel && (
                              <span className="text-[10px] font-bold text-indigo-600">
                                Selected: {quantity} {quantity === 1 ? 'Kit' : 'Kits'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {looseQtys.map((q) => {
                              const isQtyActive = isSel && Number(quantity) === Number(q);
                              return (
                                <button
                                  key={q}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedKit(kit);
                                    setQuantity(Number(q));
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${isQtyActive
                                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30 border border-indigo-700'
                                    : 'bg-sky-500/10 text-sky-700 border border-sky-500/25 hover:bg-sky-600 hover:text-white'
                                    }`}
                                  title={`Select ${q} Kits`}
                                >
                                  {isQtyActive && <Check className="w-3 h-3 stroke-[3]" />}
                                  <span>{q} Kits</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Pricing and Selected Qty Controls */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Unit Price (excl. GST)</span>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-base font-black text-slate-900">{formatINR(pricePaise)}</span>
                            {isSel && quantity > 1 && (
                              <span className="text-[11px] font-bold text-indigo-600">
                                ({quantity} × {formatINR(pricePaise)} = {formatINR(pricePaise * quantity)})
                              </span>
                            )}
                          </div>
                        </div>

                        {isSel && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs">
                            <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                            <span>{quantity} Kits Selected</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
=======
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredKits.map((kit) => (
                  <StoreKitCard
                    key={kit._id}
                    kit={kit}
                    isSelected={selectedKit?._id === kit._id}
                    selectedQuantity={selectedKit?._id === kit._id ? quantity : null}
                    selectedQuoteMode={
                      selectedKit?._id === kit._id
                        ? (selectedQuoteMode || (quantity >= 200 ? 'po_quote' : 'loose_quote'))
                        : null
                    }
                    quotePermissions={effectiveQuotePermissions}
                    onSelectKit={(k, q, mode) => {
                      setSelectedKit(k);
                      setQuantity(q);
                      setSelectedQuoteMode(mode || (q >= 200 ? 'po_quote' : 'loose_quote'));
                    }}
                  />
                ))}
>>>>>>> origin/main
              </div>
            )}
          </div>
        )}

        {/* STEP 4: WARRANTY OPTION */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Warranty & Protection Option</h2>
              <p className="text-xs text-slate-500">Configure extended warranty coverage package for this quote</p>
            </div>

            {/* Selected Kit Summary Banner */}
            {selectedKit && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      {selectedKit.name || selectedKit.kit_name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {selectedKit.brand_name || "SolarKits Direct"} • {selectedKit.category_name || "Rooftop"} • Capacity: {((selectedKit.capacity || selectedKit.kit_capacity_kw || 3) * quantity).toFixed(1)} kW
                    </p>
                  </div>
                </div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold text-xs">
                    Selected Quantity: {quantity} {quantity > 1 ? "kits" : "kit"}
                  </span>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Warranty Package</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  onClick={() => setSelectedWarranty(null)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${selectedWarranty === null ? 'border-indigo-600 bg-indigo-50/40' : 'border-slate-200 bg-white'
                    }`}
                >
                  <div className="font-bold text-xs text-slate-900">Standard OEM Warranty</div>
                  <p className="text-[11px] text-slate-400 mt-1">25 yrs panel output, 5 yrs inverter. Free.</p>
                  <div className="mt-2 text-xs font-bold text-emerald-600">Included</div>
                </div>

                {(Array.isArray(warrantyList) ? warrantyList : []).map((war) => {
                  const isSel = selectedWarranty?._id === war._id;
                  const priceLabel =
                    war.pricing_mode === 'percentage'
                      ? `+${war.price_pct}% of Kit Price`
                      : `+${formatINR(war.price_per_kit_paise || 0)} / Kit`;

                  return (
                    <div
                      key={war._id}
                      onClick={() => setSelectedWarranty(war)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition ${isSel ? 'border-indigo-600 bg-indigo-50/40' : 'border-slate-200 bg-white'
                        }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{war.name}</div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{war.terms || war.covered_products}</p>
                      <div className="mt-2 text-xs font-bold text-indigo-600">{priceLabel}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Quotation Summary & Pricing</h2>
                <p className="text-xs text-slate-500">Confirm commercial details before issuing formal quotation</p>
              </div>
<<<<<<< HEAD
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${quoteType === 'trial_kit' ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-slate-100 text-slate-800'}`}>
                {quoteType === 'trial_kit' ? <Box className="w-3.5 h-3.5 text-purple-700" /> : <DollarSign className="w-3.5 h-3.5 text-slate-700" />}
                {quoteType === 'trial_kit' ? `Trial Kit Proposal (${quantity} Kits Locked)` : 'Standard Commercial Proposal'}
=======
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                <DollarSign className="w-3.5 h-3.5 text-slate-700" />
                Standard Commercial Proposal
>>>>>>> origin/main
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">EPC Client</span>
                <div className="font-bold text-slate-900 text-sm mt-1">{selectedEpc?.company_name}</div>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  <div>GST: {selectedEpc?.gstin || '—'}</div>
                  <div>Contact: {selectedEpc?.contact_person}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Attribution</span>
                <div className="font-bold text-slate-900 text-sm mt-1">
                  {selectedFranchisee ? selectedFranchisee.business_name : 'BDE Direct Deal'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Source: {selectedFranchisee ? 'bde_for_franchisee' : 'bde_direct'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">ComboKit</span>
                <div className="font-bold text-slate-900 text-sm mt-1">{selectedKit?.name || selectedKit?.kit_name}</div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {selectedKit?.industry_type_name && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {selectedKit.industry_type_name}
                    </span>
                  )}
                  {selectedKit?.project_type_name && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      {selectedKit.project_type_name}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Quantity: {quantity} Kits ({((selectedKit?.capacity || selectedKit?.kit_capacity_kw || 3) * quantity).toFixed(1)} kW)
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
                Commercial Pricing Breakdown
              </h4>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Unit Price (Base Kit):</span>
                <span className="font-mono font-bold">{formatINR(pricing.price_per_kit_paise)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Product Subtotal ({quantity} Kits):</span>
                <span className="font-mono font-bold">{formatINR(pricing.product_subtotal_paise)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Warranty / Protection:</span>
                <span className="font-mono font-bold">{formatINR(pricing.warranty_charges_paise)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Logistics / Freight:</span>
                <span className="font-mono font-bold">{formatINR(pricing.delivery_charges_paise)}</span>
              </div>

              <div className="flex justify-between text-xs font-bold text-slate-800 pt-2 border-t border-slate-100">
                <span>Taxable Amount:</span>
                <span className="font-mono font-bold">{formatINR(pricing.taxable_amount_paise)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>GST ({pricing.gst_rate}%):</span>
                <span className="font-mono font-bold">{formatINR(pricing.gst_amount_paise)}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900 pt-3 border-t-2 border-slate-200">
                <span>Total Quotation Payable:</span>
                <span className="font-mono text-lg text-emerald-600">{formatINR(pricing.total_amount_paise)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stepper Footer Buttons */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || generating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-2">
            {currentStep === 5 ? (
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
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  <Check className="w-4 h-4" /> Generate Official Quotation
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
