import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiAward, FiTruck, FiZap, FiShield, FiDollarSign, FiTool } from "react-icons/fi";

const DEFAULT_FEATURES = [
  { icon: FiAward, title: "Pre-Engineered & Pre-Wired", description: "Every kit is pre-configured with perfectly matched panels, inverters, and protection hardware for rapid installation.", color: "#253880", bg: "#eff6ff" },
  { icon: FiShield, title: "100% Genuine Tier-1 Hardware", description: "Direct supply from ALMM-approved and MNRE-certified manufacturers with official warranty cards.", color: "#0d9488", bg: "#f0fdfa" },
  { icon: FiTruck, title: "Transit Insured Pan-India Logistics", description: "Safe door-to-door delivery with 100% transit insurance across 18,000+ pincodes in India.", color: "#d97706", bg: "#fffbeb" },
  { icon: FiDollarSign, title: "Full 12% GST ITC Claim", description: "All purchases come with official GST invoices allowing businesses and EPCs to claim full input tax credit.", color: "#7c3aed", bg: "#f5f3ff" },
  { icon: FiZap, title: "Subsidies & DBT Pre-Verification", description: "All DCR kits are pre-verified for PM Surya Ghar and PM-KUSUM direct bank transfer subsidies.", color: "#15803d", bg: "#f0fdf4" },
  { icon: FiTool, title: "Technical Engineering Support", description: "Dedicated solar engineering desk for single line diagrams (SLD), sizing assistance, and DISCOM documentation.", color: "#dc2626", bg: "#fff1f2" },
];

export default function WhyChooseSection({ whyChooseConfig }) {
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

  const badgeText = whyChooseConfig?.badge_text || "WHY CHOOSE US";
  const heading = whyChooseConfig?.heading || "Everything You Need to Go Solar — All in One Platform";
  const subtitle = whyChooseConfig?.subtitle || "SolarKits is more than a marketplace. We're your end-to-end partner in the solar journey.";
  const items = whyChooseConfig?.items && whyChooseConfig.items.length > 0 ? whyChooseConfig.items : DEFAULT_FEATURES;

  const iconOptions = [FiAward, FiShield, FiTruck, FiDollarSign, FiZap, FiTool];
  const colorOptions = ["#253880", "#0d9488", "#d97706", "#7c3aed", "#15803d", "#dc2626"];
  const bgOptions = ["#eff6ff", "#f0fdfa", "#fffbeb", "#f5f3ff", "#f0fdf4", "#fff1f2"];

  return (
    <section
      id="why-choose"
      ref={sectionRef}
      style={{ background: "#ffffff", padding: "96px 28px", position: "relative", overflow: "hidden" }}
    >
      {/* Subtle background shapes */}
      <div style={{ position: "absolute", top: 0, right: 0, width: "400px", height: "400px", background: "radial-gradient(circle, rgba(248,194,26,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "300px", height: "300px", background: "radial-gradient(circle, rgba(26,59,139,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 30 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: "64px" }}
        >
          <div style={{ display: "inline-block", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "50px", padding: "5px 14px", marginBottom: "16px" }}>
            <span style={{ color: "#15803d", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em" }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {items.map((feat, i) => {
            const IconComponent = feat.icon || iconOptions[i % iconOptions.length];
            const color = feat.color || colorOptions[i % colorOptions.length];
            const bg = feat.bg || bgOptions[i % bgOptions.length];

            return (
              <motion.div
                key={feat.title || i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: active ? 1 : 0, y: active ? 0 : 30 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "28px",
                  border: "1.5px solid #f1f5f9",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  transition: "all 0.3s ease",
                  display: "flex",
                  gap: "18px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${color}40`;
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = `0 12px 36px ${color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#f1f5f9";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)";
                }}
              >
                <div style={{
                  width: "50px", height: "50px", borderRadius: "14px",
                  background: bg, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: color, fontSize: "1.3rem",
                }}>
                  <IconComponent />
                </div>
                <div>
                  <h3 style={{ color: "#0f172a", fontSize: "1rem", fontWeight: 700, marginBottom: "8px", fontFamily: "'Outfit', sans-serif" }}>
                    {feat.title}
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
                    {feat.desc || feat.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
