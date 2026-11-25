import { motion } from "framer-motion";
import {
  FiShield,
  FiMapPin,
  FiUsers,
  FiTrendingUp,
  FiCreditCard,
  FiTruck,
  FiTool,
} from "react-icons/fi";

const BENEFITS = [
  {
    icon: FiMapPin,
    title: "Territory Exclusivity & Rights",
    description:
      "Allotted districts and state regions are legally ring-fenced. No internal channel conflict from other dealers in your registered zone.",
    tag: "Protected Territory",
    color: "from-blue-600 to-cyan-600",
  },
  {
    icon: FiUsers,
    title: "EPC Buyer Leads Allocation",
    description:
      "Receive pre-qualified rooftop solar enquiries and commercial EPC contractor leads directly routed into your partner portal.",
    tag: "Instant Leads",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: FiTrendingUp,
    title: "High Wholesale Margins (8-22%)",
    description:
      "Access Tier-1 solar equipment below market benchmark prices. Enjoy maximum profit margins whether selling kits or individual SKUs.",
    tag: "Factory Pricing",
    color: "from-emerald-600 to-green-600",
  },
  {
    icon: FiCreditCard,
    title: "Digital Wallet & Instant Payouts",
    description:
      "T+0 ledger credit for all verified customer purchases. Automated GST compliance, tax credit invoicing, and quick bank withdrawals.",
    tag: "Instant Settlement",
    color: "from-purple-600 to-indigo-600",
  },
  {
    icon: FiTruck,
    title: "48-Hour Regional Hub Dispatch",
    description:
      "SolarKits maintains regional central hubs across 28 states ensuring prompt door-to-door delivery with real-time transit telemetry.",
    tag: "Express Logistics",
    color: "from-red-500 to-rose-600",
  },
  {
    icon: FiTool,
    title: "Engineering & Technical Backing",
    description:
      "Get free single-line diagrams (SLDs), structural simulation files, net metering documentation, and dedicated project engineer support.",
    tag: "Technical Support",
    color: "from-teal-600 to-emerald-600",
  },
];

export default function FranchiseBenefits() {
  return (
    <section id="benefits" className="py-24 bg-white text-slate-900 relative overflow-hidden border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-100 shadow-xs">
            <FiShield className="text-[#253880]" size={14} />
            <span className="text-xs font-black uppercase tracking-wider text-[#253880]">
              Why Partner with SolarKits
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            An Unmatched Ecosystem for{" "}
            <span className="text-[#F49222]">
              Solar Entrepreneurs & Dealers
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base font-normal">
            Everything you need to run, scale, and dominate your regional solar distribution market with zero supply chain headaches.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
          {BENEFITS.map((b, idx) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="p-7 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${b.color} flex items-center justify-center text-white shadow-md`}>
                    <b.icon size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {b.tag}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#253880] transition-colors">
                  {b.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {b.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
