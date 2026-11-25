import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import { FaRoute, FaPlus, FaTrash, FaCheckCircle, FaTimesCircle, FaMapMarkedAlt, FaClock } from 'react-icons/fa';
import PageHeader from '../../../components/PageHeader';
import Button from '../../../components/Button';
import CustomInput from '../../../components/CustomInput';
import Drawer from '../../../components/Drawer';
import Loader from '../../../components/Loader';
import { deliveryApi } from '../../../api/deliveryApi';
import axios from 'axios';
import { authHeaderObj } from '../../../app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RouteConsolidationSettings() {
  const dispatch = useDispatch();
  const [routes, setRoutes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form
  const initialForm = {
    route_name: '',
    origin_warehouse_id: '',
    state_id: '',
    primary_district_id: '',
    nearby_district_ids: [],
    pincode_text: '', // comma-separated pincodes
    max_route_distance_km: 150,
    max_route_deviation_km: 25,
    max_waiting_period_hours: 48,
    min_vehicle_utilization_pct: 70,
    max_delivery_stops: 5,
    combined_delivery_enabled: true,
    cost_allocation_default: 'by_kit_qty',
  };
  const [form, setForm] = useState(initialForm);

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, whRes, stRes] = await Promise.all([
        deliveryApi.getRoutes(),
        deliveryApi.getWarehouses().catch(() => ({ data: [] })),
        deliveryApi.getStates().catch(() => ({ data: [] })),
      ]);

      if (rRes.status === 'success') setRoutes(rRes.data || []);
      setWarehouses(whRes.data || []);
      setStates(stRes.data || stRes.states || []);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load routes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStateChange = async (stateId) => {
    setForm({ ...form, state_id: stateId, primary_district_id: '', nearby_district_ids: [] });
    try {
      const res = await deliveryApi.getDistricts(stateId);
      setDistricts(res.data || res.districts || []);
    } catch {
      setDistricts([]);
    }
  };

  const toggleNearbyDistrict = (districtId) => {
    const exists = form.nearby_district_ids.includes(districtId);
    if (exists) {
      setForm({ ...form, nearby_district_ids: form.nearby_district_ids.filter((d) => d !== districtId) });
    } else {
      setForm({ ...form, nearby_district_ids: [...form.nearby_district_ids, districtId] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.route_name || !form.origin_warehouse_id || !form.state_id || !form.primary_district_id) {
      showAlert('Please enter Route Name, Warehouse, State, and Primary District.', 'error');
      return;
    }

    const pincodes = form.pincode_text
      ? form.pincode_text.split(',').map((p) => ({ pincode: p.trim() })).filter((p) => p.pincode.length > 0)
      : [];

    try {
      await deliveryApi.createRoute({
        ...form,
        pincode_groups: pincodes,
      });
      showAlert('Delivery Route created successfully.');
      setDrawerOpen(false);
      setForm(initialForm);
      loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save route', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this route configuration?')) return;
    try {
      await deliveryApi.deleteRoute(id);
      showAlert('Route deleted.');
      loadData();
    } catch (err) {
      showAlert('Failed to delete route', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Route & Consolidation Settings"
        subtitle="Configure nearby districts, pincode groups, maximum consolidation waiting periods, and multi-stop route limits."
        icon={FaRoute}
        actions={
          <Button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 bg-white text-blue-700 hover:bg-white/90 font-semibold shadow-md px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <FaPlus /> Create Delivery Route
          </Button>
        }
      />

      {loading ? (
        <Loader text="Loading delivery routes..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              No delivery consolidation routes configured yet. Click "Create Delivery Route" to define acceptable route clubbing.
            </div>
          ) : (
            routes.map((r) => (
              <div key={r._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{r.route_name}</h3>
                    <div className="text-xs text-blue-600 font-medium">
                      Origin: {r.origin_warehouse_id?.warehouse_code || 'Warehouse'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(r._id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded"
                    title="Delete Route"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Primary District:</span>
                    <span className="font-semibold text-slate-800">{r.primary_district_id?.name || 'District'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">State:</span>
                    <span className="font-medium text-slate-700">{r.state_id?.name || 'State'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nearby Districts:</span>
                    <span className="font-medium text-slate-800">
                      {r.nearby_district_ids?.map((d) => d.name).join(', ') || 'None'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-500">Max Distance</div>
                    <div className="font-bold text-slate-900">{r.max_route_distance_km} KM</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-500">Max Wait Period</div>
                    <div className="font-bold text-blue-700">{r.max_waiting_period_hours} Hours</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-500">Max Stops</div>
                    <div className="font-bold text-slate-900">{r.max_delivery_stops} Stops</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-500">Min Utilization</div>
                    <div className="font-bold text-emerald-700">{r.min_vehicle_utilization_pct}%</div>
                  </div>
                </div>

                {r.pincode_groups?.length > 0 ? (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Eligible Pincodes:</div>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {r.pincode_groups.map((pg, idx) => (
                        <span key={idx} className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {pg.pincode}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className={`inline-flex items-center gap-1 font-semibold ${
                    r.combined_delivery_enabled ? 'text-emerald-700' : 'text-slate-500'
                  }`}>
                    {r.combined_delivery_enabled ? <FaCheckCircle /> : <FaTimesCircle />}
                    {r.combined_delivery_enabled ? 'Combined Delivery Enabled' : 'Disabled'}
                  </span>
                  <span className="text-slate-400 capitalize">Cost: {r.cost_allocation_default?.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Route Creation Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Configure Delivery Route & Consolidation"
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <CustomInput
            label="Route Name *"
            placeholder="e.g. Pune Cluster Route 01"
            value={form.route_name}
            onChange={(e) => setForm({ ...form, route_name: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Origin Company Warehouse *</label>
            <select
              value={form.origin_warehouse_id}
              onChange={(e) => setForm({ ...form, origin_warehouse_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            >
              <option value="">-- Select Origin Warehouse --</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>{wh.warehouse_code} - {wh.address || 'WH'}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
              <select
                value={form.state_id}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              >
                <option value="">-- Select State --</option>
                {states.map((st) => (
                  <option key={st._id} value={st._id}>{st.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Primary District *</label>
              <select
                value={form.primary_district_id}
                onChange={(e) => setForm({ ...form, primary_district_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              >
                <option value="">-- Primary District --</option>
                {districts.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {districts.length > 1 ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nearby Districts to Combine</label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                {districts
                  .filter((d) => d._id !== form.primary_district_id)
                  .map((d) => (
                    <label key={d._id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.nearby_district_ids.includes(d._id)}
                        onChange={() => toggleNearbyDistrict(d._id)}
                        className="rounded text-blue-600"
                      />
                      <span>{d.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          ) : null}

          <CustomInput
            label="Eligible Pincodes (Comma separated)"
            placeholder="e.g. 411001, 411002, 411003, 411014"
            value={form.pincode_text}
            onChange={(e) => setForm({ ...form, pincode_text: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              label="Max Route Distance (KM) *"
              type="number"
              value={form.max_route_distance_km}
              onChange={(e) => setForm({ ...form, max_route_distance_km: e.target.value })}
              required
            />
            <CustomInput
              label="Max Route Deviation (KM)"
              type="number"
              value={form.max_route_deviation_km}
              onChange={(e) => setForm({ ...form, max_route_deviation_km: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <CustomInput
              label="Max Wait (Hours) *"
              type="number"
              value={form.max_waiting_period_hours}
              onChange={(e) => setForm({ ...form, max_waiting_period_hours: e.target.value })}
              required
            />
            <CustomInput
              label="Min Utilization (%)"
              type="number"
              value={form.min_vehicle_utilization_pct}
              onChange={(e) => setForm({ ...form, min_vehicle_utilization_pct: e.target.value })}
            />
            <CustomInput
              label="Max Stops"
              type="number"
              value={form.max_delivery_stops}
              onChange={(e) => setForm({ ...form, max_delivery_stops: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Cost Allocation Method</label>
            <select
              value={form.cost_allocation_default}
              onChange={(e) => setForm({ ...form, cost_allocation_default: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="by_kit_qty">By Kit Quantity</option>
              <option value="by_weight_kg">By Shipment Weight (KG)</option>
              <option value="by_distance">By Delivery Distance</option>
              <option value="by_kg_distance">By KG × Distance</option>
              <option value="manual">Manual Allocation</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="comb_en"
              checked={form.combined_delivery_enabled}
              onChange={(e) => setForm({ ...form, combined_delivery_enabled: e.target.checked })}
              className="rounded text-blue-600"
            />
            <label htmlFor="comb_en" className="text-sm font-medium text-slate-700">Combined Delivery Enabled</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" onClick={() => setDrawerOpen(false)} className="bg-slate-100 text-slate-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 text-white">
              Save Route Configuration
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
