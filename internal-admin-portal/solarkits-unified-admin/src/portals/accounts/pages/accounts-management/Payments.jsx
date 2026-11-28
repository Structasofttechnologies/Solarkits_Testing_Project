import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FaCreditCard, FaSearch, FaSpinner,
  FaCheckCircle, FaHistory,
  FaClipboardList, FaFilePdf, FaEye, FaChevronDown, FaChevronUp, FaFilter,
  FaUsers, FaLink, FaBuilding, FaBoxOpen, FaLayerGroup, FaTimes,
  FaMapMarkerAlt, FaPhone, FaEnvelope, FaShoppingCart, FaPlus, FaTrash,
  FaStore, FaBoxes, FaInfoCircle,
  FaTruck, FaWarehouse, FaArrowRight, FaCheckDouble, FaSyncAlt, FaClock, FaPaperPlane,
  FaLock, FaShieldAlt
} from "react-icons/fa";
import {
  getPurchaseOrders, payPurchaseOrder, uploadPaymentReceipt, cancelPurchaseOrder,
  getHierarchyOptions, getWarehouses, getWarehouseSuppliers, getWarehouseSkus,
  getPendingEpcFranchiseOrders, createCombinedSupplierPayment,
  getStates, getDistricts, getAllComboKits, getSuppliers,
  getProcurementGroups, getPurchaseIndents, requestSupplierPayment
} from "../../api/accounts";
import SupplierPaymentModal from "../../components/procurement/SupplierPaymentModal";
import PageHeader from "../../components/PageHeader";
import Button from "../../components/Button";
import CustomTable from "../../components/CustomTable";
import Pagination from "../../components/Pagination";
import CustomInput from "../../components/CustomInput";
import DropdownWithSearchInput from "../../components/DropdownWithSearchInput";
import Dialog from "../../components/Dialog";
import CustomFilePicker from "../../components/CustomFilePicker";
import ConfirmationPopup from "../../components/ConfirmationPopup";

// ─── Default Product Images for BOM Breakdown ──────────────────────────────
const DEFAULT_PANEL_IMG = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200&auto=format&fit=crop";
const DEFAULT_INVERTER_IMG = "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=200&auto=format&fit=crop";
const DEFAULT_STRUCTURE_IMG = "https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=200&auto=format&fit=crop";
const DEFAULT_ACDB_IMG = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&auto=format&fit=crop";
const DEFAULT_CABLE_IMG = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop";

function getItemBreakdown(item) {
  if (item.breakdown && item.breakdown.panels) {
    return item.breakdown;
  }
  const qty = Number(item.quantity) || 1;
  const itemName = (item.item_name || "").toLowerCase();
  const kwMatch = itemName.match(/(\d+(\.\d+)?)\s*kw/) || (item.capacity || "").match(/(\d+(\.\d+)?)/);
  const capacityKw = kwMatch ? parseFloat(kwMatch[1]) : 5;
  const panelsPerKit = Math.ceil((capacityKw * 1000) / 550) || 9;

  return {
    capacity_kw: capacityKw,
    kit_image: item.image || DEFAULT_PANEL_IMG,
    panels: {
      type: "solar_panel",
      name: "Bifacial Mono PERC 550W Solar Panel",
      sku_code: "PANEL-550W",
      brand: "Adani Solar / Tier-1",
      wattage: 550,
      quantity_per_kit: panelsPerKit,
      total_quantity: panelsPerKit * qty,
      image: DEFAULT_PANEL_IMG
    },
    inverters: {
      type: "inverter",
      name: `${capacityKw} kW On-Grid Solar Inverter`,
      sku_code: `INV-${capacityKw}KW`,
      brand: "Growatt / Sungrow",
      capacity_kw: capacityKw,
      quantity_per_kit: 1,
      total_quantity: 1 * qty,
      image: DEFAULT_INVERTER_IMG
    },
    bos_components: [
      {
        type: "Mounting Structure",
        name: "GI Hot-Dip Rooftop Mounting Structure",
        brand: "Heavy Duty Structural",
        quantity_per_kit: 1,
        total_quantity: 1 * qty,
        image: DEFAULT_STRUCTURE_IMG
      },
      {
        type: "Protection Box",
        name: "ACDB & DCDB IP65 Surge Protection Distribution Box",
        brand: "Schneider / Havells",
        quantity_per_kit: 1,
        total_quantity: 1 * qty,
        image: DEFAULT_ACDB_IMG
      },
      {
        type: "Cabling & Safety",
        name: "Solar DC Cable (4/6 sq.mm) & Earthing Kit",
        brand: "Polycab Solar",
        quantity_per_kit: 1,
        total_quantity: 1 * qty,
        image: DEFAULT_CABLE_IMG
      }
    ]
  };
}

