// components/ApproveNewEPCIndia.jsx
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaSearch,
  FaMapMarkerAlt,
  FaClock,
  FaEnvelope,
  FaTrash,
  FaCheck,
  FaExclamationTriangle,
  FaInfoCircle,
  FaBuilding,
  FaWhatsapp,
  FaEye,
  FaPhoneAlt,
  FaCopy,
  FaSyncAlt,
  FaUserTie,
  FaStore,
  FaGlobe
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Dropdown from "@/components/Dropdown";
import Dialog from "@/components/Dialog";
import CustomFilePicker from "@/components/CustomFilePicker";
import { authHeaderObj } from "@/app/authHeader";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import CustomTable from "@/components/CustomTable";
import IconButton from "@/components/IconButton";
import SendEpcWelcomeAccessModal from "../../../components/SendEpcWelcomeAccessModal";


const API_URL = import.meta.env.VITE_API_URL;

// Custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ApproveNewEPCIndia({ moduleUniqueId, countryId }) {
  const dispatch = useDispatch();

  // State Management
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [selectedEpcForAccess, setSelectedEpcForAccess] = useState(null);

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [selectedEpcType, setSelectedEpcType] = useState("all");
  const [states, setStates] = useState([]);
  const [epcTypes, setEpcTypes] = useState([
    { name: "Government Contractor" },
    { name: "Tender Bidder" },
    { name: "New EPC" },
    { name: "Experienced EPC" }
  ]);
  const [epcTypeStats, setEpcTypeStats] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    requestId: null,
    action: null,
    companyName: "",
    email: "",
    request: null
  });

  // Image modal state
  const [imageModal, setImageModal] = useState({
    isOpen: false,
    imageUrl: null
  });

  // File upload state for approve
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fileError, setFileError] = useState("");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0
  });

  // Copied GST clipboard indicator
  const [copiedGst, setCopiedGst] = useState(null);

  const handleCopyGst = (gst, e) => {
    e?.stopPropagation();
    if (!gst) return;
    navigator.clipboard.writeText(gst);
    setCopiedGst(gst);
    setTimeout(() => setCopiedGst(null), 1800);
  };

  // Status options
  const statusOptions = [
    { text: "All Statuses", value: "all" },
    { text: "Pending Only", value: "pending" },
    { text: "Approved", value: "approved" },
    { text: "Rejected", value: "rejected" }
  ];

  // Fetch states for filter
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await axios.post(
          `${API_URL}/geolocation/states?unique_id=${moduleUniqueId}&req_for=view`,
          {
            country_id: countryId
          },
          { headers: { ...authHeaderObj() } }
        );

        if (response.data.status === "success") {
          const stateOptions = [
            { text: "All States", value: "all" },
            ...response.data.states.map(state => ({
              text: state.name,
              value: state.id.toString()
            }))
          ];
          setStates(stateOptions);
        }
      } catch (error) {
        console.error("Error fetching states:", error);
      }
    };

    if (countryId) {
      fetchStates();
    }
  }, [moduleUniqueId, countryId]);

  // Fetch active EPC types
  useEffect(() => {
    const fetchEpcTypes = async () => {
      try {
        const res = await axios.get(`${API_URL}/epc-types/active`, {
          headers: { ...authHeaderObj() }
        });
        if (res.data?.status === "success" && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setEpcTypes(res.data.data);
        }
      } catch (e) {
        console.warn("Could not fetch active EPC types:", e?.message);
      }
    };
    fetchEpcTypes();
  }, []);

  // Fetch requests with pagination and filters
  const fetchRequests = async () => {
    setLoading(true);
    let apiRequests = [];
    let localRequests = [];

    // 1. Read from Cookie (shared across all localhost ports: 5173, 5174, 5176)
    try {
      const match = document.cookie.split('; ').find((row) => row.startsWith('pending_epc_requests='));
      if (match) {
        const val = decodeURIComponent(match.split('=')[1]);
        if (val) localRequests = JSON.parse(val);
      }
    } catch (e) {
      console.error("Failed to read cookie pending requests:", e);
    }

    // 2. Read from localStorage if cookie was empty
    if (!localRequests || localRequests.length === 0) {
      try {
        const stored = localStorage.getItem('pending_epc_requests');
        if (stored) {
          localRequests = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Failed to read local pending requests:", e);
      }
    }

    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(selectedState !== "all" && { state: selectedState }),
        ...(selectedStatus !== "all" && { status: selectedStatus }),
        ...(selectedEpcType !== "all" && { epc_type: selectedEpcType })
      });

      const response = await axios.get(
        `${API_URL}/solarshop/india/epcs/requests?unique_id=${moduleUniqueId}&req_for=view&${params.toString()}`,
        { headers: { ...authHeaderObj() } }
      );

      if (response.data.status === "success") {
        apiRequests = response.data.data || [];
        if (response.data.summary?.by_epc_type) {
          setEpcTypeStats(response.data.summary.by_epc_type);
        }
      }
    } catch (error) {
      console.warn("Backend API fetch for EPC requests warning:", error.message);
    }

    // Merge local requests with API requests (deduplicating by ID)
    const combinedMap = new Map();
    localRequests.forEach((req) => combinedMap.set(req.id, req));
    apiRequests.forEach((req) => combinedMap.set(req.id, req));
    const rawAll = Array.from(combinedMap.values());
    let combined = [...rawAll];

    // Filter combined list
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      combined = combined.filter((r) =>
        r.company_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.full_name?.toLowerCase().includes(q) ||
        r.whatsapp?.toLowerCase().includes(q) ||
        r.bde_name?.toLowerCase().includes(q) ||
        r.assigned_reseller_name?.toLowerCase().includes(q) ||
        r.gst_number?.toLowerCase().includes(q)
      );
    }

    if (selectedState !== "all") {
      const stateObj = states.find((s) => s.value === selectedState);
      const stateName = stateObj?.text?.toLowerCase();
      combined = combined.filter((r) =>
        r.state_id?.toString() === selectedState.toString() ||
        (stateName && r.state_name?.toLowerCase() === stateName)
      );
    }

    if (selectedStatus !== "all") {
      combined = combined.filter((r) => (r.status || 'pending').toLowerCase() === selectedStatus.toLowerCase());
    }

    if (selectedEpcType !== "all") {
      combined = combined.filter((r) => (r.epc_type || 'New EPC').toLowerCase() === selectedEpcType.toLowerCase());
    }

    setRequests(combined);
    setTotalRecords(combined.length);
    setTotalPages(Math.max(1, Math.ceil(combined.length / itemsPerPage)));

    // Calculate stats from total records (unfiltered)
    const todayStr = new Date().toISOString().split('T')[0];
    setStats({
      total: rawAll.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length,
      today: rawAll.filter((r) => r.created_at?.startsWith(todayStr)).length,
      thisWeek: rawAll.length
    });

    // Calculate EPC Type breakdown counts across all requests
    const countsByType = {};
    rawAll.forEach((r) => {
      const type = r.epc_type || "New EPC";
      countsByType[type] = (countsByType[type] || 0) + 1;
    });
    setEpcTypeStats((prev) => ({ ...countsByType, ...prev, ...countsByType }));

    setLoading(false);
  };

  // Update request status (approve with image or direct for BDE, reject without)
  const updateRequestStatus = async (requestId, action) => {
    setProcessingId(requestId);
    const isApproval = action === "approve";
    const newStatus = isApproval ? "approved" : "rejected";

    // Check local pending requests first
    try {
      let localReqs = [];
      const cookieMatch = document.cookie.split('; ').find((row) => row.startsWith('pending_epc_requests='));
      if (cookieMatch) {
        localReqs = JSON.parse(decodeURIComponent(cookieMatch.split('=')[1]) || '[]');
      } else {
        localReqs = JSON.parse(localStorage.getItem('pending_epc_requests') || '[]');
      }

      const foundReq = localReqs.find((r) => r.id === requestId);
      if (foundReq) {
        foundReq.status = newStatus;
        const cookieVal = encodeURIComponent(JSON.stringify(localReqs));
        document.cookie = `pending_epc_requests=${cookieVal}; path=/; max-age=864000`;
        localStorage.setItem('pending_epc_requests', JSON.stringify(localReqs));

        if (isApproval) {
          const approvedEpc = {
            id: 'epc-' + Date.now(),
            name: foundReq.company_name,
            email: foundReq.email,
            source: 'verified',
            status: 'valid',
            email_valid: true,
            states: [foundReq.state_name || 'Gujarat'],
            created_at: new Date().toISOString(),
          };

          let approvedList = [];
          const appCookie = document.cookie.split('; ').find((row) => row.startsWith('approved_epcs='));
          if (appCookie) {
            approvedList = JSON.parse(decodeURIComponent(appCookie.split('=')[1]) || '[]');
          } else {
            approvedList = JSON.parse(localStorage.getItem('approved_epcs') || '[]');
          }

          approvedList = [approvedEpc, ...approvedList.filter((e) => e.name?.toLowerCase() !== approvedEpc.name.toLowerCase())];
          const appCookieVal = encodeURIComponent(JSON.stringify(approvedList));
          document.cookie = `approved_epcs=${appCookieVal}; path=/; max-age=864000`;
          localStorage.setItem('approved_epcs', JSON.stringify(approvedList));

          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('epc_registration_channel');
            channel.postMessage({ type: 'EPC_APPROVED', epc: approvedEpc, approvedList });
            channel.close();
          }
        }

        dispatch(setAlert({
          type: "success",
          message: `Request for "${foundReq.company_name}" ${newStatus} successfully!`
        }));

        fetchRequests();
        window.dispatchEvent(new Event('sidebar-counts-refresh'));
        window.dispatchEvent(new Event('pipeline-status-refresh'));
        setProcessingId(null);
        setConfirmDialog({ isOpen: false, requestId: null, action: null, companyName: "", email: "", request: null });
        setSelectedFile(null);
        setFileError("");
        return;
      }
    } catch (e) {
      console.error("Local request approval error:", e);
    }

    try {
      if (action === "approve") {
        // Validate image is selected only if NOT BDE-onboarded
        const isBdeRequest = confirmDialog.request?.onboarding_source === 'bde';
        if (!selectedFile && !isBdeRequest && !confirmDialog.request?.reference_image) {
          setFileError("Reference image is required for approval");
          dispatch(setAlert({
            type: "error",
            message: "Reference image is required for approval"
          }));
          setProcessingId(null);
          return;
        }

        setUploadingImage(true);

        let response;
        if (selectedFile) {
          const formData = new FormData();
          formData.append("request_id", requestId);
          formData.append("action", "approve");
          formData.append("reference_image", selectedFile);

          response = await axios.post(
            `${API_URL}/solarshop/india/epcs/update-status?unique_id=${moduleUniqueId}&req_for=edit`,
            formData,
            {
              headers: {
                ...authHeaderObj(),
                "Content-Type": "multipart/form-data"
              }
            }
          );
        } else {
          response = await axios.post(
            `${API_URL}/solarshop/india/epcs/update-status?unique_id=${moduleUniqueId}&req_for=edit`,
            {
              request_id: requestId,
              action: "approve"
            },
            { headers: { ...authHeaderObj() } }
          );
        }

        setUploadingImage(false);

        if (response.data.status === "success") {
          dispatch(setAlert({
            type: "success",
            message: response.data.message || "Request approved successfully"
          }));

          setSelectedFile(null);
          setFileError("");
          fetchRequests();
          window.dispatchEvent(new Event('sidebar-counts-refresh'));
          window.dispatchEvent(new Event('pipeline-status-refresh'));
        } else {
          throw new Error(response.data.message || "Failed to approve request");
        }
      } else {
        // Reject - normal JSON request, no image required
        const response = await axios.post(
          `${API_URL}/solarshop/india/epcs/update-status?unique_id=${moduleUniqueId}&req_for=edit`,
          {
            request_id: requestId,
            action: action
          },
          { headers: { ...authHeaderObj() } }
        );

        if (response.data.status === "success") {
          dispatch(setAlert({
            type: "success",
            message: response.data.message || `Request rejected successfully`
          }));

          fetchRequests();
          window.dispatchEvent(new Event('sidebar-counts-refresh'));
          window.dispatchEvent(new Event('pipeline-status-refresh'));
        } else {
          throw new Error(response.data.message || "Failed to reject request");
        }
      }
    } catch (error) {
      console.error("Error updating request status:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to update request status"
      }));
      setUploadingImage(false);
    } finally {
      setProcessingId(null);
      setConfirmDialog({ isOpen: false, requestId: null, action: null, companyName: "", email: "", request: null });
      setSelectedFile(null);
      setFileError("");
    }
  };

  // Handle approve/reject click
  const handleAction = (requestId, action, companyName, email, status, requestObj = null) => {
    if (status?.toLowerCase() !== "pending") {
      dispatch(setAlert({
        type: "warning",
        message: `Cannot ${action} a request that is already ${status || 'processed'}`
      }));
      return;
    }

    setConfirmDialog({
      isOpen: true,
      requestId,
      action,
      companyName,
      email,
      request: requestObj
    });

    if (action === "approve") {
      setSelectedFile(null);
      setFileError("");
    }
  };

  const confirmAction = () => {
    const { requestId, action } = confirmDialog;
    if (requestId && action) {
      updateRequestStatus(requestId, action);
    }
  };

  // Handle file change for approve
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");

    if (file) {
      // Validate file type (supporting jpeg, jpg, png)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setFileError("Please upload a valid image file (JPEG, PNG)");
        dispatch(setAlert({
          type: "error",
          message: "Please upload a valid image file (JPEG, PNG)"
        }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFileError("Image size should be less than 5MB");
        dispatch(setAlert({
          type: "error",
          message: "Image size should be less than 5MB"
        }));
        return;
      }

      setSelectedFile(file);
    }
  };

  // Handle image click to open modal
  const handleImageClick = (imageUrl) => {
    setImageModal({
      isOpen: true,
      imageUrl: imageUrl
    });
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle search change - reset to page 1
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Handle state filter change - reset to page 1
  const handleStateChange = (value) => {
    setSelectedState(value);
    setCurrentPage(1);
  };

  // Handle status filter change - reset to page 1
  const handleStatusChange = (value) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  };

  // Handle EPC type filter change - reset to page 1
  const handleEpcTypeChange = (value) => {
    setSelectedEpcType(value);
    setCurrentPage(1);
  };

  // Format date display
  const formatDateDisplay = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  // Get relative time
  const getRelativeTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
      return `${Math.floor(diffDays / 30)} mo ago`;
    } catch {
      return "N/A";
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "rejected":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
  };

  // Get same as WhatsApp badge
  const getSameAsWhatsAppBadge = (isSame) => {
    if (isSame === 1 || isSame === true) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-success/10 text-success border border-success/20">
          <FaCheck className="mr-1 text-[9px]" /> Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-danger/10 text-danger border border-danger/20">
        <FaTimesCircle className="mr-1 text-[9px]" /> External
      </span>
    );
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedState("all");
    setSelectedStatus("all");
    setSelectedEpcType("all");
    setCurrentPage(1);
  };

  // Fetch requests when dependencies change & listen for real-time registrations
  useEffect(() => {
    fetchRequests();

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('epc_registration_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_REGISTRATION') {
          fetchRequests();
        }
      };
      return () => channel.close();
    }
  }, [currentPage, itemsPerPage, debouncedSearchQuery, selectedState, selectedStatus, selectedEpcType]);

  // Calculate displayed record range
  const startIndex = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalRecords);
  const displayedRequests = requests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Table Headers
  const tableHeaders = [
    { key: 'company_name', label: 'Company Entity & GST', width: '22%' },
    { key: 'contact_info', label: 'Contact Metadata', width: '18%' },
    { key: 'location', label: 'Geography', width: '13%' },
    { key: 'attribution', label: 'BDE & Franchise Assignment', width: '18%' },
    { key: 'status', label: 'Status', align: 'center', width: '10%' },
    { key: 'reference', label: 'Asset Reference', align: 'center', width: '7%' },
    { key: 'timeline', label: 'Timeline', width: '12%' },
    { key: 'actions', label: 'Actions', align: 'right', width: '10%' }
  ];

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="EPC Registration Control"
        subtitle="Validate and process incoming EPC requests with secure credential verification."
        icon={FaBuilding}
        stats={[
          { label: "Pending Validation", value: stats.total, description: "Total backlog" },
          { label: "Today's Intake", value: stats.today, description: "New requests" },
          { label: "Weekly Capacity", value: stats.thisWeek, description: "System volume" }
        ]}
      />

      {/* Control Bar */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 mb-2 block">Search Registry</label>
            <div className="relative group">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Company, Email, WhatsApp, BDE, Franchise..."
                className="w-full h-11 pl-11 pr-12 bg-surface border-2 border-border rounded-xl text-sm font-bold text-text-primary focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-text-muted/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-danger transition-colors font-bold text-lg"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* State Filter */}
          <div className="lg:w-64">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 mb-2 block">State Context</label>
            <Dropdown
              value={selectedState}
              onChange={handleStateChange}
              options={states}
              placeholder="All States"
              className="w-full h-11"
            />
          </div>

          {/* Status Dropdown */}
          <div className="lg:w-48">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 mb-2 block">Request Status</label>
            <Dropdown
              value={selectedStatus}
              onChange={handleStatusChange}
              options={statusOptions}
              placeholder="All Statuses"
              className="w-full h-11"
            />
          </div>

          {/* EPC Classification Filter */}
          <div className="lg:w-56">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 mb-2 block">EPC Classification</label>
            <Dropdown
              value={selectedEpcType}
              onChange={handleEpcTypeChange}
              options={[
                { text: "All EPC Types", value: "all" },
                ...epcTypes.map((t) => ({ text: t.name, value: t.name }))
              ]}
              placeholder="All EPC Types"
              className="w-full h-11"
            />
          </div>

          {/* Actions: Refresh & Reset */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => fetchRequests()}
              disabled={loading}
              className="h-11 px-4 rounded-xl bg-surface-hover hover:bg-primary/10 text-text-secondary hover:text-primary border border-border/80 transition-all active:scale-95 flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="Refresh records"
            >
              <FaSyncAlt className={`${loading ? 'animate-spin' : ''} text-xs`} />
              <span>Refresh</span>
            </button>

            {(searchQuery || selectedState !== "all" || selectedStatus !== "pending" || selectedEpcType !== "all") && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="md"
                leftIcon={<FaTrash size={12} />}
                className="h-11 rounded-xl bg-danger/5 text-danger border border-danger/10 hover:bg-danger hover:text-white"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mr-1">Quick Filter:</span>
          {[
            { id: "pending", label: "Pending", count: stats.total, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
            { id: "approved", label: "Approved", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
            { id: "rejected", label: "Rejected", color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
            { id: "all", label: "All Requests", color: "text-primary bg-primary/10 border-primary/20" }
          ].map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleStatusChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-2 ${isActive
                    ? `${tab.color} ring-2 ring-primary/20 shadow-xs`
                    : "bg-surface text-text-secondary border-border/60 hover:bg-surface-hover"
                  }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isActive ? 'bg-amber-600 text-white' : 'bg-surface-hover text-text-muted'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Filter: EPC Classification Live Breakdown */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mr-1">EPC Types:</span>
          <button
            onClick={() => handleEpcTypeChange("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-2 ${selectedEpcType === "all"
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface text-text-secondary border-border/60 hover:bg-surface-hover"
              }`}
          >
            <span>All Types</span>
          </button>
          {epcTypes.map((t) => {
            const isActive = selectedEpcType.toLowerCase() === t.name.toLowerCase();
            const count = epcTypeStats[t.name] || 0;
            return (
              <button
                key={t.name}
                onClick={() => handleEpcTypeChange(t.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-2 ${isActive
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-surface text-text-secondary border-border/60 hover:bg-surface-hover"
                  }`}
              >
                <span>{t.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Section */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/10 shadow-inner">
              <FaBuilding size={14} />
            </div>
            <div>
              <h2 className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">
                Incoming Requests Registry
              </h2>
              <p className="text-[10px] font-medium text-text-muted mt-0.5">
                Real-time queue of EPC contractor verification submissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
              Showing {startIndex}-{endIndex} of {totalRecords}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <CustomTable
            headers={tableHeaders}
            data={displayedRequests}
            loading={loading}
            emptyMessage={searchQuery || selectedState !== "all" || selectedStatus !== "all" ? "No matching records identified for current filters." : "No incoming EPC requests detected."}
            containerClassName="border-none shadow-none rounded-none bg-transparent"
            className="min-w-[1100px]"
            renderRow={(request, index) => (
              <tr
                key={request.id || index}
                className="group hover:bg-primary/[0.02] dark:hover:bg-white/[0.02] transition-colors border-b border-border/60"
              >
                {/* Column 1: Company Entity & GST */}
                <td className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary/15 to-primary/5 text-primary border border-primary/20 flex items-center justify-center font-black text-sm shrink-0 shadow-xs mt-0.5">
                      {request.company_name ? request.company_name.charAt(0).toUpperCase() : <FaBuilding size={12} />}
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-text-primary text-sm tracking-tight group-hover:text-primary transition-colors leading-snug">
                        {request.company_name}
                      </div>
                      {request.full_name && (
                        <div className="text-[11px] font-medium text-text-muted flex items-center gap-1">
                          <span className="opacity-70">👤</span> {request.full_name}
                        </div>
                      )}
                      {request.gst_number ? (
                        <button
                          type="button"
                          onClick={(e) => handleCopyGst(request.gst_number, e)}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-surface-hover hover:bg-primary/10 border border-border hover:border-primary/40 text-text-secondary hover:text-primary transition-colors cursor-pointer group/gst"
                          title="Click to copy GST Number"
                        >
                          <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">GST:</span>
                          <span>{request.gst_number}</span>
                          {copiedGst === request.gst_number ? (
                            <span className="text-[9px] font-bold text-emerald-600 ml-1">Copied!</span>
                          ) : (
                            <FaCopy size={9} className="opacity-0 group-hover/gst:opacity-70 transition-opacity ml-0.5" />
                          )}
                        </button>
                      ) : (
                        <div className="text-[10px] text-text-muted/60 italic">No GST Provided</div>
                      )}

                      {request.epc_type && (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            🏷️ {request.epc_type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Column 2: Contact Metadata */}
                <td className="px-6 py-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                      <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FaEnvelope size={10} />
                      </div>
                      <a
                        href={`mailto:${request.email}`}
                        className="hover:text-primary transition-colors truncate max-w-[190px] inline-block font-medium"
                        title={request.email}
                      >
                        {request.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                      <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <FaWhatsapp size={11} />
                      </div>
                      <a
                        href={`https://wa.me/${(request.whatsapp || request.phone_number || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-emerald-600 transition-colors font-mono"
                        title="Click to open WhatsApp"
                      >
                        {request.whatsapp || request.phone_number || "—"}
                      </a>
                    </div>
                  </div>
                </td>

                {/* Column 3: Geography */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                      <FaMapMarkerAlt className="text-rose-500 shrink-0" size={11} />
                      <span>{request.state_name || "—"}</span>
                    </div>
                    <div className="text-[11px] font-medium text-text-muted pl-4">
                      {request.district_name || "Region N/A"}
                    </div>
                  </div>
                </td>

                {/* Column 4: Attribution & Routing */}
                <td className="px-6 py-4">
                  <div className="space-y-1.5">
                    {request.onboarding_source === 'bde' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <FaUserTie size={10} />
                            <span>BDE: {request.bde_name || 'Assisted'}</span>
                          </span>
                        </div>
                        {request.assigned_reseller_name ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 max-w-[210px]"
                            title={`Assigned Franchise: ${request.assigned_reseller_name}`}
                          >
                            <FaBuilding size={10} className="shrink-0 text-emerald-600" />
                            <span className="truncate">{request.assigned_reseller_name}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20">
                            <FaStore size={10} className="shrink-0" />
                            <span>Direct Store (No Franchise)</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-surface-hover text-text-secondary border border-border">
                        <FaGlobe size={10} className="text-text-muted" />
                        <span>Direct Web Signup</span>
                      </span>
                    )}
                  </div>
                </td>

                {/* Column 5: Status */}
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-xs ${getStatusBadge(request.status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${request.status?.toLowerCase() === 'approved' ? 'bg-emerald-500' :
                        request.status?.toLowerCase() === 'rejected' ? 'bg-rose-500' :
                          'bg-amber-500 animate-pulse'
                      }`} />
                    <span className="capitalize">{request.status || 'pending'}</span>
                  </span>
                </td>

                {/* Column 6: Asset Reference */}
                <td className="px-6 py-4 text-center">
                  {request.reference_image ? (
                    <button
                      type="button"
                      onClick={() => handleImageClick(request.reference_image.startsWith('http') ? request.reference_image : `${API_URL}${request.reference_image}`)}
                      className="group/img relative w-11 h-11 rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-all shadow-xs hover:shadow-md mx-auto block cursor-pointer"
                      title="Click to view reference image"
                    >
                      <img
                        src={request.reference_image.startsWith('http') ? request.reference_image : `${API_URL}${request.reference_image}`}
                        alt="Ref"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                        <FaEye />
                      </div>
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-text-muted opacity-40 italic">—</span>
                  )}
                </td>

                {/* Column 7: Timeline */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-text-primary">
                      {formatDateDisplay(request.created_at)}
                    </div>
                    <div className="text-[10px] font-medium text-text-muted flex items-center gap-1">
                      <FaClock size={9} className="opacity-60" />
                      <span>{getRelativeTime(request.created_at)}</span>
                    </div>
                  </div>
                </td>

                {/* Column 8: Actions */}
                <td className="px-6 py-4 text-right">
                  {request.status?.toLowerCase() === "pending" ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAction(request.id, "approve", request.company_name, request.email, request.status, request)}
                        disabled={processingId === request.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs hover:shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Approve Contractor"
                      >
                        {processingId === request.id && confirmDialog.action === "approve" ? (
                          <FaSpinner className="animate-spin text-xs" />
                        ) : (
                          <FaCheck className="text-xs" />
                        )}
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleAction(request.id, "reject", request.company_name, request.email, request.status, request)}
                        disabled={processingId === request.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Reject Contractor"
                      >
                        {processingId === request.id && confirmDialog.action === "reject" ? (
                          <FaSpinner className="animate-spin text-xs" />
                        ) : (
                          <FaTrash className="text-xs" />
                        )}
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${request.status?.toLowerCase() === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400'
                        }`}>
                        {request.status?.toLowerCase() === 'approved' ? '✓ Approved' : '✕ Rejected'}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            )}
          />
        </div>

        <div className="p-6 border-t border-border bg-surface-hover/20">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalRecords}
            pageSize={itemsPerPage}
            className="w-full"
          />
        </div>
      </div>

      {/* Modals & Dialogs */}
      <Dialog
        isOpen={confirmDialog.isOpen}
        onClose={() => {
          setConfirmDialog({ isOpen: false, requestId: null, action: null, companyName: "", email: "", request: null });
          setSelectedFile(null);
          setFileError("");
        }}
        title={confirmDialog.action === "approve" ? "Finalize Credential Approval" : "Terminate Registration Request"}
        size="md"
      >
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-center">
            {confirmDialog.action === "approve" ? (
              <div className="w-16 h-16 bg-success/10 rounded-3xl flex items-center justify-center text-success border border-success/20 shadow-inner">
                <FaCheckCircle size={32} />
              </div>
            ) : (
              <div className="w-16 h-16 bg-danger/10 rounded-3xl flex items-center justify-center text-danger border border-danger/20 shadow-inner">
                <FaExclamationTriangle size={32} />
              </div>
            )}
          </div>

          <div className="text-center space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">
                {confirmDialog.action === "approve" ? "Registry Confirmation" : "Termination Protocol"}
              </h3>
              <p className="text-xs text-text-muted font-bold uppercase tracking-widest opacity-60">
                Validating identity for {confirmDialog.companyName}
              </p>
            </div>

            <div className="bg-surface-hover/50 p-5 rounded-2xl border border-border shadow-inner space-y-3">
              <p className="text-[10px] font-black text-text-primary">{confirmDialog.companyName}</p>
              <div className="h-px bg-border/40 w-12 mx-auto" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-bold text-text-muted">{confirmDialog.email}</p>
              </div>
            </div>

            {confirmDialog.request?.onboarding_source === 'bde' && (
              <div className="p-4 rounded-2xl border bg-blue-50/70 border-blue-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                    BDE Onboarded
                  </span>
                  <span className="text-[11px] font-bold text-blue-900">
                    BDE: {confirmDialog.request?.bde_name || 'BDE Representative'}
                  </span>
                </div>
                <div className="text-slate-800 text-xs pt-1 border-t border-blue-200/60 leading-relaxed">
                  {confirmDialog.request?.assigned_reseller_name ? (
                    <p>
                      Contractor is registered in <strong>{confirmDialog.request?.district_name || 'District'}</strong> and will be auto-assigned to Franchise Partner{' '}
                      <strong className="text-emerald-700 font-bold">{confirmDialog.request?.assigned_reseller_name}</strong>.
                    </p>
                  ) : (
                    <p className="text-indigo-900">
                      No operational franchisee exists in <strong>{confirmDialog.request?.district_name || 'District'}</strong>. Contractor will be granted <strong>Direct Solar Store login credentials</strong>.
                    </p>
                  )}
                </div>
              </div>
            )}

            {confirmDialog.action === "approve" && (
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-1">
                    Asset Verification {confirmDialog.request?.onboarding_source === 'bde' ? '(Optional for BDE GST-Verified)' : '*'}
                  </label>
                  <CustomFilePicker
                    name="reference_image"
                    onChange={handleFileChange}
                    accept="image/*"
                    files={selectedFile ? [selectedFile] : []}
                    className="w-full"
                  />
                </div>
                {confirmDialog.request?.onboarding_source !== 'bde' && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex gap-3">
                    <FaInfoCircle className="text-primary mt-0.5" size={14} />
                    <p className="text-[10px] font-bold text-primary uppercase leading-relaxed tracking-tight">Approval requires a verified reference document (JPEG/PNG). Max payload capacity: 5MB.</p>
                  </div>
                )}
                {fileError && <p className="text-xs font-black text-danger uppercase tracking-widest text-center animate-pulse">{fileError}</p>}
              </div>
            )}

            <p className="text-[10px] font-bold text-text-muted opacity-40">Operational Warning: This action is irreversible.</p>
          </div>

          <div className="flex gap-3 pt-6 border-t border-border">
            <Button variant="secondary" onClick={() => setConfirmDialog({ isOpen: false, requestId: null, action: null, companyName: "", email: "", request: null })} className="flex-1 rounded-xl">Cancel</Button>
            <Button
              variant={confirmDialog.action === "approve" ? "success" : "danger"}
              onClick={confirmAction}
              loading={uploadingImage || (processingId === confirmDialog.requestId)}
              className="flex-1 rounded-xl shadow-lg font-black uppercase tracking-widest text-xs"
              disabled={confirmDialog.action === "approve" && !selectedFile && confirmDialog.request?.onboarding_source !== 'bde' && !confirmDialog.request?.reference_image}
            >
              Confirm {confirmDialog.action}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={imageModal.isOpen}
        onClose={() => setImageModal({ isOpen: false, imageUrl: null })}
        title="Asset Verification"
        size="xl"
      >
        <div className="relative aspect-video bg-surface rounded-2xl overflow-hidden border border-border group shadow-2xl">
          <img src={imageModal.imageUrl} alt="Ref" className="w-full h-full object-contain" />
          <div className="absolute inset-x-0 bottom-0 p-6 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white font-black text-[10px]">Registry Credential Asset View</p>
          </div>
        </div>
      </Dialog>
      <SendEpcWelcomeAccessModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        epc={selectedEpcForAccess}
      />
    </div>
  );
}