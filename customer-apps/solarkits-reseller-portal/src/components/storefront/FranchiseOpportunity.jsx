import { useEffect, useState } from "react";
import { FiLoader, FiAlertCircle } from "react-icons/fi";
import api from "../../services/api";

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

export default function FranchiseOpportunity({ onOpenLeadModal, onOpenPurchaseModal }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get("/india/v1/reseller/plans/list");

      if (response.data?.status === "success" && Array.isArray(response.data.data)) {
        const activePlans = response.data.data.filter((p) => p.is_active !== false);
        setPlans(activePlans);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error("Fetch plans error from admin API:", err.message);
      setError("Unable to load franchise plans from Admin.");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);


  const handlePlanClick = (plan) => {
    if (typeof onOpenPurchaseModal === "function") {
      onOpenPurchaseModal(plan);
      return;
    }

    if (typeof onOpenLeadModal === "function") {
      const priceDisplay =
        plan.one_time_fee === 0
          ? "Custom / Enterprise"
          : `₹${Number(plan.one_time_fee || 0).toLocaleString("en-IN")}`;

      const levelDisplay = plan.territory_level
        ? plan.territory_level.charAt(0).toUpperCase() + plan.territory_level.slice(1)
        : "District";

      onOpenLeadModal(
        {
          preferredModel: plan.name || plan.plan_name,
          requiredConfig: plan.slug || plan.id,
          territoryLevel: levelDisplay,
          investment: priceDisplay,
        },
        "franchise_apply"
      );
    }
  };

  return (
    <section
      id="franchise-plans"
      className="relative overflow-hidden border-t border-slate-200 bg-slate-50 py-16 text-slate-900 sm:py-24"
    >
      {/* Background Decoration */}
      <div className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full bg-[#253880]/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[#F49222]/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#F49222]" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D97E15] sm:text-xs">
              Franchise Territory Opportunity
            </span>
          </div>

          <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
            Choose Your <span className="text-[#253880]">Solar Territory</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Start at district level or lead an entire market with protected
            territory, factory pricing and complete business support.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-16 flex flex-col items-center justify-center gap-3 text-slate-500 font-semibold py-12">
            <FiLoader className="animate-spin text-[#253880]" size={28} />
            <span className="text-sm">Loading franchise plans from admin...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="mt-12 mx-auto max-w-md p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
            <FiAlertCircle className="mx-auto text-red-500" size={32} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
            <button
              type="button"
              onClick={fetchPlans}
              className="px-4 py-2 bg-[#253880] text-white text-xs font-bold rounded-lg hover:bg-[#1d2c66] transition"
            >
              Retry Loading
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && plans.length === 0 && (
          <div className="mt-12 mx-auto max-w-md p-8 bg-white border border-slate-200 rounded-3xl text-center shadow-sm">
            <p className="text-sm font-bold text-slate-700">No active franchise plans available.</p>
            <p className="text-xs text-slate-500 mt-1">Please create active plans in the Admin Portal.</p>
          </div>
        )}

        {/* Plans Grid */}
        {!loading && !error && plans.length > 0 && (
          <div className="mt-10 grid grid-cols-1 items-stretch gap-6 lg:mt-14 lg:grid-cols-3">
            {plans.map((plan) => {
              const isPopular = Boolean(plan.is_popular || plan.territory_level === "state");
              const levelName = plan.territory_level
                ? plan.territory_level.charAt(0).toUpperCase() + plan.territory_level.slice(1)
                : "District";
              const priceText =
                plan.one_time_fee === 0
                  ? "Custom"
                  : `₹${Number(plan.one_time_fee || 0).toLocaleString("en-IN")}`;
              const periodText =
                plan.one_time_fee === 0
                  ? "Based on market evaluation"
                  : `${plan.validity_value || 1} ${plan.validity_unit || "year"} validity`;
              const badgeText = isPopular
                ? "Most Popular"
                : plan.territory_level === "district"
                  ? "Start Local"
                  : "Enterprise";
              const territoryText =
                plan.max_states_allowed ||
                `${plan.allowed_territories_count || 1} Exclusive ${levelName}`;
              const earningText = plan.default_commission_rate
                ? `${plan.default_commission_rate}% Commission`
                : "Commission Payout";
              const btnText = "Apply";

              return (
                <article
                  key={plan.id || plan._id || plan.slug}
                  className={`group relative flex flex-col overflow-hidden rounded-[28px] bg-white transition duration-300 hover:-translate-y-1 ${isPopular
                      ? "border-2 border-[#253880] shadow-xl shadow-blue-900/10 lg:-translate-y-3 lg:hover:-translate-y-4"
                      : "border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-900/5"
                    }`}
                >
                  {isPopular && (
                    <div className="bg-[#253880] py-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white">
                      Recommended Growth Plan
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    {/* Plan Name & Badge */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D97E15]">
                          {levelName} Level
                        </p>
                        <h3 className="mt-1 text-xl font-black text-slate-900">
                          {plan.name || plan.plan_name}
                        </h3>
                      </div>

                      <span
                        className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase ${isPopular
                            ? "border-blue-200 bg-blue-50 text-[#253880]"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                      >
                        {badgeText}
                      </span>
                    </div>

                    {/* Pricing */}
                    <div className="mt-6 border-b border-slate-100 pb-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Investment
                      </p>
                      <span className="mt-1 block text-3xl font-black tracking-tight text-slate-950">
                        {priceText}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">{periodText}</p>
                    </div>

                    {/* Plan Attributes (Territory, Warehouse, Order Type) */}
                    <div className="grid grid-cols-3 gap-2 py-4">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Territory
                        </p>
                        <p className="mt-1 text-xs font-black text-slate-800 line-clamp-1">
                          {territoryText}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Warehouse
                        </p>
                        <p className="mt-1 text-xs font-black text-[#253880] line-clamp-1">
                          {plan.warehouse_required
                            ? `${plan.warehouse_count || 1} WH (${Number(plan.warehouse_space_sqft || 0).toLocaleString("en-IN")} sqft)`
                            : "No WH Required"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Order Type
                        </p>
                        <p className="mt-1 text-xs font-black text-purple-700 line-clamp-1">
                          {formatOrderTypes(plan.order_type_allowed)}
                        </p>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      type="button"
                      onClick={() => handlePlanClick(plan)}
                      className={`mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-xs font-black uppercase tracking-wider text-white transition focus:outline-none focus:ring-4 focus:ring-blue-200 ${isPopular
                          ? "bg-gradient-to-r from-[#253880] to-[#1d2c66] shadow-md shadow-blue-500/20 hover:from-[#1d2c66] hover:to-[#253880]"
                          : "bg-[#253880] hover:bg-[#1d2c66]"
                        }`}
                    >
                      <span>{btnText}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}


      </div>
    </section>
  );
}