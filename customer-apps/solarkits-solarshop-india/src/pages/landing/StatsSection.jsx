import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const DEFAULT_STATS = [
  { value: "10,000+", label: "Kits Delivered", sub: "Pan-India", icon: "☀️", color: "#253880", bg: "#eff6ff" },
  { value: "50 MW+", label: "Clean Power Generated", sub: "Equivalent to 40,000 tons CO2 offset", icon: "⚡", color: "#0d9488", bg: "#f0fdfa" },
  { value: "18,000+", label: "Pincodes Covered", sub: "Door-to-door insurance", icon: "🗺️", color: "#d97706", bg: "#fffbeb" },
  { value: "4.9 / 5", label: "Customer Rating", sub: "Based on 2,500+ verified reviews", icon: "⭐", color: "#7c3aed", bg: "#f5f3ff" },
];

function StatCard({ stat, index, active }) {
  const iconList = ["☀️", "⚡", "🗺️", "⭐", "🏆", "📦"];
  const colorList = ["#253880", "#0d9488", "#d97706", "#7c3aed", "#2563eb", "#059669"];
  const bgList = ["#eff6ff", "#f0fdfa", "#fffbeb", "#f5f3ff", "#eff6ff", "#ecfdf5"];

  const icon = stat.icon || iconList[index % iconList.length];
  const color = stat.color || colorList[index % colorList.length];
  const bg = stat.bg || bgList[index % bgList.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 40 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
      style={{
        background: "#fff",
        borderRadius: "20px",
        padding: "32px 28px",
        textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        border: "1px solid #f1f5f9",
        transition: "all 0.35s ease",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = `0 16px 48px ${color}22`;
        e.currentTarget.style.borderColor = `${color}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.07)";
        e.currentTarget.style.borderColor = "#f1f5f9";
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "4px",
        background: `linear-gradient(90deg, ${color}, ${color}80)`,
      }} />

      {/* Icon circle */}
      <div style={{
        width: "60px", height: "60px", borderRadius: "16px",
        background: bg, margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.8rem",
      }}>
        {icon}
      </div>

      {/* Number */}
      <div style={{
        fontSize: "clamp(2.2rem, 3.5vw, 3rem)", fontWeight: 900,
        color: color, lineHeight: 1, marginBottom: "8px",
        fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em",
      }}>
        {stat.value || stat.val}
      </div>

      {/* Label */}
      <div style={{ color: "#0f172a", fontSize: "0.95rem", fontWeight: 700, marginBottom: "4px" }}>
        {stat.label}
      </div>

      {/* Sublabel */}
      {stat.sub && (
        <div style={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 500 }}>
          {stat.sub}
        </div>
      )}
    </motion.div>
  );
}

export default function StatsSection({ statsConfig }) {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true); },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const badgeText = statsConfig?.badge_text || "OUR IMPACT";
  const heading = statsConfig?.heading || "Trusted by Solar Businesses Across India";
  const subtitle = statsConfig?.subtitle || "Numbers that reflect our commitment to affordable, reliable solar solutions";
  const items = statsConfig?.items && statsConfig.items.length > 0 ? statsConfig.items : DEFAULT_STATS;

  return (
    <section
      ref={sectionRef}
      style={{
        background: "#f8faff",
        padding: "88px 28px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 24 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: "56px" }}
        >
          <div style={{
            display: "inline-block", background: "#eff6ff",
            border: "1px solid #bfdbfe", borderRadius: "50px",
            padding: "5px 14px", marginBottom: "16px",
          }}>
            <span style={{ color: "#1d4ed8", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em" }}>
              {badgeText}
            </span>
          </div>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 800,
            color: "#0f172a", fontFamily: "'Outfit', sans-serif",
            marginBottom: "12px", lineHeight: 1.2,
          }}>
            {heading}
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "540px", margin: "0 auto" }}>
            {subtitle}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
        }}>
          {items.map((stat, i) => (
            <StatCard key={stat.label || i} stat={stat} index={i} active={active} />
          ))}
        </div>
      </div>
    </section>
  );
}
