import React, { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaPlus,
  FaBook,
  FaCalendarAlt,
  FaSearch,
  FaFileInvoice,
  FaBuilding,
  FaClipboardCheck
} from "react-icons/fa";
import {
  getPurchaseInvoices,
  createAndValidatePurchaseInvoice,
  postInvoiceToLedger,
  getComplianceAlerts,
  getComplianceCalendar,
  saveComplianceTask
} from "../../api/accounts";

export default function InvoiceValidationModule() {
  const [activeTab, setActiveTab] = useState("invoices");
  const [invoices, setInvoices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [calendarTasks, setCalendarTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notice, setNotice] = useState(null);

  // New Invoice Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    supplier_name: "",
    supplier_gstin: "",
    po_number: "",
    grn_number: "",
    warehouse_name: "Central Logistics Hub",
    taxable_value: "",
    cgst_amount: "",
    sgst_amount: "",
    igst_amount: "",
    invoice_total_amount: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, alertRes, calRes] = await Promise.all([
        getPurchaseInvoices({ status: statusFilter, search }),
        getComplianceAlerts(),
        getComplianceCalendar()
      ]);
      setInvoices(invRes?.data || []);
      setAlerts(alertRes?.data || []);
      setCalendarTasks(calRes?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const res = await createAndValidatePurchaseInvoice({
        ...formData,
        taxable_value: Number(formData.taxable_value),
        cgst_amount: Number(formData.cgst_amount || 0),
        sgst_amount: Number(formData.sgst_amount || 0),
        igst_amount: Number(formData.igst_amount || 0),
        invoice_total_amount: Number(formData.invoice_total_amount),
        supporting_documents: [{ file_name: "invoice_copy.pdf", file_url: "/uploads/sample_inv.pdf" }]
      });
      setNotice({ type: "success", text: res.message || "Invoice uploaded and validated!" });
      setShowUploadModal(false);
      setFormData({
        invoice_number: "",
        invoice_date: new Date().toISOString().split("T")[0],
        supplier_name: "",
        supplier_gstin: "",
        po_number: "",
        grn_number: "",
        warehouse_name: "Central Logistics Hub",
        taxable_value: "",
        cgst_amount: "",
        sgst_amount: "",
        igst_amount: "",
        invoice_total_amount: ""
      });
      loadData();
    } catch (err) {
      setNotice({ type: "error", text: err?.response?.data?.message || err.message });
    }
  };

  const handlePostToLedger = async (id, invNo) => {
    try {
      const res = await postInvoiceToLedger(id);
      setNotice({ type: "success", text: res.message || `Invoice #${invNo} posted to General Ledger!` });
      loadData();
    } catch (err) {
      setNotice({ type: "error", text: err?.response?.data?.message || err.message });
    }
  };

  const formatInr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg text-lg">
              <FaClipboardCheck />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Invoice Validation & Compliance Control Centre</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            10-Point automated verification engine for supplier invoices, mismatch alerts, and statutory compliance calendar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <FaPlus /> Upload Supplier Invoice
          </button>
        </div>
      </div>

      {/* Notice notification */}
      {notice && (
        <div className={`p-4 rounded-xl flex items-center justify-between ${notice.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-bold text-sm px-2">✕</button>
        </div>
      )}

      {/* Automated Compliance Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <FaExclamationTriangle className="text-amber-600" />
            <span>Active Compliance & Statutory Alerts ({alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {alerts.map((al, idx) => (
              <div key={idx} className="bg-white/80 p-3 rounded-xl border border-amber-200/60 text-xs">
                <span className="font-bold text-slate-900 block">{al.title}</span>
                <span className="text-slate-600 mt-0.5 block">{al.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm gap-2">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-indigo-600 text-indigo-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Purchase Invoices & 10-Point Validation
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "calendar"
              ? "border-indigo-600 text-indigo-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Statutory Compliance Calendar (GST / MCA / TDS)
        </button>
      </div>

      {/* TAB 1: INVOICES TABLE */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search invoice number, supplier name, GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </form>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED_FOR_ACCOUNTING">Approved for Accounting</option>
              <option value="POSTED_TO_LEDGER">Posted to Ledger</option>
              <option value="MISMATCH_FOUND">Mismatch Found</option>
              <option value="VALIDATION_PENDING">Validation Pending</option>
            </select>
          </div>

          {/* Invoices List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
                    <th className="p-3 pl-4">Invoice Info</th>
                    <th className="p-3">Supplier & GSTIN</th>
                    <th className="p-3">PO & GRN</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">Taxes (GST)</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3 text-center">10-Point Status</th>
                    <th className="p-3 text-center pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 text-xs">
                        No purchase invoices found. Upload a new supplier invoice to begin validation.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50">
                        <td className="p-3 pl-4">
                          <span className="font-mono font-bold text-slate-900 block">{inv.invoice_number}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(inv.invoice_date).toLocaleDateString("en-IN")}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block text-xs">{inv.supplier_name}</span>
                          <span className="font-mono text-[11px] text-slate-500">{inv.supplier_gstin}</span>
                        </td>
                        <td className="p-3 text-xs">
                          <span className="text-slate-600 block">PO: {inv.po_number || "—"}</span>
                          <span className="text-slate-400">GRN: {inv.grn_number || "—"}</span>
                        </td>
                        <td className="p-3 text-right font-medium text-xs">{formatInr(inv.taxable_value)}</td>
                        <td className="p-3 text-right text-xs text-slate-600">
                          {formatInr(inv.total_tax_amount || (inv.cgst_amount + inv.sgst_amount + inv.igst_amount))}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 text-xs">
                          {formatInr(inv.invoice_total_amount)}
                        </td>
                        <td className="p-3 text-center">
                          {inv.validation_status === "POSTED_TO_LEDGER" ? (
                            <span className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                              Posted to Ledger
                            </span>
                          ) : inv.validation_status === "APPROVED_FOR_ACCOUNTING" ? (
                            <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                              10-Pt Validated
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 text-rose-700 rounded-full border border-rose-200">
                              {inv.validation_status}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center pr-4">
                          {inv.validation_status === "APPROVED_FOR_ACCOUNTING" ? (
                            <button
                              onClick={() => handlePostToLedger(inv._id, inv.invoice_number)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                            >
                              Post to Ledger
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">
                              {inv.validation_status === "POSTED_TO_LEDGER" ? "Voucher Active" : "Review Issues"}
                            </span>
                          )}
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

      {/* TAB 2: COMPLIANCE CALENDAR */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Dynamic Statutory Compliance Calendar</h3>
            <p className="text-xs text-slate-500 mt-1">
              Configurable deadlines for GST Returns, TDS Deductions, Advance Corporate Tax, and MCA/ROC Annual Filings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calendarTasks.map((t) => (
              <div key={t._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <span className="px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-full">
                    {t.category}
                  </span>
                  <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                    t.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                    t.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {t.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{t.compliance_name}</h4>
                <div className="text-xs text-slate-600 space-y-1">
                  <p><span className="text-slate-400">Due Date:</span> <strong className="text-slate-800">{new Date(t.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong></p>
                  <p><span className="text-slate-400">Responsible:</span> {t.responsible_person}</p>
                  {t.filing_reference && (
                    <p><span className="text-slate-400">ARN / SRN:</span> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">{t.filing_reference}</code></p>
                  )}
                  {t.payment_amount > 0 && (
                    <p><span className="text-slate-400">Payment:</span> <span className="font-bold text-slate-900">{formatInr(t.payment_amount)}</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Supplier Purchase Invoice</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter invoice metrics to run the 10-Point automated verification engine before ledger posting and ITC claim.
            </p>
            <form onSubmit={handleCreateInvoice} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-9041"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Waaree Solar Panels Ltd"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Supplier GSTIN *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 07AAACS9999F1Z2"
                    value={formData.supplier_gstin}
                    onChange={(e) => setFormData({ ...formData, supplier_gstin: e.target.value.toUpperCase() })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">PO Reference Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-2026-0045"
                    value={formData.po_number}
                    onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Warehouse Inward GRN *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GRN-DELHI-102"
                    value={formData.grn_number}
                    onChange={(e) => setFormData({ ...formData, grn_number: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Taxable Value (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100000"
                    value={formData.taxable_value}
                    onChange={(e) => {
                      const taxVal = Number(e.target.value);
                      const cgst = Math.round(taxVal * 0.09);
                      const sgst = Math.round(taxVal * 0.09);
                      setFormData({
                        ...formData,
                        taxable_value: e.target.value,
                        cgst_amount: cgst,
                        sgst_amount: sgst,
                        igst_amount: 0,
                        invoice_total_amount: taxVal + cgst + sgst
                      });
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Total Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.invoice_total_amount}
                    onChange={(e) => setFormData({ ...formData, invoice_total_amount: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CGST (₹)</label>
                  <input
                    type="number"
                    value={formData.cgst_amount}
                    onChange={(e) => setFormData({ ...formData, cgst_amount: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">SGST (₹)</label>
                  <input
                    type="number"
                    value={formData.sgst_amount}
                    onChange={(e) => setFormData({ ...formData, sgst_amount: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">IGST (₹)</label>
                  <input
                    type="number"
                    value={formData.igst_amount}
                    onChange={(e) => setFormData({ ...formData, igst_amount: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Run 10-Point Validation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
