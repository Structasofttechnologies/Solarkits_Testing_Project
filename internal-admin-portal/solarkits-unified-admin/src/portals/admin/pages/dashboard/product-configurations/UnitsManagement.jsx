import { useState, useEffect } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import Dialog from "@/components/Dialog";
import CustomInput from "@/components/CustomInput";
import Tooltip from "@/components/Tooltip";
import PageHeader from "@/components/PageHeader";
import CustomTable from "@/components/CustomTable";
import { authHeaderObj } from "@/app/authHeader";
import {
  FaPlus,
  FaTrashAlt,
  FaRuler,
  FaLayerGroup,
  FaCheckCircle,
  FaStar,
  FaEdit, 
  FaExchangeAlt,
  FaBoxes,
  FaLock
} from "react-icons/fa";
import ToggleButton from "@/components/ToggleButton";

const API_URL = import.meta.env.VITE_API_URL;

export default function UnitsManagement({ moduleUniqueId }) {
  const dispatch = useDispatch();

  // States
  const [unitGroups, setUnitGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [isGroupActive, setIsGroupActive] = useState(true);

  const [unitName, setUnitName] = useState("");
  const [unitSymbol, setUnitSymbol] = useState("");
  const [unitGroupId, setUnitGroupId] = useState("");
  const [conversionFactor, setConversionFactor] = useState(1);
  const [isBaseUnit, setIsBaseUnit] = useState(false);
  const [isUnitActive, setIsUnitActive] = useState(true);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'group' or 'unit'

  // Fetch unit groups
  const fetchUnitGroups = async () => {
    if (!moduleUniqueId) return;

    try {
      const res = await axios.get(
        `${API_URL}/units/groups?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        setUnitGroups(res.data.data || []);

        // Auto-select first group if none selected
        if (res.data.data?.length > 0 && !selectedGroupId) {
          setSelectedGroupId(res.data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch unit groups:", error);
      dispatch(setAlert({
        type: "error",
        message: "Failed to load unit groups",
        duration: 4000
      }));
    }
  };

  // Fetch units by group
  const fetchUnits = async (groupId) => {
    if (!moduleUniqueId || !groupId) return;

    setLoading(true);
    try {
      const url = `${API_URL}/units?unique_id=${moduleUniqueId}&req_for=view${groupId ? `&group_id=${groupId}` : ''}`;
      const res = await axios.get(url, { headers: authHeaderObj() });

      if (res.data?.status === "success") {
        setUnits(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch units:", error);
      dispatch(setAlert({
        type: "error",
        message: "Failed to load units",
        duration: 4000
      }));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUnitGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleUniqueId]);

  // Fetch units when selected group changes
  useEffect(() => {
    if (selectedGroupId) {
      fetchUnits(selectedGroupId);
    }
  }, [selectedGroupId]);

  // Add/Edit Unit Group
  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      dispatch(setAlert({
        type: "warning",
        message: "Group name is required",
        duration: 3000
      }));
      return;
    }

    setLoading(true);
    const baseQuery = `?unique_id=${moduleUniqueId}&req_for=${editingItem ? 'edit' : 'add'}`;

    try {
      let res;
      if (editingItem) {
        res = await axios.put(
          `${API_URL}/units/groups/${editingItem.id}${baseQuery}`,
          { name: groupName, code: groupCode || null, is_active: isGroupActive },
          { headers: authHeaderObj() }
        );
      } else {
        res = await axios.post(
          `${API_URL}/units/groups${baseQuery}`,
          { name: groupName, code: groupCode || null, is_active: isGroupActive },
          { headers: authHeaderObj() }
        );
      }

      if (res.data?.status === "success") {
        await fetchUnitGroups();
        dispatch(setAlert({
          type: "success",
          message: `Unit group ${editingItem ? 'updated' : 'created'} successfully`,
          duration: 3000
        }));
        handleCloseGroupDialog();
      }
    } catch (error) {
      console.error("Failed to save group:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || `Failed to ${editingItem ? 'update' : 'create'} group`,
        duration: 4000
      }));
    } finally {
      setLoading(false);
    }
  };

  // Add/Edit Unit
  const handleSaveUnit = async () => {
    const errors = [];
    if (!unitGroupId) errors.push("Unit group is required");
    if (!unitName.trim()) errors.push("Unit name is required");
    if (!unitSymbol.trim()) errors.push("Unit symbol is required");
    if (conversionFactor <= 0) errors.push("Conversion factor must be positive");

    if (errors.length) {
      dispatch(setAlert({
        type: "warning",
        message: errors.join(", "),
        duration: 4000
      }));
      return;
    }

    setLoading(true);
    const baseQuery = `?unique_id=${moduleUniqueId}&req_for=${editingItem ? 'edit' : 'add'}`;

    try {
      let res;
      const payload = {
        unit_group_id: unitGroupId,
        name: unitName.trim(),
        symbol: unitSymbol.trim(),
        conversion_factor: conversionFactor,
        is_base_unit: isBaseUnit,
        is_active: isUnitActive
      };

      if (editingItem) {
        // Edit endpoint (assuming you have one)
        res = await axios.put(
          `${API_URL}/units/${editingItem.id}${baseQuery}`,
          payload,
          { headers: authHeaderObj() }
        );
      } else {
        res = await axios.post(
          `${API_URL}/units${baseQuery}`,
          payload,
          { headers: authHeaderObj() }
        );
      }

      if (res.data?.status === "success") {
        await fetchUnits(selectedGroupId);
        dispatch(setAlert({
          type: "success",
          message: `Unit ${editingItem ? 'updated' : 'created'} successfully`,
          duration: 3000
        }));
        handleCloseUnitDialog();
      }
    } catch (error) {
      console.error("Failed to save unit:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || `Failed to ${editingItem ? 'update' : 'create'} unit`,
        duration: 4000
      }));
    } finally {
      setLoading(false);
    }
  };

  // Delete handlers
  const handleDeleteGroup = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      const res = await axios.delete(
        `${API_URL}/units/groups/${deleteTarget}?unique_id=${moduleUniqueId}&req_for=delete`,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        await fetchUnitGroups();
        if (selectedGroupId === deleteTarget) {
          setSelectedGroupId("");
        }
        dispatch(setAlert({
          type: "success",
          message: "Unit group deleted successfully",
          duration: 3000
        }));
        setDeleteTarget(null);
        setDeleteType(null);
      }
    } catch (error) {
      console.error("Failed to delete group:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to delete group",
        duration: 4000
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      const res = await axios.delete(
        `${API_URL}/units/${deleteTarget}?unique_id=${moduleUniqueId}&req_for=delete`,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        await fetchUnits(selectedGroupId);
        dispatch(setAlert({
          type: "success",
          message: "Unit deleted successfully",
          duration: 3000
        }));
        setDeleteTarget(null);
        setDeleteType(null);
      }
    } catch (error) {
      console.error("Failed to delete unit:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to delete unit",
        duration: 4000
      }));
    } finally {
      setLoading(false);
    }
  };

  // Dialog handlers
  const handleOpenGroupDialog = (group = null) => {
    if (group) {
      setEditingItem(group);
      setGroupName(group.name);
      setGroupCode(group.code || "");
      setIsGroupActive(group.is_active !== false); // default true
    } else {
      setEditingItem(null);
      setGroupName("");
      setGroupCode("");
      setIsGroupActive(true);
    }
    setShowGroupDialog(true);
  };

  const handleCloseGroupDialog = () => {
    setShowGroupDialog(false);
    setEditingItem(null);
    setGroupName("");
    setGroupCode("");
  };

  const handleOpenUnitDialog = (unit = null) => {
    if (unit) {
      setEditingItem(unit);
      setUnitName(unit.name);
      setUnitSymbol(unit.symbol);
      setUnitGroupId(unit.unit_group_id);
      setConversionFactor(unit.conversion_factor);
      setIsBaseUnit(unit.is_base_unit === 1);
      setIsUnitActive(unit.is_active !== false);
    } else {
      setEditingItem(null);
      setUnitName("");
      setUnitSymbol("");
      setUnitGroupId(selectedGroupId);
      setConversionFactor(1);
      setIsBaseUnit(false);
      setIsUnitActive(true);
    }
    setShowUnitDialog(true);
  };

  const handleCloseUnitDialog = () => {
    setShowUnitDialog(false);
    setEditingItem(null);
  };

  const confirmDelete = (type, id) => {
    setDeleteType(type);
    setDeleteTarget(id);
  };

  // Get unit group name by ID
  const getUnitGroupName = (groupId) => {
    const group = unitGroups.find(g => g.id === groupId);
    return group?.name || "Unknown Group";
  };

  // Get base unit of current group
  const getBaseUnit = () => {
    return units.find(u => u.is_base_unit === 1);
  };

  const baseUnit = getBaseUnit();

  const tableHeaders = [
    { key: 'name', label: 'Unit Name' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'conversion', label: 'Conversion Factor' },
    { key: 'is_base', label: 'Base Unit', align: 'center' },
    { key: 'actions', label: 'Actions', align: 'right' }
  ];

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="Units Management"
        subtitle="Manage unit groups and their associated units for capacity measurements."
        icon={FaRuler}
        stats={[
          { label: "Unit Groups", value: unitGroups.length, description: "Categories" },
          { label: "Active Units", value: units.length, description: selectedGroupId ? getUnitGroupName(selectedGroupId) : "Select a group" }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Unit Groups */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-500">
            <div className="p-6 border-b border-border bg-surface-hover/30 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-inner">
                  <FaLayerGroup size={20} />
                </div>
                <div>
                  <h2 className="font-black text-text-primary uppercase tracking-widest text-sm">Unit Groups</h2>
                  <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mt-1 opacity-60">Measurement Categories</p>
                </div>
              </div>
              <Tooltip text="Add New Group">
                <IconButton variant="primary" size="sm" onClick={() => handleOpenGroupDialog()} className="rounded-xl shadow-lg shadow-primary/20">
                  <FaPlus />
                </IconButton>
              </Tooltip>
            </div>

            <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto custom-scrollbar">
              {unitGroups.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-hover flex items-center justify-center text-text-muted">
                    <FaLayerGroup size={32} />
                  </div>
                  <p className="text-text-secondary font-medium mb-4">No unit groups created</p>
                  <Button variant="primary" size="sm" leftIcon={<FaPlus />} onClick={() => handleOpenGroupDialog()}>
                    Create First Group
                  </Button>
                </div>
              ) : (
                unitGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-5 cursor-pointer transition-all duration-300 group/item ${selectedGroupId === group.id ? 'bg-primary/[0.03]' : 'hover:bg-surface-hover'}`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold transition-colors duration-300 ${selectedGroupId === group.id ? 'text-primary' : 'text-text-primary'}`}>
                            {group.name}
                          </h3>
                          {group.is_system && (
                            <Tooltip text="System Unit Group (Locked)">
                              <FaLock className="text-text-muted/40" size={12} />
                            </Tooltip>
                          )}
                          {!group.is_active && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-danger/10 text-danger px-2 py-0.5 rounded-lg border border-danger/10">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1 font-medium">
                          Code: <span className="text-text-primary">{group.code || 'N/A'}</span>
                        </p>
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                        <IconButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenGroupDialog(group); }}>
                          <FaEdit />
                        </IconButton>
                        {!group.is_system && (
                          <IconButton variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); confirmDelete('group', group.id); }}>
                            <FaTrashAlt />
                          </IconButton>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Units */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-500 flex flex-col h-full">
            <div className="p-6 border-b border-border bg-surface-hover/30 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-inner">
                  <FaBoxes size={20} />
                </div>
                <div>
                  <h2 className="font-black text-text-primary uppercase tracking-widest text-sm flex items-center gap-2">
                    Defined Units {selectedGroupId && <span className="text-primary font-black opacity-40">/</span>} 
                    {selectedGroupId && <span className="text-primary truncate max-w-[200px]">{getUnitGroupName(selectedGroupId)}</span>}
                  </h2>
                  <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mt-1 opacity-60">Measurement Units</p>
                </div>
              </div>
              {selectedGroupId && (
                <Tooltip text="Add New Unit">
                  <IconButton variant="primary" size="sm" onClick={() => handleOpenUnitDialog()} className="rounded-xl shadow-lg shadow-primary/20">
                    <FaPlus />
                  </IconButton>
                </Tooltip>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {!selectedGroupId ? (
                <div className="p-20 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-surface-hover flex items-center justify-center text-text-muted">
                    <FaLayerGroup size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">No Group Selected</h3>
                  <p className="text-text-secondary font-medium">Please select a unit group from the left panel.</p>
                </div>
              ) : (
                <CustomTable
                  headers={tableHeaders}
                  data={units}
                  loading={loading}
                  emptyMessage="No units found for this group."
                  containerClassName="border-none shadow-none rounded-none bg-transparent"
                  className="bg-transparent"
                  renderRow={(unit) => (
                    <>
                      <td className="px-6 py-4">
                        <div className="font-bold text-text-primary flex items-center gap-2">
                          {unit.name}
                          {unit.is_system && <FaLock className="text-text-muted/30" size={12} />}
                          {!unit.is_active && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-danger/10 text-danger px-1.5 py-0.5 rounded-md">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="px-2.5 py-1 bg-surface-hover rounded-lg text-xs font-black text-primary border border-border/40">
                          {unit.symbol}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-text-secondary">1 {unit.symbol} =</span>
                          <span className="font-black text-primary bg-primary/5 px-2 py-0.5 rounded">
                            {unit.conversion_factor} {baseUnit?.symbol || '?'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {unit.is_base_unit === 1 ? (
                          <span className="inline-flex items-center gap-1.5 text-success bg-success/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-success/20">
                            <FaStar size={10} />
                            Base Unit
                          </span>
                        ) : <span className="text-text-muted/40 font-black">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <IconButton variant="ghost" size="sm" onClick={() => handleOpenUnitDialog(unit)}>
                            <FaEdit />
                          </IconButton>
                          {!unit.is_system && (
                            <IconButton variant="danger" size="sm" onClick={() => confirmDelete('unit', unit.id)}>
                              <FaTrashAlt />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                />
              )}
            </div>

            {selectedGroupId && baseUnit && units.length > 1 && (
              <div className="p-5 border-t border-border bg-linear-to-r from-primary/5 via-primary/[0.02] to-transparent">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FaExchangeAlt size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-1">Unit Conversion Reference</h4>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {units.filter(u => !u.is_base_unit).map(unit => (
                        <div key={unit.id} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-text-secondary bg-surface-hover px-3 py-1.5 rounded-lg border border-border shadow-sm">
                          <span>1 {unit.symbol}</span>
                          <FaExchangeAlt size={10} className="text-primary/40" />
                          <span className="text-primary">{unit.conversion_factor} {baseUnit.symbol}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unit Group Dialog */}
      <Dialog
        isOpen={showGroupDialog}
        onClose={handleCloseGroupDialog}
        title={`${editingItem ? 'Edit' : 'Add New'} Unit Group`}
        size="sm"
      >
        <div className="space-y-6 mt-2">
          <CustomInput
            label="Group Name"
            placeholder="e.g., Capacity, Length, Weight"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={editingItem?.is_system}
            required
          />

          <CustomInput
            label="Group Code (Optional)"
            placeholder="e.g., CAP, LEN, WGT"
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
            disabled={editingItem?.is_system}
          />

          <div className="p-3 bg-surface-hover rounded-xl border border-border">
            <ToggleButton 
              checked={isGroupActive} 
              onChange={setIsGroupActive} 
              label="Group Status" 
              description="Active groups can be used in product templates"
              disabled={editingItem?.is_system}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button variant="secondary" onClick={handleCloseGroupDialog} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveGroup}
              loading={loading}
              disabled={!groupName.trim()}
            >
              {editingItem ? 'Update' : 'Create'} Group
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog
        isOpen={showUnitDialog}
        onClose={handleCloseUnitDialog}
        title={`${editingItem ? 'Edit' : 'Add New'} Unit`}
        size="md"
      >
        <div className="space-y-6 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              label="Unit Name"
              placeholder="e.g., Kilowatt, Megawatt"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              disabled={editingItem?.is_system}
              required
            />

            <CustomInput
              label="Unit Symbol"
              placeholder="e.g., kW, MW, W"
              value={unitSymbol}
              onChange={(e) => setUnitSymbol(e.target.value)}
              disabled={editingItem?.is_system}
              required
            />
          </div>

          <DropdownWithSearchInput
            label="Unit Group"
            options={unitGroups.map(g => ({ value: g.id, text: g.name }))}
            value={unitGroupId}
            onChange={setUnitGroupId}
            placeholder="Select unit group"
            disabled={!!editingItem}
            required
          />

          <CustomInput
            label="Conversion Factor"
            type="number"
            step="any"
            placeholder="Conversion factor relative to base unit"
            value={conversionFactor}
            onChange={(e) => setConversionFactor(parseFloat(e.target.value))}
            helperText={isBaseUnit ? "Base unit factor is always 1" : `1 ${unitSymbol || 'unit'} = [Factor] × ${baseUnit?.symbol || 'Base Unit'}`}
            disabled={isBaseUnit || editingItem?.is_system}
            required
          />

          <div className="p-3 bg-surface-hover rounded-xl border border-border">
            <ToggleButton 
              checked={isBaseUnit} 
              onChange={(val) => {
                if (editingItem?.is_system) return;
                if (baseUnit && baseUnit.is_system && !isBaseUnit) return;
                if (isBaseUnit && editingItem) return;
                
                setIsBaseUnit(val);
                if (val) setConversionFactor(1);
              }}
              label={
                <div className="flex items-center gap-2">
                  {isBaseUnit ? <FaStar className="text-yellow-500" /> : <FaStar className="text-text-secondary" />}
                  Base Unit
                </div>
              }
              description={
                editingItem?.is_system 
                  ? "System base unit cannot be changed" 
                  : baseUnit && baseUnit.is_system && !isBaseUnit
                  ? `Group locked to system base unit: ${baseUnit.name}`
                  : isBaseUnit 
                  ? "This is the current base unit (cannot unset, promote another unit instead)"
                  : "Set this as the primary reference unit for this group"
              }
              disabled={editingItem?.is_system || (baseUnit && baseUnit.is_system && !isBaseUnit) || (isBaseUnit && !!editingItem)}
            />
          </div>

          {isBaseUnit && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-primary">
                <FaCheckCircle className="inline mr-2" />
                This will be the base unit for conversion calculations in this group.
              </p>
            </div>
          )}

          {editingItem && (
            <div className="p-3 bg-surface-hover rounded-xl border border-border">
              <ToggleButton 
                checked={isUnitActive} 
                onChange={setIsUnitActive} 
                label="Unit Status" 
                description="Active units can be selected for attributes"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button variant="secondary" onClick={handleCloseUnitDialog} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveUnit}
              loading={loading}
              disabled={!unitName.trim() || !unitSymbol.trim() || !unitGroupId}
            >
              {editingItem ? 'Update' : 'Create'} Unit
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteType(null);
        }}
        title={`Delete ${deleteType === 'group' ? 'Unit Group' : 'Unit'}`}
        size="sm"
      >
        <div className="space-y-6 mt-2">
          <p className="text-text-secondary">
            Are you sure you want to delete this {deleteType === 'group' ? 'unit group' : 'unit'}?
            {deleteType === 'group' && (
              <span className="block mt-2 text-warning text-sm">
                Warning: This will also delete all units within this group.
              </span>
            )}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteType(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={deleteType === 'group' ? handleDeleteGroup : handleDeleteUnit}
              loading={loading}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}