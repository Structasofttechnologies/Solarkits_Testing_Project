import { useState, useEffect } from "react";
import Dialog from "@/components/Dialog";
import { FaImage, FaCheck, FaTag, FaStar, FaSync, FaTags, FaFilePdf, FaExternalLinkAlt } from "react-icons/fa";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

import PopupDataLoader from "@/components/PopupDataLoader";

const API_URL = import.meta.env.VITE_API_URL;

export default function ViewProductModal({ isOpen, onClose, product }) {
  const [skus, setSkus] = useState([]);
  const [loadingSkus, setLoadingSkus] = useState(false);

  useEffect(() => {
    if (isOpen && product?.id) {
      const fetchSkus = async () => {
        setLoadingSkus(true);
        try {
          const res = await axios.get(
            `${API_URL}/products/get-skus-by-product?unique_id=ADM_SKU&req_for=view&product_id=${product.id}`,
            { headers: authHeaderObj() }
          );
          if (res.data?.status === "success") {
            setSkus(res.data.data || []);
          }
        } catch (error) {
          console.error("Failed to fetch SKUs inside ViewProductModal:", error);
        } finally {
          setLoadingSkus(false);
        }
      };
      fetchSkus();
    } else {
      setSkus([]);
    }
  }, [isOpen, product?.id]);

  const renderAttributeValue = (attr) => {
    if (attr.data_type === "file" && attr.value_text) {
      return <a href={attr.value_text} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">View Asset</a>;
    }
    if (attr.data_type === "boolean") return (attr.value_boolean === 1 || attr.value_boolean === true) ? "YES" : "NO";
    if (attr.data_type === "dropdown") return attr.option_value || "-";
    if (attr.data_type === "multiselect") {
      try {
        const values = attr.value_text ? JSON.parse(attr.value_text) : [];
        return values.length ? values.join(", ") : "-";
      } catch { return "-"; }
    }
    if (attr.data_type === "number") {
      if (attr.value_number === null || attr.value_number === undefined) return "-";
      return `${attr.value_number}${attr.unit_symbol ? ` ${attr.unit_symbol}` : ""}`;
    }
    return attr.value_text || "-";
  };

  const renderSkuAttributeValue = (attr) => {
    if (!attr) return "-";
    if (attr.data_type === "boolean") return (attr.value_boolean === 1 || attr.value_boolean === true) ? "Yes" : "No";
    if (attr.data_type === "dropdown") return attr.option_value || "-";
    if (attr.data_type === "number") {
      if (attr.value_number === null || attr.value_number === undefined) return "-";
      return `${attr.value_number}${attr.unit_symbol ? ` ${attr.unit_symbol}` : ""}`;
    }
    return attr.value_text || "-";
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Operational Specifications" size="lg">
      {product && (
        <div className="space-y-8 p-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-4">
          {/* Header Identity Section */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-48 aspect-square shrink-0 bg-surface rounded-2xl border border-border shadow-inner flex items-center justify-center overflow-hidden group">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-text-muted opacity-20">
                   <FaImage size={48} />
                   <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                 <div className="flex items-center gap-3">
                   <div className="h-8 px-3 bg-surface border border-border rounded-lg flex items-center gap-2 shadow-sm">
                     <img src={product.brand_logo} alt={product.brand_name} className="h-4 w-4 object-contain" />
                     <span className="text-[11px] font-black text-text-primary uppercase tracking-widest">{product.brand_name}</span>
                   </div>
                   <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                 </div>
                 <h3 className="text-2xl font-black text-text-primary tracking-tight leading-none pt-2 break-words whitespace-normal">{product.name}</h3>
              </div>
              
              {product.description && (
                <div className="bg-surface-hover/30 p-4 rounded-xl border border-border/40">
                   <p className="text-[11px] font-bold text-text-secondary leading-relaxed uppercase tracking-tighter opacity-80 break-words whitespace-normal">{product.description}</p>
                </div>
              )}

              {/* Technical Datasheet Section */}
              {product.datasheet ? (
                <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                      <FaFilePdf size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-text-primary uppercase tracking-tight">Technical Datasheet (PDF)</p>
                      <p className="text-[10px] text-text-secondary font-medium">Manufacturer Specifications Attached</p>
                    </div>
                  </div>
                  <a
                    href={product.datasheet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <FaExternalLinkAlt size={10} /> View PDF
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 bg-surface-hover/30 border border-border/40 rounded-xl text-text-muted text-[10px] font-semibold">
                  <FaFilePdf className="opacity-40" size={14} />
                  <span>No Technical Datasheet attached yet.</span>
                </div>
              )}

              {/* SKU Configuration Info */}
              <div className="bg-surface-hover/20 p-4 rounded-xl border border-border/40 space-y-2">
                <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">SKU Code Length Config</span>
                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-text-muted uppercase tracking-wider">Template</span>
                    <span className="text-xs font-bold text-text-primary">{product.sku_config?.template_len ?? 3} chars</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-text-muted uppercase tracking-wider">Brand</span>
                    <span className="text-xs font-bold text-text-primary">{product.sku_config?.brand_len ?? 5} chars</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-text-muted uppercase tracking-wider">Model</span>
                    <span className="text-xs font-bold text-text-primary">{product.sku_config?.product_len ?? 4} chars</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-text-muted uppercase tracking-wider">Subtype</span>
                    <span className="text-xs font-bold text-text-primary">{product.sku_config?.subtype_len ?? 4} chars</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          {product.features && product.features.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-6 h-6 rounded bg-success/10 text-success flex items-center justify-center">
                    <FaStar size={12} />
                 </div>
                 <h4 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Platform Highlights</h4>
                 <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.features.map((feature, idx) => (
                   <div key={idx} className="flex items-start gap-3 p-3 bg-surface border border-border rounded-xl group hover:border-success/40 transition-colors">
                      <div className="mt-1 w-4 h-4 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                         <FaCheck size={8} />
                      </div>
                      <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest leading-tight group-hover:text-text-primary transition-colors break-words whitespace-normal">{feature}</span>
                   </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Specifications */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center">
                  <FaTag size={12} />
               </div>
               <h4 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Engineering Schematics</h4>
               <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="space-y-6">
              {[...(product.attributes || [])]
                .sort((a, b) => (a.group_display_order ?? 0) - (b.group_display_order ?? 0))
                .map((group, idx) => (
                <div key={idx} className="bg-surface-hover/20 rounded-2xl border border-border/40 overflow-hidden">
                  <div className="bg-surface-hover/50 px-5 py-3 border-b border-border/40 flex items-center gap-3">
                     <div className="w-1.5 h-4 bg-primary/40 rounded-full" />
                     <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] break-words whitespace-normal">{group.group_name}</span>
                  </div>
                  <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[...(group.attributes || [])]
                      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                      .map((attr, aidx) => (
                      <div key={aidx} className="px-4 py-3 bg-surface border border-border/40 rounded-xl flex flex-col gap-1 hover:shadow-md hover:shadow-primary/5 transition-all">
                        <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60 break-words whitespace-normal">{attr.attribute_name}</span>
                        <span className="text-[11px] font-black text-text-primary uppercase tracking-widest break-words whitespace-normal">{renderAttributeValue(attr)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configured Technical Specifications */}
          {product.specifications && Array.isArray(product.specifications) && product.specifications.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center">
                  <FaMicrochip size={12} />
                </div>
                <h4 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Configured Technical Specifications ({product.specifications.length})</h4>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden bg-surface">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-hover/60 text-text-secondary text-[10px] uppercase font-bold border-b border-border">
                    <tr>
                      <th className="py-2 px-3 w-40">Group</th>
                      <th className="py-2 px-3">Specification</th>
                      <th className="py-2 px-3">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {product.specifications.map((s, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/30">
                        <td className="py-2 px-3 text-[10px] font-medium text-text-muted">{s.group || "General"}</td>
                        <td className="py-2 px-3 font-bold text-text-primary">{s.key || s.specification}</td>
                        <td className="py-2 px-3 text-text-primary font-medium">{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Associated SKU Variants */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center">
                <FaTags size={12} />
              </div>
               <h4 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Associated SKU Variants ({skus.length})</h4>
               <div className="h-px flex-1 bg-border/40" />
            </div>

            {loadingSkus ? (
               <PopupDataLoader text="Loading associated variants..." size="sm" className="min-h-[150px] py-6 border border-border/40 rounded-2xl bg-surface-hover/30" />
            ) : skus.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-2xl bg-surface-hover/20 font-bold uppercase tracking-wider">
                No SKU variants configured for this product.
              </div>
            ) : (() => {
              // Group the variant attributes from the SKUs by group name
              const groupMap = {};
              skus.forEach(sku => {
                sku.attributes?.forEach(attr => {
                  if (attr.attribute_name) {
                    const gName = attr.group_name || "Variant Specifications";
                    if (!groupMap[gName]) groupMap[gName] = new Set();
                    groupMap[gName].add(attr.attribute_name);
                  }
                });
              });

              return (
                <div className="space-y-6">
                  {Object.entries(groupMap).map(([gName, attrSet]) => {
                    const groupAttrs = Array.from(attrSet);
                    return (
                      <div key={gName} className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-3.5 bg-primary/40 rounded-full" />
                          <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">{gName} Variants</span>
                        </div>
                        <div className="max-h-[250px] overflow-x-auto overflow-y-auto border border-border/40 rounded-2xl custom-scrollbar bg-surface shadow-inner w-full">
                          <table className="w-full min-w-max text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-surface-hover/80 border-b border-border/60 sticky top-0 z-10 backdrop-blur-sm">
                                <th className="p-3.5 font-black uppercase tracking-wider text-text-secondary border-r border-border/20">SKU Code</th>
                                {groupAttrs.map((attrName, idx) => (
                                  <th 
                                    key={attrName} 
                                    className={`p-3.5 font-black uppercase tracking-wider text-text-secondary ${
                                      idx < groupAttrs.length - 1 ? "border-r border-border/20" : ""
                                    }`}
                                  >
                                    {attrName}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {skus.map(sku => (
                                <tr key={sku.id} className="hover:bg-primary/[0.01] transition-colors">
                                  <td className="p-3.5 font-mono font-bold text-primary border-r border-border/20">{sku.sku_code}</td>
                                  {groupAttrs.map((attrName, idx) => {
                                    const attr = sku.attributes?.find(a => a.attribute_name === attrName);
                                    return (
                                      <td 
                                        key={attrName} 
                                        className={`p-3.5 text-text-secondary font-bold whitespace-normal break-words max-w-[200px] ${
                                          idx < groupAttrs.length - 1 ? "border-r border-border/20" : ""
                                        }`}
                                      >
                                        {renderSkuAttributeValue(attr)}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </Dialog>
  );
}