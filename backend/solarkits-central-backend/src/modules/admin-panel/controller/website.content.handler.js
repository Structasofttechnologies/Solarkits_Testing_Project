const { WebsiteContent } = require('../models/core_db');

const DEFAULT_FRANCHISE_CONTENT = {
  website_key: 'franchise',
  sections: {
    video: {
      enabled: true,
      heading: 'Indoor Solar Cooking System & Clean Tech Ecosystem',
      subtitle: 'Watch how SolarKits pre-engineered solutions empower thousands of entrepreneurs across India.',
      youtube_url: 'https://youtu.be/EE_lzTCuOH0?si=OIF4sGNgzh8lSONA',
      video_id: 'EE_lzTCuOH0',
    },
    testimonials: {
      enabled: true,
      badge_text: 'VERIFIED BUSINESS PROOF',
      heading: 'Trusted by 1,200+ Dealers, EPCs & Solar Entrepreneurs',
      highlight_heading: 'Solar Entrepreneurs',
      subtitle: 'Real feedback from verified solar businesses operating with Solarkits turnkey solutions across India.',
      items: [
        {
          name: 'Vikram Rathi',
          role: 'Authorized Franchisee Dealer',
          company: 'Rathi Solar Power (Pune, MH)',
          volume: '120+ Rooftops Completed',
          quote: 'Switching from buying separate panels and inverters to ordering complete Solarkits was the best operational decision. The pre-wired ACDB/DCDB boxes cut our rooftop installation time from 3 days to under 6 hours!',
          rating: 5,
          verified_badge: 'GST Verified',
        },
        {
          name: 'Suresh Patel',
          role: 'Commercial EPC Contractor',
          company: 'SunShine Energy Solutions (Ahmedabad, GJ)',
          volume: '450 kW+ Projects Installed',
          quote: 'The 550W and 580W TOPCon Solarkits with full 12% GST ITC invoices allow us to quote aggressively on industrial projects while maintaining healthy 17% net margins. Fast 48-hr warehouse dispatch is unmatched.',
          rating: 5,
          verified_badge: 'EPC Partner',
        },
        {
          name: 'Manish Sharma',
          role: 'District Franchise Partner',
          company: 'Jaipur Solar Tech (Jaipur, RJ)',
          volume: '85 PM Surya Ghar Homes',
          quote: 'All DCR kits come with pre-verified ALMM certificates and SLD drawings. Not a single PM Surya Ghar inspection rejected by Rajasthan DISCOM. Our customers received their DBT subsidies within 25 days.',
          rating: 5,
          verified_badge: 'DCR Certified',
        },
      ],
    },
    faq: {
      enabled: true,
      badge_text: 'FREQUENTLY ASKED QUESTIONS',
      heading: 'Everything You Need to Know About Solarkits & Dealerships',
      highlight_heading: 'Solarkits & Dealerships',
      categories: [
        {
          name: 'Complete SolarKits',
          items: [
            {
              q: 'What components are included in a standard Solarkit?',
              a: 'Every Solarkit is a turn-key solution containing Tier-1 Mono PERC or N-Type TOPCon Solar Modules, a cloud-connected smart grid or hybrid inverter, pre-wired IP65 ACDB & DCDB boxes with Type-II SPDs, UV-rated 4/6sqmm DC solar cables, chemical bonded earthing electrodes, copper lightning arrester, and elevated HDGI mounting hardware.',
            },
            {
              q: 'Are Solarkits compliant with PM Surya Ghar Muft Bijli Yojana?',
              a: 'Yes. All DCR designated Solarkits (1.1kW, 2.2kW, 3.3kW, 5kW) use ALMM-approved, MNRE-certified Domestic Content Requirement (DCR) solar cells and modules, qualifying your customers for up to ₹78,000 direct bank DBT subsidies.',
            },
            {
              q: 'Can I customize the inverter brand or panel wattage in a Solarkit?',
              a: 'Yes. In addition to our pre-engineered standard packages, dealers can request custom combinations (e.g. 580W TOPCon with Deye Hybrid Inverter) via the "Request Custom Configuration" action on the catalog.',
            },
          ],
        },
        {
          name: 'Franchise & Territory',
          items: [
            {
              q: 'How does territory exclusivity work for authorized franchisees?',
              a: 'When you are onboarded as an Authorized Dealer, up to 2 revenue districts are assigned exclusively to your franchise code. Local residential rooftop and commercial EPC buyer inquiries originating from those districts are automatically routed to your portal dashboard.',
            },
            {
              q: 'Is GST registration mandatory to become a franchisee?',
              a: 'GST registration is recommended to claim 100% of the 12% GST Input Tax Credit (ITC) on factory-gate purchases. However, individual solar contractors without GST can begin under our Commission Starter Partner plan.',
            },
            {
              q: 'What is the upfront investment required to launch a Solarkits store?',
              a: 'The Commission Starter Partner program has zero upfront investment. For Authorized Dealerships with stocking rights and territory protection, the program fee is only ₹5,000/year plus your initial equipment inventory capital.',
            },
          ],
        },
        {
          name: 'B2B Pricing & Payouts',
          items: [
            {
              q: 'How are franchise commissions paid out?',
              a: 'All commission earnings are credited automatically to your Franchisee Earnings Wallet in real-time. Admin accounts team processes direct NEFT/RTGS settlements directly to your registered bank account.',
            },
            {
              q: 'How fast is regional hub dispatch and what are the delivery charges?',
              a: 'Orders are dispatched within 24 to 48 hours from our nearest state regional warehouse with full transit insurance. Delivery is free for local hub radius orders or calculated at transparent nominal freight rates for remote sites.',
            },
            {
              q: 'How are equipment warranty replacements handled?',
              a: 'All items carry direct manufacturer warranties (10-12 yrs on panels, 5-7 yrs on inverters, 5 yrs on BOS). SolarKits provides centralized RMA assistance and fast regional unit swaps so you don\'t face customer downtime.',
            },
          ],
        },
      ],
      consultation_desk: {
        badge_text: 'Priority B2B Desk',
        title: 'Request Partner Consultation',
        subtitle: 'Have questions regarding state distribution or container pricing? Our team will call back within 2 hours.',
        whatsapp_number: '919876543210',
        whatsapp_button_text: 'Chat Directly on WhatsApp',
        submit_button_text: 'Request Callback Now →',
      },
    },
    footer: {
      brand_title: 'Solarkits Platform',
      brand_subtitle: 'B2B Franchise Network',
      description: "India's primary B2B ready-to-sell solar platform and franchise opportunity. Sourcing certified On-Grid, Off-Grid, and Hybrid Solarkits for solar dealers, EPC contractors, and regional distributors.",
      badges: ['ALMM / DCR Certified', '100% GST ITC Claim'],
      contact: {
        desk_title: 'National B2B Partner Desk',
        address: 'SolarKits Tech Park, Phase-1 Central Logistics Hub, Pune, Maharashtra 411045',
        phone: '+91 (020) 6789-SOLAR / 1800-SOLAR-KIT',
        email: 'franchise@solarkits.in | b2b@solarkits.in',
        whatsapp_number: '919876543210',
        whatsapp_button_text: 'WhatsApp B2B',
        callback_button_text: 'Request Callback',
      },
      disclaimer: 'Regulatory & Statutory Disclaimer: Solarkits is a registered B2B e-commerce platform and equipment fulfillment provider for authorized dealers, EPC contractors, and franchisees. Revenue figures, margins, and generation estimates shown on this website are illustrative and depend on territory, sales volume, product mix, margins, operating costs, and business performance. Solarkits does not guarantee revenue or profit. PM Surya Ghar Muft Bijli Yojana subsidies are disbursed directly by the Government of India / State DISCOMs subject to applicant eligibility and DISCOM technical feasibility.',
      copyright_text: '© 2026 Solarkits Platform India. All Rights Reserved. Position: One-Stop Solar Business Platform.',
      policy_links: [
        { label: 'Privacy Policy', url: '#' },
        { label: 'Terms of Franchise', url: '#' },
        { label: 'GST Compliance', url: '#' },
      ],
    },
    store_availability: {
      badge_text: 'Live Territory Availability Checker',
      heading: 'Check Franchise Availability in Your District / Region',
      subtitle: 'Instant verification for pincodes, district quotas, and exclusive territorial dealership authorizations.',
    },
  },
};

