<<<<<<< HEAD
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiDollarSign, FiFileText, FiShield, FiTruck, FiAlertTriangle } from "react-icons/fi";
import Navbar from "../landingPage/Navbar";
import Footer from "../landingPage/Footer";
import { getStorePolicies } from "../../services/storeLandingService";

const DEFAULT_SECTIONS = [
  {
    id: 1,
    heading: "1. Order Cancellation Window",
    content: "You may cancel your order for a 100% full refund at any time before your shipment leaves our regional logistics warehouse (typically within 24 hours of order placement). Once dispatched and handed to heavy freight carriers, cancellations incur nominal two-way freight charges.",
  },
  {
    id: 2,
    heading: "2. Transit Damage & Dead On Arrival (DOA)",
    content: "All shipments carry comprehensive transit insurance. If you receive crates or panels with visible transit damage, note the damage on the carrier POD and notify our support desk with photos within 48 hours. We will immediately dispatch free unit replacements.",
  },
  {
    id: 3,
    heading: "3. Return Eligibility",
    content: "Unopened components in their original factory packaging can be returned within 7 days of delivery. Custom-cut DC solar cables or specially fabricated mounting structures are non-returnable once dispatched.",
  },
  {
    id: 4,
    heading: "4. Refund Processing Timelines",
    content: "Approved refunds are processed to your original payment method (bank account, credit card, or UPI) within 5 to 7 business days following inspection of returned items at our central hub.",
  },
];

export default function RefundPolicy() {
  const navigate = useNavigate();
  const [policyData, setPolicyData] = useState(null);
=======
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiRefreshCw, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import Navbar from "../landingPage/Navbar";
import Footer from "../landingPage/Footer";

export default function RefundPolicy() {
  const navigate = useNavigate();
>>>>>>> origin/main

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Refund & Cancellation Policy — Solarkits.in";
<<<<<<< HEAD
    getStorePolicies()
      .then((policies) => {
        if (policies?.refund_policy) {
          setPolicyData(policies.refund_policy);
        }
      })
      .catch((err) => console.warn("Could not load dynamic refund policy:", err));
  }, []);

  const title = policyData?.title || "Refund & Cancellation Policy";
  const lastUpdated = policyData?.last_updated || "August 2026";
  const noticeBox = policyData?.notice_box || "Cancellation & Transit Inspection Notice: Orders can be cancelled free of charge prior to warehouse pallet dispatch. Due to heavy freight logistics, please inspect all pallets and crated solar panels upon arrival before signing the transporter proof of delivery (POD).";
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
            const isActive = item.path === "/refund-policy";
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
            <FiDollarSign /> RETURNS, REFUNDS & REPLACEMENTS
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", fontFamily: "'Outfit', sans-serif" }}>
            {title}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Last Updated: {lastUpdated} • Transit Insurance, DOA Replacement, & Cancellation Terms.
          </p>
        </div>

        {/* Notice Box */}
        <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "16px", padding: "20px 24px", marginBottom: "32px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <FiAlertTriangle style={{ color: "#b45309", fontSize: "1.5rem", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "0.92rem", color: "#92400e", lineHeight: 1.6 }}>
            {noticeBox}
=======
        {/* Header Title */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "36px 40px", marginBottom: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#2563eb", background: "#eff6ff", padding: "6px 14px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700, marginBottom: "16px" }}>
            <FiRefreshCw /> GUARANTEED EQUIPMENT PROTECTION
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", fontFamily: "'Outfit', sans-serif" }}>
            Refund & Cancellation Policy
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Clear, transparent guidelines on e-commerce returns, transit damage claims, and order cancellations.
          </p>
        </div>

        {/* Notice Box: E-Commerce & No Installation Disclaimer */}
        <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "16px", padding: "20px 24px", marginBottom: "32px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <FiAlertTriangle style={{ color: "#b45309", fontSize: "1.5rem", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "0.92rem", color: "#92400e", lineHeight: 1.6 }}>
            <strong>E-Commerce Supply Policy:</strong> Solarkits.in is an <strong>E-Commerce Marketplace</strong> delivering solar panels and equipment across India. <strong>We do not provide installation or field labor services.</strong> Returns and replacements apply to product delivery, manufacturing defects, or transit damage as detailed below.
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
            1. Order Cancellation Policy
          </h2>
          <p style={{ marginBottom: "24px" }}>
            Solar panel & equipment orders on Solarkits.in may be cancelled with a 100% full refund before dispatch from our regional warehouse hubs. Once goods have been handed over to freight carriers or dispatched, standard transit charges may apply.
          </p>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            2. Transit Damage & Defect Replacement
          </h2>
          <p style={{ marginBottom: "24px" }}>
            All Solarkits shipments carry 100% full transit insurance. In the rare event of glass damage, micro-cracks, or physical defects upon arrival:
          </p>
          <ul style={{ paddingLeft: "20px", marginBottom: "28px" }}>
            <li>Please record an unboxing video or capture clear photos during truck unloading.</li>
            <li>Notify Solarkits support within 48 hours of delivery at <strong>support@solarkits.in</strong>.</li>
            <li>We issue expedited free replacements for damaged modules, inverters, or components.</li>
          </ul>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            3. Refund Timelines
          </h2>
          <p style={{ margin: 0 }}>
            Approved refunds are credited directly to the original payment method or bank account within <strong>5–7 business days</strong>.
          </p>
>>>>>>> origin/main
        </div>
      </div>

      <Footer />
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
