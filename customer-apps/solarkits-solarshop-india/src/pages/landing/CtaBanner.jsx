import { motion } from "framer-motion";
import { FiArrowRight, FiPhone } from "react-icons/fi";
import { FaSolarPanel } from "react-icons/fa";

export default function CtaBanner({ ctaConfig }) {
  const handleRegister = () => {
    window.open("http://localhost:5178", "_blank", "noopener,noreferrer");
  };

  const handleContact = () => {
    window.location.href = `mailto:${ctaConfig?.email || "support@solarkits.in"}`;
  };

  const badgeText = ctaConfig?.badge_text || "GET STARTED TODAY";
  const heading = ctaConfig?.heading || "Ready to Power Your Home with Clean Solar Energy?";
  const subtitle = ctaConfig?.subtitle || "Get pre-configured solar kits delivered directly to your doorstep. Free sizing assistance from certified solar engineers.";
  const buttonText = ctaConfig?.button_text || "Request Free Consultation";
  const phone = ctaConfig?.phone || "+91 77779 39842";

  return (
    <section
      style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, #253880 0%, #1d2c66 40%, #1965b0 70%, #253880 100%)",
        padding: "96px 28px",
      }}
    >
      {/* Background blobs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div className="animate-blob animate-float-slow" style={{
          position: "absolute", top: "-80px", right: "5%",
          width: "450px", height: "450px",
          background: "radial-gradient(circle, rgba(244,146,34,0.18) 0%, transparent 70%)",
          filter: "blur(50px)",
        }} />
        <div className="animate-blob animate-float-reverse" style={{
          position: "absolute", bottom: "-60px", left: "5%",
          width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="animate-float"
          style={{
            display: "inline-flex", width: "72px", height: "72px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #f49222, #dd7e13)",
            alignItems: "center", justifyContent: "center",
            marginBottom: "28px",
            boxShadow: "0 12px 36px rgba(244,146,34,0.5)",
          }}
        >
          <FaSolarPanel style={{ color: "#253880", fontSize: "2rem" }} />
        </motion.div>

        {/* Badge */}
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "50px", padding: "5px 16px", marginBottom: "20px" }}>
          <span style={{ color: "#f49222", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em" }}>
            {badgeText}
          </span>
        </div>

        {/* Headline */}
        <h2 style={{
          fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 900,
          color: "#ffffff", fontFamily: "'Outfit', sans-serif",
          marginBottom: "20px", lineHeight: 1.15,
        }}>
          {heading}
        </h2>

        {/* Subtitle */}
        <p style={{
          color: "rgba(255,255,255,0.8)", fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
          maxWidth: "620px", margin: "0 auto 44px", lineHeight: 1.7,
        }}>
          {subtitle}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <motion.button
            onClick={handleRegister}
            whileHover={{ scale: 1.04, boxShadow: "0 16px 40px rgba(244,146,34,0.5)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "16px 36px",
              background: "linear-gradient(135deg, #f49222, #dd7e13)",
              color: "#253880", borderRadius: "14px",
              fontSize: "1.05rem", fontWeight: 900, cursor: "pointer", border: "none",
              boxShadow: "0 8px 28px rgba(244,146,34,0.35)",
              display: "inline-flex", alignItems: "center", gap: "10px",
              fontFamily: "inherit",
            }}
          >
            {buttonText} <FiArrowRight />
          </motion.button>

          <motion.button
            onClick={handleContact}
            whileHover={{ scale: 1.04, background: "rgba(255,255,255,0.2)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "16px 32px",
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              color: "#ffffff", borderRadius: "14px",
              fontSize: "1.05rem", fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: "8px",
              fontFamily: "inherit",
              backdropFilter: "blur(8px)",
            }}
          >
            <FiPhone /> {phone}
          </motion.button>
        </div>
      </div>
    </section>
  );
}
