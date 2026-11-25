<<<<<<< HEAD
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiShield, FiFileText, FiDollarSign, FiTruck, FiAlertTriangle } from "react-icons/fi";
import Navbar from "../landingPage/Navbar";
import Footer from "../landingPage/Footer";
import { getStorePolicies } from "../../services/storeLandingService";

const DEFAULT_SECTIONS = [
  {
    id: 1,
    heading: "1. Information We Collect",
    content: "We collect information you provide directly to us when placing an order, requesting technical single line diagrams, registering for an account, or communicating with our support desk. This includes your name, delivery address, pincode, billing details, GSTIN (for B2B buyers), email address, and phone number.",
  },
  {
    id: 2,
    heading: "2. How We Use Your Information",
    content: "We use the collected information to process and dispatch equipment shipments, provide real-time transit insurance tracking, generate official GST tax invoices, assist with PM Surya Ghar ALMM documentation, and provide product warranty replacement support.",
  },
  {
    id: 3,
    heading: "3. Data Security & Protection",
    content: "We implement industry-standard 256-bit SSL encryption, tokenized payment processing through certified PCI-DSS gateways, and strict access controls. We never sell or rent your personal information to third-party advertisers.",
  },
  {
    id: 4,
    heading: "4. Cookies & Analytics",
    content: "We use cookies to maintain your shopping cart, remember your regional warehouse preferences, and analyze site performance to optimize kit loading speeds and user experience.",
  },
  {
    id: 5,
    heading: "5. Contacting Our Data Privacy Officer",
    content: "If you have questions or requests regarding your personal data or privacy rights, please reach out to privacy@solarkits.in or contact our headquarters at SolarKits Tech Hub, Pune.",
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [policyData, setPolicyData] = useState(null);
=======
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiShield, FiLock, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import Navbar from "../landingPage/Navbar";
import Footer from "../landingPage/Footer";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
>>>>>>> origin/main

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Privacy Policy — Solarkits.in";
<<<<<<< HEAD
    getStorePolicies()
      .then((policies) => {
        if (policies?.privacy_policy) {
          setPolicyData(policies.privacy_policy);
        }
      })
      .catch((err) => console.warn("Could not load dynamic privacy policy:", err));
  }, []);

  const title = policyData?.title || "Privacy Policy";
  const lastUpdated = policyData?.last_updated || "August 2026";
  const noticeBox = policyData?.notice_box || "Important Platform Note: Solarkits.in operates strictly as an E-Commerce Supply Marketplace for solar panels, combo kits, BOS equipment, and solar products. We DO NOT provide on-site installation, EPC engineering, or labor services. All products are supplied directly to your delivery address for independent assembly or local installation.";
  const sections = policyData?.sections && policyData.sections.length > 0 ? policyData.sections : DEFAULT_SECTIONS;

=======
  }, []);

>>>>>>> origin/main
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
<<<<<<< HEAD
            marginBottom: "20px",
=======
            marginBottom: "28px",
>>>>>>> origin/main
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <FiArrowLeft /> Back to Home
        </button>

<<<<<<< HEAD
        {/* Policy Quick Switch Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "28px" }}>
          {[
            { label: "Privacy Policy", path: "/privacy-policy", icon: <FiShield /> },
            { label: "Terms of Service & User Policy", path: "/terms-of-service", icon: <FiFileText /> },
            { label: "Refund & Cancellation", path: "/refund-policy", icon: <FiDollarSign /> },
            { label: "Shipping & Delivery", path: "/shipping-policy", icon: <FiTruck /> },
          ].map((item) => {
            const isActive = item.path === "/privacy-policy";
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

=======
>>>>>>> origin/main
        {/* Header Title */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "36px 40px", marginBottom: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#2563eb", background: "#eff6ff", padding: "6px 14px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700, marginBottom: "16px" }}>
            <FiShield /> LEGAL & COMPLIANCE
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", fontFamily: "'Outfit', sans-serif" }}>
<<<<<<< HEAD
            {title}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Last Updated: {lastUpdated} • Applies to all buyers, customers, and EPC partners on Solarkits.in.
=======
            Privacy Policy
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Last Updated: August 2026 • Applies to all buyers, customers, and EPC partners on Solarkits.in.
>>>>>>> origin/main
          </p>
        </div>

        {/* Notice Box: E-Commerce & No Installation Disclaimer */}
        <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "16px", padding: "20px 24px", marginBottom: "32px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <FiAlertTriangle style={{ color: "#b45309", fontSize: "1.5rem", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "0.92rem", color: "#92400e", lineHeight: 1.6 }}>
<<<<<<< HEAD
            {noticeBox}
=======
            <strong>Important Platform Note:</strong> Solarkits.in operates strictly as an <strong>E-Commerce Supply Marketplace</strong> for solar panels, combo kits, BOS equipment, and solar products. <strong>We DO NOT provide on-site installation, EPC engineering, or labor services.</strong> All products are supplied directly to your delivery address for independent assembly or local installation.
>>>>>>> origin/main
          </div>
        </div>

        {/* Policy Content Sections */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "40px", lineHeight: 1.8, fontSize: "1rem", color: "#334155" }}>
<<<<<<< HEAD
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
=======
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginTop: 0, marginBottom: "12px" }}>
            1. Information We Collect
          </h2>
          <p style={{ marginBottom: "20px" }}>
            Solarkits.in ("Solarkits", "We", "Us") collects customer information strictly necessary to process online e-commerce purchases, dispatch solar panel orders, issue GST tax invoices, and facilitate logistics across India.
          </p>
          <ul style={{ paddingLeft: "20px", marginBottom: "28px" }}>
            <li><strong>Account & Buyer Information:</strong> Full name, company name, GSTIN (optional for tax claims), email address, phone number, shipping and billing address.</li>
            <li><strong>Transactional Data:</strong> Order history, selected solar combo kits, component quantities, and payment gateway confirmation IDs.</li>
            <li><strong>Platform Analytics:</strong> IP address, browser specs, and session telemetry to maintain e-commerce platform security.</li>
          </ul>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            2. How We Use Your Data
          </h2>
          <p style={{ marginBottom: "20px" }}>
            Your personal information is used exclusively for:
          </p>
          <ul style={{ paddingLeft: "20px", marginBottom: "28px" }}>
            <li>Processing solar panel & BOS product orders and issuing official tax-compliant invoices.</li>
            <li>Coordinating warehouse logistics, freight dispatch, and delivery tracking notifications.</li>
            <li>Enabling manufacturer warranty validation for Tier-1 solar panels & grid inverters.</li>
            <li>Ensuring secure payments and preventing fraudulent online transactions.</li>
          </ul>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            3. Data Security & Payment Protection
          </h2>
          <p style={{ marginBottom: "28px" }}>
            Solarkits.in employs industry-standard 256-bit SSL encryption. All online payments are securely processed through PCI-DSS compliant payment gateways (Razorpay/Bank Transfer). Solarkits does not store your credit card, debit card, or net-banking credentials on our servers.
          </p>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            4. Contact Privacy Compliance
          </h2>
          <p style={{ margin: 0 }}>
            If you have questions regarding your personal data or wish to update your account preferences, please reach out to our team at <strong>support@solarkits.in</strong>.
          </p>
>>>>>>> origin/main
        </div>
      </div>

      <Footer />
    </div>
  );
}
