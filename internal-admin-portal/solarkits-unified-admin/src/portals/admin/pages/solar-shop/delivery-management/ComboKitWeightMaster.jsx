import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import { FaWeightHanging, FaEdit, FaCalculator, FaBoxes, FaPlus, FaTruck, FaCheckCircle, FaTimesCircle, FaStar } from 'react-icons/fa';
import PageHeader from '../../../components/PageHeader';
import Button from '../../../components/Button';
import CustomInput from '../../../components/CustomInput';
import Drawer from '../../../components/Drawer';
import Dialog from '../../../components/Dialog';
import Loader from '../../../components/Loader';
import { deliveryApi } from '../../../api/deliveryApi';

export default function ComboKitWeightMaster() {
  const dispatch = useDispatch();
  const [weights, setWeights] = useState([]);
  const [unconfiguredKits, setUnconfiguredKits] = useState([]);
  const [vehicleMasters, setVehicleMasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingKit, setEditingKit] = useState(null);

  // Mixed-Kit Simulator Modal
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simItems, setSimItems] = useState([{ kit_id: '', quantity: 10 }]);

  const initialForm = {
    kit_id: '',
    solar_modules_weight_kg: 0,
    inverter_weight_kg: 0,
    boskit_weight_kg: 0,
    structure_material_weight_kg: 0,
    packaging_weight_kg: 0,
    notes: '',
  };
  const [form, setForm] = useState(initialForm);

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [wRes, vRes] = await Promise.all([
        deliveryApi.getComboKitWeights(),
        deliveryApi.getVehicleMasters(),
      ]);
      if (wRes.status === 'success') {
        setWeights(wRes.data || []);
        setUnconfiguredKits(wRes.unconfigured_kits || []);
      }
      if (vRes.status === 'success') {
        setVehicleMasters(vRes.data || []);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load kit weights', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Combined options for Mixed-Kit Simulator (configured weights + unconfigured with estimated weights)
  const simulatorKitOptions = useMemo(() => {
    const list = [];
    weights.forEach((w) => {
      const id = String(w.kit_id?._id || w.kit_id || w._id);
      list.push({
        id,
        name: w.kit_name || w.kit_id?.name || 'Solar Kit',
        weight: Number(w.total_kit_weight_kg || 100),
        isConfigured: true,
      });
    });
    unconfiguredKits.forEach((u) => {
      const id = String(u._id);
      if (!list.some((x) => x.id === id)) {
        list.push({
          id,
          name: u.name,
          weight: Math.round((Number(u.capacity) || 1) * 75),
          isConfigured: false,
        });
      }
    });
    return list;
  }, [weights, unconfiguredKits]);

  const drawerKitOptions = useMemo(() => {
    if (unconfiguredKits.length > 0) return unconfiguredKits;
    return weights.map((w) => ({
      _id: w.kit_id?._id || w.kit_id || w._id,
      name: w.kit_name || w.kit_id?.name || 'Solar Kit',
      capacity: w.capacity_kw,
    }));
  }, [unconfiguredKits, weights]);

  const totalCalculatedWeight =
    Number(form.solar_modules_weight_kg || 0) +
    Number(form.inverter_weight_kg || 0) +
    Number(form.boskit_weight_kg || 0) +
    Number(form.structure_material_weight_kg || 0) +
    Number(form.packaging_weight_kg || 0);

  const handleOpenDrawer = (item = null) => {
    if (item) {
      setEditingKit(item);
      setForm({
        kit_id: item.kit_id?._id || item.kit_id,
        solar_modules_weight_kg: item.solar_modules_weight_kg || 0,
        inverter_weight_kg: item.inverter_weight_kg || 0,
        boskit_weight_kg: item.boskit_weight_kg || 0,
        structure_material_weight_kg: item.structure_material_weight_kg || 0,
        packaging_weight_kg: item.packaging_weight_kg || 0,
        notes: item.notes || '',
      });
    } else {
      setEditingKit(null);
      const defaultId = unconfiguredKits[0]?._id || drawerKitOptions[0]?._id || '';
      setForm({
        ...initialForm,
        kit_id: defaultId,
      });
    }
    setDrawerOpen(true);
  };

  const handleOpenSimulator = () => {
    if (simItems.length === 0 || !simItems[0]?.kit_id) {
      const defaultId = simulatorKitOptions[0]?.id || '';
      setSimItems([{ kit_id: defaultId, quantity: 10 }]);
    }
    setSimulatorOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.kit_id) {
      showAlert('Please select a ComboKit.', 'error');
      return;
    }

    try {
      await deliveryApi.upsertComboKitWeight(form);
      showAlert('Kit Weight Master updated.');
      setDrawerOpen(false);
      loadData();
    } catch (err) {
      showAlert('Failed to save kit weight', 'error');
    }
  };

  // Mixed-Kit calculation logic
  const calculateMixedShipment = () => {
    let totalKg = 0;
    let totalKits = 0;
    simItems.forEach((it) => {
      const match = simulatorKitOptions.find((k) => String(k.id) === String(it.kit_id));
      const unitWt = match ? match.weight : 75;
      totalKg += unitWt * Number(it.quantity || 0);
      totalKits += Number(it.quantity || 0);
    });
    return { totalKg, totalKits };
  };

  const simResult = calculateMixedShipment();

  // Sort vehicle masters descending by load capacity (from heavy trucks down to light LCVs)
  const sortedVehicles = useMemo(() => {
    return [...vehicleMasters].sort((a, b) => Number(b.max_load_kg || 0) - Number(a.max_load_kg || 0));
  }, [vehicleMasters]);

  // Optimal vehicle: smallest vehicle that can hold the entire cargo safely
  const optimalVehicle = useMemo(() => {
    if (!simResult.totalKg || simResult.totalKg <= 0) return null;
    const fitting = [...vehicleMasters]
      .filter((v) => Number(v.max_load_kg || 0) >= simResult.totalKg)
      .sort((a, b) => Number(a.max_load_kg || 0) - Number(b.max_load_kg || 0));
    return fitting.length > 0 ? fitting[0] : null;
  }, [vehicleMasters, simResult.totalKg]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="ComboKit KG Capacity Chart & Weight Master"
        subtitle="BOM individual component weights (Modules, Inverter, BOSKIT, Structure, Packaging) & safe vehicle load calculations."
        icon={FaWeightHanging}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleOpenSimulator}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-xs font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              <FaCalculator /> Mixed-Kit Load Simulator
            </Button>
            <Button
              onClick={() => handleOpenDrawer()}
              className="flex items-center gap-2 bg-white text-blue-700 hover:bg-white/90 font-semibold shadow-md px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              <FaPlus /> {unconfiguredKits.length > 0 ? `Configure New Kit (${unconfiguredKits.length})` : 'Configure Kit BOM Weight'}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Loader text="Loading kit weight database..." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">ComboKit</th>
                  <th className="py-3 px-4">Solar Modules</th>
                  <th className="py-3 px-4">Inverter</th>
                  <th className="py-3 px-4">BOSKIT</th>
                  <th className="py-3 px-4">Structure</th>
                  <th className="py-3 px-4">Packaging</th>
                  <th className="py-3 px-4 font-bold text-slate-900 bg-slate-100/50">Total Weight</th>
                  <th className="py-3 px-4 text-center">Max Kits (Tata Ace ~1.5T)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weights.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-500">
                      No configured kit weights found.
                    </td>
                  </tr>
                ) : (
                  weights.map((w) => {
                    const totalWt = w.total_kit_weight_kg || 1;
                    const maxTataAce = Math.floor(1500 / totalWt);
                    return (
                      <tr key={w._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{w.kit_name}</div>
                          <div className="text-xs text-blue-600 font-mono">{w.capacity_kw} kW System</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{w.solar_modules_weight_kg} KG</td>
                        <td className="py-3 px-4 text-slate-600">{w.inverter_weight_kg} KG</td>
                        <td className="py-3 px-4 text-slate-600">{w.boskit_weight_kg} KG</td>
                        <td className="py-3 px-4 text-slate-600">{w.structure_material_weight_kg} KG</td>
                        <td className="py-3 px-4 text-slate-600">{w.packaging_weight_kg} KG</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-950 bg-slate-50">
                          {totalWt.toLocaleString()} KG
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-emerald-700">
                          {maxTataAce} kits
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenDrawer(w)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Weights"
                          >
                            <FaEdit />
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
      )}

      {/* Edit Weights Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingKit ? `Configure BOM Weights: ${editingKit.kit_name}` : 'Configure Kit BOM Weight'}
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!editingKit ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select ComboKit *</label>
              <select
                value={form.kit_id}
                onChange={(e) => setForm({ ...form, kit_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              >
                {drawerKitOptions.map((k) => (
                  <option key={k._id} value={k._id}>
                    {k.name} ({k.capacity} kW)
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              BOM Component Weights (KG)
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <CustomInput
                label="Solar Modules Weight (KG) *"
                type="number"
                placeholder="e.g. 50"
                value={form.solar_modules_weight_kg}
                onChange={(e) => setForm({ ...form, solar_modules_weight_kg: e.target.value })}
                required
              />
              <CustomInput
                label="Inverter Weight (KG) *"
                type="number"
                placeholder="e.g. 15"
                value={form.inverter_weight_kg}
                onChange={(e) => setForm({ ...form, inverter_weight_kg: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <CustomInput
                label="BOSKIT (KG) *"
                type="number"
                placeholder="e.g. 10"
                value={form.boskit_weight_kg}
                onChange={(e) => setForm({ ...form, boskit_weight_kg: e.target.value })}
                required
              />
              <CustomInput
                label="Structure (KG) *"
                type="number"
                placeholder="e.g. 20"
                value={form.structure_material_weight_kg}
                onChange={(e) => setForm({ ...form, structure_material_weight_kg: e.target.value })}
                required
              />
              <CustomInput
                label="Packaging (KG) *"
                type="number"
                placeholder="e.g. 5"
                value={form.packaging_weight_kg}
                onChange={(e) => setForm({ ...form, packaging_weight_kg: e.target.value })}
                required
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-900">Total Calculated ComboKit Weight:</span>
              <span className="text-lg font-mono font-bold text-blue-700">{totalCalculatedWeight} KG</span>
            </div>
          </div>

          <CustomInput
            label="Notes / Packaging Specs"
            placeholder="e.g. Stacked in 2 crates with corner guards"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" onClick={() => setDrawerOpen(false)} className="bg-slate-100 text-slate-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 text-white">
              Save BOM Weights
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Mixed-Kit Shipment Simulator */}
      <Dialog
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        title="Mixed-Kit Order Shipment Weight Calculator"
        size="lg"
      >
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-500">
            For mixed-kit shipments, calculate cumulative payload weight across multiple ComboKit lines and match with suitable transport vehicles.
          </p>

          <div className="space-y-3">
            {simItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">ComboKit</label>
                  <select
                    value={item.kit_id}
                    onChange={(e) => {
                      const copy = [...simItems];
                      copy[idx].kit_id = e.target.value;
                      setSimItems(copy);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Choose Kit --</option>
                    {simulatorKitOptions.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.weight} KG{k.isConfigured ? '' : ' - est.'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const copy = [...simItems];
                      copy[idx].quantity = e.target.value;
                      setSimItems(copy);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                {simItems.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setSimItems(simItems.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg text-sm mt-5 transition-colors"
                    title="Remove Line"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}

            <Button
              type="button"
              onClick={() => setSimItems([...simItems, { kit_id: simulatorKitOptions[0]?.id || '', quantity: 5 }])}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-2 rounded-lg"
            >
              + Add Another Kit Line
            </Button>
          </div>

          {/* Shipment Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
                <FaBoxes />
              </div>
              <div>
                <span className="block text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Order Volume</span>
                <span className="text-2xl font-bold font-mono text-slate-900 leading-tight">
                  {simResult.totalKits.toLocaleString()} <span className="text-sm font-medium text-slate-500">kits</span>
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
                <FaWeightHanging />
              </div>
              <div>
                <span className="block text-xs font-semibold text-emerald-700 uppercase tracking-wide">Total Cargo Weight</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-slate-900 leading-tight">
                    {simResult.totalKg.toLocaleString()} <span className="text-sm font-medium text-slate-500">KG</span>
                  </span>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                    {(simResult.totalKg / 1000).toFixed(2)} MT
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Optimal Vehicle Banner */}
          {optimalVehicle && (
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-900 text-xs sm:text-sm font-semibold">
                <FaStar className="text-amber-500 text-base shrink-0" />
                <span>
                  Recommended Vehicle: <span className="text-amber-950 font-bold">{optimalVehicle.name}</span>
                </span>
                <span className="text-xs font-normal text-amber-700 hidden md:inline">
                  ({optimalVehicle.max_load_kg.toLocaleString()} KG Capacity)
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-amber-800 bg-amber-200/60 px-2.5 py-1 rounded-md">
                {Math.round((simResult.totalKg / optimalVehicle.max_load_kg) * 100)}% Load Utilization • {(optimalVehicle.max_load_kg - simResult.totalKg).toLocaleString()} KG Headroom
              </div>
            </div>
          )}

          {/* Vehicle Fleet Compatibility Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FaTruck className="text-slate-500" /> Fleet Vehicle Compatibility Analysis
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {vehicleMasters.filter(v => simResult.totalKg <= v.max_load_kg).length} of {vehicleMasters.length} vehicles fit load
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {sortedVehicles.map((vm) => {
                const fits = simResult.totalKg <= vm.max_load_kg;
                const headroom = vm.max_load_kg - simResult.totalKg;
                const utilPct = vm.max_load_kg > 0 ? Math.round((simResult.totalKg / vm.max_load_kg) * 100) : 0;
                const isOptimal = optimalVehicle && optimalVehicle._id === vm._id;

                return (
                  <div
                    key={vm._id}
                    className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isOptimal
                        ? 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-500'
                        : fits
                        ? 'hover:bg-slate-50/80'
                        : 'bg-rose-50/15 hover:bg-rose-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isOptimal ? 'bg-amber-100 text-amber-700' : fits ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <FaTruck className="text-sm" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">{vm.name}</span>
                          {isOptimal && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                              <FaStar className="text-[9px]" /> Best Fit
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          Rated Capacity: <span className="font-mono font-medium text-slate-700">{vm.max_load_kg.toLocaleString()} KG</span>
                        </span>
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <div className="flex items-center gap-3 sm:w-48 shrink-0">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOptimal ? 'bg-amber-500' : fits ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, utilPct)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-mono font-semibold w-12 text-right ${
                        fits ? (isOptimal ? 'text-amber-800' : 'text-emerald-700') : 'text-rose-600'
                      }`}>
                        {utilPct}%
                      </span>
                    </div>

                    {/* Status / Headroom Badge */}
                    <div className="sm:text-right shrink-0">
                      {fits ? (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          isOptimal
                            ? 'bg-amber-100/80 text-amber-900 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <FaCheckCircle className={isOptimal ? 'text-amber-600' : 'text-emerald-500'} />
                          <span>
                            Fits • {headroom === 0 ? 'Exact Capacity (0 KG)' : `${headroom.toLocaleString()} KG Headroom`}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <FaTimesCircle className="text-rose-500" />
                          <span>Exceeds by {Math.abs(headroom).toLocaleString()} KG</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button onClick={() => setSimulatorOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-xl text-sm">
              Close Simulator
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
