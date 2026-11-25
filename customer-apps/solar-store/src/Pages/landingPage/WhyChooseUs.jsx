import { motion } from "framer-motion";

const FEATURES = [
  {
    emoji: "🏅",
    title: "BIS & MNRE Certified",
    desc: "All products are certified by Bureau of Indian Standards and Ministry of New & Renewable Energy.",
    color: "bg-blue-50 border-blue-100",
    iconBg: "bg-primary-100",
  },
  {
    emoji: "🚚",
    title: "Free Pan-India Delivery",
    desc: "We deliver to 18,000+ pincodes across India. Free shipping on orders above ₹5,000.",
    color: "bg-orange-50 border-orange-100",
    iconBg: "bg-accent-50",
  },
  {
    emoji: "🛡️",
    title: "25-Year Warranty",
    desc: "Industry-leading 25-year performance warranty on solar panels + 5-year product warranty.",
    color: "bg-green-50 border-green-100",
    iconBg: "bg-green-100",
  },
  {
    emoji: "⚙️",
    title: "Expert Installation",
    desc: "Trained solar engineers install your system within 48–72 hours of delivery. MNRE empanelled.",
    color: "bg-purple-50 border-purple-100",
    iconBg: "bg-purple-100",
  },
  {
    emoji: "💰",
    title: "Easy EMI Options",
    desc: "0% EMI available for 6/12 months on orders above ₹25,000 via top bank credit cards.",
    color: "bg-sky-50 border-sky-100",
    iconBg: "bg-sky-100",
  },
  {
    emoji: "📋",
    title: "GST Invoice & Tax Benefits",
    desc: "Get official GST invoices for every purchase. Businesses can claim input tax credit.",
    color: "bg-teal-50 border-teal-100",
    iconBg: "bg-teal-100",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function WhyChooseUs({ whyChooseConfig }) {
  if (whyChooseConfig && whyChooseConfig.enabled === false) return null;

  const badgeText = whyChooseConfig?.badge_text || "Why SolarKits?";
  const heading = whyChooseConfig?.heading || "The SolarKits Advantage";
  const subtitle = whyChooseConfig?.subtitle || "We don't just sell solar — we deliver a complete, worry-free solar experience";
  const items = whyChooseConfig?.items && whyChooseConfig.items.length > 0 ? whyChooseConfig.items : FEATURES;

  return (
    <section className="py-16 md:py-24 bg-white" id="why-choose">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block bg-primary-50 text-primary-600 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3">
            {badgeText}
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-navy section-heading">
            {heading}
          </h2>
          <p className="text-gray-500 mt-4 text-base max-w-xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {items.map((feat, idx) => (
            <motion.div
              key={feat.title || idx}
              variants={item}
              whileHover={{ y: -6 }}
              className={`rounded-2xl border p-6 ${feat.color || "bg-blue-50 border-blue-100"} transition-all duration-300 hover:shadow-card`}
            >
              <div className={`w-12 h-12 ${feat.iconBg || "bg-primary-100"} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                {feat.emoji || "🏅"}
              </div>
              <h3 className="font-heading font-bold text-navy text-lg mb-2">{feat.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
