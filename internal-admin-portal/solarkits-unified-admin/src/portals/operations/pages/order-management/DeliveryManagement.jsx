import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCheckCircle, FaTruck, FaRoute, FaCalculator, FaMapMarkedAlt, 
  FaFileInvoice, FaMobileAlt, FaWhatsapp, FaUser, FaCheck, FaExclamationTriangle, FaFilePdf
} from 'react-icons/fa';

import Button from "../../components/Button";
import CustomInput from "../../components/CustomInput";
import Dropdown from "../../components/Dropdown";

// Sample Active Orders for Dispatch Selection
const initialOrders = [
  { id: 'ORD-9843', partner: 'Apex Solar Installers', region: 'Rajasthan', pincode: '302001', weight: 450, panels: 100, accessories: 15, value: 450000, selected: false },
  { id: 'ORD-9844', partner: 'Sunnovative Projects', region: 'Rajasthan', pincode: '302015', weight: 200, panels: 40, accessories: 8, value: 210000, selected: false },
  { id: 'ORD-9845', partner: 'Go Green Power Ltd', region: 'Maharashtra', pincode: '400001', weight: 900, panels: 200, accessories: 30, value: 950000, selected: false },
  { id: 'ORD-9846', partner: 'Solar Horizon India', region: 'Rajasthan', pincode: '302018', weight: 350, panels: 80, accessories: 12, value: 380000, selected: false },
];

const vehicleCatalog = [
  { type: 'Tata Ace', capacity: 800, suggestedWeight: 'Up to 700 KGs', rate: 12, driver: 'Suresh Kumar', contact: '+91 98765 43210' },
  { type: 'Bolero Pickup', capacity: 1500, suggestedWeight: '700 - 1400 KGs', rate: 18, driver: 'Ramesh Singh', contact: '+91 99887 76655' },
  { type: 'Eicher 14ft', capacity: 3500, suggestedWeight: '1400 - 3200 KGs', rate: 25, driver: 'Jagdish Yadav', contact: '+91 91234 56789' },
];

