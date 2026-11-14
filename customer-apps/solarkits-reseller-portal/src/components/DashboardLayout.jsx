import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate, Outlet, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiZap,
  FiVideo,
  FiHome,
  FiShield,
  FiMapPin,
  FiPackage,
  FiUsers,
  FiShoppingCart,
  FiCreditCard,
  FiLogOut,
  FiCheckCircle,
  FiAlertCircle,
  FiBell,
  FiX,
  FiBox,
  FiTag,
  FiMenu,
  FiMoon,
  FiSun,
  FiChevronDown,
  FiKey,
  FiTool,
  FiFileText,
  FiCalendar,
  FiPercent,
} from "react-icons/fi";
import api from "../services/api";
import logoImg from "@/assets/images/logo.png";
import PinSetupModal from "./PinSetupModal";
import FranchisePaymentPopup from "./FranchisePaymentPopup";

const NAV_ITEMS = [
  { name: "Home", icon: FiHome, path: "/dashboard" },
  { name: "Browse Products", icon: FiPackage, path: "/catalog" },
  { name: "My Listings", icon: FiTag, path: "/storefront-listings" },
  {
    name: "EPC Quotes",
    icon: FiFileText,
    children: [
      { name: "All Quotes", icon: FiFileText, path: "/epc-quotes" },
      { name: "Quote Follow-ups", icon: FiCalendar, path: "/epc-quote-followups" },
    ],
  },
  {
    name: "My Orders",
    icon: FiShoppingCart,
    children: [
      { name: "PO Orders", icon: FiBox, path: "/po-order" },
      { name: "Loose Orders", icon: FiTag, path: "/loose-order" },
    ],
  },
  { name: "My Buyers", icon: FiUsers, path: "/epc-buyers" },
  { name: "Orders & Tracking", icon: FiShoppingCart, path: "/orders" },
  { name: "My Commission", icon: FiPercent, path: "/my-commission" },
  { name: "My Earnings", icon: FiCreditCard, path: "/wallet" },
  { name: "Service Tickets", icon: FiTool, path: "/service-tickets" },
  { name: "Knowledge Center", icon: FiVideo, path: "/knowledge-center" },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reseller, setReseller] = useState(() => {
    try {
      const saved = localStorage.getItem("reseller_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState("setup");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("reseller_theme") === "dark");
  const [expandedMenus, setExpandedMenus] = useState({ "My Orders": true, "MyOrders": true });
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const token = localStorage.getItem("reseller_token");

  // Prompt franchise partner to set up 4-digit PIN if not already configured
  useEffect(() => {
    if (reseller && reseller.activation_status === "active") {
      const isDismissed = sessionStorage.getItem("reseller_pin_modal_dismissed");
      if (reseller.is_pin_set === false && !isDismissed) {
        const timer = setTimeout(() => {
          setPinModalMode("setup");
          setShowPinModal(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [reseller]);

  // Auto-expand menu if active path is inside a submenu
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => child.path === location.pathname);
        if (hasActiveChild) {
          setExpandedMenus((prev) => ({ ...prev, [item.name]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleSubMenu = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  // Theme management
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("reseller_theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchMe = useCallback(() => {
    if (!token) return;
    api.get('/india/v1/reseller/auth/me')
      .then((res) => {
        if (res.data?.status === "success") {
          const userData = res.data.data || res.data.user;
          if (userData) {
            setReseller((prev) => {
              if (prev && JSON.stringify(prev) === JSON.stringify(userData)) return prev;
              localStorage.setItem("reseller_user", JSON.stringify(userData));
              return userData;
            });
          }
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("reseller_token");
          navigate("/login");
        }
      });
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchMe();
    const timer = setInterval(fetchMe, 5000);
    return () => clearInterval(timer);
  }, [token, fetchMe, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("reseller_token");
    localStorage.removeItem("reseller_user");
    navigate("/login");
  };

  // Redirect unactivated partners out of the dashboard layout to the standalone Onboarding portal
  if (reseller && reseller.activation_status !== "active") {
    return <Navigate to="/onboarding" replace />;
  }

  const rawAllowed = reseller?.order_type_allowed || reseller?.active_subscription?.plan_id?.order_type_allowed || "po_order";
  const allowedOrderTypes = Array.isArray(rawAllowed)
    ? rawAllowed
    : typeof rawAllowed === "string"
      ? (rawAllowed === "both" ? ["po_order", "loose_order"] : rawAllowed.split(",").map((s) => s.trim()))
      : ["po_order"];

  const hasLoose = allowedOrderTypes.includes("loose_order");
  const hasCombinePo = allowedOrderTypes.includes("combine_po_order");
  const hasSinglePo = allowedOrderTypes.includes("po_order");
  const hasAnyPo = hasSinglePo || hasCombinePo;

  const filteredNav = NAV_ITEMS.map((item) => {
    if (item.name === "My Orders" && item.children) {
      let filteredChildren = [];
      if (hasAnyPo) {
        const poLabel = hasCombinePo && !hasSinglePo ? "Combine PO Orders" : "PO Orders";
        filteredChildren.push({ name: poLabel, icon: FiBox, path: "/po-order" });
      }
      if (hasLoose) {
        filteredChildren.push({ name: "Loose Orders", icon: FiTag, path: "/loose-order" });
      }
      if (filteredChildren.length === 0) {
        filteredChildren.push({ name: "PO Orders", icon: FiBox, path: "/po-order" });
      }
      return { ...item, children: filteredChildren };
    }
    return item;
  }).filter(
    (item) => !(item.path === "/kyc" && reseller?.kyc_status === "verified")
  );

  const getInitials = (name) => {
    if (!name) return "FP";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const primaryName = reseller?.contact_person || reseller?.business_name || "Franchise Partner";
  const companyName = reseller?.business_name || "Partner Enterprise";
  const userInitials = getInitials(primaryName);

  const avatarUrl = primaryName
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(primaryName)}&background=253880&color=ffffff&bold=true`
    : null;

  return (
    <div className="h-screen flex font-sans antialiased overflow-hidden" style={{ background: "var(--color-bg)", color: "var(--color-text-primary)" }}>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || !isMobile) && (
          <motion.aside
            key="sidebar"
            initial={{ x: isMobile ? "-100%" : 0 }}
            animate={{ x: 0 }}
            exit={{ x: isMobile ? "-100%" : 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`flex flex-col shrink-0 shadow-lg ${isMobile
              ? "fixed top-0 left-0 h-screen z-50 w-64"
              : "sticky top-0 h-screen w-60 z-30"
              }`}
            style={{
              background: "var(--color-surface)",
              borderRight: "1px solid var(--color-border)",
            }}
          >
            {/* Logo */}
            <div
              className="flex items-center justify-center p-4 min-h-[100px] shrink-0"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <img src={logoImg} alt="SolarKits Logo" className="w-28 h-auto" />
            </div>

            {/* Reseller info + Verified Partner badge */}
            {reseller && (
              <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div
                  className="px-3 py-2 rounded-xl flex items-center gap-2"
                  style={{ background: "var(--color-bg)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-xs font-black truncate"
                      style={{ color: "var(--color-text-primary)" }}
                      title={primaryName}
                    >
                      {primaryName}
                    </div>
                    {reseller.contact_person && reseller.business_name && (
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {companyName}
                      </div>
                    )}
                    <div
                      className="text-[10px] font-semibold flex items-center gap-1 mt-0.5"
                      style={{
                        color: reseller.kyc_status === "verified" ? "#16a34a" : "#f59e0b",
                      }}
                    >
                      {reseller.kyc_status === "verified" ? (
                        <><FiCheckCircle size={9} /> Verified Partner</>
                      ) : (
                        <><FiAlertCircle size={9} /> KYC Pending</>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Order CTA */}
                <Link
                  to="/catalog"
                  className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all hover:opacity-90"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <FiShoppingCart size={12} /> Quick Order
                </Link>
              </div>
            )}

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto scrollbar-hover py-2 min-h-0">
              <ul className="px-2 space-y-1">
                {filteredNav.map((item, idx) => {
                  const itemKey = item.path || item.name || `nav-${idx}`;

                  // Nested Accordion Menu
                  if (item.children && Array.isArray(item.children)) {
                    const Icon = item.icon || FiShoppingCart;
                    const isAnyChildActive = item.children.some((c) => location.pathname === c.path);
                    const isOpen = Boolean(expandedMenus[item.name]);

                    return (
                      <li key={itemKey} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleSubMenu(item.name)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${isAnyChildActive ? "text-primary font-bold bg-primary/10" : ""
                            }`}
                          style={
                            !isAnyChildActive
                              ? {
                                color: "var(--color-text-secondary)",
                                background: "transparent",
                              }
                              : {}
                          }
                          onMouseEnter={(e) => {
                            if (!isAnyChildActive) {
                              e.currentTarget.style.background = "var(--color-surface-hover)";
                              e.currentTarget.style.color = "var(--color-text-primary)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isAnyChildActive) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "var(--color-text-secondary)";
                            }
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              size={17}
                              style={{ color: isAnyChildActive ? "var(--color-primary)" : "var(--color-text-muted)" }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <FiChevronDown
                            size={15}
                            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            style={{ color: "var(--color-text-muted)" }}
                          />
                        </button>

                        {/* Sub-menu items */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.ul
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="pl-3 pr-1 space-y-1 overflow-hidden"
                            >
                              {item.children.map((child, cIdx) => {
                                const ChildIcon = child.icon || FiBox;
                                const isChildActive = location.pathname === child.path;
                                const childKey = child.path || child.name || `child-${cIdx}`;

                                return (
                                  <li key={childKey}>
                                    <Link
                                      to={child.path}
                                      onClick={() => isMobile && setSidebarOpen(false)}
                                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${isChildActive ? "btn-primary text-white" : ""
                                        }`}
                                      style={
                                        !isChildActive
                                          ? {
                                            color: "var(--color-text-secondary)",
                                            background: "transparent",
                                          }
                                          : {}
                                      }
                                      onMouseEnter={(e) => {
                                        if (!isChildActive) {
                                          e.currentTarget.style.background = "var(--color-surface-hover)";
                                          e.currentTarget.style.color = "var(--color-text-primary)";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isChildActive) {
                                          e.currentTarget.style.background = "transparent";
                                          e.currentTarget.style.color = "var(--color-text-secondary)";
                                        }
                                      }}
                                    >
                                      <ChildIcon
                                        size={14}
                                        style={isChildActive ? { color: "white" } : { color: "var(--color-primary)" }}
                                      />
                                      <span>{child.name}</span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  }

                  // Regular Flat Menu Item
                  const Icon = item.icon || FiBox;
                  const isActive = location.pathname === item.path;

                  return (
                    <li key={itemKey}>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Link
                          to={item.path}
                          onClick={() => isMobile && setSidebarOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive ? "btn-primary text-white" : ""
                            }`}
                          style={
                            !isActive
                              ? {
                                color: "var(--color-text-secondary)",
                                background: "transparent",
                              }
                              : {}
                          }
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = "var(--color-surface-hover)";
                              e.currentTarget.style.color = "var(--color-text-primary)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "var(--color-text-secondary)";
                            }
                          }}
                        >
                          <Icon
                            size={17}
                            style={isActive ? { color: "white" } : { color: "var(--color-primary)" }}
                          />
                          <span>{item.name}</span>
                        </Link>
                      </motion.div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Logout */}
            <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                style={{
                  color: "var(--color-danger)",
                  background: "var(--color-danger-soft)",
                  border: "1px solid #fca5a520",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--gradient-danger)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--color-danger-soft)";
                  e.currentTarget.style.color = "var(--color-danger)";
                }}
              >
                <FiLogOut size={15} />
                Logout Franchisee
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Header - matches EPC Solar dashboard style */}
        <header
          className="shrink-0 flex items-center justify-between px-6 py-3 relative z-30 transition-colors duration-200"
          style={{
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-xs)",
            minHeight: "64px",
          }}
        >
          {/* Left - Mobile toggle + Brand title */}
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
                style={{ color: "var(--color-text-primary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <FiMenu size={20} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#16a34a" }}
              />
              <span
                className="font-bold text-sm hidden sm:block"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Franchisee Business Portal
              </span>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            {/* KYC Status Badge */}
            {reseller && (
              <span
                className="hidden sm:flex px-3 py-1 rounded-full text-xs font-extrabold capitalize items-center gap-1.5"
                style={
                  reseller.kyc_status === "verified"
                    ? { background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac" }
                    : reseller.kyc_status === "submitted"
                      ? { background: "#f0f9ff", color: "#0ea5e9", border: "1px solid #7dd3fc" }
                      : { background: "#fffbeb", color: "#d97706", border: "1px solid #fcd34d" }
                }
              >
                {reseller.kyc_status === "verified" ? (
                  <FiCheckCircle size={12} />
                ) : (
                  <FiAlertCircle size={12} />
                )}
                KYC: {reseller.kyc_status}
              </span>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark((d) => !d)}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
              style={{ color: "var(--color-text-primary)" }}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {isDark ? (
                <FiSun style={{ color: "var(--color-warning)" }} size={18} />
              ) : (
                <FiMoon style={{ color: "var(--color-primary)" }} size={18} />
              )}
            </button>

            {/* Notification Bell */}
            {reseller && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotif((v) => !v)}
                  className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors relative"
                  style={{ color: "var(--color-text-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <FiBell size={18} />
                  {reseller.kyc_status === "verified" && (
                    <span
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2"
                      style={{
                        background: "#16a34a",
                        borderColor: "var(--color-surface)",
                      }}
                    />
                  )}
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotif && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-80 rounded-2xl shadow-2xl p-4 z-50 space-y-3"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div
                        className="flex items-center justify-between pb-2"
                        style={{ borderBottom: "1px solid var(--color-border)" }}
                      >
                        <div
                          className="font-bold text-xs uppercase tracking-wider"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Account Notifications
                        </div>
                        <button
                          onClick={() => setShowNotif(false)}
                          style={{ color: "var(--color-text-muted)" }}
                          className="hover:opacity-70 cursor-pointer"
                        >
                          <FiX size={16} />
                        </button>
                      </div>

                      {reseller.kyc_status === "verified" ? (
                        <div
                          className="p-3 rounded-xl text-xs space-y-1"
                          style={{
                            background: "#f0fdf4",
                            border: "1px solid #86efac",
                            color: "#14532d",
                          }}
                        >
                          <div className="font-black flex items-center gap-1">🎉 KYC Approved!</div>
                          <p className="font-medium text-[11px]">
                            Your business identity documents have been approved. Account is 100% verified.
                          </p>
                        </div>
                      ) : reseller.kyc_status === "submitted" ? (
                        <div
                          className="p-3 rounded-xl text-xs space-y-1"
                          style={{
                            background: "#f0f9ff",
                            border: "1px solid #7dd3fc",
                            color: "#0c4a6e",
                          }}
                        >
                          <div className="font-black">KYC Under Review</div>
                          <p className="font-medium text-[11px]">
                            Admin team is verifying your submitted documents.
                          </p>
                        </div>
                      ) : (
                        <div
                          className="p-3 rounded-xl text-xs space-y-1"
                          style={{
                            background: "#fffbeb",
                            border: "1px solid #fcd34d",
                            color: "#78350f",
                          }}
                        >
                          <div className="font-black">Action Required</div>
                          <p className="font-medium text-[11px]">
                            Please upload PAN and Shop photo to complete KYC verification.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* User Avatar & Menu */}
            {reseller && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <img
                    src={avatarUrl}
                    alt={primaryName}
                    className="w-9 h-9 rounded-full"
                    style={{ border: "2px solid var(--color-border)" }}
                  />
                  <div className="hidden sm:block text-left">
                    <p
                      className="text-sm font-extrabold leading-tight"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {primaryName}
                    </p>
                    <p
                      className="text-xs leading-tight truncate max-w-[150px] font-medium"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {reseller.contact_person && reseller.business_name ? reseller.business_name : reseller.email}
                    </p>
                  </div>
                  <FiChevronDown
                    size={14}
                    style={{ color: "var(--color-text-muted)" }}
                    className="hidden sm:block"
                  />
                </button>

                {/* User Dropdown */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-[calc(100%+10px)] rounded-2xl shadow-2xl py-2 z-50 w-64"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {/* Header Profile Info */}
                      <div className="px-4 py-3 border-b space-y-1" style={{ borderColor: "var(--color-border)" }}>
                        <div className="font-extrabold text-xs text-slate-900 flex items-center justify-between">
                          <span>{primaryName}</span>
                        </div>
                        {reseller.contact_person && reseller.business_name && (
                          <div className="text-[11px] font-bold text-[#253880] truncate">
                            🏢 {reseller.business_name}
                          </div>
                        )}
                        <div className="text-[11px] truncate text-slate-500 font-medium">
                          ✉️ {reseller.email}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"
                            style={{
                              background: reseller.kyc_status === "verified" ? "#dcfce7" : "#fef3c7",
                              color: reseller.kyc_status === "verified" ? "#166534" : "#92400e",
                            }}
                          >
                            <FiCheckCircle size={10} />
                            KYC {reseller.kyc_status === "verified" ? "Verified" : "Pending"}
                          </span>
                        </div>
                      </div>

                      {/* Shifted Account Links */}
                      <div className="py-1">
                        {/* <Link
                          to="/plans"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors"
                          style={{ color: "var(--color-text-primary)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <FiZap size={15} className="text-blue-600" />
                          <span>Subscription Plans</span>
                        </Link> */}

                        <Link
                          to="/territories"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors"
                          style={{ color: "var(--color-text-primary)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <FiMapPin size={15} className="text-blue-600" />
                          <span>My Territories</span>
                        </Link>

                        <Link
                          to="/kyc"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors"
                          style={{ color: "var(--color-text-primary)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <FiShield size={15} className="text-blue-600" />
                          <span>KYC & Compliance</span>
                        </Link>

                        {/* 4-Digit Security PIN Management */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            setPinModalMode(reseller?.is_pin_set ? "change" : "setup");
                            setShowPinModal(true);
                          }}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer text-left"
                          style={{ color: "var(--color-text-primary)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div className="flex items-center gap-3">
                            <FiKey size={15} className="text-amber-500" />
                            <span>4-Digit Security PIN</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${reseller?.is_pin_set
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                              }`}
                          >
                            {reseller?.is_pin_set ? "Active" : "Set PIN"}
                          </span>
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer"
                          style={{ color: "var(--color-danger)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "var(--color-surface-hover)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <FiLogOut size={15} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-hover min-h-0" style={{ background: "var(--color-bg)" }}>
          <Outlet context={{ reseller, refreshUser: fetchMe, allowedOrderType: allowedOrderTypes, allowedOrderTypes }} />
        </main>
      </div>

      {/* 4-Digit Security PIN Setup / Update Modal */}
      <PinSetupModal
        isOpen={showPinModal}
        isChangeMode={pinModalMode === "change"}
        user={reseller}
        onClose={() => setShowPinModal(false)}
        onSuccess={(updated) => {
          setReseller(updated);
          fetchMe();
        }}
      />

      {/* Real-time ICICI E-Collection Payment Alerts for Franchise Partner */}
      <FranchisePaymentPopup resellerId={reseller?._id || reseller?.id} />
    </div>
  );
}
