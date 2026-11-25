import React, { useState, useEffect } from "react";
import axios from "axios";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import {
  FaFilePdf,
  FaDownload,
  FaExternalLinkAlt,
  FaSolarPanel,
  FaBolt,
  FaBoxOpen,
  FaCheckCircle,
  FaSync
} from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

const resolvePreviewImageUrl = (url) => {
  if (!url || typeof url !== "string" || url.trim() === "") return "";
  if (url.includes("localhost:3001")) return url.replace("localhost:3001", "localhost:5000");
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_URL.replace(/\/admin-api|\/api/g, "")}/${url.startsWith("/") ? url.slice(1) : url}`;
};

const getCategoryIcon = (category = "") => {
  const lower = category.toLowerCase();
  if (lower.includes("panel") || lower.includes("module")) return FaSolarPanel;
  if (lower.includes("inverter")) return FaBolt;
  return FaBoxOpen;
};

export default function CombinedDatasheetPreviewModal({
  isOpen,
  onClose,
  kitId,
  isIndia = true
}) {
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const fetchCombinedData = async () => {
    if (!kitId) return;
    setLoading(true);
    setError("");
    try {
      const endpoint = `${API_URL}/combo-kits${isIndia ? "/india" : ""}/${kitId}/combined-datasheet`;
      const res = await axios.get(endpoint, { headers: authHeaderObj() });
      if (res.data?.status === "success" && res.data?.data) {
        setData(res.data.data);
      } else {
        setError(res.data?.message || "Failed to load combined datasheet.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch combined kit datasheet information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && kitId) {
      fetchCombinedData();
    } else {
      setData(null);
    }
  }, [isOpen, kitId]);

  if (!isOpen) return null;

  const kit = data?.kit || {};
  const components = data?.components || [];
  const combinedTable = data?.combinedTable || [];
  const designSettings = data?.designSettings || {};

  const handleDownloadPdf = async () => {
    if (!kitId || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const downloadUrl = `${API_URL}/combo-kits${isIndia ? "/india" : ""}/${kitId}/combined-datasheet-pdf`;
      const res = await axios.get(downloadUrl, {
        headers: authHeaderObj(),
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${(kit.name || "ComboKit").replace(/[^a-zA-Z0-9_-]/g, "_")}_Combined_Datasheet.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Blob download failed, opening direct window:", err);
      const downloadUrl = `${API_URL}/combo-kits${isIndia ? "/india" : ""}/${kitId}/combined-datasheet-pdf`;
      window.open(downloadUrl, "_blank");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Helper for padding
  const getPaddingClass = () => {
    switch (designSettings.cell_padding) {
      case "compact": return "py-1.5 px-3";
      case "relaxed": return "py-3.5 px-5";
      default: return "py-2.5 px-4";
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Combined Kit Datasheet & Specification Preview"
      size="xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <FaSync className="animate-spin text-primary mx-auto" size={28} />
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Compiling specifications from all mapped products...
            </p>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-bold text-red-500">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchCombinedData}>
              Try Again
            </Button>
          </div>
        ) : data ? (
          <>
            {/* Kit Overview Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                    {kit.capacity || 0} kW ComboKit
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1 border border-emerald-500/20">
                    <FaCheckCircle size={10} /> Auto-Generated from Products
                  </span>
                </div>
                <h3 className="text-base font-black text-text-primary">{kit.name}</h3>
                <p className="text-xs text-text-secondary">
                  Consolidated multi-component datasheet table using active Admin design settings.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="danger"
                  loading={downloadingPdf}
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
                >
                  <FaDownload size={11} /> Download Combined PDF
                </Button>
              </div>
            </div>

            {/* Mapped Component Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {components.map((comp, idx) => {
                const IconComponent = getCategoryIcon(comp.category);
                const isPanel = comp.category?.toLowerCase().includes("panel") || comp.category?.toLowerCase().includes("module");
                const isInverter = comp.category?.toLowerCase().includes("inverter");
                const showPhoto = (isPanel || isInverter) && Boolean(comp.image);
                const imageUrl = showPhoto ? resolvePreviewImageUrl(comp.image) : "";

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-surface rounded-xl border border-border flex flex-col justify-between space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <IconComponent size={12} /> {comp.category}
                        </span>
                        <span className="text-[10px] bg-surface-hover px-1.5 py-0.5 rounded text-text-muted font-bold">
                          Qty: {comp.quantity}
                        </span>
                      </div>

                      {/* Configured Product Photo: ONLY Panel & Inverter (Never BOS) */}
                      {showPhoto && imageUrl && (
                        <div className="mb-2.5 h-32 w-full rounded-lg overflow-hidden border border-border/80 bg-slate-50 dark:bg-slate-900/40 p-2 flex items-center justify-center relative group">
                          <img
                            src={imageUrl}
                            alt={comp.productName}
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement?.classList.add('hidden');
                            }}
                          />
                          <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                            {isPanel ? "Solar Panel" : "Inverter"}
                          </span>
                        </div>
                      )}

                      <h4 className="text-xs font-bold text-text-primary line-clamp-1">{comp.productName}</h4>
                      <p className="text-[10px] text-text-secondary">Brand: {comp.brand}</p>
                      {comp.model && (
                        <p className="text-[9px] font-mono text-text-muted mt-0.5 line-clamp-1">SKU: {comp.model}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[10px]">
                      <span className="text-text-muted font-medium">
                        {comp.specifications?.length || 0} specs mapped
                      </span>
                      {comp.datasheetUrl ? (
                        <a
                          href={comp.datasheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 font-bold hover:underline flex items-center gap-1"
                        >
                          <FaFilePdf size={10} /> Datasheet PDF
                        </a>
                      ) : (
                        <span className="text-text-muted italic">No PDF</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Styled Combined Technical Specification Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                  Structured Kit Datasheet Table
                </h4>
                <span className="text-[10px] font-bold text-text-muted">
                  Total Rows: {combinedTable.length}
                </span>
              </div>

              <div
                className="overflow-hidden overflow-x-auto shadow-xs"
                style={{
                  borderRadius: designSettings.border_radius || "12px",
                  border: `${designSettings.border_thickness || "1px"} solid ${designSettings.border_color || "#E2E8F0"}`,
                  backgroundColor: designSettings.table_bg || "#FFFFFF",
                  fontFamily: designSettings.font_family || "Inter"
                }}
              >
                <table
                  className="w-full text-left"
                  style={{
                    fontSize: designSettings.font_size || "13px",
                    color: designSettings.text_color || "#1E293B"
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: designSettings.table_header_bg || "#1E3A8A",
                        color: designSettings.table_header_text || "#FFFFFF",
                        fontSize: designSettings.heading_size || "15px"
                      }}
                    >
                      {designSettings.column_visibility?.component !== false && (
                        <th className={`font-bold ${getPaddingClass()}`}>
                          {designSettings.column_headings?.component || "Component Category"}
                        </th>
                      )}
                      {designSettings.column_visibility?.specification !== false && (
                        <th className={`font-bold ${getPaddingClass()}`}>
                          {designSettings.column_headings?.specification || "Technical Specification"}
                        </th>
                      )}
                      {designSettings.column_visibility?.value !== false && (
                        <th className={`font-bold ${getPaddingClass()}`}>
                          {designSettings.column_headings?.value || "Value / Details"}
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {components.map((comp, cIdx) => (
                      <React.Fragment key={cIdx}>
                        {designSettings.show_section_title !== false && (
                          <tr
                            style={{
                              backgroundColor: designSettings.section_header_bg || "#F1F5F9",
                              borderBottom: `${designSettings.border_thickness || "1px"} solid ${designSettings.border_color || "#E2E8F0"}`
                            }}
                          >
                            <td
                              colSpan={3}
                              className={`font-black uppercase tracking-wider text-[11px] ${getPaddingClass()}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {designSettings.section_heading_style === "accent-bar" && (
                                    <span className="w-1.5 h-3.5 bg-primary rounded-full" />
                                  )}
                                  {(comp.category?.toLowerCase().includes("panel") || comp.category?.toLowerCase().includes("module") || comp.category?.toLowerCase().includes("inverter")) && comp.image && (
                                    <img
                                      src={resolvePreviewImageUrl(comp.image)}
                                      alt=""
                                      className="w-5 h-5 rounded-xs object-contain bg-white border border-border shrink-0"
                                    />
                                  )}
                                  <span>{comp.category}</span>
                                  {designSettings.show_product_name !== false && (
                                    <span className="text-text-muted font-normal lowercase">
                                      — {comp.productName}
                                    </span>
                                  )}
                                </div>
                                {designSettings.show_brand_name !== false && (
                                  <span className="text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded border border-border">
                                    Brand: {comp.brand} {comp.subComponents?.length ? `• ${comp.subComponents.length} Items Included` : ""}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}

                        {comp.specifications?.map((spec, rIdx) => {
                          const isAlt = rIdx % 2 === 1;
                          const rowBg = isAlt
                            ? designSettings.alternate_row_bg || "#F8FAFC"
                            : designSettings.table_bg || "#FFFFFF";
                          return (
                            <tr
                              key={rIdx}
                              style={{
                                backgroundColor: rowBg,
                                borderBottom: `${designSettings.border_thickness || "1px"} solid ${designSettings.border_color || "#E2E8F0"}`
                              }}
                            >
                              {designSettings.column_visibility?.component !== false && (
                                <td className={`text-text-muted text-[11px] font-medium ${getPaddingClass()}`}>
                                  {comp.category}
                                </td>
                              )}
                              {designSettings.column_visibility?.specification !== false && (
                                <td className={`font-bold ${getPaddingClass()}`}>
                                  {spec.specification}
                                </td>
                              )}
                              {designSettings.column_visibility?.value !== false && (
                                <td className={getPaddingClass()}>{spec.value}</td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-end pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
