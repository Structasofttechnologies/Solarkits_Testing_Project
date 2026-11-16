import React, { useState, useEffect } from "react";
import {
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaDownload,
  FaCog,
  FaSearch,
  FaFilter,
  FaPlus,
  FaCalendarAlt,
  FaMoneyCheckAlt,
  FaBalanceScale
} from "react-icons/fa";
import {
  getGstSummary,
  getGstConfigs,
  saveGstConfig,
  getGstr1Data,
  getGstr3bData,
  getGstr2bReconciliation,
  recordGstFiling
} from "../../api/accounts";

export default function GstManagementModule() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [gstSummary, setGstSummary] = useState(null);
  const [gstr1Data, setGstr1Data] = useState(null);
  const [gstr3bData, setGstr3bData] = useState(null);
  const [gstr2bData, setGstr2bData] = useState(null);
  const [gstConfigs, setGstConfigs] = useState([]);
  const [filingModal, setFilingModal] = useState(false);
  const [arnInput, setArnInput] = useState("");
  const [filingType, setFilingType] = useState("GSTR-3B");
  const [notice, setNotice] = useState(null);

  // Load overview data
  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [sumRes, cfgRes] = await Promise.all([
        getGstSummary(),
        getGstConfigs()
      ]);
      setGstSummary(sumRes?.data || null);
      setGstConfigs(cfgRes?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Lazy load tab data
  useEffect(() => {
    if (activeTab === "gstr1" && !gstr1Data) {
      getGstr1Data().then(res => setGstr1Data(res.data)).catch(console.error);
    } else if (activeTab === "gstr3b" && !gstr3bData) {
      getGstr3bData().then(res => setGstr3bData(res.data)).catch(console.error);
    } else if (activeTab === "gstr2b" && !gstr2bData) {
      getGstr2bReconciliation().then(res => setGstr2bData(res.data)).catch(console.error);
    }
  }, [activeTab]);

  const handleRecordFiling = async (e) => {
    e.preventDefault();
    if (!arnInput) return;
    try {
      await recordGstFiling({
        return_type: filingType,
        financial_year: "2026-2027",
        tax_period: "October 2026",
        arn: arnInput,
        net_tax_paid_cash: gstSummary?.summary?.net_gst_payable || 0
      });
      setNotice({ type: "success", text: `${filingType} Filing Acknowledgement & ARN (${arnInput}) recorded successfully!` });
      setFilingModal(false);
      setArnInput("");
      loadDashboard();
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to record filing." });
    }
  };

  const formatInr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg text-lg">
              <FaFileInvoiceDollar />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">GST Management & Tax Accounting</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Centralized GSTIN compliance, dynamic tax calculation, GSTR-1, GSTR-3B summary, and 2B ITC reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setFilingType("GSTR-3B"); setFilingModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <FaCheckCircle /> Record Return Filing (ARN)
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm gap-2 overflow-x-auto">
        {[
          { id: "overview", label: "GST Summary Dashboard" },
          { id: "gstr1", label: "GSTR-1 Outward Supplies" },
          { id: "gstr3b", label: "GSTR-3B Tax Liability" },
          { id: "gstr2b", label: "GSTR-2B & ITC Reconciliation" },
          { id: "config", label: "GSTIN & HSN Configurations" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3.5 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Stat Cards from Boss Spec */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Output GST (Collected)</span>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatInr(gstSummary?.summary?.total_output_gst)}
              </p>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>CGST: {formatInr(gstSummary?.summary?.output_breakdown?.cgst)}</span>
                <span>SGST: {formatInr(gstSummary?.summary?.output_breakdown?.sgst)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Input GST / ITC (Claimable)</span>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {formatInr(gstSummary?.summary?.total_input_itc)}
              </p>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>CGST: {formatInr(gstSummary?.summary?.itc_breakdown?.cgst)}</span>
                <span>SGST: {formatInr(gstSummary?.summary?.itc_breakdown?.sgst)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net GST Payable (Cash)</span>
              <p className="text-2xl font-bold text-amber-600 mt-2">
                {formatInr(gstSummary?.summary?.net_gst_payable)}
              </p>
              <span className="mt-2 inline-block px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 rounded-md">
                Due by 20th of month
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Validation</span>
              <p className="text-2xl font-bold text-rose-600 mt-2">
                {gstSummary?.summary?.pending_validation_count || 0} Invoices
              </p>
              <span className="mt-2 inline-block px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 rounded-md">
                Requires 10-Point check
              </span>
            </div>
          </div>

          {/* Quick GST Profile Banner */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-700 px-2.5 py-1 rounded-full text-emerald-100">Primary Company GSTIN</span>
              <h2 className="text-2xl font-extrabold mt-2">{gstSummary?.primary_gstin}</h2>
              <p className="text-emerald-100 text-sm mt-0.5">{gstSummary?.legal_name} • Delhi (07)</p>
            </div>
            <div className="flex gap-3 text-sm">
              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                <span className="text-xs text-emerald-200 block">E-Invoicing</span>
                <span className="font-bold text-white">Enabled & Active</span>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                <span className="text-xs text-emerald-200 block">Reverse Charge</span>
                <span className="font-bold text-white">Configured (GTA)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GSTR-1 */}
      {activeTab === "gstr1" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">GSTR-1 Outward Supplies Register</h3>
              <p className="text-xs text-slate-500">B2B, B2C and HSN summary for e-filing return preparation.</p>
            </div>
            <button className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition">
              <FaDownload /> Export Government JSON / CSV
            </button>
          </div>

          {/* HSN Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-sm text-slate-700">
              HSN-wise Summary of Outward Supplies
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
                    <th className="p-3 pl-4">HSN/SAC</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">UQC</th>
                    <th className="p-3 text-right">Total Qty</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">CGST</th>
                    <th className="p-3 text-right">SGST</th>
                    <th className="p-3 text-right pr-4">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gstr1Data?.hsn_summary?.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 pl-4 font-mono font-medium text-slate-800">{h.hsn}</td>
                      <td className="p-3 text-slate-700">{h.description}</td>
                      <td className="p-3 text-slate-500">{h.uqc}</td>
                      <td className="p-3 text-right font-medium">{h.qty}</td>
                      <td className="p-3 text-right font-medium">{formatInr(h.taxable_value)}</td>
                      <td className="p-3 text-right">{h.rate}%</td>
                      <td className="p-3 text-right text-slate-600">{formatInr(h.cgst)}</td>
                      <td className="p-3 text-right text-slate-600">{formatInr(h.sgst)}</td>
                      <td className="p-3 text-right pr-4 text-slate-600">{formatInr(h.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GSTR-3B */}
      {activeTab === "gstr3b" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">GSTR-3B Tax Summary & Cash Payment</h3>
              <p className="text-xs text-slate-500">Section 3.1 Outward Tax, Section 4 ITC Offset, and Section 6.1 Cash Payment.</p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg">
              Status: {gstr3bData?.filing_status || "PENDING"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Table 3.1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-800 border-b pb-2">3.1 Outward Supplies & Liabilities</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Taxable Outward Supplies:</span>
                  <span className="font-semibold">{formatInr(gstr3bData?.table_3_1_outward_supplies?.taxable_outward_supplies?.taxable)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Integrated Tax (IGST):</span>
                  <span className="font-semibold">{formatInr(gstr3bData?.table_3_1_outward_supplies?.taxable_outward_supplies?.igst)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Central Tax (CGST):</span>
                  <span className="font-semibold">{formatInr(gstr3bData?.table_3_1_outward_supplies?.taxable_outward_supplies?.cgst)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">State Tax (SGST):</span>
                  <span className="font-semibold">{formatInr(gstr3bData?.table_3_1_outward_supplies?.taxable_outward_supplies?.sgst)}</span>
                </div>
              </div>
            </div>

            {/* Table 4 ITC */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-800 border-b pb-2">4. Eligible Input Tax Credit (ITC)</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">All Other ITC (Inward Goods & Services):</span>
                  <span className="font-semibold text-emerald-600">{formatInr(872125)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ITC Under Reverse Charge (RCM):</span>
                  <span className="font-semibold">{formatInr(4250)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Net ITC Available for Set-Off:</span>
                  <span className="font-bold text-emerald-700">{formatInr(876375)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GSTR-2B & ITC RECONCILIATION */}
      {activeTab === "gstr2b" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">GSTR-2B Matching with Purchase Register</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify supplier filings before releasing supplier payments or claiming Input Tax Credit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs font-semibold text-emerald-700">Matched Invoices (ITC Ready)</span>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{gstr2bData?.counts?.matched || 0}</p>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-xs font-semibold text-rose-700">Mismatched Invoices</span>
              <p className="text-2xl font-bold text-rose-800 mt-1">{gstr2bData?.counts?.mismatched || 0}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-xs font-semibold text-amber-700">Missing in GSTR-2B (Pending)</span>
              <p className="text-2xl font-bold text-amber-800 mt-1">{gstr2bData?.counts?.missing_in_gstr2b || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: GST CONFIG */}
      {activeTab === "config" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Registered GSTIN & State Hub Profiles</h3>
            <p className="text-xs text-slate-500 mt-1">Multi-state registrations with invoice prefixes and HSN rates.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gstConfigs.map((cfg) => (
              <div key={cfg._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-sm font-bold text-slate-900">{cfg.gstin}</span>
                    <p className="text-xs text-slate-500 font-medium">{cfg.trade_name || cfg.legal_name}</p>
                  </div>
                  {cfg.is_primary && (
                    <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p><span className="text-slate-400">State:</span> {cfg.state_name} ({cfg.state_code})</p>
                  <p><span className="text-slate-400">Invoice Series Prefix:</span> <code className="bg-slate-100 px-1 py-0.5 rounded">{cfg.tax_invoice_prefix}</code></p>
                  <p><span className="text-slate-400">E-Way Bill Threshold:</span> ₹{cfg.e_way_bill_threshold?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECORD FILING MODAL */}
      {filingModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Record Return Filing Acknowledgement</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the Acknowledgement Reference Number (ARN) provided on the GST Common Portal after successful submission.
            </p>
            <form onSubmit={handleRecordFiling} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Return Type</label>
                <select
                  value={filingType}
                  onChange={(e) => setFilingType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="GSTR-3B">GSTR-3B (Monthly Summary Return)</option>
                  <option value="GSTR-1">GSTR-1 (Outward Supplies)</option>
                  <option value="GSTR-9">GSTR-9 (Annual Return)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ARN (Acknowledgement Ref No.)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AA071026001928X"
                  value={arnInput}
                  onChange={(e) => setArnInput(e.target.value.toUpperCase())}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFilingModal(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Save Filing Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
