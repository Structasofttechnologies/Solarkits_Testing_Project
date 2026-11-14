import { Link } from "react-router-dom";
import {
  FiZap,
  FiMail,
  FiPhone,
  FiMapPin,
  FiShield,
  FiCheckCircle,
  FiArrowUp,
  FiMessageSquare,
} from "react-icons/fi";
import logoImg from "../../assets/images/logo.png";

export default function Footer({ onOpenLeadModal, footerConfig }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const brandTitle = footerConfig?.brand_title || "Solarkits Platform";
  const brandSubtitle = footerConfig?.brand_subtitle || "B2B Franchise Network";
  const description = footerConfig?.description || "India's primary B2B ready-to-sell solar platform and franchise opportunity. Sourcing certified On-Grid, Off-Grid, and Hybrid Solarkits for solar dealers, EPC contractors, and regional distributors.";
  const badges = footerConfig?.badges && footerConfig.badges.length > 0 ? footerConfig.badges : ["ALMM / DCR Certified", "100% GST ITC Claim"];

  const deskTitle = footerConfig?.contact?.desk_title || "National B2B Partner Desk";
  const address = footerConfig?.contact?.address || "SolarKits Tech Park, Phase-1 Central Logistics Hub, Pune, Maharashtra 411045";
  const phone = footerConfig?.contact?.phone || "+91 (020) 6789-SOLAR / 1800-SOLAR-KIT";
  const email = footerConfig?.contact?.email || "franchise@solarkits.in | b2b@solarkits.in";
  const whatsappNum = footerConfig?.contact?.whatsapp_number || "917777939842";
  const whatsappBtnText = footerConfig?.contact?.whatsapp_button_text || "WhatsApp B2B";
  const callbackBtnText = footerConfig?.contact?.callback_button_text || "Request Callback";

  const disclaimer = footerConfig?.disclaimer || "Regulatory & Statutory Disclaimer: Solarkits is a registered B2B e-commerce platform and equipment fulfillment provider for authorized dealers, EPC contractors, and franchisees. Revenue figures, margins, and generation estimates shown on this website are illustrative and depend on territory, sales volume, product mix, margins, operating costs, and business performance. Solarkits does not guarantee revenue or profit. PM Surya Ghar Muft Bijli Yojana subsidies are disbursed directly by the Government of India / State DISCOMs subject to applicant eligibility and DISCOM technical feasibility.";
  const copyright = footerConfig?.copyright_text || "© 2026 Solarkits Platform India. All Rights Reserved. Position: One-Stop Solar Business Platform.";

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNum}?text=Hello%20SolarKits,%20I%20want%20to%20inquire%20about%20Solarkits.`, "_blank");
  };

  return (
    <footer className="bg-slate-50 text-slate-900 relative overflow-hidden border-t border-slate-200 pb-20 md:pb-0">
      {/* Background Soft Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Main Footer Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 relative z-10">

        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-slate-200">

          {/* Col 1: Brand & Positioning (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="SolarKits Logo"
                className="h-9 w-auto object-contain"
              />
              <div className="flex flex-col border-l border-slate-300 pl-2.5">
                <span className="text-xs font-black tracking-wider uppercase text-[#253880]">
                  {brandTitle}
                </span>
                <span className="text-[9px] text-[#F49222] font-extrabold tracking-wider uppercase">
                  {brandSubtitle}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {description}
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {badges.map((b, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                  <FiCheckCircle size={12} className="text-emerald-600" />
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Col 3: Franchise & Territory Navigation (2.5 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Franchise Portal
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <a href="#store-availability" className="hover:text-[#253880] transition-colors">
                  Territory Checker
                </a>
              </li>
              <li>
                <a href="#eligibility-checker" className="hover:text-[#253880] transition-colors">
                  Eligibility Checker
                </a>
              </li>
              <li>
                <a href="#franchise-plans" className="hover:text-[#253880] transition-colors">
                  Franchise Plans
                </a>
              </li>
              <li>
                <a href="#dealer-support" className="hover:text-[#253880] transition-colors">
                  Dealer & EPC Support
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#253880] transition-colors">
                  Partner Portal Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: B2B Support & Contact (3 Cols) */}
          <div className="lg:col-span-6 md:lg:col-span-6 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              {deskTitle}
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <FiMapPin className="text-[#253880] shrink-0 mt-0.5" size={14} />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <FiPhone className="text-emerald-600 shrink-0" size={14} />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <FiMail className="text-[#F49222] shrink-0" size={14} />
                <span>{email}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <FiMessageSquare />
                <span>{whatsappBtnText}</span>
              </button>

              <button
                onClick={() => onOpenLeadModal && onOpenLeadModal({ requiredConfig: "Footer Consultation" }, "bulk_price")}
                className="px-3.5 py-2 rounded-xl bg-[#253880] hover:bg-[#1d2c66] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                {callbackBtnText}
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Legal & Statutory Disclaimers */}
        <div className="pt-8 space-y-4 text-slate-500 text-[11px] leading-relaxed">
          <p>
            {disclaimer}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-slate-600 text-xs">
            <div>
              {copyright}
            </div>

          </div>
        </div>

      </div>
    </footer>
  );
}
