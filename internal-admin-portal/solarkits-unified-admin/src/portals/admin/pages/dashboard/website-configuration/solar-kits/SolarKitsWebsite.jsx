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
  FiPackage,
  FiZap,
  FiSun,
  FiGrid,
  FiAward,
  FiShoppingCart,
  FiTag,
  FiTrendingUp,
  FiFileText,
  FiTruck,
  FiDollarSign,
  FiGlobe,
} from "react-icons/fi";
import { HiCube, HiSparkles } from "react-icons/hi";
import { FaSolarPanel, FaShieldAlt, FaComments } from "react-icons/fa";
import {
  getWebsiteContent,
  updateWebsiteContent,
  resetWebsiteContent,
} from "../../../../api/websiteContentApi";
import Loader from "../../../../components/Loader";

const DEFAULT_SOLARKITS_STATE = {
  hero: {
    enabled: true,
    badge_text: "⚡ India's Pre-Engineered Solar Kit Platform",
    headline: "Everything You Need for Solar\nIn One Complete Box",
    highlight_headline: "In One Complete Box",
    subtitle: "Pre-configured solar packages with Tier-1 panels, smart inverters, and plug-and-play BOS hardware. Direct delivery to your project site across 18,000+ pincodes.",
    cta_primary: { label: "Explore Solar Kits", href: "#products" },
    cta_secondary: { label: "Talk to Expert", href: "#contact" },
    trust_badges: ["✅ 100% Genuine Tier-1 Hardware", "📦 Same-Day Dispatch", "🛡️ 25-Yr Performance Warranty", "📋 Official GST Invoices"],
    stats: [
      { value: "10,000+", label: "Kits Delivered", sub: "Pan-India" },
      { value: "50MW+", label: "Clean Capacity", sub: "Installed" },
      { value: "18,000+", label: "Pincodes Covered", sub: "Express Logistics" },
      { value: "4.9 / 5", label: "Customer Rating", sub: "Verified Reviews" },
    ],
  },
  ticker: {
    enabled: true,
    items: [
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
    ],
  },
  stats: {
    enabled: true,
    badge_text: "OUR IMPACT IN NUMBERS",
    heading: "Powering India's Clean Energy Transition",
    subtitle: "Delivering certified solar kits to homeowners, EPCs, and businesses nationwide.",
    items: [
      { value: "10,000+", label: "Complete Kits Installed", sub: "Across 28 Indian States & UTs" },
      { value: "50 MW+", label: "Clean Power Generated", sub: "Equivalent to 40,000 metric tons of CO2 offset" },
      { value: "18,000+", label: "Pincodes Serviced", sub: "Pan-India logistics with door-to-door insurance" },
      { value: "4.9 / 5", label: "Customer Satisfaction", sub: "Based on 2,500+ verified customer reviews" },
    ],
  },
  products: {
    enabled: true,
    badge_text: "COMPLETE SOLAR PACKAGES",
    heading: "Engineered Solar Kits for Every Need",
    subtitle: "Select from our range of pre-configured rooftop systems, custom hybrid combos, and BOS packages.",
    items: [
      {
        id: 1,
        name: "On-Grid Rooftop Solar Kits",
        tag: "PM Surya Ghar Ready",
        desc: "Grid-tied solar systems with high-efficiency TopCon mono panels and net-metering smart inverters. Save up to ₹78,000 with government subsidy.",
        specs: ["1kW to 10kW Capacity", "TopCon Mono Panels", "Net-Metering Inverter", "Complete BOS Kit"],
        price: "Starting at ₹48,000",
        link: "#contact",
      },
      {
        id: 2,
        name: "Off-Grid Solar Battery Kits",
        tag: "24x7 Independence",
        desc: "Independent standalone power systems with tubular or lithium battery storage for zero grid reliance and remote power.",
        specs: ["1kW to 5kW Capacity", "Lithium / Tubular Battery", "MPPT Solar PCU", "Pre-wired DCDB"],
        price: "Starting at ₹65,000",
        link: "#contact",
      },
      {
        id: 3,
        name: "Hybrid Solar Storage Kits",
        tag: "Maximum Resilience",
        desc: "The ultimate power security combining grid export capability with seamless battery backup during blackouts.",
        specs: ["3kW to 15kW Capacity", "Smart Hybrid Inverter", "High Voltage Battery", "Smart Energy Meter"],
        price: "Starting at ₹1,45,000",
        link: "#contact",
      },
      {
        id: 4,
        name: "Custom BOS & Mounting Kits",
        tag: "Plug & Play BOS",
        desc: "Pre-wired IP65 ACDB/DCDB boxes, UV-rated 4/6sqmm cables, chemical earthing electrodes, and elevated HDGI structures.",
        specs: ["IP65 ACDB & DCDB", "Type-II SPDs & MCBs", "Pure Copper Earthing", "HDGI Mounting Rails"],
        price: "Starting at ₹18,500",
        link: "#contact",
      },
    ],
  },
  why_choose: {
    enabled: true,
    badge_text: "THE SOLARKITS ADVANTAGE",
    heading: "Why India Trusts SolarKits",
    subtitle: "We combine precision engineering, Tier-1 manufacturing, and end-to-end support.",
    items: [
      {
        title: "Pre-Engineered & Pre-Wired",
        desc: "Every kit is pre-configured with perfectly matched panels, inverters, and protection hardware for rapid installation.",
      },
      {
        title: "100% Genuine Tier-1 Hardware",
        desc: "Direct supply from ALMM-approved and MNRE-certified manufacturers with official warranty cards.",
      },
      {
        title: "Transit Insured Pan-India Logistics",
        desc: "Safe door-to-door delivery with 100% transit insurance across 18,000+ pincodes in India.",
      },
      {
        title: "Full 12% GST ITC Claim",
        desc: "All purchases come with official GST invoices allowing businesses and EPCs to claim full input tax credit.",
      },
      {
        title: "Subsidies & DBT Pre-Verification",
        desc: "All DCR kits are pre-verified for PM Surya Ghar and PM-KUSUM direct bank transfer subsidies.",
      },
      {
        title: "Technical Engineering Support",
        desc: "Dedicated solar engineering desk for single line diagrams (SLD), sizing assistance, and DISCOM documentation.",
      },
    ],
  },
  // how_it_works: {
  //   enabled: true,
  //   badge_text: "SIMPLE 4-STEP PROCESS",
  //   heading: "How to Order Your Solar Kit",
  //   subtitle: "From selecting the right capacity to site delivery and assembly in four easy steps.",
  //   steps: [
  //     {
  //       step: "01",
  //       title: "Choose Your System Capacity",
  //       desc: "Select the required kilowatt size (1kW to 10kW+) based on your monthly electricity consumption.",
  //     },
  //     {
  //       step: "02",
  //       title: "Customize Components & BOM",
  //       desc: "Pick your preferred inverter brand, panel wattage, and battery backup storage capacity.",
  //     },
  //     {
  //       step: "03",
  //       title: "Express Hub Dispatch",
  //       desc: "Your complete package is pre-assembled, tested, and dispatched from our regional hub within 48 hours.",
  //     },
  //     {
  //       step: "04",
  //       title: "Site Delivery & Quick Setup",
  //       desc: "Receive everything in one shipment with color-coded wiring guides for hassle-free assembly.",
  //     },
  //   ],
  // },
  testimonials: {
    enabled: true,
    badge_text: "VERIFIED BUYER STORIES",
    heading: "Trusted by Homeowners & Solar Businesses",
    subtitle: "Hear what customers across India say about their SolarKits delivery and power performance.",
    items: [
      {
        id: 1,
        name: "Rajesh Kulkarni",
        role: "Homeowner",
        city: "Pune, Maharashtra",
        system: "3kW On-Grid Solar Kit",
        quote: "SolarKits delivered the entire package in 3 days. The pre-wired ACDB/DCDB boxes saved our local electrician half a day of work. My electricity bill is down from ₹3,200 to ₹150!",
        rating: 5,
      },
      {
        id: 2,
        name: "Anand Verma",
        role: "Commercial EPC Contractor",
        city: "Jaipur, Rajasthan",
        system: "10kW 3-Phase Commercial Kit",
        quote: "Ordering turnkey kits with proper GST invoices is a game changer for our business. DCR panels passed DISCOM inspection on the first attempt.",
        rating: 5,
      },
      {
        id: 3,
        name: "Balwinder Singh",
        role: "Farm House Owner",
        city: "Ludhiana, Punjab",
        system: "5kW Hybrid Solar Kit",
        quote: "The hybrid system with lithium battery provides 24x7 continuous power even during local grid cuts. Excellent build quality and very responsive support.",
        rating: 5,
      },
    ],
  },
  cta_banner: {
    enabled: true,
    badge_text: "GET STARTED TODAY",
    heading: "Ready to Power Your Home with Clean Solar Energy?",
    subtitle: "Get pre-configured solar kits delivered directly to your doorstep. Free sizing assistance from certified solar engineers.",
    button_text: "Request Free Consultation",
    phone: "+91 (020) 6789-SOLAR",
    whatsapp: "919876543210",
  },
  footer: {
    description: "India's premier e-commerce platform supplying certified, pre-engineered solar combo kits, inverters, and BOS hardware for residential and commercial installations.",
    phone: "+91 (020) 6789-SOLAR / 1800-SOLAR-KIT",
    email: "support@solarkits.in | contact@solarkits.in",
    address: "SolarKits Tech Hub, Phase-1 Central Logistics Center, Pune, Maharashtra 411045",
    disclaimer: "Disclaimer: SolarKits is strictly an e-commerce equipment supply platform. Products are shipped for independent assembly and installation by local certified electricians or customer contractors.",
    copyright_text: "© 2026 Solarkits Platform India. All Rights Reserved.",
  },
  policies: {
    privacy_policy: {
      title: "Privacy Policy",
      last_updated: "August 2026",
      notice_box: "Important Platform Note: Solarkits.in operates strictly as an E-Commerce Supply Marketplace for solar panels, combo kits, BOS equipment, and solar products. We DO NOT provide on-site installation, EPC engineering, or labor services. All products are supplied directly to your delivery address for independent assembly or local installation.",
      sections: [
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
      ],
    },
    terms_of_service: {
      title: "Terms of Service & User Policy",
      last_updated: "August 2026",
      notice_box: "CRITICAL SERVICE DISCLAIMER: Solarkits.in is strictly an Online E-Commerce Product Supply Platform. We sell and deliver solar panels, solar combo kits, BOS components, and accessories across India. Solarkits DOES NOT offer, undertake, or provide installation services, EPC labor, on-site mounting, or maintenance. Product installation must be arranged independently by the customer or qualified local technicians.",
      sections: [
        {
          id: 1,
          heading: "1. Acceptance of Terms",
          content: "By accessing Solarkits.in or purchasing products from our catalog, you agree to be bound by these Terms of Service, all applicable laws and regulations in India, and agree that you are responsible for compliance with any local DISCOM regulations.",
        },
        {
          id: 2,
          heading: "2. E-Commerce Supply & Non-Installation Policy",
          content: "SolarKits acts strictly as an equipment fulfillment distributor. All equipment is sold on a delivery-only basis. The customer is solely responsible for engaging qualified electrical installers and verifying roof load feasibility before installation.",
        },
        {
          id: 3,
          heading: "3. Orders, Pricing & Payment Terms",
          content: "Prices displayed include GST where specified. Official GST tax invoices will be issued upon dispatch. Orders are confirmed upon payment verification through approved online payment gateways or verified bank wire transfers.",
        },
        {
          id: 4,
          heading: "4. Subsidies & DISCOM Approvals",
          content: "All DCR solar kits are supplied with valid ALMM certifications. However, government subsidies (such as PM Surya Ghar or state subsidies) are approved and disbursed directly by government bodies and DISCOMs based on applicant eligibility. SolarKits does not guarantee government approval timelines.",
        },
        {
          id: 5,
          heading: "5. Manufacturer Warranties & Support",
          content: "All items carry genuine manufacturer warranties (25 years performance on modules, 5-10 years on inverters). SolarKits facilitates RMA claims and replacement dispatches from authorized regional service centers.",
        },
      ],
    },
    refund_policy: {
      title: "Refund & Cancellation Policy",
      last_updated: "August 2026",
      notice_box: "Cancellation & Transit Inspection Notice: Orders can be cancelled free of charge prior to warehouse pallet dispatch. Due to heavy freight logistics, please inspect all pallets and crated solar panels upon arrival before signing the transporter proof of delivery (POD).",
      sections: [
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
      ],
    },
    shipping_policy: {
      title: "Shipping & Logistics Policy",
      last_updated: "August 2026",
      notice_box: "Pan-India Logistics: We deliver solar kits and heavy panels to over 18,000 pincodes across India using specialized heavy surface cargo with transit insurance coverage.",
      sections: [
        {
          id: 1,
          heading: "1. Dispatch & Delivery Timelines",
          content: "Standard in-stock solar kits are dispatched within 24 to 48 hours from our nearest state regional warehouse. Delivery typically takes 2 to 5 business days for major cities and 5 to 8 business days for remote or rural pincodes.",
        },
        {
          id: 2,
          heading: "2. Specialized Heavy Freight & Wooden Crating",
          content: "Solar panels are packed on heavy-duty wooden pallets with edge protectors to prevent microcracking during transit. ACDB/DCDB boxes and inverters are packed in moisture-resistant shockproof packaging.",
        },
        {
          id: 3,
          heading: "3. Unloading & Site Access",
          content: "Heavy freight deliveries are made via container trucks or commercial tempos. Deliveries are made to the ground floor / accessible driveway of the provided delivery address.",
        },
        {
          id: 4,
          heading: "4. Real-Time Tracking & Proof of Delivery",
          content: "Upon dispatch, you will receive an SMS and email with live LR/waybill tracking links. Consignee signature and OTP verification are required at the time of handover.",
        },
      ],
    },
  },
};

