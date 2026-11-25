import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "../../app/authHeader";
import {
  FaBoxes,
  FaHistory,
  FaWarehouse,
  FaTruckLoading,
  FaCheckCircle,
  FaTag
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiCheckCircle as FiCheckCircleOutline, FiAlertCircle, FiSliders } from "react-icons/fi";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/account-api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.replace(/\/account-api$|\/admin-api$|\/api$/, "");
const BASE_URL = `${API_BASE}/account-api/trial-kits`;

const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const clean = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE}${clean}`;
};

export default function AccountsTrialKitStockPage() {
  const [comboKits, setComboKits] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAdjustmentTarget, setSelectedAdjustmentTarget] = useState(null);

  const [inwardForm, setInwardForm] = useState({
    combo_kit_id: "",
    kit_type: "",
    warehouse_id: "",
    quantity_received: 10,
    vendor_name: "",
    remarks: ""
  });

  const [adjustForm, setAdjustForm] = useState({
    adjustment_type: "increase_adjustment",
    quantity_change: 1,
    remarks: ""
  });

  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${BASE_URL}/stock`, { headers: authHeaderObj() });
      if (res.data?.success) {
        setComboKits(res.data.data || []);
        if (res.data.warehouses) {
          setWarehouses(res.data.warehouses);
        } else if (res.data.data?.[0]?.warehouse_allocations) {
          setWarehouses(res.data.data[0].warehouse_allocations.map(w => ({
            _id: w.warehouse_id,
            warehouse_name: w.warehouse_name,
            warehouse_code: w.warehouse_code
          })));
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load stock.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const handleOpenHistory = async () => {
    try {
      setShowHistoryModal(true);
      setHistoryLoading(true);
      const res = await axios.get(`${BASE_URL}/stock/history`, { headers: authHeaderObj() });
      if (res.data?.success) {
        setHistoryList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenInward = (kit, allocation = null) => {
    setError("");
    setInwardForm({
      combo_kit_id: kit.combo_kit_id || kit._id,
      kit_type: kit.name,
      warehouse_id: allocation?.warehouse_id || warehouses[0]?._id || "",
      quantity_received: 10,
      vendor_name: "",
      remarks: ""
    });
    setShowInwardModal(true);
  };

  const handleOpenAdjust = (kit, allocation) => {
    setError("");
    setSelectedAdjustmentTarget({
      inventory_id: allocation.inventory_id,
      combo_kit_id: kit.combo_kit_id || kit._id,
      kit_name: kit.name,
      warehouse_id: allocation.warehouse_id,
      warehouse_name: allocation.warehouse_name,
      available_stock: allocation.available_stock
    });
    setAdjustForm({
      adjustment_type: "increase_adjustment",
      quantity_change: 1,
      remarks: ""
    });
    setShowAdjustModal(true);
  };

  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await axios.post(`${BASE_URL}/stock/inward`, inwardForm, { headers: authHeaderObj() });
      if (res.data?.success) {
        setSuccess(res.data.message || "Inward recorded.");
        setShowInwardModal(false);
        fetchStock();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record inward.");
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const qty = parseInt(adjustForm.quantity_change, 10);
      const finalChange = adjustForm.adjustment_type === "decrease_adjustment" ? -Math.abs(qty) : Math.abs(qty);

      const res = await axios.post(`${BASE_URL}/stock/adjust`, {
        inventory_id: selectedAdjustmentTarget?.inventory_id,
        combo_kit_id: selectedAdjustmentTarget?.combo_kit_id,
        warehouse_id: selectedAdjustmentTarget?.warehouse_id,
        adjustment_type: adjustForm.adjustment_type,
        quantity_change: finalChange,
        remarks: adjustForm.remarks
      }, { headers: authHeaderObj() });

      if (res.data?.success) {
        setSuccess(res.data.message || "Stock adjusted.");
        setShowAdjustModal(false);
        fetchStock();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to adjust stock.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaBoxes className="text-emerald-600" />
            Accounts: Trial Kit Stock &amp; Inward Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Section 2: Manage trial kit stock allocations, record vendor inwards, and view live inventory for configured Combo Kits.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleOpenHistory}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FaHistory className="text-gray-500" />
            Allocation History
          </button>
          <button
            onClick={() => {
              if (comboKits.length > 0) handleOpenInward(comboKits[0]);
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FaTruckLoading className="text-emerald-600" />
            Vendor Stock Inward
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center justify-between">
          <span className="flex items-center gap-2"><FiAlertCircle /> {error}</span>
          <button onClick={() => setError("")}><FiX /></button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center justify-between">
          <span className="flex items-center gap-2"><FiCheckCircleOutline /> {success}</span>
          <button onClick={() => setSuccess("")}><FiX /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-gray-800">
          Configured Combo Kits ({comboKits.length})
        </div>
        <button
          onClick={fetchStock}
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="py-20 text-center text-sm text-gray-500">
          <FiRefreshCw className="animate-spin inline-block mr-2" />
          Loading Configured Combo Kits &amp; Warehouse Allocations...
        </div>
      )}

      {/* CARD FORMAT */}
      <div className="space-y-6">
        {comboKits.map((kit) => {
          const coverUrl = resolveImageUrl(kit.kit_image);
          const totalAvailable = kit.total_available_stock || 0;

          return (
            <div
              key={kit._id || kit.combo_kit_id}
              className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/70 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {coverUrl ? (
                      <img src={coverUrl} alt={kit.name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <FaBoxes className="text-2xl text-emerald-500 opacity-60" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-gray-900">{kit.name}</h2>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {kit.capacity} kW System
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Blueprint: {kit.blueprint_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <FaCheckCircle className="text-[10px]" />
                        TRIAL: {kit.trial_kit_quantity || 1} KITS (LIMIT: {kit.trial_kit_max_orders_per_buyer || 1}X/BUYER)
                      </span>
                      {kit.configured_brands?.map((brand) => (
                        <span key={brand} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                          <FaTag className="text-[9px] text-gray-400" /> {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-gray-500 font-semibold block">Total Available</span>
                    <span className={`text-lg font-black ${totalAvailable > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {totalAvailable} Kits
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenInward(kit)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FaTruckLoading /> Inward Stock
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4">Warehouse</th>
                      <th className="py-2.5 px-4 text-center">Available Stock</th>
                      <th className="py-2.5 px-4 text-center">Reserved</th>
                      <th className="py-2.5 px-4 text-center">Ordered</th>
                      <th className="py-2.5 px-4 text-center">Dispatched</th>
                      <th className="py-2.5 px-4 text-center">Delivered</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kit.warehouse_allocations?.map((alloc) => {
                      const isStockAvail = (alloc.available_stock || 0) > 0;
                      return (
                        <tr key={alloc.warehouse_id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-semibold text-gray-800">
                            <div className="flex items-center gap-1.5">
                              <FaWarehouse className="text-purple-600 shrink-0" />
                              <span>{alloc.warehouse_name || alloc.warehouse_code}</span>
                              {alloc.warehouse_code && (
                                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                  {alloc.warehouse_code}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${isStockAvail ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                              {alloc.available_stock || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-600">{alloc.reserved_stock || 0}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{alloc.ordered_quantity || 0}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{alloc.dispatched_quantity || 0}</td>
                          <td className="py-3 px-4 text-center text-emerald-700">{alloc.delivered_quantity || 0}</td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenAdjust(kit, alloc)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => handleOpenInward(kit, alloc)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Inward
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* INWARD MODAL */}
      {showInwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FaTruckLoading className="text-emerald-600" /> Record Vendor Inward
              </h3>
              <button onClick={() => setShowInwardModal(false)} className="cursor-pointer"><FiX /></button>
            </div>
            <form onSubmit={handleInwardSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Combo Kit</label>
                <select
                  value={inwardForm.combo_kit_id}
                  onChange={(e) => {
                    const sel = comboKits.find(k => (k.combo_kit_id || k._id) === e.target.value);
                    setInwardForm({ ...inwardForm, combo_kit_id: e.target.value, kit_type: sel ? sel.name : inwardForm.kit_type });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                >
                  {comboKits.map((k) => (
                    <option key={k.combo_kit_id || k._id} value={k.combo_kit_id || k._id}>
                      {k.name} ({k.capacity} kW)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Warehouse</label>
                <select
                  required
                  value={inwardForm.warehouse_id}
                  onChange={(e) => setInwardForm({ ...inwardForm, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>{w.warehouse_name || w.warehouse_code}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inwardForm.quantity_received}
                    onChange={(e) => setInwardForm({ ...inwardForm, quantity_received: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={inwardForm.vendor_name}
                    onChange={(e) => setInwardForm({ ...inwardForm, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowInwardModal(false)} className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer">Confirm Inward</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST MODAL */}
      {showAdjustModal && selectedAdjustmentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FiSliders className="text-emerald-600" /> Adjust Stock
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="cursor-pointer"><FiX /></button>
            </div>
            <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs space-y-1">
              <div><span className="font-semibold text-gray-600">Kit:</span> {selectedAdjustmentTarget.kit_name}</div>
              <div><span className="font-semibold text-gray-600">Warehouse:</span> {selectedAdjustmentTarget.warehouse_name}</div>
              <div><span className="font-semibold text-gray-600">Current Available:</span> <strong className="text-emerald-700">{selectedAdjustmentTarget.available_stock}</strong></div>
            </div>
            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Adjustment Type</label>
                <select
                  value={adjustForm.adjustment_type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                >
                  <option value="increase_adjustment">Increase (+)</option>
                  <option value="decrease_adjustment">Decrease (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustForm.quantity_change}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Remarks</label>
                <textarea
                  required
                  rows="2"
                  value={adjustForm.remarks}
                  onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                ></textarea>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAdjustModal(false)} className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FaHistory className="text-emerald-600" /> Stock Allocation History
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="cursor-pointer"><FiX /></button>
            </div>
            <div className="flex-1 overflow-y-auto mt-4">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-gray-500">Loading...</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Operation</th>
                      <th className="py-2 px-3">Kit</th>
                      <th className="py-2 px-3">Warehouse</th>
                      <th className="py-2 px-3 text-center">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyList.map((h) => (
                      <tr key={h._id}>
                        <td className="py-2 px-3 text-gray-500">{new Date(h.created_at).toLocaleDateString("en-IN")}</td>
                        <td className="py-2 px-3 capitalize font-semibold">{h.adjustment_type?.replace(/_/g, " ")}</td>
                        <td className="py-2 px-3">{h.kit_type}</td>
                        <td className="py-2 px-3">{h.warehouse_name}</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700">{h.quantity_change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowHistoryModal(false)} className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 text-xs cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
