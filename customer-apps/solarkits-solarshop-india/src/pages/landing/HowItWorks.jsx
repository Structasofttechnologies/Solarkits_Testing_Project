import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiMapPin, FiShoppingCart, FiTruck, FiCheckCircle } from "react-icons/fi";

const DEFAULT_STEPS = [
  { step: "01", icon: FiMapPin, title: "Choose Your System Capacity", description: "Select the required kilowatt size (1kW to 10kW+) based on your monthly electricity consumption.", color: "#253880", bg: "#eff6ff", border: "#bfdbfe" },
  { step: "02", icon: FiShoppingCart, title: "Customize Components & BOM", description: "Pick your preferred inverter brand, panel wattage, and battery backup storage capacity.", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { step: "03", icon: FiTruck, title: "Express Hub Dispatch", description: "Your complete package is pre-assembled, tested, and dispatched from our regional hub within 48 hours.", color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
  { step: "04", icon: FiCheckCircle, title: "Site Delivery & Quick Setup", description: "Receive everything in one shipment with color-coded wiring guides for hassle-free assembly.", color: "#15803d", bg: "#f0fdf4", border: "#86efac" },
];

export default function HowItWorks({ howItWorksConfig }) {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true); },
      { threshold: 0.18 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const badgeText = howItWorksConfig?.badge_text || "SIMPLE PROCESS";
  const heading = howItWorksConfig?.heading || "How to Order Your Solar Kit in 4 Easy Steps";
  const subtitle = howItWorksConfig?.subtitle || "From selecting the right capacity to site delivery and assembly in four easy steps.";
  const steps = howItWorksConfig?.steps && howItWorksConfig.steps.length > 0 ? howItWorksConfig.steps : DEFAULT_STEPS;

  const iconOptions = [FiMapPin, FiShoppingCart, FiTruck, FiCheckCircle];
  const colorOptions = ["#253880", "#d97706", "#0d9488", "#15803d"];
  const bgOptions = ["#eff6ff", "#fffbeb", "#f0fdfa", "#f0fdf4"];
  const borderOptions = ["#bfdbfe", "#fde68a", "#99f6e4", "#86efac"];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      style={{ background: "#f0f6ff", padding: "96px 28px", position: "relative", overflow: "hidden" }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 30 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: "72px" }}
        >
          <div style={{ display: "inline-block", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: "50px", padding: "5px 14px", marginBottom: "16px" }}>
            <span style={{ color: "#7c3aed", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em" }}>
              {badgeText}
            </span>
          </div>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 800, color: "#0f172a",
            fontFamily: "'Outfit', sans-serif", marginBottom: "16px", lineHeight: 1.2,
          }}>
            {heading}
          </h2>
          {subtitle && (
            <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "540px", margin: "0 auto", lineHeight: 1.7 }}>
              {subtitle}
            </p>
          )}
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", position: "relative" }}>
          {/* Connector line — desktop */}
          <div className="landing-hide-mobile" style={{
            position: "absolute", top: "52px",
            left: "calc(12.5% + 26px)", right: "calc(12.5% + 26px)",
            height: "2px",
            background: "linear-gradient(90deg, #bfdbfe, #fde68a, #99f6e4, #86efac)",
            pointerEvents: "none", zIndex: 0, borderRadius: "2px",
          }} />

          {steps.map((item, i) => {
            const IconComponent = item.icon || iconOptions[i % iconOptions.length];
            const color = item.color || colorOptions[i % colorOptions.length];
            const bg = item.bg || bgOptions[i % bgOptions.length];
            const border = item.border || borderOptions[i % borderOptions.length];

            return (
              <motion.div
                key={item.step || i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: active ? 1 : 0, y: active ? 0 : 40 }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: "easeOut" }}
                style={{
                  background: "#fff",
                  borderRadius: "20px",
                  padding: "32px 24px",
                  border: `1.5px solid ${border}`,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                  textAlign: "center",
                  position: "relative",
                  zIndex: 1,
                  transition: "all 0.35s ease",
                  display: "flex", flexDirection: "column", alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = `0 20px 48px ${color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.05)";
                }}
              >
                {/* Step badge */}
                <div style={{
                  position: "absolute", top: "-14px",
                  background: color, color: "#fff",
                  borderRadius: "50px", padding: "2px 12px",
                  fontSize: "0.72rem", fontWeight: 800,
                  letterSpacing: "0.08em",
                  boxShadow: `0 4px 12px ${color}40`,
                }}>
                  {item.step || `0${i + 1}`}
                </div>

                <div style={{
                  width: "64px", height: "64px", borderRadius: "18px",
                  background: bg, border: `1.5px solid ${border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: color, fontSize: "1.6rem",
                  margin: "12px 0 20px",
                }}>
                  <IconComponent />
                </div>

                <h3 style={{ color: "#0f172a", fontSize: "1.05rem", fontWeight: 700, marginBottom: "10px", fontFamily: "'Outfit', sans-serif" }}>
                  {item.title}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
                  {item.desc || item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
