import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiFileText, FiAlertTriangle } from "react-icons/fi";
import Navbar from "../landing/Navbar";
import FooterSection from "../landing/FooterSection";
import { getWebsiteLandingContent } from "../../services/websiteContentService";

const FALLBACK_TERMS = {
  title: "Terms of Service & User Policy",
  last_updated: "August 2026",
  notice_box:
    "CRITICAL SERVICE DISCLAIMER: Solarkits.in is strictly an Online E-Commerce Product Supply Platform. We sell and deliver solar panels, solar combo kits, BOS components, and accessories across India. Solarkits DOES NOT offer, undertake, or provide installation services, EPC labor, on-site mounting, or maintenance. Product installation must be arranged independently by the customer or qualified local technicians.",
  sections: [
    {
      id: 1,
      heading: "1. Acceptance of Terms",
      content:
        "By accessing Solarkits.in or purchasing products from our catalog, you agree to be bound by these Terms of Service, all applicable laws and regulations in India, and agree that you are responsible for compliance with any local DISCOM regulations.",
    },
    {
      id: 2,
      heading: "2. E-Commerce Supply & Non-Installation Policy",
      content:
        "SolarKits acts strictly as an equipment fulfillment distributor. All equipment is sold on a delivery-only basis. The customer is solely responsible for engaging qualified electrical installers and verifying roof load feasibility before installation.",
    },
    {
      id: 3,
      heading: "3. Orders, Pricing & Payment Terms",
      content:
        "Prices displayed include GST where specified. Official GST tax invoices will be issued upon dispatch. Orders are confirmed upon payment verification through approved online payment gateways or verified bank wire transfers.",
    },
    {
      id: 4,
      heading: "4. Subsidies & DISCOM Approvals",
      content:
        "All DCR solar kits are supplied with valid ALMM certifications. However, government subsidies (such as PM Surya Ghar or state subsidies) are approved and disbursed directly by government bodies and DISCOMs based on applicant eligibility. SolarKits does not guarantee government approval timelines.",
    },
    {
      id: 5,
      heading: "5. Manufacturer Warranties & Support",
      content:
        "All items carry genuine manufacturer warranties (25 years performance on modules, 5-10 years on inverters). SolarKits facilitates RMA claims and replacement dispatches from authorized regional service centers.",
    },
  ],
};

export default function TermsOfService() {
  const navigate = useNavigate();
  const [policyData, setPolicyData] = useState(FALLBACK_TERMS);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Terms of Service & User Policy — Solarkits.in";

    getWebsiteLandingContent()
      .then((data) => {
        if (data && data.policies && data.policies.terms_of_service) {
          setPolicyData(data.policies.terms_of_service);
        }
      })
      .catch((err) => console.warn("Could not load dynamic Terms of Service:", err));
  }, []);

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
            marginBottom: "28px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <FiArrowLeft /> Back to Home
        </button>

        {/* Header Title */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "36px 40px", marginBottom: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#2563eb", background: "#eff6ff", padding: "6px 14px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700, marginBottom: "16px" }}>
            <FiFileText /> E-COMMERCE TERMS & CONDITIONS
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", fontFamily: "'Outfit', sans-serif" }}>
            {policyData.title || "Terms of Service & User Policy"}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Effective Date: {policyData.last_updated || "August 2026"} • Governing E-Commerce Purchases, Product Supply, & Marketplace Usage.
          </p>
        </div>

        {/* Notice Box: E-Commerce & No Installation Disclaimer */}
        {policyData.notice_box && (
          <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "16px", padding: "20px 24px", marginBottom: "32px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <FiAlertTriangle style={{ color: "#b45309", fontSize: "1.5rem", flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "0.92rem", color: "#92400e", lineHeight: 1.6 }}>
              {policyData.notice_box}
            </div>
          </div>
        )}

        {/* Dynamic Policy Content Sections */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "40px", lineHeight: 1.8, fontSize: "1rem", color: "#334155" }}>
          {(policyData.sections || []).map((sec, idx) => (
            <div key={sec.id || idx} style={{ marginBottom: idx === policyData.sections.length - 1 ? 0 : "32px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginTop: 0, marginBottom: "12px" }}>
                {sec.heading}
              </h2>
              <div style={{ whiteSpace: "pre-line", color: "#334155", lineHeight: 1.8 }}>
                {sec.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <FooterSection />
    </div>
  );
}
