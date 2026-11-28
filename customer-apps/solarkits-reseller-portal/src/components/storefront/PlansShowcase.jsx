import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../services/api";
import {
  FiZap,
  FiCheckCircle,
  FiLoader,
  FiMapPin,
  FiArrowRight,
  FiStar,
} from "react-icons/fi";

const formatOrderTypes = (ot) => {
  let types = [];
  if (Array.isArray(ot)) types = ot;
  else if (typeof ot === "string") types = ot === "both" ? ["po_order", "loose_order"] : ot.split(",").map((s) => s.trim());
  else types = ["po_order"];

  const map = {
    loose_order: "Loose Order",
    combine_po_order: "Combine PO",
    po_order: "PO Order",
  };
  const labels = types.map((t) => map[t]).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "PO Order";
};

export default function PlansShowcase() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/india/v1/reseller/plans/list")
      .then((res) => {
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          setPlans(res.data.data.filter((p) => p.is_active !== false));
        } else {
          setPlans([]);
        }
      })
      .catch((err) => {
        console.error("Could not fetch live plans from admin API:", err);
        setPlans([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = (plan) => {
    navigate(`/register?plan_id=${plan.id || plan._id}&plan_name=${encodeURIComponent(plan.plan_name || plan.name)}`);
  };

  return (
    <section id="plans" className="py-14 sm:py-24 bg-white text-slate-900 relative overflow-hidden border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-sky-50 border border-sky-100 shadow-xs">
            <FiZap className="text-[#253880]" size={14} />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#253880]">
              Admin Verified Franchisee Tiers
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Transparent, High-Margin{" "}
            <span className="text-[#F49222]">
              Franchise Partner Plans
            </span>
          </h2>

          <p className="text-slate-600 text-xs sm:text-base font-normal leading-relaxed">
            Choose the right franchise tier for your geography. Get dedicated district territory rights, wholesale catalogue pricing, and direct EPC client leads.
          </p>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 sm:py-8 text-[#253880] font-bold text-xs sm:text-sm">
            <FiLoader className="animate-spin" size={16} />
            <span>Syncing latest franchise tiers from Central System...</span>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6 sm:gap-8 pt-8 sm:pt-12 items-stretch">
          {plans.map((p, idx) => {
            const isPopular = p.is_popular || p.one_time_fee > 0 || idx === 1;
            const fee = p.one_time_fee || p.annual_fee || 0;
            const scopeLevel = p.territory_level === "state" ? "State Level" : "District Level";
            const territoryCount = p.allowed_territories_count || 2;
            const commission = p.default_commission_rate || (p.territory_level === "state" ? 12 : 8);
            const dealerMargin = p.default_dealer_margin || (p.territory_level === "state" ? 8 : 5);

            return (
              <motion.div
                key={p.id || p._id || idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className={`relative rounded-3xl flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? "bg-white border-2 border-[#F49222] shadow-xl shadow-amber-500/10 scale-[1.01] sm:scale-[1.02]"
                    : "bg-white border border-slate-200 hover:border-slate-300 shadow-md"
                }`}
              >
                {/* Popular Pill */}
                {isPopular && (
                  <div className="absolute -top-3.5 right-4 sm:right-6 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-[#F49222] to-[#D97E15] text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider shadow-md flex items-center gap-1.5">
                    <FiStar size={11} className="fill-white" />
                    Recommended Choice
                  </div>
                )}

                <div className="p-5 sm:p-8 space-y-4 sm:space-y-6">
                  {/* Scope Level & Plan Name */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#253880] text-[11px] sm:text-xs font-black">
                      <FiMapPin size={12} />
                      <span>{scopeLevel} Allotment</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {p.plan_name || p.name}
                    </h3>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {p.description || "Official franchise subscription plan with comprehensive portal access."}
                    </p>
                  </div>

                  {/* Pricing Display */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-4xl font-black text-slate-900">
                        {fee === 0 ? "Free / Promo" : `₹${fee.toLocaleString("en-IN")}`}
                      </span>
                      {fee > 0 && (
                        <span className="text-xs text-slate-500 font-semibold">
                          / {p.validity_value || 1} {p.validity_unit || "year"}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-[#D97E15] font-semibold mt-1">
                      {fee === 0
                        ? "100% Zero Upfront Risk • Start Immediately"
                        : "One-Time Annual License • High Dealer Wholesale Margins"}
                    </p>
                  </div>

                  {/* Territory, Warehouse & Order Type Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Territory Quota</span>
                      <span className="text-xs sm:text-sm font-black text-[#253880]">
                        {territoryCount} {p.territory_level === "state" ? "States" : "Districts"}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Commission Rate</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-600">
                        {commission}%
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Warehouse Req.</span>
                      <span className="text-xs sm:text-sm font-black text-[#253880]">
                        {p.warehouse_required
                          ? `${p.warehouse_count || 1} WH (${Number(p.warehouse_space_sqft || 0).toLocaleString("en-IN")} sqft)`
                          : "Zero WH Req."}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Order Type</span>
                      <span className="text-xs sm:text-sm font-black text-purple-700">
                        {formatOrderTypes(p.order_type_allowed)}
                      </span>
                    </div>
                  </div>

                  {/* Feature Highlights Checklist */}
                  <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                      Included Partner Benefits:
                    </p>
                    <ul className="space-y-2 sm:space-y-2.5 text-xs text-slate-700">
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-600 shrink-0" size={15} />
                        <span><strong>{territoryCount} {scopeLevel}</strong> exclusive territory allocation</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-600 shrink-0" size={15} />
                        <span>
                          <strong>MOQ Capacity:</strong> Up to {Number(p.moq_capacity_kw || 10000).toLocaleString("en-IN")} kW ({p.moq_kits_count || 1} Kit MOQ)
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-600 shrink-0" size={15} />
                        <span>
                          <strong>Project Types:</strong> {p.project_types_display || p.moq_project_type || "All Project Categories (Residential / Commercial)"}
                        </span>
                      </li>
                      {p.combo_kits_display && p.combo_kits_display !== "All Admin Combo Kits" && (
                        <li className="flex items-center gap-2">
                          <FiCheckCircle className="text-emerald-600 shrink-0" size={15} />
                          <span>
                            <strong>Covered Kits:</strong> {p.combo_kits_display}
                          </span>
                        </li>
                      )}
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-600 shrink-0" size={15} />
                        <span>
                          <strong>Warehouse:</strong> {p.warehouse_required
                            ? `${p.warehouse_count || 1} Hub (${Number(p.warehouse_space_sqft || 0).toLocaleString("en-IN")} sq ft space)`
                            : "No mandatory warehouse setup needed"}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-600 shrink-0" size={15} />
                        <span>
                          <strong>Order Fulfillment:</strong> {formatOrderTypes(p.order_type_allowed)}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-600 shrink-0" size={15} />
                        <span>Direct <strong>Wholesale Solar Kits</strong> pricing</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-600 shrink-0" size={15} />
                        <span>Pre-qualified <strong>EPC Buyer Leads</strong> allocated</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="p-5 sm:p-8 pt-0">
                  <button
                    onClick={() => handleSelectPlan(p)}
                    className={`w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isPopular
                        ? "bg-gradient-to-r from-[#F49222] to-[#D97E15] hover:from-[#D97E15] hover:to-[#F49222] text-white shadow-md shadow-amber-500/20 transform hover:-translate-y-0.5"
                        : "bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] text-white shadow-md shadow-blue-600/20"
                    }`}
                  >
                    <span>Apply</span>
                    <FiArrowRight size={15} />
                  </button>
                  <p className="text-[10px] text-center text-slate-500 mt-2 font-medium">
                    Instant paperless GST & KYC onboarding
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Custom Corporate Inquiry Note */}
        <div className="mt-10 sm:mt-14 p-4 sm:p-6 rounded-2xl bg-sky-50/60 border border-sky-100 max-w-3xl mx-auto text-center space-y-1.5 sm:space-y-2">
          <p className="text-xs sm:text-sm font-bold text-slate-900">
            Looking for Multi-State or Master Regional Distribution Rights?
          </p>
          <p className="text-[11px] sm:text-xs text-slate-600">
            Contact our Corporate Alliances team for state-level master franchisee partnerships and custom credit limits.
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#253880] hover:underline pt-1"
          >
            <span>Request Master Franchise Call</span>
            <FiArrowRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}
