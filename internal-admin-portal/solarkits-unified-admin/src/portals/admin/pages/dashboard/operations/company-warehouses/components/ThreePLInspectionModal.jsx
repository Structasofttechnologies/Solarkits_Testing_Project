import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import CustomInput from "@/components/CustomInput";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiImage,
  FiCamera,
  FiFileText,
  FiCalendar,
  FiUser,
  FiTruck,
  FiShield,
  FiUploadCloud,
  FiTrash2,
  FiLink,
  FiSave,
  FiCheck,
  FiLayers,
  FiBox
} from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

const PHOTO_CATEGORIES = [
  { key: "front_exterior", label: "Exterior / Front View", desc: "Main entrance, building facade & signage" },
  { key: "main_storage", label: "Main Storage Hall", desc: "Flooring, lighting & primary covered storage area" },
  { key: "product_racks", label: "Product Storage Racks", desc: "Installed racking systems and pallet slots" },
  { key: "loading_unloading", label: "Loading & Unloading Dock", desc: "Truck ramp, shutter gates & dock levelers" },
  { key: "office_security", label: "Office & CCTV Security", desc: "Guard cabin, CCTV camera coverage & fire safety" }
];

export default function ThreePLInspectionModal({ warehouse, isOpen, onClose, onSuccess, moduleUniqueId }) {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeImageTab, setActiveImageTab] = useState("front_exterior");
  const [urlInput, setUrlInput] = useState("");

  // Facility Capacity & Infrastructure state (Admin editable)
  const [facilitySpecs, setFacilitySpecs] = useState({
    warehouse_area_sqft: "",
    storage_type: "indoor",
    max_weight_capacity_kg: "",
    max_pallet_capacity: "",
    max_volume_cbf: ""
  });

  // Physical features toggles
  const [facilities, setFacilities] = useState({
    loading_facility: true,
    unloading_facility: true,
    racks_installed: true,
    cctv_surveillance: true,
    fire_safety: true
  });

  // 5-Category Images state
  const [categorizedImages, setCategorizedImages] = useState({
    front_exterior: "",
    main_storage: "",
    product_racks: "",
    loading_unloading: "",
    office_security: ""
  });

  // Inspection audit record state
  const [inspectionData, setInspectionData] = useState({
    inspector_name: "Admin Operations Lead",
    inspection_date: new Date().toISOString().split("T")[0],
    inspection_type: "physical",
    inspection_remarks: "",
    inspection_report_url: ""
  });

  // Helper to extract clean image string
  const normalizeImg = (val) => {
    if (!val) return "";
    if (Array.isArray(val)) return val.filter(Boolean)[0] || "";
    return String(val);
  };

  // Sync state whenever warehouse prop changes
  useEffect(() => {
    if (warehouse) {
      setFacilitySpecs({
        warehouse_area_sqft: warehouse.warehouse_area_sqft || "",
        storage_type: warehouse.storage_type || "indoor",
        max_weight_capacity_kg: warehouse.max_weight_capacity_kg || "",
        max_pallet_capacity: warehouse.max_pallet_capacity || "",
        max_volume_cbf: warehouse.max_volume_cbf || ""
      });

      const f = warehouse.facilities || {};
      setFacilities({
        loading_facility: Boolean(f.loading_facility ?? true),
        unloading_facility: Boolean(f.unloading_facility ?? true),
        racks_installed: Boolean(f.racks_installed ?? true),
        cctv_surveillance: Boolean(f.cctv_surveillance ?? true),
        fire_safety: Boolean(f.fire_safety ?? true)
      });

      const ci = warehouse.categorized_images || {};
      const baseImages = {
        front_exterior: normalizeImg(ci.front_exterior || ci.exterior),
        main_storage: normalizeImg(ci.main_storage || ci.storage),
        product_racks: normalizeImg(ci.product_racks || ci.racks),
        loading_unloading: normalizeImg(ci.loading_unloading || ci.loading_area),
        office_security: normalizeImg(ci.office_security || ci.security)
      };

      // Fallback to warehouse.images if categorized_images is empty
      const hasAnyCat = Object.values(baseImages).some(Boolean);
      if (!hasAnyCat && Array.isArray(warehouse.images) && warehouse.images.length > 0) {
        baseImages.front_exterior = warehouse.images[0] || "";
        baseImages.main_storage = warehouse.images[1] || warehouse.images[0] || "";
        baseImages.product_racks = warehouse.images[2] || warehouse.images[0] || "";
        baseImages.loading_unloading = warehouse.images[3] || warehouse.images[0] || "";
        baseImages.office_security = warehouse.images[4] || warehouse.images[0] || "";
      }

      setCategorizedImages(baseImages);

      const insp = warehouse.inspection_details || {};
      setInspectionData({
        inspector_name: insp.inspector_name || "Admin Operations Lead",
        inspection_date: insp.inspection_date
          ? new Date(insp.inspection_date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        inspection_type: insp.inspection_type || "physical",
        inspection_remarks: insp.inspection_remarks || "",
        inspection_report_url: insp.inspection_report_url || ""
      });

      setUrlInput("");
    }
  }, [warehouse, isOpen]);

  if (!warehouse) return null;

  // Local File Upload Handler -> Base64
  const handleLocalImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      dispatch(setAlert({
        type: "warning",
        message: "File exceeds 10MB limit. Please select a smaller image."
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCategorizedImages(prev => ({
        ...prev,
        [activeImageTab]: event.target.result
      }));
      dispatch(setAlert({
        type: "success",
        message: "Photo uploaded & attached."
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset file input
  };

  // URL Attachment Handler
  const handleAttachUrl = () => {
    if (!urlInput.trim()) return;
    setCategorizedImages(prev => ({
      ...prev,
      [activeImageTab]: urlInput.trim()
    }));
    setUrlInput("");
    dispatch(setAlert({
      type: "success",
      message: "Photo URL attached."
    }));
  };

  // Remove Photo Handler
  const handleRemovePhoto = (catKey) => {
    setCategorizedImages(prev => ({
      ...prev,
      [catKey]: ""
    }));
    dispatch(setAlert({
      type: "info",
      message: "Photo removed."
    }));
  };

  // Submission Handler (supports update_only, passed, failed, re_inspection_required)
  const handleDecision = async (decisionResult) => {
    if ((decisionResult === "failed" || decisionResult === "re_inspection_required") && !inspectionData.inspection_remarks.trim()) {
      dispatch(setAlert({
        type: "warning",
        message: "Please enter inspection remarks explaining the decision."
      }));
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        inspector_name: inspectionData.inspector_name,
        inspection_date: inspectionData.inspection_date,
        inspection_type: inspectionData.inspection_type,
        inspection_remarks: inspectionData.inspection_remarks,
        inspection_report_url: inspectionData.inspection_report_url,
        result: decisionResult,
        // Facility specs updated by Admin
        warehouse_area_sqft: Number(facilitySpecs.warehouse_area_sqft) || 0,
        storage_type: facilitySpecs.storage_type,
        max_weight_capacity_kg: Number(facilitySpecs.max_weight_capacity_kg) || 0,
        max_pallet_capacity: Number(facilitySpecs.max_pallet_capacity) || 0,
        max_volume_cbf: Number(facilitySpecs.max_volume_cbf) || 0,
        facilities,
        categorized_images: categorizedImages
      };

      const res = await axios.post(
        `${API}/warehouses/${warehouse.id}/inspection?unique_id=${moduleUniqueId}&req_for=edit`,
        payload,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: res.data.message || (decisionResult === "update_only" ? "Facility details updated successfully." : `3PL warehouse inspection recorded as ${decisionResult}.`)
        }));
        if (onSuccess) onSuccess();
        if (decisionResult !== "update_only") {
          onClose();
        }
      }
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to submit 3PL inspection."
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const currentCategory = PHOTO_CATEGORIES.find(c => c.key === activeImageTab) || PHOTO_CATEGORIES[0];
  const activeImage = categorizedImages[activeImageTab];
  const attachedCount = PHOTO_CATEGORIES.filter(c => Boolean(categorizedImages[c.key])).length;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="3PL Warehouse – Details, Inspection & Verification"
      size="lg"
    >
      <div className="space-y-6 max-h-[78vh] overflow-y-auto pr-1">
        {/* Warehouse & Vendor Summary Card */}
        <div className="bg-surface-elevated/80 border border-border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-text-primary">
                {warehouse.warehouse_name || warehouse.warehouse_code}
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                3PL Facility
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${warehouse.is_active
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                }`}>
                {warehouse.is_active ? "Verified & Active" : "Pending Verification"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Vendor: <span className="font-semibold text-text-primary">{warehouse.vendor_name || "Logistics Vendor"}</span> • Location: {warehouse.district || warehouse.district_name}, {warehouse.state || warehouse.state_name} ({warehouse.pincode})
            </p>
          </div>

          <div className="text-left md:text-right text-xs bg-surface/60 p-2 rounded-xl border border-border/60">
            <span className="text-text-muted block">Configured Capacity:</span>
            <span className="font-bold text-text-primary">
              {facilitySpecs.warehouse_area_sqft || 0} sq.ft. • {facilitySpecs.storage_type}
            </span>
          </div>
        </div>

        {/* 1. Facility Capacity & Infrastructure (Admin Editable) */}
        <div className="border border-border rounded-2xl p-4 bg-surface space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <FiLayers className="w-4 h-4 text-primary" />
              Facility Capacity & Infrastructure Specifications
            </h4>
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
              Admin Managed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Warehouse Area (sq. ft.)
              </label>
              <input
                type="number"
                min="0"
                value={facilitySpecs.warehouse_area_sqft}
                onChange={(e) => setFacilitySpecs(prev => ({ ...prev, warehouse_area_sqft: e.target.value }))}
                placeholder="e.g. 15000"
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary shadow-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Storage Type
              </label>
              <select
                value={facilitySpecs.storage_type}
                onChange={(e) => setFacilitySpecs(prev => ({ ...prev, storage_type: e.target.value }))}
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary shadow-xs"
              >
                <option value="indoor">Indoor Covered Warehouse</option>
                <option value="outdoor">Open Yard / Solar Yard</option>
                <option value="mixed">Mixed (Covered + Open Yard)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Max Payload Weight (kg)
              </label>
              <input
                type="number"
                min="0"
                value={facilitySpecs.max_weight_capacity_kg}
                onChange={(e) => setFacilitySpecs(prev => ({ ...prev, max_weight_capacity_kg: e.target.value }))}
                placeholder="e.g. 50000"
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary shadow-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Max Pallet Capacity (slots)
              </label>
              <input
                type="number"
                min="0"
                value={facilitySpecs.max_pallet_capacity}
                onChange={(e) => setFacilitySpecs(prev => ({ ...prev, max_pallet_capacity: e.target.value }))}
                placeholder="e.g. 500"
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary shadow-xs"
              />
            </div>
          </div>

          {/* Physical Facilities Checklist Switches */}
          <div className="pt-2 border-t border-border/60">
            <label className="text-xs font-semibold text-text-secondary block mb-2">
              Physical Facility Features Verified On-Site:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                { key: "loading_facility", label: "Loading Ramp" },
                { key: "unloading_facility", label: "Unloading Bay" },
                { key: "racks_installed", label: "Pallet Racks" },
                { key: "cctv_surveillance", label: "24x7 CCTV" },
                { key: "fire_safety", label: "Fire Safety" }
              ].map((fac) => {
                const checked = Boolean(facilities[fac.key]);
                return (
                  <button
                    key={fac.key}
                    type="button"
                    onClick={() => setFacilities(prev => ({ ...prev, [fac.key]: !prev[fac.key] }))}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${checked
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                      : "bg-surface-elevated/40 border-border text-text-muted hover:border-border/80"
                      }`}
                  >
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${checked
                      ? "bg-emerald-600 border-emerald-600 text-white font-bold"
                      : "border-border bg-surface"
                      }`}>
                      {checked ? "✓" : ""}
                    </span>
                    <span className="truncate">{fac.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Mandatory 5-Category Physical Photographs (Upload & Manage) */}
        <div className="border border-border rounded-2xl p-4 bg-surface space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <FiCamera className="w-4 h-4 text-primary" />
              Mandatory 5-Category Physical Photographs
            </h4>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${attachedCount === 5
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
              }`}>
              {attachedCount} / 5 Attached
            </span>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-2.5">
            {PHOTO_CATEGORIES.map((cat) => {
              const hasImg = Boolean(categorizedImages[cat.key]);
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveImageTab(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${activeImageTab === cat.key
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface-elevated text-text-secondary hover:text-text-primary border border-border/60"
                    }`}
                >
                  {hasImg ? (
                    <FiCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                  {cat.label}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-text-muted italic">
            {currentCategory.desc}
          </p>

          {/* Photo Preview & Upload Canvas */}
          <div className="rounded-xl border border-border/80 bg-surface-elevated/40 p-4">
            {activeImage ? (
              <div className="space-y-3">
                <div className="h-64 rounded-xl border border-border overflow-hidden bg-black/5 flex items-center justify-center relative">
                  <img
                    src={activeImage}
                    alt={currentCategory.label}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <span className="text-[11px] font-semibold bg-emerald-600 text-white px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                      <FiCheck className="w-3 h-3" /> Attached
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(activeImageTab)}
                      className="text-[11px] font-semibold bg-red-600 text-white px-2.5 py-1 rounded-lg shadow-sm hover:bg-red-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <FiTrash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Photo saved for {currentCategory.label}</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Replace Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 px-4 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <FiUploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    No photograph attached for {currentCategory.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Admin can upload an on-site photo or paste an image URL to verify facility readiness.
                  </p>
                </div>

                {/* Upload or URL Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-lg mx-auto">
                  {/* Option 1: File Upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLocalImageUpload}
                    className="hidden"
                    id={`file-upload-${activeImageTab}`}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto font-semibold"
                  >
                    <FiUploadCloud className="w-3.5 h-3.5 mr-1.5" />
                    Upload from Device
                  </Button>

                  <span className="text-xs text-text-muted font-bold">OR</span>

                  {/* Option 2: Image URL */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto flex-1">
                    <input
                      type="text"
                      placeholder="Paste Image URL (https://...)"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAttachUrl()}
                      className="h-9 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary flex-1 shadow-xs"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAttachUrl}
                      className="font-semibold"
                    >
                      <FiLink className="w-3.5 h-3.5 mr-1" />
                      Attach
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Inspection Form */}
        <div className="border border-border rounded-2xl p-4 bg-surface space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <FiShield className="w-4 h-4 text-primary" />
              Inspection Audit Record
            </h4>
            <span className="text-[10px] text-text-muted">
              Audit log for 3PL facility activation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CustomInput
              label="Inspector Name"
              value={inspectionData.inspector_name}
              onChange={(e) => setInspectionData(prev => ({ ...prev, inspector_name: e.target.value }))}
              placeholder="e.g. Operations Lead, Solarkits"
            />

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Inspection Type
              </label>
              <select
                value={inspectionData.inspection_type}
                onChange={(e) => setInspectionData(prev => ({ ...prev, inspection_type: e.target.value }))}
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary shadow-xs"
              >
                <option value="physical">Physical Site Visit</option>
                <option value="virtual">Virtual Live Video Audit</option>
              </select>
            </div>

            <CustomInput
              label="Inspection Date"
              type="date"
              value={inspectionData.inspection_date}
              onChange={(e) => setInspectionData(prev => ({ ...prev, inspection_date: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Inspection Remarks & Capacity Observations
            </label>
            <textarea
              rows={3}
              value={inspectionData.inspection_remarks}
              onChange={(e) => setInspectionData(prev => ({ ...prev, inspection_remarks: e.target.value }))}
              placeholder="Record remarks on storage racks, security, floor load capacity, loading ramp accessibility, and safety compliance..."
              className="w-full p-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary shadow-xs"
            />
          </div>

          <CustomInput
            label="Inspection Report / Signed Checklist Link (Optional)"
            value={inspectionData.inspection_report_url}
            onChange={(e) => setInspectionData(prev => ({ ...prev, inspection_report_url: e.target.value }))}
            placeholder="https://drive.google.com/report.pdf or internal document link"
          />
        </div>

        {/* Modal Action Controls */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDecision("update_only")}
              disabled={submitting}
              className="border-primary/40 text-primary hover:bg-primary/10 font-semibold"
            >
              <FiSave className="w-3.5 h-3.5 mr-1" />
              Save Facility Details
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDecision("failed")}
              disabled={submitting}
              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
            >
              <FiXCircle className="w-3.5 h-3.5 mr-1" />
              Reject Facility
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDecision("re_inspection_required")}
              disabled={submitting}
              className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
            >
              <FiAlertTriangle className="w-3.5 h-3.5 mr-1" />
              Request Re-inspection
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleDecision("passed")}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/20 font-bold"
            >
              <FiCheckCircle className="w-3.5 h-3.5 mr-1" />
              Pass & Verify Warehouse
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
