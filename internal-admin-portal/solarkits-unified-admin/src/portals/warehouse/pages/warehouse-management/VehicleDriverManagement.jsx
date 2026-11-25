import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setAlert } from "../../features/alert.slice";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaTruck, FaUser, FaCalculator, FaPlus, FaEdit, FaTrash, 
  FaGasPump, FaWeightHanging, FaRoute, FaCheckCircle, FaExclamationTriangle,
  FaIdCard, FaPhone, FaTools, FaFileContract
} from "react-icons/fa";
import { 
  getVehicles, addVehicle, updateVehicle, deleteVehicle,
  getDrivers, addDriver, updateDriver, deleteDriver,
  compareVehicles 
} from "../../api/vehicles";
import Button from "../../components/Button";
import CustomInput from "../../components/CustomInput";
import Dialog from "../../components/Dialog";
import Dropdown from "../../components/Dropdown";
import PageHeader from "../../components/PageHeader";

export default function VehicleDriverManagement() {
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("vehicles"); // "vehicles" | "drivers" | "compare"
  
  // Data States
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal / Form States
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    name: "",
    registration_number: "",
    vehicle_type: "Custom",
    capacity_kg: "",
    base_rate_per_km: "",
    fuel_type: "Diesel",
    fuel_efficiency_kmpl: "",
    fuel_price_per_litre: "",
    // Module 1.2: Logistic Constraint Limits
    max_kits:       "",
    max_kw:         "",
    max_weight_kg:  "",
  });

  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverForm, setDriverForm] = useState({
    name: "",
    contact: "",
    license_number: "",
    assigned_vehicle_id: ""
  });

  // Calculator State
  const [tripDistance, setTripDistance] = useState("100");

  const showAlert = (message, type = "success") => {
    dispatch(setAlert({ type, message }));
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [vRes, dRes, cRes] = await Promise.all([
        getVehicles(),
        getDrivers(),
        compareVehicles()
      ]);
      
      if (vRes.status === "success") setVehicles(vRes.data || []);
      if (dRes.status === "success") setDrivers(dRes.data || []);
      if (cRes.status === "success") setComparisonData(cRes.data || []);
    } catch (err) {
      console.error("Failed to load delivery module data:", err);
      showAlert("Failed to load delivery module data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ─── VEHICLE ACTIONS ────────────────────────────────────────────────────────

  const handleOpenVehicleModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleForm({
        name: vehicle.name,
        registration_number: vehicle.registration_number,
        vehicle_type: vehicle.vehicle_type || "Custom",
        capacity_kg: vehicle.capacity_kg,
        base_rate_per_km: vehicle.base_rate_per_km,
        fuel_type: vehicle.fuel_type || "Diesel",
        fuel_efficiency_kmpl: vehicle.fuel_efficiency_kmpl,
        fuel_price_per_litre: vehicle.fuel_price_per_litre,
        // Module 1.2 fields
        max_kits:      vehicle.max_kits || "",
        max_kw:        vehicle.max_kw   || "",
        max_weight_kg: vehicle.max_weight_kg || "",
      });
    } else {
      setEditingVehicle(null);
      setVehicleForm({
        name: "",
        registration_number: "",
        vehicle_type: "Custom",
        capacity_kg: "",
        base_rate_per_km: "",
        fuel_type: "Diesel",
        fuel_efficiency_kmpl: "",
        fuel_price_per_litre: "",
        max_kits: "",
        max_kw: "",
        max_weight_kg: "",
      });
    }
    setVehicleModalOpen(true);
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        const res = await updateVehicle(editingVehicle._id, vehicleForm);
        if (res.status === "success") {
          showAlert("Vehicle updated successfully!");
          setVehicleModalOpen(false);
          loadAllData();
        } else {
          showAlert(res.message || "Failed to update vehicle", "error");
        }
      } else {
        const res = await addVehicle(vehicleForm);
        if (res.status === "success") {
          showAlert("Vehicle added successfully!");
          setVehicleModalOpen(false);
          loadAllData();
        } else {
          showAlert(res.message || "Failed to add vehicle", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showAlert("An error occurred while saving the vehicle", "error");
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vehicle? This will also unassign drivers linked to it.")) return;
    try {
      const res = await deleteVehicle(id);
      if (res.status === "success") {
        showAlert("Vehicle deleted successfully!");
        loadAllData();
      } else {
        showAlert(res.message || "Failed to delete vehicle", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("An error occurred", "error");
    }
  };

  // ─── DRIVER ACTIONS ─────────────────────────────────────────────────────────

  const handleOpenDriverModal = (driver = null) => {
    if (driver) {
      setEditingDriver(driver);
      setDriverForm({
        name: driver.name,
        contact: driver.contact,
        license_number: driver.license_number,
        assigned_vehicle_id: driver.assigned_vehicle_id?._id || driver.assigned_vehicle_id || ""
      });
    } else {
      setEditingDriver(null);
      setDriverForm({
        name: "",
        contact: "",
        license_number: "",
        assigned_vehicle_id: ""
      });
    }
    setDriverModalOpen(true);
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        const res = await updateDriver(editingDriver._id, driverForm);
        if (res.status === "success") {
          showAlert("Driver updated successfully!");
          setDriverModalOpen(false);
          loadAllData();
        } else {
          showAlert(res.message || "Failed to update driver", "error");
        }
      } else {
        const res = await addDriver(driverForm);
        if (res.status === "success") {
          showAlert("Driver added successfully!");
          setDriverModalOpen(false);
          loadAllData();
        } else {
          showAlert(res.message || "Failed to add driver", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showAlert("An error occurred while saving the driver", "error");
    }
  };

  const handleDeleteDriver = async (id) => {
    if (!window.confirm("Are you sure you want to delete this driver?")) return;
    try {
      const res = await deleteDriver(id);
      if (res.status === "success") {
        showAlert("Driver deleted successfully!");
        loadAllData();
      } else {
        showAlert(res.message || "Failed to delete driver", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("An error occurred", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Delivery Fleet & Driver Management</h1>
          <p className="text-text-secondary">Manage vehicles, assign drivers, and compare delivery transit cost metrics</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "vehicles" && (
            <button
              onClick={() => handleOpenVehicleModal()}
              className="btn-primary px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-md"
            >
              <FaPlus />
              <span>Add Vehicle</span>
            </button>
          )}
          {activeTab === "drivers" && (
            <button
              onClick={() => handleOpenDriverModal()}
              className="btn-primary px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-md"
            >
              <FaPlus />
              <span>Add Driver</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === "vehicles"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <FaTruck size={14} />
          <span>Vehicles ({vehicles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("drivers")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === "drivers"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <FaUser size={14} />
          <span>Drivers ({drivers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("compare")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === "compare"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <FaCalculator size={14} />
          <span>Cost Comparison & Calculator</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-12 bg-surface border border-border rounded-2xl shadow-xs">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Content Panels */}
      {!loading && (
        <AnimatePresence mode="wait">
          {activeTab === "vehicles" && (
            <motion.div
              key="vehicles-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {vehicles.length === 0 ? (
                <div className="col-span-full card p-8 text-center text-text-muted italic bg-surface border-border">
                  No vehicles configured yet. Click "Add Vehicle" to register one.
                </div>
              ) : (
                vehicles.map((v) => {
                  const fuelCost = v.fuel_efficiency_kmpl > 0 ? (v.fuel_price_per_litre / v.fuel_efficiency_kmpl) : 0;
                  const totalCost = v.base_rate_per_km + fuelCost;

                  return (
                    <div key={v._id} className="card p-5 bg-surface border border-border/80 rounded-2xl hover:shadow-lg transition-all relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-extrabold text-text-primary">{v.name}</h3>
                            <p className="text-xs font-mono text-text-secondary mt-1">{v.registration_number}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleOpenVehicleModal(v)}
                              className="p-2 hover:bg-primary/10 text-text-secondary hover:text-primary rounded-lg transition-all"
                              title="Edit Vehicle"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(v._id)}
                              className="p-2 hover:bg-danger/10 text-text-secondary hover:text-danger rounded-lg transition-all"
                              title="Delete Vehicle"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50 text-xs">
                          <div className="flex items-center gap-2">
                            <FaWeightHanging className="text-text-muted" />
                            <div>
                              <p className="text-[10px] text-text-muted">Payload Cap</p>
                              <p className="font-bold text-text-primary">{v.capacity_kg} KG</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaRoute className="text-text-muted" />
                            <div>
                              <p className="text-[10px] text-text-muted">Base Rate</p>
                              <p className="font-bold text-text-primary">₹{v.base_rate_per_km}/KM</p>
                            </div>
                          </div>
                        </div>

                        {/* Module 1.2: Logistic Limits Badge */}
                        <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/20 space-y-1 text-xs">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-primary">🚚 {v.vehicle_type || "Custom"}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Recom. Engine</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-text-secondary pt-0.5">
                            <span className="bg-surface px-1.5 py-0.5 rounded border border-border">Kits: <strong className="text-text-primary">{v.max_kits ? `${v.max_kits} max` : 'Unlimited'}</strong></span>
                            <span className="bg-surface px-1.5 py-0.5 rounded border border-border">kW: <strong className="text-text-primary">{v.max_kw ? `${v.max_kw} kW` : 'Unlimited'}</strong></span>
                            <span className="bg-surface px-1.5 py-0.5 rounded border border-border">Weight: <strong className="text-text-primary">{v.max_weight_kg ? `${v.max_weight_kg} kg` : `${v.capacity_kg} kg`}</strong></span>
                          </div>
                        </div>

                        <div className="p-3 bg-bg rounded-xl border border-border/50 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-text-secondary flex items-center gap-1.5">
                              <FaGasPump size={12} className="text-text-muted" />
                              Fuel Info ({v.fuel_type})
                            </span>
                            <span className="font-semibold text-text-primary">{v.fuel_efficiency_kmpl} KMPL</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Fuel Price</span>
                            <span className="font-semibold text-text-primary">₹{v.fuel_price_per_litre}/L</span>
                          </div>
                          <div className="flex justify-between border-t border-border/50 pt-2 font-bold">
                            <span className="text-text-primary">Computed Fuel Cost/KM</span>
                            <span className="text-primary">₹{fuelCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/80 flex justify-between items-center bg-primary/3 p-3 rounded-xl">
                        <span className="text-xs font-bold text-text-primary">Total Est. Cost/KM</span>
                        <span className="text-lg font-black text-primary">₹{totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === "drivers" && (
            <motion.div
              key="drivers-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {drivers.length === 0 ? (
                <div className="col-span-full card p-8 text-center text-text-muted italic bg-surface border-border">
                  No drivers registered yet. Click "Add Driver" to register one.
                </div>
              ) : (
                drivers.map((d) => (
                  <div key={d._id} className="card p-5 bg-surface border border-border/80 rounded-2xl hover:shadow-lg transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                            {d.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-text-primary text-sm">{d.name}</h3>
                            <span className="text-xs text-text-muted font-mono">{d.license_number}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenDriverModal(d)}
                            className="p-2 hover:bg-primary/10 text-text-secondary hover:text-primary rounded-lg transition-all"
                            title="Edit Driver"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(d._id)}
                            className="p-2 hover:bg-danger/10 text-text-secondary hover:text-danger rounded-lg transition-all"
                            title="Delete Driver"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2.5 pt-3 border-t border-border/50 text-xs">
                        <div className="flex items-center gap-2">
                          <FaPhone className="text-text-muted" size={12} />
                          <span className="text-text-secondary">{d.contact}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaIdCard className="text-text-muted" size={12} />
                          <span className="text-text-secondary">DL No: {d.license_number}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50">
                      {d.assigned_vehicle_id ? (
                        <div className="flex items-center justify-between bg-success/5 border border-success/20 rounded-xl px-3 py-2 text-xs">
                          <span className="text-success font-semibold flex items-center gap-1.5">
                            <FaCheckCircle size={12} />
                            Assigned Vehicle
                          </span>
                          <span className="font-extrabold text-text-primary text-right">
                            {d.assigned_vehicle_id.name}
                            <span className="block text-[10px] text-text-muted font-normal font-mono">{d.assigned_vehicle_id.registration_number}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-warning/5 border border-warning/20 rounded-xl px-3 py-2 text-xs text-warning font-semibold">
                          <span className="flex items-center gap-1.5">
                            <FaExclamationTriangle size={12} />
                            No vehicle assigned
                          </span>
                          <button 
                            onClick={() => handleOpenDriverModal(d)}
                            className="text-[10px] uppercase font-black hover:underline"
                          >
                            Assign Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "compare" && (
            <motion.div
              key="compare-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Trip Cost Calculator Panel */}
              <div className="card p-6 bg-surface border border-border rounded-2xl shadow-xs grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                    <FaCalculator className="text-primary" />
                    Trip Cost Estimator
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Enter the estimated distance for the route. The system will dynamically calculate the base cost and fuel cost per vehicle and order them by the cheapest option.
                  </p>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary">Trip Distance (in KM)</label>
                    <CustomInput
                      type="number"
                      min="1"
                      placeholder="e.g. 150"
                      value={tripDistance}
                      onChange={(e) => setTripDistance(e.target.value)}
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Estimated Cost Rankings</h4>
                  
                  {comparisonData.length === 0 ? (
                    <p className="text-xs text-text-muted italic">Configure active vehicles to view comparisons.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {comparisonData.map((v, idx) => {
                        const dist = Number(tripDistance) || 0;
                        const baseCost = v.base_rate_per_km * dist;
                        const fuelCost = v.fuel_cost_per_km * dist;
                        const totalCost = baseCost + fuelCost;

                        return (
                          <div key={v._id} className="p-4 bg-bg rounded-xl border border-border/80 space-y-2 relative overflow-hidden">
                                                   <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-extrabold text-sm text-text-primary">{v.name}</h4>
                                <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">({v.registration_number})</span>
                              </div>
                              <div className="text-right pr-12">
                                <span className="text-xs text-text-muted block">Est. Cost</span>
                                <span className="text-base font-black text-primary">₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>

                            {/* Split bar */}
                            <div className="space-y-1 mt-2">
                              <div className="h-2 rounded-full overflow-hidden flex bg-border/40">
                                <div 
                                  className="bg-primary transition-all duration-300" 
                                  style={{ width: `${totalCost > 0 ? (baseCost / totalCost) * 100 : 0}%` }}
                                  title={`Base Rate: ₹${baseCost.toFixed(2)}`}
                                />
                                <div 
                                  className="bg-warning transition-all duration-300" 
                                  style={{ width: `${totalCost > 0 ? (fuelCost / totalCost) * 100 : 0}%` }}
                                  title={`Fuel: ₹${fuelCost.toFixed(2)}`}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] text-text-muted font-bold mt-1">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-primary rounded-full inline-block" />
                                  Base Cost: ₹{baseCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (₹{v.base_rate_per_km}/km)
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-warning rounded-full inline-block" />
                                  Fuel Cost: ₹{fuelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (₹{v.fuel_cost_per_km}/km)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* General Cost Matrix Grid */}
              <div className="card p-6 bg-surface border border-border rounded-2xl shadow-xs">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border pb-3 mb-4">
                  Full Vehicle Pricing & Comparison Matrix
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-text-muted">
                        <th className="pb-3 font-extrabold uppercase">Vehicle</th>
                        <th className="pb-3 font-extrabold uppercase text-center">Payload Limit</th>
                        <th className="pb-3 font-extrabold uppercase text-center">Base Rate/KM</th>
                        <th className="pb-3 font-extrabold uppercase text-center">Fuel Cost/KM</th>
                        <th className="pb-3 font-extrabold uppercase text-center">Total Cost/KM</th>
                        <th className="pb-3 font-extrabold uppercase text-center">Assigned Drivers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {comparisonData.map((v) => (
                        <tr key={v._id} className="hover:bg-bg/40 transition-colors">
                          <td className="py-3.5 font-bold text-text-primary">
                            <div>{v.name}</div>
                            <span className="text-[10px] text-text-muted font-mono">{v.registration_number}</span>
                          </td>
                          <td className="py-3.5 text-center font-semibold text-text-primary">{v.capacity_kg} KG</td>
                          <td className="py-3.5 text-center font-semibold text-text-primary">₹{v.base_rate_per_km}</td>
                          <td className="py-3.5 text-center text-warning font-semibold">₹{v.fuel_cost_per_km}</td>
                          <td className="py-3.5 text-center text-primary font-black text-sm">₹{v.total_cost_per_km}</td>
                          <td className="py-3.5 text-center text-text-muted">
                            {v.drivers && v.drivers.length > 0 ? (
                              <span className="text-text-primary font-medium">{v.drivers.map(d => d.name).join(", ")}</span>
                            ) : (
                              <span className="italic text-[10px] text-warning bg-warning/5 px-2 py-0.5 rounded border border-warning/10">Unassigned</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ─── VEHICLE MODAL ─── */}
      <Dialog 
        isOpen={vehicleModalOpen} 
        onClose={() => setVehicleModalOpen(false)}
        title={editingVehicle ? "Edit Delivery Vehicle" : "Add Delivery Vehicle"}
        size="md"
      >
        <form onSubmit={handleVehicleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Vehicle Name / Label</label>
            <CustomInput
              placeholder="e.g. Tata Ace, Bolero Pickup"
              value={vehicleForm.name}
              onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Registration Number</label>
              <CustomInput
                placeholder="e.g. MH-12-PQ-1234"
                value={vehicleForm.registration_number}
                onChange={(e) => setVehicleForm({ ...vehicleForm, registration_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Payload Capacity (KG)</label>
              <CustomInput
                type="number"
                placeholder="e.g. 800"
                value={vehicleForm.capacity_kg}
                onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_kg: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Base Rate (₹ / KM)</label>
              <CustomInput
                type="number"
                placeholder="e.g. 12"
                value={vehicleForm.base_rate_per_km}
                onChange={(e) => setVehicleForm({ ...vehicleForm, base_rate_per_km: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Dropdown
                label="Fuel Type"
                value={vehicleForm.fuel_type}
                onChange={(val) => setVehicleForm({ ...vehicleForm, fuel_type: val })}
                options={[
                  { value: "Diesel", text: "Diesel" },
                  { value: "Petrol", text: "Petrol" },
                  { value: "CNG", text: "CNG" },
                  { value: "Electric", text: "Electric" }
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Fuel Efficiency (KMPL)</label>
              <CustomInput
                type="number"
                step="0.1"
                placeholder="e.g. 15.5"
                value={vehicleForm.fuel_efficiency_kmpl}
                onChange={(e) => setVehicleForm({ ...vehicleForm, fuel_efficiency_kmpl: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Fuel Price per Litre / Unit (₹)</label>
              <CustomInput
                type="number"
                step="0.01"
                placeholder="e.g. 96.5"
                value={vehicleForm.fuel_price_per_litre}
                onChange={(e) => setVehicleForm({ ...vehicleForm, fuel_price_per_litre: e.target.value })}
                required
              />
            </div>
          </div>

          {/* ── Module 1.2: Logistic Constraint Limits Section ─────────────── */}
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-bold text-text-secondary mb-2 flex items-center gap-1">
              <span>🚚</span> Logistic Limits (Vehicle Recommendation Engine)
            </p>
            <div className="space-y-1 mb-3">
              <Dropdown
                label="Vehicle Type Preset"
                value={vehicleForm.vehicle_type}
                onChange={(val) => setVehicleForm({ ...vehicleForm, vehicle_type: val })}
                options={[
                  { value: "Tata Ace",           text: "Tata Ace (Mini Truck)" },
                  { value: "3-Wheeler Electric",  text: "3-Wheeler Electric" },
                  { value: "14ft Canter",         text: "14ft Canter" },
                  { value: "20ft Truck",          text: "20ft Truck" },
                  { value: "32ft Container",      text: "32ft Container" },
                  { value: "Custom",              text: "Custom" },
                ]}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary">Max Kits (units)</label>
                <CustomInput
                  type="number"
                  min="0"
                  placeholder="e.g. 20"
                  value={vehicleForm.max_kits}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, max_kits: e.target.value })}
                />
                <p className="text-[10px] text-text-secondary">0 = unlimited</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary">Max System kW</label>
                <CustomInput
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 50"
                  value={vehicleForm.max_kw}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, max_kw: e.target.value })}
                />
                <p className="text-[10px] text-text-secondary">0 = unlimited</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary">Max Weight (kg)</label>
                <CustomInput
                  type="number"
                  min="0"
                  placeholder="e.g. 1500"
                  value={vehicleForm.max_weight_kg}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, max_weight_kg: e.target.value })}
                />
                <p className="text-[10px] text-text-secondary">0 = unlimited</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setVehicleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Vehicle
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ─── DRIVER MODAL ─── */}
      <Dialog 
        isOpen={driverModalOpen} 
        onClose={() => setDriverModalOpen(false)}
        title={editingDriver ? "Edit Driver Details" : "Register New Driver"}
        size="md"
      >
        <form onSubmit={handleDriverSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary">Driver Full Name</label>
            <CustomInput
              placeholder="e.g. Suresh Kumar"
              value={driverForm.name}
              onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Contact Number</label>
              <CustomInput
                placeholder="e.g. +91 98765 43210"
                value={driverForm.contact}
                onChange={(e) => setDriverForm({ ...driverForm, contact: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary">Driving License Number</label>
              <CustomInput
                placeholder="e.g. DL-1234567890"
                value={driverForm.license_number}
                onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Dropdown
              label="Assigned Vehicle"
              value={driverForm.assigned_vehicle_id}
              onChange={(val) => setDriverForm({ ...driverForm, assigned_vehicle_id: val })}
              options={[
                { value: "", text: "-- No vehicle assigned --" },
                ...vehicles.map(v => ({ value: v._id, text: `${v.name} (${v.registration_number})` }))
              ]}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" type="button" onClick={() => setDriverModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Driver
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
