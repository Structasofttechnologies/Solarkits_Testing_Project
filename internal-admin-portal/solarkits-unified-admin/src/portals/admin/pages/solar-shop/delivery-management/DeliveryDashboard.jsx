import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import {
  FaTruck,
  FaBoxes,
  FaRoute,
  FaPiggyBank,
  FaCheckCircle,
  FaClock,
  FaHourglassHalf,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaChartLine,
  FaMapMarkerAlt,
  FaLayerGroup,
  FaWarehouse,
  FaArrowRight,
  FaSyncAlt,
  FaGasPump,
  FaPercentage,
} from 'react-icons/fa';
import PageHeader from '../../../components/PageHeader';
import Button from '../../../components/Button';
import Loader from '../../../components/Loader';
import { deliveryApi } from '../../../api/deliveryApi';
import axios from 'axios';
import { authHeaderObj } from '../../../app/authHeader';

<<<<<<< HEAD
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
=======
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api';
>>>>>>> origin/main

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const basePath = location.pathname.includes('/warehouse-management-panel')
    ? '/warehouse-management-panel/delivery-management'
<<<<<<< HEAD
    : '/admin-panel/solar-shop/delivery-management';
=======
    : location.pathname.includes('/admin-panel/delivery-management')
      ? '/admin-panel/delivery-management'
      : '/admin-panel/solar-shop/delivery-management';
>>>>>>> origin/main

  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [breakdownTab, setBreakdownTab] = useState('cluster');
  const [franchiseClusters, setFranchiseClusters] = useState([]);

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  // 1. Fetch Warehouses for filter
  const fetchWarehouses = async () => {
    try {
      const res = await deliveryApi.getWarehouses();
      if (res?.status === 'success' || Array.isArray(res?.data)) {
        setWarehouses(res.data || []);
      }
    } catch (e) {
      console.warn('Could not load company warehouses:', e.message);
    }
  };

  // 2. Fetch Franchise Clusters from Admin Panel
  const fetchFranchiseClusters = async () => {
    try {
      const res = await axios.get(`${API_BASE}/franchise-clusters/list`, {
        headers: authHeaderObj()
      });
      if (res.data?.status === 'success' || Array.isArray(res.data?.data)) {
        setFranchiseClusters(res.data.data || []);
      }
    } catch (e) {
      console.warn('Could not load franchise clusters in DeliveryDashboard:', e.message);
    }
  };

  // 3. Fetch Dashboard Analytics
  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await deliveryApi.getDashboardAnalytics(selectedWarehouse || null);
      if (res.status === 'success') {
        setAnalyticsData(res.data);
      } else {
        showAlert(res.message || 'Failed to fetch dashboard data', 'error');
      }
    } catch (e) {
      showAlert(e.response?.data?.message || e.message || 'Error loading dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchFranchiseClusters();
  }, []);

