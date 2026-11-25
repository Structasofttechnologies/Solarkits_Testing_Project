import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiDollarSign, FiAlertTriangle } from "react-icons/fi";
import Navbar from "../landing/Navbar";
import FooterSection from "../landing/FooterSection";
import { getWebsiteLandingContent } from "../../services/websiteContentService";

const FALLBACK_REFUND = {
  title: "Refund & Cancellation Policy",
  last_updated: "August 2026",
  notice_box:
    "Cancellation & Transit Inspection Notice: Orders can be cancelled free of charge prior to warehouse pallet dispatch. Due to heavy freight logistics, please inspect all pallets and crated solar panels upon arrival before signing the transporter proof of delivery (POD).",
  sections: [
    {
      id: 1,
      heading: "1. Order Cancellation Window",
      content:
        "You may cancel your order for a 100% full refund at any time before your shipment leaves our regional logistics warehouse (typically within 24 hours of order placement). Once dispatched and handed to heavy freight carriers, cancellations incur nominal two-way freight charges.",
    },
    {
      id: 2,
      heading: "2. Transit Damage & Dead On Arrival (DOA)",
      content:
        "All shipments carry comprehensive transit insurance. If you receive crates or panels with visible transit damage, note the damage on the carrier POD and notify our support desk with photos within 48 hours. We will immediately dispatch free unit replacements.",
    },
    {
      id: 3,
      heading: "3. Return Eligibility",
      content:
        "Unopened components in their original factory packaging can be returned within 7 days of delivery. Custom-cut DC solar cables or specially fabricated mounting structures are non-returnable once dispatched.",
    },
    {
      id: 4,
      heading: "4. Refund Processing Timelines",
      content:
        "Approved refunds are processed to your original payment method (bank account, credit card, or UPI) within 5 to 7 business days following inspection of returned items at our central hub.",
    },
  ],
};

export default function RefundPolicy() {
  const navigate = useNavigate();
  const [policyData, setPolicyData] = useState(FALLBACK_REFUND);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Refund & Cancellation Policy — Solarkits.in";

    getWebsiteLandingContent()
      .then((data) => {
        if (data && data.policies && data.policies.refund_policy) {
          setPolicyData(data.policies.refund_policy);
        }
      })
      .catch((err) => console.warn("Could not load dynamic Refund Policy:", err));
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
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#16a34a", background: "#f0fdf4", padding: "6px 14px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700, marginBottom: "16px" }}>
            <FiDollarSign /> TRANSPARENT GUARANTEE
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", fontFamily: "'Outfit', sans-serif" }}>
            {policyData.title || "Refund & Cancellation Policy"}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Effective Date: {policyData.last_updated || "August 2026"} • Applies to all hardware purchases on Solarkits.in.
          </p>
        </div>

        {/* Notice Box */}
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