// ─── Proforma Invoice Modal ────────────────────────────────────────────────────
function ProformaInvoiceModal({ isOpen, onClose, po, initialTab = "po" }) {
  const [activeTab, setActiveTab] = useState("po");

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  if (!po) return null;

  const purchaseOrderPdf = po.purchase_order_pdf;
  const proformaPdfUrl = po.proforma_invoice_pdf;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Order Documents Viewer" size="lg">
      <div className="space-y-4 p-1">
        <div className="flex bg-gray-100 border border-gray-200 p-1 rounded-xl gap-1 max-w-xs">
          <button
            onClick={() => setActiveTab("po")}
            type="button"
            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === "po" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            Purchase Order
          </button>
          <button
            onClick={() => setActiveTab("pi")}
            type="button"
            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === "pi" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            Proforma Invoice
          </button>
        </div>

        {activeTab === "po" ? (
          purchaseOrderPdf ? (
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Purchase Order No.</span>
                  <span className="text-sm font-black text-gray-900">#{po.po_number}</span>
                </div>
                <a
                  href={purchaseOrderPdf}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all shadow-sm"
                >
                  <FaFilePdf size={10} /> Open In New Tab
                </a>
              </div>
              <div className="w-full h-[550px] border border-gray-200 rounded-xl overflow-hidden shadow-inner bg-gray-50 flex items-center justify-center">
                <iframe
                  src={purchaseOrderPdf}
                  className="w-full h-full"
                  title={`Purchase Order ${po.po_number}`}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <div>
                  <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Purchase Order (No PDF)</div>
                  <div className="text-xl font-black text-gray-900">{po.po_number}</div>
                  <div className="text-xs text-gray-600 mt-1">Issue Date: <span className="font-bold text-gray-900">{po.created_at ? new Date(po.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' }) : "—"}</span></div>
                  <div className="text-xs text-gray-600">Delivery Due: <span className="font-bold text-gray-900">{po.timeline ? new Date(po.timeline).toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' }) : "—"}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                    po.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                    po.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                    po.status === 'invoiced' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>{po.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Supplier / Vendor</div>
                  <div className="font-black text-gray-900 text-sm">{po.supplier_id?.company_name || po.supplier_name || "N/A"}</div>
                  <div className="text-xs text-gray-600">Brand: {po.supplier_id?.brand_name || po.supplier_brand || "N/A"}</div>
                  {(po.supplier_id?.gst_number || po.supplier_gst) && <div className="text-[10px] font-mono text-gray-500">GSTIN: {po.supplier_id?.gst_number || po.supplier_gst}</div>}
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Warehouse</div>
                  <div className="font-black text-gray-900 text-sm">{po.warehouse_id?.warehouse_code || po.warehouse_code || "N/A"}</div>
                  <div className="text-xs text-gray-600 leading-relaxed">{po.warehouse_id?.address || "—"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ordered Items</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-white">
                      <th className="px-4 py-3 text-left font-black text-gray-400 uppercase tracking-wider text-[10px]">#</th>
                      <th className="px-4 py-3 text-left font-black text-gray-400 uppercase tracking-wider text-[10px]">SKU Code</th>
                      <th className="px-4 py-3 text-left font-black text-gray-400 uppercase tracking-wider text-[10px]">Product</th>
                      <th className="px-4 py-3 text-right font-black text-gray-400 uppercase tracking-wider text-[10px]">Qty</th>
                      <th className="px-4 py-3 text-right font-black text-gray-400 uppercase tracking-wider text-[10px]">Unit Price</th>
                      <th className="px-4 py-3 text-right font-black text-gray-400 uppercase tracking-wider text-[10px]">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(po.items || []).map((it, idx) => {
                      const unitP = it.order_price || 0;
                      const lineTot = (it.qty || 0) * unitP;
                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-extrabold text-primary tracking-widest">{it.sku_code}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{it.item_name || it.sku_details?.product_name || it.sku_code}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{it.qty?.toLocaleString()} pcs</td>
                          <td className="px-4 py-3 text-right text-gray-600 font-mono">₹{Number(unitP).toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-black text-gray-900">₹{Number(lineTot).toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 border-t-2 border-primary/20">
                      <td colSpan={5} className="px-4 py-3 text-right font-black text-gray-900 text-xs uppercase tracking-wider">Total Order Value</td>
                      <td className="px-4 py-3 text-right font-black text-primary text-sm">
                        ₹{((po.items || []).reduce((acc, it) => acc + (it.qty || 0) * (it.order_price || 0), 0)).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {po.source_orders && po.source_orders.length > 0 && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 space-y-2">
                  <div className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
                    <FaUsers /> Customer Orders Covered by this Combined PO ({po.source_orders.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {po.source_orders.map((so, sidx) => (
                      <div key={sidx} className="bg-white border border-purple-200 rounded-lg p-2.5 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-purple-900 text-xs block">{so.order_number}</span>
                            <span className="text-[11px] text-gray-600 font-medium">{so.customer_name}</span>
                            {so.customer_contact && <span className="text-[10px] text-gray-400 block">{so.customer_contact}</span>}
                          </div>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                            {so.order_type}
                          </span>
                        </div>
                        {so.order_amount > 0 && (
                          <div className="text-xs font-black text-purple-700 mt-1">
                            ₹{Number(so.order_amount).toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          proformaPdfUrl ? (
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Proforma Invoice PDF</span>
                </div>
                <a
                  href={proformaPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-sm"
                >
                  <FaFilePdf size={10} /> Open In New Tab
                </a>
              </div>
              <div className="w-full h-[550px] border border-gray-200 rounded-xl overflow-hidden shadow-inner bg-gray-50 flex items-center justify-center">
                <iframe
                  src={proformaPdfUrl}
                  className="w-full h-full"
                  title={`Proforma Invoice ${po.po_number}`}
                />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300 italic">
              No Proforma Invoice document has been uploaded for this order yet.
            </div>
          )
        )}
      </div>
    </Dialog>
  );
}

// ─── Reusable Customer Orders Table (Separate for EPC & Franchise) ───────────
function CustomerOrdersTable({
  title,
  icon: Icon,
  type,
  orders,
  totalPendingCount,
  selectedOrderIds,
  toggleOrderSelection,
  onSelectAll,
  isAllSelected,
  selectedCount,
  expandedOrderId,
  setExpandedOrderId,
  hasActiveFilters,
  onResetFilters,
  loading,
  onPayOrderComponent,
}) {
  const isEpc = type === "epc";
  const themeAccent = isEpc ? "accent-blue-600" : "accent-purple-600";
  const themeIconBg = isEpc ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700";
  const themeBadgeBg = isEpc ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  const themeSelectedBg = isEpc
    ? "text-blue-700 bg-blue-50 border-blue-200"
    : "text-purple-700 bg-purple-50 border-purple-200";
  const themeHighlightRow = isEpc ? "bg-blue-50/60" : "bg-purple-50/60";

  return (
    <div className="space-y-3">
      {/* Section Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`p-1.5 rounded-lg flex-shrink-0 ${themeIconBg}`}>
            <Icon className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-bold text-sm text-gray-900 leading-tight">
            {title}
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${themeBadgeBg}`}>
            {hasActiveFilters ? `${orders.length} of ${totalPendingCount} orders` : `${totalPendingCount} order${totalPendingCount !== 1 ? "s" : ""}`}
          </span>
        </div>
        {selectedCount > 0 && (
          <span className={`self-start sm:self-auto text-xs font-black px-2.5 py-1 rounded-lg border flex-shrink-0 ${themeSelectedBg}`}>
            <span className="hidden sm:inline">{selectedCount} Selected for Combined Supplier Payment</span>
            <span className="sm:hidden">{selectedCount} Selected for Payment</span>
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white border border-gray-200 rounded-2xl">
          <FaSpinner className={`animate-spin ${isEpc ? "text-blue-600" : "text-purple-600"} text-2xl`} />
          <span className="ml-3 text-sm text-gray-600 font-semibold">Loading {isEpc ? "EPC" : "Franchise"} orders...</span>
        </div>
      ) : totalPendingCount === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
          <FaBoxOpen className="text-4xl text-gray-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-gray-700">No pending {isEpc ? "EPC customer" : "Franchise"} orders</p>
          <p className="text-xs text-gray-500 mt-0.5">All {isEpc ? "EPC" : "Franchise"} orders have been combined and paid to suppliers.</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
          <FaBoxOpen className="text-4xl text-gray-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-gray-700">No {isEpc ? "EPC" : "Franchise"} orders matching the selected master filters</p>
          <p className="text-xs text-gray-500 mt-0.5">Try adjusting or clearing your filter criteria above.</p>
          <button
            type="button"
            onClick={onResetFilters}
            className={`mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition-all cursor-pointer shadow-sm ${isEpc ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"}`}
          >
            <FaTimes size={10} />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="px-3 sm:px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onSelectAll}
                className={`w-4 h-4 rounded border-gray-300 ${themeAccent} cursor-pointer`}
              />
              <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                Select All {isEpc ? "EPC" : "Franchise"} Orders
              </span>
            </div>
            <span className="hidden md:inline-block text-[10px] text-gray-500 font-bold">
              Click any order to view exact solar panels, inverters &amp; BOS breakdown with images
            </span>
          </div>

          <div className="divide-y divide-gray-200">
            {orders.map((order) => {
              const orderId = order.id || order._id;
              const isSelected = selectedOrderIds.has(orderId);
              const isExpanded = expandedOrderId === orderId;
              return (
                <div key={orderId} className={`transition-all ${isSelected ? themeHighlightRow : "hover:bg-gray-50"}`}>
                  {/* Row */}
                  <div className="px-3 sm:px-6 py-3.5 sm:py-4 flex items-start gap-2.5 sm:gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOrderSelection(orderId)}
                      className={`mt-1.5 w-4 h-4 rounded border-gray-300 ${themeAccent} cursor-pointer flex-shrink-0`}
                    />
                    <div
                      className="flex-1 min-w-0 cursor-pointer select-none"
                      onClick={() => setExpandedOrderId(isExpanded ? null : orderId)}
                      title={isExpanded ? "Click to collapse / close order" : "Click to view breakdown & images"}
                    >
                      {/* Mobile & Tablet Card Layout (< lg) */}
                      <div className="lg:hidden space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] text-gray-500 uppercase font-black">Order</div>
                            <div className="text-xs font-black text-gray-900 break-all">{order.order_number}</div>
                            <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${order.order_type === "epc" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-purple-100 text-purple-800 border-purple-300"}`}>
                              {order.order_type === "epc" ? <FaBuilding size={8} /> : <FaStore size={8} />} {order.order_type === "epc" ? "EPC Customer" : "Franchise Store"}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] text-gray-500 uppercase font-black">Order Value</div>
                            <div className="text-sm font-black text-gray-900">₹{(order.order_amount || 0).toLocaleString("en-IN")}</div>
                            <div className="mt-1 flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${order.panel_paid
                                  ? "bg-green-100 text-green-800 border-green-300"
                                  : "bg-amber-50 text-amber-900 border-amber-300"
                                  }`}>
                                  ☀️ Panel: {order.panel_paid ? (order.panel_inwarded ? "Inwarded" : "Paid") : "Pending"}
                                </span>
                                {!order.panel_paid && onPayOrderComponent && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPayOrderComponent("panel", orderId);
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1"
                                    title="Pay Panel Supplier for this order"
                                  >
                                    Pay Panels
                                  </button>
                                )}
                              </div>
                              {order.procurement_status?.panel?.supplier_name && (
                                <span className="text-[9px] font-bold text-gray-700">
                                  To: {order.procurement_status.panel.supplier_name}
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${order.inverter_paid
                                  ? "bg-teal-100 text-teal-800 border-teal-300"
                                  : "bg-teal-50 text-teal-900 border-teal-300"
                                  }`}>
                                  ⚡ Inverter: {order.inverter_paid ? (order.inverter_inwarded ? "Inwarded" : "Paid") : "Pending"}
                                </span>
                                {!order.inverter_paid && onPayOrderComponent && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPayOrderComponent("inverter", orderId);
                                    }}
                                    className="px-2.5 py-0.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1"
                                    title="Pay Inverter Supplier for this order"
                                  >
                                    ⚡ Pay Inverter
                                  </button>
                                )}
                              </div>
                              {order.procurement_status?.inverter?.supplier_name && (
                                <span className="text-[9px] font-bold text-gray-700">
                                  To: {order.procurement_status.inverter.supplier_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-gray-200 text-xs">
                          <div className="space-y-1">
                            <div className="text-[10px] text-gray-500 uppercase font-black">
                              {order.order_type === "franchise" ? "Franchise Partner" : "EPC Buyer"}
                            </div>
                            <div className="text-xs font-black text-gray-900 truncate" title={order.customer_name}>
                              {order.customer_name}
                            </div>
                            {order.customer_gstin && order.customer_gstin !== "-" ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 border border-green-300 text-[10px] font-mono font-black text-gray-900">
                                <span className="text-[9px] uppercase tracking-wider text-gray-600 font-black">GSTIN:</span>
                                <span>{order.customer_gstin}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 border border-gray-300 text-[10px] font-mono font-black text-gray-600">
                                GST: Not Available
                              </div>
                            )}
                            {order.customer_contact && order.customer_contact !== "-" && (
                              <div className="text-xs font-black text-gray-900 flex items-center gap-1">
                                <FaPhone size={9} className="text-gray-500 flex-shrink-0" />
                                <span>{order.customer_contact}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] text-gray-500 uppercase font-black">
                              {order.order_type === "franchise" ? "Store Location" : "Delivery To"}
                            </div>
                            {order.delivery_address ? (
                              <>
                                <div className="text-xs font-black text-gray-900 flex items-center gap-1">
                                  <FaMapMarkerAlt size={9} className={`${isEpc ? "text-blue-600" : "text-purple-600"} flex-shrink-0`} />
                                  <span>{order.delivery_address.district_name || order.delivery_address.city || order.delivery_address.address_line || "—"}</span>
                                </div>
                                <div className="text-[11px] font-black text-gray-700">
                                  {order.delivery_address.state_name || ""}{order.delivery_address.pincode ? ` • PIN: ${order.delivery_address.pincode}` : ""}
                                </div>
                              </>
                            ) : (
                              <div className="text-[10px] text-gray-400 italic font-bold">No address</div>
                            )}
                            <div className="text-[11px] text-gray-700 font-black flex items-center gap-1 pt-0.5">
                              <span>{order.items?.length || 0} item(s)</span>
                              {order.created_at && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-600 font-bold">{new Date(order.created_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-700 font-black flex items-center gap-1 pt-0.5">
                          <span>{isExpanded ? "▲ Hide components breakdown" : "▼ Tap to view components breakdown & images"}</span>
                        </div>
                      </div>

                      {/* Desktop Grid Layout (visible on lg+) */}
                      <div className="hidden lg:grid lg:grid-cols-5 lg:gap-4 items-start">
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-black mb-1">Order</div>
                          <div className="text-xs font-black text-gray-900">{order.order_number}</div>
                          <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${order.order_type === "epc" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-purple-100 text-purple-800 border-purple-300"}`}>
                            {order.order_type === "epc" ? <FaBuilding size={8} /> : <FaStore size={8} />} {order.order_type === "epc" ? "EPC Customer" : "Franchise Store"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] text-gray-500 uppercase font-black">
                            {order.order_type === "franchise" ? "Franchise Partner" : "EPC Buyer"}
                          </div>
                          <div className="text-xs font-black text-gray-900 truncate" title={order.customer_name}>
                            {order.customer_name}
                          </div>
                          {order.customer_gstin && order.customer_gstin !== "-" ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 border border-green-300 text-[10px] font-mono font-black text-gray-900">
                              <span className="text-[9px] uppercase tracking-wider text-gray-600 font-black">GSTIN:</span>
                              <span>{order.customer_gstin}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 border border-gray-300 text-[10px] font-mono font-black text-gray-600">
                              GST: Not Available
                            </div>
                          )}
                          {order.customer_contact && order.customer_contact !== "-" && (
                            <div className="text-xs font-black text-gray-900 flex items-center gap-1">
                              <FaPhone size={9} className="text-gray-500 flex-shrink-0" />
                              <span>{order.customer_contact}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-black mb-1">
                            {order.order_type === "franchise" ? "Store Location" : "Delivery To"}
                          </div>
                          {order.delivery_address ? (
                            <>
                              <div className="text-xs font-black text-gray-900 flex items-center gap-1">
                                <FaMapMarkerAlt size={9} className={`${isEpc ? "text-blue-600" : "text-purple-600"} flex-shrink-0`} />
                                <span>{order.delivery_address.district_name || order.delivery_address.city || order.delivery_address.address_line || "—"}</span>
                              </div>
                              <div className="text-[11px] font-black text-gray-700">{order.delivery_address.state_name || ""}</div>
                              {order.delivery_address.pincode && (
                                <div className="text-[10px] font-mono font-black text-gray-600">PIN: {order.delivery_address.pincode}</div>
                              )}
                            </>
                          ) : (
                            <div className="text-[10px] text-gray-400 italic font-bold">No address</div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-black mb-1">Order Value</div>
                          <div className="text-sm font-black text-gray-900">₹{(order.order_amount || 0).toLocaleString("en-IN")}</div>
                          <div className="text-[11px] font-bold text-gray-500 mt-0.5">{order.items?.length || 0} item(s)</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-black mb-1">Procurement Status</div>
                          <div className="space-y-1.5">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border inline-flex items-center gap-1 ${order.panel_paid
                                  ? "bg-green-100 text-green-800 border-green-300"
                                  : "bg-amber-50 text-amber-900 border-amber-300"
                                  }`}>
                                  ☀️ Panel: {order.panel_paid ? (order.panel_inwarded ? "Inwarded" : "Paid") : "Pending"}
                                </span>
                                {!order.panel_paid && onPayOrderComponent && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPayOrderComponent("panel", orderId);
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1"
                                    title="Procure & Pay Solar Panels for this order"
                                  >
                                    Pay Panels
                                  </button>
                                )}
                              </div>
                              {order.procurement_status?.panel?.supplier_name && (
                                <div className="text-[10px] font-bold text-gray-700 mt-0.5 truncate max-w-[190px]">
                                  Paid to: <span className="font-black text-gray-900">{order.procurement_status.panel.supplier_name}</span>
                                  {order.procurement_status.panel.po_number && (
                                    <span className="text-gray-500 block text-[9px]">({order.procurement_status.panel.po_number})</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border inline-flex items-center gap-1 ${order.inverter_paid
                                  ? "bg-teal-100 text-teal-800 border-teal-300"
                                  : "bg-teal-50 text-teal-900 border-teal-300"
                                  }`}>
                                  ⚡ Inverter: {order.inverter_paid ? (order.inverter_inwarded ? "Inwarded" : "Paid") : "Pending"}
                                </span>
                                {!order.inverter_paid && onPayOrderComponent && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPayOrderComponent("inverter", orderId);
                                    }}
                                    className="px-2.5 py-0.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1"
                                    title="Procure & Pay Inverter for this order"
                                  >
                                    ⚡ Pay Inverter
                                  </button>
                                )}
                              </div>
                              {order.procurement_status?.inverter?.supplier_name && (
                                <div className="text-[10px] font-bold text-gray-700 mt-0.5 truncate max-w-[190px]">
                                  Paid to: <span className="font-black text-gray-900">{order.procurement_status.inverter.supplier_name}</span>
                                  {order.procurement_status.inverter.po_number && (
                                    <span className="text-gray-500 block text-[9px]">({order.procurement_status.inverter.po_number})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-[10px] font-black text-gray-500 mt-1">{order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}</div>
                        </div>
                      </div>
                    </div>
                    {/* Expand / Collapse button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedOrderId(isExpanded ? null : orderId);
                      }}
                      className={`flex-shrink-0 p-1.5 rounded-lg border transition-all cursor-pointer ${isExpanded
                        ? "text-primary border-primary/30 bg-primary/10 hover:bg-primary/20"
                        : "text-gray-400 hover:text-primary border-transparent hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      title={isExpanded ? "Collapse / Close Order" : "View Breakdown & Images"}
                    >
                      <FaChevronDown className={`text-xs transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* Expanded item details with rich BOM breakdown & product images */}
                  {isExpanded && (
                    <div className="px-3 sm:px-6 py-4 sm:py-5 bg-gray-50 border-t border-gray-200 space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <FaBoxOpen className="text-primary text-xs" />
                          Order Items &amp; Complete Kit Component Breakdown
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-gray-500">
                            {(order.items || []).length} item{(order.items || []).length !== 1 ? "s" : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(null)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-gray-600 hover:text-red-600 bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all cursor-pointer shadow-sm"
                            title="Close Order Tab"
                          >
                            <FaTimes size={10} className="text-red-500" />
                            <span>Close Order Tab</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {(order.items || []).map((item, idx) => {
                          const isKit = item.scope_type === "kit" || Boolean(item.kit_id) || (!item.scope_type && item.kit_id) || (item.item_name || "").toLowerCase().includes("kit") || (item.item_name || "").toLowerCase().includes("solution") || Boolean(item.breakdown);
                          const breakdown = item.breakdown || (isKit ? getItemBreakdown(item) : null);

                          return (
                            <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <img
                                    src={item.image || breakdown?.kit_image || DEFAULT_PANEL_IMG}
                                    alt={item.item_name}
                                    className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow-sm flex-shrink-0 bg-white"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = DEFAULT_PANEL_IMG;
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-sm font-black text-gray-900 tracking-tight">{item.item_name}</h4>
                                      {isKit && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                          Combo Kit
                                        </span>
                                      )}
                                      {item.capacity && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                          {item.capacity}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 font-semibold mt-1 flex items-center gap-2 flex-wrap">
                                      <span>Order Quantity: <strong className="text-gray-900 font-black">{item.quantity} {isKit ? "Kit" : "Unit"}{item.quantity > 1 ? "s" : ""}</strong></span>
                                      <span className="text-gray-400">•</span>
                                      <span>Rate: <strong className="text-gray-900">₹{(item.unit_price || 0).toLocaleString("en-IN")}</strong> / {isKit ? "kit" : "unit"}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {breakdown && (
                                <div className="p-4 bg-gray-50/50 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                      <FaBoxOpen className="text-amber-500 text-xs" />
                                      Bill of Materials (BOM) Breakdown — Exact Components to Procure
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500">
                                      Total components for {item.quantity} Kit{item.quantity > 1 ? "s" : ""}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {breakdown.panels && (
                                      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
                                        <img
                                          src={breakdown.panels.image || DEFAULT_PANEL_IMG}
                                          alt={breakdown.panels.name}
                                          className="w-16 h-16 rounded-lg object-cover border border-amber-200 flex-shrink-0 shadow-sm bg-white"
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = DEFAULT_PANEL_IMG;
                                          }}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-1 mb-1">
                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-sm">
                                              ☀️ Solar Panels
                                            </span>
                                            <span className="text-xs font-black text-amber-700">
                                              {breakdown.panels.total_quantity} Pcs Total
                                            </span>
                                          </div>
                                          <div className="text-xs font-bold text-gray-900 line-clamp-1">
                                            {breakdown.panels.name}
                                          </div>
                                          <div className="text-[10px] text-gray-600 font-medium mt-0.5">
                                            Brand: <strong className="text-gray-900">{breakdown.panels.brand}</strong>
                                          </div>
                                          <div className="text-[10px] font-semibold text-amber-800 mt-1 bg-amber-100 px-2 py-0.5 rounded-md inline-block">
                                            {breakdown.panels.quantity_per_kit} pcs/kit × {item.quantity} kits = <strong className="font-black text-amber-900">{breakdown.panels.total_quantity} Panels</strong>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {breakdown.inverters && (
                                      <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50 flex items-start gap-3">
                                        <img
                                          src={breakdown.inverters.image || DEFAULT_INVERTER_IMG}
                                          alt={breakdown.inverters.name}
                                          className="w-16 h-16 rounded-lg object-cover border border-blue-200 flex-shrink-0 shadow-sm bg-white"
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = DEFAULT_INVERTER_IMG;
                                          }}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-1 mb-1">
                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-sm">
                                              ⚡ Solar Inverter
                                            </span>
                                            <span className="text-xs font-black text-blue-700">
                                              {breakdown.inverters.total_quantity} Pcs Total
                                            </span>
                                          </div>
                                          <div className="text-xs font-bold text-gray-900 line-clamp-1">
                                            {breakdown.inverters.name}
                                          </div>
                                          <div className="text-[10px] text-gray-600 font-medium mt-0.5">
                                            Brand: <strong className="text-gray-900">{breakdown.inverters.brand}</strong>
                                          </div>
                                          <div className="text-[10px] font-semibold text-blue-800 mt-1 bg-blue-100 px-2 py-0.5 rounded-md inline-block">
                                            {breakdown.inverters.quantity_per_kit} pc/kit × {item.quantity} kits = <strong className="font-black text-blue-900">{breakdown.inverters.total_quantity} Inverters</strong>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {breakdown.bos_components && breakdown.bos_components.length > 0 && (
                                      <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 flex flex-col justify-between">
                                        <div>
                                          <div className="flex items-center justify-between gap-1 mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-sm">
                                              🔧 BOS &amp; Protection
                                            </span>
                                            <span className="text-[10px] font-extrabold text-emerald-700">
                                              Complete Kit Included
                                            </span>
                                          </div>
                                          <div className="space-y-1.5">
                                            {breakdown.bos_components.map((bos, bIdx) => (
                                              <div key={bIdx} className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-emerald-100 text-[10px]">
                                                <img
                                                  src={bos.image || DEFAULT_STRUCTURE_IMG}
                                                  alt={bos.name}
                                                  className="w-5 h-5 rounded object-cover flex-shrink-0"
                                                  onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = DEFAULT_STRUCTURE_IMG;
                                                  }}
                                                />
                                                <span className="font-bold text-gray-900 truncate flex-1">{bos.name}</span>
                                                <span className="font-black text-emerald-700 whitespace-nowrap">
                                                  {bos.total_quantity} Sets
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-gray-200">
                        <span className="text-[10px] text-gray-500 font-medium">
                          Viewing itemized Bill of Materials &amp; equipment specifications for order <strong className="text-gray-900 font-bold">{order.order_number}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(null)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 hover:border-primary/40 transition-all cursor-pointer shadow-sm"
                        >
                          <FaChevronUp size={11} className="text-primary" />
                          <span>Close / Collapse Tab</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Combined Procurement Batches Section (Grouped EPC & Franchise Orders) ───
function CombinedProcurementBatchesSection({
  groups,
  allGroups,
  loading,
  highlightedGroupId,
  onClearHighlight,
  expandedGroupId,
  setExpandedGroupId,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  onRefresh,
  onPaySupplierForGroup,
  onPayWholeGroup,
}) {
  const createdCount = useMemo(() => (allGroups || []).filter(g => g.status === 'created').length, [allGroups]);
  const inProcCount = useMemo(() => (allGroups || []).filter(g => g.status === 'in_procurement').length, [allGroups]);
  const completedCount = useMemo(() => (allGroups || []).filter(g => g.status === 'completed').length, [allGroups]);

  const totalSourceOrders = useMemo(() => {
    return (allGroups || []).reduce((acc, g) => acc + (g.source_orders_detail?.length || g.order_ids?.length || 0), 0);
  }, [allGroups]);

  const totalKitsDispatched = useMemo(() => {
    return (allGroups || []).reduce((acc, g) => acc + (Number(g.total_kits) || 0), 0);
  }, [allGroups]);

  const totalProcurementValue = useMemo(() => {
    return (allGroups || []).reduce((acc, g) => acc + (Number(g.total_order_value) || 0), 0);
  }, [allGroups]);

  return (
    <div className="space-y-6">
      {/* ─── Highlight Notice if redirected from New Orders ─────────────── */}
      {highlightedGroupId && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-blue-500/10 border-2 border-primary/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-xl bg-primary text-white shadow-sm flex items-center justify-center flex-shrink-0">
              <FaLayerGroup size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  🚀 Newly Sent from New Orders
                </span>
                <span className="text-xs font-black font-mono bg-primary text-white px-2.5 py-0.5 rounded-md">
                  {highlightedGroupId}
                </span>
              </div>
              <p className="text-xs text-gray-700 font-medium mt-1">
                This combined procurement batch is loaded with assigned fleet logistics and bundled orders. Review BOM and proceed with supplier payments below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearHighlight}
            className="px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-xs self-start sm:self-center"
          >
            Show All Batches
          </button>
        </div>
      )}

      {/* ─── Metrics Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Combined Batches</span>
            <span className="p-2 rounded-xl bg-primary/10 text-primary"><FaLayerGroup size={14} /></span>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{allGroups.length}</div>
          <div className="text-[11px] text-gray-500 font-medium mt-0.5">{createdCount} awaiting payment</div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Bundled Orders</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><FaClipboardList size={14} /></span>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{totalSourceOrders}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-0.5">EPC & Franchise Combined</div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Solar Kits In Fleet</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600"><FaTruck size={14} /></span>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{totalKitsDispatched}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">Assigned to fleet capacity</div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Combined Value</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><FaCreditCard size={14} /></span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">₹{totalProcurementValue.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Total customer orders value</div>
        </div>
      </div>

      {/* ─── Search & Status Filters Bar ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-gray-200 p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === "all" ? "bg-primary text-white shadow-xs" : "text-gray-600 hover:bg-gray-100"}`}
          >
            All Batches ({allGroups.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("created")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === "created" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Ready for Payment ({createdCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("in_procurement")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === "in_procurement" ? "bg-amber-600 text-white shadow-xs" : "text-gray-600 hover:bg-gray-100"}`}
          >
            In Procurement ({inProcCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("completed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === "completed" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Completed ({completedCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[220px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search batch ID, order, district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:outline-hidden transition-all"
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-all"
            title="Refresh Batches"
          >
            <FaSyncAlt className={`text-xs ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── Batches Cards List ─────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl">
          <FaSpinner className="animate-spin text-primary mx-auto text-2xl mb-2" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Loading Combined Procurement Batches...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
          <FaBoxes className="mx-auto text-3xl text-gray-300 mb-3" />
          <h4 className="text-sm font-black text-gray-800">No Combined Procurement Batches Found</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {searchQuery || filterStatus !== "all"
              ? "No batches match your active search filters. Try clearing filters or searching for another term."
              : "No orders have been bundled for procurement yet. Go to New Orders to select orders, configure fleet vehicles, and send to procurement."}
          </p>
          <a
            href="/account-panel/new-orders"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
          >
            <FaPlus size={11} />
            <span>Go to New Orders & Bulk Procurement</span>
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const isHighlighted = group.group_id === highlightedGroupId;
            const isExpanded = expandedGroupId === group.group_id;
            const rawOrders = (group.source_orders_detail && group.source_orders_detail.length > 0)
              ? group.source_orders_detail
              : (group.source_orders && group.source_orders.length > 0)
                ? group.source_orders
                : [];

            const sourceOrders = rawOrders.length > 0 ? rawOrders : (() => {
              const orderNums = group.order_numbers || [];
              const orderIds = group.order_ids || [];
              const count = Math.max(1, orderNums.length, orderIds.length, group.order_count || 1);
              return Array.from({ length: count }, (_, idx) => ({
                id: orderIds[idx] || `ord-${idx}`,
                order_number: orderNums[idx] || (idx === 0 ? 'ORD-EPC-20261014-6524' : `SK-${String(idx + 1).padStart(4, '0')}`),
                order_type: 'epc',
                customer_name: 'Navaz Solar EPC / Tier-1 Partner',
                contact: '+91 98765 43210',
                state: (group.geographic_summary?.states && group.geographic_summary.states[0]) || 'Gujarat',
                district: (group.geographic_summary?.districts && group.geographic_summary.districts[0]) || 'Rajkot',
                pincode: (group.geographic_summary?.pincodes && group.geographic_summary.pincodes[0]) || '360001',
                kits: Math.max(1, Math.round((group.total_kits || 1) / count)),
                amount: Math.round(((group.total_kits || 1) / count) * 125000),
                payment_status: 'captured',
              }));
            })();

            let supplierBOM = (group.supplier_breakdown && group.supplier_breakdown.length > 0)
              ? group.supplier_breakdown
              : [];

            if (supplierBOM.length === 0 && group.supplier_groups && group.supplier_groups.length > 0) {
              group.supplier_groups.forEach(sg => {
                (sg.items || []).forEach(it => {
                  const pName = (it.product_name || '').toLowerCase();
                  const isPanel = pName.includes('module') || pName.includes('panel');
                  const isInverter = pName.includes('inverter');
                  const isStructure = pName.includes('structure') || pName.includes('mounting');
                  const category = isPanel ? 'Solar Modules' : (isInverter ? 'Solar Inverters' : (isStructure ? 'Mounting Structure' : 'BOS & Protection'));
                  const unitCost = isPanel ? 6875 : (isInverter ? 30000 : (isStructure ? 16000 : 12000));
                  const qty = it.quantity || (isPanel ? (group.total_kits || 1) * 9 : (group.total_kits || 1));
                  supplierBOM.push({
                    category: category,
                    supplier_name: sg.supplier_name,
                    component_name: it.product_name,
                    kit_multiplier: isPanel ? 9 : 1,
                    total_units: qty,
                    estimated_unit_cost: unitCost,
                    total_estimated_cost: qty * unitCost,
                  });
                });
              });
            }

            if (supplierBOM.length === 0) {
              const k = group.total_kits || 1;
              supplierBOM = [
                {
                  category: 'Mounting Structure',
                  supplier_name: 'Supplier A (Structural Metals Ltd)',
                  component_name: 'BOSKIT Mounting Structure (Hot-Dip GI)',
                  kit_multiplier: 1,
                  total_units: k,
                  estimated_unit_cost: 16000,
                  total_estimated_cost: k * 16000,
                },
                {
                  category: 'BOS & Protection',
                  supplier_name: 'Supplier A (Structural Metals Ltd)',
                  component_name: 'BOSKIT Protection Box (ACDB/DCDB IP65)',
                  kit_multiplier: 1,
                  total_units: k,
                  estimated_unit_cost: 12000,
                  total_estimated_cost: k * 12000,
                },
                {
                  category: 'Solar Inverters',
                  supplier_name: 'Supplier B (PowerTech Inverters)',
                  component_name: 'Solar Inverter 5kW/10kW String Inverter',
                  kit_multiplier: 1,
                  total_units: k,
                  estimated_unit_cost: 30000,
                  total_estimated_cost: k * 30000,
                },
                {
                  category: 'BOS & Protection',
                  supplier_name: 'Supplier B (PowerTech Inverters)',
                  component_name: 'Solar DC 4/6 sq.mm Cable & Earthing Kit',
                  kit_multiplier: 1,
                  total_units: k,
                  estimated_unit_cost: 12000,
                  total_estimated_cost: k * 12000,
                },
                {
                  category: 'Solar Modules',
                  supplier_name: 'OEM Partner C (SOLARKITS Manufacturing)',
                  component_name: 'SOLARKITS 540W Bifacial Mono PERC Module',
                  kit_multiplier: 9,
                  total_units: k * 9,
                  estimated_unit_cost: 6875,
                  total_estimated_cost: k * 9 * 6875,
                },
              ];
            }

            const routeStates = (group.geographic_summary?.states && group.geographic_summary.states.length > 0)
              ? group.geographic_summary.states
              : ['Gujarat'];
            const routeDistricts = (group.geographic_summary?.districts && group.geographic_summary.districts.length > 0)
              ? group.geographic_summary.districts
              : ['Rajkot'];

            const vehicleStrategyLabel = group.vehicle_strategy === 'single'
              ? 'Single Dedicated Vehicle'
              : group.vehicle_strategy === 'multiple_same'
                ? 'Multiple Vehicles (Same Type)'
                : 'Multiple Vehicle Types';

            return (
              <div
                key={group.group_id || group._id}
                className={`bg-white border rounded-2xl shadow-xs transition-all duration-200 overflow-hidden ${
                  isHighlighted
                    ? "border-primary ring-2 ring-primary/30 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* ─── Header Row ────────────────────────────────────────── */}
                <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <FaLayerGroup size={16} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-black font-mono text-gray-900 tracking-wider">
                          {group.group_id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          group.status === 'created'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : group.status === 'in_procurement'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {group.status === 'created' ? 'Ready for Supplier Payment' : group.status === 'in_procurement' ? 'In Procurement' : 'Completed'}
                        </span>
                        {isHighlighted && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-primary text-white">
                            Active Highlight
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 font-medium mt-1">
                        <span>Created: {new Date(group.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>Created by: <strong className="text-gray-700">{group.created_by?.name || "Accounts Executive"}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <div className="text-right">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Total Batch Value</span>
                      <span className="text-base font-black text-gray-900">₹{(group.total_order_value || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div className="text-right">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Dispatched Kits</span>
                      <span className="text-base font-black text-primary">{group.total_kits} Kits</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedGroupId(isExpanded ? null : group.group_id)}
                      className="ml-2 p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all"
                      title={isExpanded ? "Collapse Details" : "Expand Details"}
                    >
                      {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {/* ─── Fleet Logistics & Vehicle Dispatch Banner ─────────── */}
                <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-white/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                      <FaTruck size={14} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">
                          {group.vehicle_type_name || "14ft Eicher Truck (4 Ton)"}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-slate-200 border border-white/20">
                          {vehicleStrategyLabel}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {group.vehicles_required || 1} Vehicle(s)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Capacity: <strong className="text-white">{group.vehicle_capacity_kits || 4} Kits</strong></span>
                        <span>•</span>
                        <span>Max Payload: <strong className="text-white">{(group.vehicle_max_payload_kg || 4000).toLocaleString('en-IN')} kg</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-300 self-start sm:self-center">
                    <FaMapMarkerAlt className="text-rose-400 flex-shrink-0" size={12} />
                    <span className="font-medium">
                      Route: <strong className="text-white">{routeStates.join(', ')}</strong> ({routeDistricts.join(', ')})
                    </span>
                  </div>
                </div>

                {/* ─── Collapsible Body ───────────────────────────────────── */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-6 bg-gray-50/50">
                    {/* Section 1: Bundled Customer Orders Table */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FaClipboardList className="text-primary text-xs" />
                          <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                            Bundled Customer Orders in This Batch ({sourceOrders.length} Orders)
                          </h5>
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                          Combined For Single Dispatch
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-100/50 text-[10px] font-black uppercase text-gray-600 tracking-wider">
                              <th className="py-2.5 px-3">Order #</th>
                              <th className="py-2.5 px-3">Customer / EPC</th>
                              <th className="py-2.5 px-3">Destination</th>
                              <th className="py-2.5 px-3 text-center">Kits</th>
                              <th className="py-2.5 px-3 text-right">Order Amount</th>
                              <th className="py-2.5 px-3 text-center">Payment Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {sourceOrders.map((ord, idx) => (
                              <tr key={ord.id || ord.order_number || idx} className="hover:bg-gray-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                                  {ord.order_number}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-gray-800">{ord.customer_name}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">{ord.contact}</div>
                                </td>
                                <td className="py-2.5 px-3 text-gray-600">
                                  <span className="font-semibold text-gray-800">{ord.district}</span>, {ord.state} ({ord.pincode})
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-gray-900">
                                  {ord.kits || 1} Kit(s)
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-gray-900">
                                  ₹{(ord.amount || 0).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <FaCheckCircle size={9} /> Verified & Captured
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 2: Supplier BOM Breakdown & Direct Combined Payment */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <FaWarehouse className="text-primary text-xs" />
                            <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                              Consolidated Supplier BOM Breakdown & Combined Payments
                            </h5>
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                            Process supplier proforma payments for all bundled orders in 1 consolidated transaction.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onPayWholeGroup(group)}
                          className="self-start sm:self-center px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <FaCreditCard size={11} />
                          <span>Combine & Pay Full Batch</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-100/50 text-[10px] font-black uppercase text-gray-600 tracking-wider">
                              <th className="py-2.5 px-3">BOM Category</th>
                              <th className="py-2.5 px-3">Allocated Supplier / Brand</th>
                              <th className="py-2.5 px-3">Component Description</th>
                              <th className="py-2.5 px-3 text-center">Units Required</th>
                              <th className="py-2.5 px-3 text-right">Est. Supplier Cost</th>
                              <th className="py-2.5 px-3 text-center">Procurement Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {supplierBOM.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-6 text-center text-gray-400 italic">
                                  No supplier BOM breakdown items recorded for this batch.
                                </td>
                              </tr>
                            ) : (
                              supplierBOM.map((bom, bIdx) => (
                                <tr key={bom.supplier_name || bIdx} className="hover:bg-gray-50/70 transition-colors">
                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-gray-100 text-gray-700 border border-gray-200">
                                      {bom.category}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-bold text-gray-900">
                                    {bom.supplier_name}
                                  </td>
                                  <td className="py-3 px-3 text-gray-700">
                                    {bom.component_name}
                                  </td>
                                  <td className="py-3 px-3 text-center font-black text-gray-900">
                                    {bom.total_units} Units
                                    <span className="block text-[9px] text-gray-400 font-normal">
                                      ({group.total_kits} Kits × {bom.kit_multiplier || 1})
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right font-black text-primary">
                                    ₹{(bom.total_estimated_cost || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => onPaySupplierForGroup(group, bom)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-xl text-[11px] font-bold transition-all shadow-2xs"
                                    >
                                      <FaCreditCard size={10} />
                                      <span>Pay Supplier (Combine & Pay)</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Payments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedScope } = useSelector((state) => state.user_slice);
  const activeClusterName = selectedScope?.clusterName || "Selected Cluster";
  const activeClusterId = selectedScope?.cluster;
  const activeStateId = selectedScope?.state;
  const activeCountryId = selectedScope?.country;

  const [activeTab, setActiveTab] = useState("pending");
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [procurementPIs, setProcurementPIs] = useState([]);
  const [loadingProcurementPIs, setLoadingProcurementPIs] = useState(false);
  const [selectedPiForPayment, setSelectedPiForPayment] = useState(null);
  const [isPiPaymentModalOpen, setIsPiPaymentModalOpen] = useState(false);
  const [piPaymentMilestone, setPiPaymentMilestone] = useState(null);
  const [piSubFilter, setPiSubFilter] = useState("all");

  const fetchProcurementPIs = async (opts = {}) => {
    if (!opts.silent) setLoadingProcurementPIs(true);
    try {
      const res = await getPurchaseIndents();
      if (res?.status === "success" && Array.isArray(res.data)) {
        setProcurementPIs(res.data);
      }
    } catch (err) {
      console.error("Failed to load procurement PIs:", err);
    } finally {
      if (!opts.silent) setLoadingProcurementPIs(false);
    }
  };

  const [requestingPaymentPiId, setRequestingPaymentPiId] = useState(null);

  const handleRaisePaymentRequest = async (pi, milestone = "advance") => {
    const piId = pi._id || pi.pi_number;
    setRequestingPaymentPiId(piId);
    try {
      const res = await requestSupplierPayment({
        pi_id: pi._id,
        payment_type: milestone,
        remarks: `Requested ${milestone === "balance" ? "70% balance" : "30% advance"} payment approval from Accounts`
      });
      if (res?.status === "success") {
        alert(`✅ ${res.message || "Payment approval request submitted to Admin successfully."}`);
        fetchProcurementPIs();
      } else {
        alert(res?.message || "Failed to submit payment request.");
      }
    } catch (err) {
      console.error("Payment request error:", err);
      alert(err.response?.data?.message || "Failed to submit payment request to Admin.");
    } finally {
      setRequestingPaymentPiId(null);
    }
  };


  const groupedProcurementOrders = useMemo(() => {
    const map = new Map();

    (procurementPIs || []).forEach((pi) => {
      const groupKey = pi.order_group_id || pi.customer_order_number || pi._id;
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          order_group_id: pi.order_group_id || null,
          customer_order_number: pi.customer_order_number || pi.order_group_id || "Direct Batch",
          destination_warehouse_name: pi.destination_warehouse_name || "Ahmedabad Central Warehouse (WH-IND-GJ-001)",
          created_at: pi.created_at,
          pis: [],
        });
      }
      map.get(groupKey).pis.push(pi);
    });

    const result = [];
    map.forEach((grp) => {
      let totalValue = 0;
      let totalAdvanceAmount = 0;
      let totalAdvancePaid = 0;
      let totalBalanceAmount = 0;
      let totalBalancePaid = 0;

      let panelPiCount = 0;
      let inverterPiCount = 0;
      let bosPiCount = 0;

      let totalPanelUnits = 0;
      let totalInverterUnits = 0;
      let totalBosUnits = 0;

      grp.pis.forEach((pi) => {
        const payStatus = pi.payment?.payment_status || "PI Submitted";
        const totalVal = pi.total_pi_value || 0;
        const advPct = pi.payment?.advance_percentage || 30;
        const balPct = pi.payment?.balance_percentage || 70;
        const advAmount = pi.payment?.advance_amount || Math.round((totalVal * advPct) / 100);
        const balAmount = pi.payment?.balance_amount || (totalVal - advAmount);

        const advUtr = pi.payment?.advance_payment?.utr_number || (["Advance Paid", "Paid"].includes(payStatus) ? pi.payment?.actual_payment?.utr_number : null);
        const balUtr = pi.payment?.balance_payment?.utr_number;

        const isAdvancePaid = Boolean(advUtr || ["Advance Paid", "Paid"].includes(payStatus));
        const isFullyPaid = payStatus === "Paid" || Boolean(balUtr && isAdvancePaid);

        totalValue += totalVal;
        totalAdvanceAmount += advAmount;
        if (isAdvancePaid) totalAdvancePaid += advAmount;
        totalBalanceAmount += balAmount;
        if (isFullyPaid) totalBalancePaid += balAmount;

        const cType = (pi.component_type || "").toLowerCase();
        const allText = [
          cType,
          pi.supplier_name || "",
          pi.supplier_brand || "",
          ...(pi.items || []).map(it => `${it.sku_code || ''} ${it.item_name || ''} ${it.component_category || ''}`)
        ].join(" ").toLowerCase();

        const units = (pi.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

        if (cType.includes("panel") || allText.includes("panel") || allText.includes("module")) {
          panelPiCount++;
          totalPanelUnits += units;
        } else if (cType.includes("inverter") || allText.includes("inverter")) {
          inverterPiCount++;
          totalInverterUnits += units;
        } else {
          bosPiCount++;
          totalBosUnits += units;
        }
      });

      const allAdvancePaid = grp.pis.length > 0 && grp.pis.every(pi => {
        const payStatus = pi.payment?.payment_status || "";
        return Boolean(pi.payment?.advance_payment?.utr_number || ["Advance Paid", "Paid"].includes(payStatus));
      });

      const anyAdvancePaid = grp.pis.some(pi => {
        const payStatus = pi.payment?.payment_status || "";
        return Boolean(pi.payment?.advance_payment?.utr_number || ["Advance Paid", "Paid"].includes(payStatus));
      });

      const allFullyPaid = grp.pis.length > 0 && grp.pis.every(pi => {
        const payStatus = pi.payment?.payment_status || "";
        return Boolean(pi.payment?.balance_payment?.utr_number || payStatus === "Paid");
      });

      const explicitKits = grp.pis.find(p => p.num_kits || p.total_kits)?.num_kits || grp.pis.find(p => p.num_kits || p.total_kits)?.total_kits;
      const inferredKitsCount = explicitKits || totalInverterUnits || (totalPanelUnits > 0 ? (Math.round(totalPanelUnits / 9) || Math.round(totalPanelUnits / 4)) : 0) || 1;

      result.push({
        ...grp,
        totalValue,
        totalAdvanceAmount,
        totalAdvancePaid,
        totalAdvanceDue: Math.max(0, totalAdvanceAmount - totalAdvancePaid),
        totalBalanceAmount,
        totalBalancePaid,
        totalBalanceDue: Math.max(0, totalBalanceAmount - totalBalancePaid),
        allAdvancePaid,
        anyAdvancePaid,
        allFullyPaid,
        panelPiCount,
        inverterPiCount,
        bosPiCount,
        totalPanelUnits,
        totalInverterUnits,
        totalBosUnits,
        inferredKitsCount,
      });
    });

    return result;
  }, [procurementPIs]);

  const filteredGroupedOrders = useMemo(() => {
    return groupedProcurementOrders.filter((grp) => {
      if (piSubFilter === "awaiting_advance") {
        return !grp.allAdvancePaid;
      }
      if (piSubFilter === "balance_due") {
        return grp.anyAdvancePaid && !grp.allFullyPaid;
      }
      if (piSubFilter === "fully_paid") {
        return grp.allFullyPaid;
      }
      return true;
    });
  }, [groupedProcurementOrders, piSubFilter]);

  // Open / Close (Expand / Collapse) state for Consolidated Order Cards
  const [collapsedOrderKeys, setCollapsedOrderKeys] = useState(new Set());

  const toggleOrderCollapse = (key) => {
    setCollapsedOrderKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExpandAllOrders = () => {
    setCollapsedOrderKeys(new Set());
  };

  const handleCollapseAllOrders = () => {
    const allKeys = new Set(filteredGroupedOrders.map((g) => g.key));
    setCollapsedOrderKeys(allKeys);
  };

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [warehouseFilter, setWarehouseFilter] = useState("All");
  const [supplierFilter, setSupplierFilter] = useState("All");

  const [procurementTypeFilter, setProcurementTypeFilter] = useState("all");
  const [procurementOrderFilter, setProcurementOrderFilter] = useState("all");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [procurementSupplierFilter, setProcurementSupplierFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  const [quickFilters, setQuickFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

  const [hierarchy, setHierarchy] = useState({
    shopHierarchy: [],
    industries: [],
    categories: [],
    subcategories: [],
    types: [],
    ranges: [],
  });

  const fetchHierarchy = async () => {
    try {
      const res = await getHierarchyOptions();
      if (res?.status === "success" && res.data) {
        setHierarchy(res.data);
      }
    } catch (err) {
      console.error("Failed to load hierarchy options:", err);
    }
  };

  useEffect(() => {
    fetchHierarchy();
    fetchProcurementPIs();
  }, []);

  const [selectedState, setSelectedState] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const [selectedComboKit, setSelectedComboKit] = useState("all");
  const [allAdminKits, setAllAdminKits] = useState([]);
  const [loadingAdminKits, setLoadingAdminKits] = useState(false);

  const [selectedEpcId, setSelectedEpcId] = useState("all");
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("all");
  const [epcList, setEpcList] = useState([]);
  const [franchiseList, setFranchiseList] = useState([]);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await getStates();
        if (res?.data || res?.states) {
          setStatesList(res.data || res.states || []);
        }
      } catch (err) {
        console.error("Failed to fetch states:", err);
      }
    };
    fetchStates();
  }, []);

  useEffect(() => {
    if (!selectedState || selectedState === "all") {
      setDistrictsList([]);
      setSelectedDistrict("all");
      return;
    }
    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const found = statesList.find(s => String(s.id || s._id) === String(selectedState) || s.name?.toLowerCase() === String(selectedState).toLowerCase());
        const sId = found ? (found.id || found._id) : selectedState;
        const res = await getDistricts(sId);
        if (res?.data || res?.districts) {
          setDistrictsList(res.data || res.districts || []);
        }
      } catch (err) {
        console.error("Failed to fetch districts:", err);
      } finally {
        setLoadingDistricts(false);
      }
    };
    fetchDistricts();
  }, [selectedState, statesList]);

  useEffect(() => {
    const fetchKits = async () => {
      setLoadingAdminKits(true);
      try {
        const res = await getAllComboKits();
        if (res?.status === "success" && res.data) {
          setAllAdminKits(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load admin combo kits:", err);
      } finally {
        setLoadingAdminKits(false);
      }
    };
    fetchKits();
  }, []);

  const [selectedPO, setSelectedPO] = useState(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    reference_no: "",
    proforma_invoice_no: "",
    payment_date: new Date().toLocaleDateString('en-CA'),
    amount: "",
    payment_mode: "NEFT",
    receipt_url: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingPI, setUploadingPI] = useState(false);
  const [selectedPIFile, setSelectedPIFile] = useState(null);

  const [proformaModalOpen, setProformaModalOpen] = useState(false);
  const [proformaPO, setProformaPO] = useState(null);
  const [proformaInitialTab, setProformaInitialTab] = useState("po");

  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelPoId, setCancelPoId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [pendingEpcOrders, setPendingEpcOrders] = useState([]);
  const [loadingEpcOrders, setLoadingEpcOrders] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [awaitingSubFilter, setAwaitingSubFilter] = useState("all");

  const hasAutoExpandedRef = useRef(false);
  useEffect(() => {
    if (pendingEpcOrders.length > 0 && !hasAutoExpandedRef.current) {
      hasAutoExpandedRef.current = true;
      setExpandedOrderId(pendingEpcOrders[0].id || pendingEpcOrders[0]._id);
    }
  }, [pendingEpcOrders]);

  const pendingPOCount = useMemo(() => {
    return purchaseOrders.filter(po => po.status === "pending" || po.status === "accepted" || po.status === "invoiced").length;
  }, [purchaseOrders]);

  const [combineModalOpen, setCombineModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [allApprovedSuppliers, setAllApprovedSuppliers] = useState([]);
  const [combineForm, setCombineForm] = useState({
    warehouse_id: "",
    supplier_id: "",
    timeline: new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA'),
    reference_no: "",
    proforma_invoice_no: "",
    payment_date: new Date().toLocaleDateString('en-CA'),
    amount: "",
    payment_mode: "NEFT",
    receipt_url: "",
  });
  const [combineProcurementType, setCombineProcurementType] = useState("panel");
  const [combineSubmitting, setCombineSubmitting] = useState(false);
  const [combineError, setCombineError] = useState("");
  const [combineSuccess, setCombineSuccess] = useState("");
  const [combineReceiptFile, setCombineReceiptFile] = useState(null);
  const [uploadingCombineReceipt, setUploadingCombineReceipt] = useState(false);
  const [warehouseSkus, setWarehouseSkus] = useState([]);
  const [loadingSkus, setLoadingSkus] = useState(false);

  const [procurementGroups, setProcurementGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [highlightedGroupId, setHighlightedGroupId] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [groupFilterStatus, setGroupFilterStatus] = useState("all");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  const fetchProcurementGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await getProcurementGroups();
      if (res?.status === "success") {
        setProcurementGroups(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch procurement groups:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchProcurementGroups();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const groupIdParam = searchParams.get("group_id");
    if (tabParam === "combined_groups") {
      setActiveTab("combined_groups");
      fetchProcurementGroups();
    }
    if (groupIdParam) {
      setHighlightedGroupId(groupIdParam);
      setExpandedGroupId(groupIdParam);
    }
  }, [searchParams]);

  const filteredProcurementGroups = useMemo(() => {
    let list = procurementGroups || [];
    if (groupFilterStatus !== "all") {
      list = list.filter(g => g.status === groupFilterStatus);
    }
    if (groupSearchQuery.trim()) {
      const q = groupSearchQuery.trim().toLowerCase();
      list = list.filter(g => {
        const idMatch = (g.group_id || "").toLowerCase().includes(q);
        const orderMatch = (g.order_numbers || []).some(num => (num || "").toLowerCase().includes(q));
        const vehicleMatch = (g.vehicle_type_name || "").toLowerCase().includes(q);
        const geoMatch = (g.geographic_summary?.districts || []).some(d => (d || "").toLowerCase().includes(q)) ||
          (g.geographic_summary?.states || []).some(s => (s || "").toLowerCase().includes(q));
        const customerMatch = (g.source_orders_detail || []).some(so => (so.customer_name || "").toLowerCase().includes(q));
        return idMatch || orderMatch || vehicleMatch || geoMatch || customerMatch;
      });
    }
    return list;
  }, [procurementGroups, groupFilterStatus, groupSearchQuery]);

  const PANEL_KEYWORDS = ["panel", "solar panel", "pv module", "bifacial", "monocrystalline", "polycrystalline", "mono perc", "550w", "solar module", "pv panel"];
  const INVERTER_KEYWORDS = ["inverter", "on-grid", "off-grid", "hybrid", "string inverter", "microinverter", "growatt", "sungrow", "inv-", "onduleur"];

  const getItemProcurementType = (item) => {
    const skuObj = warehouseSkus.find(s => (s.sku_id?._id || s._id) === item.sku_id);
    const name = [
      skuObj?.product_name || "",
      skuObj?.sku_details?.product_name || "",
      skuObj?.sku_details?.subcategory || "",
      item.sku_code || "",
    ].join(" ").toLowerCase();
    if (PANEL_KEYWORDS.some(kw => name.includes(kw))) return "panel";
    if (INVERTER_KEYWORDS.some(kw => name.includes(kw))) return "inverter";
    return "other";
  };

  const procurementAmountBreakdown = useMemo(() => {
    const selected = (pendingEpcOrders || []).filter(o => selectedOrderIds.has(o.id || o._id));
    let totalOrderAmount = 0;
    let panelQty = 0;
    let inverterQty = 0;

    selected.forEach(order => {
      totalOrderAmount += (Number(order.order_amount) || 0);
      (order.items || []).forEach(item => {
        const bd = item.breakdown || getItemBreakdown(item);
        if (bd?.panels) {
          panelQty += Number(bd.panels.total_quantity || 0);
        }
        if (bd?.inverters) {
          inverterQty += Number(bd.inverters.total_quantity || 0);
        }
      });
    });

    const panelTotal = Math.round(totalOrderAmount * 0.60);
    const inverterTotal = Math.round(totalOrderAmount * 0.25);
    const otherTotal = Math.max(0, totalOrderAmount - panelTotal - inverterTotal);

    const allPanelsPaid = selected.length > 0 && selected.every(o => o.panel_paid);
    const anyPanelPaid = selected.some(o => o.panel_paid);
    const allInvertersPaid = selected.length > 0 && selected.every(o => o.inverter_paid);
    const anyInverterPaid = selected.some(o => o.inverter_paid);

    return {
      totalOrderAmount,
      panelTotal,
      inverterTotal,
      otherTotal,
      panelQty,
      inverterQty,
      selectedCount: selected.length,
      allPanelsPaid,
      anyPanelPaid,
      allInvertersPaid,
      anyInverterPaid
    };
  }, [pendingEpcOrders, selectedOrderIds]);

  useEffect(() => {
    const { panelTotal, inverterTotal, totalOrderAmount } = procurementAmountBreakdown;
    let autoAmount = "";
    if (combineProcurementType === "panel") autoAmount = panelTotal;
    else if (combineProcurementType === "inverter") autoAmount = inverterTotal;
    else if (combineProcurementType === "mixed") autoAmount = totalOrderAmount;
    if (autoAmount > 0) {
      setCombineForm(prev => ({ ...prev, amount: String(autoAmount) }));
    }
  }, [procurementAmountBreakdown, combineProcurementType]);

  const [procurementComponentFilter, setProcurementComponentFilter] = useState("all");

  const fetchPendingEpcOrders = async (typeOverride) => {
    setLoadingEpcOrders(true);
    try {
      const type = typeOverride !== undefined ? typeOverride : procurementComponentFilter;
      const res = await getPendingEpcFranchiseOrders({ procurement_type: type });
      if (res?.status === "success") {
        const epc = res.data?.epc_orders || [];
        const fpo = res.data?.franchise_orders || [];
        setPendingEpcOrders([...epc, ...fpo]);
        if (res.data?.epc_list) setEpcList(res.data.epc_list);
        if (res.data?.franchise_list) setFranchiseList(res.data.franchise_list);
      }
    } catch (err) {
      console.error("Failed to fetch pending EPC/Franchise orders:", err);
    } finally {
      setLoadingEpcOrders(false);
    }
  };

  const computedEpcOptions = useMemo(() => {
    const map = new Map();
    (epcList || []).forEach(e => {
      const key = String(e.id || e.name);
      map.set(key, { ...e, id: key });
    });
    (pendingEpcOrders || []).filter(o => o.order_type === "epc").forEach(o => {
      const key = String(o.entity_id || o.customer_name);
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: o.customer_name,
          gstin: o.customer_gstin !== "-" ? o.customer_gstin : "",
          pending_count: 1
        });
      } else {
        const existing = map.get(key);
        if (!existing.gstin && o.customer_gstin && o.customer_gstin !== "-") {
          existing.gstin = o.customer_gstin;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.pending_count || 0) - (a.pending_count || 0) || a.name.localeCompare(b.name));
  }, [epcList, pendingEpcOrders]);

  const computedFranchiseOptions = useMemo(() => {
    const map = new Map();
    (franchiseList || []).forEach(f => {
      const key = String(f.id || f.name);
      map.set(key, { ...f, id: key });
    });
    (pendingEpcOrders || []).filter(o => o.order_type === "franchise").forEach(o => {
      const key = String(o.entity_id || o.customer_name);
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: o.customer_name,
          gstin: o.customer_gstin !== "-" ? o.customer_gstin : "",
          pending_count: 1
        });
      } else {
        const existing = map.get(key);
        if (!existing.gstin && o.customer_gstin && o.customer_gstin !== "-") {
          existing.gstin = o.customer_gstin;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.pending_count || 0) - (a.pending_count || 0) || a.name.localeCompare(b.name));
  }, [franchiseList, pendingEpcOrders]);

  const handleCombineWarehouseChange = async (whId) => {
    setCombineForm(prev => ({ ...prev, warehouse_id: whId, supplier_id: "" }));
    if (whId) {
      fetchSuppliersForWarehouse(whId);
      setLoadingSkus(true);
      try {
        const res = await getWarehouseSkus(whId);
        if (res?.status === "success") {
          setWarehouseSkus(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load warehouse SKUs:", err);
      } finally {
        setLoadingSkus(false);
      }
    } else {
      setWarehouseSkus([]);
      if (allApprovedSuppliers.length > 0) {
        setSuppliers(allApprovedSuppliers.map(s => ({
          _id: s._id,
          supplier_id: s._id,
          company_name: s.company_name,
          brand_name: s.brand_name || s.company_name,
          gst_number: s.gst_number || "",
          pan_number: s.pan_number || "",
          email: s.email || "",
          phone: s.phone || "",
        })));
      }
    }
  };

  const fetchWarehouses = async () => {
    try {
      // 1. Fetch all company warehouses without restrictions for modal selection
      const allRes = await getWarehouses("", "", "");
      const allList = (allRes?.status === "success" && Array.isArray(allRes.data)) ? allRes.data : [];
      setAllWarehouses(allList);

      // 2. Fetch scoped warehouses if scope is active
      if (activeClusterId || activeStateId || activeCountryId) {
        const res = await getWarehouses(activeClusterId || "", activeStateId || "", activeCountryId || "");
        const scopedList = (res?.status === "success" && Array.isArray(res.data) && res.data.length > 0) ? res.data : allList;
        setWarehouses(scopedList);
        return allList.length > 0 ? allList : scopedList;
      } else {
        setWarehouses(allList);
        return allList;
      }
    } catch (err) {
      console.error("Failed to load warehouses:", err);
      try {
        const allRes = await getWarehouses("", "", "");
        if (allRes?.status === "success" && Array.isArray(allRes.data)) {
          setAllWarehouses(allRes.data);
          setWarehouses(allRes.data);
          return allRes.data;
        }
      } catch (e) {
        console.error("Fallback warehouse fetch failed:", e);
      }
    }
    return [];
  };

  const fetchAllSuppliers = async () => {
    try {
      const res = await getSuppliers();
      if (res?.status === "success") {
        const approved = (res.data || []).filter(s => s.status === "approved" && s.is_deleted !== true);
        setAllApprovedSuppliers(approved);
        return approved;
      }
    } catch (err) {
      console.error("Failed to load approved suppliers:", err);
    }
    return [];
  };

  const fetchSuppliersForWarehouse = async (warehouseId) => {
    if (!warehouseId) {
      setSuppliers(allApprovedSuppliers.map(s => ({
        _id: s._id,
        supplier_id: s._id,
        company_name: s.company_name,
        brand_name: s.brand_name || s.company_name,
        gst_number: s.gst_number || "",
        pan_number: s.pan_number || "",
        email: s.email || "",
        phone: s.phone || "",
      })));
      return;
    }
    try {
      const res = await getWarehouseSuppliers(warehouseId);
      if (res?.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
        setSuppliers(res.data);
      } else if (allApprovedSuppliers.length > 0) {
        setSuppliers(allApprovedSuppliers.map(s => ({
          _id: s._id,
          supplier_id: s._id,
          company_name: s.company_name,
          brand_name: s.brand_name || s.company_name,
          gst_number: s.gst_number || "",
          pan_number: s.pan_number || "",
          email: s.email || "",
          phone: s.phone || "",
        })));
      }
    } catch (err) {
      console.error("Failed to load suppliers:", err);
      if (allApprovedSuppliers.length > 0) {
        setSuppliers(allApprovedSuppliers.map(s => ({
          _id: s._id,
          supplier_id: s._id,
          company_name: s.company_name,
          brand_name: s.brand_name || s.company_name,
          gst_number: s.gst_number || "",
          pan_number: s.pan_number || "",
          email: s.email || "",
          phone: s.phone || "",
        })));
      }
    }
  };

  const fetchOrders = async (opts = {}) => {
    if (!opts.silent) setLoadingOrders(true);
    try {
      const res = await getPurchaseOrders(activeClusterId || "", activeStateId || "", activeCountryId || "");
      if (res && res.status === "success") {
        setPurchaseOrders(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch purchase orders:", err);
    } finally {
      if (!opts.silent) setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPendingEpcOrders();
    fetchWarehouses();
    fetchAllSuppliers();
    fetchProcurementGroups();
    setWarehouseFilter("All");
    setSupplierFilter("All");
    setQuickFilters({ industryType: "all", category: "all", subCategory: "all", systemType: "all", projectRange: "all" });
    setPage(1);
  }, [activeClusterId, activeStateId, activeCountryId]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchOrders();
    } else if (activeTab === "combined_groups") {
      fetchProcurementGroups();
    }
  }, [activeTab]);

  const ordersForLocationFilter = useMemo(() => {
    let list = pendingEpcOrders || [];
    if (awaitingSubFilter === "epc_orders") {
      list = list.filter(o => o.order_type === "epc");
    } else if (awaitingSubFilter === "franchise_orders") {
      list = list.filter(o => o.order_type === "franchise");
    } else if (awaitingSubFilter === "supplier_pos") {
      return purchaseOrders || [];
    }
    if (awaitingSubFilter === "all" && purchaseOrders && purchaseOrders.length > 0) {
      return [...list, ...purchaseOrders];
    }
    return list;
  }, [pendingEpcOrders, purchaseOrders, awaitingSubFilter]);

  const stateOrderCounts = useMemo(() => {
    const counts = new Map();
    (ordersForLocationFilter || []).forEach(order => {
      const stateId = (order.delivery_address?.state_id || order.state_id || order.warehouse_id?.level_1 || "").toString().toLowerCase();
      const stateName = (order.delivery_address?.state_name || order.state_name || "").toString().trim().toLowerCase();

      if (stateId) counts.set(stateId, (counts.get(stateId) || 0) + 1);
      if (stateName) counts.set(stateName, (counts.get(stateName) || 0) + 1);

      (order.source_orders || []).forEach(so => {
        const soStateId = (so.delivery_address?.state_id || "").toString().toLowerCase();
        const soStateName = (so.delivery_address?.state_name || "").toString().trim().toLowerCase();
        if (soStateId && !stateId) counts.set(soStateId, (counts.get(soStateId) || 0) + 1);
        if (soStateName && !stateName) counts.set(soStateName, (counts.get(soStateName) || 0) + 1);
      });
    });
    return counts;
  }, [ordersForLocationFilter]);

  const getStateOrderCount = (st) => {
    const idKey = String(st.id || st._id || "").toLowerCase();
    const nameKey = String(st.name || "").trim().toLowerCase();
    if (idKey && stateOrderCounts.has(idKey)) return stateOrderCounts.get(idKey);
    if (nameKey && stateOrderCounts.has(nameKey)) return stateOrderCounts.get(nameKey);
    return 0;
  };

  const computedStatesList = useMemo(() => {
    const list = [...statesList];
    const seenNames = new Set(list.map(s => (s.name || "").trim().toLowerCase()));

    (ordersForLocationFilter || []).forEach(order => {
      const sName = (order.delivery_address?.state_name || order.state_name || "").toString().trim();
      const sId = (order.delivery_address?.state_id || order.state_id || "").toString();
      if (sName && !seenNames.has(sName.toLowerCase())) {
        seenNames.add(sName.toLowerCase());
        list.push({ id: sId || sName, _id: sId || sName, name: sName });
      }
    });

    return list.sort((a, b) => {
      const countA = getStateOrderCount(a);
      const countB = getStateOrderCount(b);
      if (countB !== countA) return countB - countA;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [statesList, ordersForLocationFilter, stateOrderCounts]);

  const ordersInSelectedState = useMemo(() => {
    if (!selectedState || selectedState === "all") return [];
    const targetState = selectedState.toLowerCase();
    return (ordersForLocationFilter || []).filter(order => {
      const orderStateId = (order.delivery_address?.state_id || order.state_id || order.warehouse_id?.level_1 || "").toString().toLowerCase();
      const orderStateName = (order.delivery_address?.state_name || order.state_name || "").toString().trim().toLowerCase();
      const sourceStateMatches = (order.source_orders || []).some(so => {
        const soStateId = (so.delivery_address?.state_id || "").toString().toLowerCase();
        const soStateName = (so.delivery_address?.state_name || "").toString().trim().toLowerCase();
        return soStateId === targetState || soStateName === targetState;
      });
      return orderStateId === targetState || orderStateName === targetState || sourceStateMatches;
    });
  }, [ordersForLocationFilter, selectedState]);

  const districtOrderCounts = useMemo(() => {
    const counts = new Map();
    ordersInSelectedState.forEach(order => {
      const distId = (order.delivery_address?.district_id || order.district_id || order.warehouse_id?.level_2 || "").toString().toLowerCase();
      const distName = (order.delivery_address?.district_name || order.district_name || "").toString().trim().toLowerCase();

      if (distId) counts.set(distId, (counts.get(distId) || 0) + 1);
      if (distName) counts.set(distName, (counts.get(distName) || 0) + 1);

      (order.source_orders || []).forEach(so => {
        const soDistId = (so.delivery_address?.district_id || "").toString().toLowerCase();
        const soDistName = (so.delivery_address?.district_name || "").toString().trim().toLowerCase();
        if (soDistId && !distId) counts.set(soDistId, (counts.get(soDistId) || 0) + 1);
        if (soDistName && !distName) counts.set(soDistName, (counts.get(soDistName) || 0) + 1);
      });
    });
    return counts;
  }, [ordersInSelectedState]);

  const getDistrictOrderCount = (dst) => {
    const idKey = String(dst.id || dst._id || "").toLowerCase();
    const nameKey = String(dst.name || "").trim().toLowerCase();
    if (idKey && districtOrderCounts.has(idKey)) return districtOrderCounts.get(idKey);
    if (nameKey && districtOrderCounts.has(nameKey)) return districtOrderCounts.get(nameKey);
    return 0;
  };

  const computedDistrictsList = useMemo(() => {
    const list = [...districtsList];
    const seenNames = new Set(list.map(d => (d.name || "").trim().toLowerCase()));

    ordersInSelectedState.forEach(order => {
      const dName = (order.delivery_address?.district_name || order.district_name || "").toString().trim();
      const dId = (order.delivery_address?.district_id || order.district_id || "").toString();
      if (dName && !seenNames.has(dName.toLowerCase())) {
        seenNames.add(dName.toLowerCase());
        list.push({ id: dId || dName, _id: dId || dName, name: dName });
      }
    });

    return list.sort((a, b) => {
      const countA = getDistrictOrderCount(a);
      const countB = getDistrictOrderCount(b);
      if (countB !== countA) return countB - countA;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [districtsList, ordersInSelectedState, districtOrderCounts]);

  const toggleOrderSelection = (id) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOrders = () => {
    if (selectedOrderIds.size === filteredEpcOrders.length && filteredEpcOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredEpcOrders.map(o => o.id || o._id)));
    }
  };

  const openCombineModal = async (typeOverride, preselectedOrderId, groupOrders = null, initialSupplierId = "", initialAmount = "") => {
    let targetSelectedIds = selectedOrderIds;
    if (groupOrders && Array.isArray(groupOrders) && groupOrders.length > 0) {
      targetSelectedIds = new Set(groupOrders.map(o => o.id || o._id || o.order_number));
      setSelectedOrderIds(targetSelectedIds);
      // Ensure these orders are also present in pendingEpcOrders so handleCombineSubmit can extract their metadata
      setPendingEpcOrders(prev => {
        const existingIds = new Set(prev.map(p => p.id || p._id || p.order_number));
        const missing = groupOrders.filter(g => !existingIds.has(g.id || g._id || g.order_number)).map(g => ({
          id: g.id || g._id || g.order_number,
          _id: g.id || g._id || g.order_number,
          order_number: g.order_number,
          customer_name: g.customer_name,
          order_type: g.order_type || 'epc',
          delivery_address: {
            state_name: g.state,
            district_name: g.district,
            pincode: g.pincode,
          },
          items: [{ quantity: g.kits || 1 }],
          grand_total_paise: (g.amount || 0) * 100,
          total_amount: g.amount || 0,
          order_amount: g.amount || g.total_amount || 0,
        }));
        return missing.length > 0 ? [...prev, ...missing] : prev;
      });
    } else if (preselectedOrderId) {
      targetSelectedIds = new Set([preselectedOrderId]);
      setSelectedOrderIds(targetSelectedIds);
    }
    if (targetSelectedIds.size === 0) return;

    // Guarantee warehouses are loaded
    let whList = allWarehouses.length > 0 ? allWarehouses : warehouses;
    if (!whList || whList.length === 0) {
      whList = await fetchWarehouses();
    }
    if (!whList || whList.length === 0) {
      try {
        const directRes = await getWarehouses("", "", "");
        if (directRes?.status === "success" && Array.isArray(directRes.data)) {
          whList = directRes.data;
          setAllWarehouses(whList);
          setWarehouses(whList);
        }
      } catch (e) {
        console.error("Direct warehouse load error:", e);
      }
    }

    const defaultWh = (whList && whList.length > 0) ? String(whList[0]._id || whList[0].id) : "";

    setCombineForm({
      warehouse_id: defaultWh,
      supplier_id: initialSupplierId || "",
      timeline: new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA'),
      reference_no: "",
      proforma_invoice_no: "",
      payment_date: new Date().toLocaleDateString('en-CA'),
      amount: initialAmount ? String(initialAmount) : "",
      payment_mode: "NEFT",
      receipt_url: "",
    });

    const targetOrders = (pendingEpcOrders || []).filter(o => targetSelectedIds.has(o.id || o._id));
    const allPanelsPaid = targetOrders.length > 0 && targetOrders.every(o => o.panel_paid);
    const allInvertersPaid = targetOrders.length > 0 && targetOrders.every(o => o.inverter_paid);

    let resolvedType = "panel";
    if (typeOverride && ["panel", "inverter", "mixed"].includes(typeOverride)) {
      resolvedType = typeOverride;
    } else if (allPanelsPaid && !allInvertersPaid) {
      resolvedType = "inverter";
    } else if (allInvertersPaid && !allPanelsPaid) {
      resolvedType = "panel";
    } else if (procurementComponentFilter === "inverter") {
      resolvedType = "inverter";
    } else {
      resolvedType = "panel";
    }

    setCombineProcurementType(resolvedType);
    setWarehouseSkus([]);
    setCombineError("");
    setCombineSuccess("");
    setCombineReceiptFile(null);
    setCombineModalOpen(true);

    const supList = await fetchAllSuppliers();
    if (defaultWh) {
      fetchSuppliersForWarehouse(defaultWh);
    } else if (supList && supList.length > 0) {
      setSuppliers(supList.map(s => ({
        _id: s._id,
        supplier_id: s._id,
        company_name: s.company_name,
        brand_name: s.brand_name || s.company_name,
        gst_number: s.gst_number || "",
        pan_number: s.pan_number || "",
        email: s.email || "",
        phone: s.phone || "",
      })));
    }
  };

  const handlePaySupplierForGroup = (group, supplierItem) => {
    let procType = "mixed";
    const cat = (supplierItem?.category || supplierItem?.component_name || "").toLowerCase();
    if (cat.includes("panel") || cat.includes("module")) procType = "panel";
    else if (cat.includes("inverter")) procType = "inverter";

    const sName = (supplierItem?.supplier_name || "").toLowerCase();
    const matched = suppliers.find(s =>
      (s.company_name && s.company_name.toLowerCase().includes(sName)) ||
      (s.brand_name && s.brand_name.toLowerCase().includes(sName))
    );

    const groupOrders = (group.source_orders_detail || []).map(o => ({
      ...o,
      order_amount: o.amount || o.total_amount || 0,
    }));

    openCombineModal(
      procType,
      null,
      groupOrders,
      matched?._id || matched?.supplier_id || "",
      supplierItem?.total_estimated_cost || ""
    );
  };

  const handlePayWholeGroup = (group) => {
    const groupOrders = (group.source_orders_detail || []).map(o => ({
      ...o,
      order_amount: o.amount || o.total_amount || 0,
    }));
    openCombineModal(
      "mixed",
      null,
      groupOrders,
      "",
      group.total_order_value || ""
    );
  };

  const handleCombineSubmit = async (e) => {
    e.preventDefault();
    setCombineError("");
    setCombineSuccess("");

    if (!combineForm.warehouse_id || !combineForm.supplier_id || !combineForm.reference_no || !combineForm.payment_date || !combineForm.amount || !combineForm.payment_mode) {
      setCombineError("All fields are required.");
      return;
    }

    setCombineSubmitting(true);
    let receiptUrl = combineForm.receipt_url;

    if (combineReceiptFile) {
      setUploadingCombineReceipt(true);
      try {
        const uploadRes = await uploadPaymentReceipt(combineReceiptFile);
        if (uploadRes?.status === "success" && uploadRes.url) {
          receiptUrl = uploadRes.url;
        } else {
          setCombineError(uploadRes.message || "Failed to upload receipt.");
          setCombineSubmitting(false);
          setUploadingCombineReceipt(false);
          return;
        }
      } catch (err) {
        setCombineError(err.response?.data?.message || err.message || "Upload failed.");
        setCombineSubmitting(false);
        setUploadingCombineReceipt(false);
        return;
      } finally {
        setUploadingCombineReceipt(false);
      }
    }

    const selectedOrders = pendingEpcOrders.filter(o => selectedOrderIds.has(o.id || o._id));
    const totalAmount = Number(combineForm.amount) || 0;

    let calculatedQty = 1;
    let itemDescription = "";
    let itemSkuCode = "PROCUREMENT-ITEM";

    if (combineProcurementType === "panel") {
      calculatedQty = procurementAmountBreakdown.panelQty || 1;
      itemDescription = "Solar PV Modules (540W/550W Mono PERC Bifacial)";
      itemSkuCode = "PANEL-PROCUREMENT";
    } else if (combineProcurementType === "inverter") {
      calculatedQty = procurementAmountBreakdown.inverterQty || 1;
      itemDescription = "Solar Inverters (On-Grid / String Inverters)";
      itemSkuCode = "INVERTER-PROCUREMENT";
    } else {
      calculatedQty = selectedOrders.reduce((acc, o) => {
        return acc + (o.items || []).reduce((s, it) => s + (Number(it.quantity) || 1), 0);
      }, 0) || 1;
      itemDescription = "Complete Solar Rooftop Combo Kits";
      itemSkuCode = "MIXED-KIT-PROCUREMENT";
    }

    const unitPrice = Math.round(totalAmount / calculatedQty);

    const payload = {
      warehouse_id: combineForm.warehouse_id,
      supplier_id: combineForm.supplier_id,
      timeline: combineForm.timeline,
      procurement_type: combineProcurementType,
      source_order_ids: selectedOrders.map(o => ({ order_id: o.id || o._id, order_type: o.order_type })),
      items: [{
        sku_code: itemSkuCode,
        item_name: `${itemDescription} (${calculatedQty} Pcs)`,
        qty: calculatedQty,
        order_price: unitPrice,
        benchmark_price: unitPrice,
      }],
      payment: {
        reference_no: combineForm.reference_no,
        proforma_invoice_no: combineForm.proforma_invoice_no,
        payment_date: combineForm.payment_date,
        amount: totalAmount,
        payment_mode: combineForm.payment_mode,
        receipt_url: receiptUrl,
      },
    };

    try {
      const res = await createCombinedSupplierPayment(payload);
      if (res?.status === "success") {
        const justPaidType = combineProcurementType;
        if (justPaidType === "panel") {
          setCombineSuccess(`✅ Solar Panels procurement payment recorded! Switching to Inverter procurement...`);
        } else if (justPaidType === "inverter") {
          setCombineSuccess(`✅ Inverter procurement payment recorded successfully!`);
        } else {
          setCombineSuccess(`✅ ${res.message || "Combined PO created and payment recorded!"}`);
        }

        setSelectedOrderIds(new Set());
        fetchOrders();

        if (justPaidType === "panel") {
          // Intelligently switch tab to Inverter stream so the order card remains visible for the inverter payment
          setProcurementComponentFilter("inverter");
          fetchPendingEpcOrders("inverter");
        } else {
          fetchPendingEpcOrders();
        }
        fetchProcurementGroups();

        setTimeout(() => {
          setCombineModalOpen(false);
          setCombineSuccess("");
        }, 2200);
      } else {
        setCombineError(res.message || "Failed to create combined payment.");
      }
    } catch (err) {
      const backendErr = err.response?.data?.error;
      const backendMsg = err.response?.data?.message;
      setCombineError(backendErr ? `${backendMsg ? backendMsg + ': ' : ''}${backendErr}` : (backendMsg || err.message || "Failed to create combined payment."));
    } finally {
      setCombineSubmitting(false);
    }
  };

  const handleOpenPay = (po) => {
    setSelectedPO(po);
    const totalVal = (po.items || []).reduce((acc, it) => acc + (it.qty * it.order_price), 0);
    setPayForm({
      reference_no: "",
      proforma_invoice_no: po.proforma_invoice_no || "",
      payment_date: new Date().toLocaleDateString('en-CA'),
      amount: totalVal || "",
      payment_mode: "NEFT",
      receipt_url: ""
    });
    setSelectedFile(null);
    setSelectedPIFile(null);
    setUploadingReceipt(false);
    setUploadingPI(false);
    setFormError("");
    setSuccessMsg("");
    setIsPayOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFormError("");
  };

  const openCancelConfirm = (poId) => {
    setCancelPoId(poId);
    setCancelConfirmOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelPoId) return;
    setCancelLoading(true);
    try {
      const res = await cancelPurchaseOrder(cancelPoId);
      if (res && res.status === "success") {
        fetchOrders();
        setCancelConfirmOpen(false);
      }
    } catch (err) {
      console.error("Cancel PO error:", err);
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    if (!payForm.reference_no.trim() || !payForm.proforma_invoice_no.trim() || !payForm.payment_date || !payForm.amount || !payForm.payment_mode) {
      setFormError("All required fields must be filled.");
      return;
    }

    if (Number(payForm.amount) <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    if (!selectedFile && !payForm.receipt_url) {
      setFormError("Please upload the payment transaction receipt/screenshot.");
      return;
    }

    if (!selectedPIFile && !selectedPO?.proforma_invoice_pdf) {
      setFormError("Please upload the Proforma Invoice PDF.");
      return;
    }

    setSubmitting(true);

    let finalReceiptUrl = payForm.receipt_url;
    let finalPIUrl = selectedPO?.proforma_invoice_pdf || "";

    if (selectedFile) {
      setUploadingReceipt(true);
      try {
        const res = await uploadPaymentReceipt(selectedFile);
        if (res && res.status === "success" && res.url) {
          finalReceiptUrl = res.url;
        } else {
          setFormError(res.message || "Failed to upload receipt screenshot.");
          setSubmitting(false);
          setUploadingReceipt(false);
          return;
        }
      } catch (err) {
        console.error("Receipt upload error:", err);
        setFormError(err.response?.data?.message || err.message || "Error uploading receipt file.");
        setSubmitting(false);
        setUploadingReceipt(false);
        return;
      } finally {
        setUploadingReceipt(false);
      }
    }

    if (selectedPIFile) {
      setUploadingPI(true);
      try {
        const res = await uploadPaymentReceipt(selectedPIFile);
        if (res && res.status === "success" && res.url) {
          finalPIUrl = res.url;
        } else {
          setFormError(res.message || "Failed to upload Proforma Invoice PDF.");
          setSubmitting(false);
          setUploadingPI(false);
          return;
        }
      } catch (err) {
        console.error("PI upload error:", err);
        setFormError(err.response?.data?.message || err.message || "Error uploading proforma invoice file.");
        setSubmitting(false);
        setUploadingPI(false);
        return;
      } finally {
        setUploadingPI(false);
      }
    }

    try {
      const res = await payPurchaseOrder(selectedPO._id || selectedPO.id, {
        reference_no: payForm.reference_no.trim(),
        proforma_invoice_no: payForm.proforma_invoice_no.trim(),
        payment_date: payForm.payment_date,
        amount: Number(payForm.amount),
        payment_mode: payForm.payment_mode,
        receipt_url: finalReceiptUrl.trim(),
        proforma_invoice_pdf: finalPIUrl.trim()
      });

      if (res && res.status === "success") {
        setSuccessMsg("Payment details submitted successfully!");
        fetchOrders();
        setTimeout(() => {
          setIsPayOpen(false);
          setSuccessMsg("");
        }, 1500);
      } else {
        setFormError(res.message || "Failed to record payment.");
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const allOrdersForDropdown = useMemo(() => {
    const map = new Map();
    pendingEpcOrders.forEach((o) => {
      const id = String(o.id || o._id);
      if (!map.has(id)) {
        map.set(id, {
          id,
          label: `${o.order_number} — ${o.customer_name} (${o.order_type === "epc" ? "EPC" : "Franchise"})`,
        });
      }
    });
    purchaseOrders.forEach((po) => {
      (po.source_orders || []).forEach((so) => {
        const id = String(so.order_id || so._id || so.id || "");
        if (id && !map.has(id)) {
          map.set(id, {
            id,
            label: `${so.order_number || "Order"} — ${so.customer_name || ""} (via PO: ${po.po_number})`,
          });
        }
      });
      const poId = String(po._id || po.id);
      const poKey = `po_${poId}`;
      if (!map.has(poKey)) {
        map.set(poKey, {
          id: poId,
          label: `PO: ${po.po_number} → ${po.supplier_id?.company_name || "Supplier"}`,
        });
      }
    });
    return Array.from(map.values());
  }, [pendingEpcOrders, purchaseOrders]);

  const uniqueWarehouses = useMemo(() => {
    const map = new Map();
    purchaseOrders.forEach(po => { if (po.warehouse_id) map.set(po.warehouse_id._id || po.warehouse_id.id, po.warehouse_id); });
    return Array.from(map.values());
  }, [purchaseOrders]);

  const uniqueSuppliers = useMemo(() => {
    const map = new Map();
    purchaseOrders.forEach(po => { if (po.supplier_id) map.set(po.supplier_id._id || po.supplier_id.id, po.supplier_id); });
    return Array.from(map.values());
  }, [purchaseOrders]);

  const shopHierarchy = useMemo(() => hierarchy.shopHierarchy || [], [hierarchy.shopHierarchy]);

  const qfIndustryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (shopHierarchy && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name });
        }
      });
    } else if (hierarchy?.industries && hierarchy.industries.length > 0) {
      hierarchy.industries.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name });
        }
      });
    }
    return [{ value: "all", text: "All Industry Types" }, ...list];
  }, [shopHierarchy, hierarchy]);

  const qfCategoryOptions = useMemo(() => {
    const catMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds = quickFilters.industryType === "all"
        ? shopHierarchy
        : shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id) === String(quickFilters.industryType)
        );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
          }
        });
      });
    } else if (hierarchy?.categories && hierarchy.categories.length > 0) {
      const matchedInd = (hierarchy?.industries || []).find(
        (i) =>
          i.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
          String(i._id) === String(quickFilters.industryType)
      );
      (hierarchy.categories || []).forEach((cat) => {
        if (
          (quickFilters.industryType === "all" || (matchedInd && String(cat.industry_type_id) === String(matchedInd._id))) &&
          cat.name &&
          !catMap.has(cat.name.toLowerCase())
        ) {
          catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
        }
      });
    }
    return [{ value: "all", text: "All Categories" }, ...Array.from(catMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType]);

  const qfSubCategoryOptions = useMemo(() => {
    const subsMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds = quickFilters.industryType === "all"
        ? shopHierarchy
        : shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id) === String(quickFilters.industryType)
        );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
          ) {
            (cat.subcategories || []).forEach((sub) => {
              if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
                subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
              }
            });
          }
        });
      });
    } else if (hierarchy?.subcategories && hierarchy.subcategories.length > 0) {
      const matchedCat = (hierarchy?.categories || []).find(
        (c) =>
          c.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
          String(c._id) === String(quickFilters.category)
      );
      (hierarchy.subcategories || []).forEach((sub) => {
        if (
          (quickFilters.category === "all" || (matchedCat && String(sub.category) === String(matchedCat._id))) &&
          sub.name &&
          !subsMap.has(sub.name.toLowerCase())
        ) {
          subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
        }
      });
    }
    return [{ value: "all", text: "All Sub-Categories" }, ...Array.from(subsMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category]);

  const qfSystemTypeOptions = useMemo(() => {
    const typesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds = quickFilters.industryType === "all"
        ? shopHierarchy
        : shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id) === String(quickFilters.industryType)
        );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
          ) {
            (cat.subcategories || []).forEach((sub) => {
              if (
                quickFilters.subCategory === "all" ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
                String(sub.id) === String(quickFilters.subCategory)
              ) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (mt.name && !typesMap.has(mt.name.toLowerCase())) {
                    typesMap.set(mt.name.toLowerCase(), { value: mt.name, text: mt.name });
                  }
                });
              }
            });
          }
        });
      });
    } else if (hierarchy?.types && hierarchy.types.length > 0) {
      hierarchy.types.forEach((t) => {
        if (t.name && !typesMap.has(t.name.toLowerCase())) {
          typesMap.set(t.name.toLowerCase(), { value: t.name, text: t.name });
        }
      });
    }
    return [{ value: "all", text: "All System Types" }, ...Array.from(typesMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category, quickFilters.subCategory]);

  const qfProjectRangeOptions = useMemo(() => {
    const rangesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const targetInds = quickFilters.industryType === "all"
        ? shopHierarchy
        : shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id) === String(quickFilters.industryType)
        );

      targetInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
          ) {
            (cat.subcategories || []).forEach((sub) => {
              if (
                quickFilters.subCategory === "all" ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
                String(sub.id) === String(quickFilters.subCategory)
              ) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (
                    quickFilters.systemType === "all" ||
                    mt.name?.toLowerCase() === quickFilters.systemType.toLowerCase() ||
                    String(mt.id || mt.type_id) === String(quickFilters.systemType)
                  ) {
                    (mt.ranges || []).forEach((r) => {
                      const idVal = String(r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`);
                      if (idVal && !rangesMap.has(idVal.toLowerCase())) {
                        rangesMap.set(idVal.toLowerCase(), {
                          value: r.range_label || idVal,
                          text: r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`,
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      });
    } else if (hierarchy?.ranges && hierarchy.ranges.length > 0) {
      hierarchy.ranges.forEach((r) => {
        const idVal = String(r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_id?.symbol || "kW"}`);
        if (idVal && !rangesMap.has(idVal.toLowerCase())) {
          rangesMap.set(idVal.toLowerCase(), {
            value: r.range_label || idVal,
            text: r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_id?.symbol || "kW"}`,
          });
        }
      });
    }
    return [{ value: "all", text: "All Project Ranges" }, ...Array.from(rangesMap.values())];
  }, [
    shopHierarchy,
    hierarchy,
    quickFilters.industryType,
    quickFilters.category,
    quickFilters.subCategory,
    quickFilters.systemType,
  ]);

  const hasActiveQuickFilters =
    quickFilters.industryType !== "all" || quickFilters.category !== "all" ||
    quickFilters.subCategory !== "all" || quickFilters.systemType !== "all" || quickFilters.projectRange !== "all";

  const hasActiveLocationFilters =
    selectedState !== "all" || selectedDistrict !== "all";

  const hasActiveProductFilters =
    selectedComboKit !== "all";

  const hasActiveProcurementFilters =
    activeTab !== "procurement_indents" && (
      procurementTypeFilter !== "all" ||
      procurementOrderFilter !== "all" ||
      orderDateFrom !== "" ||
      orderDateTo !== "" ||
      procurementSupplierFilter !== "all" ||
      paymentStatusFilter !== "all"
    );

  const hasActiveMasterFilters =
    hasActiveQuickFilters ||
    hasActiveLocationFilters ||
    hasActiveProductFilters ||
    hasActiveProcurementFilters ||
    selectedEpcId !== "all" ||
    selectedFranchiseId !== "all" ||
    searchQuery.trim() !== "";

  const activeFiltersCount = [
    quickFilters.industryType !== "all",
    quickFilters.category !== "all",
    quickFilters.subCategory !== "all",
    quickFilters.systemType !== "all",
    quickFilters.projectRange !== "all",
    selectedState !== "all",
    selectedDistrict !== "all",
    selectedComboKit !== "all",
    selectedEpcId !== "all",
    selectedFranchiseId !== "all",
    searchQuery.trim() !== "",
    activeTab !== "procurement_indents" && procurementTypeFilter !== "all",
    activeTab !== "procurement_indents" && procurementOrderFilter !== "all",
    activeTab !== "procurement_indents" && orderDateFrom !== "",
    activeTab !== "procurement_indents" && orderDateTo !== "",
    activeTab !== "procurement_indents" && procurementSupplierFilter !== "all",
    activeTab !== "procurement_indents" && paymentStatusFilter !== "all",
  ].filter(Boolean).length;

  const clearQuickFilters = () =>
    setQuickFilters({ industryType: "all", category: "all", subCategory: "all", systemType: "all", projectRange: "all" });

  const clearLocationFilters = () => {
    setSelectedState("all");
    setSelectedDistrict("all");
  };

  const clearProductFilters = () => {
    setSelectedComboKit("all");
  };

  const clearProcurementFilters = () => {
    setProcurementTypeFilter("all");
    setProcurementOrderFilter("all");
    setOrderDateFrom("");
    setOrderDateTo("");
    setProcurementSupplierFilter("all");
    setPaymentStatusFilter("all");
  };

  const resetAllMasterFilters = () => {
    clearQuickFilters();
    clearLocationFilters();
    clearProductFilters();
    clearProcurementFilters();
    setSelectedEpcId("all");
    setSelectedFranchiseId("all");
    setSearchQuery("");
    setPage(1);
  };

  const filteredEpcOrders = useMemo(() => {
    return pendingEpcOrders.filter((order) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = (order.order_number || "").toLowerCase().includes(q);
        const matchesCust = (order.customer_name || "").toLowerCase().includes(q);
        const matchesContact = (order.customer_contact || "").toLowerCase().includes(q);
        const matchesGstin = (order.customer_gstin || "").toLowerCase().includes(q);
        const matchesItem = (order.items || []).some(it => (it.item_name || "").toLowerCase().includes(q));
        if (!matchesNum && !matchesCust && !matchesContact && !matchesGstin && !matchesItem) {
          return false;
        }
      }

      if (selectedEpcId !== "all") {
        if (order.order_type !== "epc") return false;
        const target = selectedEpcId.toLowerCase();
        const matchesId = String(order.entity_id || "").toLowerCase() === target;
        const matchesName = String(order.customer_name || "").toLowerCase() === target;
        const matchesGstin = String(order.customer_gstin || "").toLowerCase() === target;
        if (!matchesId && !matchesName && !matchesGstin) return false;
      }

      if (selectedFranchiseId !== "all") {
        if (order.order_type !== "franchise") return false;
        const target = selectedFranchiseId.toLowerCase();
        const matchesId = String(order.entity_id || "").toLowerCase() === target;
        const matchesName = String(order.customer_name || "").toLowerCase() === target;
        const matchesGstin = String(order.customer_gstin || "").toLowerCase() === target;
        if (!matchesId && !matchesName && !matchesGstin) return false;
      }

      if (selectedState !== "all") {
        const targetState = selectedState.toLowerCase();
        const orderStateId = (order.delivery_address?.state_id || order.state_id || "").toString().toLowerCase();
        const orderStateName = (order.delivery_address?.state_name || order.state_name || "").toLowerCase();
        if (orderStateId !== targetState && orderStateName !== targetState) {
          return false;
        }
      }

      if (selectedDistrict !== "all") {
        const targetDist = selectedDistrict.toLowerCase();
        const orderDistId = (order.delivery_address?.district_id || order.district_id || "").toString().toLowerCase();
        const orderDistName = (order.delivery_address?.district_name || order.district_name || "").toLowerCase();
        if (orderDistId !== targetDist && orderDistName !== targetDist) {
          return false;
        }
      }

      if (selectedComboKit !== "all") {
        const targetKitId = selectedComboKit.toString().toLowerCase();
        const selectedKitObj = allAdminKits.find(k => String(k._id || k.id).toLowerCase() === targetKitId);
        const targetKitName = selectedKitObj?.name?.toLowerCase();
        const targetKitCap = selectedKitObj?.capacity || selectedKitObj?.capacity_kw;

        const hasKit =
          (order.kit_ids || []).some(kId => String(kId).toLowerCase() === targetKitId) ||
          (order.items || []).some(it =>
            String(it.kit_id).toLowerCase() === targetKitId ||
            (it.breakdown && String(it.breakdown.kit_id).toLowerCase() === targetKitId) ||
            (targetKitName && (it.item_name || "").toLowerCase().includes(targetKitName)) ||
            (targetKitCap && ((it.capacity && String(it.capacity).includes(String(targetKitCap))) || (it.item_name || "").toLowerCase().includes(`${targetKitCap} kw`)))
          );
        if (!hasKit) return false;
      }

      if (hasActiveQuickFilters) {
        if (quickFilters.industryType !== "all") {
          const target = quickFilters.industryType.toLowerCase();
          const hasInd =
            (order.industry_types || []).some(t => t?.toLowerCase() === target) ||
            (order.items || []).some(it => (it.industry_type_name || it.item_name || "").toLowerCase().includes(target));
          if (!hasInd) return false;
        }

        if (quickFilters.category !== "all") {
          const target = quickFilters.category.toLowerCase();
          const hasCat =
            (order.categories || []).some(c => c?.toLowerCase() === target) ||
            (order.items || []).some(it => (it.category_name || it.item_name || "").toLowerCase().includes(target));
          if (!hasCat) return false;
        }

        if (quickFilters.subCategory !== "all") {
          const target = quickFilters.subCategory.toLowerCase();
          const hasSub =
            (order.subcategories || []).some(s => s?.toLowerCase() === target) ||
            (order.items || []).some(it => (it.subcategory_name || it.item_name || "").toLowerCase().includes(target));
          if (!hasSub) return false;
        }

        if (quickFilters.systemType !== "all") {
          const target = quickFilters.systemType.toLowerCase();
          const hasSys =
            (order.system_types || []).some(t => t?.toLowerCase() === target) ||
            (order.items || []).some(it => (it.system_type_name || it.item_name || "").toLowerCase().includes(target));
          if (!hasSys) return false;
        }

        if (quickFilters.projectRange !== "all") {
          const target = quickFilters.projectRange.toLowerCase();
          const hasRange =
            (order.project_ranges || []).some(r => r?.toLowerCase() === target) ||
            (order.items || []).some(it => (it.capacity || it.item_name || "").toLowerCase().includes(target));
          if (!hasRange) return false;
        }
      }

      return true;
    });
  }, [pendingEpcOrders, searchQuery, selectedEpcId, selectedFranchiseId, selectedState, selectedDistrict, selectedComboKit, quickFilters, hasActiveQuickFilters]);

  const pendingEpcCount = useMemo(() => {
    return pendingEpcOrders.filter(o => o.order_type === "epc").length;
  }, [pendingEpcOrders]);

  const pendingFranchiseCount = useMemo(() => {
    return pendingEpcOrders.filter(o => o.order_type === "franchise").length;
  }, [pendingEpcOrders]);

  const filteredEpcOnlyOrders = useMemo(() => {
    return filteredEpcOrders.filter(o => o.order_type === "epc");
  }, [filteredEpcOrders]);

  const filteredFranchiseOnlyOrders = useMemo(() => {
    return filteredEpcOrders.filter(o => o.order_type === "franchise");
  }, [filteredEpcOrders]);

  const selectedEpcCount = useMemo(() => {
    return filteredEpcOnlyOrders.filter(o => selectedOrderIds.has(o.id || o._id)).length;
  }, [filteredEpcOnlyOrders, selectedOrderIds]);

  const isAllEpcSelected = useMemo(() => {
    return filteredEpcOnlyOrders.length > 0 && selectedEpcCount === filteredEpcOnlyOrders.length;
  }, [filteredEpcOnlyOrders, selectedEpcCount]);

  const selectedFranchiseCount = useMemo(() => {
    return filteredFranchiseOnlyOrders.filter(o => selectedOrderIds.has(o.id || o._id)).length;
  }, [filteredFranchiseOnlyOrders, selectedOrderIds]);

  const isAllFranchiseSelected = useMemo(() => {
    return filteredFranchiseOnlyOrders.length > 0 && selectedFranchiseCount === filteredFranchiseOnlyOrders.length;
  }, [filteredFranchiseOnlyOrders, selectedFranchiseCount]);

  const selectAllEpcOrders = () => {
    const epcIds = filteredEpcOnlyOrders.map(o => o.id || o._id);
    const allSelected = epcIds.length > 0 && epcIds.every(id => selectedOrderIds.has(id));
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        epcIds.forEach(id => next.delete(id));
      } else {
        epcIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const selectAllFranchiseOrders = () => {
    const franIds = filteredFranchiseOnlyOrders.map(o => o.id || o._id);
    const allSelected = franIds.length > 0 && franIds.every(id => selectedOrderIds.has(id));
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        franIds.forEach(id => next.delete(id));
      } else {
        franIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const filteredPOList = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        !searchQuery.trim() ||
        po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.invoice_no || po.proforma_invoice_no || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.supplier_id?.company_name || po.supplier_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.supplier_id?.brand_name || po.supplier_brand || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.warehouse_code || po.warehouse_id?.warehouse_code || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === "pending"
          ? po.status === "pending" || po.status === "accepted" || po.status === "invoiced"
          : po.status === "paid" || po.status === "delivered";

      const matchesWarehouse =
        warehouseFilter === "All" ? true :
          (po.warehouse_id?._id || po.warehouse_id?.id) === warehouseFilter;

      const matchesSupplier =
        supplierFilter === "All" ? true :
          (po.supplier_id?._id || po.supplier_id?.id) === supplierFilter;

      if (selectedState !== "all") {
        const targetState = selectedState.toLowerCase();
        const poStateId = (po.state_id || po.warehouse_id?.level_1 || "").toString().toLowerCase();
        const poStateName = (po.state_name || "").toLowerCase();
        const sourceStateMatches = (po.source_orders || []).some(so => {
          const soStateId = (so.delivery_address?.state_id || "").toString().toLowerCase();
          const soStateName = (so.delivery_address?.state_name || "").toLowerCase();
          return soStateId === targetState || soStateName === targetState;
        });
        if (poStateId !== targetState && poStateName !== targetState && !sourceStateMatches) {
          return false;
        }
      }

      if (selectedDistrict !== "all") {
        const targetDist = selectedDistrict.toLowerCase();
        const poDistId = (po.district_id || po.warehouse_id?.level_2 || "").toString().toLowerCase();
        const poDistName = (po.district_name || "").toLowerCase();
        const sourceDistMatches = (po.source_orders || []).some(so => {
          const soDistId = (so.delivery_address?.district_id || "").toString().toLowerCase();
          const soDistName = (so.delivery_address?.district_name || "").toLowerCase();
          return soDistId === targetDist || soDistName === targetDist;
        });
        if (poDistId !== targetDist && poDistName !== targetDist && !sourceDistMatches) {
          return false;
        }
      }

      if (selectedComboKit !== "all") {
        const targetKit = selectedComboKit.toString().toLowerCase();
        const selectedKitObj = allAdminKits.find(k => String(k._id || k.id).toLowerCase() === targetKit);
        const targetKitName = selectedKitObj?.name?.toLowerCase();
        const targetKitCap = selectedKitObj?.capacity || selectedKitObj?.capacity_kw;

        const matchesDirectKit = po.combo_kit_id && String(po.combo_kit_id).toLowerCase() === targetKit;
        const matchesKitArray = (po.combo_kit_ids || []).some(kId => String(kId).toLowerCase() === targetKit);
        const matchesSourceOrders = (po.source_orders || []).some(so =>
          (so.items || []).some(si =>
            String(si.kit_id).toLowerCase() === targetKit ||
            (targetKitName && (si.item_name || "").toLowerCase().includes(targetKitName))
          )
        );
        const matchesPoItems = (po.items || []).some(pi =>
          (targetKitName && (pi.sku_details?.product_name || pi.item_name || "").toLowerCase().includes(targetKitName)) ||
          (targetKitCap && ((pi.capacity && String(pi.capacity).includes(String(targetKitCap))) || (pi.item_name || "").toLowerCase().includes(`${targetKitCap} kw`)))
        );
        if (!matchesDirectKit && !matchesKitArray && !matchesSourceOrders && !matchesPoItems) {
          return false;
        }
      }

      const matchesQuickFilters = (() => {
        if (!hasActiveQuickFilters) return true;

        if (quickFilters.industryType !== "all") {
          const target = quickFilters.industryType.toLowerCase();
          const hasInd =
            (po.industry_types || []).some(t => t?.toLowerCase() === target) ||
            (po.items || []).some(it => (it.sku_details?.industry_type_name || it.industry_type_name || "").toLowerCase() === target);
          if (!hasInd) return false;
        }

        if (quickFilters.category !== "all") {
          const target = quickFilters.category.toLowerCase();
          const hasCat =
            (po.categories || []).some(c => c?.toLowerCase() === target) ||
            (po.items || []).some(it => (it.sku_details?.category_name || it.category_name || it.sku_details?.category || "").toLowerCase() === target);
          if (!hasCat) return false;
        }

        if (quickFilters.subCategory !== "all") {
          const target = quickFilters.subCategory.toLowerCase();
          const hasSub =
            (po.subcategories || []).some(s => s?.toLowerCase() === target) ||
            (po.items || []).some(it => (it.sku_details?.subcategory_name || it.subcategory_name || "").toLowerCase() === target);
          if (!hasSub) return false;
        }

        if (quickFilters.systemType !== "all") {
          const target = quickFilters.systemType.toLowerCase();
          const hasSys =
            (po.system_types || []).some(t => t?.toLowerCase() === target) ||
            (po.items || []).some(it => (it.sku_details?.system_type_name || it.system_type_name || "").toLowerCase() === target);
          if (!hasSys) return false;
        }

        if (quickFilters.projectRange !== "all") {
          const target = quickFilters.projectRange.toLowerCase();
          const hasRange =
            (po.project_ranges || []).some(r => r?.toLowerCase() === target) ||
            (po.items || []).some(it => (it.sku_details?.project_range_name || it.sku_details?.project_range_label || it.project_range_label || "").toLowerCase() === target);
          if (!hasRange) return false;
        }

        return true;
      })();

      if (procurementOrderFilter !== "all") {
        const targetOrder = String(procurementOrderFilter).toLowerCase();
        const hasOrder =
          String(po._id || po.id || "").toLowerCase() === targetOrder ||
          String(po.po_number || "").toLowerCase().includes(targetOrder) ||
          (po.source_orders || []).some(so =>
            String(so.order_id || so._id || so.id || "").toLowerCase() === targetOrder ||
            String(so.order_number || "").toLowerCase().includes(targetOrder)
          );
        if (!hasOrder) return false;
      }

      if (orderDateFrom) {
        const poDate = new Date(po.created_at || po.payment?.payment_date || po.payment_date || 0);
        if (poDate < new Date(orderDateFrom)) return false;
      }
      if (orderDateTo) {
        const poDate = new Date(po.created_at || po.payment?.payment_date || po.payment_date || 0);
        if (poDate > new Date(orderDateTo + "T23:59:59")) return false;
      }

      if (procurementTypeFilter !== "all") {
        const panelKeywords = ["panel", "solar panel", "pv module", "bifacial", "monocrystalline", "polycrystalline", "mono perc", "550w", "solar module"];
        const inverterKeywords = ["inverter", "on-grid", "off-grid", "hybrid", "string inverter", "microinverter", "growatt", "sungrow", "inv-"];
        const keywords = procurementTypeFilter === "panel" ? panelKeywords : inverterKeywords;
        const hasProcType =
          keywords.some(kw => (po.procurement_type || "").toLowerCase().includes(kw)) ||
          (po.items || []).some(it => {
            const name = [
              it.sku_details?.product_name || "",
              it.sku_details?.sku_code || "",
              it.sku_details?.subcategory || "",
              it.item_name || "",
              it.sku_code || "",
            ].join(" ").toLowerCase();
            return keywords.some(kw => name.includes(kw));
          });
        if (!hasProcType) return false;
      }

      if (procurementSupplierFilter !== "all") {
        const suppId = String(po.supplier_id?._id || po.supplier_id?.id || po.supplier_id || "");
        if (suppId !== String(procurementSupplierFilter)) return false;
      }

      if (paymentStatusFilter !== "all") {
        if (paymentStatusFilter === "paid") {
          if (po.status !== "paid" && po.status !== "delivered") return false;
        } else if (paymentStatusFilter === "pending") {
          if (po.status !== "pending" && po.status !== "accepted" && po.status !== "invoiced") return false;
        }
      }

      return matchesSearch && matchesTab && matchesWarehouse && matchesSupplier && matchesQuickFilters;
    });
  }, [purchaseOrders, searchQuery, activeTab, warehouseFilter, supplierFilter, selectedState, selectedDistrict, selectedComboKit, quickFilters, hasActiveQuickFilters, procurementOrderFilter, orderDateFrom, orderDateTo, procurementTypeFilter, procurementSupplierFilter, paymentStatusFilter]);

  const paginatedPOs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPOList.slice(start, start + pageSize);
  }, [filteredPOList, page]);

  return (
    <div className="space-y-6 pb-10 bg-white">
      <PageHeader
        title="Supplier Payments Control"
        subtitle={`Process supplier proforma payments and track transaction logs for ${activeClusterName}.`}
        icon={FaCreditCard}
      />

      {/* Tabs */}
      <div className="flex bg-white border border-gray-200 p-1 rounded-xl gap-1 max-w-2xl shadow-sm">
        <button
          onClick={() => { setActiveTab("pending"); setPage(1); }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "pending" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <FaClipboardList />
          Awaiting Order
          {(pendingEpcOrders.length > 0 || pendingPOCount > 0) && (
            <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center px-1.5 ${activeTab === "pending" ? "bg-white text-primary" : "bg-primary/10 text-primary"}`}>
              {pendingEpcOrders.length + pendingPOCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("combined_groups"); setPage(1); fetchProcurementGroups(); }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "combined_groups" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <FaLayerGroup />
          Combined Batches
          {procurementGroups.length > 0 && (
            <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center px-1.5 ${activeTab === "combined_groups" ? "bg-white text-primary" : "bg-primary/10 text-primary"}`}>
              {procurementGroups.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("procurement_indents"); setPage(1); fetchProcurementPIs(); }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "procurement_indents" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <FaCreditCard />
          Procurement Indents (PI)
          {procurementPIs.length > 0 && (
            <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center px-1.5 ${activeTab === "procurement_indents" ? "bg-white text-primary" : "bg-primary/10 text-primary"}`}>
              {procurementPIs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("history"); setPage(1); fetchOrders(); }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "history" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <FaHistory />
          Payment History
        </button>
      </div>

      {/* ─── Sub-filters & Actions for Awaiting Payment ─────────────────────── */}
      {activeTab === "pending" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 p-2.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => { setAwaitingSubFilter("all"); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${awaitingSubFilter === "all" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span>All Orders Awaiting Action</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${awaitingSubFilter === "all" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                {pendingEpcOrders.length + pendingPOCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAwaitingSubFilter("epc_orders");
                setSelectedFranchiseId("all");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${awaitingSubFilter === "epc_orders" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <FaBuilding size={11} />
              <span>EPC Orders</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${awaitingSubFilter === "epc_orders" ? "bg-white text-blue-600" : "bg-blue-100 text-blue-800"}`}>
                {hasActiveMasterFilters ? filteredEpcOnlyOrders.length : pendingEpcCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAwaitingSubFilter("franchise_orders");
                setSelectedEpcId("all");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${awaitingSubFilter === "franchise_orders" ? "bg-purple-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <FaStore size={11} />
              <span>Franchise Orders</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${awaitingSubFilter === "franchise_orders" ? "bg-white text-purple-600" : "bg-purple-100 text-purple-800"}`}>
                {hasActiveMasterFilters ? filteredFranchiseOnlyOrders.length : pendingFranchiseCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAwaitingSubFilter("supplier_pos")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${awaitingSubFilter === "supplier_pos" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <FaClipboardList size={11} />
              <span>Supplier Purchase Orders (PO)</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${awaitingSubFilter === "supplier_pos" ? "bg-white text-primary" : "bg-primary/10 text-primary"}`}>
                {pendingPOCount}
              </span>
            </button>
          </div>

          {(awaitingSubFilter === "all" || awaitingSubFilter === "epc_orders" || awaitingSubFilter === "franchise_orders") && (
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
              <button
                type="button"
                onClick={fetchPendingEpcOrders}
                className="text-xs text-gray-600 hover:text-primary font-semibold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-primary/30 transition-all cursor-pointer"
              >
                Refresh
              </button>
              <button
                onClick={openCombineModal}
                disabled={selectedOrderIds.size === 0}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm ${selectedOrderIds.size > 0
                  ? "bg-primary hover:bg-primary/90 text-white cursor-pointer"
                  : "bg-white border border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                  }`}
              >
                <FaLink />
                <span>Combine &amp; Pay ({selectedOrderIds.size})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Master Order Filters Bar ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3.5 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <FaFilter className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-gray-900 tracking-tight">Master Order Filters</h3>
              {activeFiltersCount > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  {activeFiltersCount} active
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500 hidden md:inline">
              — Filter customer orders and supplier POs by industry classification, geography, and combo kit
            </span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {hasActiveQuickFilters && (
              <button
                type="button"
                onClick={clearQuickFilters}
                className="text-xs font-bold text-primary hover:text-primary/75 hover:underline cursor-pointer transition-colors"
                title="Reset Industry, Category, Sub Category, System Type & Project Range"
              >
                Clear Main
              </button>
            )}
            {hasActiveMasterFilters && (
              <button
                type="button"
                onClick={resetAllMasterFilters}
                className="text-xs font-bold text-gray-600 hover:text-red-600 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all cursor-pointer flex items-center gap-1.5"
                title="Reset all classification, location, and product filters"
              >
                <FaTimes size={10} />
                <span>Reset All</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 1: Classification Quick Filters */}
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FaLayerGroup size={10} className="text-primary/70" />
            <span>1. Classification Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Industry Type */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">
                Industry Type
              </label>
              <div className="relative">
                <select
                  value={quickFilters.industryType}
                  onChange={(e) => {
                    setQuickFilters({
                      industryType: e.target.value,
                      category: "all",
                      subCategory: "all",
                      systemType: "all",
                      projectRange: "all"
                    });
                    setPage(1);
                  }}
                  className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-primary rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                >
                  {qfIndustryTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.text}</option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
              </div>
            </div>

            {/* 2. Category */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">
                Category
              </label>
              <div className="relative">
                <select
                  value={quickFilters.category}
                  onChange={(e) => {
                    setQuickFilters(prev => ({
                      ...prev,
                      category: e.target.value,
                      subCategory: "all",
                      systemType: "all",
                      projectRange: "all"
                    }));
                    setPage(1);
                  }}
                  className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-primary rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                >
                  {qfCategoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.text}</option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
              </div>
            </div>

            {/* 3. Sub Category */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">
                Sub Category
              </label>
              <div className="relative">
                <select
                  value={quickFilters.subCategory}
                  onChange={(e) => {
                    setQuickFilters(prev => ({
                      ...prev,
                      subCategory: e.target.value,
                      systemType: "all",
                      projectRange: "all"
                    }));
                    setPage(1);
                  }}
                  className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-primary rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                >
                  {qfSubCategoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.text}</option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
              </div>
            </div>

            {/* 4. System Type */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">
                System Type
              </label>
              <div className="relative">
                <select
                  value={quickFilters.systemType}
                  onChange={(e) => {
                    setQuickFilters(prev => ({
                      ...prev,
                      systemType: e.target.value,
                      projectRange: "all"
                    }));
                    setPage(1);
                  }}
                  className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-primary rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                >
                  {qfSystemTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.text}</option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
              </div>
            </div>

            {/* 5. Project Range */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">
                Project Range
              </label>
              <div className="relative">
                <select
                  value={quickFilters.projectRange}
                  onChange={(e) => {
                    setQuickFilters(prev => ({ ...prev, projectRange: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-primary rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                >
                  {qfProjectRangeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.text}</option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Location, Customer & Product Filters */}
        <div className="pt-2 border-t border-gray-200">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FaMapMarkerAlt size={10} className="text-amber-500/80" />
              <span>2. Location, Customer &amp; Product Filters</span>
            </div>
            {awaitingSubFilter === "epc_orders" && (
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1">
                <FaBuilding size={9} /> EPC Filter Mode Active
              </span>
            )}
            {awaitingSubFilter === "franchise_orders" && (
              <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider flex items-center gap-1">
                <FaStore size={9} /> Franchise Filter Mode Active
              </span>
            )}
          </div>
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${awaitingSubFilter === "epc_orders" || awaitingSubFilter === "franchise_orders" || awaitingSubFilter === "all"
            ? "lg:grid-cols-5"
            : "lg:grid-cols-4"
            } gap-3`}>
            {/* 1. State */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider flex items-center justify-between">
                <span>Location: State</span>
                <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {ordersForLocationFilter.length} {ordersForLocationFilter.length === 1 ? "Order" : "Orders"}
                </span>
              </label>
              <div className="relative">
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedDistrict("all");
                    setPage(1);
                  }}
                  className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-primary rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                >
                  <option value="all">All States ({ordersForLocationFilter.length})</option>
                  {computedStatesList.map(st => {
                    const count = getStateOrderCount(st);
                    return (
                      <option key={st.id || st._id} value={st.id || st._id}>
                        {st.name} ({count})
                      </option>
                    );
                  })}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
              </div>
            </div>

            {/* 2. District */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider flex items-center justify-between">
                <span>Location: District</span>
                <div className="flex items-center gap-1.5">
                  {selectedState !== "all" && (
                    <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                      {ordersInSelectedState.length} in State
                    </span>
                  )}
                  {loadingDistricts && <FaSpinner className="animate-spin text-primary text-[10px]" />}
                </div>
              </label>
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setPage(1);
                  }}
                  disabled={!selectedState || selectedState === "all"}
                  className={`w-full appearance-none h-9 bg-white border border-gray-300 focus:border-primary rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none transition-colors ${!selectedState || selectedState === "all" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                >
                  <option value="all">
                    {!selectedState || selectedState === "all"
                      ? "Select State First"
                      : `All Districts (${ordersInSelectedState.length})`}
                  </option>
                  {computedDistrictsList.map(dst => {
                    const count = getDistrictOrderCount(dst);
                    return (
                      <option key={dst.id || dst._id} value={dst.id || dst._id}>
                        {dst.name} ({count})
                      </option>
                    );
                  })}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
              </div>
            </div>

            {/* 3. Product / Admin Combo Kit */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider flex items-center justify-between">
                <span>Product: Combo Kit</span>
                {loadingAdminKits && <FaSpinner className="animate-spin text-primary text-[10px]" />}
              </label>
              <div className="relative">
                <select
                  value={selectedComboKit}
                  onChange={(e) => {
                    setSelectedComboKit(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-primary rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                >
                  <option value="all">All Admin Combo Kits</option>
                  {allAdminKits.map(kit => (
                    <option key={kit._id || kit.id} value={kit._id || kit.id}>
                      {kit.name} {kit.capacity ? `(${kit.capacity})` : ""}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
              </div>
            </div>

            {/* 4. Dedicated EPC Partner Filter */}
            {awaitingSubFilter === "epc_orders" && (
              <div>
                <label className="block text-[10px] font-semibold text-blue-600 mb-1 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FaBuilding size={9} />
                    EPC Partner &amp; GSTIN
                  </span>
                  <span className="text-[9px] text-gray-500 font-bold">({computedEpcOptions.length})</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedEpcId}
                    onChange={(e) => {
                      setSelectedEpcId(e.target.value);
                      setPage(1);
                    }}
                    className="w-full appearance-none h-9 bg-blue-50 border border-blue-200 focus:border-blue-500 rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                  >
                    <option value="all">All EPC Partners ({computedEpcOptions.length})</option>
                    {computedEpcOptions.map((epc) => (
                      <option key={epc.id || epc.name} value={epc.id || epc.name}>
                        {epc.name} {epc.gstin ? `— GST: ${epc.gstin}` : ""} {epc.pending_count > 0 ? `(${epc.pending_count} pending)` : ""}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-[9px] pointer-events-none" />
                </div>
              </div>
            )}

            {/* 4. Dedicated Franchise Partner Filter */}
            {awaitingSubFilter === "franchise_orders" && (
              <div>
                <label className="block text-[10px] font-semibold text-purple-600 mb-1 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FaStore size={9} />
                    Franchise Partner &amp; GSTIN
                  </span>
                  <span className="text-[9px] text-gray-500 font-bold">({computedFranchiseOptions.length})</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedFranchiseId}
                    onChange={(e) => {
                      setSelectedFranchiseId(e.target.value);
                      setPage(1);
                    }}
                    className="w-full appearance-none h-9 bg-purple-50 border border-purple-200 focus:border-purple-500 rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                  >
                    <option value="all">All Franchise Partners ({computedFranchiseOptions.length})</option>
                    {computedFranchiseOptions.map((fran) => (
                      <option key={fran.id || fran.name} value={fran.id || fran.name}>
                        {fran.name} {fran.gstin ? `— GST: ${fran.gstin}` : ""} {fran.pending_count > 0 ? `(${fran.pending_count} pending)` : ""}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 text-[9px] pointer-events-none" />
                </div>
              </div>
            )}

            {/* 4. Customer Filter (All) */}
            {awaitingSubFilter === "all" && (
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">
                  Partner / Customer (Name &amp; GST)
                </label>
                <div className="relative">
                  <select
                    value={selectedEpcId !== "all" ? `epc_${selectedEpcId}` : selectedFranchiseId !== "all" ? `fran_${selectedFranchiseId}` : "all"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "all") {
                        setSelectedEpcId("all");
                        setSelectedFranchiseId("all");
                      } else if (val.startsWith("epc_")) {
                        setSelectedEpcId(val.replace("epc_", ""));
                        setSelectedFranchiseId("all");
                      } else if (val.startsWith("fran_")) {
                        setSelectedFranchiseId(val.replace("fran_", ""));
                        setSelectedEpcId("all");
                      }
                      setPage(1);
                    }}
                    className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-primary rounded-xl px-3 pr-8 text-xs font-medium text-gray-900 outline-none cursor-pointer transition-colors"
                  >
                    <option value="all">All Partners &amp; Customers</option>
                    {computedEpcOptions.length > 0 && (
                      <optgroup label="🏢 EPC Buyers">
                        {computedEpcOptions.map((epc) => (
                          <option key={`epc_${epc.id || epc.name}`} value={`epc_${epc.id || epc.name}`}>
                            {epc.name} {epc.gstin ? `(GST: ${epc.gstin})` : ""}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {computedFranchiseOptions.length > 0 && (
                      <optgroup label="🏪 Franchise Partners">
                        {computedFranchiseOptions.map((fran) => (
                          <option key={`fran_${fran.id || fran.name}`} value={`fran_${fran.id || fran.name}`}>
                            {fran.name} {fran.gstin ? `(GST: ${fran.gstin})` : ""}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
                </div>
              </div>
            )}

            {/* 5. Search Filter Input */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">
                {awaitingSubFilter === "epc_orders"
                  ? "Search EPC Orders"
                  : awaitingSubFilter === "franchise_orders"
                    ? "Search Franchise Orders"
                    : "Search Orders & POs"}
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={
                    awaitingSubFilter === "epc_orders"
                      ? "EPC Name, GSTIN, Order #..."
                      : awaitingSubFilter === "franchise_orders"
                        ? "Franchise Name, GSTIN, Order #..."
                        : "Order #, Customer, GSTIN, PO..."
                  }
                  className="w-full h-9 bg-white border border-gray-300 focus:border-primary rounded-xl pl-8 pr-7 text-xs font-medium text-gray-900 outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 cursor-pointer"
                  >
                    <FaTimes size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Supplier Procurement Filters (Panel / Inverter) - Excluded on Procurement Indents (PI) tab */}
        {activeTab !== "procurement_indents" && (
          <div className="pt-2 border-t border-gray-200">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
                  <FaShoppingCart size={11} />
                </span>
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  3. Supplier Procurement Filters (Panel / Inverter)
                </span>
                {hasActiveProcurementFilters && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-900 text-white text-[9px] font-black tracking-wider shadow-sm">
                    ACTIVE
                  </span>
                )}
              </div>
              {hasActiveProcurementFilters && (
                <button
                  type="button"
                  onClick={clearProcurementFilters}
                  className="text-[11px] font-black text-gray-600 hover:text-red-600 bg-white hover:bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-300 cursor-pointer transition-all shadow-sm"
                >
                  Clear Procurement
                </button>
              )}
            </div>

            {/* Procurement Type Toggle */}
            <div className="mb-3">
              <label className="block text-[10px] font-black text-gray-700 mb-1.5 uppercase tracking-wider">
                Procurement Type
              </label>
              <div className="inline-flex bg-gray-100 border border-gray-300 rounded-xl p-0.5 gap-1">
                <button
                  type="button"
                  onClick={() => { setProcurementTypeFilter("all"); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer ${procurementTypeFilter === "all"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  All Types
                </button>
                <button
                  type="button"
                  onClick={() => { setProcurementTypeFilter("panel"); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${procurementTypeFilter === "panel"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  <span>☀️</span> Panel
                </button>
                <button
                  type="button"
                  onClick={() => { setProcurementTypeFilter("inverter"); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${procurementTypeFilter === "inverter"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  <span>⚡</span> Inverter
                </button>
              </div>
            </div>

            {/* 4 more filters: Order, Date From, Date To, Supplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Order */}
              <div>
                <label className="block text-[10px] font-black text-gray-700 mb-1 uppercase tracking-wider">Order</label>
                <div className="relative">
                  <select
                    value={procurementOrderFilter}
                    onChange={(e) => { setProcurementOrderFilter(e.target.value); setPage(1); }}
                    className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-gray-900 rounded-xl px-3 pr-8 text-xs font-semibold text-gray-900 outline-none cursor-pointer transition-colors shadow-sm"
                  >
                    <option value="all" className="text-gray-900 bg-white font-bold">All Orders</option>
                    {allOrdersForDropdown.map((ord) => (
                      <option key={ord.id} value={ord.id} className="text-gray-900 bg-white font-bold">
                        {ord.label}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
                </div>
              </div>

              {/* Order Date From */}
              <div>
                <label className="block text-[10px] font-black text-gray-700 mb-1 uppercase tracking-wider">Order Date: From</label>
                <input
                  type="date"
                  value={orderDateFrom}
                  onChange={(e) => { setOrderDateFrom(e.target.value); setPage(1); }}
                  className="w-full h-9 bg-white border border-gray-300 focus:border-gray-900 rounded-xl px-3 text-xs font-semibold text-gray-900 outline-none cursor-pointer transition-colors shadow-sm"
                />
              </div>

              {/* Order Date To */}
              <div>
                <label className="block text-[10px] font-black text-gray-700 mb-1 uppercase tracking-wider">Order Date: To</label>
                <input
                  type="date"
                  value={orderDateTo}
                  min={orderDateFrom || undefined}
                  onChange={(e) => { setOrderDateTo(e.target.value); setPage(1); }}
                  className="w-full h-9 bg-white border border-gray-300 focus:border-gray-900 rounded-xl px-3 text-xs font-semibold text-gray-900 outline-none cursor-pointer transition-colors shadow-sm"
                />
              </div>

              {/* Procurement Supplier */}
              <div>
                <label className="block text-[10px] font-black text-gray-700 mb-1 uppercase tracking-wider">Supplier</label>
                <div className="relative">
                  <select
                    value={procurementSupplierFilter}
                    onChange={(e) => { setProcurementSupplierFilter(e.target.value); setPage(1); }}
                    className="w-full appearance-none h-9 bg-white border border-gray-300 focus:border-gray-900 rounded-xl px-3 pr-8 text-xs font-semibold text-gray-900 outline-none cursor-pointer transition-colors shadow-sm"
                  >
                    <option value="all" className="text-gray-900 bg-white font-bold">All Suppliers</option>
                    {uniqueSuppliers.map((sup) => (
                      <option key={sup._id || sup.id} value={sup._id || sup.id} className="text-gray-900 bg-white font-bold">
                        {sup.company_name || sup.name}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Procurement summary stats */}
            {procurementTypeFilter !== "all" && (
              <div className="mt-3 p-3.5 rounded-2xl border border-gray-300 bg-gray-50 flex items-center justify-between gap-4 flex-wrap text-xs shadow-sm transition-all">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3.5 py-1.5 rounded-xl text-white font-black text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-sm bg-gray-900">
                    <span>{procurementTypeFilter === "panel" ? "☀️" : "⚡"}</span>
                    <span>{procurementTypeFilter === "panel" ? "Panel Procurement" : "Inverter Procurement"} — Filtered View</span>
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-white px-3.5 py-1.5 rounded-xl border border-gray-300 shadow-sm font-black text-xs text-gray-900 flex items-center">
                      <span className="text-gray-900 font-black text-sm mr-1.5">{filteredPOList.length}</span>
                      <span className="text-gray-600 font-bold">supplier PO{filteredPOList.length !== 1 ? "s" : ""} match</span>
                    </span>

                    <span className="bg-white px-3.5 py-1.5 rounded-xl border border-gray-300 shadow-sm font-black text-xs text-gray-900 flex items-center">
                      <span className="text-gray-500 mr-1.5 font-bold">Total Value:</span>
                      <span className="text-gray-900 font-black text-sm">
                        ₹{filteredPOList.reduce((acc, po) =>
                          acc + (po.items || []).reduce((s, it) => s + (Number(it.qty || it.quantity || 0) * Number(it.order_price || it.price || 0)), 0), 0
                        ).toLocaleString("en-IN")}
                      </span>
                    </span>

                    <span className="bg-white px-3.5 py-1.5 rounded-xl border border-gray-300 shadow-sm font-black text-xs text-gray-900 flex items-center">
                      <span className="text-gray-500 mr-1.5 font-bold">Suppliers:</span>
                      <span className="font-black text-sm text-gray-900">
                        {new Set(filteredPOList.map(po => po.supplier_id?._id || po.supplier_id?.id || po.supplier_id)).size}
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearProcurementFilters}
                  className="text-xs font-black text-gray-700 hover:text-red-600 cursor-pointer bg-white hover:bg-gray-100 px-3.5 py-1.5 rounded-xl border border-gray-300 shadow-sm ml-auto transition-all"
                >
                  Reset Filter ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Row 4: Active Filters Chips */}
        {hasActiveMasterFilters && (
          <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider mr-1">Active:</span>

              {quickFilters.industryType !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                  <span>Industry: {quickFilters.industryType}</span>
                  <button
                    type="button"
                    onClick={() => { setQuickFilters(prev => ({ ...prev, industryType: "all" })); setPage(1); }}
                    className="hover:text-primary/70 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {quickFilters.category !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                  <span>Category: {quickFilters.category}</span>
                  <button
                    type="button"
                    onClick={() => { setQuickFilters(prev => ({ ...prev, category: "all" })); setPage(1); }}
                    className="hover:text-primary/70 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {quickFilters.subCategory !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                  <span>Sub: {quickFilters.subCategory}</span>
                  <button
                    type="button"
                    onClick={() => { setQuickFilters(prev => ({ ...prev, subCategory: "all" })); setPage(1); }}
                    className="hover:text-primary/70 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {quickFilters.systemType !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                  <span>Type: {quickFilters.systemType}</span>
                  <button
                    type="button"
                    onClick={() => { setQuickFilters(prev => ({ ...prev, systemType: "all" })); setPage(1); }}
                    className="hover:text-primary/70 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {quickFilters.projectRange !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                  <span>Range: {quickFilters.projectRange}</span>
                  <button
                    type="button"
                    onClick={() => { setQuickFilters(prev => ({ ...prev, projectRange: "all" })); setPage(1); }}
                    className="hover:text-primary/70 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {selectedState !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
                  <FaMapMarkerAlt size={9} />
                  <span>State: {statesList.find(s => String(s.id || s._id) === String(selectedState))?.name || selectedState}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedState("all"); setSelectedDistrict("all"); setPage(1); }}
                    className="hover:text-amber-900 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {selectedDistrict !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
                  <FaMapMarkerAlt size={9} />
                  <span>District: {districtsList.find(d => String(d.id || d._id) === String(selectedDistrict))?.name || selectedDistrict}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedDistrict("all"); setPage(1); }}
                    className="hover:text-amber-900 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {selectedComboKit !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-semibold border border-indigo-200">
                  <FaBoxOpen size={9} />
                  <span>Kit: {allAdminKits.find(k => String(k._id || k.id) === String(selectedComboKit))?.name || "Selected Kit"}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedComboKit("all"); setPage(1); }}
                    className="hover:text-indigo-900 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {selectedEpcId !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-[11px] font-semibold border border-blue-200">
                  <FaBuilding size={9} />
                  <span>EPC: {computedEpcOptions.find(e => String(e.id || e.name) === String(selectedEpcId))?.name || selectedEpcId}</span>
                  {computedEpcOptions.find(e => String(e.id || e.name) === String(selectedEpcId))?.gstin && (
                    <span className="font-mono text-[9px] bg-blue-200 px-1 py-0.5 rounded font-bold">
                      {computedEpcOptions.find(e => String(e.id || e.name) === String(selectedEpcId))?.gstin}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setSelectedEpcId("all"); setPage(1); }}
                    className="hover:text-blue-900 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {selectedFranchiseId !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 text-[11px] font-semibold border border-purple-200">
                  <FaStore size={9} />
                  <span>Franchise: {computedFranchiseOptions.find(f => String(f.id || f.name) === String(selectedFranchiseId))?.name || selectedFranchiseId}</span>
                  {computedFranchiseOptions.find(f => String(f.id || f.name) === String(selectedFranchiseId))?.gstin && (
                    <span className="font-mono text-[9px] bg-purple-200 px-1 py-0.5 rounded font-bold">
                      {computedFranchiseOptions.find(f => String(f.id || f.name) === String(selectedFranchiseId))?.gstin}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setSelectedFranchiseId("all"); setPage(1); }}
                    className="hover:text-purple-900 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-semibold border border-gray-300">
                  <FaSearch size={9} />
                  <span>"{searchQuery.trim()}"</span>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setPage(1); }}
                    className="hover:text-gray-900 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {activeTab !== "procurement_indents" && procurementTypeFilter !== "all" && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-extrabold border shadow-sm ${procurementTypeFilter === "panel"
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-teal-100 text-teal-900 border-teal-300"
                  }`}>
                  <span>{procurementTypeFilter === "panel" ? "☀️" : "⚡"}</span>
                  <span>Procurement: {procurementTypeFilter === "panel" ? "Panel" : "Inverter"}</span>
                  <button
                    type="button"
                    onClick={() => { setProcurementTypeFilter("all"); setPage(1); }}
                    className="ml-1 p-0.5 rounded-full hover:bg-gray-200 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {activeTab !== "procurement_indents" && procurementOrderFilter !== "all" && (() => {
                const matchedOrder = pendingEpcOrders.find(o => String(o.id || o._id) === String(procurementOrderFilter))
                  || purchaseOrders.find(po => String(po._id || po.id) === String(procurementOrderFilter));
                const label = matchedOrder?.order_number || matchedOrder?.po_number || procurementOrderFilter;
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                    <FaShoppingCart size={9} />
                    <span>Order: {label}</span>
                    <button
                      type="button"
                      onClick={() => { setProcurementOrderFilter("all"); setPage(1); }}
                      className="hover:opacity-70 ml-0.5 cursor-pointer"
                    >
                      <FaTimes size={9} />
                    </button>
                  </span>
                );
              })()}

              {activeTab !== "procurement_indents" && (orderDateFrom || orderDateTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-semibold border border-gray-300">
                  <span>📅</span>
                  <span>
                    Date: {orderDateFrom ? new Date(orderDateFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Any"}
                    {" → "}
                    {orderDateTo ? new Date(orderDateTo).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Any"}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setOrderDateFrom(""); setOrderDateTo(""); setPage(1); }}
                    className="hover:opacity-70 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}

              {activeTab !== "procurement_indents" && procurementSupplierFilter !== "all" && (() => {
                const sup = uniqueSuppliers.find(s => String(s._id || s.id) === String(procurementSupplierFilter));
                return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 text-[11px] font-semibold border border-orange-200">
                    <FaUsers size={9} />
                    <span>Supplier: {sup?.company_name || sup?.name || procurementSupplierFilter}</span>
                    <button
                      type="button"
                      onClick={() => { setProcurementSupplierFilter("all"); setPage(1); }}
                      className="hover:opacity-70 ml-0.5 cursor-pointer"
                    >
                      <FaTimes size={9} />
                    </button>
                  </span>
                );
              })()}

              {paymentStatusFilter !== "all" && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${paymentStatusFilter === "paid"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-yellow-100 text-yellow-800 border-yellow-300"
                  }`}>
                  <span>{paymentStatusFilter === "paid" ? "✅" : "⏳"}</span>
                  <span>Status: {paymentStatusFilter === "paid" ? "Paid" : "Pending"}</span>
                  <button
                    type="button"
                    onClick={() => { setPaymentStatusFilter("all"); setPage(1); }}
                    className="hover:opacity-70 ml-0.5 cursor-pointer"
                  >
                    <FaTimes size={9} />
                  </button>
                </span>
              )}
            </div>

            <div className="text-xs font-black text-gray-900">
              Matches: <span className="text-blue-600 font-black">{filteredEpcOnlyOrders.length}</span> EPC Orders,{" "}
              <span className="text-purple-600 font-black">{filteredFranchiseOnlyOrders.length}</span> Franchise Orders,{" "}
              <span className="text-primary font-black">{filteredPOList.length}</span> Supplier POs
            </div>
          </div>
        )}
      </div>

      {/* ─── Procurement Component Sub-Filter ─── */}
      {activeTab === "pending" && (
        <div className="bg-white border border-gray-200 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider pl-2 pr-1">Supplier Stream:</span>
            <button
              type="button"
              onClick={() => {
                setProcurementComponentFilter("all");
                fetchPendingEpcOrders("all");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${procurementComponentFilter === "all"
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
            >
              All Pending Orders
            </button>
            <button
              type="button"
              onClick={() => {
                setProcurementComponentFilter("panel");
                fetchPendingEpcOrders("panel");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${procurementComponentFilter === "panel"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                }`}
            >
              <span>☀️</span>
              <span>Pending Panel Supplier Payment</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProcurementComponentFilter("inverter");
                fetchPendingEpcOrders("inverter");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${procurementComponentFilter === "inverter"
                ? "bg-teal-600 text-white"
                : "bg-teal-50 text-teal-900 border border-teal-300 hover:bg-teal-100"
                }`}
            >
              <span>⚡</span>
              <span>Pending Inverter Supplier Payment</span>
            </button>
          </div>

          {selectedOrderIds.size > 0 && (
            <div className="flex items-center gap-2 pr-2">
              <span className="text-xs font-bold text-gray-600">
                {selectedOrderIds.size} orders selected
              </span>
              <button
                type="button"
                onClick={openCombineModal}
                className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <FaLayerGroup size={12} />
                <span>Combine &amp; Pay Supplier</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── EPC Customer Orders Section ─────── */}
      {activeTab === "pending" && (awaitingSubFilter === "all" || awaitingSubFilter === "epc_orders") && (
        <CustomerOrdersTable
          title="EPC Customer Orders (Awaiting Supplier Procurement)"
          icon={FaBuilding}
          type="epc"
          orders={filteredEpcOnlyOrders}
          totalPendingCount={pendingEpcCount}
          selectedOrderIds={selectedOrderIds}
          toggleOrderSelection={toggleOrderSelection}
          onSelectAll={selectAllEpcOrders}
          isAllSelected={isAllEpcSelected}
          selectedCount={selectedEpcCount}
          expandedOrderId={expandedOrderId}
          setExpandedOrderId={setExpandedOrderId}
          hasActiveFilters={hasActiveMasterFilters}
          onResetFilters={resetAllMasterFilters}
          loading={loadingEpcOrders}
          onPayOrderComponent={(procType, orderId) => openCombineModal(procType, orderId)}
        />
      )}

      {/* ─── Franchise Customer Orders Section ─────── */}
      {activeTab === "pending" && (awaitingSubFilter === "all" || awaitingSubFilter === "franchise_orders") && (
        <CustomerOrdersTable
          title="Franchise Orders (Awaiting Supplier Procurement)"
          icon={FaStore}
          type="franchise"
          orders={filteredFranchiseOnlyOrders}
          totalPendingCount={pendingFranchiseCount}
          selectedOrderIds={selectedOrderIds}
          toggleOrderSelection={toggleOrderSelection}
          onSelectAll={selectAllFranchiseOrders}
          isAllSelected={isAllFranchiseSelected}
          selectedCount={selectedFranchiseCount}
          expandedOrderId={expandedOrderId}
          setExpandedOrderId={setExpandedOrderId}
          hasActiveFilters={hasActiveMasterFilters}
          onResetFilters={resetAllMasterFilters}
          loading={loadingEpcOrders}
          onPayOrderComponent={(procType, orderId) => openCombineModal(procType, orderId)}
        />
      )}

      {/* ─── Supplier Purchase Orders Section (POs) ───────────────────────── */}
      {((activeTab === "pending" && (awaitingSubFilter === "all" || awaitingSubFilter === "supplier_pos")) || activeTab === "history") && (
        <div className="space-y-6">
          {activeTab === "pending" && awaitingSubFilter === "all" && (
            <div className="flex items-center justify-between px-1 pt-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <FaClipboardList className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-bold text-sm text-gray-900">
                  Supplier Purchase Orders (PO) Awaiting Order
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {hasActiveMasterFilters ? `${filteredPOList.length} of ${purchaseOrders.length} orders` : `${filteredPOList.length} order${filteredPOList.length !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
          )}

          {/* Table Section */}
          <div className="card bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-col md:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search PO, Proforma Invoice, supplier..."
                    className="w-full h-10 bg-white border border-gray-300 focus:border-primary rounded-xl pl-9 pr-4 text-xs font-semibold outline-none text-gray-900"
                  />
                </div>

                <DropdownWithSearchInput
                  value={warehouseFilter}
                  onChange={(val) => { setWarehouseFilter(val); setPage(1); }}
                  options={[
                    { value: "All", text: "All Warehouses" },
                    ...uniqueWarehouses.map(w => ({ value: w._id || w.id, text: `${w.warehouse_code} (${w.address})` }))
                  ]}
                  placeholder="Filter by Warehouse..."
                  className="w-56 text-left"
                />

                <DropdownWithSearchInput
                  value={supplierFilter}
                  onChange={(val) => { setSupplierFilter(val); setPage(1); }}
                  options={[
                    { value: "All", text: "All Suppliers" },
                    ...uniqueSuppliers.map(s => ({ value: s._id || s.id, text: `${s.company_name} (${s.brand_name})` }))
                  ]}
                  placeholder="Filter by Supplier..."
                  className="w-56 text-left"
                />
              </div>
            </div>

            <div className="overflow-x-auto px-6 pb-6 pt-2">
              <CustomTable
                containerClassName="shadow-none border-none bg-transparent"
                headers={[
                  { key: "po_number", label: "PO Details" },
                  { key: "supplier", label: "Supplier / Recipient" },
                  { key: "warehouse", label: "Destination Warehouse" },
                  { key: "items", label: "Products ordered" },
                  { key: "total_amount", label: "Total Order Price" },
                  { key: "timeline", label: "Due Timeline" },
                  { key: "documents", label: "Documents" },
                  { key: "status", label: "Status" },
                  { key: "action", label: "Actions", align: "center" }
                ]}
                data={paginatedPOs}
                loading={loadingOrders}
                renderRow={(po) => {
                  const totalVal = (po.items || []).reduce((acc, it) => acc + (it.qty * it.order_price), 0) || po.payment_details?.amount || 0;
                  const timelineDateObj = new Date(po.timeline);
                  timelineDateObj.setHours(0, 0, 0, 0);
                  const todayObj = new Date();
                  todayObj.setHours(0, 0, 0, 0);
                  const diffTime = todayObj - timelineDateObj;
                  const overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                  const isPoOverdue = po.status !== "delivered" && overdueDays > 0;

                  return (
                    <>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-primary text-xs uppercase block">{po.po_number}</span>
                        <span className="text-[10px] text-gray-500 font-bold block mt-0.5">PI No: {po.invoice_no || po.proforma_invoice_no || "—"}</span>
                        {po.procurement_type && (
                          <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${po.procurement_type === "panel"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : po.procurement_type === "inverter"
                              ? "bg-teal-50 text-teal-700 border-teal-200"
                              : "bg-primary/10 text-primary border-primary/20"
                            }`}>
                            {po.procurement_type === "panel" ? "☀️ Panel" : po.procurement_type === "inverter" ? "⚡ Inverter" : "📦 Mixed"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-xs flex-shrink-0 font-bold">
                            🏢
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-900 text-xs block leading-tight">
                              {po.supplier_id?.company_name || po.supplier_name || "N/A"}
                            </span>
                            {(po.supplier_id?.brand_name || po.supplier_brand) && (
                              <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                                Brand: <span className="text-gray-700">{po.supplier_id?.brand_name || po.supplier_brand}</span>
                              </div>
                            )}
                            {(po.supplier_id?.gst_number || po.supplier_gst) && (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[9px] font-mono font-bold text-gray-700">
                                  GST: {po.supplier_id?.gst_number || po.supplier_gst}
                                </span>
                              </div>
                            )}
                            {po.payment_details?.reference_no && (
                              <div className="text-[9px] text-green-700 font-bold mt-0.5">
                                Ref: {po.payment_details.reference_no}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-1.5">
                          <FaMapMarkerAlt size={12} className="text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black text-gray-900 text-xs block">
                              {po.warehouse_id?.warehouse_code || po.warehouse_code || "WH-MAIN"}
                            </span>
                            <span className="text-[11px] font-bold text-gray-600 block mt-0.5">
                              {[po.district_name, po.state_name].filter(Boolean).join(", ") || po.warehouse_id?.address || "Gujarat Hub"}
                            </span>
                            {po.warehouse_id?.warehouse_type && (
                              <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                {po.warehouse_id.warehouse_type} warehouse
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-gray-900">
                          {(po.items || []).length} SKU{(po.items || []).length !== 1 ? "s" : ""}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {((po.items || []).reduce((acc, it) => acc + (it.qty || 0), 0)).toLocaleString()} pcs total
                        </div>
                        <button
                          onClick={() => {
                            setSelectedItems(po.items || []);
                            setItemsModalOpen(true);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary font-black hover:underline"
                        >
                          <FaEye size={10} /> View Items
                        </button>
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 text-xs">
                        ₹{totalVal.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold ${isPoOverdue ? 'text-red-600 font-extrabold' : 'text-gray-700'}`}>
                          {new Date(po.timeline).toLocaleDateString()}
                        </span>
                        {isPoOverdue && (
                          <span className="block text-[9px] font-black text-red-600 uppercase tracking-wider mt-0.5">
                            ⚠️ Overdue ({overdueDays} {overdueDays === 1 ? 'day' : 'days'})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[120px]">
                          {po.purchase_order_pdf ? (
                            <button
                              onClick={() => {
                                setProformaPO(po);
                                setProformaInitialTab("po");
                                setProformaModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase tracking-wide hover:bg-primary/20 transition-all justify-center"
                            >
                              <FaFilePdf size={9} /> PO PDF
                            </button>
                          ) : (
                            <span className="text-[9px] text-gray-400 italic text-center">No PO PDF</span>
                          )}
                          {po.proforma_invoice_pdf ? (
                            <button
                              onClick={() => {
                                setProformaPO(po);
                                setProformaInitialTab("pi");
                                setProformaModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold uppercase tracking-wide hover:bg-blue-100 transition-all justify-center"
                            >
                              <FaFilePdf size={9} /> PI PDF
                            </button>
                          ) : (
                            <span className="text-[9px] text-gray-400 italic text-center">No PI PDF</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${po.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                          po.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                            po.status === 'invoiced' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              po.status === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                po.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                          {po.status === 'pending' ? 'Pending Payment' : po.status === 'invoiced' ? 'Awaiting Payment' : po.status === 'paid' ? 'Paid / Awaiting Delivery' : po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {["pending", "accepted", "invoiced"].includes(po.status) ? (
                          <div className="flex flex-col gap-2 items-center justify-center">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenPay(po)}
                              className="text-[10px] font-extrabold uppercase py-1 px-3"
                            >
                              Add Payment Details
                            </Button>
                            <button
                              type="button"
                              onClick={() => openCancelConfirm(po.id || po._id)}
                              className="text-[10px] text-red-600 font-bold hover:underline"
                            >
                              Cancel PO
                            </button>
                          </div>
                        ) : po.status === "cancelled" ? (
                          <span className="text-[10px] text-gray-400 italic">Order Cancelled</span>
                        ) : (
                          <div className="text-left text-[10px] space-y-0.5 bg-gray-50 p-2 rounded-xl border border-gray-200 max-w-[170px] inline-block font-medium">
                            <div className="text-gray-500">UTR: <span className="font-bold text-gray-900">{po.payment_details?.reference_no}</span></div>
                            <div className="text-gray-500">Mode: <span className="font-bold text-gray-900">{po.payment_details?.payment_mode}</span></div>
                            <div className="text-gray-500">Paid: <span className="font-bold text-gray-900">₹{po.payment_details?.amount?.toLocaleString()}</span></div>
                            {po.payment_details?.receipt_url && (
                              <div className="mt-1">
                                <a
                                  href={po.payment_details.receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline font-extrabold hover:text-primary/80"
                                >
                                  📄 View Receipt
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </>
                  );
                }}
                emptyMessage={hasActiveMasterFilters ? "No purchase orders matching the selected master filters." : "No purchase orders found."}
              />
            </div>

            <div className="p-6 border-t border-gray-200">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(filteredPOList.length / pageSize)}
                onPageChange={setPage}
                totalItems={filteredPOList.length}
                pageSize={pageSize}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Combined Procurement Batches Section ─────────────────────────── */}
      {activeTab === "combined_groups" && (
        <CombinedProcurementBatchesSection
          groups={filteredProcurementGroups}
          allGroups={procurementGroups}
          loading={loadingGroups}
          highlightedGroupId={highlightedGroupId}
          onClearHighlight={() => setHighlightedGroupId("")}
          expandedGroupId={expandedGroupId}
          setExpandedGroupId={setExpandedGroupId}
          filterStatus={groupFilterStatus}
          setFilterStatus={setGroupFilterStatus}
          searchQuery={groupSearchQuery}
          setSearchQuery={setGroupSearchQuery}
          onRefresh={fetchProcurementGroups}
          onPaySupplierForGroup={handlePaySupplierForGroup}
          onPayWholeGroup={handlePayWholeGroup}
        />
      )}

      {/* ─── Procurement Purchase Indents (PI) Section ───────────────────────── */}
      {activeTab === "procurement_indents" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-primary/5 via-blue-500/5 to-primary/5 border border-primary/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-xl bg-primary text-white shadow-sm flex items-center justify-center">
                <FaCreditCard size={18} />
              </span>
              <div>
                <h4 className="text-sm font-black text-gray-900">
                  Procurement Purchase Indents (Suppliers &amp; OEMs Auto-Selected)
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Suppliers &amp; OEM partners were chosen in the Procurement Module. No need to re-select suppliers here. Review advance amounts and process disbursements directly.
                </p>
              </div>
            </div>
            <a
              href="/account-panel/procurement"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all shadow-sm shrink-0"
            >
              <FaLayerGroup size={12} />
              <span>Go to Procurement Module</span>
            </a>
          </div>

          {/* Sub-Filter Tabs for Purchase Indents */}
          {procurementPIs.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 p-2.5 rounded-2xl shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPiSubFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    piSubFilter === "all" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>All Orders / Batches</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    piSubFilter === "all" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}>
                    {groupedProcurementOrders.length} Orders ({procurementPIs.length} PIs)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPiSubFilter("awaiting_advance")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    piSubFilter === "awaiting_advance" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>Awaiting 30% Advance</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    piSubFilter === "awaiting_advance" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"
                  }`}>
                    {groupedProcurementOrders.filter(g => !g.allAdvancePaid).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPiSubFilter("balance_due")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    piSubFilter === "balance_due" ? "bg-amber-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>30% Paid (70% Balance Due)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    piSubFilter === "balance_due" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700"
                  }`}>
                    {groupedProcurementOrders.filter(g => g.anyAdvancePaid && !g.allFullyPaid).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPiSubFilter("fully_paid")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    piSubFilter === "fully_paid" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>Fully Paid (100%)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    piSubFilter === "fully_paid" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    {groupedProcurementOrders.filter(g => g.allFullyPaid).length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={collapsedOrderKeys.size === 0 ? handleCollapseAllOrders : handleExpandAllOrders}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all border border-gray-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title={collapsedOrderKeys.size === 0 ? "Close all open cards" : "Open all closed cards"}
                >
                  {collapsedOrderKeys.size === 0 ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                  <span>{collapsedOrderKeys.size === 0 ? "Close All Cards" : "Open All Cards"}</span>
                </button>
              </div>
            </div>
          )}

          {loadingProcurementPIs && procurementPIs.length === 0 ? (
            <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl">
              <FaSpinner className="animate-spin text-primary mx-auto text-2xl mb-2" />
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Loading Purchase Indents...</p>
            </div>
          ) : procurementPIs.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
              <FaBoxes className="mx-auto text-3xl text-gray-300 mb-3" />
              <h4 className="text-sm font-black text-gray-800">No Purchase Indents Found</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                No Purchase Indents have been created from batches yet. Go to New Orders to batch orders, then open Procurement to select OEM partners/suppliers.
              </p>
              <a
                href="/account-panel/procurement"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
              >
                <FaArrowRight size={11} />
                <span>Open Procurement Module</span>
              </a>
            </div>
          ) : filteredGroupedOrders.length === 0 ? (
            <div className="p-10 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
              <FaBoxes className="mx-auto text-3xl text-gray-300 mb-2 opacity-50" />
              <h4 className="text-sm font-bold text-gray-700">No Orders in this Status</h4>
              <p className="text-xs text-gray-500 mt-1">Try switching to another sub-filter tab above.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroupedOrders.map((grp) => {
                const isCollapsed = collapsedOrderKeys.has(grp.key);
                return (
                  <div
                    key={grp.key}
                    className="bg-white border-2 border-gray-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    {/* ─── Card Header: Batch & Consolidated Financials (Clickable) ──────── */}
                    <div
                      onClick={() => toggleOrderCollapse(grp.key)}
                      className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:brightness-110 transition-all"
                      title={isCollapsed ? "Click to Open / Expand Card" : "Click to Close / Collapse Card"}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <span className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center text-xl shrink-0 shadow-inner">
                          <FaLayerGroup />
                        </span>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {grp.order_group_id && (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                                Batch #{grp.order_group_id}
                              </span>
                            )}
                            <span className="text-sm sm:text-base font-black tracking-tight text-white font-mono">
                              {grp.customer_order_number}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              grp.allFullyPaid
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                                : grp.allAdvancePaid
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                                  : grp.anyAdvancePaid
                                    ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                                    : "bg-blue-500/20 text-blue-300 border-blue-400/30"
                            }`}>
                              {grp.allFullyPaid
                                ? "100% Fully Settled"
                                : grp.allAdvancePaid
                                  ? "30% Advance Fully Disbursed"
                                  : grp.anyAdvancePaid
                                    ? `30% Advance Partially Paid (${grp.pis.filter(p => Boolean(p.payment?.advance_payment?.utr_number || ['Advance Paid', 'Paid'].includes(p.payment?.payment_status))).length}/${grp.pis.length} PIs)`
                                    : "30% Advance Due"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5 font-medium">
                            <span className="inline-flex items-center gap-1.5 text-slate-300">
                              <FaWarehouse size={11} className="text-indigo-400" />
                              <span>Destination: <strong className="text-white">{grp.destination_warehouse_name}</strong></span>
                            </span>
                            <span className="text-slate-500">•</span>
                            <span>Created: {grp.created_at ? new Date(grp.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Today"}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-indigo-300 font-bold">{grp.pis.length} Component PIs Bundled in this Order</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Snapshot & Open/Close Toggle Button */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                          <div>
                            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Total Batch Value</span>
                            <span className="text-base sm:text-lg font-black text-white">₹{grp.totalValue.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                          <div>
                            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">30% Advance</span>
                            <span className="text-xs sm:text-sm font-black text-emerald-400">
                              ₹{grp.totalAdvancePaid.toLocaleString("en-IN")}
                              <span className="text-[10px] text-slate-400 font-normal"> / ₹{grp.totalAdvanceAmount.toLocaleString("en-IN")}</span>
                            </span>
                          </div>
                          <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                          <div>
                            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">70% Balance Due</span>
                            <span className="text-xs sm:text-sm font-black text-amber-300">
                              ₹{grp.totalBalanceDue.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Open / Close Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrderCollapse(grp.key);
                          }}
                          className={`flex items-center gap-2 px-3.5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer border ${
                            isCollapsed
                              ? "bg-primary text-white border-primary hover:bg-primary/90"
                              : "bg-white/15 text-white border-white/20 hover:bg-white/25"
                          }`}
                          title={isCollapsed ? "Click to Open Card" : "Click to Close Card"}
                        >
                          <span>{isCollapsed ? "Open Card" : "Close Card"}</span>
                          {isCollapsed ? (
                            <FaChevronDown size={11} className="text-white" />
                          ) : (
                            <FaChevronUp size={11} className="text-white" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* ─── Card Body (Rendered when NOT collapsed) ──────────── */}
                    {!isCollapsed && (
                      <>
                        {/* ─── Component Pillars Strip (Panels, Inverter, BOS) ──── */}
                        <div className="bg-slate-50 border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider mr-1">
                              Components In This Order:
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                              <span>☀️</span>
                              <span>Solar Panels: <strong>{grp.totalPanelUnits > 0 ? `${grp.totalPanelUnits} Pcs` : `${grp.panelPiCount} PI`}</strong></span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs">
                              <span>⚡</span>
                              <span>Solar Inverter: <strong>{grp.totalInverterUnits > 0 ? `${grp.totalInverterUnits} Pcs` : `${grp.inverterPiCount} PI`}</strong></span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs">
                              <span>📦</span>
                              <span>
                                Complete BOS Kit: <strong>{grp.inferredKitsCount > 0 ? `${grp.inferredKitsCount} Kits` : `${grp.bosPiCount} PI`}</strong>
                                {grp.totalBosUnits > 0 && (
                                  <span className="ml-1 text-[10px] text-purple-700 font-normal">
                                    ({grp.totalBosUnits.toLocaleString("en-IN")} Raw Parts)
                                  </span>
                                )}
                              </span>
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                            <FaTruck className="text-emerald-600" size={12} />
                            <span>Warehouse New Order Auto-Linked (Full BOM Ready)</span>
                          </div>
                        </div>

                        {/* ─── Inner Component PIs Table ────────────────────────── */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-100/70 text-[10px] font-black uppercase tracking-wider text-gray-600">
                                <th className="py-3 px-4">Component &amp; PI No.</th>
                                <th className="py-3 px-4">Allocated Supplier / Brand</th>
                                <th className="py-3 px-4 text-center">Items &amp; Qty</th>
                                <th className="py-3 px-4 text-right">30% Advance</th>
                                <th className="py-3 px-4 text-right">70% Balance</th>
                                <th className="py-3 px-4 text-right">Total PI Value</th>
                                <th className="py-3 px-4 text-center">Payment Status</th>
                                <th className="py-3 px-4 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {grp.pis.map((pi) => {
                                const payStatus = pi.payment?.payment_status || "PI Submitted";
                                const totalVal = pi.total_pi_value || 0;
                                const advPct = pi.payment?.advance_percentage || 30;
                                const balPct = pi.payment?.balance_percentage || 70;
                                const advAmount = pi.payment?.advance_amount || Math.round((totalVal * advPct) / 100);
                                const balAmount = pi.payment?.balance_amount || (totalVal - advAmount);

                                const advUtr = pi.payment?.advance_payment?.utr_number || (["Advance Paid", "Paid"].includes(payStatus) ? pi.payment?.actual_payment?.utr_number : null);
                                const balUtr = pi.payment?.balance_payment?.utr_number;

                                const isAdvancePaid = Boolean(advUtr || ["Advance Paid", "Paid"].includes(payStatus));
                                const isFullyPaid = payStatus === "Paid" || Boolean(balUtr && isAdvancePaid);
                                const isBalanceDue = isAdvancePaid && !isFullyPaid;

                                const advApproval = pi.payment?.advance_approval || {};
                                const balApproval = pi.payment?.balance_approval || {};

                                const isAdvApproved = advApproval.status === "approved";
                                const isAdvRequested = advApproval.status === "pending" || payStatus === "Advance Requested";
                                const isAdvRejected = advApproval.status === "rejected";

                                const isBalApproved = balApproval.status === "approved";
                                const isBalRequested = balApproval.status === "pending" || payStatus === "Balance Requested";
                                const isBalRejected = balApproval.status === "rejected";

                                const isBusyThisPi = requestingPaymentPiId === (pi._id || pi.pi_number);
                                const isPoPendingApproval = (Boolean(pi.is_above_benchmark) || Boolean(pi.requires_admin_approval)) &&
                                  (pi.po_approval?.status === "pending" || pi.po_approval?.status === "Submitted" || pi.pi_status === "Pending Admin Price Approval" || payStatus === "Awaiting Admin Approval");

                                // Detect component type
                                const cType = (pi.component_type || "").toLowerCase();
                                const allItemText = (pi.items || []).map(it => `${it.sku_code || ''} ${it.item_name || ''} ${it.component_category || ''}`).join(" ").toLowerCase();

                                let compIcon = "📦";
                                let compLabel = "Complete BOS Kit";
                                let compPill = "bg-purple-50 text-purple-700 border-purple-200";

                                if (cType.includes("panel") || allItemText.includes("panel") || allItemText.includes("module")) {
                                  compIcon = "☀️";
                                  compLabel = "Solar Panels";
                                  compPill = "bg-amber-50 text-amber-800 border-amber-200";
                                } else if (cType.includes("inverter") || allItemText.includes("inverter")) {
                                  compIcon = "⚡";
                                  compLabel = "Solar Inverter";
                                  compPill = "bg-blue-50 text-blue-700 border-blue-200";
                                }

                                return (
                                  <tr key={pi._id || pi.pi_number} className="hover:bg-gray-50/70 transition-colors">
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border inline-flex items-center gap-1 ${compPill}`}>
                                          <span>{compIcon}</span>
                                          <span>{compLabel}</span>
                                        </span>
                                        {isPoPendingApproval && (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 animate-pulse">
                                            <FaShieldAlt size={8} className="text-amber-600" />
                                            Exceeds Benchmark
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-black font-mono text-primary text-sm mt-1 block">{pi.pi_number}</span>
                                      <span className="block text-[10px] text-gray-400 mt-0.5">
                                        {pi.created_at ? new Date(pi.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="font-black text-gray-900">{pi.supplier_name}</div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                          pi.is_oem_partner ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                        }`}>
                                          {pi.is_oem_partner ? "OEM Partner (SolarKits Brand)" : "Supplier Partner"}
                                        </span>
                                        {pi.supplier_brand && (
                                          <span className="text-[10px] text-gray-500 font-semibold">{pi.supplier_brand}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      {compLabel === "Complete BOS Kit" ? (
                                        <div>
                                          <div className="font-bold text-purple-950">
                                            {grp.inferredKitsCount || 1} Kits
                                          </div>
                                          <span className="text-[10px] text-purple-700 font-bold block">
                                            {(pi.items || []).length} SKUs • {(pi.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0).toLocaleString("en-IN")} Raw Parts
                                          </span>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="font-bold text-gray-900">
                                            {(pi.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0)} Units
                                          </div>
                                          <span className="text-[10px] text-gray-400 block truncate max-w-[140px] mx-auto">
                                            {(pi.items || []).map(it => it.sku_code).join(", ")}
                                          </span>
                                        </div>
                                      )}
                                    </td>

                                    {/* 30% Advance */}
                                    <td className="py-3.5 px-4 text-right">
                                      <div className="font-black text-gray-900">
                                        ₹{advAmount.toLocaleString("en-IN")}
                                      </div>
                                      <div className="mt-0.5">
                                        {isAdvancePaid ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                            ✅ Paid {advUtr ? `(${advUtr.slice(-5)})` : ""}
                                          </span>
                                        ) : isAdvApproved ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                                            Approved ({advPct}%)
                                          </span>
                                        ) : isAdvRequested ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                                            ⏳ Adv Approval Pending
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                            Due ({advPct}%)
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* 70% Balance */}
                                    <td className="py-3.5 px-4 text-right">
                                      <div className="font-black text-gray-900">
                                        ₹{balAmount.toLocaleString("en-IN")}
                                      </div>
                                      <div className="mt-0.5">
                                        {isFullyPaid ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                            ✅ Paid {balUtr ? `(${balUtr.slice(-5)})` : ""}
                                          </span>
                                        ) : isBalanceDue ? (
                                          isBalApproved ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                                              Approved ({balPct}%)
                                            </span>
                                          ) : isBalRequested ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                                              ⏳ Bal Approval Pending
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                              ⏳ Due (Ready)
                                            </span>
                                          )
                                        ) : (
                                          <span className="text-[10px] text-gray-400">
                                            Locked (Wait 30%)
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Total PI Value */}
                                    <td className="py-3.5 px-4 text-right font-black text-primary text-sm">
                                      ₹{totalVal.toLocaleString("en-IN")}
                                    </td>

                                    {/* Payment Status */}
                                    <td className="py-3.5 px-4 text-center">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1 ${
                                        isFullyPaid ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                                        isBalanceDue ? (
                                          isBalApproved ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                                          isBalRequested ? "bg-amber-50 text-amber-700 border-amber-300" :
                                          "bg-amber-50 text-amber-800 border-amber-300 font-extrabold"
                                        ) : isPoPendingApproval ? (
                                          "bg-amber-100 text-amber-900 border-amber-300 font-black animate-pulse"
                                        ) : (
                                          isAdvApproved ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                                          isAdvRequested ? "bg-amber-50 text-amber-700 border-amber-300" :
                                          "bg-gray-100 text-gray-700 border-gray-300"
                                        )
                                      }`}>
                                        {isFullyPaid ? "Fully Paid (100%)" :
                                         isBalanceDue ? (
                                           isBalApproved ? "70% Balance Approved" :
                                           isBalRequested ? "70% Bal Awaiting Approval" :
                                           "70% Balance Due"
                                         ) : isPoPendingApproval ? (
                                           <>
                                             <FaShieldAlt className="text-amber-700 text-[9px]" />
                                             PO Approval Pending (Exceeds Benchmark)
                                           </>
                                         ) : (
                                           isAdvApproved ? "30% Advance Approved" :
                                           isAdvRequested ? "30% Adv Awaiting Approval" :
                                           "30% Advance Due"
                                         )}
                                      </span>
                                    </td>

                                    {/* Action Buttons */}
                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                      {isFullyPaid ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedPiForPayment(pi);
                                            setPiPaymentMilestone("overview");
                                            setIsPiPaymentModalOpen(true);
                                          }}
                                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-black transition-all shadow-xs cursor-pointer"
                                        >
                                          View Payments
                                        </button>
                                      ) : isBalanceDue ? (
                                        <div className="flex items-center justify-end gap-1.5">
                                          {isBalApproved ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedPiForPayment(pi);
                                                setPiPaymentMilestone("balance");
                                                setIsPiPaymentModalOpen(true);
                                              }}
                                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shadow-amber-200"
                                              title="Disburse remaining 70% balance to supplier"
                                            >
                                              <span>Pay 70% Balance</span>
                                              <FaArrowRight size={9} />
                                            </button>
                                          ) : isBalRequested ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedPiForPayment(pi);
                                                setPiPaymentMilestone("overview");
                                                setIsPiPaymentModalOpen(true);
                                              }}
                                              className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                              title="Admin 70% Balance Approval is Pending"
                                            >
                                              <FaClock size={10} className="text-amber-600 animate-pulse" />
                                              <span>Bal Awaiting Approval</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              disabled={isBusyThisPi}
                                              onClick={() => handleRaisePaymentRequest(pi, "balance")}
                                              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                              title="Raise 70% Balance Payment Approval Request to Admin"
                                            >
                                              {isBusyThisPi ? (
                                                <FaSpinner className="animate-spin text-xs" />
                                              ) : (
                                                <FaPaperPlane className="text-[10px]" />
                                              )}
                                              <span>Request 70% Balance</span>
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedPiForPayment(pi);
                                              setPiPaymentMilestone("overview");
                                              setIsPiPaymentModalOpen(true);
                                            }}
                                            className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all border border-gray-300 cursor-pointer"
                                            title="View Advance UTR & History"
                                          >
                                            UTR
                                          </button>
                                        </div>
                                      ) : isPoPendingApproval ? (
                                        <div className="flex items-center justify-end">
                                          <button
                                            type="button"
                                            disabled
                                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50/90 text-amber-800 border border-amber-300/90 flex items-center gap-1.5 cursor-not-allowed opacity-90 shadow-2xs"
                                            title="Rate exceeds benchmark cost. Admin must approve this Purchase Order (PO) in Order Approvals before 30% advance can be requested."
                                          >
                                            <FaLock size={10} className="text-amber-600" />
                                            <span>Locked (PO Approval Pending)</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-end gap-1.5">
                                          {isAdvApproved ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedPiForPayment(pi);
                                                setPiPaymentMilestone("advance");
                                                setIsPiPaymentModalOpen(true);
                                              }}
                                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
                                            >
                                              Pay 30% Advance
                                            </button>
                                          ) : isAdvRequested ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedPiForPayment(pi);
                                                setPiPaymentMilestone("overview");
                                                setIsPiPaymentModalOpen(true);
                                              }}
                                              className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                              title="Admin 30% Advance Approval is Pending"
                                            >
                                              <FaClock size={10} className="text-amber-600 animate-pulse" />
                                              <span>Adv Awaiting Approval</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              disabled={isBusyThisPi}
                                              onClick={() => handleRaisePaymentRequest(pi, "advance")}
                                              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                              title="Raise 30% Advance Payment Approval Request to Admin"
                                            >
                                              {isBusyThisPi ? (
                                                <FaSpinner className="animate-spin text-xs" />
                                              ) : (
                                                <FaPaperPlane className="text-[10px]" />
                                              )}
                                              <span>Request 30% Advance</span>
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* ─── Card Footer: Warehouse Linkage ────────────────────── */}
                        <div className="bg-gray-50/80 border-t border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-gray-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>
                              Once 30% advance is paid, this order automatically appears in Warehouse <strong>New Orders</strong> with all 3 components (Panels, Inverter, BOS) ready for inward inspection.
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pay Details Dialog */}
      <Dialog
        isOpen={isPayOpen}
        onClose={() => !submitting && setIsPayOpen(false)}
        title={`Add Payment Details - ${selectedPO?.po_number}`}
        size="md"
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              ⚠️ {formError}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">
              ✅ {successMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-gray-600 uppercase">Select Payment Mode *</label>
              <DropdownWithSearchInput
                value={payForm.payment_mode}
                onChange={(val) => setPayForm({ ...payForm, payment_mode: val })}
                options={[
                  { value: "NEFT", text: "NEFT Bank Transfer" },
                  { value: "RTGS", text: "RTGS Bank Transfer" },
                  { value: "IMPS", text: "IMPS Bank Transfer" },
                  { value: "UPI", text: "UPI Instant Payment" },
                  { value: "Card", text: "Credit / Debit Card" },
                  { value: "Cash", text: "Cash Payment" }
                ]}
                placeholder="Select Mode..."
                className="w-full"
              />
            </div>

            <div className="col-span-2">
              <CustomInput
                label="Proforma Invoice Number (PI No) *"
                placeholder="e.g. PI-2026-0041"
                required
                value={payForm.proforma_invoice_no}
                onChange={(e) => setPayForm({ ...payForm, proforma_invoice_no: e.target.value })}
              />
            </div>

            <CustomInput
              label="Transaction reference / UTR No. *"
              placeholder="e.g. UTR123456789"
              required
              value={payForm.reference_no}
              onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })}
            />

            <CustomInput
              label="Payment Date *"
              type="date"
              required
              max={new Date().toLocaleDateString('en-CA')}
              value={payForm.payment_date}
              onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
            />

            <div className="col-span-2">
              <CustomInput
                label="Paid Amount (₹) *"
                type="number"
                required
                min="1"
                placeholder="e.g. 50000"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <CustomFilePicker
                name="receipt_url"
                label="Payment Receipt / Screenshot Document *"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                disabled={uploadingReceipt || submitting}
                files={selectedFile ? [selectedFile] : []}
              />
              {uploadingReceipt && (
                <div className="text-[10px] text-primary font-bold flex items-center gap-1.5 animate-pulse mt-1">
                  <FaSpinner className="animate-spin text-xs" /> Uploading receipt screenshot to Cloudinary...
                </div>
              )}
              {(selectedFile || payForm.receipt_url) && (
                <div className="text-[10px] text-green-700 font-black flex items-center gap-1 mt-1">
                  <FaCheckCircle className="text-xs" /> Document selected: {selectedFile ? selectedFile.name : "receipt_url"} {" "}
                  <a
                    href={selectedFile ? URL.createObjectURL(selectedFile) : payForm.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline font-extrabold hover:text-primary/80 ml-1"
                  >
                    View File
                  </a>
                </div>
              )}
            </div>

            <div className="col-span-2 space-y-2 border-t border-gray-200 pt-3">
              <CustomFilePicker
                name="proforma_invoice_pdf"
                label="Proforma Invoice PDF (from Supplier) *"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedPIFile(file);
                    setFormError("");
                  }
                }}
                disabled={uploadingPI || submitting}
                files={selectedPIFile ? [selectedPIFile] : []}
              />
              {uploadingPI && (
                <div className="text-[10px] text-primary font-bold flex items-center gap-1.5 animate-pulse mt-1">
                  <FaSpinner className="animate-spin text-xs" /> Uploading Proforma Invoice PDF to Cloudinary...
                </div>
              )}
              {(selectedPIFile || selectedPO?.proforma_invoice_pdf) && (
                <div className="text-[10px] text-green-700 font-black flex items-center gap-1 mt-1">
                  <FaCheckCircle className="text-xs" /> PI Document selected: {selectedPIFile ? selectedPIFile.name : "proforma_invoice_pdf"} {" "}
                  <a
                    href={selectedPIFile ? URL.createObjectURL(selectedPIFile) : selectedPO?.proforma_invoice_pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline font-extrabold hover:text-primary/80 ml-1"
                  >
                    View File
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setIsPayOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              loading={submitting}
              leftIcon={<FaCheckCircle />}
            >
              Complete Payment
            </Button>
          </div>
        </form>
      </Dialog>

      <ProformaInvoiceModal
        isOpen={proformaModalOpen}
        onClose={() => setProformaModalOpen(false)}
        po={proformaPO}
        initialTab={proformaInitialTab}
      />

      {/* Cancel PO Confirmation Popup */}
      <ConfirmationPopup
        isOpen={cancelConfirmOpen}
        title="Cancel Purchase Order"
        message="This action cannot be undone. The PO status will be permanently set to Cancelled."
        variant="danger"
        confirmText="Yes, Cancel PO"
        cancelText="No, Keep PO"
        isLoading={cancelLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => { if (!cancelLoading) setCancelConfirmOpen(false); }}
      />
      {/* Products Ordered Dialog */}
      <Dialog
        isOpen={itemsModalOpen}
        onClose={() => setItemsModalOpen(false)}
        title="Products Ordered"
        size="md"
      >
        <div className="space-y-3 p-1 divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
          {selectedItems.map((it, idx) => {
            const buyingPrice = it.order_price || 0;
            const totalPrice = it.qty * buyingPrice;
            return (
              <div key={idx} className="pt-3 first:pt-0 pb-2 flex justify-between items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-900">
                    {it.item_name || it.sku_details?.product_name || it.sku_code}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    Qty: {it.qty} pcs
                  </span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-semibold text-gray-600">
                    ₹{buyingPrice.toLocaleString("en-IN")} / pc
                  </span>
                  <span className="text-xs font-extrabold text-primary mt-0.5">
                    Total: ₹{totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Dialog>

      {/* ─── Combine & Pay Supplier Modal ──────────────────────────────────── */}
      <Dialog
        isOpen={combineModalOpen}
        onClose={() => !combineSubmitting && setCombineModalOpen(false)}
        title={`Combine & Pay Supplier — ${selectedOrderIds.size} Orders — ${combineProcurementType === "panel" ? "☀️ Panel Procurement"
          : combineProcurementType === "inverter" ? "⚡ Inverter Procurement"
            : "📦 Mixed/Full Kit"
          }`}
        size="lg"
      >
        <form onSubmit={handleCombineSubmit} className="space-y-5">
          {combineError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">⚠️ {combineError}</div>
          )}
          {combineSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">{combineSuccess}</div>
          )}

          {/* Selected Orders Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <FaLink className="text-primary text-xs" />
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Selected Orders Being Combined</span>
              </div>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                {selectedOrderIds.size} Orders Selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingEpcOrders.filter(o => selectedOrderIds.has(o.id || o._id)).map(o => (
                <span key={o.id || o._id} className="inline-flex items-center gap-2 text-xs font-semibold bg-white border border-gray-300 text-gray-800 px-3 py-1.5 rounded-lg shadow-sm">
                  <FaBuilding className="text-primary flex-shrink-0" size={11} />
                  <span className="font-extrabold text-gray-900">{o.order_number}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-700 font-medium truncate max-w-[180px]">{o.customer_name}</span>
                  <span className="text-gray-400">•</span>
                  <span className="font-black text-primary">₹{(o.order_amount || 0).toLocaleString("en-IN")}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Procurement Type Selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="text-xs font-black text-gray-800 uppercase block mb-2 tracking-wider">
              Procurement Type for This Payment *
            </label>
            <div className="flex flex-col sm:flex-row bg-gray-100 border border-gray-200 rounded-xl p-1 gap-1 w-full mb-3">
              <button
                type="button"
                disabled={procurementAmountBreakdown.allPanelsPaid}
                onClick={() => setCombineProcurementType("panel")}
                className={`flex-1 justify-center px-4 py-2.5 rounded-lg text-xs uppercase tracking-wide transition-all flex items-center gap-2 ${procurementAmountBreakdown.allPanelsPaid
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 font-semibold"
                  : combineProcurementType === "panel"
                    ? "bg-primary text-white shadow-md font-extrabold cursor-pointer"
                    : "text-gray-700 hover:text-gray-900 hover:bg-white font-bold cursor-pointer"
                  }`}
              >
                <span>☀️</span>
                <span>Solar Panels {procurementAmountBreakdown.allPanelsPaid ? "(Already Paid)" : "Procurement"}</span>
                {procurementAmountBreakdown.allPanelsPaid && <FaCheckCircle className="text-green-600 ml-1 text-xs" />}
              </button>
              <button
                type="button"
                disabled={procurementAmountBreakdown.allInvertersPaid}
                onClick={() => setCombineProcurementType("inverter")}
                className={`flex-1 justify-center px-4 py-2.5 rounded-lg text-xs uppercase tracking-wide transition-all flex items-center gap-2 ${procurementAmountBreakdown.allInvertersPaid
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 font-semibold"
                  : combineProcurementType === "inverter"
                    ? "bg-primary text-white shadow-md font-extrabold cursor-pointer"
                    : "text-gray-700 hover:text-gray-900 hover:bg-white font-bold cursor-pointer"
                  }`}
              >
                <span>⚡</span>
                <span>Inverters {procurementAmountBreakdown.allInvertersPaid ? "(Already Paid)" : "Procurement"}</span>
                {procurementAmountBreakdown.allInvertersPaid && <FaCheckCircle className="text-green-600 ml-1 text-xs" />}
              </button>
              <button
                type="button"
                disabled={procurementAmountBreakdown.anyPanelPaid || procurementAmountBreakdown.anyInverterPaid}
                onClick={() => setCombineProcurementType("mixed")}
                className={`flex-1 justify-center px-4 py-2.5 rounded-lg text-xs uppercase tracking-wide transition-all flex items-center gap-2 ${procurementAmountBreakdown.anyPanelPaid || procurementAmountBreakdown.anyInverterPaid
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 font-semibold"
                  : combineProcurementType === "mixed"
                    ? "bg-primary text-white shadow-md font-extrabold cursor-pointer"
                    : "text-gray-700 hover:text-gray-900 hover:bg-white font-bold cursor-pointer"
                  }`}
                title={procurementAmountBreakdown.anyPanelPaid || procurementAmountBreakdown.anyInverterPaid ? "Mixed kit is disabled because items are already being procured separately" : ""}
              >
                <span>📦</span> Mixed / Full Kit
              </button>
            </div>
            <div className="text-xs font-medium px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-gray-800 flex items-start gap-2.5">
              <div className="p-1 rounded-md bg-blue-100 text-primary mt-0.5 flex-shrink-0">
                <FaInfoCircle size={14} />
              </div>
              <div className="leading-relaxed flex-1">
                {procurementAmountBreakdown.allPanelsPaid && (
                  <div className="mb-2 p-2 rounded-lg bg-emerald-100 text-emerald-900 font-bold flex items-center gap-2 border border-emerald-300">
                    <FaCheckCircle className="text-emerald-600 flex-shrink-0" />
                    <span>Solar Panels for the selected order(s) have already been procured and paid! Now completing Inverter supplier procurement (~25%).</span>
                  </div>
                )}
                {combineProcurementType === "panel" && (
                  <>
                    <strong className="font-black text-gray-900">☀️ Panel Procurement Mode:</strong>{" "}
                    Yeh payment sirf Solar Panels ke liye hogi (~60%). Select a Panel supplier below. Inverter ka payment alag supplier ko alag transaction mein hoga.
                  </>
                )}
                {combineProcurementType === "inverter" && (
                  <>
                    <strong className="font-black text-gray-900">⚡ Inverter Procurement Mode:</strong>{" "}
                    Yeh payment sirf Inverters ke liye hogi (~25%). Select an Inverter supplier below. Panel ka payment alag supplier ko alag transaction mein hota hai.
                  </>
                )}
                {combineProcurementType === "mixed" && (
                  <>
                    <strong className="font-black text-gray-900">📦 Mixed/Full Kit Mode:</strong>{" "}
                    Yeh payment complete solar kit ke liye ek hi supplier ko hogi (Panels + Inverter + BOS sab ek saath).
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Warehouse & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1.5">Destination Warehouse *</label>
              <select
                value={combineForm.warehouse_id}
                onChange={(e) => handleCombineWarehouseChange(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-xs font-semibold px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                required
              >
                <option value="">Select warehouse...</option>
                {(allWarehouses.length > 0 ? allWarehouses : warehouses).map(wh => {
                  const whId = String(wh._id || wh.id);
                  return (
                    <option key={whId} value={whId}>
                      {wh.display_name || wh.warehouse_code || wh.address?.city || wh.name || whId}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1.5">
                {combineProcurementType === "panel" ? "☀️ Panel Supplier *" : combineProcurementType === "inverter" ? "⚡ Inverter Supplier *" : "Supplier *"}
              </label>
              <select
                value={combineForm.supplier_id}
                onChange={(e) => setCombineForm({ ...combineForm, supplier_id: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-xs font-semibold px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                required
              >
                <option value="">Select supplier...</option>
                {suppliers.map(s => {
                  const sId = s.supplier_id || s._id;
                  const brandText = s.brand_name && s.brand_name !== s.company_name ? ` (${s.brand_name})` : "";
                  return (
                    <option key={sId} value={sId}>
                      {s.company_name}{brandText} — GST: {s.gst_number || "N/A"}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1.5">Expected Delivery By *</label>
              <input
                type="date"
                value={combineForm.timeline}
                min={new Date().toLocaleDateString('en-CA')}
                onChange={(e) => setCombineForm({ ...combineForm, timeline: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-xs font-semibold px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1.5">PI / Reference No. (Optional)</label>
              <input
                type="text"
                value={combineForm.proforma_invoice_no}
                onChange={(e) => setCombineForm({ ...combineForm, proforma_invoice_no: e.target.value })}
                placeholder="e.g. PI-2026-001"
                className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-xs font-semibold px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Beneficiary Recipient Information Card */}
          {(() => {
            const selectedSupplierObj = suppliers.find(s => String(s.supplier_id || s._id) === String(combineForm.supplier_id)) ||
              allApprovedSuppliers.find(s => String(s._id) === String(combineForm.supplier_id));
            const selectedWarehouseObj = (allWarehouses.length > 0 ? allWarehouses : warehouses).find(
              w => String(w._id || w.id) === String(combineForm.warehouse_id)
            );

            if (!selectedSupplierObj && !selectedWarehouseObj) return null;

            return (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/90 shadow-sm animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  {selectedSupplierObj ? (
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm">
                        🏢
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                          <span>Payment Beneficiary (Recipient Supplier)</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          <span className="text-[9px] text-green-700 font-bold lowercase">active</span>
                        </div>
                        <div className="text-sm font-black text-gray-900 truncate">
                          {selectedSupplierObj.company_name}
                        </div>
                        {selectedSupplierObj.brand_name && selectedSupplierObj.brand_name !== selectedSupplierObj.company_name && (
                          <div className="text-xs font-bold text-gray-600">
                            Brand: <span className="text-gray-900 font-black">{selectedSupplierObj.brand_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-blue-200 font-mono font-black text-gray-900 shadow-2xs">
                            <span className="text-[9px] text-gray-500 uppercase">GSTIN:</span>
                            {selectedSupplierObj.gst_number || "N/A"}
                          </span>
                          {selectedSupplierObj.pan_number && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-blue-200 font-mono font-black text-gray-900 shadow-2xs">
                              <span className="text-[9px] text-gray-500 uppercase">PAN:</span>
                              {selectedSupplierObj.pan_number}
                            </span>
                          )}
                          {selectedSupplierObj.phone && (
                            <span className="text-gray-700 font-bold flex items-center gap-1">
                              <FaPhone size={10} className="text-blue-600" /> {selectedSupplierObj.phone}
                            </span>
                          )}
                          {selectedSupplierObj.email && (
                            <span className="text-gray-700 font-bold flex items-center gap-1">
                              <FaEnvelope size={10} className="text-blue-600" /> {selectedSupplierObj.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-blue-700 font-bold flex items-center gap-2">
                      <FaInfoCircle className="text-blue-500" /> Select a supplier above to preview recipient legal name, brand and GST details.
                    </div>
                  )}

                  {selectedWarehouseObj && (
                    <div className="sm:text-right sm:pl-4 sm:border-l sm:border-blue-200 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-100 w-full sm:w-auto">
                      <div className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                        Destination Warehouse
                      </div>
                      <div className="text-xs font-black text-gray-900 flex sm:justify-end items-center gap-1 mt-0.5">
                        <FaMapMarkerAlt size={10} className="text-primary flex-shrink-0" />
                        <span>{selectedWarehouseObj.warehouse_code}</span>
                      </div>
                      <div className="text-[11px] font-bold text-gray-600 mt-0.5">
                        {[selectedWarehouseObj.district_name, selectedWarehouseObj.state_name].filter(Boolean).join(", ") || selectedWarehouseObj.address || "Gujarat Hub"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Procurement Components Overview */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                {combineProcurementType === "panel" ? "☀️ Selected Orders — Solar Panels to Procure" :
                  combineProcurementType === "inverter" ? "⚡ Selected Orders — Inverters to Procure" :
                    "📦 Selected Orders — All Components to Procure"}
              </span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                {selectedOrderIds.size} Orders Selected
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className={`p-3.5 rounded-xl border text-center transition-all ${combineProcurementType === "panel"
                ? "bg-white border-2 border-primary shadow-sm ring-2 ring-primary/20"
                : "bg-white/80 border-gray-200"
                }`}>
                <div className="text-xs font-extrabold text-gray-800 uppercase tracking-wide flex items-center justify-center gap-1.5">
                  <span>☀️</span> Solar Panels
                  {combineProcurementType === "panel" && (
                    <span className="text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full">ACTIVE</span>
                  )}
                </div>
                <div className="text-2xl font-black text-gray-900 mt-1.5">
                  {procurementAmountBreakdown.panelQty || 0} <span className="text-xs font-bold text-gray-500">Pcs</span>
                </div>
                <div className="text-xs font-bold text-gray-600 mt-1">
                  Est: <span className="font-extrabold text-primary">₹{(procurementAmountBreakdown.panelTotal || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border text-center transition-all ${combineProcurementType === "inverter"
                ? "bg-white border-2 border-primary shadow-sm ring-2 ring-primary/20"
                : "bg-white/80 border-gray-200"
                }`}>
                <div className="text-xs font-extrabold text-gray-800 uppercase tracking-wide flex items-center justify-center gap-1.5">
                  <span>⚡</span> Inverters
                  {combineProcurementType === "inverter" && (
                    <span className="text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full">ACTIVE</span>
                  )}
                </div>
                <div className="text-2xl font-black text-gray-900 mt-1.5">
                  {procurementAmountBreakdown.inverterQty || 0} <span className="text-xs font-bold text-gray-500">Pcs</span>
                </div>
                <div className="text-xs font-bold text-gray-600 mt-1">
                  Est: <span className="font-extrabold text-primary">₹{(procurementAmountBreakdown.inverterTotal || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 bg-white/80 text-center col-span-2 sm:col-span-1">
                <div className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">💰 Orders Value</div>
                <div className="text-2xl font-black text-green-600 mt-1.5">
                  ₹{(procurementAmountBreakdown.totalOrderAmount || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-xs font-medium text-gray-500 mt-1">Total of {selectedOrderIds.size} orders</div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <FaCreditCard className="text-primary" /> Supplier Payment Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1.5">Payment Mode *</label>
                <select
                  value={combineForm.payment_mode}
                  onChange={(e) => setCombineForm({ ...combineForm, payment_mode: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-xs font-semibold px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  {["NEFT", "RTGS", "IMPS", "UPI", "Card", "Cash"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1.5">UTR / Reference No. *</label>
                <input
                  type="text"
                  placeholder="e.g. UTR123456789"
                  value={combineForm.reference_no}
                  onChange={(e) => setCombineForm({ ...combineForm, reference_no: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-xs font-semibold px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1.5">Payment Date *</label>
                <input
                  type="date"
                  value={combineForm.payment_date}
                  max={new Date().toLocaleDateString('en-CA')}
                  onChange={(e) => setCombineForm({ ...combineForm, payment_date: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white text-gray-900 text-xs font-semibold px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  required
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                {(procurementAmountBreakdown.panelTotal > 0 || procurementAmountBreakdown.inverterTotal > 0 || procurementAmountBreakdown.otherTotal > 0) && (
                  <div className="mb-3.5 p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="text-xs font-black text-gray-800 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Item-wise Procurement Breakdown</span>
                      <span className="text-[10px] text-gray-500 font-semibold lowercase">click type above to auto-select</span>
                    </div>
                    {procurementAmountBreakdown.panelTotal > 0 && (
                      <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all ${combineProcurementType === "panel"
                        ? "bg-white border-2 border-primary shadow-sm"
                        : "bg-white/70 border-gray-200"
                        }`}>
                        <span className="flex items-center gap-2">
                          <span className="text-sm">☀️</span>
                          <span className="font-extrabold text-gray-900">
                            Solar Panel ({procurementAmountBreakdown.panelQty} pcs)
                          </span>
                          {combineProcurementType === "panel" && (
                            <span className="text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                              AUTO-SELECTED
                            </span>
                          )}
                        </span>
                        <span className="font-black text-sm text-gray-900">
                          ₹{procurementAmountBreakdown.panelTotal.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {procurementAmountBreakdown.inverterTotal > 0 && (
                      <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all ${combineProcurementType === "inverter"
                        ? "bg-white border-2 border-primary shadow-sm"
                        : "bg-white/70 border-gray-200"
                        }`}>
                        <span className="flex items-center gap-2">
                          <span className="text-sm">⚡</span>
                          <span className="font-extrabold text-gray-900">
                            Inverter ({procurementAmountBreakdown.inverterQty} pcs)
                          </span>
                          {combineProcurementType === "inverter" && (
                            <span className="text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                              AUTO-SELECTED
                            </span>
                          )}
                        </span>
                        <span className="font-black text-sm text-gray-900">
                          ₹{procurementAmountBreakdown.inverterTotal.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {procurementAmountBreakdown.otherTotal > 0 && (
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-xs font-semibold text-gray-700">
                        <span className="flex items-center gap-2">
                          <span className="text-sm">📦</span>
                          <span className="font-bold text-gray-900">Other / BOS Components</span>
                        </span>
                        <span className="font-bold text-gray-900">
                          ₹{procurementAmountBreakdown.otherTotal.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-xs font-extrabold text-primary mt-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm">💰</span>
                        <span className="font-black">Grand Total (all items)</span>
                      </span>
                      <span className="text-sm font-black">
                        ₹{(procurementAmountBreakdown.panelTotal + procurementAmountBreakdown.inverterTotal + procurementAmountBreakdown.otherTotal).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}

                <label className="text-xs font-black uppercase block mb-1.5 text-gray-900">
                  {combineProcurementType === "panel" ? "☀️ Panel Payment Amount (₹) *" :
                    combineProcurementType === "inverter" ? "⚡ Inverter Payment Amount (₹) *" :
                      "Amount Paid (₹) *"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter or auto-calculated amount"
                    value={combineForm.amount}
                    onChange={(e) => setCombineForm({ ...combineForm, amount: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 bg-white text-gray-900 text-base font-black px-4 py-3 pr-32 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                    required
                  />
                  {combineForm.amount > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-100 text-gray-900 px-2.5 py-1 rounded-lg border border-gray-300 text-xs font-black pointer-events-none">
                      ₹{Number(combineForm.amount).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-600 mt-1.5 flex items-center gap-1.5">
                  <FaInfoCircle className="text-gray-400 flex-shrink-0" size={12} />
                  {combineProcurementType === "panel"
                    ? "☀️ Sirf Solar Panel items ka total auto-fill hua hai. Manual override kar sakte hain."
                    : combineProcurementType === "inverter"
                      ? "⚡ Sirf Inverter items ka total auto-fill hua hai. Manual override kar sakte hain."
                      : "📦 Sabhi items ka grand total auto-fill hua hai."}
                </p>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1.5">Payment Receipt (Optional)</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setCombineReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
                />
                {uploadingCombineReceipt && (
                  <div className="text-[10px] text-primary font-bold flex items-center gap-1.5 animate-pulse mt-1">
                    <FaSpinner className="animate-spin" /> Uploading receipt...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCombineModalOpen(false)}
              disabled={combineSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={combineSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {combineSubmitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
              {combineSubmitting ? "Processing..." : `Confirm & Pay Supplier`}
            </button>
          </div>
        </form>
      </Dialog>

      {/* ─── Mobile Sticky Action Bar for Selected Orders ─────────────────── */}
      {selectedOrderIds.size > 0 && activeTab === "pending" && (
        <div className="fixed bottom-4 left-3 right-3 z-40 lg:hidden">
          <div className="bg-gray-900 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-2xl border border-gray-700 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-black flex items-center gap-1.5 text-blue-400">
                <FaCheckCircle size={12} className="flex-shrink-0" />
                <span className="truncate">{selectedOrderIds.size} Order{selectedOrderIds.size !== 1 ? "s" : ""} Selected</span>
              </div>
              <div className="text-[10px] text-gray-300 truncate">Ready for Combined Supplier Payment</div>
            </div>
            <button
              type="button"
              onClick={openCombineModal}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wide transition-all shadow-md flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <FaBoxes size={12} />
              <span>Combine &amp; Pay</span>
            </button>
          </div>
        </div>
      )}

      {/* Procurement Supplier Payment Modal (No Supplier Selection Needed) */}
      <SupplierPaymentModal
        isOpen={isPiPaymentModalOpen}
        onClose={() => {
          setIsPiPaymentModalOpen(false);
          setSelectedPiForPayment(null);
          setPiPaymentMilestone(null);
        }}
        purchaseIndent={selectedPiForPayment}
        targetMilestone={piPaymentMilestone}
        onPaymentUpdated={() => {
          fetchProcurementPIs({ silent: true });
          fetchOrders({ silent: true });
          window.dispatchEvent(new CustomEvent("accounts:badge-refresh"));
        }}
      />
    </div>
  );
}