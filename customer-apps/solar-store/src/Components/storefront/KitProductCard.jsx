import React, { useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiZap,
  FiShield,
  FiCheck,
  FiPlus,
  FiMinus,
  FiShoppingCart,
  FiEye,
  FiLayers,
  FiMapPin,
  FiTruck,
  FiClock,
  FiSun,
  FiFileText
} from "react-icons/fi";
import DatasheetModal from "./DatasheetModal";
<<<<<<< HEAD
import { FaSolarPanel, FaBolt, FaShieldAlt, FaLandmark } from "react-icons/fa";
=======
import { FaSolarPanel, FaBolt, FaShieldAlt } from "react-icons/fa";
>>>>>>> origin/main
import {
  addToCart,
  decreaseQty,
  increaseQty,
  removeFromCart,
  setShowAuthDialog,
  selectLiveStock
} from "@/features/slice";
import Button from "../Button";
import IconButton from "../IconButton";

const DEFAULT_KIT_IMAGE = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";

const resolveImageUrl = (url) => {
  if (!url) return DEFAULT_KIT_IMAGE;
  if (url.includes("localhost:3001")) {
    return url.replace("localhost:3001", "localhost:5000");
  }
  if (url.startsWith("/")) {
    return `http://localhost:5000${url}`;
  }
  return url;
};

const safeString = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    return (val.name || val.text || val.title || "").trim();
  }
  return String(val).trim();
};

