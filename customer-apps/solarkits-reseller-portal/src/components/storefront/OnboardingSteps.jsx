import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiZap,
  FiFileText,
  FiMapPin,
  FiTrendingUp,
  FiArrowRight,
  FiCheckCircle,
} from "react-icons/fi";

const STEPS = [
  {
    step: "01",
    icon: FiZap,
    title: "Select Franchise Tier",
    description:
      "Choose between the zero-capital Commission Starter Plan or high-margin Dealer Starter Plan.",
  },
  {
    step: "02",
    icon: FiFileText,
    title: "Instant GST & KYC Lookup",
    description:
      "Enter your 15-digit GSTIN number for real-time automated verification of your business legal entity.",
  },
  {
    step: "03",
    icon: FiMapPin,
    title: "Territory Allocation",
    description:
      "Get your 2+ revenue districts legally allocated on the platform with ring-fenced exclusivity.",
  },
  {
    step: "04",
    icon: FiTrendingUp,
    title: "Start Procuring & Earning",
    description:
      "Access wholesale inventory, place orders, receive EPC leads, and auto-settle commissions into your wallet.",
  },
];

export default function OnboardingSteps() {
  return (
    <section id="how-to-join" className="py-24 bg-slate-50 text-slate-900 relative overflow-hidden border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
            <FiCheckCircle className="text-[#253880]" size={14} />
            <span className="text-xs font-black uppercase tracking-wider text-[#253880]">
              Simple 4-Step Onboarding
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            How to Become a{" "}
            <span className="text-[#F49222]">
              SolarKits Franchisee Partner
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base font-normal">
            Start your authorized solar franchise in under 5 minutes with our completely automated digital onboarding system.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {STEPS.map((s, idx) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.12 }}
              className="relative p-7 rounded-3xl bg-white border border-slate-200 hover:border-[#253880] shadow-sm hover:shadow-xl flex flex-col justify-between transition-all duration-300 group"
            >
              <div className="space-y-4">
                {/* Step Number & Icon */}
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black font-mono text-slate-300 group-hover:text-[#253880] transition-colors">
                    {s.step}
                  </span>
                  <div className="h-12 w-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#253880] group-hover:bg-[#253880] group-hover:text-white transition-all shadow-xs">
                    <s.icon size={22} />
                  </div>
                </div>

                <h3 className="text-base font-black text-slate-900 group-hover:text-[#253880] transition-colors">
                  {s.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {s.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Button */}
        <div className="text-center mt-12">
          <Link
            to="/register"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <span>Register as Partner Now</span>
            <FiArrowRight size={18} />
          </Link>
        </div>

      </div>
    </section>
  );
}
