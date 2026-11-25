import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import CustomInput from "@/components/CustomInput";
import Loader from "@/components/Loader";
import IconButton from "@/components/IconButton";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import ToggleButton from "@/components/ToggleButton";
import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import { setAlert } from "@/features/alert.slice";
import {
  FiBox,
  FiPlus,
  FiCheckCircle,
  FiEdit,
  FiGrid,
  FiCopy,
  FiLayers,
  FiSettings,
  FiFilter,
  FiLayout,
  FiChevronDown,
  FiChevronRight,
  FiTrash,
  FiGlobe
} from "react-icons/fi";
import { useHasPermission } from "@/components/PermissionCheck";
import PageHeader from "@/components/PageHeader";

// --- Tree Node Component ---
const HierarchyNode = ({ item, type, depth = 0, pId, lId, dtId, actions }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Panels and Levels expanded by default
  const hasChildren = (item.levels?.length || item.architectures?.length || item.modules?.length || item.children?.length) > 0;

  const {
    hasAddPermission,
    hasEditPermission,
    hasDeletePermission,
    triggerAddModule,
    handleEditModule,
    handleDeleteRequest,
    handleCopyUniqueId,
    copiedId
  } = actions;

  const icons = {
    panel: <FiLayout size={16} />,
    level: <FiLayers size={14} />,
    architecture: <FiSettings size={14} />,
    module: <FiBox size={14} />
  };

  const colors = {
    panel: "text-primary bg-primary/10 border-primary/20",
    level: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    architecture: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    module: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  };

  return (
    <div className="space-y-2">
      <div
        className={`group relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${isExpanded && hasChildren ? 'bg-surface border-border shadow-sm shadow-primary/5' : 'bg-transparent border-transparent hover:bg-surface-hover/40'}`}
        style={{ marginLeft: `${depth * 28}px` }}
      >
        {/* Connector Line */}
        {depth > 0 && (
          <div className="absolute left-[-18px] top-1/2 -translate-y-1/2 w-4 h-px bg-border group-hover:bg-primary/40 transition-colors" />
        )}

        {/* Toggle */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-sm ${isExpanded ? 'bg-primary text-white scale-105 shadow-primary/20' : 'bg-surface border border-border text-text-muted hover:text-primary hover:border-primary/30'}`}
          >
            {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
          </button>
        ) : (
          <div className="w-7 h-7 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
          </div>
        )}

        {/* Type Icon */}
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-inner ${colors[type]}`}>
          {icons[type]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-text-primary text-sm capitalize tracking-tight leading-none group-hover:text-primary transition-colors">
              {item.name}
            </h4>
            {type === 'module' && (
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20 uppercase tracking-widest leading-none shadow-inner">
                  {item.unique_id}
                </code>
                <IconButton
                  variant="ghost"
                  size="sm"
                  className="opacity-60 hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleCopyUniqueId(item.unique_id)}
                >
                  {copiedId === item.unique_id ? <FiCheckCircle size={14} className="text-success" /> : <FiCopy size={14} />}
                </IconButton>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] font-black text-text-muted capitalize tracking-[0.2em] leading-none px-1.5 py-0.5 rounded bg-bg border border-border">
              {type}
            </span>
            {type === 'module' && (
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] leading-none px-1.5 py-0.5 rounded border ${item.dashboard_context === 'product' ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-text-secondary bg-bg border-border'}`}>
                {item.dashboard_context === 'product' ? 'SaaS Product' : 'Default Context'}
              </span>
            )}
            {item.is_active === false && (
              <span className="text-[8px] font-black text-danger uppercase tracking-[0.2em] leading-none bg-danger/5 px-1.5 py-0.5 rounded border border-danger/20">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Ops */}
        <div className="flex items-center gap-1 opacity-100 transition-all">
          {type === 'architecture' && hasAddPermission && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => triggerAddModule(item.panelId, item.levelId, item.id || item._id)}
              className="bg-primary/10 text-primary border border-primary/20 shadow-sm"
              title="Add Root Module"
            >
              <FiPlus size={14} />
            </IconButton>
          )}

          {type === 'module' && (
            <>
              {hasAddPermission && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerAddModule(item.panel_id?._id || item.panel_id, item.level_id?._id || item.level_id, item.dashboard_type_id?._id || item.dashboard_type_id, item.id || item._id)}
                  className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm"
                  title="Add Sub-module"
                >
                  <FiPlus size={14} />
                </IconButton>
              )}
              {hasEditPermission && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditModule(item)}
                  className="bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm"
                  title="Edit Module"
                >
                  <FiEdit size={14} />
                </IconButton>
              )}
              {hasDeletePermission && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteRequest(item)}
                  className="bg-danger/10 text-danger border border-danger/20 shadow-sm"
                  title="Delete Module"
                >
                  <FiTrash size={14} />
                </IconButton>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden relative"
          >
            {/* Vertical Path Line */}
            <div
              className="absolute left-[31px] top-0 bottom-4 w-px bg-linear-to-b from-border/60 via-border/40 to-transparent"
              style={{ left: `${depth * 28 + 13.5}px` }}
            />

            <div className="space-y-2 py-1">
              {item.levels?.map(l => <HierarchyNode key={l.id || l._id} item={l} type="level" depth={depth + 1} actions={actions} />)}
              {item.architectures?.map(dt => <HierarchyNode key={dt.id || dt._id} item={dt} type="architecture" depth={depth + 1} actions={actions} />)}
              {item.modules?.map(m => <HierarchyNode key={m.id || m._id} item={m} type="module" depth={depth + 1} actions={actions} />)}
              {item.children?.map(m => <HierarchyNode key={m.id || m._id} item={m} type="module" depth={depth + 1} actions={actions} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Modules({ moduleUniqueId, presetPanelPrefix }) {
  const dispatch = useDispatch();
  const API = import.meta.env.VITE_API_URL;
  const hasAddPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "add" });
  const hasEditPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "edit" });
  const hasDeletePermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "delete" });

  const [modules, setModules] = useState([]);
  const [panels, setPanels] = useState([]);
  const [levels, setLevels] = useState([]);
  const [dashboardTypes, setDashboardTypes] = useState([]);

  const [fetching, setFetching] = useState(true);

  const [filterPanel, setFilterPanel] = useState(null);
  const [filterLevel, setFilterLevel] = useState(null);

  const [copiedId, setCopiedId] = useState(null);

  const [addPopup, setAddPopup] = useState({
    isOpen: false,
    name: "",
    panelId: "",
    levelId: "",
    dashboardContext: "default", // 'default' | 'product'
    saasProductId: "",
    parentModuleId: "",
    uniqueCode: "",
    isLoading: false
  });

  const [editPopup, setEditPopup] = useState({
    isOpen: false,
    module: null,
    newName: "",
    newPanelId: "",
    newLevelId: "",
    newDashboardContext: "default",
    newSaasProductId: "",
    newParentModuleId: "",
    newUniqueCode: "",
    newIsActive: true
  });

  const [updateConfirmation, setUpdateConfirmation] = useState({
    isOpen: false,
    module: null,
    newName: "",
    newPanelId: "",
    newLevelId: "",
    newDashboardContext: "default",
    newSaasProductId: "",
    newParentModuleId: "",
    newUniqueCode: "",
    newIsActive: true,
    isLoading: false,
    otpMode: false,
    otp: "",
    title: "",
    message: "",
    confirmText: ""
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    module: null,
    isLoading: false,
    otpMode: false,
    otp: "",
    message: "",
    confirmText: ""
  });

  const fetchModules = useCallback(async () => {
    if (moduleUniqueId !== 'DEV_WH_MODULES' && (!filterPanel || !filterLevel)) {
      setModules([]);
      return;
    }
    try {
      const panelParam = filterPanel ? `panel_id=${filterPanel}&` : '';
      const levelParam = filterLevel ? `level_id=${filterLevel}&` : '';
      const res = await axios.get(`${API}/modules/?${panelParam}${levelParam}unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() });
      setModules(res.data.data || []);
    } catch (error) {
      console.log(error);
    }
  }, [filterPanel, filterLevel, moduleUniqueId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const fetchData = async () => {
    try {
      setFetching(true);
      const [panelsRes, levelsRes, dashboardTypesRes] = await Promise.all([
        axios.get(`${API}/panels/?unique_id=DEV_PANELS&req_for=view`, { headers: authHeaderObj() }),
        axios.get(`${API}/modules/levels/?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() }),
        axios.get(`${API}/dashboard/types?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() })
      ]);

      const loadedPanels = panelsRes.data.data || [];
      setPanels(loadedPanels);
      setLevels(levelsRes.data.data || []);
      setDashboardTypes(dashboardTypesRes.data.data || []);

      if (presetPanelPrefix) {
        const foundPanel = loadedPanels.find(p => p.url_prefix === presetPanelPrefix);
        if (foundPanel) {
          setFilterPanel((foundPanel.id || foundPanel._id).toString());
        }
      }
    } catch (error) {
      console.log(error);
      dispatch(setAlert({ type: "error", message: "Failed to load data.", duration: 4000 }));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (presetPanelPrefix && levels.length > 0) {
      const globalLvl = levels.find(l => l.name?.toLowerCase() === 'global');
      if (globalLvl) {
        setFilterLevel((globalLvl.id || globalLvl._id).toString());
      } else {
        setFilterLevel((levels[0].id || levels[0]._id).toString());
      }
    }
  }, [levels, presetPanelPrefix]);

  const selectedEditParent = modules.find(m => (m.id || m._id)?.toString() === editPopup.newParentModuleId?.toString());
  const isEditParentInactive = selectedEditParent && !selectedEditParent.is_active;

  useEffect(() => {
    if (isEditParentInactive) {
      setEditPopup(prev => ({ ...prev, newIsActive: false }));
    }
  }, [isEditParentInactive]);

  const generateSuggestedCode = (nameText, panelIdVal) => {
    if (!nameText) return "";
    const selPanel = panels.find(p => (p.id || p._id)?.toString() === panelIdVal?.toString());
    let prefix = "MOD_";
    if (selPanel && selPanel.name) {
      // Get the first word of the panel name and remove non-letters
      const firstWord = selPanel.name.trim().split(/\s+/)[0];
      const cleanWord = firstWord.replace(/[^A-Za-z]/g, "");
      if (cleanWord.length >= 3) {
        prefix = cleanWord.substring(0, 3).toUpperCase() + "_";
      } else if (cleanWord.length > 0) {
        prefix = cleanWord.toUpperCase() + "_";
      }
    }
    const cleanName = nameText
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
      .replace(/_+/g, "_");
    return prefix + cleanName;
  };

  const handleCopyUniqueId = (id) => {
    try {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      dispatch(setAlert({ type: "success", message: "ID Copied!" }));
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      dispatch(setAlert({ type: "error", message: "Copy failed" }));
    }
  };

  const handleEditModule = (module) => {
    const isProduct = module.dashboard_context === 'product';
    setEditPopup({
      isOpen: true,
      module: module,
      newName: module.name,
      newPanelId: (module.panel_id?._id || module.panel_id)?.toString(),
      newLevelId: (module.level_id?._id || module.level_id)?.toString(),
      newDashboardContext: module.dashboard_context || 'default',
      newSaasProductId: isProduct ? (module.saas_product_id?._id || module.saas_product_id || module.dashboard_type_id?._id || module.dashboard_type_id)?.toString() : "",
      newParentModuleId: (module.parent_module_id?._id || module.parent_module_id || "")?.toString(),
      newUniqueCode: module.unique_id || "",
      newIsActive: module.is_active
    });
  };

  const triggerAddModule = (pId, lId, dtId, parentId = "") => {
    // Determine context based on dtId
    const foundDt = dashboardTypes.find(dt => (dt.id || dt._id)?.toString() === dtId?.toString());
    const isProductContext = foundDt && foundDt.name?.toLowerCase() !== 'main' && foundDt.name?.toLowerCase() !== 'default';

    setAddPopup({
      isOpen: true,
      name: "",
      panelId: pId,
      levelId: lId,
      dashboardContext: isProductContext ? "product" : "default",
      saasProductId: isProductContext ? dtId : "",
      parentModuleId: parentId,
      uniqueCode: "",
      isLoading: false
    });
  };

  const handleCreateModule = async () => {
    if (!addPopup.name.trim()) return dispatch(setAlert({ type: "warning", message: "Enter module name." }));

    if (moduleUniqueId !== 'DEV_WH_MODULES') {
      if (!addPopup.uniqueCode || !addPopup.uniqueCode.trim()) {
        return dispatch(setAlert({ type: "warning", message: "Enter unique code identifier." }));
      }
    }

    if (addPopup.dashboardContext === 'product' && !addPopup.saasProductId) {
      return dispatch(setAlert({ type: "warning", message: "Please specify a SaaS Product for product context." }));
    }

    setAddPopup(prev => ({ ...prev, isLoading: true }));
    try {
      const payload = {
        name: addPopup.name.trim(),
        panel_id: addPopup.panelId,
        level_id: addPopup.levelId,
        dashboard_context: addPopup.dashboardContext,
        saas_product_id: addPopup.dashboardContext === 'product' ? addPopup.saasProductId : null,
        parent_module_id: addPopup.parentModuleId || null,
        is_active: true
      };

      if (moduleUniqueId !== 'DEV_WH_MODULES') {
        payload.unique_code = addPopup.uniqueCode.trim().toUpperCase();
      }

      const res = await axios.post(
        `${API}/modules?unique_id=${moduleUniqueId}&req_for=add`,
        payload,
        { headers: authHeaderObj() }
      );

      dispatch(setAlert({ type: "success", message: res.data.message || "Module created!", duration: 3000 }));
      setAddPopup({ isOpen: false, name: "", panelId: "", levelId: "", dashboardContext: "default", saasProductId: "", parentModuleId: "", uniqueCode: "", isLoading: false });
      fetchModules();
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Creation failed.", duration: 4000 }));
      setAddPopup(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteRequest = (module) => {
    setDeleteConfirmation({
      isOpen: true,
      module: module,
      isLoading: false,
      otpMode: false,
      otp: ""
    });
  };

  const confirmDeleteModule = async (otp = "") => {
    if (!deleteConfirmation.module) return;
    setDeleteConfirmation(prev => ({ ...prev, isLoading: true }));

    try {
      if (!deleteConfirmation.otpMode) {
        await axios.get(`${API}/modules/delete-otp/${deleteConfirmation.module._id || deleteConfirmation.module.id}?unique_id=${moduleUniqueId}&req_for=delete`, { headers: authHeaderObj() });
        setDeleteConfirmation(prev => ({
          ...prev,
          otpMode: true,
          isLoading: false,
          message: "A security OTP has been sent to your email. Enter it to confirm full deletion.",
          confirmText: "Verify & Delete Permanently"
        }));
        return;
      }

      const res = await axios.delete(
        `${API}/modules/${deleteConfirmation.module._id || deleteConfirmation.module.id}?unique_id=${moduleUniqueId}&req_for=delete`,
        {
          data: { otp },
          headers: authHeaderObj()
        }
      );
      dispatch(setAlert({ type: "success", message: res.data.message || "Module deleted!", duration: 3000 }));
      setDeleteConfirmation({ isOpen: false, module: null, isLoading: false, otpMode: false, otp: "" });
      fetchModules();
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Deletion failed.", duration: 4000 }));
      setDeleteConfirmation(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleEditSubmit = () => {
    if (!editPopup.newName.trim()) return dispatch(setAlert({ type: "warning", message: "Enter name." }));

    if (moduleUniqueId !== 'DEV_WH_MODULES') {
      if (!editPopup.newUniqueCode || !editPopup.newUniqueCode.trim()) {
        return dispatch(setAlert({ type: "warning", message: "Enter unique code identifier." }));
      }
    }

    setEditPopup(prev => ({ ...prev, isOpen: false }));
    setUpdateConfirmation({
      isOpen: true,
      module: editPopup.module,
      newName: editPopup.newName.trim(),
      newPanelId: editPopup.newPanelId,
      newLevelId: editPopup.newLevelId,
      newDashboardContext: editPopup.newDashboardContext,
      newSaasProductId: editPopup.newSaasProductId,
      newParentModuleId: editPopup.newParentModuleId,
      newUniqueCode: editPopup.newUniqueCode.trim().toUpperCase(),
      newIsActive: editPopup.newIsActive,
      isLoading: false, otpMode: false, otp: "",
      title: `Update Module "${editPopup.module.name}"`,
      message: "Confirm updates via OTP verification.",
      confirmText: "Yes, Update",
      variant: "warning"
    });
  };

  const confirmUpdateModule = async (otp = "") => {
    setUpdateConfirmation(prev => ({ ...prev, isLoading: true }));
    try {
      if (!updateConfirmation.otpMode) {
        await axios.get(`${API}/modules/update-otp/${updateConfirmation.module._id || updateConfirmation.module.id}?unique_id=${moduleUniqueId}&req_for=edit`, { headers: authHeaderObj() });
        setUpdateConfirmation(prev => ({ ...prev, otpMode: true, isLoading: false, message: "Enter OTP to confirm.", confirmText: "Confirm & Update" }));
        return;
      }

      const payload = {
        name: updateConfirmation.newName,
        panel_id: updateConfirmation.newPanelId,
        level_id: updateConfirmation.newLevelId,
        dashboard_context: updateConfirmation.newDashboardContext,
        saas_product_id: updateConfirmation.newDashboardContext === 'product' ? updateConfirmation.newSaasProductId : null,
        parent_module_id: updateConfirmation.newParentModuleId || null,
        is_active: updateConfirmation.newIsActive,
        otp
      };

      if (moduleUniqueId !== 'DEV_WH_MODULES') {
        payload.unique_code = updateConfirmation.newUniqueCode.trim().toUpperCase();
      }

      const res = await axios.put(
        `${API}/modules/${updateConfirmation.module._id || updateConfirmation.module.id}?unique_id=${moduleUniqueId}&req_for=edit`,
        payload,
        { headers: authHeaderObj() }
      );

      dispatch(setAlert({ type: "success", message: res.data.message || "Updated!", duration: 3000 }));
      handleCancelUpdate();
      fetchModules();
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Update failed.", duration: 4000 }));
      setUpdateConfirmation(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelUpdate = () => {
    setUpdateConfirmation({ isOpen: false, module: null, isLoading: false, otpMode: false, otp: "", title: "", message: "", confirmText: "" });
  };

  const parentOptions = useMemo(() => {
    if (!editPopup.module) return [{ value: "", text: "None (Root Module)" }];

    const selfId = (editPopup.module?._id || editPopup.module?.id)?.toString();

    // Find all descendants recursively
    const descendants = [];
    const findChildren = (parentId) => {
      modules.forEach(m => {
        const parentModuleId = (m.parent_module_id?._id || m.parent_module_id)?.toString();
        if (parentModuleId === parentId) {
          const childId = (m._id || m.id || m.id).toString();
          descendants.push(childId);
          findChildren(childId);
        }
      });
    };
    findChildren(selfId);

    return [
      { value: "", text: "None (Root Module)" },
      ...modules
        .filter(m => {
          const mId = (m.id || m._id)?.toString();
          // 1. Exclude self
          if (mId === selfId) return false;
          // 2. Exclude descendants (no childs of self)
          if (descendants.includes(mId)) return false;
          // 3. Match dashboard context
          if (m.dashboard_context !== editPopup.newDashboardContext) return false;
          // 4. Match SaaS product if context is product
          if (editPopup.newDashboardContext === 'product') {
            const mProdId = (m.saas_product_id?._id || m.saas_product_id || m.dashboard_type_id?._id || m.dashboard_type_id)?.toString();
            if (mProdId !== editPopup.newSaasProductId?.toString()) return false;
          }
          return true;
        })
        .map(m => ({ value: (m.id || m._id)?.toString(), text: m.name }))
    ];
  }, [modules, editPopup.module, editPopup.newDashboardContext, editPopup.newSaasProductId]);

  const addSaasProductOptions = useMemo(() => {
    const p = panels.find(pan => (pan.id || pan._id).toString() === addPopup.panelId?.toString());
    const prods = p?.products || [];
    return prods.map(prod => ({ value: (prod.id || prod._id).toString(), text: prod.name }));
  }, [panels, addPopup.panelId]);

  const editSaasProductOptions = useMemo(() => {
    const p = panels.find(pan => (pan.id || pan._id).toString() === editPopup.newPanelId?.toString());
    const prods = p?.products || [];
    return prods.map(prod => ({ value: (prod.id || prod._id).toString(), text: prod.name }));
  }, [panels, editPopup.newPanelId]);

  const clearFilters = () => { setFilterPanel(null); setFilterLevel(null); };

  const hierarchy = useMemo(() => {
    if (moduleUniqueId === 'DEV_WH_MODULES') {
      const moduleMap = {};
      modules.forEach(m => {
        moduleMap[(m.id || m._id).toString()] = { ...m, children: [] };
      });

      const rootModules = [];
      Object.values(moduleMap).forEach(m => {
        const parentId = m.parent_module_id?._id || m.parent_module_id;
        if (parentId && moduleMap[parentId.toString()]) {
          moduleMap[parentId.toString()].children.push(m);
        } else {
          rootModules.push(m);
        }
      });
      return rootModules;
    }

    if (!filterPanel || !filterLevel) return [];

    const moduleMap = {};
    modules.forEach(m => {
      moduleMap[(m.id || m._id).toString()] = { ...m, children: [] };
    });

    const rootModules = [];
    Object.values(moduleMap).forEach(m => {
      const parentId = m.parent_module_id?._id || m.parent_module_id;
      if (parentId && moduleMap[parentId.toString()]) {
        moduleMap[parentId.toString()].children.push(m);
      } else {
        rootModules.push(m);
      }
    });

    const p = panels.find(pan => (pan.id || pan._id).toString() === filterPanel.toString());
    const l = levels.find(lev => (lev.id || lev._id).toString() === filterLevel.toString());
    if (!p || !l) return [];

    const pId = (p.id || p._id).toString();
    const lId = (l.id || l._id).toString();

    // Map through both default and SaaS product architectures dynamically
    const architecturesList = [];

    // Add Default context as first architect node
    const typeModules = rootModules.filter(m =>
      (m.panel_id?._id || m.panel_id)?.toString() === pId &&
      (m.level_id?._id || m.level_id)?.toString() === lId &&
      m.dashboard_context === 'default'
    );
    architecturesList.push({
      id: "default-context",
      _id: "default-context",
      name: "Default Dashboard Context",
      modules: typeModules,
      panelId: pId,
      levelId: lId
    });

    // Add active products assigned to panel
    const assignedProducts = p.products || [];
    assignedProducts.forEach(dt => {
      const productModules = rootModules.filter(m =>
        (m.panel_id?._id || m.panel_id)?.toString() === pId &&
        (m.level_id?._id || m.level_id)?.toString() === lId &&
        m.dashboard_context === 'product' &&
        (m.saas_product_id?._id || m.saas_product_id || m.dashboard_type_id?._id || m.dashboard_type_id)?.toString() === (dt.id || dt._id).toString()
      );
      architecturesList.push({
        ...dt,
        name: `${dt.name} Product Context`,
        modules: productModules,
        panelId: pId,
        levelId: lId
      });
    });

    const selectedLevelNode = { ...l, architectures: architecturesList, panelId: pId };
    return [{ ...p, levels: [selectedLevelNode] }];
  }, [modules, panels, levels, filterPanel, filterLevel, moduleUniqueId]);

  if (fetching) return <Loader text="Loading modules..." />;

  const isFormValid = moduleUniqueId === 'DEV_WH_MODULES'
    ? addPopup.name.trim()
    : (addPopup.name.trim() && addPopup.uniqueCode.trim() && addPopup.panelId && addPopup.levelId && (addPopup.dashboardContext === 'default' || addPopup.saasProductId));

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Modules Registry"
        subtitle="Manage the core components of your application ecosystem."
        icon={FiBox}
        stats={[
          { label: "Total Modules", value: modules.length.toString(), description: "System components" },
          { label: "Active", value: modules.filter(m => m.is_active).length.toString(), description: "Live modules" }
        ]}
      />
      <div className="grid grid-cols-1 gap-6 items-start">
        <div className="col-span-12">
          <div className="bg-surface rounded-xl shadow-lg border border-border overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-border bg-bg/20 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                  <FiGrid size={20} />
                </div>
                <div>
                  <h3 className="font-black text-text-primary text-base tracking-tight leading-none mb-1 uppercase">Registry</h3>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-none">Active Inventory</p>
                </div>
              </div>

              {moduleUniqueId === 'DEV_WH_MODULES' && hasAddPermission && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<FiPlus size={16} />}
                    onClick={() => triggerAddModule("", "", "", "")}
                  >
                    Add Root Module
                  </Button>
                </div>
              )}

              {!presetPanelPrefix && (
                <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                    <div className="w-full sm:w-48">
                      <DropdownWithSearchInput
                        options={panels.map(p => ({ value: (p.id || p._id).toString(), text: p.name }))}
                        value={filterPanel}
                        onChange={(val) => { setFilterPanel(val); setFilterLevel(null); }}
                        placeholder="Select Panel"
                        className="!h-10 !rounded-xl shadow-sm"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <DropdownWithSearchInput
                        options={levels.map(l => ({ value: (l.id || l._id).toString(), text: l.name.charAt(0).toUpperCase() + l.name.slice(1).toLowerCase() }))}
                        value={filterLevel}
                        onChange={setFilterLevel}
                        placeholder="Select Level"
                        className="!h-10 !rounded-xl shadow-sm"
                        disabled={!filterPanel}
                      />
                    </div>
                  </div>
                  {filterPanel && filterLevel && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary rounded-lg text-[10px] font-black border border-primary/10 uppercase tracking-widest">
                      <FiFilter size={12} />
                      {modules.length} Modules
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar max-h-[750px]">
              {(moduleUniqueId === 'DEV_WH_MODULES' || (filterPanel && filterLevel)) ? (
                hierarchy.length > 0 ? (
                  <div className="space-y-4">
                    {hierarchy.map(node => (
                      <HierarchyNode
                        key={node.id || node._id}
                        item={node}
                        type={moduleUniqueId === 'DEV_WH_MODULES' ? "module" : "panel"}
                        actions={{
                          hasAddPermission,
                          hasEditPermission,
                          hasDeletePermission,
                          triggerAddModule,
                          handleEditModule,
                          handleDeleteRequest,
                          handleCopyUniqueId,
                          copiedId
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center">
                    <div className="w-24 h-24 bg-bg rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <FiBox className="text-text-muted/30 text-5xl" />
                    </div>
                    <p className="text-text-primary text-lg font-black uppercase tracking-widest">No modules found</p>
                    <p className="text-text-secondary text-sm font-medium mt-2">Selected combination has no modules registered yet.</p>
                  </div>
                )
              ) : (
                <div className="py-32 text-center">
                  <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                    <FiLayers className="text-primary/20 text-6xl" />
                  </div>
                  <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight mb-3">Refine Your View</h2>
                  <p className="text-text-secondary text-sm max-w-sm mx-auto font-medium">Please select both a **Panel** and a **Level** to view and manage the specific module architecture.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationPopup
        isOpen={deleteConfirmation.isOpen}
        title="Delete Module"
        message={deleteConfirmation.message || `Are you sure you want to delete "${deleteConfirmation.module?.name}"? This action cannot be undone.`}
        variant="danger"
        mode={deleteConfirmation.otpMode ? "otp" : "text"}
        onConfirm={confirmDeleteModule}
        onCancel={() => setDeleteConfirmation({ isOpen: false, module: null, isLoading: false, otpMode: false, otp: "" })}
        isLoading={deleteConfirmation.isLoading}
        confirmText={deleteConfirmation.confirmText || "Yes, Delete"}
        cancelText={deleteConfirmation.otpMode ? "Cancel" : "No, Keep It"}
        otp={deleteConfirmation.otp}
        onOtpChange={(otp) => setDeleteConfirmation(prev => ({ ...prev, otp }))}
      />

      <ConfirmationPopup
        isOpen={updateConfirmation.isOpen}
        title={updateConfirmation.title}
        message={updateConfirmation.message}
        mode={updateConfirmation.otpMode ? "otp" : "text"}
        onConfirm={confirmUpdateModule}
        onCancel={handleCancelUpdate}
        variant={updateConfirmation.variant || "warning"}
        isLoading={updateConfirmation.isLoading}
        confirmText={updateConfirmation.confirmText}
        cancelText={updateConfirmation.otpMode ? "Cancel" : "No, Keep"}
        otp={updateConfirmation.otp}
        onOtpChange={(otp) => setUpdateConfirmation(prev => ({ ...prev, otp }))}
      />

      {/* CREATE MODULE DIALOG */}
      <Dialog
        isOpen={addPopup.isOpen}
        onClose={() => setAddPopup({ isOpen: false, name: "", panelId: "", levelId: "", dashboardContext: "default", saasProductId: "", parentModuleId: "", uniqueCode: "", isLoading: false })}
        title="Add Module"
        size="md"
      >
        <div className="space-y-6 text-left">
          <div className="pt-2">
            <CustomInput
              label="Module Name"
              placeholder="e.g. Activity Logs"
              value={addPopup.name}
              onChange={(e) => {
                const newName = e.target.value;
                setAddPopup(prev => ({
                  ...prev,
                  name: newName,
                  uniqueCode: generateSuggestedCode(newName, prev.panelId)
                }));
              }}
              autoFocus
            />
          </div>

          {moduleUniqueId !== 'DEV_WH_MODULES' && (
            <div>
              <CustomInput
                label="Unique Code"
                placeholder="e.g. ADM_ACTIVITY_LOGS"
                value={addPopup.uniqueCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "");
                  setAddPopup(prev => ({ ...prev, uniqueCode: val }));
                }}
                description="Must be uppercase letters, numbers, or underscores (max 50 chars). Enforced to be globally unique."
              />
            </div>
          )}

          {moduleUniqueId !== 'DEV_WH_MODULES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Dashboard Context</label>
                <DropdownWithSearchInput
                  options={[
                    { value: 'default', text: 'Default Dashboard' },
                    { value: 'product', text: 'SaaS Product Context' }
                  ]}
                  value={addPopup.dashboardContext}
                  onChange={(val) => setAddPopup(prev => ({ ...prev, dashboardContext: val, saasProductId: "" }))}
                  placeholder="Select Context"
                  className="w-full"
                />
              </div>

              {addPopup.dashboardContext === 'product' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">SaaS Product *</label>
                  <DropdownWithSearchInput
                    options={addSaasProductOptions}
                    value={addPopup.saasProductId}
                    onChange={(val) => setAddPopup(prev => ({ ...prev, saasProductId: val }))}
                    placeholder="Select SaaS Product"
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => setAddPopup({ isOpen: false, name: "", panelId: "", levelId: "", dashboardContext: "default", saasProductId: "", parentModuleId: "", uniqueCode: "", isLoading: false })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateModule}
              loading={addPopup.isLoading}
              disabled={!isFormValid}
            >
              Add Module
            </Button>
          </div>
        </div>
      </Dialog>

      {/* EDIT MODULE DIALOG */}
      <Dialog
        isOpen={editPopup.isOpen}
        onClose={() => setEditPopup(prev => ({ ...prev, isOpen: false }))}
        title="Edit Module"
        size="md"
      >
        <div className="space-y-6 text-left">
          <div className="space-y-6">
            <CustomInput label="Module Name" value={editPopup.newName} onChange={(e) => setEditPopup(prev => ({ ...prev, newName: e.target.value }))} className="!bg-bg/50 focus:!bg-white" />

            {moduleUniqueId !== 'DEV_WH_MODULES' && (
              <CustomInput
                label="Unique Code"
                value={editPopup.newUniqueCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "");
                  setEditPopup(prev => ({ ...prev, newUniqueCode: val }));
                }}
                className="!bg-bg/50 focus:!bg-white"
                description="Must be uppercase letters, numbers, or underscores (max 50 chars). Enforced to be globally unique."
              />
            )}

            {moduleUniqueId !== 'DEV_WH_MODULES' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Dashboard Context</label>
                  <DropdownWithSearchInput
                    options={[
                      { value: 'default', text: 'Default Dashboard' },
                      { value: 'product', text: 'SaaS Product Context' }
                    ]}
                    value={editPopup.newDashboardContext}
                    onChange={(val) => setEditPopup(prev => ({ ...prev, newDashboardContext: val, newSaasProductId: "" }))}
                    placeholder="Select Context"
                    className="w-full"
                  />
                </div>

                {editPopup.newDashboardContext === 'product' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">SaaS Product *</label>
                    <DropdownWithSearchInput
                      options={editSaasProductOptions}
                      value={editPopup.newSaasProductId}
                      onChange={(val) => setEditPopup(prev => ({ ...prev, newSaasProductId: val }))}
                      placeholder="Select SaaS Product"
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Parent Module</label>
                <DropdownWithSearchInput
                  options={parentOptions}
                  value={editPopup.newParentModuleId}
                  onChange={(val) => {
                    const parent = modules.find(m => (m.id || m._id)?.toString() === val?.toString());
                    setEditPopup(prev => ({
                      ...prev,
                      newParentModuleId: val,
                      ...(parent ? { newDashboardContext: parent.dashboard_context } : {})
                    }));
                  }}
                  placeholder="Select Parent"
                  className="w-full"
                />
              </div>
            </div>

            <div className="pt-4 p-5 bg-bg/50 rounded-2xl border border-border/50">
              <ToggleButton label="Active Status" checked={editPopup.newIsActive} onChange={(val) => !isEditParentInactive && setEditPopup(prev => ({ ...prev, newIsActive: val }))} description={isEditParentInactive ? "Parent is inactive (Child must be inactive)" : "Enable or disable this module"} disabled={isEditParentInactive} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => setEditPopup(prev => ({ ...prev, isOpen: false }))}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              onClick={handleEditSubmit}
              disabled={!editPopup.newName.trim() || (moduleUniqueId !== 'DEV_WH_MODULES' && editPopup.newDashboardContext === 'product' && !editPopup.newSaasProductId)}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}