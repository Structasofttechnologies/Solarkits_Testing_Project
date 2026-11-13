import React, { useEffect, useState } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import {
  FiChevronLeft,
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiMapPin,
  FiGlobe,
  FiStar,
  FiGitBranch,
  FiArchive,
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiAlertTriangle,
  FiPlus,
  FiEdit2,
  FiPlay,
  FiHome,
  FiTruck
} from "react-icons/fi";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import Loader from "@/components/Loader";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import RenderIfPermission from "@/components/PermissionCheck";

const CircleProgressBar = ({ percentage, size = 120, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-border/40 dark:stroke-border/20"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-primary transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-text-primary">{percentage}%</span>
        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Completed</span>
      </div>
    </div>
  );
};

export default function WarehouseDetails({ moduleUniqueId }) {
  const { warehouseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [warehouse, setWarehouse] = useState(null);
  const [sections, setSections] = useState([]);
  const [fields, setFields] = useState([]);
  const [submittedData, setSubmittedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const API = import.meta.env.VITE_API_URL;

  const fetchData = async () => {
    try {
      setLoading(true);
      const resWarehouse = await axios.get(`${API}/warehouses/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } });
      setWarehouse(resWarehouse.data.warehouse);

      const resSections = await axios.get(`${API}/warehouses/validation/sections/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } });
      const sectionsData = resSections.data.sections;
      setSections(sectionsData);

      let allFields = [];
      const initialExpanded = {};
      for (const section of sectionsData) {
        initialExpanded[section.id] = true; // Expand all sections by default
        const resFields = await axios.get(`${API}/warehouses/validation/sections/${warehouseId}/${section.id}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } });
        const fieldsWithSectionId = resFields.data.fields.map(f => ({ ...f, section_id: section.id }));
        allFields = [...allFields, ...fieldsWithSectionId];
      }
      setFields(allFields);
      setExpandedSections(initialExpanded);

      // Extract submitted data from fields
      const dataMap = {};
      allFields.forEach(f => {
        dataMap[f.id] = f.value;
      });
      setSubmittedData(dataMap);
    } catch (error) {
      console.error(error);
      dispatch(setAlert({ type: "error", message: "Failed to fetch warehouse details" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [warehouseId]);

  const handleAction = async (status, reason = null) => {
    try {
      setActionLoading(true);
      const payload = {
        warehouse_id: warehouseId,
        status: status,
        ...(reason && { rejection_reason: reason })
      };

      const res = await axios.post(`${API}/warehouses/validation/change-status?unique_id=${moduleUniqueId}&req_for=edit`, payload, { headers: { ...authHeaderObj() } });

      if (res.data.status === "success") {
        dispatch(setAlert({ type: "success", message: res.data.message }));
        setShowRejectModal(false);
        setRejectReason("");
        fetchData(); // Reload details
      }
    } catch (error) {
      dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Action failed." }));
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getRemainingTime = (dueDateStr) => {
    if (!dueDateStr) return "";
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffMs = due - now;
    if (diffMs <= 0) return "Overdue";

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `${diffDays}d remaining`;
    if (diffHours > 0) return `${diffHours}h remaining`;
    return `${diffMins}m remaining`;
  };

  const validationStatus = {
    1: { label: "Pending Validation Setup", color: "bg-slate-500/10 text-slate-600 border-slate-500/20", icon: FiClock },
    2: { label: "Awaiting Information", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: FiClock },
    3: { label: "In Review", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: FiFileText },
    4: { label: "Verified", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: FiCheckCircle },
    5: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: FiXCircle }
  };

  const renderFieldValue = (field, value) => {
    if (!value) return <span className="text-text-muted italic text-xs">Not provided</span>;

    switch (field.field_type) {
      case 'dropdown':
      case 'single_line_input':
      case 'multi_line_input':
      case 'number':
      case 'email':
        return <span className="text-text-primary text-sm font-semibold whitespace-pre-wrap">{value}</span>;
      case 'multi_select_dropdown':
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return <span className="text-text-primary text-sm font-semibold">{parsed.join(", ")}</span>;
        } catch (e) { }
        return <span className="text-text-primary text-sm font-semibold">{value}</span>;
      case 'checkbox':
      case 'yesno':
        return <span className="text-text-primary text-sm font-semibold">{value === 'true' || value === true || value === 'yes' ? 'Yes' : 'No'}</span>;
      case 'date':
        return <span className="text-text-primary text-sm font-semibold">{new Date(value).toLocaleDateString()}</span>;
      case 'file':
      case 'multiple_files':
        try {
          const files = typeof value === 'string' ? JSON.parse(value) : value;
          if (Array.isArray(files)) {
            return (
              <div className="flex flex-col gap-2 mt-1">
                {files.map((f, i) => {
                  let fileName = `Document ${i + 1}`;
                  let fileUrl = "";
                  let fileSize = "";

                  const rawBase = import.meta.env.VITE_WAREHOUSE_API_URL || 'http://localhost:3005';
                  const warehouseBaseUrl = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
                  const getSafeUrl = (p) => p.startsWith('http') ? p : `${warehouseBaseUrl}${p.startsWith('/') ? '' : '/'}${p}`;

                  if (typeof f === "string") {
                    fileName = f.split('/').pop() || fileName;
                    fileUrl = getSafeUrl(f);
                  } else if (typeof f === "object" && f !== null) {
                    fileName = f.name || fileName;
                    fileSize = f.size ? `(${(f.size / 1024).toFixed(1)} KB)` : '';
                    fileUrl = f.path ? getSafeUrl(f.path) : '';
                  }

                  const isImage = fileUrl && fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;

                  if (isImage) {
                    return (
                      <div key={i} className="border border-border rounded-xl overflow-hidden max-w-[240px] shadow-sm">
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="block relative group">
                          <img src={fileUrl} alt={fileName} className="h-32 w-full object-cover group-hover:opacity-90 transition-opacity" title={fileName} />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold bg-black/60 px-2.5 py-1 rounded-full">View Image</span>
                          </div>
                        </a>
                      </div>
                    );
                  }

                  const finalUrl = fileUrl || `${warehouseBaseUrl}/uploads/${fileName}`;

                  return (
                    <a key={i} href={finalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 p-3 bg-surface hover:bg-surface-hover border border-border rounded-xl max-w-sm cursor-pointer transition-colors shadow-xs">
                      <FiFileText className="text-primary w-5 h-5 shrink-0" />
                      <span className="text-xs text-primary font-bold truncate" title={fileName}>{fileName}</span>
                      {fileSize && <span className="text-[10px] text-text-muted shrink-0">{fileSize}</span>}
                    </a>
                  );
                })}
              </div>
            );
          }
        } catch (e) {
          return <span className="text-text-primary text-sm font-semibold">{value}</span>;
        }
        return <span className="text-text-primary text-sm font-semibold">{value}</span>;
      default:
        return <span className="text-text-primary text-sm font-semibold">{value}</span>;
    }
  };

  if (loading) return <Loader text="Loading warehouse details..." />;

  if (!warehouse) return <div className="p-6 text-center text-text-secondary">Warehouse not found.</div>;

  const currentStatus = validationStatus[warehouse.status_id] || { label: "Unknown", color: "bg-slate-500/10 text-slate-600 border-slate-500/20", icon: FiClock };
  const StatusIcon = currentStatus.icon;

  return (
    <div className="space-y-6 relative pb-12">
      <PageHeader
        title="Warehouse Profile Details"
        subtitle={`Viewing full information for ${warehouse.warehouse_code}`}
        icon={FiArchive}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => navigate(-1)}
              variant="secondary"
              leftIcon={<FiChevronLeft />}
            >
              Back
            </Button>
            <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="edit">
              <Button
                onClick={() => navigate(`/admin-panel/operations/company-warehouses/${warehouse.id}/profile-validations`)}
                variant="primary"
                leftIcon={<FiEdit2 />}
              >
                Profile Setup
              </Button>
            </RenderIfPermission>
          </div>
        }
      />

      {/* Grid for Quick Stats & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Onboarding & Verification Progress */}
        <div className="card bg-surface border border-border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row lg:flex-col items-center justify-center gap-6 shadow-sm">
          <CircleProgressBar percentage={warehouse.profile_completion_percentage || 0} />

          <div className="text-center md:text-left lg:text-center space-y-2 flex-1">
            <h4 className="font-black text-text-primary text-lg">Onboarding Status</h4>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${currentStatus.color}`}>
              <StatusIcon className="w-4 h-4 shrink-0" />
              <span>{currentStatus.label}</span>
            </div>

            {warehouse.due_date && (warehouse.status_id === 2 || warehouse.status_id === 5) && (
              <p className="text-xs text-text-secondary font-medium">
                Deadline: <span className="text-warning font-semibold">{new Date(warehouse.due_date).toLocaleDateString()}</span> ({getRemainingTime(warehouse.due_date)})
              </p>
            )}
          </div>
        </div>

        {/* Action Controls for Admin */}
        <div className="card bg-surface border border-border rounded-3xl p-6 md:p-8 lg:col-span-2 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
          <div className="space-y-4">
            <h3 className="text-xl font-black text-text-primary flex items-center gap-2">
              <FiShield className="text-primary" /> Admin Verification Panel
            </h3>

            {warehouse.status_id === 3 ? (
              <p className="text-sm text-text-secondary leading-relaxed font-medium">
                This warehouse profile is submitted and waiting for review. You can inspect the fields completed below, and click the buttons to either verify or reject the profile.
              </p>
            ) : (
              <p className="text-sm text-text-secondary leading-relaxed font-medium">
                The manager is currently editing details. Administrative actions are disabled until the profile is submitted for review (when it reaches 100% completion or deadline overdue).
              </p>
            )}

            {warehouse.status_id === 5 && warehouse.rejection_reason && (
              <div className="bg-danger/5 border border-danger/20 rounded-2xl p-4 flex items-start gap-3 mt-2">
                <FiAlertTriangle className="text-danger w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-danger uppercase tracking-wider mb-1">Previous Rejection Reason</h4>
                  <p className="text-xs text-text-primary font-medium leading-relaxed">{warehouse.rejection_reason}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-border/60">
            {warehouse.status_id === 3 ? (
              <>
                <Button
                  onClick={() => setShowRejectModal(true)}
                  variant="danger"
                  leftIcon={<FiXCircle />}
                  disabled={actionLoading}
                  className="flex-1 max-w-xs"
                >
                  Reject & Re-open
                </Button>
                <Button
                  onClick={() => handleAction(4)}
                  variant="success"
                  leftIcon={<FiCheckCircle />}
                  disabled={actionLoading}
                  className="flex-1 max-w-xs"
                >
                  Approve & Verify
                </Button>
              </>
            ) : (
              <div className="text-xs text-text-muted font-bold flex items-center gap-1.5 py-1 px-4 bg-bg rounded-xl border border-border/80">
                <FiClock className="animate-pulse" /> Action buttons will be active after profile submission.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Warehouse Metadata */}
        <div className="card bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm">
          <h3 className="text-lg font-black text-text-primary mb-6 flex items-center gap-2">
            <FiArchive className="text-primary" /> Warehouse Specifications
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-bg/50 p-4 rounded-2xl border border-border/50">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Warehouse Code</p>
              <p className="font-bold text-sm text-text-primary mt-1">{warehouse.warehouse_code || "-"}</p>
            </div>

            <div className="bg-bg/50 p-4 rounded-2xl border border-border/50">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Warehouse Type</p>
              <div className="mt-1">
                {warehouse.warehouse_type === "company" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <FiHome className="w-3 h-3 text-emerald-500" /> Company Warehouse
                  </span>
                ) : warehouse.warehouse_type === "3pl" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    <FiTruck className="w-3 h-3 text-primary" /> 3PL Warehouse
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-bg text-text-secondary border border-border">
                    {warehouse.warehouse_type === "master" ? "Master Hub" : warehouse.warehouse_type === "sub" ? "Sub Facility" : "Facility"}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-bg/50 p-4 rounded-2xl border border-border/50 sm:col-span-2">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Address</p>
              <p className="font-semibold text-xs text-text-primary mt-1 flex items-start gap-1.5">
                <FiMapPin className="text-primary w-4 h-4 shrink-0 mt-0.5" />
                <span>{warehouse.address || "-"}</span>
              </p>
            </div>

            <div className="bg-bg/50 p-4 rounded-2xl border border-border/50">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pincode</p>
              <p className="font-semibold text-xs text-text-primary mt-1">{warehouse.pincode || "-"}</p>
            </div>

            <div className="bg-bg/50 p-4 rounded-2xl border border-border/50">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Coordinates</p>
              <p className="font-semibold text-xs text-text-primary mt-1 flex items-center gap-1.5">
                <FiGlobe className="text-primary w-4 h-4 shrink-0" />
                <span>{warehouse.lat ? `${Number(warehouse.lat).toFixed(5)}°N, ${Number(warehouse.lng).toFixed(5)}°E` : "-"}</span>
              </p>
            </div>

            <div className="bg-bg/50 p-4 rounded-2xl border border-border/50 sm:col-span-2">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">District, State & Country</p>
              <p className="font-semibold text-xs text-text-primary mt-1 flex items-center gap-1.5">
                <FiMapPin className="text-primary w-4 h-4 shrink-0" />
                <span>{warehouse.district}, {warehouse.state}, {warehouse.country}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Manager Metadata */}
        <div className="card bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black text-text-primary mb-6 flex items-center gap-2">
              <FiUser className="text-primary" /> Warehouse Manager Details
            </h3>
            {warehouse.manager ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-bg/50 border border-border/50 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <FiUser className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Full Name</p>
                    <p className="font-bold text-sm text-text-primary mt-0.5">{warehouse.manager.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-bg/50 border border-border/50 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <FiMail className="text-primary w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Email Address</p>
                    <p className="font-semibold text-xs text-text-primary mt-0.5 truncate">{warehouse.manager.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-bg/50 border border-border/50 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <FiPhone className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Phone Number</p>
                    <p className="font-semibold text-xs text-text-primary mt-0.5">{warehouse.manager.phone_code} {warehouse.manager.phone}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-bg/50 border border-dashed border-border rounded-3xl">
                <FiUser className="text-text-muted w-10 h-10 mb-3" />
                <p className="text-sm text-text-secondary font-bold">No Manager Assigned</p>
                <p className="text-xs text-text-muted max-w-xs mt-1">Please edit the warehouse location to assign a manager.</p>
              </div>
            )}
          </div>

          {warehouse.manager && (
            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-text-muted font-semibold">Login Portal Access Status:</span>
              <span className={`font-bold uppercase tracking-wider px-3 py-1 rounded-full text-[10px] border ${warehouse.manager.is_verified
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}>
                {warehouse.manager.is_verified ? "Verified & Configured" : "Passcode Setup Pending"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Warehouse Photos Section */}
      {warehouse.images && warehouse.images.length > 0 && (
        <div className="card bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm">
          <h3 className="text-lg font-black text-text-primary mb-6 flex items-center gap-2">
            <FiArchive className="text-primary" /> Warehouse Photos
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {warehouse.images.map((imgPath, idx) => {
              const rawBase = import.meta.env.VITE_WAREHOUSE_API_URL || 'http://localhost:3005';
              const warehouseBaseUrl = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
              const fullUrl = imgPath.startsWith('http') ? imgPath : `${warehouseBaseUrl}${imgPath.startsWith('/') ? '' : '/'}${imgPath}`;
              return (
                <div key={idx} className="border border-border rounded-xl overflow-hidden shadow-sm aspect-video bg-bg flex items-center justify-center relative group">
                  <a href={fullUrl} target="_blank" rel="noreferrer" className="w-full h-full block">
                    <img
                      src={fullUrl}
                      alt={`Warehouse photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold bg-black/60 px-2.5 py-1 rounded-full">View Photo</span>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submitted Validation Questionnaire Data */}
      <div className="card bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm">
        <h3 className="text-lg font-black text-text-primary mb-6 flex items-center gap-2">
          <FiFileText className="text-primary" /> Profile Questionnaire Checklist Data
        </h3>

        {sections.length === 0 ? (
          <div className="text-center py-12 bg-bg border border-dashed border-border rounded-2xl">
            <p className="text-sm text-text-secondary font-bold">No checklist validation sections set up yet.</p>
            <p className="text-xs text-text-muted mt-1">Go to "Profile Setup" to select fields required for verification.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map(section => {
              const sectionFields = fields.filter(f => f.section_id === section.id);
              if (sectionFields.length === 0) return null;

              const isExpanded = expandedSections[section.id];

              return (
                <div key={section.id} className="border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full bg-surface-hover/50 hover:bg-surface-hover px-6 py-4 border-b border-border flex items-center justify-between text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-3.5 bg-primary rounded-full" />
                      <h4 className="font-bold text-base text-text-primary">{section.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-text-muted uppercase bg-bg border border-border px-2.5 py-1 rounded-lg">
                      {sectionFields.length} {sectionFields.length === 1 ? "field" : "fields"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-bg/10">
                      {sectionFields.map(field => {
                        const hasValue = submittedData[field.id] !== undefined && submittedData[field.id] !== null && String(submittedData[field.id]).trim() !== '';
                        return (
                          <div key={field.id} className={`p-4 rounded-2xl border transition-all ${hasValue
                              ? "bg-surface border-border/80"
                              : "bg-bg/40 border-border/40 border-dashed"
                            }`}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                {field.label || field.name}
                              </p>
                              {field.is_enabled === false && (
                                <span className="text-[8px] font-bold text-text-muted uppercase bg-bg px-1.5 py-0.5 rounded border border-border">Disabled</span>
                              )}
                            </div>
                            <div className="mt-1">
                              {renderFieldValue(field, submittedData[field.id])}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <ConfirmationPopup
        isOpen={showRejectModal}
        title="Reject Profile Submission"
        message="Please specify why this profile is being rejected. The warehouse manager will see this note and can resubmit updated information."
        mode="custom"
        variant="danger"
        isLoading={actionLoading}
        confirmText="Confirm Rejection"
        cancelText="Cancel"
        onConfirm={() => handleAction(5, rejectReason)}
        onCancel={() => setShowRejectModal(false)}
        confirmButtonProps={{ disabled: !rejectReason.trim() }}
        customContent={
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Type rejection reason here..."
            className="w-full h-32 bg-bg border border-border rounded-xl p-4 focus:border-danger focus:ring-1 focus:ring-danger outline-none resize-none text-sm text-text-primary placeholder:text-text-muted"
          />
        }
      />
    </div>
  );
}
