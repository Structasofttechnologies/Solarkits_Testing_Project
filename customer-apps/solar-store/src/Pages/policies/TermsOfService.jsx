<<<<<<< HEAD
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiFileText, FiAlertTriangle, FiShield, FiDollarSign, FiTruck } from "react-icons/fi";
import Navbar from "../landingPage/Navbar";
import Footer from "../landingPage/Footer";
import { getStorePolicies } from "../../services/storeLandingService";

const DEFAULT_SECTIONS = [
  {
    id: 1,
    heading: "1. E-Commerce Platform & Order Acceptance",
    content: "Solarkits.in enables retail and wholesale customers to browse, customize, and buy solar panels and equipment online. By placing an order on Solarkits.in, you agree that you are purchasing physical solar goods for independent usage or installation.",
  },
  {
    id: 2,
    heading: "2. Product Quality & Manufacturer Warranties",
    content: "All Tier-1 solar panels, grid-tied/hybrid inverters, solar pump controllers, and BOS components sold on Solarkits.in carry authentic manufacturer warranties and conform to Bureau of Indian Standards (BIS) and MNRE guidelines. Solarkits passes all original manufacturer warranties directly to the buyer.",
  },
  {
    id: 3,
    heading: "3. Pricing, GST Invoicing, & Payments",
    content: "Prices displayed include GST where specified. Official GST Tax Invoices are issued upon order dispatch, allowing eligible business buyers to claim Input Tax Credit (ITC).",
  },
  {
    id: 4,
    heading: "4. Exclusion of Installation Liability",
    content: "Because Solarkits operates exclusively as a product supply e-commerce marketplace: SolarKits is not responsible for installation workmanship, rooftop structural modifications, or electrical wiring conducted by third parties. Local DISCOM net-metering applications, approvals, or rooftop structural safety certificates remain the responsibility of the customer/installer. Warranties cover product manufacturing defects only as defined by respective brand manufacturers.",
  },
  {
    id: 5,
    heading: "5. Contact Support",
    content: "For queries regarding orders, products, or terms of service, please contact our support team at support@solarkits.in or call +91 77779 39842.",
  },
];

export default function TermsOfService() {
  const navigate = useNavigate();
  const [policyData, setPolicyData] = useState(null);
=======
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiFileText, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import Navbar from "../landingPage/Navbar";
import Footer from "../landingPage/Footer";

export default function TermsOfService() {
  const navigate = useNavigate();
>>>>>>> origin/main

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Terms of Service & User Policy — Solarkits.in";
<<<<<<< HEAD
    getStorePolicies()
      .then((policies) => {
        if (policies?.terms_of_service) {
          setPolicyData(policies.terms_of_service);
        }
      })
      .catch((err) => console.warn("Could not load dynamic terms policy:", err));
  }, []);

  const title = policyData?.title || "Terms of Service & User Policy";
  const lastUpdated = policyData?.last_updated || "August 2026";
  const noticeBox = policyData?.notice_box || "CRITICAL SERVICE DISCLAIMER: Solarkits.in is strictly an Online E-Commerce Product Supply Platform. We sell and deliver solar panels, solar combo kits, BOS components, and accessories across India. Solarkits DOES NOT offer, undertake, or provide installation services, EPC labor, on-site mounting, or maintenance. Product installation must be arranged independently by the customer or qualified local technicians.";
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
            const isActive = item.path === "/terms-of-service";
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
            <FiFileText /> E-COMMERCE TERMS & CONDITIONS
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", fontFamily: "'Outfit', sans-serif" }}>
<<<<<<< HEAD
            {title}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Effective Date: {lastUpdated} • Governing E-Commerce Purchases, Product Supply, & Marketplace Usage.
=======
            Terms of Service & User Policy
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Effective Date: August 2026 • Governing E-Commerce Purchases, Product Supply, & Marketplace Usage.
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
            <strong>CRITICAL SERVICE DISCLAIMER:</strong> Solarkits.in is strictly an <strong>Online E-Commerce Product Supply Platform</strong>. We sell and deliver solar panels, solar combo kits, BOS components, and accessories across India. <strong>Solarkits DOES NOT offer, undertake, or provide installation services, EPC labor, on-site mounting, or maintenance.</strong> Product installation must be arranged independently by the customer or qualified local technicians.
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
            1. E-Commerce Platform & Order Acceptance
          </h2>
          <p style={{ marginBottom: "24px" }}>
            Solarkits.in enables retail and wholesale customers to browse, customize, and buy solar panels and equipment online. By placing an order on Solarkits.in, you agree that you are purchasing physical solar goods for independent usage or installation.
          </p>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            2. Product Quality & Manufacturer Warranties
          </h2>
          <p style={{ marginBottom: "24px" }}>
            All Tier-1 solar panels, grid-tied/hybrid inverters, solar pump controllers, and BOS components sold on Solarkits.in carry authentic manufacturer warranties and conform to Bureau of Indian Standards (BIS) and MNRE guidelines. Solarkits passes all original manufacturer warranties directly to the buyer.
          </p>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            3. Pricing, GST Invoicing, & Payments
          </h2>
          <p style={{ marginBottom: "24px" }}>
            Product prices are displayed in Indian Rupees (INR) and may be subject to applicable GST rates. Official GST Tax Invoices are issued upon order dispatch, allowing eligible business buyers to claim Input Tax Credit (ITC).
          </p>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            4. Exclusion of Installation Liability
          </h2>
          <p style={{ marginBottom: "24px" }}>
            Because Solarkits operates exclusively as a product supply e-commerce marketplace:
          </p>
          <ul style={{ paddingLeft: "20px", marginBottom: "28px" }}>
            <li>Solarkits is not responsible for installation workmanship, rooftop structural modifications, or electrical wiring conducted by third parties.</li>
            <li>Local DISCOM net-metering applications, approvals, or rooftop structural safety certificates remain the responsibility of the customer/installer.</li>
            <li>Warranties cover product manufacturing defects only as defined by respective brand manufacturers.</li>
          </ul>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            5. Contact Support
          </h2>
          <p style={{ margin: 0 }}>
            For queries regarding orders, products, or terms of service, please contact our support team at <strong>support@solarkits.in</strong>.
          </p>
>>>>>>> origin/main
        </div>
      </div>

      <Footer />
    </div>
  );
}
