import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHelpCircle,
  FiChevronDown,
  FiSend,
  FiCheckCircle,
  FiLoader,
  FiMessageSquare,
  FiPhone,
} from "react-icons/fi";
import { INDIAN_STATES_DISTRICTS } from "../../data/territoryData";
import api from "../../services/api";

const FAQ_CATEGORIES = {
  "Complete SolarKits": [
    {
      q: "What components are included in a standard Solarkit?",
      a: "Every Solarkit is a turn-key solution containing Tier-1 Mono PERC or N-Type TOPCon Solar Modules, a cloud-connected smart grid or hybrid inverter, pre-wired IP65 ACDB & DCDB boxes with Type-II SPDs, UV-rated 4/6sqmm DC solar cables, chemical bonded earthing electrodes, copper lightning arrester, and elevated HDGI mounting hardware.",
    },
    {
      q: "Are Solarkits compliant with PM Surya Ghar Muft Bijli Yojana?",
      a: "Yes. All DCR designated Solarkits (1.1kW, 2.2kW, 3.3kW, 5kW) use ALMM-approved, MNRE-certified Domestic Content Requirement (DCR) solar cells and modules, qualifying your customers for up to ₹78,000 direct bank DBT subsidies.",
    },
    {
      q: "Can I customize the inverter brand or panel wattage in a Solarkit?",
      a: "Yes. In addition to our pre-engineered standard packages, dealers can request custom combinations (e.g. 580W TOPCon with Deye Hybrid Inverter) via the 'Request Custom Configuration' action on the catalog.",
    },
  ],
  "Franchise & Territory": [
    {
      q: "How does territory exclusivity work for authorized franchisees?",
      a: "When you are onboarded as an Authorized Dealer, up to 2 revenue districts are assigned exclusively to your franchise code. Local residential rooftop and commercial EPC buyer inquiries originating from those districts are automatically routed to your portal dashboard.",
    },
    {
      q: "Is GST registration mandatory to become a franchisee?",
      a: "GST registration is recommended to claim 100% of the 12% GST Input Tax Credit (ITC) on factory-gate purchases. However, individual solar contractors without GST can begin under our Commission Starter Partner plan.",
    },
    {
      q: "What is the upfront investment required to launch a Solarkits store?",
      a: "The Commission Starter Partner program has zero upfront investment. For Authorized Dealerships with stocking rights and territory protection, the program fee is only ₹5,000/year plus your initial equipment inventory capital.",
    },
  ],
  "B2B Pricing & Payouts": [
    {
      q: "How are franchise commissions paid out?",
      a: "All commission earnings are credited automatically to your Franchisee Earnings Wallet in real-time. Admin accounts team processes direct NEFT/RTGS settlements directly to your registered bank account.",
    },
    {
      q: "How fast is regional hub dispatch and what are the delivery charges?",
      a: "Orders are dispatched within 24 to 48 hours from our nearest state regional warehouse with full transit insurance. Delivery is free for local hub radius orders or calculated at transparent nominal freight rates for remote sites.",
    },
    {
      q: "How are equipment warranty replacements handled?",
      a: "All items carry direct manufacturer warranties (10-12 yrs on panels, 5-7 yrs on inverters, 5 yrs on BOS). SolarKits provides centralized RMA assistance and fast regional unit swaps so you don't face customer downtime.",
    },
  ],
};

