import { memo, useCallback, useMemo, useState, useEffect } from"react";
import {
  FaPlus, FaMinus, FaBoxOpen,  FaCheck,
  FaShoppingCart, FaStar, FaGem, FaHome, FaBolt,
  FaInfoCircle, FaTruck, FaPiggyBank, FaAward,
   FaClock, FaLeaf, FaChevronDown, FaChevronUp
} from"react-icons/fa";
import { useDispatch, useSelector } from"react-redux";
import Button from "@/Components/Button";
import IconButton from "@/Components/IconButton";
import {
  addToBulkCart,
  decreaseBulkQty,
  increaseBulkQty,
  removeFromBulkCart,
} from"@/features/slice";

const BulkKitCard = memo(({ kit, selected, setSelected, viewMode ="grid", compact = false }) => {
  const dispatch = useDispatch();
  const bulkCart = useSelector((state) => state.slice.bulkCart);
  const [selectedVariant, setSelectedVariant] = useState(0);

  useEffect(() => {
    if (kit.variants) {
      const cartIndex = kit.variants.findIndex((v, idx) => 
        bulkCart.some(item => item.id === kit.id && item.variantIndex === idx)
      );
      if (cartIndex >= 0) {
        setSelectedVariant(cartIndex);
      }
    }
  }, [kit.id]);

  const [showVariants, setShowVariants] = useState(false);
  // Track selected order quantity when kit has order_quantities configured
  const [selectedOrderQty, setSelectedOrderQty] = useState(null);

  const currentVariant = kit.variants?.[selectedVariant] || kit.variants?.[0];
  const cartItemId =`${kit.id}-${selectedVariant}`;
  const bulkCartItem = bulkCart.find((item) => item.cartItemId === cartItemId);

  // Order quantities from kit configuration
  const orderQuantities = useMemo(() => {
    const rawQtys = kit.orderQuantities || kit.order_quantities || [];
    return Array.isArray(rawQtys) ? rawQtys.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b) : [];
  }, [kit.orderQuantities, kit.order_quantities]);

  const hasOrderQuantities = orderQuantities.length > 0;

  // Initialize selectedOrderQty with first quantity when orderQuantities available
  useMemo(() => {
    if (hasOrderQuantities && !selectedOrderQty) {
      setSelectedOrderQty(orderQuantities[0]);
    }
  }, [hasOrderQuantities, orderQuantities]);

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

  // Memoize the type class function for usageType
  const getUsageTypeClass = useCallback(() => {
    return"bg-primary/5 dark:bg-primary/10 dark:bg-primary/15 text-primary dark:text-info border border-primary/15 dark:border-info/20";
  }, []);

  // Memoize tier styling and icon
  const getTierConfig = useCallback((tier, color) => {
    const tierLabel = tier ||"Standard Upgrade";
    const hasCustomColor = !!color;
    return {
      text: hasCustomColor ?"" :"text-primary dark:text-info",
      border: hasCustomColor ?"" :"border-primary/15 dark:border-info/20",
      icon: <FaAward className={hasCustomColor ?"" :"text-primary dark:text-info"} style={hasCustomColor ? { color } : undefined} />,
      label: tierLabel,
      bg: hasCustomColor ?"" :"bg-primary/5 dark:bg-primary/10",
      badgeBg: hasCustomColor ?"" :"bg-primary/5 dark:bg-primary/10",
      badgeText: hasCustomColor ?"" :"text-primary dark:text-info",
      accent:"primary",
      gradient:"from-primary to-primary",
      customColor: color || null
    };
  }, []);

  const isSelected = useMemo(() => selected === cartItemId, [selected, cartItemId]);

  const usageTypeClass = useMemo(() =>
    getUsageTypeClass(kit.usageType),
    [getUsageTypeClass, kit.usageType]
  );

  const tierConfig = useMemo(() =>
    getTierConfig(currentVariant?.productTier, currentVariant?.tierColor),
    [getTierConfig, currentVariant?.productTier, currentVariant?.tierColor]
  );

  // Memoize event handlers
  const handleSelect = useCallback(() => {
    setSelected(isSelected ? null : cartItemId);
  }, [isSelected, cartItemId, setSelected]);

  const handleKeyPress = useCallback((e) => {
    if (e.key ==="Enter" || e.key ==="") {
      e.preventDefault();
      handleSelect();
    }
  }, [handleSelect]);

  const handleAddToBulkCart = useCallback((e) => {
    e.stopPropagation();
    dispatch(addToBulkCart({ id: kit.id, variantIndex: selectedVariant, qty: hasOrderQuantities ? (selectedOrderQty || orderQuantities[0] || 1) : 1 }));
  }, [dispatch, kit.id, selectedVariant, hasOrderQuantities, selectedOrderQty, orderQuantities]);

  const handleDecreaseBulkQty = useCallback((e) => {
    e.stopPropagation();
    if (hasOrderQuantities) {
      // Step to previous quantity tier
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
  }, [dispatch, cartItemId, bulkCartItem?.qty, hasOrderQuantities, orderQuantities, kit.id, selectedVariant]);

  const handleIncreaseBulkQty = useCallback((e) => {
    e.stopPropagation();
    if (hasOrderQuantities) {
      // Step to next quantity tier
      const currentQty = bulkCartItem?.qty || 0;
      const nextQty = orderQuantities.find(q => q > currentQty);
      if (nextQty) {
        dispatch(addToBulkCart({ id: kit.id, variantIndex: selectedVariant, qty: nextQty, replace: true }));
      }
    } else {
      dispatch(increaseBulkQty(cartItemId));
    }
  }, [dispatch, cartItemId, hasOrderQuantities, orderQuantities, kit.id, selectedVariant, bulkCartItem?.qty]);

  const handleVariantChange = useCallback((index) => {
    setSelectedVariant(index);
    setShowVariants(false);
  }, []);

  // Get the correct price based on bulk pack (now from variant)
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

  // Memoize formatted prices
  const formattedPrices = useMemo(() => {
    const ourPriceNum = Number(effectivePrices.ourPrice || kit?.ourPrice || kit?.selling_price_inr || 0);
    const marketPriceNum = Number(effectivePrices.marketPrice || kit?.marketPrice || (ourPriceNum > 0 ? Math.round(ourPriceNum * 1.15) : 0));
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

    return {
      marketPrice: marketPriceNum > 0 ? marketPriceNum.toLocaleString("en-IN") : "",
      ourPrice: ourPriceNum > 0 ? ourPriceNum.toLocaleString("en-IN") : "0",
      regularPrice: effectivePrices.regularPrice ? effectivePrices.regularPrice.toLocaleString("en-IN") : "",
      totalPackPrice: effectivePrices.bulkPack?.totalPackPrice?.toLocaleString("en-IN") || "",
      gstIncluded: gstIncludedAmount > 0 ? gstIncludedAmount.toLocaleString("en-IN") : "0",
      gstRate: !isNaN(gstRate) ? gstRate : 13.8
    };
  }, [effectivePrices, currentVariant?.gstRate, kit]);

  // Calculate discount percentages — use backend-precomputed values where available
  // Total discount from showcase (MRP) to our bulk price
  const totalDiscountPercentage = useMemo(() => {
    // Backend now computes packDiscountPercent vs showcase price
    if (effectivePrices.bulkPack?.packDiscountPercent !== undefined && effectivePrices.bulkPack.packDiscountPercent > 0) {
      return effectivePrices.bulkPack.packDiscountPercent;
    }
    // Fallback: compute from prices
    if (!effectivePrices.marketPrice || !effectivePrices.ourPrice) return 0;
    return Math.round(((effectivePrices.marketPrice - effectivePrices.ourPrice) / effectivePrices.marketPrice) * 100);
  }, [effectivePrices]);

  // Bulk pack discount percentage vs showcase price (already precomputed in backend per tier)
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
        totalDeliverySavings: 0,
        totalBulkSavings: 0,
        savingsPerPack: 0
      };
    }

    const packs = bulkCartItem.qty;
    const kitsPerPack = currentVariant.bulkPack?.kitsPerPack || 1;
    const totalKits = packs * kitsPerPack;

    const totalMarketPrice = totalKits * currentVariant.marketPrice;
    const totalOurPrice = totalKits * effectivePrices.ourPrice;
    const totalBulkSavings = totalMarketPrice - totalOurPrice;
    const totalDeliverySavings = (currentVariant.includedDeliveryCharge || 0) * packs;
    const totalSavings = totalBulkSavings + totalDeliverySavings;
    const savingsPerPack = (currentVariant.marketPrice * kitsPerPack) - (effectivePrices.ourPrice * kitsPerPack) + (currentVariant.includedDeliveryCharge || 0);

    return {
      totalSavings,
      totalAmount: totalOurPrice,
      totalKits,
      packs,
      kitsPerPack,
      totalMarketPrice,
      totalDeliverySavings,
      totalBulkSavings,
      savingsPerPack
    };
  }, [bulkCartItem, kit, currentVariant, effectivePrices.ourPrice]);

  const formattedCalculations = useMemo(() => ({
    totalSavings: cartCalculations.totalSavings.toLocaleString("en-IN"),
    totalAmount: cartCalculations.totalAmount.toLocaleString("en-IN"),
    totalMarketPrice: cartCalculations.totalMarketPrice.toLocaleString("en-IN"),
    totalDeliverySavings: cartCalculations.totalDeliverySavings.toLocaleString("en-IN"),
    totalBulkSavings: cartCalculations.totalBulkSavings.toLocaleString("en-IN"),
    savingsPerPack: cartCalculations.savingsPerPack.toLocaleString("en-IN"),
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
        {kit.variants && kit.variants.length > 0 ? (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200 group-hover:scale-105 ${!currentVariant?.tierColor ?`${tierConfig.border} ${tierConfig.bg}` :""}`}
            style={currentVariant?.tierColor ? {
              backgroundColor:`${currentVariant.tierColor}15`,
              color: currentVariant.tierColor,
              borderColor:`${currentVariant.tierColor}35`
            } : undefined}
          >
            <span className={!currentVariant?.tierColor ? tierConfig.text :""} style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>
              {tierConfig.icon}
            </span>
            <span className={!currentVariant?.tierColor ? tierConfig.text :""} style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>
              {kit.brand} • {currentVariant?.productTier}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-border bg-surface-hover text-text-primary">
            <span>{kit.brand}</span>
          </div>
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
              src={kit.usageTypeImage.startsWith("http") ? kit.usageTypeImage :`http://localhost:5000${kit.usageTypeImage}`}
              alt=""
              className="w-5 h-5 object-contain rounded-full shrink-0"
            />
          )}
          <span>{kit.usageType}</span>
        </span>
      </div>

      {/* Image container with gradient and hover zoom */}
      <div className={`relative mb-4 flex justify-center items-center bg-gradient-to-tr from-gray-50/50 to-slate-100/50 rounded-xl overflow-hidden border border-border w-full ${compact ? 'h-36' : 'h-64'}`}>
        <img
          src={kit?.kitImage}
          alt={kit?.kitName}
          className="w-full h-full p-2 object-contain transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Decorative background circle */}
        <div className="absolute -z-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      </div>

      {/* Text Details */}
      <div className="flex-1 flex flex-col">
        <h3 className={`font-bold text-text-primary mb-1.5 line-clamp-1 leading-tight group-hover:text-primary dark:group-hover:text-info transition-colors ${compact ? 'text-base' : 'text-lg'}`}>
          {kit?.kitName}
        </h3>
        <p className="text-text-secondary text-xs line-clamp-2 leading-relaxed mb-4">
          {kit?.description}
        </p>

        {/* Dynamic Capacity & Pack Size Badge Row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-primary/5 dark:bg-primary/10 dark:bg-primary/15 text-primary dark:text-info border border-primary/10 dark:border-info/10 text-xs font-bold px-2.5 py-1 rounded-lg">
            <FaBolt className="text-[10px]" />
            <span>{kit.capacityKW} kW</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/5 dark:bg-primary/10 dark:bg-primary/15 text-primary dark:text-info border border-primary/10 dark:border-info/10 text-xs font-bold px-2.5 py-1 rounded-lg">
            <FaBoxOpen className="text-[10px]" />
            <span>{currentVariant?.bulkPack?.kitsPerPack || 1}/pack</span>
          </div>
        </div>

        {/* Variant Selector Dropdown */}
        {kit.variants?.length > 1 && (
          <div className="relative mb-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowVariants(!showVariants)}
              className="w-full flex items-center justify-between px-3 py-2 bg-surface-hover hover:bg-surface-hover/80 rounded-xl border border-border text-xs font-semibold text-text-primary transition-colors"
            >
              <span className="flex items-center gap-2">
                {tierConfig.icon}
                <span style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>{currentVariant?.productTier} Tier</span>
                {currentVariant?.bulkPack && (
                  <span
                    className="text-[9px] bg-primary/10 dark:bg-primary/15 text-primary dark:text-info px-1.5 py-0.5 rounded-full font-bold"
                    style={currentVariant?.tierColor ? {
                      backgroundColor: `${currentVariant.tierColor}15`,
                      color: currentVariant.tierColor
                    } : undefined}
                  >
                    Bulk Pack
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1 text-text-secondary font-normal">
                <span className="font-bold" style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : { color: 'var(--color-primary)' }}>₹{formattedPrices.ourPrice}/kit</span>
                {showVariants ? <FaChevronUp size={10} className="ml-1" /> : <FaChevronDown size={10} className="ml-1" />}
              </span>
            </button>
            
            {showVariants && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-surface rounded-xl border border-border shadow-xl z-20 overflow-hidden divide-y divide-border animate-in fade-in slide-in-from-bottom-2 duration-200">
                {kit.variants.map((variant, index) => {
                  const variantTierConfig = getTierConfig(variant.productTier, variant.tierColor);
                  const hasBulk = variant.bulkPack ? true : false;
                  return (
                    <button
                      key={index}
                      onClick={() => handleVariantChange(index)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-hover text-xs transition-colors ${
                        index === selectedVariant ? 'bg-primary/[0.03] font-bold text-primary' : 'text-text-primary'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={variantTierConfig.text}>{variantTierConfig.icon}</span>
                        <span style={variant.tierColor ? { color: variant.tierColor } : undefined}>{variant.productTier}</span>
                        {hasBulk && (
                          <span
                            className="text-[9px] bg-primary/10 dark:bg-primary/15 text-primary dark:text-info px-1.5 py-0.5 rounded-full"
                            style={variant.tierColor ? {
                              backgroundColor: `${variant.tierColor}15`,
                      color: variant.tierColor
                            } : undefined}
                          >
                            Bulk
                          </span>
                        )}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-primary dark:text-info">
                          ₹{(variant.bulkPack?.pricePerKitAfterDiscount ? variant.bulkPack.pricePerKitAfterDiscount : variant.ourPrice)?.toLocaleString("en-IN")}/kit
                        </span>
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
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Bulk Price Per Kit</span>
            <div className="flex items-center gap-1">
              <span className="text-lg font-extrabold text-text-primary leading-none">₹{formattedPrices.ourPrice}</span>
              {totalDiscountPercentage > 0 && (
                <del className="text-xs text-text-muted font-semibold ml-1">₹{formattedPrices.marketPrice}</del>
              )}
            </div>
            {effectivePrices.isBulkPrice && (
              <span className="text-[10px] text-text-muted font-medium block mt-1">
                (Regular: ₹{formattedPrices.regularPrice}/kit)
              </span>
            )}
          </div>
          {totalDiscountPercentage > 0 && (
            <span className="bg-primary/5 dark:bg-primary/10 dark:bg-primary/15 text-primary dark:text-info text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/15 dark:border-info/20 shadow-2xs">
              Save {totalDiscountPercentage}%
            </span>
          )}
        </div>

        {/* Promo / Bulk Badge Badges */}
        <div className="space-y-2 mb-4">
          {currentVariant?.bulkPack && (
            <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 dark:bg-primary/15 text-primary dark:text-info rounded-xl px-3 py-2 border border-primary/10 dark:border-info/10 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <FaBoxOpen size={12} className="text-primary dark:text-info" />
                Bulk Combo Discount
              </span>
              <span>{bulkPackDiscountPercentage}% Extra Off</span>
            </div>
          )}
          
          {currentVariant?.includedDeliveryCharge > 0 && (
            <div className="flex items-center justify-between bg-blue-500/5 text-blue-700 rounded-xl px-3 py-2 border border-blue-500/10 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <FaTruck size={12} className="text-blue-500" />
                Free Shipping Included
              </span>
              <span>Save ₹{deliverySavings}</span>
            </div>
          )}
        </div>

        {/* Tier Benefits Quick Popup Badge */}
        {currentVariant?.tierBenefits && currentVariant.tierBenefits.length > 0 && (
          <div className="relative group mb-4 w-fit">
            <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-gray-900/95 backdrop-blur-xs text-white text-xs rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-20 shadow-xl border border-gray-800">
              <div className="font-bold flex items-center mb-2 gap-2 border-b border-gray-800 pb-1.5">
                <FaAward className={tierConfig.text} />
                <span>{currentVariant?.productTier} Tier Perks</span>
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

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-help transition-colors border ${tierConfig.badgeBg} ${tierConfig.badgeText} ${tierConfig.border}`}>
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
        {bulkCartItem && cartCalculations.packs > 0 && (
          <div className="mb-4 p-3 bg-primary/[0.02] border border-primary/20 dark:border-info/25 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between items-center text-text-secondary font-medium">
              <span>Selected Packs:</span>
              <span className="font-bold text-text-primary">{cartCalculations.packs} packs ({cartCalculations.totalKits} kits)</span>
            </div>
            <div className="flex justify-between items-center text-green-700 font-bold">
              <span className="flex items-center gap-1">
                <FaPiggyBank size={12} />
                Total Savings:
              </span>
              <span>₹{formattedCalculations.totalSavings}</span>
            </div>
          </div>
        )}

        {/* Action Button Section */}
        <div className="mt-auto pt-2">
          {hasOrderQuantities ? (
            /* Order Quantity Chips Mode */
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              {/* Qty selector chips */}
              {!bulkCartItem && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {orderQuantities.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedOrderQty(qty); }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all duration-150
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
              {!bulkCartItem ? (
                <Button
                  onClick={handleAddToBulkCart}
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<FaShoppingCart />}
                  className="bg-gradient-to-r from-primary to-primary-end text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Order {selectedOrderQty || orderQuantities[0]} Kits
                </Button>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {orderQuantities.map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(addToBulkCart({ id: kit.id, variantIndex: selectedVariant, qty, replace: true }));
                          setSelectedOrderQty(qty);
                        }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all duration-150
                          ${bulkCartItem.qty === qty
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
                    onClick={(e) => { e.stopPropagation(); dispatch(removeFromBulkCart(cartItemId)); }}
                    className="w-full text-[10px] text-rose-500 font-bold uppercase tracking-wider hover:text-rose-700 py-1 transition-colors"
                  >
                    Remove from Order
                  </button>
                </div>
              )}
            </div>
          ) : !bulkCartItem ? (
            <Button
              onClick={handleAddToBulkCart}
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<FaShoppingCart />}
              className="bg-gradient-to-r from-primary to-primary-end text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-98"
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
                {bulkCartItem.qty} {bulkCartItem.qty === 1 ? 'Pack' : 'Packs'}
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

        {/* Eco footer stats */}
        <div className="mt-4 flex justify-end items-center text-[10px] text-text-muted font-bold border-t border-border pt-3">
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
      aria-label={`Select ${kit.kitName} kit`}
    >
      {/* Selection indicators */}
      {isSelected && (
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-primary to-primary-end" />
      )}

      <div className="flex gap-5 w-full items-stretch">
        {/* Left: Image with hover effect */}
        <div className={`relative flex-shrink-0 bg-gradient-to-tr from-gray-50/50 to-slate-100/50 rounded-xl overflow-hidden border border-border flex items-center justify-center ${
          compact ? 'w-28 h-28' : 'w-52 h-52'
        }`}>
          <img
            src={kit?.kitImage}
            alt={kit?.kitName}
            className="w-full h-full p-2.5 object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 justify-between">
          {/* Main info section */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Badges Row */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${!currentVariant?.tierColor ?`${tierConfig.border} ${tierConfig.bg}` :""}`}
                  style={currentVariant?.tierColor ? {
                    backgroundColor:`${currentVariant.tierColor}15`,
                    color: currentVariant.tierColor,
                    borderColor:`${currentVariant.tierColor}35`
                  } : undefined}
                >
                  <span className={!currentVariant?.tierColor ? tierConfig.text :""} style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>
                    {tierConfig.icon}
                  </span>
                  <span className={!currentVariant?.tierColor ? tierConfig.text :""} style={currentVariant?.tierColor ? { color: currentVariant.tierColor } : undefined}>
                    {kit.brand} • {currentVariant?.productTier}
                  </span>
                </div>
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
                      src={kit.usageTypeImage.startsWith("http") ? kit.usageTypeImage :`http://localhost:5000${kit.usageTypeImage}`}
                      alt=""
                      className="w-5 h-5 object-contain rounded-full shrink-0"
                    />
                  )}
                  <span>{kit.usageType}</span>
                </span>
                {currentVariant?.bulkPack && (
                  <span className="bg-primary/10 dark:bg-primary/15 text-primary dark:text-info border border-primary/20 dark:border-info/25 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {currentVariant.bulkPack.kitsPerPack}/pack
                  </span>
                )}
                {!currentVariant?.inStock && (
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-red-50 text-red-600 border border-red-200">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Title & Desc */}
              <h3 className={`font-bold text-text-primary mb-1 line-clamp-1 leading-tight group-hover:text-primary dark:group-hover:text-info transition-colors ${compact ? 'text-base' : 'text-lg'}`}>
                {kit?.kitName}
              </h3>
              <p className="text-text-secondary text-xs line-clamp-2 leading-relaxed mb-3">
                {kit?.description}
              </p>
            </div>

            {/* Spec Badges Row & Benefits */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-50/80 text-blue-700 border border-primary/20/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <FaBolt size={10} />
                  {kit.capacityKW} kW Capacity
                </span>
                {totalDiscountPercentage > 0 && (
                  <span className="bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {totalDiscountPercentage}% Off
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
            <div className="mb-3 text-left md:text-right">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Special Price</span>
              <div className="flex items-baseline md:justify-end gap-1.5 flex-wrap">
                <span className="text-xl font-extrabold text-text-primary">₹{formattedPrices.ourPrice}</span>
                {totalDiscountPercentage > 0 && (
                  <del className="text-xs text-text-muted font-semibold">₹{formattedPrices.marketPrice}</del>
                )}
              </div>
              {formattedPrices.gstIncluded && (
                <span className="text-[10px] text-success font-semibold block mt-0.5 md:text-right">
                  (Includes ₹{formattedPrices.gstIncluded} GST @ {formattedPrices.gstRate}%)
                </span>
              )}
            </div>

            {/* Variant Selector Button - List View */}
            {kit.variants?.length > 1 && (
              <div className="relative mb-3 w-full" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowVariants(!showVariants)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-surface-hover hover:bg-surface-hover rounded-lg border border-border text-xs font-semibold text-text-primary"
                >
                  <span className="flex items-center gap-1.5">
                    {tierConfig.icon}
                    <span>{currentVariant?.productTier}</span>
                  </span>
                  {showVariants ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                </button>
                
                {showVariants && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-xl border border-border shadow-xl z-20 overflow-hidden divide-y divide-border">
                    {kit.variants.map((variant, index) => {
                      const variantTierConfig = getTierConfig(variant.productTier, variant.tierColor);
                      const hasBulk = variant.bulkPack ? true : false;
                      return (
                        <button
                          key={index}
                          onClick={() => handleVariantChange(index)}
                          className={`w-full flex items-center justify-between px-3 py-2 hover:bg-surface-hover text-xs transition-colors ${
                            index === selectedVariant ? 'bg-primary/[0.03] font-bold text-primary' : 'text-text-primary'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={variantTierConfig.text}>{variantTierConfig.icon}</span>
                            <span style={variant.tierColor ? { color: variant.tierColor } : undefined}>{variant.productTier}</span>
                            {hasBulk && (
                              <span className="text-[9px] bg-primary/10 dark:bg-primary/15 text-primary dark:text-info px-1.5 py-0.5 rounded-full font-bold">
                                Bulk
                              </span>
                            )}
                          </span>
                          <span className="font-bold">
                            ₹{(variant.bulkPack?.pricePerKitAfterDiscount ? variant.bulkPack.pricePerKitAfterDiscount : variant.ourPrice)?.toLocaleString("en-IN")}/kit
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Cart Calculations Summary */}
            {bulkCartItem && cartCalculations.packs > 0 && (
              <div className="mb-3 p-2 bg-primary/[0.02] border border-primary/20 dark:border-info/25 rounded-xl text-[11px] space-y-1">
                <div className="flex justify-between items-center text-text-secondary">
                  <span>Selected:</span>
                  <span className="font-bold text-text-primary">{cartCalculations.packs} packs</span>
                </div>
                <div className="flex justify-between items-center text-green-700 font-bold">
                  <span>Savings:</span>
                  <span>₹{formattedCalculations.totalSavings}</span>
                </div>
              </div>
            )}

            {/* Cart Button */}
            <div>
              {!currentVariant?.inStock ? (
                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  disabled
                  className="bg-red-50 text-red-500 border border-red-200 cursor-not-allowed"
                >
                  Out of Stock
                </Button>
              ) : !bulkCartItem ? (
                <Button
                  onClick={handleAddToBulkCart}
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<FaShoppingCart />}
                  className="bg-gradient-to-r from-primary to-primary-end text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-98"
                >
                  Add Bulk Order
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
                    {bulkCartItem.qty}
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
        </div>
      </div>
    </div>
  );

  return viewMode ==="list" ? <ListView /> : <GridView />;
});

BulkKitCard.displayName ="BulkKitCard";

export default BulkKitCard;