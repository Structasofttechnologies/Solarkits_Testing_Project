import React, { useMemo, useState } from "react";
import Dialog from "../Dialog";
import Button from "../Button";
import {
  FiFileText,
  FiDownload,
  FiExternalLink,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiInfo,
  FiChevronDown,
  FiChevronUp,
  FiPackage,
  FiCheck
} from "react-icons/fi";
import { FaSolarPanel, FaBolt, FaBoxOpen, FaFilePdf, FaCogs, FaTools } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BACKEND_BASE = API_BASE.replace(/\/api\/?$/, "");

const resolveStoreImageUrl = (url) => {
  if (!url || typeof url !== "string" || url.trim() === "") return "";
  if (url.includes("localhost:3001")) return url.replace("localhost:3001", "localhost:5000");
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND_BASE}/${url.startsWith("/") ? url.slice(1) : url}`;
};

const getComponentIcon = (type = "") => {
  const lower = type.toLowerCase();
  if (lower.includes("panel") || lower.includes("module") || lower.includes("pv")) {
    return FaSolarPanel;
  }
  if (lower.includes("inverter")) {
    return FaBolt;
  }
  if (lower.includes("bos") || lower.includes("balance") || lower.includes("cable") || lower.includes("switchgear") || lower.includes("earthing")) {
    return FaCogs;
  }
  return FaBoxOpen;
};

export default function DatasheetModal({ isOpen, onClose, kit }) {
  const [expandedBosIds, setExpandedBosIds] = useState(new Set(["bos-kit-complete"]));

  const toggleExpand = (id) => {
    setExpandedBosIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!kit) return null;

  // Gather all datasheets from kit.datasheet, kit.datasheets, panel, inverter, or includedComponents
  const datasheetList = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Primary ComboKit System Datasheet (uploaded via Admin)
    if (kit.datasheet) {
      seen.add(kit.datasheet);
      list.push({
        id: "combokit-system",
        productName: `${kit.kitName || kit.name || "Solar Combo Kit"} — System Datasheet`,
        brandName: kit.brand || "SolarKit",
        skuCode: "SYSTEM-BLUEPRINT",
        componentType: "Complete ComboKit Datasheet",
        datasheetUrl: kit.datasheet,
        hasDatasheet: true,
        quantity: 1,
        image: null
      });
    }

    // 2. Pre-compiled datasheets from backend
    if (kit.datasheets && Array.isArray(kit.datasheets) && kit.datasheets.length > 0) {
      kit.datasheets.forEach((item) => {
        if (!item) return;
        if (item.datasheetUrl) {
          if (!seen.has(item.datasheetUrl)) {
            seen.add(item.datasheetUrl);
            list.push(item);
          }
        } else if (!list.some((l) => l.id === item.id)) {
          list.push(item);
        }
      });
    }

    // 3. Fallback Panel if not present in list
    if (kit.panel && !list.some((l) => l.id === "panel" || l.componentType?.toLowerCase().includes("panel"))) {
      const url = kit.panel.datasheet || null;
      list.push({
        id: "panel",
        productName: kit.panel.brandName ? `${kit.panel.brandName} Solar Panel` : "Tier-1 Solar PV Module",
        brandName: kit.panel.brandName || "Tier-1",
        componentType: "Solar Panel",
        datasheetUrl: url,
        hasDatasheet: !!url,
        quantity: kit.panel.quantity || kit.panel.panelCount || 0,
        image: kit.panel.image || kit.panel.panelImage || null
      });
      if (url) seen.add(url);
    }

    // 4. Fallback Inverter if not present in list
    if (kit.inverter && !list.some((l) => l.id === "inverter" || l.componentType?.toLowerCase().includes("inverter"))) {
      const url = kit.inverter.datasheet || null;
      list.push({
        id: "inverter",
        productName: kit.inverter.brandName ? `${kit.inverter.brandName} Solar Inverter` : "Grid-Tie Solar Inverter",
        brandName: kit.inverter.brandName || "Tier-1",
        componentType: "Solar Inverter",
        datasheetUrl: url,
        hasDatasheet: !!url,
        quantity: kit.inverter.quantity || 1,
        image: kit.inverter.image || kit.inverter.inverterImage || null
      });
      if (url) seen.add(url);
    }

    // 5. Check other includedComponents
    if (kit.includedComponents && Array.isArray(kit.includedComponents)) {
      kit.includedComponents.forEach((comp) => {
        if (!comp) return;
        const url = comp.datasheet || comp.datasheetUrl || null;
        if (url && seen.has(url)) return;
        if (url) seen.add(url);

        const isPanel = comp.actualType === "panel" || comp.name?.toLowerCase().includes("panel");
        const isInverter = comp.actualType === "inverter" || comp.name?.toLowerCase().includes("inverter");
        if ((isPanel && kit.panel) || (isInverter && kit.inverter)) return;

        list.push({
          id: comp.id || comp.skuCode,
          productName: comp.name || "Component",
          brandName: comp.brandName || "",
          skuCode: comp.skuCode || "",
          componentType: comp.actualType === "panel" ? "Solar Panel" : comp.actualType === "inverter" ? "Inverter" : (comp.technologyType || "Balance of System"),
          datasheetUrl: url,
          hasDatasheet: !!url,
          quantity: comp.quantity || 1,
          image: (isPanel || isInverter) ? (comp.image || null) : null
        });
      });
    }

    // 6. Guarantee Balance of System (BOS) Kit is always included
    const bosIndex = list.findIndex((l) =>
      l.id === "bos-kit-complete" ||
      l.componentType?.toLowerCase().includes("bos") ||
      l.productName?.toLowerCase().includes("bos") ||
      l.productName?.toLowerCase().includes("balance of system")
    );

    const bosSubComponents = kit.BOSKit?.components || kit.bosComponents || (Array.isArray(kit.bos_kits) ? kit.bos_kits : []);
    const bosIncludedList = kit.BOSKit?.included || [];
    const hasBosData = !!kit.BOSKit || bosSubComponents.length > 0 || (kit.bos_kits && kit.bos_kits.length > 0);

    if (bosIndex === -1 && hasBosData) {
      const bosCount = bosSubComponents.length || bosIncludedList.length || 0;
      const bosName = kit.BOSKit?.name || `Complete Balance of System (BOS) Kit${bosCount > 0 ? ` (${bosCount} Components)` : ""}`;
      list.push({
        id: "bos-kit-complete",
        productName: bosName,
        brandName: kit.BOSKit?.brandName || kit.brand || "SolarKits Certified",
        skuCode: kit.BOSKit?.skuCode || (kit.capacityKW ? `BOS-${kit.capacityKW}KW-KIT` : "BOS-KIT"),
        componentType: "BOS Kit",
        datasheetUrl: kit.BOSKit?.datasheet || null,
        hasDatasheet: !!kit.BOSKit?.datasheet,
        quantity: 1,
        unit: "Set",
        image: kit.BOSKit?.BOSKitImage || kit.BOSKit?.image || null,
        subComponents: bosSubComponents,
        included: bosIncludedList
      });
    } else if (bosIndex !== -1) {
      // Enrich existing BOS item with subComponents if missing
      const existing = list[bosIndex];
      if ((!existing.subComponents || existing.subComponents.length === 0) && bosSubComponents.length > 0) {
        list[bosIndex] = {
          ...existing,
          subComponents: bosSubComponents,
          included: existing.included || bosIncludedList
        };
      }
    }

    return list;
  }, [kit]);

  const handleDownload = (url, name) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}_Datasheet.pdf`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Technical Datasheets & Documentation"
      size="lg"
    >
      <div className="space-y-6">
        {/* Kit Context Header */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-soft text-primary uppercase tracking-wider">
                {kit.capacityKW || kit.capacity} kW ComboKit
              </span>
              {kit.brand && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-text-primary uppercase tracking-wider">
                  {kit.brand}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-text-primary">
              {kit.kitName || kit.name}
            </h3>
            <p className="text-xs text-text-secondary">
              Official manufacturer technical specifications, performance curves, and compliance sheets for Inverter, Solar Panels, and Balance of System.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <FiCheckCircle size={15} />
              <span>MNRE & BIS Compliant</span>
            </div>
            {(kit.id || kit._id) && (
              <a
                href={`${API_BASE}/v1/shop/combokit/${kit.id || kit._id}/combined-datasheet-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                title="Download consolidated PDF with all components and compliance sheets"
              >
                <FaFilePdf size={13} />
                <span>Download Combined PDF</span>
              </a>
            )}
          </div>
        </div>

        {/* Datasheet Components List */}
        {datasheetList.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-text-muted">
              <FiFileText size={28} />
            </div>
            <h4 className="text-sm font-bold text-text-primary">Datasheets on Request</h4>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Component datasheets for this custom configuration can be provided directly by our technical engineering team.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                <FiLayers className="text-primary" /> Included Component Specifications ({datasheetList.length})
              </h4>
              <span className="text-[11px] text-text-muted">
                Includes Inverter, PV Modules & Complete BOS
              </span>
            </div>

            <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-surface">
              {datasheetList.map((item, idx) => {
                const Icon = getComponentIcon(item.componentType || item.productName);
                const isBos =
                  item.id === "bos-kit-complete" ||
                  item.componentType?.toLowerCase().includes("bos") ||
                  item.productName?.toLowerCase().includes("bos") ||
                  item.productName?.toLowerCase().includes("balance");

                const subItems = item.subComponents || item.components || [];
                const includedNames = item.included || [];
                const hasSubComponents = isBos && (subItems.length > 0 || includedNames.length > 0);
                const isExpanded = expandedBosIds.has(item.id || "bos-kit-complete");

                const photoUrl = item.image ? resolveStoreImageUrl(item.image) : null;

                return (
                  <div key={item.id || idx} className="divide-y divide-border/60">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start gap-3.5">
                        {photoUrl ? (
                          <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-border p-1 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden shadow-xs">
                            <img
                              src={photoUrl}
                              alt={item.productName}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isBos ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-primary-soft text-primary"}`}>
                            <Icon size={18} />
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${isBos ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20" : "bg-slate-100 dark:bg-slate-800 text-text-secondary border-border"}`}>
                              {item.componentType}
                            </span>
                            {item.brandName && (
                              <span className="text-[10px] font-bold text-text-primary">
                                {item.brandName}
                              </span>
                            )}
                            {item.skuCode && (
                              <span className="text-[10px] text-text-muted font-mono">
                                ({item.skuCode})
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2 flex-wrap">
                            <span>{item.productName}</span>
                            {isBos && subItems.length > 0 && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                {subItems.length} Verified Components
                              </span>
                            )}
                          </h5>
                          {item.quantity > 0 && (
                            <p className="text-[11px] text-text-secondary">
                              Standard Kit Quantity: <span className="font-semibold text-text-primary">{item.quantity} {item.unit || "Units"}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {hasSubComponents && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id || "bos-kit-complete")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl transition-all border border-purple-500/20 cursor-pointer"
                          >
                            <FiPackage size={13} />
                            <span>{isExpanded ? "Hide Components" : `View ${subItems.length || includedNames.length} Items`}</span>
                            {isExpanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                          </button>
                        )}

                        {item.hasDatasheet && item.datasheetUrl ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => window.open(item.datasheetUrl, "_blank")}
                              leftIcon={<FiExternalLink size={13} />}
                              className="rounded-xl text-xs font-bold"
                              title="Preview PDF in browser tab"
                            >
                              View
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleDownload(item.datasheetUrl, item.productName)}
                              leftIcon={<FiDownload size={13} />}
                              className="rounded-xl text-xs font-bold"
                              title="Download official PDF"
                            >
                              Download
                            </Button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-text-muted text-[11px] font-medium border border-border">
                            <FiInfo size={12} /> {isBos ? "Full Specs in Combined PDF" : "On Request"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expandable BOS Sub-Components Detailed Grid */}
                    {hasSubComponents && isExpanded && (
                      <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 border-t border-border/80 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-text-primary flex items-center gap-1.5">
                            <FaTools className="text-purple-500" /> Complete BOS Bill of Materials (Included in this Kit)
                          </span>
                          <span className="text-[11px] text-text-muted">
                            Total {subItems.length || includedNames.length} Parts Included
                          </span>
                        </div>

                        {subItems.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {subItems.map((comp, cIdx) => {
                              const qty = comp.quantity || comp.qty || 1;
                              const attrSummary = (comp.attributes || [])
                                .map((a) => `${a.name}: ${a.value}`)
                                .slice(0, 2)
                                .join(" • ");

                              return (
                                <div
                                  key={cIdx}
                                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-border flex items-start justify-between gap-2 shadow-2xs hover:border-purple-500/30 transition-all"
                                >
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <FiCheck className="text-emerald-500 shrink-0 text-xs" />
                                      <span className="text-xs font-bold text-text-primary truncate" title={comp.name}>
                                        {comp.name}
                                      </span>
                                    </div>
                                    {comp.skuCode && (
                                      <span className="text-[10px] text-text-muted font-mono block pl-4">
                                        {comp.skuCode}
                                      </span>
                                    )}
                                    {attrSummary && (
                                      <span className="text-[10px] text-text-secondary block pl-4 truncate" title={attrSummary}>
                                        {attrSummary}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-col items-end shrink-0 pl-2">
                                    <span className="text-[11px] font-bold text-primary dark:text-info bg-primary-soft/50 px-2 py-0.5 rounded-md">
                                      x{qty}
                                    </span>
                                    {comp.datasheet && (
                                      <a
                                        href={comp.datasheet}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-blue-600 hover:underline mt-1 inline-flex items-center gap-1 font-semibold"
                                      >
                                        <FiExternalLink size={10} /> PDF
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {includedNames.map((name, nIdx) => (
                              <span
                                key={nIdx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-border text-xs font-medium text-text-secondary shadow-2xs"
                              >
                                <FiCheck className="text-emerald-500 text-xs" /> {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="p-3 bg-primary-soft/40 border border-primary/10 rounded-xl flex items-start gap-2.5 text-xs text-text-secondary">
          <FiAlertCircle className="text-primary shrink-0 mt-0.5" size={15} />
          <p>
            All listed datasheets are official manufacturer documents. Warranty terms, efficiency tolerances, and peak operating curves are strictly governed by manufacturer standards.
          </p>
        </div>
      </div>
    </Dialog>
  );
}

