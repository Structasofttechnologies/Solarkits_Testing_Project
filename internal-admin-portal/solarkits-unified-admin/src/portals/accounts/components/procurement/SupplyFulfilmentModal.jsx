import React, { useState, useEffect } from "react";
import {
  FaTruck, FaWarehouse, FaBuilding, FaCheckCircle,
  FaCalendarAlt, FaTimes, FaMapMarkerAlt, FaExchangeAlt
} from "react-icons/fa";
import Dialog from "../Dialog";
import Button from "../Button";
import CustomInput from "../CustomInput";

export default function SupplyFulfilmentModal({
  isOpen,
  onClose,
  purchaseIndent,
  destinationWarehouse,
  onSaveFulfilment,
  onUpdateDispatchStatus,
  loading
}) {
  const [method, setMethod] = useState("Company Pickup");
  const [supplierWarehouseAddress, setSupplierWarehouseAddress] = useState("");
  const [transportResponsibility, setTransportResponsibility] = useState("Company");
  const [transportCost, setTransportCost] = useState(0);
  const [expectedPickupDate, setExpectedPickupDate] = useState("");
  const [expectedDispatchDate, setExpectedDispatchDate] = useState("");
  const [expectedInwardDate, setExpectedInwardDate] = useState("");
  
  // Status update states (for supplier or logistics provider)
  const [statusUpdate, setStatusUpdate] = useState("Pending");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [dispatchReference, setDispatchReference] = useState("");
  const [actualDate, setActualDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (purchaseIndent?.fulfilment) {
      const f = purchaseIndent.fulfilment;
      setMethod(f.method || "Company Pickup");
      setSupplierWarehouseAddress(f.supplier_warehouse_address || "");
      setTransportResponsibility(f.transport_responsibility || (f.method === "Company Pickup" ? "Company" : "Supplier"));
      setTransportCost(f.transport_cost || 0);
      setExpectedPickupDate(f.expected_pickup_date ? new Date(f.expected_pickup_date).toISOString().split("T")[0] : "");
      setExpectedDispatchDate(f.expected_dispatch_date ? new Date(f.expected_dispatch_date).toISOString().split("T")[0] : "");
      setExpectedInwardDate(f.expected_inward_date ? new Date(f.expected_inward_date).toISOString().split("T")[0] : "");
      setStatusUpdate(f.supply_status || "Pending");
      setVehicleDetails(f.vehicle_details || "");
      setDispatchReference(f.dispatch_reference || "");
    }
  }, [purchaseIndent]);

  if (!isOpen || !purchaseIndent) return null;

  const handleConfigSubmit = (e) => {
    e.preventDefault();
    onSaveFulfilment({
      pi_id: purchaseIndent._id,
      method,
      supplier_warehouse_address: supplierWarehouseAddress,
      transport_responsibility: transportResponsibility,
      transport_cost: Number(transportCost) || 0,
      expected_pickup_date: method === "Company Pickup" ? expectedPickupDate : null,
      expected_dispatch_date: method === "Supplier Delivery" ? expectedDispatchDate : null,
      expected_inward_date: expectedInwardDate
    });
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    onUpdateDispatchStatus({
      pi_id: purchaseIndent._id,
      status_update: statusUpdate,
      vehicle_details: vehicleDetails,
      dispatch_reference: dispatchReference,
      date: actualDate
    });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Supply Fulfilment Method — PI #${purchaseIndent.pi_number}`} size="lg">
      <div className="space-y-5 p-1 text-text-primary">
        
        {/* Banner: Method Overview */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
              Supplier & Indent Reference
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-black text-text-primary">{purchaseIndent.supplier_name}</span>
              <span className="text-xs font-bold text-text-muted">•</span>
              <span className="text-xs font-bold text-primary font-mono">{purchaseIndent.pi_number}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
              Current Movement Status
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-surface border border-border text-text-primary mt-0.5">
              <FaTruck className="text-primary text-xs" />
              {purchaseIndent.fulfilment?.supply_status || "Pending"}
            </span>
          </div>
        </div>

        {/* 1. Configuration Section: Company Pickup vs Supplier Delivery */}
        <form onSubmit={handleConfigSubmit} className="space-y-4 bg-surface border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
              <FaExchangeAlt className="text-primary" /> Fulfilment Configuration
            </h3>
            <span className="text-[10px] text-text-muted font-bold">
              Exactly Two Methods
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => {
                setMethod("Company Pickup");
                setTransportResponsibility("Company");
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                method === "Company Pickup"
                  ? "bg-primary/5 border-primary shadow-xs"
                  : "bg-surface border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-text-primary">Option A — Company Pickup</span>
                {method === "Company Pickup" && <FaCheckCircle className="text-primary" />}
              </div>
              <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                Company assigns transport provider to collect goods from supplier warehouse and deliver to company destination warehouse.
              </p>
            </div>

            <div
              onClick={() => {
                setMethod("Supplier Delivery");
                setTransportResponsibility("Supplier");
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                method === "Supplier Delivery"
                  ? "bg-primary/5 border-primary shadow-xs"
                  : "bg-surface border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-text-primary">Option B — Supplier Delivery</span>
                {method === "Supplier Delivery" && <FaCheckCircle className="text-primary" />}
              </div>
              <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                Supplier arranges delivery of products to company destination warehouse with supplier dispatch reference.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <CustomInput
                label="Supplier Warehouse / Dispatch Point"
                value={supplierWarehouseAddress}
                onChange={(e) => setSupplierWarehouseAddress(e.target.value)}
                placeholder="e.g. Factory Bay 4, Mundra, Gujarat"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
                Transport Responsibility
              </label>
              <select
                value={transportResponsibility}
                onChange={(e) => setTransportResponsibility(e.target.value)}
                className="w-full p-2.5 bg-bg border border-border rounded-xl text-xs font-bold text-text-primary"
              >
                <option value="Company">Company</option>
                <option value="Supplier">Supplier</option>
                <option value="Third-party">Third-party Carrier</option>
              </select>
            </div>
            <div>
              <CustomInput
                label="Transport Cost (₹)"
                type="number"
                min="0"
                value={transportCost}
                onChange={(e) => setTransportCost(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              {method === "Company Pickup" ? (
                <CustomInput
                  label="Expected Pickup Date *"
                  type="date"
                  required
                  value={expectedPickupDate}
                  onChange={(e) => setExpectedPickupDate(e.target.value)}
                />
              ) : (
                <CustomInput
                  label="Expected Dispatch Date *"
                  type="date"
                  required
                  value={expectedDispatchDate}
                  onChange={(e) => setExpectedDispatchDate(e.target.value)}
                />
              )}
            </div>
            <div>
              <CustomInput
                label="Expected Inward Date *"
                type="date"
                required
                value={expectedInwardDate}
                onChange={(e) => setExpectedInwardDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Saving..." : "Save Fulfilment Configuration"}
            </Button>
          </div>
        </form>

        {/* 2. Live Supply Movement Tracking (Supplier / Transport Provider Updates) */}
        <form onSubmit={handleStatusSubmit} className="space-y-4 bg-surface border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
              <FaTruck className="text-primary" /> Live Movement & Transit Updates
            </h3>
            <span className="text-[10px] text-text-muted font-bold">
              Supplier / Transport Logging
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
                Update Supply Status *
              </label>
              <select
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value)}
                className="w-full p-2.5 bg-bg border border-border rounded-xl text-xs font-bold text-text-primary"
              >
                <option value="Pending">Pending</option>
                <option value="Ready for Pickup">Ready for Pickup (Supplier Confirmed)</option>
                <option value="Picked Up">Picked Up (Vehicle Loaded)</option>
                <option value="Dispatched">Dispatched (Left Factory)</option>
                <option value="In Transit">In Transit</option>
              </select>
            </div>

            <div>
              <CustomInput
                label="Vehicle / Carrier Details"
                value={vehicleDetails}
                onChange={(e) => setVehicleDetails(e.target.value)}
                placeholder="e.g. GJ-03-BW-1234 (12MT Truck)"
              />
            </div>

            <div>
              <CustomInput
                label="Dispatch / LR / Tracking No"
                value={dispatchReference}
                onChange={(e) => setDispatchReference(e.target.value)}
                placeholder="e.g. LR-2026-9901"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Updating..." : "Update Movement Status"}
            </Button>
          </div>
        </form>

      </div>
    </Dialog>
  );
}
