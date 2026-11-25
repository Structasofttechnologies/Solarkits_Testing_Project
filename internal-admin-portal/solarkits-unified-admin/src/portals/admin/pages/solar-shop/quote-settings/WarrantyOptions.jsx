import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiShield,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiAlertCircle,
  FiPercent,
  FiDollarSign,
} from "react-icons/fi";

const rawApiUrl = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api").replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return "₹0";
  const rupees = Math.round(paise / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

export default function WarrantyOptions() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    duration_months: 60,
    covered_products: "",
    terms: "",
    pricing_mode: "fixed", // fixed | percentage
    price_per_kit_inr: 0,
    price_pct: 0,
    is_active: true,
  });

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin-api/quote-settings/warranty-options`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        setOptions(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load warranty options:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      duration_months: 60,
      covered_products: "Complete Solar ComboKit System and Inverter",
      terms: "Comprehensive replacement warranty with priority on-site support.",
      pricing_mode: "fixed",
      price_per_kit_inr: 5000,
      price_pct: 5,
      is_active: true,
    });
    setError("");
    setModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      duration_months: item.duration_months || 12,
      covered_products: item.covered_products || "",
      terms: item.terms || "",
      pricing_mode: item.pricing_mode || "fixed",
      price_per_kit_inr: item.price_per_kit_paise ? Math.round(item.price_per_kit_paise / 100) : 0,
      price_pct: item.price_pct || 0,
      is_active: item.is_active !== false,
    });
    setError("");
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        duration_months: Number(form.duration_months),
        covered_products: form.covered_products,
        terms: form.terms,
        pricing_mode: form.pricing_mode,
        price_per_kit_paise: form.pricing_mode === "fixed" ? Number(form.price_per_kit_inr) * 100 : 0,
        price_pct: form.pricing_mode === "percentage" ? Number(form.price_pct) : 0,
        is_active: form.is_active,
      };

      if (editingId) {
        await axios.put(`${API_BASE}/admin-api/quote-settings/warranty-options/${editingId}`, payload, {
          headers: authHeaderObj(),
        });
      } else {
        await axios.post(`${API_BASE}/admin-api/quote-settings/warranty-options`, payload, {
          headers: authHeaderObj(),
        });
      }

      setModal(false);
      fetchOptions();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save warranty option.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this warranty package?")) return;
    try {
      await axios.delete(`${API_BASE}/admin-api/quote-settings/warranty-options/${id}`, {
        headers: authHeaderObj(),
      });
      fetchOptions();
    } catch (err) {
      alert("Failed to delete warranty option.");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <FiShield size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Quotation Warranty & Protection Packages
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Define standard and extended warranty tiers selectable during EPC quote generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOptions}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
          >
            <FiRefreshCw size={15} />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition"
          >
            <FiPlus size={16} />
            <span>Add Warranty Package</span>
          </button>
        </div>
      </div>

      {/* Warranty Options Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-400">Loading warranty options...</p>
          </div>
        ) : options.length === 0 ? (
          <div className="py-16 text-center">
            <FiShield size={36} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Warranty Packages Configured</h3>
            <p className="text-xs text-slate-400 mt-1">Add warranty options to offer extended protection on EPC quotes.</p>
            <button
              onClick={openCreate}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold"
            >
              <FiPlus size={14} /> Add First Package
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Package Name</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Pricing Mode</th>
                  <th className="py-3 px-4">Price / Charge</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {options.map((opt) => (
                  <tr key={opt._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{opt.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal line-clamp-1 max-w-xs mt-0.5">
                        {opt.covered_products || opt.terms}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {opt.duration_months} Months ({Math.round(opt.duration_months / 12)} Yrs)
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 font-medium">
                        {opt.pricing_mode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {opt.pricing_mode === "percentage"
                        ? `+${opt.price_pct}% of Kit Subtotal`
                        : `${formatINR(opt.price_per_kit_paise)} / Kit`}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          opt.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {opt.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(opt)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Edit"
                        >
                          <FiEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(opt._id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingId ? "Edit Warranty Package" : "Add Warranty Package"}
              </h3>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            {error && (
              <div className="my-3 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
                <FiAlertCircle size={15} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Extended 5-Year Comprehensive Warranty"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.duration_months}
                    onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Pricing Mode</label>
                  <select
                    value={form.pricing_mode}
                    onChange={(e) => setForm({ ...form, pricing_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="fixed">Fixed ₹ Per Kit</option>
                    <option value="percentage">% Percentage of Kit</option>
                  </select>
                </div>
              </div>

              {form.pricing_mode === "fixed" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Price Per Kit (₹ INR) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.price_per_kit_inr}
                    onChange={(e) => setForm({ ...form, price_per_kit_inr: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Percentage of Kit Price (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    required
                    value={form.price_pct}
                    onChange={(e) => setForm({ ...form, price_pct: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Covered Products / Scope</label>
                <input
                  type="text"
                  value={form.covered_products}
                  onChange={(e) => setForm({ ...form, covered_products: e.target.value })}
                  placeholder="e.g. Solar Modules, Inverters, ACDB/DCDB, and Earthing"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Warranty Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  placeholder="Terms, replacement turnaround time, exclusions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow"
                >
                  {saving ? "Saving..." : "Save Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