export default function DeliveryManagement() {
  const [activeStep, setActiveStep] = useState(1);
  const [orders, setOrders] = useState(initialOrders);
  
  // Selection states
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [eta, setEta] = useState('3.5 Hours');
  const [tollCost, setTollCost] = useState('450');
  const [fuelCost, setFuelCost] = useState('1200');
  
  // Delivery creation output
  const [createdDelivery, setCreatedDelivery] = useState(null);
  const [otpVerification, setOtpVerification] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('At Warehouse');

  // WhatsApp simulation states
  const [whatsappLogs, setWhatsappLogs] = useState([]);

  // Calculations for Step 1
  const selectedOrders = useMemo(() => orders.filter(o => o.selected), [orders]);
  
  const totals = useMemo(() => {
    let weight = 0;
    let panels = 0;
    let accessories = 0;
    let val = 0;
    selectedOrders.forEach(o => {
      weight += o.weight;
      panels += o.panels;
      accessories += o.accessories;
      val += o.value;
    });
    return { weight, panels, accessories, val };
  }, [selectedOrders]);

  const handleToggleOrder = (id) => {
    setOrders(orders.map(o => o.id === id ? { ...o, selected: !o.selected } : o));
  };

  // Generate dynamic route description based on selected orders
  const routeOptimizationText = useMemo(() => {
    if (selectedOrders.length === 0) return 'Jaipur Hub -> (Select orders)';
    return 'Jaipur Hub -> ' + selectedOrders.map(o => o.id).join(' -> ');
  }, [selectedOrders]);

  // Step 2: Auto suggesting vehicle & filtering list
  const suggestedVehicle = useMemo(() => {
    if (totals.weight === 0) return null;
    if (totals.weight <= 700) return vehicleCatalog[0]; // Tata Ace
    if (totals.weight <= 1400) return vehicleCatalog[1]; // Bolero Pickup
    return vehicleCatalog[2]; // Eicher
  }, [totals.weight]);

  // Reset selected vehicle when weight changes to ensure it's still valid
  useEffect(() => {
    if (selectedVehicle && selectedVehicle.capacity < totals.weight) {
      setSelectedVehicle(null);
    }
  }, [totals.weight]);

  // Filter vehicles where capacity is greater than or equal to total weight
  const filteredVehicles = useMemo(() => {
    return vehicleCatalog.filter(v => v.capacity >= totals.weight);
  }, [totals.weight]);

  const handleNextStep = () => {
    if (activeStep === 1 && selectedOrders.length === 0) {
      alert("Please select at least one order to build delivery route!");
      return;
    }
    if (activeStep === 2) {
      const activeVehicle = selectedVehicle || suggestedVehicle;
      if (!activeVehicle) {
        alert("Please select a vehicle!");
        return;
      }
    }
    setActiveStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setActiveStep(prev => Math.max(1, prev - 1));
  };

  // Step 3: Final delivery creation
  const handleCreateDelivery = () => {
    const deliveryId = `DLV-${Date.now().toString().slice(-6)}`;
    const vehicleObj = selectedVehicle || suggestedVehicle;
    setCreatedDelivery({
      deliveryId,
      orders: selectedOrders.map(o => o.id),
      vehicle: vehicleObj.type,
      driver: vehicleObj.driver,
      driverContact: vehicleObj.contact,
      totalWeight: totals.weight,
      totalCost: totals.val,
      ewayBill: `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
    });
    setWhatsappLogs(prev => [
      ...prev,
      `[WhatsApp to Customers]: Dispatch slip created for delivery ${deliveryId}. Driver ${vehicleObj.driver} assigned.`
    ]);
    setActiveStep(4);
  };

  const triggerWhatsAppUpdate = (statusText) => {
    const message = `[WhatsApp to Customers]: Delivery ${createdDelivery?.deliveryId} update - Status is now: "${statusText}". Driver contact: ${createdDelivery?.driverContact}`;
    setWhatsappLogs(prev => [...prev, message]);
    setTrackingStatus(statusText);
  };

  const verifyOTP = () => {
    if (otpVerification === '1234') {
      setOtpVerified(true);
      triggerWhatsAppUpdate('Delivered');
    } else {
      alert("Invalid OTP! Try using '1234' for demo simulation.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Delivery Routing & Dispatch</h1>
          <p className="text-text-secondary">Combine orders, optimize delivery routing path on the map, select eligible fleets and monitor dispatches</p>
        </div>

        {/* Custom Step Tracker */}
        <div className="flex items-center gap-2 text-xs font-bold text-text-secondary bg-card border border-border p-2 rounded-xl">
          {[1, 2, 3, 4].map(step => (
            <Button
              key={step}
              variant={activeStep === step ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => step <= activeStep ? setActiveStep(step) : null}
            >
              Step {step}
            </Button>
          ))}
        </div>
      </div>

      {/* STEP 1: Combine Orders & Route Optimization */}
      {activeStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
              <FaCalculator className="text-primary" />
              Step 1: Combine Customer Orders (Route Selection)
            </h3>
            <p className="text-xs text-text-secondary">
              Select active orders. Calculations of weight, panels count, and distance will compute dynamically.
            </p>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {orders.map(o => (
                <div 
                  key={o.id} 
                  onClick={() => handleToggleOrder(o.id)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${
                    o.selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/45'
                  }`}
                >
                  <div>
                    <span className="text-xs text-text-muted font-bold uppercase">{o.id}</span>
                    <h4 className="font-bold text-text-primary mt-1">{o.partner}</h4>
                    <p className="text-xs text-text-secondary mt-1">{o.region} - PIN {o.pincode}</p>
                    <div className="flex gap-3 text-[10px] font-bold text-text-muted mt-2">
                      <span>Weight: {o.weight} KGs</span>
                      <span>Panels: {o.panels} pcs</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    o.selected ? 'bg-primary border-primary text-white' : 'border-border'
                  }`}>
                    {o.selected && <FaCheck size={10} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map and Route Optimization Side Panel */}
          <div className="flex flex-col justify-between gap-4">
            <div className="card p-6 space-y-4 flex-1">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <FaRoute className="text-primary" />
                Live Route Optimization & Map View
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-text-secondary font-bold uppercase block">Optimized Multi-Drop Path</span>
                  <p className="p-3 bg-bg border border-border rounded-xl font-mono text-xs text-text-primary mt-1">
                    {routeOptimizationText}
                  </p>
                </div>

                <div className="flex justify-between text-xs p-2.5 bg-bg rounded-lg border border-border">
                  <span className="text-text-secondary">Expected ETA:</span>
                  <span className="font-bold text-text-primary">{selectedOrders.length > 0 ? eta : '0 Hours'}</span>
                </div>
              </div>

              {/* Map Simulator */}
              <div className="bg-bg border border-border rounded-xl flex-1 min-h-[180px] flex flex-col justify-center items-center text-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 flex items-center justify-center opacity-30">
                  <FaRoute className="text-8xl text-primary" />
                </div>
                <div className="relative z-10 space-y-2">
                  <FaMapMarkedAlt className="text-3xl text-primary mx-auto" />
                  <h4 className="font-bold text-text-primary text-sm">Route Mapping Engine</h4>
                  <p className="text-[10px] text-text-secondary max-w-xs mx-auto">
                    {selectedOrders.length > 0 
                      ? `Plotted coordinates for ${selectedOrders.length} dropoff locations in ${selectedOrders[0].region}.`
                      : 'Select orders to plot optimized path route.'}
                  </p>
                </div>
              </div>
            </div>

            {selectedOrders.length > 0 && (
              <div className="card p-5 bg-linear-to-r from-primary/5 to-transparent flex items-center justify-between gap-4 shrink-0">
                <div className="text-xs">
                  <span className="text-text-secondary">Selected Weight:</span>
                  <h4 className="text-base font-bold text-text-primary">{totals.weight} KGs</h4>
                </div>
                <Button onClick={handleNextStep} variant="primary" size="md">
                  Proceed to Vehicle Costing
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Vehicle Selection & Toll/Fuel Costing */}
      {activeStep === 2 && (
        <div className="card p-6 space-y-6">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
            <FaTruck className="text-primary" />
            Step 2: Fleet Allocation & Trip Costing
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vehicle Catalog Column (Span 2) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center gap-3">
                <FaCheckCircle className="text-xl shrink-0" />
                <div>
                  <span className="text-xs font-bold uppercase">Engine Recommendation:</span>
                  <p className="text-sm font-semibold mt-0.5">
                    Recommended vehicle: <strong className="underline">{suggestedVehicle?.type}</strong> (Capacity: {suggestedVehicle?.capacity} KGs) for payload of {totals.weight} KGs.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-text-secondary uppercase">Eligible Vehicles (Capacity &gt;= {totals.weight} KGs):</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVehicles.map(v => (
                    <div 
                      key={v.type}
                      onClick={() => setSelectedVehicle(v)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        (selectedVehicle?.type === v.type || (!selectedVehicle && suggestedVehicle?.type === v.type)) 
                          ? 'border-primary bg-primary/5 font-semibold' 
                          : 'border-border hover:border-primary/45'
                      }`}
                    >
                      <h4 className="font-bold text-text-primary">{v.type}</h4>
                      <p className="text-xs text-text-secondary mt-1">Max Capacity: {v.capacity} KGs</p>
                      <p className="text-xs text-text-muted mt-0.5">Rate: ₹{v.rate}/km</p>
                      <div className="mt-3 pt-2 border-t border-border/60 text-xs text-text-secondary">
                        Driver: {v.driver} ({v.contact})
                      </div>
                    </div>
                  ))}
                  {filteredVehicles.length === 0 && (
                    <div className="p-4 text-center text-xs text-danger font-bold border border-danger/20 bg-danger/5 rounded-xl col-span-2">
                      ⚠️ Current payload of {totals.weight} KGs exceeds all vehicle limits in the fleet. Please split orders.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Toll & Fuel Costing Column */}
            <div className="card p-5 bg-bg/50 border border-border space-y-4">
              <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider border-b border-border pb-2">Trip Expense Inputs</h4>
              
              <div className="space-y-3">
                <CustomInput
                  label="Estimated Toll Charges"
                  type="number"
                  value={tollCost}
                  onChange={(e) => setTollCost(e.target.value)}
                />
                <CustomInput
                  label="Estimated Fuel Charges"
                  type="number"
                  value={fuelCost}
                  onChange={(e) => setFuelCost(e.target.value)}
                />
              </div>

              <div className="p-3 bg-linear-to-r from-success/5 to-transparent border border-success/15 rounded-xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Toll cost:</span>
                  <span className="font-bold text-text-primary">₹{tollCost || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Fuel cost:</span>
                  <span className="font-bold text-text-primary">₹{fuelCost || 0}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold text-sm">
                  <span>Grand Routing Cost:</span>
                  <span className="text-success">₹{(parseInt(fuelCost) || 0) + (parseInt(tollCost) || 0) + (85 * (selectedVehicle?.rate || suggestedVehicle?.rate || 12))}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border">
            <Button onClick={handlePrevStep} variant="secondary" size="md">Back</Button>
            <Button onClick={handleNextStep} variant="primary" size="md">Proceed to Finalize & Dispatch</Button>
          </div>
        </div>
      )}

      {/* STEP 3: Finalize & Print Dispatch */}
      {activeStep === 3 && (
        <div className="card p-6 space-y-6">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
            <FaFileInvoice className="text-primary" />
            Step 3: Finalize & Print Delivery Dispatch
          </h3>

          <div className="p-4 border border-border rounded-xl bg-bg space-y-3 max-w-md mx-auto text-xs">
            <h4 className="text-center font-bold text-sm text-text-primary pb-2 border-b border-border">E-WAY BILL / DISPATCH SLIP</h4>
            <div className="flex justify-between">
              <span className="text-text-secondary">Vehicle Allocated:</span>
              <span className="font-bold text-text-primary">{selectedVehicle?.type || suggestedVehicle?.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Driver Assigned:</span>
              <span className="font-bold text-text-primary">{selectedVehicle?.driver || suggestedVehicle?.driver}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Weight:</span>
              <span className="font-bold text-text-primary">{totals.weight} KGs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Combined Orders:</span>
              <span className="font-bold text-text-primary">{selectedOrders.length} Orders</span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="secondary" leftIcon={<FaFilePdf />}>
              Download Challan PDF
            </Button>
            <Button onClick={handleCreateDelivery} variant="success" leftIcon={<FaCheckCircle />}>
              Confirm & Dispatch Trip
            </Button>
          </div>

          <div className="flex justify-between pt-4 border-t border-border">
            <Button onClick={handlePrevStep} variant="secondary" size="md">Back</Button>
          </div>
        </div>
      )}

      {/* STEP 4: Live Delivery Tracking & WhatsApp Simulation */}
      {activeStep === 4 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 space-y-4 md:col-span-2">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
              <FaRoute className="text-primary" />
              Step 4: Live Dispatch & Route tracking
            </h3>

            <div className="flex justify-between items-center text-xs">
              <div>
                <span className="text-text-secondary">Delivery Ref:</span>
                <p className="font-bold text-text-primary">{createdDelivery?.deliveryId}</p>
              </div>
              <div>
                <span className="text-text-secondary">E-Way Bill:</span>
                <p className="font-bold text-text-primary">{createdDelivery?.ewayBill}</p>
              </div>
              <div>
                <span className="text-text-secondary">Driver Info:</span>
                <p className="font-bold text-text-primary">{createdDelivery?.driver} ({createdDelivery?.driverContact})</p>
              </div>
            </div>

            {/* Tracking Status Progress Map */}
            <div className="py-6 border-y border-border/60 grid grid-cols-5 text-center gap-2">
              {['At Warehouse', 'Loaded', 'Out for Delivery', 'Reached Site', 'Delivered'].map((status, idx) => {
                const isPassed = ['At Warehouse', 'Loaded', 'Out for Delivery', 'Reached Site', 'Delivered'].indexOf(trackingStatus) >= idx;
                return (
                  <div key={status} className="space-y-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold transition-all ${
                      isPassed ? 'bg-primary text-white' : 'bg-border/60 text-text-muted'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`text-[10px] font-bold block ${isPassed ? 'text-primary' : 'text-text-muted'}`}>{status}</span>
                  </div>
                );
              })}
            </div>

            {/* Control Triggers for simulation */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-text-secondary uppercase">Simulate Driver Logistics Updates:</label>
              <div className="flex flex-wrap gap-2">
                {['Loaded', 'Out for Delivery', 'Reached Site'].map(status => (
                  <Button
                    key={status}
                    variant="secondary"
                    size="sm"
                    onClick={() => triggerWhatsAppUpdate(status)}
                  >
                    Set {status}
                  </Button>
                ))}
              </div>
            </div>

            {/* Step 6: OTP Verification for Deliveries */}
            {trackingStatus === 'Reached Site' && !otpVerified && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-warning flex items-center gap-1.5 uppercase">
                  <FaMobileAlt /> Customer OTP Delivery Verification
                </h4>
                <div className="flex items-end gap-2">
                  <CustomInput
                    placeholder="Enter OTP (Use '1234')"
                    value={otpVerification}
                    onChange={(e) => setOtpVerification(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button onClick={verifyOTP} variant="primary" size="md">
                    Verify & Confirm Complete Delivery
                  </Button>
                </div>
              </div>
            )}

            {otpVerified && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-xl flex items-center gap-2 text-success text-xs font-bold">
                <FaCheckCircle /> OTP Verified Successfully! Delivery Completed.
              </div>
            )}
          </div>

          {/* STEP 4 Side: WhatsApp Automation Simulator Log */}
          <div className="card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3">
                <FaWhatsapp className="text-success" />
                WhatsApp Notifications
              </h3>
              <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {whatsappLogs.map((log, idx) => (
                  <div key={idx} className="p-2 bg-success/5 border border-success/15 text-[10px] text-text-secondary rounded-lg font-mono leading-relaxed">
                    {log}
                  </div>
                ))}
                {whatsappLogs.length === 0 && (
                  <span className="text-xs text-text-muted italic">Notifications will update on drivers status triggers...</span>
                )}
              </div>
            </div>

            <Button 
              variant="secondary"
              onClick={() => {
                // reset state
                setOrders(initialOrders);
                setSelectedVehicle(null);
                setCreatedDelivery(null);
                setOtpVerification('');
                setOtpVerified(false);
                setTrackingStatus('At Warehouse');
                setWhatsappLogs([]);
                setActiveStep(1);
              }}
            >
              Start New Batch Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
