import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import axiosInstance from "@/utils/axiosInstance";
import { addToCart, syncCartWithBackend } from "@/features/slice";
import { setAlert } from "@/features/alert.slice";
import { hasPermission } from "@/utils/permissions";
import {
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiShoppingBag,
  FiBox,
  FiPercent,
  FiTruck,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiZap,
  FiPackage,
  FiTag,
  FiX,
  FiInfo,
  FiArrowDown,
  FiArrowUp,
  FiCheckCircle,
} from "react-icons/fi";
import { MdSolarPower, MdOutlineInventory2 } from "react-icons/md";
import IndustryDashboardBanner from "@/Components/IndustryDashboardBanner";

/* ─── Stock badge ─────────────────────────────────────────────────────────── */
function StockBadge({ label }) {
  const map = {
    in_stock: { text: "In Stock", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    low_stock: { text: "Low Stock", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    out_of_stock: { text: "Out of Stock", cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const config = map[label] || map.in_stock;
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border shadow-xs ${config.cls}`}>
      {config.text}
    </span>
  );
}

/* ─── Price display (Clean Light Mode) ────────────────────────────────────── */
function PriceCard({ item, selectedQty, activeTierPrice }) {
  const priceINR = activeTierPrice > 0 ? activeTierPrice : parseFloat(item.selling_price_inr || 0);
  const gstRate = Number(item.gst_rate_pct || 18);
  const baseINR = priceINR > 0 ? Math.round(priceINR / (1 + (gstRate / 100))) : 0;
  const taxINR = Math.max(0, priceINR - baseINR);
  const totalBatchValue = selectedQty > 1 ? (priceINR * selectedQty) : null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Unit Price (excl. GST)</span>
        <span className="font-medium text-slate-700">₹{baseINR.toLocaleString("en-IN")}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>GST ({gstRate}%)</span>
        <span className="font-medium text-slate-700">+ ₹{taxINR.toLocaleString("en-IN")}</span>
      </div>
      <div className="h-px bg-slate-200/80 my-1" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-900">Total Price / Kit</span>
        <span className="text-lg font-bold text-emerald-600">
          ₹{priceINR.toLocaleString("en-IN")}
        </span>
      </div>
      {totalBatchValue && (
        <div className="pt-1 mt-1 border-t border-slate-200 flex items-center justify-between text-xs font-black text-indigo-700">
          <span>Batch Total ({selectedQty} kits)</span>
          <span>₹{totalBatchValue.toLocaleString("en-IN")}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Specs accordion ─────────────────────────────────────────────────────── */
function SpecsAccordion({ specs }) {
  const [open, setOpen] = useState(false);
  if (!specs || Object.keys(specs).length === 0) return null;

  const entries = Object.entries(specs).slice(0, 12);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        {open ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        {open ? "Hide" : "View"} Specifications ({entries.length})
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs border border-slate-200 rounded-lg p-3 bg-white shadow-xs">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-1 overflow-hidden">
              <span className="text-slate-500 truncate">{k}:</span>
              <span className="text-slate-800 font-medium truncate">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Product Card (Bright Theme) ─────────────────────────────────────────── */
function ProductCard({ item, onAddToCart }) {
  const defaultImg = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";

  // ── Order quantities (Loose vs PO) ─────────────────────────────────
  const looseOrderQuantities = useMemo(() => {
    const rawLoose = item?.loose_order_quantities || item?.looseOrderQuantities || [];
    const fromPricing = (item?.loose_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);
    return [...new Set([...(Array.isArray(rawLoose) ? rawLoose.map(Number) : []), ...fromPricing])]
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);
  }, [item?.loose_order_quantities, item?.looseOrderQuantities, item?.loose_order_pricing]);

  const poOrderQuantities = useMemo(() => {
    const rawPo = item?.order_quantities || item?.orderQuantities || [];
    const fromPricing = (item?.po_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);
    return [...new Set([...(Array.isArray(rawPo) ? rawPo.map(Number) : []), ...fromPricing])]
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);
  }, [item?.order_quantities, item?.orderQuantities, item?.po_order_pricing]);

  const hasLooseQuantities = looseOrderQuantities.length > 0;
  const hasPoQuantities = poOrderQuantities.length > 0;
  const [activeTierType, setActiveTierType] = useState(() => (hasLooseQuantities ? "loose" : "po"));

  const currentCategoryQuantities = useMemo(() => {
    if (activeTierType === "loose") {
      return hasLooseQuantities ? looseOrderQuantities : poOrderQuantities;
    }
    return hasPoQuantities ? poOrderQuantities : looseOrderQuantities;
  }, [activeTierType, hasLooseQuantities, hasPoQuantities, looseOrderQuantities, poOrderQuantities]);

  const orderQuantities = useMemo(() => {
    const all = [...new Set([...looseOrderQuantities, ...poOrderQuantities])].sort((a, b) => a - b);
    return all.length > 0 ? all : (currentCategoryQuantities.length > 0 ? currentCategoryQuantities : []);
  }, [looseOrderQuantities, poOrderQuantities, currentCategoryQuantities]);

  const hasQtyVariants = orderQuantities.length > 0;
  const [selectedQty, setSelectedQty] = useState(() => currentCategoryQuantities[0] ?? null);

  useEffect(() => {
    if (currentCategoryQuantities.length > 0) setSelectedQty(currentCategoryQuantities[0]);
  }, [item?.id, activeTierType, currentCategoryQuantities]);

  // Active Tier Price lookup
  const activeTierPrice = useMemo(() => {
    const qty = Number(selectedQty);
    if (!qty) return null;

    const looseList = Array.isArray(item?.loose_order_pricing) ? item.loose_order_pricing : [];
    const poList = Array.isArray(item?.po_order_pricing) ? item.po_order_pricing : [];

    const matchedLoose = looseList.find((t) => Number(t.quantity) === qty && Number(t.price_per_kit) > 0);
    if (matchedLoose) return Number(matchedLoose.price_per_kit);

    const matchedPo = poList.find((t) => Number(t.quantity) === qty && Number(t.price_per_kit) > 0);
    if (matchedPo) return Number(matchedPo.price_per_kit);

    return null;
  }, [selectedQty, item?.loose_order_pricing, item?.po_order_pricing]);

  return (
    <article
      className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 hover:shadow-lg transition-all duration-200"
      aria-label={`Product: ${item.title}`}
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-slate-100 border-b border-slate-100 flex items-center justify-center">
        <img
          src={item.image_url || defaultImg}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.target.src = defaultImg; }}
        />
        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <StockBadge label={item.availability_label} />
          {item.industry_type && (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs">
              {item.industry_type.name}
            </span>
          )}
        </div>
        {/* Brand logo */}
        {item.brand?.logo && (
          <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm p-1">
            <img src={item.brand.logo} alt={item.brand.name} className="w-8 h-8 object-contain" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* SKU + brand */}
        <div className="flex items-center justify-between mb-1.5">
          {item.sku_code ? (
            <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
              SKU: {item.sku_code}
            </span>
          ) : <span />}
          {item.brand?.name && (
            <span className="text-xs text-slate-500 font-medium">{item.brand.name}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {item.title}
        </h3>

        {/* Category breadcrumb */}
        {(item.category || item.subcategory) && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
            {item.category && <span className="font-medium text-slate-600">{item.category.name}</span>}
            {item.category && item.subcategory && <span>›</span>}
            {item.subcategory && <span>{item.subcategory.name}</span>}
          </div>
        )}

        {/* Description */}
        {item.description && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Features */}
        {item.features && item.features.length > 0 && (
          <ul className="mt-1 space-y-1 mb-2">
            {item.features.slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                <FiCheckCircle size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{f}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Specifications */}
        <SpecsAccordion specs={item.specifications} />

        {/* ── Order Quantity Variation ─────────────────────────────────────── */}
        {hasQtyVariants && (
          <div className="mt-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FiPackage size={11} />
              Order Quantity Options
            </p>
            {hasLooseQuantities && hasPoQuantities && (
              <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[10px] font-bold mb-2">
                <button
                  type="button"
                  onClick={() => setActiveTierType("loose")}
                  className={`flex-1 py-1 px-1.5 rounded-md transition-all text-center ${
                    activeTierType === "loose"
                      ? "bg-white text-indigo-700 shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Loose Orders
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTierType("po")}
                  className={`flex-1 py-1 px-1.5 rounded-md transition-all text-center ${
                    activeTierType === "po"
                      ? "bg-white text-amber-700 shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Bulk PO Orders
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {currentCategoryQuantities.map((qty) => (
                <button
                  key={qty}
                  onClick={() => setSelectedQty(qty)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${selectedQty === qty
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300"
                    }`}
                >
                  {qty} {qty === 1 ? "KIT" : "KITS"}
                </button>
              ))}
            </div>
            {selectedQty && (
              <p className="text-[10px] text-indigo-600 font-semibold mt-1.5">
                Selected: <span className="font-black">{selectedQty} kit{selectedQty !== 1 ? "s" : ""}</span>
                {activeTierPrice ? ` • ₹${activeTierPrice.toLocaleString("en-IN")}/kit` : ""}
              </p>
            )}
          </div>
        )}

        {/* Stock quantity */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <MdOutlineInventory2 size={14} className="text-slate-400" />
          <span>{item.stock_quantity} units available</span>
        </div>

        {/* Reseller tag */}
        {item.reseller_name && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <FiTag size={12} className="text-slate-400" />
            <span>Sold by <span className="text-slate-700 font-semibold">{item.reseller_name}</span></span>
          </div>
        )}

        {/* Price Card */}
        <PriceCard item={item} selectedQty={selectedQty} activeTierPrice={activeTierPrice} />

        {/* Action Button */}
        <button
          disabled={item.availability_label === "out_of_stock"}
          onClick={() => onAddToCart && onAddToCart(item, selectedQty, activeTierPrice)}
          className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99]"
          aria-label={`Request quote for ${item.title}${selectedQty ? ` - ${selectedQty} kits` : ""}`}
        >
          <FiShoppingBag size={15} />
          {item.availability_label === "out_of_stock"
            ? "Out of Stock"
            : hasQtyVariants && selectedQty
              ? `Add ${selectedQty} Kits to Cart${activeTierPrice ? ` • ₹${(activeTierPrice * selectedQty).toLocaleString("en-IN")}` : ""}`
              : "Request Quote / Add to Cart"}
        </button>
      </div>
    </article>
  );
}