const DEFAULT_SOLAR_STORE_CONTENT = {
  website_key: 'solar-store',
  sections: {
    hero: {
      enabled: true,
      slides: [
        {
          id: 1,
          tag: "🌞 India's #1 Solar Kits Marketplace",
          title: "Complete Solar Kits\nFor Homes & Business",
          subtitle: "Certified pre-configured & custom solar kits — panels, inverter, mounting structure & BOS in one box. Save up to ₹78,000 with PM Surya Ghar Subsidy.",
          cta1: { label: "Shop Solar Kits", href: "#products" },
          cta2: { label: "Calculate Savings", href: "#calculator" },
          bg: "from-navy via-primary-700 to-primary-500",
          image: "",
          image_opacity: "30",
        },
        {
          id: 2,
          tag: "💰 PM Surya Ghar Yojana",
          title: "Get Govt. Subsidy\nUp to ₹78,000 on Solar Kits",
          subtitle: "Under PM Surya Ghar Muft Bijli Yojana, install 1kW-3kW Rooftop Solar Kits with verified subsidy approval. Apply now through SolarKits!",
          cta1: { label: "Check Subsidy Kits", href: "#subsidy" },
          cta2: { label: "Talk to Expert", href: "#contact" },
          bg: "from-[#0D3B6E] via-[#1565C0] to-[#29ABE2]",
          image: "",
          image_opacity: "30",
        },
        {
          id: 3,
          tag: "⚡ Complete Plug & Play Solar Kits",
          title: "Everything You Need\nin One Box",
          subtitle: "From 1kW Home Kits to 100kW Commercial Kits — our complete kits include high-efficiency panels, inverter, mounting structures & AC/DC BOS. Fast delivery across India!",
          cta1: { label: "View Solar Kits", href: "#products" },
          cta2: { label: "Get Free Quote", href: "#quote" },
          bg: "from-[#0D3B6E] to-primary-600",
          image: "",
          image_opacity: "30",
        },
      ],
      trust_badges: ["✅ BIS Certified", "📋 GST Invoice", "🚚 Free Delivery", "⭐ 4.8 Rating"],
      stats: [
        { val: "10,000+", label: "Happy Customers" },
        { val: "50 MW+", label: "Installed Capacity" },
      ],
    },
    categories: {
      enabled: true,
      badge_text: "Browse by Industry & Application",
      heading: "Find the Right Solar",
      highlight_heading: "Kit Solution",
      subtitle: "Explore our certified range of complete solar kits engineered for Residential, Commercial, Agriculture, EV and Industrial power needs.",
      items: [
        {
          id: "solar-pv",
          industry_slug: "solar-pv",
          name: "Solar PV Ecosystem",
          desc: "Complete grid-tied, hybrid, and off-grid rooftop solar systems for homes, societies and commercial establishments.",
          count: "45+ Kits",
          label: "Solar PV",
          href: "/browse/industry?slug=solar-pv",
          icon_type: "sun",
          subcategories_preview: "Residential Solar • Commercial & Industrial • Ground-Mount"
        },
        {
          id: "solar-agriculture",
          industry_slug: "solar-agriculture",
          name: "Solar Agriculture",
          desc: "Solar water pumping systems (DC/AC submersible & surface), solar cold storage, and microgrid kits for farms under PM KUSUM.",
          count: "30+ Kits",
          label: "Agro-Solar",
          href: "/browse/industry?slug=solar-agriculture",
          icon_type: "agriculture",
          subcategories_preview: "Solar Water Pumps • Cold Storages • Agro-processing Mills"
        },
        {
          id: "solar-ev",
          industry_slug: "solar-ev",
          name: "Solar EV Infrastructure",
          desc: "Solar carports and fast DC / AC EV charging station kits integrated with grid power and battery backup for commercial fleet hubs.",
          count: "20+ Kits",
          label: "EV Mobility",
          href: "/browse/industry?slug=solar-ev",
          icon_type: "zap",
          subcategories_preview: "Solar Carports • 2W/3W/4W EV Charging Stations"
        },
        {
          id: "energy-storage",
          industry_slug: "energy-storage",
          name: "Energy Storage (BESS)",
          desc: "High-density Lithium Ferro Phosphate (LFP) Battery Energy Storage Systems for 24x7 uninterrupted power and peak shaving.",
          count: "25+ Kits",
          label: "BESS & ESS",
          href: "/browse/industry?slug=energy-storage",
          icon_type: "package",
          subcategories_preview: "Residential BESS • Industrial Peak Shaving • Remote Microgrids"
        },
        {
          id: "solar-lighting",
          industry_slug: "solar-lighting",
          name: "Solar Lighting & Security",
          desc: "All-in-one smart solar streetlights, semi-integrated floodlights, and CCTV surveillance combo kits for rural roads and factory campuses.",
          count: "35+ Kits",
          label: "Smart Lighting",
          href: "/browse/industry?slug=solar-lighting",
          icon_type: "grid",
          subcategories_preview: "Smart All-in-One Streetlights • Factory Perimeter • Rural Highmasts"
        },
        {
          id: "solar-thermal",
          industry_slug: "solar-thermal",
          name: "Solar Thermal & Heating",
          desc: "High-efficiency pressurized & non-pressurized solar water heating kits and industrial process hot water solutions for institutions.",
          count: "15+ Kits",
          label: "Thermal",
          href: "/browse/industry?slug=solar-thermal",
          icon_type: "sun",
          subcategories_preview: "Domestic Hot Water • Commercial Boilers • Dairy Heating"
        },
        {
          id: "rural-solar",
          industry_slug: "rural-solar",
          name: "Rural Solar Solutions",
          desc: "Decentralized solar microgrids, off-grid solar home lighting systems, community drinking water pumps, and rural livelihood applications.",
          count: "20+ Kits",
          label: "Rural Solar",
          href: "/browse/industry?slug=rural-solar",
          icon_type: "sun",
          subcategories_preview: "Solar Home Lighting • Village Microgrids • Community Solar Pumps"
        }
      ],
      quality_note_1: "All products are quality verified & ALMM certified",
      quality_note_2: "Pan-India delivery, DISCOM approvals & installation support",
    },
    featured_products: {
      enabled: true,
      badge_text: "National Best Sellers",
      heading: "Bestselling Solar Combo Kits",
      subtitle: "Explore our most trusted pre-configured solar combo kits actively ordered by EPC contractors across India with verified subsidy benefits.",
      view_all_text: "View All Solar Kits",
      view_all_href: "#all-products",
      items: [
        {
          id: 1,
          name: "3 KW Solarkits DCR Complete Home Combo Kit",
          category: "On-Grid Solar Kit",
          badge: "🔥 #1 Best Seller in India",
          badgeColor: "bg-amber-500 text-white",
          rating: 4.9,
          reviews: 228,
          price: 79498.75,
          mrp: 98000,
          discount: 19,
          watt: "3kW Kit",
          brand: "SolarKits Prime",
          inStock: true,
          region: "ALL INDIA (NATIONAL SCOPE)",
          sales_volume: 184,
          orders_count: 98
        },
        {
          id: 2,
          name: "2 K.W. Solarkits DCR Rooftop Combo Kit",
          category: "On-Grid Solar Kit",
          badge: "⚡ High Demand in India",
          badgeColor: "bg-sky-500 text-white",
          rating: 4.9,
          reviews: 204,
          price: 57548.75,
          mrp: 72000,
          discount: 20,
          watt: "2kW Kit",
          brand: "SolarKits Prime",
          inStock: true,
          region: "ALL INDIA (NATIONAL SCOPE)",
          sales_volume: 126,
          orders_count: 72
        },
        {
          id: 3,
          name: "1 K.W. Solarkits DCR Kit",
          category: "On-Grid Solar Kit",
          badge: "⭐ Top Rated in India",
          badgeColor: "bg-emerald-500 text-white",
          rating: 4.9,
          reviews: 180,
          price: 31324.25,
          mrp: 42000,
          discount: 25,
          watt: "1kW Kit",
          brand: "SolarKits Prime",
          inStock: true,
          region: "ALL INDIA (NATIONAL SCOPE)",
          sales_volume: 88,
          orders_count: 54
        }
      ],
    },
    why_choose: {
      enabled: true,
      badge_text: "Why SolarKits?",
      heading: "The SolarKits Advantage",
      subtitle: "We don't just sell solar — we deliver a complete, worry-free solar experience",
      items: [
        {
          emoji: "🏅",
          title: "BIS & MNRE Certified",
          desc: "All products are certified by Bureau of Indian Standards and Ministry of New & Renewable Energy.",
          color: "bg-blue-50 border-blue-100",
          iconBg: "bg-primary-100",
        },
        {
          emoji: "🚚",
          title: "Free Pan-India Delivery",
          desc: "We deliver to 18,000+ pincodes across India. Free shipping on orders above ₹5,000.",
          color: "bg-orange-50 border-orange-100",
          iconBg: "bg-accent-50",
        },
        {
          emoji: "🛡️",
          title: "25-Year Warranty",
          desc: "Industry-leading 25-year performance warranty on solar panels + 5-year product warranty.",
          color: "bg-green-50 border-green-100",
          iconBg: "bg-green-100",
        },
        {
          emoji: "⚙️",
          title: "Expert Installation",
          desc: "Trained solar engineers install your system within 48–72 hours of delivery. MNRE empanelled.",
          color: "bg-purple-50 border-purple-100",
          iconBg: "bg-purple-100",
        },
        {
          emoji: "💰",
          title: "Easy EMI Options",
          desc: "0% EMI available for 6/12 months on orders above ₹25,000 via top bank credit cards.",
          color: "bg-sky-50 border-sky-100",
          iconBg: "bg-sky-100",
        },
        {
          emoji: "📋",
          title: "GST Invoice & Tax Benefits",
          desc: "Get official GST invoices for every purchase. Businesses can claim input tax credit.",
          color: "bg-teal-50 border-teal-100",
          iconBg: "bg-teal-100",
        },
      ],
    },
    brands: {
      enabled: true,
      badge_text: "Our Brand Partners",
      heading: "Top Solar Kit Brand Partners",
      subtitle: "Explore certified Tier-1 component manufacturers integrated into SolarKits complete solar solutions, selected for quality, efficiency and long-term performance.",
      cta_label: "Explore All Brands",
      cta_href: "#all-brands",
      items: [
        { id: 1, name: "Adani Solar", type: "Solar Kit Partner", description: "Tier-1 high-efficiency Mono PERC solar modules", iconColor: "bg-orange-500", color: "from-orange-50 to-amber-100" },
        { id: 2, name: "Waaree", type: "Solar Kit Partner", description: "Reliable mono and bifacial solar kit modules", iconColor: "bg-blue-500", color: "from-blue-50 to-cyan-100" },
        { id: 3, name: "Tata Power Solar", type: "Solar Kit Partner", description: "Trusted residential and commercial kit panels", iconColor: "bg-sky-500", color: "from-sky-50 to-blue-100" },
        { id: 4, name: "Vikram Solar", type: "Solar Kit Partner", description: "Premium high-performance solar kit modules", iconColor: "bg-yellow-500", color: "from-yellow-50 to-orange-100" },
        { id: 5, name: "Luminous", type: "Solar Kit Partner", description: "Complete rooftop solar kit power solutions", iconColor: "bg-amber-500", color: "from-amber-50 to-yellow-100" },
        { id: 6, name: "Loom Solar", type: "Solar Kit Partner", description: "Advanced rooftop solar kit technology", iconColor: "bg-green-500", color: "from-green-50 to-emerald-100" },
        { id: 7, name: "RenewSys", type: "Solar Kit Partner", description: "Durable and efficient PV solar kit modules", iconColor: "bg-teal-500", color: "from-teal-50 to-cyan-100" },
        { id: 8, name: "Goldi Solar", type: "Solar Kit Partner", description: "Quality-certified Indian solar kit modules", iconColor: "bg-yellow-600", color: "from-yellow-50 to-amber-100" },
        { id: 9, name: "Solis", type: "Solar Kit Partner", description: "Smart on-grid and hybrid solar kit power systems", iconColor: "bg-indigo-500", color: "from-sky-50 to-indigo-100" },
        { id: 10, name: "Growatt", type: "Solar Kit Partner", description: "Intelligent residential solar kit power units", iconColor: "bg-lime-600", color: "from-green-50 to-lime-100" },
        { id: 11, name: "Microtek", type: "Solar Kit Partner", description: "Reliable solar kit power conditioning units", iconColor: "bg-red-500", color: "from-red-50 to-orange-100" },
        { id: 12, name: "UTL Solar", type: "Solar Kit Partner", description: "Complete off-grid and hybrid solar kit packages", iconColor: "bg-purple-500", color: "from-purple-50 to-violet-100" },
      ],
    },
    testimonials: {
      enabled: true,
      badge_text: "Customer Stories",
      heading: "Loved by Solar Customers",
      subtitle: "Real experiences from families and businesses that switched to clean, affordable solar energy.",
      overall_rating: "4.8",
      review_count: "Based on 2,400+ reviews",
      platforms: [
        { platform: "Google", rating: "4.9", reviews: "1.2K reviews", color: "bg-blue-50 text-blue-600" },
        { platform: "Trustpilot", rating: "4.7", reviews: "520 reviews", color: "bg-green-50 text-green-600" },
        { platform: "Amazon", rating: "4.8", reviews: "410 reviews", color: "bg-orange-50 text-orange-600" },
        { platform: "Flipkart", rating: "4.8", reviews: "270 reviews", color: "bg-sky-50 text-sky-600" },
      ],
      items: [
        {
          id: 1,
          name: "Ramesh Sharma",
          city: "Jaipur, Rajasthan",
          role: "Homeowner",
          rating: 5,
          review: "We installed a 3kW system through SolarKits. The whole process from ordering to installation was super smooth. My electricity bill dropped from ₹2,800 to just ₹120! Best investment ever.",
          system: "3kW On-Grid System",
          savings: "₹2,680/mo",
          initials: "RS",
          color: "from-blue-500 to-indigo-600",
        },
        {
          id: 2,
          name: "Priya Menon",
          city: "Coimbatore, Tamil Nadu",
          role: "Factory Owner",
          rating: 5,
          review: "Ordered 50 panels for our factory rooftop. Delivery was on time and the panels are top quality — all MNRE certified. Our energy costs have fallen by 65%. Highly recommend SolarKits!",
          system: "25kW Commercial System",
          savings: "₹42,000/mo",
          initials: "PM",
          color: "from-sky-400 to-cyan-600",
        },
        {
          id: 3,
          name: "Ajay Verma",
          city: "Lucknow, Uttar Pradesh",
          role: "Farmer",
          rating: 5,
          review: "Maine 5kW off-grid system lagaya apne khet ke liye. Ab pump chalta hai bina bijli bill ke. SolarKits ka support team bahut helpful tha. Thank you!",
          system: "5kW Off-Grid System",
          savings: "₹5,200/mo",
          initials: "AV",
          color: "from-green-400 to-emerald-600",
        },
        {
          id: 4,
          name: "Sunita Patel",
          city: "Surat, Gujarat",
          role: "Homeowner",
          rating: 4,
          review: "Got subsidy of ₹78,000 with help from SolarKits team. The installation team was professional and completed the job in just 2 days. Very satisfied with the quality and service.",
          system: "4kW On-Grid System",
          savings: "₹3,500/mo",
          initials: "SP",
          color: "from-orange-400 to-amber-600",
        },
        {
          id: 5,
          name: "Mohit Gupta",
          city: "Pune, Maharashtra",
          role: "IT Professional",
          rating: 5,
          review: "The SolarKits app made it so easy to track my production. I'm producing 18–20 units daily. The 25-year warranty gives me complete peace of mind. Great product, great service!",
          system: "3kW Hybrid System",
          savings: "₹2,900/mo",
          initials: "MG",
          color: "from-purple-500 to-violet-700",
        },
      ],
    },
    footer: {
      consultation_box: {
        badge: "BULK ORDER & EPC INQUIRY",
        heading: "Want to Order Bulk Solar Kits? Send Query to Us",
        subtitle: "Direct wholesale B2B pricing, pan-India fast dispatch & dedicated BDE engineer assigned to your account.",
        button_text: "Send Bulk Query",
      },
      description: "Quality solar kits, honest guidance and reliable support for homes, farms and businesses across India.",
      phone: "1800-SOLAR-KIT",
      email: "support@solarkits.in",
      address: "Mumbai, Maharashtra, India",
      shop_links: ["On-Grid Solar Kits", "Off-Grid Solar Kits", "Hybrid Solar Kits", "Commercial Solar Kits"],
      help_links: ["About Us", "Contact Us", "Installation Guide", "Product Warranty"],
      policy_links: ["Privacy", "Terms", "Returns", "Shipping"],
      copyright_text: "© 2026 SolarKits™ Pvt. Ltd. All Rights Reserved.",
      floating_whatsapp: {
        number: "919876543210",
        label: "Chat on WhatsApp",
      },
    },
  },
};

