import { useState, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import Dialog from "@/components/Dialog";
import CustomInput from "@/components/CustomInput";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import PopupDataLoader from "@/components/PopupDataLoader";

import {
  FaPlus, FaEdit, FaTrash, FaSlidersH, FaLayerGroup,
  FaDatabase, FaChevronUp, FaLock,
  FaChevronDown, FaListUl, FaBuilding, FaMapMarkedAlt,
  FaGripVertical
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const DATA_TYPES = [
  { value: "text", text: "Text / String" },
  { value: "number", text: "Numeric / Engineering" },
  { value: "dropdown", text: "Select Menu (Single)" },
  { value: "multiselect", text: "Select Menu (Multi)" },
  { value: "file", text: "Attachment / PDF" },
];

const ATTRIBUTE_TYPES = [
  { value: "custom", text: "Custom Parameter" },
  { value: "sku", text: "SKU Parameter" },
  { value: "phase", text: "Phase Parameter" },
  { value: "tolerance", text: "Tolerance Parameter" }
];

const CHECKBOX_OPTIONS = {
  required: [{ value: "Y", label: "Mandatory" }],
  variant: [{ value: "Y", label: "Variant" }],
  filter: [{ value: "Y", label: "Filter" }]
};

export default function SubtypeWorkspace({
  template,
  subtype,
  // Brand props
  mappedBrands = [],
  brands = [],
  onMapBrand,
  onDeleteBrandMap,
  // Scope props
  scopes = [],
  scopeOptions = [],
  onAddScope,
  onDeleteScope,
  // Group props
  groups = [],
  onSaveGroup,
  onReorderGroups,
  onDeleteGroup,
  // Attribute props
  attributes = [],
  onSaveAttribute,
  onUpdateAttribute,
  onReorderAttributes,
  onDeleteAttribute,
  // Value props
  attributeValues = [],
  onAddAttributeValue,
  onDeleteAttributeValue,
  onReorderValues,
  // unit groups for number attributes
  unitGroups = [],
  // global/saving
  isSaving
}) {
  const dispatch = useDispatch();

  const isLockedAttribute = (row) => {
    if (!row) return false;
    if (["phase", "tolerance", "engineering"].includes(row.attribute_type)) {
      return true;
    }
    if (row.attribute_type === "sku") {
      const systemTemplates = ["solar panel", "inverter", "battery", "acdb", "dcdb", "cable", "wire", "mounting structure", "mounting_structure"];
      if (systemTemplates.includes(template?.name?.toLowerCase().trim())) {
        return true;
      }
    }
    return false;
  };

  // ==================== STATE ====================
  // Modal toggles
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAttrModal, setShowAttrModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Reordering modals
  const [showOrderGroupsModal, setShowOrderGroupsModal] = useState(false);
  const [showOrderAttrsModal, setShowOrderAttrsModal] = useState(false);
  const [showOrderValuesModal, setShowOrderValuesModal] = useState(false);

  // Form states
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedScopeTypeIds, setSelectedScopeTypeIds] = useState([]);
  const [groupForm, setGroupForm] = useState({ id: null, name: "" });
  const [isEditingGroup, setIsEditingGroup] = useState(false);

  const [attrForm, setAttrForm] = useState({
    id: null,
    group_id: ""
  });
  const [specRows, setSpecRows] = useState([
    {
      name: "",
      data_type: "text",
      unit_group_id: "",
      is_required: false,
      is_variant: false,
      is_filterable: false,
      attribute_type: "custom"
    }
  ]);
  const [isEditingAttr, setIsEditingAttr] = useState(false);

  // Options state
  const [selectedAttrForOptions, setSelectedAttrForOptions] = useState(null);
  const [optionRows, setOptionRows] = useState([{ value: "", is_active: true }]);
  const [editingOptionId, setEditingOptionId] = useState(null);
  const [isEditingOption, setIsEditingOption] = useState(false);
  const [showOptionEditModal, setShowOptionEditModal] = useState(false);

  // Reorder list tracking
  const [orderList, setOrderList] = useState([]);
  const [orderingGroup, setOrderingGroup] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Deletion confirm popups
  const [deleteConfirmState, setDeleteConfirmState] = useState({
    isOpen: false,
    type: "", // 'brand', 'scope', 'group', 'attribute', 'value'
    id: null,
    title: "",
    message: ""
  });

  // ==================== MEMOIZED DATA ====================
  // Filter scopes for this specific subtype
  const subtypeScopes = useMemo(() => {
    if (!subtype?.id) return [];
    return scopes.filter(s => String(s.subtype_id) === String(subtype.id));
  }, [scopes, subtype?.id]);

  // Filter mapped brands for this specific subtype
  const subtypeMappedBrands = useMemo(() => {
    if (!subtype?.id) return [];
    const found = mappedBrands.find(mb => String(mb.subtype_id) === String(subtype.id));
    return found ? found.brands : [];
  }, [mappedBrands, subtype?.id]);

  // Filter groups for this specific subtype and sort by display_order
  const subtypeGroups = useMemo(() => {
    if (!subtype?.id) return [];
    return groups
      .filter(g => String(g.subtype_id) === String(subtype.id))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [groups, subtype?.id]);

  // All attributes for this subtype
  const subtypeAttrs = useMemo(() => {
    if (!subtype?.id) return [];
    return attributes.filter(a => String(a.subtype_id) === String(subtype.id));
  }, [attributes, subtype?.id]);

  // Grouped attributes (Structured display data)
  const groupedData = useMemo(() => {
    const res = [];

    // Process defined groups
    subtypeGroups.forEach(g => {
      const groupAttrs = subtypeAttrs
        .filter(a => String(a.group_id) === String(g.id))
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      res.push({
        ...g,
        attributes: groupAttrs
      });
    });

    // Process ungrouped attributes
    const ungroupedAttrs = subtypeAttrs
      .filter(a => !a.group_id || !subtypeGroups.some(g => String(g.id) === String(a.group_id)))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    if (ungroupedAttrs.length > 0) {
      res.push({
        id: "ungrouped",
        name: "Extended Specifications",
        isVirtual: true,
        attributes: ungroupedAttrs
      });
    }

    return res;
  }, [subtypeGroups, subtypeAttrs]);

  // Get option values for current selected attribute
  const activeOptionValues = useMemo(() => {
    if (!selectedAttrForOptions) return [];
    return attributeValues
      .filter(v => String(v.attribute_id) === String(selectedAttrForOptions.id))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [attributeValues, selectedAttrForOptions]);

  // ==================== ACTIONS ====================
  // Brands
  const handleOpenBrandModal = () => {
    setSelectedBrands([]);
    setShowBrandModal(true);
  };

  const handleSaveBrands = async () => {
    if (selectedBrands.length === 0) return;
    let allSuccess = true;
    for (const brandId of selectedBrands) {
      const success = await onMapBrand(subtype.id, brandId);
      if (!success) allSuccess = false;
    }
    if (allSuccess) setShowBrandModal(false);
  };

  // Scopes
  const handleOpenScopeModal = () => {
    setSelectedScopeTypeIds([]);
    setShowScopeModal(true);
  };

  const handleSaveScopes = async () => {
    if (selectedScopeTypeIds.length === 0) return;
    const success = await onAddScope(subtype.id, selectedScopeTypeIds);
    if (success) setShowScopeModal(false);
  };

  // Groups
  const handleOpenGroupModal = (groupToEdit = null) => {
    if (groupToEdit) {
      setGroupForm({ id: groupToEdit.id, name: groupToEdit.name });
      setIsEditingGroup(true);
    } else {
      setGroupForm({ id: null, name: "" });
      setIsEditingGroup(false);
    }
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return;
    const success = await onSaveGroup(
      { id: groupForm.id, subtype_id: subtype.id },
      isEditingGroup,
      [groupForm.name.trim()]
    );
    if (success) setShowGroupModal(false);
  };

  // Attributes
  const handleOpenAttrModal = (attrToEdit = null, targetGroupId = "") => {
    if (attrToEdit) {
      setAttrForm({
        id: attrToEdit.id,
        group_id: attrToEdit.group_id || ""
      });
      setSpecRows([{
        id: attrToEdit.id,
        name: attrToEdit.name,
        data_type: attrToEdit.data_type,
        unit_group_id: attrToEdit.unit_group_id || "",
        is_required: Boolean(attrToEdit.is_required),
        is_variant: Boolean(attrToEdit.is_variant),
        is_filterable: Boolean(attrToEdit.is_filterable),
        attribute_type: attrToEdit.attribute_type || "custom"
      }]);
      setIsEditingAttr(true);
    } else {
      setAttrForm({
        id: null,
        group_id: targetGroupId === "ungrouped" ? "" : targetGroupId
      });
      setSpecRows([{
        name: "",
        data_type: "text",
        unit_group_id: "",
        is_required: false,
        is_variant: false,
        is_filterable: false,
        attribute_type: "custom"
      }]);
      setIsEditingAttr(false);
    }
    setShowAttrModal(true);
  };

  const handleSaveAttr = async () => {
    const validRows = specRows.filter(r => r.name.trim());
    if (validRows.length === 0) return;
    let success = false;
    if (isEditingAttr) {
      const single = validRows[0];
      success = await onUpdateAttribute({
        id: single.id,
        name: single.name,
        data_type: single.data_type,
        group_id: attrForm.group_id || null,
        unit_group_id: single.unit_group_id || null,
        is_required: single.attribute_type === "custom" ? single.is_required : true,
        is_variant: single.attribute_type === "phase" ? false : (single.attribute_type === "custom" ? single.is_variant : true),
        is_filterable: single.attribute_type === "custom" ? single.is_filterable : true,
        attribute_type: single.attribute_type
      });
    } else {
      success = await onSaveAttribute(
        { group_id: attrForm.group_id || null, subtype_id: subtype.id },
        validRows.map(r => ({
          name: r.name,
          data_type: r.data_type,
          unit_group_id: r.unit_group_id || null,
          is_required: r.attribute_type === "custom" ? r.is_required : true,
          is_variant: r.attribute_type === "phase" ? false : (r.attribute_type === "custom" ? r.is_variant : true),
          is_filterable: r.attribute_type === "custom" ? r.is_filterable : true,
          attribute_type: r.attribute_type
        }))
      );
    }
    if (success) setShowAttrModal(false);
  };

  // Option Values Modal
  const handleOpenOptionsModal = (attr) => {
    setSelectedAttrForOptions(attr);
    setShowOptionsModal(true);
  };

  const handleOpenOptionEdit = (opt) => {
    setEditingOptionId(opt.id);
    setOptionRows([{ value: opt.value, is_active: Boolean(opt.is_active) }]);
    setIsEditingOption(true);
    setShowOptionEditModal(true);
  };

  const handleAddOptionItem = async () => {
    const success = await onAddAttributeValue(
      selectedAttrForOptions.id,
      optionRows,
      isEditingOption,
      editingOptionId
    );
    if (success) {
      setOptionRows([{ value: "", is_active: true }]);
      setIsEditingOption(false);
      setEditingOptionId(null);
      setShowOptionEditModal(false);
    }
  };

  // Reordering Action functions
  const handleOpenOrderGroups = () => {
    setOrderList([...subtypeGroups]);
    setShowOrderGroupsModal(true);
  };

  const handleOpenOrderAttrs = (group) => {
    setOrderingGroup(group);
    setOrderList([...group.attributes]);
    setShowOrderAttrsModal(true);
  };

  const handleOpenOrderValues = () => {
    setOrderList([...activeOptionValues]);
    setShowOrderValuesModal(true);
  };

  const moveItem = (index, direction) => {
    const list = [...orderList];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setOrderList(list);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const list = [...orderList];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setOrderList(list);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleCommitGroupsOrder = async () => {
    const success = await onReorderGroups(orderList.map(g => g.id));
    if (success) setShowOrderGroupsModal(false);
  };

  const handleCommitAttrsOrder = async () => {
    const success = await onReorderAttributes(orderList.map(a => a.id));
    if (success) setShowOrderAttrsModal(false);
  };

  const handleCommitValuesOrder = async () => {
    const success = await onReorderValues(selectedAttrForOptions.id, orderList.map(v => v.id));
    if (success) setShowOrderValuesModal(false);
  };

  // Deletion confirm
  const handleOpenDeleteConfirm = (type, item) => {
    let title = "";
    let message = "";
    if (type === "brand") {
      title = "Revoke Brand Authorization";
      message = `Revoke whitelisting for brand "${item.name}" from this subtype?`;
    } else if (type === "scope") {
      title = "Delete Scope Mapping";
      message = `Remove operational category mapping "${item.category_name} › ${item.subcategory_name} › ${item.type_name}"?`;
    } else if (type === "group") {
      title = "Delete Attribute Group";
      message = `Delete group "${item.name}"? Attributes inside this group will be moved to Extended Specifications.`;
    } else if (type === "attribute") {
      title = "Delete Technical Parameter";
      message = `Delete spec "${item.name}"? This action cannot be undone.`;
    } else if (type === "value") {
      title = "Delete Dropdown Option";
      message = `Delete selection value "${item.value}"?`;
    }

    setDeleteConfirmState({
      isOpen: true,
      type,
      id: item.id,
      title,
      message
    });
  };

  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirmState;
    let success = false;
    if (type === "brand") {
      success = await onDeleteBrandMap(id);
    } else if (type === "scope") {
      success = await onDeleteScope(id);
    } else if (type === "group") {
      success = await onDeleteGroup(id);
    } else if (type === "attribute") {
      success = await onDeleteAttribute(id);
    } else if (type === "value") {
      success = await onDeleteAttributeValue(id);
    }

    if (success) {
      setDeleteConfirmState({ isOpen: false, type: "", id: null, title: "", message: "" });
    }
  };

  if (!subtype) {
    return (
      <div className="bg-surface rounded-2xl border-2 border-border p-8">
        <PopupDataLoader text="Loading Workspace Configurations..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Subtype Header */}
      <div className="bg-surface rounded-2xl border-2 border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-inner">
            <FaLayerGroup size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">{template?.name}</span>
              <span className="text-[9px] font-bold bg-surface-hover border border-border px-2 py-0.5 rounded text-text-secondary">Subtype Setup</span>
            </div>
            <h2 className="text-xl font-black text-text-primary uppercase tracking-tight mt-1">{subtype?.name}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT COLUMN: MAPPINGS */}
        <div className="space-y-6">

          {/* Project Scale Scopes Mapping */}
          <div className="bg-surface rounded-2xl border-2 border-border shadow-xs overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaMapMarkedAlt className="text-primary shrink-0" size={14} />
                <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">Project Mapping</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenScopeModal}
                leftIcon={<FaPlus />}
              >
                Add Map
              </Button>
            </div>
            <div className="p-6 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {subtypeScopes.length > 0 ? (
                subtypeScopes.map((scope) => (
                  <div key={scope.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-hover/20 border border-border hover:border-primary/20 transition-all shadow-xs">
                    <span className="text-[10px] font-bold text-text-secondary truncate uppercase tracking-tight">
                      {scope.category_name} › {scope.subcategory_name} › {scope.type_name}
                    </span>
                    <IconButton
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenDeleteConfirm("scope", scope)}
                      tooltip="Delete Mapping"
                    >
                      <FaTrash />
                    </IconButton>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">No Mappings Yet</p>
                  <p className="text-[9px] text-text-disabled mt-1">Bind this subtype to operational project scales.</p>
                </div>
              )}
            </div>
          </div>

          {/* Brands Authorizations */}
          <div className="bg-surface rounded-2xl border-2 border-border shadow-xs overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaBuilding className="text-primary shrink-0" size={14} />
                <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">Brands Authorized</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenBrandModal}
                leftIcon={<FaPlus />}
              >
                Add Brand
              </Button>
            </div>
            <div className="p-6 flex flex-wrap gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {subtypeMappedBrands.length > 0 ? (
                subtypeMappedBrands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-xl bg-surface border border-border group/brand hover:border-danger/30 transition-all duration-300 shadow-sm"
                  >
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="h-10 w-10 object-contain rounded-lg border border-border bg-white p-1 shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg border border-border bg-surface-hover flex items-center justify-center text-[10px] font-black text-text-secondary uppercase shrink-0">
                        {brand.name?.slice(0, 2)}
                      </div>
                    )}
                    <span className="text-xs font-bold text-text-primary uppercase tracking-tight">{brand.name}</span>
                    <IconButton
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenDeleteConfirm("brand", brand)}
                      tooltip="Delete Brand"
                    >
                      <FaTrash />
                    </IconButton>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 w-full border border-dashed border-border rounded-xl">
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">No Brands</p>
                  <p className="text-[9px] text-text-disabled mt-1">Whitelist global manufacturers for subtype.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SPECS & GROUPS WORKSPACE */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-surface rounded-2xl border-2 border-border shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <FaListUl className="text-primary" size={16} />
                <div>
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Parameters & Spec Groups</h3>
                  <p className="text-[10px] text-text-secondary font-medium">Design structural specifications and logic groups for models.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {subtypeGroups.length > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleOpenOrderGroups}
                    leftIcon={<FaListUl />}
                  >
                    Reorder Groups
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenGroupModal()}
                  leftIcon={<FaPlus />}
                >
                  Create Group
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenAttrModal(null, "")}
                  leftIcon={<FaPlus />}
                >
                  Add Spec
                </Button>
              </div>
            </div>

            {/* List of Attribute Groups */}
            <div className="space-y-6">
              {groupedData.map((group) => {
                const isUngrouped = group.isVirtual;
                return (
                  <div key={group.id} className="border border-border rounded-2xl overflow-hidden bg-surface shadow-xs">

                    {/* Group Header */}
                    <div className="px-5 py-4 bg-surface-hover/20 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                        <span className="text-[11px] font-black text-text-primary uppercase tracking-widest">
                          {group.name}
                        </span>
                        {!isUngrouped && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <button
                              onClick={() => handleOpenGroupModal(group)}
                              className="text-text-secondary hover:text-primary transition-colors text-[10px]"
                              title="Edit group name"
                            >
                              <FaEdit size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {group.attributes.length > 1 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenOrderAttrs(group)}
                            leftIcon={<FaListUl />}
                          >
                            Reorder Specs
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenAttrModal(null, group.id)}
                          leftIcon={<FaPlus />}
                        >
                          Add Spec
                        </Button>
                      </div>
                    </div>

                    {/* Group Attributes list */}
                    <div className="p-4 divide-y divide-border/60">
                      {group.attributes.length > 0 ? (
                        group.attributes.map((attr) => {
                          const isSelection = ["dropdown", "multiselect"].includes(attr.data_type);
                          return (
                            <div key={attr.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="p-2 bg-surface-hover rounded-lg border border-border text-text-secondary mt-0.5 shrink-0">
                                  <FaSlidersH size={12} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-black uppercase text-text-primary tracking-tight">
                                      {attr.name}
                                    </span>
                                    <span className="text-[8px] font-black bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0">
                                      {attr.data_type === "dropdown" ? "Dropdown" : attr.data_type === "multiselect" ? "Multiselect" : attr.data_type}
                                    </span>
                                    {attr.is_required ? (
                                      <span className="text-[8px] font-black bg-danger/5 text-danger border border-danger/10 px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0">Required</span>
                                    ) : null}
                                    {attr.is_variant ? (
                                      <span className="text-[8px] font-black bg-success/5 text-success border border-success/10 px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0">Variant</span>
                                    ) : null}
                                    {attr.is_filterable ? (
                                      <span className="text-[8px] font-black bg-warning/5 text-warning border border-warning/10 px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0">Filter</span>
                                    ) : null}
                                  </div>
                                  <p className="text-[9px] text-text-secondary font-medium uppercase tracking-tight mt-1">
                                    {attr.attribute_type === "custom" ? "Custom engineering field" : `${attr.attribute_type === 'sku' ? 'SKU' : attr.attribute_type} system standard`}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                                {isSelection && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleOpenOptionsModal(attr)}
                                    leftIcon={<FaDatabase />}
                                  >
                                    Manage Options
                                  </Button>
                                )}
                                <IconButton
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenAttrModal(attr, group.id)}
                                  tooltip="Edit Spec"
                                >
                                  <FaEdit />
                                </IconButton>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-text-disabled italic text-[10px] font-medium">
                          No specifications mapped in this group. Click Add Spec to get started.
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}

              {groupedData.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl bg-surface-hover/10">
                  <FaSlidersH className="mx-auto text-text-disabled opacity-10 mb-4" size={48} />
                  <p className="text-text-secondary font-black text-xs uppercase tracking-[0.2em]">Workspace Initialized</p>
                  <p className="text-[10px] text-text-disabled mt-2 font-medium">Create a logic group or define your first engineering parameters to begin architecture design.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ==================== DIALOGS & MODALS ==================== */}

      {/* Brand Authorizations Modal */}
      <Dialog isOpen={showBrandModal} onClose={() => setShowBrandModal(false)} title="Authorize Brands" size="sm">
        <div className="space-y-6 pt-4">
          <MultiSelectDropdownWithSearchInput
            label="Whitelisted Manufacturers"
            options={brands.map((b) => ({
              value: b.id,
              text: (
                <div className="flex items-center gap-2">
                  <img src={b.logo} alt={b.name} className="w-4 h-4 object-contain rounded" />
                  <span>{b.name}</span>
                </div>
              )
            }))}
            values={selectedBrands}
            onChange={setSelectedBrands}
            placeholder="Select brands..."
          />
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setShowBrandModal(false)}>Discard</Button>
            <Button variant="primary" size="sm" onClick={handleSaveBrands} loading={isSaving} disabled={selectedBrands.length === 0}>
              Save Whitelist
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Scope Project Mapping Modal */}
      <Dialog isOpen={showScopeModal} onClose={() => setShowScopeModal(false)} title="Link Project Execution Categories" size="md">
        <div className="space-y-6 pt-4">
          <MultiSelectDropdownWithSearchInput
            label="Project Execution Scales"
            options={scopeOptions}
            values={selectedScopeTypeIds}
            onChange={setSelectedScopeTypeIds}
            placeholder="Select project hierarchy targets..."
            showSelectAll={true}
          />
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setShowScopeModal(false)}>Discard</Button>
            <Button variant="primary" size="sm" onClick={handleSaveScopes} loading={isSaving} disabled={selectedScopeTypeIds.length === 0}>
              Establish Mapping
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add/Edit Group Modal */}
      <Dialog isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title={isEditingGroup ? "Rename Logic Group" : "Create Technical Group"} size="sm">
        <div className="space-y-6 pt-4">
          <CustomInput
            label="Group Name"
            placeholder="e.g. Mechanical parameters"
            value={groupForm.name}
            onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setShowGroupModal(false)}>Discard</Button>
            <Button variant="primary" size="sm" onClick={handleSaveGroup} loading={isSaving} disabled={!groupForm.name.trim()}>
              Commit Group
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add/Edit Attribute Modal */}
      <Dialog isOpen={showAttrModal} onClose={() => setShowAttrModal(false)} title={isEditingAttr ? "Modify Specification Settings" : "Map Technical Specs"} size={"lg"}>
        <div className="space-y-6 pt-4">

          {/* Attribute Group Dropdown - Replaces separate move flow, lets users move attribute easily */}
          <DropdownWithSearchInput
            label="Target Group"
            options={[
              { value: "", text: "Extended Specifications (Ungrouped)" },
              ...subtypeGroups.map(g => ({ value: g.id, text: g.name }))
            ]}
            value={attrForm.group_id}
            onChange={val => setAttrForm({ ...attrForm, group_id: val })}
            placeholder="Select logic group..."
          />

          <div className="space-y-4">
            {!isEditingAttr && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  Specifications List ({specRows.length})
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSpecRows([...specRows, {
                    name: "",
                    data_type: "text",
                    unit_group_id: "",
                    is_required: false,
                    is_variant: false,
                    is_filterable: false,
                    attribute_type: "custom"
                  }])}
                  leftIcon={<FaPlus />}
                >
                  Add Row
                </Button>
              </div>
            )}

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {specRows.map((row, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-surface-hover/20 space-y-4 relative group/row">
                  {!isEditingAttr && specRows.length > 1 && (
                    <div className="absolute right-3 top-3">
                      <IconButton
                        variant="danger"
                        size="sm"
                        onClick={() => setSpecRows(specRows.filter((_, i) => i !== idx))}
                        tooltip="Remove Row"
                      >
                        <FaTrash />
                      </IconButton>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomInput
                      label="Specification Label"
                      placeholder="e.g. Module Efficiency"
                      value={row.name}
                      onChange={e => {
                        const updated = [...specRows];
                        updated[idx].name = e.target.value;
                        setSpecRows(updated);
                      }}
                      disabled={isLockedAttribute(row)}
                    />

                    <DropdownWithSearchInput
                      label="Input Interface Logic"
                      options={row.attribute_type === "sku" ? DATA_TYPES.filter(d => d.value !== "file") : DATA_TYPES}
                      value={row.data_type}
                      onChange={val => {
                        const updated = [...specRows];
                        updated[idx].data_type = val;
                        if (val !== "number") updated[idx].unit_group_id = "";
                        setSpecRows(updated);
                      }}
                      disabled={isLockedAttribute(row)}
                    />
                  </div>

                  {row.data_type === "number" && (
                    <DropdownWithSearchInput
                      label="Engineering Unit Standard"
                      options={unitGroups.map(g => ({ value: g.id, text: g.name }))}
                      value={row.unit_group_id}
                      onChange={val => {
                        const updated = [...specRows];
                        updated[idx].unit_group_id = val;
                        setSpecRows(updated);
                      }}
                      placeholder="Normalize measurement unit..."
                      disabled={isLockedAttribute(row)}
                    />
                  )}

                  <div className="p-3 bg-surface rounded-lg border border-border flex flex-wrap gap-6">
                    <CustomInput
                      type="checkbox"
                      customCheckbox
                      options={CHECKBOX_OPTIONS.required}
                      value={row.is_required ? "Y" : ""}
                      disabled={isLockedAttribute(row)}
                      onChange={e => {
                        const updated = [...specRows];
                        updated[idx].is_required = e.target.checked;
                        setSpecRows(updated);
                      }}
                    />
                    <CustomInput
                      type="checkbox"
                      customCheckbox
                      options={CHECKBOX_OPTIONS.variant}
                      value={row.is_variant ? "Y" : ""}
                      disabled={isLockedAttribute(row)}
                      onChange={e => {
                        const updated = [...specRows];
                        updated[idx].is_variant = e.target.checked;
                        setSpecRows(updated);
                      }}
                    />
                    <CustomInput
                      type="checkbox"
                      customCheckbox
                      options={CHECKBOX_OPTIONS.filter}
                      value={row.is_filterable ? "Y" : ""}
                      disabled={isLockedAttribute(row)}
                      onChange={e => {
                        const updated = [...specRows];
                        updated[idx].is_filterable = e.target.checked;
                        setSpecRows(updated);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setShowAttrModal(false)}>Discard</Button>
            <Button variant="primary" size="sm" onClick={handleSaveAttr} loading={isSaving} disabled={!specRows.some(r => r.name.trim())}>
              Commit Specs
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Option Sets Management Modal */}
      <Dialog isOpen={showOptionsModal} onClose={() => setShowOptionsModal(false)} title={`Configure Dropdown Options - ${selectedAttrForOptions?.name || ""}`} size="md">
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-text-secondary tracking-widest">
              Current Values ({activeOptionValues.length})
            </span>
            <div className="flex gap-2">
              {activeOptionValues.length > 1 && !selectedAttrForOptions?.is_system && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenOrderValues}
                  leftIcon={<FaListUl />}
                >
                  Reorder Options
                </Button>
              )}
              {!selectedAttrForOptions?.is_system ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsEditingOption(false);
                    setEditingOptionId(null);
                    setOptionRows([{ value: "", is_active: true }]);
                    setShowOptionEditModal(true);
                  }}
                  leftIcon={<FaPlus />}
                >
                  Add Option
                </Button>
              ) : (
                <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-amber-500/20">
                  <FaLock size={10} /> System Attribute Locked
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {activeOptionValues.map((opt) => (
              <div
                key={opt.id}
                className="flex items-center justify-between p-3.5 bg-surface-hover/40 rounded-xl border border-border hover:border-primary/20 transition-all shadow-xs group/opt"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${opt.is_active ? "bg-success" : "bg-text-disabled"}`} />
                  <span className="text-xs font-bold text-text-primary uppercase tracking-tight truncate">{opt.value}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedAttrForOptions?.is_system ? (
                    <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600 border border-amber-500/15" title="System defined option">
                      <FaLock size={10} />
                    </div>
                  ) : (
                    <>
                      <IconButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenOptionEdit(opt)}
                      >
                        <FaEdit size={10} />
                      </IconButton>
                      <IconButton
                        variant="danger"
                        size="sm"
                        onClick={() => handleOpenDeleteConfirm("value", opt)}
                      >
                        <FaTrash size={10} />
                      </IconButton>
                    </>
                  )}
                </div>
              </div>
            ))}
            {activeOptionValues.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-border rounded-xl">
                <FaDatabase className="mx-auto text-text-disabled opacity-15 mb-3" size={32} />
                <p className="text-[10px] font-black text-text-disabled uppercase tracking-widest">No options registered</p>
                <p className="text-[9px] text-text-disabled mt-1">Configure valid dropdown menu selection choices.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setShowOptionsModal(false)}>Close</Button>
          </div>
        </div>
      </Dialog>

      {/* Add/Edit Single Option Dialog */}
      <Dialog isOpen={showOptionEditModal} onClose={() => setShowOptionEditModal(false)} title={isEditingOption ? "Modify Selection Option" : "Add Dropdown Value"} size="sm">
        <div className="space-y-6 pt-4">
          {optionRows.map((row, idx) => (
            <div key={idx} className="space-y-4">
              <CustomInput
                label="Option Value Label"
                placeholder="e.g. 550 Watt, Mono-Perc..."
                value={row.value}
                onChange={e => {
                  const updated = [...optionRows];
                  updated[idx].value = e.target.value;
                  setOptionRows(updated);
                }}
              />
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary cursor-pointer hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={row.is_active}
                  onChange={e => {
                    const updated = [...optionRows];
                    updated[idx].is_active = e.target.checked;
                    setOptionRows(updated);
                  }}
                  className="w-4 h-4 rounded-md border-border accent-primary cursor-pointer"
                />
                Active in Catalog
              </label>
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setShowOptionEditModal(false)}>Discard</Button>
            <Button variant="primary" size="sm" onClick={handleAddOptionItem} loading={isSaving} disabled={!optionRows[0].value.trim()}>
              Commit Option
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ==================== REORDERING DIALOGS ==================== */}

      {/* Reorder Groups Modal */}
      <Dialog isOpen={showOrderGroupsModal} onClose={() => setShowOrderGroupsModal(false)} title="Sequence Technical Groups" size="sm">
        <div className="space-y-5 pt-4">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Rearrange logic layout display sequencing.</p>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {orderList.map((group, idx) => (
              <div
                key={group.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`p-3 bg-surface border rounded-xl flex items-center justify-between transition-all cursor-grab active:cursor-grabbing ${draggedIndex === idx ? "border-primary bg-primary/5 opacity-50 scale-[0.98] border-dashed" : "border-border hover:border-primary/40 hover:bg-surface-hover shadow-xs"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-text-secondary opacity-40 hover:opacity-100 p-1 cursor-grab">
                    <FaGripVertical size={12} />
                  </div>
                  <span className="text-[10px] font-black text-primary bg-primary/5 w-6 h-6 flex items-center justify-center rounded-lg border border-primary/10">{idx + 1}</span>
                  <span className="text-xs font-bold text-text-primary uppercase tracking-tight">{group.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton
                    variant="primary"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, "up")}
                  >
                    <FaChevronUp size={10} />
                  </IconButton>
                  <IconButton
                    variant="primary"
                    size="sm"
                    disabled={idx === orderList.length - 1}
                    onClick={() => moveItem(idx, "down")}
                  >
                    <FaChevronDown size={10} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowOrderGroupsModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCommitGroupsOrder} loading={isSaving}>Commit Order</Button>
          </div>
        </div>
      </Dialog>

      {/* Reorder Attributes Modal */}
      <Dialog isOpen={showOrderAttrsModal} onClose={() => setShowOrderAttrsModal(false)} title={`Sequence parameters - ${orderingGroup?.name || ""}`} size="sm">
        <div className="space-y-5 pt-4">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Rearrange parameters order.</p>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {orderList.map((attr, idx) => (
              <div
                key={attr.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`p-3 bg-surface border rounded-xl flex items-center justify-between transition-all cursor-grab active:cursor-grabbing ${draggedIndex === idx ? "border-primary bg-primary/5 opacity-50 scale-[0.98] border-dashed" : "border-border hover:border-primary/40 hover:bg-surface-hover shadow-xs"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-text-secondary opacity-40 hover:opacity-100 p-1 cursor-grab">
                    <FaGripVertical size={12} />
                  </div>
                  <span className="text-[10px] font-black text-primary bg-primary/5 w-6 h-6 flex items-center justify-center rounded-lg border border-primary/10">{idx + 1}</span>
                  <span className="text-xs font-bold text-text-primary uppercase tracking-tight">{attr.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton
                    variant="primary"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, "up")}
                  >
                    <FaChevronUp size={10} />
                  </IconButton>
                  <IconButton
                    variant="primary"
                    size="sm"
                    disabled={idx === orderList.length - 1}
                    onClick={() => moveItem(idx, "down")}
                  >
                    <FaChevronDown size={10} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowOrderAttrsModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCommitAttrsOrder} loading={isSaving}>Commit Order</Button>
          </div>
        </div>
      </Dialog>

      {/* Reorder Options Modal */}
      <Dialog isOpen={showOrderValuesModal} onClose={() => setShowOrderValuesModal(false)} title={`Sort Options - ${selectedAttrForOptions?.name || ""}`} size="sm">
        <div className="space-y-5 pt-4">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Rearrange select option ordering.</p>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {orderList.map((val, idx) => (
              <div
                key={val.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`p-3 bg-surface border rounded-xl flex items-center justify-between transition-all cursor-grab active:cursor-grabbing ${draggedIndex === idx ? "border-primary bg-primary/5 opacity-50 scale-[0.98] border-dashed" : "border-border hover:border-primary/40 hover:bg-surface-hover shadow-xs"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-text-secondary opacity-40 hover:opacity-100 p-1 cursor-grab">
                    <FaGripVertical size={12} />
                  </div>
                  <span className="text-[10px] font-black text-primary bg-primary/5 w-6 h-6 flex items-center justify-center rounded-lg border border-primary/10">{idx + 1}</span>
                  <span className="text-xs font-bold text-text-primary uppercase tracking-tight">{val.value}</span>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton
                    variant="primary"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, "up")}
                  >
                    <FaChevronUp size={10} />
                  </IconButton>
                  <IconButton
                    variant="primary"
                    size="sm"
                    disabled={idx === orderList.length - 1}
                    onClick={() => moveItem(idx, "down")}
                  >
                    <FaChevronDown size={10} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowOrderValuesModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCommitValuesOrder} loading={isSaving}>Commit Order</Button>
          </div>
        </div>
      </Dialog>

      {/* ConfirmationPopup (for Deletion) */}
      <ConfirmationPopup
        isOpen={deleteConfirmState.isOpen}
        onCancel={() => setDeleteConfirmState({ isOpen: false, type: "", id: null, title: "", message: "" })}
        onConfirm={handleConfirmDelete}
        title={deleteConfirmState.title}
        message={deleteConfirmState.message}
        variant="danger"
        confirmText="Yes, delete"
        cancelText="Discard"
      />

    </div>
  );
}
