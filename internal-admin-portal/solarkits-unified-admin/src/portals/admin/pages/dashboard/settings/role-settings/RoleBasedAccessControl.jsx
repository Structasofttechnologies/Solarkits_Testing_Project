import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import CustomInput from "@/components/CustomInput";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import Loader from "@/components/Loader";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import ToggleButton from "@/components/ToggleButton";
import { setAlert } from "@/features/alert.slice";
import {
  FiShield,
  FiPlus,
  FiAlertCircle,
  FiSave,
  FiUsers,
  FiSearch,
  FiEye,
  FiEdit,
  FiTrash2,
  FiChevronDown,
  FiChevronRight,
  FiFolder,
  FiFile,
  FiCheckCircle,
  FiGrid,
  FiLock,
  FiGlobe,
} from "react-icons/fi";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";

export default function RoleBasedAccessControl({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role_id } = useParams();
  const API = import.meta.env.VITE_API_URL;
  const hasAddPermission = useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "add" });

  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [roles, setRoles] = useState([]);
  const [roleName, setRoleName] = useState("");
  const [parentRoles, setParentRoles] = useState([]);
  const [selectedParentRole, setSelectedParentRole] = useState(null);
  const [accessModulesByParent, setAccessModulesByParent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [viewRole, setViewRole] = useState(null);
  const [viewRoleLoading, setViewRoleLoading] = useState(false);

  // Scoped Role Hierarchies states
  const [countries, setCountries] = useState([]);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState("");
  const [useSameCountryRoleForAll, setUseSameCountryRoleForAll] = useState(true);
  const [selectedRoleCountry, setSelectedRoleCountry] = useState(null);

  // Multi-panel state for roles (supports objects with panel_id & saas_product_ids)
  const [allPanels, setAllPanels] = useState([]);
  const [deptPanels, setDeptPanels] = useState([]);
  const [selectedPanels, setSelectedPanels] = useState([]);

  const [editParentRoles, setEditParentRoles] = useState([]);

  const [editPopup, setEditPopup] = useState({
    isOpen: false,
    role: null,
    newName: "",
    newSelectedPanels: [], // Array of { panel_id, saas_product_ids: [] }
    useSameCountryRoleForAll: true,
    selectedRoleCountry: null,
    newDepartmentId: null,
    newLevelId: null,
    newParentRoleId: null
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState(null);
  const [filterLevel, setFilterLevel] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [updateConfirmation, setUpdateConfirmation] = useState({
    isOpen: false,
    role: null,
    newName: "",
    newSelectedPanels: [],
    useSameCountryRoleForAll: true,
    selectedRoleCountry: null,
    newDepartmentId: null,
    newLevelId: null,
    newParentRoleId: null,
    isLoading: false,
    otpMode: false,
    otp: "",
    title: "",
    message: "",
    confirmText: ""
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    role: null,
    isLoading: false,
  });

  const getDepartments = async (countryId) => {
    try {
      const url = `${API}/departments?unique_id=${moduleUniqueId}&req_for=view${countryId && countryId !== "global" ? `&country_id=${countryId}` : ''}`;
      const res = await axios.get(url, {
        headers: authHeaderObj()
      });
      setDepartments(res.data.data || []);
    } catch (error) {
      console.error("Error loading departments:", error);
      dispatch(
        setAlert({
          type: "error",
          message: "Failed to load departments.",
          duration: 4000
        })
      );
    }
  };

  const getLevels = async () => {
    try {
      const res = await axios.get(`${API}/roles/levels?unique_id=${moduleUniqueId}&req_for=add`, {
        headers: authHeaderObj()
      });
      setLevels(res.data.data || []);
    } catch (error) {
      console.error("Error fetching levels:", error);
      dispatch(
        setAlert({ type: "error", message: "Failed to load levels.", duration: 4000 })
      );
    }
  };

  const getActiveCountries = async () => {
    try {
      const res = await axios.get(`${API}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      const cList = res.data.countries || [];
      setCountries(cList);
      if (!selectedCountryFilter) {
        const defaultScope = cList.length > 0 ? (cList[0].id || cList[0]._id) : "global";
        setSelectedCountryFilter(defaultScope);
      }
    } catch (error) {
      console.error("Error loading countries:", error);
      if (!selectedCountryFilter) setSelectedCountryFilter("global");
    }
  };

  const getPanelsWithProducts = async () => {
    try {
      const res = await axios.get(`${API}/panels?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj()
      });
      setAllPanels(res.data.data || []);
    } catch (error) {
      console.error("Error loading panels with products:", error);
    }
  };

  const getRoles = async () => {
    if (!selectedCountryFilter) {
      setRoles([]);
      setFetching(false);
      return;
    }
    try {
      setFetching(true);
      const url = `${API}/roles?unique_id=${moduleUniqueId}&req_for=view${selectedCountryFilter && selectedCountryFilter !== "global" ? `&country_id=${selectedCountryFilter}` : ''}`;
      const res = await axios.get(url, {
        headers: authHeaderObj()
      });
      setRoles(res.data.data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setFetching(false);
    }
  };

  const getParentRoles = async () => {
    if (!selectedDepartment || !selectedLevel) {
      setParentRoles([]);
      return;
    }

    try {
      const queryCountryId = useSameCountryRoleForAll ? null : selectedRoleCountry;
      const url = `${API}/roles/${selectedDepartment}/${selectedLevel}?unique_id=${moduleUniqueId}&req_for=view${queryCountryId ? `&country_id=${queryCountryId}` : ''}`;
      const res = await axios.get(url, { headers: authHeaderObj() });

      setParentRoles(
        res.data.data?.map((role) => ({
          value: role.id,
          text: <>
            <h6 className="capitalize font-bold text-md">{role.name}</h6>
            <p className="text-xs capitalize">{role.department_name} - {role.level_name}</p>
          </>
        })) || []
      );

    } catch (error) {
      console.error("Error fetching parent roles:", error);
    }
  };

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
        navigate('/admin-panel/settings/role-based-access-control/role-settings');
      }
    } finally {
      setViewRoleLoading(false);
    }
  };

  useEffect(() => {
    if (role_id) {
      getRoleDetails(role_id);
    } else {
      getLevels();
      getActiveCountries();
      getPanelsWithProducts();
    }
  }, [role_id]);

  useEffect(() => {
    if (!role_id) {
      getRoles();
      getDepartments(selectedCountryFilter);
    }
  }, [selectedCountryFilter]);

  useEffect(() => {
    setSelectedParentRole(null);
    getParentRoles();
  }, [selectedDepartment, selectedLevel, selectedRoleCountry, useSameCountryRoleForAll]);

  // When selected department changes, load its allowed panels and reset selected scope level
  useEffect(() => {
    setSelectedLevel(null);
    setUseSameCountryRoleForAll(true);
    if (selectedCountryFilter && selectedCountryFilter !== "global") {
      setSelectedRoleCountry(selectedCountryFilter);
    } else {
      setSelectedRoleCountry(null);
    }
    if (selectedDepartment) {
      const dept = departments.find(d => d.id === selectedDepartment);
      setDeptPanels(dept?.panels || []);
      setSelectedPanels([]);
    } else {
      setDeptPanels([]);
      setSelectedPanels([]);
    }
  }, [selectedDepartment, departments, selectedCountryFilter]);

  const selectedDepartmentObj = useMemo(() => {
    return departments.find(d => d.id === selectedDepartment);
  }, [selectedDepartment, departments]);

  const selectedLevelObj = useMemo(() => {
    return levels.find(l => l.id === selectedLevel);
  }, [selectedLevel, levels]);

  const selectedRoleCountryOptions = useMemo(() => {
    if (!selectedDepartmentObj || selectedDepartmentObj.level !== 'country') return [];
    if (!selectedDepartmentObj.country_ids) return [];
    return countries
      .filter(c => selectedDepartmentObj.country_ids.includes(c.id || c._id))
      .map(c => ({ value: c.id || c._id, text: c.name }));
  }, [selectedDepartmentObj, countries]);

  // Enforce geographical levels rule: global level departments can only have global roles, country level departments cannot have global levels
  const filteredLevelsOptions = useMemo(() => {
    if (selectedDepartmentObj?.level === 'global') {
      return levels
        .filter(l => l.name?.toLowerCase() === 'global')
        .map(l => ({ value: l.id, text: <span className="capitalize">{l.name}</span> }));
    }
    if (selectedDepartmentObj?.level === 'country') {
      return levels
        .filter(l => l.name?.toLowerCase() !== 'global')
        .map(l => ({ value: l.id, text: <span className="capitalize">{l.name}</span> }));
    }
    return levels.map(l => ({ value: l.id, text: <span className="capitalize">{l.name}</span> }));
  }, [selectedDepartmentObj, levels]);

  const handleLevelChange = (levelId) => {
    setSelectedLevel(levelId);
    const selectedLevelObj = levels.find(l => l.id === levelId);
    const isSubCountryRole = selectedLevelObj && selectedLevelObj.scope_priority > 2;

    if (isSubCountryRole) {
      setUseSameCountryRoleForAll(false);
      if (!selectedRoleCountry && selectedCountryFilter && selectedCountryFilter !== "global") {
        setSelectedRoleCountry(selectedCountryFilter);
      }
    } else if (selectedLevelObj?.name?.toLowerCase() === 'global') {
      setUseSameCountryRoleForAll(true);
      setSelectedRoleCountry(null);
    }
  };

  const handleCreateRole = async () => {
    if (!roleName.trim()) {
      return dispatch(setAlert({ type: "warning", message: "Please enter a role name." }));
    }
    if (!selectedDepartment) {
      return dispatch(setAlert({ type: "warning", message: "Please select a department." }));
    }
    if (selectedDepartmentObj?.level === 'country' && !useSameCountryRoleForAll && !selectedRoleCountry) {
      return dispatch(setAlert({ type: "warning", message: "Please select a specific country for this role." }));
    }
    if (!selectedLevel) {
      return dispatch(setAlert({ type: "warning", message: "Please select a level." }));
    }
    if (selectedPanels.length === 0) {
      return dispatch(setAlert({ type: "warning", message: "Please select at least one panel scope." }));
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/roles?unique_id=${moduleUniqueId}&req_for=add`,
        {
          name: roleName.trim(),
          department_id: selectedDepartment,
          level_id: selectedLevel,
          parent_role_id: selectedParentRole,
          panels: selectedPanels,
          country_id: useSameCountryRoleForAll ? null : selectedRoleCountry,
          access_modules_by_parent: selectedParentRole ? accessModulesByParent : null
        },
        { headers: authHeaderObj() }
      );

      dispatch(
        setAlert({
          type: "success",
          message: res.data.message || "Role created successfully!",
          duration: 3000
        })
      );

      setRoleName("");
      setSelectedDepartment(null);
      setSelectedLevel(null);
      setSelectedParentRole(null);
      setSelectedPanels([]);
      setUseSameCountryRoleForAll(true);
      if (selectedCountryFilter && selectedCountryFilter !== "global") {
        setSelectedRoleCountry(selectedCountryFilter);
      } else {
        setSelectedRoleCountry(null);
      }
      setAccessModulesByParent(false);
      getRoles();
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to create role.",
          duration: 4000
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const getEditParentRoles = async (deptId, levelId, countryId, excludeRoleId) => {
    if (!deptId || !levelId) {
      setEditParentRoles([]);
      return;
    }
    try {
      const url = `${API}/roles/${deptId}/${levelId}?unique_id=${moduleUniqueId}&req_for=view${countryId ? `&country_id=${countryId}` : ''}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      setEditParentRoles(
        res.data.data
          ?.filter(role => role.id !== excludeRoleId)
          ?.map((role) => ({
            value: role.id,
            text: (
              <div className="text-left py-1">
                <h6 className="capitalize font-bold text-md text-text">{role.name}</h6>
                <p className="text-xs text-text-muted capitalize">{role.department_name} - {role.level_name}</p>
              </div>
            )
          })) || []
      );
    } catch (error) {
      console.error("Error fetching edit parent roles:", error);
    }
  };

  useEffect(() => {
    if (editPopup.isOpen && editPopup.newDepartmentId && editPopup.newLevelId) {
      getEditParentRoles(
        editPopup.newDepartmentId,
        editPopup.newLevelId,
        editPopup.useSameCountryRoleForAll ? null : editPopup.selectedRoleCountry,
        editPopup.role?.id
      );
    }
  }, [
    editPopup.isOpen,
    editPopup.newDepartmentId,
    editPopup.newLevelId,
    editPopup.selectedRoleCountry,
    editPopup.useSameCountryRoleForAll,
    editPopup.role?.id
  ]);

  const handleEditDepartmentChange = (deptId) => {
    setEditPopup(prev => {
      const targetDept = departments.find(d => d.id === deptId);
      const allowedPanelIds = (targetDept?.panels || []).map(p => p.id || p._id);
      const newSelectedPanels = prev.newSelectedPanels.filter(p => allowedPanelIds.includes(p.panel_id));
      
      let useSameCountry = prev.useSameCountryRoleForAll;
      let selectedCountry = prev.selectedRoleCountry;

      if (targetDept?.level === 'global') {
        useSameCountry = true;
        selectedCountry = null;
      } else {
        selectedCountry = selectedCountryFilter && selectedCountryFilter !== "global" ? selectedCountryFilter : null;
      }
      
      return {
        ...prev,
        newDepartmentId: deptId,
        useSameCountryRoleForAll: useSameCountry,
        selectedRoleCountry: selectedCountry,
        newParentRoleId: "",
        newSelectedPanels
      };
    });
  };

  const handleEditLevelChange = (levelId) => {
    setEditPopup(prev => {
      const selectedLevelObj = levels.find(l => l.id === levelId);
      const isSubCountryRole = selectedLevelObj && selectedLevelObj.scope_priority > 2;

      let useSameCountry = prev.useSameCountryRoleForAll;
      let selectedCountry = prev.selectedRoleCountry;

      if (isSubCountryRole) {
        useSameCountry = false;
        selectedCountry = selectedCountryFilter && selectedCountryFilter !== "global" ? selectedCountryFilter : null;
      } else if (selectedLevelObj?.name?.toLowerCase() === 'global') {
        useSameCountry = true;
        selectedCountry = null;
      }

      return {
        ...prev,
        newLevelId: levelId,
        useSameCountryRoleForAll: useSameCountry,
        selectedRoleCountry: selectedCountry,
        newParentRoleId: ""
      };
    });
  };

  const handleEditUseSameCountryToggle = (checked) => {
    setEditPopup(prev => {
      const countryId = checked ? null : (selectedCountryFilter && selectedCountryFilter !== "global" ? selectedCountryFilter : null);
      return {
        ...prev,
        useSameCountryRoleForAll: checked,
        selectedRoleCountry: countryId,
        newParentRoleId: ""
      };
    });
  };

  const handleEditRole = (role) => {
    if (role.is_protected) {
      return dispatch(setAlert({ type: "warning", message: "Protected system records cannot be edited." }));
    }
    
    const mapped = role.panels?.map(p => ({
      panel_id: p.id,
      saas_product_ids: p.saas_product_ids || []
    })) || [];

    // Prepopulate parent role dropdown to show the current parent role instantly
    if (role.parent_role_id) {
      setEditParentRoles([{
        value: role.parent_role_id,
        text: (
          <div className="text-left py-1">
            <h6 className="capitalize font-bold text-md text-text">{role.parent_role_name || 'Parent Role'}</h6>
            <p className="text-xs text-text-muted capitalize">Current Parent</p>
          </div>
        )
      }]);
    } else {
      setEditParentRoles([]);
    }

    setEditPopup({
      isOpen: true,
      role: role,
      newName: role.name,
      newSelectedPanels: mapped,
      useSameCountryRoleForAll: !role.country_id,
      selectedRoleCountry: role.country_id || null,
      newDepartmentId: role.department_id,
      newLevelId: role.level_id,
      newParentRoleId: role.parent_role_id || ""
    });
  };

  const handleEditSubmit = () => {
    if (!editPopup.newName.trim()) {
      return dispatch(setAlert({ type: "warning", message: "Please enter a role name." }));
    }
    if (!editPopup.newDepartmentId) {
      return dispatch(setAlert({ type: "warning", message: "Please select a department scope." }));
    }
    if (!editPopup.newLevelId) {
      return dispatch(setAlert({ type: "warning", message: "Please select a scope level." }));
    }
    if (!editPopup.newParentRoleId) {
      return dispatch(setAlert({ type: "warning", message: "Please select a parent role scope." }));
    }
    if (editPopup.newSelectedPanels.length === 0) {
      return dispatch(setAlert({ type: "warning", message: "Please assign at least one panel scope." }));
    }

    const deptObj = departments.find(d => d.id === editPopup.newDepartmentId);
    const isCountryLevelDept = deptObj?.level === 'country';
    const selectedLevelObj = levels.find(l => l.id === editPopup.newLevelId);
    const isCountryLevelRole = selectedLevelObj?.name?.toLowerCase() === 'country';
    const isSubCountryRole = selectedLevelObj && selectedLevelObj.scope_priority > 2;

    if (isCountryLevelDept && (isCountryLevelRole || isSubCountryRole) && !editPopup.useSameCountryRoleForAll && !editPopup.selectedRoleCountry) {
      return dispatch(setAlert({ type: "warning", message: "Please select a specific country for this role." }));
    }

    setEditPopup(prev => ({ ...prev, isOpen: false }));

    setUpdateConfirmation({
      isOpen: true,
      role: editPopup.role,
      newName: editPopup.newName.trim(),
      newSelectedPanels: editPopup.newSelectedPanels,
      useSameCountryRoleForAll: editPopup.useSameCountryRoleForAll,
      selectedRoleCountry: editPopup.selectedRoleCountry,
      newDepartmentId: editPopup.newDepartmentId,
      newLevelId: editPopup.newLevelId,
      newParentRoleId: editPopup.newParentRoleId,
      isLoading: false,
      otpMode: false,
      otp: "",
      title: `Update Role "${editPopup.role.name}"`,
      message: "Are you sure you want to update this role? This action requires OTP verification.",
      confirmText: "Yes, Update",
      variant: "warning"
    });
  };

  const confirmUpdateRole = async (otp = "") => {
    if (!updateConfirmation.role) return;

    setUpdateConfirmation(prev => ({ ...prev, isLoading: true }));

    try {
      if (!updateConfirmation.otpMode) {
        await axios.get(
          `${API}/roles/update-otp/${updateConfirmation.role.id}?unique_id=${moduleUniqueId}&req_for=add`,
          { headers: authHeaderObj() }
        );

        dispatch(
          setAlert({
            type: "success",
            message: "OTP sent to your registered email.",
            duration: 3000
          })
        );

        setUpdateConfirmation(prev => ({
          ...prev,
          otpMode: true,
          isLoading: false,
          message: "Please enter the OTP sent to your email to confirm the update.",
          confirmText: "Confirm & Update"
        }));
        return;
      }

      const res = await axios.put(
        `${API}/roles/${updateConfirmation.role.id}?unique_id=${moduleUniqueId}&req_for=edit`,
        {
          name: updateConfirmation.newName,
          panels: updateConfirmation.newSelectedPanels,
          country_id: updateConfirmation.useSameCountryRoleForAll ? null : updateConfirmation.selectedRoleCountry,
          department_id: updateConfirmation.newDepartmentId,
          level_id: updateConfirmation.newLevelId,
          parent_role_id: updateConfirmation.newParentRoleId,
          otp
        },
        { headers: authHeaderObj() }
      );

      dispatch(
        setAlert({
          type: "success",
          message: res.data.message || "Role updated successfully!",
          duration: 3000
        })
      );

      handleCancelUpdate();
      await getRoles();

    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to update role.",
          duration: 4000
        })
      );
      setUpdateConfirmation(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelUpdate = () => {
    setUpdateConfirmation({
      isOpen: false,
      role: null,
      newName: "",
      newSelectedPanels: [],
      useSameCountryRoleForAll: true,
      selectedRoleCountry: null,
      newDepartmentId: null,
      newLevelId: null,
      newParentRoleId: null,
      isLoading: false,
      otpMode: false,
      otp: "",
      title: "",
      message: "",
      confirmText: ""
    });
  };

  const handleDeleteRoleClick = (role) => {
    setDeleteConfirmation({
      isOpen: true,
      role,
      isLoading: false,
    });
  };

  const confirmDeleteRole = async () => {
    if (!deleteConfirmation.role) return;
    setDeleteConfirmation(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await axios.delete(
        `${API}/roles/${deleteConfirmation.role.id}?unique_id=${moduleUniqueId}&req_for=edit`,
        { headers: authHeaderObj() }
      );
      dispatch(
        setAlert({
          type: "success",
          message: res.data?.message || "Role deleted successfully!",
          duration: 3000
        })
      );
      setDeleteConfirmation({ isOpen: false, role: null, isLoading: false });
      await getRoles();
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to delete role.",
          duration: 4000
        })
      );
      setDeleteConfirmation(prev => ({ ...prev, isLoading: false }));
    }
  };

  const togglePanelSelection = (pid) => {
    setSelectedPanels(prev => {
      const exists = prev.find(x => x.panel_id === pid);
      if (exists) {
        return prev.filter(x => x.panel_id !== pid);
      } else {
        return [...prev, { panel_id: pid, saas_product_ids: [] }];
      }
    });
  };

  const updatePanelProducts = (pid, productIds) => {
    setSelectedPanels(prev =>
      prev.map(item =>
        item.panel_id === pid ? { ...item, saas_product_ids: productIds } : item
      )
    );
  };

  const toggleEditPanelSelection = (pid) => {
    setEditPopup(prev => {
      const exists = prev.newSelectedPanels.find(x => x.panel_id === pid);
      if (exists) {
        return {
          ...prev,
          newSelectedPanels: prev.newSelectedPanels.filter(x => x.panel_id !== pid)
        };
      } else {
        return {
          ...prev,
          newSelectedPanels: [...prev.newSelectedPanels, { panel_id: pid, saas_product_ids: [] }]
        };
      }
    });
  };

  const filteredRoles = roles.filter((role) => {
    const matchesSearch = role.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment ? role.department_id === filterDepartment : true;
    const matchesLevel = filterLevel ? role.level_id === filterLevel : true;
    return matchesSearch && matchesDepartment && matchesLevel;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setFilterDepartment(null);
    setFilterLevel(null);
  };

  // Pagination Logic
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDepartment, filterLevel]);

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRoles = filteredRoles.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  // --- Tree Rendering Logic ---
  const buildRoleTree = (rolesList) => {
    const map = {};
    const roots = [];

    rolesList.forEach(r => {
      map[r.id] = { ...r, children: [] };
    });

    rolesList.forEach(r => {
      if (r.parent_role_id && map[r.parent_role_id]) {
        map[r.parent_role_id].children.push(map[r.id]);
      } else {
        roots.push(map[r.id]);
      }
    });

    return roots;
  };

  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const RoleTreeItem = ({ node, depth = 0 }) => {
    const isExpanded = expandedNodes.has(node.id) || !!searchQuery || !!filterDepartment || !!filterLevel;
    const hasChildren = node.children && node.children.length > 0;
    const indent = depth * 24;

    return (
      <div className="flex flex-col">
        <div
          className={`group flex items-center py-3 px-4 border-b border-border/40 hover:bg-primary/5 transition-all duration-200 ${depth > 0 ? 'bg-surface/30' : ''}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0" style={{ paddingLeft: `${indent}px` }}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-primary/10 text-text-secondary transition-colors"
              >
                {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center text-text-muted">
                <FiFile size={14} />
              </div>
            )}

            <div className="flex items-center gap-2 min-w-0 flex-1">
              {hasChildren && <FiFolder className="text-blue-600 shrink-0" size={16} />}
              <span className={`font-bold ${depth === 0 ? 'text-slate-900 text-sm' : 'text-slate-700 text-xs'} inline-flex items-center gap-1.5`}>
                {node.name || node.role_name || 'Unnamed Role'}
                {node.is_protected && (
                  <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md">
                    System
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center shrink-0">
            <div className="w-48 px-2 text-sm text-text-secondary truncate">{node.department_name || '-'}</div>
            <div className="w-32 px-2 text-sm text-text-secondary capitalize truncate">{node.level_name || '-'}</div>
            <div className="w-32 px-2 text-xs text-text-muted truncate" title={node.panel_names}>{node.panel_names || 'None'}</div>
            <div className="w-24 px-2 text-center">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                {node.assigned_modules_count ?? 0}
              </span>
            </div>
            <div className="w-56 flex items-center justify-end gap-2 pl-4">
              <button
                type="button"
                onClick={() => navigate(`/admin-panel/settings/role-settings/role-based-access-control/role/${node.id}`)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-info/10 hover:bg-info/20 text-info transition-colors flex items-center gap-1 cursor-pointer border border-info/30"
                title="Configure permissions & authorization rules"
              >
                <FiEye size={13} />
                <span>Rules</span>
              </button>
              {!node.is_protected ? (
                <>
                  <IconButton
                    variant="ghost"
                    onClick={() => handleEditRole(node)}
                    size="sm"
                    className="text-primary hover:bg-primary/10"
                    title="Edit role name & scope"
                  >
                    <FiEdit size={15} />
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    onClick={() => handleDeleteRoleClick(node)}
                    size="sm"
                    className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                    title="Delete role"
                  >
                    <FiTrash2 size={15} />
                  </IconButton>
                </>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 cursor-not-allowed" title="Protected root system role.">
                  <FiLock size={14} />
                </div>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="relative">
            <div
              className="absolute left-0 top-0 bottom-0 border-l border-primary/20"
              style={{ left: `${indent + 11}px` }}
            />
            {node.children.map(child => (
              <RoleTreeItem key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const getFilteredTree = (flatList, query, dept, level) => {
    const activeDeptIds = departments.map(d => d.id);
    const activeList = flatList.filter(r => {
      const deptId = r.department_id?._id || r.department_id?.id || r.department_id;
      return deptId && activeDeptIds.includes(String(deptId));
    });

    const tree = buildRoleTree(activeList);
    if (!query && !dept && !level) return tree;

    const filterNodes = (nodes) => {
      return nodes.reduce((acc, node) => {
        const filteredChildren = filterNodes(node.children);
        const matchesQuery = !query || node.name.toLowerCase().includes(query.toLowerCase());
        const matchesDept = !dept || node.department_id === dept;
        const matchesLevel = !level || node.level_id === level;

        if ((matchesQuery && matchesDept && matchesLevel) || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, []);
    };

    return filterNodes(tree);
  };

  if (fetching) return <Loader text="Loading role settings..." />;

  const isFormValid = roleName.trim() && selectedDepartment && selectedLevel && selectedPanels.length > 0;

  return (
    <div className="min-h-screen space-y-6 pb-12 text-sm lg:text-base">
      <PageHeader
        title="Role Settings"
        subtitle="Provision and manage system roles within geographical department boundaries."
        icon={FiShield}
        stats={[
          { label: "Total Roles", value: roles.length.toString(), description: "System roles" },
          { label: "Departments", value: departments.length.toString(), description: "Configured scopes" },
          { label: "Protected", value: roles.filter(r => r.is_protected).length.toString(), description: "Protected roles" }
        ]}
      />

      <div className={`grid grid-cols-1 ${hasAddPermission ? 'xl:grid-cols-12' : ''} gap-6`}>
        {/* CREATE ROLE FORM */}
        {hasAddPermission && (
          <div className="xl:col-span-4">
            {!selectedCountryFilter ? (
              <div className="card shadow-sm border border-border rounded-3xl bg-surface/50 p-8 flex flex-col items-center justify-center text-center h-[500px]">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <FiGlobe size={24} />
                </div>
                <h3 className="font-black text-text-primary text-lg uppercase tracking-tight mb-2">Select Scope First</h3>
                <p className="text-sm text-text-muted max-w-[280px]">Select a country or global scope from the filter in the registry to begin provisioning roles.</p>
              </div>
            ) : (
              <div className="card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-full flex flex-col bg-surface border border-border rounded-3xl">
                <div className="p-8 border-b border-border bg-linear-120 from-primary/5 to-transparent flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white">
                    <FiPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-text-primary text-2xl uppercase tracking-tight leading-none mb-1.5">New Role</h2>
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] leading-none opacity-60">Authorize Role Scope</p>
                  </div>
                </div>

                <div className="p-8 space-y-8 flex-1">
                  <div className="space-y-4">
                    <CustomInput
                      label="Role Name *"
                      placeholder="e.g. Area Operations Lead"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      className="w-full !rounded-xl"
                      leftIcon={<FiShield className="text-primary/40" />}
                    />
                  </div>

                  <div className="space-y-4">
                    <DropdownWithSearchInput
                      label="Select Department *"
                      options={
                        selectedCountryFilter === "global"
                          ? departments.filter(d => d.level === "global").map(d => ({ value: d.id, text: d.name }))
                          : departments.filter(d => d.level === "country" && (d.country_ids?.includes(selectedCountryFilter) || String(d.country_id) === String(selectedCountryFilter))).map(d => ({ value: d.id, text: d.name }))
                      }
                      value={selectedDepartment}
                      onChange={setSelectedDepartment}
                      placeholder="Select department scope..."
                      className="w-full"
                    />
                    {selectedDepartmentObj && (
                      <div className="px-3.5 py-2.5 bg-bg/50 border border-border/80 rounded-xl flex flex-col gap-2 align-start text-left">
                        <div className="flex items-center gap-2">
                          <FiGlobe className="text-primary" size={14} />
                          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            Scope: {selectedDepartmentObj.level === 'global' ? 'Global Node' : `Country node (${selectedDepartmentObj.country_name || 'Active'})`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                <div className="space-y-4">
                  <DropdownWithSearchInput
                    label="Select Scope Level *"
                    options={filteredLevelsOptions}
                    value={selectedLevel}
                    onChange={handleLevelChange}
                    placeholder={selectedDepartment ? "Select level..." : "Select department first"}
                    className="w-full"
                    disabled={!selectedDepartment}
                  />
                  {selectedDepartmentObj && selectedDepartmentObj.level === 'country' && selectedLevelObj?.name?.toLowerCase() === 'country' && (
                    <div className="space-y-4 pt-2">
                      <ToggleButton
                        label="Universal Country-level Role"
                        checked={useSameCountryRoleForAll}
                        onChange={setUseSameCountryRoleForAll}
                        description="When enabled, this role will be active across all countries configured for this department. Disable to restrict this role to a specific country."
                      />
                    </div>
                  )}
                </div>

                {/* Parent Role selection */}
                {selectedDepartment && selectedLevel && (
                  <div className="space-y-4">
                    <DropdownWithSearchInput
                      label="Select Parent Role (Hierarchy) *"
                      options={parentRoles}
                      value={selectedParentRole}
                      onChange={setSelectedParentRole}
                      placeholder="Select parent role..."
                      className="w-full"
                    />
                    {selectedParentRole && (
                      <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                        <ToggleButton
                          label="Allow parent role to inherit permissions"
                          checked={accessModulesByParent}
                          onChange={setAccessModulesByParent}
                          description="When enabled, parent role members inherit all accessible modules defined on this node."
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Panel Selection matching department's panels */}
                {selectedDepartment && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 text-left block">Assigned Panel Scopes *</label>
                    {deptPanels.length === 0 ? (
                      <p className="text-xs text-warning font-semibold text-left">No panels associated with this department node. Map panels in Department Settings first.</p>
                    ) : (
                      <div className="space-y-4">
                        <MultiSelectDropdownWithSearchInput
                          values={selectedPanels.map(p => p.panel_id)}
                          onChange={(pids) => {
                            setSelectedPanels(prev => {
                              return pids.map(pid => {
                                const existing = prev.find(x => x.panel_id === pid);
                                return existing || { panel_id: pid, saas_product_ids: [] };
                              });
                            });
                          }}
                          options={deptPanels.map(p => ({ value: p.id || p._id, text: p.name }))}
                          placeholder="Select panels..."
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Validation Status Banner */}
                <div className={`rounded-2xl p-4 border transition-all duration-500 flex items-center gap-4 ${isFormValid ? "bg-success/5 border-success/30" : "bg-bg/30 border-border/50"}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-2xl transition-all duration-500 ${isFormValid ? "bg-success text-white scale-110" : "bg-border/30 text-text-muted"}`}>
                    {isFormValid ? <FiCheckCircle size={24} /> : <FiAlertCircle size={24} />}
                  </div>
                  <div>
                    <p className={`font-black text-[12px] uppercase tracking-widest leading-none mb-1.5 ${isFormValid ? "text-success" : "text-text-primary"}`}>
                      {isFormValid ? "Ready to Provision" : "Details Pending"}
                    </p>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none opacity-60">
                      {isFormValid ? "Access scopes aligned" : "Required scopes pending"}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleCreateRole}
                  disabled={loading || !isFormValid}
                  className="w-full h-14 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] shadow-2xl bg-linear-120 from-primary to-primary-end flex items-center justify-center gap-3"
                  leftIcon={<FiSave size={20} />}
                >
                  {loading ? "Creating..." : "Provision Role"}
                </Button>
              </div>
            </div>
          )}
          </div>
        )}

        {/* ROLES TREE REGISTRY */}
        <div className={hasAddPermission ? "xl:col-span-8" : "xl:col-span-12"}>
          <div className="card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-full flex flex-col bg-surface border border-border rounded-3xl min-h-[500px]">
            <div className="p-6 border-b border-border bg-linear-120 from-primary/5 to-transparent flex flex-col lg:flex-row lg:flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                  <FiUsers size={20} />
                </div>
                <div>
                  <h3 className="font-black text-text-primary text-base tracking-tight leading-none mb-1 uppercase">Roles Hierarchy Registry</h3>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-none">Access Control scopes</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search roles..."
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-[13px] font-medium"
                  />
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                </div>
                <DropdownWithSearchInput
                  options={[
                    { value: "global", text: "Global Scope" },
                    ...countries.map(c => ({ value: c.id || c._id, text: c.name }))
                  ]}
                  value={selectedCountryFilter}
                  onChange={setSelectedCountryFilter}
                  placeholder="Select Scope"
                  className="w-full sm:w-48"
                />
                <DropdownWithSearchInput
                  options={[
                    { value: "", text: "All Departments" },
                    ...departments.map(d => ({ value: d.id, text: d.name }))
                  ]}
                  value={filterDepartment || ""}
                  onChange={(val) => setFilterDepartment(val || null)}
                  placeholder="Department Filter"
                  className="w-full sm:w-44"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto p-6">
              {!selectedCountryFilter ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary border-2 border-dashed border-border rounded-xl">
                  <FiGlobe className="w-16 h-16 mb-4 text-text-muted/40 animate-pulse" />
                  <p className="text-lg font-black uppercase tracking-wider">No Scope Selected</p>
                  <p className="text-sm mt-1 font-medium">Please select a country or global scope from the filter dropdown above to view the active role hierarchy.</p>
                </div>
              ) : filteredRoles.length > 0 ? (
                <div className="border border-border/60 rounded-2xl overflow-hidden bg-surface/20">
                  <div className="hidden lg:flex items-center py-4 px-4 bg-bg/20 border-b border-border font-black text-[10px] text-text-secondary uppercase tracking-wider">
                    <div className="flex-1">Role Node & Hierarchy</div>
                    <div className="w-48 px-2">Department Node</div>
                    <div className="w-32 px-2">Level Node</div>
                    <div className="w-32 px-2">Panel Scopes</div>
                    <div className="w-24 px-2 text-center">Modules</div>
                    <div className="w-56 text-right pr-4">Rules & Operations</div>
                  </div>
                  <div className="divide-y divide-border/40">
                    {getFilteredTree(roles, searchQuery, filterDepartment, filterLevel).map(node => (
                      <RoleTreeItem key={node.id} node={node} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary border-2 border-dashed border-border rounded-xl">
                  <FiShield className="w-16 h-16 mb-4 text-text-muted/40" />
                  <p className="text-lg font-black uppercase tracking-wider">No Roles Configured</p>
                  <p className="text-sm mt-1 font-medium">Verify search filters or provision your first department role node.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-bg/10">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredRoles.length}
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
        onConfirm={confirmUpdateRole}
        onCancel={handleCancelUpdate}
        variant={updateConfirmation.variant || "warning"}
        isLoading={updateConfirmation.isLoading}
        confirmText={updateConfirmation.confirmText}
        cancelText={updateConfirmation.otpMode ? "Cancel" : "No, Keep"}
        otp={updateConfirmation.otp}
        onOtpChange={(otp) => setUpdateConfirmation(prev => ({ ...prev, otp }))}
      />

      {/* Delete Role confirmation */}
      <ConfirmationPopup
        isOpen={deleteConfirmation.isOpen}
        title={`Delete Role "${deleteConfirmation.role?.name}"?`}
        message={`Are you sure you want to delete this role? Active users assigned to this role must be reassigned first.`}
        mode="text"
        onConfirm={confirmDeleteRole}
        onCancel={() => setDeleteConfirmation({ isOpen: false, role: null, isLoading: false })}
        variant="danger"
        isLoading={deleteConfirmation.isLoading}
        confirmText="Yes, Delete Role"
        cancelText="Cancel"
      />

      {/* Edit Role popup with Multi-panel updates */}
      <ConfirmationPopup
        isOpen={editPopup.isOpen}
        title="Update Role Scope Node"
        message="Update the role parameters and Panel boundaries."
        mode="custom"
        variant="primary"
        onConfirm={handleEditSubmit}
        onCancel={() => setEditPopup(prev => ({ ...prev, isOpen: false }))}
        confirmText="Save Scope"
        cancelText="Discard"
        customContent={
          <div className="space-y-6 pt-4 text-left max-h-[50vh] overflow-y-auto pr-2">
            <CustomInput
              label="Role Name"
              value={editPopup.newName}
              onChange={(e) => setEditPopup(prev => ({ ...prev, newName: e.target.value }))}
              placeholder="Enter role name"
              className="w-full"
            />

            <DropdownWithSearchInput
              label="Select Department *"
              options={
                selectedCountryFilter === "global"
                  ? departments.filter(d => d.level === "global").map(d => ({ value: d.id, text: d.name }))
                  : departments.filter(d => d.level === "country" && (d.country_ids?.includes(selectedCountryFilter) || String(d.country_id) === String(selectedCountryFilter))).map(d => ({ value: d.id, text: d.name }))
              }
              value={editPopup.newDepartmentId}
              onChange={handleEditDepartmentChange}
              placeholder="Select department scope..."
              className="w-full"
            />

            <DropdownWithSearchInput
              label="Select Level *"
              options={levels.map(l => ({ value: l.id, text: l.name }))}
              value={editPopup.newLevelId}
              onChange={handleEditLevelChange}
              placeholder="Select administrative level scope..."
              className="w-full"
            />

            <DropdownWithSearchInput
              label="Select Parent Role *"
              options={editParentRoles}
              value={editPopup.newParentRoleId}
              onChange={(val) => setEditPopup(prev => ({ ...prev, newParentRoleId: val }))}
              placeholder="Select parent role..."
              className="w-full"
            />

            {/* Universal Country-level Role toggle for country-level roles */}
            {(() => {
              const deptObj = departments.find(d => d.id === editPopup.newDepartmentId);
              const isCountryLevelDept = deptObj?.level === 'country';
              const selectedLevelObj = levels.find(l => l.id === editPopup.newLevelId);
              const isCountryLevelRole = selectedLevelObj?.name?.toLowerCase() === 'country';
              
              if (isCountryLevelDept && isCountryLevelRole) {
                return (
                  <div className="space-y-4 border-t border-border pt-4">
                    <ToggleButton
                      label="Universal Country-level Role"
                      checked={editPopup.useSameCountryRoleForAll}
                      onChange={handleEditUseSameCountryToggle}
                      description="When enabled, this role will be active across all countries configured for this department. Disable to restrict this role to a specific country."
                    />
                  </div>
                );
              }
              return null;
            })()}

            {/* Panel Selection limited to department allowed panels */}
            {editPopup.role && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 text-left block">Assigned Panel Scopes *</label>
                  <MultiSelectDropdownWithSearchInput
                    values={editPopup.newSelectedPanels.map(p => p.panel_id)}
                    onChange={(pids) => setEditPopup(prev => ({
                      ...prev,
                      newSelectedPanels: pids.map(pid => {
                        const existing = prev.newSelectedPanels.find(x => x.panel_id === pid);
                        return existing || { panel_id: pid, saas_product_ids: [] };
                      })
                    }))}
                    options={(departments.find(d => d.id === (editPopup.newDepartmentId || editPopup.role.department_id))?.panels || []).map(p => ({ value: p.id || p._id, text: p.name }))}
                    placeholder="Select panels..."
                  />
                </div>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}