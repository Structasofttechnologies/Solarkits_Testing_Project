import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import CustomInput from "@/components/CustomInput";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import ToggleButton from "@/components/ToggleButton";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import CustomTable from "@/components/CustomTable";
import Pagination from "@/components/Pagination";
import PageHeader from "@/components/PageHeader";
import { setAlert } from "@/features/alert.slice";
import {
  FiLayout,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiEdit,
  FiSave,
  FiGlobe,
  FiGrid,
  FiActivity,
} from "react-icons/fi";
import SseListener from "./SseListener";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";

export default function UserPanels({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const API = import.meta.env.VITE_API_URL;
  const hasAddPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "add" });

  const [panels, setPanels] = useState([]);
  const [panelName, setPanelName] = useState("");
  const [urlPrefix, setUrlPrefix] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saasProducts, setSaasProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [editPopup, setEditPopup] = useState({
    isOpen: false,
    panel: null,
    newName: "",
    newUrlPrefix: "",
    newIsActive: true,
    newSelectedProducts: []
  });

  const [updateConfirmation, setUpdateConfirmation] = useState({
    isOpen: false,
    panel: null,
    newName: "",
    newUrlPrefix: "",
    newIsActive: true,
    newSelectedProducts: [],
    isLoading: false,
    otpMode: false,
    otp: "",
    title: "",
    message: "",
    confirmText: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const itemsPerPageOptions = [
    { text: "10 Units", value: 10 },
    { text: "20 Units", value: 20 },
    { text: "50 Units", value: 50 },
  ];

  const getPanels = async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API}/panels/?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      setPanels(res.data.data || []);
    } catch (error) {
      console.log(error);
      dispatch(setAlert({ type: "error", message: "Failed to load panels.", duration: 4000 }));
    } finally {
      setFetching(false);
    }
  };

  const getSaasProducts = async () => {
    try {
      const res = await axios.get(`${API}/dashboard/types?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      const filtered = (res.data.data || []).filter(
        dt => dt.name?.toLowerCase() !== 'main' && dt.name?.toLowerCase() !== 'default'
      );
      setSaasProducts(filtered);
    } catch (error) {
      console.error("Failed to load saas products:", error);
    }
  };

  useEffect(() => {
    getPanels();
    getSaasProducts();
  }, []);

  const handleCreatePanel = async () => {
    if (!panelName.trim()) return dispatch(setAlert({ type: "warning", message: "Please enter a panel name." }));
    if (!urlPrefix.trim()) return dispatch(setAlert({ type: "warning", message: "Please enter a URL prefix." }));

    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/panels/?unique_id=${moduleUniqueId}&req_for=add`,
        {
          name: panelName.trim(),
          url_prefix: urlPrefix.trim(),
          is_active: isActive,
          saas_product_ids: selectedProducts
        },
        { headers: authHeaderObj() }
      );

      dispatch(setAlert({ type: "success", message: res.data.message || "Panel created successfully!", duration: 3000 }));
      setPanelName(""); setUrlPrefix(""); setIsActive(true); setSelectedProducts([]);
      getPanels();
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to create panel.", duration: 4000 }));
    } finally {
      setLoading(false);
    }
  };

  const handleEditPanel = (panel) => {
    setEditPopup({
      isOpen: true,
      panel: panel,
      newName: panel.name,
      newUrlPrefix: panel.url_prefix,
      newIsActive: panel.is_active,
      newSelectedProducts: (panel.products || []).map(p => {
        if (!p) return "";
        if (typeof p === 'object') {
          return (p.id || p._id || "").toString();
        }
        return p.toString();
      }).filter(Boolean)
    });
  };

  const handleEditSubmit = () => {
    if (!editPopup.newName.trim()) return dispatch(setAlert({ type: "warning", message: "Please enter a panel name." }));
    if (!editPopup.newUrlPrefix.trim()) return dispatch(setAlert({ type: "warning", message: "Please enter a URL prefix." }));

    setEditPopup(prev => ({ ...prev, isOpen: false }));

    setUpdateConfirmation({
      isOpen: true,
      panel: editPopup.panel,
      newName: editPopup.newName.trim(),
      newUrlPrefix: editPopup.newUrlPrefix.trim(),
      newIsActive: editPopup.newIsActive,
      newSelectedProducts: editPopup.newSelectedProducts,
      isLoading: false, otpMode: false, otp: "",
      title: `Update Panel "${editPopup.panel.name}"`,
      message: "Confirm panel updates via OTP verification.",
      confirmText: "Yes, Update",
      variant: "warning"
    });
  };

  const confirmUpdatePanel = async (otp = "") => {
    if (!updateConfirmation.panel) return;
    setUpdateConfirmation(prev => ({ ...prev, isLoading: true }));

    try {
      if (!updateConfirmation.otpMode) {
        await axios.get(`${API}/panels/update-otp/${updateConfirmation.panel.id}?unique_id=${moduleUniqueId}&req_for=edit`, { headers: authHeaderObj() });
        dispatch(setAlert({ type: "success", message: "OTP sent to your email.", duration: 3000 }));
        setUpdateConfirmation(prev => ({ ...prev, otpMode: true, isLoading: false, message: "Enter OTP to confirm.", confirmText: "Confirm & Update" }));
        return;
      }

      const res = await axios.put(
        `${API}/panels/${updateConfirmation.panel.id}?unique_id=${moduleUniqueId}&req_for=edit`,
        {
          name: updateConfirmation.newName,
          url_prefix: updateConfirmation.newUrlPrefix,
          is_active: updateConfirmation.newIsActive,
          saas_product_ids: updateConfirmation.newSelectedProducts,
          otp
        },
        { headers: authHeaderObj() }
      );

      dispatch(setAlert({ type: "success", message: res.data.message || "Panel updated!", duration: 3000 }));
      handleCancelUpdate();
      getPanels();
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Update failed.", duration: 4000 }));
      setUpdateConfirmation(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelUpdate = () => {
    setUpdateConfirmation({ isOpen: false, panel: null, isLoading: false, otpMode: false, otp: "", title: "", message: "", confirmText: "" });
  };

  const filteredPanels = panels.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.url_prefix.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPanels.length / itemsPerPage);
  const currentPanels = filteredPanels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (p) => setCurrentPage(p);
  const handleItemsPerPageChange = (v) => { setItemsPerPage(Number(v)); setCurrentPage(1); };

  const headers = [
    { key: 'name', label: 'Identity' },
    { key: 'url_prefix', label: 'Gateway' },
    { key: 'is_active', label: 'Status' },
    { key: 'actions', label: 'Ops' }
  ];

  if (fetching) return <Loader text="Loading user panels..." />;

  const isFormValid = panelName.trim() && urlPrefix.trim();

  return (
    <div className="space-y-6 pb-12">
      <SseListener />

      <PageHeader
        title="User Panels"
        subtitle="Manage access endpoints and application panel configurations."
        icon={FiLayout}
        stats={[
          { label: "Total Panels", value: panels.length.toString(), description: "System gateways" },
          { label: "Active", value: panels.filter(p => p.is_active).length.toString(), description: "Live endpoints" }
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {hasAddPermission && (
          <div className="xl:col-span-4">
            <div className="bg-surface rounded-3xl shadow-2xl border border-border overflow-hidden">
              <div className="p-8 border-b border-border bg-linear-120 from-primary/5 to-transparent flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/20 translate-y-12 group-hover:translate-y-0 transition-transform duration-500" />
                  <FiPlus size={28} className="relative z-10" />
                </div>
                <div>
                  <h2 className="font-black text-text-primary text-2xl uppercase tracking-tight leading-none mb-1.5">New Panel</h2>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] leading-none opacity-60">Provision Gateway</p>
                </div>
              </div>
              
              <div className="p-8 space-y-6 text-left">
                {/* Identity Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-inner">
                      <FiEdit size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-text-primary text-sm uppercase tracking-widest leading-none mb-1">Identity</h3>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none">Internal Naming</p>
                    </div>
                  </div>
                  <CustomInput
                    label="Panel Name *"
                    placeholder="e.g. Enterprise Admin"
                    value={panelName}
                    onChange={(e) => setPanelName(e.target.value)}
                    className="!bg-bg/40 focus:!bg-surface !border-border/60 focus:!border-primary/50 !h-12 !text-[13px] !rounded-xl"
                  />
                </div>

                {/* Connectivity Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-inner">
                      <FiGlobe size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-text-primary text-sm uppercase tracking-widest leading-none mb-1">Connectivity</h3>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none">Access Gateway</p>
                    </div>
                  </div>
                  <CustomInput
                    label="URL Prefix *"
                    placeholder="e.g. enterprise-admin"
                    value={urlPrefix}
                    onChange={(e) => setUrlPrefix(e.target.value)}
                    className="!bg-bg/40 focus:!bg-surface !border-border/60 focus:!border-primary/50 !h-12 !text-[13px] !rounded-xl"
                    leftIcon={<FiGlobe className="text-primary/40" />}
                  />
                </div>

                {/* SaaS Products Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shadow-inner">
                      <FiGrid size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-text-primary text-sm uppercase tracking-widest leading-none mb-1">SaaS Products</h3>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none">Allowed Services</p>
                    </div>
                  </div>
                  <MultiSelectDropdownWithSearchInput
                    values={selectedProducts}
                    onChange={setSelectedProducts}
                    options={saasProducts.map(sp => ({ value: (sp.id || sp._id).toString(), text: sp.name }))}
                    placeholder="Select SaaS Products..."
                  />
                </div>

                {/* Status Toggle */}
                <div className="p-5 rounded-2xl bg-bg/30 border border-border/50 hover:border-primary/30 transition-colors group/toggle">
                  <ToggleButton
                    label="Immediate Deployment"
                    checked={isActive}
                    onChange={setIsActive}
                    description="Set panel to active upon creation"
                    className="!p-0"
                  />
                </div>

                {/* Validation Indicator */}
                <motion.div
                  initial={false}
                  animate={isFormValid ? { scale: [1, 1.02, 1], y: 0 } : { y: 0 }}
                  className={`p-4 rounded-2xl border transition-all duration-500 flex items-center gap-4 ${isFormValid ? "bg-success/5 border-success/30 shadow-lg shadow-success/5" : "bg-bg/20 border-border/50"}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-2xl transition-all duration-500 ${isFormValid ? "bg-success text-white scale-110" : "bg-border/30 text-text-muted"}`}>
                    {isFormValid ? <FiCheckCircle size={24} /> : <FiAlertCircle size={24} />}
                  </div>
                  <div>
                    <p className={`font-black text-[14px] uppercase tracking-widest leading-none mb-1.5 ${isFormValid ? "text-success" : "text-text-primary"}`}>
                      {isFormValid ? "Ready to Deploy" : "Details Required"}
                    </p>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none opacity-60">
                      {isFormValid ? "All protocols validated" : "Completion pending"}
                    </p>
                  </div>
                </motion.div>

                <Button
                  onClick={handleCreatePanel}
                  disabled={loading || !isFormValid}
                  className={`w-full h-14 rounded-2xl text-[13px] font-black shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] ${isFormValid ? "shadow-primary/20 hover:shadow-primary/40" : ""}`}
                  leftIcon={<FiSave size={20} />}
                >
                  {loading ? "Processing..." : "Provision Panel"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className={hasAddPermission ? "xl:col-span-8" : "xl:col-span-12"}>
          <div className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-border bg-linear-120 from-primary/5 to-transparent flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                  <FiGrid size={20} />
                </div>
                <div>
                  <h3 className="font-black text-text-primary text-base tracking-tight leading-none mb-1 uppercase">Existing Panels</h3>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-none">Gateways</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search panels..."
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-[13px] font-medium"
                  />
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary rounded-lg text-[10px] font-black border border-primary/10 uppercase tracking-widest">
                  <FiActivity size={12} />
                  {filteredPanels.length} Units
                </div>
              </div>
            </div>

            <div className="flex-1">
              <CustomTable
                headers={headers}
                data={currentPanels}
                loading={fetching}
                emptyMessage="No Panels Found. Provision your first panel to begin architecture."
                containerClassName="!border-0 !shadow-none !rounded-none"
                renderRow={(panel) => (
                  <>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-4 group/item">
                        <div className="min-w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all duration-300 shadow-inner">
                          <FiLayout size={18} />
                        </div>
                        <div>
                          <p className="font-black text-text-primary text-[14px] tracking-tight group-hover/item:text-primary transition-colors">
                            {panel.name}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {panel.products && panel.products.length > 0 ? (
                              panel.products.map(p => (
                                <span key={p.id} className="text-[9px] font-black text-purple-400 px-2 py-0.5 rounded border border-purple-300 uppercase tracking-widest leading-none">
                                  {p.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] font-black text-text-muted bg-bg/50 px-2 py-0.5 rounded border border-border uppercase tracking-widest leading-none">
                                No SaaS Products Assigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="min-w-8 h-8 rounded-lg bg-bg flex items-center justify-center text-primary border border-border group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                          <FiGlobe size={14} />
                        </div>
                        <code className="px-2.5 py-1 bg-surface rounded-lg text-[11px] font-bold border border-border shadow-inner text-text-secondary">
                          {panel.url_prefix}
                        </code>
                      </div>
                    </td>
                    <td className="py-5 px-4 flex items-center justify-start">
                      <div>
                        <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit mx-auto transition-all ${panel.is_active
                            ? "bg-success/10 text-success border border-success/20"
                            : "bg-danger/10 text-danger border border-danger/20"
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${panel.is_active ? "bg-success animate-pulse" : "bg-danger"}`} />
                          {panel.is_active ? "Active" : "Inactive"}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <RenderIfPermission requiredUniqueId={moduleUniqueId} permission="edit">
                        <IconButton
                          variant="ghost"
                          size="md"
                          onClick={() => handleEditPanel(panel)}
                          className="hover:bg-primary/10 hover:text-primary rounded-xl"
                        >
                          <FiEdit size={16} />
                        </IconButton>
                      </RenderIfPermission>
                    </td>
                  </>
                )}
              />
            </div>

            {/* Pagination & Footer */}
            {filteredPanels.length > 0 && (
              <div className="px-6 py-4 border-t border-border bg-bg/10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <div className="w-32">
                      <DropdownWithSearchInput
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        options={itemsPerPageOptions}
                        className="!h-10 !rounded-xl !text-[11px] shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex justify-end">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={filteredPanels.length}
                    pageSize={itemsPerPage}
                    className="!py-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popups */}
      <ConfirmationPopup
        isOpen={updateConfirmation.isOpen}
        title={updateConfirmation.title}
        message={updateConfirmation.message}
        mode={updateConfirmation.otpMode ? "otp" : "text"}
        onConfirm={confirmUpdatePanel}
        onCancel={handleCancelUpdate}
        variant={updateConfirmation.variant || "warning"}
        isLoading={updateConfirmation.isLoading}
        confirmText={updateConfirmation.confirmText}
        cancelText={updateConfirmation.otpMode ? "Cancel" : "No, Keep"}
        otp={updateConfirmation.otp}
        onOtpChange={(otp) => setUpdateConfirmation(prev => ({ ...prev, otp }))}
      />

      <ConfirmationPopup
        isOpen={editPopup.isOpen}
        title="Edit Panel"
        message="Refine your panel configuration."
        mode="custom"
        variant="primary"
        onConfirm={handleEditSubmit}
        onCancel={() => setEditPopup(prev => ({ ...prev, isOpen: false }))}
        confirmText="Update Configuration"
        cancelText="Discard"
        customContent={
          <div className="space-y-6 pt-4 text-left">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                  <FiEdit size={20} />
                </div>
                <div>
                  <h3 className="font-black text-text-primary text-base tracking-tight leading-none mb-1 uppercase">Information</h3>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-none">Edit Identity</p>
                </div>
              </div>
              <CustomInput
                label="Panel Name"
                value={editPopup.newName}
                onChange={(e) => setEditPopup(prev => ({ ...prev, newName: e.target.value }))}
                placeholder="Enter panel name"
                className="!bg-bg/50 focus:!bg-white"
              />
              <CustomInput
                label="URL Prefix"
                value={editPopup.newUrlPrefix}
                onChange={(e) => setEditPopup(prev => ({ ...prev, newUrlPrefix: e.target.value }))}
                placeholder="Enter URL prefix"
                className="!bg-bg/50 focus:!bg-white"
                leftIcon={<FiGlobe className="text-text-muted" />}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  <FiGrid size={20} />
                </div>
                <div>
                  <h3 className="font-black text-text-primary text-base tracking-tight leading-none mb-1 uppercase">SaaS Products</h3>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-none">Allowed Services</p>
                </div>
              </div>
              <MultiSelectDropdownWithSearchInput
                values={editPopup.newSelectedProducts}
                onChange={(val) => setEditPopup(prev => ({ ...prev, newSelectedProducts: val }))}
                options={saasProducts.map(sp => ({ value: (sp.id || sp._id).toString(), text: sp.name }))}
                placeholder="Select SaaS Products..."
              />
            </div>

            <div className="p-4 bg-bg/50 rounded-2xl border border-border/50">
              <ToggleButton
                label="Active Status"
                checked={editPopup.newIsActive}
                onChange={(val) => setEditPopup(prev => ({ ...prev, newIsActive: val }))}
                description="Panel availability"
              />
            </div>
          </div>
        }
      />
    </div>
  );
}