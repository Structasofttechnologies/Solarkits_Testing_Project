import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiX,
  FiCheck,
  FiTrash2,
  FiShoppingCart,
  FiZap,
  FiShield,
  FiLayers,
  FiCheckCircle
} from "react-icons/fi";
import { FaSolarPanel, FaBolt, FaAward } from "react-icons/fa";
import { addToCart, setShowAuthDialog } from "@/features/slice";
import Button from "../Button";
import IconButton from "../IconButton";

export default function KitComparisonDrawer({
  comparedKits = [],
  isOpen,
  onClose,
  onRemoveKit,
  onClearAll
}) {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth_slice);

  if (!isOpen) return null;

  const handleAddToCart = (kit) => {
    if (!isAuthenticated) {
      dispatch(setShowAuthDialog(true));
      return;
    }
    dispatch(addToCart({ id: kit.id, variantIndex: 0 }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
              <FiLayers size={16} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-text-primary">
                Solar Kit Comparison ({comparedKits.length} of 4)
              </h3>
              <p className="text-xs text-text-secondary">
                Side-by-side technical and price comparison of selected solar kits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {comparedKits.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-text-muted hover:text-danger text-xs"
              >
                Clear All
              </Button>
            )}
            <IconButton
              variant="ghost"
              size="md"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
              aria-label="Close Comparison"
            >
              <FiX size={20} />
            </IconButton>
          </div>
        </div>

        {/* Comparison Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hover">
          {comparedKits.length === 0 ? (
            <div className="p-12 text-center">
              <FiLayers className="text-text-muted mx-auto mb-3 opacity-30" size={48} />
              <h4 className="text-base font-bold text-text-primary">No solar kits selected for comparison</h4>
              <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
                Check the "Compare" box on any solar kit in the shop or homepage to compare their specifications side-by-side.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  {/* Products Header Row */}
                  <tr className="border-b border-border">
                    <td className="p-3.5 font-extrabold text-text-secondary uppercase text-[10px] w-48 shrink-0 bg-slate-50 dark:bg-slate-900/30">
                      Product Overview
                    </td>
                    {comparedKits.map((kit) => (
                      <td key={kit.id} className="p-3.5 min-w-[220px] max-w-[260px] align-top">
                        <div className="space-y-2 relative">
                          <button
                            onClick={() => onRemoveKit(kit.id)}
                            className="absolute -top-1 right-0 text-text-muted hover:text-danger p-1"
                            title="Remove from comparison"
                          >
                            <FiTrash2 size={13} />
                          </button>
                          <div className="h-28 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-border flex items-center justify-center overflow-hidden">
                            <img
                              src={kit.kitImage || "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=300&auto=format&fit=crop&q=80"}
                              alt={kit.kitName}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-extrabold uppercase text-primary">
                            {kit.capacityKW} kW Kit
                          </span>
                          <h4 className="font-bold text-text-primary line-clamp-2 leading-snug">
                            {kit.kitName}
                          </h4>
                          <p className="text-base font-black text-text-primary">
                            ₹{kit.variants?.[0]?.ourPrice?.toLocaleString("en-IN") || "N/A"}
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            onClick={() => handleAddToCart(kit)}
                            leftIcon={<FiShoppingCart size={13} />}
                            className="font-bold rounded-lg shadow-xs"
                          >
                            Add to Cart
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* System Capacity */}
                  <tr className="border-b border-border">
                    <td className="p-3.5 font-bold text-text-secondary bg-slate-50 dark:bg-slate-900/30">
                      System Capacity
                    </td>
                    {comparedKits.map((kit) => (
                      <td key={kit.id} className="p-3.5 font-extrabold text-primary text-sm">
                        {kit.capacityKW} kW DC
                      </td>
                    ))}
                  </tr>

                  {/* System Type */}
                  <tr className="border-b border-border">
                    <td className="p-3.5 font-bold text-text-secondary bg-slate-50 dark:bg-slate-900/30">
                      System Type
                    </td>
                    {comparedKits.map((kit) => (
                      <td key={kit.id} className="p-3.5 font-bold text-text-primary">
                        {kit.projectType || kit.inverter?.type || "On-Grid Net Metering"}
                      </td>
                    ))}
                  </tr>

                  {/* Solar Panels Inclusion */}
                  <tr className="border-b border-border">
                    <td className="p-3.5 font-bold text-text-secondary bg-slate-50 dark:bg-slate-900/30">
                      Solar PV Panels
                    </td>
                    {comparedKits.map((kit) => (
                      <td key={kit.id} className="p-3.5 text-text-secondary">
                        <p className="font-bold text-text-primary">{kit.panel?.wattPerPanel || 550}W Tier-1 Modules</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{kit.panel?.technologyType || "Mono PERC Half-Cut"}</p>
                      </td>
                    ))}
                  </tr>

                  {/* Inverter Specs */}
                  <tr className="border-b border-border">
                    <td className="p-3.5 font-bold text-text-secondary bg-slate-50 dark:bg-slate-900/30">
                      Inverter Specification
                    </td>
                    {comparedKits.map((kit) => (
                      <td key={kit.id} className="p-3.5 text-text-secondary">
                        <p className="font-bold text-text-primary">{kit.inverter?.capacityKW || kit.capacityKW} kW ({kit.inverter?.phase || "Single"} Phase)</p>
                        <p className="text-[11px] text-text-muted mt-0.5">Efficiency: {kit.inverter?.efficiencyPercent || "98.4"}%</p>
                      </td>
                    ))}
                  </tr>

                  {/* Annual Generation */}
                  <tr className="border-b border-border">
                    <td className="p-3.5 font-bold text-text-secondary bg-slate-50 dark:bg-slate-900/30">
                      Estimated Generation
                    </td>
                    {comparedKits.map((kit) => (
                      <td key={kit.id} className="p-3.5 font-bold text-emerald-600">
                        ~{kit.generationEstimateKWhPerYear ? kit.generationEstimateKWhPerYear.toLocaleString("en-IN") : (kit.capacityKW * 1450).toLocaleString("en-IN")} kWh / Year
                      </td>
                    ))}
                  </tr>

                  {/* Structure & Accessories */}
                  <tr className="border-b border-border">
                    <td className="p-3.5 font-bold text-text-secondary bg-slate-50 dark:bg-slate-900/30">
                      Included Accessories
                    </td>
                    {comparedKits.map((kit) => (
                      <td key={kit.id} className="p-3.5 text-text-secondary">
                        <ul className="space-y-1 text-[11px]">
                          <li className="flex items-center gap-1"><FiCheck className="text-emerald-500" /> Structure Rails & Clamps</li>
                          <li className="flex items-center gap-1"><FiCheck className="text-emerald-500" /> ACDB & DCDB Surge Box</li>
                          <li className="flex items-center gap-1"><FiCheck className="text-emerald-500" /> Solar DC Cables & MC4</li>
                        </ul>
                      </td>
                    ))}
                  </tr>

                  {/* Warranties */}
                  <tr className="border-b border-border">
                    <td className="p-3.5 font-bold text-text-secondary bg-slate-50 dark:bg-slate-900/30">
                      Warranty
                    </td>
                    {comparedKits.map((kit) => (
                      <td key={kit.id} className="p-3.5 font-bold text-emerald-600">
                        {kit.warrantyYears || 25} Years Performance Warranty
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