const DEFAULT_SOLARKITS_MAIN_CONTENT = {
  website_key: 'solar-kits',
  sections: {
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
    how_it_works: {
      enabled: true,
      badge_text: "SIMPLE 4-STEP PROCESS",
      heading: "How to Order Your Solar Kit",
      subtitle: "From selecting the right capacity to site delivery and assembly in four easy steps.",
      steps: [
        {
          step: "01",
          title: "Choose Your System Capacity",
          desc: "Select the required kilowatt size (1kW to 10kW+) based on your monthly electricity consumption.",
        },
        {
          step: "02",
          title: "Customize Components & BOM",
          desc: "Pick your preferred inverter brand, panel wattage, and battery backup storage capacity.",
        },
        {
          step: "03",
          title: "Express Hub Dispatch",
          desc: "Your complete package is pre-assembled, tested, and dispatched from our regional hub within 48 hours.",
        },
        {
          step: "04",
          title: "Site Delivery & Quick Setup",
          desc: "Receive everything in one shipment with color-coded wiring guides for hassle-free assembly.",
        },
      ],
    },
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
  },
};

const normalizeKey = (k) => {
  if (!k) return 'franchise';
  const clean = k.toLowerCase().replace(/_/g, '-');
  if (clean.includes('store')) return 'solar-store';
  if (clean.includes('franchise')) return 'franchise';
  if (clean.includes('solar-kit') || clean.includes('solarkit')) return 'solar-kits';
  return clean;
};

