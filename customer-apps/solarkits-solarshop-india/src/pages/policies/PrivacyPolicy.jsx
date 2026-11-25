import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiShield, FiAlertTriangle } from "react-icons/fi";
import Navbar from "../landing/Navbar";
import FooterSection from "../landing/FooterSection";
import { getWebsiteLandingContent } from "../../services/websiteContentService";

const FALLBACK_POLICY = {
  title: "Privacy Policy",
  last_updated: "August 2026",
  notice_box:
    "Important Platform Note: Solarkits.in operates strictly as an E-Commerce Supply Marketplace for solar panels, combo kits, BOS equipment, and solar products. We DO NOT provide on-site installation, EPC engineering, or labor services. All products are supplied directly to your delivery address for independent assembly or local installation.",
  sections: [
    {
      id: 1,
      heading: "1. Information We Collect",
      content:
        "Solarkits.in collects customer information strictly necessary to process online e-commerce purchases, dispatch solar panel orders, issue GST tax invoices, and facilitate logistics across India. This includes full name, company name, GSTIN (optional for tax claims), email address, phone number, shipping and billing address.",
    },
    {
      id: 2,
      heading: "2. How We Use Your Data",
      content:
        "Your personal information is used exclusively for: processing solar panel & BOS product orders, issuing official tax-compliant invoices, coordinating warehouse logistics, freight dispatch, tracking notifications, and enabling manufacturer warranty validation.",
    },
    {
      id: 3,
      heading: "3. Data Security & Payment Protection",
      content:
        "Solarkits.in employs industry-standard 256-bit SSL encryption. All online payments are securely processed through PCI-DSS compliant payment gateways (Razorpay/Bank Transfer). Solarkits does not store your credit card, debit card, or net-banking credentials on our servers.",
    },
    {
      id: 4,
      heading: "4. Contact Privacy Compliance",
      content:
        "If you have questions regarding your personal data or wish to update your account preferences, please reach out to our team at support@solarkits.in.",
    },
  ],
};

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [policyData, setPolicyData] = useState(FALLBACK_POLICY);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Privacy Policy — Solarkits.in";

    getWebsiteLandingContent()
      .then((data) => {
        if (data && data.policies && data.policies.privacy_policy) {
          setPolicyData(data.policies.privacy_policy);
        }
      })
      .catch((err) => console.warn("Could not load dynamic Privacy Policy:", err));
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
            <FiShield /> LEGAL & COMPLIANCE
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", fontFamily: "'Outfit', sans-serif" }}>
            {policyData.title || "Privacy Policy"}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Last Updated: {policyData.last_updated || "August 2026"} • Applies to all buyers, customers, and EPC partners on Solarkits.in.
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
