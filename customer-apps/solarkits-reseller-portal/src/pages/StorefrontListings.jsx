import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FiTag,
  FiSearch,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertTriangle,
  FiDollarSign,
  FiLayers,
  FiBox,
  FiPackage,
  FiShield,
  FiZap,
  FiInfo,
  FiAward,
} from "react-icons/fi";
import defaultKitImage from "../assets/images/product_solar_kit.jpg";
import api from "../services/api";

const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

function resolveKitImage(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return defaultKitImage;
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean.replace('localhost:3001', 'localhost:5000');
  }
  if (clean.startsWith('/')) {
    return `${BACKEND_BASE}${clean}`;
  }
  return `${BACKEND_BASE}/${clean}`;
}

export default function StorefrontListings() {
  const [listings, setListings] = useState([]);
  const [plan, setPlan] = useState(null);
  const [commissionRates, setCommissionRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("all"); // "all" | "kit" | "product"
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Track active tier per kit: { [itemId]: { type: 'loose' | 'po', qty: number } }
  const [selectedTiers, setSelectedTiers] = useState({});

  const handleTierSelect = (itemId, type, qty) => {
    setSelectedTiers((prev) => ({
      ...prev,
      [itemId]: { type, qty: Number(qty) },
    }));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch plan subscription, listings & configured variation commission rates in parallel
      const [listingsRes, planRes, commRes] = await Promise.all([
        api.get("/india/v1/reseller/listings", {
          params: {
            search: search.trim() || undefined,
            category_id: categoryFilter || undefined,
            stock_status: stockFilter !== "all" ? stockFilter : undefined,
            sort: sortBy || undefined,
          },
        }),
        api.get("/india/v1/reseller/plans/my-subscription").catch(() => ({ data: null })),
        api.get("/india/v1/reseller/commission-rates").catch(() => ({ data: null })),
      ]);

      if (listingsRes.data?.status === "success") {
        setListings(listingsRes.data.data || []);
      }
      if (planRes.data?.status === "success" && planRes.data.data) {
        setPlan(planRes.data.data.plan || planRes.data.data);
      }
      if (commRes.data?.status === "success") {
        setCommissionRates(commRes.data.data || []);
      }
    } catch (err) {
      console.error("Listings fetch error:", err);
      setError("Failed to load franchisee allocated product catalogue.");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, stockFilter, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build commission lookup: kitId -> { [qty]: { po: paise, loose: paise } }
  const commLookup = useMemo(() => {
    const lookup = {};
    commissionRates.forEach((r) => {
      const kitId = (r.combo_kit_id?._id || r.combo_kit_id)?.toString();
      if (!kitId) return;
      if (!lookup[kitId]) lookup[kitId] = {};
      const qty = Number(r.order_quantity);
      if (!lookup[kitId][qty]) lookup[kitId][qty] = {};
      lookup[kitId][qty][r.order_type] = Number(r.commission_amount_paise) || 0;
    });
    return lookup;
  }, [commissionRates]);

  // Filter listings by kit/product type
  const filteredListings = listings.filter((item) => {
    const isKit = item.item_type === "kit" || Boolean(item.kit_id);
    if (itemTypeFilter === "kit") return isKit;
    if (itemTypeFilter === "product") return !isKit;
    return true;
  });

  const totalKits = listings.filter((l) => l.item_type === "kit" || Boolean(l.kit_id)).length;
  const totalProducts = listings.filter((l) => l.item_type !== "kit" && !l.kit_id).length;
  const inStockCount = listings.filter((l) => (l.stock_quantity || 0) > 0).length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
              Franchisee Product Allocation
            </span>
            {plan && (
              <span className="text-xs font-extrabold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <FiShield size={12} /> {plan.name}
              </span>
            )}
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl mt-2 text-slate-900">
            My Product Listings &amp; Allocated Kits
          </h1>
          <p className="text-sm mt-1 text-slate-600">
            Products and combo kits allocated automatically according to your subscribed franchisee plan.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Stat chips */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700">
            <span className="text-base font-black">{listings.length}</span>
            <span className="font-medium opacity-80">Total Items</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700">
            <span className="text-base font-black">{totalKits}</span>
            <span className="font-medium opacity-80">Combo Kits</span>
          </div>


          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
          >
            <FiRefreshCw className={loading ? "animate-spin text-blue-600" : ""} size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold flex items-center gap-2.5 shadow-xs">
          <FiAlertTriangle size={20} className="shrink-0 text-red-600" /> {error}
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search products by name, SKU, capacity kW, or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Item Type Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
            {[
              { id: "all", label: `All Items (${listings.length})` },
              { id: "kit", label: `Combo Kits (${totalKits})` },
              { id: "product", label: `Components (${totalProducts})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setItemTypeFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${itemTypeFilter === tab.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="title_asc">Name: A to Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product List Grid */}
      {loading ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
          <FiRefreshCw className="animate-spin text-blue-600 mx-auto" size={32} />
          <p className="text-slate-600 font-bold text-sm">Loading allocated product catalogue...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <FiBox size={32} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">No Allocated Products Found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              No products match your filter criteria or your subscribed plan does not have products allocated yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredListings.map((item) => {
            const isKit = item.item_type === "kit" || Boolean(item.kit_id);
            const p = item.product_id;
            const k = item.kit_id;

            const kitId = (typeof item.kit_id === "object" ? item.kit_id?._id : item.kit_id)?.toString() || item._id?.toString();

            // Extract pricing tiers and quantities for kits
            const loosePricing = Array.isArray(item.loose_order_pricing) ? item.loose_order_pricing : [];
            const poPricing = Array.isArray(item.po_order_pricing) ? item.po_order_pricing : [];

            // Combine product definition tiers with any configured commission tiers
            const rawLooseQtys = (Array.isArray(item.loose_order_quantities) && item.loose_order_quantities.length > 0)
              ? item.loose_order_quantities
              : ((Array.isArray(k?.loose_order_quantities) && k.loose_order_quantities.length > 0)
                ? k.loose_order_quantities
                : []);
            const commLooseQtys = Object.keys(commLookup[kitId] || {})
              .map(Number)
              .filter((q) => commLookup[kitId]?.[q]?.loose !== undefined);
            const mergedLooseQtys = Array.from(new Set([...rawLooseQtys, ...commLooseQtys])).sort((a, b) => a - b);
            const looseQtys = mergedLooseQtys.length > 0 ? mergedLooseQtys : [5, 10, 15, 20, 25, 30];

            const rawPoQtys = (Array.isArray(item.order_quantities) && item.order_quantities.length > 0)
              ? item.order_quantities
              : ((Array.isArray(k?.order_quantities) && k.order_quantities.length > 0)
                ? k.order_quantities
                : []);
            const commPoQtys = Object.keys(commLookup[kitId] || {})
              .map(Number)
              .filter((q) => commLookup[kitId]?.[q]?.po !== undefined);
            const mergedPoQtys = Array.from(new Set([...rawPoQtys, ...commPoQtys])).sort((a, b) => a - b);
            const poQtys = mergedPoQtys.length > 0 ? mergedPoQtys : [100, 200, 400, 500, 1000];

            // Current selected tier for this item (default to first loose tier or first PO tier)
            const currentTierState = selectedTiers[item._id] || (
              looseQtys.length > 0
                ? { type: "loose", qty: looseQtys[0] }
                : { type: "po", qty: poQtys[0] || 200 }
            );

            const activeQty = isKit ? (currentTierState.qty || 1) : 1;
            const activeType = currentTierState.type || "loose"; // "loose" | "po"

            // Baseline 1-kit cost in INR
            const baselineCostInr = item.cost_price_paise
              ? item.cost_price_paise / 100
              : (p?.base_price || k?.base_price_cached || 1000);

            // Look up active tier price
            let tierPerKitPrice = baselineCostInr;
            let tierSavingsPerKit = 0;

            if (isKit) {
              const activePricingList = activeType === "loose" ? loosePricing : poPricing;
              const matched = activePricingList.find(
                (t) => Number(t.quantity) === Number(activeQty) && Number(t.price_per_kit) > 0
              );
              if (matched) {
                tierPerKitPrice = Number(matched.price_per_kit);
                tierSavingsPerKit = matched.discount_amount || Math.max(0, baselineCostInr - tierPerKitPrice);
              }
            }

            // Cost price in INR for active tier
            const costInr = isKit ? tierPerKitPrice : baselineCostInr;
            const totalCostInr = costInr * activeQty;

            // Resolve dynamic commission from Franchise Variation Commission rules
            let totalCommissionInr = 0;
            let commissionPerKit = 0;
            const kitCommTiers = commLookup[kitId];
            if (isKit && kitCommTiers) {
              if (kitCommTiers[activeQty]?.[activeType] !== undefined) {
                totalCommissionInr = kitCommTiers[activeQty][activeType] / 100;
              } else {
                const availableQtys = Object.keys(kitCommTiers)
                  .map(Number)
                  .filter((q) => kitCommTiers[q]?.[activeType] !== undefined)
                  .sort((a, b) => b - a);
                if (availableQtys.length > 0) {
                  const lowerOrEqual = availableQtys.find((q) => q <= activeQty);
                  const chosenQty = lowerOrEqual !== undefined ? lowerOrEqual : availableQtys[availableQtys.length - 1];
                  totalCommissionInr = (kitCommTiers[chosenQty][activeType] || 0) / 100;
                }
              }
              commissionPerKit = activeQty > 0 ? (totalCommissionInr / activeQty) : 0;
            }

            const taxRate = (item.tax_rate_pct != null && !isNaN(Number(item.tax_rate_pct)))
              ? Number(item.tax_rate_pct)
              : ((k?.gst_rate != null && !isNaN(Number(k.gst_rate)))
                ? Number(k.gst_rate)
                : (k?.tax_pct != null && !isNaN(Number(k.tax_pct))
                  ? Number(k.tax_pct)
                  : (k?.common_gst_rate != null && !isNaN(Number(k.common_gst_rate)) ? Number(k.common_gst_rate) : 0)));
            const subtotalWithMargin = totalCostInr + totalCommissionInr;
            const totalTaxAmount = (subtotalWithMargin * taxRate) / 100;
            const taxAmountPerKit = activeQty > 0 ? (totalTaxAmount / activeQty) : 0;
            const totalEpcPrice = subtotalWithMargin + totalTaxAmount;
            const finalEpcPrice = activeQty > 0 ? (totalEpcPrice / activeQty) : 0;

            const savingsPct = baselineCostInr > 0 && tierSavingsPerKit > 0
              ? ((tierSavingsPerKit / baselineCostInr) * 100).toFixed(1)
              : 0;

            const displayTitle = item.title || p?.name || k?.name || k?.kit_name || (isKit ? "Solar Combo Kit" : "Solar Component");
            const displaySku = p?.sku_code || k?.kit_code || (isKit ? "SKU-KIT" : "SKU-PROD");
            const rawImg = item.image_url || p?.image || p?.image_url || k?.kit_image || k?.image || k?.product_image || (typeof item.kit_id === 'object' ? item.kit_id?.kit_image : null);
            const displayImage = resolveKitImage(rawImg);
            const displayDesc = item.description || p?.description || k?.description || "Certified solar equipment configured under your authorized franchisee plan.";

            return (
              <div
                key={item._id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
              >
                {/* Image & Allocation Badges */}
                <div className="lg:col-span-3 flex flex-col items-center">
                  <div className="w-full h-44 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center p-3 relative">
                    <img
                      src={displayImage}
                      alt={displayTitle}
                      className="max-h-full max-w-full object-contain transition-opacity duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        if (e.currentTarget.src !== defaultKitImage) {
                          e.currentTarget.src = defaultKitImage;
                        }
                      }}
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <FiCheckCircle size={10} /> Active in Plan
                    </span>
                  </div>


                </div>

                {/* Product/Kit Details & Tier Selectors */}
                <div className="lg:col-span-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isKit ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                          Combo Kit
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                          Solar Component
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        SKU: {displaySku}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900 leading-snug">
                      {displayTitle}
                    </h2>
                  </div>

                  {/* Category & Industry Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.industry_type_id?.name && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                        {item.industry_type_id.name}
                      </span>
                    )}
                    {item.category_id?.name && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                        {item.category_id.name}
                      </span>
                    )}
                    {item.brand_id?.name && (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                        Brand: {item.brand_id.name}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-medium line-clamp-2">
                    {displayDesc}
                  </p>

                  {/* ── LOOSE / PO ORDER QUANTITY TIERS SWITCHER (Kits only) ── */}
                  {isKit && (
                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      {/* Tabs: Loose Orders vs PO Orders */}
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
                        <button
                          type="button"
                          onClick={() => handleTierSelect(item._id, "loose", looseQtys[0] || 5)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${activeType === "loose"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          <FiPackage size={11} />
                          Loose Orders ({looseQtys.length} Tiers)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTierSelect(item._id, "po", poQtys[0] || 200)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${activeType === "po"
                            ? "bg-indigo-700 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          <FiLayers size={11} />
                          PO (Purchase Order) ({poQtys.length} Tiers)
                        </button>
                      </div>

                      {/* Quantity Pills for Active Type */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Select {activeType === "loose" ? "Loose Order Quantity" : "PO Bulk Quantity"}:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(activeType === "loose" ? looseQtys : poQtys).map((q) => {
                            const isSelected = activeQty === q;
                            const pricingList = activeType === "loose" ? loosePricing : poPricing;
                            const tierInfo = pricingList.find((t) => Number(t.quantity) === Number(q));
                            const hasCustomPrice = Boolean(tierInfo && tierInfo.price_per_kit > 0);
                            const hasConfiguredComm = Boolean(commLookup[kitId]?.[q]?.[activeType] > 0);

                            return (
                              <button
                                key={q}
                                type="button"
                                onClick={() => handleTierSelect(item._id, activeType, q)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${isSelected
                                  ? activeType === "loose"
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                  }`}
                              >
                                <span>{q} Kits</span>
                                {(hasCustomPrice || hasConfiguredComm) && !isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Configured tier rate" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing Breakdown (Company Configured Tier Commission & EPC Price) */}
                <div className="lg:col-span-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  {/* Selected Tier Badge */}
                  {isKit && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                        {activeType === "loose" ? "Loose Order Tier" : "PO Bulk Tier"}: {activeQty} Kits
                      </span>
                      {tierSavingsPerKit > 0 ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                          ↓ ₹{tierSavingsPerKit.toLocaleString('en-IN')}/kit OFF ({savingsPct}%)
                        </span>
                      ) : totalCommissionInr > 0 ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Tier Commission Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          ⚠️ Commission Not Defined
                        </span>
                      )}
                    </div>
                  )}

                  {/* Franchisee Base Price */}
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <FiTag className="text-slate-400" /> Base Price ({isKit ? `${activeQty} kits` : "1 unit"}):
                    </span>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 font-mono text-sm block">
                        ₹{totalCostInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {isKit && activeQty > 1 && (
                        <span className="text-[10px] text-slate-500 font-medium font-mono">
                          (₹{costInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kit)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Plan / Variation Commission */}
                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <FiAward className="text-emerald-500" /> Plan Commission:
                    </span>
                    <div className="text-right">
                      {totalCommissionInr > 0 ? (
                        <>
                          <span className="font-black text-emerald-700 font-mono text-xs block">
                            +₹{totalCommissionInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {isKit && activeQty > 1 && (
                            <span className="text-[10px] text-emerald-600 font-medium font-mono">
                              (+₹{commissionPerKit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kit)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          ⚠️ Commission Not Defined
                        </span>
                      )}
                    </div>
                  </div>

                  {/* GST */}
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-500 font-semibold flex items-center gap-1">
                      GST ({taxRate}%):
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-slate-700 font-mono text-xs block">
                        +₹{totalTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {/* {isKit && activeQty > 1 && (
                        <span className="text-[10px] text-slate-500 font-medium font-mono">
                          (+₹{taxAmountPerKit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kit)
                        </span>
                      )} */}
                    </div>
                  </div>

                  {/* Final EPC Wholesale Selling Price */}
                  <div className="p-3.5 rounded-xl bg-blue-600/10 border border-blue-600/20 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Final EPC Selling Price</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isKit && activeQty > 1 ? `Total for ${activeQty} Kits (incl. ${taxRate}% GST)` : `Includes ${taxRate}% GST`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-blue-700 font-mono block">
                        ₹{totalEpcPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {isKit && activeQty > 1 && (
                        <span className="text-[10px] font-bold text-blue-600 font-mono">
                          ₹{finalEpcPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kit
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scope Confirmation Badge */}
                  <div className="pt-1 text-center">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1">
                      <FiCheckCircle className="text-emerald-600" size={13} />
                      Allocated for EPC wholesale in your territory
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
