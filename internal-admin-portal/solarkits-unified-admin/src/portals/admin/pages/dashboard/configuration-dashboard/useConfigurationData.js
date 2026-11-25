/**
 * useConfigurationData.js
 *
 * Hook for Configuration Dashboard:
 * - Loads active states and cascading districts
 * - Manages regional filter state (State & District)
 * - Fetches regional context (BDEs, Warehouses, Franchisees in selected region)
 * - Filters configuration modules by search, category, and regional filter
 * - Calculates top KPI stats
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { authHeaderObj } from '../../../app/authHeader';
import { CONFIG_MODULES, CONFIG_CATEGORIES } from './configModulesData';
import { bdeApi } from '../../../api/bdeApi';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function useConfigurationData() {
  // ── Filter State ────────────────────────────────────────────────────────────
  const [selectedState, setSelectedState] = useState(null);       // { id, name }
  const [selectedDistrict, setSelectedDistrict] = useState(null); // { id, name }
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRegionalOnly, setIsRegionalOnly] = useState(false);

  // ── Geolocation Reference Data ──────────────────────────────────────────────
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // ── Regional Context Data ───────────────────────────────────────────────────
  const [regionalStats, setRegionalStats] = useState({
    bdeCount: 0,
    warehouseCount: 0,
    franchiseeCount: 0,
    clusters: 0,
    loading: false,
  });

  // ── Fetch Active States on Mount ────────────────────────────────────────────
  const fetchStates = useCallback(async () => {
    setLoadingGeo(true);
    try {
      const res = await bdeApi.getStates();
      const rawStates = res?.data || res?.states || [];
      // Normalize state objects
      const cleanStates = rawStates.map(s => ({
        id: s._id || s.id || s.state_id,
        name: s.name || s.state_name || s.title || 'Unknown State',
        code: s.code || s.state_code || '',
      })).filter(s => Boolean(s.id && s.name));
      
      // Sort alphabetically
      cleanStates.sort((a, b) => a.name.localeCompare(b.name));
      setStates(cleanStates);
    } catch (err) {
      console.warn('Failed to load active states for Configuration Dashboard:', err);
    } finally {
      setLoadingGeo(false);
    }
  }, []);

  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  // ── Fetch Districts when State changes ──────────────────────────────────────
  useEffect(() => {
    if (!selectedState?.id) {
      setDistricts([]);
      setSelectedDistrict(null);
      return;
    }

    let isMounted = true;
    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const res = await bdeApi.getDistricts(selectedState.id);
        const rawDistricts = res?.data || res?.districts || [];
        const cleanDistricts = rawDistricts.map(d => ({
          id: d._id || d.id || d.district_id,
          name: d.name || d.district_name || d.title || 'Unknown District',
        })).filter(d => Boolean(d.id && d.name));

        cleanDistricts.sort((a, b) => a.name.localeCompare(b.name));
        if (isMounted) {
          setDistricts(cleanDistricts);
          setSelectedDistrict(null); // Reset district on state change
        }
      } catch (err) {
        console.warn('Failed to load districts for state:', selectedState.name, err);
        if (isMounted) setDistricts([]);
      } finally {
        if (isMounted) setLoadingDistricts(false);
      }
    };

    fetchDistricts();
    return () => { isMounted = false; };
  }, [selectedState]);

  // ── Fetch Regional Context Stats when State or District changes ─────────────
  useEffect(() => {
    if (!selectedState?.id) {
      setRegionalStats({
        bdeCount: 0,
        warehouseCount: 0,
        franchiseeCount: 0,
        clusters: 0,
        loading: false,
      });
      return;
    }

    let isMounted = true;
    const fetchRegionalStats = async () => {
      setRegionalStats(prev => ({ ...prev, loading: true }));
      try {
        const headers = { headers: authHeaderObj() };
        const stateName = selectedState.name?.toLowerCase();
        const districtName = selectedDistrict?.name?.toLowerCase();

        // 1. Fetch BDEs
        const bdePromise = axios.get(
          `${API_BASE}/bde/list?unique_id=ADM_BDE_MGMT&req_for=view&limit=500`,
          headers
        ).catch(() => ({ data: { data: [] } }));

        // 2. Fetch Warehouses
        const whPromise = axios.get(
          `${API_BASE}/warehouse/company-warehouses?unique_id=ADM_WAREHOUSES&req_for=view`,
          headers
        ).catch(() => ({ data: { data: [] } }));

        // 3. Fetch Franchisees
        const franPromise = axios.get(
          `${API_BASE}/reseller-mgmt/list?unique_id=ADM_RESELLER&req_for=view&limit=500`,
          headers
        ).catch(() => ({ data: { data: [] } }));

        const [bdeRes, whRes, franRes] = await Promise.all([bdePromise, whPromise, franPromise]);

        if (!isMounted) return;

        // Count BDEs assigned to this state/district
        const allBdes = bdeRes.data?.data?.bdes || bdeRes.data?.data || [];
        const matchingBdes = allBdes.filter(b => {
          const territory = b.territory || {};
          const assignedStates = (territory.states || []).map(s => (s.name || s).toLowerCase());
          const assignedDistricts = (territory.districts || []).map(d => (d.name || d).toLowerCase());

          if (districtName) {
            return assignedDistricts.includes(districtName) || assignedStates.includes(stateName);
          }
          return assignedStates.includes(stateName);
        });

        // Count Warehouses in this state
        const allWh = whRes.data?.data?.warehouses || whRes.data?.data || [];
        const matchingWh = allWh.filter(w => {
          const wState = (w.state || w.address?.state || '').toLowerCase();
          const wDist = (w.district || w.city || w.address?.city || '').toLowerCase();
          if (districtName) {
            return wDist.includes(districtName) || wState.includes(stateName);
          }
          return wState.includes(stateName);
        });

        // Count Franchisees in this state/district
        const allFran = franRes.data?.data?.resellers || franRes.data?.data || [];
        const matchingFran = allFran.filter(f => {
          const fState = (f.state || f.address?.state || '').toLowerCase();
          const fDist = (f.district || f.address?.district || '').toLowerCase();
          if (districtName) {
            return fDist.includes(districtName) || fState.includes(stateName);
          }
          return fState.includes(stateName);
        });

        setRegionalStats({
          bdeCount: matchingBdes.length,
          warehouseCount: matchingWh.length,
          franchiseeCount: matchingFran.length,
          clusters: 1,
          loading: false,
        });
      } catch (err) {
        console.warn('Error fetching regional context stats:', err);
        if (isMounted) {
          setRegionalStats({
            bdeCount: 0,
            warehouseCount: 0,
            franchiseeCount: 0,
            clusters: 0,
            loading: false,
          });
        }
      }
    };

    fetchRegionalStats();
    return () => { isMounted = false; };
  }, [selectedState, selectedDistrict]);

  // ── Filter Modules ──────────────────────────────────────────────────────────
  const filteredModules = useMemo(() => {
    return CONFIG_MODULES.filter(module => {
      // 1. Regional Only Filter
      if (isRegionalOnly && !module.isRegional) {
        return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'all' && module.category !== selectedCategory) {
        return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = module.title.toLowerCase().includes(q);
        const matchDesc = module.description.toLowerCase().includes(q);
        const matchAction = module.primaryAction.toLowerCase().includes(q);
        const matchCategory = module.categoryLabel.toLowerCase().includes(q);
        const matchKeywords = (module.keywords || []).some(k => k.toLowerCase().includes(q));
        const matchRoute = module.route.toLowerCase().includes(q);

        if (!matchTitle && !matchDesc && !matchAction && !matchCategory && !matchKeywords && !matchRoute) {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedCategory, isRegionalOnly]);

  // ── Calculate Top KPIs ──────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const total = CONFIG_MODULES.length;
    const regionalCount = CONFIG_MODULES.filter(m => m.isRegional).length;
    const bdeCount = CONFIG_MODULES.filter(m => m.category === 'bde').length;
    const solarshopCount = CONFIG_MODULES.filter(m =>
      ['solarshop', 'franchisee', 'delivery', 'margin-quotes'].includes(m.category)
    ).length;
    const solarkitsCount = CONFIG_MODULES.filter(m => m.category === 'solarkits').length;

    return {
      totalModules: total,
      regionalModules: regionalCount,
      bdeModules: bdeCount,
      productShopModules: solarkitsCount + solarshopCount,
      activeStatesCount: states.length,
    };
  }, [states.length]);

  // ── Reset All Filters ───────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setSelectedState(null);
    setSelectedDistrict(null);
    setSearchQuery('');
    setSelectedCategory('all');
    setIsRegionalOnly(false);
  }, []);

  return {
    // Filters & Selectors
    selectedState,
    setSelectedState,
    selectedDistrict,
    setSelectedDistrict,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isRegionalOnly,
    setIsRegionalOnly,
    resetFilters,

    // Geolocation Options
    states,
    districts,
    loadingGeo,
    loadingDistricts,

    // Data
    modules: filteredModules,
    categories: CONFIG_CATEGORIES,
    regionalStats,
    kpiStats,
    fetchStates,
  };
}
