import React, { useState, useEffect } from "react";
import { FiDollarSign, FiSearch, FiRefreshCw, FiPercent } from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DistributorRateMasterAdminPage() {
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
      console.error("Error loading distributor rates:", err);
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
            <FiPercent /> Commercial Wholesale Governance
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            Distributor Purchase Rate Master
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Authorized regional franchise procurement pricing, wholesale margins, and container volume discount slabs.
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
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading distributor wholesale rates...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Component</th>
                  <th className="p-4">Statutory MRP</th>
                  <th className="p-4">Standard Wholesale Rate (15% Margin)</th>
                  <th className="p-4">Tier Growth Slab (18% Margin)</th>
                  <th className="p-4">Mega Apex Slab (22% Margin)</th>
                  <th className="p-4">Min Batch MOQ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((p) => {
                  const mrp = Number(p.mrp_inr || p.price || 0);
                  return (
                    <tr key={p.id} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-text-primary">{p.name}</div>
                        <div className="text-[10px] font-mono text-text-muted">{p.sku}</div>
                      </td>
                      <td className="p-4 font-bold text-text-primary">
                        ₹{mrp.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 font-bold text-emerald-600">
                        ₹{Math.round(mrp * 0.85).toLocaleString("en-IN")}
                        <span className="text-[10px] text-text-muted ml-1 font-normal">(Base)</span>
                      </td>
                      <td className="p-4 font-bold text-primary">
                        ₹{Math.round(mrp * 0.82).toLocaleString("en-IN")}
                        <span className="text-[10px] text-text-muted ml-1 font-normal">(20+ units)</span>
                      </td>
                      <td className="p-4 font-bold text-amber-600">
                        ₹{Math.round(mrp * 0.78).toLocaleString("en-IN")}
                        <span className="text-[10px] text-text-muted ml-1 font-normal">(50+ units)</span>
                      </td>
                      <td className="p-4 font-semibold text-text-primary">
                        {p.min_order_qty || 5} units
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
