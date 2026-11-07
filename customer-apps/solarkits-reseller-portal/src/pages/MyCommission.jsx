import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import {
  FiPercent,
  FiBox,
  FiPackage,
  FiTag,
  FiInfo,
  FiRefreshCw,
  FiLoader,
  FiSearch,
  FiCheckCircle,
  FiLayers,
  FiArrowUpRight,
} from "react-icons/fi";
import { FaTruck, FaShoppingBag } from "react-icons/fa";

export default function MyCommission() {
  const [commissionRates, setCommissionRates] = useState([]);
  const [authorizedProducts, setAuthorizedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKitId, setActiveKitId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all"); // "all" | "po" | "loose"

  // ── Fetch Commission Rates & Authorized Products ────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [commRes, authRes] = await Promise.all([
        api.get("/india/v1/reseller/commission-rates"),
        api.get("/india/v1/reseller/authorized-products").catch(() => ({ data: { data: [] } })),
      ]);

      if (commRes.data?.status === "success") {
        setCommissionRates(commRes.data.data || []);
      }
      if (authRes.data?.status === "success") {
        setAuthorizedProducts(authRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load commission data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Build Kit Map with Commission Rates & Authorized Kits Info ──────────────
  const kitGroups = useMemo(() => {
    const kitMap = {};

    // 1. Map all items with configured commission rates
    commissionRates.forEach((r) => {
      const kitId = String(r.kit_id || r.combo_kit_id?._id || r.combo_kit_id || "default");
      const kitName = r.kit_name || r.combo_kit_id?.name || r.combo_kit_id?.kit_name || "Combo Kit";
      const kitCode = r.kit_code || r.combo_kit_id?.kit_code || "";
      const capacity = r.capacity || r.combo_kit_id?.capacity || "";

      if (!kitMap[kitId]) {
        kitMap[kitId] = {
          kitId,
          kitName,
          kitCode,
          capacity,
          isAuthorized: true,
          rates: [],
        };
      }
      kitMap[kitId].rates.push(r);
    });

    // 2. Also register any authorized kits from authorized-products
    authorizedProducts.forEach((p) => {
      if (p.scope_type === "kit" || p.is_kit) {
        const kitId = String(p.kit_id || p._id || p.id);
        const kitName = p.kit_name || p.name || "Combo Kit";
        const kitCode = p.kit_code || p.sku_code || "";
        const capacity = p.capacity || "";

        if (!kitMap[kitId]) {
          kitMap[kitId] = {
            kitId,
            kitName,
            kitCode,
            capacity,
            isAuthorized: true,
            rates: [],
          };
        } else {
          // Enrich existing group with any missing metadata
          if (!kitMap[kitId].kitCode && kitCode) kitMap[kitId].kitCode = kitCode;
          if (!kitMap[kitId].capacity && capacity) kitMap[kitId].capacity = capacity;
          if (kitMap[kitId].kitName === "Combo Kit" && kitName !== "Combo Kit") {
            kitMap[kitId].kitName = kitName;
          }
        }
      }
    });

    return Object.values(kitMap);
  }, [commissionRates, authorizedProducts]);

  // Set default active tab once data loads
  useEffect(() => {
    if (kitGroups.length > 0 && activeKitId === "all" && kitGroups.length === 1) {
      setActiveKitId(kitGroups[0].kitId);
    }
  }, [kitGroups, activeKitId]);

  // ── Filtered Kit Groups based on Search & Active Tab ────────────────────────
  const filteredKitGroups = useMemo(() => {
    let list = kitGroups;

    if (activeKitId !== "all") {
      list = list.filter((g) => g.kitId === activeKitId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((g) =>
        g.kitName.toLowerCase().includes(q) ||
        (g.kitCode && g.kitCode.toLowerCase().includes(q)) ||
        (g.capacity && g.capacity.toLowerCase().includes(q))
      );
    }

    return list;
  }, [kitGroups, activeKitId, searchQuery]);

  // ── Summary KPI Calculations ────────────────────────────────────────────────
  const totalKitsCount = kitGroups.length;
  const totalTiersCount = commissionRates.length;
  const maxCommissionPaise = useMemo(() => {
    if (commissionRates.length === 0) return 0;
    return Math.max(...commissionRates.map((r) => r.commission_amount_paise || 0));
  }, [commissionRates]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FiPercent size={22} />
            </span>
            My Commission
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            View and filter tier-based commission structures for all solar kits authorized for your franchise
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            title="Refresh Commission Rates"
          >
            <FiRefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <FiBox size={22} />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Authorized Kits</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{totalKitsCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Eligible for franchise sales</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <FiLayers size={22} />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Active Quantity Tiers</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{totalTiersCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Tier-based incentives set by admin</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <FiArrowUpRight size={22} />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Max Tier Commission</div>
            <div className="text-2xl font-black text-purple-900 mt-0.5">
              ₹{(maxCommissionPaise / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-purple-600 font-medium">Highest bulk order tier reward</div>
          </div>
        </div>
      </div>

      {/* ── Information Banner ─────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
        <FiInfo className="text-emerald-600 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-extrabold text-emerald-800">Your Commission Rate Structure</p>
          <p className="text-xs text-emerald-700 font-semibold mt-0.5 leading-relaxed">
            Commission rates are set individually for your franchise by the admin. Rates differ for
            <span className="font-black text-emerald-900"> PO Orders</span> (bulk franchise inventory purchase) and
            <span className="font-black text-emerald-900"> Loose Orders</span> (individual EPC / direct customer orders).
            Rates are locked at the time of order placement. For PO Quotas assigned to EPCs, commission is calculated and credited pro-rata for kits actually completed by the EPC before the PO ending date (e.g. 150/200 kits), while unfulfilled quotas are penalized to the EPC.
          </p>
        </div>
      </div>

      {/* ── Kit Filter Tabs & Search Bar ───────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Kit Tabs */}
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setActiveKitId("all")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${activeKitId === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
            >
              <FiLayers size={13} />
              All Kits ({kitGroups.length})
            </button>

            {kitGroups.map((g) => (
              <button
                key={g.kitId}
                onClick={() => setActiveKitId(g.kitId)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${activeKitId === g.kitId
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
              >
                <FiBox size={13} />
                <span>{g.kitName}</span>
                {g.rates.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${activeKitId === g.kitId
                      ? "bg-emerald-800 text-white"
                      : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    {g.rates.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 shrink-0">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search kit by name or SKU..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Optional Order Type Filter */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            Order Type Filter:
          </span>
          {[
            { key: "all", label: "All Orders" },
            { key: "po", label: "PO Orders (Bulk)", icon: FaTruck },
            { key: "loose", label: "Loose Orders (EPC)", icon: FaShoppingBag },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setOrderTypeFilter(key)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${orderTypeFilter === key
                ? "bg-slate-100 text-slate-900 border border-slate-300 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              {Icon && <Icon size={11} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Area: Kit Commission Cards ─────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-3 text-sm font-semibold bg-white rounded-3xl border border-slate-200">
          <FiLoader className="animate-spin text-emerald-600" size={24} />
          Loading your commission rates...
        </div>
      ) : filteredKitGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <FiTag className="text-slate-400" size={28} />
          </div>
          <p className="text-base font-extrabold text-slate-800">No Commission Rates Configured</p>
          <p className="text-xs text-slate-500 text-center max-w-md font-semibold leading-relaxed">
            {searchQuery
              ? `No authorized kits match your search "${searchQuery}". Try a different keyword.`
              : "Your admin has not configured individual commission rates for your franchise yet. Please contact your regional admin or support."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredKitGroups.map((group) => {
            // Organize rates by order_quantity
            const byQty = {};
            group.rates.forEach((r) => {
              const qty = r.order_quantity;
              if (!byQty[qty]) byQty[qty] = { po: null, loose: null };
              byQty[qty][r.order_type] = r.commission_amount_paise;
            });

            // Filter quantities according to orderTypeFilter
            let quantities = Object.keys(byQty).map(Number).sort((a, b) => a - b);
            if (orderTypeFilter === "po") {
              quantities = quantities.filter((qty) => byQty[qty].po != null);
            } else if (orderTypeFilter === "loose") {
              quantities = quantities.filter((qty) => byQty[qty].loose != null);
            }

            return (
              <div
                key={group.kitId}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Kit Header Card */}
                <div className="px-6 py-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <FiBox size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 text-lg leading-tight">
                          {group.kitName}
                        </h3>
                        {group.kitCode && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[10px] font-bold">
                            {group.kitCode}
                          </span>
                        )}
                        {group.capacity && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100/60 text-emerald-800 text-[10px] font-extrabold">
                            {group.capacity}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-extrabold flex items-center gap-1">
                          <FiCheckCircle size={10} /> Authorized Kit
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold mt-1">
                        {quantities.length} quantity tier(s) configured · Commission rates set by admin
                      </p>
                    </div>
                  </div>
                </div>

                {/* Commission Table (Without Better Rate) */}
                {quantities.length === 0 ? (
                  <div className="py-12 px-6 text-center text-slate-500 text-xs font-semibold">
                    No tiers match the selected order type filter for this kit.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/75">
                          {/* Column 1: Order Quantity */}
                          <th className="text-left text-slate-600 font-extrabold px-6 py-4 uppercase text-xs tracking-wider w-64">
                            Order Quantity
                          </th>

                          {/* Column 2: PO Order Commission */}
                          {(orderTypeFilter === "all" || orderTypeFilter === "po") && (
                            <th className="text-center text-slate-600 font-extrabold px-6 py-4 uppercase text-xs tracking-wider">
                              <div className="flex items-center justify-center gap-2">
                                <FaTruck className="text-blue-600" size={14} />
                                PO Order Commission
                              </div>
                              <div className="text-[10px] font-semibold text-slate-500 mt-0.5 normal-case tracking-normal">
                                Bulk franchise inventory purchase
                              </div>
                            </th>
                          )}

                          {/* Column 3: Loose Order Commission */}
                          {(orderTypeFilter === "all" || orderTypeFilter === "loose") && (
                            <th className="text-center text-slate-600 font-extrabold px-6 py-4 uppercase text-xs tracking-wider">
                              <div className="flex items-center justify-center gap-2">
                                <FaShoppingBag className="text-emerald-600" size={14} />
                                Loose Order Commission
                              </div>
                              <div className="text-[10px] font-semibold text-slate-500 mt-0.5 normal-case tracking-normal">
                                Individual EPC / customer order
                              </div>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {quantities.map((qty) => {
                          const poAmt = byQty[qty].po;
                          const looseAmt = byQty[qty].loose;
                          const poRs = poAmt != null ? poAmt / 100 : null;
                          const looseRs = looseAmt != null ? looseAmt / 100 : null;
                          const hasBoth = poRs != null && looseRs != null;
                          const tierTypeLabel = hasBoth
                            ? "PO & Loose Tier"
                            : poRs != null
                              ? "Bulk PO Tier"
                              : "Loose Order Tier";

                          return (
                            <tr key={qty} className="hover:bg-slate-50/70 transition-colors">
                              {/* Order Quantity Column */}
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-100 flex flex-col items-center justify-center shrink-0">
                                    <span className="text-2xl font-black text-amber-600 leading-none">
                                      {qty}
                                    </span>
                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">
                                      Kits
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-black text-slate-900 text-sm">
                                      {qty} Kits Order
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${hasBoth
                                          ? "bg-purple-100 text-purple-800"
                                          : poRs != null
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-emerald-100 text-emerald-800"
                                          }`}
                                      >
                                        {tierTypeLabel}
                                      </span>
                                      <span className="text-xs text-slate-400 font-medium">
                                        Min: {qty}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* PO Commission Column */}
                              {(orderTypeFilter === "all" || orderTypeFilter === "po") && (
                                <td className="px-6 py-5 text-center">
                                  {poRs != null ? (
                                    <div>
                                      <div className="text-xl font-black tabular-nums text-blue-700">
                                        ₹{poRs.toLocaleString("en-IN")}
                                      </div>
                                      <div className="text-xs text-slate-500 font-semibold mt-0.5">
                                        total for {qty} kits
                                      </div>
                                      <div className="text-xs font-extrabold text-blue-600 mt-1">
                                        Effective: ₹{(poRs / qty).toLocaleString("en-IN", {
                                          maximumFractionDigits: 1,
                                        })}
                                        /kit
                                      </div>
                                    </div>
                                  ) : (
                                    <span
                                      className="text-slate-400 font-bold text-sm"
                                      title="Not applicable for this quantity tier"
                                    >
                                      —
                                    </span>
                                  )}
                                </td>
                              )}

                              {/* Loose Commission Column */}
                              {(orderTypeFilter === "all" || orderTypeFilter === "loose") && (
                                <td className="px-6 py-5 text-center">
                                  {looseRs != null ? (
                                    <div>
                                      <div className="text-xl font-black tabular-nums text-emerald-700">
                                        ₹{looseRs.toLocaleString("en-IN")}
                                      </div>
                                      <div className="text-xs text-slate-500 font-semibold mt-0.5">
                                        total for {qty} kits
                                      </div>
                                      <div className="text-xs font-extrabold text-emerald-600 mt-1">
                                        Effective: ₹{(looseRs / qty).toLocaleString("en-IN", {
                                          maximumFractionDigits: 1,
                                        })}
                                        /kit
                                      </div>
                                    </div>
                                  ) : (
                                    <span
                                      className="text-slate-400 font-bold text-sm"
                                      title="Not applicable for this quantity tier"
                                    >
                                      —
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Calculation Explainer Footer */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-50 border-t border-slate-200">
                  <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>📌 How your commission is calculated</span>
                  </p>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                    When an order is placed for <strong>N kits</strong> of <strong>{group.kitName}</strong>,
                    your franchise receives the configured tier commission based on the order quantity threshold.
                    {quantities.length > 0 && byQty[quantities[0]]?.po ? (
                      <span className="block mt-1 text-slate-700">
                        Live Tier 1 Rate: For a {quantities[0]}-kit PO order, your gross commission is ₹
                        {(byQty[quantities[0]].po / 100).toLocaleString("en-IN")} (≈ ₹
                        {((byQty[quantities[0]].po / 100) / quantities[0]).toLocaleString("en-IN", {
                          maximumFractionDigits: 1,
                        })}
                        /kit).
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