const extractYouTubeId = (urlOrId) => {
  if (!urlOrId) return '';
  const value = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  const match = value.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : '';
};

// ── GET Content (Admin & Public) ──────────────────────────────────────────────
exports.get_content = async (req, res) => {
  try {
    const rawKey = req.params.websiteKey || req.params.website_key || 'franchise';
    const website_key = normalizeKey(rawKey);
    
    let doc = await WebsiteContent.findOne({ website_key }).lean();

    if (!doc) {
      if (website_key === 'franchise') {
        doc = await WebsiteContent.create(DEFAULT_FRANCHISE_CONTENT);
      } else if (website_key === 'solar-store') {
        doc = await WebsiteContent.create(DEFAULT_SOLAR_STORE_CONTENT);
      } else if (website_key === 'solar-kits') {
        doc = await WebsiteContent.create(DEFAULT_SOLARKITS_MAIN_CONTENT);
      } else {
        doc = await WebsiteContent.create({
          website_key,
          sections: {},
        });
      }
    }

    // Auto-migrate legacy dummy items in solar-store to real industry types & national best sellers
    if (website_key === 'solar-store' && doc && doc.sections) {
      let needsSave = false;
      const prods = doc.sections.featured_products?.items || [];
      const hasDummyProducts = prods.some(p => (p.name || '').includes('Smart On-Grid') || p.price === 48000);
      if (hasDummyProducts || prods.length === 0) {
        if (!doc.sections.featured_products) doc.sections.featured_products = {};
        doc.sections.featured_products.items = DEFAULT_SOLAR_STORE_CONTENT.sections.featured_products.items;
        needsSave = true;
      }
      const cats = doc.sections.categories?.items || [];
      const hasDummyCats = cats.some(c => c.name === 'On-Grid Solar Kits' && !cats.some(x => x.name?.includes('Solar PV')));
      const isMissingRural = !cats.some(x => (x.name || '').toLowerCase().includes('rural'));
      if (hasDummyCats || cats.length < 7 || isMissingRural) {
        if (!doc.sections.categories) doc.sections.categories = {};
        doc.sections.categories.items = DEFAULT_SOLAR_STORE_CONTENT.sections.categories.items;
        needsSave = true;
      }
            const footerBox = doc.sections.footer?.consultation_box;
      if (!footerBox || !footerBox.heading || (footerBox.heading && footerBox.heading.includes('switch to solar'))) {
        if (!doc.sections.footer) doc.sections.footer = {};
        doc.sections.footer.consultation_box = {
          badge: 'BULK ORDER & EPC INQUIRY',
          heading: 'Want to Order Bulk Solar Kits? Send Query to Us',
          subtitle: 'Direct wholesale B2B pricing, pan-India fast dispatch & dedicated BDE engineer assigned to your account.',
          button_text: 'Send Bulk Query',
        };
        needsSave = true;
      }
      if (needsSave) {
        await WebsiteContent.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } }).catch(() => {});
      }
    }

    return res.status(200).json({
      status: 'success',
      data: doc,
    });
  } catch (error) {
    console.error('get_content error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve website content',
      error: error.message,
    });
  }
};

