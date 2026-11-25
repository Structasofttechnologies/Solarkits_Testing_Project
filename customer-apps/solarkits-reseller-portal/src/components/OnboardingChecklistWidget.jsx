import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiShield,
  FiCreditCard,
  FiPackage,
  FiUsers,
  FiMapPin,
  FiArrowRight,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiZap,
  FiLock,
} from "react-icons/fi";

export default function OnboardingChecklistWidget({ reseller, territory, activeSubscription }) {
  const [collapsed, setCollapsed] = useState(false);

  // Compute completed steps
  const hasActivePlan = Boolean(reseller?.activation_status === "active" || activeSubscription);
  const isKycSubmitted = reseller?.kyc_status === "submitted" || reseller?.kyc_status === "verified";
  const isKycVerified = reseller?.kyc_status === "verified";
  const hasBankDetails = Boolean(reseller?.bank_details?.account_number);

  const steps = [
    {
      id: "territory_plan",
      title: "Franchise License & Exclusive Territory",
      desc: territory?.location_name
        ? `Exclusive ${territory.territory_level || "district"} rights allocated: ${territory.location_name}`
        : "Protected 1-franchisee territory license active",
      completed: true, // Completed upon purchase & activation
      statusText: "Active Exclusivity",
      icon: FiMapPin,
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      actionText: "View Territories",
      actionLink: "/territories",
    },
    {
      id: "kyc_verification",
      title: "Business KYC & Identity Verification",
      desc: isKycVerified
        ? "PAN Card, Shop Photo and business compliance documents approved."
        : isKycSubmitted
        ? "Documents submitted and currently under admin review."
        : "Upload PAN Card, Shop Photo, GST Certificate, and ID proof to unlock wholesale ordering.",
      completed: isKycVerified,
      pending: isKycSubmitted && !isKycVerified,
      statusText: isKycVerified ? "Verified" : isKycSubmitted ? "Under Review" : "Action Required",
      icon: FiShield,
      badgeColor: isKycVerified
        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
        : isKycSubmitted
        ? "bg-sky-100 text-sky-800 border-sky-300"
        : "bg-amber-100 text-amber-800 border-amber-300",
      actionText: isKycVerified ? "View KYC Status" : "Upload Documents",
      actionLink: "/kyc",
    },
    {
      id: "bank_payout",
      title: "Commission & Margin Payout Bank Account",
      desc: hasBankDetails
        ? `Linked Account: ${reseller?.bank_details?.bank_name || "Bank Account"} (***${String(reseller?.bank_details?.account_number || "").slice(-4)})`
        : "Add your bank account number and IFSC code for automatic commission settlements.",
      completed: hasBankDetails,
      statusText: hasBankDetails ? "Configured" : "Recommended",
      icon: FiCreditCard,
      badgeColor: hasBankDetails
        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
        : "bg-amber-100 text-amber-800 border-amber-300",
      actionText: hasBankDetails ? "Manage Bank" : "Add Bank Account",
      actionLink: "/plans",
    },
    {
      id: "catalog_pricing",
      title: "Authorized Wholesale Product Catalog",
      desc: "Access SolarKits pre-engineered Combo Kits, Solar Panels, Inverters & BOS packages at factory prices.",
      completed: true,
      statusText: "Authorized Access",
      icon: FiPackage,
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      actionText: "Browse Catalog",
      actionLink: "/catalog",
    },
    {
      id: "epc_onboarding",
      title: "Onboard Local EPC Buyers & Place Orders",
      desc: "Register regional EPC solar contractors under your franchise to earn direct commissions on every project.",
      completed: false,
      statusText: "Ready to Onboard",
      icon: FiUsers,
      badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
      actionText: "Onboard EPC Buyers",
      actionLink: "/epc-buyers",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl overflow-hidden transition-all duration-300 mb-8">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
        {/* Background accent glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#253880]/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#F49222]/20 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F49222] text-white">
                Franchise Onboarding Journey
              </span>
              <span className="text-xs text-blue-300 font-semibold">
                • {completedCount} of {steps.length} Steps Completed
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Franchise Partner Setup</span>
              <span className="text-sm font-bold text-emerald-400">({progressPercent}%)</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Complete your KYC and bank setup to fully activate all wholesale procurement, commission payouts, and territory exclusivity tools.
            </p>
          </div>

          {/* Progress Bar & Toggle */}
          <div className="flex items-center gap-4 sm:flex-col sm:items-end justify-between">
            <div className="w-36 sm:w-44 bg-white/20 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-400 to-[#F49222] rounded-full"
              />
            </div>

            <button
              onClick={() => setCollapsed((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
            >
              <span>{collapsed ? "Expand Checklist" : "Minimize"}</span>
              {collapsed ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="divide-y divide-slate-100 bg-white"
          >
            {steps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Status Circle */}
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.completed
                          ? "bg-emerald-100 text-emerald-600 shadow-sm"
                          : item.pending
                          ? "bg-sky-100 text-sky-600 shadow-sm animate-pulse"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.completed ? (
                        <FiCheckCircle size={20} />
                      ) : item.pending ? (
                        <FiClock size={18} />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${item.badgeColor}`}
                        >
                          {item.statusText}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="sm:shrink-0 flex items-center justify-end">
                    <Link
                      to={item.actionLink}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                        item.completed
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : item.pending
                          ? "bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200"
                          : "bg-[#253880] hover:bg-[#1d2c66] text-white shadow-md shadow-blue-500/20"
                      }`}
                    >
                      <span>{item.actionText}</span>
                      <FiArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
