import React, { useState, useEffect } from "react";
import { FiDollarSign, FiRefreshCw, FiSearch, FiCheckCircle, FiShield } from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PaymentsAdminPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/boskit/v1/admin/payments`);
      if (res.data?.success) {
        setPayments(res.data.data?.payments || []);
      }
    } catch (err) {
      console.error("Error loading payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiDollarSign /> Treasury & Settlements
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            BOSKIT Payment Transactions
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Reconciliation ledger for distributor joining fees, recurring subscriptions, and hardware order settlements.
          </p>
        </div>

        <button
          onClick={loadPayments}
          className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors"
        >
          <FiRefreshCw size={16} />
        </button>
      </div>

      <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs">
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading transaction ledger...
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-2">
            <FiShield size={32} className="mx-auto text-text-muted/40" />
            <p className="text-sm font-semibold">No payment transactions recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Transaction Ref</th>
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Entity</th>
                  <th className="p-4">Settlement Amount</th>
                  <th className="p-4">Gateway</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Processed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-text-primary">{p.transaction_ref}</td>
                    <td className="p-4 font-mono text-text-secondary">{p.order_number}</td>
                    <td className="p-4">
                      <div className="font-bold text-text-primary">{p.billing_name || "B2B Partner"}</div>
                      <div className="text-[10px] text-text-muted capitalize">{p.buyer_type}</div>
                    </td>
                    <td className="p-4 font-bold text-emerald-600 text-sm">
                      ₹{Number(p.amount_inr || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">{p.gateway}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 uppercase">
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="p-4 text-text-muted">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "Live"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
