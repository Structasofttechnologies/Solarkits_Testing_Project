import React from "react";
import Dialog from "@/components/Dialog";
import { FaBarcode, FaDatabase, FaIndustry, FaTag, FaLayerGroup, FaImage } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;
const buildApiUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

export default function SkuDetailsModal({ isOpen, onClose, sku }) {
  const renderAttributeValue = (attr) => {
    if (!attr) return "-";

    const dataType = attr.data_type || (
      (attr.value_boolean !== null && attr.value_boolean !== undefined) ? "boolean" :
      (attr.value_number !== null && attr.value_number !== undefined) ? "number" :
      "text"
    );

    if (dataType === "file" && attr.value_text) {
      return (
        <a
          href={buildApiUrl(attr.value_text)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-primary hover:underline"
        >
          View Document/Asset
        </a>
      );
    }
    if (dataType === "boolean") {
      return attr.value_boolean === 1 || attr.value_boolean === true ? "YES" : "NO";
    }
    if (dataType === "dropdown") {
      return attr.value_text || "-";
    }
    if (dataType === "multiselect") {
      try {
        const values = attr.value_text ? JSON.parse(attr.value_text) : [];
        return values.length ? values.join(", ") : "-";
      } catch {
        return "-";
      }
    }
    if (dataType === "number") {
      if (attr.value_number === null || attr.value_number === undefined) return "-";
      return `${attr.value_number}${attr.unit_symbol ? ` ${attr.unit_symbol}` : ""}`;
    }
    return attr.value_text || "-";
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Product SKU Specification details" size="lg">
      {sku ? (
        <div className="space-y-6 p-2">
          {/* Main Info Block */}
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/5 to-indigo-500/5 p-6 shadow-xs">
            <div className="absolute -right-4 -top-4 opacity-5">
              <FaBarcode size={120} className="rotate-12 text-primary" />
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    <FaTag className="h-2 w-2" /> SKU Code
                  </span>
                  <span className="font-mono text-xs font-black tracking-widest text-text-primary">
                    {sku.sku_code}
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase tracking-wide text-text-primary">
                  {sku.product_name || "Enriched Product SKU"}
                </h3>
                {sku.brand_name && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <FaIndustry className="h-3.5 w-3.5 text-text-muted" />
                    <span className="font-bold uppercase tracking-wider text-teal-700">
                      {sku.brand_name}
                    </span>
                  </div>
                )}
              </div>

              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-white shadow-xs flex items-center justify-center">
                {sku.product_image ? (
                  <img
                    src={buildApiUrl(sku.product_image)}
                    alt={sku.product_name || "Product"}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.classList.add('justify-center', 'items-center');
                    }}
                  />
                ) : null}
                {!sku.product_image && (
                  <FaImage className="text-text-muted/40" size={32} />
                )}
              </div>
            </div>

            {sku.product_description && (
              <div className="mt-4 border-t border-border/40 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Description</p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {sku.product_description}
                </p>
              </div>
            )}
          </div>

          {/* Features list if present */}
          {sku.product_features && sku.product_features.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <FaLayerGroup className="text-indigo-600" size={14} />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary">Key Highlights & Features</h4>
              </div>
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {sku.product_features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical attributes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <FaDatabase className="text-primary" size={14} />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary">Technical Specifications</h4>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sku.attributes && sku.attributes.length > 0 ? (
                sku.attributes.map((attr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-hover/20 p-3 hover:bg-surface-hover/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">
                        {attr.attribute_name}
                      </p>
                      <p className="text-xs font-black uppercase tracking-wider text-text-primary">
                        {renderAttributeValue(attr)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-6 text-center text-xs italic text-text-muted">
                  No specifications defined for this SKU.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs italic text-text-muted">
          Loading details...
        </div>
      )}
    </Dialog>
  );
}
