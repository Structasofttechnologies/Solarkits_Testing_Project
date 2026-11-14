import { useState, useEffect } from "react";
import Navbar from "./landing/Navbar";
import HeroSection from "./landing/HeroSection";
import StatsSection from "./landing/StatsSection";
import ProductsSection from "./landing/ProductsSection";
import WhyChooseSection from "./landing/WhyChooseSection";
import HowItWorks from "./landing/HowItWorks";
import TestimonialsSection from "./landing/TestimonialsSection";
import CtaBanner from "./landing/CtaBanner";
import FooterSection from "./landing/FooterSection";
import { getWebsiteLandingContent } from "../services/websiteContentService";

// Ticker / Marquee bar — trusted brands
const DEFAULT_TICKER = [
  "⚡ BIS Certified Products",
  "☀️ Tier-1 Solar Panels",
  "🔋 Lithium & Lead-Acid Batteries",
  "🔌 String & Microinverters",
  "📦 Same-Day Dispatch",
  "🇮🇳 Made in India Options",
  "💳 100% Secure Payments",
  "📋 GST Invoice Provided",
  "🌿 PM-KUSUM Subsidy Eligible",
  "🛡️ MNRE Approved Brands",
];

function TickerBar({ tickerItems }) {
  const list = tickerItems && tickerItems.length > 0 ? tickerItems : DEFAULT_TICKER;
  const items = [...list, ...list];

  return (
    <div style={{
      background: "linear-gradient(135deg, #253880, #1d2c66)",
      overflow: "hidden",
      height: "40px",
      display: "flex",
      alignItems: "center",
      position: "relative",
      zIndex: 10,
    }}>
      {/* Left fade */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "80px",
        background: "linear-gradient(90deg, #253880, transparent)",
        zIndex: 1,
      }} />

      <div
        className="animate-marquee"
        style={{
          display: "flex",
          gap: "0",
          whiteSpace: "nowrap",
          willChange: "transform",
        }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              padding: "0 28px",
              color: "rgba(255,255,255,0.9)",
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              borderRight: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {item}
          </span>
        ))}
      </div>

      {/* Right fade */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "80px",
        background: "linear-gradient(270deg, #1d4ed8, transparent)",
        zIndex: 1,
      }} />
    </div>
  );
}

export default function LandingPage() {
  const [dynamicContent, setDynamicContent] = useState(null);

  useEffect(() => {
    document.title = "SolarKits India — Buy Certified Solar Kits Online";

    getWebsiteLandingContent()
      .then((data) => {
        if (data) {
          setDynamicContent(data);
        }
      })
      .catch((err) => console.warn("Dynamic content load error:", err));
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', 'Outfit', system-ui, sans-serif", background: "#fff", color: "#0f172a" }}>
      {/* Fixed Navigation */}
      <Navbar />

      {/* Hero — Full viewport */}
      <HeroSection heroConfig={dynamicContent?.hero} />

      {/* Scrolling ticker below hero */}
      <TickerBar tickerItems={dynamicContent?.ticker?.items} />

      {/* Stats — Social proof numbers */}
      <StatsSection statsConfig={dynamicContent?.stats} />

      {/* Products — Kit categories */}
      <ProductsSection productsConfig={dynamicContent?.products} />

      {/* Why Choose — Feature grid */}
      <WhyChooseSection whyChooseConfig={dynamicContent?.why_choose} />

      {/* How It Works — 4-step process */}
      <HowItWorks howItWorksConfig={dynamicContent?.how_it_works} />

      {/* Testimonials — Customer carousel */}
      <TestimonialsSection testimonialsConfig={dynamicContent?.testimonials} />

      {/* CTA Banner — Conversion */}
      <CtaBanner ctaConfig={dynamicContent?.cta_banner} />

      {/* Footer */}
      <FooterSection footerConfig={dynamicContent?.footer} />

      {/* WhatsApp Floating Assistance Button */}
      <a
        href="https://wa.me/917777939842?text=Hello%20SolarKits,%20I%20have%20an%20inquiry%20regarding%20solar%20kits."
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          backgroundColor: "#25D366",
          color: "white",
          borderRadius: "50%",
          width: "56px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 20px rgba(37, 211, 102, 0.4)",
          zIndex: 9999,
          cursor: "pointer",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
        }}
        aria-label="Chat on WhatsApp"
        title="Chat with Ravi Sir on WhatsApp"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(37, 211, 102, 0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(37, 211, 102, 0.4)";
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
