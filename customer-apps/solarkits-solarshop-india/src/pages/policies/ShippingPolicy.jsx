import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiTruck, FiAlertTriangle } from "react-icons/fi";
import Navbar from "../landing/Navbar";
import FooterSection from "../landing/FooterSection";
import { getWebsiteLandingContent } from "../../services/websiteContentService";

const FALLBACK_SHIPPING = {
  title: "Shipping & Logistics Policy",
  last_updated: "August 2026",
  notice_box:
    "Pan-India Logistics: We deliver solar kits and heavy panels to over 18,000 pincodes across India using specialized heavy surface cargo with transit insurance coverage.",
  sections: [
    {
      id: 1,
      heading: "1. Dispatch & Delivery Timelines",
      content:
        "Standard in-stock solar kits are dispatched within 24 to 48 hours from our nearest state regional warehouse. Delivery typically takes 2 to 5 business days for major cities and 5 to 8 business days for remote or rural pincodes.",
    },
    {
      id: 2,
      heading: "2. Specialized Heavy Freight & Wooden Crating",
      content:
        "Solar panels are packed on heavy-duty wooden pallets with edge protectors to prevent microcracking during transit. ACDB/DCDB boxes and inverters are packed in moisture-resistant shockproof packaging.",
    },
    {
      id: 3,
      heading: "3. Unloading & Site Access",
      content:
        "Heavy freight deliveries are made via container trucks or commercial tempos. Deliveries are made to the ground floor / accessible driveway of the provided delivery address.",
    },
    {
      id: 4,
      heading: "4. Real-Time Tracking & Proof of Delivery",
      content:
        "Upon dispatch, you will receive an SMS and email with live LR/waybill tracking links. Consignee signature and OTP verification are required at the time of handover.",
    },
  ],
};

export default function ShippingPolicy() {
  const navigate = useNavigate();
  const [policyData, setPolicyData] = useState(FALLBACK_SHIPPING);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Shipping & Logistics Policy — Solarkits.in";

    getWebsiteLandingContent()
      .then((data) => {
        if (data && data.policies && data.policies.shipping_policy) {
          setPolicyData(data.policies.shipping_policy);
        }
      })
      .catch((err) => console.warn("Could not load dynamic Shipping Policy:", err));
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
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#0284c7", background: "#f0f9ff", padding: "6px 14px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700, marginBottom: "16px" }}>
            <FiTruck /> PAN-INDIA FULFILLMENT
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", fontFamily: "'Outfit', sans-serif" }}>
            {policyData.title || "Shipping & Logistics Policy"}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Effective Date: {policyData.last_updated || "August 2026"} • Governing Safe Transit & Freight Logistics across India.
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