// ── UPDATE Content (Admin) ───────────────────────────────────────────────────
exports.update_content = async (req, res) => {
  try {
    const rawKey = req.params.websiteKey || req.params.website_key || 'franchise';
    const website_key = normalizeKey(rawKey);
    const { sections } = req.body;

    if (!sections) {
      return res.status(400).json({
        status: 'error',
        message: 'sections object is required in request body',
      });
    }

    // Auto-extract youtube video ID if youtube_url is provided
    if (sections.video && sections.video.youtube_url) {
      const extractedId = extractYouTubeId(sections.video.youtube_url);
      if (extractedId) {
        sections.video.video_id = extractedId;
      }
    }

    const updated = await WebsiteContent.findOneAndUpdate(
      { website_key },
      {
        $set: {
          sections,
          last_updated_by: req.user?.id || null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      status: 'success',
      message: `${website_key} website content updated successfully`,
      data: updated,
    });
  } catch (error) {
    console.error('update_content error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update website content',
      error: error.message,
    });
  }
};

// ── RESET Content to Defaults (Admin) ─────────────────────────────────────────
exports.reset_content = async (req, res) => {
  try {
    const rawKey = req.params.websiteKey || req.params.website_key || 'franchise';
    const website_key = normalizeKey(rawKey);

    let defaultData = {};
    if (website_key === 'franchise') {
      defaultData = DEFAULT_FRANCHISE_CONTENT;
    } else if (website_key === 'solar-store') {
      defaultData = DEFAULT_SOLAR_STORE_CONTENT;
    } else if (website_key === 'solar-kits') {
      defaultData = DEFAULT_SOLARKITS_MAIN_CONTENT;
    } else {
      defaultData = { website_key, sections: {} };
    }

    const doc = await WebsiteContent.findOneAndUpdate(
      { website_key },
      {
        $set: {
          sections: defaultData.sections,
          last_updated_by: req.user?.id || null,
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: 'success',
      message: `${website_key} website content reset to default successfully`,
      data: doc,
    });
  } catch (error) {
    console.error('reset_content error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to reset website content',
      error: error.message,
    });
  }
};

