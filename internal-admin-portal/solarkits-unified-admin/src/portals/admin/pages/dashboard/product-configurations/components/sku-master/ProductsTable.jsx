import { useState, useMemo } from "react";
import { FaImage, FaEdit, FaEye, FaTrash, FaSync, FaChevronRight, FaBox, FaTags, FaFilePdf } from "react-icons/fa";
import IconButton from "@/components/IconButton";
import Tooltip from "@/components/Tooltip";
import ConfirmationPopup from "@/components/ConfirmationPopup";

const API_URL = import.meta.env.VITE_API_URL;

export default function ProductsTable({
  products,
  loading,
  selectedProduct,
  onProductSelect,
  onEditProduct,
  onViewProduct,
  onDeleteProduct
}) {
  const [deletePopup, setDeletePopup] = useState({ isOpen: false, product: null, isDeleting: false });

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

  const handleDeleteClick = (product, e) => {
    e.stopPropagation();
    setDeletePopup({ isOpen: true, product: product, isDeleting: false });
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4 animate-pulse">
      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
        <FaSync className="animate-spin" size={24} />
      </div>
      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Synchronizing Master Data...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Table Header / Stats */}
      <div className="px-6 py-4 bg-surface-hover/50 border-b border-border flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-inner">
               <FaBox size={14} />
            </div>
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Master Catalog</h3>
         </div>
         <span className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/10 uppercase tracking-tighter">
           {products.length} Models
         </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {products.length === 0 ? (
          <div className="py-24 text-center space-y-6">
             <div className="w-20 h-20 bg-surface-hover rounded-[2rem] flex items-center justify-center mx-auto text-text-muted border-2 border-dashed border-border">
                <FaBox size={32} />
             </div>
             <div className="space-y-2">
                <p className="text-sm font-black text-text-primary uppercase tracking-tight">No Models Found</p>
                <p className="text-[10px] font-medium text-text-muted max-w-[200px] mx-auto leading-relaxed uppercase tracking-widest">Select a different baseline or register a new model.</p>
             </div>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {products.map(product => {
              const isSelected = selectedProduct?.id === product.id;
              return (
                <div
                  key={product.id}
                  onClick={() => onProductSelect(product)}
                  className={`group relative p-5 flex items-center gap-6 cursor-pointer transition-all duration-500 ${isSelected ? 'bg-primary/5' : 'hover:bg-surface-hover/50'}`}
                >
                  {/* Selection Indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-500 ${isSelected ? 'bg-primary h-full' : 'bg-transparent h-0 group-hover:h-8 group-hover:bg-border group-hover:top-1/2 group-hover:-translate-y-1/2'}`} />
                  
                  {/* Modern Image Container */}
                  <div className={`relative w-20 h-20 rounded-2xl border transition-all duration-500 p-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-surface border-primary/30 shadow-xl shadow-primary/10 scale-105' : 'bg-surface border-border shadow-sm group-hover:shadow-md group-hover:scale-105'}`}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                    ) : (
                      <FaImage className="text-text-muted/30" size={24} />
                    )}
                    {isSelected && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />}
                  </div>

                  {/* Enhanced Info Layout */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className={`text-sm font-black tracking-tight truncate uppercase leading-tight transition-colors duration-300 ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {product.datasheet && (
                          <a
                            href={product.datasheet}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="View Technical Datasheet (PDF)"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors"
                          >
                            <FaFilePdf size={8} /> PDF
                          </a>
                        )}
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tighter transition-colors duration-500 ${product.sku_count > 0 ? 'bg-primary/10 border-primary/10 text-primary' : 'bg-surface-hover border-border text-text-muted'}`}>
                          <FaTags size={8} /> {product.sku_count || 0} Variants
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-4 py-2 px-4 bg-surface rounded-2xl border border-border shadow-md group-hover:border-primary/20 transition-all duration-500">
                        {product.brand_logo && (
                          <div className="w-12 h-12 p-2 bg-white rounded-xl border border-border/40 flex items-center justify-center shrink-0 shadow-inner">
                            <img src={product.brand_logo} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.1em]">{product.brand_name || product.brand || "Unknown Brand"}</span>
                           <span className="text-[7px] font-bold text-text-muted uppercase tracking-tighter opacity-60">Manufacturer</span>
                        </div>
                      </div>
                      
                      {/* Technical Badges */}
                      <div className="flex items-center gap-2 truncate group-hover:opacity-100 transition-opacity">
                        {product.attributes?.slice(0, 1).map(group => 
                          group.attributes.slice(0, 2).map(attr => (
                            <div key={attr.attribute_id} className="text-[9px] font-bold text-text-muted bg-surface-hover/30 px-2 py-0.5 rounded border border-border/30 truncate">
                              <span className="text-text-secondary mr-1">{attr.attribute_name}:</span>
                              <span className="text-text-primary">{renderAttributeValue(attr)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Premium Action Cluster */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <IconButton onClick={(e) => { e.stopPropagation(); onViewProduct(product); }} variant="primary" size="xs" title="View Details" className="rounded-lg h-8 w-8 shadow-sm hover:scale-105 transition-all"><FaEye /></IconButton>
                    <IconButton onClick={(e) => { e.stopPropagation(); onEditProduct(product); }} variant="success" size="xs" title="Edit Model" className="rounded-lg h-8 w-8 shadow-sm hover:scale-105 transition-all"><FaEdit /></IconButton>
                    <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteClick(product, e); }} variant="danger" size="xs" title="Delete Model" className="rounded-lg h-8 w-8 shadow-sm hover:scale-105 transition-all"><FaTrash /></IconButton>
                    <div className="ml-2 w-6 h-6 flex items-center justify-center text-text-muted opacity-30 group-hover:opacity-100 transition-all">
                      <FaChevronRight size={10} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmationPopup
        isOpen={deletePopup.isOpen}
        title="Purge Model Data"
        message={`Are you sure you want to completely remove "${deletePopup.product?.name}" and all associated SKU variants? This operation is permanent.`}
        variant="danger"
        confirmText="Confirm Purge"
        cancelText="Keep Model"
        onConfirm={async () => {
          setDeletePopup(prev => ({ ...prev, isDeleting: true }));
          await onDeleteProduct(deletePopup.product);
          setDeletePopup({ isOpen: false, product: null, isDeleting: false });
        }}
        onCancel={() => setDeletePopup({ isOpen: false, product: null, isDeleting: false })}
        isLoading={deletePopup.isDeleting}
      />
    </div>
  );
}