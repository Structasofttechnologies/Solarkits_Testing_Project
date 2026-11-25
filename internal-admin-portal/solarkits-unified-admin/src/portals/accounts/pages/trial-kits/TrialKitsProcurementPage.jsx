import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { authHeaderObj } from "../../app/authHeader";
import {
  FaBoxes,
  FaFileInvoice,
  FaCreditCard,
  FaTruckLoading,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaWarehouse,
  FaSearch,
  FaFilter,
  FaClock,
  FaCalendarAlt,
  FaCheck,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaMoneyBillWave,
  FaSolarPanel,
  FaBolt,
  FaTools,
  FaBuilding,
  FaChevronDown,
  FaChevronUp,
  FaPlus
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiCheck, FiSliders } from "react-icons/fi";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/account-api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.replace(/\/account-api$|\/admin-api$|\/api$/, "");
const BASE_URL = `${API_BASE}/account-api/trial-kits`;

// Canonical Warehouse Name Resolver Helper
const getWarehouseLabel = (item) => {
  if (!item) return "Warehouse";
  const code = item.warehouse_code || item.warehouse_id?.warehouse_code || "";
  const name = item.warehouse_name || item.warehouse_id?.warehouse_name || "";
  if (name && name !== code && !name.startsWith("IND_")) {
    return name;
  }
  if (code === "IND_GUJ_001") return "Ahmedabad Central Warehouse";
  if (code === "IND_GUJ_002") return "Surat Regional Warehouse";
  if (item.warehouse_id?.city || item.warehouse_id?.state) {
    return `${item.warehouse_id.city || item.warehouse_id.state} Warehouse`;
  }
  return name || code || "Warehouse";
};

