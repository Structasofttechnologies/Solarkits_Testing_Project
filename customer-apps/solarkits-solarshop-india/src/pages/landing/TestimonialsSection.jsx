import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronLeft, FiChevronRight, FiStar } from "react-icons/fi";

const DEFAULT_TESTIMONIALS = [
  { name: "Rajesh Kulkarni", role: "Homeowner", city: "Pune, Maharashtra", initials: "RK", color: "#253880", bg: "#eff6ff", rating: 5, quote: "SolarKits delivered the entire package in 3 days. The pre-wired ACDB/DCDB boxes saved our local electrician half a day of work. My electricity bill is down from ₹3,200 to ₹150!" },
  { name: "Anand Verma", role: "Commercial EPC Contractor", city: "Jaipur, Rajasthan", initials: "AV", color: "#0d9488", bg: "#f0fdfa", rating: 5, quote: "Ordering turnkey kits with proper GST invoices is a game changer for our business. DCR panels passed DISCOM inspection on the first attempt." },
  { name: "Balwinder Singh", role: "Farm House Owner", city: "Ludhiana, Punjab", initials: "BS", color: "#15803d", bg: "#f0fdf4", rating: 5, quote: "The hybrid system with lithium battery provides 24x7 continuous power even during local grid cuts. Excellent build quality and very responsive support." },
  { name: "Priya Sharma", role: "Solar Contractor", city: "Pune, Maharashtra", initials: "PS", color: "#7c3aed", bg: "#f5f3ff", rating: 5, quote: "Finally a solar e-commerce platform that actually understands customer needs! The order tracking, GST invoicing, and secure payment options make purchasing solar products so much faster." },
];

export default function TestimonialsSection({ testimonialsConfig }) {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const testimonials = testimonialsConfig?.items && testimonialsConfig.items.length > 0 ? testimonialsConfig.items : DEFAULT_TESTIMONIALS;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true); },
      { threshold: 0.12 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPaused || testimonials.length <= 3) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, testimonials.length]);

  const visibleCount = Math.min(3, testimonials.length);
  const visibleItems = Array.from({ length: visibleCount }, (_, i) =>
    testimonials[(currentIndex + i) % testimonials.length]
  );

  const badgeText = testimonialsConfig?.badge_text || "CUSTOMER STORIES";
  const heading = testimonialsConfig?.heading || "Trusted by Homeowners & Solar Businesses";
  const subtitle = testimonialsConfig?.subtitle || "Hear what customers across India say about their SolarKits delivery and power performance.";

  const colors = ["#253880", "#0d9488", "#15803d", "#7c3aed", "#d97706", "#dc2626"];
  const bgs = ["#eff6ff", "#f0fdfa", "#f0fdf4", "#f5f3ff", "#fffbeb", "#fff1f2"];

  return (
    <section
      ref={sectionRef}
      style={{ background: "#ffffff", padding: "96px 28px", position: "relative", overflow: "hidden" }}
    >
      {/* Top decorative wave */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "6px",
        background: "linear-gradient(90deg, #253880, #189bd7, #f49222, #0d9488, #253880)",
      }} />

      <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 30 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: "64px" }}
        >
          <div style={{ display: "inline-block", background: "#fce7f3", border: "1px solid #fbcfe8", borderRadius: "50px", padding: "5px 14px", marginBottom: "16px" }}>
            <span style={{ color: "#be185d", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em" }}>
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

        {/* Carousel Grid */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "40px" }}
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.map((item, i) => {
              const color = item.color || colors[i % colors.length];
              const bg = item.bg || bgs[i % bgs.length];
              const initials = item.initials || (item.name ? item.name.split(" ").map(n => n[0]).join("").slice(0, 2) : "SK");

              return (
                <motion.div
                  key={item.name + i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  style={{
                    background: "#fff",
                    borderRadius: "20px",
                    padding: "32px",
                    border: "1.5px solid #f1f5f9",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                    display: "flex", flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    {/* Stars */}
                    <div style={{ display: "flex", gap: "3px", marginBottom: "16px" }}>
                      {Array.from({ length: item.rating || 5 }).map((_, s) => (
                        <FiStar key={s} style={{ fill: "#f59e0b", color: "#f59e0b", fontSize: "1rem" }} />
                      ))}
                    </div>

                    {/* Quote text */}
                    <p style={{ color: "#334155", fontSize: "0.92rem", lineHeight: 1.7, marginBottom: "24px", fontStyle: "italic" }}>
                      "{item.quote || item.text || item.review}"
                    </p>
                  </div>

                  {/* Customer info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                      width: "46px", height: "46px", borderRadius: "14px",
                      background: bg, color: color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: "0.95rem", flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "0.95rem" }}>
                        {item.name}
                      </div>
                      <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                        {item.role || item.company} • {item.city}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Carousel controls */}
        {testimonials.length > 3 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
              style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: "#f1f5f9", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#1e293b", transition: "all 0.2s",
              }}
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % testimonials.length)}
              style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: "#f1f5f9", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#1e293b", transition: "all 0.2s",
              }}
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
