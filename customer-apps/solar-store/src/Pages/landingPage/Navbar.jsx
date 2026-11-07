import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiMenu,
  FiX,
  FiChevronDown,
  FiChevronRight,
  FiUser,
  FiUserPlus,
  FiHome,
  FiShoppingBag,
  FiShoppingCart,
  FiSun,
  FiZap,
  FiPackage,
  FiLayers,
  FiGrid,
  FiBox,
  FiMapPin,
  FiPhone,
  FiExternalLink,
  FiBriefcase,
  FiArrowRight,
  FiCheckCircle,
  FiStar,
  FiFileText,
} from "react-icons/fi";
import { MdOutlineAccountBalance } from "react-icons/md";
import { selectCartTotalItems } from "../../features/slice";
import PincodeLocationModal from "../../Components/PincodeLocationModal";
import logo from "../../assets/images/logo.png";
const getFranchisePortalUrl = () => {
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://localhost:5178";
    }
  }
  return "https://franchise.solarkits.in";
};
const BROWSE_SECTORS = [
  {
    title: "Browse SolarKits by Industry",
    desc: "CMS-uploaded industry content grouped by sector",
    icon: FiGrid,
    href: "/shop",
    appRoute: "/shop",
    color: "blue",
  },
  {
    title: "Browse by Govt Tender",
    desc: "PSU & Government tender compliant solar kits",
    icon: MdOutlineAccountBalance,
    href: "/shop",
    appRoute: "/shop",
    badge: "New",
    color: "amber",
  },
];
const NAV_LINKS = [
  { label: "Home", href: "#hero", icon: FiHome },
  { label: "Why SolarKits", href: "#why-choose", icon: FiCheckCircle },
  { label: "Customer Reviews", href: "#testimonials", icon: FiStar },
];
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eshopDropdownOpen, setEshopDropdownOpen] = useState(false);
  const [brochureDropdownOpen, setBrochureDropdownOpen] = useState(false);
  const [mobileEshopExpanded, setMobileEshopExpanded] = useState(false);
  const [mobileBrochureExpanded, setMobileBrochureExpanded] = useState(false);
  const dropdownTimeoutRef = useRef(null);
  const brochureTimeoutRef = useRef(null);
  const dropdownContainerRef = useRef(null);
  const brochureDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth_slice);
  const totalCartItems = useSelector(selectCartTotalItems);
  const { selectedState, selectedDistrict, selectedPincode } = useSelector((state) => state.slice);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target)
      ) {
        setEshopDropdownOpen(false);
      }
      if (
        brochureDropdownRef.current &&
        !brochureDropdownRef.current.contains(e.target)
      ) {
        setBrochureDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleMouseEnterDropdown = () => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setEshopDropdownOpen(true);
    setBrochureDropdownOpen(false);
  };
  const handleMouseLeaveDropdown = () => {
    dropdownTimeoutRef.current = setTimeout(() => setEshopDropdownOpen(false), 180);
  };
  const handleMouseEnterBrochure = () => {
    if (brochureTimeoutRef.current) clearTimeout(brochureTimeoutRef.current);
    setBrochureDropdownOpen(true);
    setEshopDropdownOpen(false);
  };
  const handleMouseLeaveBrochure = () => {
    brochureTimeoutRef.current = setTimeout(() => setBrochureDropdownOpen(false), 180);
  };
  const handleNavClick = (href) => {
    setMenuOpen(false);
    setEshopDropdownOpen(false);
    setBrochureDropdownOpen(false);
    if (href.startsWith("#")) {
      if (location.pathname !== "/") {
        navigate(`/${href}`);
        return;
      }
      if (href === "#hero") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (href.startsWith("http://") || href.startsWith("https://")) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(href);
  };
  const handleFranchiseRedirect = () => {
    setMenuOpen(false);
    const franchiseUrl = getFranchisePortalUrl();
    window.open(franchiseUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <>
      <div className="bg-gradient-to-r from-primary-900 via-primary-700 to-primary-800 text-white text-xs font-medium overflow-hidden border-b border-primary-600/40 select-none">
        <div className="flex items-center justify-center">
          <div className="marquee-inner py-2 gap-8 flex items-center">
            {[
              "⚡ India's #1 Solar Kits & EPC Marketplace",
              "🎁 Free Pan-India Delivery on Orders Above ₹5,000",
              "📋 GST Input Tax Invoicing on Every Order",
              "☀️ PM Surya Ghar Muft Bijli Yojana Subsidy Ready Kits",
              "🛡️ 25-Year Performance Warranty on Solar Panels",
              "📞 Solar Helpline: 1800-XXX-XXXX (Mon–Sat, 9AM–6PM)",
              "🤝 Become a Franchise Partner — High ROI & Territory Exclusivity",
              "⚡ India's #1 Solar Kits & EPC Marketplace",
              "🎁 Free Pan-India Delivery on Orders Above ₹5,000",
              "📋 GST Input Tax Invoicing on Every Order",
              "☀️ PM Surya Ghar Muft Bijli Yojana Subsidy Ready Kits",
              "🛡️ 25-Year Performance Warranty on Solar Panels",
              "📞 Solar Helpline: 1800-XXX-XXXX (Mon–Sat, 9AM–6PM)",
              "🤝 Become a Franchise Partner — High ROI & Territory Exclusivity",
            ].map((text, i) => (
              <span
                key={i}
                className="whitespace-nowrap px-4 inline-flex items-center gap-2 text-white/90 font-medium hover:text-white transition-colors"
              >
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-white/96 backdrop-blur-xl shadow-md border-b border-gray-200/80"
          : "bg-white/95 backdrop-blur-md border-b border-gray-100"
          }`}
      >
        <div className="w-full px-3 sm:px-4 lg:px-5">
          <div className="flex flex-wrap items-center min-h-16 gap-x-3 gap-y-2 py-3 sm:flex-nowrap lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:min-h-[72px] lg:gap-x-5">
            <div
              className="shrink-0 cursor-pointer flex items-center lg:justify-self-start"
              onClick={() => handleNavClick("#hero")}
            >
              <img
                src={logo}
                alt="SolarKits — A Solar Marketplace"
                className="h-8 sm:h-9 lg:h-10 w-auto max-w-[120px] sm:max-w-[160px] object-contain object-left transition-transform hover:scale-[1.03] duration-200"
              />
            </div>
            <nav aria-label="Main navigation" className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 lg:justify-self-center">
              <button
                onClick={() => handleNavClick("#hero")}
                className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 xl:px-3.5 py-2 text-gray-700 text-xs xl:text-sm font-semibold rounded-xl hover:text-primary-600 hover:bg-primary-50/80 transition-all duration-150 cursor-pointer"
              >
                <FiHome className="text-sm xl:text-base text-gray-500 shrink-0" />
                <span className="whitespace-nowrap">Home</span>
              </button>

              {/* ── E-Shop Dropdown (Restored with all kit options + sector options) ── */}
              <div
                ref={dropdownContainerRef}
                className="relative shrink-0"
                onMouseEnter={handleMouseEnterDropdown}
                onMouseLeave={handleMouseLeaveDropdown}
              >
                <button
                  onClick={() => handleNavClick("/shop")}
                  className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 xl:px-3.5 py-2 text-xs xl:text-sm font-bold rounded-xl transition-all duration-150 cursor-pointer ${eshopDropdownOpen
                    ? "text-primary-600 bg-primary-50 ring-1 ring-primary-200"
                    : "text-gray-800 hover:text-primary-600 hover:bg-primary-50/80"
                    }`}
                  aria-expanded={eshopDropdownOpen}
                >
                  <FiShoppingBag className="text-sm xl:text-base text-primary-500 shrink-0" />
                  <span className="whitespace-nowrap">E-Shop</span>
                  <span className="whitespace-nowrap bg-primary-500 text-white text-[9px] xl:text-[10px] font-extrabold px-1.5 py-0.5 rounded leading-none ml-0.5">
                    Kits
                  </span>
                  <FiChevronDown
                    onClick={(e) => {
                      e.stopPropagation();
                      setEshopDropdownOpen((prev) => !prev);
                    }}
                    className={`text-xs xl:text-sm shrink-0 transition-transform duration-200 ${eshopDropdownOpen ? "rotate-180 text-primary-600" : "text-gray-400"
                      }`}
                  />
                </button>
                <AnimatePresence>
                  {eshopDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[580px] xl:w-[620px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-4"
                    >
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 gap-3">
                        <div>
                          <h4 className="text-xs font-extrabold text-navy flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                            SolarKits E-Shop & Applications
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Explore certified complete solar combos, bespoke builders & B2B procurement
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleNavClick("/shop")}
                            className="whitespace-nowrap text-xs font-bold text-primary-600 hover:text-primary-800 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            View Full Catalog <FiArrowRight className="shrink-0" />
                          </button>
                        </div>
                      </div>

                      {/* Photo Section: BROWSE BY SECTOR & APPLICATIONS */}
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1 mb-2.5">
                        Browse by Sector & Applications
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {BROWSE_SECTORS.map((sector) => {
                          const Icon = sector.icon;
                          const isBlue = sector.color === "blue";
                          return (
                            <div
                              key={sector.title}
                              onClick={() => handleNavClick(sector.href || sector.appRoute || "/shop")}
                              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group shadow-2xs ${
                                isBlue
                                  ? "bg-blue-50/60 hover:bg-blue-100/70 border-blue-200/80 hover:border-blue-300"
                                  : "bg-amber-50/60 hover:bg-amber-100/70 border-amber-200/80 hover:border-amber-300"
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                                  isBlue ? "bg-blue-600" : "bg-amber-500"
                                }`}
                              >
                                <Icon size={17} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <p
                                      className={`text-xs font-bold transition-colors ${
                                        isBlue
                                          ? "text-blue-900 group-hover:text-blue-700"
                                          : "text-amber-900 group-hover:text-amber-700"
                                      }`}
                                    >
                                      {sector.title}
                                    </p>
                                    {sector.badge && (
                                      <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                                        {sector.badge}
                                      </span>
                                    )}
                                  </div>
                                  <FiArrowRight
                                    className={`text-xs shrink-0 group-hover:translate-x-0.5 transition-transform ${
                                      isBlue ? "text-blue-500" : "text-amber-500"
                                    }`}
                                  />
                                </div>
                                <p className="text-[10px] text-gray-500 mt-0.5">{sector.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Industry Brochure Tab (New Navlink) ────────────────── */}
              <div
                ref={brochureDropdownRef}
                className="relative shrink-0"
                onMouseEnter={handleMouseEnterBrochure}
                onMouseLeave={handleMouseLeaveBrochure}
              >
                <button
                  onClick={() => handleNavClick("/browse/industry")}
                  className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 xl:px-3.5 py-2 text-xs xl:text-sm font-bold rounded-xl transition-all duration-150 cursor-pointer ${brochureDropdownOpen
                    ? "text-primary-600 bg-primary-50 ring-1 ring-primary-200"
                    : "text-gray-800 hover:text-primary-600 hover:bg-primary-50/80"
                    }`}
                >
                  <FiFileText className="text-sm xl:text-base text-primary-500 shrink-0" />
                  <span className="whitespace-nowrap">Industry Brochure</span>
                  <FiChevronDown
                    className={`text-xs xl:text-sm shrink-0 transition-transform duration-200 ${brochureDropdownOpen ? "rotate-180 text-primary-600" : "text-gray-400"
                      }`}
                  />
                </button>
                <AnimatePresence>
                  {brochureDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute top-full left-0 mt-2 w-[600px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-5"
                    >
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                        <div>
                          <h4 className="text-xs font-extrabold text-navy flex items-center gap-2">
                            <FiFileText className="text-primary-500" size={15} />
                            SolarKits Industry & Tender Brochures
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Explore sector-specific solar brochures, specs & tender configurations
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Section 1: Browse by Industry */}
                        <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <FiGrid size={13} />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-gray-800">Browse by Industry</h5>
                                <p className="text-[10px] text-gray-500">CMS Industry Content</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-gray-600 leading-relaxed mb-3">
                              Explore solutions tailored for residential, commercial, industrial and agricultural sectors.
                            </p>
                            <div className="space-y-1 mb-3">
                              {[
                                { label: "Residential Solar", icon: FiHome },
                                { label: "Commercial Solar", icon: FiBriefcase },
                                { label: "Industrial Solar", icon: FiPackage },
                                { label: "Agricultural Solar", icon: FiSun },
                              ].map((sec) => {
                                const SecIcon = sec.icon;
                                return (
                                  <div
                                    key={sec.label}
                                    onClick={() => handleNavClick("/browse/industry")}
                                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-blue-100/60 transition-colors cursor-pointer text-[11px] font-semibold text-gray-700 hover:text-blue-700"
                                  >
                                    <SecIcon size={12} className="text-blue-500" />
                                    <span>{sec.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <button
                            onClick={() => handleNavClick("/browse/industry")}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Open Industry Catalog</span>
                            <FiArrowRight size={12} />
                          </button>
                        </div>

                        {/* Section 2: Browse by Govt Tender */}
                        <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                                <MdOutlineAccountBalance size={14} />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h5 className="text-xs font-bold text-gray-800">Browse by Govt Tender</h5>
                                  <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                                    New
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-500">Government & PSU Tenders</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-gray-600 leading-relaxed mb-3">
                              Solar kits configured for government tenders, PSU procurement, MNRE schemes and public projects.
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {["MNRE Approved", "GeM Ready", "PSU Compliant", "Subsidy Ready"].map((tag) => (
                                <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100/80 border border-amber-200 text-amber-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handleNavClick("/browse/govt-tender")}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Explore Tender Kits</span>
                            <FiArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Why SolarKits */}
              <button
                onClick={() => handleNavClick("#why-choose")}
                className="whitespace-nowrap shrink-0 inline-flex items-center px-2.5 xl:px-3.5 py-2 text-gray-700 text-xs xl:text-sm font-semibold rounded-xl hover:text-primary-600 hover:bg-primary-50/80 transition-all duration-150 cursor-pointer"
              >
                <span className="whitespace-nowrap">Why SolarKits</span>
              </button>


            </nav>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2 xl:gap-2.5 shrink-0 lg:ml-0 lg:justify-self-end">
              {/* Location / Pincode Selector Pill */}
              <button
                type="button"
                onClick={() => setLocationModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                title="Enter Pincode to view local Best Sellers & Stock"
              >
                <FiMapPin className="text-amber-600 text-sm shrink-0" />
                <span className="truncate max-w-[110px] sm:max-w-[150px]">
                  {selectedDistrict?.name
                    ? `${selectedPincode ? `${selectedPincode} • ` : ""}${selectedDistrict.name}`
                    : "Select PIN"}
                </span>
              </button>

              {isAuthenticated && (
                <>
                  <motion.button
                    onClick={() => navigate("/cart")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-2 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 transition-all border border-primary-200/80 cursor-pointer shrink-0"
                    title="View Shopping Cart"
                  >
                    <FiShoppingCart className="text-base" />
                    {totalCartItems > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                        {totalCartItems}
                      </span>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => navigate("/preconfigured-combo-kit")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3.5 xl:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs xl:text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <FiShoppingBag className="text-sm shrink-0" />
                    <span className="whitespace-nowrap">Go to Store</span>
                  </motion.button>
                </>
              )}
              {!isAuthenticated && (
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => navigate("/auth/signup")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2 sm:px-4 py-2 bg-white hover:bg-blue-50/80 text-[#132a68] border border-blue-300 text-xs sm:text-sm font-bold rounded-full transition-all shadow-2xs cursor-pointer"
                  >
                    <FiUserPlus className="hidden sm:block text-sm shrink-0 text-[#132a68]" />
                    <span className="whitespace-nowrap">Sign Up</span>
                  </motion.button>
                  <motion.button
                    onClick={() => navigate("/auth/login")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2 sm:px-4 py-2 bg-[#132a68] hover:bg-[#0c1d4a] text-white text-xs sm:text-sm font-bold rounded-full transition-all shadow-sm cursor-pointer"
                  >
                    <FiUser className="hidden sm:block text-sm shrink-0" />
                    <span className="whitespace-nowrap">Login</span>
                  </motion.button>
                </div>
              )}
              <motion.button
                onClick={() => setMenuOpen(!menuOpen)}
                whileTap={{ scale: 0.92 }}
                className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 shrink-0"
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
              >
                {menuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>
      <PincodeLocationModal isOpen={locationModalOpen} onClose={() => setLocationModalOpen(false)} />
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-navy/50 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              id="mobile-navigation"
              className="fixed top-0 right-0 bottom-0 w-[336px] max-w-[90vw] bg-white z-50 overflow-y-auto shadow-2xl flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <img src={logo} alt="SolarKits" className="h-8 w-auto" />
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <FiX className="text-xl" />
                </button>
              </div>
              <div className="p-4 space-y-4 flex-1">
                <button
                  onClick={() => handleNavClick("#hero")}
                  className="w-full flex items-center justify-between p-3 text-gray-800 font-bold text-sm hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all bg-gray-50/70 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <FiHome className="text-primary-500 text-base shrink-0" />
                    Home
                  </span>
                  <FiChevronRight className="text-gray-400 text-sm shrink-0" />
                </button>
                {/* ── E-Shop & Solar Kits — mobile ── */}
                <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-gray-50/40">
                  <button
                    onClick={() => setMobileEshopExpanded(!mobileEshopExpanded)}
                    className="w-full flex items-center justify-between p-3.5 text-navy font-extrabold text-sm bg-primary-50/80 hover:bg-primary-100/70 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <FiShoppingBag className="text-primary-600 text-base shrink-0" />
                      E-Shop & Solar Kits
                      <span className="bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                        All Kits
                      </span>
                    </span>
                    <FiChevronDown
                      className={`text-gray-500 transition-transform duration-200 shrink-0 ${mobileEshopExpanded ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                  {mobileEshopExpanded && (
                    <div className="p-2 space-y-1 bg-white border-t border-gray-100">
                      <button
                        onClick={() => handleNavClick("/shop")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-primary-50 text-left transition-colors cursor-pointer bg-primary-50/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FiShoppingBag className="text-primary-600 text-base shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-gray-800">Visit E-Shop Catalog</p>
                            <p className="text-[10px] text-gray-500">Explore complete solar combo kits</p>
                          </div>
                        </div>
                        <FiChevronRight className="text-primary-400 shrink-0" size={14} />
                      </button>

                      <button
                        onClick={() => handleNavClick("/browse/industry")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors cursor-pointer bg-blue-50/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FiGrid className="text-blue-600 text-base shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-gray-800">Browse SolarKits by Industry</p>
                            <p className="text-[10px] text-gray-500">CMS Industry Content</p>
                          </div>
                        </div>
                        <FiChevronRight className="text-blue-400 shrink-0" size={14} />
                      </button>

                      <button
                        onClick={() => handleNavClick("/browse/govt-tender")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 text-left transition-colors cursor-pointer bg-amber-50/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MdOutlineAccountBalance className="text-amber-500 text-base shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-gray-800">Browse by Govt Tender</p>
                            <p className="text-[10px] text-gray-500">PSU & Scheme Tenders</p>
                          </div>
                        </div>
                        <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          New
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Industry Brochure — mobile ── */}
                <div className="border border-blue-200/80 rounded-2xl overflow-hidden bg-blue-50/30">
                  <button
                    onClick={() => setMobileBrochureExpanded(!mobileBrochureExpanded)}
                    className="w-full flex items-center justify-between p-3.5 text-blue-900 font-extrabold text-sm bg-blue-50/80 hover:bg-blue-100/70 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <FiFileText className="text-blue-600 text-base shrink-0" />
                      Industry Brochure
                    </span>
                    <FiChevronDown
                      className={`text-gray-500 transition-transform duration-200 shrink-0 ${mobileBrochureExpanded ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                  {mobileBrochureExpanded && (
                    <div className="p-2 space-y-1 bg-white border-t border-blue-100">
                      <button
                        onClick={() => handleNavClick("/browse/industry")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FiGrid className="text-blue-600 text-base shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-gray-800">Browse SolarKits by Industry</p>
                            <p className="text-[10px] text-gray-400">Residential, Commercial, Industrial, Agri</p>
                          </div>
                        </div>
                        <FiChevronRight className="text-gray-400 shrink-0" size={13} />
                      </button>
                      <button
                        onClick={() => handleNavClick("/browse/govt-tender")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MdOutlineAccountBalance className="text-amber-500 text-base shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-gray-800">Browse by Govt Tender</p>
                            <p className="text-[10px] text-gray-400">PSU, MNRE & GeM tender kits</p>
                          </div>
                        </div>
                        <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          New
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {NAV_LINKS.slice(1).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleNavClick(item.href)}
                        className="w-full flex items-center justify-between p-3 text-gray-700 font-semibold text-sm hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 whitespace-nowrap">
                          <Icon className="text-gray-400 text-base shrink-0" />
                          {item.label}
                        </span>
                        <FiChevronRight className="text-gray-400 text-sm shrink-0" />
                      </button>
                    );
                  })}
                </div>
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 border border-amber-300 shadow-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
                    <FiBriefcase className="text-amber-600 text-base shrink-0" />
                    <span className="whitespace-nowrap">Franchisee & Reseller Network</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 mb-3 leading-relaxed">
                    Earn high profit margins with exclusive territory rights and Tier-1 brand supply.
                  </p>
                  <button
                    onClick={handleFranchiseRedirect}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>Become Franchise Partner</span>
                    <FiExternalLink className="text-xs shrink-0" />
                  </button>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50/60 space-y-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/preconfigured-combo-kit");
                    }}
                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <FiShoppingBag className="shrink-0" />
                    <span>Open Store Dashboard</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/auth/signup");
                      }}
                      className="w-full py-2.5 bg-white hover:bg-blue-50/80 text-[#132a68] border border-blue-300 font-bold rounded-full text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <FiUserPlus className="shrink-0 text-[#132a68]" />
                      <span>Sign Up</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/auth/login");
                      }}
                      className="w-full py-2.5 bg-[#132a68] hover:bg-[#0c1d4a] text-white font-bold rounded-full text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <FiUser className="shrink-0" />
                      <span>Login</span>
                    </button>
                  </div>
                )}
                <div className="pt-2 text-center">
                  <a
                    href="tel:1800XXXXXXX"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-primary-600 whitespace-nowrap"
                  >
                    <FiPhone className="text-primary-500 shrink-0" />
                    Helpline: 1800-XXX-XXXX
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
