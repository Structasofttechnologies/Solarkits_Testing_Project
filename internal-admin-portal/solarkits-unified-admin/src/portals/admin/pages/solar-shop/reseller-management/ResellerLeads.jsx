import { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiEye,
  FiPhone,
  FiMail,
  FiMapPin,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiAlertCircle,
  FiDownload,
  FiPlus,
  FiTrash2,
  FiMessageSquare,
  FiExternalLink,
  FiCopy,
  FiCheck,
  FiX,
  FiFileText,
  FiBriefcase,
  FiLayers,
  FiSend,
  FiRefreshCw,
  FiLoader,
  FiShield,
  FiImage,
  FiCamera,
  FiMaximize2,
  FiInfo,
  FiGlobe,
  FiUserCheck,
  FiUser,
  FiPhoneCall,
  FiPhoneForwarded,
} from "react-icons/fi";
import { FaWhatsapp, FaBuilding } from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "RSL_MGMT";
const STORAGE_KEY = "solarkits_crm_leads";

// Initial realistic seed leads matching the form structure
const INITIAL_DEMO_LEADS = [
  {
    id: "LEAD-1724213890101",
    actionType: "franchise_apply",
    selectedSolution: "Header Fast Application",
    fullName: "Ramesh Chandra",
    businessName: "Chandra Solar & Electricals",
    mobileNumber: "9876543210",
    whatsappNumber: "9876543210",
    email: "ramesh@chandrasolar.com",
    gstin: "27AAAAA0000A1Z5",
    state: "Maharashtra",
    district: "Pune",
    pincode: "411001",
    cluster_name: "Pune Region",
    cluster_code: "CLU-MA-004",
    cluster_districts: ["Pune", "Kolhapur", "Sangli", "Satara", "Solapur"],
    businessProfile: "Solar EPC Contractor",
    expectedOrderQty: "1 - 3 Kits / Month",
    notes: "Looking for 550W Mono PERC DCR kits with 5kW-10kW On-grid inverters. Target MSEDCL rooftop scheme.",
    shop_photos: [
      "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&auto=format&fit=crop&q=80",
    ],
    consent: true,
    status: "NEW",
    submittedAt: "2026-08-21T08:30:00.000Z",
    adminRemarks: "New application from Pune. High intent for rooftop EPC supply.",
  },
  {
    id: "LEAD-1724213890102",
    actionType: "franchise_apply",
    selectedSolution: "District Franchisee Plan",
    fullName: "Suresh Sharma",
    businessName: "Sharma Power & Green Energy",
    mobileNumber: "9823456789",
    whatsappNumber: "9823456789",
    email: "suresh@sharmapower.in",
    gstin: "24AAACS1234F1Z8",
    state: "Gujarat",
    district: "Surat",
    pincode: "395007",
    cluster_name: "Surat & South Gujarat",
    cluster_code: "CLU-GJ-002",
    cluster_districts: ["Surat", "Navsari", "Valsad", "Tapi", "Bharuch"],
    businessProfile: "Solar Retailer",
    expectedOrderQty: "4 - 10 Kits / Month (Growth)",
    notes: "Requires exclusive district distribution rights for Surat & Navsari. Ready with commercial warehouse.",
    shop_photos: [
      "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=80",
    ],
    consent: true,
    status: "IN_REVIEW",
    submittedAt: "2026-08-20T14:15:00.000Z",
    adminRemarks: "Initial call done. Sent product catalog and franchise terms document.",
  },
  {
    id: "LEAD-1724213890103",
    actionType: "franchise_apply",
    selectedSolution: "State Franchisee Plan",
    fullName: "Vikram Malhotra",
    businessName: "V-Tech Energy Solutions Pvt Ltd",
    mobileNumber: "9811122334",
    whatsappNumber: "9811122334",
    email: "vikram@vtechenergy.com",
    gstin: "07AABCV5678G1Z2",
    state: "Delhi",
    district: "New Delhi",
    pincode: "110001",
    cluster_name: "Delhi-NCR Master Territory",
    cluster_code: "CLU-DL-001",
    cluster_districts: ["New Delhi", "North Delhi", "South Delhi", "West Delhi"],
    businessProfile: "Hardware & Electrical Distributor",
    expectedOrderQty: "10+ Kits / Month",
    notes: "Interested in state master dealership and sub-dealer network deployment across Delhi-NCR.",
    shop_photos: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&auto=format&fit=crop&q=80",
    ],
    consent: true,
    status: "APPROVED_CONVERTED",
    submittedAt: "2026-08-19T11:00:00.000Z",
    adminRemarks: "Agreement signed, onboarding completed into Franchisee Accounts.",
  },
  {
    id: "LEAD-1724213890104",
    actionType: "franchise_apply",
    selectedSolution: "Header Fast Application",
    fullName: "Pooja Reddy",
    businessName: "Reddy Solar Systems",
    mobileNumber: "9988776655",
    whatsappNumber: "9988776655",
    email: "pooja@reddysolar.co.in",
    gstin: "36AAECR9988H1ZV",
    state: "Telangana",
    district: "Hyderabad",
    pincode: "500034",
    cluster_name: "Hyderabad Metropolitan",
    cluster_code: "CLU-TS-001",
    cluster_districts: ["Hyderabad", "Rangareddy", "Medchal-Malkajgiri"],
    businessProfile: "Rooftop Solar Installer",
    expectedOrderQty: "1 - 3 Kits / Month",
    notes: "Interested in residential 3kW/5kW hybrid kits with Lithium battery storage.",
    shop_photos: [
      "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=900&auto=format&fit=crop&q=80",
    ],
    consent: true,
    status: "CONTACTED",
    submittedAt: "2026-08-18T16:45:00.000Z",
    adminRemarks: "WhatsApp introduction sent. Awaiting quotation confirmation.",
  },
  {
    id: "LEAD-1724213890105",
    actionType: "franchise_apply",
    selectedSolution: "District Franchisee Plan",
    fullName: "Anand Kumar Verma",
    businessName: "Verma Electricals & Solar",
    mobileNumber: "9456123789",
    whatsappNumber: "9456123789",
    email: "anand.verma@gmail.com",
    gstin: "09AAFFV4433K1Z3",
    state: "Uttar Pradesh",
    district: "Lucknow",
    pincode: "226010",
    cluster_name: "Central UP Cluster",
    cluster_code: "CLU-UP-001",
    cluster_districts: ["Lucknow", "Kanpur Nagar", "Unnao", "Barabanki"],
    businessProfile: "Electrical Trader",
    expectedOrderQty: "1 - 3 Kits / Month",
    notes: "Looking to expand retail shop with complete Solar Kits inventory.",
    shop_photos: [],
    consent: true,
    status: "NEW",
    submittedAt: "2026-08-21T06:20:00.000Z",
    adminRemarks: "Fresh lead from UP. Assign to North Regional Manager.",
  },
];

