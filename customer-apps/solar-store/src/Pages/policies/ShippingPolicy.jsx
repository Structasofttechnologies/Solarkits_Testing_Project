import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiTruck, FiDollarSign, FiFileText, FiShield, FiAlertTriangle } from "react-icons/fi";
import Navbar from "../landingPage/Navbar";
import Footer from "../landingPage/Footer";
import { getStorePolicies } from "../../services/storeLandingService";

const DEFAULT_SECTIONS = [
  {
    id: 1,
    heading: "1. Dispatch Timelines",
    content: "In-stock solar combo kits and components are dispatched from our nearest regional warehouse hub within 24 to 48 hours of order payment confirmation.",
  },
  {
    id: 2,
    heading: "2. Transit Duration Across India",
    content: "Tier-1 Cities & Metro Hubs: 2 - 4 Business Days. Tier-2 / Tier-3 Districts: 4 - 7 Business Days. Remote Farmlands & North-East / Hilly Regions: 7 - 10 Business Days.",
  },
  {
    id: 3,
    heading: "3. Transit Insurance & Freight Inspection",
    content: "Every single pallet and crate dispatched by Solarkits is 100% insured against loss, theft, and physical transit damage. Customers must inspect wooden crates and outer strapping before signing the delivery receipt.",
  },
  {
    id: 4,
    heading: "4. Heavy Freight Unloading & Direct Site Access",
    content: "Commercial solar freight is transported via 14ft/19ft container vehicles. Delivery is made to ground level or accessible road frontage. On-site movement or rooftop lifting must be arranged locally.",
  },
];

export default function ShippingPolicy() {
  const navigate = useNavigate();
  const [policyData, setPolicyData] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Shipping & Delivery Policy — Solarkits.in";
    getStorePolicies()
      .then((policies) => {
        if (policies?.shipping_policy) {
          setPolicyData(policies.shipping_policy);
        }
      })
      .catch((err) => console.warn("Could not load dynamic shipping policy:", err));
  }, []);

  const title = policyData?.title || "Shipping & Delivery Policy";
  const lastUpdated = policyData?.last_updated || "August 2026";
  const noticeBox = policyData?.notice_box || "Pan-India Logistics: We deliver solar kits and heavy panels to over 18,000 pincodes across India using specialized heavy surface cargo with transit insurance coverage.";
  const sections = policyData?.sections && policyData.sections.length > 0 ? policyData.sections : DEFAULT_SECTIONS;

  return (
    <div style={{ background: "#f8fafc", color: "#0f172a", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <div style={{ paddingTop: "110px", paddingBottom: "80px", maxWidth: "900px", margin: "0 auto", paddingLeft: "24px", paddingRight: "24px" }}>
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "#1e3a8a",
            cursor: "pointer",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <FiArrowLeft /> Back to Home
        </button>

        {/* Policy Quick Switch Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "28px" }}>
          {[
            { label: "Privacy Policy", path: "/privacy-policy", icon: <FiShield /> },
            { label: "Terms of Service & User Policy", path: "/terms-of-service", icon: <FiFileText /> },
            { label: "Refund & Cancellation", path: "/refund-policy", icon: <FiDollarSign /> },
            { label: "Shipping & Delivery", path: "/shipping-policy", icon: <FiTruck /> },
          ].map((item) => {
            const isActive = item.path === "/shipping-policy";
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "50px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: isActive ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: isActive ? "#2563eb" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? "0 2px 8px rgba(37,99,235,0.2)" : "none",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Header Title */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "36px 40px", marginBottom: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#2563eb", background: "#eff6ff", padding: "6px 14px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700, marginBottom: "16px" }}>
            <FiTruck /> PAN-INDIA LOGISTICS & DELIVERY
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", fontFamily: "'Outfit', sans-serif" }}>
            {title}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Last Updated: {lastUpdated} • Fast, insured freight shipping covering 28 Indian States & Union Territories.
          </p>
        </div>

        {/* Notice Box */}
        <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "16px", padding: "20px 24px", marginBottom: "32px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <FiAlertTriangle style={{ color: "#b45309", fontSize: "1.5rem", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "0.92rem", color: "#92400e", lineHeight: 1.6 }}>
            {noticeBox}
          </div>
        </div>

        {/* Policy Content Sections */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "40px", lineHeight: 1.8, fontSize: "1rem", color: "#334155" }}>
          {sections.map((sec, idx) => (
            <div key={sec.id || idx} style={{ marginBottom: idx === sections.length - 1 ? 0 : "28px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginTop: 0, marginBottom: "12px" }}>
                {sec.heading}
              </h2>
              <p style={{ margin: 0, whiteSpace: "pre-line" }}>
                {sec.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
