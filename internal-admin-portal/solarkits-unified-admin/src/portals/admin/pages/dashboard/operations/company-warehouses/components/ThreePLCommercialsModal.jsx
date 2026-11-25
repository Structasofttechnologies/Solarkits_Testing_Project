import React, { useState, useEffect } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import CustomInput from "@/components/CustomInput";
import {
  FiClock,
  FiFileText,
  FiCheckCircle,
  FiSave
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

export default function ThreePLCommercialsModal({ warehouse, isOpen, onClose, onSuccess, moduleUniqueId }) {
  const dispatch = useDispatch();
  const [saving, setSaving] = useState(false);

  const [commercials, setCommercials] = useState({
    storage_charge_type: "per_sqft",
    storage_unit_rate: 0,
    handling_inward_rate: 0,
    handling_outward_rate: 0,
    loading_charge_per_ton: 0,
    unloading_charge_per_ton: 0,
    order_processing_per_order: 0,
    monthly_fixed_fee: 0,
    sla_inward_tat_hours: 24,
    sla_picking_tat_hours: 12,
    sla_dispatch_tat_hours: 24,
    payment_terms: "monthly_net_30"
  });

  useEffect(() => {
    if (warehouse?.commercial_settings) {
      setCommercials(prev => ({
        ...prev,
        ...warehouse.commercial_settings
      }));
    }
  }, [warehouse]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await axios.put(
        `${API}/warehouses/${warehouse.id}/commercials?unique_id=${moduleUniqueId}&req_for=edit`,
        { commercial_settings: commercials },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: "3PL commercial settings and SLA agreement saved successfully."
        }));
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to save commercial settings."
      }));
    } finally {
      setSaving(false);
    }
  };

  if (!warehouse) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="3PL Warehouse – Commercial Terms & SLA Configuration"
      size="2xl"
    >
      <form onSubmit={handleSave} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header Summary */}
        <div className="bg-surface-elevated/70 border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-text-primary">
              {warehouse.warehouse_name || warehouse.warehouse_code}
            </h4>
            <p className="text-xs text-text-muted">
              Vendor: <span className="font-semibold text-text-primary">{warehouse.vendor_name || "Logistics Vendor"}</span> • Billing & service charges are computed monthly for Account reconciliation.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20">
            3PL Agreement
          </span>
        </div>

        {/* Section 1: Storage & Space Rates */}
        <div className="border border-border rounded-xl p-4 bg-surface space-y-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <FaRupeeSign className="w-4 h-4 text-primary" />
            Storage & Space Charges
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Storage Billing Metric
              </label>
              <select
                value={commercials.storage_charge_type}
                onChange={(e) => setCommercials(prev => ({ ...prev, storage_charge_type: e.target.value }))}
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="per_sqft">Per Sq. Ft. Occupied</option>
                <option value="per_pallet">Per Pallet Slot</option>
                <option value="per_cbf">Per Cubic Foot (CBF)</option>
                <option value="per_sku">Per Kit SKU Stored</option>
                <option value="fixed_monthly">Fixed Monthly Rent</option>
              </select>
            </div>

            <CustomInput
              label="Storage Rate (₹)"
              type="number"
              min="0"
              step="0.01"
              value={commercials.storage_unit_rate}
              onChange={(e) => setCommercials(prev => ({ ...prev, storage_unit_rate: Number(e.target.value) }))}
              placeholder="e.g. 25.00"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <CustomInput
              label="Monthly Fixed Retainer / Service Fee (₹)"
              type="number"
              min="0"
              value={commercials.monthly_fixed_fee}
              onChange={(e) => setCommercials(prev => ({ ...prev, monthly_fixed_fee: Number(e.target.value) }))}
              placeholder="e.g. 15000"
            />

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Vendor Payment Terms
              </label>
              <select
                value={commercials.payment_terms}
                onChange={(e) => setCommercials(prev => ({ ...prev, payment_terms: e.target.value }))}
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="monthly_net_30">Monthly Billing (Net 30 Days)</option>
                <option value="monthly_net_15">Monthly Billing (Net 15 Days)</option>
                <option value="weekly">Weekly Settlement</option>
                <option value="per_transaction">Per Transaction Payout</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Material Handling & Operations */}
        <div className="border border-border rounded-xl p-4 bg-surface space-y-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <FiFileText className="w-4 h-4 text-primary" />
            Handling, Loading & Processing Fees
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CustomInput
              label="Inward Handling (₹ / Unit)"
              type="number"
              min="0"
              value={commercials.handling_inward_rate}
              onChange={(e) => setCommercials(prev => ({ ...prev, handling_inward_rate: Number(e.target.value) }))}
              placeholder="e.g. 50"
            />

            <CustomInput
              label="Outward Handling (₹ / Unit)"
              type="number"
              min="0"
              value={commercials.handling_outward_rate}
              onChange={(e) => setCommercials(prev => ({ ...prev, handling_outward_rate: Number(e.target.value) }))}
              placeholder="e.g. 50"
            />

            <CustomInput
              label="Order Processing (₹ / Order)"
              type="number"
              min="0"
              value={commercials.order_processing_per_order}
              onChange={(e) => setCommercials(prev => ({ ...prev, order_processing_per_order: Number(e.target.value) }))}
              placeholder="e.g. 100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <CustomInput
              label="Loading Fee (₹ / Ton or Vehicle)"
              type="number"
              min="0"
              value={commercials.loading_charge_per_ton}
              onChange={(e) => setCommercials(prev => ({ ...prev, loading_charge_per_ton: Number(e.target.value) }))}
            />

            <CustomInput
              label="Unloading Fee (₹ / Ton or Vehicle)"
              type="number"
              min="0"
              value={commercials.unloading_charge_per_ton}
              onChange={(e) => setCommercials(prev => ({ ...prev, unloading_charge_per_ton: Number(e.target.value) }))}
            />
          </div>
        </div>

        {/* Section 3: SLA Turnaround Times (TAT) */}
        <div className="border border-border rounded-xl p-4 bg-surface space-y-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <FiClock className="w-4 h-4 text-primary" />
            Agreed SLA Turnaround Time (Hours)
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CustomInput
              label="Inward QC & GRN TAT (Hours)"
              type="number"
              min="1"
              value={commercials.sla_inward_tat_hours}
              onChange={(e) => setCommercials(prev => ({ ...prev, sla_inward_tat_hours: Number(e.target.value) }))}
            />

            <CustomInput
              label="Kit Picking & Packing (Hours)"
              type="number"
              min="1"
              value={commercials.sla_picking_tat_hours}
              onChange={(e) => setCommercials(prev => ({ ...prev, sla_picking_tat_hours: Number(e.target.value) }))}
            />

            <CustomInput
              label="Dispatch & Handover (Hours)"
              type="number"
              min="1"
              value={commercials.sla_dispatch_tat_hours}
              onChange={(e) => setCommercials(prev => ({ ...prev, sla_dispatch_tat_hours: Number(e.target.value) }))}
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>

          <Button variant="primary" size="sm" type="submit" disabled={saving}>
            <FiSave className="w-4 h-4 mr-1.5" />
            {saving ? "Saving Terms..." : "Save Commercial Agreement"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
