import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { setAlert } from "@/features/alert.slice";
import PageHeader from "@/components/PageHeader";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Button from "@/components/Button";
import * as productTemplateApi from "@/api/productTemplates";

import {
  FaCube, FaArrowLeft, FaLayerGroup, FaPlus
} from "react-icons/fa";

// Sections / Workspaces
import TemplatesSection from "./components/product-templates/TemplatesSection";
import SubtypesSection from "./components/product-templates/SubtypesSection";
import SubtypeWorkspace from "./components/product-templates/SubtypeWorkspace";

export default function ProductTemplates({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse path parameters from URL robustly relative to "product-templates"
  const pathParts = location.pathname.split("/").filter(Boolean);
  const baseIndex = pathParts.indexOf("product-templates");
  const currentTemplateId = baseIndex !== -1 && pathParts[baseIndex + 1] ? pathParts[baseIndex + 1] : null;
  const currentSubtypeId = baseIndex !== -1 && pathParts[baseIndex + 2] ? pathParts[baseIndex + 2] : null;

  // Resolve base prefix dynamically (e.g. /admin-panel/product-configurations/product-templates)
  const basePrefix = useMemo(() => {
    if (baseIndex === -1) return "/admin-panel/product-configurations/product-templates";
    return "/" + pathParts.slice(0, baseIndex + 1).join("/");
  }, [pathParts, baseIndex]);

  const isStep3 = !!currentTemplateId && !!currentSubtypeId;
  const isStep2 = !!currentTemplateId && !currentSubtypeId;
  const isStep1 = !currentTemplateId;

  // ==================== SHARED STATE ====================
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ==================== DATA STATE ====================
  const [templates, setTemplates] = useState([]);
  const [subtypes, setSubtypes] = useState([]);
  const [projectHierarchy, setProjectHierarchy] = useState([]);
  const [templateScopes, setTemplateScopes] = useState([]);
  const [attributeGroups, setAttributeGroups] = useState([]);
  const [unitGroups, setUnitGroups] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState([]);
  const [mappedBrands, setMappedBrands] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);

  // ==================== COMPUTED STATE ====================
  const scopeOptions = useMemo(() => {
    const options = [];
    (projectHierarchy || []).forEach((item) => {
      // Support both 4-level hierarchy (industry -> categories) and 3-level fallback
      const categories = item.categories || (item.subcategories ? [item] : []);
      categories.forEach((cat) => {
        (cat.subcategories || []).forEach((sub) => {
          (sub.mappedTypes || []).forEach((mType) => {
            const prefix = item.name && item.name !== "All Industry Types" && item.name !== cat.name 
              ? `${item.name} › ` 
              : "";
            options.push({
              value: mType.subcategory_type_id,
              text: `${prefix}${cat.name} › ${sub.name} › ${mType.name}`,
            });
          });
        });
      });
    });
    return options;
  }, [projectHierarchy]);

  const currentTemplateName = useMemo(() => {
    return templates.find(t => String(t.id) === String(currentTemplateId))?.name || "Select Template";
  }, [templates, currentTemplateId]);

  const pageStats = useMemo(() => {
    if (isStep3) {
      const subtypeName = subtypes.find(s => String(s.id) === String(currentSubtypeId))?.name || "Subtype";
      const count = attributes.filter(a => String(a.subtype_id) === String(currentSubtypeId)).length;
      return [
        { label: "Subtype Active", value: subtypeName.toUpperCase(), description: "Currently managing" },
        { label: "Specifications", value: count, description: "Mapped parameters" }
      ];
    }
    if (isStep2) {
      const templateName = templates.find(t => String(t.id) === String(currentTemplateId))?.name || "Template";
      return [
        { label: "Template Active", value: templateName.toUpperCase(), description: "Core architecture" },
        { label: "Subtypes Count", value: subtypes.length, description: "Total defined subtypes" }
      ];
    }
    return [
      { label: "Templates Directory", value: templates.length, description: "Total base architectures" }
    ];
  }, [isStep3, isStep2, templates, subtypes, attributes, currentTemplateId, currentSubtypeId]);

  // ==================== FETCH FUNCTIONS ====================
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productTemplateApi.getTemplates(moduleUniqueId);
      if (res.status === "success") {
        setTemplates(res.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [moduleUniqueId]);

  const fetchDependencies = useCallback(async () => {
    if (!currentTemplateId) return;
    setLoading(true);
    try {
      const [st, sc, gr, at, mb] = await Promise.all([
        productTemplateApi.getSubtypes(currentTemplateId, moduleUniqueId),
        productTemplateApi.getSubtypeScopes(currentTemplateId, moduleUniqueId),
        productTemplateApi.getAttributeGroups(currentTemplateId, moduleUniqueId),
        productTemplateApi.getAttributes(currentTemplateId, moduleUniqueId),
        productTemplateApi.getBrandsByTemplate(currentTemplateId, moduleUniqueId)
      ]);
      setSubtypes(st.data || []);
      setTemplateScopes(sc.data || []);
      setAttributeGroups(gr.data || []);
      setAttributes(at.data || []);
      setMappedBrands(mb.data || []);

      // Batch fetch attribute values for dropdowns
      const dropdownAttrs = (at.data || []).filter(a => ["dropdown", "multiselect"].includes(a.data_type));
      const valuePromises = dropdownAttrs.map(a => productTemplateApi.getAttributeValues(a.id, moduleUniqueId));
      const valueResults = await Promise.all(valuePromises);
      const allValues = valueResults.flatMap(r => r.data || []);
      setAttributeValues(allValues);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentTemplateId, moduleUniqueId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  useEffect(() => {
    const fetchGlobal = async () => {
      const [ph, ug, b, u] = await Promise.all([
        productTemplateApi.getProjectHierarchy(moduleUniqueId),
        productTemplateApi.getUnitGroups(moduleUniqueId),
        productTemplateApi.getAllBrands(moduleUniqueId),
        productTemplateApi.getUnits(null, moduleUniqueId)
      ]);
      setProjectHierarchy(ph.data || []);
      setUnitGroups(ug.data || []);
      setBrands(b.data || []);
      setUnits(u.data || []);
    };
    fetchGlobal();
  }, [moduleUniqueId]);

  const handleAddTemplate = async (formData, isEditing) => {
    const nameLower = formData.name?.toLowerCase().trim();
    if (["inverter", "solar panel", "battery", "acdb", "dcdb", "cable", "wire"].includes(nameLower)) {
      dispatch(setAlert({ type: "error", message: "Cannot register or modify a system template name." }));
      return false;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        qty_unit_id: formData.qty_unit_id || null
      };
      if (isEditing) payload.id = formData.id;
      const res = isEditing
        ? await productTemplateApi.updateTemplate(payload, moduleUniqueId)
        : await productTemplateApi.addTemplate(payload, moduleUniqueId);
      if (res.status === "success") {
        await fetchTemplates();
        dispatch(setAlert({ type: "success", message: `Template ${isEditing ? 'updated' : 'added'}` }));
        return true;
      }
    } catch (e) {
      dispatch(setAlert({ type: "error", message: "Operation failed" }));
    } finally {
      setIsSaving(false);
    }
    return false;
  };

  const wrapAction = (actionFn, successMsg = "Operation successful") => async (...args) => {
    setIsSaving(true);
    try {
      const result = await actionFn(...args);
      const isSuccess = typeof result === 'boolean' ? result : (result?.status === "success");

      if (isSuccess) {
        await fetchDependencies();
        dispatch(setAlert({ type: "success", message: successMsg }));
        return true;
      } else {
        const msg = typeof result === 'object' ? result?.message : "Operation failed";
        dispatch(setAlert({ type: "error", message: msg || "Operation failed" }));
      }
    } catch (e) {
      console.error(e);
      dispatch(setAlert({ type: "error", message: "System error occurred" }));
    } finally {
      setIsSaving(false);
    }
    return false;
  };

  return (
    <div className="flex flex-col space-y-6 pb-20 animate-in fade-in duration-700">
      <PageHeader
        title="Product Engineering Templates"
        subtitle="Configure baseline product architectures, technical specifications, and variant generation logic via a guided journey."
        icon={FaCube}
        stats={pageStats}
        breadcrumbOverrides={{
          [currentTemplateId]: templates.find(t => String(t.id) === String(currentTemplateId))?.name || "Template",
          [currentSubtypeId]: subtypes.find(s => String(s.id) === String(currentSubtypeId))?.name || "Subtype"
        }}
      />

      {/* Breadcrumbs & Back Navigation */}
      {!isStep1 && (
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (isStep3) {
                navigate(`${basePrefix}/${currentTemplateId}`);
              } else {
                navigate(basePrefix);
              }
            }}
            leftIcon={<FaArrowLeft />}
            className="rounded-xl px-4 h-10 font-bold text-[11px] uppercase tracking-wider"
          >
            {isStep3 ? "Back to Subtypes" : "Back to Templates"}
          </Button>
          {isStep3 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(basePrefix)}
              className="rounded-xl px-4 h-10 font-bold text-[11px] uppercase tracking-wider border-dashed"
            >
              All Templates
            </Button>
          )}
        </div>
      )}

      {/* Template Switcher Dropdown (Only visible in Subtypes list and Subtype Workspace) */}
      {!isStep1 && templates.length > 1 && (
        <div className="bg-surface rounded-2xl border-2 border-border p-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/10 shadow-inner">
              <FaCube size={14} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">Selected Architecture</p>
              <h4 className="text-sm font-black text-primary uppercase tracking-tight">{currentTemplateName}</h4>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <DropdownWithSearchInput
              options={templates.map(t => ({ value: t.id, text: t.name }))}
              value={currentTemplateId || ""}
              onChange={(val) => navigate(`${basePrefix}/${val}`)}
              placeholder="Switch Template..."
            />
          </div>
        </div>
      )}

      <div className="min-h-125">
        {/* Step 1: List templates */}
        {isStep1 && (
          <TemplatesSection
            templates={templates}
            units={units}
            onSaveTemplate={handleAddTemplate}
            onSelectTemplate={(id) => navigate(`${basePrefix}/${id}`)}
            isSaving={isSaving}
          />
        )}

        {/* Step 2: List subtypes for the template */}
        {isStep2 && (
          <SubtypesSection
            subtypes={subtypes}
            onSaveSubtype={wrapAction(async (data, isEdit) => {
              const res = isEdit
                ? await productTemplateApi.updateSubtype({ ...data, template_id: currentTemplateId }, moduleUniqueId)
                : await productTemplateApi.addSubtype({ ...data, template_id: currentTemplateId }, moduleUniqueId);
              return res.status === "success";
            })}
            onSelectSubtype={(subId) => navigate(`${basePrefix}/${currentTemplateId}/${subId}`)}
            isSaving={isSaving}
          />
        )}

        {/* Step 3: Subtype Workspace */}
        {isStep3 && (
          <SubtypeWorkspace
            template={templates.find(t => String(t.id) === String(currentTemplateId))}
            subtype={subtypes.find(s => String(s.id) === String(currentSubtypeId))}
            // Brand props
            mappedBrands={mappedBrands}
            brands={brands}
            onMapBrand={wrapAction((subId, brandId) => productTemplateApi.mapBrandTemplate({ subtype_id: subId, brand_id: brandId }, moduleUniqueId).then(r => r.status === "success"))}
            onDeleteBrandMap={wrapAction((id) => productTemplateApi.deleteBrandMapping({ id }, moduleUniqueId).then(r => r.status === "success"))}
            // Scope props
            scopes={templateScopes}
            scopeOptions={scopeOptions}
            onAddScope={wrapAction((subId, typeMapIds) =>
              productTemplateApi.addSubtypeScope({
                subtype_id: subId,
                scopes: typeMapIds.map(id => ({ subcategory_type_id: id }))
              }, moduleUniqueId)
            )}
            onDeleteScope={wrapAction((id) =>
              productTemplateApi.deleteSubtypeScope({ id }, moduleUniqueId).then(r => r.status === "success")
            )}
            // Group props
            groups={attributeGroups}
            onSaveGroup={wrapAction((data, isEdit, names) => {
              const reqs = names.map(n => isEdit ? productTemplateApi.updateAttributeGroup({ id: data.id, name: n, subtype_id: data.subtype_id }, moduleUniqueId) : productTemplateApi.addAttributeGroup({ name: n, template_id: currentTemplateId, subtype_id: data.subtype_id }, moduleUniqueId));
              return Promise.all(reqs).then(res => res.some(r => r.status === "success"));
            })}
            onReorderGroups={wrapAction((ids) => productTemplateApi.updateAttributeGroupsOrder({ order_ids: ids }, moduleUniqueId).then(r => r.status === "success"))}
            // Attribute props
            attributes={attributes}
            unitGroups={unitGroups}
            onSaveAttribute={wrapAction(async (data, rows) => {
              const reqs = rows.map(r => productTemplateApi.addAttribute({
                ...r,
                attribute_group_id: data.group_id || null,
                subtype_id: data.subtype_id,
                unit_group_id: r.unit_group_id || null,
                system_variable: r.system_variable || null
              }, moduleUniqueId));
              const results = await Promise.all(reqs);
              return results.every(res => res.status === "success");
            })}
            onUpdateAttribute={wrapAction((data) => productTemplateApi.updateAttribute({
              ...data,
              attribute_group_id: data.group_id || null,
              unit_group_id: data.unit_group_id || null,
              system_variable: data.system_variable || null
            }, moduleUniqueId).then(r => r.status === "success"))}
            onReorderAttributes={wrapAction((ids) => productTemplateApi.updateAttributesOrder({ order_ids: ids }, moduleUniqueId).then(r => r.status === "success"))}
            // Value props
            attributeValues={attributeValues}
            onAddAttributeValue={wrapAction(async (attrId, rows, isEdit, valId) => {
              const reqs = rows.map(r => isEdit
                ? productTemplateApi.updateAttributeValue({ id: valId, value: r.value, attribute_id: attrId }, moduleUniqueId)
                : productTemplateApi.addAttributeValue({ attribute_id: attrId, value: r.value }, moduleUniqueId)
              );
              const results = await Promise.all(reqs);
              return results.every(res => res.status === "success");
            })}
            onDeleteAttributeValue={wrapAction((id) => productTemplateApi.deleteAttributeValue({ id }, moduleUniqueId).then(r => r.status === "success"))}
            onReorderValues={wrapAction((attrId, ids) => productTemplateApi.updateAttributeValuesOrder({ attribute_id: attrId, order_ids: ids }, moduleUniqueId).then(r => r.status === "success"))}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}