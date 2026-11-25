import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import CustomInput from "@/components/CustomInput";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import Dropdown from "@/components/Dropdown";
import ToggleButton from "@/components/ToggleButton";
import { FaSort, FaSortUp, FaSortDown, FaSearch, FaClock } from "react-icons/fa";
import { FiCheckCircle, FiAlertCircle, FiPackage, FiSettings, FiList, FiSave, FiChevronLeft, FiClock, FiTrash2, FiPlus } from "react-icons/fi";
import { setAlert } from "@/features/alert.slice";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";

const fieldTypes = [
  { text: "Single Line Input", value: "single_line_input" },
  { text: "Multi Line Input", value: "multi_line_input" },
  { text: "Number", value: "number" },
  { text: "Email", value: "email" },
  { text: "Date", value: "date" },
  { text: "File", value: "file" },
  { text: "Dropdown", value: "dropdown" },
  { text: "Multi Select Dropdown", value: "multi_select_dropdown" },
  { text: "Checkbox", value: "checkbox" },
  { text: "Yes/No", value: "yesno" },
]

const validationTypes = [
  { text: "Min", value: "min" },
  { text: "Max", value: "max" },
  { text: "Regex", value: "regex" },
  { text: "File Type", value: "file_type" },
  { text: "Min Files", value: "min_files" },
  { text: "Max Files", value: "max_files" },
  { text: "Max File Size (KB)", value: "max_file_size" },
];

