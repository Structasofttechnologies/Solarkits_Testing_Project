import React, { useState, useEffect } from "react";
import {
  FiPackage,
  FiSearch,
  FiEdit3,
  FiCheckCircle,
  FiAlertCircle,
  FiDollarSign,
  FiPercent,
  FiRefreshCw,
  FiX,
  FiCheck,
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ProductsAdminPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedback, setFeedback] = useState({ type: "", msg: "" });

  // Quick Pricing Edit Modal
  const [editProduct, setEditProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mrpInput, setMrpInput] = useState("");
  const [taxInput, setTaxInput] = useState("");
  const [moqInput, setMoqInput] = useState("");

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/boskit/v1/admin/products?search=${search}&status=${statusFilter}`
      );
      if (res.data?.success) {
        setProducts(res.data.data?.products || []);
      }
    } catch (err) {
      console.error("Error loading products:", err);
      setFeedback({ type: "error", msg: "Failed to load product catalogue." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const handleOpenPricingModal = (p) => {
    setEditProduct(p);
    setMrpInput(p.mrp_inr || p.price || 10000);
    setTaxInput(p.tax_percent || 18);
    setMoqInput(p.min_order_qty || 1);
  };

  const handleSavePricing = async (e) => {
    e.preventDefault();
    if (!editProduct) return;
    try {
      setSaving(true);
      await axios.put(`${API_BASE}/boskit/v1/admin/products/${editProduct.id}/pricing`, {
        mrp_inr: Number(mrpInput),
        tax_percent: Number(taxInput),
        min_order_qty: Number(moqInput),
      });
      setFeedback({ type: "success", msg: `Pricing updated for ${editProduct.name}.` });
      setEditProduct(null);
      loadProducts();
    } catch (err) {
      setFeedback({ type: "error", msg: "Failed to update product pricing." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiPackage /> BOSKIT Hardware Masters
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            Equipment & Component Products
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage solar kits, inverters, cables, and structural components with baseline MRP and statutory GST rates.
          </p>
        </div>

        <button
          onClick={loadProducts}
          className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors self-start sm:self-auto"
        >
          <FiRefreshCw size={16} />
        </button>
      </div>

      {feedback.msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
          }`}
        >
          {feedback.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
          {feedback.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-72">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadProducts()}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-text-muted">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:border-primary font-medium"
          >
            <option value="all">All Products</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs">
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading equipment products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-text-muted">No products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Product Specs</th>
                  <th className="p-4">SKU Code</th>
                  <th className="p-4">Base MRP</th>
                  <th className="p-4">Distributor Rate (Est.)</th>
                  <th className="p-4">Dealer Rate (Est.)</th>
                  <th className="p-4">Tax & MOQ</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-text-primary">{p.name}</div>
                      <div className="text-[10px] text-text-muted">Solar BOS Certified Component</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-text-secondary">{p.sku}</td>
                    <td className="p-4 font-bold text-text-primary">
                      ₹{Number(p.mrp_inr || p.price || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 font-bold text-emerald-600">
                      ₹{Number(p.distributor_rate_inr || (p.price * 0.85)).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 font-bold text-primary">
                      ₹{Number(p.dealer_rate_inr || (p.price * 0.90)).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-text-primary">GST: {p.tax_percent || 18}%</span>
                      <div className="text-[11px] text-text-muted">MOQ: {p.min_order_qty || 1} units</div>
                    </td>
                    <td className="p-4">
                      {p.is_active ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenPricingModal(p)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-primary hover:text-white transition-all text-xs font-semibold"
                      >
                        Adjust Pricing
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Pricing Modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading font-black text-lg text-text-primary">
                Update Pricing & Taxes
              </h3>
              <button
                onClick={() => setEditProduct(null)}
                className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
              >
                <FiX size={18} />
              </button>
            </div>

            <div>
              <div className="text-xs font-bold text-text-primary">{editProduct.name}</div>
              <div className="text-[11px] font-mono text-text-muted">{editProduct.sku}</div>
            </div>

            <form onSubmit={handleSavePricing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Base MRP (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={mrpInput}
                  onChange={(e) => setMrpInput(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  GST Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={taxInput}
                  onChange={(e) => setTaxInput(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Minimum Order Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={moqInput}
                  onChange={(e) => setMoqInput(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-surface-hover text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm"
                >
                  {saving ? "Saving..." : "Save Pricing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