export default function FaqContactSection({ onOpenLeadModal, faqConfig }) {
  if (faqConfig && faqConfig.enabled === false) return null;

  // Normalize categories if array or object
  const categoriesMap = (faqConfig?.categories && Array.isArray(faqConfig.categories))
    ? faqConfig.categories.reduce((acc, c) => {
        if (c.name) acc[c.name] = c.items || [];
        return acc;
      }, {})
    : (faqConfig?.categories || FAQ_CATEGORIES);

  const categoryNames = Object.keys(categoriesMap).length > 0 ? Object.keys(categoriesMap) : Object.keys(FAQ_CATEGORIES);

  const [activeCategory, setActiveCategory] = useState(categoryNames[0] || "Complete SolarKits");
  const [openIndex, setOpenIndex] = useState(0);

  const badgeText = faqConfig?.badge_text || "Frequently Asked Questions";
  const heading = faqConfig?.heading || "Everything You Need to Know About Solarkits & Dealerships";
  const highlightHeading = faqConfig?.highlight_heading || "Solarkits & Dealerships";

  const deskBadge = faqConfig?.consultation_desk?.badge_text || "Priority B2B Desk";
  const deskTitle = faqConfig?.consultation_desk?.title || "Request Partner Consultation";
  const deskSubtitle = faqConfig?.consultation_desk?.subtitle || "Have questions regarding state distribution or container pricing? Our team will call back within 2 hours.";
  const whatsappNum = faqConfig?.consultation_desk?.whatsapp_number || "917777939842";
  const whatsappBtnText = faqConfig?.consultation_desk?.whatsapp_button_text || "Chat Directly on WhatsApp";
  const submitBtnText = faqConfig?.consultation_desk?.submit_button_text || "Request Callback Now →";

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    state: "Maharashtra",
    district: "Pune",
    businessType: "Solar Dealer / Installer",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      fullName: formData.name,
      businessName: `${formData.name} (Consultation Desk)`,
      mobileNumber: formData.mobile,
      whatsappNumber: formData.mobile,
      email: formData.email,
      state: formData.state,
      district: formData.district,
      businessProfile: formData.businessType || "Solar Dealer / Installer",
      expectedOrderQty: "1 - 3 Kits / Month (Starter)",
      selectedSolution: "Request Partner Callback",
      actionType: "callback_request",
      action_type: "callback_request",
      notes: formData.message || "Requested priority partner consultation callback within 2 hours regarding state distribution or container pricing.",
      source: "consultation_desk",
    };

    try {
      await api.post("/india/v1/reseller/leads/submit", payload);
    } catch (err) {
      console.warn("Backend lead submit note, trying fallback:", err);
      try {
        await api.post("/resellers/leads/submit", payload);
      } catch (err2) {
        console.warn("Fallback lead submit note:", err2);
      }
    }

    try {
      const existing = JSON.parse(localStorage.getItem("solarkits_crm_leads") || "[]");
      existing.unshift({
        id: `CONSULT-${Date.now()}`,
        fullName: formData.name,
        mobileNumber: formData.mobile,
        email: formData.email,
        state: formData.state,
        district: formData.district,
        businessType: formData.businessType,
        notes: formData.message,
        actionType: "callback_request",
        selectedSolution: "Request Partner Callback",
        source: "consultation_desk",
        submittedAt: new Date().toISOString(),
        status: "NEW",
      });
      localStorage.setItem("solarkits_crm_leads", JSON.stringify(existing));
    } catch (err) {
      console.warn("Storage note:", err);
    }

    setSubmitting(false);
    setSubmitted(true);
    setFormData({
      name: "",
      mobile: "",
      email: "",
      state: "Maharashtra",
      district: "Pune",
      businessType: "Solar Dealer / Installer",
      message: "",
    });
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNum}?text=Hello%20SolarKits,%20I%20have%20an%20inquiry%20regarding%20franchise%20and%20kit%20procurement.`, "_blank");
  };

  const currentQuestions = categoriesMap[activeCategory] || categoriesMap[categoryNames[0]] || [];

  return (
    <section id="faq-section" className="py-16 sm:py-24 bg-white text-slate-900 relative border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          
          {/* Left Column: Categorized FAQ Accordion */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 shadow-xs">
                <FiHelpCircle className="text-[#253880]" size={14} />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#253880]">
                  {badgeText}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {heading.includes(highlightHeading) ? (
                  <>
                    {heading.replace(highlightHeading, "")}{" "}
                    <span className="text-[#F49222]">{highlightHeading}</span>
                  </>
                ) : (
                  heading
                )}
              </h2>
            </div>

            {/* Category Switcher Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
              {categoryNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setOpenIndex(0);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat
                      ? "bg-[#253880] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Accordion */}
            <div className="space-y-3 pt-2">
              {currentQuestions.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div
                    key={faq.id || `${faq.q || 'faq'}-${idx}`}
                    className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:text-[#253880] transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <FiChevronDown
                        className={`text-slate-400 transition-transform duration-300 shrink-0 ${
                          isOpen ? "rotate-180 text-[#253880]" : ""
                        }`}
                        size={18}
                      />
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal border-t border-slate-200/80 pt-3"
                        >
                          {faq.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Callback & Consultation Form */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 sm:p-8 shadow-xl space-y-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#253880] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                  {deskBadge}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {deskTitle}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {deskSubtitle}
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <FiCheckCircle className="mx-auto text-emerald-600" size={36} />
                  <h4 className="text-base font-bold text-slate-900">Inquiry Received Successfully!</h4>
                  <p className="text-xs text-slate-600">
                    A SolarKits Regional Director has been assigned and will connect with you shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-4 py-2 bg-[#253880] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#253880] shadow-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        required
                        pattern="[6-9][0-9]{9}"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        placeholder="7777939842"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#253880] shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="ramesh@company.com"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#253880] shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        State
                      </label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#253880]"
                      >
                        {Object.keys(INDIAN_STATES_DISTRICTS).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        District
                      </label>
                      <select
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#253880]"
                      >
                        {(INDIAN_STATES_DISTRICTS[formData.state] || []).map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Business Details / Queries
                    </label>
                    <textarea
                      rows={2}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your target kilowatt volume or dealership questions..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#253880] shadow-xs"
                    />
                  </div>

                  <div className="pt-1 space-y-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <FiLoader className="animate-spin" size={15} />
                          <span>Sending Request...</span>
                        </>
                      ) : (
                        <>
                          <FiSend size={14} />
                          <span>Request Callback Now →</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleWhatsApp}
                      className="w-full py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <FiMessageSquare className="text-emerald-600" />
                      <span>Chat Directly on WhatsApp</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