const STATUS_CONFIG = {
  ALL: { label: "All Leads", color: "bg-surface-hover text-text-primary" },
  NEW: { label: "New Lead", bg: "bg-danger-soft", text: "text-danger", border: "border-danger/20", icon: FiAlertCircle },
  GST_VERIFIED: { label: "GST Verified", bg: "bg-primary-soft", text: "text-primary", border: "border-primary/20", icon: FiShield },
  CONTACTED: { label: "Contacted", bg: "bg-info-soft", text: "text-info", border: "border-info/20", icon: FiClock },
  IN_REVIEW: { label: "In Review", bg: "bg-warning-soft", text: "text-warning", border: "border-warning/20", icon: FiClock },
  APPROVED_CONVERTED: { label: "Approved & Converted", bg: "bg-success-soft", text: "text-success", border: "border-success/20", icon: FiCheckCircle },
  REJECTED: { label: "Rejected", bg: "bg-surface-hover", text: "text-text-muted", border: "border-border", icon: FiXCircle },
};

const BUSINESS_PROFILES = [
  "Solar EPC Contractor",
  "Solar Retailer",
  "Electrical Trader",
  "Rooftop Solar Installer",
  "Hardware & Electrical Distributor",
  "System Integrator",
  "New Solar Entrepreneur",
];

const ORDER_VOLUMES = [
  "1 - 3 Kits / Month (Starter)",
  "4 - 10 Kits / Month (Growth)",
  "10+ Kits / Month (Enterprise)",
];

const INDIAN_STATES = [
  "Maharashtra",
  "Gujarat",
  "Rajasthan",
  "Delhi",
  "Uttar Pradesh",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Madhya Pradesh",
  "Haryana",
  "Punjab",
  "Kerala",
  "West Bengal",
  "Odisha",
  "Bihar",
  "Andhra Pradesh",
];

