import Dialog from "@/components/Dialog";
import { FaBarcode, FaInfoCircle, FaDatabase } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

export default function ViewSkuModal({ isOpen, onClose, sku }) {
  const renderAttributeValue = (attr) => {
    if (attr.data_type === "file" && attr.value_text) {
      return <a href={`${API_URL}/${attr.value_text}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">View Asset</a>;
    }
    if (attr.data_type === "boolean") return (attr.value_boolean === 1 || attr.value_boolean === true) ? "YES" : "NO";
    if (attr.data_type === "dropdown") return attr.option_value || "-";
    if (attr.data_type === "multiselect") {
      try {
        const values = attr.value_text ? JSON.parse(attr.value_text) : [];
        return values.length ? values.join(", ") : "-";
      } catch { return "-"; }
    }
    if (attr.data_type === "number") {
      if (attr.value_number === null || attr.value_number === undefined) return "-";
      return `${attr.value_number}${attr.unit_symbol ? ` ${attr.unit_symbol}` : ""}`;
    }
    return attr.value_text || "-";
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="SKU Dimension Review" size="md">
      {sku && (
        <div className="space-y-8 p-2">
          {/* Identity Header */}
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 shadow-inner relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <FaBarcode size={64} className="text-primary rotate-12" />
            </div>
            <label className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1 block opacity-70">Unique SKU Identity</label>
            <p className="font-mono text-2xl font-black text-text-primary tracking-[0.1em]">{sku.sku_code}</p>
          </div>

          {/* Attributes List */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center">
                  <FaDatabase size={12} />
               </div>
               <h4 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Technical Parameters</h4>
               <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="bg-surface-hover/20 rounded-2xl border border-border/40 overflow-hidden">
              <div className="p-2 space-y-1">
                {[...(sku.attributes || [])]
                  .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                  .map((attr, idx) => (
                  <div key={idx} className="px-5 py-4 bg-surface border border-border/40 rounded-xl flex items-center justify-between hover:bg-surface-hover/50 transition-colors group">
                    <div className="flex flex-col gap-0.5">
                       <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">{attr.attribute_name}</span>
                       <span className="text-[11px] font-black text-text-primary uppercase tracking-widest">{renderAttributeValue(attr)}</span>
                    </div>
                    <div className="w-1 h-4 bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
                {!sku.attributes?.length && (
                  <div className="p-8 text-center text-text-muted opacity-40 italic text-sm font-black uppercase tracking-widest">No parameters defined</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}