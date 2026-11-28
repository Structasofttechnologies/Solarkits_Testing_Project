import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import axios from "axios";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import CustomInput from "@/components/CustomInput";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import CustomFilePicker from "@/components/CustomFilePicker";
import PopupDataLoader from "@/components/PopupDataLoader";
import { FaArrowLeft, FaArrowRight, FaPlus, FaTimes, FaCheck, FaImage, FaMicrochip, FaStore, FaExclamationTriangle, FaTags, FaSync, FaFilePdf, FaExternalLinkAlt } from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function ProductModal({ moduleUniqueId, isOpen, onClose, editingProduct, selectedTemplate, selectedSubtype, onSuccess }) {
  const dispatch = useDispatch();
  const getBaseQuery = (reqFor) => `?unique_id=${moduleUniqueId}&req_for=${reqFor}`;

  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Context & Scope
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [scopes, setScopes] = useState([]);
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [step1Error, setStep1Error] = useState("");

  // Step 2: Product Identity
  const [productForm, setProductForm] = useState({
    name: "", description: "", features: [], product_image: null, product_image_preview: null,
    product_datasheet: null, product_datasheet_preview: null, remove_datasheet: false
  });
  const [skuConfig, setSkuConfig] = useState({
    template_len: 3,
    brand_len: 5,
    product_len: 4,
    subtype_len: 4
  });
  const [step2Error, setStep2Error] = useState("");
  const [featureInput, setFeatureInput] = useState("");

  // Step 3: Technical Attributes
  const [nonVariantAttributes, setNonVariantAttributes] = useState([]);
  const [nonVariantValues, setNonVariantValues] = useState({});
  const [nonVariantUnits, setNonVariantUnits] = useState({});
  const [attributeValues, setAttributeValues] = useState({});
  const [unitGroupsData, setUnitGroupsData] = useState({});
  const [step3Errors, setStep3Errors] = useState({});

  const [editingProductSkus, setEditingProductSkus] = useState([]);
  const [loadingEditingSkus, setLoadingEditingSkus] = useState(false);
  // Gate: prevents draft-save from overwriting localStorage before data is loaded
  const [isDataReady, setIsDataReady] = useState(false);

  const fetchEditingProductSkus = async (productId) => {
    setLoadingEditingSkus(true);
    try {
      const res = await axios.get(`${API_URL}/products/get-skus-by-product${getBaseQuery("view")}&product_id=${productId}`, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setEditingProductSkus(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingEditingSkus(false);
    }
  };

  const renderAttributeValue = (attr) => {
    if (!attr) return "-";
    if (attr.data_type === "boolean") return (attr.value_boolean === 1 || attr.value_boolean === true) ? "Yes" : "No";
    if (attr.data_type === "dropdown") return attr.option_value || "-";
    if (attr.data_type === "number") {
      if (attr.value_number === null || attr.value_number === undefined) return "-";
      return `${attr.value_number}${attr.unit_symbol ? ` ${attr.unit_symbol}` : ""}`;
    }
    return attr.value_text || "-";
  };

  const isEditMode = !!editingProduct;
  const hasLoadedRef = useRef(false);

  // Grouped attributes for better UI
  const groupedAttributes = useMemo(() => {
    const groups = {};
    const sorted = [...nonVariantAttributes].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    sorted.forEach(attr => {
      const gName = attr.group_name || "General Specifications";
      if (!groups[gName]) groups[gName] = { attrs: [], minOrder: attr.display_order ?? 0 };
      groups[gName].attrs.push(attr);
    });
    return Object.entries(groups)
      .sort(([, a], [, b]) => a.minOrder - b.minOrder)
      .map(([name, { attrs }]) => [name, attrs]);
  }, [nonVariantAttributes]);

  // Fetch functions
  const fetchBrands = async () => {
    try {
      const res = await axios.get(`${API_URL}/brand-manufacturer/get-brands-with-logo-name-only${getBaseQuery("view")}`, { headers: authHeaderObj() });
      if (res.data?.status === "success" && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setFilteredBrands(res.data.data);
        return res.data.data;
      }
    } catch (error) { }

    try {
      const res = await axios.get(`${API_URL}/product-templates/get-brands-by-subtype${getBaseQuery("view")}`, { headers: authHeaderObj() });
      if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        setFilteredBrands(res.data.data);
        return res.data.data;
      }
    } catch (error) { }
    return [];
  };

  const fetchScopesBySubtype = async (subtypeId) => {
    try {
      const res = await axios.get(`${API_URL}/product-templates/get-scopes-by-subtype${getBaseQuery("view")}&subtype_id=${subtypeId}`, { headers: authHeaderObj() });
      if (res.data?.status === "success") setScopes(res.data.data);
    } catch (error) { 
      console.error("Failed to fetch scopes:", error);
    }
  };

  const fetchAttributeValuesById = async (attributeId) => {
    try {
      const res = await axios.get(`${API_URL}/product-templates/get-attribute-values${getBaseQuery("view")}&attribute_id=${attributeId}`, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setAttributeValues(prev => ({ ...prev, [attributeId]: res.data.data }));
      }
    } catch (error) { }
  };

  const fetchUnitsForGroup = async (groupId) => {
    if (unitGroupsData[groupId]) return;
    try {
      const res = await axios.get(`${API_URL}/units${getBaseQuery("view")}&group_id=${groupId}`, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setUnitGroupsData(prev => ({ ...prev, [groupId]: res.data.data }));
      }
    } catch (error) { }
  };

  const fetchTemplateAttributes = async (overrideTmplId, overrideSubId) => {
    const tmplId = overrideTmplId || (isEditMode ? (editingProduct?.template_id?._id || editingProduct?.template_id) : selectedTemplate);
    const subId = overrideSubId || (isEditMode ? (editingProduct?.subtype_id?._id || editingProduct?.subtype_id) : selectedSubtype);
    if (!tmplId || !subId) return [];
    try {
      const res = await axios.get(`${API_URL}/product-templates/get-attributes${getBaseQuery("view")}&template_id=${tmplId}&subtype_id=${subId}`, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        const attrs = res.data.data;
        // Already sorted by display_order from backend; preserve sort
        const nonVariantAttrs = attrs.filter(attr => attr.is_variant === 0);
        setNonVariantAttributes(nonVariantAttrs);

        for (const attr of nonVariantAttrs) {
          if (attr.data_type === "dropdown" || attr.data_type === "multiselect") await fetchAttributeValuesById(attr.id);
          if (attr.data_type === "number" && attr.unit_group_id) await fetchUnitsForGroup(attr.unit_group_id);
        }
        // Return attrs so the caller can seed initial values or restore draft
        return nonVariantAttrs;
      }
    } catch (error) { console.error("fetchTemplateAttributes error", error); }
    return [];
  };

  const loadProductAttributesForEdit = (product) => {
    if (!product?.attributes) return;
    const values = {};
    const units = {};

    product.attributes.forEach(group => {
      group.attributes.forEach(attr => {
        const attrId = attr.attribute_id;
        switch (attr.data_type) {
          case "dropdown": values[attrId] = attr.value_option_id ?? ""; break;
          case "multiselect":
            try {
              const parsed = attr.value_text ? JSON.parse(attr.value_text) : [];
              values[attrId] = Array.isArray(parsed) ? parsed.map(v => Number(v)) : [];
            } catch { values[attrId] = []; }
            break;
          case "number":
            values[attrId] = attr.value_number ?? "";
            if (attr.unit_id) units[attrId] = attr.unit_id;
            break;
          case "boolean": values[attrId] = attr.value_boolean === 1 || attr.value_boolean === true ? "1" : "0"; break;
          case "file": values[attrId] = attr.value_file || null; break;
          default: values[attrId] = attr.value_text ?? "";
        }
      });
    });

    setNonVariantValues(values);
    setNonVariantUnits(units);
  };

  const loadEditingProductData = () => {
    setProductForm({
      name: editingProduct.name,
      description: editingProduct.description || "",
      features: Array.isArray(editingProduct.features) ? editingProduct.features : (editingProduct.features ? JSON.parse(editingProduct.features) : []),
      product_image: null,
      product_image_preview: editingProduct.image || null,
      product_datasheet: null,
      product_datasheet_preview: editingProduct.datasheet || null,
      remove_datasheet: false,
    });
    setSkuConfig({
      template_len: editingProduct.sku_config?.template_len ?? 3,
      brand_len: editingProduct.sku_config?.brand_len ?? 5,
      product_len: editingProduct.sku_config?.product_len ?? 4,
      subtype_len: editingProduct.sku_config?.subtype_len ?? 4,
    });
    setSelectedBrand(editingProduct.brand_id?._id || editingProduct.brand_id);
    setSelectedScopes(editingProduct.scope_ids || []);
    loadProductAttributesForEdit(editingProduct);
    if (editingProduct.id || editingProduct._id) {
      fetchEditingProductSkus(editingProduct.id || editingProduct._id);
    }
  };

  const resetForm = () => {
    setActiveStep(1);
    setStep1Error("");
    setStep2Error("");
    setStep3Errors({});
    setFeatureInput("");
    setProductForm({
      name: "", description: "", features: [], product_image: null, product_image_preview: null,
      product_datasheet: null, product_datasheet_preview: null, remove_datasheet: false
    });
    setSkuConfig({
      template_len: 3,
      brand_len: 5,
      product_len: 4,
      subtype_len: 4
    });
    setSelectedBrand(null);
    setSelectedScopes([]);
    setNonVariantValues({});
    setNonVariantUnits({});
    setEditingProductSkus([]);
    setIsDataReady(false);  // block draft-save until next load
    hasLoadedRef.current = false;
  };

  // Save draft for Product Registration — only when data has been properly loaded
  useEffect(() => {
    if (isOpen && !isEditMode && isDataReady) {
      const draftObj = {
        selectedBrand,
        selectedScopes,
        productForm: {
          name: productForm.name,
          description: productForm.description,
          features: productForm.features
        },
        skuConfig,
        nonVariantValues,
        nonVariantUnits
      };
      localStorage.setItem("product_master_draft", JSON.stringify(draftObj));
    }
  }, [isOpen, isEditMode, isDataReady, selectedBrand, selectedScopes, productForm.name, productForm.description, productForm.features, skuConfig, nonVariantValues, nonVariantUnits]);

  useEffect(() => {
    if (isOpen) {
      const tmplId = isEditMode ? (editingProduct?.template_id?._id || editingProduct?.template_id || selectedTemplate) : selectedTemplate;
      const subId = isEditMode ? (editingProduct?.subtype_id?._id || editingProduct?.subtype_id || selectedSubtype) : selectedSubtype;

      if (!hasLoadedRef.current) {
        Promise.all([
          fetchBrands(),
          subId ? fetchScopesBySubtype(subId) : Promise.resolve(),
          (tmplId && subId) ? fetchTemplateAttributes(tmplId, subId) : Promise.resolve([])
        ]).then(([, , nonVariantAttrs = []]) => {
          if (isEditMode) {
            loadEditingProductData();
          } else {
            // Try to restore draft first
            const savedDraft = localStorage.getItem("product_master_draft");
            if (savedDraft) {
              try {
                const parsed = JSON.parse(savedDraft);
                if (parsed.selectedBrand) setSelectedBrand(parsed.selectedBrand);
                if (parsed.selectedScopes) setSelectedScopes(parsed.selectedScopes);
                if (parsed.productForm) {
                  setProductForm(prev => ({
                    ...prev,
                    name: parsed.productForm.name || "",
                    description: parsed.productForm.description || "",
                    features: parsed.productForm.features || []
                  }));
                }
                if (parsed.skuConfig) {
                  setSkuConfig(parsed.skuConfig);
                }
                const initialValues = {};
                nonVariantAttrs.forEach(attr => {
                  initialValues[attr.id] = attr.data_type === "multiselect" ? [] : "";
                });
                setNonVariantValues({ ...initialValues, ...(parsed.nonVariantValues || {}) });
                if (parsed.nonVariantUnits) setNonVariantUnits(parsed.nonVariantUnits);
              } catch (e) {
                console.error("Failed to restore product draft", e);
                const initialValues = {};
                nonVariantAttrs.forEach(attr => {
                  initialValues[attr.id] = attr.data_type === "multiselect" ? [] : "";
                });
                setNonVariantValues(initialValues);
              }
            } else {
              const initialValues = {};
              nonVariantAttrs.forEach(attr => {
                initialValues[attr.id] = attr.data_type === "multiselect" ? [] : "";
              });
              setNonVariantValues(initialValues);
            }
          }
          hasLoadedRef.current = true;
          setIsDataReady(true);  // allow modal display!
        });
      }
    }
    if (!isOpen) resetForm();
  }, [isOpen, selectedTemplate, selectedSubtype, editingProduct, isEditMode]);

  const handleAddFeature = () => {
    if (featureInput.trim() !== "") {
      setProductForm(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }));
      setFeatureInput("");
    }
  };

  const handleRemoveFeature = (indexToRemove) => {
    setProductForm(prev => ({ ...prev, features: prev.features.filter((_, index) => index !== indexToRemove) }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFeature();
    }
  };

  const validateStep1 = () => {
    if (!selectedBrand) {
      setStep1Error("Manufacturing Brand is mandatory.");
      return false;
    }
    if (selectedScopes.length === 0) {
      setStep1Error("At least one Operational Scope must be assigned.");
      return false;
    }
    setStep1Error("");
    return true;
  };

  const validateStep2 = () => {
    if (!productForm.name.trim()) {
      setStep2Error("Product Model Name is required.");
      return false;
    }
    if (!productForm.product_image && !productForm.product_image_preview) {
      setStep2Error("Primary Product Image is mandatory.");
      return false;
    }
    setStep2Error("");
    return true;
  };

  const validateStep3 = () => {
    const errors = {};
    let isValid = true;
    for (const attr of nonVariantAttributes) {
      if (attr.is_required) {
        const value = nonVariantValues[attr.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          errors[attr.id] = `${attr.name} is required.`;
          isValid = false;
        }
      }
    }
    setStep3Errors(errors);
    return isValid;
  };

  const handleNextStep = () => {
    if (activeStep === 1 && validateStep1()) setActiveStep(2);
    else if (activeStep === 2 && validateStep2()) setActiveStep(3);
    else if (activeStep === 3 && validateStep3() && isEditMode) setActiveStep(4);
  };

  const handlePrevStep = () => {
    if (activeStep > 1) setActiveStep(activeStep - 1);
  };

  const prepareFormData = () => {
    const tmplId = isEditMode ? (editingProduct?.template_id?._id || editingProduct?.template_id || selectedTemplate) : selectedTemplate;
    const subId = isEditMode ? (editingProduct?.subtype_id?._id || editingProduct?.subtype_id || selectedSubtype) : selectedSubtype;

    const formData = new FormData();
    formData.append("name", productForm.name);
    formData.append("template_id", tmplId);
    formData.append("subtype_id", subId);
    formData.append("brand_id", selectedBrand);
    formData.append("description", productForm.description || "");
    formData.append("features", JSON.stringify(productForm.features));
    formData.append("scope_ids", JSON.stringify(selectedScopes));
    formData.append("sku_config", JSON.stringify(skuConfig));

    if (productForm.product_image) formData.append("product_image", productForm.product_image);
    if (productForm.product_datasheet) formData.append("product_datasheet", productForm.product_datasheet);
    if (productForm.remove_datasheet) formData.append("remove_datasheet", "true");
    if (isEditMode) formData.append("product_id", editingProduct.id);

    const attrsPayload = [];
    for (const attr of nonVariantAttributes) {
      const value = nonVariantValues[attr.id];
      if ((!value || value === "") && !attr.is_required) continue;

      const payloadItem = { attribute_id: attr.id };
      switch (attr.data_type) {
        case "file":
          if (value instanceof File) {
            formData.append(`attribute_${attr.id}`, value);
          } else if (value && typeof value === 'string') {
            payloadItem.value_file = value;
          }
          break;
        case "multiselect": payloadItem.value_text = JSON.stringify(value); break;
        case "number":
          payloadItem.value_number = parseFloat(value);
          payloadItem.unit_id = nonVariantUnits[attr.id] || null;
          break;
        case "boolean": payloadItem.value_boolean = (value === "1" || value === true) ? 1 : 0; break;
        case "dropdown": payloadItem.value_option_id = value; break;
        default: payloadItem.value_text = value;
      }
      attrsPayload.push(payloadItem);
    }
    formData.append("attributes", JSON.stringify(attrsPayload));
    return formData;
  };

  const handleSubmit = async () => {
    if (!validateStep3()) {
      dispatch(setAlert({ type: "warning", message: "Please review technical parameters." }));
      return;
    }

    setIsSubmitting(true);
    const formData = prepareFormData();

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const path = isEditMode ? 'update-product' : 'create-product';
      const response = await axios({
        method,
        url: `${API_URL}/products/${path}${getBaseQuery(isEditMode ? "edit" : "add")}`,
        data: formData,
        headers: { ...authHeaderObj() }
      });

      if (response.data?.status === "success") {
        if (!isEditMode) {
          localStorage.removeItem("product_master_draft");
        }
        dispatch(setAlert({ type: "success", message: `Product ${isEditMode ? "updated" : "registered"} successfully.` }));
        onSuccess?.();
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: response.data?.message || "Operation failed." }));
      }
    } catch (error) {
      dispatch(setAlert({ type: "error", message: error?.response?.data?.message || "An error occurred." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Product Model" : "Register New Product"} size="xl">
      <div className="space-y-4">
        {/* Professional Stepper - Compact */}
        <div className="flex items-center justify-center gap-6 py-2 border-b border-border">
          {[
            { step: 1, label: "Context", icon: <FaStore /> },
            { step: 2, label: "Identity", icon: <FaImage /> },
            { step: 3, label: "Technical", icon: <FaMicrochip /> },
            ...(isEditMode ? [{ step: 4, label: "SKU Variants", icon: <FaTags /> }] : [])
          ].map(({ step, label, icon }, idx, arr) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${activeStep === step ? 'bg-primary text-text-inverse shadow-md scale-110' : activeStep > step ? 'bg-success text-text-inverse' : 'bg-surface-hover text-text-secondary border border-border'}`}>
                {activeStep > step ? <FaCheck /> : step}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${activeStep === step ? 'text-primary' : 'text-text-secondary opacity-60'}`}>{label}</span>
              {idx < arr.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="min-h-[350px] py-2">
          {!isDataReady ? (
            <PopupDataLoader text={isEditMode ? "Loading Product Details..." : "Initializing Product Baseline..."} />
          ) : (
            <>
              {activeStep === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
               <div className="space-y-2">
                  <DropdownWithSearchInput
                    label="Manufacturing Brand"
                    options={filteredBrands.map(b => ({ 
                      value: b.id || b._id, 
                      text: (
                        <div className="flex items-center gap-3">
                          {b.logo && (
                            <img 
                              src={b.logo} 
                              alt="" 
                              className="w-5 h-5 rounded object-contain bg-surface shadow-xs border border-border shrink-0" 
                            />
                          )}
                          <span className="font-bold">{b.name || b.brand_name}</span>
                        </div>
                      )
                    }))}
                    value={selectedBrand || ""}
                    onChange={(val) => { setSelectedBrand(val); setStep1Error(""); }}
                    placeholder="Select Brand"
                  />
                  <p className="text-[10px] text-text-secondary ml-1 italic">The brand associated with this product model.</p>
               </div>

               <div className="space-y-2">
                  <MultiSelectDropdownWithSearchInput
                    label="Operational Scopes"
                    options={scopes.map(s => ({
                      value: String(s.subcategory_type_id || s.id || s._id),
                      text: `${s.category_name || "General"} » ${s.subcategory_name || "Standard"} » ${s.type_name || "Operational Scope"}`
                    }))}
                    values={selectedScopes.map(v => String(v))}
                    onChange={(vals) => { setSelectedScopes(vals); setStep1Error(""); }}
                    placeholder="Assign Scopes"
                    showSelectAll={true}
                  />
                  <p className="text-[10px] text-text-secondary ml-1 italic">Define the organizational scopes where this product is applicable.</p>
               </div>

               {step1Error && (
                 <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl flex items-center gap-3 text-danger text-[10px] font-black uppercase tracking-widest animate-pulse">
                    <div className="w-6 h-6 rounded-lg bg-danger text-white flex items-center justify-center shrink-0 shadow-lg shadow-danger/20">
                      <FaExclamationTriangle size={12} />
                    </div>
                    <span>{step1Error}</span>
                 </div>
               )}
            </div>
          )}

          {activeStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2"><FaImage className="text-primary" /> Product Imagery</h4>
                    <CustomFilePicker
                      name="product_image"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) setProductForm(p => ({ ...p, product_image: file, product_image_preview: URL.createObjectURL(file) }));
                      }}
                      files={productForm.product_image ? [productForm.product_image] : (productForm.product_image_preview ? [{ name: "Current Product Image" }] : [])}
                    />
                    {productForm.product_image_preview && (
                      <div className="mt-2 aspect-video bg-surface-hover rounded-xl border border-border overflow-hidden">
                         <img src={productForm.product_image_preview} className="w-full h-full object-contain" alt="Preview" />
                      </div>
                    )}
                  </div>

                  {/* Technical Datasheet (PDF) */}
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                        <FaFilePdf className="text-red-500" /> Technical Datasheet (PDF)
                      </h4>
                      {productForm.product_datasheet_preview && !productForm.remove_datasheet && (
                        <a
                          href={productForm.product_datasheet_preview}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
                        >
                          <FaExternalLinkAlt size={9} /> View Current PDF
                        </a>
                      )}
                    </div>
                    <CustomFilePicker
                      name="product_datasheet"
                      accept=".pdf,application/pdf"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) setProductForm(p => ({ ...p, product_datasheet: file, remove_datasheet: false }));
                      }}
                      files={productForm.product_datasheet ? [productForm.product_datasheet] : (productForm.product_datasheet_preview && !productForm.remove_datasheet ? [{ name: "Current Datasheet PDF" }] : [])}
                    />
                    {(productForm.product_datasheet || (productForm.product_datasheet_preview && !productForm.remove_datasheet)) && (
                      <div className="flex items-center justify-between p-2.5 bg-surface-hover/50 rounded-xl border border-border text-xs">
                        <div className="flex items-center gap-2 text-text-primary font-medium truncate">
                          <FaFilePdf className="text-red-500 shrink-0" size={15} />
                          <span className="truncate text-[11px] font-semibold">
                            {productForm.product_datasheet ? productForm.product_datasheet.name : "Manufacturer Datasheet Attached"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProductForm(p => ({ ...p, product_datasheet: null, remove_datasheet: true, product_datasheet_preview: null }))}
                          className="text-[10px] font-bold text-danger hover:underline ml-2 shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <CustomInput
                    label="Model Name"
                    placeholder="Enter Product Name"
                    value={productForm.name}
                    onChange={e => { setProductForm(p => ({ ...p, name: e.target.value })); setStep2Error(""); }}
                  />
                  {step2Error && <p className="text-danger text-[10px] font-bold uppercase ml-1">{step2Error}</p>}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] ml-1 opacity-70">Description</label>
                    <textarea
                      placeholder="Enter model description..."
                      rows={3}
                      value={productForm.description}
                      onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full p-4 bg-surface-hover/50 border border-border rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none placeholder:text-text-muted/40"
                    />
                  </div>

                  {/* SKU Code Generation Standard Config */}
                  <div className="bg-surface-hover/30 p-4 rounded-xl border border-border space-y-4">
                    <div>
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-text-primary">SKU Code Length Configuration</h5>
                      <p className="text-[9px] text-text-muted mt-1">Configure character lengths for generated SKU codes</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <CustomInput
                        type="number"
                        min="1"
                        max="10"
                        label="Template Length"
                        value={skuConfig.template_len}
                        onChange={e => setSkuConfig(prev => ({ ...prev, template_len: parseInt(e.target.value) || 3 }))}
                      />
                      <CustomInput
                        type="number"
                        min="1"
                        max="10"
                        label="Brand Length"
                        value={skuConfig.brand_len}
                        onChange={e => setSkuConfig(prev => ({ ...prev, brand_len: parseInt(e.target.value) || 5 }))}
                      />
                      <CustomInput
                        type="number"
                        min="1"
                        max="10"
                        label="Model Length"
                        value={skuConfig.product_len}
                        onChange={e => setSkuConfig(prev => ({ ...prev, product_len: parseInt(e.target.value) || 4 }))}
                      />
                      <CustomInput
                        type="number"
                        min="1"
                        max="10"
                        label="Subtype Length"
                        value={skuConfig.subtype_len}
                        onChange={e => setSkuConfig(prev => ({ ...prev, subtype_len: parseInt(e.target.value) || 4 }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] ml-1 opacity-70">Features & Highlights</label>
                    <div className="flex gap-2">
                      <input
                        placeholder="Add a unique feature..."
                        value={featureInput}
                        onChange={e => setFeatureInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 px-4 py-2.5 bg-surface-hover/50 border border-border rounded-xl text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-text-muted/40"
                      />
                      <Button size="md" variant="primary" onClick={handleAddFeature} className="px-4! rounded-xl shadow-lg shadow-primary/20"><FaPlus /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 p-3 min-h-[60px] bg-surface-hover/30 rounded-xl border border-border border-dashed">
                      {productForm.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3 bg-surface border border-border px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-text-primary group/tag transition-all hover:border-primary hover:shadow-md hover:shadow-primary/5">
                          {feature}
                          <IconButton size="xs" variant="ghost" onClick={() => handleRemoveFeature(index)} className="p-0! text-text-muted hover:text-danger hover:bg-danger/5 rounded-full"><FaTimes /></IconButton>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {nonVariantAttributes.length === 0 ? (
                <div className="py-20 text-center text-text-secondary opacity-50 italic text-sm">No static technical attributes defined for this subtype.</div>
              ) : (
                groupedAttributes.map(([groupName, attrs]) => (
                   <div key={groupName} className="bg-surface-hover/20 p-5 rounded-2xl border border-border/40 space-y-5 mb-6 last:mb-0">
                      <div className="flex items-center gap-4">
                         <div className="w-1.5 h-6 bg-primary/20 rounded-full" />
                         <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-primary opacity-80 break-words whitespace-normal">{groupName}</h5>
                         <div className="h-px flex-1 bg-border/40" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                         {attrs.map(attr => (
                           <div key={attr.id} className="space-y-2">
                              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1 opacity-70 break-words whitespace-normal">
                                 {attr.name} {attr.is_required ? <span className="text-danger">*</span> : null}
                              </label>
                             {renderProductAttributeField({
                               attr,
                               value: nonVariantValues[attr.id],
                               unit: nonVariantUnits[attr.id],
                               onValueChange: (val) => {
                                 setNonVariantValues(prev => ({ ...prev, [attr.id]: val }));
                                 setStep3Errors(prev => ({ ...prev, [attr.id]: "" }));
                               },
                               onUnitChange: (val) => {
                                 setNonVariantUnits(prev => ({ ...prev, [attr.id]: val }));
                                 setStep3Errors(prev => ({ ...prev, [attr.id]: "" }));
                               },
                               attributeValues: attributeValues[attr.id] || [],
                               unitOptions: unitGroupsData[attr.unit_group_id] || [],
                               error: step3Errors[attr.id]
                             })}
                          </div>
                        ))}
                     </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeStep === 4 && isEditMode && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaTags className="text-primary/70" size={14} />
                  <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">SKU Variants ({editingProductSkus.length})</h4>
                </div>
              </div>

              {loadingEditingSkus ? (
                <div className="py-16 text-center animate-pulse flex items-center justify-center gap-2 bg-surface-hover/30 border border-border/40 rounded-xl">
                  <FaSync className="animate-spin text-primary" size={16} />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Loading associated variants...</span>
                </div>
              ) : editingProductSkus.length === 0 ? (
                <div className="py-16 text-center text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface-hover/20 font-bold uppercase tracking-wider">
                  No SKU variants registered for this product model.
                </div>
              ) : (() => {
                const skuAttributes = [];
                const attrs = new Set();
                editingProductSkus.forEach(sku => {
                  sku.attributes?.forEach(a => {
                    if (a.attribute_name) attrs.add(a.attribute_name);
                  });
                });
                skuAttributes.push(...Array.from(attrs));

                return (
                  <div className="max-h-[350px] overflow-x-auto overflow-y-auto border border-border/40 rounded-2xl custom-scrollbar bg-surface shadow-inner w-full">
                    <table className="w-full min-w-max text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-surface-hover/80 border-b border-border/60 sticky top-0 z-10 backdrop-blur-sm">
                          <th className="p-3.5 font-black uppercase tracking-wider text-text-secondary">SKU Code</th>
                          {skuAttributes.map(attrName => (
                            <th key={attrName} className="p-3.5 font-black uppercase tracking-wider text-text-secondary">{attrName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {editingProductSkus.map(sku => (
                          <tr key={sku.id} className="hover:bg-primary/[0.01] transition-colors">
                            <td className="p-3.5 font-mono font-bold text-primary">{sku.sku_code}</td>
                            {skuAttributes.map(attrName => {
                              const attr = sku.attributes?.find(a => a.attribute_name === attrName);
                              return (
                                <td key={attrName} className="p-3.5 text-text-secondary font-bold whitespace-normal break-words max-w-[200px]">
                                  {renderAttributeValue(attr)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button 
            size="md"
            variant="secondary" 
            disabled={activeStep === 1 || isSubmitting || !isDataReady} 
            onClick={handlePrevStep} 
            leftIcon={<FaArrowLeft />}
          >
            Back
          </Button>
          
          <div className="flex gap-3">
             {localStorage.getItem("product_master_draft") && !isEditMode && isDataReady && (
               <Button 
                 variant="danger" 
                 size="md" 
                 onClick={() => {
                   localStorage.removeItem("product_master_draft");
                   setSelectedBrand(null);
                   setSelectedScopes([]);
                   setProductForm({ name: "", description: "", features: [], product_image: null, product_image_preview: null });
                   setNonVariantValues({});
                   setNonVariantUnits({});
                   dispatch(setAlert({ type: "info", message: "Draft cleared" }));
                 }}
               >
                 Clear Draft
               </Button>
             )}
             <Button size="md" variant="ghost" onClick={onClose}>Cancel</Button>
             {!isDataReady ? (
               <Button size="md" variant="primary" disabled loading={true}>Loading...</Button>
             ) : activeStep < (isEditMode ? 4 : 3) ? (
               <Button size="md" variant="primary" onClick={handleNextStep} rightIcon={<FaArrowRight />}>Continue</Button>
             ) : (
               <Button size="md" variant="primary" loading={isSubmitting} onClick={handleSubmit} leftIcon={<FaCheck />}>
                 {isEditMode ? "Save Changes" : "Complete Registration"}
               </Button>
             )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function renderProductAttributeField({ attr, value, unit, onValueChange, onUnitChange, attributeValues, unitOptions, error }) {
  const inputClass = "w-full p-2 bg-surface-hover border border-border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all";
  const errorClass = error ? "border-danger focus:border-danger focus:ring-danger/10" : "";

  switch (attr.data_type) {
    case "dropdown":
      return (
        <div className="space-y-1">
          <DropdownWithSearchInput
            options={attributeValues.map(v => ({ value: v.id, text: v.value }))}
            value={value || ""}
            onChange={onValueChange}
            placeholder={`Select ${attr.name}`}
            className={`${errorClass}`}
          />
          {error && <p className="text-danger text-[9px] font-bold uppercase ml-1">{error}</p>}
        </div>
      );

    case "multiselect":
      return (
        <div className="space-y-1">
          <MultiSelectDropdownWithSearchInput
            options={attributeValues.map(v => ({ value: v.id, text: v.value }))}
            values={value || []}
            onChange={onValueChange}
            placeholder={`Choose ${attr.name}`}
            className={`${errorClass}`}
          />
          {error && <p className="text-danger text-[9px] font-bold uppercase ml-1">{error}</p>}
        </div>
      );

    case "number":
      return (
        <div className="space-y-1">
          <div className="flex gap-2">
            <CustomInput
              type="number"
              className="flex-1"
              inputClassName={errorClass}
              value={value || ""}
              placeholder="0.00"
              onChange={(e) => onValueChange(e.target.value)}
            />
            {attr.unit_group_id && (
              <div className="w-28 mt-0">
                <DropdownWithSearchInput
                  options={unitOptions.map(u => ({ value: u.id, text: u.symbol }))}
                  value={unit || ""}
                  onChange={onUnitChange}
                  placeholder="Unit"
                  className={errorClass}
                />
              </div>
            )}
          </div>
          {error && <p className="text-danger text-[9px] font-bold uppercase ml-1">{error}</p>}
        </div>
      );

    case "boolean":
      return (
        <div className="space-y-1">
          <DropdownWithSearchInput
            options={[
              { value: "1", text: "YES" },
              { value: "0", text: "NO" }
            ]}
            value={value || ""}
            onChange={onValueChange}
            placeholder={`Select ${attr.name}`}
            className={`${errorClass}`}
          />
          {error && <p className="text-danger text-[9px] font-bold uppercase ml-1">{error}</p>}
        </div>
      );

    case "file":
      const getFilesForDisplay = () => {
        if (value instanceof File) return [value];
        if (typeof value === 'string' && value) return [{ name: value.split('/').pop() || "Product Asset" }];
        return [];
      };
      return (
        <div className="space-y-1">
          <CustomFilePicker
            name={`attr_file_${attr.id}`}
            accept="*/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) onValueChange(file);
            }}
            files={getFilesForDisplay()}
            className={`${errorClass}`}
          />
          {error && <p className="text-danger text-[9px] font-bold uppercase ml-1">{error}</p>}
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <CustomInput
            inputClassName={errorClass}
            value={value || ""}
            onChange={(e) => onValueChange(e.target.value)}
          />
          {error && <p className="text-danger text-[9px] font-bold uppercase ml-1">{error}</p>}
        </div>
      );
  }
}