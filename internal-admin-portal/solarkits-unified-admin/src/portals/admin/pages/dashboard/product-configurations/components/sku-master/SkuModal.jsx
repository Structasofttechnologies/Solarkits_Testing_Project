import { useState, useEffect, useMemo } from "react";
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
import {
  FaCog,
  FaBoxes,
  FaBarcode,
  FaCheck,
} from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";
import PopupDataLoader from "@/components/PopupDataLoader";

const API_URL = import.meta.env.VITE_API_URL;

export default function SKUModal({
  moduleUniqueId,
  isOpen,
  onClose,
  editingSku,
  selectedProduct,
  selectedTemplate,
  selectedSubtype,
  onSuccess
}) {
  const dispatch = useDispatch();
  const getBaseQuery = (reqFor) => `?unique_id=${moduleUniqueId}&req_for=${reqFor}`;

  const [variantAttributes, setVariantAttributes] = useState([]);
  const [variantValues, setVariantValues] = useState({});
  const [variantUnits, setVariantUnits] = useState({});
  const [attributeValues, setAttributeValues] = useState({});
  const [unitGroupsData, setUnitGroupsData] = useState({});
  const [skuFormErrors, setSkuFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPatternInfo, setShowPatternInfo] = useState(false);

  const isEditMode = !!editingSku;

  const fetchAttributeValuesById = async (attributeId) => {
    try {
      const res = await axios.get(`${API_URL}/product-templates/get-attribute-values${getBaseQuery("view")}&attribute_id=${attributeId}`, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setAttributeValues(prev => ({ ...prev, [attributeId]: res.data.data }));
      }
    } catch { }
  };

  const fetchUnitsForGroup = async (groupId) => {
    if (unitGroupsData[groupId]) return;
    try {
      const res = await axios.get(`${API_URL}/units${getBaseQuery("view")}&group_id=${groupId}`, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setUnitGroupsData(prev => ({ ...prev, [groupId]: res.data.data }));
      }
    } catch { }
  };

  const loadEditingSkuData = () => {
    console.log("loadEditingSkuData called! editingSku:", editingSku);
    if (!editingSku?.attributes) {
      console.log("No editingSku attributes found!");
      return;
    }
    const values = {};
    const units = {};

    editingSku.attributes.forEach((attr) => {
      const id = attr.attribute_id;
      switch (attr.data_type) {
        case "dropdown": values[id] = attr.value_option_id ?? ""; break;
        case "multiselect":
          try {
            const parsed = attr.value_text ? JSON.parse(attr.value_text) : [];
            values[id] = Array.isArray(parsed) ? parsed.map(Number) : [];
          } catch { values[id] = []; }
          break;
        case "number":
          values[id] = attr.value_number ?? "";
          if (attr.unit_id) units[id] = attr.unit_id;
          break;
        case "boolean": values[id] = attr.value_boolean === 1 || attr.value_boolean === true ? "1" : "0"; break;
        case "file": values[id] = attr.value_text || null; break;
        default: values[id] = attr.value_text ?? "";
      }
    });
    setVariantValues(values);
    setVariantUnits(units);
  };

  // Save draft for SKU Registration
  useEffect(() => {
    if (isOpen && !isEditMode) {
      const draftObj = {
        variantValues,
        variantUnits
      };
      localStorage.setItem("sku_master_draft", JSON.stringify(draftObj));
    }
  }, [isOpen, isEditMode, variantValues, variantUnits]);

  useEffect(() => {
    const init = async () => {
      if (!isOpen || !selectedTemplate || !selectedSubtype) return;
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_URL}/product-templates/get-attributes${getBaseQuery("view")}&template_id=${selectedTemplate}&subtype_id=${selectedSubtype}`, { headers: authHeaderObj() });
        if (res.data?.status === "success") {
          const attrs = res.data.data;
          const variantAttrs = attrs.filter(a => a.is_variant === 1);
          setVariantAttributes(variantAttrs);

          for (const attr of variantAttrs) {
            if (attr.data_type === "dropdown" || attr.data_type === "multiselect") await fetchAttributeValuesById(attr.id);
            if (attr.data_type === "number" && attr.unit_group_id) await fetchUnitsForGroup(attr.unit_group_id);
          }

          if (isEditMode) {
            loadEditingSkuData();
          } else {
            // Restore draft if any
            const savedDraft = localStorage.getItem("sku_master_draft");
            if (savedDraft) {
              try {
                const parsed = JSON.parse(savedDraft);
                if (parsed.variantValues) setVariantValues(parsed.variantValues);
                if (parsed.variantUnits) setVariantUnits(parsed.variantUnits);
                dispatch(setAlert({ type: "success", message: "Restored unsaved SKU draft!" }));
              } catch (e) {
                console.error("Failed to restore SKU draft", e);
              }
            } else {
              const initial = {};
              variantAttrs.forEach(a => { initial[a.id] = a.data_type === "multiselect" ? [] : ""; });
              setVariantValues(initial);
              setVariantUnits({});
            }
          }
          setSkuFormErrors({});
        }
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };
    init();
  }, [isOpen, selectedTemplate, selectedSubtype, editingSku?.id]);

  const validateSkuForm = () => {
    const errors = {};
    let isValid = true;
    for (const attr of variantAttributes) {
      const val = variantValues[attr.id];
      if (attr.is_required) {
        if (!val || (Array.isArray(val) && val.length === 0)) {
          errors[attr.id] = `${attr.name} is mandatory`;
          isValid = false;
        }
      }
      if (attr.data_type === "number" && val) {
        if (!variantUnits[attr.id]) {
          errors[attr.id] = `Specify unit`;
          isValid = false;
        }
      }
    }
    setSkuFormErrors(errors);
    return isValid;
  };

  const prepareFormData = () => {
    const formData = new FormData();
    formData.append("product_id", selectedProduct.id);
    if (isEditMode) {
      formData.append("sku_id", editingSku.id);
      formData.append("stock", editingSku.stock || 0);
    }

    const attrsPayload = [];
    for (const attr of variantAttributes) {
      const val = variantValues[attr.id];
      if ((!val || val === "") && !attr.is_required) continue;

      const item = { attribute_id: attr.id };
      switch (attr.data_type) {
        case "file":
          if (val instanceof File) formData.append(`attribute_${attr.id}`, val);
          else if (val && typeof val === 'string') item.value_text = val;
          break;
        case "multiselect": item.value_text = JSON.stringify(val); break;
        case "number":
          item.value_number = parseFloat(val);
          item.unit_id = variantUnits[attr.id] || null;
          break;
        case "boolean": item.value_boolean = val === "1" ? 1 : 0; break;
        case "dropdown": item.value_option_id = val; break;
        default: item.value_text = val;
      }
      attrsPayload.push(item);
    }
    formData.append("skus", JSON.stringify([{ sku_sequence: editingSku?.sku_sequence || 1, stock: editingSku?.stock || 0, attributes: attrsPayload }]));
    return formData;
  };

  const handleSubmit = async () => {
    if (!validateSkuForm()) {
      dispatch(setAlert({ type: "warning", message: "Validation error." }));
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isEditMode ? "update-sku" : "add-sku";
      const res = await axios({
        method: isEditMode ? "PUT" : "POST",
        url: `${API_URL}/products/${endpoint}${getBaseQuery(isEditMode ? "edit" : "add")}`,
        data: prepareFormData(),
        headers: { ...authHeaderObj() }
      });

      if (res.data?.status === "success") {
        if (!isEditMode) {
          localStorage.removeItem("sku_master_draft");
        }
        dispatch(setAlert({ type: "success", message: `SKU ${isEditMode ? "updated" : "added"} successfully.` }));
        onSuccess?.();
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Operation failed." }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err?.response?.data?.message || "An error occurred." }));
    } finally { setIsSubmitting(false); }
  };

  const shortCode = (str, len = 3) => {
    const cleaned = str?.replace(/[^a-zA-Z0-9]/g, "") || "";
    return cleaned.substring(0, len).toUpperCase();
  };

  const templateLen = selectedProduct?.sku_config?.template_len ?? 3;
  const brandLen = selectedProduct?.sku_config?.brand_len ?? 5;
  const productLen = selectedProduct?.sku_config?.product_len ?? 4;
  const subtypeLen = selectedProduct?.sku_config?.subtype_len ?? 4;

  const templatePart = useMemo(() => selectedProduct ? shortCode(selectedProduct.template_name, templateLen) : "TEM", [selectedProduct, templateLen]);
  const brandPart = useMemo(() => selectedProduct ? shortCode(selectedProduct.brand_name, brandLen) : "BRAND", [selectedProduct, brandLen]);
  const productPart = useMemo(() => selectedProduct ? shortCode(selectedProduct.name, productLen) : "PROD", [selectedProduct, productLen]);
  const subtypePart = useMemo(() => selectedProduct ? shortCode(selectedProduct.subtype_name, subtypeLen) : "SUBT", [selectedProduct, subtypeLen]);

  const finalSkuPart = useMemo(() => {
    const capacityAttr = variantAttributes.find(a => a.attribute_type === 'sku' || a.attribute_type === 'capacity');
    if (!capacityAttr) return "";

    let skuPart = "";
    const val = variantValues[capacityAttr.id];
    if (val !== undefined && val !== null && val !== "") {
      switch (capacityAttr.data_type) {
        case "text":
          skuPart = val;
          break;
        case "number":
          const selectedUnitId = variantUnits[capacityAttr.id];
          const unitOptions = unitGroupsData[capacityAttr.unit_group_id] || [];
          const selectedUnit = unitOptions.find(u => String(u.id) === String(selectedUnitId));
          const symbol = selectedUnit?.symbol || "";
          skuPart = `${val}${symbol}`;
          break;
        case "boolean":
          skuPart = val === "1" ? "YES" : "NO";
          break;
        case "dropdown":
          const options = attributeValues[capacityAttr.id] || [];
          const selectedOpt = options.find(o => String(o.id) === String(val));
          skuPart = selectedOpt?.value || "";
          break;
      }
    }
    return skuPart ? skuPart.replace(/[^a-zA-Z0-9.]/g, "").toUpperCase() : "";
  }, [variantAttributes, variantValues, variantUnits, unitGroupsData, attributeValues]);

  const skuStructureParts = useMemo(() => {
    const capacityAttr = variantAttributes.find(a => !!a.is_sku || !!a.is_capacity);
    const capacityLabel = capacityAttr ? `SKU Value (${capacityAttr.name})` : "SKU Value";
    const capacityDesc = capacityAttr
      ? `Dynamic value from the SKU attribute "${capacityAttr.name}"`
      : "Dynamic value of the SKU attribute";

    return [
      { key: "TEM", label: "Template", desc: `First ${templateLen} letters of Template name (${templatePart})` },
      { key: "BRAND", label: "Brand Company", desc: `First ${brandLen} letters of Brand name (${brandPart})` },
      { key: "PROD", label: "Product Name", desc: `First ${productLen} letters of Product Model name (${productPart})` },
      { key: "SUBT", label: "Product Subtype", desc: `First ${subtypeLen} letters of Product Subtype name (${subtypePart})` },
      { key: "SKU_VALUE", label: capacityLabel, desc: capacityDesc },
    ];
  }, [variantAttributes, templateLen, brandLen, productLen, subtypeLen, templatePart, brandPart, productPart, subtypePart]);

  const groupedAttributes = useMemo(() => {
    const groups = {};
    // Sort attrs ascending by display_order before grouping
    const sorted = [...variantAttributes].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    sorted.forEach(attr => {
      const groupName = attr.group_name || "Extended Specifications";
      if (!groups[groupName]) {
        groups[groupName] = { attrs: [], minOrder: attr.display_order ?? 0 };
      }
      groups[groupName].attrs.push(attr);
    });
    // Return ordered array of [groupName, attrs] sorted by the group's min display_order
    return Object.entries(groups)
      .sort(([, a], [, b]) => a.minOrder - b.minOrder)
      .map(([name, { attrs }]) => [name, attrs]);
  }, [variantAttributes]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit SKU Variant" : "Register SKU Variant"} size="xl">
      <div className="space-y-4 mt-1">
        {/* SKU Blueprint Banner - Compact */}
        <div className="bg-surface-hover/50 rounded-2xl p-5 border border-border/40 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <FaBarcode size={14} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-text-primary uppercase tracking-widest">SKU Blueprint Identification</h3>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-tighter opacity-60">System-generated variant pattern</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowPatternInfo(!showPatternInfo)} className="text-[9px] font-black h-7 px-3 bg-surface border border-border hover:bg-surface-hover rounded-lg uppercase tracking-widest transition-all">
              {showPatternInfo ? "Hide Legend" : "Show Legend"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {skuStructureParts.map((part, i) => {
              let displayVal = part.key;
              if (part.key === "TEM") displayVal = templatePart;
              else if (part.key === "BRAND") displayVal = brandPart;
              else if (part.key === "PROD") displayVal = productPart;
              else if (part.key === "SUBT") displayVal = subtypePart;
              else if (part.key === "SKU_VALUE") displayVal = finalSkuPart || "XXXX";

              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-text-muted uppercase tracking-wider mb-1">{part.label}</span>
                    <div className="px-3.5 py-2 bg-surface border border-border/60 rounded-xl text-[10px] font-mono font-black text-primary shadow-sm hover:border-primary/40 transition-colors">
                      {displayVal}
                    </div>
                  </div>
                  {i < skuStructureParts.length - 1 && <span className="text-text-muted/30 font-black self-end mb-2.5">—</span>}
                </div>
              );
            })}
          </div>

          {/* Full SKU Preview Text */}
          <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Live SKU Preview</span>
            <span className="font-mono text-xs font-black text-primary bg-primary/5 px-3.5 py-1.5 rounded-lg border border-primary/20 tracking-widest shadow-sm">
              {`${templatePart}-${brandPart}-${productPart}-${subtypePart}-${finalSkuPart || "XXXX"}`}
            </span>
          </div>

          {showPatternInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-5 p-4 bg-surface rounded-xl border border-border/40 animate-in slide-in-from-top-2 duration-300 shadow-inner">
              {skuStructureParts.map((part, i) => (
                <div key={i} className="flex flex-col gap-1 bg-surface-hover/30 p-3 rounded-lg border border-border/30">
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{part.key}</span>
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest truncate">{part.label}</span>
                  <span className="text-[9px] text-text-muted font-bold mt-1 leading-normal leading-relaxed">{part.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <PopupDataLoader text="Loading Variant Parameters..." />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FaCog size={14} className="animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-text-primary uppercase tracking-widest">Configuration Parameters</h4>
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-tighter opacity-60">Define variant-specific dimensions</p>
                </div>
              </div>
            </div>

            {variantAttributes.length === 0 ? (
              <div className="py-16 text-center text-text-muted italic text-sm bg-surface-hover/20 rounded-2xl border border-dashed border-border/60 uppercase tracking-widest font-black opacity-40">No parameters available.</div>
            ) : (
              <div className="space-y-6">
                {groupedAttributes.map(([groupName, attrs]) => (
                  <div key={groupName} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-primary">
                        {groupName}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 bg-surface-hover/20 p-6 rounded-2xl border border-border/40">
                      {attrs.map(attr => (
                        <div key={attr.id} className="space-y-2">
                          <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1 opacity-70 flex items-center justify-between">
                            <span>{attr.name} {attr.is_required && <span className="text-danger font-black">*</span>}</span>
                            <div className="flex items-center gap-1.5">
                              {attr.is_sku || attr.is_capacity ? (
                                <span className="text-[8px] font-black text-indigo-600 uppercase bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  SKU Parameter
                                </span>
                              ) : null}
                              {attr.is_variant ? (
                                <span className="text-[8px] font-black text-success uppercase bg-success/5 border border-success/10 px-1.5 py-0.5 rounded">
                                  Variant
                                </span>
                              ) : null}
                            </div>
                          </label>
                          {renderAttributeField({
                            attr,
                            value: variantValues[attr.id],
                            unit: variantUnits[attr.id],
                            onValueChange: (val) => setVariantValues(p => ({ ...p, [attr.id]: val })),
                            onUnitChange: (val) => setVariantUnits(p => ({ ...p, [attr.id]: val })),
                            attributeValues: attributeValues[attr.id] || [],
                            unitOptions: unitGroupsData[attr.unit_group_id] || [],
                            error: skuFormErrors[attr.id]
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isEditMode && editingSku && (
              <div className="p-5 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between shadow-inner">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest opacity-80">Current SKU Code</p>
                  <p className="font-mono text-base font-black text-text-primary tracking-widest">{editingSku.sku_code}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest opacity-80">Inventory Level</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg">
                    <FaBoxes size={12} className="text-primary" />
                    <p className="text-text-primary font-black text-lg">{editingSku.stock || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          {localStorage.getItem("sku_master_draft") && !isEditMode && (
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                localStorage.removeItem("sku_master_draft");
                const initial = {};
                variantAttributes.forEach(a => { initial[a.id] = a.data_type === "multiselect" ? [] : ""; });
                setVariantValues(initial);
                setVariantUnits({});
                dispatch(setAlert({ type: "info", message: "Draft cleared" }));
              }}
            >
              Clear Draft
            </Button>
          )}
          <Button size="md" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            size="md"
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={<FaCheck />}
          >
            {isEditMode ? "Update Variant" : "Register Variant"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function renderAttributeField({ attr, value, unit, onValueChange, onUnitChange, attributeValues, unitOptions, error }) {
  const inputClass = "w-full p-2 bg-surface-hover border border-border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all";
  const errorClass = error ? "border-danger focus:border-danger focus:ring-danger/10" : "";

  switch (attr.data_type) {
    case "file":
      const getFilesForDisplay = () => {
        if (value instanceof File) return [value];
        if (typeof value === 'string' && value) return [{ name: value.split('/').pop() || "Variant Asset" }];
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
            values={Array.isArray(value) ? value : []}
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
              value={value ?? ""}
              placeholder="0.00"
              onChange={(e) => onValueChange(e.target.value)}
            />
            {attr.unit_group_id && (
              <div className="w-24 mt-0">
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
            value={value ?? ""}
            onChange={onValueChange}
            placeholder={`Select ${attr.name}`}
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
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
          />
          {error && <p className="text-danger text-[9px] font-bold uppercase ml-1">{error}</p>}
        </div>
      );
  }
}