export default function SolarKitsWebsite() {
  const [activeTab, setActiveTab] = useState("hero");
  const [activePolicyTab, setActivePolicyTab] = useState("privacy_policy");
  const [sections, setSections] = useState(DEFAULT_SOLARKITS_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWebsiteContent("solar-kits");
      if (res && res.data && res.data.sections) {
        setSections({
          ...DEFAULT_SOLARKITS_STATE,
          ...res.data.sections,
          policies: {
            ...DEFAULT_SOLARKITS_STATE.policies,
            ...(res.data.sections.policies || {}),
          },
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
      const res = await updateWebsiteContent("solar-kits", sections);
      if (res && res.status === "success") {
        setAlert({
          type: "success",
          message: "SolarKits Website & Policy Pages content saved & published successfully!",
        });
        if (res.data && res.data.sections) {
          setSections((prev) => ({
            ...prev,
            ...res.data.sections,
          }));
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      setAlert({
        type: "error",
        message: err?.response?.data?.message || "Failed to save SolarKits content.",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all SolarKits website content & policies to factory defaults?")) return;
    setSaving(true);
    try {
      const res = await resetWebsiteContent("solar-kits");
      if (res && res.status === "success") {
        setSections(DEFAULT_SOLARKITS_STATE);
        setAlert({ type: "success", message: "SolarKits content reset to factory defaults successfully!" });
      }
    } catch (err) {
      setAlert({ type: "error", message: "Failed to reset content." });
    } finally {
      setSaving(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  // ── Ticker Helpers ─────────────────────────────────────────────────────────
  const handleAddTicker = () => {
    setSections((prev) => ({
      ...prev,
      ticker: {
        ...prev.ticker,
        items: [...(prev.ticker?.items || []), "✨ New Highlighted Marquee Point"],
      },
    }));
  };

  const handleUpdateTicker = (idx, val) => {
    setSections((prev) => {
      const items = [...(prev.ticker?.items || [])];
      items[idx] = val;
      return {
        ...prev,
        ticker: { ...prev.ticker, items },
      };
    });
  };

  const handleDeleteTicker = (idx) => {
    setSections((prev) => ({
      ...prev,
      ticker: {
        ...prev.ticker,
        items: (prev.ticker?.items || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // ── Stats Helpers ──────────────────────────────────────────────────────────
  const handleAddStat = () => {
    const newStat = {
      value: "100%",
      label: "New Achievement Metric",
      sub: "Verified nationwide performance metric",
    };
    setSections((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        items: [...(prev.stats?.items || []), newStat],
      },
    }));
  };

  const handleUpdateStat = (idx, field, val) => {
    setSections((prev) => {
      const items = [...(prev.stats?.items || [])];
      items[idx] = { ...items[idx], [field]: val };
      return {
        ...prev,
        stats: { ...prev.stats, items },
      };
    });
  };

  const handleDeleteStat = (idx) => {
    setSections((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        items: (prev.stats?.items || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // ── Products / Kit Packages Helpers ────────────────────────────────────────
  const handleAddProduct = () => {
    const newProd = {
      id: Date.now(),
      name: "New Solar Kit Package",
      tag: "Custom Setup",
      desc: "Pre-engineered solar kit designed for maximum efficiency and savings.",
      specs: ["3kW to 10kW Capacity", "TopCon Mono Panels", "Smart Inverter"],
      price: "Starting at ₹75,000",
      link: "#contact",
    };
    setSections((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        items: [...(prev.products?.items || []), newProd],
      },
    }));
  };

  const handleUpdateProduct = (idx, field, val) => {
    setSections((prev) => {
      const items = [...(prev.products?.items || [])];
      items[idx] = { ...items[idx], [field]: val };
      return {
        ...prev,
        products: { ...prev.products, items },
      };
    });
  };

  const handleDeleteProduct = (idx) => {
    setSections((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        items: (prev.products?.items || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // ── Value Propositions Helpers ─────────────────────────────────────────────
  const handleAddWhyChoose = () => {
    const newFeat = {
      title: "New Value Advantage",
      desc: "Clear explanation of the value, warranty, or cost advantage provided to buyers.",
    };
    setSections((prev) => ({
      ...prev,
      why_choose: {
        ...prev.why_choose,
        items: [...(prev.why_choose?.items || []), newFeat],
      },
    }));
  };

  const handleUpdateWhyChoose = (idx, field, val) => {
    setSections((prev) => {
      const items = [...(prev.why_choose?.items || [])];
      items[idx] = { ...items[idx], [field]: val };
      return {
        ...prev,
        why_choose: { ...prev.why_choose, items },
      };
    });
  };

  const handleDeleteWhyChoose = (idx) => {
    setSections((prev) => ({
      ...prev,
      why_choose: {
        ...prev.why_choose,
        items: (prev.why_choose?.items || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // ── Testimonials Helpers ───────────────────────────────────────────────────
  const handleAddTestimonial = () => {
    const newTestimonial = {
      id: Date.now(),
      name: "Happy Buyer",
      role: "Homeowner",
      city: "Surat, Gujarat",
      system: "3kW Solar Kit",
      quote: "Excellent product quality and prompt delivery. Highly recommended for complete turnkey solar kits.",
      rating: 5,
    };
    setSections((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: [...(prev.testimonials?.items || []), newTestimonial],
      },
    }));
  };

  const handleUpdateTestimonial = (idx, field, val) => {
    setSections((prev) => {
      const items = [...(prev.testimonials?.items || [])];
      items[idx] = { ...items[idx], [field]: val };
      return {
        ...prev,
        testimonials: { ...prev.testimonials, items },
      };
    });
  };

  const handleDeleteTestimonial = (idx) => {
    setSections((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: (prev.testimonials?.items || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // ── Policy Clause Helpers ──────────────────────────────────────────────────
  const handleAddPolicyClause = (policyKey) => {
    const newClause = {
      id: Date.now(),
      heading: "New Clause Heading",
      content: "Detailed clause and policy explanation content.",
    };
    setSections((prev) => ({
      ...prev,
      policies: {
        ...prev.policies,
        [policyKey]: {
          ...prev.policies?.[policyKey],
          sections: [...(prev.policies?.[policyKey]?.sections || []), newClause],
        },
      },
    }));
  };

  const handleUpdatePolicyClause = (policyKey, idx, field, val) => {
    setSections((prev) => {
      const currentList = [...(prev.policies?.[policyKey]?.sections || [])];
      currentList[idx] = { ...currentList[idx], [field]: val };
      return {
        ...prev,
        policies: {
          ...prev.policies,
          [policyKey]: {
            ...prev.policies?.[policyKey],
            sections: currentList,
          },
        },
      };
    });
  };

  const handleDeletePolicyClause = (policyKey, idx) => {
    setSections((prev) => ({
      ...prev,
      policies: {
        ...prev.policies,
        [policyKey]: {
          ...prev.policies?.[policyKey],
          sections: (prev.policies?.[policyKey]?.sections || []).filter((_, i) => i !== idx),
        },
      },
    }));
  };

  if (loading) {
    return <Loader text="Loading SolarKits Main Website & Legal Policies..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center text-xl shrink-0 mt-1 shadow-sm">
            <HiCube size={26} />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-text-primary">SolarKits Main Website & Policy CMS</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live on Port 5177
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                Dynamic CMS + Legal Policies
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Live configuration for SolarKits Main Landing Page, Marquee Tickers, Kit Packages, Key Metrics, and all Policy Pages (Privacy, Terms, Refund, Shipping).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => window.open("http://localhost:5177", "_blank")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-hover text-text-primary text-sm font-semibold hover:border-primary/50 transition-all cursor-pointer"
          >
            <FiExternalLink />
            <span>Open Website (5177)</span>
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
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${alert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
            }`}
        >
          {alert.type === "success" ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Section Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {[
          { id: "hero", label: "1. Hero & Ticker", icon: <FiMonitor /> },
          { id: "stats", label: "2. Impact Stats", icon: <FiTrendingUp /> },
          { id: "products", label: "3. Kit Packages", icon: <HiCube /> },
          { id: "why_choose", label: "4. Advantage & Steps", icon: <FiAward /> },
          { id: "testimonials", label: "5. Stories & CTA", icon: <FaComments /> },
          { id: "policies", label: "6. Legal & Policies", icon: <FiShield /> },
          { id: "footer", label: "7. Footer Desk", icon: <FiPhone /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${isActive
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Hero & Ticker ─────────────────────────────────────── */}
      {activeTab === "hero" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FiMonitor className="text-primary" size={20} />
              <span>Hero Header, CTAs & Marquee Ticker</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Customize the main headline, call-to-action buttons, trust guarantees, and scrolling ticker points.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Hero Top Badge Tag
              </label>
              <input
                type="text"
                value={sections.hero?.badge_text || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, badge_text: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Main Headline (Use \n for new line)
              </label>
              <input
                type="text"
                value={sections.hero?.headline || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, headline: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-extrabold text-text-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Hero Subtitle Description
              </label>
              <textarea
                rows={2}
                value={sections.hero?.subtitle || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, subtitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Primary CTA Button Text
              </label>
              <input
                type="text"
                value={sections.hero?.cta_primary?.label || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    hero: {
                      ...prev.hero,
                      cta_primary: { ...prev.hero?.cta_primary, label: e.target.value },
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-amber-600"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Secondary CTA Button Text
              </label>
              <input
                type="text"
                value={sections.hero?.cta_secondary?.label || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    hero: {
                      ...prev.hero,
                      cta_secondary: { ...prev.hero?.cta_secondary, label: e.target.value },
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>
          </div>

          {/* Marquee Ticker Manager */}
          <div className="p-5 rounded-xl border border-border bg-surface-hover space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Scrolling Marquee Ticker Items ({sections.ticker?.items?.length || 0})
                </h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Items that scroll smoothly right below the hero section.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTicker}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <FiPlus size={14} /> Add Item
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(sections.ticker?.items || []).map((tick, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface p-2.5 rounded-lg border border-border">
                  <input
                    type="text"
                    value={tick}
                    onChange={(e) => handleUpdateTicker(idx, e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs font-semibold text-text-primary bg-transparent border-0 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteTicker(idx)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Impact Stats ──────────────────────────────────────── */}
      {activeTab === "stats" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FiTrendingUp className="text-primary" size={20} />
                <span>Impact In Numbers (Social Proof Counters)</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Customize the social proof counters, impact labels, and descriptions.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStat}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Counter Card
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Section Heading
              </label>
              <input
                type="text"
                value={sections.stats?.heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    stats: { ...prev.stats, heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Section Subtitle
              </label>
              <input
                type="text"
                value={sections.stats?.subtitle || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    stats: { ...prev.stats, subtitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Impact Metric Counters ({sections.stats?.items?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handleAddStat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <FiPlus size={14} /> Add Counter
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(sections.stats?.items || []).map((st, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-secondary uppercase bg-surface-hover px-2 py-0.5 rounded">
                      Counter #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteStat(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete Counter"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block mb-1">Value (e.g. 50 MW+)</label>
                    <input
                      type="text"
                      value={st.value || ""}
                      onChange={(e) => handleUpdateStat(idx, "value", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-sm font-black text-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block mb-1">Title</label>
                    <input
                      type="text"
                      value={st.label || ""}
                      onChange={(e) => handleUpdateStat(idx, "label", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block mb-1">Sub-label / Description</label>
                    <input
                      type="text"
                      value={st.sub || ""}
                      onChange={(e) => handleUpdateStat(idx, "sub", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddStat}
                className="p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer min-h-[190px]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                  <FiPlus size={20} />
                </div>
                <span className="font-bold text-sm">+ Add Impact Counter</span>
                <span className="text-[11px] text-text-secondary font-normal text-center">
                  Click to add another metric card
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Kit Packages ──────────────────────────────────────── */}
      {activeTab === "products" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <HiCube className="text-primary" size={20} />
                <span>Complete Solar Kit Package Categories</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage On-Grid, Off-Grid, Hybrid, and Custom BOS package cards.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddProduct}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Package Card
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Section Heading
              </label>
              <input
                type="text"
                value={sections.products?.heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    products: { ...prev.products, heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Subtitle Description
              </label>
              <input
                type="text"
                value={sections.products?.subtitle || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    products: { ...prev.products, subtitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Kit Packages ({sections.products?.items?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handleAddProduct}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <FiPlus size={14} /> Add Package
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(sections.products?.items || []).map((prod, idx) => (
                <div key={prod.id || idx} className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-text-secondary bg-surface-hover px-2 py-0.5 rounded">
                      Kit #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block mb-1">Tag (e.g. PM Surya Ghar Ready)</label>
                    <input
                      type="text"
                      value={prod.tag || ""}
                      onChange={(e) => handleUpdateProduct(idx, "tag", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block mb-1">Kit Name</label>
                    <input
                      type="text"
                      value={prod.name || ""}
                      onChange={(e) => handleUpdateProduct(idx, "name", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={prod.desc || ""}
                      onChange={(e) => handleUpdateProduct(idx, "desc", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block mb-1">Price Tag Text</label>
                    <input
                      type="text"
                      value={prod.price || ""}
                      onChange={(e) => handleUpdateProduct(idx, "price", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-primary"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddProduct}
                className="p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer min-h-[220px]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                  <FiPlus size={20} />
                </div>
                <span className="font-bold text-sm">+ Add Package Card</span>
                <span className="text-[11px] text-text-secondary font-normal text-center">
                  Click to add another solar kit package
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Advantage & Steps ─────────────────────────────────── */}
      {activeTab === "why_choose" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FiAward className="text-amber-500" size={20} />
                <span>The SolarKits Advantage & 4-Step Process</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage value proposition highlights and order workflow steps.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddWhyChoose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Advantage Pillar
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Advantage Value Pillars ({sections.why_choose?.items?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handleAddWhyChoose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <FiPlus size={14} /> Add Pillar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(sections.why_choose?.items || []).map((it, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-surface space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-secondary bg-surface-hover px-2 py-0.5 rounded">
                      Pillar #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteWhyChoose(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={it.title || ""}
                    onChange={(e) => handleUpdateWhyChoose(idx, "title", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                  />
                  <textarea
                    rows={2}
                    value={it.desc || ""}
                    onChange={(e) => handleUpdateWhyChoose(idx, "desc", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary resize-none"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddWhyChoose}
                className="p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer min-h-[160px]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                  <FiPlus size={20} />
                </div>
                <span className="font-bold text-sm">+ Add Advantage Pillar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 5: Stories & CTA ─────────────────────────────────────── */}
      {activeTab === "testimonials" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FaComments className="text-primary" size={20} />
                <span>Customer Stories & Conversion CTA Banner</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddTestimonial}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Review Story
            </button>
          </div>

          {/* Stories List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Customer Reviews ({sections.testimonials?.items?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handleAddTestimonial}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <FiPlus size={14} /> Add Story
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(sections.testimonials?.items || []).map((rev, idx) => (
                <div key={rev.id || idx} className="p-4 rounded-xl border border-border bg-surface space-y-2.5 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-secondary bg-surface-hover px-2 py-0.5 rounded">
                      Story #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTestimonial(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={rev.name || ""}
                      onChange={(e) => handleUpdateTestimonial(idx, "name", e.target.value)}
                      placeholder="Name"
                      className="w-full px-2 py-1 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                    />
                    <input
                      type="text"
                      value={rev.city || ""}
                      onChange={(e) => handleUpdateTestimonial(idx, "city", e.target.value)}
                      placeholder="City, State"
                      className="w-full px-2 py-1 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={rev.quote || rev.text || ""}
                    onChange={(e) => handleUpdateTestimonial(idx, "quote", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary resize-none"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddTestimonial}
                className="p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer min-h-[170px]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                  <FiPlus size={20} />
                </div>
                <span className="font-bold text-sm">+ Add Review Story</span>
              </button>
            </div>
          </div>

          {/* CTA Banner Config */}
          <div className="p-5 rounded-xl border border-border bg-surface-hover space-y-4">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Bottom High-Converting CTA Banner
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Headline</label>
                <input
                  type="text"
                  value={sections.cta_banner?.heading || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      cta_banner: { ...prev.cta_banner, heading: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Button Text</label>
                <input
                  type="text"
                  value={sections.cta_banner?.button_text || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      cta_banner: { ...prev.cta_banner, button_text: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">Helpline Phone</label>
                <input
                  type="text"
                  value={sections.cta_banner?.phone || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      cta_banner: { ...prev.cta_banner, phone: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 6: Legal & Policy Pages (Privacy, Terms, Refund, Shipping) ──── */}
      {activeTab === "policies" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FiShield className="text-emerald-500" size={20} />
                <span>Legal & Policy Pages CMS</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage Privacy Policy, Terms of Service, Refund Policy, and Shipping Policy clauses directly from Admin Panel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAddPolicyClause(activePolicyTab)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Policy Clause
            </button>
          </div>

<<<<<<< HEAD
          {/* Sub-Tabs for Policy Pages */}
=======
          {/* Sub-Tabs for the 3 Policy Pages */}
>>>>>>> origin/main
          <div className="flex gap-2 p-1.5 bg-surface-hover border border-border rounded-xl flex-wrap">
            {[
              { id: "privacy_policy", label: "Privacy Policy", icon: <FiShield /> },
              { id: "terms_of_service", label: "User Policy & Terms", icon: <FiFileText /> },
              { id: "refund_policy", label: "Refund & Cancellation", icon: <FiDollarSign /> },
<<<<<<< HEAD
              { id: "shipping_policy", label: "Shipping & Delivery", icon: <FiTruck /> },
=======
>>>>>>> origin/main
            ].map((pTab) => (
              <button
                key={pTab.id}
                onClick={() => setActivePolicyTab(pTab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activePolicyTab === pTab.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                <span>{pTab.icon}</span>
                <span>{pTab.label}</span>
              </button>
            ))}
          </div>

          {/* Active Policy Page Form */}
          {(() => {
            const curPolicy = sections.policies?.[activePolicyTab] || {};
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                      Policy Page Title
                    </label>
                    <input
                      type="text"
                      value={curPolicy.title || ""}
                      onChange={(e) =>
                        setSections((prev) => ({
                          ...prev,
                          policies: {
                            ...prev.policies,
                            [activePolicyTab]: {
                              ...prev.policies?.[activePolicyTab],
                              title: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                      Last Updated Subtitle
                    </label>
                    <input
                      type="text"
                      value={curPolicy.last_updated || ""}
                      onChange={(e) =>
                        setSections((prev) => ({
                          ...prev,
                          policies: {
                            ...prev.policies,
                            [activePolicyTab]: {
                              ...prev.policies?.[activePolicyTab],
                              last_updated: e.target.value,
                            },
                          },
                        }))
                      }
                      placeholder="e.g. August 2026"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                      Top Regulatory Notice / Important Disclaimer Banner
                    </label>
                    <textarea
                      rows={3}
                      value={curPolicy.notice_box || ""}
                      onChange={(e) =>
                        setSections((prev) => ({
                          ...prev,
                          policies: {
                            ...prev.policies,
                            [activePolicyTab]: {
                              ...prev.policies?.[activePolicyTab],
                              notice_box: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-amber-800 bg-amber-50/50 resize-none font-medium"
                    />
                  </div>
                </div>

                {/* Clauses List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                      Policy Sections & Clauses ({curPolicy.sections?.length || 0})
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleAddPolicyClause(activePolicyTab)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <FiPlus size={14} /> Add Clause
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(curPolicy.sections || []).map((clause, cIdx) => (
                      <div
                        key={clause.id || cIdx}
                        className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-text-secondary bg-surface-hover px-2.5 py-0.5 rounded-md">
                            Clause #{cIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePolicyClause(activePolicyTab, cIdx)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Clause"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-text-secondary block mb-1">
                            Clause Heading
                          </label>
                          <input
                            type="text"
                            value={clause.heading || ""}
                            onChange={(e) =>
                              handleUpdatePolicyClause(activePolicyTab, cIdx, "heading", e.target.value)
                            }
                            className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-text-secondary block mb-1">
                            Clause Legal Content / Explanation
                          </label>
                          <textarea
                            rows={4}
                            value={clause.content || ""}
                            onChange={(e) =>
                              handleUpdatePolicyClause(activePolicyTab, cIdx, "content", e.target.value)
                            }
                            className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleAddPolicyClause(activePolicyTab)}
                      className="w-full p-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer"
                    >
                      <FiPlus size={16} />
                      <span>+ Add Another Policy Clause to {curPolicy.title}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab 7: Website Footer ────────────────────────────────────── */}
      {activeTab === "footer" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FiPhone className="text-primary" size={20} />
              <span>SolarKits Website Footer & Contact Desk</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-text-secondary uppercase">Company Description</label>
              <textarea
                rows={2}
                value={sections.footer?.description || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, description: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl text-sm text-text-primary resize-none mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase">Support Phone</label>
              <input
                type="text"
                value={sections.footer?.phone || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, phone: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl text-sm text-text-primary mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase">Support Email</label>
              <input
                type="text"
                value={sections.footer?.email || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, email: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface-hover border border-border rounded-xl text-sm text-text-primary mt-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}