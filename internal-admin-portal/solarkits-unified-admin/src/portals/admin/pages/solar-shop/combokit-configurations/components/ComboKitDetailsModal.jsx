import React, { useState } from "react";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import { FaImage, FaChevronRight, FaChevronDown } from "react-icons/fa";
import SkuSpecsLink from "./SkuSpecsLink";

export default function ComboKitDetailsModal({
    showDetailModal,
    setShowDetailModal,
    viewingKit,
    toggleSection,
    isSectionOpen,
    getTemplateUnitSymbol,
    skuDetailsCache,
    fetchSkuDetails,
    setActiveViewingSku,
    API_URL,
}) {
    const [failedImages, setFailedImages] = useState({});

    const handleImageError = (imageKey) => {
        setFailedImages(prev => ({ ...prev, [imageKey]: true }));
    };

    return (
        <Dialog
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            title="Warehouse Combo Kit Specifications"
            size="xl"
        >
            {viewingKit && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                        <div className="space-y-6 lg:col-span-5">
                            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                                <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-hover">
                                    {!failedImages['kit_image'] && viewingKit.kit_image ? (
                                        <img
                                            src={viewingKit.kit_image.includes('localhost:3001') ? viewingKit.kit_image.replace('localhost:3001', 'localhost:5000') : (viewingKit.kit_image.startsWith('http://') || viewingKit.kit_image.startsWith('https://')) ? viewingKit.kit_image : `http://localhost:5000/${viewingKit.kit_image.startsWith('/') ? viewingKit.kit_image.slice(1) : viewingKit.kit_image}`}
                                            alt="Kit"
                                            className="h-full w-full object-cover"
                                            onError={() => handleImageError('kit_image')}
                                        />
                                    ) : <FaImage className="text-text-muted/30" size={48} />}
                                </div>
                                <div>
                                    <h4 className="text-base font-black uppercase tracking-wide text-text-primary">{viewingKit.name}</h4>
                                    {viewingKit.description && <p className="mt-2 rounded-lg border border-border/50 bg-surface-hover/30 p-3 text-xs leading-relaxed text-text-secondary">{viewingKit.description}</p>}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Target Location</p>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between"><span className="font-semibold text-text-secondary">Country:</span><span className="font-black uppercase text-text-primary">{viewingKit.country_name || "N/A"}</span></div>
                                    {viewingKit.variants && viewingKit.variants.length > 0 ? (
                                        <div className="flex flex-col gap-1 border-t border-border/50 pt-2">
                                            <span className="font-semibold text-text-secondary">Assigned Kit Types:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {viewingKit.variants.map((v, idx) => (
                                                    <span key={idx} className="font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                                        {v.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : viewingKit.variant?.name ? (
                                        <div className="flex justify-between border-t border-border/50 pt-2">
                                            <span className="font-semibold text-text-secondary">Assigned Kit Type:</span>
                                            <span className="font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{viewingKit.variant.name}</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Blueprint & Capacity Metrics</p>
                                <div className="space-y-3 text-xs">
                                    <div className="flex justify-between"><span className="font-semibold text-text-secondary">Master Blueprint:</span><span className="font-bold uppercase text-text-primary">{viewingKit.solar_kit_id?.name || "N/A"}</span></div>
                                    <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-2">
                                        <div className="rounded-xl bg-surface-hover p-2.5 text-center"><p className="text-[8px] font-black uppercase text-text-muted">Capacity</p><p className="mt-1 text-xs font-black text-amber-700">{viewingKit.capacity || 0} kW</p></div>
                                        <div className="rounded-xl bg-surface-hover p-2.5 text-center"><p className="text-[8px] font-black uppercase text-text-muted">Tolerance</p><p className="mt-1 text-xs font-black text-indigo-700">±{viewingKit.inverter_tolerance || 10}%</p></div>
                                        <div className="rounded-xl bg-surface-hover p-2.5 text-center"><p className="text-[8px] font-black uppercase text-text-muted">Range</p><p className="mt-1.5 text-[9px] font-black text-text-primary truncate">{viewingKit.project_range_id ? `${viewingKit.project_range_id.min_value}-${viewingKit.project_range_id.max_value} ${viewingKit.project_range_id.unit_id?.symbol || "kW"}` : "N/A"}</p></div>
                                    </div>
                                    {Array.isArray(viewingKit.order_quantities) && viewingKit.order_quantities.length > 0 && (
                                        <div className="border-t border-border/50 pt-2 space-y-1">
                                            <span className="font-semibold text-text-secondary text-[11px]">PO Order Quantity Options:</span>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {viewingKit.order_quantities.filter(n => n > 0).sort((a, b) => a - b).map((qty, idx) => (
                                                    <span key={idx} className="bg-orange-500/10 text-orange-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-orange-500/20">
                                                        {qty} Kits
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {Array.isArray(viewingKit.loose_order_quantities) && viewingKit.loose_order_quantities.length > 0 && (
                                        <div className="border-t border-border/50 pt-2 space-y-1">
                                            <span className="font-semibold text-text-secondary text-[11px]">Loose Order Quantity Options:</span>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {viewingKit.loose_order_quantities.filter(n => n > 0).sort((a, b) => a - b).map((qty, idx) => (
                                                    <span key={idx} className="bg-sky-500/10 text-sky-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-sky-500/20">
                                                        {qty} Kits
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {viewingKit.allow_trial_kit && (
                                        <div className="border-t border-border/50 pt-2 flex items-center justify-between">
                                            <span className="font-semibold text-text-secondary text-[11px]">Trial Kit Order:</span>
                                            <span className="bg-emerald-500/10 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                                                ✓ Enabled ({viewingKit.trial_kit_quantity || 10} Kits) • {Number(viewingKit.trial_kit_max_orders_per_buyer ?? 1) === 0 ? "Unlimited" : `Max ${viewingKit.trial_kit_max_orders_per_buyer ?? 1} Order(s)/Buyer`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 lg:col-span-7">
                            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Master Hierarchy Map</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-text-primary">
                                    <span className="rounded-xl border border-primary/15 bg-primary/5 px-2.5 py-1 text-primary">{viewingKit.solar_kit_id?.category_id?.name || "Category"}</span>
                                    <FaChevronRight className="text-text-muted" size={8} />
                                    <span className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 px-2.5 py-1 text-indigo-700">{viewingKit.solar_kit_id?.subcategory_id?.name || "Subcategory"}</span>
                                    <FaChevronRight className="text-text-muted" size={8} />
                                    <span className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-2.5 py-1 text-amber-700">{viewingKit.solar_kit_id?.type_id?.type?.name || "Type"}</span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-surface">
                                <button
                                    type="button"
                                    onClick={() => toggleSection("detail_base_components")}
                                    className="flex w-full cursor-pointer items-center justify-between rounded-t-2xl px-5 py-4 transition-colors hover:bg-surface-hover/30"
                                >
                                    <h5 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-primary">
                                        <span className="h-3 w-1.5 rounded-full bg-teal-500"></span> Base Components & SKUs{" "}
                                        <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal text-teal-700">
                                            {(viewingKit.base_components || []).length} components
                                        </span>
                                    </h5>
                                    <FaChevronDown
                                        size={12}
                                        className={`text-text-muted transition-transform duration-200 ${
                                            isSectionOpen("detail_base_components") ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>
                                {isSectionOpen("detail_base_components") && (
                                    <div className="space-y-3 px-5 pb-5">
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {(viewingKit.base_components || []).map((bc, idx) => {
                                                const skuId = bc.sku_id?.id || bc.sku_id?._id || bc.sku_id;
                                                const imageKey = `logo_${idx}`;
                                                return (
                                                    <div key={idx} className="space-y-2 rounded-xl border border-border/80 bg-surface-hover/30 p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs font-black uppercase text-text-primary">
                                                                    {bc.template_id?.name || "Base Component"}
                                                                </p>
                                                                <p className="mt-1 text-[10px] text-text-secondary">
                                                                    Brand: <span className="font-bold uppercase text-teal-700">{bc.brand_id?.brand_name || "Generic"}</span>
                                                                </p>
                                                                <p className="mt-0.5 text-[10px] text-text-secondary">
                                                                    SKU: <span className="font-bold font-mono text-indigo-600">{bc.sku_id?.sku_code || "N/A"}</span>
                                                                </p>
                                                                <p className="mt-0.5 text-[10px] text-text-secondary">
                                                                    Qty: <span className="font-bold">{bc.quantity || 1} {getTemplateUnitSymbol(bc)}</span>
                                                                </p>
                                                            </div>
                                                            <div className="h-8 w-16 flex items-center justify-center bg-surface-hover rounded border border-border/60">
                                                                {!failedImages[imageKey] && bc.brand_id?.logo ? (
                                                                    <img
                                                                        src={bc.brand_id.logo}
                                                                        alt="Brand Logo"
                                                                        className="h-full max-w-14 object-contain"
                                                                        onError={() => handleImageError(imageKey)}
                                                                    />
                                                                ) : (
                                                                    <FaImage className="text-text-muted/40" size={16} />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <SkuSpecsLink
                                                            skuId={skuId}
                                                            skuDetailsCache={skuDetailsCache}
                                                            fetchSkuDetails={fetchSkuDetails}
                                                            setActiveViewingSku={setActiveViewingSku}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {viewingKit.bos_kits?.length > 0 && (
                                <div className="rounded-2xl border border-border bg-surface">
                                    <button type="button" onClick={() => toggleSection("detail_bos_kits")} className="flex w-full cursor-pointer items-center justify-between rounded-t-2xl px-5 py-4 transition-colors hover:bg-surface-hover/30"><h5 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-primary"><span className="h-3 w-1.5 rounded-full bg-amber-500"></span> Configured BOS Kits <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal text-amber-700">{viewingKit.bos_kits.length} kits</span></h5><FaChevronDown size={12} className={`text-text-muted transition-transform duration-200 ${isSectionOpen("detail_bos_kits") ? "rotate-180" : ""}`} /></button>
                                    {isSectionOpen("detail_bos_kits") && (
                                        <div className="px-5 pb-5">
                                            <div className="grid grid-cols-1 gap-4">
                                                {viewingKit.bos_kits.map((bk, idx) => {
                                                    const skuId = bk.sku_id?.id || bk.sku_id?._id || bk.sku_id;
                                                    const imageKey = `bos_${idx}`;
                                                    return (
                                                        <div key={idx} className="space-y-2 rounded-xl border border-border/80 bg-surface-hover/30 p-4">
                                                            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-10 w-12 shrink-0 overflow-hidden rounded border border-border bg-surface-hover flex items-center justify-center">
                                                                        {!failedImages[imageKey] && bk.image ? <img src={bk.image} alt="BOS" className="h-full w-full object-cover" onError={() => handleImageError(imageKey)} /> : <FaImage className="text-text-muted/40" size={16} />}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black uppercase text-text-primary">{bk.name}</p>
                                                                        <p className="mt-1 text-[10px] text-text-secondary">Brand: <span className="font-bold uppercase text-amber-700">{bk.brand_id?.brand_name || "Generic"}</span></p>
                                                                        <p className="mt-0.5 text-[10px] text-text-secondary">SKU: <span className="font-bold font-mono text-indigo-600">{bk.sku_id?.sku_code || "N/A"}</span></p>
                                                                        <p className="mt-0.5 text-[10px] text-text-secondary">Qty: <span className="font-bold">{bk.quantity || 1} {getTemplateUnitSymbol(bk)}</span></p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {(bk.template_ids || []).map((t, tid) => <span key={tid} className="rounded-full border border-border bg-surface-hover px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-secondary">{t?.name}</span>)}
                                                                {(bk.subtype_ids || []).map((st, stid) => <span key={stid} className="rounded-full border border-teal-500/20 bg-teal-500/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-700">{st?.name}</span>)}
                                                            </div>
                                                            <SkuSpecsLink skuId={skuId} skuDetailsCache={skuDetailsCache} fetchSkuDetails={fetchSkuDetails} setActiveViewingSku={setActiveViewingSku} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border">
                        <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close Specifications</Button>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