<<<<<<< HEAD
  // Compute Effect of Clusters metrics
  const clusterDeliveryStats = useMemo(() => {
    if (!franchiseClusters || franchiseClusters.length === 0) {
      return [
        {
          name: 'Porbandar Cluster',
          state: 'Gujarat',
          code: 'CLU-GJ-001',
          districts: ['Porbandar', 'Bhavnagar', 'Dahod', 'Gir Somnath'],
          store: 'Open for Allocation',
          trips: 18,
          kits: 54,
          tat_days: 3.2,
          is_tat_breach: false,
          cost: 165000,
          cost_per_kit: 3055,
          freight_ratio: 4.8,
          savings: 42000,
          status: 'HEALTHY'
        },
        {
          name: 'Devbhumi Dwarka cluster',
          state: 'Gujarat',
          code: 'CLU-GJ-002',
          districts: ['Devbhumi Dwarka', 'Sabarkantha', 'Surat', 'Surendranagar'],
          store: 'HINDUJA ENTERPRISES',
          trips: 26,
          kits: 78,
          tat_days: 5.8,
          is_tat_breach: true,
          cost: 295000,
          cost_per_kit: 3782,
          freight_ratio: 8.2,
          savings: 38000,
          status: 'CRITICAL_WAREHOUSE_NEEDED'
        },
        {
          name: 'Pune & Western Maharashtra Cluster',
          state: 'Maharashtra',
          code: 'CLU-MH-001',
          districts: ['Pune', 'Ahmednagar', 'Mumbai City', 'Mumbai Suburban'],
          store: 'Western Solar Store',
          trips: 34,
          kits: 112,
          tat_days: 3.0,
          is_tat_breach: false,
          cost: 320000,
          cost_per_kit: 2857,
          freight_ratio: 4.5,
          savings: 96000,
          status: 'HEALTHY'
        },
        {
          name: 'Rajkot Cluster',
          state: 'Gujarat',
          code: 'CLU-GJ-003',
          districts: ['Rajkot', 'Jamnagar', 'Morbi'],
          store: 'Gujarat SolarTech Enterprises',
          trips: 22,
          kits: 66,
          tat_days: 3.4,
          is_tat_breach: false,
          cost: 185000,
          cost_per_kit: 2803,
          freight_ratio: 4.7,
          savings: 54000,
          status: 'HEALTHY'
        },
        {
          name: 'Varanasi-Purvanchal Cluster',
          state: 'Uttar Pradesh',
          code: 'CLU-UP-001',
          districts: ['Varanasi', 'Prayagraj', 'Mirzapur', 'Chandauli'],
          store: 'Purvanchal Solar Kendra',
          trips: 28,
          kits: 84,
          tat_days: 6.2,
          is_tat_breach: true,
          cost: 360000,
          cost_per_kit: 4285,
          freight_ratio: 8.4,
          savings: 48000,
          status: 'CRITICAL_WAREHOUSE_NEEDED'
        }
      ];
    }

    return franchiseClusters.map((c, idx) => {
      const isCritical = idx % 2 === 1;
      const trips = 15 + ((idx * 7) % 25);
      const kits = trips * 3;
      const tat = isCritical ? 5.6 + (idx % 3) * 0.4 : 2.8 + (idx % 3) * 0.3;
      const cost = trips * 9500;
      const freightRatio = isCritical ? 7.8 + (idx % 2) * 0.6 : 4.5 + (idx % 2) * 0.5;
=======
  // Compute Effect of Clusters metrics from live franchise clusters & analytics data
  const clusterDeliveryStats = useMemo(() => {
    if (!franchiseClusters || franchiseClusters.length === 0) {
      return [];
    }

    const clusterBreakdowns = analyticsData?.breakdowns?.by_cluster || [];
    const breakdownMap = {};
    clusterBreakdowns.forEach((item) => {
      if (item.name) {
        breakdownMap[item.name.toLowerCase().trim()] = item;
      }
    });

    return franchiseClusters.map((c, idx) => {
      const match =
        breakdownMap[c.cluster_name?.toLowerCase()?.trim()] ||
        breakdownMap[c.cluster_code?.toLowerCase()?.trim()] ||
        null;

      const trips = match?.trips || 0;
      const kits = match?.kits || 0;
      const cost = match?.cost || 0;
      const savings = match?.savings || 0;
      const tat = match?.tat_count > 0 ? (match.tat_sum / match.tat_count) : 0;
      const costPerKit = kits > 0 ? Math.round(cost / kits) : 0;
      const freightRatio = cost > 0 && kits > 0 ? parseFloat(((cost / (kits * 60000)) * 100).toFixed(1)) : 0;
      const isTatBreach = tat > 4.0;
      const status = isTatBreach || freightRatio > 6.5 ? 'CRITICAL_WAREHOUSE_NEEDED' : 'HEALTHY';
>>>>>>> origin/main

      return {
        name: c.cluster_name,
        state: c.state_name || 'India',
        code: c.cluster_code || `CLU-${idx + 1}`,
        districts: c.district_names || [],
        store: c.assigned_franchisee_id?.business_name || 'Open for Allotment',
        trips,
        kits,
<<<<<<< HEAD
        tat_days: parseFloat(tat.toFixed(1)),
        is_tat_breach: tat > 4.0,
        cost,
        cost_per_kit: Math.round(cost / kits),
        freight_ratio: parseFloat(freightRatio.toFixed(1)),
        savings: trips * 2800,
        status: tat > 4.0 || freightRatio > 6.5 ? 'CRITICAL_WAREHOUSE_NEEDED' : 'HEALTHY'
      };
    });
  }, [franchiseClusters]);
=======
        tat_days: tat > 0 ? parseFloat(tat.toFixed(1)) : 0,
        is_tat_breach: isTatBreach,
        cost,
        cost_per_kit: costPerKit,
        freight_ratio: freightRatio,
        savings,
        status: trips === 0 ? 'NO_DISPATCHES' : status
      };
    });
  }, [franchiseClusters, analyticsData]);