/* ─── Empty & Error States (Bright Theme) ─────────────────────────────────── */
function EmptyState({ code, resellerName, onRefresh }) {
  const states = {
    NO_RESELLER_ASSIGNED: {
      icon: <FiAlertTriangle className="text-amber-500" size={40} />,
      title: "No Franchisee Partner Assigned",
      message: "Your EPC account is not linked to a franchisee partner yet. Please contact your administrator.",
    },
    RESELLER_INACTIVE: {
      icon: <FiAlertTriangle className="text-amber-500" size={40} />,
      title: "Franchisee Partner Inactive",
      message: `Your channel partner (${resellerName || "assigned franchisee"}) is currently inactive. Please contact them directly.`,
    },
    EPC_PENDING_APPROVAL: {
      icon: <FiInfo className="text-blue-500" size={40} />,
      title: "Account Pending Approval",
      message: "Your EPC account is under review by administrator. Products will be visible here once approved.",
    },
    EPC_REJECTED: {
      icon: <FiAlertTriangle className="text-red-500" size={40} />,
      title: "Account Application Rejected",
      message: "Your EPC account has been rejected. Please contact support or your franchisee.",
    },
    NO_PUBLISHED_PRODUCTS: {
      icon: <MdSolarPower className="text-slate-400" size={48} />,
      title: "No Products Published Yet",
      message: `${resellerName || "Your franchisee partner"} has not published any products to your catalogue yet.`,
    },
    default: {
      icon: <FiPackage className="text-slate-400" size={40} />,
      title: "No Matching Products",
      message: "No products matched your search or filters. Try clearing your search parameters.",
    },
  };

  const cfg = states[code] || states.default;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 bg-white border border-slate-200 rounded-2xl text-center shadow-xs">
      <div className="mb-3 p-3 bg-slate-50 rounded-2xl">{cfg.icon}</div>
      <h2 className="text-lg font-bold text-slate-900 mb-1.5">{cfg.title}</h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">{cfg.message}</p>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors shadow-xs"
      >
        <FiRefreshCw size={14} />
        Refresh Catalogue
      </button>
    </div>
  );
}

