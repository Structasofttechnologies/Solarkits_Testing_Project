import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import { setAlert } from "@/features/alert.slice";
import {
  FiShield,
  FiGrid,
  FiSearch,
  FiBriefcase,
  FiLayers,
  FiSave,
  FiArrowLeft,
  FiCheckCircle,
  FiCheck,
  FiX,
  FiEye,
  FiEdit3,
  FiPlus,
  FiTrash2,
  FiSliders,
  FiFolder,
  FiAlertCircle
} from "react-icons/fi";
import PageHeader from "@/components/PageHeader";

export default function RoleDetails({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id: role_id } = useParams();
  const API = import.meta.env.VITE_API_URL;

  const [viewRole, setViewRole] = useState(null);
  const [viewRoleLoading, setViewRoleLoading] = useState(true);
  const [allPanels, setAllPanels] = useState([]);
  const [allLevels, setAllLevels] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [savingModules, setSavingModules] = useState(false);

  // Active panel tab for filtering modules
  const [activePanelId, setActivePanelId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Working state: map of moduleId -> { can_view, can_add, can_edit, can_delete }
  const [permissionMap, setPermissionMap] = useState({});

  // Manage Panels Modal state
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [selectedPanelIds, setSelectedPanelIds] = useState([]);
  const [savingPanels, setSavingPanels] = useState(false);

  // Fetch initial role details
  const getRoleDetails = async (id) => {
    setViewRoleLoading(true);
    try {
      const res = await axios.get(`${API}/roles/${id}?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      setViewRole(res.data.data);
    } catch (error) {
      console.error("Error fetching role details:", error);
      dispatch(
        setAlert({
          type: "error",
          message: error.response?.data?.message || "Failed to load role details.",
          duration: 4000
        })
      );
      if (error.response?.status === 404) {
        navigate('/admin-panel/settings/role-settings/role-based-access-control');
      }
    } finally {
      setViewRoleLoading(false);
    }
  };

  const getPanels = async () => {
    try {
      const res = await axios.get(`${API}/panels?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      setAllPanels(res.data.data || []);
    } catch (error) {
      console.error("Error loading panels:", error);
    }
  };

  const getLevels = async () => {
    try {
      const res = await axios.get(`${API}/roles/levels?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      setAllLevels(res.data.data || []);
    } catch (error) {
      console.error("Error loading levels:", error);
    }
  };

  useEffect(() => {
    getPanels();
    getLevels();
    if (role_id) getRoleDetails(role_id);
  }, [role_id]);

  // Panels associated with this role
  const rolePanels = useMemo(() => {
    if (!viewRole) return [];
    const panelsList = [];
    if (viewRole.panels && viewRole.panels.length > 0) {
      viewRole.panels.forEach(p => {
        panelsList.push({
          id: (p.id || p._id).toString(),
          name: p.name
        });
      });
      return panelsList;
    }
    if (viewRole.name === 'Super Admin') {
      return allPanels.map(p => ({
        id: (p.id || p._id).toString(),
        name: p.name
      }));
    }
    if (viewRole.panel_id) {
      const pId = (viewRole.panel_id._id || viewRole.panel_id).toString();
      const pObj = allPanels.find(p => (p.id || p._id).toString() === pId);
      panelsList.push({
        id: pId,
        name: pObj ? pObj.name : (viewRole.panel_name || 'Assigned Panel')
      });
    }
    return panelsList;
  }, [viewRole, allPanels]);

  // Set default active panel tab once panels are loaded or change
  useEffect(() => {
    if (rolePanels.length > 0) {
      const stillValid = rolePanels.some(p => p.id === activePanelId);
      if (!activePanelId || !stillValid) {
        setActivePanelId(rolePanels[0].id);
      }
    } else {
      setActivePanelId(null);
    }
  }, [rolePanels, activePanelId]);

  // Load modules for this role
  const loadModules = async () => {
    if (!viewRole) return;
    const level_id = viewRole.level_id || (allLevels[0]?.id || allLevels[0]?._id);
    const panel_ids = allPanels.length > 0
      ? allPanels.map(p => (p.id || p._id).toString()).join(',')
      : (rolePanels.map(p => p.id).join(','));

    if (!panel_ids) return;

    setModulesLoading(true);
    try {
      let modules = [];
      const res = await axios.get(`${API}/modules/${level_id || 'country'}/${panel_ids}?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj(),
      });
      modules = res.data.data || [];

      setAllModules(modules);

      // Populate working permissionMap from role's assigned_modules
      const permMap = {};
      const assignedList = viewRole.assigned_modules || [];
      const assignedById = {};
      assignedList.forEach(a => {
        const mId = (a.module_id || a.id || a._id).toString();
        assignedById[mId] = a;
      });

      modules.forEach(m => {
        const mId = (m.id || m._id).toString();
        const existing = assignedById[mId];
        if (existing) {
          permMap[mId] = {
            can_view: !!existing.can_view,
            can_add: !!existing.can_add,
            can_edit: !!existing.can_edit,
            can_delete: !!existing.can_delete,
          };
        } else if (viewRole.name === 'Super Admin') {
          // Super admin gets full access by default
          permMap[mId] = {
            can_view: true,
            can_add: true,
            can_edit: true,
            can_delete: true,
          };
        } else {
          permMap[mId] = {
            can_view: false,
            can_add: false,
            can_edit: false,
            can_delete: false,
          };
        }
      });

      setPermissionMap(permMap);
    } catch (err) {
      console.error('Error fetching modules:', err);
      dispatch(setAlert({ type: 'error', message: 'Failed to load modules for this role.', duration: 4000 }));
    } finally {
      setModulesLoading(false);
    }
  };

  useEffect(() => {
    if (viewRole && allPanels.length > 0) {
      loadModules();
    }
  }, [viewRole, allPanels.length]);

  // Open Manage Panels Modal
  const openPanelModal = () => {
    setSelectedPanelIds(rolePanels.map(p => p.id));
    setShowPanelModal(true);
  };

  // Save updated panels for this role
  const handleSaveRolePanels = async () => {
    if (!role_id) return;
    if (selectedPanelIds.length === 0) {
      dispatch(setAlert({
        type: 'error',
        message: 'At least one portal panel must be selected for this role.',
        duration: 3500
      }));
      return;
    }

    setSavingPanels(true);
    try {
      await axios.put(
        `${API}/roles/${role_id}/panels?unique_id=${moduleUniqueId}&req_for=edit`,
        { panels: selectedPanelIds },
        { headers: authHeaderObj() }
      );

      dispatch(setAlert({
        type: 'success',
        message: `Allowed panels updated successfully for ${viewRole?.name}!`,
        duration: 3500
      }));

      setShowPanelModal(false);
      await getRoleDetails(role_id);
    } catch (err) {
      console.error("Error updating role panels:", err);
      dispatch(setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update allowed panels for this role.',
        duration: 4000
      }));
    } finally {
      setSavingPanels(false);
    }
  };

  // Modules belonging to current active panel
  const currentPanelModules = useMemo(() => {
    if (!activePanelId) return [];
    return allModules.filter(m => {
      const pId = (m.panel_id?._id || m.panel_id || m.raw?.panel_id)?.toString();
      return pId === activePanelId.toString();
    });
  }, [allModules, activePanelId]);

  // Filtered by search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return currentPanelModules;
    const q = searchQuery.toLowerCase();
    return currentPanelModules.filter(m => 
      (m.name || '').toLowerCase().includes(q) || 
      (m.unique_code || '').toLowerCase().includes(q)
    );
  }, [currentPanelModules, searchQuery]);

  // Helper to determine module preset
  const getModulePreset = (mId) => {
    const perm = permissionMap[mId];
    if (!perm || !perm.can_view) return 'disabled';
    if (perm.can_view && perm.can_add && perm.can_edit && perm.can_delete) return 'full';
    if (perm.can_view && perm.can_add && perm.can_edit && !perm.can_delete) return 'manage';
    if (perm.can_view && !perm.can_add && !perm.can_edit && !perm.can_delete) return 'view_only';
    return 'custom';
  };

  // Set preset for a single module
  const handleSetPreset = (mId, preset) => {
    setPermissionMap(prev => {
      const next = { ...prev };
      if (preset === 'full') {
        next[mId] = { can_view: true, can_add: true, can_edit: true, can_delete: true };
      } else if (preset === 'manage') {
        next[mId] = { can_view: true, can_add: true, can_edit: true, can_delete: false };
      } else if (preset === 'view_only') {
        next[mId] = { can_view: true, can_add: false, can_edit: false, can_delete: false };
      } else if (preset === 'disabled') {
        next[mId] = { can_view: false, can_add: false, can_edit: false, can_delete: false };
      }
      return next;
    });
  };

  // Toggle specific permission pill
  const handleTogglePill = (mId, actionKey) => {
    setPermissionMap(prev => {
      const curr = prev[mId] || { can_view: false, can_add: false, can_edit: false, can_delete: false };
      const nextVal = !curr[actionKey];

      const updated = { ...curr, [actionKey]: nextVal };

      // If view is turned off, all other permissions must also be turned off
      if (actionKey === 'can_view' && !nextVal) {
        updated.can_add = false;
        updated.can_edit = false;
        updated.can_delete = false;
      }
      // If add/edit/delete is turned on, view must also be turned on
      if (actionKey !== 'can_view' && nextVal) {
        updated.can_view = true;
      }

      return { ...prev, [mId]: updated };
    });
  };

  // Bulk presets for the currently viewed panel
  const handleBulkPreset = (preset) => {
    setPermissionMap(prev => {
      const next = { ...prev };
      currentPanelModules.forEach(m => {
        const mId = (m.id || m._id).toString();
        if (preset === 'full') {
          next[mId] = { can_view: true, can_add: true, can_edit: true, can_delete: true };
        } else if (preset === 'view_only') {
          next[mId] = { can_view: true, can_add: false, can_edit: false, can_delete: false };
        } else if (preset === 'disabled') {
          next[mId] = { can_view: false, can_add: false, can_edit: false, can_delete: false };
        }
      });
      return next;
    });
    dispatch(setAlert({
      type: "info",
      message: `Applied ${preset.replace('_', ' ').toUpperCase()} preset to all modules in this panel. Click 'Save' to apply.`,
      duration: 3000
    }));
  };

  // Save all permissions back to server
  const handleSavePermissions = async () => {
    if (!role_id) return;
    setSavingModules(true);
    try {
      // Build payload for all active modules
      const payloadModules = [];
      Object.entries(permissionMap).forEach(([mId, perm]) => {
        payloadModules.push({
          id: mId,
          module_id: mId,
          can_view: !!perm.can_view,
          can_add: !!perm.can_add,
          can_edit: !!perm.can_edit,
          can_delete: !!perm.can_delete,
          isAssigned: !!perm.can_view
        });
      });

      await axios.put(
        `${API}/roles/module-permission/${role_id}?unique_id=${moduleUniqueId}&req_for=edit`,
        { modules: payloadModules },
        { headers: authHeaderObj() }
      );

      dispatch(
        setAlert({
          type: "success",
          message: `Permissions for ${viewRole.name} updated successfully!`,
          duration: 3500
        })
      );
      await getRoleDetails(role_id);
    } catch (err) {
      console.error("Error saving permissions:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to update role permissions.",
          duration: 4000
        })
      );
    } finally {
      setSavingModules(false);
    }
  };

  // Count active modules
  const totalActiveModules = useMemo(() => {
    return Object.values(permissionMap).filter(p => p.can_view).length;
  }, [permissionMap]);

  const activeInCurrentPanel = useMemo(() => {
    return currentPanelModules.filter(m => {
      const p = permissionMap[(m.id || m._id).toString()];
      return p && p.can_view;
    }).length;
  }, [currentPanelModules, permissionMap]);

  if (viewRoleLoading) {
    return <Loader text="Loading role permissions & modules..." />;
  }

  if (!viewRole) {
    return (
      <div className="card shadow-sm p-8 text-center text-text-secondary">
        <FiAlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
        <h3 className="text-lg font-bold">Role Not Found</h3>
        <p className="text-sm mt-1">Unable to load details for this role.</p>
        <Button onClick={() => navigate('/admin-panel/settings/role-settings/role-based-access-control')} className="mt-4" variant="primary">
          Back to Roles
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <PageHeader
        title={viewRole.name}
        subtitle="Manage panel-wise modules, authorization rules, and feature permissions"
        icon={FiShield}
        showBackButton={true}
        onBackClick={() => navigate('/admin-panel/settings/role-settings/role-based-access-control')}
        stats={[
          { label: "Active Modules", value: totalActiveModules.toString(), description: "Across all panels" },
          { label: "Allowed Panels", value: rolePanels.length.toString(), description: "Portals" },
          { label: "Department", value: viewRole.department_name || "General", description: "Unit" },
          { label: "Tier", value: (viewRole.level_name || "Country").toUpperCase(), description: "Scope" }
        ]}
      />

      {/* Role Summary Badges */}
      <div className="card shadow-sm p-4 bg-surface border border-border rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center gap-2 text-xs font-bold">
            <FiBriefcase size={14} />
            <span>Dept: {viewRole.department_name}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-2 text-xs font-bold">
            <FiLayers size={14} />
            <span>Level: {viewRole.level_name || 'Country'}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-2 text-xs font-bold">
            <FiCheckCircle size={14} />
            <span>Status: {viewRole.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin-panel/settings/role-settings/role-based-access-control')}
          className="text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <FiArrowLeft size={14} />
          <span>Back to Roles Registry</span>
        </button>
      </div>

      {/* STEP 1: PANEL TABS SWITCHER */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center gap-2">
              <FiGrid className="text-primary" size={15} />
              <span>Step 1: Select Portal Panel</span>
            </h3>
            <button
              type="button"
              onClick={openPanelModal}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 transition-all cursor-pointer shadow-xs"
              title="Add or remove portal panels allowed for this role"
            >
              <FiSliders size={12} />
              <span>Manage Allowed Panels ({rolePanels.length}/{allPanels.length})</span>
            </button>
          </div>
          <span className="text-xs font-bold text-text-secondary">
            {activeInCurrentPanel} / {currentPanelModules.length} Modules Active in this Panel
          </span>
        </div>

        {rolePanels.length === 0 ? (
          <div className="p-6 text-center bg-surface border border-dashed border-border rounded-2xl">
            <p className="text-sm text-text-secondary font-medium">No portal panels are currently assigned to this role.</p>
            <button
              type="button"
              onClick={openPanelModal}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-hover transition-colors cursor-pointer"
            >
              <FiSliders size={14} />
              <span>Assign Panels to this Role</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {rolePanels.map(panel => {
              const isActive = activePanelId === panel.id;
              const panelModulesCount = allModules.filter(m => (m.panel_id?._id || m.panel_id || m.raw?.panel_id)?.toString() === panel.id.toString()).length;
              const activeCountInPanel = allModules.filter(m => {
                const pId = (m.panel_id?._id || m.panel_id || m.raw?.panel_id)?.toString();
                return pId === panel.id.toString() && permissionMap[(m.id || m._id).toString()]?.can_view;
              }).length;

              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => {
                    setActivePanelId(panel.id);
                    setSearchQuery("");
                  }}
                  className={`px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center gap-3 cursor-pointer border ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-[1.02]'
                      : 'bg-surface hover:bg-surface-hover text-text-primary border-border'
                  }`}
                >
                  <FiGrid size={16} className={isActive ? 'text-white' : 'text-primary'} />
                  <span>{panel.name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {activeCountInPanel}/{panelModulesCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 2: MODULES & PERMISSION CONTROLS FOR ACTIVE PANEL */}
      <div className="card shadow-sm border border-border rounded-3xl bg-surface overflow-hidden">
        {/* Panel Toolbar */}
        <div className="p-5 border-b border-border bg-linear-120 from-primary/5 via-transparent to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h3 className="font-black text-text-primary text-base">
                {rolePanels.find(p => p.id === activePanelId)?.name || 'Panel'} Permissions
              </h3>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Choose which modules and actions are allowed for "{viewRole.name}".
            </p>
          </div>

          {/* Quick Presets & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 p-1 bg-surface-hover/50 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => handleBulkPreset('full')}
                className="px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Grant full access (View, Add, Edit, Delete) to all modules in this panel"
              >
                <FiCheckCircle size={13} />
                <span>Allow All (Full)</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkPreset('view_only')}
                className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Set all modules in this panel to View Only"
              >
                <FiEye size={13} />
                <span>View Only All</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkPreset('disabled')}
                className="px-2.5 py-1 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Disable all modules in this panel"
              >
                <FiX size={13} />
                <span>Disable All</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* HELPFUL LEGEND GUIDE BAR */}
        <div className="px-5 py-2.5 bg-surface-hover/30 border-b border-border flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex flex-wrap items-center gap-3 text-text-secondary">
            <span className="font-black text-text-primary flex items-center gap-1.5">
              <span>💡 Button Status Guide:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white">✓ View</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white">✓ Add</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-600 text-white">✓ Edit</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white">✓ Delete</span>
              <span className="text-text-primary font-bold ml-1 mr-2">= Colored & Checked (WORKING / ALLOWED)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-border bg-surface text-text-muted/60 opacity-60 line-through">✕ Off</span>
              <span className="text-text-muted font-bold ml-1">= Grey & Crossed (OFF / BAND)</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
            <span>🟣 "Custom Configuration" = Mixed buttons chosen manually</span>
          </div>
        </div>

        {/* Modules Table */}
        <div className="overflow-x-auto">
          {modulesLoading ? (
            <div className="py-16 text-center">
              <Loader text="Loading modules..." />
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="py-16 text-center text-text-secondary">
              <FiFolder size={36} className="mx-auto text-text-muted mb-2 opacity-50" />
              <h4 className="font-bold text-sm">No Modules Found in this Panel</h4>
              <p className="text-xs text-text-muted mt-1">Try selecting another panel tab or clearing the search query.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-bg/40 border-b border-border text-[11px] font-black uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="py-3 px-5">Module / Feature Name</th>
                  <th className="py-3 px-4 w-48">Access Mode</th>
                  <th className="py-3 px-4 w-72">Allowed Actions</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredModules.map(module => {
                  const mId = (module.id || module._id).toString();
                  const perm = permissionMap[mId] || { can_view: false, can_add: false, can_edit: false, can_delete: false };
                  const currentPreset = getModulePreset(mId);

                  return (
                    <tr key={mId} className="hover:bg-surface-hover/40 transition-colors">
                      {/* Module Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            perm.can_view 
                              ? 'bg-primary/10 text-primary border border-primary/20' 
                              : 'bg-border/30 text-text-muted'
                          }`}>
                            <FiGrid size={15} />
                          </div>
                          <div>
                            <div className="font-bold text-text-primary text-sm flex items-center gap-2">
                              <span>{module.name}</span>
                              {module.parent_module_name && (
                                <span className="text-[10px] font-normal text-text-muted px-1.5 py-0.5 rounded bg-bg border border-border">
                                  Sub-feature
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted tracking-tight mt-0.5">
                              {module.unique_code || 'CODE'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Access Preset Dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={currentPreset}
                          onChange={(e) => handleSetPreset(mId, e.target.value)}
                          className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer focus:outline-none focus:ring-2 ${
                            currentPreset === 'full'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : currentPreset === 'manage'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : currentPreset === 'view_only'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : currentPreset === 'custom'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                              : 'bg-surface border-border text-text-muted'
                          }`}
                        >
                          <option value="full">Full Access (All 4 Allowed)</option>
                          <option value="manage">View & Modify (No Delete)</option>
                          <option value="view_only">View Only (Read Only)</option>
                          <option value="custom">Custom (Mixed Buttons)</option>
                          <option value="disabled">Disabled (No Access)</option>
                        </select>
                      </td>

                      {/* Granular Action Pills */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* View */}
                          <button
                            type="button"
                            onClick={() => handleTogglePill(mId, 'can_view')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer border ${
                              perm.can_view
                                ? 'bg-blue-600 text-white border-blue-700 shadow-xs hover:bg-blue-700'
                                : 'bg-surface hover:bg-surface-hover text-text-muted/60 border-border opacity-50 line-through decoration-rose-500'
                            }`}
                            title={perm.can_view ? "View: ALLOWED (Click to Turn OFF)" : "View: BLOCKED (Click to Turn ON)"}
                          >
                            {perm.can_view ? <FiCheck size={11} strokeWidth={3} /> : <FiX size={11} />}
                            <span>View</span>
                          </button>

                          {/* Add */}
                          <button
                            type="button"
                            onClick={() => handleTogglePill(mId, 'can_add')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer border ${
                              perm.can_add
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs hover:bg-emerald-700'
                                : 'bg-surface hover:bg-surface-hover text-text-muted/60 border-border opacity-50 line-through decoration-rose-500'
                            }`}
                            title={perm.can_add ? "Add / Create: ALLOWED (Click to Turn OFF)" : "Add / Create: BLOCKED (Click to Turn ON)"}
                          >
                            {perm.can_add ? <FiCheck size={11} strokeWidth={3} /> : <FiX size={11} />}
                            <span>Add</span>
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleTogglePill(mId, 'can_edit')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer border ${
                              perm.can_edit
                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs hover:bg-amber-700'
                                : 'bg-surface hover:bg-surface-hover text-text-muted/60 border-border opacity-50 line-through decoration-rose-500'
                            }`}
                            title={perm.can_edit ? "Edit / Modify: ALLOWED (Click to Turn OFF)" : "Edit / Modify: BLOCKED (Click to Turn ON)"}
                          >
                            {perm.can_edit ? <FiCheck size={11} strokeWidth={3} /> : <FiX size={11} />}
                            <span>Edit</span>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleTogglePill(mId, 'can_delete')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer border ${
                              perm.can_delete
                                ? 'bg-rose-600 text-white border-rose-700 shadow-xs hover:bg-rose-700'
                                : 'bg-surface hover:bg-surface-hover text-text-muted/60 border-border opacity-50 line-through decoration-rose-500'
                            }`}
                            title={perm.can_delete ? "Delete: ALLOWED (Click to Turn OFF)" : "Delete: BLOCKED (Click to Turn ON)"}
                          >
                            {perm.can_delete ? <FiCheck size={11} strokeWidth={3} /> : <FiX size={11} />}
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {perm.can_view ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <FiCheck size={12} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-border/40 text-text-muted border border-border">
                            <FiX size={12} />
                            <span>Off</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM SAVE ACTION BAR */}
      <div className="sticky bottom-4 z-30 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-surface/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-120 from-primary to-primary-end text-white flex items-center justify-center font-bold shrink-0 shadow-md">
            <FiShield size={20} />
          </div>
          <div>
            <h4 className="font-black text-sm text-text-primary">
              Apply Permissions to "{viewRole.name}"
            </h4>
            <p className="text-xs text-text-muted">
              {totalActiveModules} modules configured across {rolePanels.length} portal panel(s).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate('/admin-panel/settings/role-settings/role-based-access-control')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-surface-hover border border-border transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <Button
            onClick={handleSavePermissions}
            loading={savingModules}
            disabled={savingModules}
            size="md"
            className="flex-1 sm:flex-none bg-linear-120 from-primary to-primary-end px-7 py-3 rounded-xl shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            <FiSave size={16} />
            <span>{savingModules ? 'Saving Changes...' : 'Save & Apply Permissions'}</span>
          </Button>
        </div>
      </div>

      {/* MANAGE ALLOWED PANELS MODAL */}
      {showPanelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-linear-120 from-primary/10 via-transparent to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <FiSliders size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary">
                    Manage Allowed Panels
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Configure which portal panels are accessible to "{viewRole?.name}".
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPanelModal(false)}
                className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Modal Body - Panel Checkbox List */}
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Select Portal Panels ({selectedPanelIds.length} Selected):
              </p>
              {allPanels.map((panel) => {
                const pId = (panel.id || panel._id).toString();
                const isSelected = selectedPanelIds.includes(pId);
                const modCount = allModules.filter(m => (m.panel_id?._id || m.panel_id || m.raw?.panel_id)?.toString() === pId).length;

                return (
                  <div
                    key={pId}
                    onClick={() => {
                      setSelectedPanelIds(prev =>
                        prev.includes(pId)
                          ? prev.filter(id => id !== pId)
                          : [...prev, pId]
                      );
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-primary/50 bg-primary/5 shadow-xs'
                        : 'border-border bg-surface-hover/30 hover:border-text-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-primary border-primary text-white' : 'border-border bg-surface'
                      }`}>
                        {isSelected && <FiCheck size={13} strokeWidth={3} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-text-primary">
                          {panel.name}
                        </h4>
                        <p className="text-xs text-text-muted mt-0.5">
                          {modCount > 0 ? `${modCount} module(s) available in this panel` : 'Portal workspace panel'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      isSelected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface-hover text-text-muted'
                    }`}>
                      {isSelected ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-border bg-surface-hover/40 flex items-center justify-between gap-3">
              <span className="text-xs text-text-muted">
                Unchecked panels will be removed from this role's scope.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPanelModal(false)}
                  className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRolePanels}
                  disabled={savingPanels}
                  className="px-5 py-2 text-xs font-black text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingPanels ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiSave size={13} />
                      <span>Apply Panels</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
