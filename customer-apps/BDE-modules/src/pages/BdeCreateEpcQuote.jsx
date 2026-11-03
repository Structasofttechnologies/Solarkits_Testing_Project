import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import api from '../services/api';

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
  const [epcSearch, setEpcSearch] = useState('');
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
  const filteredEpcs = safeEpcList.filter((epc) => {
    if (!epc) return false;
    const q = (epcSearch || '').toLowerCase();
    const company = epc.company_name || epc.name || epc.gstin_legal_name || epc.gstin_trade_name || '';
    const contact = epc.contact_person || epc.name || '';
    const gstin = epc.gstin || '';
    const mobile = epc.mobile || epc.phone || epc.whatsapp || '';
    return (
      company.toLowerCase().includes(q) ||
      contact.toLowerCase().includes(q) ||
      gstin.toLowerCase().includes(q) ||
      mobile.includes(q)
    );
  });

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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Select Territory EPC Buyer</h2>
                  <p className="text-xs text-slate-500">Choose the approved EPC client to receive this quotation</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={epcSearch}
                    onChange={(e) => setEpcSearch(e.target.value)}
                    placeholder="Search EPC or GSTIN..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

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
                          <div>Phone: {epc.mobile || epc.phone || '—'}</div>
                          <div className="text-slate-400 text-[11px]">
                            {epc.district_name || epc.address?.district || 'District'}, {epc.state_name || epc.address?.state || 'State'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                          Territory Verified
                        </span>
                        <span>Pin: {epc.pincode || epc.address?.pincode || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                        if (!selectedKit || selectedKit._id !== kit._id) {
                          setQuantity(Number(looseQtys[0]) || 1);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between hover:shadow-md ${isSel
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                      <div>
                        {/* Tags: Industry Type & Project Type badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
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
                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
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

                      {/* Loose Order Quantities (Strictly loose quantities, PO quantities excluded) */}
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
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Quotation Summary & Pricing</h2>
              <p className="text-xs text-slate-500">Confirm commercial details before issuing formal quotation</p>
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