/* ─── Skeleton Loading Card ───────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-52 bg-slate-100" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-5 w-4/5 bg-slate-200 rounded" />
        <div className="h-3 w-1/2 bg-slate-100 rounded" />
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-20 bg-slate-50 rounded-xl mt-4" />
        <div className="h-10 bg-slate-200 rounded-xl mt-3" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EpcCatalogue — Bright Light Theme Component
═══════════════════════════════════════════════════════════════════════════ */
export default function EpcCatalogue() {
  const user = useSelector((s) => s.auth_slice?.user);
  const dispatch = useDispatch();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [resellerName, setResellerName] = useState(null);
  const [totalItems, setTotalItems] = useState(0);

  // Filter state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const searchTimer = useRef(null);

  const handleAddToCart = (item, selectedQty, tierPrice) => {
    const finalPrice = tierPrice > 0 ? tierPrice : parseFloat(item.selling_price_inr || item.ourPrice || 0);
    const gstRate = Number(item.gst_rate_pct || 18);
    const itemTaxable = finalPrice > 0 ? Math.round(finalPrice / (1 + (gstRate / 100))) : 0;
    const itemTax = Math.max(0, finalPrice - itemTaxable);

    dispatch(addToCart({
      id: item.id || item.listing_id,
      listing_id: item.listing_id || item.id,
      title: item.title,
      name: item.title,
      sku_code: item.sku_code,
      selling_price_inr: finalPrice,
      ourPrice: finalPrice,
      price_per_kit: finalPrice,
      price_before_tax_inr: itemTaxable,
      taxes_and_charges_inr: itemTax,
      gst_rate_pct: gstRate,
      image_url: item.image_url,
      stock_quantity: item.stock_quantity,
      item_type: item.item_type || 'product',
      is_catalogue_item: true,
      is_custom: true,
      loose_order_pricing: item.loose_order_pricing || [],
      po_order_pricing: item.po_order_pricing || [],
      // Pass selected order quantity if kit has quantity variations
      order_quantity: selectedQty || null,
      qty: selectedQty || 1,
    }));
    dispatch(syncCartWithBackend());
  };

  /* ── Fetch catalogue API ────────────────────────────────────────────────── */
  const fetchCatalogue = useCallback(async (params = {}) => {
    setLoading(true);
    setErrorCode(null);
    setErrorMsg(null);
    try {
      const qp = new URLSearchParams();
      if (params.search) qp.set("search", params.search);
      if (params.sortBy && params.sortBy !== "newest") qp.set("sort", params.sortBy);
      if (params.minPrice) qp.set("min_price", params.minPrice);
      if (params.maxPrice) qp.set("max_price", params.maxPrice);

      const url = `/india/v1/shop/epc-catalogue${qp.toString() ? "?" + qp.toString() : ""}`;
      const res = await axiosInstance.get(url);

      if (res.data?.status === "success") {
        setProducts(res.data.data || []);
        setTotalItems(res.data.total_items || 0);
        setResellerName(res.data.reseller_business_name || null);
      } else {
        setProducts([]);
        setErrorCode("default");
        setErrorMsg(res.data?.message);
      }
    } catch (err) {
      setProducts([]);
      const code = err.response?.data?.code || null;
      const msg = err.response?.data?.message || "Failed to load catalogue";
      setErrorCode(code || "default");
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Debounced Search Trigger ───────────────────────────────────────────── */
  const triggerFetch = useCallback(() => {
    fetchCatalogue({ search, sortBy, minPrice, maxPrice });
  }, [search, sortBy, minPrice, maxPrice, fetchCatalogue]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(triggerFetch, search ? 350 : 0);
    return () => clearTimeout(searchTimer.current);
  }, [triggerFetch, search]);

  const clearFilters = () => {
    setSearch("");
    setSortBy("newest");
    setMinPrice("");
    setMaxPrice("");
  };

  const hasActiveFilters = search || sortBy !== "newest" || minPrice || maxPrice;

  return (
    <div className="space-y-6">
      {/* ── Bright Header Banner ────────────────────────────────────────── */}
      <div className="bg-blue-700 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-md mb-2">
              <MdSolarPower size={15} />
              <span>Franchisee Catalogue</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Product Catalogue
            </h1>
            <p className="mt-1 text-blue-100 text-sm">
              Published by <span className="font-bold text-white">{resellerName || "Partner Franchisee"}</span>
              {user?.name && <> · Account: <span className="font-medium text-white">{user.name}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-xl text-right">
              <div className="text-2xl font-black">{totalItems}</div>
              <div className="text-[11px] text-blue-100 font-medium">Products Available</div>
            </div>
            <button
              onClick={triggerFetch}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 active:scale-95"
              title="Refresh catalogue"
            >
              <FiRefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Industry Solutions & Media Banners ───────────────────────────── */}
      <IndustryDashboardBanner />

      {/* ── Search & Filter Controls (Clean Light Mode) ──────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <FiSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="catalogue-search-bright"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brands, or SKUs…"
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <FiX size={15} />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${showFilters || hasActiveFilters
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
          >
            <FiFilter size={15} />
            Filter & Sort
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Min Price (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Max Price (₹)</label>
              <input
                type="number"
                placeholder="Unlimited"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Sort Order</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="title_asc">Name: A to Z</option>
                <option value="title_desc">Name: Z to A</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Content Grid ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : errorCode && products.length === 0 ? (
        <EmptyState code={errorCode} resellerName={resellerName} onRefresh={triggerFetch} />
      ) : products.length === 0 ? (
        <EmptyState code="NO_PUBLISHED_PRODUCTS" resellerName={resellerName} onRefresh={triggerFetch} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">
              Showing <span className="text-slate-900 font-bold">{products.length}</span> published item{products.length !== 1 ? "s" : ""}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                Clear filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((item) => (
              <ProductCard key={item.id} item={item} onAddToCart={handleAddToCart} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
