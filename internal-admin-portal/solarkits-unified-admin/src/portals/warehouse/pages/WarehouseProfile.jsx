import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getUserData } from "@/features/user.slice";
import { setAlert } from "@/features/alert.slice";
import CustomInput from "@/components/CustomInput";
import Button from "@/components/Button";
import { HiSun, HiMoon } from "react-icons/hi2";
import useTheme from "../hooks/useTheme";
import { 
  FiCheckCircle, 
  FiClock, 
  FiFileText, 
  FiArrowRight, 
  FiArrowLeft, 
  FiUpload, 
  FiTrash2, 
  FiFile, 
  FiAlertCircle,
  FiHome,
  FiActivity,
  FiSave
} from "react-icons/fi";

export default function WarehouseProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user_slice);
  const token = useSelector((state) => state.auth.token);
  const { theme, toggleTheme } = useTheme();

  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [warehouseImages, setWarehouseImages] = useState([]);

  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API = import.meta.env.VITE_API_URL;
  const isReadOnly = user && (user.warehouse_status === 3 || user.warehouse_status === 4);

  const [completionPercentage, setCompletionPercentage] = useState(0);

  const fetchCompletion = async () => {
    try {
      const res = await axios.get(`${API}/warehouse/profile-completion`, {
        headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}
      });
      if (res.data && res.data.status === "success") {
        setCompletionPercentage(res.data.percentage);
        if (res.data.images) {
          try {
            const parsed = typeof res.data.images === 'string' ? JSON.parse(res.data.images) : res.data.images;
            if (Array.isArray(parsed)) {
              setWarehouseImages(parsed);
            }
          } catch (e) {
            console.error("Failed to parse warehouse images", e);
          }
        } else {
          setWarehouseImages([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch completion:", err);
    }
  };

  useEffect(() => {
    if (user && (user.warehouse_status === 2 || user.warehouse_status === 3 || user.warehouse_status === 4 || user.warehouse_status === 5)) {
      fetchCompletion();
    }
  }, [user]);

  const ThemeToggleButton = () => (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 z-50 p-2.5 rounded-2xl bg-surface/80 backdrop-blur-sm border border-border/50 text-text-secondary hover:text-primary hover:border-primary/30 transition-all duration-300 shadow-sm"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <HiSun className="w-5 h-5" /> : <HiMoon className="w-5 h-5" />}
    </button>
  );

  // Load validation sections
  useEffect(() => {
    if (!user || (user.warehouse_status !== 2 && user.warehouse_status !== 3 && user.warehouse_status !== 4 && user.warehouse_status !== 5)) {
      setLoadingSections(false);
      return;
    }

    const fetchSections = async () => {
      try {
        const res = await axios.get(`${API}/warehouse/validation-sections`, {
          headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}
        });
        const dynamicSections = res.data.sections || [];
        setSections([
          ...dynamicSections,
          { id: "fixed_images", name: "Warehouse Images", code: "warehouse_images", isFixed: true }
        ]);
      } catch (err) {
        dispatch(setAlert({ type: "error", message: "Failed to load profile sections." }));
      } finally {
        setLoadingSections(false);
      }
    };

    fetchSections();
  }, [user, API, token, dispatch]);

  // Load fields for the active section
  useEffect(() => {
    if (sections.length === 0 || currentSectionIndex >= sections.length) return;
    const activeSection = sections[currentSectionIndex];

    if (activeSection.id === "fixed_images") {
      setFields([]);
      return;
    }

    const fetchFields = async () => {
      setLoadingFields(true);
      try {
        const res = await axios.get(`${API}/warehouse/validation-fields/${activeSection.id}`, {
          headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}
        });
        const activeFields = res.data.fields || [];
        setFields(activeFields);

        // Pre-populate values
        const newValues = { ...fieldValues };
        activeFields.forEach(field => {
          if (field.value !== null && newValues[field.id] === undefined) {
            newValues[field.id] = field.value;
          }
        });
        setFieldValues(newValues);
      } catch (err) {
        dispatch(setAlert({ type: "error", message: "Failed to load profile fields." }));
      } finally {
        setLoadingFields(false);
      }
    };

    fetchFields();
  }, [sections, currentSectionIndex, API, token, dispatch]);

  const handleFieldChange = (fieldId, val) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: val
    }));
  };

  const handleFileUpload = (fieldId, fileList, field) => {
    const currentFiles = Array.isArray(fieldValues[fieldId]) ? fieldValues[fieldId] : [];
    const newFiles = [...currentFiles];

    if (field.max_files && newFiles.length + fileList.length > field.max_files) {
      dispatch(setAlert({ type: "warning", message: `Maximum ${field.max_files} files allowed.` }));
      return;
    }

    for (let i = 0; i < fileList.length; i++) {
      newFiles.push({
        name: fileList[i].name,
        size: fileList[i].size,
        type: fileList[i].type,
        fileObject: fileList[i],
        isLocal: true
      });
    }

    handleFieldChange(fieldId, newFiles);
  };

  const handleFileDelete = (fieldId, fileIdx) => {
    const currentFiles = Array.isArray(fieldValues[fieldId]) ? fieldValues[fieldId] : [];
    const newFiles = currentFiles.filter((_, idx) => idx !== fileIdx);
    handleFieldChange(fieldId, newFiles);
  };

  const handleWarehouseImagesUpload = (fileList) => {
    if (warehouseImages.length + fileList.length > 10) {
      dispatch(setAlert({ type: "warning", message: "Maximum 10 images allowed." }));
      return;
    }

    const newImages = [...warehouseImages];
    for (let i = 0; i < fileList.length; i++) {
      if (!fileList[i].type.startsWith('image/')) {
        dispatch(setAlert({ type: "warning", message: "Only image files are allowed." }));
        return;
      }
      newImages.push({
        fileObject: fileList[i],
        isLocal: true,
        name: fileList[i].name
      });
    }
    setWarehouseImages(newImages);
  };

  const handleWarehouseImageDelete = (index) => {
    const newImages = warehouseImages.filter((_, idx) => idx !== index);
    setWarehouseImages(newImages);
  };

  const isDependencySatisfied = (field) => {
    if (!field.dependency || !field.dependency.is_dependent) return true;
    const parentFieldId = field.dependency.parent_field.id;
    const conditionValue = field.dependency.parent_value_condition;
    const parentValue = fieldValues[parentFieldId];
    
    if (field.dependency.dependency_type === 'equals') {
      return String(parentValue || '') === String(conditionValue || '');
    }
    if (field.dependency.dependency_type === 'not_equals') {
      return String(parentValue || '') !== String(conditionValue || '');
    }
    return true;
  };

  const validateStepFields = () => {
    for (const field of fields) {
      if (!isDependencySatisfied(field)) continue;
      const value = fieldValues[field.id];

      if (field.is_required) {
        if (field.field_type === 'file') {
          if (!Array.isArray(value) || value.length === 0) {
            dispatch(setAlert({ type: "error", message: `${field.label} is required.` }));
            return false;
          }
        } else if (field.field_type === 'checkbox') {
          if (!value) {
            dispatch(setAlert({ type: "error", message: `${field.label} is required.` }));
            return false;
          }
        } else {
          if (value === undefined || value === null || !String(value).trim()) {
            dispatch(setAlert({ type: "error", message: `${field.label} is required.` }));
            return false;
          }
        }
      }

      if (field.field_type === 'file' && Array.isArray(value) && value.length > 0) {
        if (field.min_files && value.length < field.min_files) {
          dispatch(setAlert({ type: "error", message: `${field.label} requires at least ${field.min_files} file(s).` }));
          return false;
        }
        if (field.max_files && value.length > field.max_files) {
          dispatch(setAlert({ type: "error", message: `${field.label} allows at most ${field.max_files} file(s).` }));
          return false;
        }
      }

      if (field.validations && field.validations.length > 0 && value && String(value).trim()) {
        for (const valRule of field.validations) {
          if (valRule.validation_type === 'regex') {
            try {
              const regex = new RegExp(valRule.validation_value);
              if (!regex.test(String(value))) {
                dispatch(setAlert({ type: "error", message: valRule.error_message || `${field.label} format is invalid.` }));
                return false;
              }
            } catch (e) {
              console.error("Invalid regex validation pattern:", valRule.validation_value);
            }
          }
        }
      }
    }
    return true;
  };

  const handleNext = async () => {
    const activeSection = sections[currentSectionIndex];
    if (activeSection.id !== "fixed_images") {
      if (!validateStepFields()) return;
    }
    await handleSaveProgress(false);
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const handlePrev = async () => {
    await handleSaveProgress(false);
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const [savingProgress, setSavingProgress] = useState(false);

  const uploadPendingFiles = async () => {
    // 1. Process fieldValues documents
    const updatedFieldValues = { ...fieldValues };
    let hasChangesInFields = false;

    for (const fieldId in updatedFieldValues) {
      const filesArr = updatedFieldValues[fieldId];
      if (Array.isArray(filesArr) && filesArr.some(f => f.isLocal && f.fileObject)) {
        const localFiles = filesArr.filter(f => f.isLocal && f.fileObject);
        const existingFiles = filesArr.filter(f => !f.isLocal);

        const formData = new FormData();
        localFiles.forEach(lf => {
          formData.append('documents', lf.fileObject);
        });

        const res = await axios.post(`${API}/warehouse/upload-documents`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {})
          }
        });

        const paths = res.data.paths;
        const uploadedFiles = localFiles.map((lf, idx) => ({
          name: lf.name,
          size: lf.size,
          type: lf.type,
          path: paths[idx]
        }));

        updatedFieldValues[fieldId] = [...existingFiles, ...uploadedFiles];
        hasChangesInFields = true;
      }
    }

    if (hasChangesInFields) {
      setFieldValues(updatedFieldValues);
    }

    // 2. Process warehouseImages
    let updatedWarehouseImages = [...warehouseImages];
    const localImages = warehouseImages.filter(img => typeof img !== 'string' && img.isLocal && img.fileObject);
    const existingImages = warehouseImages.filter(img => typeof img === 'string');

    if (localImages.length > 0) {
      const formData = new FormData();
      localImages.forEach(li => {
        formData.append('documents', li.fileObject);
      });

      const res = await axios.post(`${API}/warehouse/upload-documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {})
        }
      });

      const paths = res.data.paths;
      updatedWarehouseImages = [...existingImages, ...paths];
      setWarehouseImages(updatedWarehouseImages);
    }

    return {
      values: updatedFieldValues,
      images: updatedWarehouseImages
    };
  };

  const handleSaveProgress = async (showToast = true) => {
    setSavingProgress(true);
    try {
      const { values: finalValues, images: finalImages } = await uploadPendingFiles();
      const res = await axios.post(`${API}/warehouse/save-validation-data`, { 
        values: finalValues,
        images: finalImages
      }, {
        headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}
      });
      if (showToast) {
        dispatch(setAlert({ type: "success", message: res.data.message || "Progress saved successfully!" }));
      }
      if (res.data.submitted) {
        await dispatch(getUserData()).unwrap();
      }
      fetchCompletion();
    } catch (err) {
      if (showToast) {
        dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to save progress." }));
      }
      console.error("Save progress failed", err);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSubmit = async () => {
    const activeSection = sections[currentSectionIndex];
    if (activeSection.id !== "fixed_images") {
      if (!validateStepFields()) return;
    }
    
    // Check local vs existing image count
    const totalImagesCount = warehouseImages.length;
    if (totalImagesCount < 1) {
      dispatch(setAlert({ type: "error", message: "Warehouse images are required (minimum 1 photo)." }));
      return;
    }
    if (totalImagesCount > 10) {
      dispatch(setAlert({ type: "error", message: "Maximum of 10 warehouse images allowed." }));
      return;
    }
    setSubmitting(true);

    try {
      const { values: finalValues, images: finalImages } = await uploadPendingFiles();
      await axios.post(`${API}/warehouse/submit-validation-data`, { 
        values: finalValues,
        images: finalImages
      }, {
        headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}
      });
      dispatch(setAlert({ type: "success", message: "Warehouse profile submitted successfully!" }));
      await dispatch(getUserData()).unwrap();
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to submit profile data." }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSections) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bg text-text-primary transition-colors duration-300">
        <ThemeToggleButton />
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading profile sections...</p>
        </div>
      </div>
    );
  }



  // --- Step Form ---
  const activeSection = sections[currentSectionIndex];

  return (
    <div className="min-h-screen w-full bg-bg p-6 text-text-primary flex flex-col items-center justify-center transition-colors duration-300 relative">
      <ThemeToggleButton />
      <div className="w-full max-w-3xl bg-surface border border-border rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden my-8 card">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-120 from-primary to-primary-end" />

        {user?.warehouse_status === 3 && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
            <FiClock className="text-warning w-5.5 h-5.5 shrink-0 animate-pulse" />
            <div className="text-sm">
              <span className="font-bold text-text-primary">Profile Under Review.</span>{" "}
              <span className="text-text-secondary">
                Your submitted details are currently being reviewed by the operations team. You cannot modify them.
              </span>
            </div>
          </div>
        )}

        {user?.warehouse_status === 4 && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
            <FiCheckCircle className="text-success w-5.5 h-5.5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold text-text-primary">Warehouse Profile Verified.</span>{" "}
              <span className="text-text-secondary">
                Your profile details have been verified by the operations team.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Header */}
        <div className="flex items-center justify-between border-b border-border pb-6 mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-text-primary">Warehouse Profile Questionnaire</h2>
            <p className="text-text-secondary text-sm mt-1">Complete profile setup for verification.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/home')}
              leftIcon={<FiHome />}
              className="bg-bg border border-border text-text-primary hover:bg-surface-hover hover:text-primary h-[38px] px-3.5 rounded-xl text-xs font-bold"
            >
              Dashboard
            </Button>
            {!isReadOnly && (
              <div className="px-3.5 py-2 bg-warning/10 border border-warning/20 rounded-full text-xs font-black text-warning tracking-wider uppercase">
                {completionPercentage}% Done
              </div>
            )}
            <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-xs font-black text-primary tracking-wider uppercase">
              Step {currentSectionIndex + 1} of {sections.length}
            </div>
          </div>
        </div>

        {/* Step Indicator Badges */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-border">
          {sections.map((sec, idx) => (
            <div 
              key={sec.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border shrink-0 transition-all ${
                idx === currentSectionIndex
                  ? "bg-primary text-white border-primary shadow-sm"
                  : idx < currentSectionIndex
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-bg text-text-muted border-border"
              }`}
            >
              <span>{idx + 1}.</span>
              <span>{sec.name}</span>
              {idx < currentSectionIndex && <span className="ml-1 text-[10px]">✓</span>}
            </div>
          ))}
        </div>

        {/* Active Section Area */}
        {activeSection && (
          <div className="space-y-8 min-h-60">
            <div>
              <h3 className="text-lg font-bold text-text-primary">{activeSection.name}</h3>
              <p className="text-xs text-text-secondary mt-0.5">Please fill in the following details accurately.</p>
            </div>

            {loadingFields ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeSection.id === "fixed_images" ? (
              <div className="space-y-6">
                <div>
                  <label className="text-text-primary text-sm font-semibold block mb-2">
                    Warehouse Photos (1 to 10 images) {!isReadOnly && <span className="text-danger">*</span>}
                  </label>
                  {!isReadOnly && (
                    <div className="border border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-bg relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleWarehouseImagesUpload(e.target.files)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <FiUpload className="text-text-muted w-8 h-8" />
                      <span className="text-sm text-text-secondary">Drag & drop or click to upload photos</span>
                      <span className="text-[10px] text-text-muted">
                        Minimum 1, Maximum 10 images allowed
                      </span>
                    </div>
                  )}
                </div>

                {/* Images Preview Grid */}
                {warehouseImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {warehouseImages.map((imgPath, idx) => {
                      const fullUrl = typeof imgPath === 'string'
                        ? (imgPath.startsWith('http') ? imgPath : `${API.replace('/warehouse-api', '')}${imgPath}`)
                        : (imgPath.fileObject ? URL.createObjectURL(imgPath.fileObject) : "");
                      return (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-border group bg-bg flex items-center justify-center">
                          <img
                            src={fullUrl}
                            alt={`Warehouse image ${idx + 1}`}
                            className="object-cover w-full h-full"
                          />
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleWarehouseImageDelete(idx)}
                              className="absolute top-2 right-2 bg-danger/90 hover:bg-danger text-white p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              <FiTrash2 className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : fields.length === 0 ? (
              <div className="p-8 bg-bg border border-border rounded-2xl text-center text-text-muted text-sm">
                No active validations required for this section.
              </div>
            ) : (
              <div className="space-y-6">
                {fields.filter(isDependencySatisfied).map(field => {
                  return (
                    <div key={field.id} className="space-y-2">
                      {/* --- Dropdown Field --- */}
                      {field.field_type === "dropdown" && (
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-text-primary text-sm font-semibold">
                            {field.label} {field.is_required && <span className="text-danger">*</span>}
                          </label>
                          <select
                            value={fieldValues[field.id] || ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            disabled={isReadOnly}
                            className="w-full h-[46px] bg-bg border border-border rounded-xl px-4 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="" className="text-text-muted">Select an option...</option>
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value} className="bg-bg text-text-primary">{opt.text}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* --- Yes/No Field --- */}
                      {field.field_type === "yesno" && (
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-text-primary text-sm font-semibold">
                            {field.label} {field.is_required && <span className="text-danger">*</span>}
                          </label>
                          <div className="flex gap-6 mt-1">
                            {["yes", "no"].map(opt => (
                              <label key={opt} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer group">
                                <input
                                  type="radio"
                                  name={field.id}
                                  value={opt}
                                  checked={fieldValues[field.id] === opt}
                                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                  disabled={isReadOnly}
                                  className="accent-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <span className="capitalize group-hover:text-text-primary transition-colors">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* --- Checkbox Field --- */}
                      {field.field_type === "checkbox" && (
                        <div className="flex items-center gap-2.5 py-2">
                           <input
                            type="checkbox"
                            id={field.id}
                            checked={!!fieldValues[field.id]}
                            onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                            disabled={isReadOnly}
                            className="accent-primary w-4.5 h-4.5 rounded cursor-pointer disabled:cursor-not-allowed"
                          />
                          <label htmlFor={field.id} className="text-text-secondary text-sm font-semibold cursor-pointer hover:text-text-primary transition-colors">
                            {field.label} {field.is_required && <span className="text-danger">*</span>}
                          </label>
                        </div>
                      )}

                      {/* --- File Field --- */}
                      {field.field_type === "file" && (
                        <div className="flex flex-col gap-2 w-full">
                          <label className="text-text-primary text-sm font-semibold">
                            {field.label} {field.is_required && <span className="text-danger">*</span>}
                          </label>
                          {!isReadOnly && (
                            <div className="border border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-bg relative">
                              <input
                                type="file"
                                multiple={field.max_files > 1}
                                onChange={(e) => handleFileUpload(field.id, e.target.files, field)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <FiUpload className="text-text-muted w-8 h-8" />
                              <span className="text-sm text-text-secondary">Drag & drop or click to upload</span>
                              <span className="text-[10px] text-text-muted">
                                {field.min_files ? `Min: ${field.min_files} ` : ""}{field.max_files ? `Max: ${field.max_files} ` : ""}file(s) allowed
                              </span>
                            </div>
                          )}
                          
                          {/* Selected files display */}
                          {Array.isArray(fieldValues[field.id]) && fieldValues[field.id].length > 0 && (
                            <div className="flex flex-col gap-2 mt-2">
                              {fieldValues[field.id].map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-bg border border-border rounded-xl">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <FiFile className="text-primary shrink-0 w-4.5 h-4.5" />
                                    {file.path || file.fileObject ? (
                                      <a
                                        href={file.path ? (file.path.startsWith('http') ? file.path : `${API.replace('/warehouse-api', '')}${file.path}`) : URL.createObjectURL(file.fileObject)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary hover:underline truncate font-medium"
                                      >
                                        {file.name}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-text-secondary truncate">{file.name}</span>
                                    )}
                                    <span className="text-[10px] text-text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                                  </div>
                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => handleFileDelete(field.id, idx)}
                                      className="text-danger hover:text-red-500 p-1 rounded transition-colors"
                                    >
                                      <FiTrash2 className="w-4.5 h-4.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* --- Standard Input Fields (Text, Textarea, Email, Date, Number) --- */}
                      {["single_line_input", "multi_line_input", "number", "email", "date"].includes(field.field_type) && (
                        <CustomInput
                          label={field.label}
                          value={fieldValues[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          type={field.field_type === 'multi_line_input' ? 'textarea' : field.field_type === 'single_line_input' ? 'text' : field.field_type}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          required={field.is_required}
                          disabled={isReadOnly}
                          className="bg-bg border-border text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            onClick={handlePrev}
            disabled={currentSectionIndex === 0 || loadingFields || submitting || savingProgress}
            leftIcon={<FiArrowLeft />}
            className="bg-bg border-border text-text-primary hover:bg-surface-hover disabled:opacity-30"
          >
            Previous
          </Button>

          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSaveProgress(true)}
              loading={savingProgress}
              disabled={loadingFields || submitting || savingProgress}
              leftIcon={<FiSave />}
              className="bg-bg border-border text-text-primary hover:bg-surface-hover"
            >
              Save Progress
            </Button>
          )}

          {currentSectionIndex < sections.length - 1 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={loadingFields || submitting || savingProgress}
              rightIcon={<FiArrowRight />}
            >
              Next Step
            </Button>
          ) : (
            !isReadOnly ? (
              <div className="flex flex-col items-end gap-1.5">
                {completionPercentage < 100 && (
                  <span className="text-[10px] text-warning font-bold">
                    * Profile must be 100% complete to submit
                  </span>
                )}
                <Button
                  variant="success"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={loadingFields || submitting || savingProgress || completionPercentage < 100}
                  leftIcon={<FiCheckCircle />}
                >
                  Submit Profile
                </Button>
              </div>
            ) : (
              <Button
                variant="success"
                disabled
                leftIcon={<FiCheckCircle />}
                className="opacity-50 cursor-not-allowed bg-green-600/30 text-green-700 border-green-600/20"
              >
                Submitted
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
