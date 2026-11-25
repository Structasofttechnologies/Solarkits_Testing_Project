import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import CustomTable from "@/components/CustomTable";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import Dialog from "@/components/Dialog";
import {
    FaUsers, FaCheck, FaTimes, FaEye, FaBuilding,
    FaEnvelope, FaPhone, FaMapMarkerAlt, FaSync, FaSearch
} from "react-icons/fa";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import UniversalMap from "@/components/UniversalMap";
import { useLoadScript } from "@react-google-maps/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api";
const SUPPLIER_API = `${API_URL}/suppliers`;

const STATUS_BADGE = {
    pending:  "bg-warning/10 text-warning border-warning/20",
    approved: "bg-success/10 text-success border-success/20",
    rejected: "bg-danger/10 text-danger border-danger/20",
};

const isStateMatch = (stateName, locState, locAddress) => {
    if (!stateName) return false;
    const a = stateName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (locState && String(locState) !== 'undefined') {
        const b = String(locState).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (a.includes(b) || b.includes(a)) return true;
    }
    if (locAddress) {
        const addr = String(locAddress).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (addr.includes(a)) return true;
    }
    return false;
};

export default function Suppliers({ moduleUniqueId }) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    });

    const [suppliers,        setSuppliers]        = useState([]);
    const [loading,          setLoading]           = useState(true);
    const [filter_status,    setFilterStatus]      = useState("pending");
    const [search,           setSearch]            = useState("");
    const [page,             setPage]              = useState(1);
    const [pagination,       setPagination]        = useState({ total: 0, pages: 1 });
    const [selectedSupplier, setSelectedSupplier]  = useState(null);
    const [isModalOpen,      setIsModalOpen]       = useState(false);
    const [modal_loading,    setModalLoading]      = useState(false);
    const [reject_reason,    setRejectReason]      = useState("");
    const [stateRejectReasons, setStateRejectReasons] = useState({});
    const [warehouseRejectReasons, setWarehouseRejectReasons] = useState({});
    const [action_loading,   setActionLoading]     = useState(false);
    const [action_error,     setActionError]       = useState(null);

    // District Assignment State
    const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
    const [activeWh, setActiveWh] = useState(null);
    const [districtsList, setDistrictsList] = useState([]);
    const [districtsLoading, setDistrictsLoading] = useState(false);
    const [selectedDistrictIds, setSelectedDistrictIds] = useState([]);
    const [districtSearch, setDistrictSearch] = useState("");
    const [saveWhLoading, setSaveWhLoading] = useState(false);
    const [boundaryCache, setBoundaryCache] = useState({});

    const fetch_suppliers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${SUPPLIER_API}/admin/suppliers`, {
                params: { status: filter_status || undefined, search, page, limit: 15, unique_id: moduleUniqueId, req_for: "view" },
                headers: authHeaderObj()
            });
            setSuppliers(data.data || []);
            setPagination(data.pagination || { total: 0, pages: 1 });
        } catch (err) {
            console.error("Error fetching suppliers:", err);
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    }, [filter_status, search, page, moduleUniqueId]);

    useEffect(() => {
        fetch_suppliers();
    }, [fetch_suppliers]);

    const handle_approve = async (id) => {
        setActionLoading(true);
        setActionError(null);
        try {
            await axios.patch(`${SUPPLIER_API}/admin/suppliers/${id}/approve`, {}, {
                params: { unique_id: moduleUniqueId, req_for: "edit" },
                headers: authHeaderObj()
            });
            setIsModalOpen(false);
            fetch_suppliers();
        } catch (err) {
            setActionError(err.response?.data?.message || "Approval failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const handle_reject = async (id) => {
        if (!reject_reason.trim()) {
            setActionError("Please provide a rejection reason.");
            return;
        }
        setActionLoading(true);
        setActionError(null);
        try {
            await axios.patch(`${SUPPLIER_API}/admin/suppliers/${id}/reject`, { reason: reject_reason }, {
                params: { unique_id: moduleUniqueId, req_for: "edit" },
                headers: authHeaderObj()
            });
            setIsModalOpen(false);
            setRejectReason("");
            fetch_suppliers();
        } catch (err) {
            setActionError(err.response?.data?.message || "Rejection failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const handle_approve_state = async (supplierId, requestId) => {
        setActionLoading(true);
        setActionError(null);
        try {
            await axios.patch(`${SUPPLIER_API}/admin/suppliers/${supplierId}/state-requests/${requestId}/approve`, {}, {
                params: { unique_id: moduleUniqueId, req_for: "edit" },
                headers: authHeaderObj()
            });
            
            // Refresh selected supplier details in modal
            const { data } = await axios.get(`${SUPPLIER_API}/admin/suppliers/${supplierId}`, {
                params: { unique_id: moduleUniqueId, req_for: "view" },
                headers: authHeaderObj()
            });
            setSelectedSupplier(data.data);
            fetch_suppliers();
        } catch (err) {
            setActionError(err.response?.data?.message || "Approve state request failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const handle_reject_state = async (supplierId, requestId, reason) => {
        if (!reason.trim()) {
            setActionError("Please provide a rejection reason for this state request.");
            return;
        }
        setActionLoading(true);
        setActionError(null);
        try {
            await axios.patch(`${SUPPLIER_API}/admin/suppliers/${supplierId}/state-requests/${requestId}/reject`, { reason }, {
                params: { unique_id: moduleUniqueId, req_for: "edit" },
                headers: authHeaderObj()
            });
            
            // Refresh selected supplier details in modal
            const { data } = await axios.get(`${SUPPLIER_API}/admin/suppliers/${supplierId}`, {
                params: { unique_id: moduleUniqueId, req_for: "view" },
                headers: authHeaderObj()
            });
            setSelectedSupplier(data.data);
            fetch_suppliers();
        } catch (err) {
            setActionError(err.response?.data?.message || "Reject state request failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const handle_approve_warehouse = async (supplierId, warehouseId) => {
        setActionLoading(true);
        setActionError(null);
        try {
            await axios.patch(`${SUPPLIER_API}/admin/suppliers/${supplierId}/warehouses/${warehouseId}/approve`, {}, {
                params: { unique_id: moduleUniqueId, req_for: "edit" },
                headers: authHeaderObj()
            });
            
            // Refresh selected supplier details in modal
            const { data } = await axios.get(`${SUPPLIER_API}/admin/suppliers/${supplierId}`, {
                params: { unique_id: moduleUniqueId, req_for: "view" },
                headers: authHeaderObj()
            });
            setSelectedSupplier(data.data);
            fetch_suppliers();
        } catch (err) {
            setActionError(err.response?.data?.message || "Approve warehouse request failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const handle_reject_warehouse = async (supplierId, warehouseId, reason) => {
        if (!reason.trim()) {
            setActionError("Please provide a rejection reason for this warehouse request.");
            return;
        }
        setActionLoading(true);
        setActionError(null);
        try {
            await axios.patch(`${SUPPLIER_API}/admin/suppliers/${supplierId}/warehouses/${warehouseId}/reject`, { reason }, {
                params: { unique_id: moduleUniqueId, req_for: "edit" },
                headers: authHeaderObj()
            });
            
            // Refresh selected supplier details in modal
            const { data } = await axios.get(`${SUPPLIER_API}/admin/suppliers/${supplierId}`, {
                params: { unique_id: moduleUniqueId, req_for: "view" },
                headers: authHeaderObj()
            });
            setSelectedSupplier(data.data);
            fetch_suppliers();
        } catch (err) {
            setActionError(err.response?.data?.message || "Reject warehouse request failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const open_district_assign = async (wh) => {
        setActiveWh(wh);
        setDistrictSearch("");
        setSelectedDistrictIds((wh.supply_districts || []).map(d => typeof d === 'object' ? d._id : d));
        setIsDistrictModalOpen(true);
        setDistrictsLoading(true);
        try {
            const { data } = await axios.get(`${SUPPLIER_API}/auth/districts`, {
                params: { state_ids: wh.state }
            });
            setDistrictsList(data.data || []);
        } catch (err) {
            console.error("Error fetching districts for warehouse state:", err);
            setDistrictsList([]);
        } finally {
            setDistrictsLoading(false);
        }
    };

    const fetch_district_boundary = async (districtId, districtName, stateName, countryName) => {
        if (boundaryCache[districtId]) return boundaryCache[districtId];
        try {
            const ADMIN_API = import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api";
            const res = await axios.post(
                `${ADMIN_API}/geolocation/district?unique_id=${moduleUniqueId}&req_for=view`,
                { district: districtName, state: stateName, country: countryName || "India" },
                { headers: authHeaderObj() }
            );
            const geo = res.data?.district || res.data?.geometry || res.data?.boundary || null;
            if (geo && geo.geometry) {
                setBoundaryCache(prev => ({ ...prev, [districtId]: geo.geometry }));
                return geo.geometry;
            }
        } catch (err) {
            console.error(`Error fetching boundary for district ${districtName}:`, err);
        }
        return null;
    };

    useEffect(() => {
        if (!isDistrictModalOpen || !activeWh || districtsList.length === 0) return;

        const loadBoundaries = async () => {
            const stateName = activeWh.state_name || activeWh.state;
            const countryName = selectedSupplier?.country || "India";

            const promises = selectedDistrictIds.map(async (id) => {
                if (boundaryCache[id]) return;
                const distObj = districtsList.find(d => d.id === id);
                if (distObj) {
                    await fetch_district_boundary(id, distObj.name, stateName, countryName);
                }
            });
            await Promise.all(promises);
        };

        loadBoundaries();
    }, [selectedDistrictIds, isDistrictModalOpen, activeWh, districtsList, boundaryCache, selectedSupplier]);

    const handle_save_districts = async () => {
        if (!activeWh) return;
        setSaveWhLoading(true);
        setActionError(null);
        try {
            await axios.patch(
                `${SUPPLIER_API}/admin/suppliers/${selectedSupplier._id}/warehouses/${activeWh._id}/districts`,
                { districts: selectedDistrictIds },
                {
                    params: { unique_id: moduleUniqueId, req_for: "edit" },
                    headers: authHeaderObj()
                }
            );
            
            const res = await axios.get(`${SUPPLIER_API}/admin/suppliers/${selectedSupplier._id}`, {
                params: { unique_id: moduleUniqueId, req_for: "view" },
                headers: authHeaderObj()
            });
            setSelectedSupplier(res.data.data);
            setIsDistrictModalOpen(false);
        } catch (err) {
            setActionError(err.response?.data?.message || "Failed to save assigned districts.");
        } finally {
            setSaveWhLoading(false);
        }
    };

    const handle_toggle_district = (id) => {
        setSelectedDistrictIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const filteredDistricts = districtsList.filter(d => 
        d.name?.toLowerCase().includes(districtSearch.toLowerCase())
    );

    const open_modal = async (supplier) => {
        setRejectReason("");
        setStateRejectReasons({});
        setWarehouseRejectReasons({});
        setActionError(null);
        setIsModalOpen(true);
        setModalLoading(true);
        setSelectedSupplier(supplier); // show basic info immediately
        try {
            const { data } = await axios.get(`${SUPPLIER_API}/admin/suppliers/${supplier._id}`, {
                params: { unique_id: moduleUniqueId, req_for: "view" },
                headers: authHeaderObj()
            });
            setSelectedSupplier(data.data);
        } catch (err) {
            console.error("Failed to fetch supplier details:", err);
        } finally {
            setModalLoading(false);
        }
    };

    const headers = [
        { key: "company_name", label: "Company" },
        { key: "contact",      label: "Contact" },
        { key: "location",     label: "Coverage & Offices" },
        { key: "status",       label: "Status" },
        { key: "actions",      label: "Actions", align: "right" },
    ];

    const mapBoundaries = selectedDistrictIds
        .map(id => ({
            id,
            level: 'district',
            geometry: boundaryCache[id]
        }))
        .filter(b => b.geometry);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Suppliers"
                subtitle="Review and manage supplier applications for the SolarKits ecosystem."
                icon={FaUsers}
                actions={
                    <Button
                        variant="secondary"
                        onClick={fetch_suppliers}
                        loading={loading}
                        className=""
                        leftIcon={<FaSync className={loading ? "animate-spin" : ""} />}
                    >
                        Refresh Data
                    </Button>
                }
            />

            {/* Unified Card for Toolbar (Search/Status) and Supplier Registry */}
            <div className="card bg-surface rounded-2xl border-2 border-border/60 overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex flex-wrap gap-4 items-center justify-between">
                    <h2 className="text-xs font-black text-text-primary flex items-center gap-3 uppercase tracking-[0.2em]">
                       <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/10 shadow-inner">
                          <FaUsers size={14} />
                       </div>
                       Supplier Verification Registry
                    </h2>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface px-3 py-1.5 rounded-lg border border-border/40">
                       {pagination.total} supplier{pagination.total !== 1 ? "s" : ""} Total
                    </span>
                </div>

                <div className="p-6 border-b border-border bg-surface-hover/10 flex flex-wrap gap-4 items-center">
                    {/* Status Tabs */}
                    <div className="flex gap-1 bg-surface p-1 rounded-xl border border-border">
                        {[
                            { code: "pending", label: "Pending Suppliers" },
                            { code: "pending_expansion", label: "Expansion Requests" },
                            { code: "pending_warehouses", label: "Warehouse Requests" },
                            { code: "approved", label: "Approved" },
                            { code: "rejected", label: "Rejected" },
                            { code: "", label: "All" }
                        ].map(tab => (
                            <button
                                key={tab.code}
                                onClick={() => { setFilterStatus(tab.code); setPage(1); }}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filter_status === tab.code ? "bg-primary text-white shadow" : "text-text-muted hover:text-text-primary"}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-xs group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, email or phone..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full h-11 bg-surface border border-border rounded-xl pl-10 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-text-muted/40"
                        />
                    </div>
                </div>

                {/* Table Data Section */}
                <div className="p-6">
                    <CustomTable
                        headers={headers}
                        data={suppliers}
                        loading={loading}
                        renderRow={(s) => (
                            <>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="font-black text-text-primary text-sm uppercase tracking-tight flex flex-wrap items-center gap-2">
                                            {s.company_name}
                                            {s.state_requests?.some(r => r.status === 'pending') && (
                                                <span className="animate-pulse bg-warning/20 text-warning border border-warning/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0">
                                                    Expansion Request
                                                </span>
                                            )}
                                            {s.has_pending_warehouses && (
                                                <span className="animate-pulse bg-primary/20 text-primary border border-primary/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0">
                                                    Warehouse Request
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary">
                                            <FaEnvelope className="text-primary opacity-50" />{s.email}
                                        </div>
                                        {s.phone && (
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary">
                                                <FaPhone className="text-success opacity-50" />{s.phone_code} {s.phone}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-text-secondary flex items-center gap-1">
                                            <span className="text-primary font-black uppercase text-[9px] tracking-wider shrink-0">Coverage:</span>
                                            <span className="truncate max-w-[200px]" title={s.states?.join(', ')}>{s.states?.join(', ') || "None"}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                                            <FaMapMarkerAlt className="text-warning opacity-50" />
                                            <span>{s.office_locations?.length || 0} Office{s.office_locations?.length !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest ${STATUS_BADGE[s.status] || ""}`}>
                                        {s.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <IconButton
                                            variant="outline-primary"
                                            size="sm"
                                            tooltip="View Details"
                                            onClick={() => open_modal(s)}
                                        >
                                            <FaEye />
                                        </IconButton>
                                        {s.status === "pending" && (
                                            <>
                                                <IconButton
                                                    variant="success"
                                                    size="sm"
                                                    tooltip="Approve"
                                                    onClick={() => handle_approve(s._id)}
                                                >
                                                    <FaCheck />
                                                </IconButton>
                                                <IconButton
                                                    variant="danger"
                                                    size="sm"
                                                    tooltip="Review & Reject"
                                                    onClick={() => open_modal(s)}
                                                >
                                                    <FaTimes />
                                                </IconButton>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </>
                        )}
                    />
                </div>
            </div>

            {/* Detail / Reject Modal */}
            <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Supplier Application Details" size="lg">
                {modal_loading && (
                    <div className="flex items-center justify-center py-10 gap-3 text-text-muted">
                        <FaSync className="animate-spin text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider">Loading supplier details...</span>
                    </div>
                )}
                {selectedSupplier && !modal_loading && (
                    <div className="space-y-5 p-2">
                        <div className="grid grid-cols-2 gap-4 bg-surface-hover/50 p-5 rounded-2xl border border-border">
                            {[
                                ["Company", selectedSupplier.company_name],
                                ["Email", selectedSupplier.email],
                                ["Phone", `${selectedSupplier.phone_code || ""} ${selectedSupplier.phone || "—"}`],
                                ["GST", selectedSupplier.gst_number || "Not provided"],
                                ["PAN", selectedSupplier.pan_number || "Not provided"],
                                ["Status", selectedSupplier.status],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
                                    <p className="text-sm font-black text-text-primary mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Coverage & Offices */}
                        <div className="bg-surface-hover/50 p-5 rounded-2xl border border-border space-y-4">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">Coverage States & Offices</p>
                            <div className="space-y-4">
                                {selectedSupplier.states && selectedSupplier.states.length > 0 ? (
                                    selectedSupplier.states.map(state => {
                                        const offices = (selectedSupplier.office_locations || []).filter(off => 
                                            isStateMatch(state, off.state, off.address)
                                        );
                                        return (
                                            <div key={state} className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                                                        {state}
                                                    </span>
                                                    <span className="text-[10px] text-text-muted font-bold">
                                                        {offices.length} office{offices.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <div className="pl-3 border-l border-border space-y-1">
                                                    {offices.length > 0 ? (
                                                        offices.map((off, oIdx) => (
                                                            <div key={oIdx} className="text-xs font-semibold text-text-secondary flex items-start gap-1">
                                                                <span className="text-text-muted mt-0.5">•</span>
                                                                <span className="text-left leading-relaxed">{off.address}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-text-muted italic pl-1">No office location configured for this state.</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <span className="text-xs text-text-muted italic">No coverage states configured.</span>
                                )}
                            </div>
                        </div>

                        {/* State Addition Requests */}
                        {selectedSupplier.state_requests && selectedSupplier.state_requests.length > 0 && (
                            <div className="bg-surface-hover/50 p-5 rounded-2xl border border-border space-y-4">
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">State Addition Requests</p>
                                <div className="space-y-4">
                                    {selectedSupplier.state_requests.map((req) => (
                                        <div key={req._id} className="p-4 bg-surface rounded-xl border border-border space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-text-primary">{req.state}</span>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                                        req.status === 'approved' ? 'bg-success/10 text-success border-success/20' :
                                                        req.status === 'rejected' ? 'bg-danger/10 text-danger border-danger/20' :
                                                        'bg-warning/10 text-warning border-warning/20'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-text-muted font-bold">
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-text-secondary font-semibold space-y-1">
                                                <p><strong className="text-text-primary font-bold">Office Address:</strong> {req.office_location?.address}</p>
                                                <p><strong className="text-text-primary font-bold">GSTIN:</strong> {req.gst?.gst_number}</p>
                                                {req.status === 'rejected' && req.rejection_reason && (
                                                    <p className="text-danger mt-1.5 p-2 bg-danger/5 border border-danger/10 rounded-lg">
                                                        <strong className="block text-[9px] uppercase tracking-wider font-bold mb-0.5">Rejection Reason:</strong>
                                                        {req.rejection_reason}
                                                    </p>
                                                )}
                                            </div>

                                            {req.status === 'pending' && (
                                                <div className="space-y-3 pt-2 border-t border-border/50">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">
                                                            Rejection Reason (Required for rejection)
                                                        </label>
                                                        <textarea
                                                            value={stateRejectReasons[req._id] || ""}
                                                            onChange={e => setStateRejectReasons(prev => ({ ...prev, [req._id]: e.target.value }))}
                                                            placeholder="State the reason if rejecting this request..."
                                                            rows={2}
                                                            className="w-full bg-surface-hover border border-border/40 focus:border-primary/30 rounded-xl p-2 text-xs font-semibold outline-none transition-all resize-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="danger" 
                                                            size="sm"
                                                            className="flex-1 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                                                            loading={action_loading}
                                                            onClick={() => handle_reject_state(selectedSupplier._id, req._id, stateRejectReasons[req._id] || "")}
                                                        >
                                                            Reject State
                                                        </Button>
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            className="flex-1 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                                                            loading={action_loading}
                                                            onClick={() => handle_approve_state(selectedSupplier._id, req._id)}
                                                        >
                                                            Approve State
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fulfillment Warehouses */}
                        {selectedSupplier.warehouses && selectedSupplier.warehouses.length > 0 ? (
                            <div className="bg-surface-hover/50 p-5 rounded-2xl border border-border space-y-4">
                                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Fulfillment Warehouses</p>
                                    <div className="flex items-center gap-2">
                                        {selectedSupplier.warehouses.filter(w => w.approval_status === 'pending').length > 0 && (
                                            <span className="animate-pulse bg-warning/20 text-warning border border-warning/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                                                {selectedSupplier.warehouses.filter(w => w.approval_status === 'pending').length} Pending
                                            </span>
                                        )}
                                        <span className="text-[9px] font-black text-text-muted bg-surface border border-border px-2 py-0.5 rounded-md">
                                            {selectedSupplier.warehouses.length} Total
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {selectedSupplier.warehouses.map((wh) => (
                                        <div key={wh._id} className={`p-4 bg-surface rounded-xl border space-y-3 ${
                                            wh.approval_status === 'pending' ? 'border-warning/40 shadow-sm shadow-warning/10' :
                                            wh.approval_status === 'rejected' ? 'border-danger/30' : 'border-border'
                                        }`}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-xs font-black text-text-primary uppercase tracking-tight">{wh.name}</span>
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest">
                                                        <span>Code: {wh.unique_code}</span>
                                                        <span>•</span>
                                                        <span>State: {wh.state_name || wh.state}</span>
                                                    </div>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                                    wh.approval_status === 'approved' ? 'bg-success/10 text-success border-success/20' :
                                                    wh.approval_status === 'rejected' ? 'bg-danger/10 text-danger border-danger/20' :
                                                    'bg-warning/10 text-warning border-warning/20 animate-pulse'
                                                }`}>
                                                    {wh.approval_status === 'pending' ? '⏳ Awaiting Approval' : wh.approval_status}
                                                </span>
                                            </div>

                                            <div className="text-[10px] text-text-secondary font-semibold space-y-1 bg-surface-hover/30 p-2.5 rounded-lg border border-border/40">
                                                <p><strong className="text-text-primary font-bold">Address:</strong> {wh.address || '—'}</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <strong className="text-text-primary font-bold">GSTIN (State):</strong>
                                                    <span className="font-mono">{wh.gst_number || '—'}</span>
                                                    {wh.gst_number && (
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                                            wh.gst_verified
                                                                ? 'bg-success/10 text-success border-success/20'
                                                                : 'bg-warning/10 text-warning border-warning/20'
                                                        }`}>
                                                            {wh.gst_verified ? '✓ Verified' : '! Not Verified'}
                                                        </span>
                                                    )}
                                                </div>
                                                {wh.supply_districts && wh.supply_districts.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2.5 items-center">
                                                        <strong className="text-text-primary font-bold mr-1">Supply Districts:</strong>
                                                        {wh.supply_districts.map(d => (
                                                            <span key={typeof d === 'object' ? d._id : d} className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-lg border border-primary/20">
                                                                {typeof d === 'object' ? d.name : d}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {wh.approval_status === 'rejected' && wh.rejection_reason && (
                                                    <p className="text-danger mt-1.5 p-2 bg-danger/5 border border-danger/10 rounded-lg">
                                                        <strong className="block text-[9px] uppercase tracking-wider font-bold mb-0.5">Rejection Reason:</strong>
                                                        {wh.rejection_reason}
                                                    </p>
                                                )}
                                            </div>

                                            {wh.approval_status === 'approved' && (
                                                <div className="flex justify-end pt-2 border-t border-border/40">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="xs"
                                                        className="text-[9px] uppercase tracking-wider font-black px-3 py-1.5 rounded-lg"
                                                        onClick={() => open_district_assign(wh)}
                                                    >
                                                        Assign Districts
                                                    </Button>
                                                </div>
                                            )}

                                            {wh.approval_status === 'pending' && (
                                                <div className="space-y-3 pt-2 border-t border-warning/20">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">
                                                            Rejection Reason (required to reject)
                                                        </label>
                                                        <textarea
                                                            value={warehouseRejectReasons[wh._id] || ""}
                                                            onChange={e => setWarehouseRejectReasons(prev => ({ ...prev, [wh._id]: e.target.value }))}
                                                            placeholder="State the reason if rejecting this warehouse..."
                                                            rows={2}
                                                            className="w-full bg-surface-hover border border-border/40 focus:border-primary/30 rounded-xl p-2 text-xs font-semibold outline-none transition-all resize-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            className="flex-1 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                                                            loading={action_loading}
                                                            onClick={() => handle_reject_warehouse(selectedSupplier._id, wh._id, warehouseRejectReasons[wh._id] || "")}
                                                        >
                                                            Reject Warehouse
                                                        </Button>
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            className="flex-1 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                                                            loading={action_loading}
                                                            onClick={() => handle_approve_warehouse(selectedSupplier._id, wh._id)}
                                                        >
                                                            Approve Warehouse
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-surface-hover/30 p-4 rounded-2xl border border-border/40 text-center">
                                <p className="text-xs text-text-muted font-semibold italic">No warehouses registered for this supplier.</p>
                            </div>
                        )}

                        {selectedSupplier.supply_districts?.length > 0 && (
                            <div className="bg-surface-hover/50 p-4 rounded-2xl border border-border">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Supply Districts</p>
                                <div className="flex flex-wrap gap-1">
                                    {selectedSupplier.supply_districts.map(d => (
                                        <span key={d} className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg border border-primary/20">{d}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedSupplier.status === "rejected" && selectedSupplier.rejection_reason && (
                            <div className="bg-danger/5 border border-danger/20 p-4 rounded-2xl">
                                <p className="text-[10px] font-bold text-danger uppercase tracking-wider mb-1">Rejection Reason</p>
                                <p className="text-sm font-semibold text-danger">{selectedSupplier.rejection_reason}</p>
                            </div>
                        )}

                        {selectedSupplier.status === "pending" && (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">
                                        Rejection Reason <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        value={reject_reason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        placeholder="Provide a reason if rejecting this application..."
                                        rows={3}
                                        className="w-full bg-surface-hover border-2 border-transparent focus:border-primary/30 rounded-xl p-3 text-sm font-semibold outline-none transition-all resize-none"
                                    />
                                </div>

                                {action_error && (
                                    <p className="text-xs font-bold text-danger">{action_error}</p>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        variant="danger" className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs h-12"
                                        loading={action_loading}
                                        onClick={() => handle_reject(selectedSupplier._id)}
                                    >
                                        Reject Application
                                    </Button>
                                    <Button
                                        variant="success" className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs h-12"
                                        loading={action_loading}
                                        onClick={() => handle_approve(selectedSupplier._id)}
                                    >
                                        Approve Supplier
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>

            {/* District Assignment Dialog */}
            <Dialog 
                isOpen={isDistrictModalOpen} 
                onClose={() => setIsDistrictModalOpen(false)} 
                title={`Configure Supply Districts — ${activeWh?.name || "Warehouse"}`} 
                size="xl"
            >
                {districtsLoading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
                        <FaSync className="animate-spin text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider">Loading districts...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[70vh]">
                        {/* Left Side: District List & Search */}
                        <div className="lg:col-span-7 flex flex-col h-full space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                                    Search Districts ({filteredDistricts.length} available)
                                </label>
                                <div className="relative group">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Filter districts by name..."
                                        value={districtSearch}
                                        onChange={e => setDistrictSearch(e.target.value)}
                                        className="w-full h-11 bg-surface-hover border border-border rounded-xl pl-10 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-text-muted/40"
                                    />
                                </div>
                            </div>

                            {/* Scrollable list of checkboxes */}
                            <div className="flex-1 overflow-y-auto border border-border/60 rounded-2xl p-4 bg-surface-hover/20 space-y-2">
                                {filteredDistricts.length > 0 ? (
                                    filteredDistricts.map(d => {
                                        const isChecked = selectedDistrictIds.includes(d.id);
                                        return (
                                            <label 
                                                key={d.id} 
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                                    isChecked 
                                                        ? 'bg-primary/5 border-primary/30 text-primary font-black' 
                                                        : 'bg-surface border-border text-text-secondary font-semibold hover:border-border-hover'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handle_toggle_district(d.id)}
                                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                                                />
                                                <span className="text-xs uppercase tracking-wider">{d.name}</span>
                                            </label>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10 text-text-muted text-xs italic font-semibold">
                                        No districts match your search query.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Map & Selected Overview */}
                        <div className="lg:col-span-5 flex flex-col h-full bg-surface-hover/40 border border-border rounded-2xl p-5 space-y-4 overflow-y-auto">
                            {/* Warehouse Card Info */}
                            <div className="bg-surface p-4 rounded-xl border border-border space-y-1">
                                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Active Warehouse</div>
                                <div className="text-sm font-black text-text-primary uppercase tracking-tight">{activeWh?.name}</div>
                                <div className="text-[10px] text-text-secondary font-semibold">Code: {activeWh?.unique_code}</div>
                                <div className="text-[10px] text-text-secondary font-semibold">State: {activeWh?.state_name || activeWh?.state}</div>
                                <div className="text-[10px] text-text-secondary font-semibold leading-relaxed">Address: {activeWh?.address}</div>
                            </div>

                            {/* Map Container */}
                            <div className="flex-1 min-h-[220px] rounded-xl overflow-hidden border border-border relative bg-surface shadow-inner">
                                {isLoaded && activeWh?.lat && activeWh?.lng ? (
                                    <UniversalMap
                                        center={{ lat: parseFloat(activeWh.lat), lng: parseFloat(activeWh.lng) }}
                                        zoom={10}
                                        markers={[{ lat: parseFloat(activeWh.lat), lng: parseFloat(activeWh.lng), status: 'included', isSelected: true }]}
                                        boundaries={mapBoundaries}
                                        containerStyle={{ width: "100%", height: "100%" }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted p-4 text-center">
                                        <FaMapMarkerAlt size={28} className="text-text-muted/60 mb-2" />
                                        <p className="text-[11px] font-bold uppercase tracking-wider">No Location Map Available</p>
                                        <p className="text-[10px] mt-1 text-text-muted/80 leading-relaxed">Warehouse location coordinates (lat/lng) are missing.</p>
                                    </div>
                                )}
                            </div>

                            {/* Selected Districts Districts Tags Display */}
                            <div className="space-y-2">
                                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                                    Selected Districts ({selectedDistrictIds.length})
                                </div>
                                <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto p-1.5 bg-surface border border-border/80 rounded-xl">
                                    {selectedDistrictIds.length > 0 ? (
                                        selectedDistrictIds.map(id => {
                                            const dist = districtsList.find(d => d.id === id);
                                            return (
                                                <span 
                                                    key={id} 
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[9px] font-black rounded-lg border border-primary/20 uppercase tracking-wider"
                                                >
                                                    {dist ? dist.name : "..."}
                                                    <button 
                                                        onClick={() => handle_toggle_district(id)}
                                                        className="hover:text-danger hover:bg-danger/10 p-0.5 rounded transition-colors"
                                                    >
                                                        <FaTimes size={10} />
                                                    </button>
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span className="text-[10px] text-text-muted italic p-1">No districts selected yet.</span>
                                    )}
                                </div>
                            </div>

                            {action_error && (
                                <p className="text-xs font-bold text-danger">{action_error}</p>
                            )}

                            {/* Modal Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl font-black uppercase tracking-wider text-[10px] h-11"
                                    onClick={() => setIsDistrictModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="success"
                                    className="flex-1 rounded-xl font-black uppercase tracking-wider text-[10px] h-11"
                                    loading={saveWhLoading}
                                    onClick={handle_save_districts}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
