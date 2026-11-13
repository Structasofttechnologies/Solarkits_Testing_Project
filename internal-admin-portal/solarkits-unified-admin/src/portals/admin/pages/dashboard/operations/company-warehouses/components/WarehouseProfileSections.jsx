import axios from "axios"
import { authHeaderObj } from "@/app/authHeader";
import { useEffect, useState } from "react"
import { 
    FiChevronRight, 
    FiClock, 
    FiPackage, 
    FiCheckCircle, 
    FiAlertCircle, 
    FiChevronLeft,
    FiHome,
    FiMapPin,
    FiGlobe,
    FiSend,
    FiPlus
} from "react-icons/fi"
import { HiDocumentMagnifyingGlass } from "react-icons/hi2";
import { useNavigate, useParams } from "react-router-dom"
import { useDispatch } from "react-redux"
import { setAlert } from "@/features/alert.slice"
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import ReviewDetailsDialog from "./ReviewDetailsDialog";

import Dialog from "@/components/Dialog";
import CustomInput from "@/components/CustomInput";

export default function WarehouseProfileSections({ moduleUniqueId }) {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [sections, setSections] = useState([])
    const [warehouse, setWarehouse] = useState(null)
    const [loadingWarehouse, setLoadingWarehouse] = useState(true)
    const [changingStatus, setChangingStatus] = useState(false)
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
    
    // Add section modal state
    const [addSectionOpen, setAddSectionOpen] = useState(false)
    const [newSectionName, setNewSectionName] = useState("")
    const [newSectionCode, setNewSectionCode] = useState("")
    const [addingSection, setAddingSection] = useState(false)

    // Due date modal state
    const [dueModalOpen, setDueModalOpen] = useState(false)
    const [selectedDueDate, setSelectedDueDate] = useState("")

    const { warehouseId } = useParams()

    const get_sections = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/warehouses/validation/sections/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } })
            setSections(res.data.sections)
        } catch (error) {
            console.log(error)
        }
    }

    const fetchWarehouse = async () => {
        try {
            setLoadingWarehouse(true)
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/warehouses/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } })
            setWarehouse(res.data.warehouse)
        } catch (error) {
            console.log(error)
        } finally {
            setLoadingWarehouse(false)
        }
    }

    useEffect(() => {
        get_sections()
        fetchWarehouse()
    }, [])

    const handleSendToManager = async () => {
        if (!selectedDueDate) {
            dispatch(setAlert({ type: "warning", message: "Please select a submission deadline due date." }));
            return;
        }
        const parsedDate = new Date(selectedDueDate);
        const diffTime = parsedDate.getTime() - Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (diffTime <= oneDayMs) {
            dispatch(setAlert({ type: "warning", message: "Due date must be a future date and more than 1 day (24 hours) from now." }));
            return;
        }
        try {
            setChangingStatus(true)
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/warehouses/validation/change-status?unique_id=${moduleUniqueId}&req_for=edit`, {
                warehouse_id: warehouseId,
                status: 2,
                due_date: selectedDueDate
            }, { headers: { ...authHeaderObj() } })

            if (res.data.status === "success") {
                // Update local warehouse status
                setWarehouse(prev => ({
                    ...prev,
                    status_id: 2,
                    due_date: selectedDueDate
                }))
                dispatch(setAlert({
                    type: "success",
                    message: "Profile setup request sent to manager with deadline. Status is now Awaiting Information.",
                    duration: 5000
                }))
                setDueModalOpen(false)
            }
        } catch (err) {
            console.log(err)
            dispatch(setAlert({
                type: "error",
                message: err.response?.data?.message || "Failed to update warehouse profile status.",
                duration: 5000
            }))
        } finally {
            setChangingStatus(false)
        }
    }

    const handleAddSection = async () => {
        if (!newSectionName.trim() || !newSectionCode.trim()) {
            dispatch(setAlert({ type: "error", message: "Section Name and Code are required." }));
            return;
        }
        try {
            setAddingSection(true);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/warehouses/validation/sections/add?unique_id=${moduleUniqueId}&req_for=add`, {
                name: newSectionName,
                code: newSectionCode
            }, { headers: { ...authHeaderObj() } });
            
            dispatch(setAlert({ type: "success", message: res.data.message }));
            setAddSectionOpen(false);
            setNewSectionName("");
            setNewSectionCode("");
            get_sections(); // Refresh list
        } catch (error) {
            dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Failed to add section." }));
        } finally {
            setAddingSection(false);
        }
    };

    return (
        <div className="space-y-4 lg:space-y-6">
            <PageHeader
                title="Warehouse Profile Setup"
                subtitle="Select a section to configure profile fields for this warehouse"
                icon={FiPackage}
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => navigate(-1)}
                            variant="secondary"
                            leftIcon={<FiChevronLeft />}
                            className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-[0.98] h-[46px]"
                        >
                            Back to Warehouse
                        </Button>
                        <Button
                            onClick={() => setAddSectionOpen(true)}
                            variant="primary"
                            leftIcon={<FiPlus />}
                            className="bg-primary text-white hover:bg-primary-hover shadow-sm h-[46px]"
                        >
                            Add Profile Section
                        </Button>
                    </div>
                }
                stats={[
                    {
                        label: "Total Sections",
                        value: sections.length,
                        description: "Available"
                    },
                    {
                        label: "Total Fields",
                        value: sections.reduce((acc, section) => acc + (section?.total_fields || 0), 0),
                        description: "Across sections"
                    },
                    {
                        label: "Enabled Fields",
                        value: sections.reduce((acc, section) => acc + (Number(section?.enabled_fields) || 0), 0),
                        description: "Active"
                    },
                    {
                        label: "Completion",
                        value: `${sections.length > 0 
                            ? Math.round((sections.reduce((acc, section) => acc + (Number(section?.enabled_fields || 0)), 0) / 
                               sections.reduce((acc, section) => acc + (section?.total_fields || 0), 0)) * 100)
                            : 0}%`,
                        description: "Overall"
                    }
                ]}
            />

            {/* Warehouse Status Banner */}
            {!loadingWarehouse && warehouse && (
                <div className="card shadow-md border border-border bg-surface rounded-3xl overflow-hidden mb-6 animate-in fade-in duration-300">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white shadow-md">
                                <FiHome className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                                    <h3 className="font-black text-text-primary text-lg tracking-tight leading-none uppercase">
                                        {warehouse.warehouse_code || "CODE-N/A"}
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                        warehouse.warehouse_type === "company"
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            : warehouse.warehouse_type === "3pl"
                                                ? "bg-primary/10 text-primary border-primary/20"
                                                : "bg-surface border-border text-text-secondary"
                                    }`}>
                                        {warehouse.warehouse_type === "company" ? "Company Warehouse" : warehouse.warehouse_type === "3pl" ? "3PL Warehouse" : (warehouse.warehouse_type === "master" ? "Master Hub" : warehouse.warehouse_type === "sub" ? "Sub Facility" : "Facility")}
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-2.5">
                                    <FiMapPin className="text-primary/70" /> {warehouse.address}
                                </p>
                                <div className="flex items-center gap-4 flex-wrap text-xs">
                                    {/* Profile Status Badge */}
                                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-text-secondary">
                                        <span>Profile Status:</span>
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-white bg-linear-to-r ${
                                            warehouse.status_id === 1 ? "from-slate-500 to-slate-600" :
                                            warehouse.status_id === 2 ? "from-amber-500 to-amber-600" :
                                            warehouse.status_id === 3 ? "from-blue-500 to-blue-600" :
                                            warehouse.status_id === 4 ? "from-green-500 to-green-600" :
                                            "from-red-500 to-red-600"
                                        } shadow-xs`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                            {warehouse.status_id === 1 ? "Pending Setup" :
                                             warehouse.status_id === 2 ? "Awaiting Info" :
                                             warehouse.status_id === 3 ? "In Review" :
                                             warehouse.status_id === 4 ? "Verified" :
                                             "Rejected"}
                                        </span>
                                    </div>
                                    {/* Active State Badge */}
                                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-text-secondary">
                                        <span>Operation State:</span>
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                                            warehouse.is_active === 1
                                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                                : "bg-red-500/10 text-red-600 border border-red-500/20"
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${warehouse.is_active === 1 ? "bg-emerald-500" : "bg-red-500"}`} />
                                            {warehouse.is_active === 1 ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    {warehouse.due_date && (
                                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-text-secondary">
                                            <span>Deadline:</span>
                                            <span className="text-xs text-danger font-bold">
                                                {new Date(warehouse.due_date).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* Manual Transition Button to Awaiting Info */}
                            {warehouse.status_id !== 2 && warehouse.status_id !== 3 && (
                                <Button
                                    onClick={() => {
                                        // Pre-fill with 2 days from now (to guarantee > 24 hours at any time)
                                        const defaultDueDate = new Date();
                                        defaultDueDate.setDate(defaultDueDate.getDate() + 2);
                                        defaultDueDate.setHours(17, 0, 0, 0); // 5 PM 2 days from now
                                        const offset = defaultDueDate.getTimezoneOffset();
                                        const localTime = new Date(defaultDueDate.getTime() - (offset*60*1000));
                                        setSelectedDueDate(localTime.toISOString().slice(0, 16));
                                        setDueModalOpen(true);
                                    }}
                                    loading={changingStatus}
                                    disabled={changingStatus || (warehouse.status_id === 1 && !warehouse.manager)}
                                    variant="warning"
                                    className="bg-linear-to-br from-amber-500 to-amber-600 font-bold"
                                    leftIcon={<FiSend size={14} />}
                                >
                                    {warehouse.status_id === 1
                                        ? "Send to Manager"
                                        : "Re-open Profile"
                                    }
                                </Button>
                            )}

                            {warehouse.status_id === 3 && (
                                <Button
                                    onClick={() => setReviewDialogOpen(true)}
                                    variant="primary"
                                    className="bg-linear-to-br from-blue-500 to-blue-600 font-bold"
                                    leftIcon={<HiDocumentMagnifyingGlass size={14} />}
                                >
                                    Review Details
                                </Button>
                            )}

                            {warehouse.status_id === 1 && !warehouse.manager && (
                                <div className="text-[11px] text-amber-600 bg-amber-500/5 border border-amber-500/15 p-3 rounded-2xl max-w-xs flex items-start gap-2">
                                    <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                        Cannot invite manager because no manager is assigned to this warehouse. Assign a manager in warehouse details to enable onboarding.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {sections.map((section, ind) => (
                    <div
                        key={ind}
                        className="card bg-surface border border-border hover:border-primary/40 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer group"
                        onClick={() => navigate(`${section.id}`)}
                    >
                        <div className="p-6">
                            {/* Card Header Tag */}
                            <div className="flex justify-end mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-primary/5 text-text-secondary border border-primary/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                    <FiClock size={10} className="text-primary" />
                                    Profile Category
                                </span>
                            </div>

                            <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white shadow-md shadow-primary/10">
                                        <FiPackage className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-text-primary text-lg group-hover:text-primary transition-colors uppercase tracking-tight">
                                            {section.name}
                                        </h3>
                                        <p className="text-xs text-text-secondary font-medium">
                                            Configure validations and specifications
                                        </p>
                                    </div>
                                </div>
                                <FiChevronRight className="text-text-secondary group-hover:text-primary transform group-hover:translate-x-1.5 transition-all w-5 h-5" />
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-surface-hover/50 p-3.5 rounded-xl border border-border/60 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-300 text-center shadow-xs">
                                    <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                        <FiPackage className="text-primary w-3 h-3" />
                                        Total Fields
                                    </p>
                                    <p className="text-2xl font-black text-text-primary group-hover:text-primary transition-colors">{section?.total_fields || 0}</p>
                                </div>
                                <div className="bg-linear-to-br from-green-500/5 to-green-600/5 p-3.5 rounded-xl border border-green-500/20 text-center shadow-xs">
                                    <p className="text-green-600 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                        <FiCheckCircle className="text-green-600 w-3 h-3" />
                                        Enabled
                                    </p>
                                    <p className="text-2xl font-black text-green-600">{section?.enabled_fields || 0}</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {section?.total_fields > 0 && (
                                <div className="mt-5">
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="text-text-secondary font-semibold">Section Completion</span>
                                        <span className="font-black text-primary">
                                            {Math.round((section?.enabled_fields || 0) / section?.total_fields * 100)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-linear-to-r from-primary to-primary-end rounded-full transition-all duration-300"
                                            style={{ width: `${(section?.enabled_fields || 0) / section?.total_fields * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {sections.length === 0 && (
                <div className="card p-5">
                    <div className="bg-linear-120 from-primary/5 to-primary/10 rounded-xl border-2 border-dashed border-primary/30 p-12 text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <FiAlertCircle className="text-primary text-3xl" />
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary mb-2">No Profile Sections</h3>
                        <p className="text-text-secondary max-w-md mx-auto text-sm">
                            No profile sections have been configured for this warehouse yet.
                        </p>
                    </div>
                </div>
            )}

            <ReviewDetailsDialog 
                isOpen={reviewDialogOpen}
                onClose={() => setReviewDialogOpen(false)}
                warehouseId={warehouseId}
                moduleUniqueId={moduleUniqueId}
                onSuccess={(newStatus) => setWarehouse(prev => ({ ...prev, status_id: newStatus }))}
            />

            <Dialog
                isOpen={addSectionOpen}
                onClose={() => !addingSection && setAddSectionOpen(false)}
                title="Add Profile Section"
                size="md"
            >
                <div className="space-y-4 pt-4">
                    <p className="text-sm text-text-secondary">
                        Create a new globally available profile section. Once created, you can navigate to it to add specific fields.
                    </p>
                    <div className="space-y-3">
                        <CustomInput
                            label="Section Name"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            placeholder="e.g. Quality Control"
                            required
                        />
                        <CustomInput
                            label="Section Code"
                            value={newSectionCode}
                            onChange={(e) => setNewSectionCode(e.target.value)}
                            placeholder="e.g. quality_control"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <Button
                            variant="secondary"
                            onClick={() => setAddSectionOpen(false)}
                            disabled={addingSection}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleAddSection}
                            loading={addingSection}
                        >
                            Create Section
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Set Due Date Modal */}
            <Dialog
                isOpen={dueModalOpen}
                onClose={() => !changingStatus && setDueModalOpen(false)}
                title="Set Submission Deadline"
                size="md"
            >
                <div className="space-y-4 pt-4">
                    <p className="text-sm text-text-secondary">
                        Set a due date and time for the warehouse manager to submit their profile details. 
                        If not completed by this time, the profile will be auto-submitted.
                    </p>
                    <div className="space-y-3">
                        <label className="text-text-primary text-sm font-semibold block">
                            Submission Due Date & Time *
                        </label>
                        <input
                            type="datetime-local"
                            value={selectedDueDate}
                            onChange={(e) => setSelectedDueDate(e.target.value)}
                            className="w-full h-12 bg-bg border border-border rounded-xl px-4 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm cursor-pointer"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <Button
                            variant="secondary"
                            onClick={() => setDueModalOpen(false)}
                            disabled={changingStatus}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSendToManager}
                            loading={changingStatus}
                        >
                            Confirm & Send
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}
