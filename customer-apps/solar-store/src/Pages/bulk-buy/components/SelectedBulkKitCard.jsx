import { useRef, useState, memo, useCallback, useMemo, useEffect } from "react";
import {
  FaPlus, FaMinus, FaSolarPanel, FaBolt, FaBatteryFull, FaCogs,
  FaLayerGroup, FaBoxOpen, FaRupeeSign, FaCheck, FaShoppingCart, FaPiggyBank,
  FaGem, FaStar, FaHome, FaInfoCircle, FaTruck, FaTag, FaChevronDown, FaChevronUp,
  FaBalanceScale, FaAward
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import Button from "@/Components/Button";
import IconButton from "@/Components/IconButton";
import Dialog from "@/Components/Dialog";
import {
  addToBulkCart,
  decreaseBulkQty,
  increaseBulkQty,
  removeFromBulkCart,
  updateBulkCartVariant,
} from "@/features/slice";

const DEFAULT_KIT_IMAGE = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";

const resolveImageUrl = (url) => {
  if (!url) return DEFAULT_KIT_IMAGE;
  if (typeof url !== 'string') return DEFAULT_KIT_IMAGE;
  if (url.includes("localhost:3001")) {
    return url.replace("localhost:3001", "localhost:5000");
  }
  if (url.startsWith("/")) {
    return `http://localhost:5000${url}`;
  }
  return url;
};

const FALLBACK_COMPONENT_IMAGES = {
  Panel: "https://res.cloudinary.com/dggmbagax/image/upload/v1788257426/solarkits/public/uploads/products/tps_mod_540w_mono.jpg",
  Inverter: "https://res.cloudinary.com/dggmbagax/image/upload/v1788257570/solarkits/public/uploads/products/hav_inv_3kw_1p.jpg",
  "BOS Kit": "https://res.cloudinary.com/dggmbagax/image/upload/v1788328065/solarkits/solarkits-admin-panel-backend/public/uploads/combo_kits/BOS_1788328062998_421348048.jpg",
  Battery: "https://res.cloudinary.com/dggmbagax/image/upload/v1788257664/solarkits/public/uploads/products/exi_bat_5_12kwh_lfp.svg",
  panel: "https://res.cloudinary.com/dggmbagax/image/upload/v1788257426/solarkits/public/uploads/products/tps_mod_540w_mono.jpg",
  inverter: "https://res.cloudinary.com/dggmbagax/image/upload/v1788257570/solarkits/public/uploads/products/hav_inv_3kw_1p.jpg",
  bos: "https://res.cloudinary.com/dggmbagax/image/upload/v1788328065/solarkits/solarkits-admin-panel-backend/public/uploads/combo_kits/BOS_1788328062998_421348048.jpg",
};

const resolveComponentImageUrl = (url, typeOrTitle) => {
  if (!url || typeof url !== 'string' || url.trim() === "" || url.includes("default")) {
    return FALLBACK_COMPONENT_IMAGES[typeOrTitle] || null;
  }
  if (url.includes("localhost:3001")) {
    return url.replace("localhost:3001", "localhost:5000");
  }
  if (url.startsWith("/")) {
    return `http://localhost:5000${url}`;
  }
  return url;
};

const ImageWithPlaceholder = ({ src, alt }) => {
  const getInitial = useCallback(() => {
    return resolveComponentImageUrl(src, alt) || FALLBACK_COMPONENT_IMAGES[alt] || null;
  }, [src, alt]);

  const [imgSrc, setImgSrc] = useState(getInitial);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const next = getInitial();
    setImgSrc(next);
    setHasError(!next);
  }, [getInitial]);

  const handleImgError = () => {
    const fallback = FALLBACK_COMPONENT_IMAGES[alt];
    if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  if (hasError || !imgSrc) {
    return (
      <div className="flex items-center justify-center bg-surface-hover rounded-xl p-3 w-[150px] h-[80px] mx-auto border border-dashed border-border">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-300">
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1"/>
          <circle cx="8.5" cy="8.5" r="1.5" fill="#D1D5DB"/>
          <path d="M4 20L9 13L14 17L17 14L20 18" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="max-w-[150px] max-h-[80px] mx-auto object-contain rounded-lg transition-transform hover:scale-105"
      loading="lazy"
      onError={handleImgError}
    />
  );
};

const SelectedBulkKitCard = memo(({ kit }) => {
  const dispatch = useDispatch();
  const bulkCart = useSelector((state) => state.slice.bulkCart);
  const initialVariantIndex = useMemo(() => {
    if (!kit?.variants) return 0;
    const idx = kit.variants.findIndex(v => v.productTier?.toLowerCase() === "standard");
    return idx >= 0 ? idx : 0;
  }, [kit?.variants]);

  const [selectedVariant, setSelectedVariant] = useState(initialVariantIndex);
  const [selectedOrderQty, setSelectedOrderQty] = useState(null);

  useEffect(() => {
    setSelectedVariant(initialVariantIndex);
  }, [kit?.id]);

  const [showVariants, setShowVariants] = useState(false);
  const [showVariantComparison, setShowVariantComparison] = useState(false);
  const [showBosPopup, setShowBosPopup] = useState(false);
  const [selectedBosComp, setSelectedBosComp] = useState(null);
  const scrollRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [startX, setStartX] = useState(0);

  const currentVariant = kit?.variants?.[selectedVariant] || kit?.variants?.[0];
  const cartItemId = kit ? `${kit.id}-${selectedVariant}` : "";
  const bulkCartItem = kit ? bulkCart.find((item) => item.cartItemId === cartItemId) : null;

  // Order quantities from kit configuration
  const orderQuantities = useMemo(() => {
    const rawQtys = kit?.orderQuantities || kit?.order_quantities || [];
    return Array.isArray(rawQtys) ? rawQtys.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b) : [];
  }, [kit?.orderQuantities, kit?.order_quantities]);

  const hasOrderQuantities = orderQuantities.length > 0;

  useEffect(() => {
    if (hasOrderQuantities) {
      setSelectedOrderQty(orderQuantities[0]);
    }
  }, [kit?.id, hasOrderQuantities]);

  const maxAllowedPacks = useMemo(() => {
    let maxTiersQty = 10;
    if (currentVariant?.bulkPack?.tiers && Array.isArray(currentVariant.bulkPack.tiers) && currentVariant.bulkPack.tiers.length > 0) {
      let maxQty = currentVariant.bulkPack.tiers[0].quantity;
      currentVariant.bulkPack.tiers.forEach(t => {
        if (t.quantity > maxQty) {
          maxQty = t.quantity;
        }
      });
      maxTiersQty = maxQty;
    }
    return maxTiersQty;
  }, [currentVariant]);

  const isMaxPacksReached = useMemo(() => {
    return bulkCartItem && bulkCartItem.qty >= maxAllowedPacks;
  }, [bulkCartItem, maxAllowedPacks]);

  // Memoize type class function for usageType
  const getUsageTypeClass = useCallback(() => {
    return "bg-primary/5 text-primary border border-primary/15";
  }, []);

  // Memoize tier styling and icon
  const getTierConfig = useCallback((tier, color, benefits = []) => {
    const tierLabel = tier || "Standard Upgrade";
    const hasCustomColor = !!color;
    const iconColor = hasCustomColor ? color : undefined;
    
    // Create a dynamic description from the first benefit or a default placeholder
    const firstBenefit = benefits && benefits.length > 0 ? benefits[0] : "";
    const description = firstBenefit || "Custom configured upgrade variant with premium components";

    return {
      bg: hasCustomColor ? "" : "bg-primary/5 dark:bg-primary/10",
      text: hasCustomColor ? "" : "text-primary dark:text-info",
      border: hasCustomColor ? "" : "border-primary/15 dark:border-info/20",
      gradient: hasCustomColor ? "" : "bg-gradient-to-r from-primary/5 to-primary/10",
      icon: <FaAward className={hasCustomColor ? "" : "text-primary dark:text-info"} style={iconColor ? { color: iconColor } : undefined} />,
      label: tierLabel,
      customColor: color || null,
      description: description
    };
  }, []);

  const usageTypeClass = useMemo(() => getUsageTypeClass(kit?.usageType), [getUsageTypeClass, kit?.usageType]);
  const tierConfig = useMemo(() => getTierConfig(currentVariant?.productTier, currentVariant?.tierColor, currentVariant?.tierBenefits), [getTierConfig, currentVariant?.productTier, currentVariant?.tierColor, currentVariant?.tierBenefits]);

  const cardBaseClasses = "bg-surface p-3 rounded-lg border border-border min-w-[260px] flex-shrink-0 shadow-sm hover:shadow-md transition-all duration-300";

  // Scroll handlers
  const handleStart = useCallback((e) => {
    setIsScrolling(true);
    let pageX = e.type === "touchstart" ? e.touches[0].pageX : e.pageX;
    setStartX(pageX + scrollRef.current.scrollLeft);
  }, []);

  const handleMove = useCallback((e) => {
    if (!isScrolling) return;
    e.preventDefault();
    let pageX = e.type === "touchmove" ? e.touches[0].pageX : e.pageX;
    scrollRef.current.scrollLeft = startX - pageX;
  }, [isScrolling, startX]);

  const handleEnd = useCallback(() => {
    setIsScrolling(false);
  }, []);

  // Bulk cart actions
  const handleAddToBulkCart = useCallback(() => {
    dispatch(addToBulkCart({
      id: kit.id,
      variantIndex: selectedVariant,
      qty: hasOrderQuantities ? (selectedOrderQty || orderQuantities[0] || 1) : 1
    }));
  }, [dispatch, kit.id, selectedVariant, hasOrderQuantities, selectedOrderQty, orderQuantities]);

  const handleDecreaseBulkQty = useCallback(() => {
    if (hasOrderQuantities) {
      const currentQty = bulkCartItem?.qty || 0;
      const prevQty = [...orderQuantities].reverse().find(q => q < currentQty);
      if (prevQty) {
        dispatch(addToBulkCart({ id: kit.id, variantIndex: selectedVariant, qty: prevQty, replace: true }));
      } else {
        dispatch(removeFromBulkCart(cartItemId));
      }
    } else {
      if (bulkCartItem?.qty > 1) {
        dispatch(decreaseBulkQty(cartItemId));
      } else {
        dispatch(removeFromBulkCart(cartItemId));
      }
    }
  }, [dispatch, cartItemId, bulkCartItem?.qty, hasOrderQuantities, orderQuantities, kit?.id, selectedVariant]);

  const handleIncreaseBulkQty = useCallback(() => {
    if (hasOrderQuantities) {
      const currentQty = bulkCartItem?.qty || 0;
      const nextQty = orderQuantities.find(q => q > currentQty);
      if (nextQty) {
        dispatch(addToBulkCart({ id: kit.id, variantIndex: selectedVariant, qty: nextQty, replace: true }));
      }
    } else {
      dispatch(increaseBulkQty(cartItemId));
    }
  }, [dispatch, cartItemId, hasOrderQuantities, orderQuantities, kit?.id, selectedVariant, bulkCartItem?.qty]);

  const handleVariantChange = useCallback((index) => {
    if (index !== selectedVariant && bulkCartItem) {
      // If item is in cart, update the variant
      dispatch(updateBulkCartVariant({
        oldCartItemId: cartItemId,
        newVariantIndex: index
      }));
    }
    setSelectedVariant(index);
    setShowVariants(false);
    setShowVariantComparison(false);
  }, [dispatch, selectedVariant, cartItemId, bulkCartItem]);

  // Handle variant selection from comparison modal
  const handleCompareVariantSelect = useCallback((index) => {
    if (index !== selectedVariant && bulkCartItem) {
      dispatch(updateBulkCartVariant({
        oldCartItemId: cartItemId,
        newVariantIndex: index
      }));
    }
    setSelectedVariant(index);
    setShowVariantComparison(false);
    setShowVariants(false);
  }, [dispatch, selectedVariant, cartItemId, bulkCartItem]);

  // Get the correct price based on bulk pack
  const getEffectivePrices = useCallback(() => {
    if (currentVariant?.bulkPack?.pricePerKitAfterDiscount) {
      const packsCount = bulkCartItem ? bulkCartItem.qty : 1;
      let selectedTier = null;
      if (currentVariant.bulkPack.tiers && Array.isArray(currentVariant.bulkPack.tiers) && currentVariant.bulkPack.tiers.length > 0) {
        selectedTier = currentVariant.bulkPack.tiers.find(t => t.quantity === packsCount);
        if (!selectedTier) {
          let maxQtyTier = currentVariant.bulkPack.tiers[0];
          currentVariant.bulkPack.tiers.forEach(t => {
            if (t.quantity > maxQtyTier.quantity) {
              maxQtyTier = t;
            }
          });
          selectedTier = maxQtyTier;
        }
      }

      const effectiveBulkPack = selectedTier ? {
        ...currentVariant.bulkPack,
        packDiscountPercent: selectedTier.packDiscountPercent,
        pricePerKitAfterDiscount: selectedTier.pricePerKitAfterDiscount,
        totalPackPrice: selectedTier.totalPackPrice,
        totalSavingsPerPack: selectedTier.totalSavingsPerPack
      } : currentVariant.bulkPack;

      return {
        marketPrice: currentVariant?.marketPrice,
        ourPrice: effectiveBulkPack.pricePerKitAfterDiscount,
        regularPrice: currentVariant?.ourPrice,
        isBulkPrice: true,
        bulkPack: effectiveBulkPack
      };
    }
    return {
      marketPrice: currentVariant?.marketPrice,
      ourPrice: currentVariant?.ourPrice,
      regularPrice: currentVariant?.ourPrice,
      isBulkPrice: false,
      bulkPack: null
    };
  }, [currentVariant, bulkCartItem?.qty]);

  const effectivePrices = useMemo(() => getEffectivePrices(), [getEffectivePrices]);

  // Formatted prices
  const formattedPrices = useMemo(() => ({
    marketPrice: effectivePrices.marketPrice?.toLocaleString("en-IN"),
    ourPrice: effectivePrices.ourPrice?.toLocaleString("en-IN"),
    regularPrice: effectivePrices.regularPrice?.toLocaleString("en-IN"),
    pricePerKitAfterDiscount: effectivePrices.bulkPack?.pricePerKitAfterDiscount?.toLocaleString("en-IN") || "",
    totalPackPrice: effectivePrices.bulkPack?.totalPackPrice?.toLocaleString("en-IN") || "",
  }), [effectivePrices]);

  // Calculate total discount percentage
  const totalDiscountPercentage = useMemo(() => {
    if (!effectivePrices.marketPrice || !effectivePrices.ourPrice) return 0;
    return Math.round(((effectivePrices.marketPrice - effectivePrices.ourPrice) / effectivePrices.marketPrice) * 100);
  }, [effectivePrices]);

  // Individual kit discount percentage
  const individualDiscountPercentage = useMemo(() => {
    if (!currentVariant?.marketPrice || !currentVariant?.ourPrice) return 0;
    return Math.round(((currentVariant.marketPrice - currentVariant.ourPrice) / currentVariant.marketPrice) * 100);
  }, [currentVariant]);

  // Bulk pack discount percentage
  const bulkPackDiscountPercentage = useMemo(() => {
    if (!effectivePrices.bulkPack?.packDiscountPercent) return 0;
    return effectivePrices.bulkPack.packDiscountPercent;
  }, [effectivePrices]);

  // Cart calculations using effective prices
  const cartCalculations = useMemo(() => {
    if (!bulkCartItem || !kit || !currentVariant) {
      return {
        totalSavings: 0,
        totalAmount: 0,
        totalKits: 0,
        packs: 0,
        kitsPerPack: currentVariant?.bulkPack?.kitsPerPack || 1,
        totalMarketPrice: 0,
        totalRegularPrice: 0,
        totalDeliverySavings: 0,
        totalBulkSavings: 0,
        totalIndividualSavings: 0,
        perPackSavings: 0
      };
    }

    const packs = bulkCartItem.qty;
    const kitsPerPack = currentVariant.bulkPack?.kitsPerPack || 1;
    const totalKits = packs * kitsPerPack;

    const totalMarketPrice = totalKits * currentVariant.marketPrice;
    const totalRegularPrice = totalKits * currentVariant.ourPrice;
    const totalEffectivePrice = totalKits * effectivePrices.ourPrice;

    const totalIndividualSavings = totalMarketPrice - totalRegularPrice;
    const totalBulkSavings = totalRegularPrice - totalEffectivePrice;
    const totalDeliverySavings = (currentVariant.includedDeliveryCharge || 0) * packs;
    const perPackSavings = (currentVariant.marketPrice * kitsPerPack) - (effectivePrices.ourPrice * kitsPerPack);
    const totalSavings = totalIndividualSavings + totalBulkSavings + totalDeliverySavings;

    return {
      totalSavings,
      totalAmount: totalEffectivePrice,
      totalKits,
      packs,
      kitsPerPack,
      totalMarketPrice,
      totalRegularPrice,
      totalDeliverySavings,
      totalBulkSavings,
      totalIndividualSavings,
      perPackSavings
    };
  }, [bulkCartItem, kit, currentVariant, effectivePrices.ourPrice]);

  const formattedCalculations = useMemo(() => ({
    totalSavings: cartCalculations.totalSavings.toLocaleString("en-IN"),
    totalAmount: cartCalculations.totalAmount.toLocaleString("en-IN"),
    totalMarketPrice: cartCalculations.totalMarketPrice.toLocaleString("en-IN"),
    totalRegularPrice: cartCalculations.totalRegularPrice?.toLocaleString("en-IN") || "0",
    totalDeliverySavings: cartCalculations.totalDeliverySavings.toLocaleString("en-IN"),
    totalBulkSavings: cartCalculations.totalBulkSavings.toLocaleString("en-IN"),
    totalIndividualSavings: cartCalculations.totalIndividualSavings.toLocaleString("en-IN"),
    perPackSavings: cartCalculations.perPackSavings.toLocaleString("en-IN"),
  }), [cartCalculations]);

  // Variant comparison content
  const VariantComparisonContent = useCallback(() => (
    <div className="p-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kit.variants.map((variant, index) => {
          const variantTierConfig = getTierConfig(variant.productTier, variant.tierColor, variant.tierBenefits);
          const variantDiscount = Math.round(((variant.marketPrice - variant.ourPrice) / variant.marketPrice) * 100);
          const hasBulkPack = variant.bulkPack ? true : false;
          const isInCart = bulkCart.some(item =>
            item.id === kit.id && item.variantIndex === index
          );

          return (
            <div key={index} className={`flex flex-col border rounded-lg p-4 ${index === selectedVariant ? `${ variantTierConfig.border}` : "border-border"}`}>
              <div className={`flex items-center gap-2 mb-3 ${variantTierConfig.gradient} p-2 rounded-lg`}>
                {variantTierConfig.icon}
                <span className={`font-bold ${variantTierConfig.text}`}>{variant.productTier}</span>
              </div>

              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  {/* Price */}
                  <div>
                    <div className="text-xs text-text-secondary">Our Price</div>
                    <div className="text-2xl font-bold text-primary">₹{variant.ourPrice?.toLocaleString("en-IN")}/kit</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-secondary line-through">₹{variant.marketPrice?.toLocaleString("en-IN")}</span>
                      <span className="bg-success/10 text-success text-xs font-semibold px-2 py-0.5 rounded-full">
                        {variantDiscount}% off
                      </span>
                    </div>
                  </div>

                  {/* Bulk Pack Info */}
                  {hasBulkPack && (
                    <div className={`mt-2 ${variantTierConfig.gradient} rounded-lg p-2`}>
                      <p className={`text-xs font-semibold ${variantTierConfig.text} flex items-center gap-1`}>
                        <FaBoxOpen className="text-xs" />
                        <span>{variant.bulkPack.kitsPerPack} Kits/pack • {variant.bulkPack.packDiscountPercent}% Extra</span>
                      </p>
                      <p className={`text-xs ${variantTierConfig.text} mt-1`}>
                        Pay ₹{variant.bulkPack.pricePerKitAfterDiscount?.toLocaleString("en-IN")}/kit
                      </p>
                    </div>
                  )}

                  {/* Benefits */}
                  {variant.tierBenefits && variant.tierBenefits.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-text-primary mb-2">Benefits:</div>
                      <ul className="space-y-1">
                        {variant.tierBenefits.map((benefit, i) => (
                          <li key={i} className="text-xs flex items-start gap-1">
                            <FaCheck className="text-success text-xs mt-0.5 flex-shrink-0" />
                            <span className="truncate">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Delivery */}
                  {variant.includedDeliveryCharge > 0 && (
                    <div className="text-xs flex items-center gap-1 text-success mt-2">
                      <FaTruck />
                      Free Delivery (₹{variant.includedDeliveryCharge.toLocaleString("en-IN")} saved/pack)
                    </div>
                  )}

                  {/* Stock Status */}
                  <div className="text-sm mt-2">
                    {variant.inStock ? (
                      <span className="text-success flex items-center gap-1">
                        <FaCheck className="text-xs" /> In Stock
                      </span>
                    ) : (
                      <span className="text-red-500">Out of Stock</span>
                    )}
                  </div>

                  {isInCart && index !== selectedVariant && (
                    <div className="text-xs text-primary mt-1">
                      Currently in cart
                    </div>
                  )}
                </div>

                {/* Select Button */}
                {index !== selectedVariant && variant.inStock && (
                  <Button
                    onClick={() => handleCompareVariantSelect(index)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                  >
                    {isInCart ? 'Switch to This Variant' : 'Select This Variant'}
                  </Button>
                )}
                {index === selectedVariant && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setShowVariantComparison(false)}
                  >
                    Currently Selected
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ), [kit, selectedVariant, getTierConfig, handleCompareVariantSelect, bulkCart]);

  // Component sections
  const componentSections = useMemo(() =>
    [
      {
        icon: <FaSolarPanel className="text-amber-500" />,
        title: "Panel",
        data: kit.panel,
        fields: ["brandName", "technologyType", "wattPerPanel", "quantity", "efficiencyPercent", "warrantyYears"],
        imageField: "panelImage"
      },
      {
        icon: <FaBolt className="text-blue-600" />,
        title: "Inverter",
        data: kit.inverter,
        fields: ["brandName", "type", "category", "capacityKW", "efficiencyPercent", "warrantyYears", "quantity"],
        imageField: "inverterImage"
      },
      kit.battery?.brandName ?
        {
          icon: <FaBatteryFull className="text-green-600" />,
          title: "Battery",
          data: kit.battery,
          fields: ["brandName", "type", "capacityKWh", "cycles", "warrantyYears"],
          imageField: "batteryImage"
        } : null,
      {
        icon: <FaCogs className="text-purple-600" />,
        title: "BOS Kit",
        data: kit.BOSKit,
        fields: ["brandName"],
        imageField: "BOSKitImage"
      }
    ].filter(Boolean),
    [kit]
  );

  // Field label configuration
  const getFieldConfig = useCallback((field) => {
    const configs = {
      wattPerPanel: { label: "Watt per Panel", unit: "W" },
      capacityKW: { label: "Capacity", unit: "kW" },
      capacityKWh: { label: "Battery Capacity", unit: "kWh" },
      efficiencyPercent: { label: "Efficiency", unit: "%" },
      installationAngle: { label: "Angle", unit: "" },
      windResistanceKmph: { label: "Wind Resistance", unit: "km/h" },
      warrantyYears: { label: "Warranty", unit: "yrs" },
      cycles: { label: "Cycles", unit: "" },
      brandName: { label: "Brand", unit: "" },
      type: { label: "Type", unit: "" },
      technologyType: { label: "Technology", unit: "" },
      category: { label: "Category", unit: "" },
      quantity: { label: "Quantity", unit: "" }
    };
    return configs[field] || { label: field, unit: "" };
  }, []);

  if (!kit) return null;

  return (
    <div className="bg-surface rounded-2xl shadow-md p-6 border border-border max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-border pb-5">
        <div className="flex-1">
          {kit.variants && kit.variants.length > 0 ? (
            <div className={`inline-flex items-center gap-3 p-3 rounded-2xl border ${tierConfig.border} bg-gradient-to-tr ${tierConfig.gradient} shadow-xs`}
              style={currentVariant?.tierColor ? {
                borderColor: `${currentVariant.tierColor}30`,
                background: `linear-gradient(135deg, ${currentVariant.tierColor}05, ${currentVariant.tierColor}15)`
              } : undefined}
            >
              <div className="p-2.5 rounded-xl bg-surface shadow-xs">
                {tierConfig.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-black text-base ${tierConfig.text}`}
                    style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}
                  >{kit.brand} • {tierConfig.label}</span>
                  <span className="text-[10px] font-bold text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                    {currentVariant?.productTier}
                  </span>
                </div>
                <p className="text-xs text-text-secondary font-medium mt-0.5 max-w-md leading-tight">{currentVariant?.tierBenefits?.[0] || tierConfig.description}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-surface-hover shadow-xs">
              <div className="p-2.5 rounded-xl bg-surface shadow-xs text-text-muted">
                <FaHome />
              </div>
              <div>
                <span className="font-black text-base text-text-primary">{kit.brand}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold rounded-full shadow-xs ${!kit?.usageTypeColor ? usageTypeClass : ""}`}
            style={kit?.usageTypeColor ? {
              backgroundColor: `${kit.usageTypeColor}15`,
              color: kit.usageTypeColor,
              borderColor: `${kit.usageTypeColor}35`
            } : undefined}
          >
            {kit?.usageTypeImage && (
              <img
                src={kit.usageTypeImage.startsWith("http") ? kit.usageTypeImage : `http://localhost:5000${kit.usageTypeImage}`}
                alt=""
                className="w-5 h-5 object-contain rounded-full shrink-0"
              />
            )}
            <span>{kit?.usageType}</span>
          </span>
          {!currentVariant?.inStock && (
            <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-red-50 text-red-600 border border-red-200 shadow-xs">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Variant Selector and Compare Button */}
      {kit.variants?.length > 1 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <button
              onClick={() => setShowVariants(!showVariants)}
              className="flex items-center justify-between gap-2 px-4 py-2.5 bg-surface-hover hover:bg-surface-hover/80 rounded-xl border border-border transition-colors w-full text-left"
            >
              <span className="flex items-center gap-2">
                {tierConfig.icon}
                <span className="font-semibold text-text-primary text-sm">Select Variant: </span>
                <span className="font-bold text-sm" style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>{currentVariant?.productTier}</span>
                <span className="text-primary font-extrabold text-sm ml-2" style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : { color: 'var(--color-primary)' }}>₹{formattedPrices.ourPrice}/kit</span>
              </span>
              {showVariants ? <FaChevronUp size={12} className="text-text-muted" /> : <FaChevronDown size={12} className="text-text-muted" />}
            </button>

            {showVariants && (
              <div className="absolute top-full left-0 mt-1.5 bg-surface rounded-xl border border-border shadow-xl z-20 min-w-[350px] overflow-hidden">
                {kit.variants.map((variant, index) => {
                  const variantTierConfig = getTierConfig(variant.productTier, variant.tierColor);
                  const isInCart = bulkCart.some(item =>
                    item.id === kit.id && item.variantIndex === index
                  );
                  const hasBulkPack = variant.bulkPack ? true : false;

                  return (
                    <button
                      key={index}
                      onClick={() => handleVariantChange(index)}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors ${index === selectedVariant ? 'bg-primary/[0.03]' : ''
                        } ${index !== kit.variants.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${variantTierConfig.gradient}`}
                          style={variant.tierColor ? { background: `${variant.tierColor}20` } : undefined}>
                          {variantTierConfig.icon}
                        </div>
                        <div className="text-left">
                          <span className="font-bold text-sm text-text-primary block" style={variant.tierColor ? { color: variant.tierColor } : undefined}>{variant.productTier}</span>
                          {variant.marketPrice > variant.ourPrice && (
                            <span className="text-[10px] text-text-muted font-semibold">
                              Save {Math.round(((variant.marketPrice - variant.ourPrice) / variant.marketPrice) * 100)}%
                            </span>
                          )}
                          {hasBulkPack && (
                            <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block font-semibold">
                              {variant.bulkPack.kitsPerPack}/pack
                              {variant.bulkPack.packDiscountPercent > 0 && ` • ${variant.bulkPack.packDiscountPercent}% extra`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-sm text-primary block">₹{(variant.bulkPack?.pricePerKitAfterDiscount ? variant.bulkPack.pricePerKitAfterDiscount : variant.ourPrice)?.toLocaleString("en-IN")}/kit</span>
                        <span className="text-[10px] text-text-muted line-through font-medium">₹{variant.marketPrice?.toLocaleString("en-IN")}</span>
                        {isInCart && (
                          <span className="text-[10px] text-success block mt-1 font-bold">In Cart</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            onClick={() => setShowVariantComparison(true)}
            variant="outline"
            size="md"
            className="sm:w-auto rounded-xl border-border text-text-primary dark:text-info font-bold hover:bg-surface-hover"
            leftIcon={<FaBalanceScale />}
          >
            Compare Variants
          </Button>
        </div>
      )}

      {/* Variant Comparison Dialog */}
      <Dialog
        isOpen={showVariantComparison}
        onClose={() => setShowVariantComparison(false)}
        title={`Compare Variants - ${kit.kitName}`}
        size="lg"
      >
        <VariantComparisonContent />
      </Dialog>

      {/* Kit Image */}
      {kit.kitImage && (
        <div className="mb-6 flex justify-center items-center bg-gradient-to-tr from-gray-50/50 to-slate-100/50 rounded-2xl p-4 border border-border/80 w-full h-56">
          <img
            src={kit.kitImage}
            alt={kit.kitName}
            className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      {/* Kit Name */}
      <h2 className="text-2xl font-black text-text-primary text-center mb-6 tracking-tight">
        {kit.kitName}
      </h2>

      {/* Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-surface-hover/60 border border-border p-4 rounded-2xl flex items-center border-l-4 border-l-primary">
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed font-medium">{kit.description}</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          <div className="flex items-center gap-3 p-3 bg-surface-hover/60 border border-border rounded-xl">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><FaBolt size={14} /></div>
            <div>
              <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Capacity</div>
              <div className="text-sm font-black text-text-primary">{kit.capacityKW} kW</div>
            </div>
          </div>
          {kit.warrantyYears && (
            <div className="flex items-center gap-3 p-3 bg-surface-hover/60 border border-border rounded-xl">
              <div className="p-2 rounded-lg bg-success/10 text-success font-semibold"><FaCheck size={14} /></div>
              <div>
                <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Warranty</div>
                <div className="text-sm font-black text-text-primary">{kit.warrantyYears} Years</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Pack Info */}
      {currentVariant?.bulkPack && (
        <div className="mb-6 flex justify-center">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl py-3 px-5 shadow-xs flex items-center gap-2">
            <FaBoxOpen className="text-primary text-base" />
            <span className="text-sm font-bold text-primary">
              {currentVariant.bulkPack.kitsPerPack} Kits per pack • {bulkPackDiscountPercentage}% Additional Pack Savings
            </span>
          </div>
        </div>
      )}

      {/* Tier Benefits */}
      {currentVariant?.tierBenefits && currentVariant.tierBenefits.length > 0 && (
        <div
          className={`mb-6 border ${tierConfig.border} ${tierConfig.bg}/30 rounded-2xl p-5 shadow-xs`}
          style={currentVariant?.tierColor ? {
            borderColor: `${currentVariant.tierColor}40`,
            backgroundColor: `${currentVariant.tierColor}06`
          } : undefined}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className={`p-2 rounded-lg bg-surface shadow-xs border ${tierConfig.border}`}
              style={currentVariant?.tierColor ? { borderColor: `${currentVariant.tierColor}40` } : undefined}
            >{tierConfig.icon}</span>
            <h4
              className="text-base font-black text-text-primary"
              style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}
            >{tierConfig.label} Tier Perks & Benefits</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentVariant.tierBenefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 bg-surface p-3 rounded-xl border border-border shadow-xs hover:shadow-sm transition-all duration-200">
                <div
                  className={`p-1 rounded-full ${tierConfig.bg} border ${tierConfig.border}`}
                  style={currentVariant?.tierColor ? {
                    backgroundColor: `${currentVariant.tierColor}15`,
                    borderColor: `${currentVariant.tierColor}40`
                  } : undefined}
                >
                  <FaCheck
                    className={`text-[10px] ${tierConfig.text}`}
                    style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}
                  />
                </div>
                <span className="text-xs font-semibold text-text-primary">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Section */}
      <div className="mb-6 bg-gradient-to-r from-surface-hover via-surface/40 to-surface-hover/30 rounded-2xl p-5 border border-border shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* Price Display */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <div className="space-y-3">
              {individualDiscountPercentage > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Market Price</span>
                  <span className="text-sm text-text-muted line-through font-medium">
                    ₹{formattedPrices.marketPrice}
                  </span>
                  <span className="bg-success/10 text-success font-semibold border border-success/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {individualDiscountPercentage}% Off
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Bulk Price</span>
                <div className="flex items-center text-primary">
                  <FaRupeeSign className="text-xl mr-0.5" />
                  <span className="text-3xl font-black tracking-tight">
                    {formattedPrices.ourPrice}
                  </span>
                </div>
                {totalDiscountPercentage > 0 && (
                  <span className="bg-emerald-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-xs">
                    Save {totalDiscountPercentage}%
                  </span>
                )}
              </div>

              {effectivePrices.isBulkPrice && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                  <FaTag className="text-primary text-[10px]" />
                  <span>
                    Regular Price: <span className="font-extrabold text-text-primary">₹{formattedPrices.regularPrice}/kit</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Per Pack Info */}
          <div className="bg-surface rounded-xl p-4 border border-border shadow-xs flex flex-col justify-between">
            <h4 className="font-bold text-text-primary mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <FaBoxOpen className="text-primary text-[10px]" />
              Per Pack Detail
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-border">
                <span className="text-text-muted font-medium">Solar Kits:</span>
                <span className="font-black text-text-primary">{currentVariant?.bulkPack?.kitsPerPack || 1}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-border">
                <span className="text-text-muted font-medium">Price:</span>
                <span className="font-black text-primary">₹{formattedPrices.totalPackPrice || formattedPrices.ourPrice}</span>
              </div>
              <div className="flex justify-between items-center text-success font-semibold">
                <span className="flex items-center gap-1">
                  <FaPiggyBank size={10} />
                  Pack Savings:
                </span>
                <span className="font-extrabold">Saved ₹{(effectivePrices.bulkPack?.totalSavingsPerPack || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Breakdown */}
        <div className="mt-5 pt-4 border-t border-border">
          <h4 className="font-bold text-text-primary mb-3 text-xs uppercase tracking-wider">Savings Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-surface border border-success/20 rounded-xl p-3 text-center shadow-xs">
              <FaTag className="text-emerald-500 mx-auto mb-1" size={14} />
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Kit Saving</span>
              <div className="font-black text-success text-sm mt-0.5">{individualDiscountPercentage}%</div>
            </div>

            {currentVariant?.bulkPack && (
              <div className="bg-surface border border-primary/10 rounded-xl p-3 text-center shadow-xs">
                <FaBoxOpen className="text-primary mx-auto mb-1" size={14} />
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Bulk Extra</span>
                <div className="font-black text-primary text-sm mt-0.5">{bulkPackDiscountPercentage}%</div>
              </div>
            )}

            {currentVariant?.includedDeliveryCharge > 0 && (
              <div className="bg-surface border border-primary/20 rounded-xl p-3 text-center shadow-xs">
                <FaTruck className="text-blue-500 mx-auto mb-1" size={14} />
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Free Delivery</span>
                <div className="font-black text-blue-600 text-sm mt-0.5">₹{currentVariant.includedDeliveryCharge.toLocaleString("en-IN")}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Summary */}
      {bulkCartItem && cartCalculations.packs > 0 && (
        <div className="mb-6 bg-gradient-to-r from-primary/[0.02] via-emerald/[0.02] to-blue-50/10 rounded-2xl p-5 border border-primary/20 shadow-xs">
          <h3 className="text-base font-black text-text-primary mb-4 flex items-center gap-2">
            <FaShoppingCart className="text-primary dark:text-info text-sm" />
            Cart Summary
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Amounts */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-3 bg-surface border border-border rounded-xl text-xs">
                <span className="text-text-muted font-semibold">Market Total:</span>
                <span className="font-black text-text-primary line-through">₹{formattedCalculations.totalMarketPrice}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface border border-border rounded-xl text-xs">
                <span className="text-text-muted font-semibold">Regular Total:</span>
                <span className="font-black text-text-primary">₹{formattedCalculations.totalRegularPrice}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/[0.03] border border-primary/20 rounded-xl text-xs">
                <span className="font-bold text-primary dark:text-info">Bulk Total:</span>
                <span className="text-base font-black text-primary dark:text-info flex items-center">
                  <FaRupeeSign className="text-xs mr-0.5" />
                  {formattedCalculations.totalAmount}
                </span>
              </div>
            </div>

            {/* Savings */}
            {cartCalculations.totalSavings > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 mb-3">
                  <FaPiggyBank className="text-emerald-500 text-sm" />
                  <span className="font-bold text-emerald-500 text-xs uppercase tracking-wider">Total Savings</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted font-medium">Kit Discount:</span>
                    <span className="font-black text-success">₹{formattedCalculations.totalIndividualSavings}</span>
                  </div>
                  {cartCalculations.totalBulkSavings > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted font-medium">Bulk Extra:</span>
                      <span className="font-black text-primary">₹{formattedCalculations.totalBulkSavings}</span>
                    </div>
                  )}
                  {cartCalculations.totalDeliverySavings > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted font-medium">Free Delivery:</span>
                      <span className="font-black text-blue-600">₹{formattedCalculations.totalDeliverySavings}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-success">Total Saved:</span>
                      <span className="font-black text-success text-sm">₹{formattedCalculations.totalSavings}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Kit Calculation */}
          <div className="mt-4 bg-surface/80 rounded-xl p-3 text-center border border-border text-xs">
            <p className="font-bold text-text-primary">
              {cartCalculations.packs} {cartCalculations.packs === 1 ? 'pack' : 'packs'} × {cartCalculations.kitsPerPack} kits = {cartCalculations.totalKits} kits in Cart
            </p>
            {cartCalculations.perPackSavings > 0 && (
              <p className="text-success font-bold mt-1">
                Save ₹{formattedCalculations.perPackSavings}/pack
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cart Controls */}
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5">
        <div className="w-full">
          {hasOrderQuantities ? (
            /* Order Quantity Chips Mode */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-text-secondary uppercase tracking-wider">
                  Available Order Quantity (Kits)
                </span>
                {bulkCartItem && (
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                    Selected: {bulkCartItem.qty} Kits
                  </span>
                )}
              </div>

              {!bulkCartItem ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {orderQuantities.map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setSelectedOrderQty(qty)}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all duration-150 cursor-pointer
                          ${selectedOrderQty === qty
                            ? 'bg-primary text-white border-primary shadow-md scale-105'
                            : 'bg-surface border-border text-text-secondary hover:border-primary/50 hover:text-primary'
                          }`}
                      >
                        {qty} Kits
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleAddToBulkCart}
                    variant="primary"
                    size="lg"
                    className="w-full rounded-xl py-3 font-black bg-gradient-to-r from-primary to-primary-end shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-98 mt-2"
                    leftIcon={<FaShoppingCart />}
                  >
                    Order {selectedOrderQty || orderQuantities[0]} Kits
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {orderQuantities.map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => {
                          dispatch(addToBulkCart({ id: kit.id, variantIndex: selectedVariant, qty, replace: true }));
                          setSelectedOrderQty(qty);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all duration-150 cursor-pointer
                          ${bulkCartItem.qty === qty
                            ? 'bg-primary text-white border-primary shadow-md scale-105'
                            : 'bg-surface border-border text-text-secondary hover:border-primary/50 hover:text-primary'
                          }`}
                      >
                        {qty} Kits
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={() => dispatch(removeFromBulkCart(cartItemId))}
                    variant="outline"
                    size="md"
                    className="w-full rounded-xl py-2.5 font-bold text-rose-600 border-rose-200 hover:bg-rose-50 transition-colors"
                  >
                    Remove from Order
                  </Button>
                </div>
              )}
            </div>
          ) : !bulkCartItem ? (
            <Button
              onClick={handleAddToBulkCart}
              variant="primary"
              size="lg"
              className="w-full rounded-xl py-3 font-black bg-gradient-to-r from-primary to-primary-end shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-98"
              leftIcon={<FaShoppingCart />}
            >
              Order Request
            </Button>
          ) : (
            <div className="flex justify-between items-center bg-gradient-to-r from-primary to-primary-end rounded-xl py-1 px-1.5 shadow-md">
              <IconButton
                onClick={handleDecreaseBulkQty}
                variant="ghost"
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/25 w-8 h-8 rounded-lg shadow-xs"
              >
                <FaMinus className="text-[10px]" />
              </IconButton>

              <span className="text-sm font-black text-white px-2">
                {bulkCartItem.qty} {bulkCartItem.qty === 1 ? 'Pack' : 'Packs'} in Cart
              </span>

              <IconButton
                onClick={handleIncreaseBulkQty}
                variant="ghost"
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/25 w-8 h-8 rounded-lg shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isMaxPacksReached}
              >
                <FaPlus className="text-[10px]" />
              </IconButton>
            </div>
          )}
        </div>
      </div>

      {/* Components Sections */}
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
          <FaCogs className="text-primary text-sm" />
          Components
        </h3>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 cursor-grab scrollbar-hover"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          style={{ cursor: isScrolling ? "grabbing" : "grab" }}
        >
          {componentSections.map((section, idx) => (
            <div key={idx} className={cardBaseClasses}>
              <h4 className="font-semibold flex items-center justify-between mb-3 text-text-primary text-base border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-surface-hover">{section.icon}</span>
                  {section.title}
                </div>
                {section.title === "BOS Kit" && section.data?.components && (
                  <button
                    onClick={() => setShowBosPopup(true)}
                    className="text-primary dark:text-info hover:text-primary-dark dark:hover:text-info/80 transition-colors p-1 rounded-full hover:bg-surface-hover"
                    title="View Components Details"
                  >
                    <FaInfoCircle size={16} />
                  </button>
                )}
              </h4>

              {section.data && (
                <div className="mb-3 bg-surface-hover rounded-lg p-2 flex items-center justify-center min-h-[96px]">
                  <ImageWithPlaceholder
                    src={
                      (section.imageField && section.data[section.imageField]) ||
                      section.data.image ||
                      section.data.panelImage ||
                      section.data.inverterImage ||
                      section.data.BOSKitImage ||
                      section.data.imageUrl
                    }
                    alt={section.title}
                  />
                </div>
              )}

              <div className="space-y-1">
                {section.fields.map((field, i) => {
                  const value = section.data?.[field];
                  if (value == null) return null;

                  const { label, unit } = getFieldConfig(field);

                  return (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-ring last:border-b-0 text-xs">
                      <span className="text-text-secondary">{label}</span>
                      <span className="font-medium text-text-primary">
                        {value}
                        {unit && <span className="text-text-secondary text-xs ml-0.5">{unit}</span>}
                      </span>
                    </div>
                  );
                })}

                {/* Render dynamic attributes */}
                {section.data?.attributes && Array.isArray(section.data.attributes) && section.data.attributes.map((attr, i) => {
                  // Skip duplicates of system default hardcoded fields
                  const alreadyShown = section.fields.some(f => {
                    const cfg = getFieldConfig(f);
                    return cfg.label?.toLowerCase() === attr.name?.toLowerCase();
                  });
                  if (alreadyShown || attr.value == null || attr.value === "") return null;

                  return (
                    <div key={`attr-${i}`} className="flex justify-between items-center py-1 border-b border-ring last:border-b-0 text-xs">
                      <span className="text-text-secondary">{attr.name}</span>
                      <span className="font-medium text-text-primary">{attr.value}</span>
                    </div>
                  );
                })}
              </div>

              {section.title === "BOS Kit" && section.data?.components && (
                <div className="mt-3 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-text-primary mb-2">BOS Components:</p>
                  <ul className="space-y-1">
                    {section.data.components.map((comp, i) => (
                      <li
                        key={i}
                        onClick={() => {
                          setSelectedBosComp(comp);
                          setShowBosPopup(true);
                        }}
                        className="text-xs text-text-primary flex items-start gap-1 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary dark:hover:text-info dark:hover:text-info p-1.5 rounded-lg border border-transparent hover:border-primary/10 transition-all duration-200 group"
                      >
                        <FaCheck className="text-success text-xs mt-0.5 flex-shrink-0 group-hover:text-primary dark:hover:text-info dark:group-hover:text-info transition-colors" />
                        <span className="truncate font-medium underline decoration-dashed decoration-1 group-hover:decoration-solid">{comp.name}</span>
                        <span className="text-[10px] text-text-secondary ml-auto bg-surface-hover px-1.5 py-0.5 rounded-md font-semibold group-hover:bg-primary/10 dark:group-hover:bg-primary/20 group-hover:text-primary dark:group-hover:text-info dark:hover:text-info dark:group-hover:text-info transition-colors">
                          x{comp.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BOS Kit Components Details Dialog */}
      <Dialog
        isOpen={showBosPopup}
        onClose={() => {
          setShowBosPopup(false);
          setSelectedBosComp(null);
        }}
        title={selectedBosComp ? "Component Product Details" : "BOS Kit Included Components"}
        size="md"
      >
        {selectedBosComp ? (
          <div className="space-y-4">
            {/* Back Button */}
            <button
              onClick={() => setSelectedBosComp(null)}
              className="flex items-center gap-1 text-xs text-primary dark:text-info font-semibold hover:underline mb-2"
            >
              &larr; Back to Components List
            </button>

            {/* Product Type Card */}
            <div className="bg-surface rounded-2xl overflow-hidden border border-border shadow-sm p-4 space-y-4">
              <div className="flex gap-4 items-start pb-4 border-b border-border">
                <div className="w-24 h-24 rounded-xl bg-surface-hover flex items-center justify-center border border-border flex-shrink-0 p-2">
                  <ImageWithPlaceholder
                    src={selectedBosComp.image || ""}
                    alt={selectedBosComp.name}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary dark:text-info bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                    BOS Component
                  </span>
                  <h3 className="font-bold text-text-primary text-base mt-1 line-clamp-2">
                    {selectedBosComp.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedBosComp.skuCode && (
                      <span className="text-[10px] bg-surface-hover text-text-secondary px-2 py-0.5 rounded-md font-mono">
                        SKU: {selectedBosComp.skuCode}
                      </span>
                    )}
                    <span className="text-[10px] bg-success/10 text-success font-semibold px-2 py-0.5 rounded-md font-medium">
                      Quantity: {selectedBosComp.quantity}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Technical Attributes
                </h4>
                {selectedBosComp.attributes && selectedBosComp.attributes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedBosComp.attributes.map((attr, attrIdx) => {
                      const attrName = attr.name || attr.attribute_name || "Attribute";
                      const attrVal = attr.value ?? attr.option_value ?? attr.value_text ?? attr.value_number ?? "";
                      if (!attrVal) return null;
                      return (
                        <div key={attrIdx} className="bg-surface-hover rounded-xl p-2.5 border border-border flex flex-col justify-center">
                          <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">{attrName}</span>
                          <span className="text-xs text-text-primary font-bold mt-0.5 break-words">{String(attrVal)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-text-secondary bg-surface-hover rounded-xl p-4 text-center border border-dashed border-border">
                    No technical attributes configured for this component.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {kit.BOSKit?.components?.map((comp, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedBosComp(comp)}
                className="bg-surface-hover hover:bg-primary/5 dark:hover:bg-primary/10 hover:border-primary/25 dark:hover:border-info/25 cursor-pointer rounded-xl p-3 border border-border transition-all duration-200 flex justify-between items-start group"
              >
                <div>
                  <h4 className="font-semibold text-text-primary text-sm group-hover:text-primary dark:hover:text-info dark:group-hover:text-info transition-colors underline decoration-dashed decoration-1 group-hover:decoration-solid">
                    {comp.name}
                  </h4>
                  {comp.skuCode && (
                    <span className="text-[10px] bg-surface text-text-secondary px-1.5 py-0.5 rounded-md font-mono mt-1 inline-block">
                      {comp.skuCode}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-secondary block">Qty</span>
                  <span className="font-bold text-primary dark:text-info text-sm">x{comp.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
});

SelectedBulkKitCard.displayName = "SelectedBulkKitCard";

export default SelectedBulkKitCard;