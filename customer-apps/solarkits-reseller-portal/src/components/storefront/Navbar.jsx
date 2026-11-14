import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMenu,
  FiX,
  FiUser,
  FiZap,
  FiShoppingBag,
  FiShield,
  FiTrendingUp,
  FiArrowRight,
  FiCheckCircle,
  FiMapPin,
  FiAward,
  FiHelpCircle,
  FiDollarSign,
  FiMessageSquare,
} from "react-icons/fi";
import logoImg from "../../assets/images/logo.png";

export default function Navbar({ onOpenLeadModal }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Primary navigation matching exact requirements
  const navLinks = [
    { name: "Home", href: "#" },
    // { name: "Franchise Plan", href: "#franchise-plans", icon: FiZap },
    // { name: "Store Availability", href: "#store-availability", icon: FiMapPin },
    { name: "Eligibility Checker", href: "/eligibility", icon: FiAward },
    { name: "FAQ", href: "#faq-section", icon: FiHelpCircle },
  ];

  const handleWhatsApp = () => {
    window.open("https://wa.me/917777939842?text=Hello%20SolarKits,%20I%20am%20interested%20in%20Solarkits%20and%20Franchise.", "_blank");
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 py-2.5"
        : "bg-white/90 backdrop-blur-sm border-b border-slate-100 py-3 sm:py-3.5"
        }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">

          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
              <img
                src={logoImg}
                alt="SolarKits Logo"
                className="h-8 sm:h-9 xl:h-10 w-auto object-contain transition-transform group-hover:scale-105 shrink-0"
              />
              <div className="flex flex-col border-l border-slate-200 pl-2 sm:pl-3 shrink-0">
                <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-[#253880] whitespace-nowrap">
                  Franchisee Network
                </span>
                <span className="hidden xs:block text-[8px] sm:text-[9px] text-[#F49222] font-extrabold tracking-wider uppercase whitespace-nowrap">

                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden 2xl:flex items-center gap-1 2xl:gap-1.5 shrink-0">
            {navLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="px-2.5 py-1.5 rounded-xl text-xs 2xl:text-xs font-bold text-slate-700 hover:text-[#253880] hover:bg-sky-50 transition-all whitespace-nowrap shrink-0"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Right Action CTAs */}
          <div className="hidden xl:flex items-center gap-2 2xl:gap-3 shrink-0">


            <Link
              to="/login"
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#253880] hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
            >
              <FiUser className="text-[#253880] shrink-0" size={13} />
              <span>Partner Login</span>
            </Link>

            <button
              onClick={() => onOpenLeadModal && onOpenLeadModal({ requiredConfig: "Header Fast Application" }, "franchise_apply")}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-[#253880] to-[#1d2c66] hover:from-[#1d2c66] hover:to-[#253880] transition-all transform hover:-translate-y-0.5 shadow-md shadow-blue-500/20 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FiZap size={13} />
              <span>Apply Now</span>
            </button>
          </div>

          {/* Mobile Right Buttons & Hamburger */}
          <div className="flex xl:hidden items-center gap-1.5 sm:gap-2 shrink-0">


            <button
              onClick={() => onOpenLeadModal && onOpenLeadModal({ requiredConfig: "Mobile Fast Application" }, "franchise_apply")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-extrabold text-white bg-[#253880] shadow-xs whitespace-nowrap"
            >
              Apply Now
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FiX size={18} /> : <FiMenu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl"
          >
            <div className="space-y-1">
              {/* Quick links on mobile */}
              <a
                href="#catalog-browser"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-sky-50 hover:text-[#253880]"
              >
                <FiShoppingBag className="text-[#253880]" />
                Browse Solarkits
              </a>

              <a
                href="#store-availability"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-sky-50 hover:text-[#253880]"
              >
                <FiMapPin className="text-[#F49222]" />
                Check Store Availability
              </a>

              <Link
                href="/eligibility"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-sky-50 hover:text-[#253880]"
              >
                <FiAward className="text-emerald-600" />
                Check Eligibility
              </Link>

              <a
                href="#franchise-plans"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-sky-50 hover:text-[#253880]"
              >
                <FiZap className="text-purple-600" />
                Franchise Plans
              </a>

              <a
                href="#revenue-potential"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-sky-50 hover:text-[#253880]"
              >
                <FiTrendingUp className="text-amber-600" />
                Revenue Potential
              </a>

              <a
                href="#faq-section"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-sky-50 hover:text-[#253880]"
              >
                <FiHelpCircle className="text-slate-600" />
                FAQ
              </a>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleWhatsApp();
                }}
                className="w-full py-2.5 text-center text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FiMessageSquare className="text-emerald-600" />
                Chat on WhatsApp
              </button>

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-xs font-bold text-slate-700 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center gap-2"
              >
                <FiUser className="text-[#253880]" />
                Partner Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
