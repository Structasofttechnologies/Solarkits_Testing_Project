import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FiArrowRight, FiPackage } from "react-icons/fi";

const DEFAULT_PRODUCTS = [
  {
    icon: "🏠",
    name: "On-Grid Rooftop Solar Kits",
    description: "Grid-tied solar systems with high-efficiency TopCon mono panels and net-metering smart inverters. Save up to ₹78,000 with government subsidy.",
    tag: "PM Surya Ghar Ready",
    tagColor: "#253880",
    tagBg: "#eff6ff",
    price: "Starting at ₹48,000",
  },
  {
    icon: "🔋",
    name: "Off-Grid Solar Battery Kits",
    description: "Independent standalone power systems with tubular or lithium battery storage for zero grid reliance and remote power.",
    tag: "24x7 Independence",
    tagColor: "#d97706",
    tagBg: "#fffbeb",
    price: "Starting at ₹65,000",
  },
  {
    icon: "⚡",
    name: "Hybrid Solar Storage Kits",
    description: "The ultimate power security combining grid export capability with seamless battery backup during blackouts.",
    tag: "Maximum Resilience",
    tagColor: "#7c3aed",
    tagBg: "#f5f3ff",
    price: "Starting at ₹1,45,000",
  },
  {
    icon: "📦",
    name: "Custom BOS & Mounting Kits",
    description: "Pre-wired IP65 ACDB/DCDB boxes, UV-rated 4/6sqmm cables, chemical earthing electrodes, and elevated HDGI structures.",
    tag: "Plug & Play BOS",
    tagColor: "#dc2626",
    tagBg: "#fff1f2",
    price: "Starting at ₹18,500",
  },
];

function ProductCard({ item, index, active }) {
  const scrollToSteps = () => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const icons = ["🏠", "🔋", "⚡", "📦", "🏭", "🌾"];
  const colors = ["#253880", "#d97706", "#7c3aed", "#dc2626", "#0d9488", "#15803d"];
  const bgs = ["#eff6ff", "#fffbeb", "#f5f3ff", "#fff1f2", "#f0fdfa", "#f0fdf4"];

  const icon = item.icon || icons[index % icons.length];
  const tagColor = item.tagColor || colors[index % colors.length];
  const tagBg = item.tagBg || bgs[index % bgs.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 40 }}
      transition={{ duration: 0.6, delay: index * 0.07, ease: "easeOut" }}
      style={{
        background: "#fff",
        borderRadius: "20px",
        padding: "28px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        border: "1.5px solid #f1f5f9",
        transition: "all 0.3s ease",
        cursor: "default",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = "0 20px 50px rgba(26,59,139,0.12)";
        e.currentTarget.style.borderColor = "#bfdbfe";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.06)";
        e.currentTarget.style.borderColor = "#f1f5f9";
      }}
    >
      {item.tag && (
        <div style={{
          display: "inline-block", background: tagBg,
          border: `1px solid ${tagColor}30`,
          borderRadius: "50px", padding: "3px 12px",
          marginBottom: "14px",
          fontSize: "0.72rem", fontWeight: 700,
          color: tagColor, letterSpacing: "0.04em",
          alignSelf: "flex-start",
        }}>
          {item.tag}
        </div>
      )}
      <div style={{ fontSize: "2.8rem", marginBottom: "14px", lineHeight: 1 }}>{icon}</div>
      <h3 style={{ color: "#0f172a", fontSize: "1.05rem", fontWeight: 700, marginBottom: "10px", fontFamily: "'Outfit', sans-serif" }}>
        {item.name}
      </h3>
      <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.7, marginBottom: "20px", flex: 1 }}>
        {item.desc || item.description}
      </p>
      {item.price && (
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#253880", marginBottom: "16px" }}>
          {item.price}
        </div>
      )}
      <div
        onClick={scrollToSteps}
        style={{ display: "flex", alignItems: "center", gap: "6px", color: "#253880", fontSize: "0.85rem", fontWeight: 700, transition: "gap 0.2s", cursor: "pointer" }}
        onMouseEnter={(e) => e.currentTarget.style.gap = "10px"}
        onMouseLeave={(e) => e.currentTarget.style.gap = "6px"}
      >
        Learn How It Works <FiArrowRight />
      </div>
    </motion.div>
  );
}

export default function ProductsSection({ productsConfig }) {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true); },
      { threshold: 0.12 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handlePartnerPortal = () => {
    window.open("http://localhost:5178", "_blank", "noopener,noreferrer");
  };

  const badgeText = productsConfig?.badge_text || "COMPLETE SOLAR PACKAGES";
  const heading = productsConfig?.heading || "Solar Kits for Every Need & Scale";
  const subtitle = productsConfig?.subtitle || "From small homes to large commercial installations — browse our complete range of pre-configured and custom solar combo kits.";
  const items = productsConfig?.items && productsConfig.items.length > 0 ? productsConfig.items : DEFAULT_PRODUCTS;

  return (
    <section
      id="products"
      ref={sectionRef}
      style={{ background: "#f0f6ff", padding: "96px 28px", position: "relative", overflow: "hidden" }}
    >
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(26,59,139,0.05)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(248,194,26,0.08)", pointerEvents: "none" }} />

      <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 30 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: "64px" }}
        >
          <div style={{ display: "inline-block", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: "50px", padding: "5px 14px", marginBottom: "16px" }}>
            <span style={{ color: "#1d4ed8", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em" }}>
              {badgeText}
            </span>
          </div>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 800, color: "#0f172a",
            fontFamily: "'Outfit', sans-serif", marginBottom: "16px", lineHeight: 1.2,
          }}>
            {heading}
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "540px", margin: "0 auto", lineHeight: 1.7 }}>
            {subtitle}
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "48px" }}>
          {items.map((item, i) => (
            <ProductCard key={item.name || i} item={item} index={i} active={active} />
          ))}
        </div>
      </div>
    </section>
  );
}
