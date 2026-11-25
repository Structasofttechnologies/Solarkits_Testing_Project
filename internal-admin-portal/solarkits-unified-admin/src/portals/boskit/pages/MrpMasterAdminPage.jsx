import React, { useState, useEffect } from "react";
import { FiDollarSign, FiSearch, FiEdit3, FiRefreshCw, FiCheckCircle } from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function MrpMasterAdminPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/boskit/v1/admin/products`);
      if (res.data?.success) {
        setProducts(res.data.data?.products || []);
      }
    } catch (err) {
      console.error("Error loading MRP data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiDollarSign /> Price Master Architecture
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            Maximum Retail Price (MRP) Master
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Official statutory retail price benchmark across all Solar BOS Kit components.
          </p>
        </div>
        <button
          onClick={loadProducts}
          className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors"
        >
          <FiRefreshCw size={16} />
        </button>
      </div>

      <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs">
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading MRP baseline records...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Equipment Component</th>
                  <th className="p-4">SKU Code</th>
                  <th className="p-4">Statutory MRP (₹)</th>
                  <th className="p-4">MRP (Paise)</th>
                  <th className="p-4">GST Rate</th>
                  <th className="p-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="p-4 font-bold text-text-primary">{p.name}</td>
                    <td className="p-4 font-mono font-bold text-text-secondary">{p.sku}</td>
                    <td className="p-4 font-bold text-text-primary text-sm">
                      ₹{Number(p.mrp_inr || p.price || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 font-mono text-text-muted">
                      {Number(p.mrp_paise || (p.price ? p.price * 100 : 0)).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-text-primary">{p.tax_percent || 18}%</span>
                    </td>
                    <td className="p-4 text-text-muted">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "Active Record"}
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
