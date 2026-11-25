import { useState, useEffect } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import Dialog from "@/components/Dialog";
import CustomInput from "@/components/CustomInput";
import { authHeaderObj } from "@/app/authHeader";
import {
  FaPlus, FaCheckCircle, FaChevronRight,
  FaLayerGroup, FaStar, FaProjectDiagram,
  FaHistory, FaSlidersH, FaBoxOpen,
  FaImage, FaEdit, FaBuilding
} from "react-icons/fa";
import CustomFilePicker from "@/components/CustomFilePicker";

const CONFIG_LEVELS = [
  { id: "industryType", label: "Industry Type", icon: <FaBuilding />, parentId: null },
  { id: "category", label: "Project Category", icon: <FaBoxOpen />, parentId: "industryType" },
  { id: "subcategory", label: "Sub-Category", icon: <FaLayerGroup />, parentId: "category" },
  { id: "type", label: "System Type", icon: <FaProjectDiagram />, parentId: "subcategory" },
  { id: "projectRange", label: "Capacity Range", icon: <FaSlidersH />, parentId: "type" },
];

const API_URL = import.meta.env.VITE_API_URL;

export default function ProjectTypes({ moduleUniqueId }) {
  const dispatch = useDispatch();

  // Store selectable options for each level
  const [options, setOptions] = useState({
    industryType: [],
    category: [],
    subcategory: [],
    type: [],
    projectRange: [],
  });

  const [selectedValues, setSelectedValues] = useState({
    industryType: "",
    category: "",
    subcategory: "",
    type: "",
    projectRange: "",
  });

  // Modal State
  const [addingForLevel, setAddingForLevel] = useState(null);
  const [editingForLevel, setEditingForLevel] = useState(null);
  const [editingOptionId, setEditingOptionId] = useState(null);
  const [subcategoryImage, setSubcategoryImage] = useState(null);
  const [existingSubcategoryImage, setExistingSubcategoryImage] = useState(null);
  const [subcategoryColor, setSubcategoryColor] = useState("#2f4cbd");
  const [isSaving, setIsSaving] = useState(false);
  const [hierarchy, setHierarchy] = useState([]);

  // Modal Fields
  const [newOptionText, setNewOptionText] = useState("");
  const [newMin, setNewMin] = useState("");
  const [newMax, setNewMax] = useState("");

  // Type mapping states
  const [allTypes, setAllTypes] = useState([]);
  const [selectedTypeForMapping, setSelectedTypeForMapping] = useState("");
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showCreateTypeDialog, setShowCreateTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const [powerUnits, setPowerUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");

  // --- API FETCH LOGIC ---
  const fetchPowerUnits = async () => {
    try {
      const res = await axios.get(`${API_URL}/units/power-units?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        const units = res.data.data.map(u => ({ value: u.id, text: `${u.name} (${u.symbol})` }));
        setPowerUnits(units);
        if (units.length > 0) setSelectedUnit(units.find(u => u.text.includes("kW"))?.value || units[0].value);
      }
    } catch (error) {
      console.error("Failed to fetch power units:", error);
    }
  };

  const fetchLevelOptions = async (levelId, parentIdVal = null) => {
    if (!moduleUniqueId) return;

    let url = "";
    let mapFn = (item) => ({ value: item.id, text: item.name });
    const baseQuery = `?unique_id=${moduleUniqueId}&req_for=view`;

    if (levelId === "industryType") {
      url = `${API_URL}/industry-types/list${baseQuery}&active_only=true`;
    } else if (levelId === "category") {
      url = `${API_URL}/project-types/get-categories${baseQuery}${parentIdVal ? `&industry_type_id=${parentIdVal}` : ''}`;
    } else if (levelId === "subcategory") {
      if (!parentIdVal) return;
      url = `${API_URL}/project-types/get-subcategories${baseQuery}&category_id=${parentIdVal}`;
      mapFn = (item) => ({ value: item.id, text: item.name, image: item.image, color: item.color });
    } else if (levelId === "type") {
      if (!parentIdVal) return;
      url = `${API_URL}/project-types/get-subcategory-types${baseQuery}&subcategory_id=${parentIdVal}`;
      mapFn = (item) => ({ value: item.subcategory_type_id, text: item.name });
    } else if (levelId === "projectRange") {
      if (!parentIdVal) return;
      url = `${API_URL}/project-types/get-ranges${baseQuery}&subcategory_type_id=${parentIdVal}`;
      mapFn = (item) => ({
        value: item.id,
        text: `${item.min_value} - ${item.max_value} ${item.unit_symbol}`,
        min_value: item.min_value,
        max_value: item.max_value,
        unit_id: item.unit_id
      });
    }

    if (!url) return;

    try {
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setOptions((prev) => ({ ...prev, [levelId]: res.data.data.map(mapFn) }));
      }
    } catch (error) {
      console.error(`Failed to fetch ${levelId}:`, error);
      setOptions((prev) => ({ ...prev, [levelId]: [] }));
    }
  };

  const fetchAllTypes = async () => {
    if (!moduleUniqueId) return;
    try {
      const res = await axios.get(`${API_URL}/project-types/get-types?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setAllTypes(res.data.data.map(item => ({ value: item.id, text: item.name })));
      }
    } catch (error) {
      console.error("Failed to fetch all types:", error);
      setAllTypes([]);
    }
  };

  const fetchHierarchy = async () => {
    if (!moduleUniqueId) return;
    try {
      const res = await axios.get(`${API_URL}/project-types/get-all-hierarchy?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setHierarchy(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch full hierarchy", error);
    }
  };

  useEffect(() => {
    fetchLevelOptions("industryType");
    fetchLevelOptions("category");
    fetchHierarchy();
    fetchPowerUnits();
  }, [moduleUniqueId]);

  const handleSelect = (levelId, value) => {
    setSelectedValues((prev) => {
      const newValues = { ...prev, [levelId]: value };
      let clearRest = false;
      let nextChildId = null;

      CONFIG_LEVELS.forEach((level) => {
        if (clearRest) {
          newValues[level.id] = "";
          setOptions((optPrev) => ({ ...optPrev, [level.id]: [] }));
        }
        if (level.id === levelId) {
          clearRest = true;
          const childIndex = CONFIG_LEVELS.findIndex(l => l.id === levelId) + 1;
          if (childIndex < CONFIG_LEVELS.length) nextChildId = CONFIG_LEVELS[childIndex].id;
        }
      });

      if (nextChildId && value) fetchLevelOptions(nextChildId, value);
      return newValues;
    });
  };

  const handleOpenAdd = (levelId) => {
    if (levelId === "type") {
      setShowTypeDialog(true);
      fetchAllTypes();
      setSelectedTypeForMapping("");
    } else {
      setAddingForLevel(levelId);
      setNewOptionText("");
      setNewMin("");
      setNewMax("");
    }
  };

  const handleCloseAdd = () => {
    setAddingForLevel(null);
    setEditingForLevel(null);
    setEditingOptionId(null);
    setNewOptionText("");
    setNewMin("");
    setNewMax("");
    setSubcategoryImage(null);
    setExistingSubcategoryImage(null);
    setSubcategoryColor("#2f4cbd");
  };

  const handleOpenEdit = (levelId) => {
    const selectedVal = selectedValues[levelId];
    if (!selectedVal) return;

    const selectedOption = options[levelId]?.find((o) => o.value === selectedVal);
    if (!selectedOption) return;

    setEditingForLevel(levelId);
    setEditingOptionId(selectedVal);

    if (levelId === "projectRange") {
      setNewMin(String(selectedOption.min_value ?? ""));
      setNewMax(String(selectedOption.max_value ?? ""));
      setSelectedUnit(selectedOption.unit_id ?? "");
    } else {
      setNewOptionText(selectedOption.text);
    }

    if (levelId === "subcategory") {
      setSubcategoryImage(null);
      setExistingSubcategoryImage(selectedOption.image || null);
      setSubcategoryColor(selectedOption.color || "#2f4cbd");
    }
  };

  const handleMapType = async () => {
    if (!selectedTypeForMapping || !selectedValues.subcategory) return;
    setIsSaving(true);
    try {
      const mapRes = await axios.post(`${API_URL}/project-types/map-type?unique_id=${moduleUniqueId}&req_for=add`,
        { subcategory_id: selectedValues.subcategory, type_id: selectedTypeForMapping },
        { headers: authHeaderObj() }
      );

      if (mapRes.data?.status === "success") {
        await fetchLevelOptions("type", selectedValues.subcategory);
        handleSelect("type", mapRes.data.data.subcategory_type_id);
        dispatch(setAlert({ type: "success", message: "Type mapped successfully" }));
        setShowTypeDialog(false);
      }
    } catch (error) {
      dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Mapping failed" }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim() || !selectedValues.subcategory) return;
    setIsSaving(true);
    try {
      const res = await axios.post(`${API_URL}/project-types/add-type?unique_id=${moduleUniqueId}&req_for=add`,
        { name: newTypeName },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        const mapRes = await axios.post(`${API_URL}/project-types/map-type?unique_id=${moduleUniqueId}&req_for=add`,
          { subcategory_id: selectedValues.subcategory, type_id: res.data.data.id },
          { headers: authHeaderObj() }
        );
        await fetchLevelOptions("type", selectedValues.subcategory);
        handleSelect("type", mapRes.data.data.subcategory_type_id);
        setShowCreateTypeDialog(false);
        setShowTypeDialog(false);
      }
    } catch (err) {
      console.error(err);
      dispatch(setAlert({ type: "error", message: "Creation failed" }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNewOption = async () => {
    const activeLevel = addingForLevel || editingForLevel;
    if (!activeLevel || !moduleUniqueId) return;
    setIsSaving(true);

    const isEdit = !!editingOptionId;
    const baseQuery = `?unique_id=${moduleUniqueId}&req_for=${isEdit ? 'edit' : 'add'}`;

    try {
      let res;
      if (activeLevel === "subcategory") {
        const formData = new FormData();
        if (isEdit) {
          formData.append("id", editingOptionId);
        }
        formData.append("name", newOptionText);
        formData.append("color", subcategoryColor);
        if (!isEdit) {
          formData.append("category_id", selectedValues.category);
        }
        if (subcategoryImage) {
          formData.append("image", subcategoryImage);
        }

        const url = isEdit
          ? `${API_URL}/project-types/update-subcategory${baseQuery}`
          : `${API_URL}/project-types/add-subcategory${baseQuery}`;

        const headers = {
          ...authHeaderObj(),
          "Content-Type": "multipart/form-data"
        };

        res = await (isEdit ? axios.put(url, formData, { headers }) : axios.post(url, formData, { headers }));
      } else {
        let url = "";
        let payload = {};
        if (activeLevel === "industryType") {
          url = isEdit
            ? `${API_URL}/industry-types/update${baseQuery}`
            : `${API_URL}/industry-types/add${baseQuery}`;
          payload = isEdit
            ? { id: editingOptionId, name: newOptionText }
            : { name: newOptionText };
        } else if (activeLevel === "category") {
          url = isEdit
            ? `${API_URL}/project-types/update-category${baseQuery}`
            : `${API_URL}/project-types/add-category${baseQuery}`;
          payload = isEdit
            ? { id: editingOptionId, name: newOptionText, industry_type_id: selectedValues.industryType || null }
            : { name: newOptionText, industry_type_id: selectedValues.industryType || null };
        } else if (activeLevel === "type") {
          url = `${API_URL}/project-types/update-type${baseQuery}`;
          payload = { id: editingOptionId, name: newOptionText };
        } else if (activeLevel === "projectRange") {
          url = isEdit
            ? `${API_URL}/project-types/update-range${baseQuery}`
            : `${API_URL}/project-types/add-range${baseQuery}`;
          payload = isEdit
            ? { id: editingOptionId, min_value: Number(newMin), max_value: Number(newMax), unit_id: selectedUnit }
            : { min_value: Number(newMin), max_value: Number(newMax), unit_id: selectedUnit, subcategory_type_id: selectedValues.type };
        }

        if (isEdit) {
          res = await axios.put(url, payload, { headers: authHeaderObj() });
        } else {
          res = await axios.post(url, payload, { headers: authHeaderObj() });
        }
      }

      if (res.data?.status === "success") {
        const parentIdValue = CONFIG_LEVELS.find(l => l.id === activeLevel).parentId ? selectedValues[CONFIG_LEVELS.find(l => l.id === activeLevel).parentId] : null;
        await fetchLevelOptions(activeLevel, parentIdValue);
        await fetchHierarchy();
        if (!isEdit) {
          handleSelect(activeLevel, res.data.data.id);
        } else {
          handleSelect(activeLevel, editingOptionId);
        }
        handleCloseAdd();
        dispatch(setAlert({ type: "success", message: `Sub-category ${isEdit ? 'updated' : 'added'} successfully` }));
      }
    } catch (error) {
      console.error(error);
      dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Save failed" }));
    } finally {
      setIsSaving(false);
    }
  };

  const getSelectedText = (levelId) => {
    const val = selectedValues[levelId];
    return options[levelId]?.find((o) => o.value === val)?.text || null;
  };

  const activeLevelConfig = CONFIG_LEVELS.find((l) => l.id === (addingForLevel || editingForLevel));
  const isRangeLevel = (addingForLevel || editingForLevel) === "projectRange";
  const isFullyConfigured = selectedValues.projectRange !== "";

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* --- ENTERPRISE HEADER --- */}
      <div className="bg-surface rounded-2xl border-2 border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-3 tracking-tight">
            <span className="p-2 bg-primary/10 rounded-lg text-primary"><FaProjectDiagram size={20} /></span>
            Project Logic Management
          </h1>
          <p className="text-sm text-text-secondary font-medium mt-1 ml-12">
            Configure system hierarchies and capacity-based operational ranges.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50">System Status</span>
            <span className="text-xs font-bold text-success flex items-center gap-1.5 bg-success/5 px-2.5 py-1 rounded-full border border-success/10">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Engine Online
            </span>
          </div>
        </div>
      </div>

      {/* --- CURRENT CONFIGURATION (THE "ABOVE CARD") --- */}
      <div className="bg-surface rounded-3xl border-2 border-border p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><FaHistory size={80} /></div>
        <div className="flex items-center gap-3 mb-6">
          <FaCheckCircle className={isFullyConfigured ? "text-success" : "text-text-disabled"} size={20} />
          <h3 className="text-lg font-black text-text-primary uppercase tracking-tighter">Active Configuration Path</h3>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {CONFIG_LEVELS.map((level, idx) => {
            const text = getSelectedText(level.id);
            return (
              <div key={level.id} className="flex items-center gap-4">
                <div className={`flex flex-col min-w-[140px] p-4 rounded-2xl border-2 transition-all ${text ? 'bg-surface border-primary/40 shadow-sm' : 'bg-surface-hover border-border opacity-50 border-dashed'
                  }`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 flex items-center gap-1.5">
                    {level.icon} {level.label}
                  </span>
                  <span className={`text-sm font-bold mt-1 ${text ? 'text-text-primary' : 'text-text-disabled italic font-medium'}`}>
                    {text || "Pending..."}
                  </span>
                </div>
                {idx < CONFIG_LEVELS.length - 1 && (
                  <FaChevronRight className="text-text-disabled opacity-30" size={12} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- DROPDOWN LIST UNDER THE ABOVE CARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {CONFIG_LEVELS.map((level, index) => {
          const prevLevelId = index > 0 ? CONFIG_LEVELS[index - 1].id : null;
          const isDisabled = prevLevelId ? !selectedValues[prevLevelId] : false;
          const isSelected = !!selectedValues[level.id];

          return (
            <div
              key={level.id}
              className={`p-6 rounded-3xl bg-surface border-2 transition-all duration-300 ${isDisabled ? 'opacity-40 grayscale pointer-events-none' :
                  isSelected ? 'border-primary shadow-lg ring-1 ring-primary/10' :
                    'border-border hover:border-primary/50'
                }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-2">
                  {level.icon} {index + 1}. {level.label}
                </span>
                <div className="flex items-center gap-1.5">
                  {isSelected && (
                    <IconButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(level.id)}
                      className="rounded-xl active:scale-90"
                      tooltip={`Edit ${level.label}`}
                    >
                      <FaEdit size={10} />
                    </IconButton>
                  )}
                  <IconButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenAdd(level.id)}
                    disabled={isDisabled}
                    className="rounded-xl active:scale-90"
                    tooltip={`Add ${level.label}`}
                  >
                    <FaPlus size={10} />
                  </IconButton>
                </div>
              </div>
              <DropdownWithSearchInput
                options={options[level.id] || []}
                value={selectedValues[level.id]}
                onChange={(val) => handleSelect(level.id, val)}
                disabled={isDisabled}
                placeholder={`Select ${level.label}`}
                className="w-full"
              />
            </div>
          );
        })}
      </div>

      {/* --- HIERARCHY GRID --- */}
      <div className="pt-8 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-black text-text-primary tracking-tight uppercase">Hierarchy Explorer</h3>
          <span className="text-[10px] font-black bg-surface border-2 border-border px-4 py-2 rounded-full text-text-secondary uppercase tracking-[0.2em]">
            {hierarchy.length} Root Definitions
          </span>
        </div>

        {hierarchy.length === 0 ? (
          <div className="p-16 text-center bg-surface border border-dashed border-border rounded-3xl">
            <FaLayerGroup size={40} className="mx-auto text-text-disabled mb-4 opacity-30" />
            <p className="text-text-secondary font-bold">No structural data found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {hierarchy.map(ind => (
              <div key={ind.id} className="bg-surface rounded-3xl border-2 border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group/card">
              <div className="p-6 bg-surface-hover border-b border-border flex justify-between items-center">
                <h4 className="font-black text-text-primary tracking-tight flex items-center gap-2">
                  <FaBuilding className="text-primary" size={14} />
                  {ind.name}
                </h4>
                <div className="p-2 bg-surface rounded-xl border border-border shadow-xs">
                  <span className="text-[10px] font-bold text-text-secondary">{ind.categories?.length || 0} Categories</span>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {ind.categories?.map(cat => (
                  <div key={cat.id} className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-text-primary uppercase tracking-tighter">
                      <FaBoxOpen className="text-primary/70" size={12} />
                      {cat.name}
                    </div>
                    <div className="pl-4 space-y-4 border-l border-border/60 ml-1.5">
                      {cat.subcategories?.map(sub => (
                        <div key={sub.id} className="space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary">
                            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                            {sub.name}
                          </div>
                          <div className="pl-3 space-y-2">
                            {sub.mappedTypes?.map(type => (
                              <div key={type.subcategory_type_id} className="space-y-1">
                                <span className="text-[10px] font-bold text-text-secondary flex items-center gap-1">
                                  <FaChevronRight size={6} className="text-primary/50" />
                                  {type.type?.name || type.name}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {type.ranges?.map(rng => (
                                    <div key={rng.id} className="px-2 py-1 text-[9px] font-black rounded-lg bg-surface-hover border border-border text-text-primary">
                                      {rng.min_value}-{rng.max_value} <span className="text-primary opacity-80">{rng.unit_symbol}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* --- REFINED MODALS --- */}
      <Dialog isOpen={showTypeDialog} onClose={() => setShowTypeDialog(false)} title="Behavioral Logic Mapping" size="sm">
        <div className="space-y-6 pt-4">
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-[11px] text-text-secondary font-medium leading-relaxed italic">
            Select a global system type to apply its engineering constraints to this sub-category.
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1"><DropdownWithSearchInput label="Behavioral Type" options={allTypes} value={selectedTypeForMapping} onChange={setSelectedTypeForMapping} /></div>
            <IconButton variant="primary" size="md" onClick={() => { setShowTypeDialog(false); setShowCreateTypeDialog(true); }} className="rounded-2xl shadow-lg shadow-primary/20"><FaPlus /></IconButton>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" onClick={() => setShowTypeDialog(false)} className="rounded-xl px-6">Cancel</Button>
            <Button variant="primary" onClick={handleMapType} loading={isSaving} disabled={!selectedTypeForMapping} className="rounded-xl px-10 shadow-lg shadow-primary/20">Establish Map</Button>
          </div>
        </div>
      </Dialog>

      <Dialog isOpen={showCreateTypeDialog} onClose={() => setShowCreateTypeDialog(false)} title="New System Construct" size="sm">
        <div className="space-y-6 pt-4">
          <CustomInput label="Type Identifier" placeholder="e.g. Off-Grid Smart" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" onClick={() => setShowCreateTypeDialog(false)} className="rounded-xl">Cancel</Button>
            <Button variant="primary" onClick={handleCreateType} loading={isSaving} disabled={!newTypeName.trim()} className="rounded-xl shadow-xl shadow-primary/20 px-8">Create & Map</Button>
          </div>
        </div>
      </Dialog>

      <Dialog isOpen={!!addingForLevel || !!editingForLevel} onClose={handleCloseAdd} title={`${editingOptionId ? 'Edit' : 'New'} ${activeLevelConfig?.label}`} size="sm">
        <div className="space-y-6 pt-4">
          {isRangeLevel ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <CustomInput label="Min Threshold" type="number" value={newMin} onChange={(e) => setNewMin(e.target.value)} placeholder="0" />
                <CustomInput label="Max Threshold" type="number" value={newMax} onChange={(e) => setNewMax(e.target.value)} placeholder="100" />
              </div>
              <DropdownWithSearchInput label="Capacity Unit" value={selectedUnit} onChange={setSelectedUnit} options={powerUnits} />
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3 italic">
                <FaStar className="text-primary mt-1 shrink-0" size={14} />
                <p className="text-[10px] text-text-secondary leading-normal">
                  All ranges are stored in normalized engineering format to drive automated Combo-Kit selection logic.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <CustomInput label="Value Identifier" placeholder="Enter name..." value={newOptionText} onChange={(e) => setNewOptionText(e.target.value)} />
              {((addingForLevel || editingForLevel) === "subcategory") && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1 block">
                    Accent Color Theme
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={subcategoryColor}
                      onChange={(e) => setSubcategoryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent shrink-0"
                    />
                    <CustomInput
                      placeholder="#2f4cbd"
                      value={subcategoryColor}
                      onChange={(e) => setSubcategoryColor(e.target.value)}
                      className="flex-1 !mb-0"
                    />
                  </div>
                </div>
              )}
              {((addingForLevel || editingForLevel) === "subcategory") && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                    Sub-Category Image
                  </label>
                  <div className="flex flex-col items-center gap-4 p-4 border border-dashed border-border rounded-2xl bg-surface-hover/30">
                    {subcategoryImage ? (
                      <div className="relative group">
                        <img
                          src={URL.createObjectURL(subcategoryImage)}
                          alt="Preview"
                          className="w-20 h-20 object-contain aspect-square rounded-xl bg-white shadow-sm border border-border p-1.5"
                        />
                      </div>
                    ) : existingSubcategoryImage ? (
                      <div className="relative group">
                        <img
                          src={existingSubcategoryImage}
                          alt="Subcategory"
                          className="w-20 h-20 object-contain aspect-square rounded-xl bg-white shadow-sm border border-border p-1.5"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary/45">
                        <FaImage size={24} />
                      </div>
                    )}
                    <CustomFilePicker
                      name="image"
                      label={existingSubcategoryImage ? "Change Image" : "Upload Image"}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) setSubcategoryImage(file);
                      }}
                      accept="image/*"
                      files={subcategoryImage ? [subcategoryImage] : []}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" onClick={handleCloseAdd} disabled={isSaving} className="rounded-xl">Cancel</Button>
            <Button variant="primary" onClick={handleSaveNewOption} loading={isSaving} disabled={isRangeLevel ? (!newMin || !newMax || !selectedUnit) : !newOptionText.trim()} className="rounded-xl shadow-2xl shadow-primary/30 px-10">Commit Change</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}