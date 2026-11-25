import { useState } from "react";
import Button from "@/components/Button";
import Tooltip from "@/components/Tooltip";
import IconButton from "@/components/IconButton";
import Dialog from "@/components/Dialog";
import CustomInput from "@/components/CustomInput";
import { FaPlus, FaEdit, FaLayerGroup, FaLock } from "react-icons/fa";

const INITIAL_FORM = { id: null, name: "" };

export default function SubtypesSection({ subtypes, onSaveSubtype, onSelectSubtype, isSaving }) {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handleOpenModal = (subtype = null) => {
    if (subtype) {
      setFormData({ id: subtype.id, name: subtype.name });
      setIsEditing(true);
    } else {
      setFormData(INITIAL_FORM);
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
    const success = await onSaveSubtype(formData, isEditing);
    if (success) handleCloseModal();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-surface p-6 rounded-xl border-2 border-border shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/10 shadow-inner">
             <FaLayerGroup />
           </div>
           <div>
              <h3 className="text-lg font-black text-text-primary tracking-tight uppercase">Operational Subtypes</h3>
              <p className="text-[11px] text-text-secondary font-medium mt-0.5">Categorize technical implementations within the selected product architecture.</p>
           </div>
        </div>
        <Button variant="primary" size="md" onClick={() => handleOpenModal()} leftIcon={<FaPlus />} className="rounded-xl h-11 px-8">
          Define Subtype
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {subtypes.map((subtype) => (
          <div key={subtype.id} className="relative bg-surface p-6 rounded-3xl border-2 border-border flex flex-col hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group overflow-hidden">

            {/* System Lock Badge */}
            {subtype.is_system ? (
              <div className="absolute top-4 right-4">
                <Tooltip content="System subtype — locked by the platform">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                    <FaLock size={12} />
                  </div>
                </Tooltip>
              </div>
            ) : (
              /* Edit Button — only for user-created subtypes */
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <IconButton variant="primary" size="sm" onClick={() => handleOpenModal(subtype)} className="rounded-xl h-10 w-10 shadow-xl shadow-primary/20 hover:scale-110 active:scale-95">
                  <FaEdit size={14} />
                </IconButton>
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-surface-hover rounded-2xl flex items-center justify-center text-primary border border-border shadow-inner group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-500">
                <FaLayerGroup size={18} className="group-hover:rotate-12 transition-transform" />
              </div>
              <div className="flex-1 min-w-0 pr-10">
                <p className="font-black text-text-primary tracking-tight text-sm uppercase leading-tight truncate">{subtype.name}</p>
                {subtype.is_system ? (
                  <p className="text-[9px] font-bold text-amber-500/70 uppercase tracking-[0.2em] mt-1">System Defined</p>
                ) : (
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1">Operational Model</p>
                )}
              </div>
            </div>

            <div className="mt-auto pt-5 border-t border-border/40 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-[10px] font-black text-text-primary">
                    {subtype.product_count || 0}
                  </div>
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Active Models</span>
               </div>
               <Button
                 variant="primary"
                 size="sm"
                 onClick={() => onSelectSubtype(subtype.id)}
                 className="rounded-xl px-4 h-9 text-[10px] font-black uppercase tracking-wider"
               >
                 Configure Specs
               </Button>
            </div>
          </div>
        ))}

        {subtypes.length === 0 && (
          <div className="col-span-full py-24 text-center bg-surface-hover/20 border border-dashed border-border rounded-xl">
             <FaLayerGroup className="mx-auto text-text-disabled mb-6 opacity-10" size={48} />
             <p className="text-text-secondary font-black text-xs uppercase tracking-[0.3em]">No Subtypes Defined</p>
             <p className="text-[10px] text-text-disabled mt-2 font-medium">Categorize your baseline template into specific operational models.</p>
          </div>
        )}
      </div>

      <Dialog isOpen={showModal} onClose={handleCloseModal} title={isEditing ? "Modify Subtype Identity" : "Define Operational Subtype"} size="sm">
        <div className="space-y-6 pt-4">
          <CustomInput label="Subtype Label" placeholder="e.g. Bifacial - Double Glass" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <div className="flex justify-end gap-3 pt-8 border-t border-border mt-4">
            <Button variant="secondary" onClick={handleCloseModal} className="rounded-xl px-8 text-xs">Discard</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving} className="rounded-xl px-12 text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20">
              Commit Subtype
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}