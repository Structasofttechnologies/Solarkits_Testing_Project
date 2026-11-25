/**
 * useVisionData.js
 *
 * Master hook for the Vision Dashboard.
 * Manages:
 *   - All filter state (Network | Catalog | Kit | Period)
 *   - Drill-down level and breadcrumb path
 *   - API data fetching and derived aggregations
 *   - Dependent catalog filter cascading
 *
 * Qualifying order statuses (from fpo_orders schema):
 *   Excludes: CANCELLED, EXPIRED, DRAFT, REJECTED
 *
 * Active franchisee definition (from resellers schema):
 *   activation_status === 'active' AND reseller_lifecycle_status === 'active'
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { visionApi } from './visionDashboardApi';

// ── Constants ────────────────────────────────────────────────────────────────

export const DRILL_LEVELS = ['india', 'cluster', 'state', 'district', 'franchisee', 'warehouse'];

export const PERIOD_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

// Excluded order statuses — these are NOT qualifying sales
export const NON_QUALIFYING_STATUSES = ['CANCELLED', 'EXPIRED', 'DRAFT', 'REJECTED'];

// Kit selling category thresholds (frontend config — not confirmed business rules)
export const SELLING_THRESHOLDS = {
  high: 50,    // ≥50 kits sold in period → HIGH
  average: 20, // ≥20 kits sold → AVERAGE; <20 → LOW
};

const now = new Date();

const getInitialPeriod = () => ({
  period: 'this_month',
  month: now.getMonth() + 1,
  year: now.getFullYear(),
  start_date: null,
  end_date: null,
});

const INITIAL_FILTERS = {
  // Network
  cluster_id: null,
  state_id: null,
  district_id: null,
  franchisee_id: null,
  warehouse_id: null,
  // Catalog
  industry_type_id: null,
  category_id: null,
  subcategory_id: null,
  system_type_id: null,
  project_range_id: null,
  // Kit
  kit_id: null,
  kw_capacity: null,
  // EPC
  epc_type_id: null,
  // Additional
  project_type_id: null,
  application_type_id: null,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVisionData() {
  // ── Filter state ────────────────────────────────────────────────────────
  const [filters, setFiltersState] = useState(INITIAL_FILTERS);
  const [period, setPeriodState] = useState(getInitialPeriod());

  // ── Drill-down state ────────────────────────────────────────────────────
  const [drillLevel, setDrillLevel] = useState('india');
  // drillPath: array of { level, id, name }
  const [drillPath, setDrillPath] = useState([]);

  // ── Catalog reference data ──────────────────────────────────────────────
  const [industryTypes, setIndustryTypes] = useState([]);
  const [allStates, setAllStates] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [catalogTree, setCatalogTree] = useState([]);
  const [kits, setKits] = useState([]);

  // Dependent catalog options
  const [projectCategories, setProjectCategories] = useState([]);
  const [projectSubcategories, setProjectSubcategories] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);
  const [projectRanges, setProjectRanges] = useState([]);

  // EPC Types (classification master — bifurcated by type with live counts)
  const [epcTypes, setEpcTypes] = useState([]);
  const [epcTypesSummary, setEpcTypesSummary] = useState(null);

  // Franchisee and warehouse options for filter dropdowns
  const [franchiseeOptions, setFranchiseeOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);

  // ── Network & Performance data ──────────────────────────────────────────
  const [networkSummary, setNetworkSummary] = useState(null);
  const [performanceTracker, setPerformanceTracker] = useState(null);
  const [locationPerformance, setLocationPerformance] = useState(null);
  const [franchiseeList, setFranchiseeList] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // ── Loading / Error ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState({ summary: false, performance: false, location: false, franchisees: false, warehouses: false, epcTypes: false });
  const [errors, setErrors] = useState({});

  // Sort industries so core Solar PV and solar sectors appear first
  const sortIndustries = (list) => {
    const priority = ['solar pv', 'solar agriculture', 'solar ev', 'solar lighting', 'solar thermal', 'energy storage', 'rural solar'];
    return [...list].sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aIdx = priority.findIndex(p => aName.includes(p));
      const bIdx = priority.findIndex(p => bName.includes(p));
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return aName.localeCompare(bName);
    });
  };

  // ── Fetch catalog reference data and initial geo/kits once ─────────────────
  useEffect(() => {
    // 1. Industry Types
    visionApi.getIndustryTypes().then(r => {
      const data = r?.data || r?.industry_types || [];
      if (Array.isArray(data) && data.length > 0) {
        setIndustryTypes(sortIndustries(data));
      }
    }).catch(err => console.warn('Industry types fetch error:', err));

    // 2. All active states
    visionApi.getActiveStates().then(r => {
      const data = r?.data || r?.states || [];
      if (Array.isArray(data) && data.length > 0) {
        setAllStates(data);
      }
    }).catch(err => console.warn('Active states fetch error:', err));

    // 3. Full project hierarchy (preloads tree for instantaneous cascade & category fallback)
    visionApi.getProjectHierarchy().then(r => {
      const data = r?.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setCatalogTree(data);
        setIndustryTypes(prev => prev.length > 0 ? prev : sortIndustries(data.map(i => ({ _id: i.id, id: i.id, name: i.name, slug: i.slug }))));
        // Pre-populate all categories across industries
        const allCats = [];
        data.forEach(ind => {
          (ind.categories || []).forEach(c => {
            if (!allCats.some(existing => String(existing.id || existing._id) === String(c.id || c._id))) {
              allCats.push({ ...c, _id: c.id, industry_name: ind.name });
            }
          });
        });
        setProjectCategories(allCats);
      }
    }).catch(err => console.warn('Hierarchy fetch error:', err));

    // 4. Kits (combo + solar)
    Promise.allSettled([visionApi.getComboKits(), visionApi.getSolarKits()]).then(([cRes, sRes]) => {
      const cKits = cRes.status === 'fulfilled' ? (cRes.value?.data || cRes.value?.kits || []) : [];
      const sKits = sRes.status === 'fulfilled' ? (sRes.value?.data || sRes.value?.kits || []) : [];
      const mergedKits = [...(Array.isArray(cKits) ? cKits : []), ...(Array.isArray(sKits) ? sKits : [])];
      setKits(mergedKits);
    });

    // 5. EPC Types — classification master with live usage counts
    setLoading(l => ({ ...l, epcTypes: true }));
    visionApi.getEpcTypes().then(r => {
      if (r?.status === 'success') {
        setEpcTypes(r.data || []);
        setEpcTypesSummary(r.summary || null);
      }
    }).catch(err => console.warn('EPC types fetch error:', err))
      .finally(() => setLoading(l => ({ ...l, epcTypes: false })));
  }, []);

  // ── Fetch districts when state filter changes ──────────────────────────
  useEffect(() => {
    if (!filters.state_id) {
      setAllDistricts([]);
      return;
    }
    visionApi.getDistrictsByState(filters.state_id).then(r => {
      const data = r?.data || r?.districts || [];
      setAllDistricts(Array.isArray(data) ? data : []);
    }).catch(err => {
      console.warn('Districts fetch error for state:', filters.state_id, err);
      setAllDistricts([]);
    });
  }, [filters.state_id]);

  // ── Cascade: Categories when industry_type_id changes ──────────────────
  useEffect(() => {
    if (!filters.industry_type_id) {
      if (catalogTree.length > 0) {
        const allCats = [];
        catalogTree.forEach(ind => {
          (ind.categories || []).forEach(c => {
            if (!allCats.some(existing => String(existing.id || existing._id) === String(c.id || c._id))) {
              allCats.push({ ...c, _id: c.id, industry_name: ind.name });
            }
          });
        });
        setProjectCategories(allCats);
      } else {
        visionApi.getProjectCategories().then(r => {
          const data = r?.data || r?.categories || [];
          if (Array.isArray(data)) setProjectCategories(data);
        }).catch(() => { });
      }
      return;
    }

    // Filter by selected industry
    if (catalogTree.length > 0) {
      const matchedInd = catalogTree.find(i => String(i.id || i._id) === String(filters.industry_type_id));
      if (matchedInd && matchedInd.categories) {
        setProjectCategories(matchedInd.categories.map(c => ({ ...c, _id: c.id })));
        return;
      }
    }
    visionApi.getProjectCategories({ industry_type_id: filters.industry_type_id }).then(r => {
      const data = r?.data || r?.categories || [];
      if (Array.isArray(data)) setProjectCategories(data);
    }).catch(() => { });
  }, [filters.industry_type_id, catalogTree]);

  // ── Cascade: Subcategories when category_id changes ────────────────────
  useEffect(() => {
    if (!filters.category_id) {
      setProjectSubcategories([]);
      setSystemTypes([]);
      setProjectRanges([]);
      return;
    }

    if (catalogTree.length > 0) {
      for (const ind of catalogTree) {
        const cat = (ind.categories || []).find(c => String(c.id || c._id) === String(filters.category_id));
        if (cat && cat.subcategories) {
          setProjectSubcategories(cat.subcategories.map(s => ({ ...s, _id: s.id })));
          return;
        }
      }
    }
    visionApi.getProjectSubcategories({ category_id: filters.category_id }).then(r => {
      const data = r?.data || r?.subcategories || [];
      if (Array.isArray(data)) setProjectSubcategories(data);
    }).catch(() => { });
  }, [filters.category_id, catalogTree]);

  // ── Cascade: System types when subcategory_id changes ──────────────────
  useEffect(() => {
    if (!filters.subcategory_id) {
      setSystemTypes([]);
      setProjectRanges([]);
      return;
    }

    if (catalogTree.length > 0) {
      for (const ind of catalogTree) {
        for (const cat of ind.categories || []) {
          const sub = (cat.subcategories || []).find(s => String(s.id || s._id) === String(filters.subcategory_id));
          if (sub && sub.mappedTypes) {
            setSystemTypes(sub.mappedTypes.map(m => ({ ...m, _id: m.subcategory_type_id, id: m.subcategory_type_id })));
            return;
          }
        }
      }
    }
    visionApi.getSystemTypes({ subcategory_id: filters.subcategory_id }).then(r => {
      const data = r?.data || r?.types || [];
      if (Array.isArray(data)) setSystemTypes(data);
    }).catch(() => { });
  }, [filters.subcategory_id, catalogTree]);

  // ── Cascade: Project ranges when system_type_id changes ────────────────
  useEffect(() => {
    if (!filters.system_type_id) {
      setProjectRanges([]);
      return;
    }

    if (catalogTree.length > 0) {
      for (const ind of catalogTree) {
        for (const cat of ind.categories || []) {
          for (const sub of cat.subcategories || []) {
            const mt = (sub.mappedTypes || []).find(m => String(m.subcategory_type_id || m.id) === String(filters.system_type_id));
            if (mt && mt.ranges) {
              setProjectRanges(mt.ranges.map(rg => ({
                ...rg,
                _id: rg.id,
                range_label: `${rg.min_value} - ${rg.max_value} ${rg.unit_symbol || 'kW'}`
              })));
              return;
            }
          }
        }
      }
    }
    visionApi.getProjectRanges({ subcategory_type_id: filters.system_type_id }).then(r => {
      const data = r?.data || r?.ranges || [];
      if (Array.isArray(data)) setProjectRanges(data);
    }).catch(() => { });
  }, [filters.system_type_id, catalogTree]);

  // ── Build period params for API calls ──────────────────────────────────
  const periodParams = useMemo(() => {
    if (period.period === 'custom') {
      return { start_date: period.start_date, end_date: period.end_date };
    }
    if (period.period === 'this_month') {
      return { month: period.month, year: period.year };
    }
    if (period.period === 'this_quarter') {
      const q = Math.ceil(period.month / 3);
      return { quarter: q, year: period.year };
    }
    if (period.period === 'this_year') {
      return { year: period.year };
    }
    return { month: period.month, year: period.year };
  }, [period]);

  // ── Fetch network summary ───────────────────────────────────────────────
  const fetchNetworkSummary = useCallback(async () => {
    setLoading(l => ({ ...l, summary: true }));
    try {
      const r = await visionApi.getNetworkSummary();
      if (r?.status === 'success') setNetworkSummary(r.data);
      setErrors(e => ({ ...e, summary: null }));
    } catch (err) {
      setErrors(e => ({ ...e, summary: err?.response?.data?.message || 'Failed to load summary' }));
    } finally {
      setLoading(l => ({ ...l, summary: false }));
    }
  }, []);

  // ── Fetch performance tracker ───────────────────────────────────────────
  const fetchPerformance = useCallback(async () => {
    setLoading(l => ({ ...l, performance: true }));
    try {
      const params = {
        ...periodParams,
        ...(filters.state_id ? { state_id: filters.state_id } : {}),
        ...(filters.district_id ? { district_id: filters.district_id } : {}),
        ...(filters.franchisee_id ? { franchisee_id: filters.franchisee_id } : {}),
      };
      const [tracker, location] = await Promise.all([
        visionApi.getPerformanceTracker(params),
        visionApi.getLocationPerformance(params),
      ]);
      if (tracker?.status === 'success') setPerformanceTracker(tracker.data);
      if (location?.status === 'success') setLocationPerformance(location.data);
      setErrors(e => ({ ...e, performance: null }));
    } catch (err) {
      setErrors(e => ({ ...e, performance: err?.response?.data?.message || 'Failed to load performance' }));
    } finally {
      setLoading(l => ({ ...l, performance: false }));
    }
  }, [periodParams, filters.state_id, filters.district_id, filters.franchisee_id]);

  // ── Fetch franchisee list (for drill-down) ──────────────────────────────
  const fetchFranchisees = useCallback(async () => {
    setLoading(l => ({ ...l, franchisees: true }));
    try {
      const params = {
        activation_status: 'active',
        ...(filters.state_id ? { state_id: filters.state_id } : {}),
        ...(filters.district_id ? { district_id: filters.district_id } : {}),
        limit: 200,
      };
      const r = await visionApi.getFranchiseeList(params);
      let list = r?.data || [];
      // Client-side defense-in-depth fallback filtering:
      if (filters.state_id) {
        list = list.filter(f => String(f.address?.state_id || '') === String(filters.state_id));
      }
      if (filters.district_id) {
        list = list.filter(f => String(f.address?.district_id || '') === String(filters.district_id));
      }
      if (r?.status === 'success' || Array.isArray(r?.data)) setFranchiseeList(list);
      setErrors(e => ({ ...e, franchisees: null }));
    } catch (err) {
      setErrors(e => ({ ...e, franchisees: err?.response?.data?.message || 'Failed to load franchisees' }));
    } finally {
      setLoading(l => ({ ...l, franchisees: false }));
    }
  }, [filters.state_id, filters.district_id]);

  // ── Fetch warehouses ────────────────────────────────────────────────────
  const fetchWarehouses = useCallback(async () => {
    setLoading(l => ({ ...l, warehouses: true }));
    try {
      const r = await visionApi.getWarehouses();
      if (r?.status === 'success' || Array.isArray(r?.data)) setWarehouses(r.data || []);
      setErrors(e => ({ ...e, warehouses: null }));
    } catch (err) {
      setErrors(e => ({ ...e, warehouses: err?.response?.data?.message || 'Failed to load warehouses' }));
    } finally {
      setLoading(l => ({ ...l, warehouses: false }));
    }
  }, []);

  // ── Fetch EPC Types ────────────────────────────────────────────────────
  const fetchEpcTypes = useCallback(async () => {
    setLoading(l => ({ ...l, epcTypes: true }));
    try {
      const params = {
        ...(filters.state_id ? { state_id: filters.state_id } : {}),
        ...(filters.district_id ? { district_id: filters.district_id } : {}),
        ...(filters.franchisee_id ? { reseller_id: filters.franchisee_id } : {}),
      };
      const r = await visionApi.getEpcTypes(params);
      if (r?.status === 'success') {
        setEpcTypes(r.data || []);
        setEpcTypesSummary(r.summary || null);
      }
      setErrors(e => ({ ...e, epcTypes: null }));
    } catch (err) {
      console.warn('EPC types fetch error:', err);
      setErrors(e => ({ ...e, epcTypes: err?.response?.data?.message || 'Failed to load EPC types' }));
    } finally {
      setLoading(l => ({ ...l, epcTypes: false }));
    }
  }, [filters.state_id, filters.district_id, filters.franchisee_id]);

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchNetworkSummary();
    fetchWarehouses();
    fetchEpcTypes();
  }, [fetchNetworkSummary, fetchWarehouses, fetchEpcTypes]);

  useEffect(() => {
    fetchPerformance();
    fetchFranchisees();
    fetchEpcTypes();
  }, [fetchPerformance, fetchFranchisees, fetchEpcTypes]);

  // ── Set a single filter (with cascade reset) ────────────────────────────
  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => {
      const next = { ...prev, [key]: value };

      // Catalog cascade: parent change → clear incompatible children
      if (key === 'industry_type_id') {
        next.category_id = null;
        next.subcategory_id = null;
        next.system_type_id = null;
        next.project_range_id = null;
        next.kit_id = null;
      } else if (key === 'category_id') {
        next.subcategory_id = null;
        next.system_type_id = null;
        next.project_range_id = null;
        next.kit_id = null;
      } else if (key === 'subcategory_id') {
        next.system_type_id = null;
        next.project_range_id = null;
        next.kit_id = null;
      } else if (key === 'system_type_id') {
        next.project_range_id = null;
        next.kit_id = null;
      }

      // Network cascade: state change → clear district, franchisee, warehouse
      if (key === 'state_id') {
        next.district_id = null;
        next.franchisee_id = null;
        next.warehouse_id = null;
      } else if (key === 'district_id') {
        next.franchisee_id = null;
        next.warehouse_id = null;
      } else if (key === 'franchisee_id') {
        next.warehouse_id = null;
      }

      return next;
    });
  }, []);

  // ── Set period ──────────────────────────────────────────────────────────
  const setPeriod = useCallback((key, value) => {
    setPeriodState(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Reset all filters ───────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setFiltersState(INITIAL_FILTERS);
    setPeriodState(getInitialPeriod());
    setDrillLevel('india');
    setDrillPath([]);
  }, []);

  // ── Drill-down navigation ───────────────────────────────────────────────
  const drillInto = useCallback((level, id, name) => {
    setDrillLevel(level);
    setDrillPath(prev => {
      // Remove any path entries at or beyond this level
      const levelIdx = DRILL_LEVELS.indexOf(level);
      const clipped = prev.filter(p => DRILL_LEVELS.indexOf(p.level) < levelIdx);
      return [...clipped, { level, id, name }];
    });

    // Sync network filter
    if (level === 'state') setFilter('state_id', id);
    if (level === 'district') setFilter('district_id', id);
    if (level === 'franchisee') setFilter('franchisee_id', id);
    if (level === 'warehouse') setFilter('warehouse_id', id);
  }, [setFilter]);

  const drillBackTo = useCallback((levelOrIndex) => {
    let targetLevel, newPath;
    if (typeof levelOrIndex === 'number') {
      newPath = drillPath.slice(0, levelOrIndex + 1);
      targetLevel = newPath[levelOrIndex]?.level || 'india';
    } else {
      const idx = DRILL_LEVELS.indexOf(levelOrIndex);
      newPath = drillPath.filter(p => DRILL_LEVELS.indexOf(p.level) <= idx);
      targetLevel = levelOrIndex;
    }

    setDrillLevel(targetLevel);
    setDrillPath(newPath);

    // Reset network filters below the target level
    const targetIdx = DRILL_LEVELS.indexOf(targetLevel);
    setFiltersState(prev => ({
      ...prev,
      state_id: targetIdx >= DRILL_LEVELS.indexOf('state') ? prev.state_id : null,
      district_id: targetIdx >= DRILL_LEVELS.indexOf('district') ? prev.district_id : null,
      franchisee_id: targetIdx >= DRILL_LEVELS.indexOf('franchisee') ? prev.franchisee_id : null,
      warehouse_id: targetIdx >= DRILL_LEVELS.indexOf('warehouse') ? prev.warehouse_id : null,
    }));
  }, [drillPath]);

  // ── Active filter chips list ────────────────────────────────────────────
  const activeFilterChips = useMemo(() => {
    const chips = [];
    const add = (key, label) => { if (filters[key]) chips.push({ key, label }); };

    // 1. Cluster
    if (filters.cluster_id) {
      add('cluster_id', `Cluster: ${filters.cluster_id}`);
    }

    // 2. State
    if (filters.state_id) {
      const s = allStates.find(item => String(item._id || item.id) === String(filters.state_id));
      const stateName = s?.name || s?.state_name;
      add('state_id', `State: ${stateName || filters.state_id}`);
    }

    // 3. District
    if (filters.district_id) {
      const d = allDistricts.find(item => String(item._id || item.id) === String(filters.district_id));
      let distName = d?.name || d?.district_name;
      if (!distName) {
        const f = franchiseeList.find(item => String(item.address?.district_id) === String(filters.district_id));
        if (f?.address?.district_name) distName = f.address.district_name;
      }
      add('district_id', `District: ${distName || filters.district_id}`);
    }

    // 4. Franchisee
    if (filters.franchisee_id) {
      const f = franchiseeList.find(item => String(item._id || item.id) === String(filters.franchisee_id));
      const fName = f?.business_name || f?.name || f?.franchisee_name;
      add('franchisee_id', `Franchisee: ${fName || filters.franchisee_id}`);
    }

    // 5. Warehouse
    if (filters.warehouse_id) {
      const w = warehouses.find(item => String(item._id || item.id) === String(filters.warehouse_id));
      const wName = w?.name || w?.warehouse_name;
      add('warehouse_id', `Warehouse: ${wName || filters.warehouse_id}`);
    }

    // 6. Industry Type
    if (filters.industry_type_id) {
      const ind = industryTypes.find(item => String(item._id || item.id) === String(filters.industry_type_id))
        || catalogTree.find(item => String(item._id || item.id) === String(filters.industry_type_id));
      const indName = ind?.name;
      add('industry_type_id', `Industry: ${indName || filters.industry_type_id}`);
    }

    // 7. Category
    if (filters.category_id) {
      let catName = projectCategories.find(item => String(item._id || item.id) === String(filters.category_id))?.name;
      if (!catName && catalogTree.length > 0) {
        for (const ind of catalogTree) {
          const c = (ind.categories || []).find(c => String(c._id || c.id) === String(filters.category_id));
          if (c) { catName = c.name; break; }
        }
      }
      add('category_id', `Category: ${catName || filters.category_id}`);
    }

    // 8. Subcategory
    if (filters.subcategory_id) {
      let subName = projectSubcategories.find(item => String(item._id || item.id) === String(filters.subcategory_id))?.name;
      if (!subName && catalogTree.length > 0) {
        for (const ind of catalogTree) {
          for (const c of ind.categories || []) {
            const s = (c.subcategories || []).find(s => String(s._id || s.id) === String(filters.subcategory_id));
            if (s) { subName = s.name; break; }
          }
          if (subName) break;
        }
      }
      add('subcategory_id', `Subcategory: ${subName || filters.subcategory_id}`);
    }

    // 9. System Type
    if (filters.system_type_id) {
      let sys = systemTypes.find(item => String(item._id || item.id || item.subcategory_type_id) === String(filters.system_type_id));
      let sysName = sys?.name || sys?.type?.name || (typeof sys?.type === 'string' ? sys.type : null);
      if (!sysName && catalogTree.length > 0) {
        for (const ind of catalogTree) {
          for (const c of ind.categories || []) {
            for (const s of c.subcategories || []) {
              const mt = (s.mappedTypes || []).find(m => String(m.subcategory_type_id || m.id || m._id) === String(filters.system_type_id));
              if (mt) {
                sysName = mt.name || mt.type?.name || (typeof mt.type === 'string' ? mt.type : null);
                break;
              }
            }
            if (sysName) break;
          }
          if (sysName) break;
        }
      }
      add('system_type_id', `System Type: ${sysName || filters.system_type_id}`);
    }

    // 10. Project Range
    if (filters.project_range_id) {
      let rg = projectRanges.find(item => String(item._id || item.id) === String(filters.project_range_id));
      let rgName = rg?.range_label || (rg?.min_value != null ? `${rg.min_value}–${rg.max_value} ${rg.unit_symbol || rg.unit_id?.symbol || 'kW'}` : null);
      if (!rgName && catalogTree.length > 0) {
        for (const ind of catalogTree) {
          for (const c of ind.categories || []) {
            for (const s of c.subcategories || []) {
              for (const mt of s.mappedTypes || []) {
                const r = (mt.ranges || []).find(r => String(r._id || r.id) === String(filters.project_range_id));
                if (r) {
                  rgName = r.range_label || `${r.min_value}–${r.max_value} ${r.unit_symbol || r.unit_id?.symbol || 'kW'}`;
                  break;
                }
              }
              if (rgName) break;
            }
            if (rgName) break;
          }
          if (rgName) break;
        }
      }
      add('project_range_id', `Project Range: ${rgName || filters.project_range_id}`);
    }

    // 11. Kit
    if (filters.kit_id) {
      const k = kits.find(item => String(item._id || item.id) === String(filters.kit_id));
      const kitName = k?.name || k?.kit_name || k?.combo_name || k?.title;
      add('kit_id', `Kit: ${kitName || filters.kit_id}`);
    }

    // 12. kW Capacity
    if (filters.kw_capacity) {
      add('kw_capacity', `Capacity: ${filters.kw_capacity} kW`);
    }

    // 13. Project Type
    if (filters.project_type_id) {
      add('project_type_id', `Project Type: ${filters.project_type_id}`);
    }

    // 14. Application Type
    if (filters.application_type_id) {
      add('application_type_id', `Application: ${filters.application_type_id}`);
    }

    // 15. EPC Type
    if (filters.epc_type_id) {
      const et = epcTypes.find(item => String(item._id || item.id) === String(filters.epc_type_id));
      add('epc_type_id', `EPC Type: ${et?.name || filters.epc_type_id}`);
    }

    return chips;
  }, [
    filters,
    allStates,
    allDistricts,
    franchiseeList,
    warehouses,
    industryTypes,
    projectCategories,
    projectSubcategories,
    systemTypes,
    projectRanges,
    kits,
    catalogTree,
    epcTypes,
  ]);

  // ── Derived aggregations ────────────────────────────────────────────────
  const kpiData = useMemo(() => {
    const summary = networkSummary;
    const tracker = performanceTracker;
    const whs = warehouses;

    const activeWarehouses = whs.filter(w => w.is_active).length;
    const totalFranchisees = summary?.network_overview?.total_resellers || 0;
    const activeFranchisees = summary?.network_overview?.active_resellers || 0;
    const totalOrders = summary?.order_metrics?.b2b_procurement_orders_count || 0;

    const totalTarget = tracker?.summary?.total_target || 0;
    const totalEligible = tracker?.summary?.total_eligible || 0;
    const avgAchievement = tracker?.summary?.avg_achievement || 0;

    const adoptingCount = tracker?.franchisees?.filter(f =>
      f.eligible_quantity > 0
    ).length || 0;
    const adoptionPct = activeFranchisees > 0
      ? Math.round((adoptingCount / activeFranchisees) * 100)
      : 0;

    const expansionPct = activeFranchisees > 0 && totalFranchisees > 0
      ? Math.round((activeFranchisees / totalFranchisees) * 100)
      : 0;

    return {
      clusterCoverage: { covered: 0, planned: 0, note: 'Calculated from geolocation data' },
      stateCoverage: { covered: allStates.filter(s => s.is_active).length, planned: allStates.length },
      districtCoverage: { covered: allDistricts.filter(d => d.is_active).length, planned: allDistricts.length },
      activeFranchisees,
      totalFranchisees,
      kitGoal: totalTarget,
      kitAchievement: totalEligible,
      achievementPct: avgAchievement,
      activeWarehouses,
      operationalShops: franchiseeList.filter(f => f.is_operational).length,
      totalOrders,
      kitsSold: totalEligible,
      kitAdoptionPct: adoptionPct,
      expansionPct,
      // EPC derived metrics
      totalEpcAccounts: epcTypesSummary?.total_accounts || 0,
      totalEpcLeads: epcTypesSummary?.total_leads || 0,
      totalEpcTypes: epcTypesSummary?.total_types || 0,
      classifiedEpcs: epcTypesSummary?.total_classified_epcs || 0,
      unclassifiedEpcs: epcTypesSummary?.total_unclassified_epcs || 0,
    };
  }, [networkSummary, performanceTracker, warehouses, allStates, allDistricts, franchiseeList, epcTypesSummary]);

  return {
    // Filter state
    filters,
    setFilter,
    period,
    setPeriod,
    resetFilters,
    activeFilterChips,

    // Drill-down state
    drillLevel,
    drillPath,
    drillInto,
    drillBackTo,

    // Raw data
    networkSummary,
    performanceTracker,
    locationPerformance,
    franchiseeList,
    warehouses,
    industryTypes,
    allStates,
    allDistricts,

    // Catalog dropdown options (dependent — populated when parent filter is set)
    projectCategories,
    projectSubcategories,
    systemTypes,
    projectRanges,
    catalogTree,
    kits,

    // EPC Types (bifurcated classification master — live counts from backend)
    epcTypes,
    epcTypesSummary,

    // Derived
    kpiData,

    // Async
    loading,
    errors,
    refetch: {
      summary: fetchNetworkSummary,
      performance: fetchPerformance,
      franchisees: fetchFranchisees,
      warehouses: fetchWarehouses,
      epcTypes: fetchEpcTypes,
    },
  };
}

