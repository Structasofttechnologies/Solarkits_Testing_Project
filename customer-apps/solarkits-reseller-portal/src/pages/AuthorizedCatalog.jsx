import { useState, useEffect } from "react";
import api from "../services/api";
import {
  FiPackage, FiCheckCircle, FiXCircle, FiLoader,
  FiGrid, FiLayers, FiBox, FiRefreshCw, FiInfo, FiTag,
  FiAlertCircle, FiAlertTriangle,
} from "react-icons/fi";
import { FaTruck, FaShoppingBag } from "react-icons/fa";

const SCOPE_ICONS = {
  all: FiGrid,
  category: FiLayers,
  subcategory: FiLayers,
  product: FiPackage,
  kit: FiBox,
};

const SCOPE_COLORS = {
  all: { bg: "#e0e7ff", text: "#4338ca" },
  category: { bg: "#dbeafe", text: "#1d4ed8" },
  subcategory: { bg: "#ede9fe", text: "#7c3aed" },
  product: { bg: "#dcfce7", text: "#15803d" },
  kit: { bg: "#fef3c7", text: "#d97706" },
};

// ─── Commission Badge ─────────────────────────────────────────────────────────
function CommBadge({ amount, type, qty }) {
  if (amount == null) return <span className="text-slate-400 text-xs font-bold">—</span>;
  const rs = amount / 100;
  const ispo = type === "po";
  const perKit = qty && qty > 0 ? Math.round((rs / qty) * 10) / 10 : null;
  return (
    <div className="space-y-0.5">
      <div className={`text-sm font-black tabular-nums ${ispo ? "text-blue-700" : "text-emerald-700"}`}>
        ₹{rs.toLocaleString("en-IN")}
        <span className="text-[10px] font-semibold text-slate-500 ml-1">total</span>
      </div>
      {perKit != null && (
        <div className={`text-[10px] font-bold ${ispo ? "text-blue-500" : "text-emerald-500"}`}>
          {qty} kits • ₹{perKit.toLocaleString("en-IN")}/kit
        </div>
      )}
    </div>
  );
}

