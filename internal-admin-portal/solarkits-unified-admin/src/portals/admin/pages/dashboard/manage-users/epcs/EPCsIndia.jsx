import { useState, useEffect, useRef } from "react";
import {
    FaFileExcel,
    FaInfoCircle,
    FaSpinner,
    FaUpload,
    FaClock,
    FaBuilding,
    FaSearch,
    FaExclamationTriangle,
    FaSave,
    FaTimes,
    FaCheckCircle,
    FaPlus,
    FaLightbulb,
    FaFilter,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaMapMarkerAlt,
    FaLayerGroup,
    FaChartBar,
    FaTable
} from "react-icons/fa";
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import CustomFilePicker from "@/components/CustomFilePicker";
import Dropdown from "@/components/Dropdown";
import IconButton from "@/components/IconButton";
import CustomInput from "@/components/CustomInput";
import Dialog from "@/components/Dialog";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import SendEpcWelcomeAccessModal from "../../../../components/SendEpcWelcomeAccessModal";
import { FaWhatsapp } from "react-icons/fa";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import DynamicBulkUploadModal from "../../../../components/bulk-upload/DynamicBulkUploadModal";
import { EPC_DIRECTORY_FIELD_OPTIONS, EPC_DIRECTORY_PRESETS } from "../../../../components/bulk-upload/bulkUploadSchemas";

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