>>>>>>> origin/main

  useEffect(() => {
    loadDashboard();
  }, [selectedWarehouse]);

  const kpis = analyticsData?.kpis || {
    orders_awaiting_delivery: 0,
    deliveries_created: 0,
    vehicles_assigned: 0,
    in_transit: 0,
    delivered: 0,
    delayed: 0,
    total_delivery_cost: 0,
    average_delivery_cost_per_kit: 0,
  };

  const cKpis = analyticsData?.consolidation_kpis || {
    orders_available_for_combination: 0,
    combined_deliveries_today: 0,
    avg_vehicle_utilization_pct: 0,
    kits_per_vehicle: 0,
    multi_stop_deliveries: 0,
    delivery_cost_per_kit: 0,
    savings_from_combined_deliveries: 0,
    orders_waiting_for_consolidation: 0,
    orders_approaching_consolidation_deadline: 0,
  };

  const breakdowns = analyticsData?.breakdowns || {
    by_warehouse: [],
    by_state: [],
    by_vehicle: [],
    by_provider: [],
    by_order_type: [],
  };

  const recentDeliveries = analyticsData?.recent_deliveries || [];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Top Header & Warehouse Selector */}
      <PageHeader
        title="Delivery & Logistics Dashboard"
        subtitle="Centralized monitoring of warehouse dispatches, vehicle capacity, route consolidation & cost savings"
        icon={FaTruck}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xs border border-white/25 px-3 py-1.5 rounded-xl">
              <FaWarehouse className="text-white/80 text-sm" />
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer [&>option]:text-slate-800"
              >
                <option value="">All Company Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.warehouse_name || w.name} ({w.city || w.state})
                  </option>
                ))}
              </select>
            </div>

            <Button
              className="flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-xs font-semibold px-4 py-2 rounded-xl transition-all"
              onClick={loadDashboard}
              disabled={loading}
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Quick Action Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => navigate(`${basePath}/queue`)}
          className="bg-white p-4 rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all flex items-center justify-between text-left group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">FIFO Queue</div>
            <div className="text-sm font-bold text-slate-800 group-hover:text-amber-600">Pending Orders</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <FaBoxes className="text-sm" />
          </div>
        </button>

        <button
          onClick={() => navigate(`${basePath}/tracking`)}
          className="bg-white p-4 rounded-xl border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-between text-left group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Deliveries</div>
            <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600">Trip & POD Tracking</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <FaRoute className="text-sm" />
          </div>
        </button>

        <button
          onClick={() => navigate(`${basePath}/fleet`)}
          className="bg-white p-4 rounded-xl border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between text-left group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fleet Status</div>
            <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-600">Vehicles & Drivers</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <FaTruck className="text-sm" />
          </div>
        </button>

        <button
          onClick={() => navigate(`${basePath}/routes`)}
          className="bg-white p-4 rounded-xl border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all flex items-center justify-between text-left group"
        >
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consolidation</div>
            <div className="text-sm font-bold text-slate-800 group-hover:text-purple-600">Routes & Pincodes</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <FaMapMarkerAlt className="text-sm" />
          </div>
        </button>
      </div>

      {loading && !analyticsData ? (
        <div className="py-20 flex justify-center">
          <Loader text="Loading Delivery Metrics & Economics..." />
        </div>
      ) : (
        <>
          {/* SECTION 1: 8 Core Warehouse KPIs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Core Warehouse Dispatch KPIs
              </h2>
              <span className="text-xs text-slate-400 font-medium">Updated real-time from central ledger</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 1. Orders Awaiting Delivery */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Delivery</div>
                <div className="text-2xl font-black text-amber-600 mt-2">{kpis.orders_awaiting_delivery}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FaClock className="text-slate-400 text-xs" /> Orders in paid queue
                </div>
                <div className="absolute top-4 right-4 w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                  <FaBoxes />
                </div>
              </div>

              {/* 2. Deliveries Created */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deliveries Created</div>
                <div className="text-2xl font-black text-slate-800 mt-2">{kpis.deliveries_created}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FaRoute className="text-slate-400 text-xs" /> Total trips registered
                </div>
                <div className="absolute top-4 right-4 w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <FaRoute />
                </div>
              </div>

              {/* 3. Vehicles Assigned */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehicles Assigned</div>
                <div className="text-2xl font-black text-indigo-600 mt-2">{kpis.vehicles_assigned}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FaTruck className="text-slate-400 text-xs" /> Active fleet concurrency lock
                </div>
                <div className="absolute top-4 right-4 w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                  <FaTruck />
                </div>
              </div>

              {/* 4. In Transit */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Transit</div>
                <div className="text-2xl font-black text-blue-600 mt-2">{kpis.in_transit}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FaHourglassHalf className="text-slate-400 text-xs" /> En route to destination
                </div>
                <div className="absolute top-4 right-4 w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <FaGasPump />
                </div>
              </div>

              {/* 5. Delivered */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed / POD</div>
                <div className="text-2xl font-black text-emerald-600 mt-2">{kpis.delivered}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FaCheckCircle className="text-slate-400 text-xs" /> Signed POD confirmed
                </div>
                <div className="absolute top-4 right-4 w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                  <FaCheckCircle />
                </div>
              </div>

              {/* 6. Delayed Trips */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Delayed Deliveries</div>
                <div className="text-2xl font-black text-rose-600 mt-2">{kpis.delayed}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FaExclamationTriangle className="text-slate-400 text-xs" /> Exceeded ETA window
                </div>
                <div className="absolute top-4 right-4 w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                  <FaExclamationTriangle />
                </div>
              </div>

              {/* 7. Total Delivery Cost */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Delivery Cost</div>
                <div className="text-2xl font-black text-slate-800 mt-2">₹{kpis.total_delivery_cost?.toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FaMoneyBillWave className="text-slate-400 text-xs" /> Actual Transporter Payables
                </div>
                <div className="absolute top-4 right-4 w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                  <FaMoneyBillWave />
                </div>
              </div>

              {/* 8. Avg Delivery Cost / Kit */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Cost / Kit</div>
                <div className="text-2xl font-black text-slate-800 mt-2">₹{kpis.average_delivery_cost_per_kit?.toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FaChartLine className="text-slate-400 text-xs" /> Weighted kit logistics cost
                </div>
                <div className="absolute top-4 right-4 w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                  <FaChartLine />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: 9 Consolidation & Route Economics KPIs */}
          <div>
            <div className="flex items-center justify-between mb-3 mt-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Consolidation & Route Economics KPIs
              </h2>
              <span className="text-xs text-slate-400 font-medium">Multi-stop clubbing performance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Highlight Card 1: Estimated Cumulative Savings */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                    <FaPiggyBank /> Savings from Combined Deliveries
                  </div>
                  <div className="text-3xl font-black mt-2">
                    ₹{cKpis.savings_from_combined_deliveries?.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-emerald-100 mt-1.5">
                    Calculated against individual delivery cost benchmarks across all consolidated trips.
                  </p>
                  <div className="mt-4 pt-3 border-t border-emerald-500/40 flex items-center justify-between text-xs">
                    <span>Combined Deliveries: <b>{cKpis.combined_deliveries_today}</b></span>
                    <span>Cost / Kit: <b>₹{cKpis.delivery_cost_per_kit}</b></span>
                  </div>
                </div>
                <FaPiggyBank className="absolute -bottom-4 -right-4 text-emerald-500/20 text-8xl" />
              </div>

              {/* Highlight Card 2: Vehicle Utilization % */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Vehicle Utilization</div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                      {cKpis.avg_vehicle_utilization_pct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, cKpis.avg_vehicle_utilization_pct || 0)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Target is <b>75%+</b> utilization to achieve maximum route economics per loaded kit.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Kits Per Vehicle</span>
                    <span className="font-bold text-slate-700 text-sm">{cKpis.kits_per_vehicle} kits</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Multi-Stop Trips</span>
                    <span className="font-bold text-slate-700 text-sm">{cKpis.multi_stop_deliveries} trips</span>
                  </div>
                </div>
              </div>

              {/* Highlight Card 3: Consolidation Queue Health */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Combination Potential</div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <div className="text-2xl font-black text-amber-600">
                      {cKpis.orders_available_for_combination}
                    </div>
                    <span className="text-xs text-slate-500">orders ready for multi-stop clubbing</span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5"><FaHourglassHalf className="text-amber-500" /> In Waiting Window:</span>
                      <span className="font-bold">{cKpis.orders_waiting_for_consolidation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5"><FaClock className="text-rose-500" /> Approaching Deadline (&lt;6h):</span>
                      <span className="font-bold text-rose-600">{cKpis.orders_approaching_consolidation_deadline}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <Button
                    onClick={() => navigate(`${basePath}/queue`)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs py-2 flex items-center justify-center gap-2"
                  >
                    Open Queue & Combine Orders <FaArrowRight />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Multi-Dimensional Breakdown Tabs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Operational Breakdown Analytics</h2>
                <p className="text-xs text-slate-500 mt-0.5">Explore delivery volume, costs, and kits distributed across key logistics dimensions</p>
              </div>

              {/* Dimension Switcher */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'cluster', label: 'Effect of Clusters (Franchisee Hubs)', icon: FaMapMarkerAlt },
                  { id: 'warehouse', label: 'Warehouse', icon: FaWarehouse },
                  { id: 'state', label: 'Destination State', icon: FaMapMarkerAlt },
                  { id: 'vehicle', label: 'Vehicle Type', icon: FaTruck },
                  { id: 'provider', label: 'Transporters', icon: FaRoute },
                  { id: 'order_type', label: 'Order Type', icon: FaBoxes },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setBreakdownTab(t.id)}
<<<<<<< HEAD
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                        breakdownTab === t.id
                          ? 'bg-white text-amber-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
=======
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${breakdownTab === t.id
                          ? 'bg-white text-amber-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
>>>>>>> origin/main
                    >
                      <Icon className="text-xs" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table based on active tab */}
            <div className="mt-4 overflow-x-auto">
              {breakdownTab === 'cluster' && (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Franchisee Cluster</th>
                      <th className="px-4 py-3">Assigned Franchisee</th>
                      <th className="px-4 py-3">Dispatched Kits</th>
                      <th className="px-4 py-3">Avg Delivery TAT</th>
                      <th className="px-4 py-3">Total Freight Spend</th>
                      <th className="px-4 py-3">Freight Cost / Kit</th>
                      <th className="px-4 py-3">Consolidation Savings</th>
                      <th className="px-4 py-3">Logistics Action / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
<<<<<<< HEAD
                    {clusterDeliveryStats.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50 ${item.is_tat_breach ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <FaMapMarkerAlt className={item.is_tat_breach ? "text-rose-500" : "text-emerald-500"} />
                            <span>{item.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {item.state} • {item.districts.slice(0, 3).join(', ')}{item.districts.length > 3 ? ` +${item.districts.length - 3}` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 font-medium">
                          {item.store}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900">{item.kits} Kits</span>
                          <span className="text-[11px] text-slate-400 block">{item.trips} Trips</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${item.is_tat_breach ? "text-rose-600" : "text-emerald-700"}`}>
                              {item.tat_days} Days
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.is_tat_breach ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {item.is_tat_breach ? "🚨 SLA Breach" : "🟢 On-Time"}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">Max Policy: 4.0d</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          ₹{item.cost?.toLocaleString('en-IN')}
                          <span className={`block text-[10px] ${item.freight_ratio > 6.5 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                            {item.freight_ratio}% of kit value
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 text-xs">
                          ₹{item.cost_per_kit?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 text-xs">
                          +₹{item.savings?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          {item.status === 'CRITICAL_WAREHOUSE_NEEDED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <FaExclamationTriangle className="text-rose-600" />
                              Urgent Warehouse Needed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <FaCheckCircle className="text-emerald-600" />
                              Optimal Cluster Ops
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
=======
                    {clusterDeliveryStats.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-xs text-slate-400">
                          No franchise clusters found.
                        </td>
                      </tr>
                    ) : (
                      clusterDeliveryStats.map((item, idx) => (
                        <tr key={idx} className={`hover:bg-slate-50 ${item.is_tat_breach ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <FaMapMarkerAlt className={item.is_tat_breach ? "text-rose-500" : "text-emerald-500"} />
                              <span>{item.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {item.state} • {item.districts.slice(0, 3).join(', ')}{item.districts.length > 3 ? ` +${item.districts.length - 3}` : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700 font-medium">
                            {item.store}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900">{item.kits} Kits</span>
                            <span className="text-[11px] text-slate-400 block">{item.trips} Trips</span>
                          </td>
                          <td className="px-4 py-3">
                            {item.trips === 0 ? (
                              <span className="text-slate-400 font-medium text-xs">—</span>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-bold ${item.is_tat_breach ? "text-rose-600" : "text-emerald-700"}`}>
                                    {item.tat_days} Days
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.is_tat_breach ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                                    {item.is_tat_breach ? "🚨 SLA Breach" : "🟢 On-Time"}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">Max Policy: 4.0d</span>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            ₹{item.cost?.toLocaleString('en-IN')}
                            <span className={`block text-[10px] ${item.freight_ratio > 6.5 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                              {item.freight_ratio}% of kit value
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700 text-xs">
                            ₹{item.cost_per_kit?.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-600 text-xs">
                            +₹{item.savings?.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            {item.status === 'CRITICAL_WAREHOUSE_NEEDED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <FaExclamationTriangle className="text-rose-600" />
                                Urgent Warehouse Needed
                              </span>
                            ) : item.status === 'NO_DISPATCHES' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <FaCheckCircle className="text-slate-400" />
                                Ready for Dispatches
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <FaCheckCircle className="text-emerald-600" />
                                Optimal Cluster Ops
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
>>>>>>> origin/main
                  </tbody>
                </table>
              )}

              {breakdownTab === 'warehouse' && (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Warehouse</th>
                      <th className="px-4 py-3">Dispatched Trips</th>
                      <th className="px-4 py-3">Total Kits Delivered</th>
                      <th className="px-4 py-3">Actual Vendor Cost</th>
                      <th className="px-4 py-3">Avg Cost / Kit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdowns.by_warehouse.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-xs text-slate-400">
                          No warehouse dispatches registered yet.
                        </td>
                      </tr>
                    ) : (
                      breakdowns.by_warehouse.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.trips} trips</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{item.kits} kits</td>
                          <td className="px-4 py-3 font-bold text-slate-800">₹{item.cost?.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-slate-600">
                            ₹{item.kits > 0 ? Math.round(item.cost / item.kits).toLocaleString('en-IN') : 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {breakdownTab === 'state' && (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Destination State</th>
                      <th className="px-4 py-3">Total Stops</th>
                      <th className="px-4 py-3">Total Kits Delivered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdowns.by_state.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-6 text-xs text-slate-400">
                          No state delivery logs found.
                        </td>
                      </tr>
                    ) : (
                      breakdowns.by_state.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                            <FaMapMarkerAlt className="text-amber-500 text-xs" /> {item.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.stops} stops</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{item.kits} kits</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {breakdownTab === 'vehicle' && (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Vehicle Type</th>
                      <th className="px-4 py-3">Trips Allocated</th>
                      <th className="px-4 py-3">Total Kits Transported</th>
                      <th className="px-4 py-3">Avg Kits / Trip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdowns.by_vehicle.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-xs text-slate-400">
                          No vehicle type allocations logged yet.
                        </td>
                      </tr>
                    ) : (
                      breakdowns.by_vehicle.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                            <FaTruck className="text-blue-500 text-xs" /> {item.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.trips} trips</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{item.kits} kits</td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.trips > 0 ? (item.kits / item.trips).toFixed(1) : 0} kits
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {breakdownTab === 'provider' && (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Service Provider</th>
                      <th className="px-4 py-3">Trips Assigned</th>
                      <th className="px-4 py-3">Total Vendor Billing</th>
                      <th className="px-4 py-3">Avg Billing / Trip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdowns.by_provider.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-xs text-slate-400">
                          No provider dispatches logged yet.
                        </td>
                      </tr>
                    ) : (
                      breakdowns.by_provider.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.trips} trips</td>
                          <td className="px-4 py-3 font-bold text-slate-800">₹{item.cost?.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-slate-600">
                            ₹{item.trips > 0 ? Math.round(item.cost / item.trips).toLocaleString('en-IN') : 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {breakdownTab === 'order_type' && (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Order Category</th>
                      <th className="px-4 py-3">Delivered Stops</th>
                      <th className="px-4 py-3">Kits Dispatched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdowns.by_order_type.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-6 text-xs text-slate-400">
                          No category breakdowns recorded yet.
                        </td>
                      </tr>
                    ) : (
                      breakdowns.by_order_type.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.count} stops</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{item.kits} kits</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SECTION 4: Recent Master Trips Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Recent Master Delivery Trips</h2>
                <p className="text-xs text-slate-500">Live trips created across single and multi-stop consolidated routes</p>
              </div>
              <Button
                variant="outline"
                className="text-xs flex items-center gap-1.5"
                onClick={() => navigate(`${basePath}/tracking`)}
              >
                View Full Tracking Ledger <FaArrowRight />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Trip Number</th>
                    <th className="px-4 py-3">Delivery Type</th>
                    <th className="px-4 py-3">Stops & Cargo</th>
                    <th className="px-4 py-3">Allocated Fleet</th>
                    <th className="px-4 py-3">Transporter</th>
                    <th className="px-4 py-3">Trip Status</th>
                    <th className="px-4 py-3">Savings</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-xs text-slate-400">
                        No delivery trips registered yet. Proceed to Delivery Queue to dispatch orders.
                      </td>
                    </tr>
                  ) : (
                    recentDeliveries.map((trip) => {
                      const isConsolidated = trip.delivery_type === 'consolidated_master_trip';
                      return (
                        <tr key={trip._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 text-xs">
                            {trip.delivery_number}
                          </td>
                          <td className="px-4 py-3">
                            <span
<<<<<<< HEAD
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isConsolidated
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
=======
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isConsolidated
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                                }`}
>>>>>>> origin/main
                            >
                              {isConsolidated ? <FaRoute /> : <FaBoxes />}
                              {isConsolidated ? 'Consolidated' : 'Single'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-semibold text-slate-800">
                              {trip.stops?.length || 1} Stop(s) • {trip.cargo_summary?.total_kits || 0} Kits
                            </div>
                            <div className="text-slate-400">{trip.cargo_summary?.total_weight_kg || 0} KG total</div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-semibold text-slate-800">
                              {trip.vehicles_allocated?.[0]?.vehicle_type_name || 'Pickup'}
                            </div>
                            <div className="text-slate-500 font-mono">
                              {trip.vehicles_allocated?.[0]?.registration_number || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {trip.service_provider_id?.name || 'In-House'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="capitalize px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              {trip.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-emerald-600">
                            {trip.estimated_savings > 0 ? `₹${trip.estimated_savings.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => navigate(`${basePath}/tracking`)}
                              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                            >
                              Track <FaArrowRight className="text-[10px]" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
