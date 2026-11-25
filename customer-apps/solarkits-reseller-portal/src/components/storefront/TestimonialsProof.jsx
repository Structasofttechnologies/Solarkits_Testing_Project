import { motion } from "framer-motion";
import { FiStar, FiCheckCircle, FiAward, FiShield } from "react-icons/fi";

const TESTIMONIALS = [
  {
    name: "Vikram Rathi",
    role: "Authorized Franchisee Dealer",
    company: "Rathi Solar Power (Pune, MH)",
    volume: "120+ Rooftops Completed",
    quote: "Switching from buying separate panels and inverters to ordering complete Solarkits was the best operational decision. The pre-wired ACDB/DCDB boxes cut our rooftop installation time from 3 days to under 6 hours!",
    rating: 5,
    verifiedGst: "GST Verified",
  },
  {
    name: "Suresh Patel",
    role: "Commercial EPC Contractor",
    company: "SunShine Energy Solutions (Ahmedabad, GJ)",
    volume: "450 kW+ Projects Installed",
    quote: "The 550W and 580W TOPCon Solarkits with full 12% GST ITC invoices allow us to quote aggressively on industrial projects while maintaining healthy 17% net margins. Fast 48-hr warehouse dispatch is unmatched.",
    rating: 5,
    verifiedGst: "EPC Partner",
  },
  {
    name: "Manish Sharma",
    role: "District Franchise Partner",
    company: "Jaipur Solar Tech (Jaipur, RJ)",
    volume: "85 PM Surya Ghar Homes",
    quote: "All DCR kits come with pre-verified ALMM certificates and SLD drawings. Not a single PM Surya Ghar inspection rejected by Rajasthan DISCOM. Our customers received their DBT subsidies within 25 days.",
    rating: 5,
    verifiedGst: "DCR Certified",
  },
];

export default function TestimonialsProof({ testimonialsConfig }) {
  if (testimonialsConfig && testimonialsConfig.enabled === false) return null;

  const badgeText = testimonialsConfig?.badge_text || "Verified Business Proof";
  const heading = testimonialsConfig?.heading || "Trusted by 1,200+ Dealers, EPCs & Solar Entrepreneurs";
  const highlightHeading = testimonialsConfig?.highlight_heading || "Solar Entrepreneurs";
  const subtitle = testimonialsConfig?.subtitle || "Real feedback from verified solar businesses operating with Solarkits turnkey solutions across India.";
  const items = testimonialsConfig?.items && testimonialsConfig.items.length > 0 ? testimonialsConfig.items : TESTIMONIALS;

  return (
    <section id="testimonials" className="py-16 sm:py-24 bg-slate-50 text-slate-900 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-xs">
            <FiCheckCircle className="text-emerald-600" size={14} />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-800">
              {badgeText}
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {heading.includes(highlightHeading) ? (
              <>
                {heading.replace(highlightHeading, "")}{" "}
                <span className="text-[#253880]">{highlightHeading}</span>
              </>
            ) : (
              heading
            )}
          </h2>

          <p className="text-xs sm:text-base text-slate-600 font-normal max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 sm:pt-14">
          {items.map((t, idx) => (
            <motion.div
              key={t.id || t._id || `${t.name || 'partner'}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Rating Stars & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <FiStar key={i} size={14} className="fill-current" />
                    ))}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                    {t.verified_badge || t.verifiedGst || "GST Verified"}
                  </span>
                </div>

                {/* Quote */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              {/* Author Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900">{t.name}</h4>
                  <p className="text-[10px] text-slate-500">{t.company}</p>
                </div>
                <span className="text-[10px] font-bold text-[#253880] bg-sky-50 px-2 py-1 rounded-md border border-sky-200">
                  {t.volume}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