// ── Public Endpoint for Franchise Landing Content ────────────────────────────
exports.get_public_franchise_content = async (req, res) => {
  try {
    let doc = await WebsiteContent.findOne({ website_key: 'franchise' }).lean();

    if (!doc) {
      doc = await WebsiteContent.create(DEFAULT_FRANCHISE_CONTENT);
    }

    return res.status(200).json({
      status: 'success',
      data: doc.sections || DEFAULT_FRANCHISE_CONTENT.sections,
    });
  } catch (error) {
    console.error('get_public_franchise_content error:', error);
    return res.status(200).json({
      status: 'success',
      data: DEFAULT_FRANCHISE_CONTENT.sections,
      fallback: true,
    });
  }
};

// ── Public Endpoint for Solar Store Landing Content ──────────────────────────
exports.get_public_solar_store_content = async (req, res) => {
  try {
    let doc = await WebsiteContent.findOne({ website_key: 'solar-store' }).lean();

    if (!doc) {
      doc = await WebsiteContent.create(DEFAULT_SOLAR_STORE_CONTENT);
    }

    return res.status(200).json({
      status: 'success',
      data: doc.sections || DEFAULT_SOLAR_STORE_CONTENT.sections,
    });
  } catch (error) {
    console.error('get_public_solar_store_content error:', error);
    return res.status(200).json({
      status: 'success',
      data: DEFAULT_SOLAR_STORE_CONTENT.sections,
      fallback: true,
    });
  }
};

// ── Public Endpoint for SolarKits Main Website Landing & Policies Content ─────
exports.get_public_solarkits_content = async (req, res) => {
  try {
    let doc = await WebsiteContent.findOne({ website_key: 'solar-kits' }).lean();

    if (!doc) {
      doc = await WebsiteContent.create(DEFAULT_SOLARKITS_MAIN_CONTENT);
    }

    return res.status(200).json({
      status: 'success',
      data: doc.sections || DEFAULT_SOLARKITS_MAIN_CONTENT.sections,
    });
  } catch (error) {
    console.error('get_public_solarkits_content error:', error);
    return res.status(200).json({
      status: 'success',
      data: DEFAULT_SOLARKITS_MAIN_CONTENT.sections,
      fallback: true,
    });
  }
};

// ── Upload Website Image (Hero background, Banners, Content Media) ───────────
exports.upload_image = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file uploaded',
      });
    }

    const file = req.files[0];
    const imageUrl = file.path;

    return res.status(200).json({
      status: 'success',
      message: 'Website image uploaded successfully',
      data: {
        url: imageUrl,
        filename: file.filename,
      },
    });
  } catch (error) {
    console.error('upload_image error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to upload website image',
      error: error.message,
    });
  }
};

