import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/components/Dropdown";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import IconButton from "@/components/IconButton";
import ToggleButton from "@/components/ToggleButton";
import { setAlert } from "@/features/alert.slice";
import {
  FiBriefcase,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiUsers,
  FiEdit,
  FiX,
  FiSearch,
  FiGrid,
  FiClock,
  FiLock,
  FiMapPin,
  FiLayers,
  FiGlobe
} from "react-icons/fi";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";

export default function Departments({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const hasAddPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "add" });
  const hasEditPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "edit" });

  const [panels, setPanels] = useState([]);
  const [selectedPanels, setSelectedPanels] = useState([]);
  const [level, setLevel] = useState("country");
  const [countries, setCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [departmentName, setDepartmentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingDepartments, setExistingDepartments] = useState([]);

  const [editPopup, setEditPopup] = useState({
    isOpen: false,
    department: null,
    newName: "",
    newLevel: "country",
    newSelectedCountries: [],
    newSelectedPanels: []
  });

  const [updateConfirmation, setUpdateConfirmation] = useState({
    isOpen: false,
    department: null,
    newName: "",
    newLevel: "country",
    newSelectedCountries: [],
    newSelectedPanels: [],
    isLoading: false,
    otpMode: false,
    otp: "",
    title: "",
    message: "",
    confirmText: ""
  });

  // Search and Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountryFilter, setSelectedCountryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const countryFilterOptions = useMemo(() => {
    return [
      { value: "", text: "All Countries & Tiers" },
      { value: "global", text: "Global Tier Only" },
      ...countries
    ];
  }, [countries]);

  const API = import.meta.env.VITE_API_URL;

  const getPanels = async () => {
    try {
      const res = await axios.get(`${API}/panels?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      setPanels(res.data.data?.map((p) => ({
        id: p.id || p._id,
        name: p.name,
        url_prefix: p.url_prefix
      })) || []);
    } catch (error) {
      console.error("Error loading panels:", error);
      dispatch(
        setAlert({
          type: "error",
          message: "Failed to load panels. Please try again.",
          duration: 4000
        })
      );
    }
  };

  const getCountries = async () => {
    try {
      const res = await axios.get(`${API}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      setCountries(res.data.countries?.map(c => ({
        value: c._id || c.id,
        text: c.name
      })) || []);
    } catch (error) {
      console.error("Error loading countries:", error);
    }
  };

  const getExistingDepartments = async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API}/departments?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      setExistingDepartments(res.data.data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!departmentName.trim()) {
      return dispatch(setAlert({ type: "error", message: "Please enter a department name!" }));
    }
    if (level === 'country' && (!selectedCountries || selectedCountries.length === 0)) {
      return dispatch(setAlert({ type: "error", message: "Please select at least one country!" }));
    }
    if (selectedPanels.length === 0) {
      return dispatch(setAlert({ type: "error", message: "Please assign at least one panel!" }));
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/departments?unique_id=${moduleUniqueId}&req_for=add`,
        {
          name: departmentName.trim(),
          level,
          country_ids: level === 'global' ? [] : selectedCountries,
          country_id: level === 'global' ? null : (selectedCountries[0] || null),
          panels: selectedPanels
        },
        {
          headers: authHeaderObj()
        }
      );

      dispatch(
        setAlert({
          type: "success",
          message: res.data.message || "Department created successfully!"
        })
      );

      // Reset form
      setDepartmentName("");
      setLevel("country");
      setSelectedCountries([]);
      setSelectedPanels([]);

      // Refresh existing departments list
      await getExistingDepartments();
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to create department.",
          duration: 4000
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = (dept) => {
    if (dept.is_protected) {
      return dispatch(setAlert({ type: "warning", message: "Protected system records cannot be edited." }));
    }
    setEditPopup({
      isOpen: true,
      department: dept,
      newName: dept.name,
      newLevel: dept.level || 'country',
      newSelectedCountries: dept.country_ids || (dept.country_id ? [dept.country_id] : []),
      newSelectedPanels: dept.panels?.map(p => p.id) || []
    });
  };

  const handleEditSubmit = () => {
    if (!editPopup.newName.trim()) {
      return dispatch(setAlert({ type: "warning", message: "Please enter a department name!", duration: 4000 }));
    }
    if (editPopup.newLevel === 'country' && (!editPopup.newSelectedCountries || editPopup.newSelectedCountries.length === 0)) {
      return dispatch(setAlert({ type: "warning", message: "Please select at least one country!", duration: 4000 }));
    }
    if (editPopup.newSelectedPanels.length === 0) {
      return dispatch(setAlert({ type: "warning", message: "Please assign at least one panel!", duration: 4000 }));
    }

    setEditPopup(prev => ({ ...prev, isOpen: false }));

    setUpdateConfirmation({
      isOpen: true,
      department: editPopup.department,
      newName: editPopup.newName.trim(),
      newLevel: editPopup.newLevel,
      newSelectedCountries: editPopup.newLevel === 'global' ? [] : editPopup.newSelectedCountries,
      newSelectedPanels: editPopup.newSelectedPanels,
      isLoading: false,
      otpMode: false,
      otp: "",
      title: `Update Department "${editPopup.department.name}"`,
      message: "Are you sure you want to update this department? All users and roles assigned to it will be affected.",
      confirmText: "Yes, Update",
      variant: "warning"
    });
  };

  const confirmUpdateDepartment = async (otp = "") => {
    if (!updateConfirmation.department) return;

    setUpdateConfirmation(prev => ({ ...prev, isLoading: true }));

    try {
      if (!updateConfirmation.otpMode) {
        await axios.get(
          `${API}/departments/update-otp/${updateConfirmation.department.id}?unique_id=${moduleUniqueId}&req_for=add`,
          { headers: authHeaderObj() }
        );

        dispatch(
          setAlert({
            type: "success",
            message: "OTP sent to your registered email.",
            duration: 3000
          })
        );

        // Switch to OTP mode
        setUpdateConfirmation(prev => ({
          ...prev,
          otpMode: true,
          isLoading: false,
          message: "Please enter the OTP sent to your email to confirm the update.",
          confirmText: "Confirm & Update"
        }));
        return;
      }

      // If in OTP mode, confirm update with OTP
      const res = await axios.put(
        `${API}/departments/${updateConfirmation.department.id}?unique_id=${moduleUniqueId}&req_for=edit`,
        {
          name: updateConfirmation.newName,
          level: updateConfirmation.newLevel,
          country_ids: updateConfirmation.newSelectedCountries,
          country_id: updateConfirmation.newSelectedCountries[0] || null,
          panels: updateConfirmation.newSelectedPanels,
          otp
        },
        {
          headers: authHeaderObj()
        }
      );

      dispatch(
        setAlert({
          type: "success",
          message: res.data.message || "Department updated successfully!",
          duration: 3000
        })
      );

      // Reset editing state
      setUpdateConfirmation({
        isOpen: false,
        department: null,
        isLoading: false,
        otpMode: false,
        otp: "",
        title: "",
        message: "",
        confirmText: ""
      });

      await getExistingDepartments();

    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to update department.",
          duration: 4000
        })
      );
      setUpdateConfirmation(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelUpdate = () => {
    setUpdateConfirmation({
      isOpen: false,
      department: null,
      isLoading: false,
      otpMode: false,
      otp: "",
      title: "",
      message: "",
      confirmText: ""
    });
  };

  const togglePanelSelection = (pid) => {
    setSelectedPanels(prev => 
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  const toggleEditPanelSelection = (pid) => {
    setEditPopup(prev => ({
      ...prev,
      newSelectedPanels: prev.newSelectedPanels.includes(pid)
        ? prev.newSelectedPanels.filter(id => id !== pid)
        : [...prev.newSelectedPanels, pid]
    }));
  };

  const filteredDepartments = useMemo(() => {
    if (!existingDepartments) return [];
    return existingDepartments.filter(dept => {
      const matchesSearch = dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dept.panel_names && dept.panel_names.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;
      
      if (selectedCountryFilter === "") return true;
      if (selectedCountryFilter === "global") return dept.level === "global";
      
      return dept.level === "country" && (
        dept.country_ids?.includes(selectedCountryFilter) || 
        String(dept.country_id) === String(selectedCountryFilter)
      );
    });
  }, [existingDepartments, searchQuery, selectedCountryFilter]);

  // Pagination Logic
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCountryFilter]);

  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDepartments = filteredDepartments.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    getPanels();
    getCountries();
    getExistingDepartments();
  }, []);

  if (fetching) return <Loader text="Preparing department management module..." />;

  const isFormValid = departmentName.trim() && (level === 'global' || (selectedCountries && selectedCountries.length > 0)) && selectedPanels.length > 0;

  return (
    <div className="min-h-screen space-y-6 pb-12 text-sm lg:text-base">
      <PageHeader
        title="Departments"
        subtitle="Manage 2-level geographical departments and panel permissions across the enterprise."
        icon={FiBriefcase}
        stats={[
          { label: "Departments", value: existingDepartments.length.toString(), description: "System registry" },
          { label: "Global", value: existingDepartments.filter(d => d.level === 'global').length.toString(), description: "Universal departments" },
          { label: "Country Aware", value: existingDepartments.filter(d => d.level === 'country').length.toString(), description: "Geographical nodes" }
        ]}
      />

      <div className={`grid grid-cols-1 ${hasAddPermission ? 'xl:grid-cols-12' : ''} gap-6`}>
        {/* FORM SECTION */}
        {hasAddPermission && (
          <div className="xl:col-span-4">
            <div className="card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-full flex flex-col bg-surface border border-border rounded-3xl">
              <div className="p-8 border-b border-border bg-linear-120 from-primary/5 to-transparent flex items-center gap-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                  <FiPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-text-primary text-2xl uppercase tracking-tight leading-none mb-1.5">New Department</h2>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] leading-none opacity-60">Provision Scope</p>
                </div>
              </div>

              <div className="p-8 space-y-8 flex-1">
                {/* Department Name */}
                <div className="space-y-4">
                  <CustomInput
                    label="Department Name *"
                    placeholder="e.g. India Operations"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    className="w-full !rounded-xl"
                    leftIcon={<FiBriefcase className="text-primary/40" />}
                  />
                </div>

                 {/* Level selection locked to Country */}
                 <div className="space-y-4">
                   <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Geographical Scope</label>
                   <div className="px-3.5 py-2.5 bg-bg/50 border border-border/80 rounded-xl flex items-center gap-2">
                     <FiGlobe className="text-emerald-600 dark:text-emerald-400" size={14} />
                     <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                       Locked to Country Level (Only Super Admin is Global)
                     </span>
                   </div>
                 </div>

                {/* Multi Country dropdown */}
                {level === 'country' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 text-left block">Select Active Countries *</label>
                    <MultiSelectDropdownWithSearchInput
                      values={selectedCountries}
                      onChange={setSelectedCountries}
                      options={countries}
                      placeholder="Select countries..."
                    />
                  </motion.div>
                )}

                {/* Panel assignments */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 text-left block">Assign Panels *</label>
                  <MultiSelectDropdownWithSearchInput
                    values={selectedPanels}
                    onChange={setSelectedPanels}
                    options={panels.map(p => ({ value: p.id || p._id, text: p.name }))}
                    placeholder="Select panels..."
                  />
                </div>

                {/* Validation Status banner */}
                <div className={`rounded-2xl p-4 border transition-all duration-500 flex items-center gap-4 ${isFormValid ? "bg-success/5 border-success/30" : "bg-bg/30 border-border/50"}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-2xl transition-all duration-500 ${isFormValid ? "bg-success text-white scale-110" : "bg-border/30 text-text-muted"}`}>
                    {isFormValid ? <FiCheckCircle size={24} /> : <FiAlertCircle size={24} />}
                  </div>
                  <div>
                    <p className={`font-black text-[12px] uppercase tracking-widest leading-none mb-1.5 ${isFormValid ? "text-success" : "text-text-primary"}`}>
                      {isFormValid ? "Ready to Deploy" : "Details Pending"}
                    </p>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none opacity-60">
                      {isFormValid ? "All metrics validated" : "Please complete all fields"}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleCreateDepartment}
                  disabled={loading || !isFormValid}
                  className="w-full h-14 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] shadow-2xl bg-linear-120 from-primary to-primary-end flex items-center justify-center gap-3"
                  leftIcon={<FiPlus size={20} />}
                >
                  {loading ? "Creating..." : "Provision Scope"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* EXISTING LIST SECTION */}
        <div className={hasAddPermission ? "xl:col-span-8" : "xl:col-span-12"}>
          <div className="card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-full flex flex-col bg-surface border border-border rounded-3xl min-h-[500px]">
            <div className="p-6 border-b border-border bg-linear-120 from-primary/5 to-transparent flex flex-col lg:flex-row lg:flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                  <FiUsers size={20} />
                </div>
                <div>
                  <h3 className="font-black text-text-primary text-base tracking-tight leading-none mb-1 uppercase">Active Registry</h3>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-none">Organizational Scopes</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center gap-3 w-full lg:w-auto">
                <Dropdown
                  value={selectedCountryFilter}
                  onChange={setSelectedCountryFilter}
                  options={countryFilterOptions}
                  className="w-full sm:w-56"
                  placeholder="Filter by Country"
                />
                <div className="relative flex-1 w-full lg:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search departments..."
                    className="w-full bg-surface border-2 border-border rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-[13px] font-medium"
                  />
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs text-text-secondary border-b border-border bg-bg/10 uppercase tracking-wider">
                    <th className="py-4 px-6 font-black text-[10px]">Scope Node</th>
                    <th className="py-4 px-4 font-black text-[10px]">Geographical Level</th>
                    <th className="py-4 px-4 font-black text-[10px]">Assigned Panels</th>
                    <th className="py-4 px-6 font-black text-[10px] text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <AnimatePresence mode="popLayout">
                    {currentDepartments.map((dept) => (
                      <tr key={dept.id} className="border-b border-border/50 hover:bg-surface-hover/30 transition-all duration-300">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${dept.is_protected ? 'bg-indigo-600' : 'bg-primary'}`}>
                              {dept.is_protected ? <FiLock size={16} /> : <FiBriefcase size={16} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-text-primary text-[14px]">{dept.name}</span>
                                {dept.is_protected && (
                                  <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-md">
                                    System
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Corporate Department</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit border ${
                            dept.level === 'global'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            <FiGlobe size={11} />
                            {dept.level === 'global' ? 'Global' : `Country: ${dept.country_name || 'Active'}`}
                          </span>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                            {dept.panels?.map(p => (
                              <span key={p.id} className="px-2.5 py-1 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider rounded-md border border-primary/10">
                                {p.name}
                              </span>
                            )) || <span className="text-text-muted text-xs font-semibold">-</span>}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-right">
                          {!dept.is_protected ? (
                            <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="edit">
                              <IconButton
                                variant="ghost"
                                size="md"
                                onClick={() => handleEditDepartment(dept)}
                                className="hover:bg-primary/10 hover:text-primary rounded-xl"
                              >
                                <FiEdit size={16} />
                              </IconButton>
                            </RenderIfPermission>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 cursor-not-allowed mx-auto" title="System protected records are immutable.">
                              <FiLock size={14} />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {filteredDepartments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary border-2 border-dashed border-border rounded-xl m-6">
                  <FiBriefcase className="w-16 h-16 mb-4 text-text-muted/40" />
                  <p className="text-lg font-black uppercase tracking-wider">No nodes registered</p>
                  <p className="text-sm mt-1 font-medium">Verify your filter criteria or provision your first scope node.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-bg/10">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredDepartments.length}
                pageSize={itemsPerPage}
                className="!py-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation otp update */}
      <ConfirmationPopup
        isOpen={updateConfirmation.isOpen}
        title={updateConfirmation.title}
        message={updateConfirmation.message}
        mode={updateConfirmation.otpMode ? "otp" : "text"}
        onConfirm={confirmUpdateDepartment}
        onCancel={handleCancelUpdate}
        variant={updateConfirmation.variant || "warning"}
        isLoading={updateConfirmation.isLoading}
        confirmText={updateConfirmation.confirmText}
        cancelText={updateConfirmation.otpMode ? "Cancel" : "No, Keep"}
        otp={updateConfirmation.otp}
        onOtpChange={(otp) => setUpdateConfirmation(prev => ({ ...prev, otp }))}
      />

      {/* Custom Edit department config Popup */}
      <ConfirmationPopup
        isOpen={editPopup.isOpen}
        title="Update Scope Node Configuration"
        message="Refine organizational levels and scope definitions."
        mode="custom"
        variant="primary"
        onConfirm={handleEditSubmit}
        onCancel={() => setEditPopup(prev => ({ ...prev, isOpen: false }))}
        confirmText="Save Configuration"
        cancelText="Discard"
        customContent={
          <div className="space-y-6 pt-4 text-left">
            <CustomInput
              label="Department Name"
              value={editPopup.newName}
              onChange={(e) => setEditPopup(prev => ({ ...prev, newName: e.target.value }))}
              placeholder="Enter department name"
              className="w-full"
            />

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Geographical Scope</label>
              <div className="px-3.5 py-2.5 bg-bg/50 border border-border/80 rounded-xl flex items-center gap-2">
                <FiGlobe className="text-emerald-600 dark:text-emerald-400" size={14} />
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Locked to Country Level (Only Super Admin is Global)
                </span>
              </div>
            </div>

            {editPopup.newLevel === 'country' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 text-left block">Select Active Countries *</label>
                <MultiSelectDropdownWithSearchInput
                  values={editPopup.newSelectedCountries}
                  onChange={(val) => setEditPopup(prev => ({ ...prev, newSelectedCountries: val }))}
                  options={countries}
                  placeholder="Select countries..."
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 text-left block">Assign Panels *</label>
              <MultiSelectDropdownWithSearchInput
                values={editPopup.newSelectedPanels}
                onChange={(val) => setEditPopup(prev => ({ ...prev, newSelectedPanels: val }))}
                options={panels.map(p => ({ value: p.id || p._id, text: p.name }))}
                placeholder="Select panels..."
              />
            </div>
          </div>
        }
      />
    </div>
  );
}