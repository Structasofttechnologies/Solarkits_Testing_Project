import React, { useState, useEffect } from "react";
import { FiUsers, FiSearch, FiRefreshCw, FiDollarSign } from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DealerPricingAdminPage() {
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
      console.error("Error loading dealer pricing:", err);
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
            <FiUsers /> Secondary Distribution Slabs
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            Authorized Dealer Pricing Master
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Admin-defined dealer procurement rates and distributor resale margin boundary limits.
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
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading dealer pricing rules...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Component</th>
                  <th className="p-4">Statutory MRP</th>
                  <th className="p-4">Standard Dealer Rate (10% Discount)</th>
                  <th className="p-4">Distributor Margin Floor (Min 5%)</th>
                  <th className="p-4">Distributor Margin Ceiling (Max 15%)</th>
                  <th className="p-4">Dealer Minimum MOQ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((p) => {
                  const mrp = Number(p.mrp_inr || p.price || 0);
                  const dealerRate = Math.round(mrp * 0.90);
                  const floorRate = Math.round(mrp * 0.85);
                  const ceilingRate = Math.round(mrp * 0.95);
                  return (
                    <tr key={p.id} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-text-primary">{p.name}</div>
                        <div className="text-[10px] font-mono text-text-muted">{p.sku}</div>
                      </td>
                      <td className="p-4 font-bold text-text-primary">
                        ₹{mrp.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 font-bold text-primary">
                        ₹{dealerRate.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 font-semibold text-emerald-600">
                        ₹{floorRate.toLocaleString("en-IN")} (Floor)
                      </td>
                      <td className="p-4 font-semibold text-amber-600">
                        ₹{ceilingRate.toLocaleString("en-IN")} (Ceiling)
                      </td>
                      <td className="p-4 font-semibold text-text-primary">
                        2 units
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
