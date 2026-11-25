import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import { Package } from 'lucide-react';
import {
  FaSlidersH,
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaBoxes,
  FaWarehouse,
  FaFilter,
  FaFileExcel,
  FaDownload,
  FaUpload,
  FaTruck,
  FaCheck,
  FaExclamationTriangle,
  FaTimes,
  FaFileCsv,
  FaEdit,
  FaSearch,
  FaChevronDown,
  FaLayerGroup,
} from 'react-icons/fa';
import PageHeader from '../../../components/PageHeader';
import Button from '../../../components/Button';
import CustomInput from '../../../components/CustomInput';
import Drawer from '../../../components/Drawer';
import Dialog from '../../../components/Dialog';
import Loader from '../../../components/Loader';
import { deliveryApi } from '../../../api/deliveryApi';
import readXlsxFile from 'read-excel-file';
import axios from 'axios';
import { authHeaderObj } from '../../../app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ACTIVE_ORDER_TYPES = [
  {
    key: 'loose_order',
    label: 'Loose Order',
    description: 'Single or low-volume retail purchases',
    defaultQty: 1,
  },
  {
    key: 'trial_order',
    label: 'Trial Order',
    description: 'Sample testing & quality verification order',
    defaultQty: 10,
  },
  {
    key: 'po_order',
    label: 'PO Order',
    description: 'Formal Purchase Order & commercial contracts',
    defaultQty: 500,
  },
];

