import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCreditCard, FaCheckCircle, FaExclamationTriangle, 
  FaSearch, FaFileInvoiceDollar, FaRegCheckSquare, FaWhatsapp, FaDownload, FaFileInvoice
} from 'react-icons/fa';

const initialOrdersLog = [
  {
    orderId: "ORD-9843",
    customer: "Solarize India Ltd",
    amount: 450000,
    gateway: "Razorpay",
    status: "Auto-Generated",
    invoiceNo: "TX-2026-0091",
    date: "2026-06-15"
  },
  {
    orderId: "ORD-9844",
    customer: "Go Green Power Ltd",
    amount: 120000,
    gateway: "Stripe",
    status: "Auto-Generated",
    invoiceNo: "TX-2026-0092",
    date: "2026-06-15"
  },
  {
    orderId: "ORD-M101",
    customer: "Vinayaka Green Projects",
    amount: 210000,
    gateway: "Manual Bank NEFT",
    status: "Awaiting Accounts Approval",
    invoiceNo: "",
    date: "2026-06-14"
  },
  {
    orderId: "ORD-M102",
    customer: "Gopal Solar Solutions",
    amount: 88000,
    gateway: "Manual Bank NEFT",
    status: "Approved",
    invoiceNo: "TX-2026-M041",
    date: "2026-06-14"
  }
];

