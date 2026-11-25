import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Shield,
  Cpu,
  Sun,
  Package,
  CheckCircle2,
  Check,
  Plus,
  Box,
} from 'lucide-react';

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return '₹0';
  const rupees = Math.round(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN');
}

export default function StoreKitCard({
  kit,
  isSelected,
  selectedQuantity,
  selectedQuoteMode,
  onSelectKit,
  quotePermissions = ['po_quote', 'loose_quote'],
}) {
  const allowsPo = quotePermissions.includes('po_quote');
  const allowsLoose = quotePermissions.includes('loose_quote');
  const allowsTrial = quotePermissions.includes('trial_quote') && Boolean(kit.allow_trial_kit);

  const availableTiers = useMemo(() => {
    const list = [];
    if (allowsLoose) list.push('loose');
    if (allowsPo) list.push('po');
    if (allowsTrial) list.push('trial');
    return list.length > 0 ? list : ['loose', 'po'];
  }, [allowsLoose, allowsPo, allowsTrial]);

  const looseQtys = useMemo(() => {
    const raw = kit.loose_order_quantities;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
    }
    const cap = Number(kit.capacity || kit.kit_capacity_kw || 1);
    return cap <= 1 ? [45, 75, 105] : [25, 50, 100];
  }, [kit.loose_order_quantities, kit.capacity, kit.kit_capacity_kw]);

  const poQtys = useMemo(() => {
    const raw = kit.order_quantities;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
    }
    const cap = Number(kit.capacity || kit.kit_capacity_kw || 1);
    return cap <= 1 ? [100, 200, 500] : [200, 500];
  }, [kit.order_quantities, kit.capacity, kit.kit_capacity_kw]);

  const trialQtys = useMemo(() => {
    const qty =
      kit.trial_kit_quantity !== undefined && kit.trial_kit_quantity !== null
        ? Math.max(1, Number(kit.trial_kit_quantity))
        : 10;
    return [qty];
  }, [kit.trial_kit_quantity]);

  const [activeTierType, setActiveTierType] = useState(() => {
    if (isSelected && selectedQuoteMode) {
      const modeKey =
        selectedQuoteMode === 'trial_quote'
          ? 'trial'
          : selectedQuoteMode === 'po_quote'
          ? 'po'
          : 'loose';
      if (availableTiers.includes(modeKey)) return modeKey;
    }
    return availableTiers[0] || 'loose';
  });

  useEffect(() => {
    if (!availableTiers.includes(activeTierType)) {
      setActiveTierType(availableTiers[0] || 'loose');
    }
  }, [availableTiers, activeTierType]);

  const currentTierQuantities =
    activeTierType === 'trial'
      ? trialQtys
      : activeTierType === 'po'
      ? poQtys
      : looseQtys;

  const [activeChipQty, setActiveChipQty] = useState(() => {
    if (isSelected && selectedQuantity) {
      return Number(selectedQuantity);
    }
    return currentTierQuantities[0] || (activeTierType === 'trial' ? 10 : activeTierType === 'loose' ? 25 : 200);
  });

  useEffect(() => {
    if (isSelected && selectedQuantity) {
      setActiveChipQty(Number(selectedQuantity));
      if (selectedQuoteMode) {
        const modeKey =
          selectedQuoteMode === 'trial_quote'
            ? 'trial'
            : selectedQuoteMode === 'po_quote'
            ? 'po'
            : 'loose';
        if (availableTiers.includes(modeKey)) setActiveTierType(modeKey);
      } else if (poQtys.includes(Number(selectedQuantity)) && availableTiers.includes('po')) {
        setActiveTierType('po');
      } else if (looseQtys.includes(Number(selectedQuantity)) && availableTiers.includes('loose')) {
        setActiveTierType('loose');
      }
    }
  }, [isSelected, selectedQuantity, selectedQuoteMode, poQtys, looseQtys, availableTiers]);

  const currentMode =
    activeTierType === 'trial' ? 'trial_quote' : activeTierType === 'po' ? 'po_quote' : 'loose_quote';

  const handleTabChange = (tier) => {
    setActiveTierType(tier);
    const newQtys = tier === 'trial' ? trialQtys : tier === 'po' ? poQtys : looseQtys;
    const newMode = tier === 'trial' ? 'trial_quote' : tier === 'po' ? 'po_quote' : 'loose_quote';
    const fallback = newQtys[0] || (tier === 'trial' ? 10 : tier === 'po' ? 200 : 25);
    setActiveChipQty(fallback);
    if (isSelected) {
      onSelectKit(kit, fallback, newMode);
    }
  };

  const unitPricePaise =
    kit.price_paise || kit.mrp_paise || (kit.selling_price_cached ? kit.selling_price_cached * 100 : 0);
  const totalBatchPaise = unitPricePaise * activeChipQty;
  const gstRate = Number(kit.gst_rate ?? kit.tax_pct ?? kit.gst_pct ?? 5);
  const gstIncludedPaise = Math.round(totalBatchPaise - totalBatchPaise / (1 + gstRate / 100));

  const capacityKW = Number(kit.capacity || kit.kit_capacity_kw || 1);
  const panelCount = Math.max(2, Math.round(capacityKW * 2));
  const warrantyYears = kit.warranty_years || 12;

  const kitImage =
    kit.kit_image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80';

  return (
    <div
      onClick={() => onSelectKit(kit, activeChipQty, currentMode)}
      className={`rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between overflow-hidden bg-white shadow-sm hover:shadow-md cursor-pointer ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Top Header: Category / Industry Badge & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[180px]">
            {kit.project_type_name || kit.industry_type_name || 'Individual Home - On-Grid'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {activeTierType === 'trial' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <Box className="w-2.5 h-2.5" /> Trial Kit
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-2.5 h-2.5" /> Authorized
            </span>
          </div>
        </div>

        {/* Kit Image Container */}
        <div className="relative mb-3.5 flex justify-center items-center bg-gradient-to-tr from-slate-50 to-slate-100 rounded-xl overflow-hidden border border-slate-100 w-full h-44 group">
          <img
            src={kitImage}
            alt={kit.name}
            className="w-full h-full p-2.5 object-contain transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80';
            }}
          />
          {isSelected && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Check className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="font-bold text-sm text-slate-900 line-clamp-1 leading-snug mb-1">
          {kit.name || kit.kit_name}
        </h4>
        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-3">
          {kit.description ||
            `${capacityKW} kW complete solar kit featuring DCR-certified solar panels, inverter and essential BOS components for residential rooftop solar installation.`}
        </p>

        {/* Specs Badges Row (kW & Warranty) */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-lg">
            <Zap className="w-3 h-3 text-amber-600" />
            <span>{capacityKW} kW System</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-lg">
            <Shield className="w-3 h-3 text-blue-600" />
            <span>{warrantyYears} Years</span>
          </div>
        </div>

        {/* Visual Component Breakdown Row */}
        <div className="flex items-center justify-start gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200/80 mb-3.5 overflow-x-auto select-none">
          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-2xs border border-slate-200/50">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[68px]">
              1 Inverter
            </span>
          </div>

          <span className="text-xs font-black text-slate-400 shrink-0">+</span>

          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-amber-600 shadow-2xs border border-slate-200/50">
              <Sun className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[68px]">
              {panelCount} Panels
            </span>
          </div>

          <span className="text-xs font-black text-slate-400 shrink-0">+</span>

          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-2xs border border-slate-200/50">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-slate-700 mt-1 truncate max-w-[68px]">
              Wiring & BOS
            </span>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="mb-3.5 pt-3 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
            Special Price
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 leading-none">
              {formatINR(unitPricePaise)}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">/ kit</span>
          </div>

          {activeChipQty > 0 && (
            <div className="text-xs font-black text-amber-600 mt-1 flex items-center gap-1">
              <span>Batch Total:</span>
              <span>{formatINR(totalBatchPaise)}</span>
              <span className="text-[10px] font-normal text-slate-400">({activeChipQty} kits)</span>
            </div>
          )}

          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
            (Includes {formatINR(gstIncludedPaise)} GST @ {gstRate}%)
          </span>
        </div>

        {/* Quote Mode Switcher Tabs */}
        <div className="space-y-2 mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
          {availableTiers.length > 1 ? (
            <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[10px] font-bold">
              {allowsLoose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabChange('loose');
                  }}
                  className={`flex-1 py-1 px-1.5 rounded-md transition-all text-center cursor-pointer ${
                    activeTierType === 'loose'
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Loose ({looseQtys[0] || 25}-{looseQtys[looseQtys.length - 1] || 100})
                </button>
              )}
              {allowsPo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabChange('po');
                  }}
                  className={`flex-1 py-1 px-1.5 rounded-md transition-all text-center cursor-pointer ${
                    activeTierType === 'po'
                      ? 'bg-white text-amber-600 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Bulk PO ({poQtys[0] || 100}+)
                </button>
              )}
              {allowsTrial && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabChange('trial');
                  }}
                  className={`flex-1 py-1 px-1.5 rounded-md transition-all text-center cursor-pointer ${
                    activeTierType === 'trial'
                      ? 'bg-white text-blue-600 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Trial ({trialQtys[0]} Kits)
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-50/60 border border-amber-200/60 text-[10px] font-bold text-amber-800">
              <span>
                Plan Quote Mode:{' '}
                <strong className="font-black">
                  {activeTierType === 'po'
                    ? `Bulk PO (${poQtys[0]}+ Kits)`
                    : activeTierType === 'trial'
                    ? `Trial Kit (${trialQtys[0]} Kits)`
                    : `Loose (${looseQtys[0]}-${looseQtys[looseQtys.length - 1]} Kits)`}
                </strong>
              </span>
              <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black uppercase">
                Plan Enforced
              </span>
            </div>
          )}

          {/* Preset Quantity Chips */}
          <div className="flex flex-wrap gap-1.5">
            {activeTierType === 'trial' ? (
              <div className="px-3 py-1 rounded-full text-[11px] font-black border bg-purple-50 border-purple-300 text-purple-700 shadow-xs">
                {trialQtys[0]} Kits (Trial Locked)
              </div>
            ) : (
              currentTierQuantities.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveChipQty(qty);
                    if (isSelected) {
                      onSelectKit(kit, qty, currentMode);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all duration-150 cursor-pointer ${
                    activeChipQty === qty
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs scale-102'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600'
                  }`}
                >
                  {qty} Kits
                </button>
              ))
            )}
          </div>

          {/* Action Button */}
          <div className="pt-1.5">
            {isSelected ? (
              activeChipQty === selectedQuantity ? (
                <div className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm">
                  <Check className="w-3.5 h-3.5" /> Selected ({selectedQuantity} Kits -{' '}
                  {currentMode === 'trial_quote'
                    ? 'Trial Quote'
                    : currentMode === 'po_quote'
                    ? 'Bulk PO'
                    : 'Loose Quote'}
                  )
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectKit(kit, activeChipQty, currentMode);
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  Update to {activeChipQty} Kits
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectKit(kit, activeChipQty, currentMode);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Select {activeChipQty} Kits
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