export default function DeliveryCostSettings() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('benchmarks'); // 'benchmarks' | 'kit_rules'

  // Data states
  const [benchmarks, setBenchmarks] = useState([]);
  const [kitRules, setKitRules] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [vehicleMasters, setVehicleMasters] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [kits, setKits] = useState([]);
  const [kitWeights, setKitWeights] = useState({});
  const [loading, setLoading] = useState(false);

  // Hierarchy Filter States for Kit Rule Drawer
  const [industryTypes, setIndustryTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);
  const [projectRanges, setProjectRanges] = useState([]);

  const [selectedIndustryType, setSelectedIndustryType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedProjectRange, setSelectedProjectRange] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState('');

  // Bulk Selection & Edit States (Benchmarks)
  const [selectedBenchmarkIds, setSelectedBenchmarkIds] = useState([]);
  const [editingBenchmarkId, setEditingBenchmarkId] = useState(null);

  // Filters & Search (Kit Rules)
  const [ruleSearchQuery, setRuleSearchQuery] = useState('');
  const [selectedOrderTypeFilter, setSelectedOrderTypeFilter] = useState('');

  // Bulk Selection & Edit States (Kit Rules)
  const [selectedRuleIds, setSelectedRuleIds] = useState([]);
  const [editingRuleId, setEditingRuleId] = useState(null);

  // Benchmark Drawer States
  const [benchDrawerOpen, setBenchDrawerOpen] = useState(false);
  const [entryMode, setEntryMode] = useState('bulk_sheet'); // 'bulk_sheet' | 'single'
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsingSheet, setIsParsingSheet] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const [benchForm, setBenchForm] = useState({
    service_provider_id: '',
    warehouse_id: '',
    vehicle_master_id: '',
    state_id: '',
    district_id: '',
    benchmark_cost: '',
    gst_applicable: true,
    gst_rate: 18,
    free_delivery_eligible: false,
    effective_date: new Date().toISOString().split('T')[0],
  });

  // Kit Rule Drawer
  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    kit_id: '',
    order_type: 'loose_order',
    number_of_kits: 1,
    vehicle_master_id: '',
    total_delivery_cost: '',
    per_kit_delivery_cost: '',
    free_delivery: false,
  });

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  const getCleanId = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return String(val._id || val.id || '');
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [bRes, rRes, vRes, indRes, catRes, pRes] = await Promise.all([
        deliveryApi.getBenchmarks({
          warehouse_id: selectedWarehouse || null,
          service_provider_id: selectedProviderFilter || null,
        }),
        deliveryApi.getKitRules(),
        deliveryApi.getVehicleMasters(),
        deliveryApi.getIndustryTypes().catch(() => ({ data: [] })),
        deliveryApi.getCategories().catch(() => ({ data: [] })),
        deliveryApi.getServiceProviders().catch(() => ({ data: [] })),
      ]);

      if (bRes.status === 'success') setBenchmarks(bRes.data || []);
      if (rRes.status === 'success') setKitRules(rRes.data || []);
      if (vRes.status === 'success') setVehicleMasters(vRes.data || []);
      if (indRes?.status === 'success' || Array.isArray(indRes?.data) || Array.isArray(indRes)) {
        setIndustryTypes(Array.isArray(indRes?.data) ? indRes.data : Array.isArray(indRes) ? indRes : []);
      }
      if (catRes?.status === 'success' || Array.isArray(catRes?.data) || Array.isArray(catRes)) {
        setCategories(Array.isArray(catRes?.data) ? catRes.data : Array.isArray(catRes) ? catRes : []);
      }
      if (pRes?.status === 'success' || Array.isArray(pRes?.data)) setServiceProviders(pRes.data || []);

      // Load company warehouses, states & kit weights from existing APIs
      const [whRes, stRes, fetchedKits, kwRes] = await Promise.all([
        deliveryApi.getWarehouses().catch(() => ({ data: [] })),
        deliveryApi.getStates().catch(() => ({ data: [] })),
        deliveryApi.getComboKits().catch(() => []),
        deliveryApi.getComboKitWeights().catch(() => ({ data: [] })),
      ]);

      setWarehouses(whRes.data || []);
      setStates(stRes.data || stRes.states || []);

      // Consolidate all configured kits across all available sources
      const combinedKitsMap = new Map();
      const rawKits = Array.isArray(fetchedKits) ? fetchedKits : (fetchedKits?.data || []);
      rawKits.forEach((k) => {
        const id = getCleanId(k);
        if (id && !k.deleted_at && k.is_active !== false) combinedKitsMap.set(id, k);
      });

      (kwRes?.unconfigured_kits || []).forEach((u) => {
        const kId = getCleanId(u._id || u.id);
        if (kId && !combinedKitsMap.has(kId) && !u.deleted_at && u.is_active !== false) {
          combinedKitsMap.set(kId, {
            _id: kId,
            name: u.name || 'Solar Kit',
            capacity: u.capacity || 0,
          });
        }
      });

      setKits(Array.from(combinedKitsMap.values()));

      const wMap = {};
      (kwRes?.data || []).forEach((w) => {
        const kId = String(w.kit_id?._id || w.kit_id || '');
        if (kId) wMap[kId] = Number(w.total_kit_weight_kg || 0);
      });
      setKitWeights(wMap);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load delivery settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [selectedWarehouse, selectedProviderFilter]);

  // Cascading hierarchy handlers
  const handleIndustryChange = async (indId) => {
    setSelectedIndustryType(indId);
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedType('');
    setSelectedProjectRange('');
    setCategories([]);
    setSubcategories([]);
    setSystemTypes([]);
    setProjectRanges([]);

    try {
      const res = await deliveryApi.getCategories(indId || null);
      setCategories(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCategoryChange = async (catId) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('');
    setSelectedType('');
    setSelectedProjectRange('');
    setSubcategories([]);
    setSystemTypes([]);
    setProjectRanges([]);

    if (catId) {
      try {
        const res = await deliveryApi.getSubcategories(catId);
        setSubcategories(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSubcategoryChange = async (subId) => {
    setSelectedSubcategory(subId);
    setSelectedType('');
    setSelectedProjectRange('');
    setSystemTypes([]);
    setProjectRanges([]);

    if (subId) {
      try {
        const res = await deliveryApi.getSystemTypes(subId);
        setSystemTypes(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleTypeChange = async (typeId) => {
    setSelectedType(typeId);
    setSelectedProjectRange('');
    setProjectRanges([]);

    if (typeId) {
      try {
        const res = await deliveryApi.getProjectRanges(typeId);
        setProjectRanges(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleProjectRangeChange = (rangeId) => {
    setSelectedProjectRange(rangeId);
  };

  const clearHierarchyFilters = async () => {
    setSelectedIndustryType('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedType('');
    setSelectedProjectRange('');
    setSubcategories([]);
    setSystemTypes([]);
    setProjectRanges([]);
    try {
      const res = await deliveryApi.getCategories();
      setCategories(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic filter for combo kits based on cascading selections
  const filteredKits = useMemo(() => {
    if (!kits || !Array.isArray(kits)) return [];
    return kits.filter((k) => {
      // 1. Industry Type
      const kitIndId = getCleanId(
        k.solar_kit_id?.category_id?.industry_type_id?._id ||
        k.solar_kit_id?.category_id?.industry_type_id ||
        k.category_id?.industry_type_id?._id ||
        k.category_id?.industry_type_id ||
        k.industry_type_id?._id ||
        k.industry_type_id
      );
      const matchInd = !selectedIndustryType || kitIndId === selectedIndustryType;

      // 2. Category
      const kitCatId = getCleanId(
        k.solar_kit_id?.category_id?._id ||
        k.solar_kit_id?.category_id ||
        k.category_id?._id ||
        k.category_id
      );
      const matchCat = !selectedCategory || kitCatId === selectedCategory;

      // 3. Subcategory
      const kitSubId = getCleanId(
        k.solar_kit_id?.subcategory_id?._id ||
        k.solar_kit_id?.subcategory_id ||
        k.subcategory_id?._id ||
        k.subcategory_id
      );
      const matchSub = !selectedSubcategory || kitSubId === selectedSubcategory;

      // 4. System Type
      const kitSubtypeDocId = getCleanId(k.solar_kit_id?.type_id?._id || k.solar_kit_id?.type_id);
      const kitTypeId = getCleanId(k.solar_kit_id?.type_id?.type?._id || k.solar_kit_id?.type_id?.type || k.type_id);
      const matchType = !selectedType || kitSubtypeDocId === selectedType || kitTypeId === selectedType;

      // 5. Project Range
      const kitRangeId = getCleanId(
        k.project_range_id?._id ||
        k.project_range_id ||
        k.solar_kit_id?.project_range_id?._id ||
        k.solar_kit_id?.project_range_id
      );
      const selectedPrObj = projectRanges.find((pr) => getCleanId(pr) === selectedProjectRange);
      let matchRange = !selectedProjectRange || kitRangeId === selectedProjectRange;
      if (!matchRange && selectedPrObj && selectedPrObj.min_value != null && selectedPrObj.max_value != null) {
        const cap = Number(k.capacity || k.solar_kit_id?.capacity || 0);
        if (cap >= Number(selectedPrObj.min_value) && cap <= Number(selectedPrObj.max_value)) {
          matchRange = true;
        }
      }

      return matchInd && matchCat && matchSub && matchType && matchRange;
    });
  }, [kits, selectedIndustryType, selectedCategory, selectedSubcategory, selectedType, selectedProjectRange, projectRanges]);

  // Multi-Field Search Filter across State, District, Price, Warehouse, Vendor, Vehicle
  const filteredBenchmarks = useMemo(() => {
    if (!benchmarks || !Array.isArray(benchmarks)) return [];
    if (!searchQuery.trim()) return benchmarks;

    const q = searchQuery.toLowerCase().trim();
    return benchmarks.filter((b) => {
      const stateName = (b.state_id?.name || '').toLowerCase();
      const districtName = (b.district_id?.name || '').toLowerCase();
      const costStr = String(b.benchmark_cost || '').toLowerCase();
      const whCode = (b.warehouse_id?.warehouse_code || '').toLowerCase();
      const whName = (b.warehouse_id?.name || '').toLowerCase();
      const whAddress = (b.warehouse_id?.address || '').toLowerCase();
      const whCity = (b.warehouse_id?.city || '').toLowerCase();
      const vendorName = (b.service_provider_id?.name || '').toLowerCase();
      const vendorCode = (b.service_provider_id?.provider_code || '').toLowerCase();
      const vehicleName = (b.vehicle_master_id?.name || '').toLowerCase();
      const vehicleMake = (b.vehicle_master_id?.brand_make || '').toLowerCase();

      return (
        stateName.includes(q) ||
        districtName.includes(q) ||
        costStr.includes(q) ||
        whCode.includes(q) ||
        whName.includes(q) ||
        whAddress.includes(q) ||
        whCity.includes(q) ||
        vendorName.includes(q) ||
        vendorCode.includes(q) ||
        vehicleName.includes(q) ||
        vehicleMake.includes(q)
      );
    });
  }, [benchmarks, searchQuery]);

  // Bulk Selection Handlers
  const isAllSelected = useMemo(() => {
    if (filteredBenchmarks.length === 0) return false;
    return filteredBenchmarks.every((b) => selectedBenchmarkIds.includes(b._id));
  }, [filteredBenchmarks, selectedBenchmarkIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredBenchmarks.map((b) => b._id));
      setSelectedBenchmarkIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const currentSet = new Set(selectedBenchmarkIds);
      filteredBenchmarks.forEach((b) => currentSet.add(b._id));
      setSelectedBenchmarkIds(Array.from(currentSet));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedBenchmarkIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedBenchmarkIds.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedBenchmarkIds.length} selected benchmark(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await deliveryApi.bulkDeleteBenchmarks(selectedBenchmarkIds);
      showAlert(res.message || `Successfully deleted ${selectedBenchmarkIds.length} benchmarks.`);
      setSelectedBenchmarkIds([]);
      await loadInitialData();
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.message || 'Failed to delete selected benchmarks', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Safe Kit Dropdown List for Kit Drawer (ensures currently edited kit is selectable)
  const availableKitsForDropdown = useMemo(() => {
    if (!ruleForm.kit_id) return filteredKits;
    const exists = filteredKits.some((k) => getCleanId(k) === ruleForm.kit_id);
    if (!exists) {
      const matchInAll = kits.find((k) => getCleanId(k) === ruleForm.kit_id);
      if (matchInAll) return [matchInAll, ...filteredKits];
    }
    return filteredKits;
  }, [filteredKits, ruleForm.kit_id, kits]);

  // Kit-Wise Rules Mapped by Kit ID: { [kitId]: { loose_order: rule, trial_order: rule, po_order: rule } }
  const kitRulesByKitId = useMemo(() => {
    const map = {};
    (kitRules || []).forEach((r) => {
      const kId = getCleanId(r.kit_id);
      if (!kId) return;
      if (!map[kId]) map[kId] = {};
      map[kId][r.order_type] = r;
    });
    return map;
  }, [kitRules]);

  // Accordion Expand/Collapse States for Kits
  const [expandedKitIds, setExpandedKitIds] = useState(new Set());

  // Quick Filters Active Check
  const hasActiveQuickFilters = useMemo(() => {
    return Boolean(
      selectedIndustryType ||
      selectedCategory ||
      selectedSubcategory ||
      selectedType ||
      selectedProjectRange
    );
  }, [selectedIndustryType, selectedCategory, selectedSubcategory, selectedType, selectedProjectRange]);

  // Filtered Kits for Kit-Centric List
  const filteredKitCards = useMemo(() => {
    if (!filteredKits || !Array.isArray(filteredKits)) return [];
    let list = filteredKits;

    // Filter by Order Type (loose_order, trial_order, po_order)
    if (selectedOrderTypeFilter) {
      list = list.filter((k) => {
        const kId = getCleanId(k);
        const rules = kitRulesByKitId[kId] || {};
        return !!rules[selectedOrderTypeFilter];
      });
    }

    // Filter by Search Query (Kit name, capacity, order type, vehicle, costs)
    if (ruleSearchQuery.trim()) {
      const q = ruleSearchQuery.toLowerCase().trim();
      list = list.filter((k) => {
        const kId = getCleanId(k);
        const kitName = (k.name || '').toLowerCase();
        const capStr = `${k.capacity || k.solar_kit_id?.capacity || ''} kw`.toLowerCase();
        if (kitName.includes(q) || capStr.includes(q)) return true;

        const rules = kitRulesByKitId[kId] || {};
        for (const ord of ACTIVE_ORDER_TYPES) {
          const rule = rules[ord.key];
          if (rule) {
            const ordLabel = ord.label.toLowerCase();
            const vehName = (rule.vehicle_master_id?.name || '').toLowerCase();
            const costStr = String(rule.total_delivery_cost || '');
            const perCostStr = String(rule.per_kit_delivery_cost || '');
            if (
              ordLabel.includes(q) ||
              vehName.includes(q) ||
              costStr.includes(q) ||
              perCostStr.includes(q)
            ) {
              return true;
            }
          }
        }
        return false;
      });
    }

    return list;
  }, [filteredKits, selectedOrderTypeFilter, ruleSearchQuery, kitRulesByKitId]);

  const handleToggleExpandKit = (kitId) => {
    setExpandedKitIds((prev) => {
      const next = new Set(prev);
      if (next.has(kitId)) {
        next.delete(kitId);
      } else {
        next.add(kitId);
      }
      return next;
    });
  };

  const handleExpandAllKits = () => {
    setExpandedKitIds(new Set(filteredKitCards.map((k) => getCleanId(k))));
  };

  const handleCollapseAllKits = () => {
    setExpandedKitIds(new Set());
  };

  const handleOpenConfigureOrder = (kit, orderTypeKey, existingRule = null) => {
    const kId = getCleanId(kit);
    if (existingRule) {
      setEditingRuleId(existingRule._id);
      setRuleForm({
        kit_id: kId,
        order_type: existingRule.order_type || orderTypeKey,
        number_of_kits: existingRule.number_of_kits !== undefined ? existingRule.number_of_kits : 1,
        vehicle_master_id: getCleanId(existingRule.vehicle_master_id),
        total_delivery_cost: existingRule.total_delivery_cost !== undefined ? existingRule.total_delivery_cost : '',
        per_kit_delivery_cost: existingRule.per_kit_delivery_cost !== undefined ? existingRule.per_kit_delivery_cost : '',
        free_delivery: !!existingRule.free_delivery,
      });
    } else {
      setEditingRuleId(null);
      const defaultQty = ACTIVE_ORDER_TYPES.find((o) => o.key === orderTypeKey)?.defaultQty || 1;
      setRuleForm({
        kit_id: kId,
        order_type: orderTypeKey,
        number_of_kits: defaultQty,
        vehicle_master_id: '',
        total_delivery_cost: '',
        per_kit_delivery_cost: '',
        free_delivery: false,
      });
    }
    setExpandedKitIds((prev) => new Set(prev).add(kId));
    setRuleDrawerOpen(true);
  };

  const handleOpenBenchmarkDrawer = () => {
    setEditingBenchmarkId(null);
    setBenchForm({
      service_provider_id: '',
      warehouse_id: '',
      vehicle_master_id: '',
      state_id: '',
      district_id: '',
      benchmark_cost: '',
      gst_applicable: true,
      gst_rate: 18,
      free_delivery_eligible: false,
      effective_date: new Date().toISOString().split('T')[0],
    });
    setEntryMode('bulk_sheet');
    setUploadedFileName('');
    setParsedRows([]);
    setSheetError('');
    setDistricts([]);
    setBenchDrawerOpen(true);
  };

  // Open Edit Modal prefilled with benchmark data
  const handleOpenEditModal = async (benchmark) => {
    const stateId = getCleanId(benchmark.state_id);
    const districtId = getCleanId(benchmark.district_id);

    setEditingBenchmarkId(benchmark._id);
    setBenchForm({
      service_provider_id: getCleanId(benchmark.service_provider_id),
      warehouse_id: getCleanId(benchmark.warehouse_id),
      vehicle_master_id: getCleanId(benchmark.vehicle_master_id),
      state_id: stateId,
      district_id: districtId,
      benchmark_cost: benchmark.benchmark_cost !== undefined && benchmark.benchmark_cost !== null ? benchmark.benchmark_cost : '',
      gst_applicable: benchmark.gst_applicable !== undefined ? benchmark.gst_applicable : true,
      gst_rate: benchmark.gst_rate !== undefined ? benchmark.gst_rate : 18,
      free_delivery_eligible: !!benchmark.free_delivery_eligible,
      effective_date: benchmark.effective_date
        ? new Date(benchmark.effective_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    });

    setEntryMode('single');
    setUploadedFileName('');
    setParsedRows([]);
    setSheetError('');

    if (stateId) {
      try {
        const res = await deliveryApi.getDistricts(stateId);
        setDistricts(res.data || res.districts || []);
      } catch (err) {
        console.error(err);
        setDistricts([]);
      }
    } else {
      setDistricts([]);
    }

    setBenchDrawerOpen(true);
  };

  // Load districts when state changes in benchmark form
  const handleStateChange = async (stateId) => {
    setBenchForm((prev) => ({ ...prev, state_id: stateId, district_id: '' }));
    setParsedRows([]);
    setUploadedFileName('');
    setSheetError('');
    if (!stateId) {
      setDistricts([]);
      return;
    }
    try {
      const res = await deliveryApi.getDistricts(stateId);
      setDistricts(res.data || res.districts || []);
    } catch {
      setDistricts([]);
    }
  };

  // Download prefilled CSV template with state districts
  const handleDownloadTemplate = () => {
    if (!benchForm.state_id || districts.length === 0) {
      showAlert('Please select a State first to download its districts template.', 'error');
      return;
    }
    const selectedState = states.find((s) => s._id === benchForm.state_id);
    const stateName = selectedState ? selectedState.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'State';

    const header = ['District Name', 'Benchmark Transport Cost (₹)'];
    const csvRows = [header.join(',')];

    districts.forEach((d) => {
      csvRows.push(`"${d.name.replace(/"/g, '""')}",""`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Delivery_Benchmark_Template_${stateName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Smart sheet parser for .xlsx, .xls and .csv
  const parseUploadedFile = async (file) => {
    if (!file) return;
    if (!benchForm.state_id || districts.length === 0) {
      showAlert('Please choose State first before uploading sheet.', 'error');
      return;
    }

    setIsParsingSheet(true);
    setSheetError('');
    setUploadedFileName(file.name);

    try {
      let rawRows = [];
      const isCsv = file.name.toLowerCase().endsWith('.csv');

      if (isCsv) {
        const text = await file.text();
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        rawRows = lines.map((line) => {
          const pattern = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
          const matches = [];
          let match;
          while ((match = pattern.exec(line)) && match[0] !== '') {
            let val = match[1] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1).replace(/""/g, '"');
            }
            matches.push(val.trim());
            if (pattern.lastIndex >= line.length) break;
          }
          return matches;
        });
      } else {
        rawRows = await readXlsxFile(file);
      }

      if (!rawRows || rawRows.length === 0) {
        setSheetError('The uploaded file contains no data.');
        setParsedRows([]);
        return;
      }

      // Check header row vs data
      const headerRow = rawRows[0].map((c) => (c || '').toString().toLowerCase().trim());

      let districtColIdx = headerRow.findIndex(
        (h) =>
          h.includes('district') ||
          h.includes('dist') ||
          h.includes('zilla') ||
          h.includes('city') ||
          h.includes('location') ||
          h.includes('destination') ||
          h.includes('name')
      );
      let costColIdx = headerRow.findIndex(
        (h) =>
          h.includes('cost') ||
          h.includes('benchmark') ||
          h.includes('rate') ||
          h.includes('price') ||
          h.includes('amount') ||
          h.includes('delivery') ||
          h.includes('transport')
      );

      if (districtColIdx === -1) districtColIdx = 0;
      if (costColIdx === -1) costColIdx = 1;
      if (costColIdx === districtColIdx && rawRows[0].length > 1) {
        costColIdx = districtColIdx === 0 ? 1 : 0;
      }

      const normalize = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

      const dataRows = rawRows.slice(1);
      const parsed = dataRows
        .map((row, idx) => {
          const rawDistrict = (row[districtColIdx] || '').toString().trim();
          const rawCostStr = (row[costColIdx] || '').toString().replace(/[₹,\s]/g, '').trim();
          const costNum = parseFloat(rawCostStr);

          if (!rawDistrict && isNaN(costNum)) return null;

          const normRaw = normalize(rawDistrict);
          let matched = districts.find((d) => normalize(d.name) === normRaw);
          if (!matched && normRaw) {
            matched = districts.find(
              (d) => normRaw.includes(normalize(d.name)) || normalize(d.name).includes(normRaw)
            );
          }

          return {
            tempId: `row-${idx}-${Date.now()}`,
            raw_name: rawDistrict,
            district_id: matched?._id || '',
            district_name: matched?.name || rawDistrict || `District #${idx + 1}`,
            benchmark_cost: !isNaN(costNum) && costNum >= 0 ? costNum : '',
            is_matched: !!matched,
            status: matched
              ? (!isNaN(costNum) && costNum > 0 ? 'ready' : 'missing_cost')
              : 'unmatched',
          };
        })
        .filter(Boolean);

      if (parsed.length === 0) {
        setSheetError('No district rows could be extracted from this sheet.');
      }
      setParsedRows(parsed);
    } catch (err) {
      console.error('File parsing error:', err);
      setSheetError(`Failed to read file: ${err.message}`);
    } finally {
      setIsParsingSheet(false);
    }
  };

  const handleUpdateParsedRowCost = (tempId, newCost) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.tempId === tempId) {
          const num = parseFloat(newCost);
          return {
            ...r,
            benchmark_cost: newCost,
            status: r.is_matched ? (num > 0 ? 'ready' : 'missing_cost') : 'unmatched',
          };
        }
        return r;
      })
    );
  };

  const handleRemoveParsedRow = (tempId) => {
    setParsedRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const handleSaveBulkBenchmarks = async (e) => {
    e.preventDefault();
    if (!benchForm.service_provider_id) {
      showAlert('Please select Transport Vendor.', 'error');
      return;
    }
    if (!benchForm.warehouse_id) {
      showAlert('Please select Company Warehouse.', 'error');
      return;
    }
    if (!benchForm.vehicle_master_id) {
      showAlert('Please select Vehicle Type.', 'error');
      return;
    }
    if (!benchForm.state_id) {
      showAlert('Please select State.', 'error');
      return;
    }

    const validRows = parsedRows.filter((r) => r.district_id && Number(r.benchmark_cost) > 0);
    if (validRows.length === 0) {
      showAlert('No valid district rows with transport cost found in the sheet to save.', 'error');
      return;
    }

    setIsSavingBulk(true);
    try {
      const payload = {
        service_provider_id: benchForm.service_provider_id,
        warehouse_id: benchForm.warehouse_id,
        vehicle_master_id: benchForm.vehicle_master_id,
        state_id: benchForm.state_id,
        gst_applicable: benchForm.gst_applicable,
        gst_rate: benchForm.gst_rate,
        free_delivery_eligible: benchForm.free_delivery_eligible,
        effective_date: benchForm.effective_date,
        benchmarks: validRows.map((r) => ({
          district_id: r.district_id,
          benchmark_cost: Number(r.benchmark_cost),
        })),
      };

      const res = await deliveryApi.bulkCreateBenchmarks(payload);
      showAlert(res.message || `Successfully saved benchmarks for ${validRows.length} districts.`);
      setBenchDrawerOpen(false);
      loadInitialData();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save benchmarks', 'error');
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleSaveSingleBenchmark = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (
      !benchForm.service_provider_id ||
      !benchForm.warehouse_id ||
      !benchForm.vehicle_master_id ||
      !benchForm.state_id ||
      !benchForm.district_id ||
      benchForm.benchmark_cost === '' ||
      benchForm.benchmark_cost === null
    ) {
      showAlert('Please fill in all benchmark fields (Vendor, Warehouse, Vehicle, State, District, Cost).', 'error');
      return;
    }

    try {
      if (editingBenchmarkId) {
        await deliveryApi.updateBenchmark(editingBenchmarkId, benchForm);
        showAlert('Benchmark transport cost updated successfully.');
      } else {
        await deliveryApi.createBenchmark(benchForm);
        showAlert('Benchmark transport cost configured successfully.');
      }
      setBenchDrawerOpen(false);
      setEditingBenchmarkId(null);
      loadInitialData();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save benchmark', 'error');
    }
  };

  const handleDeleteBenchmark = async (id) => {
    if (!window.confirm('Delete this benchmark cost?')) return;
    try {
      await deliveryApi.deleteBenchmark(id);
      showAlert('Benchmark deleted.');
      setSelectedBenchmarkIds((prev) => prev.filter((item) => item !== id));
      loadInitialData();
    } catch (err) {
      showAlert('Failed to delete benchmark', 'error');
    }
  };

  const handleOpenCreateRuleDrawer = () => {
    setEditingRuleId(null);
    clearHierarchyFilters();
    setRuleForm({
      kit_id: '',
      order_type: 'loose_order',
      number_of_kits: 1,
      vehicle_master_id: '',
      total_delivery_cost: '',
      per_kit_delivery_cost: '',
      free_delivery: false,
    });
    setRuleDrawerOpen(true);
  };

  const handleOpenEditRuleModal = (rule) => {
    setEditingRuleId(rule._id);
    clearHierarchyFilters();
    setRuleForm({
      kit_id: getCleanId(rule.kit_id),
      order_type: rule.order_type || 'loose_order',
      number_of_kits: rule.number_of_kits !== undefined ? rule.number_of_kits : 1,
      vehicle_master_id: getCleanId(rule.vehicle_master_id),
      total_delivery_cost: rule.total_delivery_cost !== undefined ? rule.total_delivery_cost : '',
      per_kit_delivery_cost: rule.per_kit_delivery_cost !== undefined ? rule.per_kit_delivery_cost : '',
      free_delivery: !!rule.free_delivery,
    });
    setRuleDrawerOpen(true);
  };

  const handleSaveKitRule = async (e) => {
    e.preventDefault();
    if (!ruleForm.kit_id || !ruleForm.vehicle_master_id || !ruleForm.total_delivery_cost) {
      showAlert('Please select Kit, Vehicle, and Total Cost.', 'error');
      return;
    }

    const perKitCost = Number(ruleForm.number_of_kits) > 0
      ? Math.round(Number(ruleForm.total_delivery_cost) / Number(ruleForm.number_of_kits))
      : Number(ruleForm.total_delivery_cost);

    const unitWt = kitWeights[ruleForm.kit_id] || 0;
    const computedWeight = unitWt > 0 ? unitWt * (Number(ruleForm.number_of_kits) || 1) : 0;

    try {
      if (editingRuleId) {
        await deliveryApi.updateKitRule(editingRuleId, {
          ...ruleForm,
          per_kit_delivery_cost: perKitCost,
          shipment_weight_kg: computedWeight,
          total_weight_kg: computedWeight,
          industry_type_id: selectedIndustryType || null,
          project_type_id: selectedType || selectedCategory || null,
          project_subtype_id: selectedSubcategory || null,
        });
        showAlert('Kit delivery Cost updated successfully.');
      } else {
        await deliveryApi.createKitRule({
          ...ruleForm,
          per_kit_delivery_cost: perKitCost,
          shipment_weight_kg: computedWeight,
          total_weight_kg: computedWeight,
          industry_type_id: selectedIndustryType || null,
          project_type_id: selectedType || selectedCategory || null,
          project_subtype_id: selectedSubcategory || null,
        });
        showAlert('Kit delivery Cost created successfully.');
      }
      setRuleDrawerOpen(false);
      setEditingRuleId(null);
      clearHierarchyFilters();
      if (ruleForm.kit_id) {
        setExpandedKitIds((prev) => new Set(prev).add(ruleForm.kit_id));
      }
      loadInitialData();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save rule', 'error');
    }
  };

  const handleDeleteKitRule = async (id, kitId = null) => {
    if (!window.confirm('Delete this kit order delivery Cost?')) return;
    try {
      await deliveryApi.deleteKitRule(id);
      showAlert('Kit delivery Cost deleted.');
      if (kitId) {
        setExpandedKitIds((prev) => new Set(prev).add(kitId));
      }
      loadInitialData();
    } catch (err) {
      showAlert('Failed to delete rule', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Delivery Cost Settings"
        subtitle="Configure Warehouse-wise + Vehicle-wise + Geography-wise transport cost benchmarks & Kit purchase rules."
        icon={FaSlidersH}
        actions={
          activeTab === 'benchmarks' ? (
            <Button
              onClick={handleOpenBenchmarkDrawer}
              className="flex items-center gap-2 bg-white text-blue-700 hover:bg-white/90 font-semibold shadow-md px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
            >
              <FaPlus /> Set Transport Benchmark
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${activeTab === 'benchmarks'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Warehouse & Route Benchmarks ({filteredBenchmarks.length !== benchmarks.length ? `${filteredBenchmarks.length} / ${benchmarks.length}` : benchmarks.length})
        </button>
        <button
          onClick={() => setActiveTab('kit_rules')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'kit_rules'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <span>Kit-Wise Delivery Cost</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'kit_rules' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
              }`}
          >
            {filteredKitCards.length} Kits
          </span>
        </button>
      </div>

      {loading ? (
        <Loader text="Loading delivery cost settings..." />
      ) : activeTab === 'benchmarks' ? (
        <div className="space-y-4">
          {/* Search & Filter Bar: Multi-field Search (State, District, Price, Warehouse, Vendor, Vehicle) + Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            {/* Real-time Multi-Field Search Bar */}
            <div className="relative flex-1 min-w-[260px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaSearch className="text-sm" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by state, district, price, warehouse, vendor, vehicle..."
                className="w-full pl-10 pr-9 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>

            {/* Vendor Filter Dropdown */}
            <div className="flex items-center gap-2">
              <FaTruck className="text-blue-600 text-xs" />
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:inline">Vendor:</label>
              <select
                value={selectedProviderFilter}
                onChange={(e) => setSelectedProviderFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-slate-50 focus:bg-white transition-colors"
              >
                <option value="">All Vendors</option>
                {serviceProviders.map((sp) => (
                  <option key={sp._id} value={sp._id}>
                    {sp.name} ({sp.provider_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse Filter Dropdown */}
            <div className="flex items-center gap-2">
              <FaWarehouse className="text-blue-600 text-xs" />
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:inline">Warehouse:</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-slate-50 focus:bg-white transition-colors"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.warehouse_code} ({wh.address ? wh.address.slice(0, 25) + '...' : 'Main'})
                  </option>
                ))}
              </select>
            </div>

            {(selectedProviderFilter || selectedWarehouse || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProviderFilter('');
                  setSelectedWarehouse('');
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 ml-auto cursor-pointer flex items-center gap-1 py-1.5 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <FaTimes className="text-[10px]" /> Reset
              </button>
            )}
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedBenchmarkIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl shadow-xs animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {selectedBenchmarkIds.length}
                </div>
                <div>
                  <span className="text-sm font-bold text-blue-950">
                    {selectedBenchmarkIds.length} benchmark{selectedBenchmarkIds.length > 1 ? 's' : ''} selected
                  </span>
                  <span className="text-xs text-blue-700 ml-2">
                    (out of {filteredBenchmarks.length} filtered)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedBenchmarkIds.length < filteredBenchmarks.length && (
                  <button
                    type="button"
                    onClick={() => setSelectedBenchmarkIds(filteredBenchmarks.map((b) => b._id))}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    Select All ({filteredBenchmarks.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBenchmarkIds([])}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <FaTrash className="text-[10px]" /> Delete Selected ({selectedBenchmarkIds.length})
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title={isAllSelected ? 'Deselect all' : 'Select all visible'}
                    />
                  </th>
                  <th className="py-3 px-4">Transport Vendor</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Vehicle Type</th>
                  <th className="py-3 px-4">State & District</th>
                  <th className="py-3 px-4">Benchmark Transport Cost</th>
                  <th className="py-3 px-4">GST Applicable</th>
                  <th className="py-3 px-4">Free Delivery</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBenchmarks.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-8 text-slate-500">
                      {searchQuery
                        ? `No delivery benchmarks found matching "${searchQuery}".`
                        : 'No delivery cost benchmarks configured yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredBenchmarks.map((b) => (
                    <tr
                      key={b._id}
                      className={`transition-colors ${selectedBenchmarkIds.includes(b._id)
                        ? 'bg-blue-50/60 hover:bg-blue-50/90'
                        : 'hover:bg-slate-50/80'
                        }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBenchmarkIds.includes(b._id)}
                          onChange={() => handleToggleSelectRow(b._id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {b.service_provider_id?.name || 'All Vendors / Standard'}
                        </div>
                        {b.service_provider_id?.provider_code && (
                          <span className="inline-block text-[11px] font-mono px-2 py-0.5 mt-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                            {b.service_provider_id.provider_code}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {b.warehouse_id?.warehouse_code || 'WH-01'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {b.vehicle_master_id?.name || 'Custom'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-semibold text-slate-900 block">{b.district_id?.name || 'District'}</span>
                        <span className="text-slate-400 text-xs">{b.state_id?.name || 'State'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 text-base">
                        ₹{Number(b.benchmark_cost || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {b.gst_applicable ? (
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                            Yes ({b.gst_rate}%)
                          </span>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {b.free_delivery_eligible ? (
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                            Eligible
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Standard</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {b.effective_date ? new Date(b.effective_date).toLocaleDateString() : 'Active'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(b)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Update Benchmark"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteBenchmark(b._id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete Benchmark"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kit-Wise Rules Tab (Kit-Centric Accordion View) */
        <div className="space-y-4">
          {/* ─── QUICK FILTERS BAR (Matching Screenshot) ─── */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600 stroke-[2.2]" />
                <h3 className="font-bold text-sm text-slate-800">
                  Quick Filters
                </h3>
                {hasActiveQuickFilters && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Filtered ({filteredKitCards.length} kits)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={clearHierarchyFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
              >
                Clear Main
              </button>
            </div>

            {/* 5 Cascading Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* 1. Industry Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Industry Type
                </label>
                <div className="relative">
                  <select
                    value={selectedIndustryType}
                    onChange={(e) => handleIndustryChange(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="">All Industry Types</option>
                    {industryTypes.map((ind) => {
                      const id = ind._id || ind.id;
                      return (
                        <option key={id} value={id}>
                          {ind.name}
                        </option>
                      );
                    })}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
                </div>
              </div>

              {/* 2. Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => {
                      const id = cat._id || cat.id;
                      return (
                        <option key={id} value={id}>
                          {cat.name}
                        </option>
                      );
                    })}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
                </div>
              </div>

              {/* 3. Sub Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sub Category
                </label>
                <div className="relative">
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="">All Sub-Categories</option>
                    {subcategories.map((sub) => {
                      const id = sub._id || sub.id;
                      return (
                        <option key={id} value={id}>
                          {sub.name}
                        </option>
                      );
                    })}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
                </div>
              </div>

              {/* 4. System Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  System Type
                </label>
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="">All System Types</option>
                    {systemTypes.map((st) => {
                      const id = st._id || st.id || st.subcategory_type_id;
                      return (
                        <option key={id} value={id}>
                          {st.name || st.type_name}
                        </option>
                      );
                    })}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
                </div>
              </div>

              {/* 5. Project Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Project Range
                </label>
                <div className="relative">
                  <select
                    value={selectedProjectRange}
                    onChange={(e) => handleProjectRangeChange(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="">All Project Ranges</option>
                    {projectRanges.map((pr) => {
                      const id = pr._id || pr.id;
                      const label = pr.range_label || pr.name || `${pr.min_value || 0} - ${pr.max_value || 0} ${pr.unit_symbol || 'kW'}`;
                      return (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            {/* Real-time Multi-Field Search Bar */}
            <div className="relative flex-1 min-w-[260px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaSearch className="text-sm" />
              </div>
              <input
                type="text"
                value={ruleSearchQuery}
                onChange={(e) => setRuleSearchQuery(e.target.value)}
                placeholder="Search kits by name, capacity, order tier, vehicle, cost..."
                className="w-full pl-10 pr-9 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
              />
              {ruleSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRuleSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>

            {/* Order Type Filter Dropdown - Only Loose, Trial, PO */}
            <div className="flex items-center gap-2">
              <FaBoxes className="text-blue-600 text-xs" />
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:inline">Order Type:</label>
              <select
                value={selectedOrderTypeFilter}
                onChange={(e) => setSelectedOrderTypeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-slate-50 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="">All Order Types (Loose, Trial, PO)</option>
                <option value="loose_order">Loose Order</option>
                <option value="trial_order">Trial Order</option>
                <option value="po_order">PO Order</option>
              </select>
            </div>

            {(selectedOrderTypeFilter || ruleSearchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderTypeFilter('');
                  setRuleSearchQuery('');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 py-1.5 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <FaTimes className="text-[10px]" /> Reset
              </button>
            )}

            {/* Fast Expand / Collapse All */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleExpandAllKits}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={handleCollapseAllKits}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Kits Accordion List */}
          {filteredKitCards.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                <FaBoxes className="text-2xl" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">No Solar Kits Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {ruleSearchQuery || selectedOrderTypeFilter || hasActiveQuickFilters
                  ? 'No combo kits match your search filter criteria. Try resetting filters.'
                  : 'No combo kits are currently available in the system catalog.'}
              </p>
              {hasActiveQuickFilters && (
                <button
                  type="button"
                  onClick={clearHierarchyFilters}
                  className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  Clear Quick Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredKitCards.map((kit) => {
                const kId = getCleanId(kit);
                const isExpanded = expandedKitIds.has(kId);
                const rules = kitRulesByKitId[kId] || {};
                const configuredCount = ACTIVE_ORDER_TYPES.filter((o) => !!rules[o.key]).length;
                const unitWeight = kitWeights[kId] || 0;

                return (
                  <div
                    key={kId}
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${isExpanded
                      ? 'border-blue-300 ring-2 ring-blue-500/10 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                  >
                    {/* Kit Accordion Header Row (Click/Tap to Toggle Dropdown) */}
                    <div
                      onClick={() => handleToggleExpandKit(kId)}
                      className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-slate-50/70"
                    >
                      <div className="flex items-center gap-3.5 min-w-[280px] flex-1">
                        {/* Chevron icon */}
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 transition-all duration-200 flex-shrink-0 ${isExpanded ? 'bg-blue-600 text-white rotate-180 shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          <FaChevronDown className="text-xs transition-transform" />
                        </div>

                        {/* Kit Name & Badges */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                              {kit.name || 'Solar Combo Kit'}
                            </h3>
                            {(kit.capacity || kit.solar_kit_id?.capacity) && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                {kit.capacity || kit.solar_kit_id?.capacity} kW
                              </span>
                            )}
                            {unitWeight > 0 && (
                              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                ⚖️ {unitWeight.toLocaleString()} KG/kit
                              </span>
                            )}
                          </div>

                          {/* Order Type Mini Status Badges (3 Tiers) */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {ACTIVE_ORDER_TYPES.map((ord) => {
                              const rule = rules[ord.key];
                              return rule ? (
                                <span
                                  key={ord.key}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200"
                                >
                                  <FaCheckCircle className="text-[10px] text-emerald-600" />
                                  <span>{ord.label}:</span>
                                  <span className="font-mono font-bold">₹{rule.per_kit_delivery_cost.toLocaleString()}</span>
                                </span>
                              ) : (
                                <span
                                  key={ord.key}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                  <span>{ord.label}: Not Set</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Progress Pill & Action Indicator */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${configuredCount === 3
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : configuredCount > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                        >
                          {configuredCount} / 3 Orders Set
                        </span>
                        <span className="text-xs text-blue-600 font-semibold hidden md:inline">
                          {isExpanded ? 'Collapse ▲' : 'Configure Orders ▼'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Dropdown Content (3 Order Types) */}
                    {isExpanded && (
                      <div className="border-t border-slate-150 bg-slate-50/60 p-4 sm:p-5 transition-all animate-fadeIn">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <FaLayerGroup className="text-blue-600" />
                            <span>Delivery Policies by Order Type (3 Tiers)</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Configure minimum quantities & transport costs for each order tier for this kit.
                          </div>
                        </div>

                        {/* 3 Order Type Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          {ACTIVE_ORDER_TYPES.map((ord) => {
                            const rule = rules[ord.key];
                            const isConfigured = !!rule;

                            return (
                              <div
                                key={ord.key}
                                className={`rounded-2xl border transition-all p-4 flex flex-col justify-between ${isConfigured
                                  ? 'bg-white border-slate-200 shadow-xs hover:border-blue-200'
                                  : 'bg-white/80 border-dashed border-slate-300 hover:border-slate-400'
                                  }`}
                              >
                                {/* Top: Order Type Title & Status */}
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                                    <div>
                                      <span className="font-bold text-slate-900 text-sm block">
                                        {ord.label}
                                      </span>
                                      <span className="text-[11px] text-slate-400 block font-normal">
                                        {ord.description}
                                      </span>
                                    </div>
                                    {isConfigured ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                                        <FaCheckCircle className="text-[9px]" /> Configured
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider flex-shrink-0">
                                        Unconfigured
                                      </span>
                                    )}
                                  </div>

                                  {/* Body: Configured Metrics vs Unconfigured Empty State */}
                                  {isConfigured ? (
                                    <div className="space-y-2 py-1 text-xs">
                                      <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                        <span className="text-slate-500">Min Order Qty:</span>
                                        <span className="font-mono font-bold text-slate-900">
                                          {rule.number_of_kits} kits
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                        <span className="text-slate-500">Shipment Weight:</span>
                                        <span className="font-mono font-bold text-slate-900">
                                          {(() => {
                                            const totalWt = unitWeight > 0 ? unitWeight * Number(rule.number_of_kits || 1) : Number(rule.shipment_weight_kg || rule.total_weight_kg || 0);
                                            return `${Number(totalWt || 0).toLocaleString()} KG`;
                                          })()}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                        <span className="text-slate-500">Vehicle Requirement:</span>
                                        <span className="font-semibold text-slate-800 truncate max-w-[140px]" title={rule.vehicle_master_id?.name || 'Any'}>
                                          {rule.vehicle_master_id?.name || 'Any'}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                        <span className="text-slate-500">Total Delivery Cost:</span>
                                        <span className="font-mono font-bold text-slate-900">
                                          ₹{Number(rule.total_delivery_cost || 0).toLocaleString()}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between py-1 border-b border-slate-50">
                                        <span className="text-slate-500">Per-Kit Delivery Cost:</span>
                                        <span className="font-mono font-bold text-emerald-700 text-sm">
                                          ₹{Number(rule.per_kit_delivery_cost || 0).toLocaleString()}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-500">Free Delivery:</span>
                                        <span>
                                          {rule.free_delivery ? (
                                            <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">Yes</span>
                                          ) : (
                                            <span className="text-[11px] font-medium text-slate-400">No</span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="py-6 text-center">
                                      <p className="text-xs text-slate-400 mb-1">
                                        No delivery Cost set for this order tier.
                                      </p>
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        Default Min Qty: {ord.defaultQty} kits
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Card Actions Footer */}
                                <div className="pt-3 border-t border-slate-100 mt-2">
                                  {isConfigured ? (
                                    <div className="flex items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenConfigureOrder(kit, ord.key, rule)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                      >
                                        <FaEdit className="text-xs" /> Edit Cost
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteKitRule(rule._id, kId)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                        title="Delete Cost"
                                      >
                                        <FaTrash className="text-xs" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenConfigureOrder(kit, ord.key, null)}
                                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    >
                                      <FaPlus className="text-[10px]" /> Configure {ord.label}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Benchmark Centered Modal (Spacious & Centered) */}
      <Dialog
        isOpen={benchDrawerOpen}
        onClose={() => {
          setBenchDrawerOpen(false);
          setEditingBenchmarkId(null);
        }}
        title={editingBenchmarkId ? 'Update Delivery Cost Benchmark' : 'Set Delivery Cost Benchmark'}
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              onClick={() => {
                setBenchDrawerOpen(false);
                setEditingBenchmarkId(null);
              }}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 text-sm rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            {entryMode === 'bulk_sheet' && !editingBenchmarkId ? (
              <Button
                type="button"
                onClick={handleSaveBulkBenchmarks}
                disabled={isSavingBulk || parsedRows.filter(r => r.district_id && Number(r.benchmark_cost) > 0).length === 0}
                className="bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-md px-6 py-2 text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingBulk
                  ? 'Saving Benchmarks...'
                  : `Save Benchmarks (${parsedRows.filter(r => r.district_id && Number(r.benchmark_cost) > 0).length} Districts)`}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSaveSingleBenchmark}
                className="bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-md px-6 py-2 text-sm rounded-xl transition-all cursor-pointer"
              >
                {editingBenchmarkId ? 'Update Benchmark' : 'Save Benchmark'}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          {/* Top Form Fields: Transport Vendor, Warehouse, Vehicle Type, State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FaTruck className="text-blue-600" /> Transport Vendor *
              </label>
              <select
                value={benchForm.service_provider_id}
                onChange={(e) => setBenchForm({ ...benchForm, service_provider_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
              >
                <option value="">-- Choose Vendor --</option>
                {serviceProviders.map((sp) => (
                  <option key={sp._id} value={sp._id}>
                    {sp.name} ({sp.provider_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FaWarehouse className="text-blue-600" /> Warehouse *
              </label>
              <select
                value={benchForm.warehouse_id}
                onChange={(e) => setBenchForm({ ...benchForm, warehouse_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
              >
                <option value="">-- Choose Warehouse --</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.warehouse_code} - {wh.address || 'Company WH'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Vehicle Type *
              </label>
              <select
                value={benchForm.vehicle_master_id}
                onChange={(e) => setBenchForm({ ...benchForm, vehicle_master_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
              >
                <option value="">-- Choose Vehicle --</option>
                {vehicleMasters.map((vm) => (
                  <option key={vm._id} value={vm._id}>
                    {vm.name} ({vm.brand_make} • {vm.max_load_kg.toLocaleString()} KG)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Destination State *
              </label>
              <select
                value={benchForm.state_id}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
              >
                <option value="">-- Choose State --</option>
                {states.map((st) => (
                  <option key={st._id} value={st._id}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Switcher Tabs (Hidden when editing existing record) */}
          {!editingBenchmarkId ? (
            <div className="bg-slate-100 p-1 rounded-xl flex max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setEntryMode('bulk_sheet')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${entryMode === 'bulk_sheet'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <FaFileExcel className="text-emerald-600 text-sm" /> Bulk Upload District Sheet (Excel / CSV)
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('single')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${entryMode === 'single'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <FaEdit className="text-slate-500 text-sm" /> Manual Single District
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                <FaEdit className="text-blue-600" /> Editing Delivery Cost Benchmark Record
              </span>
            </div>
          )}

          {/* Entry Mode 1: Bulk Sheet Upload */}
          {entryMode === 'bulk_sheet' ? (
            <div className="space-y-4 bg-slate-50/70 border border-slate-200 rounded-2xl p-5">
              {/* Template Download & Help Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-xs">
                <div>
                  <div className="font-bold text-blue-900 text-sm flex items-center gap-2">
                    <FaDownload className="text-blue-600" /> Download Pre-filled State District Template
                  </div>
                  <div className="text-blue-700 mt-0.5">
                    {benchForm.state_id && districts.length > 0
                      ? `Pre-filled with all ${districts.length} official districts for ${states.find(s => s._id === benchForm.state_id)?.name || 'selected state'}. Fill the transport cost column and upload.`
                      : 'Select Destination State above to generate the pre-filled template with all districts.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={!benchForm.state_id || districts.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition-all cursor-pointer text-xs shrink-0"
                >
                  <FaDownload /> Download Template (.csv)
                </button>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Upload Filled Sheet (.xlsx, .xls, .csv)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white rounded-2xl p-6 text-center transition-colors">
                  <input
                    type="file"
                    id="sheetUploadInput"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) parseUploadedFile(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    disabled={!benchForm.state_id || isParsingSheet}
                  />
                  <label
                    htmlFor="sheetUploadInput"
                    className={`cursor-pointer flex flex-col items-center justify-center space-y-2 ${!benchForm.state_id ? 'opacity-50 pointer-events-none' : ''
                      }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-sm">
                      <FaUpload />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-blue-600 hover:underline">Click to upload sheet</span>
                      <span className="text-slate-500 text-sm"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Supports Excel (.xlsx, .xls) and CSV format with columns: District Name & Delivery Cost (₹)
                    </p>
                    {uploadedFileName && (
                      <span className="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 font-mono text-xs rounded-lg border border-emerald-200">
                        📄 Uploaded: {uploadedFileName}
                      </span>
                    )}
                  </label>
                </div>
                {!benchForm.state_id && (
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    ⚠️ Please select a Destination State above to enable template download and sheet upload.
                  </p>
                )}
              </div>

              {/* Parsing Progress / Error */}
              {isParsingSheet && (
                <div className="text-center py-2 text-xs font-semibold text-blue-600 animate-pulse">
                  Parsing sheet and matching districts in real time...
                </div>
              )}
              {sheetError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <FaExclamationTriangle className="text-red-500 flex-shrink-0 text-sm" />
                  <span>{sheetError}</span>
                </div>
              )}

              {/* Live Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <FaCheckCircle className="text-emerald-600 text-sm" /> District Rates Preview & Quick Edit
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-semibold">
                        Total Rows: {parsedRows.length}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        Matched: {parsedRows.filter(r => r.is_matched && r.benchmark_cost > 0).length}
                      </span>
                      {parsedRows.some(r => !r.is_matched || !r.benchmark_cost) && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
                          Needs Attention: {parsedRows.filter(r => !r.is_matched || !r.benchmark_cost).length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl bg-white shadow-sm divide-y divide-slate-100">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 font-bold uppercase text-[10px] tracking-wider z-10 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">#</th>
                          <th className="py-2.5 px-4">District Name</th>
                          <th className="py-2.5 px-4">Transport Benchmark Cost (₹)</th>
                          <th className="py-2.5 px-4">Validation Status</th>
                          <th className="py-2.5 px-4 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((row, idx) => (
                          <tr key={row.tempId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-4">
                              <span className="font-semibold text-slate-900 text-sm block">{row.district_name}</span>
                              {row.raw_name && row.raw_name !== row.district_name && (
                                <span className="text-[10px] text-slate-400 font-mono">Matched from: "{row.raw_name}"</span>
                              )}
                            </td>
                            <td className="py-2 px-4">
                              <div className="relative flex items-center">
                                <span className="absolute left-3 text-slate-400 font-semibold">₹</span>
                                <input
                                  type="number"
                                  value={row.benchmark_cost}
                                  onChange={(e) => handleUpdateParsedRowCost(row.tempId, e.target.value)}
                                  placeholder="0"
                                  className="w-36 pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              {row.is_matched && row.benchmark_cost > 0 ? (
                                <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 w-fit border border-emerald-200">
                                  <FaCheck className="text-[9px]" /> Matched & Valid
                                </span>
                              ) : row.is_matched ? (
                                <span className="text-[11px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold w-fit block border border-amber-200">
                                  Missing Cost
                                </span>
                              ) : (
                                <span className="text-[11px] bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-bold w-fit block border border-red-200">
                                  Unrecognised District
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveParsedRow(row.tempId)}
                                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove row"
                              >
                                <FaTimes />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Entry Mode 2: Manual Single District */
            <div className="space-y-4 bg-slate-50/70 border border-slate-200 rounded-2xl p-5 max-w-xl mx-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  District *
                </label>
                <select
                  value={benchForm.district_id}
                  onChange={(e) => setBenchForm({ ...benchForm, district_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                  required
                >
                  <option value="">-- Choose District --</option>
                  {districts.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <CustomInput
                label="Benchmark Transport Cost (₹) *"
                type="number"
                placeholder="e.g. 5000"
                value={benchForm.benchmark_cost}
                onChange={(e) => setBenchForm({ ...benchForm, benchmark_cost: e.target.value })}
                required
              />
            </div>
          )}

          {/* Common Settings: GST, Free Delivery, Effective Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                id="gst_app"
                checked={benchForm.gst_applicable}
                onChange={(e) => setBenchForm({ ...benchForm, gst_applicable: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
              <label htmlFor="gst_app" className="text-xs font-bold text-slate-700 cursor-pointer">
                GST Applicable (18%)
              </label>
            </div>

            <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                id="free_del"
                checked={benchForm.free_delivery_eligible}
                onChange={(e) => setBenchForm({ ...benchForm, free_delivery_eligible: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
              <label htmlFor="free_del" className="text-xs font-bold text-slate-700 cursor-pointer">
                Free Delivery Eligible
              </label>
            </div>

            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Effective Date</label>
              <input
                type="date"
                value={benchForm.effective_date}
                onChange={(e) => setBenchForm({ ...benchForm, effective_date: e.target.value })}
                className="w-full px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-white"
              />
            </div>
          </div>
        </div>
      </Dialog>

      {/* Kit Rule Drawer */}
      <Drawer
        isOpen={ruleDrawerOpen}
        onClose={() => {
          setRuleDrawerOpen(false);
          setEditingRuleId(null);
          clearHierarchyFilters();
        }}
        title={editingRuleId ? 'Edit Kit Delivery Cost' : 'Configure Kit Delivery Cost'}
        width="max-w-2xl"
      >
        <form onSubmit={handleSaveKitRule} className="p-6 space-y-4">
          {/* Target Solar Kit Summary Card */}
          {ruleForm.kit_id ? (
            (() => {
              const currentKit = kits.find((k) => getCleanId(k) === ruleForm.kit_id);
              const unitWt = kitWeights[ruleForm.kit_id] || 0;
              return (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
                        Target Solar Kit
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        {currentKit?.name || 'Selected Solar Kit'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {(currentKit?.capacity || currentKit?.solar_kit_id?.capacity) && (
                        <span className="text-xs font-bold px-2.5 py-1 bg-white text-blue-700 rounded-lg border border-blue-200 shadow-2xs">
                          {currentKit.capacity || currentKit.solar_kit_id?.capacity} kW
                        </span>
                      )}
                      {unitWt > 0 && (
                        <span className="text-xs font-mono font-medium px-2.5 py-1 bg-white text-slate-700 rounded-lg border border-slate-200 shadow-2xs">
                          ⚖️ {unitWt.toLocaleString()} KG/kit
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Solar Kit *</label>
              <select
                value={ruleForm.kit_id}
                onChange={(e) => setRuleForm({ ...ruleForm, kit_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                required
              >
                <option value="">-- Choose Solar Kit --</option>
                {kits.map((k) => (
                  <option key={getCleanId(k)} value={getCleanId(k)}>
                    {k.name} ({k.capacity || k.solar_kit_id?.capacity || 0} kW)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Order Type *</label>
              <select
                value={ruleForm.order_type}
                onChange={(e) => setRuleForm({ ...ruleForm, order_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white cursor-pointer"
              >
                <option value="loose_order">Loose Order</option>
                <option value="trial_order">Trial Order</option>
                <option value="po_order">PO Order</option>
              </select>
            </div>

            <div>
              <CustomInput
                label="Number of Kits / Tier Qty *"
                type="number"
                placeholder="e.g. 10"
                value={ruleForm.number_of_kits}
                onChange={(e) => {
                  const qty = e.target.value;
                  const total = Number(ruleForm.total_delivery_cost) || 0;
                  const perKit = total && Number(qty) > 0 ? Math.round(total / Number(qty)) : '';
                  setRuleForm({ ...ruleForm, number_of_kits: qty, per_kit_delivery_cost: perKit });
                }}
                required
              />
              {ruleForm.kit_id && (
                <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                  <span>Shipment Weight:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {((kitWeights[ruleForm.kit_id] || 0) * (Number(ruleForm.number_of_kits) || 1)).toLocaleString()} KG
                  </span>
                  {kitWeights[ruleForm.kit_id] ? (
                    <span className="text-slate-400">
                      ({kitWeights[ruleForm.kit_id]} KG/kit)
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Requirement *</label>
            <select
              value={ruleForm.vehicle_master_id}
              onChange={(e) => setRuleForm({ ...ruleForm, vehicle_master_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              required
            >
              <option value="">-- Choose Vehicle --</option>
              {vehicleMasters.map((vm) => (
                <option key={vm._id} value={vm._id}>{vm.name} ({vm.max_load_kg} KG max payload)</option>
              ))}
            </select>
            {(() => {
              const selectedVeh = vehicleMasters.find((v) => v._id === ruleForm.vehicle_master_id);
              const unitWt = kitWeights[ruleForm.kit_id] || 0;
              const estWeight = unitWt > 0 ? unitWt * (Number(ruleForm.number_of_kits) || 1) : 0;
              if (selectedVeh && selectedVeh.max_load_kg && estWeight > selectedVeh.max_load_kg) {
                return (
                  <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">
                    <FaExclamationTriangle className="text-amber-500" />
                    Shipment weight ({estWeight.toLocaleString()} KG) exceeds vehicle payload limit ({selectedVeh.max_load_kg.toLocaleString()} KG).
                  </p>
                );
              }
              return null;
            })()}
          </div>

          <div className="space-y-1">
            <CustomInput
              label="Total Delivery Cost (₹) *"
              type="number"
              placeholder="e.g. 8000"
              value={ruleForm.total_delivery_cost}
              onChange={(e) => {
                const total = e.target.value;
                const qty = Number(ruleForm.number_of_kits) || 1;
                const perKit = total && qty > 0 ? Math.round(Number(total) / qty) : '';
                setRuleForm({ ...ruleForm, total_delivery_cost: total, per_kit_delivery_cost: perKit });
              }}
              required
            />
            {ruleForm.total_delivery_cost && Number(ruleForm.number_of_kits) > 0 && (
              <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium pl-1">
                <span>Calculated Per-Kit Cost:</span>
                <span className="font-bold text-emerald-600 font-mono">
                  ₹{Math.round(Number(ruleForm.total_delivery_cost) / Number(ruleForm.number_of_kits)).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="rule_free"
              checked={ruleForm.free_delivery}
              onChange={(e) => setRuleForm({ ...ruleForm, free_delivery: e.target.checked })}
              className="rounded text-blue-600 cursor-pointer"
            />
            <label htmlFor="rule_free" className="text-sm font-medium text-slate-700 cursor-pointer">Free Delivery (Yes/No)</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              onClick={() => {
                setRuleDrawerOpen(false);
                setEditingRuleId(null);
                clearHierarchyFilters();
              }}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 text-sm rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-md px-5 py-2 text-sm rounded-xl transition-all cursor-pointer"
            >
              {editingRuleId ? 'Update Cost Rule' : 'Save Cost Rule'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