export default function CustomerInvoiceManagement() {
  const [activeTab, setActiveTab] = useState('gateway-orders'); // 'gateway-orders', 'manual-approvals', 'generate-tax'
  const [orders, setOrders] = useState(initialOrdersLog);
  const [searchQuery, setSearchQuery] = useState('');

  // Tax generation form state
  const [taxForm, setForm] = useState({
    customerName: '',
    baseAmount: '100000',
    gstRate: '18', // 18%
    taxType: 'CGST_SGST', // CGST_SGST vs IGST
    orderRef: ''
  });

  const [generatedTaxInvoice, setGeneratedTaxInvoice] = useState(null);

  // Filter lists
  const gatewayOrders = useMemo(() => {
    return orders.filter(o => 
      (o.status === "Auto-Generated" || o.status === "Approved") &&
      (o.customer.toLowerCase().includes(searchQuery.toLowerCase()) || o.orderId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [orders, searchQuery]);

  const manualApprovals = useMemo(() => {
    return orders.filter(o => 
      o.status === "Awaiting Accounts Approval" &&
      (o.customer.toLowerCase().includes(searchQuery.toLowerCase()) || o.orderId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [orders, searchQuery]);

  // Tax calculations
  const taxCalculations = useMemo(() => {
    const base = parseFloat(taxForm.baseAmount) || 0;
    const rate = parseFloat(taxForm.gstRate) || 0;
    const totalTax = (base * rate) / 100;
    const grandTotal = base + totalTax;

    if (taxForm.taxType === 'CGST_SGST') {
      return {
        base,
        cgst: totalTax / 2,
        sgst: totalTax / 2,
        igst: 0,
        grandTotal
      };
    } else {
      return {
        base,
        cgst: 0,
        sgst: 0,
        igst: totalTax,
        grandTotal
      };
    }
  }, [taxForm]);

  // Handlers
  const handleApproveOrder = (order) => {
    const invoiceNo = `TX-2026-M0${Math.floor(42 + Math.random() * 50)}`;
    setOrders(orders.map(o => 
      o.orderId === order.orderId 
        ? { ...o, status: "Approved", invoiceNo: invoiceNo } 
        : o
    ));
    alert(`Payment Approved! Tax Invoice ${invoiceNo} generated successfully.`);
  };

  const handleGenerateInvoiceSubmit = (e) => {
    e.preventDefault();
    const invoiceNo = `TX-2026-TX${Math.floor(100 + Math.random() * 900)}`;
    const newInvoice = {
      invoiceNo,
      customerName: taxForm.customerName,
      orderRef: taxForm.orderRef || "MANUAL-GEN",
      base: taxCalculations.base,
      cgst: taxCalculations.cgst,
      sgst: taxCalculations.sgst,
      igst: taxCalculations.igst,
      grandTotal: taxCalculations.grandTotal,
      date: new Date().toISOString().split('T')[0]
    };

    setGeneratedTaxInvoice(newInvoice);
    setForm({
      customerName: '',
      baseAmount: '100000',
      gstRate: '18',
      taxType: 'CGST_SGST',
      orderRef: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <FaFileInvoiceDollar className="text-primary" />
            Customer Invoice Management
          </h1>
          <p className="text-text-secondary text-sm">
            Generate tax invoices, review auto-generated payment gateway orders, and approve manual payment invoices.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-card p-1 rounded-xl border border-border shadow-xs">
          <button
            onClick={() => setActiveTab('gateway-orders')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'gateway-orders' 
                ? 'gradient-primary text-white shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Invoice Logs ({gatewayOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('manual-approvals')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'manual-approvals' 
                ? 'gradient-primary text-white shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Pending Approvals ({manualApprovals.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('generate-tax');
              setGeneratedTaxInvoice(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'generate-tax' 
                ? 'gradient-primary text-white shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            GST Invoice Generator
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* GATEWAY INVOICE LOGS */}
        {activeTab === 'gateway-orders' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="card overflow-hidden"
          >
            {/* Search */}
            <div className="p-6 border-b border-border bg-linear-to-r from-primary/5 to-transparent">
              <input 
                type="text" 
                placeholder="Search invoice logs by customer or order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md pl-4 pr-4 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto px-6 pb-6 pt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                    <th className="p-4">Invoice No</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Transaction value</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {gatewayOrders.map(o => (
                    <tr key={o.orderId} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-bold text-primary">{o.invoiceNo}</td>
                      <td className="p-4 font-semibold text-text-primary">{o.customer}</td>
                      <td className="p-4 font-semibold text-text-secondary">{o.orderId}</td>
                      <td className="p-4 font-medium text-text-secondary">{o.gateway}</td>
                      <td className="p-4 font-black text-text-primary">₹{o.amount.toLocaleString()}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold text-[9px]">
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button className="p-1 bg-surface border border-border rounded text-primary hover:bg-primary/5 inline-flex items-center gap-1 text-[10px] font-bold">
                          <FaDownload /> Download
                        </button>
                        <button className="p-1 bg-surface border border-border rounded text-success hover:bg-success/5 inline-flex items-center gap-1 text-[10px] font-bold">
                          <FaWhatsapp /> Share
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* MANUAL PAYMENTS PENDING APPROVAL */}
        {activeTab === 'manual-approvals' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="card overflow-hidden"
          >
            <div className="overflow-x-auto px-6 pb-6 pt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg text-text-secondary uppercase text-[10px] font-bold border-b border-border">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer Partner</th>
                    <th className="p-4">Declared Gateway</th>
                    <th className="p-4">Transaction value</th>
                    <th className="p-4">Received Date</th>
                    <th className="p-4">Review Status</th>
                    <th className="p-4 text-center">Accounts Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {manualApprovals.length > 0 ? (
                    manualApprovals.map(o => (
                      <tr key={o.orderId} className="hover:bg-primary/5 transition-colors">
                        <td className="p-4 font-bold text-primary">{o.orderId}</td>
                        <td className="p-4 font-semibold text-text-primary">{o.customer}</td>
                        <td className="p-4 font-medium text-text-secondary">{o.gateway}</td>
                        <td className="p-4 font-black text-text-primary">₹{o.amount.toLocaleString()}</td>
                        <td className="p-4 text-text-secondary font-semibold">{o.date}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-warning/15 text-warning font-bold text-[9px] border border-warning/10 animate-pulse">
                            Awaiting Approval
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleApproveOrder(o)}
                            className="px-3 py-1.5 gradient-primary text-white rounded-lg font-bold text-[10px] shadow-xs active:scale-95 transition-all"
                          >
                            Approve & Release Tax Invoice
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-text-muted italic">
                        All manual orders verified. No pending reviews!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* GST INVOICE GENERATOR */}
        {activeTab === 'generate-tax' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Form */}
            <form onSubmit={handleGenerateInvoiceSubmit} className="lg:col-span-2 card p-6 space-y-4">
              <h3 className="text-base font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
                <FaFileInvoice className="text-primary" />
                GST Tax Invoice Release Board
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase">Customer Name</label>
                  <input 
                    type="text" required placeholder="e.g. Apex Solar Corp"
                    value={taxForm.customerName}
                    onChange={e => setForm({...taxForm, customerName: e.target.value})}
                    className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase">Order ID Reference</label>
                  <input 
                    type="text" required placeholder="e.g. ORD-901"
                    value={taxForm.orderRef}
                    onChange={e => setForm({...taxForm, orderRef: e.target.value})}
                    className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase">Base Transaction Value (₹)</label>
                  <input 
                    type="number" required
                    value={taxForm.baseAmount}
                    onChange={e => setForm({...taxForm, baseAmount: e.target.value})}
                    className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-text-secondary uppercase">GST Tax Mode</label>
                  <select 
                    value={taxForm.taxType}
                    onChange={e => setForm({...taxForm, taxType: e.target.value})}
                    className="w-full mt-1 p-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none"
                  >
                    <option value="CGST_SGST">Intra-State (CGST + SGST @ 9% each)</option>
                    <option value="IGST">Inter-State (IGST @ 18%)</option>
                  </select>
                </div>
              </div>

              {/* Tax Breakdowns */}
              <div className="p-4 bg-bg rounded-xl border border-border space-y-2 text-xs">
                <h4 className="font-bold text-[10px] text-text-muted uppercase tracking-wider">Estimated Tax calculation</h4>
                <div className="flex justify-between">
                  <span>Base Amount:</span>
                  <span className="font-semibold text-text-primary">₹{taxCalculations.base.toLocaleString()}</span>
                </div>
                {taxCalculations.cgst > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>CGST (9%):</span>
                      <span className="font-semibold text-text-primary">₹{taxCalculations.cgst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (9%):</span>
                      <span className="font-semibold text-text-primary">₹{taxCalculations.sgst.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {taxCalculations.igst > 0 && (
                  <div className="flex justify-between">
                    <span>IGST (18%):</span>
                    <span className="font-semibold text-text-primary">₹{taxCalculations.igst.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 font-bold text-sm text-text-primary">
                  <span>Grand Total Tax Invoice:</span>
                  <span className="text-success">₹{taxCalculations.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl gradient-primary text-white font-extrabold text-xs shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <FaFileInvoiceDollar className="text-sm" /> Generate Tax Invoice
              </button>
            </form>

            {/* Generated invoice preview */}
            <div className="space-y-4">
              {generatedTaxInvoice ? (
                <div className="card border border-primary/20 bg-primary/5 p-6 space-y-4 text-xs text-text-secondary animate-in fade-in duration-300">
                  <div className="flex justify-between items-center border-b border-border/70 pb-3">
                    <h4 className="font-bold text-sm text-primary uppercase">Invoice Released</h4>
                    <FaCheckCircle className="text-success text-lg" />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase block">Invoice ID</span>
                      <strong className="text-text-primary text-sm font-mono tracking-wider block">{generatedTaxInvoice.invoiceNo}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase block">Client Name</span>
                      <span className="font-semibold text-text-primary">{generatedTaxInvoice.customerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase block">Order Ref</span>
                      <span className="font-semibold text-text-primary font-mono">{generatedTaxInvoice.orderRef}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase block">GST Details</span>
                      {generatedTaxInvoice.igst > 0 ? (
                        <span className="font-semibold text-text-primary">IGST: ₹{generatedTaxInvoice.igst.toLocaleString()}</span>
                      ) : (
                        <span className="font-semibold text-text-primary">CGST/SGST: ₹{(generatedTaxInvoice.cgst + generatedTaxInvoice.sgst).toLocaleString()}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase block">Total Net Value</span>
                      <strong className="text-text-primary text-sm font-black block">₹{generatedTaxInvoice.grandTotal.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/70 flex gap-2 justify-center">
                    <button className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-[10px] shadow-xs hover:brightness-105 active:scale-95 transition-all">
                      Download Invoice PDF
                    </button>
                    <button className="px-3 py-1.5 bg-success text-white font-bold rounded-lg text-[10px] shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center gap-1">
                      <FaWhatsapp /> Share
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card p-6 border border-dashed border-border bg-bg flex flex-col items-center justify-center text-center space-y-2 h-full min-h-[300px]">
                  <FaFileInvoice className="text-text-muted text-3xl" />
                  <h4 className="font-bold text-text-primary text-xs">Tax Invoice preview</h4>
                  <p className="text-[10px] text-text-secondary max-w-[200px] leading-relaxed">
                    GST breakdowns and printable Tax Invoice receipts will generate here upon completing inputs.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
