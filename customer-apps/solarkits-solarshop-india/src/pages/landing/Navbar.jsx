import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiArrowRight,
  FiChevronRight,
  FiExternalLink,
  FiShoppingBag,
  FiUsers,
  FiLayers,
  FiCheckCircle,
  FiHelpCircle,
  FiHome,
  FiGrid,
} from "react-icons/fi";
import logo from "../../assets/images/logo.png";

const NAV_SECTIONS = [
  { label: "Home", href: "/", icon: FiHome },
  { label: "Industry Solutions", href: "/industries", icon: FiGrid, badge: "Showcase" },
  { label: "Products", href: "#products", icon: FiLayers },
  { label: "Why SolarKits", href: "#why-choose", icon: FiCheckCircle },
  { label: "How It Works", href: "#how-it-works", icon: FiHelpCircle },
];

const EXTERNAL_LINKS = [
  {
    label: "Solar Shop",
    href: "https://store.solarkits.in/",
    badge: "Store",
    badgeColor: "#16a34a",
    badgeBg: "#dcfce7",
    icon: FiShoppingBag,
  },
  {
    label: "Become Franchisee",
    href: "https://franchise.solarkits.in/",
    badge: "Partner",
    badgeColor: "#2563eb",
    badgeBg: "#dbeafe",
    icon: FiUsers,
  },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll detection for backdrop styling & active section highlight
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      if (location.pathname === "/industries" || location.pathname.startsWith("/industries/")) {
        setActiveSection("industries");
        return;
      }

      // Simple active section detector
      const sections = ["hero", "products", "why-choose", "how-it-works"];
      const scrollPos = window.scrollY + 140;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    if (location.pathname === "/industries" || location.pathname.startsWith("/industries/")) {
      setActiveSection("industries");
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [menuOpen]);

  const handleNavClick = (href) => {
    setMenuOpen(false);

    if (href === "/") {
      if (location.pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveSection("hero");
      } else {
        navigate("/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (href.startsWith("#")) {
      const sectionId = href.substring(1);
      if (location.pathname === "/") {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          setActiveSection(sectionId);
        }
      } else {
        navigate(`/${href}`);
      }
      return;
    }

    if (href.startsWith("http://") || href.startsWith("https://")) {
      let targetHref = href;
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      if (isLocal) {
        if (href.includes("store.solarkits.in")) {
          targetHref = import.meta.env.VITE_STORE_URL || "http://localhost:5179";
        } else if (href.includes("franchise.solarkits.in")) {
          targetHref = import.meta.env.VITE_FRANCHISE_URL || "http://localhost:5178";
        }
      }
      window.open(targetHref, "_blank", "noopener,noreferrer");
      return;
    }

    navigate(href);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          background: scrolled
            ? "rgba(255, 255, 255, 0.96)"
            : "rgba(255, 255, 255, 0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: scrolled
            ? "1px solid rgba(203, 213, 225, 0.8)"
            : "1px solid rgba(226, 232, 240, 0.6)",
          boxShadow: scrolled
            ? "0 8px 30px rgba(15, 23, 42, 0.08)"
            : "0 2px 14px rgba(15, 23, 42, 0.03)",
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            padding: "0 28px",
            height: "74px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          {/* Brand Logo */}
          <div
            onClick={() => {
              setMenuOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            <img
              src={logo}
              alt="SolarKits India"
              style={{
                height: "36px",
                width: "auto",
                objectFit: "contain",
                display: "block",
                transition: "transform 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </div>

          {/* Desktop Center Navigation Menu */}
          <nav
            className="landing-hide-mobile hidden lg:flex items-center gap-1.5"
            style={{
              background: "rgba(241, 245, 249, 0.65)",
              padding: "4px 6px",
              borderRadius: "100px",
              border: "1px solid rgba(226, 232, 240, 0.8)",
            }}
          >
            {/* Main Section Anchor Links */}
            {NAV_SECTIONS.map((link) => {
              const isCurrent =
                (link.href === "/industries" && (location.pathname === "/industries" || location.pathname.startsWith("/industries/"))) ||
                (link.href === "/" && location.pathname === "/" && activeSection === "hero") ||
                (link.href.startsWith("#") && location.pathname === "/" && activeSection === link.href.substring(1));

              return (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  style={{
                    background: isCurrent ? "#ffffff" : "transparent",
                    color: isCurrent ? "#1e40af" : "#475569",
                    fontWeight: isCurrent ? 700 : 600,
                    boxShadow: isCurrent
                      ? "0 2px 8px rgba(15, 23, 42, 0.08)"
                      : "none",
                    border: "none",
                    borderRadius: "100px",
                    padding: "8px 16px",
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.color = "#0f172a";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.color = "#475569";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        color: isCurrent ? "#1e40af" : "#2563eb",
                        background: isCurrent ? "rgba(37, 99, 235, 0.12)" : "#dbeafe",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}


            {/* Divider */}
            <div
              style={{
                width: "1px",
                height: "20px",
                background: "#cbd5e1",
                margin: "0 2px",
              }}
            />

            {/* External Links inside Navigation Pill */}
            {EXTERNAL_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                style={{
                  background: "transparent",
                  color: "#334155",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "100px",
                  padding: "8px 14px",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#1e40af";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#334155";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{link.label}</span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: link.badgeColor,
                    background: link.badgeBg,
                    padding: "2px 7px",
                    borderRadius: "20px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {link.badge}
                </span>
                <FiExternalLink style={{ fontSize: "0.75rem", opacity: 0.6 }} />
              </button>
            ))}
          </nav>

          {/* Desktop Right Action Buttons */}
          <div
            className="landing-hide-mobile hidden lg:flex items-center gap-2.5 flex-shrink-0"
          >


            {/* Primary Action Button */}
            <motion.button
              onClick={() => handleNavClick("#products")}
              whileHover={{
                scale: 1.03,
                boxShadow: "0 8px 24px rgba(30, 64, 175, 0.28)",
              }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "9px 22px",
                background:
                  "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                color: "#ffffff",
                borderRadius: "10px",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                boxShadow: "0 4px 14px rgba(30, 64, 175, 0.22)",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Explore Kits <FiArrowRight style={{ fontSize: "0.9rem" }} />
            </motion.button>
          </div>

          {/* Mobile Menu Button - STRICTLY hidden on desktop */}
          <motion.button
            onClick={() => setMenuOpen(!menuOpen)}
            className="landing-show-mobile flex lg:hidden items-center justify-center"
            whileTap={{ scale: 0.92 }}
            aria-label="Toggle Mobile Navigation"
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              borderRadius: "10px",
              width: "42px",
              height: "42px",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            {menuOpen ? (
              <FiX style={{ fontSize: "1.35rem", color: "#1e40af" }} />
            ) : (
              <FiMenu style={{ fontSize: "1.35rem", color: "#0f172a" }} />
            )}
          </motion.button>
        </div>
      </motion.header>

      {/* Mobile Menu Drawer & Backdrop */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.5)",
                backdropFilter: "blur(6px)",
                zIndex: 998,
              }}
            />

            {/* Floating Mobile Drawer Card */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              style={{
                position: "fixed",
                top: "84px",
                left: "16px",
                right: "16px",
                maxHeight: "calc(100vh - 100px)",
                overflowY: "auto",
                zIndex: 999,
                background: "#ffffff",
                borderRadius: "20px",
                boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
                padding: "20px",
                border: "1px solid rgba(226, 232, 240, 0.95)",
              }}
            >
              {/* Section links */}
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "8px",
                    paddingLeft: "8px",
                  }}
                >
                  Quick Navigation
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {NAV_SECTIONS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.label}
                        onClick={() => handleNavClick(link.href)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "12px 14px",
                          background: "#f8fafc",
                          border: "1px solid #f1f5f9",
                          borderRadius: "12px",
                          color: "#1e293b",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Icon style={{ color: "#3b82f6" }} />
                          <span>{link.label}</span>
                          {link.badge && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                color: "#2563eb",
                                background: "#dbeafe",
                                padding: "1px 6px",
                                borderRadius: "8px",
                              }}
                            >
                              {link.badge}
                            </span>
                          )}
                        </span>
                        <FiChevronRight style={{ color: "#94a3b8" }} />
                      </button>
                    );
                  })}

                </div>
              </div>

              {/* External Links */}
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "8px",
                    paddingLeft: "8px",
                  }}
                >
                  Portals & Stores
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {EXTERNAL_LINKS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.label}
                        onClick={() => handleNavClick(link.href)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "12px 14px",
                          background: "#f8fafc",
                          border: "1px solid #f1f5f9",
                          borderRadius: "12px",
                          color: "#1e293b",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Icon style={{ color: link.badgeColor }} />
                          {link.label}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: link.badgeColor,
                            background: link.badgeBg,
                            padding: "2px 8px",
                            borderRadius: "12px",
                          }}
                        >
                          {link.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleNavClick("#products");
                  }}
                  style={{
                    width: "100%",
                    height: "46px",
                    background:
                      "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                    color: "#ffffff",
                    borderRadius: "12px",
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    boxShadow: "0 6px 20px rgba(30, 64, 175, 0.25)",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  Explore Kits <FiArrowRight style={{ fontSize: "0.95rem" }} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
