import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { authHeaderObj } from "@/app/authHeader";

import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import PageHeader from "@/components/PageHeader";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import Dialog from "@/components/Dialog";

import {
  FaFilePdf,
  FaCloudUploadAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaEye,
  FaTrash,
  FaSync,
  FaSearch,
  FaShoppingBag,
  FaImage,
  FaBolt,
  FaExternalLinkAlt,
  FaTimes,
  FaFileAlt,
  FaPalette,
  FaDownload,
  FaTable,
  FaSlidersH
} from "react-icons/fa";
import { FiFileText, FiRefreshCw } from "react-icons/fi";
import DatasheetDesignSettings from "./DatasheetDesignSettings";
import CombinedDatasheetPreviewModal from "./CombinedDatasheetPreviewModal";

const API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_KIT_IMAGE =
  "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";

const resolveFileUrl = (url) => {
  if (!url || typeof url !== "string" || url.trim() === "") return "";
  if (url.includes("localhost:3001")) return url.replace("localhost:3001", "localhost:5000");
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_URL.replace(/\/admin-api|\/api/g, "")}/${url.startsWith("/") ? url.slice(1) : url}`;
};

export default function ProductDatasheets({ moduleUniqueId = "ADM_COMBO_KITS" }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isIndia = countryName?.toLowerCase() === "india";
  const baseEndpoint = useMemo(() => {
    return `${API_URL}/combo-kits${isIndia ? "/india" : ""}`;
  }, [isIndia]);

  // Loading & Data State
  const [loading, setLoading] = useState(false);
  const [kits, setKits] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'attached' | 'missing'

  // Per-card file selection and uploading state: { [kitId]: File }
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadingKitId, setUploadingKitId] = useState(null);
  const [replacingKitId, setReplacingKitId] = useState(null);

  // PDF Preview Modal
  const [previewPdf, setPreviewPdf] = useState(null); // { url, title }

  // Delete Confirmation
  const [deleteConfirmKit, setDeleteConfirmKit] = useState(null);
  const [deletingKitId, setDeletingKitId] = useState(null);

  // Active Tab ('kits' | 'design')
  const [activeTab, setActiveTab] = useState("kits");
  const [previewCombinedKitId, setPreviewCombinedKitId] = useState(null);
  const [downloadingPdfKitId, setDownloadingPdfKitId] = useState(null);

  const handleDownloadCombinedPdf = async (kit) => {
    const targetKitId = kit.id || kit._id;
    if (!targetKitId || downloadingPdfKitId) return;
    setDownloadingPdfKitId(targetKitId);

    try {
      const downloadUrl = `${baseEndpoint}/${targetKitId}/combined-datasheet-pdf`;
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
      console.error("Blob download failed, falling back to direct open:", err);
      window.open(`${baseEndpoint}/${targetKitId}/combined-datasheet-pdf`, "_blank");
    } finally {
      setDownloadingPdfKitId(null);
    }
  };

  // Hidden file input refs per kit
  const fileInputRefs = useRef({});

  // Fetch Countries & Combo Kits
  const fetchCountriesAndKits = async () => {
    try {
      setLoading(true);

      // 1. Fetch Countries
      const countryRes = await axios.get(
        `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      ).catch(() => null);

      let targetCountryId = null;
      if (countryRes?.data?.status === "success") {
        const fetchedCountries = countryRes.data.countries || [];
        setCountries(fetchedCountries);

        if (countryName) {
          const match = fetchedCountries.find(
            (c) => c.name?.toLowerCase() === countryName?.toLowerCase()
          );
          if (match) {
            targetCountryId = match.id || match._id;
            setSelectedCountry(targetCountryId);
          }
        } else if (fetchedCountries.length > 0) {
          targetCountryId = fetchedCountries[0].id || fetchedCountries[0]._id;
          setSelectedCountry(targetCountryId);
        }
      }

      // 2. Fetch Combo Kits
      const countryParam = targetCountryId ? `&country_id=${targetCountryId}` : "";
      const kitsUrl = `${baseEndpoint}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false${countryParam}`;
      const res = await axios.get(kitsUrl, { headers: authHeaderObj() });

      if (res.data?.status === "success") {
        setKits(res.data.data || []);
      } else {
        setKits([]);
      }
    } catch (err) {
      console.error("Error fetching combo kits for datasheets:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load combo kits." }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountriesAndKits();
  }, [countryName, baseEndpoint, moduleUniqueId]);

  // Handle local file selection
  const handleFileSelect = (kitId, file) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      dispatch(
        setAlert({
          type: "warning",
          message: "Please select a valid PDF document (.pdf)."
        })
      );
      return;
    }
    // Limit to 20MB
    if (file.size > 20 * 1024 * 1024) {
      dispatch(
        setAlert({
          type: "warning",
          message: "File size exceeds the 20MB limit."
        })
      );
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [kitId]: file }));
  };

  // Upload Datasheet for a specific kit
  const handleUploadDatasheet = async (kitId) => {
    const file = selectedFiles[kitId];
    if (!file) {
      dispatch(setAlert({ type: "warning", message: "Please choose a PDF file to upload." }));
      return;
    }

    setUploadingKitId(kitId);
    try {
      const formData = new FormData();
      formData.append("id", kitId);
      formData.append("datasheet", file);

      const endpoint = `${baseEndpoint}/upload-datasheet?unique_id=${moduleUniqueId}&req_for=edit`;
      const res = await axios.post(endpoint, formData, {
        headers: {
          ...authHeaderObj(),
          "Content-Type": "multipart/form-data"
        }
      });

      if (res.data?.status === "success") {
        const uploadedDatasheetUrl = res.data.data?.datasheet || file.name;
        // Update local kit state immediately
        setKits((prev) =>
          prev.map((k) =>
            (k.id || k._id) === kitId ? { ...k, datasheet: uploadedDatasheetUrl } : k
          )
        );

        // Clear temporary file selection & replace mode
        setSelectedFiles((prev) => {
          const next = { ...prev };
          delete next[kitId];
          return next;
        });
        setReplacingKitId(null);

        dispatch(
          setAlert({
            type: "success",
            message: "Combo Kit datasheet uploaded successfully!"
          })
        );
      } else {
        dispatch(
          setAlert({
            type: "error",
            message: res.data?.message || "Failed to upload datasheet."
          })
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Error occurred while uploading datasheet."
        })
      );
    } finally {
      setUploadingKitId(null);
    }
  };

  // Remove Datasheet
  const handleRemoveDatasheet = async () => {
    if (!deleteConfirmKit) return;
    const kitId = deleteConfirmKit.id || deleteConfirmKit._id;
    setDeletingKitId(kitId);

    try {
      const endpoint = `${baseEndpoint}/remove-datasheet?unique_id=${moduleUniqueId}&req_for=edit`;
      const res = await axios.post(
        endpoint,
        { id: kitId },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        setKits((prev) =>
          prev.map((k) => ((k.id || k._id) === kitId ? { ...k, datasheet: null } : k))
        );
        dispatch(
          setAlert({
            type: "success",
            message: "Datasheet removed from combo kit."
          })
        );
      } else {
        dispatch(
          setAlert({
            type: "error",
            message: res.data?.message || "Failed to remove datasheet."
          })
        );
      }
    } catch (err) {
      console.error("Remove error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to remove datasheet."
        })
      );
    } finally {
      setDeletingKitId(null);
      setDeleteConfirmKit(null);
    }
  };

  // Filtered Kits
  const filteredKits = useMemo(() => {
    return kits.filter((kit) => {
      // 1. Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        kit.name?.toLowerCase().includes(q) ||
        kit.solar_kit_id?.name?.toLowerCase().includes(q) ||
        (kit.base_components || []).some(
          (bc) =>
            bc.brand_id?.brand_name?.toLowerCase().includes(q) ||
            bc.template_id?.name?.toLowerCase().includes(q)
        );

      // 2. Status filter
      let matchStatus = true;
      if (statusFilter === "attached") {
        matchStatus = Boolean(kit.datasheet);
      } else if (statusFilter === "missing") {
        matchStatus = !kit.datasheet;
      }

      return matchSearch && matchStatus;
    });
  }, [kits, searchQuery, statusFilter]);

  // Stats
  const totalKits = kits.length;
  const attachedCount = kits.filter((k) => Boolean(k.datasheet)).length;
  const missingCount = totalKits - attachedCount;
  const percentageAttached = totalKits > 0 ? Math.round((attachedCount / totalKits) * 100) : 0;

  return (
    <div className="min-h-screen space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="ComboKit Datasheets"
        subtitle={`Upload, preview, and manage technical PDF datasheets directly for all configured solar combo kits in ${
          countryName ? countryName.toUpperCase() : "India"
        }.`}
        icon={FaFilePdf}
        stats={[
          {
            label: "Total Kits",
            value: totalKits,
            description: "Configured combo kits"
          },
          {
            label: "Datasheets Attached",
            value: `${attachedCount} / ${totalKits}`,
            description: `${percentageAttached}% coverage complete`
          },
          {
            label: "Missing Datasheets",
            value: missingCount,
            description: "Kits awaiting PDF datasheet"
          }
        ]}
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={FiRefreshCw}
            loading={loading}
            onClick={fetchCountriesAndKits}
            className="cursor-pointer"
          >
            Refresh
          </Button>
        }
      />

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("kits")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "kits"
              ? "bg-primary text-white shadow-xs"
              : "bg-surface hover:bg-surface-hover text-text-muted hover:text-text-primary border border-border/60"
          }`}
        >
          <FaFilePdf size={13} />
          <span>ComboKit Datasheets</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "kits" ? "bg-white/20 text-white" : "bg-bg text-text-muted"
            }`}
          >
            {totalKits}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("design")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "design"
              ? "bg-primary text-white shadow-xs"
              : "bg-surface hover:bg-surface-hover text-text-muted hover:text-text-primary border border-border/60"
          }`}
        >
          <FaPalette size={13} />
          <span>Datasheet Table Design Settings</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-500">
            Live Preview
          </span>
        </button>
      </div>

      {activeTab === "design" ? (
        <DatasheetDesignSettings />
      ) : (
        <>
          {/* Search & Filter Toolbar */}
      <div className="bg-surface p-4 rounded-2xl border border-border/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs pointer-events-none" />
          <input
            type="text"
            placeholder="Search Combo Kits, Blueprints, Brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-bg/60 border border-border rounded-xl focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-text-primary placeholder:text-text-muted/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer text-xs"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-bg/80 border border-border/60 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-surface text-primary shadow-xs font-black"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            All Kits ({totalKits})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("attached")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "attached"
                ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-xs font-black"
                : "text-text-muted hover:text-emerald-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            With Datasheet ({attachedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("missing")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "missing"
                ? "bg-amber-500/10 text-amber-700 border border-amber-500/20 shadow-xs font-black"
                : "text-text-muted hover:text-amber-700"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Missing Datasheet ({missingCount})
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Loading Combo Kits & Datasheets...
          </p>
        </div>
      ) : filteredKits.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <FaFilePdf size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
            No Combo Kits Found
          </h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            {searchQuery
              ? `No combo kits match your search query "${searchQuery}". Try adjusting your filters.`
              : "No combo kits configured for this country yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKits.map((kit) => {
            const kitId = kit.id || kit._id;
            const hasDatasheet = Boolean(kit.datasheet);
            const selectedFile = selectedFiles[kitId];
            const isReplacing = replacingKitId === kitId;
            const isUploading = uploadingKitId === kitId;

            // Extract unique configured brand names
            const bcBrands = (kit.base_components || [])
              .flatMap((bc) => (bc.brand_ids || []).map((b) => b?.brand_name || b))
              .concat((kit.base_components || []).map((bc) => bc.brand_id?.brand_name || bc.brand_id))
              .filter(Boolean);
            const bosBrands = (kit.bos_kits || [])
              .flatMap((bk) => (bk.brand_ids || []).map((b) => b?.brand_name || b))
              .concat((kit.bos_kits || []).map((bk) => bk.brand_id?.brand_name || bk.brand_id))
              .filter(Boolean);
            const allBrands = [...new Set([...bcBrands, ...bosBrands])].map((b) =>
              typeof b === "object" ? b.brand_name || b.name : b
            );

            return (
              <div
                key={kitId}
                className={`bg-surface rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  hasDatasheet
                    ? "border-emerald-500/25 hover:border-emerald-500/40"
                    : "border-border hover:border-border/80"
                }`}
              >
                {/* Card Top: Image, Badges & Header Info */}
                <div>
                  {/* Media Banner */}
                  <div className="relative h-44 w-full bg-surface-hover overflow-hidden border-b border-border/60">
                    <img
                      src={resolveFileUrl(kit.kit_image) || DEFAULT_KIT_IMAGE}
                      alt={kit.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_KIT_IMAGE;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      {/* Country Tag */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                        <FaShoppingBag size={10} className="text-primary" />
                        {kit.country_name || countryName || "India"}
                      </span>

                      {/* Datasheet Status Badge */}
                      {hasDatasheet ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                          <FaCheckCircle size={10} />
                          Datasheet Attached
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/90 text-white shadow-xs">
                          <FaExclamationCircle size={10} />
                          Datasheet Needed
                        </span>
                      )}
                    </div>

                    {/* Bottom Specs on Image */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                        <FaBolt className="text-amber-400" size={11} />
                        {kit.capacity ? `${kit.capacity} kW Capacity` : "Standard System"}
                      </span>
                    </div>
                  </div>

                  {/* Kit Title & Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-text-primary uppercase tracking-wide leading-snug line-clamp-2">
                        {kit.name}
                      </h4>
                      <p className="text-[10px] text-text-muted mt-1 font-bold uppercase tracking-wider line-clamp-1">
                        Blueprint: {kit.solar_kit_id?.name || "Standard Solar Blueprint"}
                      </p>
                    </div>

                    {/* Configured Brands */}
                    {allBrands.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                          Configured Brands:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {allBrands.slice(0, 3).map((brand, bIdx) => (
                            <span
                              key={bIdx}
                              className="bg-emerald-500/10 text-emerald-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-emerald-500/20"
                            >
                              {brand}
                            </span>
                          ))}
                          {allBrands.length > 3 && (
                            <span className="text-[9px] text-text-muted font-bold self-center">
                              +{allBrands.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Datasheet Upload & Management Section */}
                <div className="p-4 pt-0 space-y-3">
                  {/* Auto-Generated Combined Kit Datasheet Section */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <FaTable size={12} />
                        Combined Kit Datasheet
                      </span>
                      <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        Auto-Generated
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-tight">
                      Aggregates component specifications into a styled table with full layout & design options.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewCombinedKitId(kitId)}
                        className="flex-1 py-1.5 px-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <FaEye size={11} />
                        Preview Table
                      </button>
                      <button
                        type="button"
                        disabled={downloadingPdfKitId === kitId}
                        onClick={() => handleDownloadCombinedPdf(kit)}
                        className="py-1.5 px-3 bg-surface hover:bg-surface-hover border border-border hover:border-primary/50 text-text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                        title="Download Generated Combined PDF"
                      >
                        {downloadingPdfKitId === kitId ? (
                          <div className="w-2.5 h-2.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : (
                          <FaDownload size={10} className="text-primary" />
                        )}
                        PDF
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/80 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-text-primary">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                        <FaFilePdf
                          className={hasDatasheet ? "text-red-500" : "text-text-muted"}
                          size={13}
                        />
                        Manual Attached PDF
                      </span>
                      {hasDatasheet && (
                        <span className="text-[9px] text-emerald-700 font-black uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>

                    {/* If datasheet is already attached and not in replace mode */}
                    {hasDatasheet && !isReplacing ? (
                      <div className="space-y-2">
                        <div className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-between transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                              <FaFilePdf size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-text-primary truncate">
                                {kit.name}.pdf
                              </p>
                              <p className="text-[9px] text-text-muted font-bold truncate">
                                PDF Document Attached
                              </p>
                            </div>
                          </div>

                          {/* Quick View Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPdf({
                                url: resolveFileUrl(kit.datasheet),
                                title: `${kit.name} — Technical Datasheet`
                              })
                            }
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-2xs"
                            title="View PDF"
                          >
                            <FaEye size={10} />
                            View
                          </button>
                        </div>

                        {/* Replace / Remove Action Row */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setReplacingKitId(kitId);
                              if (fileInputRefs.current[kitId]) {
                                fileInputRefs.current[kitId].value = "";
                              }
                            }}
                            className="flex-1 text-[10px] cursor-pointer"
                          >
                            Replace PDF
                          </Button>

                          <IconButton
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteConfirmKit(kit)}
                            title="Remove Datasheet"
                            className="cursor-pointer"
                          >
                            <FaTrash size={11} />
                          </IconButton>
                        </div>
                      </div>
                    ) : (
                      /* Upload / Replace Area */
                      <div className="space-y-2">
                        {/* Hidden file input */}
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          ref={(el) => (fileInputRefs.current[kitId] = el)}
                          onChange={(e) => handleFileSelect(kitId, e.target.files?.[0])}
                          className="hidden"
                        />

                        {selectedFile ? (
                          /* File Selected Confirmation Box */
                          <div className="bg-primary/5 border border-primary/25 rounded-xl p-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <FaFilePdf className="text-red-500 shrink-0" size={16} />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-text-primary truncate">
                                    {selectedFile.name}
                                  </p>
                                  <p className="text-[9px] text-text-muted">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFiles((prev) => {
                                    const next = { ...prev };
                                    delete next[kitId];
                                    return next;
                                  });
                                  if (fileInputRefs.current[kitId]) {
                                    fileInputRefs.current[kitId].value = "";
                                  }
                                }}
                                className="text-text-muted hover:text-red-500 cursor-pointer p-1"
                              >
                                <FaTimes size={12} />
                              </button>
                            </div>

                            {/* Upload & Cancel Buttons */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                loading={isUploading}
                                onClick={() => handleUploadDatasheet(kitId)}
                                className="flex-1 text-[10px] cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                              >
                                <FaCloudUploadAlt size={12} className="mr-1" />
                                {isReplacing ? "Save Replacement" : "Upload Datasheet"}
                              </Button>
                              {isReplacing && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setReplacingKitId(null);
                                    setSelectedFiles((prev) => {
                                      const next = { ...prev };
                                      delete next[kitId];
                                      return next;
                                    });
                                  }}
                                  className="text-[10px] cursor-pointer"
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Dropzone Box */
                          <div
                            onClick={() => fileInputRefs.current[kitId]?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const file = e.dataTransfer.files?.[0];
                              handleFileSelect(kitId, file);
                            }}
                            className="group border border-dashed border-border hover:border-primary/60 bg-bg/50 hover:bg-primary/5 rounded-xl p-4 text-center cursor-pointer transition-all duration-200"
                          >
                            <div className="w-8 h-8 mx-auto rounded-lg bg-surface flex items-center justify-center text-text-muted group-hover:text-primary transition-colors shadow-2xs">
                              <FaCloudUploadAlt size={16} />
                            </div>
                            <p className="mt-1.5 text-[11px] font-bold text-text-primary group-hover:text-primary transition-colors">
                              {isReplacing
                                ? "Click to pick replacement PDF"
                                : "Upload PDF Datasheet"}
                            </p>
                            <p className="text-[9px] text-text-muted">
                              Drop PDF file here (max 20MB)
                            </p>

                            {isReplacing && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplacingKitId(null);
                                }}
                                className="mt-2 inline-block text-[10px] text-text-muted hover:text-text-primary underline cursor-pointer"
                              >
                                Cancel Replace
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewPdf && (
        <Dialog
          isOpen={Boolean(previewPdf)}
          onClose={() => setPreviewPdf(null)}
          title={previewPdf.title || "Datasheet Preview"}
          size="4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FaFilePdf className="text-red-500" size={18} />
                <span className="text-xs font-bold text-text-primary">
                  {previewPdf.title}
                </span>
              </div>
              <a
                href={previewPdf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
              >
                <FaExternalLinkAlt size={11} />
                Open in New Tab
              </a>
            </div>

            {/* Embedded PDF Viewer */}
            <div className="w-full h-[70vh] bg-surface-hover rounded-xl overflow-hidden border border-border flex items-center justify-center">
              <iframe
                src={previewPdf.url}
                title={previewPdf.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </Dialog>
      )}

          {/* Delete Confirmation Popup */}
          {deleteConfirmKit && (
            <ConfirmationPopup
              isOpen={Boolean(deleteConfirmKit)}
              onClose={() => setDeleteConfirmKit(null)}
              onConfirm={handleRemoveDatasheet}
              loading={deletingKitId === (deleteConfirmKit.id || deleteConfirmKit._id)}
              title="Remove Datasheet"
              message={`Are you sure you want to remove the technical datasheet for "${deleteConfirmKit.name}"? Customers will no longer be able to view or download it on the Solar Store.`}
              confirmText="Yes, Remove"
              confirmVariant="danger"
            />
          )}

          {/* Combined Datasheet Preview Modal */}
          <CombinedDatasheetPreviewModal
            isOpen={Boolean(previewCombinedKitId)}
            onClose={() => setPreviewCombinedKitId(null)}
            kitId={previewCombinedKitId}
            isIndia={isIndia}
          />
        </>
      )}
    </div>
  );
}
