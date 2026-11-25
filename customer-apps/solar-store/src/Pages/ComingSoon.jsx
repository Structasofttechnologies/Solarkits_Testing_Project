import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSend, FiMail, FiPhone } from "react-icons/fi";
import { FaSolarPanel } from "react-icons/fa";
import logo from "../assets/images/logo.png";

export default function ComingSoon() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #edf4ff 50%, #f0f7ff 100%)",
      color: "#0f172a",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background Decorative Mesh & Glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "-10%", right: "10%",
          width: "550px", height: "550px",
          background: "radial-gradient(circle, rgba(248, 194, 26, 0.18) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: "-10%", left: "10%",
          width: "550px", height: "550px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.6
        }} />
      </div>

      {/* Header */}
      <header style={{
        maxWidth: "1280px", width: "100%", margin: "0 auto",
        padding: "24px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", zIndex: 10,
      }}>
        <div style={{
          background: "#ffffff",
          padding: "6px 14px",
          borderRadius: "12px",
          display: "flex", alignItems: "center",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(226, 232, 240, 0.9)"
        }}>
          <img src={logo} alt="SolarKits" style={{ height: "36px", objectFit: "contain" }} />
        </div>

        <button
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#1e293b",
            borderRadius: "10px", padding: "10px 18px",
            fontSize: "0.9rem", fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
        >
          <FiArrowLeft /> Back to Website
        </button>
      </header>

      {/* Main Clean Coming Soon Content */}
      <main style={{
        maxWidth: "680px", width: "100%", margin: "40px auto",
        padding: "0 24px",
        position: "relative", zIndex: 10,
        textAlign: "center",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            background: "#ffffff",
            border: "1px solid rgba(226, 232, 240, 0.9)",
            borderRadius: "28px",
            padding: "52px 36px",
            boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
          }}
        >
          {/* Solar Icon Badge */}
          <div style={{
            width: "64px", height: "64px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
            color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 8px 24px rgba(30, 64, 175, 0.25)"
          }}>
            <FaSolarPanel style={{ fontSize: "1.8rem" }} />
          </div>

          {/* Yellow Pill Tag */}
          <div style={{
            display: "inline-block",
            background: "#fef9c3",
            border: "1px solid #fde047",
            borderRadius: "50px", padding: "6px 18px", marginBottom: "20px",
          }}>
            <span style={{ color: "#854d0e", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.05em" }}>
              ⚡ COMING SOON
            </span>
          </div>

          {/* Large Title */}
          <h1 style={{
            fontSize: "clamp(2.2rem, 4.5vw, 3.2rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "16px",
            fontFamily: "'Outfit', sans-serif",
            color: "#0f172a",
            letterSpacing: "-0.02em"
          }}>
            Something Solar is{" "}
            <span style={{
              background: "linear-gradient(135deg, #1e40af, #2563eb)",
              backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent"
            }}>
              Coming Soon
            </span>
          </h1>

          {/* Subtext */}
          <p style={{
            color: "#475569",
            fontSize: "1.08rem",
            lineHeight: 1.7,
            maxWidth: "500px",
            margin: "0 auto 36px",
          }}>
            We are preparing our dealer portal for launch. Online access will be live very soon!
          </p>

          {/* Subscription Form */}
          {submitted ? (
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "14px", padding: "16px",
              color: "#15803d", fontSize: "0.95rem", fontWeight: 600
            }}>
              ✓ Thank you! We will notify you as soon as we go live.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{
              display: "flex", gap: "10px", maxWidth: "440px", margin: "0 auto", flexWrap: "wrap"
            }}>
              <input
                type="email"
                required
                placeholder="Enter your email to get notified"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1, minWidth: "220px",
                  padding: "14px 18px",
                  background: "#f8fafc",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "12px",
                  color: "#0f172a",
                  fontSize: "0.92rem",
                  outline: "none",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
              />
              <button
                type="submit"
                style={{
                  padding: "14px 24px",
                  background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
                  color: "#ffffff",
                  borderRadius: "12px",
                  fontSize: "0.92rem", fontWeight: 700,
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "8px",
                  fontFamily: "inherit",
                  boxShadow: "0 6px 18px rgba(30, 64, 175, 0.25)",
                }}
              >
                Notify Me <FiSend />
              </button>
            </form>
          )}

          {/* Support Info */}
          <div style={{
            marginTop: "36px", paddingTop: "24px",
            borderTop: "1px solid #f1f5f9",
            display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap",
            fontSize: "0.85rem", color: "#64748b"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiMail style={{ color: "#1e40af" }} /> support@solarkits.com
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FiPhone style={{ color: "#eab308" }} /> +91 98765 43210
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: "center", padding: "20px",
        fontSize: "0.82rem", color: "#64748b",
        position: "relative", zIndex: 10,
      }}>
        © {new Date().getFullYear()} SolarKits Technologies Pvt. Ltd. | All rights reserved.
      </footer>
    </div>
  );
}
