import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import { FaTruck, FaPlus, FaEdit, FaTrash, FaCalculator, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import PageHeader from '../../../components/PageHeader';
import Button from '../../../components/Button';
import CustomInput from '../../../components/CustomInput';
import Dialog from '../../../components/Dialog';
import Drawer from '../../../components/Drawer';
import Loader from '../../../components/Loader';
import { deliveryApi } from '../../../api/deliveryApi';

export default function VehicleMaster() {
  const dispatch = useDispatch();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [capacityChartOpen, setCapacityChartOpen] = useState(false);
  const [capacityChartData, setCapacityChartData] = useState([]);

  const initialForm = {
    name: '',
    brand_make: '',
    model: '',
    length_ft: '',
    width_ft: '',
    height_ft: '',
    max_load_kg: '',
    max_delivery_distance_km: '',
    status: 'Active',
  };
  const [form, setForm] = useState(initialForm);

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await deliveryApi.getVehicleMasters();
      if (res.status === 'success') {
        setVehicles(res.data || []);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load vehicle masters', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCapacityChart = async () => {
    try {
      const res = await deliveryApi.getVehicleCapacityChart();
      if (res.status === 'success') {
        setCapacityChartData(res.data || []);
        setCapacityChartOpen(true);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load capacity chart', 'error');
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleOpenDrawer = (v = null) => {
    if (v) {
      setEditingVehicle(v);
      setForm({
        name: v.name,
        brand_make: v.brand_make,
        model: v.model,
        length_ft: v.length_ft,
        width_ft: v.width_ft,
        height_ft: v.height_ft,
        max_load_kg: v.max_load_kg,
        max_delivery_distance_km: v.max_delivery_distance_km,
        status: v.status || 'Active',
      });
    } else {
      setEditingVehicle(null);
      setForm(initialForm);
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.brand_make || !form.model || !form.max_load_kg) {
      showAlert('Please fill in all required fields.', 'error');
      return;
    }

    try {
      if (editingVehicle) {
        await deliveryApi.updateVehicleMaster(editingVehicle._id, form);
        showAlert('Vehicle Master updated successfully.');
      } else {
        await deliveryApi.createVehicleMaster(form);
        showAlert('Vehicle Master created successfully.');
      }
      setDrawerOpen(false);
      loadVehicles();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save vehicle master', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle master?')) return;
    try {
      await deliveryApi.deleteVehicleMaster(id);
      showAlert('Vehicle Master deleted.');
      loadVehicles();
    } catch (err) {
      showAlert('Failed to delete vehicle master', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Vehicle Master – Delivery Management"
        subtitle="Master catalog of vehicle types, dimensions, weight capacity and max delivery range."
        icon={FaTruck}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={loadCapacityChart}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-xs font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              <FaCalculator /> Kit Capacity Chart
            </Button>
            <Button
              onClick={() => handleOpenDrawer()}
              className="flex items-center gap-2 bg-white text-blue-700 hover:bg-white/90 font-semibold shadow-md px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              <FaPlus /> Add Vehicle Type
            </Button>
          </div>
        }
      />

      {loading ? (
        <Loader text="Loading vehicle masters..." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">Vehicle ID</th>
                  <th className="py-3 px-4">Type / Name</th>
                  <th className="py-3 px-4">Brand & Model</th>
                  <th className="py-3 px-4">Dimensions (L × W × H)</th>
                  <th className="py-3 px-4">Max Load (KG)</th>
                  <th className="py-3 px-4">Max Range (KM)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-500">
                      No vehicle masters found. Click "Add Vehicle Type" to create one.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-blue-600">{v.vehicle_code}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{v.name}</td>
                      <td className="py-3 px-4 text-slate-600">{v.brand_make} • {v.model}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {v.length_ft}ft × {v.width_ft}ft × {v.height_ft}ft
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{v.max_load_kg.toLocaleString()} KG</td>
                      <td className="py-3 px-4 text-slate-600">{v.max_delivery_distance_km} KM</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          v.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {v.status === 'Active' ? <FaCheckCircle className="text-emerald-500 text-[10px]" /> : <FaTimesCircle className="text-slate-400 text-[10px]" />}
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDrawer(v)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(v._id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
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
      )}

      {/* Add / Edit Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingVehicle ? 'Edit Vehicle Master' : 'Add Vehicle Type'}
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <CustomInput
            label="Vehicle Type / Name *"
            placeholder="e.g. Tata Ace, Pickup, 14ft Canter"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              label="Brand / Make *"
              placeholder="e.g. Tata Motors, Mahindra"
              value={form.brand_make}
              onChange={(e) => setForm({ ...form, brand_make: e.target.value })}
              required
            />
            <CustomInput
              label="Model *"
              placeholder="e.g. Ace Gold Diesel, Bolero Maxi"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <CustomInput
              label="Length (Feet) *"
              type="number"
              placeholder="e.g. 7"
              value={form.length_ft}
              onChange={(e) => setForm({ ...form, length_ft: e.target.value })}
              required
            />
            <CustomInput
              label="Width (Feet) *"
              type="number"
              placeholder="e.g. 4.5"
              value={form.width_ft}
              onChange={(e) => setForm({ ...form, width_ft: e.target.value })}
              required
            />
            <CustomInput
              label="Height (Feet) *"
              type="number"
              placeholder="e.g. 4.5"
              value={form.height_ft}
              onChange={(e) => setForm({ ...form, height_ft: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              label="Maximum Load Capacity (KG) *"
              type="number"
              placeholder="e.g. 1500"
              value={form.max_load_kg}
              onChange={(e) => setForm({ ...form, max_load_kg: e.target.value })}
              required
            />
            <CustomInput
              label="Maximum Delivery Distance (KM) *"
              type="number"
              placeholder="e.g. 350"
              value={form.max_delivery_distance_km}
              onChange={(e) => setForm({ ...form, max_delivery_distance_km: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" onClick={() => setDrawerOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              {editingVehicle ? 'Update Vehicle Master' : 'Create Vehicle Master'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Kit Capacity Chart Dialog */}
      <Dialog
        isOpen={capacityChartOpen}
        onClose={() => setCapacityChartOpen(false)}
        title="ComboKit Safe Loading Capacity by Vehicle Type"
        size="2xl"
      >
        <div className="p-6 space-y-4">
          {/* Formula and Summary Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <span className="font-bold px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] uppercase tracking-wider">
                Formula
              </span>
              <span className="font-medium text-slate-700">
                Safe Kit Capacity = <span className="font-mono font-bold text-slate-900">⌊ Vehicle Payload (KG) ÷ Kit Weight (KG) ⌋</span> (Rounded down to nearest whole kit)
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white border border-blue-200 text-blue-700 shadow-xs">
                {capacityChartData.length} Fleet Models Evaluated
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[68vh] rounded-xl border border-slate-200 shadow-xs bg-white">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 text-xs uppercase font-semibold sticky top-0 z-10 backdrop-blur-xs border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-[24%]">Vehicle Model</th>
                  <th className="py-3 px-4 w-[16%]">Payload Capacity</th>
                  <th className="py-3 px-4 w-[32%]">ComboKit Name</th>
                  <th className="py-3 px-4 w-[14%]">Kit Weight</th>
                  <th className="py-3 px-4 w-[14%] text-right">Max Kits Allowed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {capacityChartData.map((v, vIdx) =>
                  (v.kit_capacities || []).map((kc, idx) => (
                    <tr
                      key={`${v.vehicle_master_id}-${kc.kit_id}`}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        idx === 0 && vIdx !== 0 ? 'border-t-2 border-slate-200' : ''
                      }`}
                    >
                      {idx === 0 ? (
                        <td
                          rowSpan={v.kit_capacities?.length || 1}
                          className="py-3.5 px-4 font-semibold text-slate-900 bg-slate-50/70 align-top border-r border-slate-200"
                        >
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <FaTruck className="text-blue-500 shrink-0" />
                            <span>{v.vehicle_name}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-normal mt-0.5 pl-5">
                            {v.brand_make} • {v.model || 'Standard'}
                          </div>
                        </td>
                      ) : null}
                      {idx === 0 ? (
                        <td
                          rowSpan={v.kit_capacities?.length || 1}
                          className="py-3.5 px-4 align-top border-r border-slate-200 bg-slate-50/70"
                        >
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                            {v.max_load_kg?.toLocaleString()} KG
                          </span>
                        </td>
                      ) : null}
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{kc.kit_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {kc.capacity_kw} kW
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono font-semibold">
                        {kc.unit_weight_kg} KG
                      </td>
                      <td className="py-3 px-4 text-right">
                        {kc.max_kits_allowed > 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                            ✓ {kc.max_kits_allowed} {kc.max_kits_allowed === 1 ? 'kit' : 'kits'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200">
                            ✕ 0 kits (Overweight)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Payload limits derived from vehicle gross vehicle weight (GVW) minus tare weight.
            </p>
            <Button onClick={() => setCapacityChartOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-5">
              Close Chart
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
