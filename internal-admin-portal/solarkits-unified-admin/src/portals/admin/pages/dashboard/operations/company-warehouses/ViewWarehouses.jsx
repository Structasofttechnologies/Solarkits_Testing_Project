import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import CardImageSlider from "@/components/CardImageSlider";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";
import ToggleButton from "@/components/ToggleButton";
import Loader from "@/components/Loader";
import PageHeader from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
    FiArchive,
    FiRefreshCw,
    FiXCircle,
    FiEye,
    FiMap,
    FiEdit2,
    FiPlus,
    FiClock,
    FiAlertCircle,
    FiFileText,
    FiCheck,
    FiCheckCircle,
    FiMapPin,
    FiGlobe,
    FiNavigation,
    FiSearch,
    FiStar,
    FiGitBranch,
    FiSliders,
    FiChevronDown,
    FiChevronUp,
    FiHome,
    FiTruck
} from "react-icons/fi";
import { FaTimes } from "react-icons/fa";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";
const CircleProgressBar = ({ percentage, size = 44, strokeWidth = 4 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
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
            <span className="absolute text-[10px] font-black text-text-primary">{percentage}%</span>
        </div>
    );
};

export default function ViewWarehouses({ moduleUniqueId }) {
    const navigate = useNavigate()
    const dispatch = useDispatch();
    const hasAddPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "add" });
    const hasEditPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "edit" });
    const hasDeletePermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "delete" });
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const API = import.meta.env.VITE_API_URL;

    // ---------------------------
    // VALIDATION STATUS MAPPING
    // ---------------------------
    const validationStatus = {
        1: {
            label: "Pending Validation Setup",
            color: "from-slate-500 to-slate-600",
            text: "text-white",
            icon: FiClock,
            variant: "ghost"
        },
        2: {
            label: "Awaiting Information",
            color: "from-amber-500 to-amber-600",
            text: "text-white",
            icon: FiAlertCircle,
            variant: "warning"
        },
        3: {
            label: "In Review",
            color: "from-blue-500 to-blue-600",
            text: "text-white",
            icon: FiFileText,
            variant: "primary"
        },
        4: {
            label: "Verified",
            color: "from-green-500 to-green-600",
            text: "text-white",
            icon: FiCheck,
            variant: "success"
        },
        5: {
            label: "Rejected",
            color: "from-red-500 to-red-600",
            text: "text-white",
            icon: FiXCircle,
            variant: "danger"
        }
    };

    // ---------------------------
    // FILTER STATES
    // ---------------------------
    const [filterCountry, setFilterCountry] = useState("");
    const [filterState, setFilterState] = useState("");
    const [filterDistrict, setFilterDistrict] = useState("");
    const [showActive, setShowActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedValidationStatus, setSelectedValidationStatus] = useState([]);
    const [filterWarehouseType, setFilterWarehouseType] = useState(""); // "", "company", "3pl"

    // ---------------------------
    // LOAD DATA
    // ---------------------------
    const fetchWarehouses = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);

        try {
            const res = await axios.get(`${API}/warehouses?unique_id=${moduleUniqueId}&req_for=view`, {
                headers: {
                    ...authHeaderObj(),
                },
            });
            setWarehouses(res.data.warehouses || []);
        } catch (err) {
            console.log(err)
            dispatch(
                setAlert({
                    type: "error",
                    message: err.response?.data?.message || "Failed to load warehouses.",
                    duration: 4000
                })
            );
        }

        setLoading(false);
        if (showRefresh) setRefreshing(false);
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    // ---------------------------
    // UNIQUE DROPDOWN OPTIONS
    // ---------------------------
    const countries = useMemo(
        () =>
            [...new Set(warehouses.map((w) => w.country))].map((c) => ({
                value: c,
                text: (
                    <span className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-linear-120 from-primary to-primary-end rounded-full flex items-center justify-center">
                            <FiGlobe className="text-white w-3 h-3" />
                        </div>
                        {c}
                    </span>
                ),
            })),
        [warehouses]
    );

    const states = useMemo(() => {
        return [
            ...new Set(
                warehouses
                    .filter((w) => !filterCountry || w.country === filterCountry)
                    .map((w) => w.state)
            ),
        ].map((s) => ({
            value: s,
            text: (
                <span className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-linear-120 from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
                        <FiMap className="text-white w-3 h-3" />
                    </div>
                    {s}
                </span>
            )
        }));
    }, [warehouses, filterCountry]);

    const districts = useMemo(() => {
        return [
            ...new Set(
                warehouses
                    .filter(
                        (w) =>
                            (!filterCountry || w.country === filterCountry) &&
                            (!filterState || w.state === filterState)
                    )
                    .map((w) => w.district)
            ),
        ].map((d) => ({
            value: d,
            text: (
                <span className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-linear-120 from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <FiMapPin className="text-white w-3 h-3" />
                    </div>
                    {d}
                </span>
            )
        }));
    }, [warehouses, filterCountry, filterState]);

    // Validation status options
    const validationStatusOptions = useMemo(() => {
        return Object.entries(validationStatus).map(([key, value]) => ({
            value: parseInt(key),
            text: (
                <span className="flex items-center gap-2">
                    <div className={`w-6 h-6 bg-linear-120 ${value.color} rounded-full flex items-center justify-center`}>
                        <value.icon className={`${value.text} w-3 h-3`} />
                    </div>
                    {value.label}
                </span>
            )
        }));
    }, []);

    // ---------------------------
    // FILTERED WAREHOUSES
    // ---------------------------
    const filteredWarehouses = useMemo(() => {
        return warehouses.filter((w) => {
            const matchesSearch = searchQuery === "" ||
                w.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                w.pincode?.toString().includes(searchQuery) ||
                w.warehouse_code?.toLowerCase().includes(searchQuery.toLowerCase());

            // Validation status filtering logic
            const matchesValidationStatus = selectedValidationStatus.length === 0 ?
                true : // If no status selected, show all
                selectedValidationStatus.includes(w.status_id);

            // Warehouse type filtering logic
            const matchesWarehouseType = !filterWarehouseType || w.warehouse_type === filterWarehouseType;

            return (
                (!filterCountry || w.country === filterCountry) &&
                (!filterState || w.state === filterState) &&
                (!filterDistrict || w.district === filterDistrict) &&
                (!showActive || w.is_active === 1) &&
                matchesValidationStatus &&
                matchesWarehouseType &&
                matchesSearch
            );
        });
    }, [warehouses, filterCountry, filterState, filterDistrict, showActive, searchQuery, selectedValidationStatus, filterWarehouseType]);

    // Clear all filters
    const clearFilters = () => {
        setFilterCountry("");
        setFilterState("");
        setFilterDistrict("");
        setShowActive(false);
        setSearchQuery("");
        setSelectedValidationStatus([]);
        setFilterWarehouseType("");
    };

    // Count active filters
    const activeFilterCount = [
        filterCountry,
        filterState,
        filterDistrict,
        showActive,
        searchQuery,
        selectedValidationStatus.length > 0,
        filterWarehouseType
    ].filter(Boolean).length;

    // Handle Add Warehouse
    const handleAddWarehouse = () => {
        navigate('add-warehouse');
    };

    // Get status badge info for a warehouse
    const getStatusInfo = (warehouse) => {
        const status = validationStatus[warehouse.status_id];
        return {
            label: warehouse.status || status?.label || "Unknown",
            color: status?.color || "from-primary to-primary-end",
            text: status?.text || "text-white",
            icon: status?.icon || FiClock,
            variant: status?.variant || "ghost"
        };
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Warehouse Management"
                subtitle={loading ? "Loading warehouses..." : `${filteredWarehouses.length} of ${warehouses.length} warehouses displayed`}
                icon={FiArchive}
                stats={[
                    { label: "Total", value: warehouses.length, description: "Total Warehouses" },
                    { label: "Company", value: warehouses.filter(w => w.warehouse_type === "company").length, description: "Owned by Company" },
                    { label: "3PL", value: warehouses.filter(w => w.warehouse_type === "3pl").length, description: "Third-Party Staff" },
                    { label: "Verified", value: warehouses.filter(w => w.status_id === 4).length, description: "Completed Checks" },
                ]}
                actions={
                    <>
                        <Button
                            onClick={() => fetchWarehouses(true)}
                            disabled={refreshing}
                            variant="secondary"
                            leftIcon={<FiRefreshCw className={refreshing ? "animate-spin" : ""} />}
                        >
                            {refreshing ? "Refreshing..." : "Refresh List"}
                        </Button>

                        <RenderIfPermission
                            requiredUniqueId={moduleUniqueId}
                            permission="add"
                            fallback={null}
                        >
                            <Button
                                onClick={handleAddWarehouse}
                                variant="primary"
                                leftIcon={<FiPlus />}
                            >
                                Add Warehouse
                            </Button>
                        </RenderIfPermission>
                    </>
                }
            />



            {/* Filters Section */}
            <div className="card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-surface border border-border rounded-3xl mb-6">
                <div className="p-6 md:p-8">
                    {/* Header bar / Search & Toggle */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Search field */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by address, pincode, or warehouse code..."
                                className="w-full h-[52px] bg-bg border-2 border-border/85 rounded-2xl px-5 pl-12 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium text-text-primary"
                            />
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                >
                                    <FaTimes size={12} />
                                </button>
                            )}
                        </div>

                        {/* Control buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="h-[52px] px-4 bg-bg border-2 border-border/85 rounded-2xl flex items-center hover:border-primary/40 transition-all">
                                <ToggleButton
                                    label="Active Only"
                                    checked={showActive}
                                    onChange={setShowActive}
                                    gradient={true}
                                />
                            </div>

                            <Button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                variant={showAdvancedFilters ? "outline" : "secondary"}
                                leftIcon={<FiSliders className="w-4 h-4" />}
                                rightIcon={showAdvancedFilters ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                                className="h-[52px] py-0 rounded-2xl shadow-xs px-6"
                            >
                                <span className="flex items-center gap-1.5">
                                    <span>Filters</span>
                                    {activeFilterCount > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm shrink-0">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </span>
                            </Button>

                            {activeFilterCount > 0 && (
                                <Button
                                    onClick={clearFilters}
                                    variant="ghost"
                                    leftIcon={<FiRefreshCw className="w-3.5 h-3.5" />}
                                    className="h-[52px] py-0 rounded-2xl px-5 text-text-secondary hover:text-danger hover:bg-danger/5 transition-all"
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Collapsible Panel */}
                    <AnimatePresence>
                        {showAdvancedFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="pt-6 mt-6 border-t border-border/50 space-y-6">
                                    {/* Group 1: Geographic Boundaries */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-3.5 bg-primary rounded-full"></div>
                                            <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.15em]">Geographical boundaries</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            <DropdownWithSearchInput
                                                label="Country"
                                                value={filterCountry}
                                                onChange={(v) => {
                                                    setFilterCountry(v);
                                                    setFilterState("");
                                                    setFilterDistrict("");
                                                }}
                                                options={countries}
                                                placeholder="Country"
                                                className="w-full"
                                            />
                                            <DropdownWithSearchInput
                                                label="State"
                                                value={filterState}
                                                onChange={(v) => {
                                                    setFilterState(v);
                                                    setFilterDistrict("");
                                                }}
                                                options={states}
                                                placeholder="State"
                                                className="w-full"
                                                disabled={!filterCountry}
                                            />
                                            <DropdownWithSearchInput
                                                label="District"
                                                value={filterDistrict}
                                                onChange={(v) => setFilterDistrict(v)}
                                                options={districts}
                                                placeholder="District"
                                                className="w-full"
                                                disabled={!filterState}
                                            />
                                        </div>
                                    </div>

                                    {/* Group 2: Classification & Checks */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-3.5 bg-amber-500 rounded-full"></div>
                                            <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.15em]">Classification & checks</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <MultiSelectDropdown
                                                label="Profile Status"
                                                values={selectedValidationStatus}
                                                onChange={setSelectedValidationStatus}
                                                options={validationStatusOptions}
                                                className="w-full"
                                            />
                                            <div className="flex flex-col">
                                                <label className="text-text-primary font-medium mb-1">Warehouse Type</label>
                                                <div className="flex gap-1 flex-1">
                                                    {[
                                                        { value: "", label: "All" },
                                                        { value: "company", label: "Company", icon: FiHome },
                                                        { value: "3pl", label: "3PL", icon: FiTruck }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => setFilterWarehouseType(opt.value)}
                                                            className={`flex items-center gap-1.5 px-2.5 h-12 rounded-2xl text-xs font-bold border-2 transition-all duration-200 flex-1 justify-center ${filterWarehouseType === opt.value
                                                                    ? opt.value === "company"
                                                                        ? "bg-linear-120 from-emerald-500 to-emerald-600 text-white border-emerald-500 shadow-sm"
                                                                        : opt.value === "3pl"
                                                                            ? "bg-linear-120 from-primary to-primary-end text-white border-primary shadow-sm"
                                                                            : "bg-linear-120 from-primary/10 to-primary/5 text-primary border-primary/30"
                                                                    : "bg-surface border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
                                                                }`}
                                                        >
                                                            {opt.icon && <opt.icon className="w-3.5 h-3.5 shrink-0" />}
                                                            <span className="truncate">{opt.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Active Filters displaying row */}
                    {activeFilterCount > 0 && (
                        <div className="mt-6 pt-4 border-t border-border/50">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mr-1">Active:</span>
                                {filterCountry && (
                                    <span className="inline-flex items-center gap-1.5 bg-primary/5 text-primary rounded-xl px-2.5 py-1.5 text-xs border border-primary/10 font-medium">
                                        Country: {filterCountry}
                                        <button
                                            onClick={() => setFilterCountry("")}
                                            className="text-primary/70 hover:text-danger p-0.5 transition-colors"
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </span>
                                )}
                                {filterState && (
                                    <span className="inline-flex items-center gap-1.5 bg-amber-500/5 text-amber-600 rounded-xl px-2.5 py-1.5 text-xs border border-amber-500/10 font-medium">
                                        State: {filterState}
                                        <button
                                            onClick={() => setFilterState("")}
                                            className="text-amber-600/70 hover:text-danger p-0.5 transition-colors"
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </span>
                                )}
                                {filterDistrict && (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/5 text-emerald-600 rounded-xl px-2.5 py-1.5 text-xs border border-emerald-500/10 font-medium">
                                        District: {filterDistrict}
                                        <button
                                            onClick={() => setFilterDistrict("")}
                                            className="text-emerald-600/70 hover:text-danger p-0.5 transition-colors"
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </span>
                                )}
                                {showActive && (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/5 text-emerald-600 rounded-xl px-2.5 py-1.5 text-xs border border-emerald-500/10 font-medium">
                                        Active Only
                                        <button
                                            onClick={() => setShowActive(false)}
                                            className="text-emerald-600/70 hover:text-danger p-0.5 transition-colors"
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </span>
                                )}
                                {searchQuery && (
                                    <span className="inline-flex items-center gap-1.5 bg-primary/5 text-primary rounded-xl px-2.5 py-1.5 text-xs border border-primary/10 font-medium">
                                        Search: "{searchQuery}"
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="text-primary/70 hover:text-danger p-0.5 transition-colors"
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </span>
                                )}
                                {selectedCustomerTypes.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5 bg-primary/5 text-primary rounded-xl px-2.5 py-1.5 text-xs border border-primary/10 font-medium">
                                        Types: {selectedCustomerTypes.map(typeId => {
                                            const type = customerTypeOptions.find(opt => opt.value === typeId);
                                            return type?.text?.props?.children?.[1] || typeId;
                                        }).join(', ')}
                                        <button
                                            onClick={() => setSelectedCustomerTypes([])}
                                            className="text-primary/70 hover:text-danger p-0.5 transition-colors"
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </span>
                                )}
                                {selectedValidationStatus.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5 bg-primary/5 text-primary rounded-xl px-2.5 py-1.5 text-xs border border-primary/10 font-medium">
                                        Status: {selectedValidationStatus.map(statusId => {
                                            const status = validationStatus[statusId];
                                            return status?.label || statusId;
                                        }).join(', ')}
                                        <button
                                            onClick={() => setSelectedValidationStatus([])}
                                            className="text-primary/70 hover:text-danger p-0.5 transition-colors"
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </span>
                                )}
                                {filterWarehouseType && (
                                    <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs border font-medium ${filterWarehouseType === "master"
                                            ? "bg-amber-500/5 text-amber-600 border-amber-500/10"
                                            : "bg-primary/5 text-primary border-primary/10"
                                        }`}>
                                        {filterWarehouseType === "master" ? <FiStar className="w-3.5 h-3.5" /> : <FiGitBranch className="w-3.5 h-3.5" />}
                                        Type: {filterWarehouseType === "master" ? "Master" : "Sub"}
                                        <button
                                            onClick={() => setFilterWarehouseType("")}
                                            className={`${filterWarehouseType === "master" ? "text-amber-600/70" : "text-primary/70"
                                                } hover:text-danger p-0.5 transition-colors`}
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="min-h-100 flex items-center justify-center">
                    <Loader
                        text="Loading warehouses..."
                    />
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredWarehouses.length === 0 && (
                <div className="card shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="p-6">
                        <div className="bg-linear-120 from-primary/5 to-primary/10 rounded-xl border-2 border-dashed border-primary/30 p-12 text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <FiMap className="text-primary text-3xl" />
                            </div>
                            <h3 className="text-xl font-semibold text-text-primary mb-2">No warehouses found</h3>
                            <p className="text-text-secondary max-w-md mx-auto text-sm mb-6">
                                {warehouses.length === 0
                                    ? "No warehouses have been added yet. Click 'Add Warehouse' to get started."
                                    : "No warehouses match your current filters. Try adjusting your search criteria."}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                {activeFilterCount > 0 && (
                                    <Button
                                        onClick={clearFilters}
                                        variant="secondary"
                                    >
                                        Clear all filters
                                    </Button>
                                )}
                                {warehouses.length === 0 && (
                                    <RenderIfPermission
                                        requiredUniqueId={moduleUniqueId}
                                        permission="add"
                                        fallback={null}
                                    >
                                        <Button
                                            onClick={handleAddWarehouse}
                                            variant="primary"
                                            leftIcon={<FiPlus />}
                                            className="bg-linear-120 from-primary to-primary-end shadow-lg hover:shadow-xl"
                                        >
                                            Add Warehouse
                                        </Button>
                                    </RenderIfPermission>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Warehouse Grid Header */}
            {!loading && filteredWarehouses.length > 0 && (
                <>
                    <div className="card shadow-sm bg-surface border border-border rounded-3xl overflow-hidden mb-6">
                        <div className="p-6 md:p-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center gradient-primary text-white shadow-md">
                                    <FiArchive className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-text-primary text-xl tracking-tight leading-none mb-1.5">Warehouse Directory</h3>
                                    <p className="text-xs font-medium text-text-secondary">Monitor logistics and check verifications across facilities</p>
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-primary/5 border border-primary/15 text-primary rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                                {filteredWarehouses.length} {filteredWarehouses.length === 1 ? "Warehouse" : "Warehouses"}
                            </div>
                        </div>
                    </div>

                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: {
                                    staggerChildren: 0.05
                                }
                            }
                        }}
                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence>
                            {filteredWarehouses.map((w, ind) => {
                                const statusInfo = getStatusInfo(w);
                                const StatusIcon = statusInfo.icon;

                                return (
                                    <motion.div
                                        key={w.id || `wh-${ind}`}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9, y: 15 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 15 }}
                                        transition={{ duration: 0.25, delay: (ind % 8) * 0.03 }}
                                        className="card rounded-3xl overflow-hidden bg-surface border border-border shadow-sm hover:shadow-xl hover:scale-[1.01] transition-colors duration-300 transition-shadow duration-300 flex flex-col group h-full relative"
                                    >
                                    {/* Image Section */}
                                    {w.images?.length > 0 ? (
                                        <div className="relative overflow-hidden h-48 sm:h-52 shrink-0">
                                            <CardImageSlider
                                                images={w.images.map((img) => `${img}`)}
                                                height="100%"
                                                aspectRatio="auto"
                                                showCounter={true}
                                                showArrows={true}
                                                showDots={true}
                                                autoPlay={true}
                                                autoPlayInterval={10000}
                                                arrowSize="small"
                                                dotStyle="line"
                                            />
                                            {/* Status Badges Overlay */}
                                            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start">
                                                {/* Validation Status Badge */}
                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-black/45 text-white border border-white/10 shadow-lg`}>
                                                    <div className={`w-2 h-2 rounded-full bg-linear-120 ${statusInfo.color} animate-pulse`} />
                                                    <StatusIcon className="w-3 h-3 text-white" />
                                                    <span>{statusInfo.label}</span>
                                                </div>
                                                {/* Active Status Badge */}
                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${w.is_active === 1
                                                        ? "bg-emerald-950/45 text-emerald-200 border-emerald-500/20"
                                                        : "bg-red-950/45 text-red-200 border-red-500/20"
                                                    } border shadow-lg`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${w.is_active === 1 ? "bg-emerald-400" : "bg-red-400"}`} />
                                                    <span>{w.is_active === 1 ? "Active" : "Inactive"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-48 sm:h-52 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent flex items-center justify-center relative group-hover:from-primary/15 group-hover:to-primary/8 transition-all shrink-0">
                                            {/* Beautiful vector fallback */}
                                            <div className="absolute inset-0 opacity-[0.03] mesh-grid pointer-events-none"></div>
                                            <div className="w-16 h-16 rounded-3xl bg-surface shadow-md flex items-center justify-center text-primary border border-border group-hover:scale-110 transition-transform duration-300">
                                                <FiMapPin className="w-7 h-7 text-primary/80" />
                                            </div>
                                            {/* Status Badges Overlay */}
                                            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start">
                                                {/* Validation Status Badge */}
                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-surface/85 dark:bg-surface-hover/90 text-text-primary border border-border shadow-sm`}>
                                                    <div className={`w-2 h-2 rounded-full bg-linear-120 ${statusInfo.color}`} />
                                                    <StatusIcon className="w-3 h-3 text-text-secondary" />
                                                    <span>{statusInfo.label}</span>
                                                </div>
                                                {/* Active Status Badge */}
                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${w.is_active === 1
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                        : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                                    } border shadow-sm`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${w.is_active === 1 ? "bg-emerald-500" : "bg-red-500"}`} />
                                                    <span>{w.is_active === 1 ? "Active" : "Inactive"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Warehouse Details */}
                                    <div className="p-5 flex flex-col flex-1">
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            {/* Warehouse Type Badge & Code */}
                                            <div className="flex flex-col gap-1 items-start">
                                                <div>
                                                    {w.warehouse_type === "company" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                                                            <FiHome className="w-3 h-3 text-emerald-500" />
                                                            Company Warehouse
                                                        </span>
                                                    ) : w.warehouse_type === "3pl" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary dark:text-primary-end border border-primary/20 shadow-xs">
                                                            <FiTruck className="w-3 h-3" />
                                                            3PL Warehouse
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-bg text-text-secondary border border-border">
                                                            {w.warehouse_type === "master" ? "Master Hub" : w.warehouse_type === "sub" ? "Sub Facility" : "Facility"}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="px-2.5 py-1 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg border border-primary/10">
                                                    {w.warehouse_code || "CODE-N/A"}
                                                </span>
                                            </div>

                                            {/* Circle Progress Bar */}
                                            {w.status_id >= 2 && (
                                                <CircleProgressBar percentage={w.profile_completion_percentage || 0} />
                                            )}
                                        </div>

                                        {/* Address Header */}
                                        <div className="mb-3">
                                            <h3 className="text-base font-black text-text-primary leading-snug group-hover:text-primary transition-colors cursor-pointer line-clamp-2" title={w.address}>
                                                {w.address}
                                            </h3>
                                        </div>

                                        {/* Geographic details */}
                                        <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium flex-wrap mb-4">
                                            <FiMapPin className="text-primary/70 shrink-0 w-3.5 h-3.5" />
                                            <span>{w.district || "N/A"}, {w.state || "N/A"}</span>
                                            <span className="text-text-muted">•</span>
                                            <FiGlobe className="text-primary/70 shrink-0 w-3.5 h-3.5" />
                                            <span>{w.country || "India"}</span>
                                        </div>

                                        {/* Manager Info */}
                                        <div className="mb-4 text-xs">
                                            {w.manager ? (
                                                <div className="bg-linear-120 from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-3 flex flex-col gap-1">
                                                    <p className="font-bold text-text-primary flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                        Manager: {w.manager.name}
                                                    </p>
                                                    <p className="text-text-secondary pl-3">{w.manager.email}</p>
                                                    <p className="text-text-secondary pl-3">{w.manager.phone}</p>
                                                </div>
                                            ) : (
                                                <div className="bg-linear-120 from-amber-500/5 to-amber-600/10 border border-amber-500/20 rounded-2xl p-3 flex items-center gap-2 text-amber-600">
                                                    <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                                                    <span className="font-medium">No Manager Assigned</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Spec Grid */}
                                        <div className="bg-bg/50 border border-border/50 rounded-2xl p-3 mb-5 mt-auto group-hover:bg-bg transition-all">
                                            <div className="grid grid-cols-2 gap-4 divide-x divide-border/40">
                                                <div className="flex items-center gap-2 pl-1">
                                                    <FiNavigation className="text-primary/80 w-3.5 h-3.5 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pincode</p>
                                                        <p className="font-semibold text-xs text-text-primary truncate">{w.pincode || "-"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 pl-3">
                                                    <FiMap className="text-primary/80 w-3.5 h-3.5 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Coordinates</p>
                                                        <p className="font-semibold text-[10px] text-text-primary truncate">
                                                            {w?.lat ? Number(w.lat).toFixed(4) : '-'}&deg;N, {w?.lng ? Number(w.lng).toFixed(4) : '-'}&deg;E
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50 items-center justify-between">
                                            <div className="flex-1 min-w-[80px]">
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    fullWidth
                                                    leftIcon={<FiEye size={13} />}
                                                    onClick={() => navigate(`/admin-panel/operations/company-warehouses/${w.id}`)}
                                                >
                                                    Details
                                                </Button>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                {w.status_id === 1 ? (
                                                    <>
                                                        <RenderIfPermission
                                                            requiredUniqueId={moduleUniqueId}
                                                            permission="edit"
                                                            fallback={null}
                                                        >
                                                            <IconButton
                                                                onClick={() => navigate(`edit-warehouse/${w.id}`)}
                                                                variant="warning"
                                                                size="sm"
                                                                tooltip="Edit Location"
                                                            >
                                                                <FiEdit2 size={13} />
                                                            </IconButton>
                                                        </RenderIfPermission>

                                                        <RenderIfPermission
                                                            requiredUniqueId={moduleUniqueId}
                                                            permission="add"
                                                            fallback={null}
                                                        >
                                                            <Button
                                                                onClick={() => navigate(`${w.id}/profile-validations`)}
                                                                variant="secondary"
                                                                size="sm"
                                                                leftIcon={<FiPlus size={13} />}
                                                            >
                                                                Profile Setup
                                                            </Button>
                                                        </RenderIfPermission>
                                                    </>
                                                ) : (
                                                    <>
                                                        <RenderIfPermission
                                                            requiredUniqueId={moduleUniqueId}
                                                            permission="edit"
                                                            fallback={null}
                                                        >
                                                            <Button
                                                                onClick={() => navigate(`${w.id}/profile-validations`)}
                                                                variant="secondary"
                                                                size="sm"
                                                                leftIcon={<FiEdit2 size={12} />}
                                                            >
                                                                Profile Setup
                                                            </Button>
                                                        </RenderIfPermission>

                                                        {w.status_id >= 2 && (
                                                            <RenderIfPermission
                                                                requiredUniqueId={moduleUniqueId}
                                                                permission="view"
                                                                fallback={null}
                                                            >
                                                                <Button
                                                                    onClick={() => navigate(`${w.id}/review`)}
                                                                    variant={w.status_id === 3 ? "warning" : "primary"}
                                                                    size="sm"
                                                                    leftIcon={<FiFileText size={12} />}
                                                                >
                                                                    {w.status_id === 3 ? "Review & Action" : "View Saved Data"}
                                                                </Button>
                                                            </RenderIfPermission>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </div>
    );
}