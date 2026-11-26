import React, { useState, useEffect } from "react";
import {
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaClock,
  FaPlus,
  FaSyncAlt,
  FaCheck,
  FaFilePdf
} from "react-icons/fa";
import { getBillingSummary, createInvoice, markInvoicePaid } from "../../api/emailManagementApi";

export default function BillingPayments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeProviderTab, setActiveProviderTab] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [form, setForm] = useState({
    provider: "sender",
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    billing_period: "",
    amount_invoiced: "",
    amount_paid: "",
    payment_status: "paid",
    plan_tier: "",
    notes: ""
  });

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const res = await getBillingSummary();
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const res = await createInvoice(form);
      if (res.success) {
        setFeedback({ type: "success", text: "Invoice recorded successfully!" });
        setShowAddModal(false);
        fetchBilling();
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.response?.data?.message || err.message });
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      const res = await markInvoicePaid(id);
      if (res.success) {
        setFeedback({ type: "success", text: "Invoice marked as paid." });
        fetchBilling();
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const summary = data?.summary || { total_invoiced: 0, total_paid: 0, total_pending: 0, currency: "INR" };
  const allInvoices = data?.invoices || [];
  const filteredInvoices = activeProviderTab === "all"
    ? allInvoices
    : allInvoices.filter(i => i.provider === activeProviderTab);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Email Infrastructure Billing & Subscriptions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit monthly provider subscription invoices, payment histories, and AWS SES pay-as-you-go expenses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <FaPlus className="w-3 h-3" /> Record Invoice
          </button>
          <button
            onClick={fetchBilling}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Refresh"
          >
            <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase mb-2">
            <span>Total Invoiced</span>
            <FaFileInvoiceDollar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">₹{summary.total_invoiced.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Cumulative infrastructure cost</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase mb-2">
            <span>Total Paid</span>
            <FaCheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">₹{summary.total_paid.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Settled invoices & renewals</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase mb-2">
            <span>Outstanding Pending</span>
            <FaClock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">₹{summary.total_pending.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Due for payment</div>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: "all", label: "All Invoices" },
          { id: "sender", label: "Sender.net Subscription" },
          { id: "aws_ses", label: "AWS SES Pay-As-You-Go" },
          { id: "smtp", label: "SMTP Relay" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveProviderTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeProviderTab === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <FaSyncAlt className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading dynamic billing ledger...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No billing records found for the selected provider tab.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 pl-4">Invoice #</th>
                  <th className="py-3">Provider</th>
                  <th className="py-3">Billing Period</th>
                  <th className="py-3">Plan / Tier</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Notes</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const isPaid = inv.payment_status === "paid";
                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 pl-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                          {inv.provider}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-slate-800">{inv.billing_period}</td>
                      <td className="py-3 text-slate-600">{inv.plan_tier}</td>
                      <td className="py-3 font-extrabold text-slate-900">₹{inv.amount_invoiced?.toLocaleString()}</td>
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 max-w-xs truncate">{inv.notes || "-"}</td>
                      <td className="py-3 pr-4 text-right">
                        {!isPaid && (
                          <button
                            onClick={() => handleMarkPaid(inv._id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1 mr-2"
                          >
                            <FaCheck className="w-2.5 h-2.5" /> Mark Paid
                          </button>
                        )}
                        <span className="text-[11px] text-blue-600 font-semibold cursor-pointer hover:underline inline-flex items-center gap-1">
                          <FaFilePdf className="w-3 h-3" /> PDF
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900">Record New Invoice</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="sender">Sender.net</option>
                  <option value="aws_ses">AWS SES</option>
                  <option value="smtp">Dedicated SMTP</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Invoice Number</label>
                <input
                  type="text"
                  required
                  value={form.invoice_number}
                  onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Billing Period</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. December 2026"
                  value={form.billing_period}
                  onChange={(e) => setForm({ ...form, billing_period: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.amount_invoiced}
                    onChange={(e) => setForm({ ...form, amount_invoiced: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={form.amount_paid}
                    onChange={(e) => setForm({ ...form, amount_paid: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Notes</label>
                <input
                  type="text"
                  placeholder="Corporate Credit Card / Netbanking"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition"
                >
                  Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