const fileTypes = [
  // Images
  { text: "JPEG", value: "image/jpeg" },
  { text: "PNG", value: "image/png" },
  { text: "GIF", value: "image/gif" },
  { text: "SVG", value: "image/svg+xml" },
  { text: "WebP", value: "image/webp" },
  // Documents
  { text: "PDF", value: "application/pdf" },
  { text: "MS Word", value: "application/msword" },
  { text: "MS Word (docx)", value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { text: "MS Excel", value: "application/vnd.ms-excel" },
  { text: "MS Excel (xlsx)", value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  // Audio
  { text: "MP3", value: "audio/mpeg" },
  { text: "WAV", value: "audio/wav" },
  // Video
  { text: "MP4", value: "video/mp4" },
  { text: "AVI", value: "video/x-msvideo" },
];

export default function WarehouseProfileSection({ moduleUniqueId }) {
  const { warehouseId, sectionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // State for the new field being created
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("");
  const [newFieldValidations, setNewFieldValidations] = useState([]);

  // State for the current validation being configured
  const [validationType, setValidationType] = useState("");
  const [validationValue, setValidationValue] = useState("");
  const [selectedFileTypes, setSelectedFileTypes] = useState([]);
  const [validationErrorMessage, setValidationErrorMessage] = useState("");

  // State for dropdown options
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [optionText, setOptionText] = useState("");
  const [optionValue, setOptionValue] = useState("");

  // State for field dependency
  const [parentField, setParentField] = useState("");
  const [dependencyType, setDependencyType] = useState("show");
  const [parentValueCondition, setParentValueCondition] = useState([]);
  const [isConditional, setIsConditional] = useState(false);
  const [enabledFields, setEnabledFields] = useState([]);

  const [section, setSection] = useState(null);
  const [warehouse, setWarehouse] = useState(null);
  const [fields, setFields] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [originalFields, setOriginalFields] = useState([]);
  const [validationTimers, setValidationTimers] = useState({});

  // Save due date modal state
  const [saveDueModalOpen, setSaveDueModalOpen] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [savingChanges, setSavingChanges] = useState(false);

  const itemsPerPageOptions = [
    { text: "5 per page", value: 5 },
    { text: "10 per page", value: 10 },
    { text: "20 per page", value: 20 },
  ];

  const getSection = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/warehouses/validation/sections/${warehouseId}/${sectionId}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } })
      setSection(res.data.section)
      const fetchedFields = res.data.fields || [];
      setFields(JSON.parse(JSON.stringify(fetchedFields)));
      setOriginalFields(JSON.parse(JSON.stringify(fetchedFields)));
      setEnabledFields(fetchedFields.map(f => ({ field_id: f.id, is_enabled: f.is_enabled || false })));
    } catch (error) {
      console.log(error)
    }
  }

  const fetchWarehouse = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/warehouses/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`, { headers: { ...authHeaderObj() } })
      setWarehouse(res.data.warehouse)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getSection()
    fetchWarehouse()
    setParentField("");
    setIsConditional(false);
    setDependencyType("show");
    setParentValueCondition([]);
  }, [warehouseId, sectionId])

  const getDirtyFields = () => {
    return fields.filter(field => {
      const original = originalFields.find(o => o.id === field.id);
      if (!original) return false;

      const currentEnabled = enabledFields.find(f => f.field_id === field.id)?.is_enabled || false;
      const originalEnabled = original.is_enabled || false;

      const isEnabledChanged = currentEnabled !== originalEnabled;
      const isMinFilesChanged = field.min_files !== original.min_files;
      const isMaxFilesChanged = field.max_files !== original.max_files;

      return isEnabledChanged || isMinFilesChanged || isMaxFilesChanged;
    });
  };

  const getAvailableValidationTypes = () => {
    const addedValidationTypes = newFieldValidations.map(v => v.type);
    let availableTypes = [];
    switch (newFieldType) {
      case "file":
        availableTypes = validationTypes.filter(v => ["file_type", "min_files", "max_files", "max_file_size"].includes(v.value));
        break;
      case "number":
        availableTypes = validationTypes.filter(v => ["min", "max"].includes(v.value));
        break;
      case "single_line_input":
      case "multi_line_input":
        availableTypes = validationTypes.filter(v => ["min", "max", "regex"].includes(v.value));
        break;
      default:
        availableTypes = [];
    }
    return availableTypes.filter(v => !addedValidationTypes.includes(v.value));
  };

  const handleFieldTypeChange = (value) => {
    setNewFieldType(value);
    setValidationType("");
    setValidationValue("");
    setValidationErrorMessage("");
    setSelectedFileTypes([]);
    setNewFieldValidations([]);
    setDropdownOptions([]);
    if (isConditional) {
      setParentField("");
      setDependencyType("show");
      setParentValueCondition([]);
    }
  };

  const handleAddValidation = () => {
    if (!validationType) {
      dispatch(setAlert({ type: "warning", message: "Please select a validation type." }));
      return;
    }

    if (!validationErrorMessage.trim()) {
      dispatch(setAlert({ type: "warning", message: "Please provide an error message for the validation rule." }));
      return;
    }

    let value;
    if (validationType === "file_type") {
      value = selectedFileTypes;
      if (value.length === 0) {
        dispatch(setAlert({ type: "warning", message: "Please select at least one file type." }));
        return;
      }
    } else {
      value = validationValue;
      if (!value || !value.trim()) {
        dispatch(setAlert({ type: "warning", message: "Please enter a value for the validation." }));
        return;
      }
    }

    if (newFieldValidations.some(v => v.type === validationType)) {
      dispatch(setAlert({ type: "warning", message: `Validation of type "${validationType}" has already been added.` }));
      return;
    }

    setNewFieldValidations([...newFieldValidations, { type: validationType, value, message: validationErrorMessage }]);
    setValidationType("");
    setValidationValue("");
    setSelectedFileTypes([]);
    setValidationErrorMessage("");
  };

  const handleRemoveValidation = (indexToRemove) => {
    setNewFieldValidations(newFieldValidations.filter((_, index) => index !== indexToRemove));
  };

  const handleAddDropdownOption = () => {
    if (!optionText.trim() || !optionValue.trim()) {
      dispatch(setAlert({ type: "warning", message: "Both option text and value are required." }));
      return;
    }
    if (dropdownOptions.some(o => o.value === optionValue)) {
      dispatch(setAlert({ type: "warning", message: "This option value already exists." }));
      return;
    }

    setDropdownOptions([...dropdownOptions, { text: optionText, value: optionValue }]);
    setOptionText("");
    setOptionValue("");
  };

  const handleRemoveDropdownOption = (indexToRemove) => {
    setDropdownOptions(dropdownOptions.filter((_, index) => index !== indexToRemove));
  };

  const renderValidationInput = () => {
    switch (validationType) {
      case "min":
      case "max":
      case "min_files":
      case "max_files":
      case "max_file_size":
        return (
          <CustomInput
            label={validationType === 'max_file_size' ? "Value (KB)" : "Value"}
            type="number"
            value={validationValue}
            onChange={(e) => setValidationValue(e.target.value)}
          />
        );
      case "regex":
        return <CustomInput label="Regex Pattern" value={validationValue} onChange={(e) => setValidationValue(e.target.value)} />;
      case "file_type":
        return (
          <MultiSelectDropdownWithSearchInput label="File Types" options={fileTypes} values={selectedFileTypes} onChange={setSelectedFileTypes} valueKey="value" />
        );
      default:
        return null;
    }
  };

  const handleAddField = async () => {
    if (!newFieldName || !newFieldLabel || !newFieldType) {
      dispatch(setAlert({ type: "warning", message: "Please fill in all required fields (Name, Label, Type)." }));
      return;
    }

    if (['dropdown', 'multi_select_dropdown'].includes(newFieldType) && dropdownOptions.length === 0) {
      dispatch(setAlert({ type: "warning", message: "Please add at least one option for the dropdown." }));
      return;
    }

    try {
      const payload = {
        section: sectionId,
        field: {
          name: newFieldName,
          label: newFieldLabel,
          field_type: newFieldType,
          validations: newFieldValidations.map(v => ({
            validation_type: v.type,
            validation_value: Array.isArray(v.value) ? JSON.stringify(v.value) : v.value,
            error_message: v.message
          })),
          dependency: isConditional && parentField ? {
            parent_field: parentField,
            dependency_type: dependencyType,
            parent_value: JSON.stringify(parentValueCondition)
          } : null,
          options: dropdownOptions
        }
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/warehouses/validation/fields/add?unique_id=${moduleUniqueId}&req_for=add`, payload, { headers: { ...authHeaderObj() } });
      dispatch(setAlert({ type: "success", message: "Field added successfully." }));
      setNewFieldName("");
      setNewFieldLabel("");
      setNewFieldType("");
      setNewFieldValidations([]);
      setDropdownOptions([]);
      setValidationType("");
      setValidationValue("");
      setValidationErrorMessage("");
      setSelectedFileTypes([]);
      setOptionText("");
      setOptionValue("");
      setIsConditional(false);
      setParentField("");
      setDependencyType("show");
      setParentValueCondition([]);
      getSection();
    } catch (error) {
      dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Failed to add field." }));
    }
  };

  const potentialParentFields = fields.filter(f =>
    ['dropdown', 'multi_select_dropdown', 'yesno', 'checkbox'].includes(f.field_type)
  );
  const selectedParentField = fields.find(f => f.id === parentField);

  const getParentValueOptions = () => {
    if (!selectedParentField) return [];
    switch (selectedParentField.field_type) {
      case 'yesno':
        return [{ text: 'Yes', value: 'yes' }, { text: 'No', value: 'no' }];
      case 'checkbox':
        return [{ text: 'Checked', value: 'true' }, { text: 'Unchecked', value: 'false' }];
      case 'dropdown':
      case 'multi_select_dropdown':
        return selectedParentField.options || [];
      default:
        return [];
    }
  };

  const renderParentValueInput = () => {
    const options = getParentValueOptions();
    if (!selectedParentField || options.length === 0) return null;

    const isMultiSelect = ['multi_select_dropdown'].includes(selectedParentField.field_type);

    if (isMultiSelect) {
      return (
        <MultiSelectDropdownWithSearchInput
          label="Parent Field Value"
          options={options}
          values={parentValueCondition}
          onChange={setParentValueCondition}
          valueKey="value"
        />
      );
    }

    return (
      <DropdownWithSearchInput
        label="Parent Field Value"
        options={options}
        value={parentValueCondition[0] || ""}
        onChange={(val) => setParentValueCondition(val ? [val] : [])}
        placeholder="Select Parent Value"
      />
    );
  };

  const handleResetForm = () => {
    setNewFieldName("");
    setNewFieldLabel("");
    setNewFieldType("");
    setNewFieldValidations([]);
    setDropdownOptions([]);
    setValidationType("");
    setValidationValue("");
    setValidationErrorMessage("");
    setSelectedFileTypes([]);
    setOptionText("");
    setOptionValue("");
    setIsConditional(false);
    setParentField("");
    setDependencyType("show");
    setParentValueCondition([]);
    dispatch(setAlert({ type: 'info', message: 'Form has been reset.' }));
  };

  const handleFileValidationChange = (fieldId, type, rawValue) => {
    const timerKey = `${fieldId}-${type}`;
    if (validationTimers[timerKey]) {
      clearTimeout(validationTimers[timerKey]);
    }

    const oldFieldState = fields.find(f => f.id === fieldId);
    const oldValue = oldFieldState ? oldFieldState[type] : null;

    const immediateUpdate = fields.map(f => (f.id === fieldId ? { ...f, [type]: rawValue } : f));
    setFields(immediateUpdate);

    const newTimer = setTimeout(() => {
      const value = rawValue === null || rawValue === '' ? null : Number(rawValue);
      let isValid = true;
      let errorMessage = '';

      if (value !== null && value < 0) {
        isValid = false;
        errorMessage = 'Value cannot be negative.';
      } else if (type === 'max_files' && value !== null && value < 1) {
        isValid = false;
        errorMessage = 'Max files must be 1 or more.';
      } else {
        const currentMin = type === 'min_files' ? value : oldFieldState.min_files;
        const currentMax = type === 'max_files' ? value : oldFieldState.max_files;
        if (currentMin !== null && currentMax !== null && currentMin > currentMax) {
          isValid = false;
          errorMessage = 'Min files cannot be greater than Max files.';
        }
      }

      if (isValid) {
        const finalFields = fields.map(f => (f.id === fieldId ? { ...f, [type]: value } : f));
        setFields(finalFields);
      } else {
        dispatch(setAlert({ type: 'error', message: errorMessage }));
        const revertedFields = fields.map(f => (f.id === fieldId ? { ...f, [type]: oldValue } : f));
        setFields(revertedFields);
      }
    }, 2000);

    setValidationTimers(prev => ({ ...prev, [timerKey]: newTimer }));
  };

  const handleToggleField = (fieldId, isEnabled) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    if (isEnabled && field.dependency?.parent_field) {
      const parentFieldId = field.dependency.parent_field.id;
      const parentStatus = enabledFields.find(f => f.field_id === parentFieldId);
      if (!parentStatus || !parentStatus.is_enabled) {
        dispatch(setAlert({ type: 'warning', message: 'You must enable the parent field first.' }));
        return;
      }
    }

    let updatedEnabledFields = enabledFields.map(f =>
      f.field_id === fieldId ? { ...f, is_enabled: isEnabled } : f
    );

    const getChildrenRecursive = (parentId) => {
      const directChildren = fields.filter(f => f.dependency?.parent_field?.id === parentId);
      let allChildren = [...directChildren];
      for (const child of directChildren) {
        allChildren = [...allChildren, ...getChildrenRecursive(child.id)];
      }
      return allChildren;
    };

    const children = getChildrenRecursive(fieldId);
    const childrenIds = children.map(f => f.id);
    const allAffectedIds = [fieldId, ...childrenIds];

    if (childrenIds.length > 0) {
      updatedEnabledFields = updatedEnabledFields.map(f =>
        childrenIds.includes(f.field_id)
          ? { ...f, is_enabled: isEnabled }
          : f
      );
    }

    if (!isEnabled) {
      const newValidationTimers = { ...validationTimers };
      let timersCleared = false;

      setFields(prevFields => prevFields.map(f => {
        if (allAffectedIds.includes(f.id) && f.field_type === 'file') {
          ['min_files', 'max_files'].forEach(type => {
            const timerKey = `${f.id}-${type}`;
            if (newValidationTimers[timerKey]) {
              clearTimeout(newValidationTimers[timerKey]);
              delete newValidationTimers[timerKey];
              timersCleared = true;
            }
          });
          return { ...f, min_files: null, max_files: null };
        }
        return f;
      }));

      if (timersCleared) {
        setValidationTimers(newValidationTimers);
      }
    }

    setEnabledFields(updatedEnabledFields);
  };

  const handleSaveChangesClick = () => {
    const dirtyFields = getDirtyFields();
    if (dirtyFields.length === 0) {
      dispatch(setAlert({ type: 'info', message: 'No changes to save.' }));
      return;
    }

    // Check if the warehouse needs a due date because the status will revert to 2
    if (warehouse && [3, 4, 5].includes(warehouse.status_id)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0);
      const offset = tomorrow.getTimezoneOffset();
      const localTime = new Date(tomorrow.getTime() - (offset*60*1000));
      setSelectedDueDate(localTime.toISOString().slice(0, 16));
      setSaveDueModalOpen(true);
    } else {
      handleSaveChanges(null);
    }
  };

  const handleSaveChanges = async (dueDateVal) => {
    const dirtyFields = getDirtyFields();
    try {
      setSavingChanges(true);
      const statusesToUpdate = dirtyFields.map(fieldData => {
        const enabledData = enabledFields.find(f => f.field_id === fieldData.id);
        return {
          field_id: fieldData.id,
          is_enabled: enabledData ? enabledData.is_enabled : (fieldData.is_enabled || false),
          min_files: fieldData.min_files,
          max_files: fieldData.max_files,
        };
      });

      await axios.post(`${import.meta.env.VITE_API_URL}/warehouses/validation/validaion-status?unique_id=${moduleUniqueId}&req_for=edit`, {
        warehouse_id: warehouseId,
        statuses: statusesToUpdate,
        due_date: dueDateVal || undefined
      }, { headers: { ...authHeaderObj() } });

      dispatch(setAlert({ type: 'success', message: 'All changes have been saved successfully.' }));
      setSaveDueModalOpen(false);
      
      const updatedOriginalFields = fields.map(o => {
        const enabledData = enabledFields.find(f => f.field_id === o.id);
        return {
          ...o,
          is_enabled: enabledData ? enabledData.is_enabled : (o.is_enabled || false)
        };
      });
      setOriginalFields(JSON.parse(JSON.stringify(updatedOriginalFields)));
      fetchWarehouse();
    } catch (error) {
      dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Failed to save changes." }));
    } finally {
      setSavingChanges(false);
    }
  };

  const sortedFields = [...fields].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key] ? a[sortConfig.key].toString().toLowerCase() : "";
    const bVal = b[sortConfig.key] ? b[sortConfig.key].toString().toLowerCase() : "";
    if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const filteredFields = sortedFields.filter(field =>
    (field.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (field.label || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFields.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentFields = filteredFields.slice(startIndex, startIndex + itemsPerPage);
  const endIndex = startIndex + currentFields.length;

  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        pageNumbers.push(currentPage - 1);
        pageNumbers.push(currentPage);
        pageNumbers.push(currentPage + 1);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-text-secondary ml-1" />;
    if (sortConfig.direction === 'ascending') return <FaSortUp className="text-primary ml-1" />;
    return <FaSortDown className="text-primary ml-1" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Profile Fields"
        subtitle={`Configure profile fields and rules for ${section?.name || 'this section'}`}
        icon={FiSettings}
        actions={
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            leftIcon={<FiChevronLeft />}
            className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-[0.98] h-[46px]"
          >
            Sections
          </Button>
        }
        stats={[
          { label: "Total Fields", value: fields.length, description: "In section" },
          { label: "Enabled", value: fields.filter(f => f.is_enabled).length, description: "Active fields" },
          { label: "Disabled", value: fields.length - fields.filter(f => f.is_enabled).length, description: "Inactive fields" },
          { label: "Status", value: "Active", description: "System ready" }
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* CREATE NEW FIELD (Left Column) */}
        <div className="xl:col-span-4">
          <div className="card hover:shadow-xl transition-all duration-300 bg-surface border border-border">
            <div className="p-6">
              {/* Card Tag */}
              <div className="flex justify-end mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary/5 text-text-secondary border border-primary/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <FaClock size={10} className="text-primary" />
                  Field Editor
                </span>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white shadow-md shadow-primary/10">
                  <FiPackage className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-text-primary text-base uppercase tracking-tight">Create Field</h3>
                  <p className="text-text-secondary text-xs font-medium">Add specs to {section?.name}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mb-6">
                <Button
                  onClick={handleResetForm}
                  variant="secondary"
                  size="sm"
                  leftIcon={<FiClock />}
                  className="whitespace-nowrap rounded-lg text-xs font-bold px-3 py-1.5 hover:bg-surface-hover border-border/80"
                >
                  Clear Form
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Field Info */}
                <div className="flex flex-col gap-4">
                  <CustomInput
                    label="Field Name *"
                    placeholder="e.g. height_mm"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                  />
                  <CustomInput
                    label="Display Label *"
                    placeholder="e.g. Height (mm)"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                  />
                  <DropdownWithSearchInput
                    label="Field Type *"
                    value={newFieldType}
                    onChange={handleFieldTypeChange}
                    options={fieldTypes}
                    placeholder="Select Type..."
                  />
                </div>

                {/* Dropdown Options */}
                {['dropdown', 'multi_select_dropdown'].includes(newFieldType) && (
                  <>
                    <div className="border-t border-border/60 my-5"></div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
                        <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center text-primary">
                          <FiList className="w-3.5 h-3.5" />
                        </div>
                        Options List
                      </h3>
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <CustomInput
                            label="Text"
                            placeholder="e.g. Option A"
                            value={optionText}
                            onChange={(e) => setOptionText(e.target.value)}
                          />
                          <CustomInput
                            label="Value"
                            placeholder="e.g. option_a"
                            value={optionValue}
                            onChange={(e) => setOptionValue(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleAddDropdownOption}
                          type="button"
                          variant="primary"
                          leftIcon={<FiPlus />}
                          className="w-full h-11 flex items-center justify-center font-bold text-xs"
                        >
                          Add Option
                        </Button>
                      </div>
                      {dropdownOptions.length > 0 && (
                        <div className="mt-3">
                          <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {dropdownOptions.map((opt, index) => (
                              <li key={index} className="flex items-center justify-between bg-surface-hover/60 p-2.5 rounded-xl text-xs gap-2 border border-border/60">
                                <span className="break-all text-text-secondary font-medium">
                                  <span className="font-bold text-primary">Label:</span> {opt.text}
                                  <span className="font-bold text-primary ml-2.5">Val:</span> {opt.value}
                                </span>
                                <Button
                                  onClick={() => handleRemoveDropdownOption(index)}
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<FiTrash2 className="w-3.5 h-3.5" />}
                                  className="text-danger hover:text-danger/80 font-bold hover:bg-danger/5 rounded-lg px-2 py-1"
                                >
                                  Delete
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="border-t border-border/60 my-5"></div>

                {/* Field Dependency */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
                      <div className="w-5 h-5 bg-amber-500/10 rounded flex items-center justify-center text-amber-600">
                        <FiAlertCircle className="w-3.5 h-3.5" />
                      </div>
                      Dependency
                    </h3>
                    <ToggleButton
                      checked={isConditional}
                      onChange={setIsConditional}
                      label=""
                      className="text-sm"
                    />
                  </div>

                  {isConditional && (
                    <div className="flex flex-col gap-4 p-4 border border-dashed border-primary/30 rounded-xl bg-primary/5/20">
                      <DropdownWithSearchInput
                        label="Parent Field"
                        options={potentialParentFields.map(f => ({ text: f.label, value: f.id }))}
                        value={parentField}
                        onChange={setParentField}
                        placeholder="Select Parent..."
                      />
                      <Dropdown
                        label="Dependency Type"
                        options={[
                          { text: "Show when...", value: "show" },
                          { text: "Require when...", value: "require" },
                        ]}
                        value={dependencyType}
                        onChange={setDependencyType}
                      />
                      {renderParentValueInput()}
                    </div>
                  )}
                </div>

                <div className="border-t border-border/60 my-5"></div>

                {/* Validation Rules */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-500/10 rounded flex items-center justify-center text-green-600">
                      <FiCheckCircle className="w-3.5 h-3.5" />
                    </div>
                    Validation Rules
                  </h3>
                  {newFieldType ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-4">
                        <DropdownWithSearchInput
                          label="Validation Type"
                          value={validationType}
                          onChange={(v) => setValidationType(v)}
                          options={getAvailableValidationTypes()}
                          placeholder="Select Rule..."
                        />
                        {renderValidationInput()}
                        <CustomInput
                          label="Error Message"
                          value={validationErrorMessage}
                          onChange={(e) => setValidationErrorMessage(e.target.value)}
                          placeholder="e.g., Value is too short"
                        />
                      </div>
                      <Button
                        onClick={handleAddValidation}
                        variant="primary"
                        leftIcon={<FiPlus />}
                        className="w-full h-11 flex items-center justify-center font-bold text-xs"
                      >
                        Add Rule
                      </Button>

                      {newFieldValidations.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary mb-2">Configured Rules:</h4>
                          <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {newFieldValidations.map((v, index) => {
                              const validationTypeText = validationTypes.find(vt => vt.value === v.type)?.text || v.type;

                              let validationValueText;
                              if (v.type === 'file_type' && Array.isArray(v.value)) {
                                validationValueText = v.value.map(val => fileTypes.find(ft => ft.value === val)?.text || val).join(', ');
                              } else {
                                validationValueText = v.value;
                              }

                              return (
                                <li key={index} className="flex flex-col bg-surface-hover/60 p-3 rounded-xl border border-border/60 gap-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-bold text-xs text-primary uppercase tracking-wide">{validationTypeText}: <span className="font-normal text-text-primary capitalize">{validationValueText}</span></p>
                                      <p className="text-[11px] text-danger mt-1">Error: "{v.message}"</p>
                                    </div>
                                    <Button
                                      onClick={() => handleRemoveValidation(index)}
                                      variant="ghost"
                                      size="sm"
                                      leftIcon={<FiTrash2 className="w-3.5 h-3.5" />}
                                      className="text-danger hover:text-danger/80 font-bold hover:bg-danger/5 rounded-lg px-2.5 py-1"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/15">
                      <p className="text-amber-600 text-xs font-semibold flex items-center gap-2">
                        <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                        Please select a Field Type to unlock validation configurations.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/60 my-6"></div>

                <Button
                  onClick={handleAddField}
                  variant="primary"
                  leftIcon={<FiPlus />}
                  className="w-full h-12 flex items-center justify-center font-bold text-sm shadow-md"
                >
                  Create Field
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* EXISTING FIELDS (Right Column) */}
        <div className="xl:col-span-8">
          <div className="card hover:shadow-xl transition-all duration-300 bg-surface border border-border">
            <div className="p-6">
              {/* Card Tag */}
              <div className="flex justify-end mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary/5 text-text-secondary border border-primary/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <FaClock size={10} className="text-primary" />
                  Database Records
                </span>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary to-primary-end text-white shadow-md shadow-primary/10">
                    <FiList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-text-primary text-base uppercase tracking-tight">Existing Fields</h3>
                    <p className="text-text-secondary text-xs font-medium">Configure active validation rules and specifications</p>
                  </div>
                </div>
                {getDirtyFields().length > 0 && (
                  <Button
                    onClick={handleSaveChangesClick}
                    variant="success"
                    size="sm"
                    leftIcon={<FiSave />}
                    className="whitespace-nowrap shadow-md bg-linear-to-br from-green-500 to-green-600 font-bold"
                  >
                    Save Changes ({getDirtyFields().length})
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="Search profile fields..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm shadow-xs"
                  />
                  <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary whitespace-nowrap">
                    <span className="font-bold text-primary">{filteredFields.length}</span> results
                  </span>
                  <Dropdown
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    options={itemsPerPageOptions}
                    className="w-full xs:w-32"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden bg-surface">
                <div className="overflow-x-auto scrollbar-hover">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-linear-to-r from-primary/5 via-primary/2 to-transparent border-b border-border">
                        <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-text-secondary cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => requestSort('name')}>
                          <div className="flex items-center whitespace-nowrap">Name {getSortIcon('name')}</div>
                        </th>
                        <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-text-secondary cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => requestSort('label')}>
                          <div className="flex items-center whitespace-nowrap">Label {getSortIcon('label')}</div>
                        </th>
                        <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-text-secondary cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => requestSort('field_type')}>
                          <div className="flex items-center whitespace-nowrap">Type {getSortIcon('field_type')}</div>
                        </th>
                        <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-text-secondary whitespace-nowrap">Validations</th>
                        <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-text-secondary whitespace-nowrap">Dependent On</th>
                        <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-text-secondary text-center whitespace-nowrap">Enabled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {currentFields.length > 0 ? (
                        currentFields.map((field, index) => (
                          <tr key={index} className="group hover:bg-primary/2 transition-colors duration-300 text-sm text-text-primary">
                            <td className="py-4 px-6 font-semibold group-hover:text-primary transition-colors">
                              <div className="truncate max-w-30 sm:max-w-37.5 lg:max-w-none">{field.name}</div>
                            </td>
                            <td className="py-4 px-6 text-text-secondary">
                              <div className="truncate max-w-30 sm:max-w-37.5 lg:max-w-none">{field.label}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="whitespace-nowrap">
                                <span className="px-2.5 py-1 bg-linear-120 from-primary/10 to-primary/5 text-primary rounded-full text-xs font-medium border border-primary/10">
                                  {fieldTypes.find(t => t.value === field.field_type)?.text || field.field_type}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {field.field_type === 'file' ? (() => {
                                const isFieldEnabled = enabledFields.find(f => f.field_id === field.id)?.is_enabled || false;
                                return (
                                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                    <CustomInput
                                      type="number"
                                      placeholder="Min"
                                      className="w-14 sm:w-16 text-xs sm:text-sm"
                                      value={field.min_files ?? ''}
                                      onChange={(e) => handleFileValidationChange(field.id, 'min_files', e.target.value)}
                                      min="0"
                                      disabled={!isFieldEnabled}
                                    />
                                    <CustomInput
                                      type="number"
                                      placeholder="Max"
                                      className="w-14 sm:w-16 text-xs sm:text-sm"
                                      value={field.max_files ?? ''}
                                      onChange={(e) => handleFileValidationChange(field.id, 'max_files', e.target.value)}
                                      min="1"
                                      disabled={!isFieldEnabled}
                                    />
                                    <span className="text-xs text-text-secondary whitespace-nowrap hidden xs:inline">
                                      + {field.validations?.filter(v => !['min_files', 'max_files'].includes(v.validation_type)).length || 0} rules
                                    </span>
                                  </div>
                                );
                              })() : (
                                <div className="whitespace-nowrap">
                                  <span className="px-2.5 py-1 bg-linear-120 from-primary/10 to-primary/5 text-primary rounded-full text-xs font-semibold border border-primary/10">
                                    {field.validations?.length || 0} Rules
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {field.dependency.is_dependent ?
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-linear-120 from-blue-500/10 to-blue-600/5 text-blue-600 border border-blue-500/20 whitespace-nowrap">
                                  {field.dependency.parent_field.label}
                                </span> :
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-linear-120 from-gray-500/10 to-gray-600/5 text-text-secondary border border-border">No</span>
                              }
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="flex justify-center">
                                <ToggleButton
                                  checked={enabledFields.find(f => f.field_id === field.id)?.is_enabled || false}
                                  onChange={(isChecked) => handleToggleField(field.id, isChecked)}
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-12 px-6 text-center text-text-secondary text-sm">
                            <div className="flex flex-col items-center gap-2">
                              <FiAlertCircle className="text-3xl text-primary/40" />
                              <p>No fields found matching your search.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              {filteredFields.length > 0 && (
                <div className="mt-6 card hover:shadow-xl transition-all duration-300 bg-surface">
                  <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-text-secondary font-medium">Show:</span>
                      <Dropdown
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        options={itemsPerPageOptions}
                        className="w-32"
                      />
                    </div>

                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      totalItems={filteredFields.length}
                      pageSize={itemsPerPage}
                      className="py-0 flex-1 justify-end"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Due Date dialog when saving changes triggers status 2 revert */}
      <Dialog
        isOpen={saveDueModalOpen}
        onClose={() => !savingChanges && setSaveDueModalOpen(false)}
        title="Set Re-submission Deadline"
        size="md"
      >
        <div className="space-y-4 pt-4">
          <p className="text-sm text-text-secondary">
            Saving these changes will reset the warehouse's profile status back to <strong>Awaiting Information</strong> because the profile has already been submitted, reviewed, or verified.
          </p>
          <p className="text-sm text-text-secondary">
            Please set a new submission due date and time for the manager to complete these changes.
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
              onClick={() => setSaveDueModalOpen(false)}
              disabled={savingChanges}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSaveChanges(selectedDueDate)}
              loading={savingChanges}
            >
              Save Changes & Notify Manager
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
