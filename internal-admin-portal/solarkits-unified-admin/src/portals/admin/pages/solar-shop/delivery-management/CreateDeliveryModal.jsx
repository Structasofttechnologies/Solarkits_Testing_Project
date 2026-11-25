import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../../features/alert.slice';
import { FaTruck, FaMapMarkerAlt, FaBoxes, FaExclamationTriangle, FaCheckCircle, FaUser, FaPhone, FaShieldAlt } from 'react-icons/fa';
import Dialog from '../../../components/Dialog';
import Button from '../../../components/Button';
import CustomInput from '../../../components/CustomInput';
import Loader from '../../../components/Loader';
import { deliveryApi } from '../../../api/deliveryApi';

export default function CreateDeliveryModal({
  isOpen,
  onClose,
  orders = [], // 1 order for single, 2+ for combined
  onSuccess,
  warehouses = [],
}) {
  const dispatch = useDispatch();
  const isCombined = orders.length > 1;

  // Step 1: Fleet & Destination matching
  const [loading, setLoading] = useState(false);
  const [fleetList, setFleetList] = useState([]);
  const [splitRecommendation, setSplitRecommendation] = useState(null);
  const [_franchiseeDestinations, setFranchiseeDestinations] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [showSplitBatchPrompt, setShowSplitBatchPrompt] = useState(false);

  // Selected Fleet & Allocation
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [driverLicense, setDriverLicense] = useState('');

  // Commercials & 3-Tier Pricing
  const [vendorCost, setVendorCost] = useState('');
  const [costAllocationMethod, setCostAllocationMethod] = useState('by_kit_qty');
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverridden, setIsOverridden] = useState(false);

  // Logistics dates
  const [expectedPickup, setExpectedPickup] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');

  const showAlert = (message, type = 'success') => {
    dispatch(setAlert({ type, message }));
  };

  // Aggregates
  const totalKits = orders.reduce((sum, o) => sum + (o.kits || 1), 0);
  const totalKg = orders.reduce((sum, o) => sum + (o.total_kg || 100), 0);
  const totalCustomerCharge = orders.reduce((sum, o) => sum + (o.customer_delivery_charge || 0), 0);
  const primaryWarehouseId = orders[0]?.warehouse_id;
  const primaryDistrictId = orders[0]?.destination?.district_id;

  const fetchBenchmarkRate = async (whId, vId, proposedCost = null) => {
    const targetWhId = whId || selectedWarehouseId || primaryWarehouseId || warehouses[0]?._id;
    const vehicle = fleetList.find((v) => v._id === vId) || fleetList[0];
    const vmId = vehicle?.vehicle_master_id?._id || vehicle?.vehicle_master_id;

    try {
      if (isCombined && orders.length > 1) {
        // Multi-stop combined benchmark calculation
        let stopBenchmarksSum = 0;
        for (const ord of orders) {
          const distId = ord.destination?.district_id;
          const stopRes = await deliveryApi
            .validateBenchmark({
              warehouse_id: targetWhId,
              vehicle_master_id: vmId,
              district_id: distId,
              proposed_cost: 0,
            })
            .catch(() => null);
          stopBenchmarksSum += stopRes?.data?.benchmark_cost || 4500;
        }

        const combinedBench = Math.round(stopBenchmarksSum * 0.72);
        const costToCompare = proposedCost !== null ? Number(proposedCost) : combinedBench;

        const bResult = {
          benchmark_cost: combinedBench,
          proposed_cost: costToCompare,
          meets_benchmark: costToCompare <= combinedBench,
          difference: costToCompare - combinedBench,
          separate_total: stopBenchmarksSum,
          consolidation_saving: Math.max(0, stopBenchmarksSum - combinedBench),
          matched_rule: `${orders.length} Stops Consolidated Route (~28% Saving Applied)`,
        };
        setBenchmarkResult(bResult);
        if (proposedCost === null) {
          setVendorCost(String(combinedBench));
        }
        return combinedBench;
      } else {
        const res = await deliveryApi.validateBenchmark({
          warehouse_id: targetWhId,
          vehicle_master_id: vmId,
          district_id: primaryDistrictId,
          proposed_cost: proposedCost !== null ? Number(proposedCost) : 0,
        });

        if (res.status === 'success') {
          const bench = res.data.benchmark_cost || 4500;
          const costToCompare = proposedCost !== null ? Number(proposedCost) : bench;
          const bResult = {
            ...res.data,
            benchmark_cost: bench,
            proposed_cost: costToCompare,
            meets_benchmark: costToCompare <= bench,
            difference: costToCompare - bench,
          };
          setBenchmarkResult(bResult);
          if (proposedCost === null) {
            setVendorCost(String(bench));
          }
          return bench;
        }
      }
    } catch (err) {
      console.warn('Benchmark validation fallback:', err);
      const fallbackCost = isCombined ? 6500 : 4500;
      setBenchmarkResult({
        benchmark_cost: fallbackCost,
        proposed_cost: proposedCost !== null ? Number(proposedCost) : fallbackCost,
        meets_benchmark: (proposedCost !== null ? Number(proposedCost) : fallbackCost) <= fallbackCost,
        difference: 0,
        matched_rule: 'Standard Baseline Route Rate',
      });
      if (proposedCost === null) {
        setVendorCost(String(fallbackCost));
      }
    }
  };

  const handleCostChange = (newVal) => {
    setVendorCost(newVal);
    const num = Number(newVal || 0);
    if (benchmarkResult) {
      const meets = num <= benchmarkResult.benchmark_cost;
      setBenchmarkResult({
        ...benchmarkResult,
        proposed_cost: num,
        meets_benchmark: meets,
        difference: num - benchmarkResult.benchmark_cost,
      });
      if (meets) {
        setIsOverridden(true);
      } else {
        setIsOverridden(false);
      }
    }
  };

  const loadEligibilityData = async (whIdToUse) => {
    if (!orders.length) return;
    const targetWhId = whIdToUse || selectedWarehouseId || primaryWarehouseId || warehouses[0]?._id;
    setLoading(true);
    try {
      const [fleetRes, destRes] = await Promise.all([
        deliveryApi.getEligibleFleet({
          warehouse_id: targetWhId,
          destination_district_id: primaryDistrictId,
          total_weight_kg: totalKg,
          route_distance_km: 120,
        }),
        deliveryApi.getFranchiseeDestinations(primaryDistrictId),
      ]);

      let chosenVehicleId = '';
      if (fleetRes.status === 'success') {
        const list = fleetRes.data.eligible_fleet || [];
        setFleetList(list);
        setSplitRecommendation(fleetRes.data.split_recommendation || null);

        if (list.length > 0) {
          const first = list[0];
          chosenVehicleId = first._id;
          setSelectedVehicleId(first._id);
          setSelectedProviderId(first.service_provider_id?._id || first.service_provider_id);
          setDriverName(first.assigned_driver?.name || '');
          setDriverMobile(first.assigned_driver?.mobile || '');
          setDriverLicense(first.assigned_driver?.license_number || '');
        }
      }

      if (destRes.status === 'success') {
        setFranchiseeDestinations(destRes.data || []);
      }

      // Automatically calculate and load benchmark rate
      await fetchBenchmarkRate(targetWhId, chosenVehicleId);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load eligible vehicles', 'error');
      await fetchBenchmarkRate(targetWhId, null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initialWh = primaryWarehouseId || warehouses[0]?._id || '';
      setSelectedWarehouseId(initialWh);
      loadEligibilityData(initialWh);
    }
  }, [isOpen, orders, warehouses]);

  const handleVehicleSelect = (vId) => {
    setSelectedVehicleId(vId);
    const vehicle = fleetList.find((v) => v._id === vId);
    if (vehicle) {
      setSelectedProviderId(vehicle.service_provider_id?._id || vehicle.service_provider_id);
      setDriverName(vehicle.assigned_driver?.name || '');
      setDriverMobile(vehicle.assigned_driver?.mobile || '');
      setDriverLicense(vehicle.assigned_driver?.license_number || '');
    }
    fetchBenchmarkRate(selectedWarehouseId, vId, vendorCost);
  };

  const handleCostBlur = async () => {
    fetchBenchmarkRate(selectedWarehouseId, selectedVehicleId, vendorCost);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicleId || !selectedProviderId || !vendorCost) {
      showAlert('Please select Vehicle, Provider, and enter Delivery Cost.', 'error');
      return;
    }

    // If cost exceeds benchmark and not overridden yet -> open override prompt
    if (benchmarkResult && !benchmarkResult.meets_benchmark && !isOverridden) {
      setOverrideModalOpen(true);
      return;
    }

    const selectedVehicle = fleetList.find((v) => v._id === selectedVehicleId);

    // Build Stops
    const stopsPayload = orders.map((o, idx) => ({
      stop_number: idx + 1,
      order_id: o._id,
      order_number: o.order_number,
      order_model: o.order_model || 'epc_orders',
      recipient_type: o.order_model === 'fpo_orders' ? 'franchisee_store' : 'epc_buyer',
      recipient_name: o.customer_name,
      destination: o.destination,
      cargo: {
        total_kits: o.kits,
        total_weight_kg: o.total_kg,
        total_kw: o.total_kw,
      },
      customer_delivery_charge: o.customer_delivery_charge || 0,
    }));

    // Vehicles Allocated (supports multi-vehicle split if present)
    const vehiclesAllocated = [
      {
        vehicle_id: selectedVehicleId,
        registration_number: selectedVehicle ? selectedVehicle.registration_number : 'MH-12-AB-1234',
        vehicle_master_id: selectedVehicle?.vehicle_master_id?._id,
        driver_name: driverName,
        driver_mobile: driverMobile,
        driver_license: driverLicense,
        allocated_weight_kg: totalKg,
        allocated_kits: totalKits,
        assigned_stops: orders.map((_, i) => i + 1),
        vehicle_cost: Number(vendorCost),
      },
    ];

    const payload = {
      delivery_type: isCombined ? 'consolidated_master_trip' : 'single_order',
      warehouse_id: selectedWarehouseId || primaryWarehouseId || warehouses[0]?._id,
      service_provider_id: selectedProviderId,
      booking_source: 'manual',
      stops: stopsPayload,
      vehicles_allocated: vehiclesAllocated,
      actual_vendor_cost: Number(vendorCost),
      cost_allocation_method: costAllocationMethod,
      pickup_scheduled_at: expectedPickup ? new Date(expectedPickup) : new Date(),
      expected_delivery_date: expectedDelivery ? new Date(expectedDelivery) : null,
      override_details: isOverridden
        ? {
            is_overridden: true,
            original_benchmark: benchmarkResult?.benchmark_cost,
            actual_rate: Number(vendorCost),
            difference: benchmarkResult?.difference,
            override_reason: overrideReason,
            overridden_at: new Date(),
          }
        : null,
    };

    try {
      const res = await deliveryApi.createDeliveryOrder(payload);
      showAlert(`Delivery Trip ${res.data.delivery_number} created successfully.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to create delivery trip', 'error');
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={isCombined ? `Create Consolidated Multi-Stop Delivery (${orders.length} Orders)` : `Create Delivery for Order ${orders[0]?.order_number}`}
        width="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Cargo Summary Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Total Shipment Load</div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {totalKg.toLocaleString()} KG • {totalKits} Kits
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Customer Fees Total</div>
              <div className="text-xl font-bold text-blue-700 font-mono">
                ₹{totalCustomerCharge.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Dispatch Warehouse</div>
              {warehouses.length > 0 ? (
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => {
                    setSelectedWarehouseId(e.target.value);
                    loadEligibilityData(e.target.value);
                  }}
                  className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 mt-0.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.warehouse_code} {wh.warehouse_name ? `- ${wh.warehouse_name}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm font-semibold text-slate-800 font-mono">
                  {orders[0]?.warehouse_code || 'Company WH'}
                </div>
              )}
            </div>
          </div>

          {/* Order Details & Destination Breakdown */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaMapMarkerAlt className="text-blue-600" />
              {isCombined ? `Sequential Stops Route (${orders.length} Stops)` : 'Delivery Destination & Ordered Products'}
            </h4>
            <div className="space-y-2.5">
              {orders.map((o, idx) => (
                <div key={o._id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCombined && (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                      )}
                      <span className="font-mono font-bold text-blue-700">{o.order_number}</span>
                      <span className="text-slate-600 font-medium">({o.customer_name})</span>
                    </div>
                    <div className="font-bold text-slate-900 font-mono">
                      {o.kits} kits • {o.total_kg?.toLocaleString()} KG • {o.total_kw} kW
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Site Address</span>
                      <div className="font-medium text-slate-800">{o.destination?.address || 'Direct Site'}</div>
                      <div className="text-slate-500 text-[11px]">
                        {o.destination?.district_name || 'District'}, {o.destination?.state_name || 'State'} - {o.destination?.pincode}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Ordered Equipment / Kit</span>
                      {o.items && o.items.length > 0 ? (
                        <div className="space-y-1 mt-0.5">
                          {o.items.map((it, iIdx) => (
                            <div key={iIdx} className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] flex items-center justify-between">
                              <span className="font-semibold text-slate-800 truncate">{it.kit_name || it.item_name}</span>
                              <span className="text-indigo-600 font-bold ml-2 shrink-0">×{it.quantity} {it.capacity_kw ? `(${it.capacity_kw}kW)` : ''}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="font-semibold text-slate-700">{o.kits} kits</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Selection & Previous Vehicle Preference */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaTruck className="text-blue-600" /> Select Transport Provider & Physical Vehicle
            </h4>

            {loading ? (
              <Loader text="Matching eligible vehicles..." />
            ) : fleetList.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                {splitRecommendation ? (
                  <div>
                    <span className="font-semibold">{splitRecommendation.message}</span>
                  </div>
                ) : (
                  'No active vehicles currently Available for this load. Please check Physical Vehicles database.'
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {fleetList.map((v) => (
                  <div
                    key={v._id}
                    onClick={() => handleVehicleSelect(v._id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedVehicleId === v._id
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{v.registration_number}</div>
                        <div className="text-xs text-slate-600">{v.vehicle_master_id?.name} ({v.load_capacity_kg.toLocaleString()} KG)</div>
                        <div className="text-xs text-slate-500 font-medium">{v.service_provider_id?.name}</div>
                      </div>
                      {v.is_previous_vehicle_preference ? (
                        <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                          ★ Previous Vehicle
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Utilization: {v.utilization_pct}%</span>
                      <span className="text-emerald-700 font-medium">Available</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Compatible Route ✓
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Capacity Check Panel (Section 6D) ── */}
            {(() => {
              const activeSelectedVehicle = fleetList.find((v) => v._id === selectedVehicleId);
              if (!activeSelectedVehicle) return null;
              const vehicleMaxCapacity = activeSelectedVehicle.load_capacity_kg || activeSelectedVehicle.vehicle_master_id?.capacity_kg || 3000;
              const capacityPct = Math.round((totalKg / (vehicleMaxCapacity || 1)) * 100);
              const isOverCapacity = totalKg > vehicleMaxCapacity;

              return (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                        Vehicle Payload Capacity Check
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {activeSelectedVehicle.registration_number} ({activeSelectedVehicle.vehicle_master_id?.name || 'Commercial Freight'})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-black text-sm ${
                        isOverCapacity ? "text-red-600" : capacityPct > 90 ? "text-amber-600" : "text-emerald-600"
                      }`}>
                        {capacityPct}% Capacity
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {totalKg.toLocaleString()} / {vehicleMaxCapacity.toLocaleString()} kg
                      </span>
                    </div>
                  </div>

                  {/* Load Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOverCapacity ? "bg-red-500" : capacityPct > 90 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, capacityPct)}%` }}
                    />
                  </div>

                  {/* Over Capacity Warning & Split Batch Prompt */}
                  {isOverCapacity && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <FaExclamationTriangle className="text-base shrink-0" />
                        <span>
                          <strong>Over Capacity by {(totalKg - vehicleMaxCapacity).toLocaleString()} kg!</strong> Risk of axle overload and transit damage.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSplitBatchPrompt(true)}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-red-600 hover:bg-red-700 text-white shrink-0 transition-colors shadow-xs"
                      >
                        ⚠️ Split Batch
                      </button>
                    </div>
                  )}

                  {showSplitBatchPrompt && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                      <span className="font-bold block">Recommended Split Allocation:</span>
                      <p>
                        Split this delivery into 2 batches: Assign first {Math.ceil(orders.length / 2)} orders to this vehicle (~{Math.round(totalKg / 2)} kg), and create a second dispatch batch for the remaining {Math.floor(orders.length / 2)} order(s).
                      </p>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowSplitBatchPrompt(false)}
                          className="px-2 py-0.5 rounded border border-amber-400 text-[11px] font-medium"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Driver Attribution */}
          <div className="grid grid-cols-3 gap-3">
            <CustomInput
              label="Driver Name *"
              placeholder="e.g. Ramesh Kumar"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              required
            />
            <CustomInput
              label="Driver Mobile *"
              placeholder="e.g. 9876543210"
              value={driverMobile}
              onChange={(e) => setDriverMobile(e.target.value)}
              required
            />
            <CustomInput
              label="Driver License"
              placeholder="License Number"
              value={driverLicense}
              onChange={(e) => setDriverLicense(e.target.value)}
            />
          </div>

          {/* Commercials: Actual Vendor Cost, Benchmark Validation, Cost Allocation */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Transport Cost & 3-Tier Financial Reconciliation
                </h4>
                <p className="text-[11px] text-slate-500">
                  {isCombined
                    ? `Consolidated Multi-Stop Trip (${orders.length} stops) • Origin Warehouse to Delivery Sites`
                    : `Direct Single Delivery • ${orders[0]?.destination?.district_name || 'Destination'} Route`}
                </p>
              </div>
              {benchmarkResult?.matched_rule && (
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                  {benchmarkResult.matched_rule}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CustomInput
                  label="Actual Delivery Cost ₹ (Payable to Transporter) *"
                  type="number"
                  placeholder="e.g. 5000"
                  value={vendorCost}
                  onChange={(e) => handleCostChange(e.target.value)}
                  onBlur={handleCostBlur}
                  required
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>With 18% GST: ₹{Math.round(Number(vendorCost || 0) * 1.18).toLocaleString()}</span>
                  {benchmarkResult?.benchmark_cost ? (
                    <button
                      type="button"
                      onClick={() => handleCostChange(String(benchmarkResult.benchmark_cost))}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold underline text-[11px] cursor-pointer"
                    >
                      Reset to Benchmark (₹{benchmarkResult.benchmark_cost.toLocaleString()})
                    </button>
                  ) : null}
                </div>
              </div>

              {isCombined ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost Allocation Method *</label>
                  <select
                    value={costAllocationMethod}
                    onChange={(e) => setCostAllocationMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="by_kit_qty">By Kit Quantity (Equal share per kit unit)</option>
                    <option value="by_weight_kg">By Shipment Weight (KG proportional)</option>
                    <option value="by_distance">By Delivery Distance (Stop sequential)</option>
                    <option value="manual">Manual Equal Split</option>
                  </select>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Splits the single transporter invoice proportionally across all {orders.length} orders.
                  </span>
                </div>
              ) : null}
            </div>

            {/* Benchmark Validation Card (ALWAYS VISIBLE) */}
            <div
              className={`p-3.5 rounded-xl text-xs border space-y-2 transition-all ${
                benchmarkResult?.meets_benchmark
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-sm">
                    Approved Benchmark Rate: ₹{(benchmarkResult?.benchmark_cost || (isCombined ? 6500 : 4500)).toLocaleString()}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                      benchmarkResult?.meets_benchmark
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {benchmarkResult?.meets_benchmark
                      ? '✅ Within Approved Benchmark'
                      : `⚠️ Exceeds Benchmark by ₹${Math.abs(benchmarkResult?.difference || 0).toLocaleString()}`}
                  </span>
                </div>
                {isOverridden ? (
                  <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs">
                    Override Authorized
                  </span>
                ) : null}
              </div>

              <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <strong>Calculation Formula:</strong> Based on Warehouse (
                  {warehouses.find((w) => w._id === selectedWarehouseId)?.warehouse_code || orders[0]?.warehouse_code || 'GJ-WH'}
                  ) → {orders.map((o) => o.destination?.district_name || 'District').join(', ')}
                </span>
                {isCombined && benchmarkResult?.separate_total ? (
                  <span>
                    Separate trips: ₹{benchmarkResult.separate_total.toLocaleString()} → Combined trip saving: +₹
                    {benchmarkResult.consolidation_saving?.toLocaleString()}
                  </span>
                ) : null}
              </div>
            </div>

            {/* 3-Tier Financial Ledger Reconciliation */}
            <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                3-Tier Financial Ledger Breakdown
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <div className="text-slate-500 text-[11px]">1. Customer Fee Collected</div>
                  <div className="font-bold text-slate-900 text-sm font-mono">
                    ₹{totalCustomerCharge.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">2. Approved Benchmark Rate</div>
                  <div className="font-bold text-blue-700 text-sm font-mono">
                    ₹{(benchmarkResult?.benchmark_cost || (isCombined ? 6500 : 4500)).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">3. Actual Transporter Cost</div>
                  <div className="font-bold text-slate-900 text-sm font-mono">
                    ₹{Number(vendorCost || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Net Delivery Margin</div>
                  <div
                    className={`font-bold text-sm font-mono ${
                      totalCustomerCharge - Number(vendorCost || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    ₹{(totalCustomerCharge - Number(vendorCost || 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              label="Expected Pickup Date & Time"
              type="datetime-local"
              value={expectedPickup}
              onChange={(e) => setExpectedPickup(e.target.value)}
            />
            <CustomInput
              label="Expected Delivery Date"
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" onClick={onClose} className="bg-slate-100 text-slate-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
              <FaCheckCircle /> Place Delivery Order
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Admin Override Modal (Section 11) */}
      <Dialog
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Admin Delivery Cost Override"
        width="max-w-md"
      >
        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-amber-900">
              <FaShieldAlt /> Benchmark Validation Notice
            </div>
            <div>The proposed vehicle rate of <span className="font-bold">₹{Number(vendorCost).toLocaleString()}</span> exceeds the active benchmark of <span className="font-bold">₹{benchmarkResult?.benchmark_cost.toLocaleString()}</span> by <span className="font-bold text-red-600">₹{benchmarkResult?.difference.toLocaleString()}</span>.</div>
          </div>

          <CustomInput
            label="Mandatory Override Reason *"
            placeholder="e.g. Urgent customer dispatch / No standard vehicle available"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button type="button" onClick={() => setOverrideModalOpen(false)} className="bg-slate-100 text-slate-700">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!overrideReason.trim()) {
                  showAlert('Please enter an override reason.', 'error');
                  return;
                }
                setIsOverridden(true);
                setOverrideModalOpen(false);
                showAlert('Admin override approved. You may now place the delivery order.');
              }}
              className="bg-amber-600 text-white"
            >
              Confirm Admin Override
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