export default function TrialKitsProcurementPage() {
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeProcurement, setActiveProcurement] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Inward Initiation State (Shifted to Accounts Panel)
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [inwardSubmitting, setInwardSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [comboKits, setComboKits] = useState([]);
  const [inwardForm, setInwardForm] = useState({
    combo_kit_id: "",
    warehouse_id: "",
    inward_quantity: 10
  });

  // Component Breakdown & Multi-Supplier State
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownData, setBreakdownData] = useState(null);
  const [showBosDetails, setShowBosDetails] = useState(false);

  // Stream 1: Solar Panels Payment Form (Statutory 12% GST)
  const [panelPayment, setPanelPayment] = useState({
    group_type: "panel",
    group_title: "",
    supplier_id: "",
    supplier_name: "",
    supplier_brand: "",
    supplier_gst: "",
    base_amount_inr: 0,
    gst_rate_percent: 12,
    payment_mode: "bank_transfer_neft_rtgs",
    transaction_utr_no: "",
    payment_date: new Date().toISOString().split("T")[0],
    company_bank_account: "HDFC Bank - Current A/C (Solarkits Corp)",
    vendor_bank_account: "",
    payment_receipt_url: "",
    remarks: "Solar PV Modules payment"
  });

  // Stream 2: Solar Inverters Payment Form (Statutory 18% GST)
  const [inverterPayment, setInverterPayment] = useState({
    group_type: "inverter",
    group_title: "",
    supplier_id: "",
    supplier_name: "",
    supplier_brand: "",
    supplier_gst: "",
    base_amount_inr: 0,
    gst_rate_percent: 18,
    payment_mode: "bank_transfer_neft_rtgs",
    transaction_utr_no: "",
    payment_date: new Date().toISOString().split("T")[0],
    company_bank_account: "HDFC Bank - Current A/C (Solarkits Corp)",
    vendor_bank_account: "",
    payment_receipt_url: "",
    remarks: "Solar Inverters payment"
  });

  // Stream 3: BOS Components Payment Form (Statutory 18% GST)
  const [bosPayment, setBosPayment] = useState({
    group_type: "bos",
    group_title: "",
    supplier_id: "",
    supplier_name: "Solarkits OEM / Polycab / L&T",
    supplier_brand: "Electrical Protection Bundle",
    supplier_gst: "",
    base_amount_inr: 0,
    gst_rate_percent: 18,
    payment_mode: "bank_transfer_neft_rtgs",
    transaction_utr_no: "",
    payment_date: new Date().toISOString().split("T")[0],
    company_bank_account: "HDFC Bank - Current A/C (Solarkits Corp)",
    vendor_bank_account: "",
    payment_receipt_url: "",
    remarks: "BOS Electrical & Mounting accessories payment"
  });

  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [dossierItem, setDossierItem] = useState(null);

  // Fetch Data (Procurements + Available Warehouses & Combo Kits for Inward)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [procRes, stockRes] = await Promise.all([
        axios.get(`${BASE_URL}/procurement/list?limit=150`, { headers: authHeaderObj() }),
        axios.get(`${BASE_URL}/stock`, { headers: authHeaderObj() }).catch(() => ({ data: { success: false } }))
      ]);

      if (procRes.data?.success) {
        setProcurements(procRes.data.data || []);
      }
      if (stockRes.data?.success) {
        setComboKits(stockRes.data.data || []);
        setWarehouses(stockRes.data.warehouses || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load trial kit procurement records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Selected warehouse details for banner display in inward modal
  const selectedWarehouse = useMemo(() => {
    return warehouses.find((w) => String(w._id) === String(inwardForm.warehouse_id)) || null;
  }, [warehouses, inwardForm.warehouse_id]);

  // Open Inward Initiation Modal
  const handleOpenInwardModal = () => {
    const defaultWh = inwardForm.warehouse_id || warehouses[0]?._id || "";
    const defaultKit = inwardForm.combo_kit_id || comboKits[0]?.combo_kit_id || comboKits[0]?._id || "";
    setInwardForm({
      combo_kit_id: defaultKit,
      warehouse_id: defaultWh,
      inward_quantity: 10
    });
    setShowInwardModal(true);
  };

  // Submit Inward Request (GRN) to Accounts & Admin
  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    try {
      setInwardSubmitting(true);
      setError("");
      const payload = {
        combo_kit_id: inwardForm.combo_kit_id,
        warehouse_id: inwardForm.warehouse_id,
        inward_quantity: parseInt(inwardForm.inward_quantity, 10)
      };

      const res = await axios.post(`${BASE_URL}/procurement/request`, payload, {
        headers: authHeaderObj()
      });

      if (res.data?.success) {
        setSuccess(res.data.message || "Trial kit inward request initiated successfully!");
        setShowInwardModal(false);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate trial kit inward request.");
    } finally {
      setInwardSubmitting(false);
    }
  };

  // Open Payment Entry Modal & Fetch Dynamic BOM Breakdown
  const handleOpenPayment = async (proc) => {
    setActiveProcurement(proc);
    setError("");
    setBreakdownLoading(true);
    setPaymentModalOpen(true);

    try {
      const res = await axios.get(`${BASE_URL}/procurement/${proc._id}/component-breakdown`, {
        headers: authHeaderObj()
      });

      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setBreakdownData(d);

        const suppliers = d.approved_suppliers || [];
        const panelSup = suppliers[0] || {};
        const invSup = suppliers[1] || suppliers[0] || {};

        const panels = d.breakdown?.panels;
        const inverters = d.breakdown?.inverters;
        const bos = d.breakdown?.bos;

        // Check if existing payments exist
        const existingSp = proc.supplier_payments || [];
        const exPanel = existingSp.find((s) => s.group_type === "panel") || {};
        const exInv = existingSp.find((s) => s.group_type === "inverter") || {};
        const exBos = existingSp.find((s) => s.group_type === "bos") || {};

        const panelBase = exPanel.base_amount_inr || panels?.subtotal_amount || 0;
        const invBase = exInv.base_amount_inr || inverters?.subtotal_amount || 0;
        const bosBase = exBos.base_amount_inr || bos?.subtotal_amount || 0;

        const dateStr = new Date().toISOString().split("T")[0];

        setPanelPayment({
          group_type: "panel",
          group_title: panels?.group_title || `Solar PV Modules (${panels?.total_quantity || 0} Pcs)`,
          supplier_id: exPanel.supplier_id || panelSup._id || "",
          supplier_name: exPanel.supplier_name || panelSup.company_name || "MINDRA GREEN ENERGY LLP",
          supplier_brand: exPanel.supplier_brand || panelSup.brand_name || "Mindra",
          supplier_gst: exPanel.supplier_gst || panelSup.gst_number || "",
          base_amount_inr: panelBase,
          gst_rate_percent: exPanel.gst_rate_percent !== undefined ? exPanel.gst_rate_percent : (panels?.gst_rate_percent || 12),
          payment_mode: exPanel.payment_mode || "bank_transfer_neft_rtgs",
          transaction_utr_no: exPanel.transaction_utr_no || `UTR-PANEL-${Date.now().toString().slice(-6)}`,
          payment_date: exPanel.payment_date ? new Date(exPanel.payment_date).toISOString().split("T")[0] : dateStr,
          company_bank_account: exPanel.company_bank_account || "HDFC Bank - Current A/C (Solarkits Corp)",
          vendor_bank_account: exPanel.vendor_bank_account || "",
          payment_receipt_url: exPanel.payment_receipt_url || "",
          remarks: exPanel.remarks || `Disbursed payment for ${panels?.total_quantity || 0} Solar Panels`
        });

        setInverterPayment({
          group_type: "inverter",
          group_title: inverters?.group_title || `Solar Inverters (${inverters?.total_quantity || 0} Pcs)`,
          supplier_id: exInv.supplier_id || invSup._id || "",
          supplier_name: exInv.supplier_name || invSup.company_name || "REDREN ENERGY PRIVATE LIMITED",
          supplier_brand: exInv.supplier_brand || invSup.brand_name || "Redren",
          supplier_gst: exInv.supplier_gst || invSup.gst_number || "",
          base_amount_inr: invBase,
          gst_rate_percent: exInv.gst_rate_percent !== undefined ? exInv.gst_rate_percent : (inverters?.gst_rate_percent || 18),
          payment_mode: exInv.payment_mode || "bank_transfer_neft_rtgs",
          transaction_utr_no: exInv.transaction_utr_no || `UTR-INV-${Date.now().toString().slice(-6)}`,
          payment_date: exInv.payment_date ? new Date(exInv.payment_date).toISOString().split("T")[0] : dateStr,
          company_bank_account: exInv.company_bank_account || "HDFC Bank - Current A/C (Solarkits Corp)",
          vendor_bank_account: exInv.vendor_bank_account || "",
          payment_receipt_url: exInv.payment_receipt_url || "",
          remarks: exInv.remarks || `Disbursed payment for ${inverters?.total_quantity || 0} Solar Inverters`
        });

        setBosPayment({
          group_type: "bos",
          group_title: bos?.group_title || "BOS Components & Electrical Protection Bundle",
          supplier_id: exBos.supplier_id || "",
          supplier_name: exBos.supplier_name || "Solarkits OEM / Polycab / L&T",
          supplier_brand: exBos.supplier_brand || "Electrical Protection & Accessories",
          supplier_gst: exBos.supplier_gst || "",
          base_amount_inr: bosBase,
          gst_rate_percent: exBos.gst_rate_percent !== undefined ? exBos.gst_rate_percent : (bos?.gst_rate_percent || 18),
          payment_mode: exBos.payment_mode || "bank_transfer_neft_rtgs",
          transaction_utr_no: exBos.transaction_utr_no || `UTR-BOS-${Date.now().toString().slice(-6)}`,
          payment_date: exBos.payment_date ? new Date(exBos.payment_date).toISOString().split("T")[0] : dateStr,
          company_bank_account: exBos.company_bank_account || "HDFC Bank - Current A/C (Solarkits Corp)",
          vendor_bank_account: exBos.vendor_bank_account || "",
          payment_receipt_url: exBos.payment_receipt_url || "",
          remarks: exBos.remarks || "Disbursed payment for BOS electrical & mounting kit"
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load kit component breakdown.");
    } finally {
      setBreakdownLoading(false);
    }
  };

  // Live Multi-Supplier Totals Calculation
  const multiSupplierTotals = useMemo(() => {
    const pBase = Number(panelPayment.base_amount_inr) || 0;
    const pGstRate = Number(panelPayment.gst_rate_percent) || 0;
    const pGst = Math.round(pBase * (pGstRate / 100) * 100) / 100;
    const pTotal = Math.round((pBase + pGst) * 100) / 100;

    const iBase = Number(inverterPayment.base_amount_inr) || 0;
    const iGstRate = Number(inverterPayment.gst_rate_percent) || 0;
    const iGst = Math.round(iBase * (iGstRate / 100) * 100) / 100;
    const iTotal = Math.round((iBase + iGst) * 100) / 100;

    const bBase = Number(bosPayment.base_amount_inr) || 0;
    const bGstRate = Number(bosPayment.gst_rate_percent) || 0;
    const bGst = Math.round(bBase * (bGstRate / 100) * 100) / 100;
    const bTotal = Math.round((bBase + bGst) * 100) / 100;

    const totalBase = Math.round((pBase + iBase + bBase) * 100) / 100;
    const totalGst = Math.round((pGst + iGst + bGst) * 100) / 100;
    const grandTotal = Math.round((pTotal + iTotal + bTotal) * 100) / 100;
    const effectiveRate = totalBase > 0 ? ((totalGst / totalBase) * 100).toFixed(2) : "0.00";

    return {
      panels: { base: pBase, gst: pGst, total: pTotal },
      inverters: { base: iBase, gst: iGst, total: iTotal },
      bos: { base: bBase, gst: bGst, total: bTotal },
      totalBase,
      totalGst,
      grandTotal,
      effectiveRate
    };
  }, [panelPayment, inverterPayment, bosPayment]);

  // Submit Multi-Supplier Payment Record
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!activeProcurement) return;

    if (!panelPayment.transaction_utr_no?.trim() || !inverterPayment.transaction_utr_no?.trim() || !bosPayment.transaction_utr_no?.trim()) {
      setError("Please ensure Bank UTR / Transaction reference number is entered for all 3 supplier streams.");
      return;
    }

    try {
      setPaymentSubmitting(true);
      setError("");

      const payload = {
        supplier_payments: [
          {
            ...panelPayment,
            base_amount_inr: multiSupplierTotals.panels.base,
            gst_amount_inr: multiSupplierTotals.panels.gst,
            total_payable_inr: multiSupplierTotals.panels.total
          },
          {
            ...inverterPayment,
            base_amount_inr: multiSupplierTotals.inverters.base,
            gst_amount_inr: multiSupplierTotals.inverters.gst,
            total_payable_inr: multiSupplierTotals.inverters.total
          },
          {
            ...bosPayment,
            base_amount_inr: multiSupplierTotals.bos.base,
            gst_amount_inr: multiSupplierTotals.bos.gst,
            total_payable_inr: multiSupplierTotals.bos.total
          }
        ],
        component_breakdown: [
          ...(breakdownData?.breakdown?.panels
            ? [
              {
                group_type: "panel",
                item_name: breakdownData.breakdown.panels.item_name,
                sku_code: breakdownData.breakdown.panels.sku_code,
                sku_id: breakdownData.breakdown.panels.sku_id,
                brand_name: breakdownData.breakdown.panels.brand_name,
                quantity_per_kit: breakdownData.breakdown.panels.quantity_per_kit,
                total_quantity: breakdownData.breakdown.panels.total_quantity,
                unit_cost_price: breakdownData.breakdown.panels.unit_cost_price,
                subtotal_amount: breakdownData.breakdown.panels.subtotal_amount,
                supplier_id: panelPayment.supplier_id || null,
                supplier_name: panelPayment.supplier_name
              }
            ]
            : []),
          ...(breakdownData?.breakdown?.inverters
            ? [
              {
                group_type: "inverter",
                item_name: breakdownData.breakdown.inverters.item_name,
                sku_code: breakdownData.breakdown.inverters.sku_code,
                sku_id: breakdownData.breakdown.inverters.sku_id,
                brand_name: breakdownData.breakdown.inverters.brand_name,
                quantity_per_kit: breakdownData.breakdown.inverters.quantity_per_kit,
                total_quantity: breakdownData.breakdown.inverters.total_quantity,
                unit_cost_price: breakdownData.breakdown.inverters.unit_cost_price,
                subtotal_amount: breakdownData.breakdown.inverters.subtotal_amount,
                supplier_id: inverterPayment.supplier_id || null,
                supplier_name: inverterPayment.supplier_name
              }
            ]
            : []),
          ...(breakdownData?.breakdown?.bos?.items || []).map((bi) => ({
            ...bi,
            supplier_id: bosPayment.supplier_id || null,
            supplier_name: bosPayment.supplier_name
          }))
        ]
      };

      const res = await axios.post(
        `${BASE_URL}/procurement/${activeProcurement._id}/record-payment`,
        payload,
        { headers: authHeaderObj() }
      );

      if (res.data?.success) {
        setSuccess(res.data.message || "Supplier payments recorded successfully and submitted for Admin approval!");
        setPaymentModalOpen(false);
        setActiveProcurement(null);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const pendingPayment = procurements.filter(p => p.status === "inward_requested");
    const paymentRecorded = procurements.filter(p => p.status === "payment_recorded");
    const approved = procurements.filter(p => p.status === "approved");
    const rejected = procurements.filter(p => p.status === "rejected");

    const pendingPaymentKits = pendingPayment.reduce((sum, p) => sum + (p.inward_quantity || 0), 0);
    const approvedTotalAmount = approved.reduce((sum, p) => sum + (p.total_payable_amount_inr || 0), 0);

    return {
      pendingPaymentCount: pendingPayment.length,
      pendingPaymentKits,
      paymentRecordedCount: paymentRecorded.length,
      approvedCount: approved.length,
      approvedTotalAmount,
      rejectedCount: rejected.length
    };
  }, [procurements]);

  // Filtered List
  const filteredList = useMemo(() => {
    return procurements.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const prMatch = (p.procurement_number || "").toLowerCase().includes(q);
        const grnMatch = (p.grn_number || "").toLowerCase().includes(q);
        const kitMatch = (p.kit_type || "").toLowerCase().includes(q);
        const vendorMatch = (p.vendor_name || "").toLowerCase().includes(q);
        const challanMatch = (p.invoice_challan_number || "").toLowerCase().includes(q);
        const utrMatch = (p.payment_details?.transaction_utr_no || "").toLowerCase().includes(q);
        if (!prMatch && !grnMatch && !kitMatch && !vendorMatch && !challanMatch && !utrMatch) return false;
      }
      return true;
    });
  }, [procurements, statusFilter, searchTerm]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in">
      {/* ─────────────────────────────────────────────────────────────────────
          PAGE HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FaCreditCard className="text-purple-600" />
            Trial Kits Procurement
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <span>Warehouse Inward Indents</span>
            <span>•</span>
            <span className="font-semibold text-purple-700">Commercial Verification & UTR Entry</span>
            <span>•</span>
            <span>Admin Final Authorization</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenInwardModal}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-1.5 shadow-sm cursor-pointer transition"
          >
            <FaPlus /> Raise Trial Kit Inward
          </button>
          <button
            onClick={fetchData}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs border border-emerald-200">{success}</div>}

      {/* ─────────────────────────────────────────────────────────────────────
          KPI SUMMARY CARDS
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("inward_requested")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${statusFilter === "inward_requested" ? "bg-amber-100/70 border-amber-400" : "bg-amber-50/60 border-amber-200 hover:bg-amber-50"
            }`}
        >
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Payment</span>
            <span className="p-2 bg-amber-100 rounded-xl text-amber-800"><FaClock /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950">{metrics.pendingPaymentCount}</span>
            <span className="text-xs font-bold text-amber-700">({metrics.pendingPaymentKits} Kits)</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Warehouse inwards waiting for payment</p>
        </div>

        <div
          onClick={() => setStatusFilter("payment_recorded")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${statusFilter === "payment_recorded" ? "bg-blue-100/70 border-blue-400" : "bg-blue-50/60 border-blue-200 hover:bg-blue-50"
            }`}
        >
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting Admin Approval</span>
            <span className="p-2 bg-blue-100 rounded-xl text-blue-800"><FaFileInvoice /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-950">{metrics.paymentRecordedCount}</span>
            <span className="text-xs font-bold text-blue-700">Requests</span>
          </div>
          <p className="text-[11px] text-blue-700 mt-1">Payment entered & forwarded to Admin</p>
        </div>

        <div
          onClick={() => setStatusFilter("approved")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${statusFilter === "approved" ? "bg-emerald-100/70 border-emerald-400" : "bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50"
            }`}
        >
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-xs font-bold uppercase tracking-wider">Approved & Inwarded</span>
            <span className="p-2 bg-emerald-100 rounded-xl text-emerald-800"><FaCheckCircle /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950">{metrics.approvedCount}</span>
            <span className="text-xs font-bold text-emerald-700">
              (₹{metrics.approvedTotalAmount.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Stock active in warehouse inventory</p>
        </div>

        <div
          onClick={() => setStatusFilter("rejected")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${statusFilter === "rejected" ? "bg-red-100/70 border-red-400" : "bg-red-50/60 border-red-200 hover:bg-red-50"
            }`}
        >
          <div className="flex items-center justify-between text-red-900">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected Requests</span>
            <span className="p-2 bg-red-100 rounded-xl text-red-800"><FaTimesCircle /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-950">{metrics.rejectedCount}</span>
            <span className="text-xs font-bold text-red-700">Need Review</span>
          </div>
          <p className="text-[11px] text-red-700 mt-1">Discrepancy in invoice or payment</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          FILTERS & SEARCH
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            { id: "all", label: "All Procurements", count: procurements.length },
            { id: "inward_requested", label: "Pending Payment", count: metrics.pendingPaymentCount },
            { id: "payment_recorded", label: "Submitted for Approval", count: metrics.paymentRecordedCount },
            { id: "approved", label: "Approved / Inwarded", count: metrics.approvedCount },
            { id: "rejected", label: "Rejected", count: metrics.rejectedCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${statusFilter === tab.id
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === tab.id ? "bg-white/20 text-white" : "bg-white text-gray-700"
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search PR, GRN, Kit, Vendor, UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-purple-500 bg-gray-50/50"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          PROCUREMENT TABLE
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">PR / GRN Details</th>
                <th className="py-3 px-4">Combo Kit & Warehouse</th>
                <th className="py-3 px-4 text-center">Inward Qty</th>
                <th className="py-3 px-4">Financials & Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    <p className="font-semibold text-gray-500 mb-2">No procurement records matching criteria.</p>
                    <button
                      onClick={handleOpenInwardModal}
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <FaPlus /> Raise Trial Kit Inward
                    </button>
                  </td>
                </tr>
              ) : (
                filteredList.map((proc) => {
                  const isPendingPayment = proc.status === "inward_requested";
                  const isSubmitted = proc.status === "payment_recorded";
                  const isApproved = proc.status === "approved";
                  const isRejected = proc.status === "rejected";

                  return (
                    <tr key={proc._id} className="hover:bg-gray-50/80 transition">
                      {/* PR / GRN */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-purple-700 block text-xs">
                          {proc.procurement_number}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono block">
                          {proc.grn_number}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {proc.requested_at ? new Date(proc.requested_at).toLocaleDateString() : ""}
                        </span>
                      </td>

                      {/* Combo Kit & Warehouse */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900 block text-xs">{proc.kit_type}</span>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <FaWarehouse className="text-purple-600 text-[10px] shrink-0" />
                          <strong className="text-gray-800">{getWarehouseLabel(proc)}</strong>
                          {(proc.warehouse_code || proc.warehouse_id?.warehouse_code) && (
                            <span className="text-[9px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded-md">
                              {proc.warehouse_code || proc.warehouse_id?.warehouse_code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Inward Qty */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg text-xs border border-emerald-200">
                          +{proc.inward_quantity} Kits
                        </span>
                      </td>

                      {/* Financials & Payment */}
                      <td className="py-3 px-4">
                        {proc.total_payable_amount_inr > 0 ? (
                          <div>
                            <span className="font-extrabold text-gray-900 block text-xs">
                              ₹{proc.total_payable_amount_inr?.toLocaleString("en-IN")}
                            </span>
                            {proc.supplier_payments && proc.supplier_payments.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {proc.supplier_payments.map((sp, idx) => (
                                  <span
                                    key={idx}
                                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${sp.group_type === "panel"
                                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                                        : sp.group_type === "inverter"
                                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      }`}
                                    title={`${sp.supplier_name} • UTR: ${sp.transaction_utr_no} • ₹${sp.total_payable_inr?.toLocaleString("en-IN")}`}
                                  >
                                    {sp.group_type === "panel" ? "☀️" : sp.group_type === "inverter" ? "⚡" : "🛠️"}{" "}
                                    {sp.supplier_name.split(" ")[0]}: ₹{sp.total_payable_inr?.toLocaleString("en-IN")}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500 font-mono block">
                                UTR: {proc.payment_details?.transaction_utr_no || "Recorded"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-bold text-[10px] border border-amber-200">
                            Unpaid • Awaiting Entry
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isPendingPayment && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Pending Payment
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            Payment Submitted (Admin Pending)
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Approved & Inwarded
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPendingPayment && (
                            <button
                              onClick={() => handleOpenPayment(proc)}
                              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <FaCreditCard /> Record Payment
                            </button>
                          )}
                          {isSubmitted && (
                            <button
                              onClick={() => handleOpenPayment(proc)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 cursor-pointer inline-flex items-center gap-1"
                              title="Update payment details"
                            >
                              Edit Payment
                            </button>
                          )}
                          {isRejected && (
                            <button
                              onClick={() => handleOpenPayment(proc)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs border border-red-200 cursor-pointer inline-flex items-center gap-1"
                              title="Re-enter payment details"
                            >
                              Re-submit
                            </button>
                          )}
                          <button
                            onClick={() => { setDossierItem(proc); setDossierModalOpen(true); }}
                            className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1"
                            title="View complete 3-way match dossier"
                          >
                            <FaInfoCircle />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          RAISE TRIAL KIT INWARD REQUEST MODAL (ACCOUNTS INITIATION)
      ───────────────────────────────────────────────────────────────────── */}
      {showInwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700">
                  <FaTruckLoading className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Raise Trial Kit Inward Request</h3>
                  <p className="text-[11px] text-gray-500">
                    Initiate inward indent & forward for multi-supplier payment entry.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInwardModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Target Warehouse *</label>
                <select
                  required
                  value={inwardForm.warehouse_id}
                  onChange={(e) => setInwardForm({ ...inwardForm, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-medium text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden bg-white"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.display_label || `${wh.warehouse_name || wh.warehouse_code} (${wh.warehouse_code} • ${wh.district_name || 'Gujarat'})`}
                    </option>
                  ))}
                </select>
                {selectedWarehouse && (
                  <div className="mt-2 p-2.5 bg-purple-50/70 border border-purple-100 rounded-xl text-[11px] text-purple-900 flex items-start gap-2">
                    <FaWarehouse className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{selectedWarehouse.warehouse_name || selectedWarehouse.warehouse_code}</span>
                        <span className="font-mono text-[10px] text-purple-600 bg-purple-100/70 px-1.5 py-0.2 rounded-md">
                          {selectedWarehouse.warehouse_code}
                        </span>
                      </div>
                      <div className="text-purple-700 text-[10px] mt-0.5">
                        📍 {selectedWarehouse.clean_address || selectedWarehouse.address}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Configured Combo Kit Type *</label>
                <select
                  required
                  value={inwardForm.combo_kit_id}
                  onChange={(e) => setInwardForm({ ...inwardForm, combo_kit_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-medium text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden bg-white"
                >
                  <option value="">Select Combo Kit...</option>
                  {comboKits.map((k) => (
                    <option key={k.combo_kit_id || k._id} value={k.combo_kit_id || k._id}>
                      {k.name || k.kit_type} {k.capacity ? `(${k.capacity} kW System)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Inward Quantity (Kits) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={inwardForm.inward_quantity}
                  onChange={(e) => setInwardForm({ ...inwardForm, inward_quantity: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-bold text-purple-700 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  placeholder="e.g. 10"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inwardSubmitting || !inwardForm.warehouse_id || !inwardForm.combo_kit_id}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer transition"
                >
                  {inwardSubmitting ? (
                    <>
                      <FiRefreshCw className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <FaCheck className="w-3.5 h-3.5" /> Submit Inward Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          MULTI-SUPPLIER RECORD PAYMENT MODAL (COMPONENT-WISE PRICING)
      ───────────────────────────────────────────────────────────────────── */}
      {paymentModalOpen && activeProcurement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-100 my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700 shadow-xs">
                  <FaCreditCard className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    Record Trial Kit Multi-Supplier Payment
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 font-extrabold border border-purple-200">
                      BOM Configured Rates
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono">
                    {activeProcurement.procurement_number} • {activeProcurement.grn_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setPaymentModalOpen(false); setActiveProcurement(null); }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Warehouse Inward Summary Snapshot */}
            <div className="mt-3 p-3 bg-purple-50/40 rounded-2xl border border-purple-100 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs shrink-0">
              <div>
                <span className="text-gray-500 text-[10px] block font-medium">Configured Combo Kit</span>
                <strong className="text-gray-900">{activeProcurement.kit_type}</strong>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block font-medium">Target Warehouse</span>
                <span className="text-gray-900 font-bold block">{getWarehouseLabel(activeProcurement)}</span>
                {activeProcurement.warehouse_code && (
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-100/60 px-1 rounded font-bold">
                    {activeProcurement.warehouse_code}
                  </span>
                )}
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block font-medium">Inward Quantity</span>
                <strong className="text-emerald-700 font-extrabold">+{activeProcurement.inward_quantity} Kits</strong>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block font-medium">Warehouse Inward Challan</span>
                <span className="text-gray-800 font-mono font-bold">
                  {activeProcurement.invoice_challan_number || activeProcurement.grn_number}
                </span>
              </div>
            </div>

            {/* Loading State or Multi-Supplier Stream Form */}
            {breakdownLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <FiRefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                <p className="text-xs font-semibold text-gray-600">
                  Fetching live Bill of Materials, admin configured prices & approved suppliers...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment} className="mt-3 space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                {/* 1. SOLAR PV MODULES (PANELS) */}
                <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/80 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
                        <FaSolarPanel className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">
                          1. Solar Panels (PV Modules)
                        </h4>
                        <p className="text-[11px] text-amber-800 font-medium">
                          {breakdownData?.breakdown?.panels?.item_name || "Bifacial Mono PERC 500W Panels"} •{" "}
                          <span className="font-mono font-bold">{breakdownData?.breakdown?.panels?.sku_code || "SOL-SUNNO-SOLA-BIFA-500W"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-bold text-[11px]">
                        {breakdownData?.breakdown?.panels?.total_quantity || activeProcurement.inward_quantity * 2} Pcs @ ₹{breakdownData?.breakdown?.panels?.unit_cost_price?.toLocaleString("en-IN") || "9,875"}
                      </span>
                      <span className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-black text-xs shadow-xs">
                        Base: ₹{multiSupplierTotals.panels.base.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Select Panel Supplier *
                      </label>
                      <select
                        value={panelPayment.supplier_id}
                        onChange={(e) => {
                          const sId = e.target.value;
                          const sup = (breakdownData?.approved_suppliers || []).find((s) => s._id === sId);
                          if (sup) {
                            setPanelPayment({
                              ...panelPayment,
                              supplier_id: sup._id,
                              supplier_name: sup.company_name,
                              supplier_brand: sup.brand_name || sup.company_name,
                              supplier_gst: sup.gst_number || ""
                            });
                          } else {
                            setPanelPayment({ ...panelPayment, supplier_id: sId });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 font-semibold bg-white text-gray-900"
                      >
                        {(breakdownData?.approved_suppliers || []).map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.company_name} {s.gst_number ? `(${s.gst_number})` : ""}
                          </option>
                        ))}
                        <option value="custom">Other / Custom Panel Vendor...</option>
                      </select>
                    </div>

                    {panelPayment.supplier_id === "custom" && (
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Custom Vendor Name *</label>
                        <input
                          type="text"
                          required
                          value={panelPayment.supplier_name}
                          onChange={(e) => setPanelPayment({ ...panelPayment, supplier_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                          placeholder="e.g. Tata Power Solar / Mindra"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Bank Transaction UTR / Ref *
                      </label>
                      <input
                        type="text"
                        required
                        value={panelPayment.transaction_utr_no}
                        onChange={(e) => setPanelPayment({ ...panelPayment, transaction_utr_no: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold text-amber-900 bg-white"
                        placeholder="e.g. UTR-PANEL-982134"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Payment Mode *</label>
                      <select
                        value={panelPayment.payment_mode}
                        onChange={(e) => setPanelPayment({ ...panelPayment, payment_mode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-medium"
                      >
                        <option value="bank_transfer_neft_rtgs">NEFT / RTGS (Bank Transfer)</option>
                        <option value="upi">UPI / IMPS Corporate</option>
                        <option value="cheque">Bank Cheque</option>
                        <option value="corporate_card">Corporate Credit Card</option>
                        <option value="cash">Petty Cash</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Company Debit Account</label>
                      <input
                        type="text"
                        value={panelPayment.company_bank_account}
                        onChange={(e) => setPanelPayment({ ...panelPayment, company_bank_account: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Payment Slip / Receipt URL</label>
                      <input
                        type="text"
                        value={panelPayment.payment_receipt_url}
                        onChange={(e) => setPanelPayment({ ...panelPayment, payment_receipt_url: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                        placeholder="https://.../panel-payment.pdf"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">GST Rate (%)</label>
                      <select
                        value={panelPayment.gst_rate_percent}
                        onChange={(e) => setPanelPayment({ ...panelPayment, gst_rate_percent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-bold text-gray-900"
                      >
                        <option value="12">12% (Standard Solar Panels GST)</option>
                        <option value="18">18% (Standard Goods GST)</option>
                        <option value="13.8">13.8% (Composite Solar Scheme)</option>
                        <option value="5">5% (Concessional)</option>
                        <option value="0">0% (Nil / Exempt)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-amber-200 text-xs font-mono">
                      <div>
                        <span className="text-gray-500 text-[10px] block">GST ({panelPayment.gst_rate_percent}%):</span>
                        <strong className="text-gray-800">+₹{multiSupplierTotals.panels.gst.toLocaleString("en-IN")}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-800 text-[10px] font-bold block uppercase">Panel Payable:</span>
                        <strong className="text-amber-900 font-black text-sm">
                          ₹{multiSupplierTotals.panels.total.toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SOLAR INVERTERS */}
                <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200/80 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-blue-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-blue-100 text-blue-800">
                        <FaBolt className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-extrabold text-blue-950 text-xs uppercase tracking-wider">
                          2. Solar Inverters
                        </h4>
                        <p className="text-[11px] text-blue-800 font-medium">
                          {breakdownData?.breakdown?.inverters?.item_name || "1kW On-Grid Solar Inverter"} •{" "}
                          <span className="font-mono font-bold">{breakdownData?.breakdown?.inverters?.sku_code || "INV-SUNNO-SOLA-MICR-1KW"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg font-bold text-[11px]">
                        {breakdownData?.breakdown?.inverters?.total_quantity || activeProcurement.inward_quantity} Pcs @ ₹{breakdownData?.breakdown?.inverters?.unit_cost_price?.toLocaleString("en-IN") || "8,350"}
                      </span>
                      <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-black text-xs shadow-xs">
                        Base: ₹{multiSupplierTotals.inverters.base.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Select Inverter Supplier *
                      </label>
                      <select
                        value={inverterPayment.supplier_id}
                        onChange={(e) => {
                          const sId = e.target.value;
                          const sup = (breakdownData?.approved_suppliers || []).find((s) => s._id === sId);
                          if (sup) {
                            setInverterPayment({
                              ...inverterPayment,
                              supplier_id: sup._id,
                              supplier_name: sup.company_name,
                              supplier_brand: sup.brand_name || sup.company_name,
                              supplier_gst: sup.gst_number || ""
                            });
                          } else {
                            setInverterPayment({ ...inverterPayment, supplier_id: sId });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 font-semibold bg-white text-gray-900"
                      >
                        {(breakdownData?.approved_suppliers || []).map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.company_name} {s.gst_number ? `(${s.gst_number})` : ""}
                          </option>
                        ))}
                        <option value="custom">Other / Custom Inverter Vendor...</option>
                      </select>
                    </div>

                    {inverterPayment.supplier_id === "custom" && (
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">Custom Vendor Name *</label>
                        <input
                          type="text"
                          required
                          value={inverterPayment.supplier_name}
                          onChange={(e) => setInverterPayment({ ...inverterPayment, supplier_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                          placeholder="e.g. Havells / Growatt / Solis"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Bank Transaction UTR / Ref *
                      </label>
                      <input
                        type="text"
                        required
                        value={inverterPayment.transaction_utr_no}
                        onChange={(e) => setInverterPayment({ ...inverterPayment, transaction_utr_no: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold text-blue-900 bg-white"
                        placeholder="e.g. UTR-INV-441029"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Payment Mode *</label>
                      <select
                        value={inverterPayment.payment_mode}
                        onChange={(e) => setInverterPayment({ ...inverterPayment, payment_mode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-medium"
                      >
                        <option value="bank_transfer_neft_rtgs">NEFT / RTGS (Bank Transfer)</option>
                        <option value="upi">UPI / IMPS Corporate</option>
                        <option value="cheque">Bank Cheque</option>
                        <option value="corporate_card">Corporate Credit Card</option>
                        <option value="cash">Petty Cash</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Company Debit Account</label>
                      <input
                        type="text"
                        value={inverterPayment.company_bank_account}
                        onChange={(e) => setInverterPayment({ ...inverterPayment, company_bank_account: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Payment Slip / Receipt URL</label>
                      <input
                        type="text"
                        value={inverterPayment.payment_receipt_url}
                        onChange={(e) => setInverterPayment({ ...inverterPayment, payment_receipt_url: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                        placeholder="https://.../inverter-payment.pdf"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">GST Rate (%)</label>
                      <select
                        value={inverterPayment.gst_rate_percent}
                        onChange={(e) => setInverterPayment({ ...inverterPayment, gst_rate_percent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-bold text-gray-900"
                      >
                        <option value="18">18% (Standard Solar Inverters GST)</option>
                        <option value="12">12% (Concessional)</option>
                        <option value="13.8">13.8% (Composite Solar Scheme)</option>
                        <option value="5">5% (Concessional)</option>
                        <option value="0">0% (Nil / Exempt)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-blue-200 text-xs font-mono">
                      <div>
                        <span className="text-gray-500 text-[10px] block">GST ({inverterPayment.gst_rate_percent}%):</span>
                        <strong className="text-gray-800">+₹{multiSupplierTotals.inverters.gst.toLocaleString("en-IN")}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-800 text-[10px] font-bold block uppercase">Inverter Payable:</span>
                        <strong className="text-blue-900 font-black text-sm">
                          ₹{multiSupplierTotals.inverters.total.toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. BOS BALANCE OF SYSTEM (16 ITEMS) */}
                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/80 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800">
                        <FaTools className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider">
                          3. BOS Balance of System & Protection (16 Items)
                        </h4>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Cables, ACDB, MC4, Earthing Kit, Cable Ties, Fasteners, Conduits Bundle
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <button
                        type="button"
                        onClick={() => setShowBosDetails(!showBosDetails)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                      >
                        {showBosDetails ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                        {showBosDetails ? "Hide 16 Items" : "View 16 Bill of Materials"}
                      </button>
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-black text-xs shadow-xs">
                        Base: ₹{multiSupplierTotals.bos.base.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Expandable 16 BOS Items Mini-Table */}
                  {showBosDetails && (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[9px]">
                            <th className="py-1 px-2">#</th>
                            <th className="py-1 px-2">BOS Component</th>
                            <th className="py-1 px-2">SKU</th>
                            <th className="py-1 px-2 text-right">Qty / Kit</th>
                            <th className="py-1 px-2 text-right">Total ({activeProcurement.inward_quantity} Kits)</th>
                            <th className="py-1 px-2 text-right">Unit Rate</th>
                            <th className="py-1 px-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(breakdownData?.breakdown?.bos?.items || []).map((it, idx) => (
                            <tr key={idx} className="hover:bg-emerald-50/50">
                              <td className="py-1 px-2 text-gray-400">{idx + 1}</td>
                              <td className="py-1 px-2 font-medium text-gray-900">{it.item_name}</td>
                              <td className="py-1 px-2 font-mono text-gray-500 text-[10px]">{it.sku_code}</td>
                              <td className="py-1 px-2 text-right font-semibold">{it.quantity_per_kit}</td>
                              <td className="py-1 px-2 text-right font-bold text-gray-900">{it.total_quantity}</td>
                              <td className="py-1 px-2 text-right font-mono text-gray-600">₹{it.unit_cost_price}</td>
                              <td className="py-1 px-2 text-right font-bold text-emerald-800">₹{it.subtotal_amount?.toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        BOS Supplier / Distributor *
                      </label>
                      <input
                        type="text"
                        required
                        value={bosPayment.supplier_name}
                        onChange={(e) => setBosPayment({ ...bosPayment, supplier_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 font-semibold bg-white text-gray-900"
                        placeholder="e.g. Polycab / L&T / Solarkits OEM"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Bank Transaction UTR / Ref *
                      </label>
                      <input
                        type="text"
                        required
                        value={bosPayment.transaction_utr_no}
                        onChange={(e) => setBosPayment({ ...bosPayment, transaction_utr_no: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold text-emerald-900 bg-white"
                        placeholder="e.g. UTR-BOS-771822"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Payment Mode *</label>
                      <select
                        value={bosPayment.payment_mode}
                        onChange={(e) => setBosPayment({ ...bosPayment, payment_mode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-medium"
                      >
                        <option value="bank_transfer_neft_rtgs">NEFT / RTGS (Bank Transfer)</option>
                        <option value="upi">UPI / IMPS Corporate</option>
                        <option value="cheque">Bank Cheque</option>
                        <option value="corporate_card">Corporate Credit Card</option>
                        <option value="cash">Petty Cash</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Company Debit Account</label>
                      <input
                        type="text"
                        value={bosPayment.company_bank_account}
                        onChange={(e) => setBosPayment({ ...bosPayment, company_bank_account: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Payment Slip / Receipt URL</label>
                      <input
                        type="text"
                        value={bosPayment.payment_receipt_url}
                        onChange={(e) => setBosPayment({ ...bosPayment, payment_receipt_url: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                        placeholder="https://.../bos-payment.pdf"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">GST Rate (%)</label>
                      <select
                        value={bosPayment.gst_rate_percent}
                        onChange={(e) => setBosPayment({ ...bosPayment, gst_rate_percent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-bold text-gray-900"
                      >
                        <option value="18">18% (Standard BOS Electrical GST)</option>
                        <option value="12">12% (Concessional)</option>
                        <option value="13.8">13.8% (Composite Solar Scheme)</option>
                        <option value="5">5% (Concessional)</option>
                        <option value="0">0% (Nil / Exempt)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-emerald-200 text-xs font-mono">
                      <div>
                        <span className="text-gray-500 text-[10px] block">GST ({bosPayment.gst_rate_percent}%):</span>
                        <strong className="text-gray-800">+₹{multiSupplierTotals.bos.gst.toLocaleString("en-IN")}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-800 text-[10px] font-bold block uppercase">BOS Payable:</span>
                        <strong className="text-emerald-900 font-black text-sm">
                          ₹{multiSupplierTotals.bos.total.toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRAND COMMERCIAL TOTALS & SUBMISSION */}
                <div className="p-4 bg-purple-50/70 rounded-2xl border-2 border-purple-200 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
                  <div className="grid grid-cols-3 gap-4 text-xs w-full md:w-auto">
                    <div>
                      <span className="text-gray-500 text-[10px] block font-sans font-semibold">Base Cost:</span>
                      <strong className="text-gray-900 text-sm">
                        ₹{multiSupplierTotals.totalBase.toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block font-sans font-semibold">
                        Total GST ({multiSupplierTotals.effectiveRate}%):
                      </span>
                      <strong className="text-gray-900 text-sm">
                        +₹{multiSupplierTotals.totalGst.toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-purple-700 text-[10px] block font-sans font-extrabold uppercase">
                        Grand Total Payable:
                      </span>
                      <strong className="text-purple-800 text-base font-black">
                        ₹{multiSupplierTotals.grandTotal.toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 w-full md:w-auto font-sans">
                    <button
                      type="button"
                      onClick={() => { setPaymentModalOpen(false); setActiveProcurement(null); }}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={paymentSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-md cursor-pointer inline-flex items-center gap-2 text-xs"
                    >
                      {paymentSubmitting ? (
                        <>
                          <FiRefreshCw className="animate-spin" /> Recording Payments...
                        </>
                      ) : (
                        <>
                          <FaCheck /> Submit 3 Supplier Payments for Admin Approval
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          VIEW FULL 3-WAY DOSSIER MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {dossierModalOpen && dossierItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-purple-700 text-base">{dossierItem.procurement_number}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-700 font-mono">
                    {dossierItem.grn_number}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Trial Kit Multi-Stage Procurement Dossier</p>
              </div>
              <button onClick={() => { setDossierModalOpen(false); setDossierItem(null); }} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Stage 1 */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaTruckLoading className="text-blue-600" />
                  <span>Stage 1: Warehouse</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Combo Kit</span>
                  <strong className="text-gray-900">{dossierItem.kit_type}</strong>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Warehouse</span>
                  <strong className="text-gray-900 block">{getWarehouseLabel(dossierItem)}</strong>
                  {dossierItem.warehouse_code && (
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1 rounded">
                      {dossierItem.warehouse_code}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Inward Quantity</span>
                  <strong className="text-emerald-700">+{dossierItem.inward_quantity} Kits</strong>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Vendor</span>
                  <span className="text-gray-800">{dossierItem.vendor_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Challan No.</span>
                  <span className="text-gray-800 font-mono">{dossierItem.invoice_challan_number}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Inspection Condition</span>
                  <span className="text-emerald-700 font-semibold">{dossierItem.warehouse_inspection_status}</span>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaCreditCard className="text-purple-600" />
                  <span>Stage 2: Accounts Payment</span>
                </div>
                {dossierItem.payment_status === "unpaid" ? (
                  <div className="py-6 text-center text-amber-700 bg-amber-50 rounded-xl p-2 font-medium">
                    ⏳ Unpaid - Pending Accounts Entry
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Total Payable</span>
                      <strong className="text-purple-700 text-sm font-black">
                        ₹{dossierItem.total_payable_amount_inr?.toLocaleString("en-IN")}
                      </strong>
                    </div>

                    {dossierItem.supplier_payments && dossierItem.supplier_payments.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-gray-500 text-[10px] block font-bold uppercase">
                          Supplier Allocations ({dossierItem.supplier_payments.length})
                        </span>
                        {dossierItem.supplier_payments.map((sp, sIdx) => (
                          <div key={sIdx} className="p-1.5 bg-white rounded-lg border border-gray-200 text-[10px]">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-gray-800">
                                {sp.group_type === "panel" ? "☀️" : sp.group_type === "inverter" ? "⚡" : "🛠️"}{" "}
                                {sp.supplier_name}
                              </span>
                              <span className="text-purple-700 font-mono">₹{sp.total_payable_inr?.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500 font-mono text-[9px]">
                              <span>Base: ₹{sp.base_amount_inr?.toLocaleString("en-IN")}</span>
                              <span>GST ({sp.gst_rate_percent}%): +₹{sp.gst_amount_inr?.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="text-gray-500 font-mono text-[9px] mt-0.5">UTR: {sp.transaction_utr_no}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-gray-500 text-[10px] block">Unit Rate & GST</span>
                          <span className="text-gray-800">
                            ₹{dossierItem.unit_cost_price_inr?.toLocaleString("en-IN")} + {dossierItem.gst_rate_percent}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block">Bank UTR No.</span>
                          <strong className="text-gray-900 font-mono text-[11px]">
                            {dossierItem.payment_details?.transaction_utr_no}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block">Payment Mode</span>
                          <span className="text-gray-700 capitalize">
                            {dossierItem.payment_details?.payment_mode?.replace(/_/g, " ")}
                          </span>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="text-gray-500 text-[10px] block">Paid Date</span>
                      <span className="text-gray-700">
                        {dossierItem.payment_details?.payment_date
                          ? new Date(dossierItem.payment_details.payment_date).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Stage 3 */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaCheckCircle className="text-emerald-600" />
                  <span>Stage 3: Admin Approval</span>
                </div>
                {dossierItem.status === "inward_requested" ? (
                  <div className="py-6 text-center text-gray-400 bg-gray-100 rounded-xl p-2 font-medium">
                    Waiting for Accounts payment
                  </div>
                ) : dossierItem.status === "payment_recorded" ? (
                  <div className="py-6 text-center text-blue-700 bg-blue-50 rounded-xl p-2 font-medium">
                    🔔 Awaiting Admin Approval & Stock Credit
                  </div>
                ) : dossierItem.status === "approved" ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-semibold text-center">
                      ✅ Approved & Stock Inwarded!
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Approved By</span>
                      <strong className="text-gray-900">{dossierItem.admin_decision?.approved_by?.name || "Admin"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Approved On</span>
                      <span className="text-gray-700">
                        {dossierItem.admin_decision?.approved_at
                          ? new Date(dossierItem.admin_decision.approved_at).toLocaleString()
                          : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-red-50 rounded-xl border border-red-200 text-red-800">
                    <strong>Rejected:</strong> {dossierItem.admin_decision?.rejection_reason || "Requirements not met"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => { setDossierModalOpen(false); setDossierItem(null); }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
