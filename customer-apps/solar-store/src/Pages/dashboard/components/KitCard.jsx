import { memo, useCallback, useMemo, useState, useEffect } from"react";
import {
  FaPlus, FaMinus, FaRupeeSign, FaCheck,
  FaShoppingCart, FaTag, FaStar, FaGem, FaHome, FaBolt,
  FaInfoCircle, FaTruck, FaPiggyBank, FaAward,
  FaShieldAlt, FaLeaf, FaChevronDown, FaChevronUp,
  FaCogs, FaSolarPanel, FaFilePdf
} from"react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  addToCart,
  decreaseQty,
  increaseQty,
  removeFromCart,
  setShowAuthDialog,
  selectLiveStock,
} from "@/features/slice";
import Button from "@/Components/Button";
import { setAlert } from "@/features/alert.slice";
import { hasPermission } from "@/utils/permissions";
import IconButton from "@/Components/IconButton";
import TrialKitOrderModal from "./TrialKitOrderModal";
import DatasheetModal from "@/Components/storefront/DatasheetModal";

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

const ComponentImage = ({ src, type }) => {
  const [error, setError] = useState(!src);

  if (error) {
    const iconClass = "text-text-secondary opacity-60 text-base";
    return (
      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0 border border-border/40">
        {type === "panel" && <FaSolarPanel className={iconClass} />}
        {type === "inverter" && <FaBolt className={iconClass} />}
        {type === "bos" && <FaCogs className={iconClass} />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={type}
      className="w-10 h-10 object-contain drop-shadow-xs"
      onError={() => setError(true)}
    />
  );
};

const KitComponentsRow = ({ kit }) => {
  const components = [];
  if (kit.includedComponents && kit.includedComponents.length > 0) {
    components.push(...kit.includedComponents);
  } else {
    if (kit.panel) components.push({ ...kit.panel, actualType: "panel", name: kit.panel.technologyType, image: kit.panel.panelImage });
    if (kit.inverter) components.push({ ...kit.inverter, actualType: "inverter", name: kit.inverter.category, image: kit.inverter.inverterImage });
  }

  const bosItems = kit.BOSKit?.components || kit.bosComponents || [];

  return (
    <div className="flex items-center justify-start gap-1 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-border/80 mb-4 overflow-x-auto scrollbar-none select-none">
      {components.map((comp, idx) => (
        <div key={`base-${idx}`} className="flex items-center gap-1 shrink-0">
          {idx > 0 && <span className="text-sm font-black text-text-muted select-none shrink-0">+</span>}
          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <ComponentImage src={comp.image || comp.panelImage || comp.inverterImage} type={comp.actualType || comp.type || (/panel|module|bifacial|topcon|mono/i.test(comp.name) ? 'panel' : /inverter/i.test(comp.name) ? 'inverter' : 'other')} />
            <span className="text-[9px] font-black text-text-primary dark:text-info mt-1 truncate max-w-[68px]" title={comp.name}>
              {comp.quantity} {(comp.actualType === "panel" || /panel|module|bifacial|topcon|mono/i.test(comp.name)) ? "panels" : (comp.actualType === "inverter" || /inverter/i.test(comp.name)) ? "inverter" : comp.name.split(" ")[0]}
            </span>
          </div>
        </div>
      ))}

      {bosItems.map((bc, idx) => (
        <div key={`bos-${idx}`} className="flex items-center gap-1 shrink-0">
          <span className="text-sm font-black text-text-muted select-none shrink-0">+</span>
          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <ComponentImage src={bc.image} type="bos" />
            <span className="text-[9px] font-black text-text-primary dark:text-info mt-1 truncate max-w-[68px]" title={bc.name}>
              {bc.quantity} {bc.name.split(" ")[0]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

import { FaLayerGroup } from "react-icons/fa";

const KitCard = memo(({ kit, selected, setSelected, viewMode = "grid", compact = false, isCart = false, activeOffers = [], isCompared = false, onToggleCompare = null }) => {
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.slice.cart);
  const liveStock = useSelector(selectLiveStock);
  const { isAuthenticated, user } = useSelector((state) => state.auth_slice);
  const [selectedVariant, setSelectedVariant] = useState(isCart && kit.variantIndex !== undefined ? kit.variantIndex : 0);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [showDatasheetModal, setShowDatasheetModal] = useState(false);
  const hasTrialKit = Boolean(kit?.allow_trial_kit || kit?.allowTrialKit);
  const trialKitQty = Number(kit?.trial_kit_quantity || 10);
  const trialLimit = Number(kit?.trial_kit_max_orders_per_buyer ?? kit?.trialKitMaxOrdersPerBuyer ?? 1);
  const purchasedTrialCount = Number(kit?.trial_kit_purchased_count ?? kit?.trialKitPurchasedCount ?? 0);
  const isTrialLimitReached = Boolean(kit?.trial_kit_limit_reached ?? kit?.trialKitLimitReached) ||
    (trialLimit > 0 && purchasedTrialCount >= trialLimit);
  const canShowTrialButton = hasTrialKit && !isTrialLimitReached && !isCart;

  const hasDatasheets = Boolean(
    kit?.hasDatasheet ||
    kit?.datasheets?.some(d => d.hasDatasheet) ||
    kit?.panel?.datasheet ||
    kit?.inverter?.datasheet
  );

  useEffect(() => {
    if (isCart) {
      if (kit.variantIndex !== undefined) {
        setSelectedVariant(kit.variantIndex);
      }
      return;
    }
    if (kit.variants) {
      const cartIndex = kit.variants.findIndex((v, idx) => 
        cart.some(item => item.id === kit.id && item.variantIndex === idx)
      );
      if (cartIndex >= 0) {
        setSelectedVariant(cartIndex);
      }
    }
  }, [kit.id, isCart, kit.variantIndex]);

  const [showVariants, setShowVariants] = useState(false);
  const [showPerksTooltip, setShowPerksTooltip] = useState(false);

  // Loose Order quantities (e.g. 5, 10, 15, 20, 25 kits)
  const looseOrderQuantities = useMemo(() => {
    const rawLoose = kit?.looseOrderQuantities || kit?.loose_order_quantities || [];
    const fromPricing = (kit?.loose_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);
    const combined = [...new Set([...(Array.isArray(rawLoose) ? rawLoose.map(Number) : []), ...fromPricing])]
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);
    return combined;
  }, [kit?.looseOrderQuantities, kit?.loose_order_quantities, kit?.loose_order_pricing]);

  // PO (Purchase Order) bulk quantities (e.g. 100, 200, 400, 500 kits)
  const poOrderQuantities = useMemo(() => {
    const rawPo = kit?.orderQuantities || kit?.order_quantities || [];
    const fromPricing = (kit?.po_order_pricing || []).map(t => Number(t.quantity)).filter(n => !isNaN(n) && n > 0);
    const combined = [...new Set([...(Array.isArray(rawPo) ? rawPo.map(Number) : []), ...fromPricing])]
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);
    return combined;
  }, [kit?.orderQuantities, kit?.order_quantities, kit?.po_order_pricing]);

  const hasLooseQuantities = looseOrderQuantities.length > 0;
  const hasPoQuantities = poOrderQuantities.length > 0;
  const hasOrderQuantities = hasLooseQuantities || hasPoQuantities;

  // Active pricing category tab: 'loose' | 'po'
  const [activeTierType, setActiveTierType] = useState(() => (hasLooseQuantities ? "loose" : "po"));
  const [selectedOrderQty, setSelectedOrderQty] = useState(null);

  // Active quantities array for the selected tab
  const currentCategoryQuantities = useMemo(() => {
    if (activeTierType === "loose") {
      return hasLooseQuantities ? looseOrderQuantities : poOrderQuantities;
    }
    return hasPoQuantities ? poOrderQuantities : looseOrderQuantities;
  }, [activeTierType, hasLooseQuantities, hasPoQuantities, looseOrderQuantities, poOrderQuantities]);

  const orderQuantities = useMemo(() => {
    const all = [...new Set([...looseOrderQuantities, ...poOrderQuantities])].sort((a, b) => a - b);
    return all.length > 0 ? all : (currentCategoryQuantities.length > 0 ? currentCategoryQuantities : [10, 25]);
  }, [looseOrderQuantities, poOrderQuantities, currentCategoryQuantities]);

  useEffect(() => {
    if (currentCategoryQuantities.length > 0) {
      setSelectedOrderQty(currentCategoryQuantities[0]);
    }
  }, [kit?.id, activeTierType, currentCategoryQuantities]);

  useEffect(() => {
    if (!showPerksTooltip) return;
    const handleOutsideClick = () => {
      setShowPerksTooltip(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [showPerksTooltip]);

  const currentVariant = useMemo(() => {
    if (kit.variants && kit.variants.length > 0) {
      return kit.variants[selectedVariant] || kit.variants[0];
    }
    const ourP = Number(kit.ourPrice || kit.selling_price_inr || kit.price || kit.discounted_price || kit.mrp || 0);
    const mktP = Number(kit.marketPrice || kit.mrp || (ourP > 0 ? Math.round(ourP * 1.15) : 0));
    const gstR = Number(kit.gstRate ?? kit.gst_rate ?? kit.pricing?.gstRate ?? kit.pricing?.gst_rate ?? 13.8);
    const cap = kit.capacityKW || (kit.wattage ? (kit.wattage >= 100 ? (kit.wattage / 1000) : kit.wattage) : 0.55);
    return {
      productTier: kit.productTier || kit.tier || kit.sku_code || "Tier-1 High Efficiency",
      ourPrice: ourP,
      marketPrice: mktP,
      gstRate: gstR,
      availableStock: kit.availableStock ?? kit.stock_quantity ?? 999,
      inStock: kit.inStock !== false,
      capacityKW: cap,
      tierColor: kit.tierColor || null,
      tierBenefits: kit.tierBenefits || ["Verified Tier-1 Quality", "Factory Direct Supply"],
      includedDeliveryCharge: kit.includedDeliveryCharge || 0,
      image: kit.kitImage || kit.image_url || kit.image || kit.product_image || DEFAULT_KIT_IMAGE,
    };
  }, [kit, selectedVariant]);

  // Memoize the type class function for usageType
  const getUsageTypeClass = useCallback(() => {
    return "bg-primary/5 dark:bg-primary/10 dark:bg-primary/15 text-primary dark:text-info border border-primary/15 dark:border-info/20";
  }, []);

  // Memoize tier styling and icon
  const getTierConfig = useCallback((tier, color) => {
    const tierLabel = tier || "Standard Upgrade";
    // Use custom color if provided (from dynamic DB config)
    const hasCustomColor = !!color;
    return {
      text: hasCustomColor ? "" : "text-primary dark:text-info",
      border: hasCustomColor ? "" : "border-primary/15 dark:border-info/20",
      icon: <FaAward className={hasCustomColor ? "" : "text-primary dark:text-info"} style={hasCustomColor ? { color } : undefined} />,
      label: tierLabel,
      bg: hasCustomColor ? "" : "bg-primary/5 dark:bg-primary/10",
      badgeBg: hasCustomColor ? "" : "bg-primary/5 dark:bg-primary/10",
      badgeText: hasCustomColor ? "" : "text-primary dark:text-info",
      accent: "primary",
      gradient: "from-primary to-primary",
      customColor: color || null,
    };
  }, []);

  // Memoize derived values
  const cartItemId = useMemo(() => isCart && kit.cartItemId ? kit.cartItemId : `${kit.id}-${selectedVariant}`,
    [kit.id, selectedVariant, isCart, kit.cartItemId]
  );

  const cartItem = useMemo(() =>
    cart.find((item) => item.cartItemId === cartItemId),
    [cart, cartItemId]
  );

  // Use liveStock if available for real-time stock check
  const effectiveAvailableStock = useMemo(() => {
    if (liveStock[kit.id] !== undefined) return liveStock[kit.id];
    return currentVariant?.availableStock !== undefined ? currentVariant.availableStock : 999;
  }, [liveStock, kit.id, currentVariant?.availableStock]);

  const effectiveInStock = useMemo(() => {
    if (liveStock[kit.id] !== undefined) return liveStock[kit.id] > 0;
    return currentVariant?.inStock !== false;
  }, [liveStock, kit.id, currentVariant?.inStock]);

  const totalKitQtyInCart = useMemo(() => {
    return cart
      .filter(item => item.id === kit.id)
      .reduce((sum, item) => sum + item.qty, 0);
  }, [cart, kit.id]);

  const isMaxStockReached = useMemo(() => {
    return totalKitQtyInCart >= effectiveAvailableStock;
  }, [totalKitQtyInCart, effectiveAvailableStock]);

  const isSelected = useMemo(() =>
    selected === cartItemId,
    [selected, cartItemId]
  );

  const usageTypeClass = useMemo(() =>
    getUsageTypeClass(kit.usageType),
    [getUsageTypeClass, kit.usageType]
  );

  const tierConfig = useMemo(() =>
    getTierConfig(currentVariant?.productTier, currentVariant?.tierColor),
    [getTierConfig, currentVariant?.productTier, currentVariant?.tierColor]
  );

  const isBundleEligible = useMemo(() => {
    if (!activeOffers || activeOffers.length === 0) return false;
    const bundleOffer = activeOffers.find(o => o.offer_type === 'bundle');
    if (!bundleOffer) return false;
    if (!bundleOffer.products_applicable || bundleOffer.products_applicable.length === 0) {
      return true;
    }
    return bundleOffer.products_applicable.some(pId => pId.toString() === kit.id.toString());
  }, [activeOffers, kit.id]);

  // Memoize event handlers
  const handleSelect = useCallback(() => {
    setSelected(isSelected ? null : cartItemId);
  }, [isSelected, cartItemId, setSelected]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  }, [handleSelect]);

  // Look up quantity tier pricing for current selection
  const activeTierPricing = useMemo(() => {
    const qty = Number(selectedOrderQty);
    if (!qty) return null;

    const looseList = Array.isArray(kit?.loose_order_pricing) ? kit.loose_order_pricing : [];
    const poList = Array.isArray(kit?.po_order_pricing) ? kit.po_order_pricing : [];

    const matchedLoose = looseList.find((t) => Number(t.quantity) === qty && Number(t.price_per_kit) > 0);
    if (matchedLoose) {
      return {
        type: "loose",
        quantity: qty,
        price_per_kit: Number(matchedLoose.price_per_kit),
        discount_amount: Number(matchedLoose.discount_amount || 0),
      };
    }

    const matchedPo = poList.find((t) => Number(t.quantity) === qty && Number(t.price_per_kit) > 0);
    if (matchedPo) {
      return {
        type: "po",
        quantity: qty,
        price_per_kit: Number(matchedPo.price_per_kit),
        discount_amount: Number(matchedPo.discount_amount || 0),
      };
    }

    return null;
  }, [selectedOrderQty, kit?.loose_order_pricing, kit?.po_order_pricing]);

  // Memoize formatted prices (dynamically reflects selected tier pricing)
  const formattedPrices = useMemo(() => {
    const baselineOurPrice = Number(currentVariant?.ourPrice || kit?.ourPrice || kit?.selling_price_inr || 0);
    const ourPriceNum = activeTierPricing?.price_per_kit > 0
      ? activeTierPricing.price_per_kit
      : baselineOurPrice;

    const baseMarketPrice = Number(currentVariant?.marketPrice || kit?.marketPrice || (baselineOurPrice > 0 ? Math.round(baselineOurPrice * 1.15) : 0));
    const marketPriceNum = (activeTierPricing?.discount_amount > 0)
      ? (ourPriceNum + activeTierPricing.discount_amount)
      : baseMarketPrice;

    const gstRate = Number(
      currentVariant?.gstRate ??
      currentVariant?.gst_rate ??
      kit?.gstRate ??
      kit?.gst_rate ??
      kit?.pricing?.gstRate ??
      kit?.pricing?.gst_rate ??
      13.8
    );
    const gstIncludedAmount = ourPriceNum > 0 && !isNaN(ourPriceNum)
      ? Math.max(0, ourPriceNum - Math.round(ourPriceNum / (1 + (gstRate / 100))))
      : 0;

    const orderQtyNum = Number(selectedOrderQty) || 1;
    const totalOrderValue = ourPriceNum * orderQtyNum;

    return {
      marketPrice: marketPriceNum > 0 ? marketPriceNum.toLocaleString("en-IN") : "",
      ourPrice: ourPriceNum > 0 ? ourPriceNum.toLocaleString("en-IN") : "0",
      rawOurPrice: ourPriceNum,
      rawMarketPrice: marketPriceNum,
      totalOrderValue: totalOrderValue > 0 ? totalOrderValue.toLocaleString("en-IN") : "0",
      rawTotalOrderValue: totalOrderValue,
      gstIncluded: gstIncludedAmount > 0 ? gstIncludedAmount.toLocaleString("en-IN") : "0",
      gstRate: !isNaN(gstRate) ? gstRate : 13.8,
    };
  }, [currentVariant?.marketPrice, currentVariant?.ourPrice, currentVariant?.gstRate, kit, activeTierPricing, selectedOrderQty]);

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      dispatch(setShowAuthDialog(true));
      return;
    }
    const qtyToAdd = hasOrderQuantities ? (selectedOrderQty || currentCategoryQuantities[0] || 1) : 1;
    dispatch(addToCart({
      id: kit.id,
      variantIndex: selectedVariant,
      qty: qtyToAdd,
      price_per_kit: activeTierPricing?.price_per_kit || formattedPrices.rawOurPrice,
    }));
  }, [dispatch, kit.id, selectedVariant, isAuthenticated, user, hasOrderQuantities, selectedOrderQty, currentCategoryQuantities, activeTierPricing, formattedPrices?.rawOurPrice]);

  const handleDecreaseQty = useCallback((e) => {
    e.stopPropagation();
    if (hasOrderQuantities) {
      const currentQty = cartItem?.qty || 0;
      const prevQty = [...orderQuantities].reverse().find(q => q < currentQty);
      if (prevQty) {
        dispatch(addToCart({ id: kit.id, variantIndex: selectedVariant, qty: prevQty, replace: true }));
      } else {
        dispatch(removeFromCart(cartItemId));
      }
    } else {
      if (cartItem?.qty > 1) {
        dispatch(decreaseQty(cartItemId));
      } else {
        dispatch(removeFromCart(cartItemId));
      }
    }
  }, [dispatch, cartItemId, cartItem?.qty, hasOrderQuantities, orderQuantities, kit.id, selectedVariant]);

  const handleIncreaseQty = useCallback((e) => {
    e.stopPropagation();
    if (hasOrderQuantities) {
      const currentQty = cartItem?.qty || 0;
      const nextQty = orderQuantities.find(q => q > currentQty);
      if (nextQty) {
        dispatch(addToCart({ id: kit.id, variantIndex: selectedVariant, qty: nextQty, replace: true }));
      }
    } else {
      dispatch(increaseQty(cartItemId));
    }
  }, [dispatch, cartItemId, hasOrderQuantities, orderQuantities, kit.id, selectedVariant, cartItem?.qty]);

  const handleVariantChange = useCallback((index) => {
    setSelectedVariant(index);
    setShowVariants(false);
  }, []);

  // Dynamic capacity & display values
  const displayCapacity = useMemo(() => {
    if (kit?.capacityKW !== undefined && kit.capacityKW !== null && kit.capacityKW !== "") {
      return `${kit.capacityKW} kW`;
    }
    if (currentVariant?.capacityKW !== undefined && currentVariant.capacityKW !== null && currentVariant.capacityKW !== "") {
      return `${currentVariant.capacityKW} kW`;
    }
    if (kit?.wattage) {
      return kit.wattage >= 100 ? `${(kit.wattage / 1000).toFixed(2)} kW` : `${kit.wattage} kW`;
    }
    return "0.55 kW";
  }, [kit?.capacityKW, currentVariant?.capacityKW, kit?.wattage]);

  const displayImage = useMemo(() => {
    return resolveImageUrl(
      kit?.kitImage ||
      kit?.image_url ||
      kit?.image ||
      kit?.product_image ||
      currentVariant?.image ||
      kit?.panel?.panelImage ||
      DEFAULT_KIT_IMAGE
    );
  }, [kit, currentVariant]);

  const displayDescription = useMemo(() => {
    return kit?.description || kit?.summary || currentVariant?.description || "High-efficiency Tier-1 Solar PV Module engineered for rooftop and ground mount installations.";
  }, [kit?.description, kit?.summary, currentVariant?.description]);

  const displayKitName = useMemo(() => {
    return kit?.kitName || kit?.title || kit?.name || "Solar Module";
  }, [kit?.kitName, kit?.title, kit?.name]);

  // Use dynamic discount percent (tier price vs market price)
  const discountPercentage = useMemo(() => {
    const ourP = formattedPrices.rawOurPrice;
    const mktP = formattedPrices.rawMarketPrice;
    if (mktP > ourP && mktP > 0) {
      return Math.round(((mktP - ourP) / mktP) * 100);
    }
    if (currentVariant?.discountPercent !== undefined) return currentVariant.discountPercent;
    return 0;
  }, [formattedPrices.rawOurPrice, formattedPrices.rawMarketPrice, currentVariant?.discountPercent]);

  // Cart calculations for total and savings
  const cartCalculations = useMemo(() => {
    if (!cartItem) {
      return {
        totalSavings: 0,
        totalAmount: 0,
        totalItems: 0,
        quantity: 0,
        totalMarketPrice: 0
      };
    }

    const quantity = cartItem.qty;
    const itemUnitPrice = Number(cartItem.ourPrice || formattedPrices.rawOurPrice);
    const itemMarketPrice = Number(cartItem.marketPrice || formattedPrices.rawMarketPrice);
    const totalMarketPrice = quantity * itemMarketPrice;
    const totalOurPrice = quantity * itemUnitPrice;
    const totalSavings = Math.max(0, totalMarketPrice - totalOurPrice);

    return {
      totalSavings,
      totalAmount: totalOurPrice,
      totalItems: quantity,
      quantity,
      totalMarketPrice
    };
  }, [cartItem, formattedPrices.rawOurPrice, formattedPrices.rawMarketPrice]);

  const formattedCalculations = useMemo(() => ({
    totalSavings: cartCalculations.totalSavings.toLocaleString("en-IN"),
    totalAmount: cartCalculations.totalAmount.toLocaleString("en-IN"),
    totalMarketPrice: cartCalculations.totalMarketPrice.toLocaleString("en-IN"),
  }), [cartCalculations]);

  // Get first benefit for preview
  const firstBenefit = useMemo(() =>
    currentVariant?.tierBenefits && currentVariant.tierBenefits.length > 0 ? currentVariant.tierBenefits[0] : null,
    [currentVariant?.tierBenefits]
  );

  // Delivery charge display
  const deliverySavings = useMemo(() =>
    currentVariant?.includedDeliveryCharge?.toLocaleString("en-IN") || 0,
    [currentVariant?.includedDeliveryCharge]
  );

  // Grid View Component
  // Grid View Component
  const GridView = () => (
    <div
      className={`relative bg-surface rounded-2xl border flex flex-col transition-all duration-300 cursor-pointer overflow-hidden h-full group ${
        isSelected
          ?"border-primary ring-2 ring-primary/20 bg-gradient-to-b from-primary/[0.01] to-primary/[0.02] shadow-lg"
          :"border-border hover:border-primary/30 hover:shadow-xl hover:-translate-y-1.5"
      } ${compact ? 'p-3' : 'p-5'}`}
      onClick={handleSelect}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select ${kit.kitName} kit`}
    >
      {/* Selection Glow Indicator */}
      {isSelected && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-end" />
      )}

      {/* Header Row */}
      <div className="flex justify-between items-center mb-4 gap-2">
        {!kit.hasNoAssignedVariants && kit.variants && kit.variants.length > 0 ? (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200 group-hover:scale-105 ${!currentVariant?.tierColor ? `${tierConfig.border} ${tierConfig.bg}` : ""}`}
            style={currentVariant?.tierColor ? {
              backgroundColor: `${currentVariant.tierColor}15`,
              color: currentVariant.tierColor,
              borderColor: `${currentVariant.tierColor}35`
            } : undefined}
          >
            <span className={!currentVariant?.tierColor ? tierConfig.text : ""} style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>
              {tierConfig.icon}
            </span>
            <span className={!currentVariant?.tierColor ? tierConfig.text : ""} style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>
              {currentVariant?.productTier}
            </span>
          </div>
        ) : (
          <div />
        )}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border shadow-xs ${!kit.usageTypeColor ? usageTypeClass :""}`}
          style={kit.usageTypeColor ? {
            backgroundColor:`${kit.usageTypeColor}15`,
            color: kit.usageTypeColor,
            borderColor:`${kit.usageTypeColor}35`
          } : undefined}
        >
          {kit.usageTypeImage && (
            <img
              src={resolveImageUrl(kit.usageTypeImage)}
              alt=""
              className="w-5 h-5 object-contain rounded-full shrink-0"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          )}
          <span>{kit.usageType}</span>
        </span>
      </div>

      {/* Image container with gradient and hover zoom */}
      <div className={`relative z-[2] mb-4 flex justify-center items-center bg-gradient-to-tr from-gray-50/50 to-slate-100/50 rounded-xl overflow-hidden border border-border w-full ${compact ? 'h-36' : 'h-64'}`}>
        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          {(kit.is_best_seller || kit.best_seller_badge) && (
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 uppercase tracking-wider">
              <FaStar className="text-yellow-200 text-[9px]" />
              <span>{kit.best_seller_badge || kit.best_seller_info?.badge_text || "Our Best Seller"}</span>
            </span>
          )}
          {kit.limitedStock?.displayBadge && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 animate-pulse">
              🔥 Only {kit.limitedStock.quantityLeft} Left
            </span>
          )}
          {kit.flashSale && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
              ⚡ Flash Sale
            </span>
          )}
          {isBundleEligible && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
              📦 Buy Pack Offer
            </span>
          )}
        </div>
        {onToggleCompare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(kit);
            }}
            className={`absolute top-2 right-2 z-10 px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isCompared
                ? "bg-primary text-white ring-2 ring-primary/40"
                : "bg-white/95 dark:bg-slate-900/95 text-text-primary hover:bg-white border border-border"
            }`}
            title={isCompared ? "Remove from comparison" : "Add to comparison"}
          >
            <FaLayerGroup size={10} className={isCompared ? "text-white" : "text-primary"} />
            <span>{isCompared ? "✓ Compared" : "Compare"}</span>
          </button>
        )}
        <img
          src={displayImage}
          alt={displayKitName}
          className="w-full h-full p-2 object-contain transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_KIT_IMAGE;
          }}
        />
        {/* Decorative background circle */}
        <div className="absolute -z-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      </div>

      {/* Text Details */}
      <div className="flex-1 flex flex-col">
        <h3 className={`font-bold text-text-primary mb-1.5 line-clamp-1 leading-tight group-hover:text-primary dark:group-hover:text-info transition-colors ${compact ? 'text-base' : 'text-lg'}`}>
          {displayKitName}
        </h3>
        <p className="text-text-secondary text-xs line-clamp-2 leading-relaxed mb-4">
          {displayDescription}
        </p>

        {/* Dynamic Capacity Badge & Warranty Info Row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-primary/5 dark:bg-primary/10 dark:bg-primary/15 text-primary dark:text-info border border-primary/10 dark:border-info/10 text-xs font-bold px-2.5 py-1 rounded-lg">
            <FaBolt className="text-[10px]" />
            <span>{displayCapacity}</span>
          </div>
          {kit.warrantyYears && (
            <div className="flex items-center gap-1.5 bg-primary/5 dark:bg-primary/10 dark:bg-primary/15 text-primary dark:text-info border border-primary/10 dark:border-info/10 text-xs font-bold px-2.5 py-1 rounded-lg">
              <FaShieldAlt className="text-[10px]" />
              <span>{kit.warrantyYears} Years</span>
            </div>
          )}
          {hasDatasheets && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDatasheetModal(true);
              }}
              title="View Manufacturer Datasheets"
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ml-auto"
            >
              <FaFilePdf className="text-[11px]" />
              <span>Datasheets</span>
            </button>
          )}
        </div>

        <KitComponentsRow kit={kit} />

        {/* Milestone Policy Progress Indicator */}
        {kit.payment_milestones && (
          <div className="mb-4 p-2.5 rounded-xl bg-surface-hover/70 border border-border/80 text-[11px] space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-2xs"></span>
                Advance: {kit.payment_milestones.advance_percentage}%
              </span>
              <span className="text-primary dark:text-info flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary dark:bg-info inline-block shadow-2xs"></span>
                Balance: {kit.payment_milestones.remaining_percentage}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${kit.payment_milestones.advance_percentage}%` }}
                title={`Advance: ${kit.payment_milestones.advance_percentage}%`}
              />
              <div
                className="bg-primary dark:bg-info h-full transition-all duration-300"
                style={{ width: `${kit.payment_milestones.remaining_percentage}%` }}
                title={`Balance before dispatch: ${kit.payment_milestones.remaining_percentage}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-muted font-medium">
              <span>Order Placement</span>
              <span>Before Dispatch</span>
            </div>
          </div>
        )}

        {/* Variant Selector Dropdown */}
        {kit.variants?.length > 1 && !isCart && (
          <div className="relative mb-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowVariants(!showVariants)}
              className="w-full flex items-center justify-between px-3 py-2 bg-surface-hover hover:bg-surface-hover/80 rounded-xl border border-border text-xs font-semibold text-text-primary transition-colors"
            >
              <span className="flex items-center gap-2">
                {tierConfig.icon}
                <span style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>{currentVariant?.productTier}</span>
              </span>
              <span className="flex items-center gap-1 text-text-secondary font-normal">
                <span className="font-bold" style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : { color: 'var(--color-primary)' }}>₹{currentVariant?.ourPrice?.toLocaleString("en-IN")}</span>
                {showVariants ? <FaChevronUp size={10} className="ml-1" /> : <FaChevronDown size={10} className="ml-1" />}
              </span>
            </button>
            
            {showVariants && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-surface rounded-xl border border-border shadow-xl z-20 overflow-hidden divide-y divide-border animate-in fade-in slide-in-from-bottom-2 duration-200">
                {kit.variants.map((variant, index) => {
                  const variantTierConfig = getTierConfig(variant.productTier, variant.tierColor);
                  const variantDiscount = variant.marketPrice > variant.ourPrice
                    ? Math.round(((variant.marketPrice - variant.ourPrice) / variant.marketPrice) * 100)
                    : 0;
                  return (
                    <button
                      key={index}
                      onClick={() => handleVariantChange(index)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-hover text-xs transition-colors ${
                        index === selectedVariant ? 'bg-primary/[0.03] font-bold' : 'text-text-primary'
                      }`}
                      style={index === selectedVariant && variant.tierColor ? { color: variant.tierColor, backgroundColor:`${variant.tierColor}08` } : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <span>{variantTierConfig.icon}</span>
                        <span>{variant.productTier}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-bold" style={variant.tierColor ? { color: variant.tierColor } : { color: 'var(--color-primary)' }}>
                          ₹{variant.ourPrice?.toLocaleString("en-IN")}
                        </span>
                        {variantDiscount > 0 && (
                          <span className="block text-[9px] text-text-muted font-normal line-through">
                            ₹{variant.marketPrice?.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pricing Info */}
        <div className="flex items-end justify-between mb-4 border-t border-border pt-4">
          <div className="text-left">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Special Price</span>
              {activeTierPricing && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  activeTierPricing.type === 'po'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-primary/10 text-primary dark:text-info border border-primary/20'
                }`}>
                  {activeTierPricing.type === 'po' ? 'PO Bulk Tier' : 'Loose Tier'}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-text-primary leading-none">₹{formattedPrices.ourPrice}</span>
              <span className="text-[10px] text-text-secondary font-semibold">/ kit</span>
              {discountPercentage > 0 && (
                <del className="text-xs text-text-muted font-semibold ml-1">₹{formattedPrices.marketPrice}</del>
              )}
            </div>
            {selectedOrderQty > 1 && (
              <div className="text-xs font-black text-primary dark:text-info mt-1 flex items-center gap-1">
                <span>Batch Total:</span>
                <span>₹{formattedPrices.totalOrderValue}</span>
                <span className="text-[10px] font-normal text-text-muted">({selectedOrderQty} kits)</span>
              </div>
            )}
            {formattedPrices.gstIncluded && (
              <span className="text-[10px] text-success font-semibold block mt-0.5">
                (Includes ₹{formattedPrices.gstIncluded} GST @ {formattedPrices.gstRate}%)
              </span>
            )}
          </div>
          {discountPercentage > 0 && (
            <span className="bg-primary/5 dark:bg-primary/10 dark:bg-primary/15 text-primary dark:text-info text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/15 dark:border-info/20 shadow-2xs">
              Save {discountPercentage}%
            </span>
          )}
        </div>

        {/* Promo Badges (Free Delivery, Savings) */}
        {currentVariant?.includedDeliveryCharge > 0 && (
          <div className="flex items-center justify-between bg-blue-500/5 text-blue-700 rounded-xl px-3 py-2 border border-blue-500/10 text-xs font-bold mb-4">
            <span className="flex items-center gap-1.5">
              <FaTruck size={12} className="text-blue-500" />
              Free Shipping Included
            </span>
            <span>Save ₹{deliverySavings}</span>
          </div>
        )}

        {/* Tier Benefits Quick Popup Badge */}
        {currentVariant?.tierBenefits && currentVariant.tierBenefits.length > 0 && (
          <div className="relative mb-4 w-fit">
            {showPerksTooltip && (
              <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-gray-900/95 backdrop-blur-xs text-white text-xs rounded-xl z-20 shadow-xl border border-gray-800 animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="font-bold flex items-center justify-between mb-2 gap-2 border-b border-gray-800 pb-1.5">
                  <div className="flex items-center gap-2">
                    <FaAward className={tierConfig.text} />
                    <span>{currentVariant?.productTier} Tier Perks</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPerksTooltip(false);
                    }}
                    className="text-white/60 hover:text-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10"
                  >
                    ✕
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {currentVariant.tierBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <FaCheck className="text-green-400 text-[10px] mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 leading-tight">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
              </div>
            )}

            <div 
              onClick={(e) => {
                e.stopPropagation();
                setShowPerksTooltip(!showPerksTooltip);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer select-none transition-colors border ${tierConfig.badgeBg} ${tierConfig.badgeText} ${tierConfig.border}`}
            >
              <FaInfoCircle size={12} className={tierConfig.text} />
              <span className="truncate max-w-[150px]">{firstBenefit}</span>
              {currentVariant.tierBenefits.length > 1 && (
                <span className={`bg-white/70 shadow-3xs px-1.5 py-0.5 rounded-full text-[9px] font-bold ${tierConfig.text}`}>
                  +{currentVariant.tierBenefits.length - 1}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Cart Item Detail */}
        {cartItem && cartCalculations.quantity > 0 && (
          <div className="mb-4 p-3 bg-primary/[0.02] border border-primary/20 dark:border-info/25 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between items-center text-text-secondary font-medium">
              <span>Selected Qty:</span>
              <span className="font-bold text-text-primary">{cartCalculations.quantity} {cartCalculations.quantity === 1 ? 'kit' : 'kits'}</span>
            </div>
            {cartCalculations.totalSavings > 0 && (
              <div className="flex justify-between items-center text-green-700 font-bold">
                <span className="flex items-center gap-1">
                  <FaPiggyBank size={12} />
                  Total Savings:
                </span>
                <span>₹{formattedCalculations.totalSavings}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button Section */}
        <div className="mt-auto pt-2">
          {hasOrderQuantities ? (
            /* Order Quantity Chips Mode */
            <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
              {/* Category Switcher Tabs (Loose vs PO) if both exist */}
              {hasLooseQuantities && hasPoQuantities && (
                <div className="flex rounded-lg bg-surface-hover p-0.5 border border-border text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveTierType("loose"); }}
                    className={`flex-1 py-1 px-1.5 rounded-md transition-all text-center ${
                      activeTierType === "loose"
                        ? "bg-surface text-primary shadow-xs font-black"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Loose ({looseOrderQuantities[0] || 5}-{looseOrderQuantities[looseOrderQuantities.length - 1] || 25})
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveTierType("po"); }}
                    className={`flex-1 py-1 px-1.5 rounded-md transition-all text-center ${
                      activeTierType === "po"
                        ? "bg-surface text-amber-600 dark:text-amber-400 shadow-xs font-black"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Bulk PO ({poOrderQuantities[0] || 100}+)
                  </button>
                </div>
              )}

              {!cartItem && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {currentCategoryQuantities.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedOrderQty(qty); }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all duration-150 cursor-pointer
                        ${selectedOrderQty === qty
                          ? 'bg-primary text-white border-primary shadow-md scale-102'
                          : 'bg-surface border-border text-text-secondary hover:border-primary/50 hover:text-primary'
                        }`}
                    >
                      {qty} Kits
                    </button>
                  ))}
                </div>
              )}
              {!cartItem ? (
                <Button
                  onClick={handleAddToCart}
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<FaShoppingCart />}
                  className="bg-gradient-to-r from-primary to-primary-end text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Add {selectedOrderQty || currentCategoryQuantities[0] || 1} Kits to Cart
                </Button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {currentCategoryQuantities.map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(addToCart({
                            id: kit.id,
                            variantIndex: selectedVariant,
                            qty,
                            replace: true,
                            price_per_kit: activeTierPricing?.price_per_kit || formattedPrices.rawOurPrice,
                          }));
                          setSelectedOrderQty(qty);
                        }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all duration-150 cursor-pointer
                          ${cartItem.qty === qty
                            ? 'bg-primary text-white border-primary shadow-md'
                            : 'bg-surface border-border text-text-secondary hover:border-primary/50 hover:text-primary'
                          }`}
                      >
                        {qty} Kits
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); dispatch(removeFromCart(cartItemId)); }}
                    className="w-full text-[10px] text-rose-500 font-bold uppercase tracking-wider hover:text-rose-700 py-1 transition-colors"
                  >
                    Remove from Cart
                  </button>
                </div>
              )}
            </div>
          ) : cartItem ? (
            <div className="flex justify-between items-center bg-gradient-to-r from-primary to-primary-end rounded-xl py-1 px-1.5 shadow-md">
              <IconButton
                onClick={handleDecreaseQty}
                variant="ghost"
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/25 w-8 h-8 rounded-lg shadow-xs"
              >
                <FaMinus className="text-[10px]" />
              </IconButton>
              <span className="text-sm font-black text-white px-2">
                {cartItem.qty} {cartItem.qty === 1 ? 'Kit' : 'Kits'}
              </span>
              <IconButton
                onClick={handleIncreaseQty}
                variant="ghost"
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/25 w-8 h-8 rounded-lg shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isMaxStockReached}
              >
                <FaPlus className="text-[10px]" />
              </IconButton>
            </div>
          ) : !effectiveInStock ? (
            <Button
              variant="danger"
              size="md"
              fullWidth
              disabled
              className="bg-red-50 text-red-500 border border-red-200 cursor-not-allowed hover:bg-red-50"
            >
              Out of Stock
            </Button>
          ) : (
            <Button
              onClick={handleAddToCart}
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<FaShoppingCart />}
              className="bg-gradient-to-r from-primary to-primary-end text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-98"
            >
              Add to Cart
            </Button>
          )}

          {canShowTrialButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTrialModalOpen(true);
              }}
              className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center gap-2 shadow-xs transition-all duration-200 cursor-pointer group/trial hover:scale-[1.01]"
            >
              <FaTruck className="text-amber-600 dark:text-amber-400 group-hover/trial:animate-pulse" />
              <span>Order Trial Kit ({trialKitQty} Kits)</span>
            </button>
          )}

          {/* Download Datasheet Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDatasheetModal(true);
            }}
            className={`w-full mt-2 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all duration-200 cursor-pointer group/datasheet hover:scale-[1.01] ${
              hasDatasheets
                ? "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                : "bg-surface-hover hover:bg-surface-hover/80 text-text-secondary border border-border"
            }`}
          >
            <FaFilePdf className={`${hasDatasheets ? "text-red-500" : "text-text-muted"} group-hover/datasheet:scale-110 transition-transform`} size={13} />
            <span>{hasDatasheets ? "Download Datasheet (PDF)" : "View Datasheet (PDF)"}</span>
          </button>
        </div>

        {/* Eco footer stats */}
        <div className="mt-4 flex justify-between items-center text-[10px] text-text-muted font-bold border-t border-border pt-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDatasheetModal(true);
            }}
            className="flex items-center gap-1.5 text-red-600 hover:text-red-700 dark:text-red-400 cursor-pointer font-black transition-colors"
          >
            <FaFilePdf size={12} className="text-red-500" />
            <span>{hasDatasheets ? "Datasheet Available" : "Technical Specs"}</span>
          </button>
          <span className="flex items-center gap-1 text-primary dark:text-info">
            <FaLeaf />
            Clean Energy
          </span>
        </div>
      </div>
    </div>
  );

  // List View Component
  const ListView = () => (
    <div
      className={`relative bg-surface rounded-2xl border flex transition-all duration-300 cursor-pointer overflow-hidden group w-full ${
        isSelected
          ?"border-primary ring-2 ring-primary/20 bg-gradient-to-r from-primary/[0.01] to-primary/[0.02] shadow-lg"
          :"border-border hover:border-primary/30 hover:shadow-xl hover:-translate-y-1"
      } ${compact ? 'p-3' : 'p-5'}`}
      onClick={handleSelect}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select ${displayKitName} kit`}
    >
      {/* Selection indicators */}
      {isSelected && (
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-primary to-primary-end" />
      )}

      <div className="flex gap-5 w-full items-stretch">
        {/* Left: Image with hover effect */}
        <div className={`relative z-[2] flex-shrink-0 bg-gradient-to-tr from-gray-50/50 to-slate-100/50 rounded-xl overflow-hidden border border-border flex items-center justify-center ${
          compact ? 'w-28 h-28' : 'w-52 h-52'
        }`}>
          {/* Badges Overlay */}
          <div className="absolute top-1 left-1 flex flex-col gap-1 z-10">
            {(kit.is_best_seller || kit.best_seller_badge) && (
              <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-1 uppercase tracking-wider">
                <FaStar className="text-yellow-200 text-[8px]" />
                <span>{kit.best_seller_badge || kit.best_seller_info?.badge_text || "Our Best Seller"}</span>
              </span>
            )}
            {kit.limitedStock?.displayBadge && (
              <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 animate-pulse">
                🔥 Only {kit.limitedStock.quantityLeft} Left
              </span>
            )}
            {kit.flashSale && (
              <span className="bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                ⚡ Sale
              </span>
            )}
            {isBundleEligible && (
              <span className="bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                📦 Buy Pack Offer
              </span>
            )}
          </div>
          {onToggleCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(kit);
              }}
              className={`absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1 transition-all shadow cursor-pointer ${
                isCompared
                  ? "bg-primary text-white"
                  : "bg-white/95 dark:bg-slate-900/95 text-text-primary hover:bg-white border border-border"
              }`}
              title={isCompared ? "Remove from comparison" : "Add to comparison"}
            >
              <FaLayerGroup size={8} className={isCompared ? "text-white" : "text-primary"} />
              <span>{isCompared ? "✓" : "Compare"}</span>
            </button>
          )}
          <img
            src={displayImage}
            alt={displayKitName}
            className="w-full h-full p-2.5 object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_KIT_IMAGE;
            }}
          />
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 justify-between">
          {/* Main info section */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Badges Row */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {!kit.hasNoAssignedVariants && kit.variants && kit.variants.length > 0 && (
                  <div
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${!currentVariant?.tierColor ? `${tierConfig.border} ${tierConfig.bg}` : ""}`}
                    style={currentVariant?.tierColor ? {
                      backgroundColor: `${currentVariant.tierColor}15`,
                      color: currentVariant.tierColor,
                      borderColor: `${currentVariant.tierColor}35`
                    } : undefined}
                  >
                    <span className={!currentVariant?.tierColor ? tierConfig.text : ""} style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>
                      {tierConfig.icon}
                    </span>
                    <span className={!currentVariant?.tierColor ? tierConfig.text : ""} style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>
                      {currentVariant?.productTier}
                    </span>
                  </div>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border shadow-xs ${!kit.usageTypeColor ? usageTypeClass :""}`}
                  style={kit.usageTypeColor ? {
                    backgroundColor:`${kit.usageTypeColor}15`,
                    color: kit.usageTypeColor,
                    borderColor:`${kit.usageTypeColor}35`
                  } : undefined}
                >
                  {kit.usageTypeImage && (
                    <img
                      src={resolveImageUrl(kit.usageTypeImage)}
                      alt=""
                      className="w-5 h-5 object-contain rounded-full shrink-0"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
                  <span>{kit.usageType}</span>
                </span>
                {!currentVariant?.inStock && (
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-red-50 text-red-600 border border-red-200">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Title & Desc */}
              <h3 className={`font-bold text-text-primary mb-1 line-clamp-1 leading-tight group-hover:text-primary dark:group-hover:text-info transition-colors ${compact ? 'text-base' : 'text-lg'}`}>
                {displayKitName}
              </h3>
              <p className="text-text-secondary text-xs line-clamp-2 leading-relaxed mb-3">
                {displayDescription}
              </p>
            </div>

            <KitComponentsRow kit={kit} />

        {/* Milestone Policy Progress Indicator */}
        {kit.payment_milestones && (
          <div className="mb-4 p-2.5 rounded-xl bg-surface-hover/70 border border-border/80 text-[11px] space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-2xs"></span>
                Advance: {kit.payment_milestones.advance_percentage}%
              </span>
              <span className="text-primary dark:text-info flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary dark:bg-info inline-block shadow-2xs"></span>
                Balance: {kit.payment_milestones.remaining_percentage}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${kit.payment_milestones.advance_percentage}%` }}
                title={`Advance: ${kit.payment_milestones.advance_percentage}%`}
              />
              <div
                className="bg-primary dark:bg-info h-full transition-all duration-300"
                style={{ width: `${kit.payment_milestones.remaining_percentage}%` }}
                title={`Balance before dispatch: ${kit.payment_milestones.remaining_percentage}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-muted font-medium">
              <span>Order Placement</span>
              <span>Before Dispatch</span>
            </div>
          </div>
        )}

            {/* Spec Badges Row & Benefits */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-50/80 text-blue-700 border border-primary/20/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <FaBolt size={10} />
                  {displayCapacity} Capacity
                </span>
                {discountPercentage > 0 && (
                  <span className="bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {discountPercentage}% Off
                  </span>
                )}
                {currentVariant?.includedDeliveryCharge > 0 && (
                  <span className="bg-primary/10 dark:bg-primary/15 text-primary dark:text-info border border-primary/20 dark:border-info/25 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <FaTruck size={10} />
                    Free Delivery
                  </span>
                )}
              </div>

              {/* Benefits list */}
              {currentVariant?.tierBenefits && currentVariant.tierBenefits.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {currentVariant.tierBenefits.slice(0, 2).map((benefit, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-700 px-2 py-1 rounded-md border border-green-500/20"
                      title={benefit}
                    >
                      <FaCheck className="text-green-600 text-[8px]" />
                      {benefit.length > 24 ?`${benefit.substring(0, 24)}...` : benefit}
                    </span>
                  ))}
                  {currentVariant.tierBenefits.length > 2 && (
                    <span className="inline-flex items-center text-[10px] bg-surface-hover text-text-secondary px-2 py-1 rounded-md border border-border">
                      +{currentVariant.tierBenefits.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar action & pricing section */}
          <div className="flex-shrink-0 w-full md:w-52 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
            {/* Pricing Section */}
            <div className="mb-3 text-left md:text-right">
              <div className="flex items-center md:justify-end gap-1.5 mb-0.5">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Special Price</span>
                {activeTierPricing && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    activeTierPricing.type === 'po'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-primary/10 text-primary dark:text-info border border-primary/20'
                  }`}>
                    {activeTierPricing.type === 'po' ? 'PO Tier' : 'Loose Tier'}
                  </span>
                )}
              </div>
              <div className="flex items-baseline md:justify-end gap-1.5 flex-wrap">
                <span className="text-xl font-extrabold text-text-primary">₹{formattedPrices.ourPrice}</span>
                <span className="text-[10px] text-text-secondary font-semibold">/ kit</span>
                {discountPercentage > 0 && (
                  <del className="text-xs text-text-muted font-semibold">₹{formattedPrices.marketPrice}</del>
                )}
              </div>
              {selectedOrderQty > 1 && (
                <div className="text-xs font-black text-primary dark:text-info mt-0.5 md:text-right">
                  Batch: ₹{formattedPrices.totalOrderValue} <span className="text-[10px] font-normal text-text-muted">({selectedOrderQty} kits)</span>
                </div>
              )}
              {formattedPrices.gstIncluded && (
                <span className="text-[10px] text-success font-semibold block mt-0.5 md:text-right">
                  (Includes ₹{formattedPrices.gstIncluded} GST @ {formattedPrices.gstRate}%)
                </span>
              )}
                
                {/* Variant Selector Button - List View */}
                {kit.variants?.length > 1 && (
                  <div className="relative mb-3 w-full" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShowVariants(!showVariants)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 bg-surface-hover hover:bg-surface-hover rounded-lg border border-border text-xs font-semibold text-text-primary"
                    >
                      <span className="flex items-center gap-1.5">
                        {tierConfig.icon}
                        <span style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>{currentVariant?.productTier}</span>
                      </span>
                      {showVariants ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                    </button>
                    
                    {showVariants && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-xl border border-border shadow-xl z-20 overflow-hidden divide-y divide-border">
                        {kit.variants.map((variant, index) => {
                          const variantTierConfig = getTierConfig(variant.productTier, variant.tierColor);
                          const variantDiscount = variant.marketPrice > variant.ourPrice
                            ? Math.round(((variant.marketPrice - variant.ourPrice) / variant.marketPrice) * 100)
                            : 0;
                          return (
                            <button
                              key={index}
                              onClick={() => handleVariantChange(index)}
                              className={`w-full flex items-center justify-between px-3 py-2 hover:bg-surface-hover text-xs transition-colors ${
                                index === selectedVariant ? 'bg-primary/[0.03] font-bold' : 'text-text-primary'
                              }`}
                              style={index === selectedVariant && variant.tierColor ? { color: variant.tierColor, backgroundColor:`${variant.tierColor}08` } : undefined}
                            >
                              <span className="flex items-center gap-1.5">
                                <span>{variantTierConfig.icon}</span>
                                <span>{variant.productTier}</span>
                              </span>
                              <div className="text-right">
                                <span className="font-bold" style={variant.tierColor ? { color: variant.tierColor } : { color: 'var(--color-primary)' }}>
                                  ₹{variant.ourPrice?.toLocaleString("en-IN")}
                                </span>
                                {variantDiscount > 0 && (
                                  <span className="block text-[9px] text-text-muted font-normal line-through">
                                    ₹{variant.marketPrice?.toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

            {/* Cart Calculations Summary */}
            {cartItem && cartCalculations.quantity > 0 && (
              <div className="mb-3 p-2 bg-primary/[0.02] border border-primary/20 dark:border-info/25 rounded-xl text-[11px] space-y-1">
                <div className="flex justify-between items-center text-text-secondary">
                  <span>Selected:</span>
                  <span className="font-bold text-text-primary">{cartCalculations.quantity} kits</span>
                </div>
                {cartCalculations.totalSavings > 0 && (
                  <div className="flex justify-between items-center text-green-700 font-bold">
                    <span>Savings:</span>
                    <span>₹{formattedCalculations.totalSavings}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cart Button */}
            <div>
              {hasOrderQuantities ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  {/* Category switcher if both Loose and PO exist */}
                  {hasLooseQuantities && hasPoQuantities && (
                    <div className="flex rounded-lg bg-surface-hover p-0.5 border border-border text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveTierType("loose"); }}
                        className={`flex-1 py-0.5 px-1 rounded transition-all text-center ${
                          activeTierType === "loose"
                            ? "bg-surface text-primary shadow-xs font-black"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        Loose
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveTierType("po"); }}
                        className={`flex-1 py-0.5 px-1 rounded transition-all text-center ${
                          activeTierType === "po"
                            ? "bg-surface text-amber-600 dark:text-amber-400 shadow-xs font-black"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        Bulk PO
                      </button>
                    </div>
                  )}

                  {!cartItem && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {currentCategoryQuantities.map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedOrderQty(qty); }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all duration-150 cursor-pointer
                            ${selectedOrderQty === qty
                              ? 'bg-primary text-white border-primary shadow-md'
                              : 'bg-surface border-border text-text-secondary hover:border-primary/50 hover:text-primary'
                            }`}
                        >
                          {qty} Kits
                        </button>
                      ))}
                    </div>
                  )}
                  {!cartItem ? (
                    <Button
                      onClick={handleAddToCart}
                      variant="primary"
                      size="md"
                      fullWidth
                      leftIcon={<FaShoppingCart />}
                      className="bg-gradient-to-r from-primary to-primary-end text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-xs py-2"
                    >
                      Add {selectedOrderQty || currentCategoryQuantities[0] || 1} Kits to Cart
                    </Button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {currentCategoryQuantities.map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch(addToCart({
                                id: kit.id,
                                variantIndex: selectedVariant,
                                qty,
                                replace: true,
                                price_per_kit: activeTierPricing?.price_per_kit || formattedPrices.rawOurPrice,
                              }));
                              setSelectedOrderQty(qty);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all duration-150 cursor-pointer
                              ${cartItem.qty === qty
                                ? 'bg-primary text-white border-primary shadow-md'
                                : 'bg-surface border-border text-text-secondary hover:border-primary/50 hover:text-primary'
                              }`}
                          >
                            {qty} Kits
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); dispatch(removeFromCart(cartItemId)); }}
                        className="w-full text-[10px] text-rose-500 font-bold uppercase tracking-wider hover:text-rose-700 py-1 transition-colors"
                      >
                        Remove from Cart
                      </button>
                    </div>
                  )}
                </div>
              ) : !currentVariant?.inStock ? (
                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  disabled
                  className="bg-red-50 text-red-500 border border-red-200 cursor-not-allowed"
                >
                  Out of Stock
                </Button>
              ) : !cartItem ? (
                <Button
                  onClick={handleAddToCart}
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<FaShoppingCart />}
                  className="bg-gradient-to-r from-primary to-primary-end text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-98"
                >
                  Add to Cart
                </Button>
              ) : (
                <div className="flex justify-between items-center bg-gradient-to-r from-primary to-primary-end rounded-xl py-1 px-1.5 shadow-md font-bold text-white px-2">
                  <IconButton
                    onClick={handleDecreaseQty}
                    variant="ghost"
                    size="sm"
                    className="bg-white/15 hover:bg-white/25 text-white border border-white/25 w-8 h-8 rounded-lg shadow-xs"
                  >
                    <FaMinus className="text-[10px]" />
                  </IconButton>
                  <span className="text-sm font-black text-white px-2">
                    {cartItem.qty}
                  </span>
                  <IconButton
                    onClick={handleIncreaseQty}
                    variant="ghost"
                    size="sm"
                    className="bg-white/15 hover:bg-white/25 text-white border border-white/25 w-8 h-8 rounded-lg shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isMaxStockReached}
                  >
                    <FaPlus className="text-[10px]" />
                  </IconButton>
                </div>
              )}

              {canShowTrialButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTrialModalOpen(true);
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center gap-2 shadow-xs transition-all duration-200 cursor-pointer group/trial hover:scale-[1.01]"
                >
                  <FaTruck className="text-amber-600 dark:text-amber-400 group-hover/trial:animate-pulse" />
                  <span>Order Trial Kit ({trialKitQty} Kits)</span>
                </button>
              )}

              {/* Download Datasheet Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDatasheetModal(true);
                }}
                className={`w-full mt-2 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all duration-200 cursor-pointer group/datasheet hover:scale-[1.01] ${
                  hasDatasheets
                    ? "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                    : "bg-surface-hover hover:bg-surface-hover/80 text-text-secondary border border-border"
                }`}
              >
                <FaFilePdf className={`${hasDatasheets ? "text-red-500" : "text-text-muted"} group-hover/datasheet:scale-110 transition-transform`} size={13} />
                <span>{hasDatasheets ? "Download Datasheet (PDF)" : "View Datasheet (PDF)"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {viewMode === "list" ? <ListView /> : <GridView />}
      {hasTrialKit && (
        <TrialKitOrderModal
          isOpen={trialModalOpen}
          onClose={() => setTrialModalOpen(false)}
          kit={kit}
          currentVariant={currentVariant}
          selectedVariantIndex={selectedVariant}
        />
      )}
      {showDatasheetModal && (
        <DatasheetModal
          isOpen={showDatasheetModal}
          onClose={() => setShowDatasheetModal(false)}
          kit={kit}
        />
      )}
    </>
  );
});

KitCard.displayName ="KitCard";

export default KitCard;