export default function KitProductCard({
  kit,
  onQuickView,
  isCompared = false,
  onToggleCompare,
  viewMode = "grid"
}) {
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.slice.cart);
  const liveStock = useSelector(selectLiveStock);
  const { isAuthenticated } = useSelector((state) => state.auth_slice);
  const selectedDistrict = useSelector((state) => state.slice.selectedDistrict);
  const districtName = selectedDistrict?.name || "Local Warehouse";

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [showDatasheetModal, setShowDatasheetModal] = useState(false);

  const hasDatasheets = Boolean(
    kit.hasDatasheet ||
    kit.datasheets?.some(d => d.hasDatasheet) ||
    kit.panel?.datasheet ||
    kit.inverter?.datasheet
  );

  const variants = kit.variants || [];
  const currentVariant = variants[selectedVariantIndex] || variants[0] || {};

  const cartItemId = `${kit.id}-${selectedVariantIndex}`;
  const cartItem = cart.find((c) => c.cartItemId === cartItemId || (c.id === kit.id && c.variantIndex === selectedVariantIndex));

  // Live stock
  const availableStock = liveStock[kit.id] !== undefined
    ? liveStock[kit.id]
    : (currentVariant.availableStock ?? 99);
  const inStock = availableStock > 0 && currentVariant.inStock !== false;

  const discountPercent = currentVariant.marketPrice && currentVariant.ourPrice
    ? Math.max(0, Math.round(((currentVariant.marketPrice - currentVariant.ourPrice) / currentVariant.marketPrice) * 100))
    : 0;

  const gstRate = Number(
    currentVariant.gstRate ??
    currentVariant.gst_rate ??
    kit?.gstRate ??
    kit?.gst_rate ??
    kit?.pricing?.gstRate ??
    kit?.pricing?.gst_rate ??
    13.8
  );
  const gstAmount = currentVariant.ourPrice
    ? currentVariant.ourPrice - Math.round(currentVariant.ourPrice / (1 + (gstRate / 100)))
    : 0;

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      dispatch(setShowAuthDialog(true));
      return;
    }
    dispatch(addToCart({ id: kit.id, variantIndex: selectedVariantIndex }));
  };

  const handleDecreaseQty = (e) => {
    e.stopPropagation();
    if (cartItem?.qty > 1) {
      dispatch(decreaseQty(cartItem.cartItemId));
    } else if (cartItem) {
      dispatch(removeFromCart(cartItem.cartItemId));
    }
  };

  const handleIncreaseQty = (e) => {
    e.stopPropagation();
    if (cartItem) {
      dispatch(increaseQty(cartItem.cartItemId));
    }
  };

  const usageLabel = safeString(kit.usageType) || safeString(kit.subCategory) || safeString(kit.category) || "Residential";
  const brandLabel = safeString(kit.brand);

  return (
    <div
      className={`group relative bg-surface rounded-2xl border border-border hover:border-primary/40 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden ${
        viewMode === "list" ? "md:flex-row gap-4 sm:gap-6 p-3.5 sm:p-4" : "p-3 sm:p-4 sm:p-5"
      }`}
    >
      {/* Top Badges overlay: Capacity, District, Tier */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5 z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Capacity kW Pill */}
          <span className="inline-flex items-center gap-1 bg-primary text-white text-[10px] sm:text-[11px] font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full shadow-xs">
            <FiZap size={11} />
            <span>{kit.capacityKW} kW Kit</span>
          </span>

          {/* Application Badge */}
          <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 sm:px-2 py-0.5 rounded-md border border-border">
            {usageLabel}
          </span>

<<<<<<< HEAD
          {/* Govt Tender Badge */}
          {kit.is_govt_tender && (
            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-2 py-0.5 rounded-md shadow-2xs uppercase tracking-wider">
              <FaLandmark size={8} className="text-amber-300" />
              <span>{kit.govt_tender_badge || "Govt. Tender"}</span>
            </span>
          )}

=======
>>>>>>> origin/main
          {/* Technical Datasheet Pill */}
          {hasDatasheets && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDatasheetModal(true);
              }}
              title="View Manufacturer Datasheets"
              className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-1.5 sm:px-2 py-0.5 rounded-md hover:bg-red-500/20 transition-colors"
            >
              <FiFileText size={10} />
              <span>Datasheets</span>
            </button>
          )}
        </div>

        {/* Compare Checkbox */}
        {onToggleCompare && (
          <label
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-text-muted hover:text-primary cursor-pointer select-none bg-surface px-1.5 sm:px-2 py-0.5 rounded-md border border-border"
          >
            <input
              type="checkbox"
              checked={isCompared}
              onChange={() => onToggleCompare(kit)}
              className="rounded text-primary focus:ring-primary h-3 w-3"
            />
            <span className="hidden sm:inline">Compare</span>
          </label>
        )}
      </div>

      {/* Product Image Box */}
      <div
        onClick={() => onQuickView && onQuickView(kit, selectedVariantIndex)}
        className={`relative bg-gradient-to-tr from-slate-50 to-slate-100/70 dark:from-slate-800/40 dark:to-slate-900/60 rounded-xl overflow-hidden flex items-center justify-center p-2.5 sm:p-3 cursor-pointer group-hover:scale-[1.01] transition-transform duration-300 ${
          viewMode === "list" ? "w-full md:w-56 h-44 md:h-auto shrink-0" : "h-44 sm:h-52 w-full mb-3"
        }`}
      >
        <img
          src={resolveImageUrl(kit.kitImage)}
          alt={kit.kitName}
          className="w-full h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-108"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_KIT_IMAGE;
          }}
        />


        {/* Quick View Button overlay on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onQuickView) onQuickView(kit, selectedVariantIndex);
          }}
          className="absolute bottom-3 inset-x-8 py-2 bg-slate-900/85 hover:bg-slate-950 text-white text-xs font-bold rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg"
        >
          <FiEye size={14} />
          <span>Quick View</span>
        </button>

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 bg-secondary text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
            Save {discountPercent}%
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Kit Brand & Name */}
          <div className="mb-1.5">
            <span className="text-[10px] uppercase font-extrabold text-primary tracking-wider">
              {brandLabel ? `${brandLabel} Solar Kit` : "Complete Solar System"}
            </span>
            <h3
              onClick={() => onQuickView && onQuickView(kit, selectedVariantIndex)}
              className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2 leading-snug cursor-pointer mt-0.5"
<<<<<<< HEAD
              title={kit.govt_tender_name || kit.kitName}
            >
              {kit.govt_tender_name || kit.kitName}
=======
              title={kit.kitName}
            >
              {kit.kitName}
