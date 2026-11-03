import React, { useState, useEffect, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setAlert } from "../../features/alert.slice";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiCube, HiOutlineUpload, HiOutlineCheckCircle,
  HiOutlineExclamationCircle, HiOutlineClipboardList,
  HiOutlineHashtag, HiOutlineQrcode, HiOutlineDownload,
  HiOutlineSearch, HiOutlinePlus, HiOutlineTrash, HiDuplicate
} from 'react-icons/hi';
import { FaBoxes, FaBarcode, FaListAlt, FaExchangeAlt, FaDollyFlatbed, FaBuilding, FaCheckCircle, FaSpinner, FaFilePdf, FaEye, FaShippingFast, FaHandshake, FaInfoCircle, FaClock, FaUser, FaFileInvoice, FaUsers, FaLock, FaCheckDouble, FaPhoneAlt, FaTools, FaCheck, FaTruck, FaWarehouse, FaShieldAlt, FaExclamationTriangle, FaPaperPlane } from "react-icons/fa";
import { HiOutlineClock, HiOutlineEye, HiOutlineClipboardCheck, HiOutlineTruck, HiOutlineLocationMarker, HiOutlineExclamation } from "react-icons/hi";
import { getInwardActiveSkus, saveInward, getInwardLogs, getInwardStockStatus, getWarehousePurchaseOrders, markPurchaseOrderDelivered, uploadTaxInvoice, createPoRequest, getPoRequests, getOrderInwardFulfillment } from "../../api/inward";
import { getDeliveryOrders, inwardDeliveryOrder, recordInwardDiscrepancy } from "../../api/deliveryOrders";
import axios from "axios";
import { authHeaderObj } from "../../app/authHeader";

// Custom UI Components
import Button from "../../components/Button";
import CustomInput from "../../components/CustomInput";
import DropdownWithSearchInput from "../../components/DropdownWithSearchInput";
import ConfirmationPopup from "../../components/ConfirmationPopup";
import CustomTable from "../../components/CustomTable";
import Pagination from "../../components/Pagination";
import CustomFilePicker from "../../components/CustomFilePicker";
import Dialog from "../../components/Dialog";
import PageHeader from "../../components/PageHeader";
import NewOrdersDeliveryManager from "./NewOrdersDeliveryManager";
import { warehouseConfirmInward, getPurchaseIndents } from "../../../accounts/api/accounts";
import InwardVerificationModal from "../../../accounts/components/procurement/InwardVerificationModal";

