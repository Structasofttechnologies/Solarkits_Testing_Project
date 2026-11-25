import React, { useEffect, useState } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { FiCheckCircle, FiXCircle, FiFileText } from "react-icons/fi";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import Dialog from "@/components/Dialog";
import ConfirmationPopup from "@/components/ConfirmationPopup";

export default function ReviewDetailsDialog({ isOpen, onClose, warehouseId, moduleUniqueId, onSuccess }) {
    const dispatch = useDispatch();

    const [warehouse, setWarehouse] = useState(null);
    const [sections, setSections] = useState([]);
    const [fields, setFields] = useState([]);
    const [submittedData, setSubmittedData] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [rejectReason, setRejectReason] = useState("");
    const [rejectDueDate, setRejectDueDate] = useState("");
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
        if (isOpen && warehouseId) {
            fetchData();
            setShowRejectModal(false);
            setRejectReason("");
        }
    }, [isOpen, warehouseId]);

    const handleAction = async (status, reason = null, dueDate = null) => {
        if (status === 5 && dueDate) {
            const parsedDate = new Date(dueDate);
            const diffTime = parsedDate.getTime() - Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            if (diffTime <= oneDayMs) {
                dispatch(setAlert({ type: "warning", message: "Due date must be a future date and more than 1 day (24 hours) from now." }));
                return;
            }
        }
        try {
            setActionLoading(true);
            const payload = {
                warehouse_id: warehouseId,
                status: status,
                ...(reason && { rejection_reason: reason }),
                ...(dueDate && { due_date: dueDate })
            };

            const res = await axios.post(`${import.meta.env.VITE_API_URL}/warehouses/validation/change-status?unique_id=${moduleUniqueId}&req_for=edit`, payload, { headers: { ...authHeaderObj() } });
            
            if (res.data.status === "success") {
                dispatch(setAlert({ type: "success", message: res.data.message }));
                setShowRejectModal(false);
                setRejectReason("");
                setRejectDueDate("");
                if (onSuccess) onSuccess(status);
                onClose();
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

    if (!isOpen) return null;

    let content;

    if (loading) {
        content = <div className="py-12"><Loader text="Loading details..." /></div>;
    } else if (!warehouse) {
        content = <div className="p-6 text-center text-text-secondary">Warehouse not found.</div>;
    } else {
        content = (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-text-primary mb-2">Submitted Details</h2>
                        <p className="text-text-secondary text-sm">Please review the information provided by the warehouse manager.</p>
                    </div>
                    
                    {warehouse.status_id === 3 && (
                        <div className="flex gap-3">
                            <Button 
                                onClick={() => {
                                    const defaultDueDate = new Date();
                                    defaultDueDate.setDate(defaultDueDate.getDate() + 2);
                                    defaultDueDate.setHours(17, 0, 0, 0);
                                    const offset = defaultDueDate.getTimezoneOffset();
                                    const localTime = new Date(defaultDueDate.getTime() - (offset*60*1000));
                                    setRejectDueDate(localTime.toISOString().slice(0, 16));
                                    setShowRejectModal(true);
                                }}
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

                <div className="space-y-6">
                    {/* Warehouse Photos Section */}
                    {warehouse?.images && warehouse.images.length > 0 && (
                        <div className="border border-border rounded-xl overflow-hidden">
                            <div className="bg-surface-hover px-4 py-3 border-b border-border">
                                <h3 className="font-bold text-md text-text-primary">Warehouse Photos</h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                            <div key={section.id} className="border border-border rounded-xl overflow-hidden">
                                <div className="bg-surface-hover px-4 py-3 border-b border-border flex items-center justify-between">
                                    <h3 className="font-bold text-md text-text-primary">{section.name}</h3>
                                    <span className="text-xs font-semibold text-text-muted uppercase">{sectionFields.length} fields</span>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {sectionFields.map(field => (
                                        <div key={field.id} className="bg-bg p-3 rounded-lg border border-border/50">
                                            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">{field.label || field.name}</p>
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
        );
    }

    return (
        <Dialog 
            isOpen={isOpen} 
            onClose={() => !actionLoading && !showRejectModal && onClose()} 
            title={`Review Details: ${warehouse?.warehouse_code || 'Warehouse'}`}
            size="xl"
        >
            {content}

            {/* Reject Modal (Nested or Overlayed) */}
            <ConfirmationPopup
                isOpen={showRejectModal}
                title="Reject Submission"
                message="Please provide a reason for rejection. The manager will see this note and can resubmit."
                mode="custom"
                variant="danger"
                isLoading={actionLoading}
                confirmText="Confirm Rejection"
                cancelText="Cancel"
                onConfirm={() => handleAction(5, rejectReason, rejectDueDate)}
                onCancel={() => setShowRejectModal(false)}
                confirmButtonProps={{ disabled: !rejectReason.trim() || !rejectDueDate }}
                customContent={
                    <div className="space-y-4">
                        <div>
                            <label className="text-text-primary text-xs font-bold uppercase tracking-wider block mb-2">Rejection Reason *</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Type rejection reason here..."
                                className="w-full h-24 bg-bg border border-border rounded-xl p-4 focus:border-danger focus:ring-1 focus:ring-danger outline-none resize-none text-sm text-text-primary placeholder:text-text-muted"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-text-primary text-xs font-bold uppercase tracking-wider block mb-2">New Submission Deadline *</label>
                            <input
                                type="datetime-local"
                                value={rejectDueDate}
                                onChange={(e) => setRejectDueDate(e.target.value)}
                                className="w-full h-12 bg-bg border border-border rounded-xl px-4 text-text-primary focus:outline-none focus:border-danger focus:ring-1 focus:ring-danger text-sm cursor-pointer"
                                required
                            />
                        </div>
                    </div>
                }
            />
        </Dialog>
    );
}
