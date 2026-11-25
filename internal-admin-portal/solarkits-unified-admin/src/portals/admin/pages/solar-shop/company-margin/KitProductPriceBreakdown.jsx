import React from "react";
import {
  FaSolarPanel,
  FaBolt,
  FaBoxes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPercent,
  FaReceipt,
  FaLayerGroup,
  FaTag,
  FaTags,
  FaBoxOpen,
  FaIndustry
} from "react-icons/fa";

/**
 * Helper to safely extract SKU price from skuPrices map
 */
export const getSkuPriceData = (skuId, skuPrices) => {
  if (!skuId || !skuPrices) return { price: 0, price_per_watt: 0, isPriced: false };
  const idStr = (skuId._id || skuId.id || skuId).toString();
  const entry = skuPrices[idStr];
  if (!entry) return { price: 0, price_per_watt: 0, isPriced: false };
  if (typeof entry === "number") {
    return { price: entry, price_per_watt: 0, isPriced: entry > 0 };
  }
  const price = Number(entry.price) || 0;
  const price_per_watt = Number(entry.price_per_watt) || 0;
  return {
    price,
    price_per_watt,
    isPriced: price > 0 || price_per_watt > 0,
    currency_code: entry.currency_code || "INR"
  };
};

/**
 * Helper to calculate full pricing breakdown for a kit
 */
export const computeKitFinancials = (kit, skuPrices, margins) => {
  if (!kit) {
    return {
      items: [],
      totalBaseCost: 0,
      allPriced: true,
      pricedCount: 0,
      totalCount: 0,
      standardMarginPct: 0,
      standardMarginAmt: 0,
      standardSellingPrice: 0,
      displayMarginPct: 0,
      displayMarginAmt: 0,
      displaySellingPrice: 0,
      gstRatePct: 0,
      gstAmt: 0,
      totalWithGst: 0
    };
  }

  const items = [];

  // 1. Process Base Components (Panels, Inverters, etc.)
  (kit.base_components || []).forEach((bc, idx) => {
    const skuId = bc.sku_id?._id || bc.sku_id?.id || bc.sku_id;
    const priceData = getSkuPriceData(skuId, skuPrices);
    const qty = Number(bc.quantity) || 1;
    const unitPrice = priceData.price;
    const lineTotal = unitPrice * qty;

    const tName = bc.template_id?.name || "Base Component";
    const isSolar = tName.toLowerCase().includes("panel");
    const isInverter = tName.toLowerCase().includes("inverter");

    items.push({
      key: `bc_${idx}_${skuId || idx}`,
      group: "base",
      category: tName,
      isSolar,
      isInverter,
      icon: isSolar ? FaSolarPanel : isInverter ? FaBolt : FaLayerGroup,
      productName: bc.sku_id?.product_id?.name || bc.template_id?.name || "Base Component",
      brandName: bc.brand_id?.brand_name || bc.sku_id?.product_id?.brand_id?.brand_name || "Generic",
      brandLogo: bc.brand_id?.logo || null,
      skuCode: bc.sku_id?.sku_code || "SKU Not Set",
      hasSku: !!bc.sku_id?.sku_code,
      quantity: qty,
      unit: bc.template_id?.qty_unit_id?.symbol || (isSolar ? "Nos" : "Nos"),
      unitPrice,
      pricePerWatt: priceData.price_per_watt,
      lineTotal,
      isPriced: priceData.isPriced
    });
  });

  // 2. Process BOS Kits (Balance of System)
  (kit.bos_kits || []).forEach((bk, idx) => {
    const skuId = bk.sku_id?._id || bk.sku_id?.id || bk.sku_id;
    const priceData = getSkuPriceData(skuId, skuPrices);
    const qty = Number(bk.quantity) || 1;
    const unitPrice = priceData.price;
    const lineTotal = unitPrice * qty;

    items.push({
      key: `bk_${idx}_${skuId || idx}`,
      group: "bos",
      category: "BOS Kit",
      isSolar: false,
      isInverter: false,
      icon: FaBoxes,
      productName: bk.sku_id?.product_id?.name || bk.name || "BOS Component",
      brandName: bk.brand_id?.brand_name || "Generic",
      brandLogo: bk.brand_id?.logo || null,
      skuCode: bk.sku_id?.sku_code || "SKU Not Set",
      hasSku: !!bk.sku_id?.sku_code,
      quantity: qty,
      unit: "Set",
      unitPrice,
      pricePerWatt: 0,
      lineTotal,
      isPriced: priceData.isPriced
    });
  });

  const totalBaseCost = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalCount = items.length;
  const pricedCount = items.filter((i) => i.isPriced).length;
  const allPriced = totalCount > 0 && pricedCount === totalCount;

  // Margins & GST calculations
  const standardMarginPct = margins?.standard_margin !== undefined && margins?.standard_margin !== ""
    ? Number(margins.standard_margin)
    : 0;
  const displayMarginPct = margins?.showcase_margin !== undefined && margins?.showcase_margin !== ""
    ? Number(margins.showcase_margin)
    : 0;
  const gstRatePct = margins?.gst_rate !== undefined && margins?.gst_rate !== null && margins?.gst_rate !== ""
    ? Number(margins.gst_rate)
    : 0;

  const standardMarginAmt = totalBaseCost * (standardMarginPct / 100);
  const standardSellingPrice = totalBaseCost + standardMarginAmt;

  const displayMarginAmt = totalBaseCost * (displayMarginPct / 100);
  const displaySellingPrice = totalBaseCost + displayMarginAmt;

  const gstAmt = standardSellingPrice * (gstRatePct / 100);
  const totalWithGst = standardSellingPrice + gstAmt;

  return {
    items,
    totalBaseCost,
    allPriced,
    pricedCount,
    totalCount,
    standardMarginPct,
    standardMarginAmt,
    standardSellingPrice,
    displayMarginPct,
    displayMarginAmt,
    displaySellingPrice,
    gstRatePct,
    gstAmt,
    totalWithGst
  };
};