// ─── Inline Proforma Invoice Modal ────────────────────────────────────────────
// ─── Inline Proforma Invoice Modal ────────────────────────────────────────────
function ProformaInvoiceModal({ isOpen, onClose, po, defaultTab = "po" }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // "po" or "pi"

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  if (!po) return null;

  const purchaseOrderPdf = po.purchase_order_pdf;
  const proformaPdfUrl = po.proforma_invoice_pdf;
  const totalValue = (po.items || []).reduce((acc, it) => acc + (it.qty * (it.order_price || 0)), 0);
  const issueDate = new Date(po.createdAt || po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const dueDate = new Date(po.timeline).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Order Documents Viewer" size="lg">
      <div className="space-y-4 p-1">
        {/* Toggle between PO and Proforma Invoice */}
        <div className="flex bg-surface-hover border border-border p-1 rounded-xl gap-1 max-w-xs">
          <button
            onClick={() => setActiveTab("po")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${
              activeTab === "po" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-surface-hover"
            }`}
          >
            Purchase Order
          </button>
          <button
            onClick={() => setActiveTab("pi")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${
              activeTab === "pi" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-surface-hover"
            }`}
          >
            Proforma Invoice
          </button>
        </div>

        {activeTab === "po" ? (
          purchaseOrderPdf ? (
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center bg-surface-hover border border-border p-3 rounded-xl">
                <div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Purchase Order No.</span>
                  <span className="text-sm font-black text-text-primary">#{po.po_number}</span>
                </div>
                <a
                  href={purchaseOrderPdf}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary/95 transition-all shadow-sm"
                >
                  <FaFilePdf size={10} /> Open In New Tab
                </a>
              </div>
              <div className="w-full h-[550px] border border-border rounded-xl overflow-hidden shadow-inner bg-slate-100 flex items-center justify-center">
                <iframe
                  src={purchaseOrderPdf}
                  className="w-full h-full"
                  title={`Purchase Order ${po.po_number}`}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <div>
                  <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Purchase Order (No PDF)</div>
                  <div className="text-xl font-black text-text-primary">{po.po_number}</div>
                  <div className="text-xs text-text-secondary mt-1">Issue Date: <span className="font-bold text-text-primary">{issueDate}</span></div>
                  <div className="text-xs text-text-secondary">Delivery Due: <span className="font-bold text-text-primary">{dueDate}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Status</div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                    po.status === 'delivered' ? 'bg-success/10 text-success border-success/20' :
                    po.status === 'paid' ? 'bg-success/10 text-success border-success/20' :
                    po.status === 'invoiced' ? 'bg-info/10 text-info border-info/20' :
                    'bg-warning/10 text-warning border-warning/20'
                  }`}>{po.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-hover/50 rounded-xl border border-border p-4 space-y-1">
                  <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Supplier / Vendor</div>
                  <div className="font-black text-text-primary text-sm">{po.supplier_id?.company_name || "N/A"}</div>
                  <div className="text-xs text-text-secondary">Brand: {po.supplier_id?.brand_name || "N/A"}</div>
                  {po.supplier_id?.gst_number && <div className="text-[10px] font-mono text-text-muted">GSTIN: {po.supplier_id.gst_number}</div>}
                </div>
                <div className="bg-surface-hover/50 rounded-xl border border-border p-4 space-y-1">
                  <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Delivery Warehouse</div>
                  <div className="font-black text-text-primary text-sm">{po.warehouse_id?.warehouse_code || "N/A"}</div>
                  <div className="text-xs text-text-secondary leading-relaxed">{po.warehouse_id?.address || "—"}</div>
                </div>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-surface-hover/50 px-4 py-2.5 border-b border-border">
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Ordered Items</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="px-4 py-3 text-left font-black text-text-muted uppercase tracking-wider text-[10px]">#</th>
                      <th className="px-4 py-3 text-left font-black text-text-muted uppercase tracking-wider text-[10px]">SKU Code</th>
                      <th className="px-4 py-3 text-left font-black text-text-muted uppercase tracking-wider text-[10px]">Product</th>
                      <th className="px-4 py-3 text-right font-black text-text-muted uppercase tracking-wider text-[10px]">Qty</th>
                      <th className="px-4 py-3 text-right font-black text-text-muted uppercase tracking-wider text-[10px]">Unit Price</th>
                      <th className="px-4 py-3 text-right font-black text-text-muted uppercase tracking-wider text-[10px]">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(po.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/30 transition-colors">
                        <td className="px-4 py-3 text-text-muted">{idx + 1}</td>
                        <td className="px-4 py-3 font-extrabold text-primary tracking-widest">{it.sku_code}</td>
                        <td className="px-4 py-3 font-semibold text-text-primary">{it.item_name || it.sku_details?.product_name || it.sku_code}</td>
                        <td className="px-4 py-3 text-right font-bold text-text-primary">{it.qty?.toLocaleString()} pcs</td>
                        <td className="px-4 py-3 text-right text-text-secondary font-mono">
                          {it.order_price_per_watt ? (
                            <span>
                              ₹{Number(it.order_price_per_watt).toFixed(2)}/W
                              <span className="text-[10px] text-text-secondary block font-bold mt-0.5">
                                (₹{Number(it.order_price).toFixed(2)}/pc)
                              </span>
                            </span>
                          ) : (
                            `₹${Number(it.order_price || 0).toLocaleString()}`
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-text-primary">₹{(it.qty * (it.order_price || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 border-t-2 border-primary/20">
                      <td colSpan={5} className="px-4 py-3 text-right font-black text-text-primary text-xs uppercase tracking-wider">Total Order Value</td>
                      <td className="px-4 py-3 text-right font-black text-primary text-sm">₹{totalValue.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {po.source_orders && po.source_orders.length > 0 && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800/40 p-3 space-y-2 mt-3">
                  <div className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FaUsers /> Customer Orders Covered by this Combined PO ({po.source_orders.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {po.source_orders.map((src, i) => (
                      <div key={i} className="bg-surface rounded-lg p-2.5 border border-purple-200/60 dark:border-purple-800/40 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-text-primary text-[11px]">{src.order_number || `#${String(src.order_id).slice(-6)}`}</span>
                          <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                            {src.order_type}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-secondary">{src.customer_name}</div>
                        {src.customer_contact && <div className="text-[9px] text-text-muted">{src.customer_contact}</div>}
                        {src.order_amount > 0 && (
                          <div className="text-[10px] font-bold text-primary mt-0.5">₹{src.order_amount.toLocaleString()}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          proformaPdfUrl ? (
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center bg-surface-hover border border-border p-3 rounded-xl">
                <div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Proforma Invoice PDF</span>
                </div>
                <a
                  href={proformaPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-info text-white text-xs font-black uppercase tracking-wider hover:bg-info/95 transition-all shadow-sm"
                >
                  <FaFilePdf size={10} /> Open In New Tab
                </a>
              </div>
              <div className="w-full h-[550px] border border-border rounded-xl overflow-hidden shadow-inner bg-slate-100 flex items-center justify-center">
                <iframe
                  src={proformaPdfUrl}
                  className="w-full h-full"
                  title={`Proforma Invoice ${po.po_number}`}
                />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-text-muted bg-surface-hover rounded-xl border border-dashed border-border italic">
              No Proforma Invoice document has been uploaded for this order yet.
            </div>
          )
        )}
      </div>
    </Dialog>
  );
}

// ─── Inward Details Modal ─────────────────────────────────────────────────────
function InwardDetailsModal({ isOpen, onClose, log, activeSkus }) {
  if (!log) return null;

  const totalQty = (log.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);
  const inwardDate = log.invoice_date ? new Date(log.invoice_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "N/A";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Inward Receipt Details" size="lg">
      <div className="space-y-4 p-1">
        <div className="flex justify-between items-start bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <div>
            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Goods Receipt Note (GRN)</div>
            <div className="text-xl font-black text-text-primary">{log.grn_no}</div>
            <div className="text-xs text-text-secondary mt-1">Inward Date: <span className="font-bold text-text-primary">{inwardDate}</span></div>
            <div className="text-xs text-text-secondary">Invoice / Ref No: <span className="font-bold text-text-primary">{log.invoice_no}</span></div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">QC Status</div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
              log.status === 'approved' ? 'bg-success/10 text-success border-success/20' :
              log.status === 'rejected' ? 'bg-danger/10 text-danger border-danger/20' :
              'bg-warning/10 text-warning border-warning/20'
            }`}>{log.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-hover/50 rounded-xl border border-border p-4 space-y-1">
            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Supplier / Origin</div>
            <div className="font-black text-text-primary text-sm">{log.supplier_name}</div>
            <div className="text-xs text-text-secondary">Type: <span className="capitalize">{log.inward_type}</span></div>
          </div>
          <div className="bg-surface-hover/50 rounded-xl border border-border p-4 space-y-1">
            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Receipt Summary</div>
            <div className="font-black text-text-primary text-sm">{totalQty.toLocaleString()} Total Units</div>
            {(log.items || []).some(it => {
              const sku = activeSkus.find(s => s.id === it.sku_id) || {};
              return sku.category === "Solar Panel" || sku.category?.toLowerCase()?.includes("solar");
            }) && (
              <div className="text-xs text-text-secondary">
                Capacity: {" "}
                <span className="font-bold text-text-primary">
                  {(log.items || []).reduce((acc, it) => {
                    const sku = activeSkus.find(s => s.id === it.sku_id) || {};
                    const isSolar = sku.category === "Solar Panel" || sku.category?.toLowerCase()?.includes("solar");
                    return acc + (isSolar ? (it.qty * (sku.wattage || 550)) / 1000 : 0);
                  }, 0).toFixed(2)} kW
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-surface-hover/50 px-4 py-2.5 border-b border-border">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Inwarded SKU Items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left font-black text-text-muted uppercase tracking-wider text-[10px]">#</th>
                  <th className="px-4 py-3 text-left font-black text-text-muted uppercase tracking-wider text-[10px]">SKU Code</th>
                  <th className="px-4 py-3 text-left font-black text-text-muted uppercase tracking-wider text-[10px]">Product / Brand</th>
                  <th className="px-4 py-3 text-right font-black text-text-muted uppercase tracking-wider text-[10px]">Qty Received</th>
                  <th className="px-4 py-3 text-left font-black text-text-muted uppercase tracking-wider text-[10px]">Allocation Rack</th>
                  <th className="px-4 py-3 text-left font-black text-text-muted uppercase tracking-wider text-[10px]">QC Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(log.items || []).map((it, idx) => {
                  const sku = activeSkus.find(s => s.id === it.sku_id) || {};
                  const isSolar = sku.category === "Solar Panel" || sku.category?.toLowerCase()?.includes("solar");
                  const itemKw = isSolar ? `${((it.qty * (sku.wattage || 550)) / 1000).toFixed(2)} kW` : null;

                  return (
                    <tr key={idx} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="px-4 py-3 text-text-muted">{idx + 1}</td>
                      <td className="px-4 py-3 font-extrabold text-primary tracking-widest">{sku.sku_code || it.sku_code || "N/A"}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text-primary">{sku.product_name || "N/A"}</div>
                        <div className="text-[10px] text-text-secondary">{sku.brand_name || "N/A"} ({sku.category || "N/A"})</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-text-primary">
                        <div>{it.qty?.toLocaleString()} pcs</div>
                        {itemKw && <div className="text-[10px] font-bold text-text-secondary">{itemKw}</div>}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">{it.allocation_rack || "N/A"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                          (it.qc_status || "passed").toLowerCase() === 'passed' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'
                        }`}>{it.qc_status || "Passed"}</span>
                        {it.damage_notes && <div className="text-[10px] text-danger font-medium mt-1">Notes: {it.damage_notes}</div>}
                        {it.serials && it.serials.length > 0 && (
                          <div className="mt-1 text-[9px] text-text-muted font-mono leading-tight whitespace-pre-line">
                            Serials: {it.serials.join(", ")}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

const initialPendingTransfers = [
  {
    transferId: "TRN-9091",
    origin: "Jaipur Main Hub (Master)",
    dateSent: "2026-06-14",
    items: [
      { category: "Solar Panel", brand: "Waaree", specs: "550W TOPCon", qty: 100, kws: 55 },
      { category: "Inverter", brand: "Solis", specs: "50kW", qty: 2, kws: 100 }
    ],
    status: "Awaiting Receipt"
  },
  {
    transferId: "TRN-9092",
    origin: "Ahmedabad GIDC Hub (Master)",
    dateSent: "2026-06-15",
    items: [
      { category: "ACDC Cables", brand: "Polycab", specs: "4 sq mm", qty: 20, kws: 0 }
    ],
    status: "Received"
  }
];

// ─── Procurement Inward Verification Modal (Online & Offline Modes) ─────────────
function ProcurementInwardModal({
  isOpen,
  onClose,
  purchaseIndent,
  destinationWarehouse,
  initialMode = "offline",
  onConfirmInward,
  loading
}) {
  const dispatch = useDispatch();
  const [inwardMode, setInwardMode] = useState(initialMode); // "offline" | "online"
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [qcPassed, setQcPassed] = useState(true);
  const [damageNotes, setDamageNotes] = useState("");
  const [defaultRack, setDefaultRack] = useState("BAY-A1-01");
  const [remarks, setRemarks] = useState("");

  // Items verification state: { [sku_code]: { accepted_qty, damaged_qty, missing_qty, rack_location } }
  const [itemsState, setItemsState] = useState({});
  // Online Scanner state
  const [scannerInput, setScannerInput] = useState("");
  const [scannedSerials, setScannedSerials] = useState([]);

  useEffect(() => {
    if (isOpen && purchaseIndent) {
      setInwardMode(initialMode || "offline");
      setInvoiceNo(
        purchaseIndent.fulfilment?.dispatch_reference ||
        purchaseIndent.fulfilment?.tracking_reference ||
        `INV-${purchaseIndent.pi_number}`
      );
      setInvoiceDate(new Date().toISOString().split("T")[0]);
      setQcPassed(true);
      setDamageNotes("");
      setDefaultRack("BAY-A1-01");
      setRemarks("");
      setScannerInput("");
      setScannedSerials([]);

      const initial = {};
      (purchaseIndent.items || []).forEach(it => {
        initial[it.sku_code || it.sku_id] = {
          accepted_qty: it.quantity || 1,
          damaged_qty: 0,
          missing_qty: 0,
          rack_location: "BAY-A1-01"
        };
      });
      setItemsState(initial);
    }
  }, [isOpen, purchaseIndent, initialMode]);

  if (!isOpen || !purchaseIndent) return null;

  const items = purchaseIndent.items || [];
  const totalExpectedQty = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  // Compute scanned counts per SKU
  const scannedCountPerSku = {};
  items.forEach(it => { scannedCountPerSku[it.sku_code] = 0; });
  scannedSerials.forEach(s => {
    if (scannedCountPerSku[s.sku_code] !== undefined) {
      scannedCountPerSku[s.sku_code]++;
    }
  });
  const totalScannedCount = scannedSerials.length;

  const handleScanSerial = (e) => {
    if (e) e.preventDefault();
    const barcode = scannerInput.trim();
    if (!barcode) return;

    if (scannedSerials.some(s => s.serial_code === barcode)) {
      dispatch(setAlert({ message: `Serial / Barcode "${barcode}" is already scanned!`, type: "warning" }));
      setScannerInput("");
      return;
    }

    let matchedItem = items.find(it =>
      (it.sku_code || "").toLowerCase() === barcode.toLowerCase() ||
      barcode.toLowerCase().includes((it.sku_code || "").toLowerCase())
    );
    if (!matchedItem) {
      matchedItem = items.find(it => (scannedCountPerSku[it.sku_code] || 0) < it.quantity);
    }
    if (!matchedItem) {
      matchedItem = items[0];
    }

    if (!matchedItem) {
      dispatch(setAlert({ message: `Could not match code "${barcode}" to any item in this indent.`, type: "warning" }));
      return;
    }

    const currentCount = scannedCountPerSku[matchedItem.sku_code] || 0;
    if (currentCount >= matchedItem.quantity) {
      dispatch(setAlert({ message: `All ${matchedItem.quantity} units of ${matchedItem.product_name} are already scanned!`, type: "warning" }));
      setScannerInput("");
      return;
    }

    const newEntry = {
      sku_code: matchedItem.sku_code,
      product_name: matchedItem.product_name,
      serial_code: barcode,
      scanned_at: new Date().toLocaleTimeString()
    };
    setScannedSerials(prev => [newEntry, ...prev]);
    setScannerInput("");
    dispatch(setAlert({ message: `✓ Scanned: ${matchedItem.product_name} (${barcode})`, type: "success" }));
  };

  const handleAutoFillRemaining = () => {
    const newSerials = [...scannedSerials];
    items.forEach(it => {
      const already = newSerials.filter(s => s.sku_code === it.sku_code).length;
      const remaining = it.quantity - already;
      for (let i = 1; i <= remaining; i++) {
        newSerials.push({
          sku_code: it.sku_code,
          product_name: it.product_name,
          serial_code: `${it.sku_code}-${purchaseIndent.pi_number.slice(-5)}-${String(already + i).padStart(4, '0')}`,
          scanned_at: new Date().toLocaleTimeString()
        });
      }
    });
    setScannedSerials(newSerials);
    dispatch(setAlert({ message: `Auto-generated barcode serials for all ${totalExpectedQty} units.`, type: "success" }));
  };

  const handleRemoveSerial = (serialCode) => {
    setScannedSerials(prev => prev.filter(s => s.serial_code !== serialCode));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!invoiceNo.trim()) {
      dispatch(setAlert({ message: "Supplier Tax Invoice / Gate Challan number is required.", type: "warning" }));
      return;
    }

    const receivedItems = items.map(it => {
      const st = itemsState[it.sku_code || it.sku_id] || {};
      const accepted = inwardMode === "online"
        ? (scannedCountPerSku[it.sku_code] || it.quantity)
        : (parseInt(st.accepted_qty) ?? it.quantity);
      return {
        sku_id: it.sku_id,
        sku_code: it.sku_code,
        quantity: Math.max(0, accepted),
        unit_rate: it.unit_rate,
        damaged_qty: parseInt(st.damaged_qty) || 0,
        missing_qty: parseInt(st.missing_qty) || 0,
        rack_location: st.rack_location || defaultRack
      };
    });

    const totalInwardQty = receivedItems.reduce((acc, it) => acc + it.quantity, 0);
    if (totalInwardQty <= 0) {
      dispatch(setAlert({ message: "Total accepted inward quantity must be greater than zero.", type: "warning" }));
      return;
    }

    onConfirmInward({
      pi_id: purchaseIndent._id,
      customer_order_number: purchaseIndent.customer_order_number || "WH-STOCK-PROCUREMENT",
      warehouse_id: destinationWarehouse?.id || purchaseIndent.destination_warehouse_id,
      invoice_no: invoiceNo.trim(),
      invoice_date: invoiceDate,
      received_items: receivedItems,
      damage_notes: !qcPassed ? damageNotes : "",
      qc_passed: qcPassed,
      inward_mode: inwardMode,
      remarks,
      scanned_serials: inwardMode === "online" ? scannedSerials : []
    });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Inward Shipment into Warehouse Inventory" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 p-1 text-text-primary">
        
        {/* Mode Selector Tabs */}
        <div className="flex bg-surface-hover border border-border p-1.5 rounded-2xl gap-2">
          <button
            type="button"
            onClick={() => setInwardMode("online")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              inwardMode === "online"
                ? "gradient-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-surface hover:text-text-primary"
            }`}
          >
            <HiOutlineQrcode className="text-base" />
            <span>Online Inward (Scanner Gun & QR Code Feed)</span>
          </button>
          <button
            type="button"
            onClick={() => setInwardMode("offline")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              inwardMode === "offline"
                ? "gradient-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-surface hover:text-text-primary"
            }`}
          >
            <HiOutlineClipboardCheck className="text-base" />
            <span>Offline Inward (Physical Gate Challan & Invoice)</span>
          </button>
        </div>

        {/* PI & Logistics Summary Card */}
        <div className="bg-surface border border-border rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase block">PI / Indent No</span>
            <span className="font-mono font-black text-primary text-sm">{purchaseIndent.pi_number}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase block">Supplier</span>
            <span className="font-bold text-text-primary block truncate">{purchaseIndent.supplier_name}</span>
            <span className="text-[10px] text-text-secondary">Brand: {purchaseIndent.supplier_brand || "N/A"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase block">Delivery Method & Vehicle</span>
            <span className="font-bold text-text-primary block">{purchaseIndent.fulfilment?.method || "Supplier Delivery"}</span>
            <span className="text-[10px] font-mono text-primary font-bold">{purchaseIndent.fulfilment?.vehicle_details?.vehicle_number || "No Vehicle"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase block">Destination Hub</span>
            <span className="font-bold text-text-primary block">{purchaseIndent.destination_warehouse_name || "Central Hub"}</span>
            <span className="text-[10px] text-text-secondary">Total: {totalExpectedQty} units</span>
          </div>
        </div>

        {/* Top Invoice and Rack Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface border border-border rounded-xl p-3.5">
          <CustomInput
            label="Supplier Tax Invoice / Gate Pass No *"
            required
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="e.g. GST-2026-9902 or GP-881"
          />
          <CustomInput
            label="Invoice Date *"
            type="date"
            required
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
          <CustomInput
            label="Default Storage Rack / Bay"
            value={defaultRack}
            onChange={(e) => setDefaultRack(e.target.value)}
            placeholder="e.g. BAY-A1-01"
          />
        </div>

        {/* MODE A: ONLINE SCANNER GUN VIEW */}
        {inwardMode === "online" && (
          <div className="space-y-4 bg-surface border border-primary/20 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <FaBarcode className="text-primary text-base" />
                  <span>Handheld Barcode / QR Scanner Feed</span>
                </h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Point laser scanner gun at product cartons or scan QR serial tags. Scans match live with indent items.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  {totalScannedCount} / {totalExpectedQty} Scanned
                </span>
                <button
                  type="button"
                  onClick={handleAutoFillRemaining}
                  className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 transition-all cursor-pointer"
                >
                  ⚡ Auto-Fill Remaining ({totalExpectedQty - totalScannedCount})
                </button>
              </div>
            </div>

            {/* Scan Gun Input Field */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <HiOutlineQrcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-lg pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Scan item barcode with gun or type serial & press Enter..."
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleScanSerial();
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-hover border-2 border-primary/30 rounded-xl text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleScanSerial}
                className="whitespace-nowrap px-4 py-2 text-xs"
              >
                Scan / Match
              </Button>
            </div>

            {/* SKU Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((it, idx) => {
                const count = scannedCountPerSku[it.sku_code] || 0;
                const pct = Math.min(100, Math.round((count / (it.quantity || 1)) * 100));
                const isComplete = count >= it.quantity;
                return (
                  <div key={idx} className="bg-surface-hover/80 border border-border/80 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-extrabold text-primary">{it.sku_code}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isComplete ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                      }`}>
                        {count} / {it.quantity} ({pct}%)
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-text-primary truncate">{it.product_name}</div>
                    <div className="w-full h-2 rounded-full bg-surface border border-border/60 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isComplete ? 'bg-success' : 'gradient-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scanned Serials Chip List */}
            {scannedSerials.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-text-muted">
                  <span>Scanned Serials Log ({scannedSerials.length})</span>
                  <button
                    type="button"
                    onClick={() => setScannedSerials([])}
                    className="text-danger hover:underline font-bold"
                  >
                    Clear All Scans
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto p-2 bg-surface-hover/50 border border-border rounded-xl flex flex-wrap gap-1.5">
                  {scannedSerials.map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface border border-border text-[10px] font-mono text-text-primary"
                    >
                      <span className="text-primary font-bold">{s.sku_code}:</span>
                      <span>{s.serial_code}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSerial(s.serial_code)}
                        className="text-text-muted hover:text-danger ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE B: OFFLINE GATE CHALLAN & ITEMS VERIFICATION VIEW */}
        {inwardMode === "offline" && (
          <div className="space-y-4 bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <FaBoxes className="text-primary text-base" />
                  <span>Physical Gate Challan Verification & Quantity Counting</span>
                </h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Verify unloaded cartons against supplier physical gate pass and assign warehouse rack locations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const filled = {};
                  items.forEach(it => {
                    filled[it.sku_code || it.sku_id] = {
                      accepted_qty: it.quantity,
                      damaged_qty: 0,
                      missing_qty: 0,
                      rack_location: defaultRack
                    };
                  });
                  setItemsState(filled);
                  dispatch(setAlert({ message: "Accepted all expected quantities.", type: "info" }));
                }}
                className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
              >
                ⚡ Accept Full Quantities
              </button>
            </div>

            {/* Items verification table */}
            <div className="border border-border/80 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                  <tr>
                    <th className="px-3.5 py-2.5">#</th>
                    <th className="px-3.5 py-2.5">SKU & Item Details</th>
                    <th className="px-3.5 py-2.5 text-center">Expected</th>
                    <th className="px-3.5 py-2.5 text-center">Accepted (Pcs)</th>
                    <th className="px-3.5 py-2.5 text-center">Damaged</th>
                    <th className="px-3.5 py-2.5 text-center">Missing</th>
                    <th className="px-3.5 py-2.5">Rack Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it, idx) => {
                    const stKey = it.sku_code || it.sku_id;
                    const st = itemsState[stKey] || {};
                    return (
                      <tr key={idx} className="hover:bg-surface-hover/30 transition-colors">
                        <td className="px-3.5 py-3 text-text-muted">{idx + 1}</td>
                        <td className="px-3.5 py-3">
                          <span className="font-mono font-extrabold text-primary block">{it.sku_code}</span>
                          <span className="font-semibold text-text-primary text-xs">{it.product_name}</span>
                          <span className="text-[10px] text-text-secondary block">{it.component_type}</span>
                        </td>
                        <td className="px-3.5 py-3 text-center font-bold text-text-secondary">
                          {it.quantity} pcs
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={it.quantity * 2}
                            value={st.accepted_qty ?? it.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setItemsState(prev => ({
                                ...prev,
                                [stKey]: { ...prev[stKey], accepted_qty: val }
                              }));
                            }}
                            className="w-20 p-1.5 text-center text-xs font-mono font-black bg-surface-hover border border-border rounded-lg text-primary focus:border-primary"
                          />
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={st.damaged_qty || ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setItemsState(prev => ({
                                ...prev,
                                [stKey]: { ...prev[stKey], damaged_qty: val }
                              }));
                              if (val > 0) setQcPassed(false);
                            }}
                            className="w-16 p-1.5 text-center text-xs font-mono bg-danger/10 border border-danger/30 rounded-lg text-danger placeholder:text-danger/40"
                          />
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={st.missing_qty || ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setItemsState(prev => ({
                                ...prev,
                                [stKey]: { ...prev[stKey], missing_qty: val }
                              }));
                              if (val > 0) setQcPassed(false);
                            }}
                            className="w-16 p-1.5 text-center text-xs font-mono bg-warning/10 border border-warning/30 rounded-lg text-warning placeholder:text-warning/40"
                          />
                        </td>
                        <td className="px-3.5 py-3">
                          <input
                            type="text"
                            placeholder={defaultRack}
                            value={st.rack_location || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemsState(prev => ({
                                ...prev,
                                [stKey]: { ...prev[stKey], rack_location: val }
                              }));
                            }}
                            className="w-28 p-1.5 text-xs font-mono bg-surface-hover border border-border rounded-lg text-text-primary focus:border-primary"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quality Control (QC) Inspection Block */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <label className="text-[11px] font-bold text-text-muted uppercase block">
            Quality Control (QC) & Physical Condition Inspection *
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
              <FaCheckCircle /> QC Passed (Zero Damage / Packaging Intact)
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
              <FaExclamationTriangle /> Discrepancy / Damaged Goods Found
            </button>
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

          <div>
            <label className="text-[10px] font-black text-text-muted uppercase block mb-1">
              Inward Staff Notes / Remarks
            </label>
            <textarea
              rows="2"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any additional inward observations (e.g. unloaded at Bay 4, driver signed gate pass)..."
              className="w-full p-2 text-xs bg-surface-hover border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="text-xs text-text-secondary">
            <span>GRN will immediately update warehouse stock for </span>
            <strong className="text-primary">{purchaseIndent.destination_warehouse_name || "Central Warehouse"}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
              leftIcon={<HiOutlineClipboardCheck className="text-base" />}
            >
              {loading ? "Generating GRN..." : "Confirm Inward & Generate GRN"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

export default function MaterialInward() {
  const dispatch = useDispatch();
  const [warehouseMode, setWarehouseMode] = useState(localStorage.getItem('warehouseMode') || 'master');
  const todayStr = new Date().toLocaleDateString('en-CA');

  // Purchase Orders (POs) State (initialized at top to prevent TDZ reference errors)
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);

  // Pagination states
  const [logsPage, setLogsPage] = useState(1);
  const logsPageSize = 5;

  const [posPage, setPosPage] = useState(1);
  const posPageSize = 5;

  const [stockPage, setStockPage] = useState(1);
  const stockPageSize = 5;

  // Watch for warehouse mode updates
  useEffect(() => {
    const handleModeChanged = () => {
      setWarehouseMode(localStorage.getItem('warehouseMode') || 'master');
      setLogsPage(1);
      setPosPage(1);
      setStockPage(1);
    };
    window.addEventListener('warehouseModeChanged', handleModeChanged);
    return () => window.removeEventListener('warehouseModeChanged', handleModeChanged);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  const handleViewInQueue = (ord) => {
    const prefix = location.pathname.startsWith("/warehouse-management-panel")
      ? "/warehouse-management-panel"
      : location.pathname.startsWith("/warehouse")
      ? "/warehouse"
      : location.pathname.startsWith("/admin-panel")
      ? "/admin-panel/solar-shop/india"
      : "/warehouse-management-panel";
    navigate(`${prefix}/delivery-management/queue`);
  };

  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem("inwardActiveTab");
    if (saved === "procurement") {
      sessionStorage.setItem("inwardActiveTab", "stock_pos");
      return "stock_pos";
    }
    return (saved === "inventory" || saved === "stock_pos") ? saved : "stock_pos";
  });

  const [indentsPage, setIndentsPage] = useState(1);
  const indentsPageSize = 5;

  const handleTabChange = (tabId) => {
    const sanitizedTab = tabId === "procurement" ? "stock_pos" : tabId;
    setActiveTab(sanitizedTab);
    sessionStorage.setItem("inwardActiveTab", sanitizedTab);
    setLogsPage(1);
    setPosPage(1);
    setStockPage(1);
    setFulfillmentPage(1);
    setIndentsPage(1);
  };

  const tabs = useMemo(() => {
    const activeCount = (purchaseOrders || []).filter(p => p.status !== 'delivered' && p.status !== 'cancelled').length;
    return [
      { 
        id: "stock_pos", 
        label: activeCount > 0 
          ? `📦 Warehouse Buffer Stock POs & GRN (${activeCount})` 
          : "📦 Warehouse Buffer Stock POs & GRN" 
      },
      { id: "inventory", label: "📊 Live Stock & Inward Logs" }
    ];
  }, [(purchaseOrders || []).length]);



  const [generalPoModalOpen, setGeneralPoModalOpen] = useState(false);
  const [generalPoItemName, setGeneralPoItemName] = useState('BOS Kit Assembly Raw Materials (ACDB, DCDB, MC4, Cables)');
  const [generalPoQty, setGeneralPoQty] = useState(10);
  const [generalPoNotes, setGeneralPoNotes] = useState('');
  const [generalPoCategory, setGeneralPoCategory] = useState('BOS Kit Components');
  const [submittingGeneralPo, setSubmittingGeneralPo] = useState(false);

  const handleOpenGeneralPoRequestModal = () => {
    setGeneralPoItemName('BOS Kit Assembly Raw Materials (ACDB, DCDB, MC4, Cables)');
    setGeneralPoQty(10);
    setGeneralPoNotes('');
    setGeneralPoCategory('BOS Kit Components');
    setGeneralPoModalOpen(true);
  };

  const handleSubmitGeneralPoRequest = async (e) => {
    e.preventDefault();
    if (generalPoQty <= 0) return;
    try {
      setSubmittingGeneralPo(true);
      const payload = [{
        sku_id: '672000000000000000000001',
        sku_code: generalPoCategory === 'BOS Kit Components' ? 'BOS-RAW-MAT-PKG' : 'WH-STOCK-BUFFER',
        qty: Number(generalPoQty)
      }];
      const res = await createPoRequest(payload);
      if (res && res.status === 'success') {
        dispatch(setAlert({
          message: `⚡ Procurement requisition for ${generalPoQty} units submitted successfully to Account Manager!`,
          type: 'success'
        }));
        setGeneralPoModalOpen(false);
        fetchPOs();
      }
    } catch (err) {
      console.error('Error submitting PO request:', err);
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to submit procurement request.',
        type: 'error'
      }));
    } finally {
      setSubmittingGeneralPo(false);
    }
  };

  // ─── Accounts Procurement Inward State (Warehouse Inventory Stocking) ───
  const [purchaseIndents, setPurchaseIndents] = useState([]);
  const [loadingIndents, setLoadingIndents] = useState(false);
  const [indentsFilter, setIndentsFilter] = useState("all"); // "all" | "in_transit" | "completed"
  const [indentsTransportFilter, setIndentsTransportFilter] = useState("all"); // "all" | "Supplier Delivery" | "Company Pickup"
  const [indentsSearch, setIndentsSearch] = useState("");

  // Procurement Inward Modal State
  const [procurementInwardModalOpen, setProcurementInwardModalOpen] = useState(false);
  const [selectedPiForModal, setSelectedPiForModal] = useState(null);
  const [modalInwardMode, setModalInwardMode] = useState("offline");

  const handleOpenPiInwardModal = (pi, mode = "offline") => {
    setSelectedPiForModal(pi);
    setModalInwardMode(mode);
    setProcurementInwardModalOpen(true);
  };

  const fetchPurchaseIndents = async () => {
    try {
      setLoadingIndents(true);
      const res = await getPurchaseIndents({ limit: 100 });
      if (res?.status === "success") {
        setPurchaseIndents(res.data?.indents || res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch purchase indents for inward:", err);
    } finally {
      setLoadingIndents(false);
    }
  };

  useEffect(() => {
    fetchPurchaseIndents();
  }, []);

  const filteredPurchaseIndents = useMemo(() => {
    return purchaseIndents.filter(pi => {
      const supplyStatus = pi.fulfilment?.supply_status || 'Pending';
      const isCompleted = supplyStatus === 'Inward Completed' || pi.pi_status === 'Completed';

      if (indentsFilter === 'in_transit' && isCompleted) return false;
      if (indentsFilter === 'completed' && !isCompleted) return false;

      const method = pi.fulfilment?.method || '';
      if (indentsTransportFilter !== 'all') {
        if (indentsTransportFilter === 'Supplier Delivery' && !method.toLowerCase().includes('supplier')) return false;
        if (indentsTransportFilter === 'Company Pickup' && !(method.toLowerCase().includes('company') || method.toLowerCase().includes('pickup'))) return false;
      }

      if (indentsSearch.trim()) {
        const q = indentsSearch.toLowerCase().trim();
        const piNum = (pi.pi_number || '').toLowerCase();
        const ordNum = (pi.customer_order_number || '').toLowerCase();
        const supp = (pi.supplier_name || '').toLowerCase();
        const brand = (pi.supplier_brand || '').toLowerCase();
        const carrier = (pi.fulfilment?.carrier_name || '').toLowerCase();
        const veh = (pi.fulfilment?.vehicle_details?.vehicle_number || '').toLowerCase();
        const driver = (pi.fulfilment?.vehicle_details?.driver_name || '').toLowerCase();
        const lr = (pi.fulfilment?.tracking_reference || pi.fulfilment?.dispatch_reference || '').toLowerCase();
        const hasItem = (pi.items || []).some(it => 
          (it.sku_code || '').toLowerCase().includes(q) || (it.product_name || '').toLowerCase().includes(q)
        );
        return piNum.includes(q) || ordNum.includes(q) || supp.includes(q) || brand.includes(q) || carrier.includes(q) || veh.includes(q) || driver.includes(q) || lr.includes(q) || hasItem;
      }

      return true;
    });
  }, [purchaseIndents, indentsFilter, indentsTransportFilter, indentsSearch]);

  const paginatedPurchaseIndents = useMemo(() => {
    const start = (indentsPage - 1) * indentsPageSize;
    return filteredPurchaseIndents.slice(start, start + indentsPageSize);
  }, [filteredPurchaseIndents, indentsPage]);

  const indentCounts = useMemo(() => {
    let inTransit = 0;
    let completed = 0;
    purchaseIndents.forEach(pi => {
      const isCompleted = pi.fulfilment?.supply_status === 'Inward Completed' || pi.pi_status === 'Completed';
      if (isCompleted) completed++;
      else inTransit++;
    });
    return { total: purchaseIndents.length, inTransit, completed };
  }, [purchaseIndents]);

  // ── Delivery Orders Inward State (Client Orders Inward Fulfillment) ──
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loadingDeliveryOrders, setLoadingDeliveryOrders] = useState(false);
  const [deliveryOrdersFilter, setDeliveryOrdersFilter] = useState("all"); // "all" | "pending" | "partial" | "completed"
  const [deliveryOrdersSearch, setDeliveryOrdersSearch] = useState("");
  const [inwardSubTab, setInwardSubTab] = useState("orders"); // "orders" (Customer Orders Inward) | "stock" (Warehouse Stock POs)

  // Order Inward Modal State
  const [orderInwardModalOpen, setOrderInwardModalOpen] = useState(false);
  const [selectedOrderForInward, setSelectedOrderForInward] = useState(null);
  const [inwardInputs, setInwardInputs] = useState({});
  const [inwardRemarks, setInwardRemarks] = useState('');
  const [submittingOrderInward, setSubmittingOrderInward] = useState(false);
  const [inwardType, setInwardType] = useState('warehouse');
  const [inwardExecutionMode, setInwardExecutionMode] = useState('manual');
  const [scannerInput, setScannerInput] = useState('');
  const [scannedSerials, setScannedSerials] = useState([]);
  const [pickupLocationDetails, setPickupLocationDetails] = useState({
    location_name: '',
    address: '',
    contact_person: '',
    contact_phone: ''
  });

  const fetchDeliveryOrders = async () => {
    try {
      setLoadingDeliveryOrders(true);
      const res = await getDeliveryOrders();
      if (res.status === 'success') {
        setDeliveryOrders(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch delivery orders for inward:', err);
    } finally {
      setLoadingDeliveryOrders(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOrders();
  }, []);

  const filteredDeliveryOrders = useMemo(() => {
    return deliveryOrders.filter(ord => {
      const items = ord.items || [];
      const totalPending = items.reduce((acc, it) => acc + (it.pending_qty || 0), 0);
      const totalReceived = items.reduce((acc, it) => acc + (it.received_qty || 0), 0);
      const isComplete = totalPending === 0 || ord.delivery_status === 'ready_for_dispatch';

      if (deliveryOrdersFilter === 'pending' && !(totalPending > 0 && totalReceived === 0)) return false;
      if (deliveryOrdersFilter === 'partial' && !(totalPending > 0 && totalReceived > 0)) return false;
      if (deliveryOrdersFilter === 'completed' && !isComplete) return false;

      if (deliveryOrdersSearch.trim()) {
        const q = deliveryOrdersSearch.toLowerCase().trim();
        const ordNo = (ord.order_number || '').toLowerCase();
        const doId = (ord.delivery_order_id || '').toLowerCase();
        const cust = (ord.customer_name || '').toLowerCase();
        const city = (ord.destination?.city || ord.destination?.district || '').toLowerCase();
        const truck = (ord.incoming_truck_group?.vehicle_number || '').toLowerCase();
        return ordNo.includes(q) || doId.includes(q) || cust.includes(q) || city.includes(q) || truck.includes(q);
      }
      return true;
    });
  }, [deliveryOrders, deliveryOrdersFilter, deliveryOrdersSearch]);

  const deliveryOrderCounts = useMemo(() => {
    let pending = 0;
    let partial = 0;
    let completed = 0;
    deliveryOrders.forEach(ord => {
      const items = ord.items || [];
      const totalPending = items.reduce((acc, it) => acc + (it.pending_qty || 0), 0);
      const totalReceived = items.reduce((acc, it) => acc + (it.received_qty || 0), 0);
      if (totalPending === 0 || ord.delivery_status === 'ready_for_dispatch') completed++;
      else if (totalReceived > 0) partial++;
      else pending++;
    });
    return { total: deliveryOrders.length, pending, partial, completed };
  }, [deliveryOrders]);

  const handleOpenOrderInwardModal = (order) => {
    setSelectedOrderForInward(order);
    const initialInputs = {};
    (order.items || []).forEach(it => {
      initialInputs[it.sku] = {
        qty: it.pending_qty,
        damaged_qty: 0,
        missing_qty: 0,
        rack_location: it.rack_location || ''
      };
    });
    setInwardInputs(initialInputs);
    setInwardRemarks('');
    setInwardType(order.inward_type || 'warehouse');
    setInwardExecutionMode('manual');
    setPickupLocationDetails(order.pickup_location_details || {
      location_name: '',
      address: '',
      contact_person: '',
      contact_phone: ''
    });
    setScannerInput('');
    setScannedSerials(order.scanned_serials || []);
    setOrderInwardModalOpen(true);
  };

  const handleScanItem = (e) => {
    if (e) e.preventDefault();
    const barcode = scannerInput.trim();
    if (!barcode || !selectedOrderForInward) return;

    const items = selectedOrderForInward.items || [];
    let matchedItem = items.find(it => it.sku.toLowerCase() === barcode.toLowerCase() || barcode.toLowerCase().includes(it.sku.toLowerCase()));
    if (!matchedItem) {
      matchedItem = items.find(it => (it.pending_qty || 0) > 0 && barcode.toLowerCase().includes((it.product_name || '').toLowerCase().slice(0, 5)));
    }
    if (!matchedItem) {
      matchedItem = items.find(it => (it.pending_qty || 0) > 0) || items[0];
    }
    if (!matchedItem) {
      dispatch(setAlert({ message: `Scanned code "${barcode}" could not be matched to any order item.`, type: 'warning' }));
      return;
    }
    if (scannedSerials.some(s => s.serial_code === barcode)) {
      dispatch(setAlert({ message: `Serial / QR "${barcode}" is already scanned!`, type: 'warning' }));
      setScannerInput('');
      return;
    }
    const currentQty = parseInt(inwardInputs[matchedItem.sku]?.qty) || 0;
    if (currentQty >= matchedItem.pending_qty) {
      dispatch(setAlert({ message: `All ${matchedItem.pending_qty} units of ${matchedItem.product_name} already accounted for!`, type: 'warning' }));
      setScannerInput('');
      return;
    }
    const newSerial = {
      sku: matchedItem.sku,
      product_name: matchedItem.product_name,
      serial_code: barcode,
      scanned_at: new Date().toISOString()
    };
    setScannedSerials(prev => [newSerial, ...prev]);
    setInwardInputs(prev => ({
      ...prev,
      [matchedItem.sku]: {
        ...prev[matchedItem.sku],
        qty: currentQty + 1
      }
    }));
    dispatch(setAlert({
      message: `Scanned: ${matchedItem.product_name} (Serial: ${barcode})`,
      type: 'success'
    }));
    setScannerInput('');
  };

  const handleSubmitOrderInward = async (e) => {
    e.preventDefault();
    if (!selectedOrderForInward) return;

    const itemsToInward = [];
    let hasDiscrepancy = false;

    for (const it of (selectedOrderForInward?.items || [])) {
      const input = inwardInputs[it.sku];
      const qty = parseInt(input?.qty) || 0;
      const damagedQty = parseInt(input?.damaged_qty) || 0;
      const missingQty = parseInt(input?.missing_qty) || 0;

      if (damagedQty > 0 || missingQty > 0) {
        hasDiscrepancy = true;
      }

      if (qty > 0 || damagedQty > 0 || missingQty > 0) {
        itemsToInward.push({
          sku: it.sku,
          qty,
          damaged_qty: damagedQty,
          missing_qty: missingQty,
          rack_location: input?.rack_location || it.rack_location
        });
      }
    }

    if (itemsToInward.length === 0) {
      dispatch(setAlert({
        message: 'Please enter at least one positive inward quantity.',
        type: 'warning'
      }));
      return;
    }

    try {
      setSubmittingOrderInward(true);
      if (hasDiscrepancy) {
        for (const itm of itemsToInward) {
          if (itm.damaged_qty > 0 || itm.missing_qty > 0) {
            await recordInwardDiscrepancy(selectedOrderForInward._id, {
              sku: itm.sku,
              received_qty: itm.qty,
              damaged_qty: itm.damaged_qty,
              missing_qty: itm.missing_qty,
              remarks: inwardRemarks
            });
          } else if (itm.qty > 0) {
            await inwardDeliveryOrder(selectedOrderForInward._id, {
              items: [{ sku: itm.sku, qty: itm.qty, rack_location: itm.rack_location }],
              remarks: inwardRemarks,
              inward_type: inwardType,
              inward_mode: inwardExecutionMode,
              scanned_serials: scannedSerials,
              pickup_location_details: inwardType === 'pickup_location' ? pickupLocationDetails : null
            });
          }
        }
        dispatch(setAlert({
          message: 'Inward recorded with discrepancy logging. Accounts team notified for debit note/replacement.',
          type: 'warning'
        }));
      } else {
        const res = await inwardDeliveryOrder(selectedOrderForInward._id, {
          items: itemsToInward,
          remarks: inwardRemarks,
          inward_type: inwardType,
          inward_mode: inwardExecutionMode,
          scanned_serials: scannedSerials,
          pickup_location_details: inwardType === 'pickup_location' ? pickupLocationDetails : null
        });
        dispatch(setAlert({
          message: res.message || 'Material inward verified & updated!',
          type: 'success'
        }));
      }

      setOrderInwardModalOpen(false);
      fetchDeliveryOrders();
    } catch (err) {
      console.error('Inward error:', err);
      dispatch(setAlert({
        message: err.response?.data?.message || 'Failed to record material inward.',
        type: 'error'
      }));
    } finally {
      setSubmittingOrderInward(false);
    }
  };

  // Dynamic States
  const [activeSkus, setActiveSkus] = useState([]);
  const [inwardLogs, setInwardLogs] = useState([]);
  const [stockStatus, setStockStatus] = useState([]);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);



  // ─── Warehouse Stock & Raw Materials PO Requisition to Account Manager ───
  const [notArrivedPopupOpen, setNotArrivedPopupOpen] = useState(false);
  const [notArrivedDetails, setNotArrivedDetails] = useState({ title: '', message: '' });
  const [highlightedPoNumber, setHighlightedPoNumber] = useState('');

  // Auto-detect focus/source parameters when navigated from BOS Kit Assembly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    const poNum = params.get('po');
    const reqNum = params.get('req');
    const modelId = params.get('model');

    if (source === 'boskit' || modelId || poNum || reqNum) {
      handleTabChange('stock_pos');
      if (poNum && poNum !== 'null' && poNum !== 'undefined' && poNum !== '') {
        setHighlightedPoNumber(poNum);
        const matched = (purchaseOrders || []).find(p => p.po_number === poNum || p.id === poNum || p._id === poNum);
        if (matched && (matched.status === 'paid' || matched.status === 'delivered')) {
          // Ready!
        } else {
          setNotArrivedDetails({
            title: "Shipment Not Yet Received at Dock",
            message: `PO #${poNum} ka raw material abhi warehouse dock par physically receive nahi hua hai. Supplier se dispatch hone ke baad jab physical shipment dock par arrive hogi, tab yahan Inward confirm karein.`
          });
          setNotArrivedPopupOpen(true);
        }
      } else {
        setNotArrivedDetails({
          title: "Raw Material Requisition Pending at Dock",
          message: `Requisition (${reqNum || modelId || 'BOS Kit Materials'}) ke liye abhi Supplier se material warehouse dock par physically arrive nahi hua hai. Pehle Account Manager PO approve karega aur Supplier truck dispatch karega tabhi yahan Inward confirm kar payenge.`
        });
        setNotArrivedPopupOpen(true);
      }
    }
  }, [(purchaseOrders || []).length]);

  // PO Status Filter
  const [poStatusFilter, setPoStatusFilter] = useState("All");

  // Proforma Invoice Modal
  const [proformaModalOpen, setProformaModalOpen] = useState(false);
  const [proformaPO, setProformaPO] = useState(null);
  const [proformaModalDefaultTab, setProformaModalDefaultTab] = useState("po");

  // Inward Details Modal
  const [inwardDetailsModalOpen, setInwardDetailsModalOpen] = useState(false);
  const [selectedInwardLog, setSelectedInwardLog] = useState(null);

  // Delivery Modal State
  const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
  const [selectedPOForDelivery, setSelectedPOForDelivery] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState({
    invoice_no: "",
    invoice_date: new Date().toLocaleDateString('en-CA'),
    invoice_pdf: "",
    supplier_gst: ""
  });
  const [deliveryFormError, setDeliveryFormError] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [itemDiscrepancies, setItemDiscrepancies] = useState([]);

  // (Pagination states moved to the top of MaterialInward)

  // ── Order Inward Fulfillment State (Client Order Procurement & Inward Tracking) ──
  const [fulfillmentOrders, setFulfillmentOrders] = useState([]);
  const [loadingFulfillment, setLoadingFulfillment] = useState(false);
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all"); // "all" | "ready" | "awaiting_inward" | "awaiting_payment"
  const [fulfillmentSearch, setFulfillmentSearch] = useState("");
  const [fulfillmentPage, setFulfillmentPage] = useState(1);
  const fulfillmentPageSize = 10;
  const [fulfillmentSummary, setFulfillmentSummary] = useState({
    total_orders: 0,
    ready_for_dispatch: 0,
    awaiting_inward: 0,
    awaiting_payment: 0
  });

  const [selectedPiForInward, setSelectedPiForInward] = useState(null);
  const [isPiInwardModalOpen, setIsPiInwardModalOpen] = useState(false);

  const handleConfirmPiInward = async (payload) => {
    try {
      setIsDelivering(true);
      const res = await warehouseConfirmInward(payload);
      if (res?.status === "success") {
        showAlert(
          res.message || `Inward verified and GRN generated: ${res.data?.grn_number || 'Success'}. Warehouse stock updated.`,
          "GRN Generated & Stock Inwarded",
          "success"
        );
        setIsPiInwardModalOpen(false);
        setProcurementInwardModalOpen(false);
        setSelectedPiForInward(null);
        setSelectedPiForModal(null);
        fetchPurchaseIndents();
        fetchStock();
        fetchLogs();
        fetchFulfillment();
        window.dispatchEvent(new Event('warehouseInventoryUpdated'));
        window.dispatchEvent(new Event('deliveryOrdersUpdated'));
        try {
          const raw = JSON.parse(localStorage.getItem('solarkits_warehouse_raw_stock') || '[]');
          if (Array.isArray(raw) && raw.length > 0) {
            const updated = raw.map(r => ({ ...r, qty: (r.qty || 0) + 100 }));
            localStorage.setItem('solarkits_warehouse_raw_stock', JSON.stringify(updated));
          }
          const savedReqs = JSON.parse(localStorage.getItem('solarkits_buffer_requisitions') || '{}');
          let modified = false;
          Object.keys(savedReqs).forEach(k => {
            savedReqs[k].status = 'inwarded';
            savedReqs[k].inward_completed_at = new Date().toISOString();
            modified = true;
          });
          if (modified) {
            localStorage.setItem('solarkits_buffer_requisitions', JSON.stringify(savedReqs));
          }
        } catch (_) {}
      } else {
        showAlert(res?.message || "Failed to confirm inward", "Error", "danger");
      }
    } catch (err) {
      showAlert(err?.response?.data?.message || err.message || "Failed to confirm inward", "Error", "danger");
    } finally {
      setIsDelivering(false);
    }
  };

  const fetchFulfillment = async () => {
    setLoadingFulfillment(true);
    try {
      const res = await getOrderInwardFulfillment();
      if (res?.status === "success") {
        setFulfillmentOrders(res.data || []);
        if (res.summary) setFulfillmentSummary(res.summary);
      }
    } catch (err) {
      console.error("Failed to load order fulfillment inward:", err);
    } finally {
      setLoadingFulfillment(false);
    }
  };

  const filteredFulfillmentOrders = useMemo(() => {
    return fulfillmentOrders.filter(ord => {
      if (fulfillmentFilter === "ready" && ord.overall_readiness !== "ready_for_dispatch") return false;
      if (fulfillmentFilter === "awaiting_inward" && ord.overall_readiness !== "awaiting_inward") return false;
      if (fulfillmentFilter === "awaiting_payment" && ord.overall_readiness !== "awaiting_supplier_payment") return false;

      if (fulfillmentSearch) {
        const q = fulfillmentSearch.toLowerCase();
        const ordNo = (ord.order_number || "").toLowerCase();
        const custName = (ord.customer_name || "").toLowerCase();
        const dest = (ord.destination || "").toLowerCase();
        const phone = (ord.customer_phone || "").toLowerCase();
        const panelPo = (ord.panel_po_number || "").toLowerCase();
        const invPo = (ord.inverter_po_number || "").toLowerCase();
        return ordNo.includes(q) || custName.includes(q) || dest.includes(q) || phone.includes(q) || panelPo.includes(q) || invPo.includes(q);
      }
      return true;
    });
  }, [fulfillmentOrders, fulfillmentFilter, fulfillmentSearch]);

  const paginatedFulfillmentOrders = useMemo(() => {
    const start = (fulfillmentPage - 1) * fulfillmentPageSize;
    return filteredFulfillmentOrders.slice(start, start + fulfillmentPageSize);
  }, [filteredFulfillmentOrders, fulfillmentPage]);

  const showAlert = (message, title = "Notification", variant = "info", onConfirm = null) => {
    // Map variant names to alert slice types
    const typeMap = { warning: 'warning', danger: 'error', success: 'success', info: 'info', error: 'error' };
    dispatch(setAlert({ type: typeMap[variant] || 'info', message }));
    if (onConfirm) {
      onConfirm();
    }
  };

  // Compliance checks for transfer receipt
  const [complianceChecks, setComplianceChecks] = useState([]);
  const handleComplianceChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setComplianceChecks(prev => [...prev, value]);
    } else {
      setComplianceChecks(prev => prev.filter(c => c !== value));
    }
  };

  // Master Form State
  const [supplierInvoiceForm, setSupplierInvoiceForm] = useState({
    supplierName: '',
    invoiceNo: '',
    invoiceDate: '',
    sku_id: '',
    qty: 100,
    invoice_price: '',
    allocationRack: 'Aisle A - Section 1',
    qcStatus: 'Passed',
    damageNotes: '',
    serials: ''
  });

  // Sub Form State
  const [pendingTransfers, setPendingTransfers] = useState(initialPendingTransfers);
  const [activeTransferToReceive, setActiveTransferToReceive] = useState(null);


  // Generated GRN simulator
  const [latestGRN, setLatestGRN] = useState(null);

  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState("bookings");

  const [poQty, setPoQty] = useState(1);
  const [submittingPoRequest, setSubmittingPoRequest] = useState(false);
  const [poRequestSuccess, setPoRequestSuccess] = useState("");
  const [skuPoRequests, setSkuPoRequests] = useState([]);
  const [loadingSkuPoRequests, setLoadingSkuPoRequests] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const fetchSkuPoRequests = async (skuId) => {
    setLoadingSkuPoRequests(true);
    try {
      const res = await getPoRequests(skuId);
      if (res && res.status === "success") {
        setSkuPoRequests(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch SKU PO requests:", err);
    } finally {
      setLoadingSkuPoRequests(false);
    }
  };

  const handleShowSkuInfo = (st) => {
    setSelectedStockItem(st);
    setActiveInfoTab("bookings");
    setPoQty(st.pre_booked_qty > 0 ? st.pre_booked_qty : 1);
    setPoRequestSuccess("");
    setSkuPoRequests([]);
    setInfoModalOpen(true);
    fetchSkuPoRequests(st.sku_id?._id || st.sku_id);
  };

  const handleRaisePoDirect = (st) => {
    setSelectedStockItem(st);
    setActiveInfoTab("raise_po");
    setPoQty(st.pre_booked_qty > 0 ? st.pre_booked_qty : 1);
    setPoRequestSuccess("");
    setSkuPoRequests([]);
    setInfoModalOpen(true);
    fetchSkuPoRequests(st.sku_id?._id || st.sku_id);
  };

  const handlePostPoRequest = async (e) => {
    e.preventDefault();
    if (poQty <= 0) return;
    setSubmittingPoRequest(true);
    setPoRequestSuccess("");
    try {
      const sku = selectedStockItem.sku_id || {};
      const skuCode = selectedStockItem.sku_code || sku.sku_code || "N/A";
      const payload = [{
        sku_id: sku._id || selectedStockItem.sku_id,
        sku_code: skuCode,
        qty: Number(poQty)
      }];
      const res = await createPoRequest(payload);
      if (res && res.status === "success") {
        setPoRequestSuccess("Procurement Request submitted successfully!");
        setPoQty(1);
        await fetchSkuPoRequests(sku._id || selectedStockItem.sku_id);
      }
    } catch (err) {
      console.error("Error submitting PO request:", err);
    } finally {
      setSubmittingPoRequest(false);
    }
  };

  useEffect(() => {
    const focusSkuId = searchParams.get("focus_sku");
    if (focusSkuId && stockStatus && stockStatus.length > 0) {
      const found = stockStatus.find(st => {
        const itemSkuId = st.sku_id?._id?.toString() || st.sku_id?.toString() || '';
        return itemSkuId === focusSkuId;
      });
      if (found) {
        handleRaisePoDirect(found);
        // Clear param to avoid re-opening
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("focus_sku");
        setSearchParams(newParams);
      }
    }
  }, [searchParams, stockStatus]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch functions
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await getInwardLogs("WH_MAT_INWARD");
      if (res && res.status === "success") {
        setInwardLogs(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch inward logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchStock = async () => {
    setLoadingStock(true);
    try {
      const res = await getInwardStockStatus("WH_MAT_INWARD");
      if (res && res.status === "success") {
        setStockStatus(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch stock status:", err);
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    const fetchSkus = async () => {
      setLoadingSkus(true);
      try {
        const res = await getInwardActiveSkus("WH_MAT_INWARD");
        if (res && res.status === "success") {
          setActiveSkus(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch active SKUs:", err);
      } finally {
        setLoadingSkus(false);
      }
    };

    fetchSkus();
    fetchLogs();
    fetchStock();
  }, [warehouseMode]);

  const fetchPOs = async () => {
    setLoadingPOs(true);
    try {
      const res = await getWarehousePurchaseOrders("WH_MAT_INWARD");
      if (res && res.status === "success") {
        setPurchaseOrders(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch POs in warehouse:", err);
    } finally {
      setLoadingPOs(false);
    }
  };

  const handleOpenDeliveryModal = (po) => {
    setSelectedPOForDelivery(po);
    setDeliveryForm({
      invoice_no: "",
      invoice_date: new Date().toLocaleDateString('en-CA'),
      invoice_pdf: "",
      supplier_gst: ""
    });
    setSelectedFile(null);
    setUploadingPdf(false);
    setDeliveryFormError("");

    const items = (po.items || []).map((it, idx) => ({
      item_id: it._id || idx,
      sku_code: it.sku_code || it.sku_id?.sku_code || `SKU-${idx + 1}`,
      name: it.item_name || it.sku_details?.product_name || it.sku_id?.name || "Solar Item",
      ordered_qty: it.qty || 1,
      received_qty: it.qty || 1,
      accepted_qty: it.qty || 1,
      damaged_qty: 0,
      discrepancy_notes: ""
    }));
    setItemDiscrepancies(items);

    setIsDeliverModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setDeliveryFormError("");
  };

  const handleMarkDelivered = async (e) => {
    if (e) e.preventDefault();
    if (!deliveryForm.invoice_no.trim() || !deliveryForm.invoice_date) {
      setDeliveryFormError("Tax Invoice Number and Date are required.");
      return;
    }

    if (!deliveryForm.supplier_gst.trim()) {
      setDeliveryFormError("Supplier GSTIN is required for verification.");
      return;
    }

    if (!selectedFile && !deliveryForm.invoice_pdf) {
      setDeliveryFormError("Please upload the Supplier Tax Invoice PDF or Image.");
      return;
    }

    setDeliveryFormError("");
    setIsDelivering(true);
    setUploadingPdf(true);

    let finalInvoicePdf = deliveryForm.invoice_pdf;

    if (selectedFile) {
      try {
        const res = await uploadTaxInvoice(selectedFile, "WH_MAT_INWARD");
        if (res && res.status === "success" && res.url) {
          finalInvoicePdf = res.url;
        } else {
          setDeliveryFormError(res.message || "Failed to upload file to cloud storage.");
          setIsDelivering(false);
          setUploadingPdf(false);
          return;
        }
      } catch (err) {
        console.error("Invoice upload error:", err);
        setDeliveryFormError(err.response?.data?.message || err.message || "Error uploading file.");
        setIsDelivering(false);
        setUploadingPdf(false);
        return;
      } finally {
        setUploadingPdf(false);
      }
    }

    try {
      const res = await markPurchaseOrderDelivered(
        selectedPOForDelivery.id || selectedPOForDelivery._id,
        {
          invoice_no: deliveryForm.invoice_no.trim(),
          invoice_date: deliveryForm.invoice_date,
          invoice_pdf: finalInvoicePdf.trim(),
          supplier_gst: deliveryForm.supplier_gst.trim().toUpperCase()
        },
        "WH_MAT_INWARD"
      );

      if (res && res.status === "success") {
        showAlert("Order delivery completed successfully! Stock updated.", "Success", "success");
        setIsDeliverModalOpen(false);
        fetchPOs();
        fetchStock();
        fetchLogs();
        fetchFulfillment();
        try {
          const raw = JSON.parse(localStorage.getItem('solarkits_warehouse_raw_stock') || '[]');
          if (Array.isArray(raw) && raw.length > 0) {
            const updated = raw.map(r => ({ ...r, qty: (r.qty || 0) + 150 }));
            localStorage.setItem('solarkits_warehouse_raw_stock', JSON.stringify(updated));
          }
          const savedReqs = JSON.parse(localStorage.getItem('solarkits_buffer_requisitions') || '{}');
          const poNum = selectedPOForDelivery?.po_number || selectedPOForDelivery?.po_id;
          let modified = false;
          Object.keys(savedReqs).forEach(k => {
            if (!poNum || savedReqs[k].po_number === poNum || savedReqs[k].status === 'ordered') {
              savedReqs[k].status = 'inwarded';
              savedReqs[k].inward_completed_at = new Date().toISOString();
              modified = true;
            }
          });
          if (modified) {
            localStorage.setItem('solarkits_buffer_requisitions', JSON.stringify(savedReqs));
          }
        } catch (_) {}
      } else {
        setDeliveryFormError(res.message || "Failed to mark delivery complete.");
      }
    } catch (err) {
      console.error(err);
      setDeliveryFormError(err.response?.data?.message || err.message || "Error completing delivery.");
    } finally {
      setIsDelivering(false);
    }
  };

  useEffect(() => {
    if (activeTab === "procurement") {
      fetchPurchaseIndents();
    } else if (activeTab === "stock_pos") {
      fetchPOs();
    } else if (activeTab === "inventory") {
      fetchStock();
      fetchLogs();
    } else if (activeTab === "supplier") {
      fetchFulfillment();
    }
  }, [activeTab]);

  // ----------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------
  // Dynamic Invoice Items lists
  const [supplierInvoiceItems, setSupplierInvoiceItems] = useState([]);


  const handleAddSupplierItem = (e) => {
    e?.preventDefault();
    const selectedSku = activeSkus.find(s => s.id === supplierInvoiceForm.sku_id);
    if (!selectedSku) {
      showAlert("Please select a valid SKU", "Validation Error", "warning");
      return;
    }
    if (!supplierInvoiceForm.invoice_price || Number(supplierInvoiceForm.invoice_price) <= 0) {
      showAlert("Please enter a valid invoice price", "Validation Error", "warning");
      return;
    }
    const isSolar = selectedSku.category === "Solar Panel" || selectedSku.category?.toLowerCase()?.includes("solar");
    const enteredPrice = Number(supplierInvoiceForm.invoice_price);
    const maxAllowedPrice = isSolar ? selectedSku.benchmark_price_per_watt : selectedSku.benchmark_price;
    if (enteredPrice > maxAllowedPrice) {
      showAlert(`Invoice price (${isSolar ? `₹${enteredPrice}/W` : `₹${enteredPrice}`}) cannot exceed benchmark limit (${isSolar ? `₹${maxAllowedPrice}/W` : `₹${maxAllowedPrice}`}).`, "Price Limit Exceeded", "danger");
      return;
    }
    if (Number(supplierInvoiceForm.qty) <= 0) {
      showAlert("Quantity must be greater than 0", "Validation Error", "warning");
      return;
    }

    const serialsArray = supplierInvoiceForm.serials.split('\n').filter(s => s.trim());
    if (serialsArray.length > 0 && serialsArray.length !== Number(supplierInvoiceForm.qty)) {
      showAlert(`Quantity is ${supplierInvoiceForm.qty} but you entered ${serialsArray.length} serial numbers. They must match if serials are provided.`, "Serial Count Mismatch", "warning");
      return;
    }

    const newItem = {
      sku_id: supplierInvoiceForm.sku_id,
      sku_code: selectedSku.sku_code,
      product_name: selectedSku.product_name,
      brand_name: selectedSku.brand_name,
      category: selectedSku.category,
      qty: Number(supplierInvoiceForm.qty),
      invoice_price: enteredPrice, // send the entered price (per watt for solar, total unit price for others)
      qc_status: supplierInvoiceForm.qcStatus,
      damage_notes: supplierInvoiceForm.damageNotes,
      serials: serialsArray,
      allocation_rack: supplierInvoiceForm.allocationRack
    };

    setSupplierInvoiceItems([...supplierInvoiceItems, newItem]);

    // Clear product fields only
    setSupplierInvoiceForm(prev => ({
      ...prev,
      sku_id: '',
      qty: 100,
      invoice_price: '',
      qcStatus: 'Passed',
      damageNotes: '',
      serials: ''
    }));
  };

  const handleDeleteSupplierItem = (index) => {
    setSupplierInvoiceItems(supplierInvoiceItems.filter((_, idx) => idx !== index));
  };



  const handleSupplierInvoiceSubmit = async (e) => {
    e?.preventDefault();
    if (!supplierInvoiceForm.supplierName || !supplierInvoiceForm.supplierName.trim()) {
      showAlert("Please enter the Supplier Name.", "Validation Error", "warning");
      return;
    }
    if (!supplierInvoiceForm.invoiceNo || !supplierInvoiceForm.invoiceNo.trim()) {
      showAlert("Please enter the Invoice Number.", "Validation Error", "warning");
      return;
    }
    if (!supplierInvoiceForm.invoiceDate) {
      showAlert("Please select the Invoice Date.", "Validation Error", "warning");
      return;
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (new Date(supplierInvoiceForm.invoiceDate) > today) {
      showAlert("Invoice date cannot be in the future.", "Validation Error", "warning");
      return;
    }
    if (supplierInvoiceItems.length === 0) {
      showAlert("Please add at least one product to the invoice.", "Validation Error", "warning");
      return;
    }

    try {
      const payload = {
        inward_type: "supplier",
        supplier_name: supplierInvoiceForm.supplierName,
        invoice_no: supplierInvoiceForm.invoiceNo,
        invoice_date: supplierInvoiceForm.invoiceDate,
        items: supplierInvoiceItems.map(item => ({
          sku_id: item.sku_id,
          qty: item.qty,
          invoice_price: item.invoice_price,
          qc_status: item.qc_status,
          damage_notes: item.damage_notes,
          serials: item.serials,
          allocation_rack: item.allocation_rack
        }))
      };

      const res = await saveInward(payload, "WH_MAT_INWARD");
      if (res && res.status === "success") {
        setSupplierInvoiceItems([]);
        setSupplierInvoiceForm({
          supplierName: '',
          invoiceNo: '',
          invoiceDate: '',
          sku_id: '',
          qty: 100,
          invoice_price: '',
          allocationRack: 'Aisle A - Section 1',
          qcStatus: 'Passed',
          damageNotes: '',
          serials: ''
        });
        fetchLogs();
        fetchStock();
        showAlert("Supplier stock inward invoice registered successfully!", "Success", "success", () => {
          handleTabChange('inventory');
        });
      } else {
        showAlert(res.message || "Failed to save inward.", "Save Failed", "danger");
      }
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || "Error saving inward entry.";
      showAlert(msg, "Error", "danger");
    }
  };



  const confirmTransferReceipt = (transfer) => {
    setPendingTransfers(pendingTransfers.map(t =>
      t.transferId === transfer.transferId ? { ...t, status: "Received" } : t
    ));

    setActiveTransferToReceive(null);
    showAlert("Transfer stock received successfully!", "Success", "success", () => {
      handleTabChange('inventory');
    });
  };

  // ----------------------------------------------------
  // MEMOIZED FILTERS
  // ----------------------------------------------------
  const filteredMasterLogs = useMemo(() => {
    return inwardLogs
      .filter(log => log.inward_type === 'supplier')
      .filter(log =>
        log.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.grn_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.invoice_no.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [inwardLogs, searchQuery]);

  const filteredSubLogs = useMemo(() => {
    return inwardLogs
      .filter(log => log.inward_type === 'local' || log.inward_type === 'transfer')
      .filter(log =>
        log.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.grn_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.invoice_no.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [inwardLogs, searchQuery]);

  const currentLogs = useMemo(() => {
    return inwardLogs.filter(log =>
      warehouseMode === 'sub'
        ? (log.inward_type === 'local' || log.inward_type === 'transfer')
        : log.inward_type === 'supplier'
    );
  }, [inwardLogs, warehouseMode]);

  const stockSummary = useMemo(() => {
    let solarPanelsQty = 0;
    let solarPanelsKw = 0;
    let invertersQty = 0;
    let invertersBrands = new Set();
    let cablesQty = 0;
    let cablesBrands = new Set();
    let structuresQty = 0;

    stockStatus.forEach(st => {
      const sku = st.sku_id || {};
      const prod = sku.product_id || {};
      const catName = prod.template_id?.name || "";
      const brandName = prod.brand_id?.brand_name || "";

      if (catName === "Solar Panel" || catName.toLowerCase().includes("solar")) {
        solarPanelsQty += st.qty || 0;
        solarPanelsKw += st.total_kw || 0;
      } else if (catName === "Inverter" || catName.toLowerCase().includes("inverter")) {
        invertersQty += st.qty || 0;
        if (brandName) invertersBrands.add(brandName);
      } else if (catName.toLowerCase().includes("cable")) {
        cablesQty += st.qty || 0;
        if (brandName) cablesBrands.add(brandName);
      } else {
        structuresQty += st.qty || 0;
      }
    });

    return [
      {
        title: "Solar Panels",
        count: `${solarPanelsQty} Units`,
        sub: `${solarPanelsKw.toFixed(2)} kW Total`,
        bg: "bg-blue-500/5"
      },
      {
        title: "Inverters",
        count: `${invertersQty} Units`,
        sub: invertersBrands.size > 0 ? Array.from(invertersBrands).join(" & ") : "Solis & Growatt",
        bg: "bg-purple-500/5"
      },
      {
        title: "ACDC Cables",
        count: `${cablesQty} Units`,
        sub: cablesBrands.size > 0 ? Array.from(cablesBrands).join(" & ") : "Polycab",
        bg: "bg-emerald-500/5"
      },
      {
        title: "Other / Structure Kits",
        count: `${structuresQty} Units`,
        sub: "Structure & Accessories",
        bg: "bg-amber-500/5"
      }
    ];
  }, [stockStatus]);

  const paginatedSubLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPageSize;
    return filteredSubLogs.slice(start, start + logsPageSize);
  }, [filteredSubLogs, logsPage]);

  const paginatedMasterLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPageSize;
    return filteredMasterLogs.slice(start, start + logsPageSize);
  }, [filteredMasterLogs, logsPage]);

  const renderInventoryRow = (st) => {
    const sku = st.sku_id || {};
    const prod = sku.product_id || {};
    const catName = prod.template_id?.name || "N/A";
    const brandName = prod.brand_id?.brand_name || "N/A";
    return (
      <>
        <td className="px-6 py-4 text-sm font-bold text-primary whitespace-nowrap">{st.sku_code}</td>
        <td className="px-6 py-4 text-sm font-semibold text-text-primary min-w-[200px]">{prod.name || "N/A"}</td>
        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{catName}</td>
        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{brandName}</td>
        <td className="px-6 py-4 text-sm text-right font-black text-text-primary whitespace-nowrap">{st.qty} pcs</td>
        <td className="px-6 py-4 text-sm text-right font-bold text-success whitespace-nowrap">{st.booked_qty || 0} pcs</td>
        <td className="px-6 py-4 text-sm text-right font-bold text-warning whitespace-nowrap">{st.reserved_qty || 0} pcs</td>
        <td className="px-6 py-4 text-sm text-right font-bold text-danger whitespace-nowrap">{st.pre_booked_qty || 0} pcs</td>
        <td className="px-6 py-4 text-sm text-right text-text-secondary whitespace-nowrap">
          {st.total_kw > 0 ? `${st.total_kw.toFixed(2)} kW` : "-"}
        </td>
        <td className="px-6 py-4 text-sm text-right text-text-secondary whitespace-nowrap">₹{st.average_invoice_price?.toLocaleString() || 0}</td>
        <td className="px-6 py-4 text-sm text-right text-text-secondary whitespace-nowrap">₹{st.average_benchmark_price?.toLocaleString() || 0}</td>
        <td className="px-6 py-4 text-sm text-center">
          <div className="flex items-center justify-center gap-1.5">
            <button 
              onClick={() => handleShowSkuInfo(st)}
              className="p-1 rounded bg-info/10 text-info hover:bg-info/20 border border-info/20 inline-flex items-center justify-center cursor-pointer"
              title="View allocation details"
            >
              <FaInfoCircle size={12} />
            </button>
            <button 
              onClick={() => handleRaisePoDirect(st)}
              className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 inline-flex items-center justify-center cursor-pointer"
              title="Direct PO Request"
            >
              <FaFileInvoice size={12} />
            </button>
          </div>
        </td>
      </>
    );
  };

  const renderSubLogRow = (log) => (
    <>
      <td className="px-6 py-4 text-sm font-bold text-primary">{log.grn_no}</td>
      <td className="px-6 py-4 text-sm font-semibold text-text-primary">{log.supplier_name}</td>
      <td className="px-6 py-4 text-sm text-text-secondary">{log.invoice_no}</td>
      <td className="px-6 py-4 text-sm text-text-secondary font-medium">
        {log.invoice_date ? new Date(log.invoice_date).toLocaleDateString() : ""}
      </td>
      <td className="px-6 py-4 text-sm">
        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${log.status === 'approved' ? 'bg-success/10 text-success border-success/20' :
            log.status === 'rejected' ? 'bg-danger/10 text-danger border-danger/20' :
              'bg-warning/10 text-warning border-warning/20'
          }`}>
          {log.status}
        </span>
      </td>
    </>
  );

  const renderMasterLogRow = (log) => {
    const totalQty = (log.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);
    const skuCount = (log.items || []).length;

    return (
      <>
        <td className="px-6 py-4 text-sm font-bold text-primary">
          {log.grn_no}
          <div className="text-[10px] text-text-secondary font-medium mt-0.5">
            {log.invoice_date ? new Date(log.invoice_date).toLocaleDateString() : ""}
          </div>
        </td>
        <td className="px-6 py-4 text-sm">
          <div className="font-semibold text-text-primary">{log.supplier_name}</div>
          <div className="text-[10px] text-text-secondary">{log.inward_type}</div>
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-text-primary">{log.invoice_no}</td>
        <td className="px-6 py-4 text-sm">
          <div className="font-bold text-text-primary">
            {skuCount} SKU{skuCount !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => { setSelectedInwardLog(log); setInwardDetailsModalOpen(true); }}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary font-black hover:underline"
          >
            <FaEye size={10} /> View Items
          </button>
        </td>

        <td className="px-6 py-4 text-sm text-center">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${log.status === 'approved' ? 'bg-success/10 text-success border-success/20' :
              log.status === 'rejected' ? 'bg-danger/10 text-danger border-danger/20' :
                'bg-warning/10 text-warning border-warning/20'
            }`}>
            {log.status}
          </span>
        </td>
      </>
    );
  };

  // Filtered POs based on status
  const filteredPOs = useMemo(() => {
    if (poStatusFilter === "All") return purchaseOrders;
    if (poStatusFilter === "Overdue") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return purchaseOrders.filter(po => {
        if (po.status === "delivered") return false;
        const timelineDateObj = new Date(po.timeline);
        timelineDateObj.setHours(0, 0, 0, 0);
        return timelineDateObj < today;
      });
    }
    if (poStatusFilter === "Invoiced") {
      return purchaseOrders.filter(po => po.status === "invoiced" || po.status === "paid");
    }
    return purchaseOrders.filter(po => po.status === poStatusFilter.toLowerCase());
  }, [purchaseOrders, poStatusFilter]);

  const paginatedPOs = useMemo(() => {
    const start = (posPage - 1) * posPageSize;
    return filteredPOs.slice(start, start + posPageSize);
  }, [filteredPOs, posPage]);

  const paginatedStock = useMemo(() => {
    const start = (stockPage - 1) * stockPageSize;
    return stockStatus.slice(start, start + stockPageSize);
  }, [stockStatus, stockPage]);

  const renderSkuInfoModal = () => {
    if (!selectedStockItem) return null;

    const sku = selectedStockItem.sku_id || {};
    const prod = sku.product_id || {};
    const skuCode = selectedStockItem.sku_code || sku.sku_code || "N/A";
    const productName = prod.name || "N/A";
    const catName = prod.template_id?.name || "N/A";
    const brandName = prod.brand_id?.brand_name || "N/A";

    const bookings = selectedStockItem.bookings_breakdown || [];
    const reservations = selectedStockItem.reservations_breakdown || [];
    const attrs = selectedStockItem.attributes || [];

    return (
      <Dialog
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title="Stock Allocation & Reservations Info"
        size="lg"
      >
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-border space-y-2">
            <h3 className="text-base font-black text-text-primary">{productName}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-text-secondary">
              <div>
                <span className="text-text-muted block">SKU Code</span>
                <span className="font-bold text-primary">{skuCode}</span>
              </div>
              <div>
                <span className="text-text-muted block">Category</span>
                <span>{catName}</span>
              </div>
              <div>
                <span className="text-text-muted block">Brand</span>
                <span>{brandName}</span>
              </div>
              <div>
                <span className="text-text-muted block">Live Physical Stock</span>
                <span className="font-bold text-text-primary">{selectedStockItem.qty || 0} pcs</span>
              </div>
            </div>
          </div>

          {/* Technical Specifications (Attributes) */}
          {attrs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-muted">Technical Specifications</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {attrs.map((attr, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border bg-slate-50/50">
                    <span className="text-[10px] text-text-muted font-bold block capitalize">{attr.name}</span>
                    <span className="text-xs font-semibold text-text-primary mt-0.5">{attr.value} {attr.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Metrics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-border bg-slate-50/50 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted block">Physical Stock</span>
              <span className="text-lg font-black text-text-primary mt-1">{selectedStockItem.qty || 0} pcs</span>
            </div>
            <div className="p-3 rounded-xl border border-success/20 bg-success/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-success block">Booked Stock</span>
              <span className="text-lg font-black text-success mt-1">{selectedStockItem.booked_qty || 0} pcs</span>
            </div>
            <div className="p-3 rounded-xl border border-warning/20 bg-warning/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-warning block">Reserved (Cart)</span>
              <span className="text-lg font-black text-warning mt-1">{selectedStockItem.reserved_qty || 0} pcs</span>
            </div>
            <div className="p-3 rounded-xl border border-danger/20 bg-danger/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-danger block">Pre-Booked (Shortage)</span>
              <span className="text-lg font-black text-danger mt-1">{selectedStockItem.pre_booked_qty || 0} pcs</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border flex gap-4 text-xs font-bold uppercase tracking-wider overflow-x-auto pb-1">
            <button
              onClick={() => setActiveInfoTab("bookings")}
              className={`pb-2 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                activeInfoTab === "bookings" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              Bookings ({bookings.length})
            </button>
            <button
              onClick={() => setActiveInfoTab("reservations")}
              className={`pb-2 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                activeInfoTab === "reservations" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              Active Cart Holds ({reservations.length})
            </button>
            <button
              onClick={() => setActiveInfoTab("raise_po")}
              className={`pb-2 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                activeInfoTab === "raise_po" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              Raise PO Request
            </button>
            <button
              onClick={() => setActiveInfoTab("po_history")}
              className={`pb-2 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                activeInfoTab === "po_history" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              Procurement History ({skuPoRequests.length})
            </button>
          </div>

          {/* Content Area */}
          <div className="max-h-[350px] overflow-y-auto">
            {activeInfoTab === "bookings" ? (
              bookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted italic bg-slate-50 rounded-xl">
                  No confirmed purchase orders are currently booking this SKU.
                </div>
              ) : (
                <div className="overflow-x-auto w-full border border-border rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-slate-50 text-text-muted font-bold">
                        <th className="p-2.5">Order ID</th>
                        <th className="p-2.5">Customer Name</th>
                        <th className="p-2.5 text-right">Allocated Qty</th>
                        <th className="p-2.5 text-right">Pending Qty</th>
                        <th className="p-2.5 text-right">Order Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-primary">{booking.order_id}</td>
                          <td className="p-2.5 font-medium text-text-primary">{booking.customer_name}</td>
                          <td className="p-2.5 text-right text-success font-black">{booking.allocated_qty} pcs</td>
                          <td className="p-2.5 text-right text-danger font-black">{booking.pending_qty} pcs</td>
                          <td className="p-2.5 text-right text-text-muted">
                            {booking.created_at ? new Date(booking.created_at).toLocaleDateString("en-IN") : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : activeInfoTab === "reservations" ? (
              reservations.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted italic bg-slate-50 rounded-xl">
                  No active customer checkouts are currently reserving this SKU.
                </div>
              ) : (
                <div className="overflow-x-auto w-full border border-border rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-slate-50 text-text-muted font-bold">
                        <th className="p-2.5">Customer Name</th>
                        <th className="p-2.5 text-right">Reserved Qty</th>
                        <th className="p-2.5 text-right">Expires At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((resv, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-slate-50/50">
                          <td className="p-2.5 font-medium text-text-primary">{resv.customer_name}</td>
                          <td className="p-2.5 text-right text-warning font-black">{resv.quantity} pcs</td>
                          <td className="p-2.5 text-right text-text-muted">
                            {resv.expiry_time ? new Date(resv.expiry_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : activeInfoTab === "raise_po" ? (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-text-muted">Submit Procurement Request</h4>
                <form onSubmit={handlePostPoRequest} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Quantity to Request</label>
                    <CustomInput
                      type="number"
                      min="1"
                      value={poQty}
                      onChange={(e) => setPoQty(Math.max(1, Number(e.target.value)))}
                      className="w-full font-black text-sm"
                      disabled={submittingPoRequest}
                    />
                  </div>
                  {poRequestSuccess && (
                    <div className="text-xs font-bold text-success bg-success/15 border border-success/30 p-2.5 rounded-lg">
                      {poRequestSuccess}
                    </div>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submittingPoRequest}
                    loading={submittingPoRequest}
                  >
                    Submit Request
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-text-muted">Historical Procurement Requests</h4>
                {loadingSkuPoRequests ? (
                  <div className="p-8 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                    <FaSpinner className="animate-spin text-sm" /> Loading procurement history...
                  </div>
                ) : skuPoRequests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted italic bg-slate-50 rounded-xl">
                    No prior procurement requests have been raised for this product.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full border border-border rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-slate-50 text-text-muted font-bold">
                          <th className="p-2.5">Request No</th>
                          <th className="p-2.5 text-right">Requested Qty</th>
                          <th className="p-2.5">Requested By</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {skuPoRequests.map((req, idx) => {
                          const item = (req.items || []).find(it => {
                            const reqSkuId = it.sku_id?.toString() || '';
                            const selectedSkuId = selectedStockItem.sku_id?._id?.toString() || selectedStockItem.sku_id?.toString() || '';
                            return reqSkuId === selectedSkuId;
                          });
                          const qty = item ? item.qty : 0;
                          return (
                            <tr key={idx} className="border-b border-border hover:bg-slate-50/50">
                              <td className="p-2.5 font-bold text-primary">{req.request_number}</td>
                              <td className="p-2.5 text-right font-black text-text-primary">{qty} pcs</td>
                              <td className="p-2.5 font-semibold text-text-secondary">{req.created_by?.name || req.created_by || 'Manager'}</td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  req.status === 'approved' ? 'bg-success/15 text-success' :
                                  req.status === 'rejected' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-right text-text-muted">
                                {req.created_at ? new Date(req.created_at).toLocaleDateString("en-IN") : new Date(req.createdAt).toLocaleDateString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={warehouseMode === 'sub' ? 'Sub-Warehouse Inward Control' : 'Master-Warehouse Inward Control'}
        subtitle={
          warehouseMode === 'sub'
            ? 'Receive purchase orders, stock transfers from Master Hub, generate GRN and increment local inventory.'
            : 'Bulk suppliers stock entries, inventory verification check and allocation of racks.'
        }
        icon={HiCube}
      />

      {/* Informational Banner: Separation of Warehouse Stock vs Customer Orders */}
      <div className="bg-gradient-to-r from-blue-500/10 via-primary/5 to-purple-500/10 border border-primary/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-lg flex-shrink-0">
            <HiOutlineClipboardCheck />
          </div>
          <div>
            <div className="font-extrabold text-sm text-text-primary flex items-center gap-2">
              <span>Warehouse Stock Buffer & Raw Materials GRN Station</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/20 text-primary uppercase">
                Stock Only
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              This station solely handles warehouse buffer stock & raw materials for assembling BOS kits. Customer order consignments from Accounts are inwarded in the New Orders Queue.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenGeneralPoRequestModal}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap shadow-xs cursor-pointer active:scale-95"
            title="Send BOS Kit raw material procurement requisition to Account Manager"
          >
            <FaPaperPlane className="text-xs" />
            <span>⚡ Request BOS Kit Stock from Account Manager</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const prefix = location.pathname.startsWith("/warehouse-management-panel")
                ? "/warehouse-management-panel"
                : location.pathname.startsWith("/warehouse")
                ? "/warehouse"
                : "/warehouse-management-panel";
              navigate(`${prefix}/new-orders`);
            }}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover text-text-primary border border-border text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-xs cursor-pointer hover:border-primary"
          >
            <span>Go to Customer Orders Queue</span>
            <span className="text-primary font-black">→</span>
          </button>
        </div>
      </div>

      {/* Premium Tab Navigation: 2 tabs (Buffer Stock POs & Live Stock) */}
      <div className="flex bg-surface border border-border/60 p-1.5 rounded-2xl gap-1 max-w-2xl shadow-inner relative overflow-hidden backdrop-blur-md overflow-x-auto">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 relative py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap cursor-pointer
                ${isSelected
                  ? "gradient-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                  : "text-text-secondary hover:bg-surface-hover hover:text-primary"
                }`}
            >
              {tab.id === 'stock_pos' && <HiCube className="text-base" />}
              {tab.id === 'inventory' && <FaWarehouse className="text-base" />}
              {tab.label}
              {isSelected && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-white/5 pointer-events-none"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full"
        >
          {activeTab === "stock_pos" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-full overflow-hidden">
              {/* Warehouse Stock Purchase Orders */}
              <div className="card p-6 space-y-4 w-full max-w-full overflow-hidden">
                  <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                      <FaBoxes className="text-primary" />
                      Supplier Purchase Orders (Warehouse Stock Replenishment)
                    </h3>
                  {/* Status Filter */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "All", count: (purchaseOrders || []).length },
                      { label: "Pending", count: (purchaseOrders || []).filter(p => p.status === 'pending' || p.status === 'awaiting_delivery' || p.status === 'paid').length },
                      { label: "Accepted", count: (purchaseOrders || []).filter(p => p.status === 'accepted').length },
                      { label: "Invoiced", count: (purchaseOrders || []).filter(p => p.status === 'invoiced').length },
                      { label: "Delivered", count: (purchaseOrders || []).filter(p => p.status === 'delivered').length },
                      { label: "Overdue", count: (purchaseOrders || []).filter(p => {
                          if (p.status === 'delivered') return false;
                          const diff = new Date() - new Date(p.timeline);
                          return Math.floor(diff / (1000 * 60 * 60 * 24)) > 0;
                        }).length 
                      }
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => {
                          setPoStatusFilter(item.label);
                          setPosPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                          poStatusFilter === item.label
                            ? item.label === "Overdue" ? "bg-danger text-white border-danger" : "bg-primary text-white border-primary"
                            : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                          poStatusFilter === item.label ? "bg-white/20 text-white" : "bg-surface-hover text-text-muted"
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <CustomTable
                  containerClassName="border border-border rounded-xl shadow-xs bg-surface p-0 overflow-hidden w-full"
                  headers={[
                    { key: "po_number", label: "PO Number" },
                    { key: "supplier", label: "Supplier" },
                    { key: "total_value", label: "Total Order Value" },
                    { key: "timeline", label: "Delivery Due Date" },
                    { key: "status", label: "Status" },
                    { key: "proforma", label: "PO & PI Documents" },
                    { key: "tax_invoice", label: "Supplier Tax Invoice" },
                    { key: "action", label: "Action", align: "center" }
                  ]}
                  data={paginatedPOs}
                  loading={loadingPOs}
                  renderRow={(po) => {
                    const timelineDateObj = new Date(po.timeline);
                    timelineDateObj.setHours(0, 0, 0, 0);
                    const todayObj = new Date();
                    todayObj.setHours(0, 0, 0, 0);
                    const diffTime = todayObj - timelineDateObj;
                    const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const isOverdue = po.status !== "delivered" && overdueDays > 0;
                    const totalValue = (po.items || []).reduce((acc, it) => acc + (it.qty * (it.order_price || 0)), 0);
                    return (
                      <>
                        <td className="p-3">
                          <div className="font-extrabold text-primary text-xs uppercase">{po.po_number}</div>
                          <div className="text-[9px] text-text-secondary mt-0.5">
                            Ordered: {new Date(po.createdAt || po.created_at).toLocaleDateString()}
                          </div>
                          {po.source_orders && po.source_orders.length > 0 && (
                            <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50">
                              <FaUsers size={9} /> Combined ({po.source_orders.length} order{po.source_orders.length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-text-primary text-xs">{po.supplier_id?.company_name || "N/A"}</div>
                          <div className="text-[9px] text-text-secondary">Brand: {po.supplier_id?.brand_name || "N/A"}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-black text-text-primary text-sm">₹{totalValue.toLocaleString()}</div>
                          <div className="text-[9px] text-text-muted mt-0.5">
                            {(po.items || []).length} SKU{(po.items || []).length !== 1 ? "s" : ""} ({(po.items || []).reduce((acc, it) => acc + (it.qty || 0), 0).toLocaleString()} Pcs)
                          </div>
                          <button
                            onClick={() => { setProformaPO(po); setProformaModalOpen(true); }}
                            className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary font-black hover:underline"
                          >
                            <FaEye size={10} /> View Items
                          </button>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs font-semibold ${isOverdue ? 'text-danger font-extrabold' : 'text-text-primary'}`}>
                            {new Date(po.timeline).toLocaleDateString()}
                          </span>
                          {isOverdue && (
                            <span className="block text-[9px] font-black text-danger uppercase tracking-wider animate-pulse mt-0.5">
                              ⚠️ Overdue ({overdueDays} {overdueDays === 1 ? 'day' : 'days'})
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                            po.status === 'delivered' ? 'bg-success/10 text-success border-success/20' :
                            po.status === 'paid' ? 'bg-primary/10 text-primary border-primary/20 animate-pulse' :
                            po.status === 'invoiced' ? 'bg-info/10 text-info border-info/20' :
                            po.status === 'accepted' ? 'bg-info/10 text-info border-info/20' :
                            'bg-warning/10 text-warning border-warning/20'
                          }`}>
                            {po.status === 'pending' ? 'Awaiting Invoice' :
                             po.status === 'paid' ? 'Awaiting Delivery' :
                             po.status === 'invoiced' ? 'Awaiting Payment' :
                             po.status === 'accepted' ? 'Accepted' :
                             po.status}
                          </span>
                        </td>
                        {/* PO & PI Documents */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5 max-w-[120px]">
                            <button
                              type="button"
                              onClick={() => { setProformaPO(po); setProformaModalDefaultTab("po"); setProformaModalOpen(true); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase tracking-wide hover:bg-primary/20 transition-all justify-center w-full cursor-pointer shadow-xs"
                            >
                              <FaFilePdf size={10} /> 📄 View PO PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => { setProformaPO(po); setProformaModalDefaultTab("pi"); setProformaModalOpen(true); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-info/10 text-info border border-info/20 text-[9px] font-bold uppercase tracking-wide hover:bg-info/20 transition-all justify-center w-full cursor-pointer shadow-xs"
                            >
                              <FaFilePdf size={10} /> 📑 View Proforma (PI)
                            </button>
                          </div>
                        </td>
                        {/* Supplier Tax Invoice */}
                        <td className="p-3">
                          {po.invoice_no ? (
                            <div className="text-xs space-y-1">
                              <div className="font-bold text-text-primary text-[10px]">#{po.invoice_no}</div>
                              {po.supplier_gst && (
                                <div className="text-[9px] font-mono text-text-secondary bg-surface-hover border border-border px-1.5 py-0.5 rounded inline-block">GST: {po.supplier_gst}</div>
                              )}
                              <div className="text-[10px] text-text-muted">{po.invoice_date ? new Date(po.invoice_date).toLocaleDateString() : ""}</div>
                              {po.invoice_pdf && (
                                <a
                                  href={po.invoice_pdf}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-danger/10 text-danger border border-danger/20 text-[10px] font-black uppercase hover:bg-danger/20 transition-all"
                                >
                                  <FaFilePdf size={10} /> Tax Invoice PDF
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">Awaiting Supplier</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {po.status === 'paid' ? (
                            <Button
                              onClick={() => handleOpenDeliveryModal(po)}
                              variant="primary"
                              size="sm"
                              className="text-[10px] py-1 px-2.5 font-extrabold uppercase"
                              disabled={isDelivering}
                            >
                              {isDelivering ? "Processing..." : "Complete Delivery"}
                            </Button>
                          ) : po.status === 'delivered' ? (
                            <span className="text-success text-[10px] font-bold flex items-center justify-center gap-1">
                              <FaCheckCircle /> Delivery Completed
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">Pending Supplier Action</span>
                          )}
                        </td>
                      </>
                    );
                  }}
                  emptyMessage="No supplier purchase orders assigned to this warehouse."
                />

                <Pagination
                  currentPage={posPage}
                  totalPages={Math.ceil(filteredPOs.length / posPageSize)}
                  onPageChange={setPosPage}
                  totalItems={filteredPOs.length}
                  pageSize={posPageSize}
                />
              </div>
            </div>
          )}

          {activeTab === "supplier" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                  onClick={() => { setFulfillmentFilter("all"); setFulfillmentPage(1); }}
                  className={`card p-4 cursor-pointer transition-all border ${
                    fulfillmentFilter === "all" ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/40 bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total Orders</span>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                      <FaBoxes />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-text-primary mt-2">
                    {fulfillmentSummary.total_orders || 0}
                  </div>
                  <div className="text-[11px] text-text-muted mt-1">Franchise & EPC pipeline</div>
                </div>

                <div 
                  onClick={() => { setFulfillmentFilter("ready"); setFulfillmentPage(1); }}
                  className={`card p-4 cursor-pointer transition-all border ${
                    fulfillmentFilter === "ready" ? "border-success ring-2 ring-success/20 bg-success/5" : "border-border hover:border-success/40 bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-success uppercase tracking-wider">Ready for Dispatch</span>
                    <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center text-sm">
                      <FaCheckDouble />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-success mt-2">
                    {fulfillmentSummary.ready_for_dispatch || 0}
                  </div>
                  <div className="text-[11px] text-text-muted mt-1">Dual inward complete → in Delivery Queue</div>
                </div>

                <div 
                  onClick={() => { setFulfillmentFilter("awaiting_inward"); setFulfillmentPage(1); }}
                  className={`card p-4 cursor-pointer transition-all border ${
                    fulfillmentFilter === "awaiting_inward" ? "border-warning ring-2 ring-warning/20 bg-warning/5" : "border-border hover:border-warning/40 bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-warning uppercase tracking-wider">Awaiting Material Inward</span>
                    <div className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center text-sm">
                      <FaShippingFast />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-warning mt-2">
                    {fulfillmentSummary.awaiting_inward || 0}
                  </div>
                  <div className="text-[11px] text-text-muted mt-1">Supplier PO paid → Awaiting GRN</div>
                </div>

                <div 
                  onClick={() => { setFulfillmentFilter("awaiting_payment"); setFulfillmentPage(1); }}
                  className={`card p-4 cursor-pointer transition-all border ${
                    fulfillmentFilter === "awaiting_payment" ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/5" : "border-border hover:border-purple-500/40 bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Awaiting Supplier Payment</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-sm">
                      <FaFileInvoice />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-purple-400 mt-2">
                    {fulfillmentSummary.awaiting_payment || 0}
                  </div>
                  <div className="text-[11px] text-text-muted mt-1">Pending in Accounts Portal</div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => { setFulfillmentFilter("all"); setFulfillmentPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      fulfillmentFilter === "all" ? "bg-primary text-white shadow-sm" : "bg-surface-hover text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    All Orders ({fulfillmentSummary.total_orders || 0})
                  </button>
                  <button
                    onClick={() => { setFulfillmentFilter("ready"); setFulfillmentPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      fulfillmentFilter === "ready" ? "bg-success text-white shadow-sm" : "bg-surface-hover text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Ready for Dispatch ({fulfillmentSummary.ready_for_dispatch || 0})
                  </button>
                  <button
                    onClick={() => { setFulfillmentFilter("awaiting_inward"); setFulfillmentPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      fulfillmentFilter === "awaiting_inward" ? "bg-warning text-black shadow-sm" : "bg-surface-hover text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Awaiting Inward ({fulfillmentSummary.awaiting_inward || 0})
                  </button>
                  <button
                    onClick={() => { setFulfillmentFilter("awaiting_payment"); setFulfillmentPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      fulfillmentFilter === "awaiting_payment" ? "bg-purple-600 text-white shadow-sm" : "bg-surface-hover text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Awaiting Supplier Payment ({fulfillmentSummary.awaiting_payment || 0})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-64">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                    <input
                      type="text"
                      placeholder="Search order #, customer..."
                      value={fulfillmentSearch}
                      onChange={(e) => { setFulfillmentSearch(e.target.value); setFulfillmentPage(1); }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-hover border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={fetchFulfillment}
                    disabled={loadingFulfillment}
                    className="p-2 rounded-xl bg-surface-hover border border-border text-text-secondary hover:text-text-primary hover:border-primary/50 transition-all text-xs flex items-center gap-1"
                    title="Refresh data"
                  >
                    <FaSpinner className={loadingFulfillment ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* Table or Loading */}
              <div className="card border border-border overflow-hidden rounded-2xl">
                {loadingFulfillment ? (
                  <div className="p-12 flex flex-col items-center justify-center text-text-muted space-y-3">
                    <FaSpinner className="animate-spin text-2xl text-primary" />
                    <span className="text-xs">Loading order inward fulfillment pipeline...</span>
                  </div>
                ) : filteredFulfillmentOrders.length === 0 ? (
                  <div className="p-12 text-center text-text-muted space-y-2">
                    <FaBoxes className="mx-auto text-3xl opacity-30" />
                    <div className="text-sm font-bold text-text-primary">No client orders found</div>
                    <div className="text-xs">No orders match the current filter or search criteria.</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-surface-hover/50 text-[10px] uppercase font-black tracking-wider text-text-muted">
                          <th className="px-5 py-3.5">Order & Client</th>
                          <th className="px-5 py-3.5">Destination & Warehouse</th>
                          <th className="px-5 py-3.5">☀️ Solar Panel Procurement</th>
                          <th className="px-5 py-3.5">⚡ Inverter Procurement</th>
                          <th className="px-5 py-3.5 text-center">Delivery Queue Readiness</th>
                          <th className="px-5 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paginatedFulfillmentOrders.map((ord) => {
                          const isReady = ord.overall_readiness === "ready_for_dispatch";
                          const isAwaitingInward = ord.overall_readiness === "awaiting_inward";

                          return (
                            <tr key={ord.id} className="hover:bg-surface-hover/30 transition-colors">
                              {/* Order & Client */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    ord.order_type === 'epc' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  }`}>
                                    {ord.order_type}
                                  </span>
                                  <span className="font-black text-text-primary text-sm">{ord.order_number}</span>
                                </div>
                                <div className="font-bold text-text-primary text-xs mt-1">{ord.customer_name}</div>
                                <div className="text-[11px] text-text-muted">{ord.customer_phone}</div>
                              </td>

                              {/* Destination & Warehouse */}
                              <td className="px-5 py-4">
                                <div className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                                  <FaBuilding className="text-text-muted text-[10px]" />
                                  {ord.destination?.address || ord.destination?.district
                                    ? `${ord.destination?.address || ''}, ${ord.destination?.district || ''}, ${ord.destination?.state || ''}`.replace(/^,\s*|,\s*$/g, '')
                                    : ord.destination?.pincode || '—'
                                  }
                                </div>
                                <div className="text-[11px] text-text-muted mt-0.5">Assigned: {ord.warehouse_code}</div>
                                <div className="text-[10px] text-text-muted mt-1">
                                  {ord.created_at ? new Date(ord.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                                </div>
                              </td>

                              {/* Solar Panel Procurement */}
                              <td className="px-5 py-4">
                                {ord.panel_status === 'inwarded' ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-success/10 text-success border border-success/20">
                                      <FaCheckCircle className="text-[9px]" /> Inward Completed
                                    </span>
                                    {ord.panel_grn_no && (
                                      <div className="text-[10px] text-text-secondary font-mono">GRN: {ord.panel_grn_no}</div>
                                    )}
                                    {ord.panel_po_number && (
                                      <div className="text-[10px] text-text-muted font-mono">PO: {ord.panel_po_number}</div>
                                    )}
                                  </div>
                                ) : ord.panel_status === 'paid_awaiting_inward' ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-warning/10 text-warning border border-warning/20">
                                      <FaShippingFast className="text-[9px]" /> Paid • Awaiting Inward
                                    </span>
                                    {ord.panel_po_number && (
                                      <div className="text-[10px] text-text-secondary font-mono">PO: {ord.panel_po_number}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-surface-hover text-text-muted border border-border">
                                      <FaClock className="text-[9px]" /> Pending Supplier Payment
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Inverter Procurement */}
                              <td className="px-5 py-4">
                                {ord.inverter_status === 'inwarded' ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-success/10 text-success border border-success/20">
                                      <FaCheckCircle className="text-[9px]" /> Inward Completed
                                    </span>
                                    {ord.inverter_grn_no && (
                                      <div className="text-[10px] text-text-secondary font-mono">GRN: {ord.inverter_grn_no}</div>
                                    )}
                                    {ord.inverter_po_number && (
                                      <div className="text-[10px] text-text-muted font-mono">PO: {ord.inverter_po_number}</div>
                                    )}
                                  </div>
                                ) : ord.inverter_status === 'paid_awaiting_inward' ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-warning/10 text-warning border border-warning/20">
                                      <FaShippingFast className="text-[9px]" /> Paid • Awaiting Inward
                                    </span>
                                    {ord.inverter_po_number && (
                                      <div className="text-[10px] text-text-secondary font-mono">PO: {ord.inverter_po_number}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-surface-hover text-text-muted border border-border">
                                      <FaClock className="text-[9px]" /> Pending Supplier Payment
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Delivery Queue Readiness */}
                              <td className="px-5 py-4 text-center">
                                {isReady ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-success/15 text-success border border-success/30 shadow-sm">
                                      <FaCheckDouble className="text-xs" /> Released to Queue
                                    </span>
                                    <span className="text-[10px] text-success/80 mt-1 font-semibold">Available for Dispatch</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                                      <FaLock className="text-xs" /> Locked from Queue
                                    </span>
                                    <span className="text-[10px] text-text-muted mt-1">
                                      {isAwaitingInward ? "Awaiting physical inward" : "Supplier payment pending"}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Action */}
                              <td className="px-5 py-4 text-right whitespace-nowrap">
                                {isAwaitingInward ? (
                                  <button
                                    onClick={() => {
                                      const pendingPi = (ord.purchase_indents || []).find(pi => pi.fulfilment?.supply_status !== 'Inward Completed');
                                      if (pendingPi) {
                                        setSelectedPiForInward(pendingPi);
                                        setIsPiInwardModalOpen(true);
                                      } else {
                                        handleTabChange("local");
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 ml-auto"
                                  >
                                    <FaBoxes className="text-xs" /> Receive Inward
                                  </button>
                                ) : isReady ? (
                                  <button
                                    onClick={() => handleViewInQueue(ord)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-success/10 text-success border border-success/20 hover:bg-success hover:text-white transition-all flex items-center gap-1 ml-auto"
                                  >
                                    View in Queue <FaShippingFast />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-text-muted italic">Accounts Action Needed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {filteredFulfillmentOrders.length > fulfillmentPageSize && (
                  <div className="p-4 border-t border-border">
                    <Pagination
                      currentPage={fulfillmentPage}
                      totalPages={Math.ceil(filteredFulfillmentOrders.length / fulfillmentPageSize)}
                      onPageChange={setFulfillmentPage}
                      totalItems={filteredFulfillmentOrders.length}
                      pageSize={fulfillmentPageSize}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "transfers" && warehouseMode === 'sub' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="card p-6 space-y-4">
                <h3 className="text-base font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
                  <FaExchangeAlt className="text-primary" />
                  Awaiting Transfer Receipts from Master Warehouse
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingTransfers.map(trn => (
                    <div
                      key={trn.transferId}
                      className={`p-4 border rounded-xl flex flex-col justify-between transition-all ${trn.status === 'Received'
                          ? 'bg-success/5 border-success/20 opacity-80'
                          : 'bg-surface border-border hover:border-primary/40'
                        }`}
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-primary text-xs tracking-wider">{trn.transferId}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trn.status === 'Received'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning animate-pulse'
                            }`}>
                            {trn.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-text-secondary">
                          <strong>From:</strong> {trn.origin} <br />
                          <strong>Sent:</strong> {trn.dateSent}
                        </div>
                        <div className="mt-3 space-y-1 bg-bg p-2 rounded-lg border border-border/50">
                          {trn.items.map((it, idx) => (
                            <div key={idx} className="text-xs text-text-primary flex justify-between font-semibold">
                              <span>{it.qty}x {it.brand} ({it.specs})</span>
                              {it.kws > 0 && <span className="text-[10px] text-text-muted">{it.kws} kW</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {trn.status !== 'Received' && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            onClick={() => {
                              setComplianceChecks([]);
                              setActiveTransferToReceive(trn);
                            }}
                            variant="outline"
                            size="sm"
                            fullWidth
                          >
                            Verify Items & Receive
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Receive Modal / Form overlay */}
              {activeTransferToReceive && (
                <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-999 animate-in fade-in duration-300">
                  <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <h4 className="font-bold text-text-primary text-sm flex items-center gap-1">
                        <FaExchangeAlt /> Confirm Stock Receipt: {activeTransferToReceive.transferId}
                      </h4>
                      <Button
                        variant="ghost"
                        onClick={() => setActiveTransferToReceive(null)}
                        className="w-8 h-8 rounded-full p-0 flex items-center justify-center text-text-muted hover:text-text-primary font-bold text-xs"
                      >
                        ✕
                      </Button>
                    </div>

                    <div className="space-y-3 text-xs text-text-secondary">
                      <p>Check off the compliance items below to complete transfer receipt:</p>

                      <div className="space-y-2">
                        <CustomInput
                          type="checkbox"
                          customCheckbox={true}
                          options={[
                            { value: 'qty', label: 'Quantities match master invoice' },
                            { value: 'serials', label: 'Serial numbers scanned & registered' },
                            { value: 'qc', label: 'QC Seal is intact on boxes' }
                          ]}
                          checked={complianceChecks}
                          onChange={handleComplianceChange}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-border">
                      <Button
                        onClick={() => setActiveTransferToReceive(null)}
                        variant="secondary"
                        size="md"
                        fullWidth
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => confirmTransferReceipt(activeTransferToReceive)}
                        variant="primary"
                        size="md"
                        fullWidth
                        disabled={complianceChecks.length < 3}
                      >
                        Confirm Receipt & Generate GRN
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-full overflow-hidden">
              <div className="card p-6 space-y-4 w-full max-w-full overflow-hidden">
                <h3 className="text-base font-bold text-text-primary border-b border-border pb-3 flex justify-between items-center">
                  <span>
                    {warehouseMode === 'sub'
                      ? 'Local Sub-Warehouse Inventory Status'
                      : 'Master-Warehouse Inventory Status'}
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">Updated Live</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {stockSummary.map((item, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border border-border/50 ${item.bg}`}>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{item.title}</span>
                      <h4 className="text-lg font-black text-text-primary mt-1">{item.count}</h4>
                      <p className="text-xs text-text-secondary mt-0.5">{item.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Detailed stock items */}
                <div className="pt-4">
                  <h4 className="font-bold text-xs text-text-muted uppercase tracking-wider mb-2">Live Inventory Details</h4>
                    <CustomTable
                      containerClassName="border border-border rounded-xl shadow-xs bg-surface p-0 overflow-hidden w-full"
                      headers={[
                        { key: "sku_code", label: "SKU Code" },
                        { key: "product_name", label: "Product Name" },
                        { key: "category", label: "Category" },
                        { key: "brand", label: "Brand" },
                        { key: "qty", label: "Live Stock", align: "right" },
                        { key: "booked_qty", label: "Booked", align: "right" },
                        { key: "reserved_qty", label: "Reserved", align: "right" },
                        { key: "pre_booked_qty", label: "Pre-Booked", align: "right" },
                        { key: "total_kw", label: "Total Capacity", align: "right" },
                        { key: "average_invoice_price", label: "Avg Invoice Price", align: "right" },
                        { key: "average_benchmark_price", label: "Avg Benchmark Price", align: "right" },
                        { key: "actions", label: "Actions", align: "center" }
                      ]}
                      data={paginatedStock}
                      loading={loadingStock}
                      renderRow={warehouseMode === 'sub' ? renderInventoryRow : (st) => {
                        const sku = st.sku_id || {};
                        const prod = sku.product_id || {};
                        const catName = prod.template_id?.name || "N/A";
                        const brandName = prod.brand_id?.brand_name || "N/A";

                        return (
                          <>
                            <td className="p-3 font-bold text-primary whitespace-nowrap">{st.sku_code}</td>
                            <td className="p-3 font-semibold text-text-primary min-w-[200px]">{prod.name || "N/A"}</td>
                            <td className="p-3 text-text-secondary whitespace-nowrap">{catName}</td>
                            <td className="p-3 text-text-secondary whitespace-nowrap">{brandName}</td>
                            <td className="p-3 text-right font-black text-text-primary whitespace-nowrap">{st.qty} pcs</td>
                            <td className="p-3 text-right font-bold text-success whitespace-nowrap">{st.booked_qty || 0} pcs</td>
                            <td className="p-3 text-right font-bold text-warning whitespace-nowrap">{st.reserved_qty || 0} pcs</td>
                            <td className="p-3 text-right font-bold text-danger whitespace-nowrap">{st.pre_booked_qty || 0} pcs</td>
                            <td className="p-3 text-right text-text-secondary whitespace-nowrap">
                              {st.total_kw > 0 ? `${st.total_kw.toFixed(2)} kW` : "-"}
                            </td>
                            <td className="p-3 text-right text-text-secondary whitespace-nowrap">₹{st.average_invoice_price?.toLocaleString() || 0}</td>
                            <td className="p-3 text-right text-text-secondary whitespace-nowrap">₹{st.average_benchmark_price?.toLocaleString() || 0}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => handleShowSkuInfo(st)}
                                  className="p-1 rounded bg-info/10 text-info hover:bg-info/20 border border-info/20 inline-flex items-center justify-center cursor-pointer"
                                  title="View allocation details"
                                >
                                  <FaInfoCircle size={12} />
                                </button>
                                <button 
                                  onClick={() => handleRaisePoDirect(st)}
                                  className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 inline-flex items-center justify-center cursor-pointer"
                                  title="Direct PO Request"
                                >
                                  <FaFileInvoice size={12} />
                                </button>
                              </div>
                            </td>
                          </>
                        );
                      }}
                      emptyMessage="No stock recorded."
                    />

                  <Pagination
                    currentPage={stockPage}
                    totalPages={Math.ceil(stockStatus.length / stockPageSize)}
                    onPageChange={setStockPage}
                    totalItems={stockStatus.length}
                    pageSize={stockPageSize}
                  />
                </div>

                {/* Log files of all receipts */}
                <div className="pt-4 border-t border-border mt-6 space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Delivered */}
                    <div className="card p-4 flex items-center gap-3 bg-surface border-border/60">
                      <div className="w-11 h-11 rounded-xl bg-success/10 text-success flex items-center justify-center text-lg flex-shrink-0">
                        <FaCheckCircle />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-text-primary">{currentLogs.length}</h4>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          {warehouseMode === 'sub' ? 'Total Inward Logs' : 'Total Delivered POs'}
                        </p>
                      </div>
                    </div>

                    {/* Total Value */}
                    <div className="card p-4 flex items-center gap-3 bg-surface border-border/60">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg flex-shrink-0">
                        <FaShippingFast />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-text-primary">
                          ₹{(() => {
                            return currentLogs.reduce((acc, log) => acc + (log.items || []).reduce((s, it) => s + (it.invoice_price || it.order_price || 0) * (it.qty || 0), 0), 0);
                          })().toLocaleString()}
                        </h4>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          {warehouseMode === 'sub' ? 'Total Inward Value' : 'Total Delivery Value'}
                        </p>
                      </div>
                    </div>

                    {/* Total Items */}
                    <div className="card p-4 flex items-center gap-3 bg-surface border-border/60">
                      <div className="w-11 h-11 rounded-xl bg-info/10 text-info flex items-center justify-center text-lg flex-shrink-0">
                        <FaBoxes />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-text-primary">
                          {(() => {
                            return currentLogs.reduce((acc, log) => acc + (log.items || []).reduce((s, it) => s + (it.qty || 0), 0), 0);
                          })().toLocaleString()}
                        </h4>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          {warehouseMode === 'sub' ? 'Total Items Received' : 'Total Items Delivered'}
                        </p>
                      </div>
                    </div>

                    {/* Unique Suppliers */}
                    <div className="card p-4 flex items-center gap-3 bg-surface border-border/60">
                      <div className="w-11 h-11 rounded-xl bg-warning/10 text-warning flex items-center justify-center text-lg flex-shrink-0">
                        <FaHandshake />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-text-primary">
                          {new Set(currentLogs.map(log => log.supplier_name).filter(Boolean)).size}
                        </h4>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          {warehouseMode === 'sub' ? 'Partners Involved' : 'Suppliers Involved'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3 pt-4 border-t border-border/30">
                    <h4 className="font-bold text-xs text-text-muted uppercase tracking-wider">
                      {warehouseMode === 'sub' ? 'Inward Receipts History' : 'Supplier Inward Receipts History'}
                    </h4>
                    <div className="w-full md:w-72">
                      <CustomInput
                        type="text"
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setLogsPage(1);
                        }}
                        inputClassName="text-xs"
                      />
                    </div>
                  </div>

                    <CustomTable
                      containerClassName="border border-border rounded-xl shadow-xs bg-surface p-0 overflow-hidden w-full"
                      headers={warehouseMode === 'sub' ? [
                        { key: "grn_no", label: "GRN No" },
                        { key: "supplier_name", label: "Partner / Origin" },
                        { key: "invoice_no", label: "Invoice / Transfer Ref" },
                        { key: "invoice_date", label: "Date" },
                        { key: "status", label: "QC Status" }
                      ] : [
                        { key: "grn_no", label: "GRN No" },
                        { key: "supplier_name", label: "Supplier Name" },
                        { key: "invoice_no", label: "Invoice details" },
                        { key: "specs", label: "Inventory Affected" },
                        { key: "status", label: "QC Status", align: "center" }
                      ]}
                      data={warehouseMode === 'sub' ? paginatedSubLogs : paginatedMasterLogs}
                      loading={loadingLogs}
                      renderRow={warehouseMode === 'sub' ? renderSubLogRow : renderMasterLogRow}
                      emptyMessage="No inward logs found."
                    />

                  <Pagination
                    currentPage={logsPage}
                    totalPages={Math.ceil(
                      (warehouseMode === 'sub' ? filteredSubLogs.length : filteredMasterLogs.length) / logsPageSize
                    )}
                    onPageChange={setLogsPage}
                    totalItems={warehouseMode === 'sub' ? filteredSubLogs.length : filteredMasterLogs.length}
                    pageSize={logsPageSize}
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {/* Delivery Confirmation Dialog */}
      <Dialog
        isOpen={isDeliverModalOpen}
        onClose={() => !isDelivering && setIsDeliverModalOpen(false)}
        title={`Complete Delivery - ${selectedPOForDelivery?.po_number}`}
        size="md"
      >
        <form onSubmit={handleMarkDelivered} className="space-y-4">
          {deliveryFormError && (
            <div className="p-3 bg-danger/5 border border-danger/25 text-danger rounded-xl text-xs font-semibold">
              ⚠️ {deliveryFormError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <CustomInput
                label="Supplier Tax Invoice Number *"
                placeholder="e.g. GST/2026/0045"
                required
                value={deliveryForm.invoice_no}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, invoice_no: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <CustomInput
                label="Supplier GSTIN (Tax ID) *"
                placeholder="e.g. 27AAAAA0000A1Z5"
                required
                value={deliveryForm.supplier_gst}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, supplier_gst: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <CustomInput
                label="Tax Invoice Date *"
                type="date"
                required
                max={new Date().toLocaleDateString('en-CA')}
                value={deliveryForm.invoice_date}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, invoice_date: e.target.value })}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <CustomFilePicker
                name="invoice_pdf"
                label="Supplier Tax Invoice PDF / Image Document *"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                disabled={uploadingPdf || isDelivering}
                files={selectedFile ? [selectedFile] : []}
              />
              {uploadingPdf && (
                <div className="text-[10px] text-primary font-bold flex items-center gap-1.5 animate-pulse mt-1">
                  <FaSpinner className="animate-spin text-xs" /> Uploading invoice document to Cloudinary...
                </div>
              )}
              {(selectedFile || deliveryForm.invoice_pdf) && (
                <div className="text-[10px] text-success font-black flex items-center gap-1 mt-1">
                  <FaCheckCircle className="text-xs" /> Document selected: {selectedFile ? selectedFile.name : "invoice_pdf"} {" "}
                  <a
                    href={selectedFile ? URL.createObjectURL(selectedFile) : deliveryForm.invoice_pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline font-extrabold hover:text-primary-dark ml-1"
                  >
                    View File
                  </a>
                </div>
              )}
            </div>

            {/* ── Section: Material Discrepancy & Inspection ── */}
            <div className="col-span-2 space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-text-primary">
                    Material Inward Discrepancy & QC Inspection
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    Record received counts, verified good units, shortage, and damages.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {itemDiscrepancies.length} Line Items
                </span>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {itemDiscrepancies.map((item, idx) => {
                  const shortage = Math.max(0, Number(item.ordered_qty) - Number(item.received_qty));
                  return (
                    <div key={idx} className="p-3 bg-surface-hover/40 rounded-xl border border-border space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-text-primary">{item.name}</span>
                        <span className="font-mono text-text-muted">Ordered: {item.ordered_qty} pcs</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-text-muted block">Received Qty</label>
                          <input
                            type="number"
                            min="0"
                            value={item.received_qty}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItemDiscrepancies(prev => prev.map((it, i) => i === idx ? { ...it, received_qty: val, accepted_qty: Math.min(it.accepted_qty, val) } : it));
                            }}
                            className="w-full px-2 py-1 text-xs rounded border border-border bg-surface text-text-primary font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block">Accepted Qty</label>
                          <input
                            type="number"
                            min="0"
                            value={item.accepted_qty}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItemDiscrepancies(prev => prev.map((it, i) => i === idx ? { ...it, accepted_qty: val } : it));
                            }}
                            className="w-full px-2 py-1 text-xs rounded border border-border bg-surface text-text-primary font-bold text-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block">Shortage</label>
                          <div className={`px-2 py-1 text-xs font-bold rounded ${shortage > 0 ? "bg-red-500/10 text-red-600" : "bg-bg text-text-muted"}`}>
                            {shortage > 0 ? `-${shortage} Short` : "0 Nil"}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block">Damaged Qty</label>
                          <input
                            type="number"
                            min="0"
                            value={item.damaged_qty}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItemDiscrepancies(prev => prev.map((it, i) => i === idx ? { ...it, damaged_qty: val } : it));
                            }}
                            className="w-full px-2 py-1 text-xs rounded border border-border bg-surface text-red-600 font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Discrepancy / damage inspection notes..."
                          value={item.discrepancy_notes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItemDiscrepancies(prev => prev.map((it, i) => i === idx ? { ...it, discrepancy_notes: val } : it));
                          }}
                          className="w-full px-2 py-1 text-[11px] rounded border border-border bg-surface text-text-primary placeholder:text-text-muted"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              disabled={isDelivering}
              onClick={() => setIsDeliverModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isDelivering}
              loading={isDelivering}
              leftIcon={<HiOutlineCheckCircle />}
            >
              Submit to Accounts for Verification
            </Button>
          </div>
        </form>
      </Dialog>
      {/* Proforma Invoice Modal */}
      <ProformaInvoiceModal
        isOpen={proformaModalOpen}
        onClose={() => setProformaModalOpen(false)}
        po={proformaPO}
        defaultTab={proformaModalDefaultTab}
      />
      {/* Inward Details Modal */}
      <InwardDetailsModal
        isOpen={inwardDetailsModalOpen}
        onClose={() => setInwardDetailsModalOpen(false)}
        log={selectedInwardLog}
        activeSkus={activeSkus}
      />

      {/* ── Order-Specific Material Inward Modal (Account Manager Forwarded Inward List) ── */}
      <Dialog
        isOpen={orderInwardModalOpen}
        onClose={() => setOrderInwardModalOpen(false)}
        title={
          selectedOrderForInward
            ? `Inward Materials: Order #${selectedOrderForInward.order_number} (${selectedOrderForInward.delivery_order_id})`
            : "Inward Materials"
        }
        size="xl"
      >
        {selectedOrderForInward && (
          <form onSubmit={handleSubmitOrderInward} className="space-y-4 p-1">
            {/* Header Strip with Order Details & Inward Source */}
            <div className="bg-surface-hover/60 border border-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-text-primary text-sm font-mono">
                    Order #{selectedOrderForInward.order_number}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-primary/10 text-primary border border-primary/20 text-xs">
                    {selectedOrderForInward.delivery_order_id}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Payment Verified by Accounts
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-text-muted text-[11px]">
                  <span className="flex items-center gap-1 font-semibold text-text-primary">
                    <FaBuilding className="text-primary text-xs" /> {selectedOrderForInward.customer_name}
                  </span>
                  {selectedOrderForInward.customer_phone && (
                    <span className="flex items-center gap-1">
                      <FaPhoneAlt className="text-text-muted text-[10px]" /> {selectedOrderForInward.customer_phone}
                    </span>
                  )}
                  {selectedOrderForInward.incoming_truck_group?.vehicle_number && (
                    <span className="flex items-center gap-1 font-mono text-primary font-bold">
                      <FaTruck className="text-xs" /> Truck: {selectedOrderForInward.incoming_truck_group.vehicle_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Inward Mode Switch (Manual vs Barcode Scanner) */}
              <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setInwardExecutionMode('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    inwardExecutionMode === 'manual'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  type="button"
                  onClick={() => setInwardExecutionMode('scanner')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    inwardExecutionMode === 'scanner'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <FaBarcode className="text-sm" />
                  <span>Barcode Scanner Gun</span>
                </button>
              </div>
            </div>

            {/* Inward Execution: Barcode Scanning Box if Scanner Mode Active */}
            {inwardExecutionMode === 'scanner' && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaBarcode className="text-primary text-lg" />
                    <span className="text-xs font-bold text-text-primary">
                      Scan SKU / QR / Serial Code (Gun Mode)
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted">
                    Total Scanned: <strong className="text-primary">{scannedSerials.length}</strong>
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScanItem();
                      }
                    }}
                    placeholder="Focus here & scan barcode or serial code..."
                    className="flex-1 px-3.5 py-2 text-xs font-mono font-bold bg-surface border border-primary/40 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleScanItem}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <HiOutlineCheckCircle className="text-base" />
                    <span>Enter Code</span>
                  </button>
                </div>
                {scannedSerials.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {scannedSerials.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-surface border border-border text-text-primary flex items-center gap-1"
                      >
                        <FaCheck className="text-emerald-400 text-[9px]" />
                        <span>{s.serial_code}</span>
                        <span className="text-text-muted">({s.sku})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Inward Type Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  inwardType === 'warehouse'
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <input
                  type="radio"
                  name="inward_type"
                  value="warehouse"
                  checked={inwardType === 'warehouse'}
                  onChange={() => setInwardType('warehouse')}
                  className="accent-primary"
                />
                <div>
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <FaWarehouse className="text-primary text-xs" /> Warehouse Inward (Physical Hub Dock)
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    Goods received, verified and stored in warehouse racks.
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  inwardType === 'pickup_location'
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <input
                  type="radio"
                  name="inward_type"
                  value="pickup_location"
                  checked={inwardType === 'pickup_location'}
                  onChange={() => setInwardType('pickup_location')}
                  className="accent-primary"
                />
                <div>
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <HiOutlineLocationMarker className="text-primary text-sm" /> Third-Party / Direct Pickup Point
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    Goods dispatched directly from manufacturer or supplier point.
                  </div>
                </div>
              </label>
            </div>

            {/* Pickup Location fields if pickup_location selected */}
            {inwardType === 'pickup_location' && (
              <div className="p-3.5 bg-surface-hover/50 rounded-xl border border-border space-y-2 text-xs">
                <div className="font-bold text-text-primary text-[11px] uppercase tracking-wider">
                  Pickup Location & Dispatch Contact Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Location / Hub Name (e.g. Surat OEM Depot)"
                    value={pickupLocationDetails.location_name}
                    onChange={(e) => setPickupLocationDetails(prev => ({ ...prev, location_name: e.target.value }))}
                    className="p-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:border-primary"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person Name"
                    value={pickupLocationDetails.contact_person}
                    onChange={(e) => setPickupLocationDetails(prev => ({ ...prev, contact_person: e.target.value }))}
                    className="p-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:border-primary"
                  />
                  <input
                    type="text"
                    placeholder="Contact Phone / Mobile"
                    value={pickupLocationDetails.contact_phone}
                    onChange={(e) => setPickupLocationDetails(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="p-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:border-primary"
                  />
                  <input
                    type="text"
                    placeholder="Full Address & Landmark"
                    value={pickupLocationDetails.address}
                    onChange={(e) => setPickupLocationDetails(prev => ({ ...prev, address: e.target.value }))}
                    className="p-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* Items Inward Table (Account Manager's List) */}
            <div className="border border-border rounded-xl overflow-hidden bg-surface">
              <div className="bg-surface-hover/80 px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-[11px] font-black text-text-muted uppercase tracking-wider">
                  Account Manager's Bill of Materials / Inward List
                </span>
                <span className="text-[11px] text-text-muted">
                  Confirm physical counts received & allocate racks
                </span>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-hover/50 border-b border-border text-[10px] font-black uppercase text-text-muted sticky top-0 bg-surface">
                    <tr>
                      <th className="p-3">SKU & Item Details</th>
                      <th className="p-3 text-center">Ordered</th>
                      <th className="p-3 text-center">Already Inwarded</th>
                      <th className="p-3 text-center">Pending</th>
                      <th className="p-3 text-center">Received Now (Qty)</th>
                      <th className="p-3">Rack Location</th>
                      <th className="p-3 text-center">Discrepancy (Dmg / Miss)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(selectedOrderForInward.items || []).map((it) => {
                      const input = inwardInputs[it.sku] || { qty: 0, damaged_qty: 0, missing_qty: 0, rack_location: '' };
                      return (
                        <tr key={it.sku} className="hover:bg-surface-hover/30 transition-colors">
                          <td className="p-3">
                            <div className="font-extrabold text-primary font-mono text-xs">{it.sku}</div>
                            <div className="font-semibold text-text-primary text-[11px]">{it.product_name || it.item_name}</div>
                            <div className="text-[10px] text-text-secondary">{it.category || 'General Component'}</div>
                          </td>
                          <td className="p-3 text-center font-bold text-text-primary">
                            {it.ordered_qty}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-400">
                            {it.received_qty || 0}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-amber-400">
                            {it.pending_qty || 0}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={it.pending_qty || it.ordered_qty}
                              value={input.qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setInwardInputs(prev => ({
                                  ...prev,
                                  [it.sku]: { ...prev[it.sku], qty: val }
                                }));
                              }}
                              className="w-20 p-1.5 text-center text-xs font-mono font-bold bg-surface-hover border border-border rounded-lg text-text-primary focus:border-primary"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              placeholder="e.g. Rack A-04"
                              value={input.rack_location}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInwardInputs(prev => ({
                                  ...prev,
                                  [it.sku]: { ...prev[it.sku], rack_location: val }
                                }));
                              }}
                              className="w-28 p-1.5 text-xs bg-surface-hover border border-border rounded-lg text-text-primary focus:border-primary"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                placeholder="Dmg"
                                title="Damaged units"
                                value={input.damaged_qty || ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setInwardInputs(prev => ({
                                    ...prev,
                                    [it.sku]: { ...prev[it.sku], damaged_qty: val }
                                  }));
                                }}
                                className="w-14 p-1 text-center text-[11px] font-mono bg-danger/10 border border-danger/30 rounded text-danger placeholder:text-danger/50"
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="Miss"
                                title="Missing / Shortage units"
                                value={input.missing_qty || ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setInwardInputs(prev => ({
                                    ...prev,
                                    [it.sku]: { ...prev[it.sku], missing_qty: val }
                                  }));
                                }}
                                className="w-14 p-1 text-center text-[11px] font-mono bg-warning/10 border border-warning/30 rounded text-warning placeholder:text-warning/50"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks Textarea */}
            <div>
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                Inward Inspection Notes / Delivery Remarks
              </label>
              <textarea
                rows="2"
                placeholder="Add any notes regarding truck arrival, seal condition, damages, or rack placement..."
                value={inwardRemarks}
                onChange={(e) => setInwardRemarks(e.target.value)}
                className="w-full p-2 text-xs bg-surface-hover border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-primary"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
              <div className="text-xs text-text-secondary">
                <span>Verified items will immediately update inward progress for </span>
                <strong className="text-primary">Order #{selectedOrderForInward.order_number}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submittingOrderInward}
                  onClick={() => setOrderInwardModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingOrderInward}
                  loading={submittingOrderInward}
                  leftIcon={<HiOutlineClipboardCheck className="text-base" />}
                >
                  Confirm & Inward Materials
                </Button>
              </div>
            </div>
          </form>
        )}
      </Dialog>

      {/* Procurement Inward Modal (Online Scanner & Offline Gate Challan) */}
      <ProcurementInwardModal
        isOpen={procurementInwardModalOpen}
        onClose={() => {
          setProcurementInwardModalOpen(false);
          setSelectedPiForModal(null);
        }}
        purchaseIndent={selectedPiForModal}
        destinationWarehouse={{ id: selectedPiForModal?.destination_warehouse_id }}
        initialMode={modalInwardMode}
        onConfirmInward={handleConfirmPiInward}
        loading={isDelivering}
      />

      {/* Legacy PI Modal Fallback */}
      <InwardVerificationModal
        isOpen={isPiInwardModalOpen}
        onClose={() => {
          setIsPiInwardModalOpen(false);
          setSelectedPiForInward(null);
        }}
        purchaseIndent={selectedPiForInward}
        destinationWarehouse={{ id: selectedPiForInward?.destination_warehouse_id }}
        onConfirmInward={handleConfirmPiInward}
        loading={isDelivering}
      />
      {/* Pop-up Dialog when material has not arrived yet */}
      <Dialog
        isOpen={notArrivedPopupOpen}
        onClose={() => setNotArrivedPopupOpen(false)}
        title={notArrivedDetails.title || "Material Inward Status"}
        size="md"
      >
        <div className="p-6 space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto text-2xl border border-amber-500/30">
            <FaClock />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-text-primary">
              {notArrivedDetails.title || "Abhi Material Dock Par Receive Nahi Hua Hai!"}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-md mx-auto">
              {notArrivedDetails.message}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => setNotArrivedPopupOpen(false)}
              className="w-full py-3 text-xs font-black uppercase tracking-wider"
            >
              Theek Hai, Samjh Gaya
            </Button>
          </div>
        </div>
      </Dialog>

      {/* BOS Kit Stock / Buffer Requisition Modal */}
      <Dialog
        isOpen={generalPoModalOpen}
        onClose={() => setGeneralPoModalOpen(false)}
        title="⚡ Request BOS Kit Assembly Stock from Account Manager"
        size="md"
      >
        <form onSubmit={handleSubmitGeneralPoRequest} className="space-y-4 p-1">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-text-secondary leading-relaxed">
            Submit a direct procurement requisition to the Account Manager for assembling BOS kits (ACDB, DCDB, MC4, Cables, etc.) or warehouse buffer stock.
          </div>
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Stock Category</label>
            <select
              value={generalPoCategory}
              onChange={(e) => setGeneralPoCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="BOS Kit Components">BOS Kit Assembly Raw Materials (ACDB, DCDB, MC4, Cables)</option>
              <option value="Warehouse Buffer Stock">General Warehouse Buffer Stock</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Item Description</label>
            <CustomInput
              value={generalPoItemName}
              onChange={(e) => setGeneralPoItemName(e.target.value)}
              placeholder="Items required for BOS kits"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Required Quantity (Units/Sets)</label>
            <CustomInput
              type="number"
              min="1"
              value={generalPoQty}
              onChange={(e) => setGeneralPoQty(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Notes / Specifications (Optional)</label>
            <textarea
              value={generalPoNotes}
              onChange={(e) => setGeneralPoNotes(e.target.value)}
              placeholder="e.g. 5kW & 10kW BOS kit components needed immediately for upcoming installations"
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submittingGeneralPo}
              onClick={() => setGeneralPoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingGeneralPo}
              loading={submittingGeneralPo}
              leftIcon={<FaPaperPlane className="text-xs" />}
            >
              Send Request to Account Manager
            </Button>
          </div>
        </form>
      </Dialog>

      {renderSkuInfoModal()}
    </div>
  );
}
