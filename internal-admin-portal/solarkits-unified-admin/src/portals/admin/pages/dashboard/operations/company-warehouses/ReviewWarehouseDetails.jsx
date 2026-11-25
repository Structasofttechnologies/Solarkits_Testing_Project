import React, { useEffect, useState } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { FiCheck, FiX, FiChevronLeft, FiFileText, FiClock, FiCheckCircle, FiXCircle } from "react-icons/fi";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import Loader from "@/components/Loader";
import ConfirmationPopup from "@/components/ConfirmationPopup";

export default function ReviewWarehouseDetails({ moduleUniqueId }) {
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

    const fetchData = async () => {
        try {
            setLoading(true);
            const resWarehouse = await axios.get(`${import.meta.env.VITE_API_URL}/warehouses/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } });
            setWarehouse(resWarehouse.data.warehouse);

            const resSections = await axios.get(`${import.meta.env.VITE_API_URL}/warehouses/validation/sections/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } });
            const sectionsData = resSections.data.sections;
            setSections(sectionsData);

            let allFields = [];
            for (const section of sectionsData) {
                const resFields = await axios.get(`${import.meta.env.VITE_API_URL}/warehouses/validation/sections/${warehouseId}/${section.id}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } });
                const fieldsWithSectionId = resFields.data.fields.map(f => ({ ...f, section_id: section.id }));
                allFields = [...allFields, ...fieldsWithSectionId];
            }
            setFields(allFields);
            
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

            const res = await axios.post(`${import.meta.env.VITE_API_URL}/warehouses/validation/change-status?unique_id=${moduleUniqueId}&req_for=edit`, payload, { headers: { ...authHeaderObj() } });
            
            if (res.data.status === "success") {
                dispatch(setAlert({ type: "success", message: res.data.message }));
                setShowRejectModal(false);
                setRejectReason("");
                navigate(-1); // Go back after action
            }
        } catch (error) {
            dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Action failed." }));
        } finally {
            setActionLoading(false);
        }
    };

    const renderFieldValue = (field, value) => {
        if (!value) return <span className="text-text-muted italic">Not provided</span>;
        
        switch (field.field_type) {
            case 'dropdown':
            case 'single_line_input':
            case 'multi_line_input':
            case 'number':
            case 'email':
                return <span className="text-text-primary font-medium">{value}</span>;
            case 'multi_select_dropdown':
                try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) return <span className="text-text-primary font-medium">{parsed.join(", ")}</span>;
                } catch(e) {}
                return <span className="text-text-primary font-medium">{value}</span>;
            case 'checkbox':
            case 'yesno':
                return <span className="text-text-primary font-medium">{value === 'true' || value === true || value === 'yes' ? 'Yes' : 'No'}</span>;
            case 'date':
                return <span className="text-text-primary font-medium">{new Date(value).toLocaleDateString()}</span>;
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
                                            <div key={i} className="border border-border rounded overflow-hidden max-w-[200px]">
                                                <a href={fileUrl} target="_blank" rel="noreferrer" className="block">
                                                    <img src={fileUrl} alt={fileName} className="h-24 w-full object-cover hover:opacity-80 transition-opacity" title={fileName} />
                                                </a>
                                            </div>
                                        );
                                    }

                                    // Fallback URL if path was missing (e.g., old data)
                                    const finalUrl = fileUrl || `${warehouseBaseUrl}/uploads/${fileName}`;

                                    return (
                                        <a key={i} href={finalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-surface hover:bg-surface-hover border border-border rounded-lg max-w-sm cursor-pointer transition-colors">
                                            <FiFileText className="text-primary w-5 h-5 shrink-0" />
                                            <span className="text-sm text-primary truncate" title={fileName}>{fileName}</span>
                                            {fileSize && <span className="text-xs text-text-muted shrink-0">{fileSize}</span>}
                                        </a>
                                    );
                                })}
                            </div>
                        );
                    }
                } catch (e) {
                    return <span className="text-text-primary font-medium">{value}</span>;
                }
                return <span className="text-text-primary font-medium">{value}</span>;
            default:
                return <span className="text-text-primary font-medium">{value}</span>;
        }
    };

    if (loading) return <Loader />;

    if (!warehouse) return <div className="p-6 text-center text-text-secondary">Warehouse not found.</div>;

    return (
        <div className="space-y-6 relative">
            <PageHeader
                title="Review Validation Submission"
                subtitle={`Reviewing details for ${warehouse?.warehouse_code || 'Warehouse'}`}
                icon={FiFileText}
                actions={
                    <Button
                        onClick={() => navigate(-1)}
                        variant="secondary"
                        leftIcon={<FiChevronLeft />}
                    >
                        Back
                    </Button>
                }
            />

            <div className="card shadow-sm border border-border bg-surface rounded-3xl overflow-hidden mb-6 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-text-primary mb-2">Submitted Details</h2>
                        <p className="text-text-secondary">Please review the information provided by the warehouse manager.</p>
                    </div>
                    
                    {warehouse.status_id === 3 && (
                        <div className="flex gap-3">
                            <Button 
                                onClick={() => setShowRejectModal(true)}
                                variant="danger"
                                leftIcon={<FiXCircle />}
                                disabled={actionLoading}
                            >
                                Reject
                            </Button>
                            <Button 
                                onClick={() => handleAction(4)}
                                variant="success"
                                leftIcon={<FiCheckCircle />}
                                disabled={actionLoading}
                            >
                                Approve & Verify
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    {/* Warehouse Photos Section */}
                    {warehouse?.images && warehouse.images.length > 0 && (
                        <div className="border border-border rounded-2xl overflow-hidden">
                            <div className="bg-surface-hover/50 px-6 py-4 border-b border-border">
                                <h3 className="font-bold text-lg text-text-primary">Warehouse Photos</h3>
                            </div>
                            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                                                    className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                                                />
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {sections.map(section => {
                        const sectionFields = fields.filter(f => f.section_id === section.id);
                        if (sectionFields.length === 0) return null;

                        return (
                            <div key={section.id} className="border border-border rounded-2xl overflow-hidden">
                                <div className="bg-surface-hover/50 px-6 py-4 border-b border-border flex items-center justify-between">
                                    <h3 className="font-bold text-lg text-text-primary">{section.name}</h3>
                                    <span className="text-xs font-semibold text-text-muted uppercase">{sectionFields.length} fields</span>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {sectionFields.map(field => (
                                        <div key={field.id} className="bg-bg/50 p-4 rounded-xl border border-border/50">
                                            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">{field.label || field.name}</p>
                                            <div className="mt-1">
                                                {renderFieldValue(field, submittedData[field.id])}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Reject Modal */}
            <ConfirmationPopup
                isOpen={showRejectModal}
                title="Reject Submission"
                message="Please provide a reason for rejection. The manager will see this note and can resubmit."
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
