import React, { useEffect } from "react";
import { FaInfoCircle } from "react-icons/fa";

export default function SkuSpecsLink({
  skuId,
  skuDetailsCache = {},
  fetchSkuDetails,
  setActiveViewingSku
}) {
  const sku = skuId ? skuDetailsCache[skuId] : null;

  useEffect(() => {
    if (skuId && (!sku || !sku.product_name) && typeof fetchSkuDetails === "function") {
      fetchSkuDetails(skuId);
    }
  }, [skuId, sku, fetchSkuDetails]);

  if (!skuId) return null;

  const hasFullDetails = sku && sku.product_name;

  return (
    <div className="mt-1.5 flex items-center justify-between px-1">
      <button
        type="button"
        onClick={() => hasFullDetails && typeof setActiveViewingSku === "function" && setActiveViewingSku(sku)}
        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary transition-colors hover:text-primary-hover cursor-pointer"
        disabled={!hasFullDetails}
      >
        <FaInfoCircle className="h-3 w-3 shrink-0" />
        {hasFullDetails ? `Specs: ${sku.sku_code}` : "Loading technical specs..."}
      </button>
    </div>
  );
}
