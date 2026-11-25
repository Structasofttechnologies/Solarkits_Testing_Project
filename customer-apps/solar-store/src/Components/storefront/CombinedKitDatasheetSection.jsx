import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  FaFilePdf,
  FaDownload,
  FaExternalLinkAlt,
  FaSolarPanel,
  FaBolt,
  FaBoxOpen,
  FaCheckCircle,
  FaTable,
  FaShieldAlt,
  FaAward,
  FaChevronDown,
  FaChevronUp
} from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BACKEND_BASE = API_BASE.replace(/\/api\/?$/, "");

const resolveStoreImageUrl = (url) => {
  if (!url || typeof url !== "string" || url.trim() === "") return "";
  if (url.includes("localhost:3001")) return url.replace("localhost:3001", "localhost:5000");
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND_BASE}/${url.startsWith("/") ? url.slice(1) : url}`;
};

const DEFAULT_DESIGN_SETTINGS = {
  table_header_bg: "#1E3A8A",
  table_header_text: "#FFFFFF",
  alternate_row_bg: "#F8FAFC",
  border_color: "#E2E8F0",
  font_family: "Inter, sans-serif",
  cell_padding: "normal",
  section_header_bg: "#F1F5F9",
  column_visibility: {
    component: true,
    specification: true,
    value: true
  },
  column_headings: {
    component: "Component Category",
    specification: "Technical Specification",
    value: "Value / Details"
  },
  column_order: ["component", "specification", "value"]
};

const getCategoryIcon = (category = "") => {
  const lower = category.toLowerCase();
  if (lower.includes("panel") || lower.includes("module")) return FaSolarPanel;
  if (lower.includes("inverter")) return FaBolt;
  return FaBoxOpen;
};

export default function CombinedKitDatasheetSection({ kit }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [designSettings, setDesignSettings] = useState(DEFAULT_DESIGN_SETTINGS);
  const [isExpanded, setIsExpanded] = useState(true);

  const kitId = kit?.id || kit?._id;

  useEffect(() => {
    if (!kitId) return;

    let isMounted = true;
    setLoading(true);

    // Fetch both design settings and combined datasheet in parallel
    Promise.allSettled([
      axios.get(`${API_BASE}/v1/shop/datasheet-settings`).catch(() => null),
      axios.get(`${API_BASE}/v1/shop/combokit/${kitId}/combined-datasheet`).catch(() => null)
    ]).then(([settingsRes, dataRes]) => {
      if (!isMounted) return;

      if (
        settingsRes.status === "fulfilled" &&
        settingsRes.value?.data?.status === "success" &&
        settingsRes.value?.data?.data
      ) {
        setDesignSettings({ ...DEFAULT_DESIGN_SETTINGS, ...settingsRes.value.data.data });
      }

      if (
        dataRes.status === "fulfilled" &&
        dataRes.value?.data?.status === "success" &&
        dataRes.value?.data?.data
      ) {
        const fetchedData = dataRes.value.data.data;
        setData(fetchedData);
        if (fetchedData.designSettings) {
          setDesignSettings(prev => ({ ...prev, ...fetchedData.designSettings }));
        }
      } else {
        setData(buildFallbackFromKit(kit));
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [kitId, kit]);

  // Build fallback data if kit has panel/inverter/BOSKit client-side
  const buildFallbackFromKit = (k) => {
    if (!k) return null;
    const components = [];
    const combinedTable = [];

    if (k.panel) {
      const pSpecs = [
        { specification: "Brand / Manufacturer", value: k.panel.brandName || "Tier-1" },
        { specification: "Quantity", value: `${k.panel.quantity || k.panel.panelCount || 0} Units` },
        { specification: "Capacity", value: k.panel.capacity || `${k.panel.wattage || ""} Wp` }
      ];
      if (k.panel.type) pSpecs.push({ specification: "Technology", value: k.panel.type });
      components.push({
        category: "Solar Panel",
        productName: k.panel.name || `${k.panel.brandName || ""} Solar PV Module`,
        brand: k.panel.brandName || "",
        quantity: k.panel.quantity || k.panel.panelCount || 0,
        datasheetUrl: k.panel.datasheet || null,
        image: k.panel.image || null,
        specifications: pSpecs
      });
      pSpecs.forEach((s) => combinedTable.push({ component: "Solar Panel", ...s }));
    }

    if (k.inverter) {
      const iSpecs = [
        { specification: "Brand / Manufacturer", value: k.inverter.brandName || "Tier-1" },
        { specification: "Capacity / Rating", value: k.inverter.capacity || `${k.inverter.capacityKW || ""} kW` },
        { specification: "Inverter Type", value: k.inverter.type || "Grid-Tied String Inverter" },
        { specification: "Quantity", value: `${k.inverter.quantity || 1} Unit` }
      ];
      components.push({
        category: "Solar Inverter",
        productName: k.inverter.name || `${k.inverter.brandName || ""} Solar Inverter`,
        brand: k.inverter.brandName || "",
        quantity: k.inverter.quantity || 1,
        datasheetUrl: k.inverter.datasheet || null,
        image: k.inverter.image || null,
        specifications: iSpecs
      });
      iSpecs.forEach((s) => combinedTable.push({ component: "Solar Inverter", ...s }));
    }

    if (k.BOSKit) {
      const bSpecs = [];
      const bosItems = k.BOSKit.components || [];
      if (bosItems.length > 0) {
        bSpecs.push({ specification: "BOS Package Scope", value: `Complete Balance of System (${bosItems.length} Components Included)` });
        bSpecs.push({ specification: "Quality Standards", value: "Conforming to MNRE Guidelines, IS 694 & IS/IEC 62305" });
        bosItems.forEach((comp, idx) => {
          const qty = comp.quantity || 1;
          const attrList = (comp.attributes || []).map(a => `${a.name}: ${a.value}`).slice(0, 3).join(', ');
          bSpecs.push({
            specification: comp.name || `BOS Component ${idx + 1}`,
            value: `Qty: x${qty}${comp.skuCode ? ' • SKU: ' + comp.skuCode : ''}${attrList ? ' • ' + attrList : ''}`
          });
        });
      } else {
        bSpecs.push({ specification: "Brand / Kit Code", value: k.BOSKit.name || k.BOSKit.skuCode || "Standard BOS Kit" });
        bSpecs.push({ specification: "Components Count", value: "Complete Installation Kit Included" });
      }

      components.push({
        category: "BOS Kit",
        productName: k.BOSKit.name || "Complete Balance of System (BOS) Package",
        brand: k.BOSKit.brandName || k.BOSKit.brand || "Certified OEM",
        quantity: 1,
        datasheetUrl: k.BOSKit.datasheet || null,
        subComponents: bosItems,
        specifications: bSpecs
      });
      bSpecs.forEach((s) => combinedTable.push({ component: "BOS Kit", ...s }));
    }

    return {
      kit: {
        id: k.id || k._id,
        name: k.kitName || k.name || "Solar ComboKit",
        capacity: k.capacityKW || k.capacity || 0
      },
      components,
      combinedTable
    };
  };

  const currentData = data || buildFallbackFromKit(kit);
  if (!currentData || (!currentData.components?.length && !currentData.combinedTable?.length)) {
    return null;
  }

  const kitTitle = currentData.kit?.name || currentData.kitName || kit?.kitName || kit?.name || "Solar ComboKit";
  const kitCapacity = currentData.kit?.capacity || currentData.capacity || kit?.capacityKW || kit?.capacity;

  // Settings resolution
  const headerBg = designSettings.table_header_bg || "#1E3A8A";
  const headerTextColor = designSettings.table_header_text || designSettings.table_header_text_color || "#FFFFFF";
  const altRowBg = designSettings.alternate_row_bg || "#F8FAFC";
  const borderColor = designSettings.border_color || "#E2E8F0";
  const sectionHeaderBg = designSettings.section_header_bg || "#F1F5F9";
  const fontFamily = designSettings.font_family || "Inter, sans-serif";

  // Column visibility
  const showComponentCol =
    designSettings.column_visibility?.component ?? designSettings.show_component_column ?? true;
  const showSpecCol =
    designSettings.column_visibility?.specification ?? designSettings.show_spec_column ?? true;
  const showValCol =
    designSettings.column_visibility?.value ?? designSettings.show_value_column ?? true;

  // Column headings
  const compColHeading =
    designSettings.column_headings?.component || designSettings.component_col_heading || "Component";
  const specColHeading =
    designSettings.column_headings?.specification || designSettings.spec_col_heading || "Technical Specification";
  const valColHeading =
    designSettings.column_headings?.value || designSettings.value_col_heading || "Value / Details";

  // Padding classes based on setting
  const paddingClass = {
    compact: "py-2 px-3 text-xs",
    normal: "py-3 px-4 text-xs sm:text-sm",
    comfortable: "py-3 px-4 text-xs sm:text-sm",
    spacious: "py-4 px-5 text-sm"
  }[designSettings.cell_padding || "normal"];

  const pdfDownloadUrl = `${API_BASE}/v1/shop/combokit/${kitId}/combined-datasheet-pdf`;

  // Filter individual component datasheets
  const individualDatasheets = (currentData.components || []).filter(
    (c) => Boolean(c.datasheetUrl || c.datasheet)
  );

  return (
    <div className="mt-8 rounded-2xl bg-surface border border-border shadow-sm overflow-hidden transition-all duration-300">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-surface via-surface-hover/50 to-surface border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                <FaTable size={11} />
                Technical Specifications
              </span>
              {kitCapacity && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 text-white">
                  <FaBolt size={10} className="text-amber-400" />
                  {kitCapacity} kW System
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <FaCheckCircle size={10} />
                MNRE & BIS Compliant
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-hover text-text-muted border border-border">
                <FaShieldAlt size={10} />
                Official Datasheet
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
              Combined Technical Datasheet — {kitTitle}
            </h3>
            <p className="text-xs text-text-secondary max-w-2xl">
              Consolidated electrical parameters, mechanical dimensions, and system component specifications aggregated from certified manufacturer datasheets.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
            >
              <FaFilePdf size={14} />
              <span>Download Combined PDF</span>
            </a>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              title={isExpanded ? "Collapse Table" : "Expand Table"}
            >
              {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Individual Component Datasheet Quick Links */}
        {individualDatasheets.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-border/80 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1">
              Individual Component PDFs:
            </span>
            {individualDatasheets.map((comp, idx) => {
              const Icon = getCategoryIcon(comp.category);
              const rawUrl = comp.datasheetUrl || comp.datasheet;
              const fileUrl = rawUrl.startsWith("http")
                ? rawUrl
                : `${BACKEND_BASE}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

              return (
                <a
                  key={idx}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface hover:bg-surface-hover text-text-primary text-xs font-semibold border border-border hover:border-red-500/40 transition-colors shadow-2xs group"
                >
                  <Icon size={12} className="text-primary group-hover:text-red-500 transition-colors" />
                  <span>{comp.category} Datasheet</span>
                  <FaExternalLinkAlt size={9} className="text-text-muted group-hover:text-red-500 transition-colors ml-0.5" />
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Structured Combined Table Section */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Major Equipment Showcase: Solar Panel & Solar Inverter ONLY (Never BOS) */}
          {(() => {
            const panelComp = (currentData.components || []).find(
              (c) => c.category?.toLowerCase().includes("panel") || c.category?.toLowerCase().includes("module")
            );
            const inverterComp = (currentData.components || []).find(
              (c) => c.category?.toLowerCase().includes("inverter")
            );
            const panelImg = panelComp?.image;
            const invImg = inverterComp?.image;

            if (!panelComp && !inverterComp) return null;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {panelComp && (
                  <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-surface to-surface-hover/40 flex items-center gap-4 shadow-2xs">
                    {panelImg ? (
                      <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-border bg-white p-1 flex items-center justify-center">
                        <img
                          src={resolveStoreImageUrl(panelImg)}
                          alt={panelComp.productName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement?.classList.add('hidden');
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 shrink-0 rounded-lg border border-border bg-primary/5 flex items-center justify-center text-primary">
                        <FaSolarPanel size={28} />
                      </div>
                    )}
                    <div className="space-y-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                        Solar PV Module (Panel)
                      </span>
                      <h4 className="text-sm font-black text-text-primary truncate">
                        {panelComp.productName}
                      </h4>
                      <p className="text-xs text-text-secondary">
                        Brand: <span className="font-bold text-text-primary">{panelComp.brand}</span>
                      </p>
                      {panelComp.quantity && (
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Quantity: {panelComp.quantity} Units
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {inverterComp && (
                  <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-surface to-surface-hover/40 flex items-center gap-4 shadow-2xs">
                    {invImg ? (
                      <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-border bg-white p-1 flex items-center justify-center">
                        <img
                          src={resolveStoreImageUrl(invImg)}
                          alt={inverterComp.productName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement?.classList.add('hidden');
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 shrink-0 rounded-lg border border-border bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <FaBolt size={28} />
                      </div>
                    )}
                    <div className="space-y-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Solar Grid-Tied Inverter
                      </span>
                      <h4 className="text-sm font-black text-text-primary truncate">
                        {inverterComp.productName}
                      </h4>
                      <p className="text-xs text-text-secondary">
                        Brand: <span className="font-bold text-text-primary">{inverterComp.brand}</span>
                      </p>
                      {inverterComp.quantity && (
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Quantity: {inverterComp.quantity} Unit
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Detailed Component Breakdown Cards */}
          <div
            className="rounded-xl overflow-hidden border shadow-xs"
            style={{ fontFamily: fontFamily, borderColor: borderColor }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    style={{
                      backgroundColor: headerBg,
                      color: headerTextColor
                    }}
                  >
                    {showComponentCol && (
                      <th
                        className={`${paddingClass} font-black uppercase tracking-wider text-[11px] border-b`}
                        style={{ borderColor: borderColor }}
                      >
                        {compColHeading}
                      </th>
                    )}
                    {showSpecCol && (
                      <th
                        className={`${paddingClass} font-black uppercase tracking-wider text-[11px] border-b`}
                        style={{ borderColor: borderColor }}
                      >
                        {specColHeading}
                      </th>
                    )}
                    {showValCol && (
                      <th
                        className={`${paddingClass} font-black uppercase tracking-wider text-[11px] border-b`}
                        style={{ borderColor: borderColor }}
                      >
                        {valColHeading}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(currentData.components || []).map((comp, compIdx) => {
                    const specs = comp.specifications || [];
                    const Icon = getCategoryIcon(comp.category);

                    return (
                      <React.Fragment key={compIdx}>
                        {/* Section Header Row */}
                        <tr
                          style={{
                            backgroundColor: sectionHeaderBg,
                            color: "#0F172A"
                          }}
                        >
                          <td
                            colSpan={3}
                            className="py-2.5 px-4 font-black text-xs uppercase tracking-wider border-y"
                            style={{ borderColor: borderColor }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                {(comp.category?.toLowerCase().includes("panel") || comp.category?.toLowerCase().includes("module") || comp.category?.toLowerCase().includes("inverter")) && comp.image ? (
                                  <img
                                    src={resolveStoreImageUrl(comp.image)}
                                    alt=""
                                    className="w-5 h-5 rounded-xs object-contain bg-white border border-border shrink-0"
                                  />
                                ) : (
                                  <Icon size={14} className="text-primary" />
                                )}
                                <span>
                                  {comp.category} — {comp.productName}
                                </span>
                              </span>
                              {comp.brand && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/30 border border-border/40">
                                  Brand: {comp.brand} {comp.subComponents?.length ? `• ${comp.subComponents.length} Items Included` : (comp.quantity ? `(x${comp.quantity})` : "")}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Specification Rows */}
                        {specs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className={`${paddingClass} text-text-muted italic border-b`}
                              style={{ borderColor: borderColor }}
                            >
                              Standard manufacturer specification applies.
                            </td>
                          </tr>
                        ) : (
                          specs.map((spec, specIdx) => {
                            const isEven = specIdx % 2 === 1;
                            const rowStyle = isEven ? { backgroundColor: altRowBg } : {};

                            return (
                              <tr
                                key={specIdx}
                                style={rowStyle}
                                className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                              >
                                {showComponentCol && (
                                  <td
                                    className={`${paddingClass} text-text-muted font-medium border-b`}
                                    style={{ borderColor: borderColor }}
                                  >
                                    {specIdx === 0 ? (
                                      <span className="font-bold text-text-primary text-xs">
                                        {comp.category}
                                      </span>
                                    ) : (
                                      <span className="text-text-muted text-[10px]">—</span>
                                    )}
                                  </td>
                                )}

                                {showSpecCol && (
                                  <td
                                    className={`${paddingClass} text-text-primary font-semibold border-b`}
                                    style={{ borderColor: borderColor }}
                                  >
                                    {spec.specification}
                                  </td>
                                )}

                                {showValCol && (
                                  <td
                                    className={`${paddingClass} text-text-primary font-bold border-b`}
                                    style={{ borderColor: borderColor }}
                                  >
                                    {spec.value}
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Standards & Certification Footer */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <FaAward className="text-amber-500 shrink-0" size={15} />
              <span>
                Quality Verified: All components meet Ministry of New and Renewable Energy (MNRE) guidelines and BIS quality certifications.
              </span>
            </div>
            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline shrink-0 text-xs"
            >
              <FaDownload size={11} />
              Download Official PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
