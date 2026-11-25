import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import { FiLinkedin, FiTwitter, FiFacebook, FiInstagram, FiPhone, FiMail, FiMapPin } from "react-icons/fi";

const SOCIAL_ICONS = [
  { icon: FiLinkedin, label: "LinkedIn", color: "#0077b5" },
  { icon: FiTwitter, label: "Twitter", color: "#1da1f2" },
  { icon: FiFacebook, label: "Facebook", color: "#4267b2" },
  { icon: FiInstagram, label: "Instagram", color: "#e1306c" },
];

const POLICY_LINKS = [
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "User Policy & Terms", path: "/terms-of-service" },
  { label: "Refund & Cancellation", path: "/refund-policy" },
];

export default function FooterSection({ footerConfig }) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const description =
    footerConfig?.description ||
    "India's premier e-commerce platform supplying certified, pre-engineered solar combo kits, inverters, and BOS hardware.";
  const copyrightText =
    footerConfig?.copyright_text || `© ${currentYear} SolarKits Technologies Pvt. Ltd. All rights reserved.`;

  return (
    <footer
      style={{
        background: "#080d1a",
        position: "relative",
        overflow: "hidden",
        color: "#ffffff",
        paddingTop: "60px",
        paddingBottom: "36px",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Top Hairline Solar Accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: "linear-gradient(90deg, #1e40af 0%, #3b82f6 30%, #eab308 70%, #f59e0b 100%)",
        }}
      />

      {/* Radiant Sunburst Ambient Background Glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "850px",
          height: "400px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(234, 179, 8, 0.1) 40%, transparent 75%)",
          filter: "blur(90px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1340px",
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Brand Logo & Subtitle */}
        <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img
            src={logo}
            alt="SolarKits SolarShop"
            style={{
              height: "56px",
              objectFit: "contain",
              marginBottom: "12px",
              filter: "drop-shadow(0 4px 16px rgba(234, 179, 8, 0.3))",
            }}
          />
          <p
            style={{
              fontSize: "0.88rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#fbbf24",
              margin: 0,
            }}
          >
            INDIA'S PREMIER SOLAR KITS MARKETPLACE
          </p>
          <p
            style={{
              maxWidth: "600px",
              color: "rgba(255, 255, 255, 0.65)",
              fontSize: "0.88rem",
              lineHeight: 1.6,
              marginTop: "10px",
            }}
          >
            {description}
          </p>
        </div>

        {/* Contact info bar if configured */}
        {(footerConfig?.phone || footerConfig?.email) && (
          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              margin: "12px 0 20px 0",
              fontSize: "0.85rem",
              color: "rgba(255, 255, 255, 0.75)",
            }}
          >
            {footerConfig?.phone && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <FiPhone style={{ color: "#fbbf24" }} /> {footerConfig.phone}
              </span>
            )}
            {footerConfig?.email && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <FiMail style={{ color: "#60a5fa" }} /> {footerConfig.email}
              </span>
            )}
          </div>
        )}

        {/* GIANT GRADIENT SVG "SOLARKITS" TEXT */}
        <div
          style={{
            width: "100%",
            maxWidth: "1150px",
            margin: "10px 0 24px 0",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            userSelect: "none",
          }}
        >
          <svg
            viewBox="0 0 1100 150"
            width="100%"
            style={{
              height: "auto",
              maxHeight: "160px",
              overflow: "visible",
              filter: "drop-shadow(0 10px 25px rgba(234, 179, 8, 0.2))",
            }}
          >
            <defs>
              <linearGradient id="solarkitsBrightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="35%" stopColor="#3b82f6" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="url(#solarkitsBrightGrad)"
              style={{
                fontSize: "122px",
                fontWeight: 900,
                fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
                letterSpacing: "-0.03em",
                textTransform: "uppercase",
              }}
            >
              SOLARKITS
            </text>
          </svg>
        </div>

        {/* Essential Legal & Policy Links Row */}
        <div
          style={{
            display: "flex",
            gap: "28px",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          {POLICY_LINKS.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontFamily: "inherit",
                padding: "4px 8px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fbbf24";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Social Icons Bar */}
        <div style={{ display: "flex", gap: "14px", marginBottom: "32px" }}>
          {SOCIAL_ICONS.map(({ icon: Icon, label, color }) => (
            <button
              key={label}
              aria-label={label}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                fontSize: "1.1rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${color}30`;
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = `0 8px 20px ${color}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
              }}
            >
              <Icon />
            </button>
          ))}
        </div>

        {/* Bottom Minimal Copyright Bar */}
        <div
          style={{
            width: "100%",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <p
            style={{
              color: "rgba(255, 255, 255, 0.45)",
              fontSize: "0.85rem",
              fontWeight: 500,
              letterSpacing: "0.02em",
              margin: 0,
            }}
          >
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
}