export default function EPCsIndia({ moduleUniqueId }) {
    const dispatch = useDispatch();
    const API_URL = import.meta.env.VITE_API_URL;

    // ============ DATA STATES ============
    const [epcs, setEpcs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [states, setStates] = useState([]);
    const [loadingStates, setLoadingStates] = useState(false);

    // ============ SUMMARY STATS ============
    const [summary, setSummary] = useState({
        total_epcs: 0,
        total_valid_emails: 0,
        total_invalid_emails: 0,
        total_state_assignments: 0,
        avg_states_per_epc: 0,
        source_breakdown: {
            government: 0,
            other: 0
        }
    });

    // ============ BULK UPLOAD MODAL STATE ============
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

    // ============ SINGLE EPC FORM STATES ============
    const [showSingleEPCForm, setShowSingleEPCForm] = useState(false);
    const [singleEPCFormData, setSingleEPCFormData] = useState({
        epc_name: "",
        email: "",
        states: []
    });
    const [singleEPCErrors, setSingleEPCErrors] = useState({});
    const [singleEPCTouched, setSingleEPCTouched] = useState({});
    const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

    // ============ FILTER STATES ============
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sourceFilter, setSourceFilter] = useState("all");
    const [stateFilter, setStateFilter] = useState([]);
    const [clusterFilter, setClusterFilter] = useState("all");
    const [clusterGroups, setClusterGroups] = useState([]);
    const [stateGroups, setStateGroups] = useState([]);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // ============ SORT STATES ============
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState("DESC");

    // ============ PAGINATION STATES ============
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // ============ UI STATES ============
    const [isSearchTyping, setIsSearchTyping] = useState(false);
    const searchTimeoutRef = useRef(null);

    // Debounced search query
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // ============ OPTIONS ============
    const itemsPerPageOptions = [
        { text: "10 per page", value: 10 },
        { text: "20 per page", value: 20 },
        { text: "50 per page", value: 50 },
        { text: "100 per page", value: 100 },
    ];

    const statusOptions = [
        { text: "All Status", value: "all" },
        { text: "Valid Emails", value: "valid" },
        { text: "Invalid Emails", value: "invalid" },
    ];

    const sourceOptions = [
        { text: "All Sources", value: "all" },
        { text: "Government", value: "government" },
        { text: "Other", value: "other" },
    ];

    const sortOptions = [
        { text: "Created Date", value: "created_at" },
        { text: "Name", value: "name" },
        { text: "Email", value: "email" },
        { text: "State Count", value: "state_count" },
    ];

    // ============ API CALLS ============
    const fetchStates = async () => {
        setLoadingStates(true);
        try {
            const response = await axios.get(
                `${API_URL}/epcs/in/states?unique_id=${moduleUniqueId}&req_for=view`,
                { headers: { ...authHeaderObj() } }
            );

            if (response.data.status === "success") {
                const formattedStates = response.data.states.map(state => ({
                    text: state.name,
                    value: state.id
                }));
                setStates(formattedStates);
            }
        } catch (error) {
            console.error("Error fetching states:", error);
        } finally {
            setLoadingStates(false);
        }
    };

    const fetchEPCs = async (searchValue = debouncedSearchQuery) => {
        setLoading(true);
        let approvedLocal = [];
        try {
            const cookieMatch = document.cookie.split('; ').find(row => row.startsWith('approved_epcs='));
            if (cookieMatch) {
                approvedLocal = JSON.parse(decodeURIComponent(cookieMatch.split('=')[1]) || '[]');
            } else {
                approvedLocal = JSON.parse(localStorage.getItem('approved_epcs') || '[]');
            }
        } catch (e) {}

        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                sortBy: sortBy,
                sortOrder: sortOrder,
                status: statusFilter,
                source: sourceFilter,
                ...(searchValue && { search: searchValue }),
                ...(dateFrom && { fromDate: dateFrom }),
                ...(dateTo && { toDate: dateTo }),
                ...(stateFilter.length > 0 && { stateIds: stateFilter.join(',') }),
                ...(clusterFilter && clusterFilter !== "all" && { clusterId: clusterFilter })
            });

            const response = await axios.get(
                `${API_URL}/epcs/in/list?${params.toString()}&unique_id=${moduleUniqueId}&req_for=view`,
                { headers: { ...authHeaderObj() } }
            );

            if (response.data.status === "success") {
                const apiEpcs = response.data.data || [];
                const combinedEpcs = [...approvedLocal, ...apiEpcs.filter(a => !approvedLocal.some(b => b.name?.toLowerCase() === a.name?.toLowerCase()))];
                
                // Search filter on local items
                let filteredEpcs = combinedEpcs;
                if (searchValue) {
                    const q = searchValue.toLowerCase();
                    filteredEpcs = combinedEpcs.filter(e => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q));
                }

                setEpcs(filteredEpcs);
                setClusterGroups(response.data.cluster_groups || []);
                setStateGroups(response.data.state_groups || []);
                const totalCount = (response.data.pagination.total_records || apiEpcs.length) + approvedLocal.length;
                setTotalRecords(totalCount);
                setTotalPages(Math.max(1, Math.ceil(totalCount / itemsPerPage)));
                
                const baseSummary = response.data.summary?.overall || {};
                setSummary({
                    ...baseSummary,
                    total_epcs: totalCount,
                    total_valid_emails: (baseSummary.total_valid_emails || 0) + approvedLocal.length
                });

                if (response.data.pagination.total_pages < currentPage) {
                    setCurrentPage(1);
                }
            }
        } catch (error) {
            console.warn("Backend EPC list error, using approved local fallback:", error);
            let filteredEpcs = approvedLocal;
            if (searchValue) {
                const q = searchValue.toLowerCase();
                filteredEpcs = approvedLocal.filter(e => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q));
            }
            setEpcs(filteredEpcs);
            setTotalRecords(filteredEpcs.length);
            setTotalPages(Math.max(1, Math.ceil(filteredEpcs.length / itemsPerPage)));
        } finally {
            setInitialLoading(false);
            setLoading(false);
            setIsSearchTyping(false);
        }
    };

    // Load states on mount and listen for real-time approved EPCs
    useEffect(() => {
        fetchStates();

        if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('epc_registration_channel');
            channel.onmessage = (event) => {
                if (event.data?.type === 'EPC_APPROVED') {
                    fetchEPCs();
                }
            };
            return () => channel.close();
        }
    }, []);

    // Effect for debounced search and filter changes
    useEffect(() => {
        if (!initialLoading) {
            fetchEPCs(debouncedSearchQuery);
        }
    }, [
        debouncedSearchQuery,
        currentPage,
        itemsPerPage,
        sortBy,
        sortOrder,
        statusFilter,
        sourceFilter,
        stateFilter,
        clusterFilter,
        dateFrom,
        dateTo
    ]);

    // Load on mount
    useEffect(() => {
        fetchEPCs();
    }, []);

    // ============ SEARCH HANDLERS ============
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        setCurrentPage(1);
        setIsSearchTyping(true);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setIsSearchTyping(false);
        }, 1000);
    };

    const clearSearch = () => {
        setSearchQuery("");
        setCurrentPage(1);
        setIsSearchTyping(false);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // ============ DYNAMIC BULK UPLOAD HANDLER ============
    const handleBulkDirectoryImport = async (validRows, { batchDefaults, requiredFields }) => {
        const epcsPayload = validRows.map((row) => ({
            name: row.name,
            email: row.email || undefined,
            states: String(row.state_name || batchDefaults?.default_state || '')
                .split(/[,;|]+/)
                .map((s) => s.trim())
                .filter(Boolean),
            contact_person: row.contact_person || undefined,
            mobile_number: row.mobile_number || undefined,
            gst_number: row.gst_number || undefined,
            district_name: row.district_name || undefined,
            cluster_id: row.cluster_id || undefined,
            cluster_name: row.cluster_name || undefined,
            cluster_code: row.cluster_code || undefined,
            pincode: row.pincode || undefined,
            address_line: row.address_line || undefined,
            epc_type: row.epc_type || undefined,
            source: row.source || undefined,
            remarks: row.remarks || undefined,
            custom_attributes: row._customFields || {},
        }));

        const response = await axios.post(
            `${API_URL}/epcs/in/list?unique_id=${moduleUniqueId}&req_for=add`,
            { epcs: epcsPayload, default_settings: { ...batchDefaults, required_fields: requiredFields } },
            { headers: { ...authHeaderObj() } }
        );

        const summary = response.data?.summary || {};
        const added = Number(summary.added || 0);
        const merged = Number(summary.merged || 0);
        const duplicate = Number(summary.duplicate || 0);
        const failed = Number(summary.failed || 0) + Number(summary.email_conflict || 0);
        const clusterSummaryEntries = Object.entries(response.data?.cluster_summary || {});

        if (added > 0 || merged > 0) {
            fetchEPCs();
        }

        const clusterNote = clusterSummaryEntries.length > 0
            ? ` Auto-assigned into ${clusterSummaryEntries.length} Cluster(s) (${clusterSummaryEntries.slice(0, 3).map(([c, n]) => `${c}: ${n}`).join(', ')}).`
            : '';
        const msg = `Added ${added} new EPC(s), updated ${merged} existing assignment(s).${clusterNote} Skipped ${duplicate} duplicate(s) and ${failed} invalid/conflicting row(s).`;
        dispatch(setAlert({
            type: added > 0 || merged > 0 ? "success" : "warning",
            message: msg
        }));

        return {
            success: true,
            message: msg,
            skippedDetails: response.data?.skipped_details || [],
        };
    };

    // ============ SINGLE EPC FUNCTIONS ============
    const validateSingleField = (name, value) => {
        switch (name) {
            case "epc_name":
                if (!value || !value.trim()) return "EPC name is required";
                if (value.trim().length < 2) return "EPC name must be at least 2 characters";
                if (value.trim().length > 100) return "EPC name must be less than 100 characters";
                return "";

            case "email":
                if (!value || !value.trim()) return "Email is required";
                if (!emailRegex.test(value)) return "Please enter a valid email address";
                if (value.trim().length > 255) return "Email must be less than 255 characters";
                return "";

            case "states":
                if (!value || value.length === 0) return "At least one state must be selected";
                return "";

            default:
                return "";
        }
    };

    const validateSingleForm = () => {
        const newErrors = {};

        Object.keys(singleEPCFormData).forEach(key => {
            const error = validateSingleField(key, singleEPCFormData[key]);
            if (error) newErrors[key] = error;
        });

        setSingleEPCErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSingleChange = (e) => {
        const { name, value } = e.target;

        setSingleEPCFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (singleEPCErrors[name]) {
            setSingleEPCErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }
    };

    const handleStatesChange = (values) => {
        setSingleEPCFormData(prev => ({
            ...prev,
            states: values
        }));

        if (singleEPCErrors.states) {
            setSingleEPCErrors(prev => ({
                ...prev,
                states: ""
            }));
        }
    };

    const handleSingleBlur = (e) => {
        const { name, value } = e.target;

        setSingleEPCTouched(prev => ({
            ...prev,
            [name]: true
        }));

        const error = validateSingleField(name, value);
        setSingleEPCErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    const handleStatesBlur = () => {
        setSingleEPCTouched(prev => ({
            ...prev,
            states: true
        }));

        const error = validateSingleField('states', singleEPCFormData.states);
        setSingleEPCErrors(prev => ({
            ...prev,
            states: error
        }));
    };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();

        const allTouched = {};
        Object.keys(singleEPCFormData).forEach(key => {
            allTouched[key] = true;
        });
        setSingleEPCTouched(allTouched);

        if (validateSingleForm()) {
            setIsSubmittingSingle(true);

            try {
                const response = await axios.post(
                    `${API_URL}/epcs/in/single?unique_id=${moduleUniqueId}&req_for=add`,
                    {
                        name: singleEPCFormData.epc_name.trim(),
                        email: singleEPCFormData.email.trim().toLowerCase(),
                        states: singleEPCFormData.states
                    },
                    { headers: { ...authHeaderObj() } }
                );

                if (response.data.status === "success") {
                    dispatch(
                        setAlert({
                            message: response.data.message,
                            type: "success",
                        })
                    );

                    setSingleEPCFormData({
                        epc_name: "",
                        email: "",
                        states: []
                    });
                    setSingleEPCErrors({});
                    setSingleEPCTouched({});
                    setShowSingleEPCForm(false);

                    fetchEPCs();
                } else {
                    dispatch(
                        setAlert({
                            message: response.data.message || "Failed to add EPC.",
                            type: "warning",
                        })
                    );
                }
            } catch (error) {
                dispatch(
                    setAlert({
                        message: error.response?.data?.message || "Failed to add EPC. Please try again.",
                        type: "error",
                    })
                );
            } finally {
                setIsSubmittingSingle(false);
            }
        }
    };

    const handleSingleCancel = () => {
        setShowSingleEPCForm(false);
        setSingleEPCFormData({
            epc_name: "",
            email: "",
            states: []
        });
        setSingleEPCErrors({});
        setSingleEPCTouched({});
    };

    // ============ FILTER FUNCTIONS ============
    const handleStatusFilterChange = (value) => {
        setStatusFilter(value);
        setCurrentPage(1);
    };

    const handleSourceFilterChange = (value) => {
        setSourceFilter(value);
        setCurrentPage(1);
    };

    const handleStateFilterChange = (values) => {
        setStateFilter(values);
        setCurrentPage(1);
    };

    const handleSortChange = (value) => {
        setSortBy(value);
        setCurrentPage(1);
    };

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === "ASC" ? "DESC" : "ASC");
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("all");
        setSourceFilter("all");
        setStateFilter([]);
        setClusterFilter("all");
        setDateFrom("");
        setDateTo("");
        setSortBy("created_at");
        setSortOrder("DESC");
        setCurrentPage(1);
        setIsSearchTyping(false);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
    };

    // ============ PAGINATION FUNCTIONS ============
    const handlePageChange = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const handleItemsPerPageChange = (value) => {
        setItemsPerPage(value);
        setCurrentPage(1);
    };

    // ============ RENDER FUNCTIONS ============
    const getSortIcon = (field) => {
        if (sortBy !== field) return <FaSort className="text-text-secondary opacity-50" />;
        return sortOrder === "ASC" ?
            <FaSortUp className="text-primary" /> :
            <FaSortDown className="text-primary" />;
    };

    const handleSortClick = (field) => {
        if (sortBy === field) {
            toggleSortOrder();
        } else {
            setSortBy(field);
            setSortOrder("ASC");
        }
        setCurrentPage(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString();
    };

    // Function to display states directly in table
    const renderStates = (states) => {
        if (!states || states.length === 0) {
            return <span className="text-text-muted text-xs">No states</span>;
        }

        return (
            <div className="flex flex-wrap gap-1 max-w-xs">
                {states.map((state, idx) => {
                    const stateName = typeof state === 'string' ? state : state?.name || state?.text || 'Unknown';
                    const stateId = state?.id || idx;
                    return (
                        <span
                            key={stateId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
                            title={stateName}
                        >
                            <FaMapMarkerAlt className="text-primary text-[10px]" />
                            {stateName.length > 10 ? stateName.substring(0, 15) + '...' : stateName}
                        </span>
                    );
                })}
            </div>
        );
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader text="Loading EPC data..." />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="EPCs Master Registry"
                subtitle="Manage and oversee Engineering, Procurement, and Construction partners across India."
                icon={FaBuilding}
                stats={[
                    { label: "Total EPCs", value: summary.total_epcs, description: "Active partners" },
                    { label: "Valid Emails", value: summary.total_valid_emails, description: "Properly formatted" },
                    { label: "Assignments", value: summary.total_state_assignments, description: "State territories" }
                ]}
                actions={
                    <Button
                        onClick={() => setShowSingleEPCForm(true)}
                        variant="primary"
                        leftIcon={<FaPlus />}
                    >
                        Add Single EPC
                    </Button>
                }
            />

            {/* Source Breakdown & Quick Stats */}
            <div className="card group overflow-hidden">
                <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <FaChartBar size={24} />
                            </div>
                            <div>
                                <h2 className="font-black text-text-primary uppercase tracking-widest text-xs">Operational Intelligence</h2>
                                <p className="text-text-secondary text-[10px] font-bold tracking-widest uppercase mt-0.5">Source & Data Integrity</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="px-4 py-2 bg-surface-hover rounded-xl border border-border/50 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                <span className="text-sm font-bold text-text-primary">Government: {summary.source_breakdown?.government || 0}</span>
                            </div>
                            <div className="px-4 py-2 bg-surface-hover rounded-xl border border-border/50 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                <span className="text-sm font-bold text-text-primary">Other: {summary.source_breakdown?.other || 0}</span>
                            </div>
                            <div className="px-4 py-2 bg-danger/5 rounded-xl border border-danger/20 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-danger animate-ping"></span>
                                <span className="text-sm font-bold text-danger">Invalid Emails: {summary.total_invalid_emails}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============ CARD 2: ADD EPC (SINGLE FORM & EXCEL UPLOAD) ============ */}
            <div className="card shadow-sm hover:shadow-md transition-all duration-300">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FaPlus className="text-primary" />
                        <h2 className="font-semibold text-text-primary">Add New EPC</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                            <FaClock size={10} />
                            {new Date().toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Single EPC Form Section */}
                        <div className="border-r border-border lg:pr-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-medium text-text-primary flex items-center gap-2">
                                    <FaSave className="text-primary" />
                                    Add Single EPC
                                </h3>
                                {!showSingleEPCForm && (
                                    <Button
                                        onClick={() => setShowSingleEPCForm(true)}
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<FaPlus size={12} />}
                                    >
                                        New Form
                                    </Button>
                                )}
                            </div>

                            {showSingleEPCForm ? (
                                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                                    <form onSubmit={handleSingleSubmit} className="space-y-4">
                                        <div>
                                            <CustomInput
                                                name="epc_name"
                                                label="EPC Name *"
                                                placeholder="Enter EPC company name"
                                                type="text"
                                                value={singleEPCFormData.epc_name}
                                                onChange={handleSingleChange}
                                                onBlur={handleSingleBlur}
                                                className="w-full"
                                                disabled={isSubmittingSingle}
                                            />
                                            {singleEPCTouched.epc_name && singleEPCErrors.epc_name && (
                                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                                    <span className="text-xs">⚠</span>
                                                    {singleEPCErrors.epc_name}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <CustomInput
                                                name="email"
                                                label="Email Address *"
                                                placeholder="Enter email address"
                                                type="email"
                                                value={singleEPCFormData.email}
                                                onChange={handleSingleChange}
                                                onBlur={handleSingleBlur}
                                                className="w-full"
                                                disabled={isSubmittingSingle}
                                            />
                                            {singleEPCTouched.email && singleEPCErrors.email && (
                                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                                    <span className="text-xs">⚠</span>
                                                    {singleEPCErrors.email}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                                Working States * <span className="text-xs text-text-muted">(Select one or more)</span>
                                            </label>
                                            <MultiSelectDropdownWithSearchInput
                                                values={singleEPCFormData.states}
                                                onChange={handleStatesChange}
                                                options={states}
                                                disabled={isSubmittingSingle || loadingStates}
                                                className="w-full"
                                                placeholder={loadingStates ? "Loading states..." : "Search states..."}
                                                onBlur={handleStatesBlur}
                                            />
                                            {singleEPCTouched.states && singleEPCErrors.states && (
                                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                                    <span className="text-xs">⚠</span>
                                                    {singleEPCErrors.states}
                                                </p>
                                            )}
                                        </div>

                                        <div className="p-3 bg-white rounded-lg border border-primary/20">
                                            <p className="text-xs text-text-secondary flex items-start gap-2">
                                                <FaLightbulb className="text-primary shrink-0 mt-0.5" size={16} />
                                                <span className="flex-1">
                                                    <strong className="text-primary block mb-1">Quick Tips:</strong>
                                                    • Email format will be validated automatically<br />
                                                    • Source will be set to 'government' automatically<br />
                                                    • Same EPC can work in multiple states<br />
                                                    • Duplicate name+email+state combinations are not allowed
                                                </span>
                                            </p>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                type="submit"
                                                disabled={isSubmittingSingle}
                                                loading={isSubmittingSingle}
                                                variant="primary"
                                                leftIcon={<FaSave />}
                                                fullWidth
                                            >
                                                {isSubmittingSingle ? 'Adding...' : 'Save EPC'}
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={handleSingleCancel}
                                                disabled={isSubmittingSingle}
                                                variant="secondary"
                                                leftIcon={<FaTimes />}
                                                fullWidth
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>

                                    {Object.keys(singleEPCErrors).length === 0 &&
                                        singleEPCFormData.epc_name.trim() !== "" &&
                                        singleEPCFormData.email.trim() !== "" &&
                                        singleEPCFormData.states.length > 0 && (
                                            <div className="mt-4 px-4 py-3 bg-success-soft border border-success/20 rounded-lg flex items-center gap-2">
                                                <FaCheckCircle className="text-success" />
                                                <span className="text-sm text-success font-medium">
                                                    ✓ Form is valid and ready to submit with {singleEPCFormData.states.length} state(s)
                                                </span>
                                            </div>
                                        )}
                                </div>
                            ) : (
                                <div className="bg-surface-hover rounded-xl p-8 text-center border-2 border-dashed border-border transition-colors">
                                    <FaSave className="text-text-muted/30 text-4xl mx-auto mb-3" />
                                    <p className="text-text-secondary text-sm font-medium">Click "New Form" to add a single EPC</p>
                                </div>
                            )}
                        </div>

                        {/* Dynamic BDE-Style Bulk Upload Section */}
                        <div className="lg:pl-6">
                            <h3 className="font-semibold text-text-primary flex items-center gap-2 mb-4">
                                <FaFileExcel className="text-success" />
                                Dynamic Bulk Upload (Excel / CSV)
                            </h3>

                            <div className="space-y-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                                <FaUpload className="text-primary text-3xl mx-auto" />
                                <div>
                                    <p className="text-sm font-bold text-text-primary">
                                        BDE-Style Dynamic Field Selection & Inline Correction
                                    </p>
                                    <p className="text-xs text-text-secondary mt-1">
                                        Tick required/optional fields, load .xlsx or .csv, auto-translate renamed headers into DB fields, apply live DB batch defaults, and fix invalid rows inline before saving.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => setShowBulkUploadModal(true)}
                                    variant="primary"
                                    leftIcon={<FaUpload />}
                                >
                                    Open Bulk Upload EPCs
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DynamicBulkUploadModal
                isOpen={showBulkUploadModal}
                onClose={() => setShowBulkUploadModal(false)}
                title="Bulk Upload EPCs (India Directory)"
                subtitle="Import contractor companies in bulk via Excel (.xlsx) or CSV with dynamic batch defaults, automatic column renaming, and inline error correction"
                badgeText="Dynamic Fields Support"
                fieldOptions={EPC_DIRECTORY_FIELD_OPTIONS}
                presets={EPC_DIRECTORY_PRESETS}
                defaultSelectedKeys={['name', 'email', 'state_name', 'mobile_number', 'gst_number', 'district_name']}
                enableDefaultFields={{ state: true, district: true, cluster: true, epcType: true, leadSource: true, remarks: true }}
                allowCustomColumns={false}
                sampleFileName="india_epcs_sample_template.csv"
                submitLabel="Import EPCs"
                onSubmitImport={handleBulkDirectoryImport}
            />

            {/* ============ CARD 3: EPC DATA TABLE ============ */}
            <div className="card shadow-sm hover:shadow-md transition-all duration-300">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FaTable className="text-primary" />
                        <h2 className="font-semibold text-text-primary">EPC Records</h2>
                    </div>
                    <div className="text-sm text-text-secondary">
                        Total: <span className="font-semibold text-primary">{totalRecords}</span> records
                    </div>
                </div>

                <div className="p-6">
                    {/* Search Bar */}
                    <div className="mb-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Search by EPC name or email..."
                                className="w-full bg-surface border border-border rounded-lg px-4 py-2 pl-10 pr-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                            />
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />

                            {searchQuery && (
                                <>
                                    {isSearchTyping ? (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <FaSpinner className="animate-spin text-primary" size={14} />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={clearSearch}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                                        >
                                            ×
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Filter Toggle */}
                    <Button
                        onClick={() => setShowFilters(!showFilters)}
                        variant="ghost"
                        size="sm"
                        leftIcon={<FaFilter />}
                        className="mb-4"
                    >
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1 block">Status</label>
                                    <Dropdown
                                        value={statusFilter}
                                        onChange={handleStatusFilterChange}
                                        options={statusOptions}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1 block">Source</label>
                                    <Dropdown
                                        value={sourceFilter}
                                        onChange={handleSourceFilterChange}
                                        options={sourceOptions}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1 block">Sort By</label>
                                    <Dropdown
                                        value={sortBy}
                                        onChange={handleSortChange}
                                        options={sortOptions}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1 block">Sort Order</label>
                                    <Button
                                        onClick={toggleSortOrder}
                                        variant="secondary"
                                        size="sm"
                                        className="w-full justify-between"
                                        rightIcon={sortOrder === "ASC" ? <FaSortUp /> : <FaSortDown />}
                                    >
                                        {sortOrder === "ASC" ? "Ascending" : "Descending"}
                                    </Button>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1 block">State Filter</label>
                                    <MultiSelectDropdownWithSearchInput
                                        values={stateFilter}
                                        onChange={handleStateFilterChange}
                                        options={states}
                                        className="w-full"
                                        placeholder="Filter by states..."
                                        disabled={loadingStates}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1 block">From Date</label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1 block">To Date</label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end mt-4">
                                <Button
                                    onClick={clearFilters}
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<FaTimes />}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Results Info */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-text-secondary">
                            Found {totalRecords} matching records
                            {isSearchTyping && (
                                <span className="ml-2 text-primary animate-pulse">
                                    (typing...)
                                </span>
                            )}
                        </div>
                        {loading && !isSearchTyping && (
                            <div className="flex items-center gap-2 text-sm text-primary">
                                <FaSpinner className="animate-spin" size={12} />
                                <span>Searching...</span>
                            </div>
                        )}
                    </div>

                    {/* State-wise & Cluster-wise Dynamic Grouping Filter */}
                    {(clusterGroups.length > 0 || stateGroups.length > 0) && (
                        <div className="mb-4 p-3 rounded-xl bg-slate-50/90 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                    <FaLayerGroup className="text-indigo-500" />
                                    State & Cluster-Wise EPC Groups ({clusterGroups.filter((c) => c.is_assigned).length} Assigned Clusters • {stateGroups.length} States)
                                </span>
                                {clusterFilter !== "all" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setClusterFilter("all");
                                            setCurrentPage(1);
                                        }}
                                        className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                    >
                                        Clear Cluster Filter
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setClusterFilter("all");
                                        setCurrentPage(1);
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                                        clusterFilter === "all"
                                            ? "bg-indigo-600 text-white border-indigo-600"
                                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                                    }`}
                                >
                                    All EPCs ({totalRecords})
                                </button>
                                {clusterGroups.slice(0, 18).map((cg) => {
                                    const filterVal = cg.is_assigned ? (cg.cluster_id || cg.cluster_name) : `unassigned::${cg.state_name || 'Unspecified State'}`;
                                    const isActive = clusterFilter === filterVal;
                                    return (
                                        <button
                                            key={cg.cluster_id || cg.cluster_name}
                                            type="button"
                                            onClick={() => {
                                                setClusterFilter(filterVal);
                                                setCurrentPage(1);
                                            }}
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                                                isActive
                                                    ? "bg-indigo-600 text-white border-indigo-600"
                                                    : cg.is_assigned
                                                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                            }`}
                                        >
                                            {cg.cluster_name}
                                            {cg.cluster_code ? ` (${cg.cluster_code})` : ""} • {cg.state_name} ({cg.count})
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    {loading ? (
                        <div className="text-center py-8">
                            <Loader text="Loading data..." />
                        </div>
                    ) : epcs.length > 0 ? (
                        <>
                            <div className="overflow-x-auto border border-border rounded-lg">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-linear-120 from-primary/5 to-primary/10">
                                        <tr>
                                            <th
                                                className="py-3 px-4 text-left font-medium text-text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                                onClick={() => handleSortClick("name")}
                                            >
                                                <div className="flex items-center gap-2">
                                                    EPC Name
                                                    {getSortIcon("name")}
                                                </div>
                                            </th>
                                            <th
                                                className="py-3 px-4 text-left font-medium text-text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                                onClick={() => handleSortClick("email")}
                                            >
                                                <div className="flex items-center gap-2">
                                                    Email
                                                    {getSortIcon("email")}
                                                </div>
                                            </th>
                                            <th
                                                className="py-3 px-4 text-left font-medium text-text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                                onClick={() => handleSortClick("source")}
                                            >
                                                <div className="flex items-center gap-2">
                                                    Source
                                                    {getSortIcon("source")}
                                                </div>
                                            </th>
                                            <th className="py-3 px-4 text-left font-medium text-text-primary">
                                                Category
                                            </th>
                                            <th className="py-3 px-4 text-left font-medium text-text-primary">
                                                Status
                                            </th>
                                            <th
                                                className="py-3 px-4 text-left font-medium text-text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                                onClick={() => handleSortClick("state_count")}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <FaLayerGroup className="text-sm" />
                                                    States
                                                    {getSortIcon("state_count")}
                                                </div>
                                            </th>
                                            <th className="py-3 px-4 text-left font-medium text-text-primary">
                                                Cluster & District
                                            </th>
                                            <th
                                                className="py-3 px-4 text-left font-medium text-text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                                                onClick={() => handleSortClick("created_at")}
                                            >
                                                <div className="flex items-center gap-2">
                                                    Created At
                                                    {getSortIcon("created_at")}
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {epcs.map((epc) => (
                                            <tr key={epc.id} className="hover:bg-primary/5 transition-colors">
                                                <td className="py-3 px-4 text-text-primary font-medium capitalize">
                                                    {epc.name}
                                                </td>
                                                <td className="py-3 px-4 text-text-secondary">
                                                    {epc.email || '—'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${epc.source === 'government'
                                                        ? 'bg-linear-120 from-blue-500 to-blue-600 text-white'
                                                        : 'bg-linear-120 from-gray-500 to-gray-600 text-white'
                                                        }`}>
                                                        {epc.source || 'government'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {(() => {
                                                        const code = (epc.epc_type_code || '').toLowerCase();
                                                        const label = epc.epc_type || 'Registered EPC';
                                                        const badgeClass =
                                                            code === 'buyer' || label.toLowerCase().includes('buyer')
                                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                                : code === 'verified_epc' || label.toLowerCase().includes('verified')
                                                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                                                : 'bg-amber-100 text-amber-800 border-amber-200';
                                                        return (
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                                                                {label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {(() => {
                                                        const isValid = epc.email_valid ?? (epc.status === 'valid' || epc.status === 'approved' || (epc.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epc.email)));
                                                        return (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${isValid
                                                                ? 'bg-linear-120 from-green-500 to-green-600 text-white'
                                                                : 'bg-linear-120 from-red-500 to-red-600 text-white'
                                                                }`}>
                                                                {isValid ? 'Valid' : 'Invalid'}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {renderStates(epc.states)}
                                                </td>
                                                <td className="py-3 px-4 text-xs">
                                                    {epc.cluster_name ? (
                                                        <div className="space-y-0.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px]">
                                                                {epc.cluster_name}
                                                                {epc.cluster_code ? ` (${epc.cluster_code})` : ''}
                                                            </span>
                                                            {epc.district_name && (
                                                                <div className="text-[11px] text-text-secondary pl-1">
                                                                    {epc.district_name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-text-secondary">
                                                            {epc.district_name || 'Unassigned'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-text-secondary text-xs">
                                                    {formatDate(epc.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-text-secondary">Show:</span>
                                        <Dropdown
                                            value={itemsPerPage}
                                            onChange={handleItemsPerPageChange}
                                            options={itemsPerPageOptions}
                                            className="w-32"
                                        />
                                    </div>

                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                        totalItems={totalRecords}
                                        pageSize={itemsPerPage}
                                        className="mt-6 border-t border-border pt-4"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 bg-primary/5 rounded-lg border-2 border-dashed border-primary/30">
                            <FaBuilding className="text-primary/30 text-5xl mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-text-primary mb-2">No EPCs Found</h3>
                            <p className="text-text-secondary max-w-md mx-auto">
                                {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all' || stateFilter.length > 0 || clusterFilter !== 'all' || dateFrom || dateTo
                                    ? "No records match your filter criteria. Try adjusting your filters."
                                    : "Get started by uploading an Excel file or adding a single EPC."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Single EPC Dialog (Modal) */}
            <Dialog
                isOpen={showSingleEPCForm}
                onClose={handleSingleCancel}
                title="Add Single EPC"
                size="lg"
            >
                {/* ============ SINGLE EPC FORM SECTION ============ */}
                <div className="space-y-6">
                    <form onSubmit={handleSingleSubmit} className="space-y-5">
                        {/* EPC Name Field */}
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">
                                EPC Company Name <span className="text-danger">*</span>
                            </label>
                            <div className="relative">
                                    <input
                                        type="text"
                                        name="epc_name"
                                        value={singleEPCFormData.epc_name}
                                        onChange={handleSingleChange}
                                        onBlur={handleSingleBlur}
                                        placeholder="Enter EPC company name"
                                        className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all
                                            ${singleEPCTouched.epc_name && singleEPCErrors.epc_name
                                                ? 'border-danger/40 focus:border-danger focus:ring-danger/20 bg-danger/5'
                                                : 'border-border focus:border-primary focus:ring-primary/20 bg-surface'
                                            }`}
                                        disabled={isSubmittingSingle}
                                    />
                                    {singleEPCTouched.epc_name && singleEPCErrors.epc_name && (
                                        <p className="mt-1.5 text-sm text-danger flex items-center gap-1 font-medium">
                                            <FaExclamationTriangle className="text-xs" />
                                            {singleEPCErrors.epc_name}
                                        </p>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-text-muted">
                                    Minimum 2 characters, maximum 100 characters
                                </p>
                            </div>

                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1.5">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        name="email"
                                        value={singleEPCFormData.email}
                                        onChange={handleSingleChange}
                                        onBlur={handleSingleBlur}
                                        placeholder="Enter email address"
                                        className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all
                                            ${singleEPCTouched.email && singleEPCErrors.email
                                                ? 'border-danger/40 focus:border-danger focus:ring-danger/20 bg-danger/5'
                                                : 'border-border focus:border-primary focus:ring-primary/20 bg-surface'
                                            }`}
                                        disabled={isSubmittingSingle}
                                    />
                                    {singleEPCTouched.email && singleEPCErrors.email && (
                                        <p className="mt-1.5 text-sm text-danger flex items-center gap-1 font-medium">
                                            <FaExclamationTriangle className="text-xs" />
                                            {singleEPCErrors.email}
                                        </p>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-text-muted">
                                    Valid email format: name@example.com
                                </p>
                            </div>

                            {/* States Multi-Select */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1.5">
                                    Working States <span className="text-red-500">*</span>
                                </label>
                                <div className={`relative ${singleEPCTouched.states && singleEPCErrors.states ? 'border-danger/40' : ''}`}>
                                    <MultiSelectDropdownWithSearchInput
                                        values={singleEPCFormData.states}
                                        onChange={handleStatesChange}
                                        options={states}
                                        disabled={isSubmittingSingle || loadingStates}
                                        className={`w-full ${singleEPCTouched.states && singleEPCErrors.states ? 'border-danger/40' : ''}`}
                                        placeholder={loadingStates ? "Loading states..." : "Search and select states..."}
                                        onBlur={handleStatesBlur}
                                    />
                                    {singleEPCTouched.states && singleEPCErrors.states && (
                                        <p className="mt-1.5 text-sm text-danger flex items-center gap-1 font-medium">
                                            <FaExclamationTriangle className="text-xs" />
                                            {singleEPCErrors.states}
                                        </p>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-text-muted">
                                    Select one or more states where this EPC operates
                                </p>
                            </div>

                            {/* Selected States Summary */}
                            {singleEPCFormData.states.length > 0 && (
                                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-text-primary">
                                            Selected States ({singleEPCFormData.states.length})
                                        </span>
                                        <Button
                                            type="button"
                                            onClick={() => handleStatesChange([])}
                                            variant="ghost"
                                            size="sm"
                                            className="text-danger hover:text-danger-hover"
                                        >
                                            Clear all
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {states
                                            .filter(state => singleEPCFormData.states.includes(state.value))
                                            .map(state => (
                                                <span
                                                    key={state.value}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs text-text-primary font-medium"
                                                >
                                                    <FaMapMarkerAlt className="text-primary text-xs" />
                                                    {state.text}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newStates = singleEPCFormData.states.filter(id => id !== state.value);
                                                                handleStatesChange(newStates);
                                                            }}
                                                            className="ml-1 text-text-muted hover:text-danger transition-colors"
                                                        >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Tips Box */}
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                                <div className="flex items-start gap-3">
                                    <FaLightbulb className="text-primary shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h4 className="text-sm font-black text-text-primary uppercase tracking-tight mb-2">Quick Tips:</h4>
                                        <ul className="space-y-1.5 text-[11px] text-text-secondary font-medium">
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-primary rounded-full"></span>
                                                Email format will be validated automatically
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-primary rounded-full"></span>
                                                Source will be set to 'government' automatically
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-primary rounded-full"></span>
                                                Same EPC can work in multiple states
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-primary rounded-full"></span>
                                                Duplicate name+email+state combinations are not allowed
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Form Validation Status */}
                            {Object.keys(singleEPCErrors).length === 0 &&
                                singleEPCFormData.epc_name.trim() !== "" &&
                                singleEPCFormData.email.trim() !== "" &&
                                singleEPCFormData.states.length > 0 && (
                                    <div className="p-3 bg-success-soft border border-success/20 rounded-lg flex items-center gap-2">
                                        <FaCheckCircle className="text-success shrink-0" />
                                        <span className="text-sm text-success font-medium">
                                            ✓ Form is valid and ready to submit with {singleEPCFormData.states.length} state(s)
                                        </span>
                                    </div>
                                )}

                            {/* Form Actions */}
                            <div className="flex gap-3 pt-4 border-t border-border">
                                <Button
                                    type="submit"
                                    disabled={isSubmittingSingle}
                                    loading={isSubmittingSingle}
                                    variant="primary"
                                    leftIcon={<FaSave />}
                                    fullWidth
                                >
                                    {isSubmittingSingle ? 'Adding EPC...' : 'Save EPC'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSingleCancel}
                                    disabled={isSubmittingSingle}
                                    variant="secondary"
                                    leftIcon={<FaTimes />}
                                    fullWidth
                                >
                                    Clear Form
                                </Button>
                            </div>
                        </form>
                    </div>
                </Dialog>
        </div>
    );
}