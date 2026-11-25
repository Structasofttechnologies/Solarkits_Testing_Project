import { useState, useEffect } from "react";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import Dialog from "@/components/Dialog";
import CustomInput from "@/components/CustomInput";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import { FaPlus, FaEdit, FaCube, FaLock } from "react-icons/fa";

const INITIAL_FORM = { id: null, name: "", description: "", is_system: false, qty_unit_id: null };

const isSystemTemplate = (tpl) => {
  if (!tpl) return false;
  const nameLower = tpl.name?.toLowerCase().trim();
  return tpl.is_system || ["inverter", "solar panel", "battery", "acdb", "dcdb", "cable", "wire"].includes(nameLower);
};

export default function TemplatesSection({ templates, units, onSaveTemplate, onSelectTemplate, isSaving }) {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => {
    if (showModal && !isEditing) {
      localStorage.setItem("template_draft", JSON.stringify(formData));
    }
  }, [formData, showModal, isEditing]);

  const handleOpenModal = (template = null) => {
    if (template) {
      const rawUnitId = template.qty_unit_id;
      const unitIdStr = rawUnitId 
        ? (typeof rawUnitId === "object" ? (rawUnitId._id || rawUnitId.id || rawUnitId) : rawUnitId).toString()
        : "";

      setFormData({ 
        id: template.id, 
        name: template.name, 
        description: template.description || "",
        is_system: !!template.is_system || isSystemTemplate(template),
        qty_unit_id: unitIdStr
      });
      setIsEditing(true);
    } else {
      const savedDraft = localStorage.getItem("template_draft");
      if (savedDraft) {
        try {
          setFormData(JSON.parse(savedDraft));
        } catch (e) {
          setFormData(INITIAL_FORM);
        }
      } else {
        setFormData(INITIAL_FORM);
      }
      setIsEditing(false);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(INITIAL_FORM);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const nameLower = formData.name?.toLowerCase().trim();
    if (!formData.id && ["inverter", "solar panel", "battery", "acdb", "dcdb", "cable", "wire"].includes(nameLower)) {
      alert("Cannot register a system template name.");
      return;
    }
    
    if (formData.id) {
      const originalTemplate = templates.find(t => t.id === formData.id);
      if (originalTemplate && (originalTemplate.is_system || isSystemTemplate(originalTemplate))) {
        if (nameLower !== originalTemplate.name?.toLowerCase().trim()) {
          alert("Cannot change the name of a system template.");
          return;
        }
      }
    }

    const success = await onSaveTemplate(formData, isEditing);
    if (success) {
      if (!isEditing) {
        localStorage.removeItem("template_draft");
      }
      handleCloseModal();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-surface p-6 rounded-xl border-2 border-border shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/10 shadow-inner">
             <FaCube />
           </div>
           <div>
              <h3 className="text-lg font-black text-text-primary tracking-tight uppercase">Baseline Definitions</h3>
              <p className="text-[11px] text-text-secondary font-medium mt-0.5">Initialize core architectural templates for various product categories.</p>
           </div>
        </div>
        <Button variant="primary" size="md" onClick={() => handleOpenModal()} leftIcon={<FaPlus />} className="rounded-xl h-11 px-8">
          Register Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((template) => {
          const isSystem = template.is_system || isSystemTemplate(template);
          return (
            <div key={template.id} className="relative bg-surface p-6 rounded-3xl border-2 border-border flex flex-col hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group overflow-hidden">
              {/* Contextual Action */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <IconButton variant="primary" size="sm" onClick={() => handleOpenModal(template)} className="rounded-xl h-10 w-10 shadow-xl shadow-primary/20 hover:scale-110 active:scale-95">
                  {isSystem ? <FaLock size={12} /> : <FaEdit size={14} />}
                </IconButton>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-surface-hover rounded-2xl flex items-center justify-center text-primary border border-border shadow-inner group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-500">
                  <FaCube size={20} className="group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0 pr-10">
                  <p className="font-black text-text-primary tracking-tight text-base uppercase leading-tight">{template.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {isSystem ? (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[8px] font-black rounded-md uppercase tracking-tighter">System Template</span>
                    ) : (
                      <>
                        <div className="w-1 h-1 rounded-full bg-primary/40" />
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em]">Baseline Logic</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-xs text-text-secondary leading-relaxed font-medium opacity-80 line-clamp-4">
                  {template.description || "Comprehensive technical baseline defining core engineering boundaries for this product category."}
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-4">
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-[10px] font-black text-text-primary">
                      {template.subtype_count || 0}
                    </div>
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Active Subtypes</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Unit:</span>
                     <span className="px-1.5 py-0.5 bg-primary/5 border border-primary/10 text-[8px] font-black rounded-md text-primary uppercase tracking-wider">
                       {template.qty_unit_symbol || "nos"}
                     </span>
                 </div>
                 <div className="h-6 w-px bg-border/40" />
                 <Button
                   variant="primary"
                   size="sm"
                   onClick={() => onSelectTemplate(template.id)}
                   className="rounded-xl px-4 h-9 text-[10px] font-black uppercase tracking-wider"
                 >
                   Configure Subtypes
                 </Button>
              </div>
            </div>
          );
        })}
        
        {templates.length === 0 && (
          <div className="col-span-full py-24 text-center bg-surface-hover/20 border border-dashed border-border rounded-xl">
            <FaCube className="mx-auto text-text-disabled mb-6 opacity-10" size={48} />
            <p className="text-text-secondary font-black text-xs uppercase tracking-[0.3em]">No Baselines Identified</p>
            <p className="text-[10px] text-text-disabled mt-2 font-medium">Initialize your first product template to begin configuration.</p>
          </div>
        )}
      </div>

      <Dialog isOpen={showModal} onClose={handleCloseModal} title={isEditing ? "Modify Baseline Definition" : "Register Product Template"} size="sm">
        <div className="space-y-6 pt-4">
          <CustomInput 
            label="Identification Name" 
            placeholder="e.g. Mono-Crystalline PV" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            disabled={formData.is_system}
          />
          <CustomInput type="textarea" label="Technical Description" placeholder="Define boundaries and characteristics..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Quantity Calculation Unit</label>
            <DropdownWithSearchInput 
              options={(units || []).map(u => ({ value: u.id || u._id, text: `${u.name} (${u.symbol}) — Group: ${u.unit_group_name || u.unit_group_id?.name || 'General'}` }))}
              value={formData.qty_unit_id || ""} 
              onChange={(val) => setFormData({ ...formData, qty_unit_id: val })} 
              placeholder="Select quantity calculation unit..."
              disabled={formData.is_system}
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-8 border-t border-border mt-4">
            {localStorage.getItem("template_draft") && !isEditing && (
              <Button variant="danger" onClick={() => {
                localStorage.removeItem("template_draft");
                setFormData(INITIAL_FORM);
              }} className="rounded-xl px-8 text-xs">
                Clear Draft
              </Button>
            )}
            <Button variant="secondary" onClick={handleCloseModal} className="rounded-xl px-8 text-xs">Discard</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving} className="rounded-xl px-12 shadow-xl shadow-primary/20 text-xs font-black uppercase tracking-widest">
              Commit Logic
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}