import React, { useState, useEffect, useCallback } from "react";
import {
  FiMonitor,
  FiEdit3,
  FiEye,
  FiLayers,
  FiSave,
  FiExternalLink,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiStar,
  FiPhone,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiShield,
  FiHelpCircle,
  FiVideo,
} from "react-icons/fi";
import { FaFileContract, FaYoutube, FaStore } from "react-icons/fa";
import {
  getWebsiteContent,
  updateWebsiteContent,
  resetWebsiteContent,
} from "../../../../api/websiteContentApi";
import Loader from "../../../../components/Loader";

const DEFAULT_FRANCHISE_STATE = {
  video: {
    enabled: true,
    heading: "Indoor Solar Cooking System & Clean Tech Ecosystem",
    subtitle: "Watch how SolarKits pre-engineered solutions empower thousands of entrepreneurs across India.",
    youtube_url: "https://youtu.be/EE_lzTCuOH0?si=OIF4sGNgzh8lSONA",
    video_id: "EE_lzTCuOH0",
  },
  testimonials: {
    enabled: true,
    badge_text: "VERIFIED BUSINESS PROOF",
    heading: "Trusted by 1,200+ Dealers, EPCs & Solar Entrepreneurs",
    highlight_heading: "Solar Entrepreneurs",
    subtitle: "Real feedback from verified solar businesses operating with Solarkits turnkey solutions across India.",
    items: [
      {
        name: "Vikram Rathi",
        role: "Authorized Franchisee Dealer",
        company: "Rathi Solar Power (Pune, MH)",
        volume: "120+ Rooftops Completed",
        quote: "Switching from buying separate panels and inverters to ordering complete Solarkits was the best operational decision. The pre-wired ACDB/DCDB boxes cut our rooftop installation time from 3 days to under 6 hours!",
        rating: 5,
        verified_badge: "GST Verified",
      },
      {
        name: "Suresh Patel",
        role: "Commercial EPC Contractor",
        company: "SunShine Energy Solutions (Ahmedabad, GJ)",
        volume: "450 kW+ Projects Installed",
        quote: "The 550W and 580W TOPCon Solarkits with full 12% GST ITC invoices allow us to quote aggressively on industrial projects while maintaining healthy 17% net margins. Fast 48-hr warehouse dispatch is unmatched.",
        rating: 5,
        verified_badge: "EPC Partner",
      },
      {
        name: "Manish Sharma",
        role: "District Franchise Partner",
        company: "Jaipur Solar Tech (Jaipur, RJ)",
        volume: "85 PM Surya Ghar Homes",
        quote: "All DCR kits come with pre-verified ALMM certificates and SLD drawings. Not a single PM Surya Ghar inspection rejected by Rajasthan DISCOM. Our customers received their DBT subsidies within 25 days.",
        rating: 5,
        verified_badge: "DCR Certified",
      },
    ],
  },
  faq: {
    enabled: true,
    badge_text: "FREQUENTLY ASKED QUESTIONS",
    heading: "Everything You Need to Know About Solarkits & Dealerships",
    highlight_heading: "Solarkits & Dealerships",
    categories: [
      {
        name: "Complete SolarKits",
        items: [
          {
            q: "What components are included in a standard Solarkit?",
            a: "Every Solarkit is a turn-key solution containing Tier-1 Mono PERC or N-Type TOPCon Solar Modules, a cloud-connected smart grid or hybrid inverter, pre-wired IP65 ACDB & DCDB boxes with Type-II SPDs, UV-rated 4/6sqmm DC solar cables, chemical bonded earthing electrodes, copper lightning arrester, and elevated HDGI mounting hardware.",
          },
          {
            q: "Are Solarkits compliant with PM Surya Ghar Muft Bijli Yojana?",
            a: "Yes. All DCR designated Solarkits (1.1kW, 2.2kW, 3.3kW, 5kW) use ALMM-approved, MNRE-certified Domestic Content Requirement (DCR) solar cells and modules, qualifying your customers for up to ₹78,000 direct bank DBT subsidies.",
          },
          {
            q: "Can I customize the inverter brand or panel wattage in a Solarkit?",
            a: "Yes. In addition to our pre-engineered standard packages, dealers can request custom combinations (e.g. 580W TOPCon with Deye Hybrid Inverter) via the 'Request Custom Configuration' action on the catalog.",
          },
        ],
      },
      {
        name: "Franchise & Territory",
        items: [
          {
            q: "How does territory exclusivity work for authorized franchisees?",
            a: "When you are onboarded as an Authorized Dealer, up to 2 revenue districts are assigned exclusively to your franchise code. Local residential rooftop and commercial EPC buyer inquiries originating from those districts are automatically routed to your portal dashboard.",
          },
          {
            q: "Is GST registration mandatory to become a franchisee?",
            a: "GST registration is recommended to claim 100% of the 12% GST Input Tax Credit (ITC) on factory-gate purchases. However, individual solar contractors without GST can begin under our Commission Starter Partner plan.",
          },
          {
            q: "What is the upfront investment required to launch a Solarkits store?",
            a: "The Commission Starter Partner program has zero upfront investment. For Authorized Dealerships with stocking rights and territory protection, the program fee is only ₹5,000/year plus your initial equipment inventory capital.",
          },
        ],
      },
      {
        name: "B2B Pricing & Payouts",
        items: [
          {
            q: "How are franchise commissions paid out?",
            a: "All commission earnings are credited automatically to your Franchisee Earnings Wallet in real-time. Admin accounts team processes direct NEFT/RTGS settlements directly to your registered bank account.",
          },
          {
            q: "How fast is regional hub dispatch and what are the delivery charges?",
            a: "Orders are dispatched within 24 to 48 hours from our nearest state regional warehouse with full transit insurance. Delivery is free for local hub radius orders or calculated at transparent nominal freight rates for remote sites.",
          },
          {
            q: "How are equipment warranty replacements handled?",
            a: "All items carry direct manufacturer warranties (10-12 yrs on panels, 5-7 yrs on inverters, 5 yrs on BOS). SolarKits provides centralized RMA assistance and fast regional unit swaps so you don't face customer downtime.",
          },
        ],
      },
    ],
    consultation_desk: {
      badge_text: "Priority B2B Desk",
      title: "Request Partner Consultation",
      subtitle: "Have questions regarding state distribution or container pricing? Our team will call back within 2 hours.",
      whatsapp_number: "919876543210",
      whatsapp_button_text: "Chat Directly on WhatsApp",
      submit_button_text: "Request Callback Now →",
    },
  },
  footer: {
    brand_title: "Solarkits Platform",
    brand_subtitle: "B2B Franchise Network",
    description: "India's primary B2B ready-to-sell solar platform and franchise opportunity. Sourcing certified On-Grid, Off-Grid, and Hybrid Solarkits for solar dealers, EPC contractors, and regional distributors.",
    badges: ["ALMM / DCR Certified", "100% GST ITC Claim"],
    contact: {
      desk_title: "National B2B Partner Desk",
      address: "SolarKits Tech Park, Phase-1 Central Logistics Hub, Pune, Maharashtra 411045",
      phone: "+91 (020) 6789-SOLAR / 1800-SOLAR-KIT",
      email: "franchise@solarkits.in | b2b@solarkits.in",
      whatsapp_number: "919876543210",
      whatsapp_button_text: "WhatsApp B2B",
      callback_button_text: "Request Callback",
    },
    disclaimer: "Regulatory & Statutory Disclaimer: Solarkits is a registered B2B e-commerce platform and equipment fulfillment provider for authorized dealers, EPC contractors, and franchisees. Revenue figures, margins, and generation estimates shown on this website are illustrative and depend on territory, sales volume, product mix, margins, operating costs, and business performance. Solarkits does not guarantee revenue or profit. PM Surya Ghar Muft Bijli Yojana subsidies are disbursed directly by the Government of India / State DISCOMs subject to applicant eligibility and DISCOM technical feasibility.",
    copyright_text: "© 2026 Solarkits Platform India. All Rights Reserved. Position: One-Stop Solar Business Platform.",
    policy_links: [
      { label: "Privacy Policy", url: "#" },
      { label: "Terms of Franchise", url: "#" },
      { label: "GST Compliance", url: "#" },
    ],
  },
  store_availability: {
    badge_text: "Live Territory Availability Checker",
    heading: "Check Franchise Availability in Your District / Region",
    subtitle: "Instant verification for pincodes, district quotas, and exclusive territorial dealership authorizations.",
  },
};