export default function ResellerLeads() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  // Approval Modal State
  const [approveLead, setApproveLead] = useState(null);
  const [approvalPassword, setApprovalPassword] = useState("SolarKits@2026");
  const [approvalCommercialMode, setApprovalCommercialMode] = useState("commission");
  const [approving, setApproving] = useState(false);

  // Load leads from localStorage + demo seeds as initial cache
  const [leads, setLeads] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error reading local leads:", e);
    }
    return INITIAL_DEMO_LEADS;
  });


  const [bdes, setBdes] = useState([]);

  // Fetch leads from backend API
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/resellers/leads/list?req_for=view&unique_id=${MODULE_UID}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success" && Array.isArray(res.data.data?.leads)) {
        setLeads(res.data.data.leads);
        if (Array.isArray(res.data.data?.bdes)) {
          setBdes(res.data.data.bdes);
        }
      }
    } catch (err) {
      console.warn("Live leads fetch note, using cached leads:", err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Save to localStorage when state updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch (e) {
      console.warn("Error saving leads to localStorage:", e);
    }
  }, [leads]);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL"); // 'ALL' | 'bde' | 'website' | 'manual'
  const [bdeFilter, setBdeFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [clusterFilter, setClusterFilter] = useState("ALL");
  const [profileFilter, setProfileFilter] = useState("ALL");

  // Derive available franchise clusters dynamically from inquiries (optionally filtered by selected state)
  const availableClusters = useMemo(() => {
    const list = [];
    const seen = new Set();
    leads.forEach((l) => {
      const cName = l.cluster_name || l.clusterName;
      const cCode = l.cluster_code || l.clusterCode;
      if (cName && !seen.has(cName)) {
        if (stateFilter === "ALL" || (l.state && l.state.toLowerCase() === stateFilter.toLowerCase())) {
          seen.add(cName);
          list.push({ name: cName, code: cCode, state: l.state });
        }
      }
    });
    return list;
  }, [leads, stateFilter]);

  // When state filter changes, ensure cluster filter remains valid
  useEffect(() => {
    if (clusterFilter !== "ALL" && !availableClusters.some((c) => c.name === clusterFilter || c.code === clusterFilter)) {
      setClusterFilter("ALL");
    }
  }, [stateFilter, availableClusters, clusterFilter]);

  // Selected lead for detail view modal
  const [selectedLead, setSelectedLead] = useState(null);
  const [adminPhotoPreview, setAdminPhotoPreview] = useState(null);

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    businessName: "",
    mobileNumber: "",
    whatsappNumber: "",
    email: "",
    gstin: "",
    state: "Maharashtra",
    district: "",
    pincode: "",
    cluster_name: "",
    cluster_code: "",
    businessProfile: "Solar EPC Contractor",
    expectedOrderQty: "",
    selectedSolution: "Header Fast Application",
    notes: "",
    consent: true,
  });

  // Copy helper
  const [copiedId, setCopiedId] = useState(null);
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    dispatch(setAlert({ type: "info", message: `Copied "${text}" to clipboard` }));
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Assign BDE Modal State & Handlers ─────────────────────────────────────
  const [assignModalLead, setAssignModalLead] = useState(null);
  const [selectedBdeId, setSelectedBdeId] = useState("");
  const [assignRemarks, setAssignRemarks] = useState("");
  const [assigning, setAssigning] = useState(false);

  const handleOpenAssignModal = (lead) => {
    setAssignModalLead(lead);
    setSelectedBdeId(lead.bde_id || lead.bde?.id || lead.bde?._id || "");
    setAssignRemarks("");
  };

  const handleConfirmAssignBde = async (e) => {
    if (e) e.preventDefault();
    if (!assignModalLead) return;

    if (!selectedBdeId) {
      dispatch(setAlert({ type: "error", message: "Please select a BDE Executive to assign this lead" }));
      return;
    }

    setAssigning(true);
    try {
      const leadId = assignModalLead.id || assignModalLead._id;
      const res = await axios.put(
        `${API_BASE}/resellers/leads/${leadId}/assign-bde?req_for=edit&unique_id=${MODULE_UID}`,
        {
          bde_id: selectedBdeId,
          remarks: assignRemarks.trim(),
        },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success" || res.data?.success) {
        const assignedBdeObj = bdes.find((b) => (b._id || b.id) === selectedBdeId) || res.data?.data?.bde;
        const bdeName = assignedBdeObj?.full_name || assignedBdeObj?.fullName || "BDE";

        const updatedBdeData = {
          id: selectedBdeId,
          fullName: assignedBdeObj?.full_name || assignedBdeObj?.fullName || "BDE Executive",
          bdeId: assignedBdeObj?.bde_id || assignedBdeObj?.bdeId || "",
          mobile: assignedBdeObj?.mobile_number || assignedBdeObj?.mobile || "",
          email: assignedBdeObj?.email || "",
        };

        setLeads((prev) =>
          prev.map((l) => {
            if ((l.id || l._id) === leadId) {
              return {
                ...l,
                bde_id: selectedBdeId,
                bde: updatedBdeData,
                is_bde_lead: true,
              };
            }
            return l;
          })
        );

        if (selectedLead && (selectedLead.id || selectedLead._id) === leadId) {
          setSelectedLead((prev) => ({
            ...prev,
            bde_id: selectedBdeId,
            bde: updatedBdeData,
            is_bde_lead: true,
          }));
        }

        dispatch(
          setAlert({
            type: "success",
            message: `Lead successfully assigned to ${bdeName}! Notification sent to BDE panel.`,
          })
        );
        setAssignModalLead(null);
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to assign lead" }));
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || err.message || "Failed to assign lead to BDE",
        })
      );
    } finally {
      setAssigning(false);
    }
  };

  // Status Change Handler
  const handleStatusChange = async (leadId, newStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => ({ ...prev, status: newStatus }));
    }

    try {
      await axios.put(
        `${API_BASE}/resellers/leads/${leadId}/status?req_for=edit&unique_id=${MODULE_UID}`,
        { status: newStatus },
        { headers: authHeaderObj() }
      );
    } catch (err) {
      console.warn("Status update API note:", err?.message);
    }

    dispatch(
      setAlert({
        type: "success",
        message: `Lead status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
      })
    );
  };

  // Admin Remark Save Handler
  const handleSaveRemarks = async (leadId, remarks) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, adminRemarks: remarks } : l))
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => ({ ...prev, adminRemarks: remarks }));
    }

    try {
      await axios.put(
        `${API_BASE}/resellers/leads/${leadId}/status?req_for=edit&unique_id=${MODULE_UID}`,
        { admin_remarks: remarks },
        { headers: authHeaderObj() }
      );
    } catch (err) {
      console.warn("Remarks save API note:", err?.message);
    }

    dispatch(setAlert({ type: "success", message: "Admin remarks saved" }));
  };

  // Delete Lead Handler
  const handleDeleteLead = async (leadId) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      setLeads((prev) => prev.filter((l) => (l.id || l._id) !== leadId));
      if ((selectedLead?.id || selectedLead?._id) === leadId) setSelectedLead(null);

      try {
        await axios.delete(
          `${API_BASE}/resellers/leads/${leadId}?req_for=delete&unique_id=${MODULE_UID}`,
          { headers: authHeaderObj(), data: { id: leadId } }
        );
      } catch (err) {
        console.warn("Delete API note:", err?.message);
      }

      dispatch(setAlert({ type: "info", message: "Lead removed from system" }));
    }
  };

  // ── Lead Approval as Franchise Partner ──────────────────────────────────
  const handleConfirmApproval = async (e) => {
    e.preventDefault();
    if (!approveLead) return;

    setApproving(true);
    try {
      const leadId = approveLead.id || approveLead._id;
      const res = await axios.post(
        `${API_BASE}/resellers/leads/${leadId}/approve?req_for=edit&unique_id=${MODULE_UID}`,
        {
          password: approvalPassword || "SolarKits@2026",
          commercial_mode: approvalCommercialMode || "commission",
        },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success" || res.data?.success) {
        const emailNotice = res.data?.data?.email_sent
          ? ` Login credentials emailed to "${approveLead.email || approveLead.mobileNumber}".`
          : "";
        dispatch(
          setAlert({
            type: "success",
            message: `Franchise Partner approved! Account provisioned & agreement generated for "${approveLead.fullName}".${emailNotice}`,
          })
        );
        handleStatusChange(leadId, "APPROVED_CONVERTED");
        setApproveLead(null);
        fetchLeads();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to approve lead." }));
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Lead approval failed. Please try again.",
        })
      );
    } finally {
      setApproving(false);
    }
  };


  // Manual Add Form Submit
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.mobileNumber.trim()) {
      dispatch(setAlert({ type: "error", message: "Name and Mobile number are required" }));
      return;
    }

    const newLead = {
      id: `LEAD-${Date.now()}`,
      actionType: "franchise_apply",
      ...formData,
      status: "NEW",
      submittedAt: new Date().toISOString(),
      adminRemarks: "Manually recorded by Admin.",
    };

    setLeads((prev) => [newLead, ...prev]);
    setIsAddModalOpen(false);

    try {
      await axios.post(
        `${API_BASE}/resellers/leads/add?req_for=add&unique_id=${MODULE_UID}`,
        formData,
        { headers: authHeaderObj() }
      );
    } catch (err) {
      console.warn("Manual add API note:", err?.message);
    }

    setFormData({
      fullName: "",
      businessName: "",
      mobileNumber: "",
      whatsappNumber: "",
      email: "",
      gstin: "",
      state: "Maharashtra",
      district: "",
      pincode: "",
      cluster_name: "",
      cluster_code: "",
      businessProfile: "Solar EPC Contractor",
      expectedOrderQty: "",
      selectedSolution: "Header Fast Application",
      notes: "",
      consent: true,
    });
    dispatch(setAlert({ type: "success", message: "New Franchisee Lead recorded successfully!" }));
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      dispatch(setAlert({ type: "warning", message: "No leads to export" }));
      return;
    }

    const headers = [
      "Lead ID",
      "Full Name",
      "Business Name",
      "Mobile",
      "WhatsApp",
      "Email",
      "GSTIN",
      "State",
      "District",
      "Franchise Cluster",
      "Cluster Code",
      "Covered Districts",
      "Pincode",
      "Business Profile",
      "Expected Volume",
      "Selected Solution",
      "Status",
      "Specific Remarks",
      "Admin Notes",
      "Submitted Date",
    ];

    const rows = filteredLeads.map((l) => [
      l.id,
      `"${(l.fullName || "").replace(/"/g, '""')}"`,
      `"${(l.businessName || "").replace(/"/g, '""')}"`,
      l.mobileNumber || "",
      l.whatsappNumber || "",
      l.email || "",
      l.gstin || "",
      l.state || "",
      l.district || "",
      `"${(l.cluster_name || l.clusterName || "").replace(/"/g, '""')}"`,
      `"${(l.cluster_code || l.clusterCode || "").replace(/"/g, '""')}"`,
      `"${(Array.isArray(l.cluster_districts) ? l.cluster_districts.join("; ") : Array.isArray(l.clusterDistricts) ? l.clusterDistricts.join("; ") : "").replace(/"/g, '""')}"`,
      l.pincode || "",
      `"${(l.businessProfile || "").replace(/"/g, '""')}"`,
      `"${(l.expectedOrderQty || "").replace(/"/g, '""')}"`,
      `"${(l.selectedSolution || "").replace(/"/g, '""')}"`,
      l.status || "NEW",
      `"${(l.notes || "").replace(/"/g, '""')}"`,
      `"${(l.adminRemarks || "").replace(/"/g, '""')}"`,
      l.submittedAt || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solarkits_franchisee_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    dispatch(setAlert({ type: "success", message: `Exported ${filteredLeads.length} leads to CSV` }));
  };

  // Metrics Calculation
  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === "NEW").length;
    const inReviewCount = leads.filter((l) => l.status === "IN_REVIEW" || l.status === "CONTACTED").length;
    const convertedCount = leads.filter((l) => l.status === "APPROVED_CONVERTED").length;
    const callbackCount = leads.filter(
      (l) =>
        l.is_callback_request ||
        l.actionType === "callback_request" ||
        l.action_type === "callback_request" ||
        l.source === "consultation_desk" ||
        l.selectedSolution?.toLowerCase().includes("callback")
    ).length;
    const bdeCount = leads.filter((l) => l.is_bde_lead || l.source === "bde_portal" || l.bde).length;
    const websiteCount = leads.filter(
      (l) =>
        !l.is_bde_lead &&
        !l.is_callback_request &&
        l.actionType !== "callback_request" &&
        l.action_type !== "callback_request" &&
        l.source !== "consultation_desk" &&
        (l.source === "storefront_modal" || l.source === "website" || !l.source)
    ).length;
    return { total, newCount, inReviewCount, convertedCount, callbackCount, bdeCount, websiteCount };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      const isItemCallback = Boolean(
        item.is_callback_request ||
        item.actionType === "callback_request" ||
        item.action_type === "callback_request" ||
        item.source === "consultation_desk" ||
        item.selectedSolution?.toLowerCase().includes("callback")
      );
      const isItemBde = Boolean(item.is_bde_lead || item.source === "bde_portal" || item.bde);
      const isItemManual = item.source === "manual_admin";
      const isItemWebsite = !isItemBde && !isItemManual && !isItemCallback;

      const matchesSearch =
        search === "" ||
        (item.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.businessName || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.mobileNumber || "").includes(search) ||
        (item.whatsappNumber || "").includes(search) ||
        (item.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.district || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.state || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.cluster_name || item.clusterName || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.cluster_code || item.clusterCode || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.gstin || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.bde?.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.bde?.bdeId || "").toLowerCase().includes(search.toLowerCase());

      const itemClusterName = item.cluster_name || item.clusterName || "";
      const itemClusterCode = item.cluster_code || item.clusterCode || "";

      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesState = stateFilter === "ALL" || item.state === stateFilter;
      const matchesCluster =
        clusterFilter === "ALL" ||
        itemClusterName === clusterFilter ||
        itemClusterCode === clusterFilter;
      const matchesProfile = profileFilter === "ALL" || item.businessProfile === profileFilter;

      const matchesSource =
        sourceFilter === "ALL" ||
        (sourceFilter === "callback" && isItemCallback) ||
        (sourceFilter === "bde" && isItemBde) ||
        (sourceFilter === "website" && isItemWebsite) ||
        (sourceFilter === "manual" && isItemManual);

      const matchesBde =
        bdeFilter === "ALL" ||
        item.bde_id === bdeFilter ||
        item.bde?.id === bdeFilter ||
        item.bde?.bdeId === bdeFilter;

      return matchesSearch && matchesStatus && matchesState && matchesCluster && matchesProfile && matchesSource && matchesBde;
    });
  }, [leads, search, statusFilter, stateFilter, clusterFilter, profileFilter, sourceFilter, bdeFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FiUsers size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Franchisee Application Leads
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                Incoming partner applications, territory inquiries, and B2B franchise requests
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover text-sm font-medium transition-all shadow-sm disabled:opacity-50"
            title="Refresh Leads from Database"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin text-primary" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover text-sm font-medium transition-all shadow-sm"
            title="Download CSV"
          >
            <FiDownload size={16} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
          >
            <FiPlus size={16} />
            <span>Add Manual Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Leads</p>
            <p className="text-2xl font-black text-text-primary mt-1">{stats.total}</p>
            <p className="text-xs text-text-muted mt-0.5">All channel submissions</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <FiLayers size={20} />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-danger uppercase tracking-wider">New Action Required</p>
            <p className="text-2xl font-black text-danger mt-1">{stats.newCount}</p>
            <p className="text-xs text-text-muted mt-0.5">Awaiting first contact</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-danger-soft text-danger flex items-center justify-center">
            <FiAlertCircle size={20} />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-warning uppercase tracking-wider">In Discussion</p>
            <p className="text-2xl font-black text-warning mt-1">{stats.inReviewCount}</p>
            <p className="text-xs text-text-muted mt-0.5">Under territory evaluation</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-warning-soft text-warning flex items-center justify-center">
            <FiClock size={20} />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-success uppercase tracking-wider">Converted Partners</p>
            <p className="text-2xl font-black text-success mt-1">{stats.convertedCount}</p>
            <p className="text-xs text-text-muted mt-0.5">Approved & onboarded</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-success-soft text-success flex items-center justify-center">
            <FiCheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const isSel = statusFilter === key;
            const count =
              key === "ALL"
                ? leads.length
                : leads.filter((l) => l.status === key).length;

            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${isSel
                  ? "bg-primary text-white shadow-sm"
                  : "bg-bg text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-border"
                  }`}
              >
                <span>{cfg.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSel ? "bg-white/25 text-white" : "bg-surface text-text-muted"
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search and Dropdown Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search by Name, Company, Mobile, Email, GSTIN, District..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {/* Channel / Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                if (e.target.value !== "bde") {
                  setBdeFilter("ALL");
                }
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:border-primary transition-all min-w-[180px] ${sourceFilter === "callback"
                ? "bg-amber-50 border-amber-300 text-amber-950"
                : sourceFilter === "bde"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                  : sourceFilter === "website"
                    ? "bg-teal-50 border-teal-300 text-teal-900"
                    : "bg-bg border-border text-text-primary"
                }`}
            >
              <option value="ALL">🌐 All Channels ({leads.length})</option>
              <option value="callback">📞 Callback Inquiries ({stats.callbackCount})</option>
              <option value="bde">👔 BDE Field Leads ({stats.bdeCount})</option>
              <option value="website">💻 Franchise Applications ({stats.websiteCount})</option>
              <option value="manual">✍️ Manual Admin</option>
            </select>

            {/* BDE Executive Filter */}
            {bdes.length > 0 && (
              <select
                value={bdeFilter}
                onChange={(e) => {
                  setBdeFilter(e.target.value);
                  if (e.target.value !== "ALL") {
                    setSourceFilter("bde");
                  }
                }}
                className="px-3 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs font-medium focus:outline-none focus:border-primary transition-all min-w-[160px]"
              >
                <option value="ALL">All BDEs</option>
                {bdes.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.full_name} ({b.bde_id})
                  </option>
                ))}
              </select>
            )}

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs font-medium focus:outline-none focus:border-primary transition-all min-w-[130px]"
            >
              <option value="ALL">All States</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Franchise Cluster Filter */}
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:border-primary transition-all min-w-[170px] ${clusterFilter !== "ALL"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
                  : "bg-bg border-border text-text-primary"
                }`}
            >
              <option value="ALL">
                🏷️ {stateFilter === "ALL" ? "All Franchise Clusters" : `Clusters (${stateFilter})`} ({availableClusters.length})
              </option>
              {availableClusters.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} {c.code ? `(${c.code})` : ""}
                </option>
              ))}
            </select>

            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs font-medium focus:outline-none focus:border-primary transition-all min-w-[150px]"
            >
              <option value="ALL">All Business Profiles</option>
              {BUSINESS_PROFILES.map((bp) => (
                <option key={bp} value={bp}>
                  {bp}
                </option>
              ))}
            </select>

            {(search || statusFilter !== "ALL" || sourceFilter !== "ALL" || bdeFilter !== "ALL" || stateFilter !== "ALL" || clusterFilter !== "ALL" || profileFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setSourceFilter("ALL");
                  setBdeFilter("ALL");
                  setStateFilter("ALL");
                  setClusterFilter("ALL");
                  setProfileFilter("ALL");
                }}
                className="px-3 py-2 rounded-xl border border-border text-xs text-text-muted hover:text-danger hover:bg-danger-soft transition-all"
                title="Reset Filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center p-6">
            <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center">
              <FiUsers size={24} className="text-text-muted" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">No Franchisee Leads Match Your Filters</p>
              <p className="text-xs text-text-muted mt-1">
                Try adjusting your search criteria or click "Add Manual Lead" to create a new one.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-xs">
                  <th className="text-left text-text-muted font-semibold px-5 py-3.5">Applicant & Business</th>
                  <th className="text-left text-text-muted font-semibold px-5 py-3.5">Contact Details</th>
                  <th className="text-left text-text-muted font-semibold px-5 py-3.5">Target Territory & Cluster</th>
                  <th className="text-left text-text-muted font-semibold px-5 py-3.5">Profile & Details</th>
                  <th className="text-center text-text-muted font-semibold px-4 py-3.5">Status</th>
                  <th className="text-left text-text-muted font-semibold px-4 py-3.5">Date</th>
                  <th className="text-right text-text-muted font-semibold px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence>
                  {filteredLeads.map((lead) => {
                    const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
                    const StatusIcon = statusCfg.icon || FiClock;
                    const formattedDate = lead.submittedAt
                      ? new Date(lead.submittedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                      : "Recent";

                    return (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-surface-hover/80 transition-colors"
                      >
                        {/* Applicant & Business */}
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 uppercase text-xs">
                              {lead.fullName
                                ? lead.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                : "FL"}
                            </div>
                            <div className="space-y-1">
                              <div className="font-bold text-text-primary flex items-center gap-2">
                                <span>{lead.fullName}</span>
                                {lead.selectedSolution && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${lead.is_callback_request || lead.actionType === "callback_request" || lead.action_type === "callback_request"
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : "bg-info-soft text-primary"
                                      }`}
                                  >
                                    {lead.selectedSolution}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-text-secondary flex items-center gap-1.5 font-medium">
                                <FaBuilding className="text-text-muted" size={11} />
                                <span>{lead.businessName || "Individual Applicant"}</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {/* Lead Source Badge */}
                                {lead.is_callback_request || lead.actionType === "callback_request" || lead.action_type === "callback_request" || lead.source === "consultation_desk" ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300 shadow-xs"
                                    title="Priority Callback Request from Partner Consultation Desk"
                                  >
                                    <FiPhoneCall size={10} className="text-amber-700" />
                                    <span>Priority Callback</span>
                                  </span>
                                ) : lead.is_bde_lead || lead.source === "bde_portal" || lead.bde ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50/90 px-2 py-0.5 rounded border border-indigo-200"
                                    title={`Field Sourced by BDE Executive: ${lead.bde?.fullName || 'BDE Portal'}`}
                                  >
                                    <FiUserCheck size={11} className="text-indigo-600" />
                                    <span>BDE: {lead.bde?.fullName || lead.bde?.bdeId || "Field BDE"}</span>
                                  </span>
                                ) : lead.source === "manual_admin" ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                    title="Manual Entry by Admin"
                                  >
                                    <FiUser size={11} className="text-slate-600" />
                                    <span>Admin Manual</span>
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50/90 px-2 py-0.5 rounded border border-teal-200"
                                    title="Online Lead from Public Website / Storefront"
                                  >
                                    <FiGlobe size={11} className="text-teal-600" />
                                    <span>Website Inbound</span>
                                  </span>
                                )}

                                {lead.gstin && (
                                  <div className="text-[10px] text-text-muted font-mono bg-bg px-1.5 py-0.5 rounded border border-border inline-block">
                                    GST: {lead.gstin}
                                  </div>
                                )}
                                {lead.gst_verified && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    <FiShield size={10} className="text-emerald-600" />
                                    <span>QuickeKYC Verified</span>
                                  </span>
                                )}
                                {lead.shop_photos && lead.shop_photos.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                    <FiCamera size={10} className="text-[#0575B8]" />
                                    <span>{lead.shop_photos.length} Photos</span>
                                  </span>
                                )}
                              </div>
                              {lead.gst_legal_name && (
                                <p className="text-[10px] text-emerald-800 font-medium truncate max-w-[220px]">
                                  {lead.gst_legal_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className="px-5 py-4">
                          <div className="space-y-1.5 text-xs">
                            {/* Phone with Call Link */}
                            <div className="flex items-center gap-2">
                              <a
                                href={`tel:${lead.mobileNumber}`}
                                className="flex items-center gap-1 font-semibold text-text-primary hover:text-primary transition"
                              >
                                <FiPhone size={12} className="text-primary" />
                                <span>+91 {lead.mobileNumber}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopy(lead.mobileNumber, `phone-${lead.id}`)}
                                className="text-text-muted hover:text-text-primary"
                                title="Copy Number"
                              >
                                {copiedId === `phone-${lead.id}` ? <FiCheck size={12} className="text-success" /> : <FiCopy size={12} />}
                              </button>
                            </div>

                            {/* WhatsApp with Direct Link */}
                            {lead.whatsappNumber && (
                              <div className="flex items-center gap-2">
                                <a
                                  href={`https://wa.me/91${lead.whatsappNumber}?text=Hi%20${encodeURIComponent(
                                    lead.fullName
                                  )},%20thank%20you%20for%20applying%20for%20the%20SolarKits%20Franchise%20Partner%20Program.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] hover:bg-emerald-100 transition"
                                >
                                  <FaWhatsapp size={12} className="text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            )}

                            {/* Email */}
                            {lead.email && (
                              <div className="flex items-center gap-1 text-text-muted text-[11px]">
                                <FiMail size={11} />
                                <span className="truncate max-w-[170px]">{lead.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Target Territory & Cluster */}
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            {/* Franchise Cluster Badge */}
                            {(lead.cluster_name || lead.clusterName) ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold text-xs shadow-xs">
                                  <span>🏷️</span>
                                  <span>{lead.cluster_name || lead.clusterName}</span>
                                  {(lead.cluster_code || lead.clusterCode) && (
                                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 pl-1 border-l border-emerald-500/30">
                                      {lead.cluster_code || lead.clusterCode}
                                    </span>
                                  )}
                                </span>
                                {(Array.isArray(lead.cluster_districts) && lead.cluster_districts.length > 0) ? (
                                  <span className="text-[10px] text-text-muted font-medium bg-bg px-1.5 py-0.5 rounded border border-border" title={lead.cluster_districts.join(", ")}>
                                    📍 {lead.cluster_districts.length} Covered Districts
                                  </span>
                                ) : (Array.isArray(lead.clusterDistricts) && lead.clusterDistricts.length > 0) ? (
                                  <span className="text-[10px] text-text-muted font-medium bg-bg px-1.5 py-0.5 rounded border border-border" title={lead.clusterDistricts.join(", ")}>
                                    📍 {lead.clusterDistricts.length} Covered Districts
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-hover text-text-muted text-[10px] font-medium border border-border">
                                <span>🌐</span> Open Territory / Expansion
                              </span>
                            )}

                            {/* District & State */}
                            <div className="font-semibold text-text-primary flex items-center gap-1.5 text-xs">
                              <FiMapPin className="text-danger shrink-0" size={13} />
                              <span>{lead.district ? `${lead.district}, ${lead.state}` : lead.state}</span>
                            </div>
                            {lead.pincode && (
                              <p className="text-[11px] text-text-muted font-mono pl-4">
                                PIN: {lead.pincode}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Profile & Requirement Details */}
                        <td className="px-5 py-4">
                          <div className="space-y-1.5 max-w-[220px]">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-bg border border-border text-xs font-semibold text-text-secondary">
                              {lead.businessProfile || "Solar Partner"}
                            </span>

                            {/* Preferred Franchise Model / Solution */}
                            {(lead.preferredFranchiseModel || lead.preferred_franchise_model || (lead.selectedSolution && !lead.selectedSolution.includes("Header Fast"))) && (
                              <p className="text-[11px] text-primary font-medium flex items-center gap-1 truncate" title={lead.preferredFranchiseModel || lead.preferred_franchise_model || lead.selectedSolution}>
                                <span className="shrink-0">📋</span>
                                <span className="truncate">{lead.preferredFranchiseModel || lead.preferred_franchise_model || lead.selectedSolution}</span>
                              </p>
                            )}

                            {/* Actual user volume if explicitly filled and not dummy default */}
                            {lead.expectedOrderQty && lead.expectedOrderQty.trim() !== "" && !lead.expectedOrderQty.includes("Starter") && (
                              <p className="text-[11px] text-text-muted font-medium">
                                Vol: <strong className="text-text-primary">{lead.expectedOrderQty}</strong>
                              </p>
                            )}

                            {/* Real notes / requirements entered by applicant */}
                            {lead.notes && lead.notes.trim() !== "" && (
                              <p className="text-[11px] text-text-muted italic truncate flex items-center gap-1" title={lead.notes}>
                                <span className="shrink-0">💬</span>
                                <span className="truncate">"{lead.notes}"</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Status with Inline Dropdown */}
                        <td className="px-4 py-4 text-center">
                          <select
                            value={lead.status || "NEW"}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border focus:outline-none transition-all cursor-pointer ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            <option value="NEW">New Lead</option>
                            <option value="GST_VERIFIED">GST Verified</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="APPROVED_CONVERTED">Converted</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-4 text-xs text-text-muted whitespace-nowrap">
                          {formattedDate}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {lead.is_callback_request || lead.actionType === "callback_request" || lead.action_type === "callback_request" || lead.source === "consultation_desk" ? (
                              <a
                                href={`tel:${lead.mobileNumber}`}
                                onClick={() => {
                                  if (lead.status === "NEW") {
                                    handleStatusChange(lead.id, "CONTACTED");
                                  }
                                }}
                                title={`Click to Call Back: +91 ${lead.mobileNumber}`}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xs flex items-center gap-1.5"
                              >
                                <FiPhoneCall size={13} className="text-blue-100" />
                                <span>Call Back</span>
                              </a>
                            ) : (
                              lead.status !== "APPROVED_CONVERTED" && (
                                <button
                                  type="button"
                                  onClick={() => setApproveLead(lead)}
                                  title="Approve as Franchise Partner"
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs flex items-center gap-1"
                                >
                                  <FiCheckCircle size={13} />
                                  <span>Approve</span>
                                </button>
                              )
                            )}

                            {/* Assign / Reassign BDE Executive */}
                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(lead)}
                              title={lead.bde || lead.bde_id ? `Assigned to: ${lead.bde?.fullName || 'BDE'}. Click to Reassign` : "Assign Lead to BDE Executive"}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${lead.bde || lead.bde_id
                                ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                                }`}
                            >
                              <FiUserCheck size={13} />
                              <span>{lead.bde || lead.bde_id ? "Reassign BDE" : "Assign BDE"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedLead(lead)}
                              title="View Full Application Details"
                              className="p-2 rounded-xl text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm"
                            >
                              <FiEye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteLead(lead.id)}
                              title="Delete Lead"
                              className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-danger-soft transition-all"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}

                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL / DRAWER ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface rounded-3xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border bg-bg/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                      {selectedLead.selectedSolution || "Franchise Lead"}
                    </span>
                    <span className="text-xs text-text-muted font-mono">{selectedLead.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mt-1">{selectedLead.fullName}</h3>
                  <p className="text-xs text-text-secondary">
                    {selectedLead.businessName} • {selectedLead.businessProfile}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="p-2 rounded-xl text-text-muted hover:bg-surface-hover hover:text-text-primary transition"
                >
                  <FiX size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* Priority Callback Alert Banner if applicable */}
                {(selectedLead.is_callback_request || selectedLead.actionType === "callback_request" || selectedLead.source === "consultation_desk" || selectedLead.selectedSolution?.toLowerCase().includes("callback")) && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 shadow-xs">
                    <div className="p-2 rounded-xl bg-amber-200 text-amber-900 shrink-0">
                      <FiPhoneCall size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                        Priority B2B Partner Consultation Callback
                      </p>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        Applicant submitted a consultation request from the priority desk expecting a callback within 2 hours regarding state distribution, commercial models, or bulk container pricing.
                      </p>
                    </div>
                  </div>
                )}

                {/* Status Bar */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-bg border border-border">
                  <div>
                    <p className="text-xs font-semibold text-text-muted">Current Application Status</p>
                    <p className="text-sm font-bold text-text-primary mt-0.5">
                      {STATUS_CONFIG[selectedLead.status]?.label || selectedLead.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedLead.status}
                      onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="NEW">New Lead</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="APPROVED_CONVERTED">Converted to Franchisee</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`https://wa.me/91${selectedLead.whatsappNumber || selectedLead.mobileNumber}?text=Hi%20${encodeURIComponent(
                      selectedLead.fullName
                    )},%20this%20is%20SolarKits%20Regional%20Partner%20Desk%20calling%20back%20regarding%20your%20franchise%20consultation%20request%20for%20${encodeURIComponent(
                      selectedLead.district || selectedLead.state
                    )}...`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
                  >
                    <FaWhatsapp size={16} />
                    <span>WhatsApp Applicant</span>
                  </a>

                  <a
                    href={`tel:${selectedLead.mobileNumber}`}
                    onClick={() => {
                      if (selectedLead.status === "NEW") {
                        handleStatusChange(selectedLead.id, "CONTACTED");
                      }
                    }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition shadow-sm"
                  >
                    <FiPhoneCall size={16} />
                    <span>Call Back +91 {selectedLead.mobileNumber}</span>
                  </a>
                </div>

                {/* Contact & Business Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-bg border border-border space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Contact Info</p>
                    <div className="text-xs space-y-1.5">
                      <p className="text-text-primary">
                        <strong>Calling:</strong> +91 {selectedLead.mobileNumber}
                      </p>
                      <p className="text-text-primary">
                        <strong>WhatsApp:</strong> +91 {selectedLead.whatsappNumber || selectedLead.mobileNumber}
                      </p>
                      <p className="text-text-primary">
                        <strong>Email:</strong> {selectedLead.email || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-bg border border-border space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Business & GST</p>
                    <div className="text-xs space-y-1.5">
                      <p className="text-text-primary">
                        <strong>Company:</strong> {selectedLead.businessName || "Individual"}
                      </p>
                      <p className="text-text-primary">
                        <strong>GSTIN:</strong> {selectedLead.gstin || "Not Provided"}
                      </p>
                      <p className="text-text-primary">
                        <strong>Profile:</strong> {selectedLead.businessProfile}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acquisition Channel & BDE Attribution Details */}
                <div className="p-4 rounded-2xl bg-bg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <FiLayers size={14} className="text-primary" />
                      <span>Acquisition Channel & Lead Attribution</span>
                    </p>
                    {selectedLead.is_bde_lead || selectedLead.bde || selectedLead.source === "bde_portal" ? (
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                        <FiUserCheck size={12} className="text-indigo-600" /> BDE Field Sourced
                      </span>
                    ) : selectedLead.source === "manual_admin" ? (
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                        <FiUser size={12} className="text-slate-600" /> Admin Manual Entry
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                        <FiGlobe size={12} className="text-teal-600" /> Website / Storefront Inbound
                      </span>
                    )}
                  </div>

                  {selectedLead.bde ? (
                    <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[11px] text-indigo-800 font-bold uppercase">Assigned BDE Executive</p>
                          <p className="font-bold text-indigo-950 text-sm mt-0.5">{selectedLead.bde.fullName || "Field BDE"}</p>
                          <span className="inline-block font-mono text-[11px] font-bold text-indigo-700 bg-white/80 px-2 py-0.5 rounded border border-indigo-200 mt-1">
                            ID: {selectedLead.bde.bdeId}
                          </span>
                        </div>
                        <div>
                          <p className="text-[11px] text-indigo-800 font-bold uppercase">BDE Contact</p>
                          <p className="font-mono text-indigo-950 mt-0.5 font-bold">{selectedLead.bde.mobile || "N/A"}</p>
                          <p className="text-[11px] text-indigo-700 truncate">{selectedLead.bde.email || ""}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between">
                        <span className="text-[11px] text-indigo-800 font-medium">Want to transfer this lead to another territory executive?</span>
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(selectedLead)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <FiUserCheck size={12} />
                          <span>Reassign BDE</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-text-secondary bg-surface p-3.5 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-primary">
                          {selectedLead.source === "manual_admin"
                            ? "Lead created manually through Admin Portal."
                            : "Direct Website / Storefront Inbound Lead"}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Not yet assigned to any BDE executive in the field.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal(selectedLead)}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 shadow-sm shrink-0 transition cursor-pointer"
                      >
                        <FiUserCheck size={14} />
                        <span>Assign to BDE Executive</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Territory & Procurement Scope */}
                <div className="p-4 rounded-2xl bg-bg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <FiMapPin size={14} className="text-danger" />
                      <span>Territory & Deployment Intent</span>
                    </p>
                    {(selectedLead.cluster_name || selectedLead.clusterName) && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Franchise Cluster Applied
                      </span>
                    )}
                  </div>

                  {/* Franchise Cluster Details Card */}
                  {(selectedLead.cluster_name || selectedLead.clusterName) ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                            <span>🏷️</span>
                            <span>{selectedLead.cluster_name || selectedLead.clusterName}</span>
                          </p>
                          {(selectedLead.cluster_code || selectedLead.clusterCode) && (
                            <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
                              Cluster Code: {selectedLead.cluster_code || selectedLead.clusterCode}
                            </p>
                          )}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                          CLUSTER TERRITORY
                        </span>
                      </div>

                      {((Array.isArray(selectedLead.cluster_districts) && selectedLead.cluster_districts.length > 0) ||
                        (Array.isArray(selectedLead.clusterDistricts) && selectedLead.clusterDistricts.length > 0)) && (
                          <div className="pt-2 border-t border-emerald-500/20">
                            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                              Assigned Districts in this Cluster:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(selectedLead.cluster_districts || selectedLead.clusterDistricts).map((d) => (
                                <span
                                  key={d}
                                  className="px-2 py-0.5 bg-surface text-text-primary text-[11px] font-medium rounded-lg border border-border shadow-xs"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-surface border border-border text-xs text-text-muted">
                      <span>🌐 Applicant did not select a pre-defined cluster (Open / Expansion Territory Request).</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                    <div>
                      <p className="text-text-muted text-[11px]">Target State</p>
                      <p className="font-bold text-text-primary mt-0.5">{selectedLead.state}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-[11px]">Target District</p>
                      <p className="font-bold text-text-primary mt-0.5">{selectedLead.district || "All / District Center"}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-[11px]">Selected Model / Solution</p>
                      <p className="font-bold text-primary mt-0.5">
                        {selectedLead.preferredFranchiseModel || selectedLead.preferred_franchise_model || selectedLead.selectedSolution || "General Inbound"}
                      </p>
                    </div>
                  </div>
                  {selectedLead.expectedOrderQty && selectedLead.expectedOrderQty.trim() !== "" && (
                    <div className="pt-2 border-t border-border text-xs">
                      <span className="text-text-muted text-[11px]">Expected Monthly Volume: </span>
                      <strong className="text-text-primary">{selectedLead.expectedOrderQty}</strong>
                    </div>
                  )}
                </div>

                {/* Specific Requirements / Remarks from Applicant */}
                <div className="p-4 rounded-2xl bg-info-soft/40 border border-info/20 space-y-2">
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <FiFileText size={14} />
                    Specific Requirements / Remarks from Form
                  </p>
                  <p className="text-xs text-text-primary leading-relaxed bg-surface p-3 rounded-xl border border-border">
                    {selectedLead.notes || "No additional specific requirements provided."}
                  </p>
                </div>

                {/* Shop & Commercial Premises Photos */}
                <div className="p-4 rounded-2xl bg-bg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <FiCamera className="text-primary" size={14} />
                      <span>Shop & Commercial Premises Photos ({selectedLead.shop_photos?.length || 0})</span>
                    </p>
                    {selectedLead.shop_photos && selectedLead.shop_photos.length > 0 && (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <FiCheckCircle size={12} /> {selectedLead.shop_photos.length} Photos Attached
                      </span>
                    )}
                  </div>

                  {selectedLead.shop_photos && selectedLead.shop_photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {selectedLead.shop_photos.map((photoUrl, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setAdminPhotoPreview(photoUrl)}
                          className="group relative aspect-4/3 rounded-xl overflow-hidden border border-border bg-surface shadow-xs cursor-pointer"
                        >
                          <img
                            src={photoUrl}
                            alt={`Shop Photo ${pIdx + 1}`}
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold">
                            Photo {pIdx + 1}
                          </div>
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-white/90 text-text-primary flex items-center justify-center shadow-md">
                              <FiMaximize2 size={14} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-surface border border-border text-xs text-text-muted flex items-center gap-2">
                      <FiInfo size={14} className="text-text-muted" />
                      <span>No shop photos were attached with this franchise lead submission.</span>
                    </div>
                  )}
                </div>

                {/* Admin Internal Notes */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Admin Notes & Evaluation Follow-up
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={selectedLead.adminRemarks || ""}
                    onBlur={(e) => handleSaveRemarks(selectedLead.id, e.target.value)}
                    placeholder="Add internal notes about call discussions, territory conflicts, or franchise onboarding readiness..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                  />
                  <p className="text-[10px] text-text-muted">Auto-saves on blur or click away.</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border bg-bg/50 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className="px-4 py-2 text-danger hover:bg-danger-soft rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FiTrash2 size={14} />
                  <span>Delete Application</span>
                </button>

                <div className="flex items-center gap-2">
                  {selectedLead.status !== "APPROVED_CONVERTED" && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedLead;
                        setSelectedLead(null);
                        setApproveLead(target);
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <FiCheckCircle size={15} />
                      <span>Approve as Franchise Partner</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition"
                  >
                    Close Detail
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── APPROVE AS FRANCHISE PARTNER MODAL ─────────────────────────── */}
      <AnimatePresence>
        {approveLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-3xl shadow-2xl border border-border w-full max-w-lg overflow-hidden flex flex-col p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <FiCheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary">
                      Approve Franchise Partner Application
                    </h3>
                    <p className="text-xs text-text-muted">Step 4: Formal Onboarding Approval</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setApproveLead(null)}
                  className="p-2 rounded-xl text-text-muted hover:bg-surface-hover"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg border border-border text-xs space-y-1.5">
                <p><strong>Applicant Name:</strong> {approveLead.fullName}</p>
                <p><strong>Business Name:</strong> {approveLead.businessName || "Individual"}</p>
                <p><strong>GSTIN:</strong> {approveLead.gstin || "N/A"}</p>
                {approveLead.gst_verified && (
                  <p className="text-emerald-700 font-bold flex items-center gap-1">
                    <FiCheckCircle size={12} /> QuickeKYC Authenticated: {approveLead.gst_legal_name || "Verified"}
                  </p>
                )}
                <p><strong>Target Territory:</strong> {approveLead.district ? `${approveLead.district}, ${approveLead.state}` : approveLead.state}</p>
              </div>

              <form onSubmit={handleConfirmApproval} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Initial Partner Login Password
                  </label>
                  <input
                    type="text"
                    required
                    value={approvalPassword}
                    onChange={(e) => setApprovalPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-[10px] text-text-muted mt-0.5">Partner will use this password to log in at the Reseller Portal.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Commercial Mode
                  </label>
                  <select
                    value={approvalCommercialMode}
                    onChange={(e) => setApprovalCommercialMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="commission">Commission Settlement Mode</option>
                    <option value="upfront_discount">Upfront Wholesale Margin Discount Mode</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl bg-info-soft/40 border border-info/20 text-[11px] text-text-secondary leading-relaxed space-y-1">
                  <p>✓ Automatically provisions Reseller Account in the system.</p>
                  <p>✓ Emails partner login credentials (email & password) to <strong>{approveLead.email || 'registered email'}</strong>.</p>
                  <p>✓ Generates official Franchise Partner Agreement in <strong>pending signature</strong> status.</p>
                  <p>✓ Enables the partner to sign the agreement & upload offline fee payment receipt.</p>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setApproveLead(null)}
                    className="px-4 py-2 rounded-xl border border-border text-text-secondary text-xs font-bold hover:bg-surface-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={approving}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    {approving ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
                    <span>Confirm & Approve Franchise Partner</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ── ADD MANUAL LEAD MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-3xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border bg-bg/50 flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                    Franchise Partner Program
                  </span>
                  <h3 className="text-lg font-bold text-text-primary mt-1">Record Franchise Lead Manually</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 rounded-xl text-text-muted hover:bg-surface-hover hover:text-text-primary"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Chandra"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Business / Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chandra Solar & Electricals"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Mobile Number (Calling) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">WhatsApp Number</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="ramesh@chandrasolar.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="27AAAAA0000A1Z5"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">State *</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Target District *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pune"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g. 411001"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Franchise Cluster (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune Region"
                      value={formData.cluster_name}
                      onChange={(e) => setFormData({ ...formData, cluster_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Cluster Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. CLU-MA-004"
                      value={formData.cluster_code}
                      onChange={(e) => setFormData({ ...formData, cluster_code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Business Profile</label>
                    <select
                      value={formData.businessProfile}
                      onChange={(e) => setFormData({ ...formData, businessProfile: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {BUSINESS_PROFILES.map((bp) => (
                        <option key={bp} value={bp}>
                          {bp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Expected Order / Project Volume</label>
                    <select
                      value={formData.expectedOrderQty}
                      onChange={(e) => setFormData({ ...formData, expectedOrderQty: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">-- Not Specified / General Inquiry --</option>
                      {ORDER_VOLUMES.map((vol) => (
                        <option key={vol} value={vol}>
                          {vol}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Selected Solution / Plan</label>
                  <input
                    type="text"
                    placeholder="e.g. Header Fast Application or Gold District Plan"
                    value={formData.selectedSolution}
                    onChange={(e) => setFormData({ ...formData, selectedSolution: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Specific Requirements / Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Mention panel wattage, inverter brand, target DISCOM name..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-md shadow-primary/20"
                  >
                    Save Franchise Lead
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ASSIGN / REASSIGN BDE MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {assignModalLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface rounded-3xl shadow-2xl border border-border w-full max-w-lg overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-border bg-bg/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600">
                    <FiUserCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-primary">
                      {assignModalLead.bde || assignModalLead.bde_id ? "Reassign Franchisee Lead" : "Assign Lead to BDE"}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Delegate this partner prospect to a field Business Development Executive
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignModalLead(null)}
                  className="p-2 rounded-xl text-text-muted hover:bg-surface-hover hover:text-text-primary transition"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleConfirmAssignBde} className="p-5 space-y-4">
                {/* Lead Summary Box */}
                <div className="p-3.5 rounded-2xl bg-bg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Lead Target Details</span>
                    {assignModalLead.selectedSolution && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-info-soft text-primary">
                        {assignModalLead.selectedSolution}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-text-primary">{assignModalLead.businessName || assignModalLead.fullName}</p>
                      <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
                        <FiUser size={12} className="text-text-muted" />
                        <span>{assignModalLead.fullName}</span>
                        <span className="text-text-muted">•</span>
                        <FiPhone size={12} className="text-text-muted" />
                        <span>+91 {assignModalLead.mobileNumber}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-xs text-text-muted border-t border-border/60">
                    <FiMapPin size={12} className="text-danger shrink-0" />
                    <span className="font-medium text-text-secondary">
                      {assignModalLead.district ? `${assignModalLead.district}, ${assignModalLead.state}` : assignModalLead.state}
                    </span>
                    {assignModalLead.pincode && (
                      <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border">
                        PIN {assignModalLead.pincode}
                      </span>
                    )}
                  </div>
                </div>

                {/* BDE Executive Selection Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-text-primary">
                    Select Target BDE Executive <span className="text-danger">*</span>
                  </label>
                  <select
                    value={selectedBdeId}
                    onChange={(e) => setSelectedBdeId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">-- Choose Field BDE Executive --</option>
                    {bdes.map((bde) => {
                      const bdeKey = bde._id || bde.id;
                      return (
                        <option key={bdeKey} value={bdeKey}>
                          {bde.full_name || bde.fullName} ({bde.bde_id || "BDE"}) — {bde.mobile_number || bde.mobile || bde.email}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-text-muted">
                    Assigned BDE will instantly receive an interactive push notification with a direct link to open this lead.
                  </p>
                </div>

                {/* Admin Assignment Remarks / Instructions */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-text-primary">
                    Assignment Instructions / Remarks <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Schedule immediate physical meeting, verify commercial showroom, discuss 10kW On-Grid combo kit..."
                    value={assignRemarks}
                    onChange={(e) => setAssignRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end items-center gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setAssignModalLead(null)}
                    className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface-hover transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning || !selectedBdeId}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition"
                  >
                    {assigning ? (
                      <>
                        <FiLoader size={14} className="animate-spin" />
                        <span>Assigning...</span>
                      </>
                    ) : (
                      <>
                        <FiSend size={14} />
                        <span>Confirm Lead Assignment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADMIN FULL-SCREEN SHOP PHOTO LIGHTBOX ──────────────────────── */}
      <AnimatePresence>
        {adminPhotoPreview && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden border border-border shadow-2xl flex flex-col"
            >
              <div className="p-4 bg-bg flex items-center justify-between border-b border-border">
                <span className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <FiCamera className="text-primary" /> Shop & Commercial Premises Inspection Photo
                </span>
                <button
                  type="button"
                  onClick={() => setAdminPhotoPreview(null)}
                  className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary transition cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>
              <div className="p-3 flex items-center justify-center overflow-auto bg-black/40">
                <img
                  src={adminPhotoPreview}
                  alt="Shop Inspection Full View"
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