export default function AuthorizedCatalog() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "kit" | "product" | "category"

  // Commission rates per kit
  const [commissionRates, setCommissionRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  // Selected quantity tier for preview
  const [selectedQty, setSelectedQty] = useState({}); // { [kitId]: qty }

  const fetchRules = () => {
    setLoading(true);
    api.get("/india/v1/reseller/authorized-products")
      .then((res) => { if (res.data?.status === "success") setRules(res.data.data); })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  const fetchCommissionRates = () => {
    setLoadingRates(true);
    api.get("/india/v1/reseller/commission-rates")
      .then((res) => {
        if (res.data?.status === "success") setCommissionRates(res.data.data || []);
      })
      .catch(() => { })
      .finally(() => setLoadingRates(false));
  };

  useEffect(() => {
    fetchRules();
    fetchCommissionRates();
  }, []);

  // Build commission lookup: kitId → { [qty]: { po, loose } }
  const commLookup = {};
  commissionRates.forEach((r) => {
    const kitId = r.combo_kit_id?._id || r.combo_kit_id;
    if (!kitId) return;
    if (!commLookup[kitId]) commLookup[kitId] = {};
    const qty = r.order_quantity;
    if (!commLookup[kitId][qty]) commLookup[kitId][qty] = {};
    commLookup[kitId][qty][r.order_type] = r.commission_amount_paise;
  });

  // Get all available qty tiers for a given kit
  const getQtyTiers = (kitId) => {
    if (!commLookup[kitId]) return [];
    return Object.keys(commLookup[kitId]).map(Number).sort((a, b) => a - b);
  };

  // Find kit commission for a given product rule
  const getKitComm = (r) => {
    const kitId = r.kit_id || r.kit?._id || r.kit?.id || (r.scope_type === "kit" ? (r.id || r._id) : null);
    if (!kitId || !commLookup[kitId]) return null;
    return { kitId, data: commLookup[kitId] };
  };

  // Derive the display name from the rule/item
  const getDisplayName = (r) => {
    if (r.scope_type === "kit") return r.kit_name || r.name || r.kit?.kit_name || r.kit?.name || "Combo Kit";
    if (r.scope_type === "product") return r.name || r.product?.name || "Product";
    if (r.scope_type === "subcategory") return r.subcategory?.name || "Subcategory";
    if (r.scope_type === "category") return r.category?.name || "Category";
    if (r.scope_type === "all") return "All Catalog Items";
    return r.name || "Unknown";
  };

  const getScopeLabel = (scopeType) => ({
    all: "All Catalog", category: "Category", subcategory: "Subcategory",
    product: "Product", kit: "Combo Kit",
  }[scopeType] || scopeType);

  const filteredRules = filter === "all"
    ? rules
    : rules.filter((r) => r.scope_type === filter);

  const counts = {
    all: rules.length,
    kit: rules.filter((r) => r.scope_type === "kit").length,
    product: rules.filter((r) => r.scope_type === "product").length,
  };

  // Check if any kit has commission data or kits exist in catalog
  const hasKits = rules.some((r) => r.scope_type === "kit" || r.kit_id);
  const hasCommissionData = commissionRates.length > 0 || hasKits;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <FiPackage className="text-blue-600" size={28} />
            Authorized Catalog & Product Matrix
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Explore product categories and solar kits authorized for your partner account, along with commission rates
          </p>
        </div>
        <button
          onClick={() => { fetchRules(); fetchCommissionRates(); }}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors self-start"
          title="Refresh"
        >
          <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: `All (${counts.all})` },
          { key: "kit", label: `Combo Kits (${counts.kit})` },
          ...(counts.product > 0 ? [{ key: "product", label: `Products (${counts.product})` }] : []),
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all ${filter === key
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Commission Info Banner ─────────────────────────────────────── */}
      {hasCommissionData && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <FiTag className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <p className="text-xs font-semibold text-amber-800">
            <strong>Commission rates shown below</strong> are your individual franchise rates —
            select a quantity tier to see PO and Loose order commissions for each kit.
          </p>
        </div>
      )}

      {/* ── Summary Info ──────────────────────────────────────────────── */}
      {!loading && rules.length === 0 && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-3 text-blue-800 text-sm font-semibold">
          <FiInfo className="shrink-0" size={20} />
          No explicit authorization rules configured yet. All standard catalog items are available under your active plan.
        </div>
      )}

      {/* ── Authorization Matrix Table ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold gap-2">
            <FiLoader className="animate-spin text-blue-600" size={24} />
            Loading product authorization matrix...
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="py-20 text-center text-slate-600 text-sm font-semibold">
            No authorization rules found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-slate-700 font-extrabold px-6 py-4 uppercase text-xs tracking-wider">Scope Level</th>
                  <th className="text-left text-slate-700 font-extrabold px-6 py-4 uppercase text-xs tracking-wider">Target Entity</th>
                  <th className="text-center text-slate-700 font-extrabold px-6 py-4 uppercase text-xs tracking-wider">Authorization</th>
                  {hasCommissionData && (
                    <>
                      <th className="text-center text-slate-700 font-extrabold px-4 py-4 uppercase text-xs tracking-wider">
                        <div className="flex items-center justify-center gap-1.5">
                          <FaTruck className="text-blue-600" size={12} />
                          PO Commission
                        </div>
                      </th>
                      <th className="text-center text-slate-700 font-extrabold px-4 py-4 uppercase text-xs tracking-wider">
                        <div className="flex items-center justify-center gap-1.5">
                          <FaShoppingBag className="text-emerald-600" size={12} />
                          Loose Commission
                        </div>
                      </th>
                      <th className="text-center text-slate-700 font-extrabold px-4 py-4 uppercase text-xs tracking-wider">
                        Qty Tier
                      </th>
                    </>
                  )}
                  <th className="text-center text-slate-700 font-extrabold px-6 py-4 uppercase text-xs tracking-wider">Rule Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRules.map((r, idx) => {
                  const ScopeIcon = SCOPE_ICONS[r.scope_type] || FiPackage;
                  const scopeColor = SCOPE_COLORS[r.scope_type] || SCOPE_COLORS.product;
                  const displayName = getDisplayName(r);
                  const isAuthorized = r.is_authorized !== false;

                  // Commission data for kit items
                  const kitComm = r.scope_type === "kit" ? getKitComm(r) : null;
                  const qtyTiers = kitComm ? getQtyTiers(kitComm.kitId) : [];
                  const currentQty = selectedQty[kitComm?.kitId] || qtyTiers[0];
                  const currentCommData = kitComm && currentQty ? kitComm.data[currentQty] : null;

                  return (
                    <tr key={r.id || r._id || idx} className="hover:bg-slate-50/80 transition-colors">
                      {/* Scope */}
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold"
                          style={{ backgroundColor: scopeColor.bg, color: scopeColor.text }}
                        >
                          <ScopeIcon size={12} />
                          {getScopeLabel(r.scope_type)}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4 font-black text-blue-600">{displayName}</td>

                      {/* Authorization */}
                      <td className="px-6 py-4 text-center">
                        {isAuthorized ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                            <FiCheckCircle size={13} /> Authorized
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-extrabold">
                            <FiXCircle size={13} /> Restricted
                          </span>
                        )}
                      </td>

                      {/* PO Commission */}
                      {hasCommissionData && (
                        <td className="px-4 py-4 text-center">
                          {loadingRates ? (
                            <FiLoader className="animate-spin text-slate-400 mx-auto" size={14} />
                          ) : currentCommData?.po != null && Number(currentCommData.po) > 0 ? (
                            <CommBadge amount={currentCommData.po} type="po" qty={currentQty} />
                          ) : r.scope_type === "kit" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20" title="Commission setting is not defined in Franchise Commission Settings">
                              <FiAlertCircle size={11} className="text-amber-600 shrink-0" />
                              <span>Not Defined</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold">—</span>
                          )}
                        </td>
                      )}

                      {/* Loose Commission */}
                      {hasCommissionData && (
                        <td className="px-4 py-4 text-center">
                          {loadingRates ? (
                            <FiLoader className="animate-spin text-slate-400 mx-auto" size={14} />
                          ) : currentCommData?.loose != null && Number(currentCommData.loose) > 0 ? (
                            <CommBadge amount={currentCommData.loose} type="loose" qty={currentQty} />
                          ) : r.scope_type === "kit" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20" title="Commission setting is not defined in Franchise Commission Settings">
                              <FiAlertCircle size={11} className="text-amber-600 shrink-0" />
                              <span>Not Defined</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold">—</span>
                          )}
                        </td>
                      )}

                      {/* Qty Tier selector */}
                      {hasCommissionData && (
                        <td className="px-4 py-4 text-center">
                          {r.scope_type === "kit" && qtyTiers.length > 0 ? (
                            <select
                              value={currentQty || ""}
                              onChange={(e) =>
                                setSelectedQty((prev) => ({
                                  ...prev,
                                  [kitComm.kitId]: Number(e.target.value),
                                }))
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              {qtyTiers.map((qty) => (
                                <option key={qty} value={qty}>{qty} Kits</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 text-xs">N/A</span>
                          )}
                        </td>
                      )}

                      {/* Rule Source */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold ${r.source === "admin_override"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : r.source === "admin_assigned"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}>
                          {r.source === "admin_override"
                            ? "Admin Override"
                            : r.source === "admin_assigned"
                              ? "Admin Assigned"
                              : r.source === "plan_default" || !r.source
                                ? "Plan Default"
                                : r.source.replace(/_/g, " ")}
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
    </div>
  );
}
