import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiZap,
  FiShield,
  FiTruck,
  FiTrendingUp,
  FiDownload,
  FiFileText,
  FiSun,
  FiGrid,
  FiLayers,
  FiPackage,
  FiDollarSign,
  FiArrowRight,
  FiMessageSquare,
  FiAlertCircle,
  FiInfo,
} from "react-icons/fi";

export default function KitDetailModal({
  kit,
  isOpen,
  onClose,
  onOpenLeadModal,
  onSelectAlternative,
  allKits = [],
}) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "bom" | "generation" | "documents"

  if (!isOpen || !kit) return null;

  const marginAmount = Math.max(0, kit.mrp - kit.wholesalePrice);
  const marginPercent = Math.round((marginAmount / kit.mrp) * 100);

  // Find related or alternative kits
  const alternativeKits = allKits
    .filter((k) => k.id !== kit.id && (k.applicationType === kit.applicationType || Math.abs(k.capacityKw - kit.capacityKw) <= 2))
    .slice(0, 3);

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello SolarKits,\nI would like full technical datasheet and dealer bulk quote for:\n*${kit.name}*\nCapacity: ${kit.capacityDisplay}\nPanel: ${kit.panelWattage}W (${kit.dcrStatus})\nSKU: ${kit.id}`
    );
    window.open(`https://wa.me/917777939842?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto shadow-2xl text-slate-900 relative my-4"
      >
        {/* Sticky Modal Top Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#253880] text-white text-[10px] font-black uppercase tracking-wider">
              SOLARKIT
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              {kit.id}
            </span>
            {kit.isDcr ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                DCR Certified
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                Non-DCR High Yield
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-8 space-y-6">
          
          {/* Main Kit Header Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Image & Core Specs */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 h-56 sm:h-64 shadow-xs">
                <img
                  src={kit.imageUrl}
                  alt={kit.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {kit.badge && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#F49222] text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                    {kit.badge}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300 block">
                    {kit.applicationType}
                  </span>
                  <p className="text-lg font-black leading-tight">
                    {kit.capacityDisplay} Complete Solution
                  </p>
                </div>
              </div>

              {/* Quick Spec Icons Bar */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Panels</span>
                  <span className="font-extrabold text-slate-800 text-[11px]">
                    {kit.panelWattage}W × {kit.panelCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Phase</span>
                  <span className="font-extrabold text-[#253880] text-[11px]">
                    {kit.phase === "single-phase" ? "1-Phase" : "3-Phase"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">MOQ</span>
                  <span className="font-extrabold text-emerald-700 text-[11px]">
                    {kit.moq} {kit.moqUnit}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Commercial & Value Proposition */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <span className="text-xs font-bold text-[#253880] uppercase tracking-wider">
                  {kit.applicationType} • {kit.panelBrand}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {kit.name}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Turn-key factory pre-packaged rooftop solution combining Tier-1 panels, smart cloud inverter, and pre-wired IP65 BOS hardware.
                </p>
              </div>

              {/* Pricing & Margin Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 to-slate-50 border border-sky-200/70 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Franchisee / Dealer Wholesale Rate
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-[#253880]">
                        ₹{kit.wholesalePrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        + 12% GST
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Customer MRP
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-400 line-through">
                      ₹{kit.mrp.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold flex items-center gap-1.5">
                    <FiTrendingUp className="text-emerald-600" />
                    Est. Realized Commission:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">
                    +₹{marginAmount.toLocaleString("en-IN")} ({marginPercent}%)
                  </span>
                </div>
              </div>

              {/* Badges / Scheme compatibility */}
              {kit.schemeEligibility && kit.schemeEligibility.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5">
                  <FiCheckCircle className="text-[#D97E15] shrink-0 mt-0.5" size={15} />
                  <div className="text-xs">
                    <span className="font-extrabold text-slate-900 block">
                      Government Scheme & Subsidy Verified
                    </span>
                    <span className="text-slate-600">
                      Eligible for: {kit.schemeEligibility.join(" • ")}
                    </span>
                  </div>
                </div>
              )}

              {/* Delivery & Stock tag */}
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <FiTruck className="text-emerald-600 shrink-0" size={15} />
                <span>{kit.stockStatus} • {kit.estimatedDelivery}</span>
              </div>

              {/* Top CTA buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => {
                    onClose();
                    onOpenLeadModal({
                      kitName: kit.name,
                      capacityDisplay: kit.capacityDisplay,
                      requiredConfig: kit.name,
                    }, "bulk_price");
                  }}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <FiDollarSign size={14} />
                  <span>Get Bulk Dealer Price</span>
                </button>

                <button
                  onClick={handleWhatsApp}
                  className="py-3 px-4 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FiMessageSquare className="text-emerald-600" size={14} />
                  <span>WhatsApp Inquiry</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar pt-2">
            {[
              { key: "overview", label: "Kit Specifications", icon: FiGrid },
              { key: "bom", label: "Included vs Excluded (BOM)", icon: FiPackage },
              { key: "generation", label: "Energy & Area Analysis", icon: FiSun },
              { key: "documents", label: "Datasheets & SLD", icon: FiFileText },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.key
                    ? "border-[#253880] text-[#253880] bg-sky-50/50 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <tab.icon size={13} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab 1: Specifications */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(kit.specifications || {}).map(([k, v]) => (
                      <tr key={k} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-600 w-1/3 bg-slate-50/70">{k}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warranty Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FiShield className="text-[#253880]" />
                  Multi-Tier Manufacturer Warranty Schedule
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Solar Panels</span>
                    <span className="font-bold text-slate-800">{kit.warranty.panels}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Inverter</span>
                    <span className="font-bold text-[#253880]">{kit.warranty.inverter}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">BOS Kit</span>
                    <span className="font-bold text-emerald-700">{kit.warranty.bos}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Included vs Excluded */}
          {activeTab === "bom" && (
            <div className="space-y-6">
              {/* Included Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <FiCheckCircle size={15} />
                  What is Included in this Solarkit
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {kit.inclusions.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-slate-800">
                      <FiCheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={14} />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complete BOS contents breakdown */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FiLayers className="text-[#253880]" />
                  Pre-Packaged BOS Electrical Components
                </h4>
                <ul className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {kit.bosContents.map((bosItem, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#253880] mt-1.5 shrink-0" />
                      <span>{bosItem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Excluded Checklist */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <FiAlertCircle size={15} />
                  What is Excluded / Optional Add-ons
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {kit.exclusions.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-slate-700">
                      <FiXCircle className="text-amber-600 shrink-0 mt-0.5" size={14} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Energy Generation & Installation Area */}
          {activeTab === "generation" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Estimated Daily Yield</span>
                  <p className="text-xl sm:text-2xl font-black text-[#D97E15]">{kit.generationStats.dailyUnits}</p>
                  <p className="text-[10px] text-slate-500">Based on 4.2 - 4.8 peak sun hours</p>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-center space-y-1">
                  <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Monthly Energy Yield</span>
                  <p className="text-xl sm:text-2xl font-black text-[#253880]">{kit.generationStats.monthlyUnits}</p>
                  <p className="text-[10px] text-slate-500">Approx. bill offset for tier-1 tariff</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Annual Generation</span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-700">{kit.generationStats.annualUnits}</p>
                  <p className="text-[10px] text-slate-500">Long-term guaranteed yield</p>
                </div>
              </div>

              {/* Area Requirement */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 text-[#253880] flex items-center justify-center shrink-0">
                  <FiGrid size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Required Rooftop Installation Area
                  </h4>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {kit.installationAreaSqft}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Standard south-facing shadow-free rooftop space with 80-micron elevated HDGI structure.
                  </p>
                </div>
              </div>

              {/* Mandatory Generation Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
                <FiInfo className="text-slate-400 shrink-0 mt-0.5" size={14} />
                <span>
                  <strong>Location Disclaimer:</strong> {kit.generationStats.disclaimer}
                </span>
              </div>
            </div>
          )}

          {/* Tab 4: Datasheets & SLD Downloads */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#253880] transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                      <FiFileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">Technical Datasheet (PDF)</h4>
                      <p className="text-[10px] text-slate-500">Full electrical IV-curve & specs (2.4 MB)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => alert(`Downloading technical datasheet for ${kit.name}`)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-[#253880] hover:text-white transition-colors cursor-pointer"
                  >
                    <FiDownload size={16} />
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#253880] transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#253880] flex items-center justify-center">
                      <FiFileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">DISCOM Single Line Diagram (SLD)</h4>
                      <p className="text-[10px] text-slate-500">AutoCAD & PDF electrical blueprint (1.8 MB)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => alert(`Downloading SLD diagram for ${kit.name}`)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-[#253880] hover:text-white transition-colors cursor-pointer"
                  >
                    <FiDownload size={16} />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  DISCOM & Sub-Station Net-Metering Assistance
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every Solarkit is supplied with pre-filled technical data dossiers, BIS test certificates, and equipment warranty serial numbers ready for submission on State DISCOM portals (MSEDCL, TANGEDCO, UPPCL, BESCOM, DGVCL, etc.).
                </p>
              </div>
            </div>
          )}

          {/* Alternative / Related Configurations */}
          {alternativeKits.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Related & Alternative Configurations
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {alternativeKits.map((alt) => (
                  <div
                    key={alt.id}
                    onClick={() => onSelectAlternative && onSelectAlternative(alt)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-[#253880] transition-all cursor-pointer space-y-1"
                  >
                    <span className="text-[9px] font-bold text-[#253880] uppercase">
                      {alt.capacityDisplay} • {alt.panelWattage}W
                    </span>
                    <h5 className="text-xs font-black text-slate-900 truncate">
                      {alt.shortTitle}
                    </h5>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-extrabold text-[#253880]">
                        ₹{alt.wholesalePrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        View Kit →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <div className="hidden sm:block">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Wholesale Price</span>
            <span className="text-lg font-black text-[#253880]">
              ₹{kit.wholesalePrice.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenLeadModal({
                  kitName: kit.name,
                  capacityDisplay: kit.capacityDisplay,
                  requiredConfig: kit.name,
                }, "bulk_price");
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <FiDollarSign size={13} />
              <span>Get Bulk Price & GST Quote</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
