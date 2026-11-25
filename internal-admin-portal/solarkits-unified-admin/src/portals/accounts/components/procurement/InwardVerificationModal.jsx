import React, { useState } from "react";
import {
  FaWarehouse, FaCheckCircle, FaTimesCircle, FaFileInvoice,
  FaShieldAlt, FaExclamationTriangle, FaBoxes
} from "react-icons/fa";
import Dialog from "../Dialog";
import Button from "../Button";
import CustomInput from "../CustomInput";

export default function InwardVerificationModal({
  isOpen,
  onClose,
  purchaseIndent,
  destinationWarehouse,
  onConfirmInward,
  loading
}) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [qcPassed, setQcPassed] = useState(true);
  const [damageNotes, setDamageNotes] = useState("");
  const [acceptedQty, setAcceptedQty] = useState(
    purchaseIndent?.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1
  );

  if (!isOpen || !purchaseIndent) return null;

  const totalRequired = purchaseIndent.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!invoiceNo.trim()) {
      alert("Supplier Tax Invoice number is required.");
      return;
    }

    onConfirmInward({
      pi_id: purchaseIndent._id,
      customer_order_number: purchaseIndent.customer_order_number,
      warehouse_id: destinationWarehouse?.id || purchaseIndent.destination_warehouse_id,
      invoice_no: invoiceNo.trim(),
      invoice_date: invoiceDate,
      received_items: purchaseIndent.items.map(it => ({
        sku_id: it.sku_id,
        sku_code: it.sku_code,
        quantity: acceptedQty,
        unit_rate: it.unit_rate
      })),
      damage_notes: damageNotes,
      qc_passed: qcPassed
    });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Warehouse Physical Inward Verification & GRN" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 p-1 text-text-primary">
        
        {/* Warning Banner: Payment vs Inward Separation */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <FaShieldAlt className="text-amber-600 text-lg flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="text-amber-700 dark:text-amber-400 block mb-0.5 font-black uppercase tracking-wider">
              Critical Fulfilment Rule
            </strong>
            Supplier payment approval does NOT mark products as received. Warehouse staff must physically verify component quantity, condition, and supplier tax invoice before generating GRN.
          </div>
        </div>

        {/* PI & Order Details Card */}
        <div className="bg-surface border border-border rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase block">PI Number</span>
            <span className="text-xs font-mono font-black text-primary">{purchaseIndent.pi_number}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase block">Linked Order</span>
            <span className="text-xs font-black text-text-primary">{purchaseIndent.customer_order_number}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase block">Supplier</span>
            <span className="text-xs font-bold text-text-primary">{purchaseIndent.supplier_name}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase block">Destination</span>
            <span className="text-xs font-bold text-text-primary">{destinationWarehouse?.name || "Central Warehouse"}</span>
          </div>
        </div>

        {/* Physical Verification Fields */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <FaBoxes className="text-primary text-sm" />
            <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
              Physical Quantity & Invoice Details
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <CustomInput
                label="Supplier Tax Invoice No *"
                required
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="e.g. GST-2026-8809"
              />
            </div>
            <div>
              <CustomInput
                label="Invoice Date *"
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <CustomInput
                label="Accepted Quantity *"
                type="number"
                min="0"
                required
                value={acceptedQty}
                onChange={(e) => setAcceptedQty(parseInt(e.target.value) || 0)}
              />
              <span className="text-[10px] text-text-muted block mt-0.5">
                Expected: {totalRequired} units
              </span>
            </div>
          </div>

          {/* QC Inspection Selection */}
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1.5">
              QC Inspection Result *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setQcPassed(true)}
                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  qcPassed
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-surface text-text-muted border-border hover:border-emerald-500/50"
                }`}
              >
                <FaCheckCircle /> QC Passed (Zero Damage)
              </button>
              <button
                type="button"
                onClick={() => setQcPassed(false)}
                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  !qcPassed
                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                    : "bg-surface text-text-muted border-border hover:border-red-500/50"
                }`}
              >
                <FaExclamationTriangle /> Discrepancy / Damaged Goods
              </button>
            </div>
          </div>

          {!qcPassed && (
            <CustomInput
              label="Damage / Shortage Notes *"
              required={!qcPassed}
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="e.g. 2 solar panels broken in transit; packaging crushed on pallet 3."
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Generating GRN..." : "Confirm Physical Inward & Update Stock"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