const extractYouTubeId = (urlOrId) => {
  if (!urlOrId) return "";
  const value = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  const match = value.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : "";
};

export default function FranchiseWebsite() {
  const [activeTab, setActiveTab] = useState("video");
  const [sections, setSections] = useState(DEFAULT_FRANCHISE_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [selectedFaqCategoryIdx, setSelectedFaqCategoryIdx] = useState(0);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWebsiteContent("franchise");
      if (res && res.data && res.data.sections) {
        setSections({
          ...DEFAULT_FRANCHISE_STATE,
          ...res.data.sections,
        });
      }
    } catch (err) {
      console.warn("Could not load from API, using default data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const res = await updateWebsiteContent("franchise", sections);
      if (res && res.status === "success") {
        setAlert({
          type: "success",
          message: "Franchise website dynamic landing page content updated successfully!",
        });
        if (res.data && res.data.sections) {
          setSections(res.data.sections);
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      setAlert({
        type: "error",
        message: err?.response?.data?.message || "Failed to save website content. Please try again.",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset all content back to factory defaults?")) return;
    setSaving(true);
    try {
      const res = await resetWebsiteContent("franchise");
      if (res && res.status === "success") {
        setSections(DEFAULT_FRANCHISE_STATE);
        setAlert({ type: "success", message: "Reset to default franchise content successfully!" });
      }
    } catch (err) {
      setAlert({ type: "error", message: "Failed to reset content." });
    } finally {
      setSaving(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  // Testimonial helpers
  const handleAddTestimonial = () => {
    const newItem = {
      name: "New Partner",
      role: "Solar Installer / EPC",
      company: "Solar Tech Solutions",
      volume: "50+ Rooftops Completed",
      quote: "Solarkits simplified our procurement process with 100% genuine components and fast warehouse dispatch.",
      rating: 5,
      verified_badge: "GST Verified",
    };
    setSections((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: [...(prev.testimonials?.items || []), newItem],
      },
    }));
  };

  const handleUpdateTestimonial = (index, field, value) => {
    setSections((prev) => {
      const items = [...(prev.testimonials?.items || [])];
      items[index] = { ...items[index], [field]: value };
      return {
        ...prev,
        testimonials: { ...prev.testimonials, items },
      };
    });
  };

  const handleDeleteTestimonial = (index) => {
    setSections((prev) => {
      const items = prev.testimonials?.items?.filter((_, i) => i !== index) || [];
      return {
        ...prev,
        testimonials: { ...prev.testimonials, items },
      };
    });
  };

  // FAQ helpers
  const handleAddFaqItem = (categoryIdx) => {
    setSections((prev) => {
      const categories = [...(prev.faq?.categories || [])];
      if (categories[categoryIdx]) {
        categories[categoryIdx] = {
          ...categories[categoryIdx],
          items: [
            ...(categories[categoryIdx].items || []),
            { q: "New Question Title?", a: "Detailed answer explaining the solution and process..." },
          ],
        };
      }
      return {
        ...prev,
        faq: { ...prev.faq, categories },
      };
    });
  };

  const handleUpdateFaqItem = (categoryIdx, itemIdx, field, value) => {
    setSections((prev) => {
      const categories = [...(prev.faq?.categories || [])];
      if (categories[categoryIdx] && categories[categoryIdx].items[itemIdx]) {
        const items = [...categories[categoryIdx].items];
        items[itemIdx] = { ...items[itemIdx], [field]: value };
        categories[categoryIdx] = { ...categories[categoryIdx], items };
      }
      return {
        ...prev,
        faq: { ...prev.faq, categories },
      };
    });
  };

  const handleDeleteFaqItem = (categoryIdx, itemIdx) => {
    setSections((prev) => {
      const categories = [...(prev.faq?.categories || [])];
      if (categories[categoryIdx]) {
        categories[categoryIdx] = {
          ...categories[categoryIdx],
          items: categories[categoryIdx].items.filter((_, i) => i !== itemIdx),
        };
      }
      return {
        ...prev,
        faq: { ...prev.faq, categories },
      };
    });
  };

  const handleAddFaqCategory = () => {
    const name = window.prompt("Enter new FAQ Category name:");
    if (!name) return;
    setSections((prev) => ({
      ...prev,
      faq: {
        ...prev.faq,
        categories: [
          ...(prev.faq?.categories || []),
          { name, items: [{ q: "Sample Question?", a: "Sample Answer..." }] },
        ],
      },
    }));
  };

  if (loading) {
    return <Loader text="Loading Franchise Landing Page configurations..." />;
  }

  const currentVideoId = extractYouTubeId(sections.video?.youtube_url || sections.video?.video_id);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Action Header */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-xl shrink-0 mt-1 shadow-sm">
            <FaFileContract size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-text-primary">Franchise Landing Page CMS</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live on Port 5178
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                Full Dynamic Sync
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Directly edit and publish changes for Video showcase, Verified Business Proof (Testimonials), FAQs & Partner Desk, and Footers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => window.open("http://localhost:5178", "_blank")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-hover text-text-primary text-sm font-semibold hover:border-primary/50 transition-all cursor-pointer"
          >
            <FiExternalLink />
            <span>Open Website</span>
          </button>

          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border text-text-secondary hover:text-red-500 hover:border-red-300 text-sm font-semibold transition-all cursor-pointer"
            title="Reset to factory defaults"
          >
            <FiRefreshCw className={saving ? "animate-spin" : ""} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <FiSave />
            <span>{saving ? "Saving..." : "Save All Changes"}</span>
          </button>
        </div>
      </div>

      {/* Alert message */}
      {alert && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${
            alert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {alert.type === "success" ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Section Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: "video", label: "1. Video Showcase", icon: <FiVideo /> },
          { id: "testimonials", label: "2. Verified Proof", icon: <FiStar /> },
          { id: "faq", label: "3. FAQs & Desk", icon: <FiHelpCircle /> },
          { id: "footer", label: "4. Footer & Legal", icon: <FaFileContract /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl border flex items-center gap-3 font-bold text-sm transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Video Showcase ────────────────────────────────────── */}
      {activeTab === "video" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FaYoutube className="text-red-500" size={22} />
                <span>Video Showcase & Hero Media</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Configure the primary YouTube video player displayed at the top of the Franchise landing page.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-text-primary">
              <input
                type="checkbox"
                checked={sections.video?.enabled !== false}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    video: { ...prev.video, enabled: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              Section Enabled
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  YouTube Video Link / URL
                </label>
                <input
                  type="text"
                  value={sections.video?.youtube_url || ""}
                  onChange={(e) => {
                    const url = e.target.value;
                    const extracted = extractYouTubeId(url);
                    setSections((prev) => ({
                      ...prev,
                      video: {
                        ...prev.video,
                        youtube_url: url,
                        video_id: extracted || prev.video?.video_id,
                      },
                    }));
                  }}
                  placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary font-mono text-xs"
                />
                <p className="text-[11px] text-text-secondary">
                  Detected Video ID: <strong className="text-primary font-mono">{currentVideoId || "None"}</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Video Heading / Label (Internal / Meta)
                </label>
                <input
                  type="text"
                  value={sections.video?.heading || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      video: { ...prev.video, heading: e.target.value },
                    }))
                  }
                  placeholder="e.g. Indoor Solar Cooking System & Clean Tech Ecosystem"
                  className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Description / Subtitle
                </label>
                <textarea
                  rows={3}
                  value={sections.video?.subtitle || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      video: { ...prev.video, subtitle: e.target.value },
                    }))
                  }
                  placeholder="Summary text regarding this showcase video..."
                  className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            {/* Live Video Preview Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Live Video Preview
              </label>
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border shadow-md flex items-center justify-center">
                {currentVideoId ? (
                  <iframe
                    className="w-full h-full border-0"
                    src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?controls=1&rel=0`}
                    title="Live YouTube preview"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2">
                    <FaYoutube size={42} className="mx-auto text-red-500/60" />
                    <p className="text-xs font-medium">Please enter a valid YouTube URL</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Verified Business Proof (Testimonials) ───────────── */}
      {activeTab === "testimonials" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FiCheckCircle className="text-emerald-600" size={20} />
                <span>Verified Business Proof (Testimonials)</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage the feedback cards, ratings, badges, and author credentials shown to prospective franchise buyers.
              </p>
            </div>
            <button
              onClick={handleAddTestimonial}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs transition-colors cursor-pointer"
            >
              <FiPlus /> Add Review Card
            </button>
          </div>

          {/* Section Headers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Badge Header
              </label>
              <input
                type="text"
                value={sections.testimonials?.badge_text || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    testimonials: { ...prev.testimonials, badge_text: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Main Heading
              </label>
              <input
                type="text"
                value={sections.testimonials?.heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    testimonials: { ...prev.testimonials, heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Highlighted Word(s)
              </label>
              <input
                type="text"
                value={sections.testimonials?.highlight_heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    testimonials: { ...prev.testimonials, highlight_heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-primary"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Subtitle Description
              </label>
              <input
                type="text"
                value={sections.testimonials?.subtitle || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    testimonials: { ...prev.testimonials, subtitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
              />
            </div>
          </div>

          {/* Testimonials List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Testimonial Cards ({sections.testimonials?.items?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handleAddTestimonial}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <FiPlus size={15} /> Add Review Card
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(sections.testimonials?.items || []).map((t, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-text-secondary bg-surface-hover px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <button
                      onClick={() => handleDeleteTestimonial(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete card"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        Person Name
                      </label>
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => handleUpdateTestimonial(idx, "name", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        Verified Tag
                      </label>
                      <input
                        type="text"
                        value={t.verified_badge}
                        onChange={(e) => handleUpdateTestimonial(idx, "verified_badge", e.target.value)}
                        placeholder="GST Verified"
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        Company & Location
                      </label>
                      <input
                        type="text"
                        value={t.company}
                        onChange={(e) => handleUpdateTestimonial(idx, "company", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        Volume Tag
                      </label>
                      <input
                        type="text"
                        value={t.volume}
                        onChange={(e) => handleUpdateTestimonial(idx, "volume", e.target.value)}
                        placeholder="120+ Rooftops"
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-blue-600 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block">
                      Quote / Review Text
                    </label>
                    <textarea
                      rows={3}
                      value={t.quote}
                      onChange={(e) => handleUpdateTestimonial(idx, "quote", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-primary resize-none"
                    />
                  </div>
                </div>
              ))}

              {/* Dotted Add New Card Placeholder */}
              <button
                type="button"
                onClick={handleAddTestimonial}
                className="p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer min-h-[220px]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                  <FiPlus size={22} />
                </div>
                <span className="font-bold text-sm">+ Add Review Card</span>
                <span className="text-[11px] text-text-secondary font-normal text-center">
                  Click here to add another testimonial card
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: FAQ & Consultation Desk ─────────────────────────── */}
      {activeTab === "faq" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FiHelpCircle className="text-blue-500" size={20} />
                <span>Frequently Asked Questions & Consultation Desk</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage FAQ accordions, categories, and direct partner desk callback contact numbers.
              </p>
            </div>
            <button
              onClick={handleAddFaqCategory}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
            >
              <FiPlus /> Add FAQ Category
            </button>
          </div>

          {/* Section Headers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Section Heading
              </label>
              <input
                type="text"
                value={sections.faq?.heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    faq: { ...prev.faq, heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-secondary uppercase">
                Highlighted Word(s)
              </label>
              <input
                type="text"
                value={sections.faq?.highlight_heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    faq: { ...prev.faq, highlight_heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-amber-500"
              />
            </div>
          </div>

          {/* FAQ Category Selector */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
              {(sections.faq?.categories || []).map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedFaqCategoryIdx(idx)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedFaqCategoryIdx === idx
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface-hover text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {cat.name} ({cat.items?.length || 0})
                </button>
              ))}
              <button
                type="button"
                onClick={handleAddFaqCategory}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-primary/40 text-primary hover:bg-primary/5 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <FiPlus size={13} /> Add Category
              </button>
            </div>

            {/* Questions under selected category */}
            {sections.faq?.categories?.[selectedFaqCategoryIdx] && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-text-primary uppercase">
                    Questions in "{sections.faq.categories[selectedFaqCategoryIdx].name}"
                  </h5>
                  <button
                    onClick={() => handleAddFaqItem(selectedFaqCategoryIdx)}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <FiPlus /> Add Question
                  </button>
                </div>

                <div className="space-y-3">
                  {(sections.faq.categories[selectedFaqCategoryIdx].items || []).map((item, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary block">
                            Question #{qIdx + 1}
                          </label>
                          <input
                            type="text"
                            value={item.q}
                            onChange={(e) =>
                              handleUpdateFaqItem(selectedFaqCategoryIdx, qIdx, "q", e.target.value)
                            }
                            className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteFaqItem(selectedFaqCategoryIdx, qIdx)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors mt-4"
                          title="Delete Q&A"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary block">
                          Answer Content
                        </label>
                        <textarea
                          rows={2}
                          value={item.a}
                          onChange={(e) =>
                            handleUpdateFaqItem(selectedFaqCategoryIdx, qIdx, "a", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary resize-none"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddFaqItem(selectedFaqCategoryIdx)}
                    className="w-full p-3.5 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer"
                  >
                    <FiPlus size={16} />
                    <span>+ Add Question to "{sections.faq.categories[selectedFaqCategoryIdx].name}"</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Priority B2B Consultation Desk Card Settings */}
          <div className="p-5 rounded-xl border border-border bg-surface-hover space-y-4">
            <div className="flex items-center gap-2">
              <FiPhone className="text-primary" />
              <h4 className="text-sm font-bold text-text-primary">
                Priority B2B Desk & WhatsApp Inquiry Settings
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">
                  Card Title
                </label>
                <input
                  type="text"
                  value={sections.faq?.consultation_desk?.title || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      faq: {
                        ...prev.faq,
                        consultation_desk: {
                          ...prev.faq?.consultation_desk,
                          title: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">
                  WhatsApp Contact Number
                </label>
                <input
                  type="text"
                  value={sections.faq?.consultation_desk?.whatsapp_number || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      faq: {
                        ...prev.faq,
                        consultation_desk: {
                          ...prev.faq?.consultation_desk,
                          whatsapp_number: e.target.value,
                        },
                      },
                    }))
                  }
                  placeholder="e.g. 919876543210"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">
                  WhatsApp Button Label
                </label>
                <input
                  type="text"
                  value={sections.faq?.consultation_desk?.whatsapp_button_text || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      faq: {
                        ...prev.faq,
                        consultation_desk: {
                          ...prev.faq?.consultation_desk,
                          whatsapp_button_text: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-primary"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Footer & Legal ───────────────────────────────────── */}
      {activeTab === "footer" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FaFileContract className="text-primary" size={18} />
              <span>Footer, Contact Desk & Statutory Disclaimers</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Customize the footer contact information, partner desk addresses, statutory disclaimers, and copyright text.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Brand Title Header
              </label>
              <input
                type="text"
                value={sections.footer?.brand_title || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, brand_title: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm font-bold text-text-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Brand Subtitle Tag
              </label>
              <input
                type="text"
                value={sections.footer?.brand_subtitle || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, brand_subtitle: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm font-bold text-amber-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Certification Badges
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const tag = window.prompt("Enter new badge label:");
                    if (tag) {
                      setSections((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          badges: [...(prev.footer?.badges || []), tag],
                        },
                      }));
                    }
                  }}
                  className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <FiPlus /> Add Badge
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-surface-hover border border-border min-h-[46px]">
                {(sections.footer?.badges || []).map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                  >
                    <span>{b}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSections((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            badges: (prev.footer?.badges || []).filter((_, idx) => idx !== i),
                          },
                        }));
                      }}
                      className="text-emerald-700 hover:text-red-500 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(!sections.footer?.badges || sections.footer.badges.length === 0) && (
                  <span className="text-xs text-text-secondary">No badges added yet.</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                National Partner Desk Title
              </label>
              <input
                type="text"
                value={sections.footer?.contact?.desk_title || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      contact: { ...prev.footer?.contact, desk_title: e.target.value },
                    },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm font-bold text-text-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Support Phone Numbers
              </label>
              <input
                type="text"
                value={sections.footer?.contact?.phone || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      contact: { ...prev.footer?.contact, phone: e.target.value },
                    },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Physical Office & Hub Address
              </label>
              <input
                type="text"
                value={sections.footer?.contact?.address || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      contact: { ...prev.footer?.contact, address: e.target.value },
                    },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Contact Email Addresses
              </label>
              <input
                type="text"
                value={sections.footer?.contact?.email || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      contact: { ...prev.footer?.contact, email: e.target.value },
                    },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Footer WhatsApp Number
              </label>
              <input
                type="text"
                value={sections.footer?.contact?.whatsapp_number || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      contact: { ...prev.footer?.contact, whatsapp_number: e.target.value },
                    },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm font-mono text-emerald-600 font-bold"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Regulatory & Statutory Disclaimer Text
              </label>
              <textarea
                rows={3}
                value={sections.footer?.disclaimer || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, disclaimer: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-xs text-text-secondary resize-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Copyright Notice
              </label>
              <input
                type="text"
                value={sections.footer?.copyright_text || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, copyright_text: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-xs text-text-secondary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}