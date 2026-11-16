import React, { useState, useEffect } from "react";
import {
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaFileInvoiceDollar,
  FaSearch,
  FaFilter,
  FaWarehouse,
  FaCoins,
  FaChartPie
} from "react-icons/fa";
import {
  getExpenses,
  createExpense,
  approveExpense,
  rejectExpense,
  payExpense,
  getExpenseReports,
  getAccountingHeads
} from "../../api/accounts";

export default function ExpenseManagementModule() {
  const [activeTab, setActiveTab] = useState("expenses");
  const [expenses, setExpenses] = useState([]);
  const [reports, setReports] = useState(null);
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(null);

  // New Expense Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    accounting_head_id: "",
    category: "Warehouse Expenses",
    expense_date: new Date().toISOString().split("T")[0],
    amount: "",
    is_gst_applicable: false,
    vendor_gstin: "",
    gst_rate: 18,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    itc_eligible: true,
    is_tds_applicable: false,
    tds_section: "194C - Contractor",
    tds_rate: 2,
    tds_deducted: 0,
    vendor_name: "",
    payment_mode: "BANK_TRANSFER",
    state: "Delhi",
    warehouse_name: "Central Logistics Hub",
    department: "Logistics",
    remarks: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, repRes, headsRes] = await Promise.all([
        getExpenses({ status: statusFilter, search }),
        getExpenseReports(),
        getAccountingHeads({ ledger_type: "Expense" })
      ]);
      setExpenses(expRes?.data || []);
      setReports(repRes?.data || null);
      setHeads(headsRes?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!formData.accounting_head_id) {
      alert("Please select an Accounting Head.");
      return;
    }
    try {
      const res = await createExpense(formData);
      setNotice({ type: "success", text: res.message || "Expense created and submitted for approval!" });
      setShowModal(false);
      loadData();
    } catch (err) {
      setNotice({ type: "error", text: err?.response?.data?.message || err.message });
    }
  };

  const handleApprove = async (id, expNo) => {
    try {
      const res = await approveExpense(id);
      setNotice({ type: "success", text: res.message || `Expense #${expNo} approved and posted to General Ledger!` });
      loadData();
    } catch (err) {
      setNotice({ type: "error", text: err?.response?.data?.message || err.message });
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter reason for rejection:");
    if (!reason) return;
    try {
      await rejectExpense(id, reason);
      setNotice({ type: "success", text: "Expense rejected." });
      loadData();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const handlePay = async (id) => {
    const ref = prompt("Enter Payment Reference (UTR / Cheque No):", `UTR-${Date.now().toString().slice(-6)}`);
    if (!ref) return;
    try {
      await payExpense(id, { payment_reference: ref });
      setNotice({ type: "success", text: "Expense marked as PAID." });
      loadData();
    } catch (err) {
      setNotice({ type: "error", text: err.message });
    }
  };

  const formatInr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-lg text-lg">
              <FaMoneyBillWave />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Dynamic Expense Management & Approvals</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic expense heads, multi-tier approval workflow, auto-ledger posting, and multi-location analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <FaPlus /> Record New Expense
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Expenses</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatInr(reports?.total_expenses || 0)}</p>
          <span className="text-xs text-slate-500 mt-1 block">Across all warehouses & hubs</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Input GST Paid</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{formatInr(reports?.total_gst_paid || 0)}</p>
          <span className="text-xs text-emerald-600 mt-1 block">Eligible for ITC set-off</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">TDS Deducted</span>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{formatInr(reports?.total_tds_deducted || 0)}</p>
          <span className="text-xs text-indigo-600 mt-1 block">Statutory deduction</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Approvals</span>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {expenses.filter(e => e.status === "SUBMITTED").length} Entries
          </p>
          <span className="text-xs text-amber-600 mt-1 block">Requires Finance Head review</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm gap-2">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "expenses"
              ? "border-amber-600 text-amber-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Expense Register & Approval Queue
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "analytics"
              ? "border-amber-600 text-amber-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Cost Centre & Budget Reports
        </button>
      </div>

      {/* TAB 1: EXPENSE REGISTER */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <input
              type="text"
              placeholder="Search by expense #, vendor, head..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Pending Approval (Submitted)</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
                    <th className="p-3 pl-4">Expense Details</th>
                    <th className="p-3">Accounting Head</th>
                    <th className="p-3">Vendor / Payee</th>
                    <th className="p-3">Cost Centre / Location</th>
                    <th className="p-3 text-right">Base Amount</th>
                    <th className="p-3 text-right">Net Payable</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 text-xs">
                        No expenses found. Click 'Record New Expense' to create one.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50">
                        <td className="p-3 pl-4">
                          <span className="font-mono font-bold text-slate-900 block">{e.expense_number}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(e.expense_date).toLocaleDateString("en-IN")} • {e.payment_mode}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block text-xs">{e.accounting_head_name}</span>
                          <span className="text-[11px] text-slate-500">{e.category}</span>
                        </td>
                        <td className="p-3 text-xs">
                          <span className="font-medium text-slate-800 block">{e.vendor_name}</span>
                          {e.vendor_gstin && <span className="font-mono text-[11px] text-slate-400">{e.vendor_gstin}</span>}
                        </td>
                        <td className="p-3 text-xs">
                          <span className="text-slate-700 block">{e.warehouse_name || "Central Hub"}</span>
                          <span className="text-slate-400">{e.state} • {e.department}</span>
                        </td>
                        <td className="p-3 text-right font-medium text-xs">{formatInr(e.amount)}</td>
                        <td className="p-3 text-right font-bold text-slate-900 text-xs">{formatInr(e.net_payable_amount)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                            e.status === "PAID" ? "bg-emerald-100 text-emerald-800" :
                            e.status === "APPROVED" ? "bg-blue-100 text-blue-800" :
                            e.status === "SUBMITTED" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="p-3 text-center pr-4">
                          {e.status === "SUBMITTED" ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleApprove(e._id, e.expense_number)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(e._id)}
                                className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-semibold transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : e.status === "APPROVED" ? (
                            <button
                              onClick={() => handlePay(e._id)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
                            >
                              Pay Now
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Completed</span>
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

      {/* TAB 2: ANALYTICS & BUDGET REPORTS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Expense by Category</h3>
              <div className="space-y-3">
                {reports?.category_breakdown?.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                    <span className="text-slate-600 font-medium">{cat.category}</span>
                    <span className="font-bold text-slate-900">{formatInr(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget vs Actual */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Department Budget vs Actual Expenditure</h3>
              <div className="space-y-3">
                {reports?.budget_vs_actual?.map((b, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{b.department}</span>
                      <span className={b.status === "Over Budget" ? "text-rose-600" : "text-emerald-600"}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Budget: {formatInr(b.budget)}</span>
                      <span>Actual: {formatInr(b.actual)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Record New Business Expense</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select dynamic accounting head, calculate GST/TDS, and submit for Admin/Finance Head approval.
            </p>
            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Accounting Head *</label>
                <select
                  required
                  value={formData.accounting_head_id}
                  onChange={(e) => {
                    const sel = heads.find(h => h._id === e.target.value);
                    setFormData({
                      ...formData,
                      accounting_head_id: e.target.value,
                      category: sel?.category || formData.category
                    });
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">Select Expense Head</option>
                  {heads.map((h) => (
                    <option key={h._id} value={h._id}>{h.head_name} ({h.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Base Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 25000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vendor / Payee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DHL Express Logistics"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Warehouse / Cost Centre</label>
                  <input
                    type="text"
                    value={formData.warehouse_name}
                    onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="PETTY_CASH">Petty Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Remarks / Business Purpose</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Forklift rental for central logistics hub inward dispatch"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