export default function KitProductPriceBreakdown({
  kit,
  skuPrices = {},
  margins = {},
  currencySymbol = "₹",
  isCompact = false,
  showTitle = true,
  onConfigureTiers = null
}) {
  const financials = computeKitFinancials(kit, skuPrices, margins);
  const {
    items,
    totalBaseCost,
    allPriced,
    pricedCount,
    totalCount,
    standardMarginPct,
    standardMarginAmt,
    standardSellingPrice,
    displayMarginPct,
    displayMarginAmt,
    displaySellingPrice,
    gstRatePct,
    gstAmt,
    totalWithGst
  } = financials;

  const formatCurrency = (num) => {
    return `${currencySymbol}${Number(num || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    })}`;
  };

  const baseItems = items.filter((i) => i.group === "base");
  const bosItems = items.filter((i) => i.group === "bos");

  return (
    <div className="space-y-4 rounded-2xl bg-surface border border-border/80 p-5 shadow-xs transition-all">
      {/* Header bar */}
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FaReceipt size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-text-primary uppercase tracking-wide">
                  {kit?.name || "Combo Kit"}
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {kit?.capacity || 0} kW
                </span>
                {kit?.solar_kit_id?.name && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-hover text-text-secondary border border-border">
                    {kit.solar_kit_id.name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted font-bold mt-0.5">
                Complete hardware product pricing & per-kit cost breakdown for this warehouse cluster.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                allPriced
                  ? "bg-success/10 text-success border-success/30"
                  : "bg-warning/10 text-warning border-warning/30"
              }`}
            >
              {allPriced ? (
                <>
                  <FaCheckCircle size={12} /> All Products Priced ({pricedCount}/{totalCount})
                </>
              ) : (
                <>
                  <FaExclamationTriangle size={12} /> {totalCount - pricedCount} Product(s) Missing Price ({pricedCount}/{totalCount})
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Warning message if unpriced SKUs exist */}
      {!allPriced && totalCount > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20 text-warning">
          <FaExclamationTriangle className="shrink-0 mt-0.5" size={14} />
          <p className="text-xs font-bold leading-relaxed">
            Some products in this kit do not have benchmark prices set for this warehouse cluster. Missing components are currently calculated at {currencySymbol}0.
          </p>
        </div>
      )}

      {/* Products Price List Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-surface-hover/50 border-b border-border text-[10px] font-black uppercase tracking-wider text-text-muted">
              <th className="py-3 px-3 text-center w-10">#</th>
              <th className="py-3 px-4">Component Category</th>
              <th className="py-3 px-4">Configured Product & Brand</th>
              <th className="py-3 px-4">SKU Identifier</th>
              <th className="py-3 px-4 text-right">Unit Benchmark Price</th>
              <th className="py-3 px-4 text-center">Quantity</th>
              <th className="py-3 px-4 text-right">Subtotal Price</th>
              <th className="py-3 px-4 text-center">Price Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {/* Section 1: Base Components Header */}
            {baseItems.length > 0 && (
              <tr className="bg-primary/5 border-y border-primary/20">
                <td colSpan={8} className="py-2 px-4 font-black uppercase tracking-wider text-primary text-[10px] flex items-center gap-2">
                  <FaSolarPanel size={12} />
                  Base Power Components (Solar Panels & Inverters)
                  <span className="text-text-muted font-normal">({baseItems.length} items)</span>
                </td>
              </tr>
            )}

            {baseItems.map((item, idx) => (
              <tr key={item.key} className="hover:bg-surface-hover/40 transition-colors">
                <td className="py-3 px-3 text-center text-text-muted font-bold text-[11px]">{idx + 1}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        item.isSolar
                          ? "bg-amber-500/10 text-amber-600"
                          : item.isInverter
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-surface-hover text-text-secondary"
                      }`}
                    >
                      <item.icon size={12} />
                    </span>
                    <span className="font-bold text-text-primary uppercase tracking-wide text-xs">
                      {item.category}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-0.5">
                    <div className="font-black text-text-primary text-xs leading-snug">
                      {item.productName}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-primary uppercase">
                        Brand: {item.brandName}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-surface-hover border border-border/80 text-text-secondary">
                    {item.skuCode}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {item.isPriced ? (
                    <div>
                      <span className="font-black font-mono text-text-primary text-xs">
                        {formatCurrency(item.unitPrice)}
                      </span>
                      {item.isSolar && item.pricePerWatt > 0 && (
                        <div className="text-[10px] text-text-muted font-bold">
                          ({currencySymbol}{item.pricePerWatt}/W)
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-text-muted font-bold italic text-[11px]">Not configured</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="font-black text-xs text-text-primary bg-surface-hover px-2.5 py-1 rounded-md border border-border/60">
                    {item.quantity} {item.unit}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`font-mono font-black text-xs ${item.lineTotal > 0 ? "text-text-primary" : "text-text-muted"}`}>
                    {formatCurrency(item.lineTotal)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.isPriced
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    }`}
                  >
                    {item.isPriced ? "Priced ✓" : "Missing Price"}
                  </span>
                </td>
              </tr>
            ))}

            {/* Section 2: BOS Components Header */}
            {bosItems.length > 0 && (
              <tr className="bg-amber-500/5 border-y border-amber-500/20">
                <td colSpan={8} className="py-2 px-4 font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 text-[10px] flex items-center gap-2">
                  <FaBoxes size={12} />
                  Balance of System (BOS Kits, Electrical & Structure)
                  <span className="text-text-muted font-normal">({bosItems.length} items)</span>
                </td>
              </tr>
            )}

            {bosItems.map((item, idx) => (
              <tr key={item.key} className="hover:bg-surface-hover/40 transition-colors">
                <td className="py-3 px-3 text-center text-text-muted font-bold text-[11px]">
                  {baseItems.length + idx + 1}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <FaBoxes size={12} />
                    </span>
                    <span className="font-bold text-text-primary uppercase tracking-wide text-xs">
                      {item.category}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-0.5">
                    <div className="font-black text-text-primary text-xs leading-snug">
                      {item.productName}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                        Brand: {item.brandName}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-surface-hover border border-border/80 text-text-secondary">
                    {item.skuCode}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {item.isPriced ? (
                    <span className="font-black font-mono text-text-primary text-xs">
                      {formatCurrency(item.unitPrice)}
                    </span>
                  ) : (
                    <span className="text-text-muted font-bold italic text-[11px]">Not configured</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="font-black text-xs text-text-primary bg-surface-hover px-2.5 py-1 rounded-md border border-border/60">
                    {item.quantity} {item.unit}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`font-mono font-black text-xs ${item.lineTotal > 0 ? "text-text-primary" : "text-text-muted"}`}>
                    {formatCurrency(item.lineTotal)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.isPriced
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    }`}
                  >
                    {item.isPriced ? "Priced ✓" : "Missing Price"}
                  </span>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-text-muted font-bold text-xs">
                  No products configured for this kit blueprint.
                </td>
              </tr>
            )}
          </tbody>
          {/* Table Footer: Total Base Hardware Price */}
          <tfoot>
            <tr className="bg-surface-hover/80 border-t-2 border-border font-black text-xs">
              <td colSpan={6} className="py-3.5 px-4 text-right uppercase tracking-wider text-text-secondary">
                Total Hardware Component Base Cost:
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-primary">
                {formatCurrency(totalBaseCost)}
              </td>
              <td className="py-3.5 px-4 text-center text-[10px] text-text-muted uppercase">
                Hardware Sum
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Financial Breakdown Cards: Base Cost -> Margins -> GST -> Final Selling Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {/* 1. Base Hardware Cost */}
        <div className="p-4 rounded-xl border border-border/80 bg-surface-hover/30 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              1. Base Kit Cost
            </span>
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
              <FaLayerGroup size={10} />
            </span>
          </div>
          <div>
            <div className="text-xl font-black font-mono text-text-primary tracking-tight">
              {formatCurrency(totalBaseCost)}
            </div>
            <p className="text-[10px] text-text-muted font-bold mt-0.5">
              Sum of {pricedCount} priced products in this kit
            </p>
          </div>
        </div>

        {/* 2. Standard Sales Price */}
        <div className="p-4 rounded-xl border border-border/80 bg-surface-hover/30 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              2. Standard Sales Price
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-hover text-text-secondary border border-border">
              +{standardMarginPct.toFixed(2)}% Margin
            </span>
          </div>
          <div>
            <div className="text-xl font-black font-mono text-text-primary tracking-tight">
              {formatCurrency(standardSellingPrice)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-secondary font-bold mt-0.5">
              <span>Markup Amount:</span>
              <span className="font-mono text-success">+{formatCurrency(standardMarginAmt)}</span>
            </div>
          </div>
        </div>

        {/* 3. Display Store Price */}
        <div className="p-4 rounded-xl border border-border/80 bg-surface-hover/30 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              3. Display Store Price
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              +{displayMarginPct.toFixed(2)}% Margin
            </span>
          </div>
          <div>
            <div className="text-xl font-black font-mono text-primary tracking-tight">
              {formatCurrency(displaySellingPrice)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-secondary font-bold mt-0.5">
              <span>Display Markup:</span>
              <span className="font-mono text-primary">+{formatCurrency(displayMarginAmt)}</span>
            </div>
          </div>
        </div>

        {/* 4. Final Customer Price with GST */}
        <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 flex flex-col justify-between space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary">
              4. Final Net Kit Price (Incl. GST)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gstRatePct > 0 ? "bg-success/15 text-success border border-success/30" : "bg-warning/15 text-warning border border-warning/30"}`}>
              {gstRatePct > 0 ? `${gstRatePct.toFixed(2)}% GST` : "GST Not Set"}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-primary tracking-tight">
              {formatCurrency(totalWithGst)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-secondary font-bold mt-0.5">
              <span>GST Amount:</span>
              <span className="font-mono font-bold text-text-primary">+{formatCurrency(gstAmt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Separate Quantity-Based Tier Pricing (Loose & PO Orders) */}
      {(() => {
        const loosePricing = Array.isArray(margins?.loose_order_pricing) ? margins.loose_order_pricing : [];
        const poPricing = Array.isArray(margins?.po_order_pricing) ? margins.po_order_pricing : [];
        const hasTiers = loosePricing.length > 0 || poPricing.length > 0;

        return (
          <div className="mt-4 p-4 rounded-xl border border-border bg-surface-hover/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <FaTags size={13} />
                </span>
                <div>
                  <h5 className="text-xs font-black uppercase tracking-wider text-text-primary">
                    Quantity-Based Tier Pricing (Loose & PO Orders)
                  </h5>
                  <p className="text-[10px] text-text-muted font-bold">
                    Separate per-kit prices configured for loose retail quantities and bulk purchase orders.
                  </p>
                </div>
              </div>

              {onConfigureTiers && (
                <button
                  type="button"
                  onClick={() => onConfigureTiers(kit)}
                  className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <FaTags size={11} />
                  {hasTiers ? "Edit Pricing Tiers" : "+ Set Tier Pricing"}
                </button>
              )}
            </div>

            {hasTiers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Loose Orders Box */}
                <div className="p-3 rounded-lg border border-sky-500/20 bg-sky-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 flex items-center gap-1">
                      <FaBoxOpen size={12} /> Loose Orders Pricing ({loosePricing.length} Tiers)
                    </span>
                  </div>
                  {loosePricing.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {loosePricing.map((t) => (
                        <div
                          key={t.quantity}
                          className="px-2.5 py-1 bg-surface rounded-lg border border-sky-500/20 text-[10px] flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="font-mono font-black text-sky-700">{t.quantity} Kits:</span>
                          <span className="font-mono font-black text-text-primary">
                            ₹{Number(t.price_per_kit).toLocaleString("en-IN")}/kit
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-muted italic block">
                      No loose order tiers set yet (uses baseline price).
                    </span>
                  )}
                </div>

                {/* PO Orders Box */}
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <FaIndustry size={12} /> PO Orders Pricing ({poPricing.length} Tiers)
                    </span>
                  </div>
                  {poPricing.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {poPricing.map((t) => (
                        <div
                          key={t.quantity}
                          className="px-2.5 py-1 bg-surface rounded-lg border border-amber-500/20 text-[10px] flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="font-mono font-black text-amber-800">{t.quantity} Kits:</span>
                          <span className="font-mono font-black text-text-primary">
                            ₹{Number(t.price_per_kit).toLocaleString("en-IN")}/kit
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-muted italic block">
                      No PO order tiers set yet (uses standard margin).
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-surface border border-border/60 text-center text-[11px] text-text-muted font-medium">
                No custom quantity tier pricing set yet. Standard per-kit margin applies across all quantities.
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
