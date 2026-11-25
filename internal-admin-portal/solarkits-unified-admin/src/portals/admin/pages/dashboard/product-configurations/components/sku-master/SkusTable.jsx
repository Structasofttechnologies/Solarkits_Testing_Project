import { useState } from "react";
import { FaCode, FaSearch, FaPlus, FaEdit, FaEye, FaTrash, FaSync, FaTags, FaChevronRight, FaChevronDown } from "react-icons/fa";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import Tooltip from "@/components/Tooltip";
import ConfirmationPopup from "@/components/ConfirmationPopup";

const API_URL = import.meta.env.VITE_API_URL;

export default function SkusTable({
  skus,
  loading,
  selectedProduct,
  searchTerm,
  onSearchChange,
  onAddSku,
  onEditSku,
  onViewSku,
  onDeleteSku
}) {
  const [deletePopup, setDeletePopup] = useState({ isOpen: false, sku: null, isDeleting: false });
  const [expandedSkuIds, setExpandedSkuIds] = useState({});

  const toggleSkuCollapse = (skuId) => {
    setExpandedSkuIds(prev => ({
      ...prev,
      [skuId]: !prev[skuId]
    }));
  };

  const renderAttributeValue = (attr) => {
    if (!attr) return "-";
    if (attr.data_type === "boolean") return (!!attr.value_boolean) ? "Yes" : "No";
    if (attr.data_type === "dropdown") return attr.option_value || "-";
    if (attr.data_type === "number") {
      if (attr.value_number === null || attr.value_number === undefined) return "-";
      return `${attr.value_number}${attr.unit_symbol ? ` ${attr.unit_symbol}` : ""}`;
    }
    return attr.value_text || "-";
  };

  const handleDeleteClick = (sku, e) => {
    e.stopPropagation();
    setDeletePopup({ isOpen: true, sku: sku, isDeleting: false });
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-3xl shadow-xl shadow-primary/5 overflow-hidden">
      {/* Search and Header Section */}
      <div className="p-6 border-b border-border bg-surface-hover/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
              <FaTags size={14} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-widest truncate">Variant Dimensions</h3>
              <p className="text-[10px] text-text-muted font-bold truncate uppercase tracking-tighter opacity-70">
                {selectedProduct ? `Derived from ${selectedProduct.name}` : 'Awaiting baseline selection'}
              </p>
            </div>
          </div>
          {selectedProduct && (
            <Button variant="primary" size="sm" onClick={onAddSku} leftIcon={<FaPlus />} className="rounded-xl px-4 h-9 shadow-lg shadow-indigo-200 font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95">
              Add Variant
            </Button>
          )}
        </div>

        {selectedProduct && (
          <div className="relative group">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search SKU code..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-surface border border-border rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm placeholder:text-text-muted/40 placeholder:font-medium text-text-primary"
            />
          </div>
        )}
      </div>

      <div className="flex-1 max-h-[600px] overflow-y-auto custom-scrollbar">
        {!selectedProduct ? (
          <div className="py-24 text-center space-y-6">
            <div className="w-20 h-20 bg-surface-hover rounded-[2rem] flex items-center justify-center mx-auto text-text-muted/30 border-2 border-dashed border-border">
              <FaTags size={32} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black text-text-primary uppercase tracking-tight">No Active Product</p>
              <p className="text-[10px] font-medium text-text-muted max-w-[200px] mx-auto leading-relaxed uppercase tracking-widest">Select a model from the catalog to manage its SKU variants.</p>
            </div>
          </div>
        ) : loading ? (
          <div className="py-24 text-center space-y-4 animate-pulse">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto border border-primary/20 shadow-inner">
              <FaSync className="animate-spin" size={24} />
            </div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Fetching Variants...</p>
          </div>
        ) : skus.length === 0 ? (
          <div className="py-24 text-center space-y-6">
            <div className="w-20 h-20 bg-surface-hover rounded-[2rem] flex items-center justify-center mx-auto text-text-muted/30 border-2 border-dashed border-border">
              <FaCode size={32} />
            </div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">No Variants Identified</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 gap-4">
            {skus.map(sku => {
              const isSkuExpanded = !!expandedSkuIds[sku.id];
              return (
                <div
                  key={sku.id}
                  className="group bg-surface p-5 rounded-2xl border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer"
                  onClick={() => toggleSkuCollapse(sku.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">SKU Identity</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-[13px] font-black text-text-primary tracking-tight group-hover:text-primary transition-colors">{sku.sku_code}</p>

                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <IconButton onClick={() => onViewSku(sku)} variant="primary" size="xs" className="rounded-lg h-8 w-8 shadow-sm hover:scale-105 transition-all"><FaEye /></IconButton>
                        <IconButton onClick={() => onEditSku(sku)} variant="success" size="xs" className="rounded-lg h-8 w-8 shadow-sm hover:scale-105 transition-all"><FaEdit /></IconButton>
                        <IconButton onClick={(e) => handleDeleteClick(sku, e)} variant="danger" size="xs" className="rounded-lg h-8 w-8 shadow-sm hover:scale-105 transition-all"><FaTrash /></IconButton>
                      </div>
                      <div className="p-4">
                        {isSkuExpanded ? <FaChevronDown size={10} className="text-primary rotate-180 transition-transform duration-300" /> : <FaChevronRight size={10} className="text-text-muted/60" />}
                      </div>
                    </div>
                  </div>

                  {isSkuExpanded && (
                    <div
                      className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/40 max-h-[200px] overflow-y-auto custom-scrollbar"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[...(sku.attributes || [])]
                        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                        .map(attr => (
                        <div key={attr.attribute_id} className="bg-surface-hover/50 rounded-xl p-2.5 border border-border flex flex-col gap-0.5 group-hover:bg-surface group-hover:border-border/60 transition-all duration-500">
                          <span className="text-[7px] font-black text-text-muted uppercase tracking-widest">{attr.attribute_name}</span>
                          <span className="text-[10px] font-black text-text-primary break-words whitespace-normal">{renderAttributeValue(attr)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmationPopup
        isOpen={deletePopup.isOpen}
        title="Purge SKU Variant"
        message={`Are you sure you want to remove variant "${deletePopup.sku?.sku_code}"? This operation cannot be undone.`}
        variant="danger"
        confirmText="Confirm Purge"
        onConfirm={async () => {
          setDeletePopup(prev => ({ ...prev, isDeleting: true }));
          await onDeleteSku(deletePopup.sku);
          setDeletePopup({ isOpen: false, sku: null, isDeleting: false });
        }}
        onCancel={() => setDeletePopup({ isOpen: false, sku: null, isDeleting: false })}
        isLoading={deletePopup.isDeleting}
      />
    </div>
  );
}