>>>>>>> origin/main
            </h3>
          </div>

          {/* Suitable for use case */}
          <p className="text-xs text-text-secondary line-clamp-1 mb-3">
            Suitable for: <span className="font-semibold text-text-primary">{usageLabel}</span>
          </p>

          {/* "What's Included" Thumbnails Preview Strip */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-border mb-3.5">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1">
              <FiCheck className="text-emerald-500" /> What's Included in Kit:
            </p>
            <div className="flex items-center gap-2 text-[10px] font-medium text-text-primary flex-wrap">
              <span className="inline-flex items-center gap-1 bg-surface px-1.5 py-0.5 rounded border border-border">
                <FaSolarPanel className="text-primary" size={10} />
                {kit.panel?.wattPerPanel ? `${kit.panel.wattPerPanel}W Panels` : "PV Panels"}
              </span>
              <span className="inline-flex items-center gap-1 bg-surface px-1.5 py-0.5 rounded border border-border">
                <FaBolt className="text-amber-500" size={10} />
                {safeString(kit.inverter?.type) ? `${safeString(kit.inverter?.type)} Inverter` : "Solar Inverter"}
              </span>
              <span className="inline-flex items-center gap-1 bg-surface px-1.5 py-0.5 rounded border border-border">
                <FiShield className="text-emerald-600" size={10} />
                Mounting & Safety Box
              </span>
            </div>
          </div>

          {/* Tier Variant Selector (Basic / Standard / Premium) */}
          {variants.length > 1 && (
            <div className="mb-3.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary mb-1">
                <span>Select Quality Tier:</span>
                <span className="text-primary font-extrabold">{safeString(currentVariant.productTier)}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {variants.map((v, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVariantIndex(idx);
                    }}
                    className={`py-1 px-1.5 text-[10px] font-bold rounded-lg border transition-all text-center truncate ${
                      selectedVariantIndex === idx
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary border-border"
                    }`}
                  >
                    {safeString(v.productTier)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pricing Block & Add to Cart */}
        <div className="border-t border-border pt-3 mt-auto">
          <div className="flex items-baseline justify-between mb-1">
            <div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Special Price</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-text-primary">
                  ₹{currentVariant.ourPrice ? currentVariant.ourPrice.toLocaleString("en-IN") : "N/A"}
                </span>
                {currentVariant.marketPrice && currentVariant.marketPrice > currentVariant.ourPrice && (
                  <del className="text-xs text-text-muted font-medium">
                    ₹{currentVariant.marketPrice.toLocaleString("en-IN")}
                  </del>
                )}
              </div>
            </div>

            {/* In-Stock Indicator */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                inStock
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 border border-red-500/20"
              }`}
            >
              {inStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>

          {/* GST info */}
          {gstAmount > 0 && (
            <p className="text-[10px] text-emerald-600 font-semibold mb-3">
              Includes ₹{gstAmount.toLocaleString("en-IN")} GST @ {gstRate}%
            </p>
          )}

          {/* Action CTA */}
          <div className="flex items-center gap-2">
            {cartItem ? (
              <div className="flex-1 flex items-center justify-between bg-primary text-white rounded-xl p-1 shadow-sm">
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={handleDecreaseQty}
                  className="text-white hover:bg-white/20 h-7 w-7 rounded-lg"
                  aria-label="Decrease quantity"
                >
                  <FiMinus size={12} />
                </IconButton>
                <span className="text-xs font-bold px-2">
                  {cartItem.qty} in Cart
                </span>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={handleIncreaseQty}
                  className="text-white hover:bg-white/20 h-7 w-7 rounded-lg"
                  aria-label="Increase quantity"
                >
                  <FiPlus size={12} />
                </IconButton>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={!inStock}
                onClick={handleAddToCart}
                leftIcon={<FiShoppingCart size={15} />}
                className="font-bold rounded-xl shadow-xs"
              >
                Add to Cart
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              onClick={() => onQuickView && onQuickView(kit, selectedVariantIndex)}
              className="px-3 rounded-xl font-bold"
              title="View Complete Kit Inclusions & Specs"
            >
              Details
            </Button>

            {hasDatasheets && (
              <Button
                variant="ghost"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDatasheetModal(true);
                }}
                className="px-2.5 rounded-xl font-bold text-text-secondary hover:text-red-600 hover:bg-red-500/10 border border-border/60"
                title="View Technical Datasheets"
              >
                <FiFileText size={15} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {showDatasheetModal && (
        <DatasheetModal
          isOpen={showDatasheetModal}
          onClose={() => setShowDatasheetModal(false)}
          kit={kit}
        />
      )}
    </div>
  );
}
