/**
 * SolarKits Executive Email Template Generator
 * Clean Architectural 590px Responsive Table Layout
 * Modeled on modern B2B hardware showcase emails for Desktop, Mobile, Gmail & Outlook
 */

export const OFFICIAL_SOLARKITS_LOGO_URL =
  'https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png';

export const DEFAULT_HERO_BANNER_URL =
  'https://res.cloudinary.com/dggmbagax/image/upload/v1795868944/solarkits/marketing-creatives/hero-banners/solarkits_default_hero_banner_1_2_3kw.jpg';

export const SOLARKITS_MEDIA_ASSETS = {
  defaultHeroBanner: DEFAULT_HERO_BANNER_URL,
  socialIcons: {
    linkedin:
      'https://res.cloudinary.com/dggmbagax/image/upload/v1795859042/solarkits/marketing-creatives/boss-suite/social_linkedin.png',
    instagram:
      'https://res.cloudinary.com/dggmbagax/image/upload/v1795859043/solarkits/marketing-creatives/boss-suite/social_instagram.png',
    youtube:
      'https://res.cloudinary.com/dggmbagax/image/upload/v1795859044/solarkits/marketing-creatives/boss-suite/social_youtube.png',
    facebook:
      'https://res.cloudinary.com/dggmbagax/image/upload/v1795859045/solarkits/marketing-creatives/boss-suite/social_facebook.png',
    whatsapp:
      'https://res.cloudinary.com/dggmbagax/image/upload/v1795859046/solarkits/marketing-creatives/boss-suite/social_whatsapp.png',
    website:
      'https://res.cloudinary.com/dggmbagax/image/upload/v1795859046/solarkits/marketing-creatives/boss-suite/social_website.png'
  }
};

export const PLATFORM_LINK_GROUPS = [
  {
    group: 'Solar Store (store.solarkits.in)',
    items: [
      {
        url: 'https://store.solarkits.in/preconfigured-combo-kit',
        label: 'Combo Kits Catalog — Ready-to-dispatch 1kW, 2kW & 3kW+ solar kits'
      },
      {
        url: 'https://store.solarkits.in/shop',
        label: 'Store Shop — Browse all pre-configured solar hardware & kits'
      },
      {
        url: 'https://store.solarkits.in/custom-combo-kit',
        label: 'Custom Kit Builder — Configure custom panels, inverter & BOS specs'
      },
      {
        url: 'https://store.solarkits.in/browse/govt-tender',
        label: 'Govt Tender Kits — State-wise govt tender & subsidy solar kits'
      },
      {
        url: 'https://store.solarkits.in/browse/industry',
        label: 'Industry Solutions — C&I solar kits filtered by industry segment'
      },
      {
        url: 'https://store.solarkits.in/know-my-margin',
        label: 'Know My Margin — EPC project margin & ROI calculator'
      },
      {
        url: 'https://store.solarkits.in/epc-catalogue',
        label: 'EPC Catalogue — White-label partner hardware catalogue'
      },
      {
        url: 'https://store.solarkits.in/bulk-buy',
        label: 'Bulk Buy Wholesale — High-volume loose & container pricing'
      },
      {
        url: 'https://store.solarkits.in/po-orders',
        label: 'PO Orders & Allocations — Purchase order & stock allocation desk'
      },
      {
        url: 'https://store.solarkits.in/cart',
        label: 'Shopping Cart — Checkout & apply seasonal coupon voucher'
      },
      {
        url: 'https://store.solarkits.in/store-locator',
        label: 'Store Locator — Find nearest SolarKits depot or franchise store'
      },
      {
        url: 'https://store.solarkits.in/knowledge-center',
        label: 'Knowledge Center — Datasheets, installation SOPs & tutorials'
      },
      {
        url: 'https://store.solarkits.in/track-order',
        label: 'Track Order Status — Live dispatch & delivery telemetry'
      },
      {
        url: 'https://store.solarkits.in/auth/signup',
        label: 'EPC Partner Signup — Register new EPC buyer account'
      },
      {
        url: 'https://store.solarkits.in/auth/login',
        label: 'EPC Partner Login — Sign in to Solar Store portal'
      }
    ]
  },
  {
    group: 'SolarKits Main Website (solarkits.in)',
    items: [
      {
        url: 'https://solarkits.in/',
        label: 'SolarKits Homepage — Main corporate landing & overview page'
      },
      {
        url: 'https://solarkits.in/industries',
        label: 'Industries Showcase — Sector-wise solar deployment solutions'
      }
    ]
  },
  {
    group: 'Franchise Portal (franchise.solarkits.in)',
    items: [
      {
        url: 'https://franchise.solarkits.in/',
        label: 'Franchise Landing — Franchise partner program & benefits'
      },
      {
        url: 'https://franchise.solarkits.in/eligibility',
        label: 'Eligibility Checker — Check territory availability & qualification'
      },
      {
        url: 'https://franchise.solarkits.in/register',
        label: 'Franchise Registration — Apply for authorized franchise store'
      },
      {
        url: 'https://franchise.solarkits.in/login',
        label: 'Franchise Login — Reseller partner dashboard sign-in'
      },
      {
        url: 'https://franchise.solarkits.in/dashboard',
        label: 'Franchise Dashboard — Live store telemetry & quotes overview'
      },
      {
        url: 'https://franchise.solarkits.in/catalog',
        label: 'Franchise Authorized Catalog — Depot-linked franchise pricing'
      },
      {
        url: 'https://franchise.solarkits.in/epc-quotes',
        label: 'EPC Quotations — Create & manage EPC project quotes'
      },
      {
        url: 'https://franchise.solarkits.in/trial-kit-quotes',
        label: 'Trial Kit Quotes — Send sample / trial kit proposals'
      }
    ]
  },
  {
    group: 'Direct Actions (WhatsApp / Call / Email)',
    items: [
      {
        url: 'https://wa.me/919913421453',
        label: 'WhatsApp Quote Chat — Opens direct WhatsApp conversation (+91 99134 21453)'
      },
      {
        url: 'tel:+919913421453',
        label: 'Call Sales Helpline — Direct phone call to +91 99134 21453'
      },
      {
        url: 'mailto:support@solarkits.in',
        label: 'Email Support — Opens mail composer to support@solarkits.in'
      }
    ]
  }
];

export const COLOR_PALETTES = [
  {
    id: 'royal_navy',
    name: 'SolarKits Royal Navy + Orange',
    themeColor: '#1E3A8A',
    accentColor: '#F59E0B',
    stripColor: '#EA580C',
    softBg: '#EFF6FF'
  },
  {
    id: 'eco_teal',
    name: 'Architectural Teal + Coral',
    themeColor: '#006272',
    accentColor: '#0D9488',
    stripColor: '#F97316',
    softBg: '#F0FDFA'
  },
  {
    id: 'slate_gold',
    name: 'Executive Slate + Solar Gold',
    themeColor: '#0F172A',
    accentColor: '#F59E0B',
    stripColor: '#D97706',
    softBg: '#FFFBEB'
  }
];

export const DEFAULT_EMAIL_SECTIONS = [
  { id: 'banner', label: 'Hero Title & Visual Animation', desc: 'Clean editorial headline + animated hero illustration or video' },
  { id: 'pitch', label: 'Intro Narrative & Tagline', desc: 'Centered value statement, sign-off line & copy' },
  { id: 'primary_cta', label: 'Primary Action CTA', desc: 'Centered clean rounded action button' },
  { id: 'system_showcase', label: 'Zigzag System Lineup', desc: '3 alternating left/right solar kit showcase cards' },
  { id: 'products', label: 'Selected Catalog Solar Kits', desc: 'Live campaign kits with pricing & MOQ specs' },
  { id: 'coupon', label: 'Promo Coupon Voucher', desc: 'Minimalist discount voucher badge' },
  { id: 'intelligence', label: 'Portal & Phone Animation', desc: 'Smart SolarKits portal + mobile showcase GIF' },
  { id: 'benefit_cards', label: 'Trust Metrics & Highlights', desc: '3-column impact metric cards & partner benefits' },
  { id: 'closing_pitch', label: 'Dual Action Buttons', desc: 'Side-by-side Datasheet & Store CTA buttons' },
  { id: 'custom_ctas', label: 'Additional Action Links', desc: 'Extra contact or brochure buttons' }
];

export const DEFAULT_SECTIONS_ORDER = [
  'banner',
  'pitch',
  'primary_cta',
  'system_showcase',
  'products',
  'coupon',
  'intelligence',
  'benefit_cards',
  'closing_pitch',
  'custom_ctas'
];

export const DEFAULT_SYSTEM_TIERS = [
  {
    eyebrow: '1 KW DCR KIT',
    title: '1 K.W. Solarkits DCR Kit',
    desc: 'Compact 1 kW residential rooftop DCR combo kit. PM Surya Ghar subsidy-compliant panels with single-phase Wi-Fi string inverter and pre-wired BOSkit.',
    badge: '1 kW DCR',
    imageUrl: ''
  },
  {
    eyebrow: '2 KW DCR COMBOKIT',
    title: '2 K.W. Solarkits DCR Combokit',
    desc: 'Popular 2 kW household solar combo package. Pre-matched ALMM DCR modules, 2 kW inverter, and ready-to-install AC/DC BOS protection.',
    badge: '2 kW DCR',
    imageUrl: ''
  },
  {
    eyebrow: '3 KW DCR COMBOKIT',
    title: '3 KW Solarkits DCR Combokit',
    desc: 'High-efficiency 3 kW residential DCR combo kit. Engineered for fast installation with matched inverter, mounting hardware, and certified BOSkit.',
    badge: '3 kW DCR',
    imageUrl: ''
  }
];

export const DEFAULT_TRUST_METRICS = [
  { value: '500+ MW', label: 'Solar capacity deployed across India by EPC partners' },
  { value: '3,500+ EPCs', label: 'Verified installers ordering from regional depots' },
  { value: '24-Hr Dispatch', label: 'Insured delivery with GST invoice & CAD/SLD pack' }
];

export const DEFAULT_EXECUTIVE_CREATIVE = {
  logoUrl: OFFICIAL_SOLARKITS_LOGO_URL,
  headerTagline: '',
  headline: 'Three Systems. One Platform. Built for every solar load.',
  subheading: 'Pre-engineered Tier-1 solar kits, inverters & BOS hardware — packed and ready to dispatch.',
  themeColor: '#1E3A8A',
  accentColor: '#F59E0B',
  stripColor: '#EA580C',
  contactPhone: '+91 99134 21453',
  contactEmail: 'support@solarkits.in',
  contactWebsite: 'solarkits.in',
  categoryTag: '',
  h1Title: 'Complete solar power, when your clients need it.',
  customBodyText:
    'SolarKits bundles Tier-1 ALMM modules, smart inverters, mounting hardware, and pre-wired BOS boxes into single ready-to-install packages. From managing residential subsidy sites to commercial power backup, our kits help EPC contractors quote faster and protect project margins.',
  primaryCtaText: 'WhatsApp Quote',
  destinationUrl: 'https://wa.me/919913421453',
  mediaType: 'image', // 'banner' | 'image' | 'video'
  heroImageUrl: DEFAULT_HERO_BANNER_URL,
  videoUrl: '',
  videoPosterUrl: '',
  sectionsOrder: DEFAULT_SECTIONS_ORDER,
  showcaseHeading: 'Find your kit.',
  showcaseSubheading: 'Pre-engineered 1 kW, 2 kW & 3 kW DCR Residential Solar Combo Kits — ready to dispatch.',
  systemTiers: DEFAULT_SYSTEM_TIERS,
  intelligenceHeading: 'Intelligence That Makes Solar Deployment Faster.',
  intelligenceText:
    'More than hardware supply, SolarKits Portal is the engine behind every EPC order. From instant BOM sizing and CAD/SLD engineering tools to live regional depot tracking and GST billing, every step works smarter.',
  intelligenceImageUrl: '',
  trustMetrics: DEFAULT_TRUST_METRICS,
  valuePills: ['1 kW DCR Solar Kit', '2 kW DCR Combo Kit', '3 kW DCR Combo Kit'],
  bulletPoints: [],
  closingPitch: '',
  secondaryCtaText: 'Visit our Website',
  secondaryCtaUrl: 'https://solarkits.in/',
  secondaryCtaIsPdf: false,
  primaryDualCtaText: 'Download Datasheet',
  primaryDualCtaUrl: 'https://store.solarkits.in/preconfigured-combo-kit',
  primaryDualCtaIsPdf: false,
  footerTitle: 'SOLARKITS INDIA',
  footerTagline: "Powering India's Leading Solar EPC Network",
  footerAddress: '© 2026 SolarKits (India) Pvt. Ltd.',
  unsubscribeBtnText: 'Unsubscribe',
  footerDisclaimer: ''
};

/**
 * 3 Signature Boss-Reference Templates + Purpose-Based Presets (1-Click Switch)
 */
export const PURPOSE_BASED_PRESETS = [
  {
    id: 'boss_showcase_navy',
    label: '🏢 1. System Showcase (Royal Navy)',
    badge: 'Boss Reference • Default',
    purpose: 'showcase',
    themeColor: '#1E3A8A',
    accentColor: '#F59E0B',
    stripColor: '#EA580C',
    emailSubject: 'SolarKits: Complete Solar Systems, Ready to Dispatch!',
    emailPreviewText: 'Three Systems. One Platform. Built for every residential, hybrid, and C&I solar load.',
    headline: 'Three Systems. One Platform. Built for every solar load.',
    subheading: 'Pre-engineered Tier-1 solar kits, inverters & BOS hardware — packed and ready to dispatch.',
    h1Title: 'Complete solar power, when your clients need it.',
    customBodyText:
      'SolarKits bundles Tier-1 ALMM modules, smart inverters, mounting hardware, and pre-wired BOS boxes into single ready-to-install packages. From managing residential subsidy sites to commercial power backup, our kits help EPC contractors quote faster and protect project margins.',
    primaryCtaText: 'WhatsApp Quote',
    mediaType: 'image',
    heroImageUrl: DEFAULT_HERO_BANNER_URL,
    intelligenceImageUrl: '',
    showcaseHeading: 'Find your kit.',
    showcaseSubheading: 'From residential rooftops to commercial & industrial plants.',
    systemTiers: DEFAULT_SYSTEM_TIERS,
    intelligenceHeading: 'Intelligence That Makes Solar Deployment Faster.',
    intelligenceText:
      'More than hardware supply, SolarKits Portal is the engine behind every EPC order. From instant BOM sizing and CAD/SLD engineering tools to live regional depot tracking and GST billing, every step works smarter.',
    trustMetrics: DEFAULT_TRUST_METRICS,
    primaryDualCtaText: 'Download Datasheet',
    secondaryCtaText: 'Visit our Website',
    bulletPoints: []
  },
  {
    id: 'boss_hybrid_teal',
    label: '⚡ 2. Hybrid & Storage (Teal + Coral)',
    badge: 'Exact Boss Palette',
    purpose: 'product_launch',
    themeColor: '#006272',
    accentColor: '#0D9488',
    stripColor: '#F97316',
    emailSubject: 'SolarKits Hybrid & ESS: Power When Your Clients Need It!',
    emailPreviewText: 'Quote solar plus reliable battery storage in one integrated package.',
    headline: 'Three Systems. One Family. Built for every outage & load.',
    subheading: 'High-efficiency hybrid inverters + LFP battery storage + Tier-1 TOPCon modules.',
    h1Title: 'Energy, when your customers need it.',
    customBodyText:
      'PowerBackup Hybrid stores solar energy when the sun shines and delivers reliable backup when the grid fails. From peak-demand load shifting to uninterrupted commercial operations, our pre-engineered storage kits help EPCs win high-margin projects.',
    primaryCtaText: 'Get Hybrid Quote',
    mediaType: 'image',
    heroImageUrl: '',
    intelligenceImageUrl: '',
    showcaseHeading: 'Find your residential DCR kit.',
    showcaseSubheading: 'Pre-engineered 1 kW, 2 kW & 3 kW On-Grid DCR Solar Combo Kits — ready to dispatch.',
    systemTiers: DEFAULT_SYSTEM_TIERS,
    intelligenceHeading: 'Intelligence That Makes Energy Work Better.',
    intelligenceText:
      'Monitor generation, battery state-of-charge, and live dispatch status from the SolarKits Portal and EPC Mobile App. Predictive sizing and instant SLDs keep every engineering layer working smarter.',
    trustMetrics: [
      { value: '98.2% Eff.', label: 'Maximum hybrid inverter conversion efficiency' },
      { value: '6,000+ Cycles', label: 'Long-life LFP cell durability under Indian climates' },
      { value: '24-Hr Dispatch', label: 'Ready stock across Bhiwandi, Gujarat & Rajasthan depots' }
    ],
    primaryDualCtaText: 'Download Datasheet',
    secondaryCtaText: 'Visit our Website',
    bulletPoints: []
  },
  {
    id: 'boss_offer_slate',
    label: '🎁 3. Bulk Wholesale Offer (Slate + Gold)',
    badge: 'Promo & Coupon',
    purpose: 'festive_offer',
    themeColor: '#0F172A',
    accentColor: '#F59E0B',
    stripColor: '#D97706',
    emailSubject: 'Exclusive EPC Allocation: Wholesale SolarKits Rates & Instant Voucher',
    emailPreviewText: 'Lock volume pricing across DCR, Hybrid & Commercial kits with 24-hour depot dispatch.',
    headline: 'Direct Factory Allocation. Built for Growing EPCs.',
    subheading: 'Volume partner rates, GST tax invoice & priority regional warehouse loading.',
    h1Title: 'Lock in your seasonal EPC allocation today.',
    customBodyText:
      'Rooftop solar demand is accelerating across every cluster. Reserve ready-stock ALMM DCR and commercial kits directly from your nearest SolarKits regional depot with instant coupon savings and full transit insurance.',
    primaryCtaText: 'Claim Partner Pricing',
    mediaType: 'image',
    heroImageUrl: '',
    intelligenceImageUrl: '',
    showcaseHeading: 'Choose your allocation tier.',
    showcaseSubheading: 'Transparent wholesale batches with immediate GST invoicing.',
    systemTiers: DEFAULT_SYSTEM_TIERS,
    intelligenceHeading: 'Order, Track & Manage on Mobile & Web.',
    intelligenceText:
      'Skip multi-vendor delays. Check live warehouse stock, apply your partner voucher, download BOM & SLD files, and track dispatch straight from your phone.',
    trustMetrics: [
      { value: 'GST 100%', label: 'Compliant B2B tax invoice on every kit order' },
      { value: '1-Click BOM', label: 'Instant CAD drawings, SLDs & technical datasheets' },
      { value: '0 Delays', label: 'Transit-insured dispatches from nearest depot' }
    ],
    primaryDualCtaText: 'Explore Wholesale Kits',
    secondaryCtaText: 'Apply Coupon in Store',
    bulletPoints: []
  },
  {
    id: 'price_drop',
    label: '🔥 4. Flash Price Drop',
    badge: 'Clearance',
    purpose: 'price_drop',
    themeColor: '#1E3A8A',
    accentColor: '#F59E0B',
    stripColor: '#DC2626',
    emailSubject: 'Flash B2B Price Drop on Ready-Stock Solar Kits',
    emailPreviewText: 'Limited depot stock available at slashed wholesale EPC pricing.',
    headline: 'Slashed Wholesale Rates on Ready-Stock Solar Kits.',
    subheading: 'Factory-direct pricing on Tier-1 ALMM modules & combo systems.',
    h1Title: 'Ready to load. Ready to earn higher margins.',
    customBodyText:
      'Take advantage of limited warehouse allocation across our regional depots. Every kit ships complete with modules, inverter, and certified SolarKits BOSkit.',
    primaryCtaText: 'View Slashed Prices',
    mediaType: 'image',
    heroImageUrl: '',
    intelligenceImageUrl: '',
    showcaseHeading: 'Available clearance tiers.',
    showcaseSubheading: 'First-come, first-served allocation from serving depots.',
    systemTiers: DEFAULT_SYSTEM_TIERS,
    intelligenceHeading: 'Real-Time Stock & Dispatch Visibility.',
    intelligenceText:
      'Reserve your batch online in minutes and track every shipment live through the SolarKits Partner Portal.',
    trustMetrics: DEFAULT_TRUST_METRICS,
    primaryDualCtaText: 'Download Price List',
    secondaryCtaText: 'Order Now',
    bulletPoints: []
  },
  {
    id: 'onboarding',
    label: '🤝 5. EPC Partner Welcome',
    badge: 'Onboarding',
    purpose: 'onboarding',
    themeColor: '#006272',
    accentColor: '#10B981',
    stripColor: '#EA580C',
    emailSubject: 'Welcome to SolarKits — Your B2B Wholesale Portal is Active',
    emailPreviewText: 'Access wholesale solar kit pricing, free CAD/SLD tools, and 24-hr depot support.',
    headline: "Welcome to India's Smart Solar EPC Network.",
    subheading: 'Direct wholesale portal access, engineering tools & regional warehouse support.',
    h1Title: 'Everything your solar business needs to scale faster.',
    customBodyText:
      'Thank you for joining SolarKits India. As a verified EPC partner, you now have direct access to transparent kit pricing, free CAD & SLD sizing tools, and dedicated regional depot logistics.',
    primaryCtaText: 'Open Partner Portal',
    mediaType: 'image',
    heroImageUrl: '',
    intelligenceImageUrl: '',
    showcaseHeading: 'Explore our 3 core kit lines.',
    showcaseSubheading: 'Engineered for residential, hybrid, and commercial tenders.',
    systemTiers: DEFAULT_SYSTEM_TIERS,
    intelligenceHeading: 'Your Mobile & Desktop Engineering Desk.',
    intelligenceText:
      'Quote projects in minutes with ready-made datasheets, instant GST billing, and live delivery status updates right from your phone.',
    trustMetrics: DEFAULT_TRUST_METRICS,
    primaryDualCtaText: 'Download Welcome Pack',
    secondaryCtaText: 'Browse Solar Kits',
    bulletPoints: []
  }
];

const normalizeActionUrl = (rawUrl, fallback = 'https://store.solarkits.in/preconfigured-combo-kit') => {
  const val = String(rawUrl || '').trim();
  if (!val) return fallback;
  if (/^({{.*}}|https?:\/\/|mailto:|tel:|#)/i.test(val)) return val;
  return `https://${val}`;
};

const escapeHtmlAttr = (str = '') =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const isPdfDownloadUrl = (rawUrl = '') => /\.pdf(\?|$)/i.test(String(rawUrl || '').trim());

export const findPlatformLinkMeta = (rawUrl = '') => {
  const clean = String(rawUrl || '').trim();
  if (!clean) return null;
  for (const grp of PLATFORM_LINK_GROUPS) {
    const found = grp.items.find((it) => it.url === clean);
    if (found) return { group: grp.group, ...found };
  }
  return null;
};

const extractYoutubeVideoId = (rawUrl) => {
  const str = String(rawUrl || '').trim();
  if (!str) return null;
  const match = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
};

const formatMultilineHtml = (text) =>
  String(text || '')
    .trim()
    .replace(/\r?\n/g, '<br />');

/**
 * Generates clean, breathable 590px responsive HTML modeled after the boss's reference email.
 */
export function generateResponsiveEmailHtml(formData = {}) {
  const cr = { ...DEFAULT_EXECUTIVE_CREATIVE, ...(formData.customCreative || {}) };
  if (typeof cr.heroImageUrl === 'string' && cr.heroImageUrl.includes('solarkits_default_hero_banner.jpg')) {
    cr.heroImageUrl = DEFAULT_HERO_BANNER_URL;
  } else if (!cr.heroImageUrl && !cr.heroImageCleared) {
    cr.heroImageUrl = DEFAULT_HERO_BANNER_URL;
  }
  const primaryCol = cr.themeColor || '#1E3A8A';
  const accentCol = cr.stripColor || '#EA580C';
  const subject = formData.emailSubject || 'SolarKits: Complete Solar Systems, Ready to Dispatch!';
  const preheader =
    formData.emailPreviewText ||
    cr.subheading ||
    'Three Systems. One Platform. Pre-engineered Tier-1 solar kits ready to dispatch.';
  const ctaButtons =
    Array.isArray(cr.ctaButtons) && cr.ctaButtons.length > 0 ? cr.ctaButtons : formData.ctaButtons || [];
  const firstCtaBtn = Array.isArray(ctaButtons) && ctaButtons.length > 0 ? ctaButtons[0] : null;
  const primaryCta = firstCtaBtn?.text || formData.ctaText || cr.primaryCtaText || 'WhatsApp Quote';
  const destUrl = normalizeActionUrl(
    firstCtaBtn?.url || formData.destinationUrl || cr.destinationUrl,
    'https://store.solarkits.in/preconfigured-combo-kit'
  );
  const primaryIsPdf = Boolean(firstCtaBtn?.isPdf || isPdfDownloadUrl(destUrl));
  const couponCode = String(formData.couponCode || '').trim();
  const hasCoupon = Boolean(formData.hasCoupon && couponCode);

  const numericDiscount = Number(formData.discountValue || 0);
  const discountStr =
    numericDiscount > 0
      ? formData.discountType === 'percent'
        ? `${numericDiscount}% OFF`
        : `₹${numericDiscount.toLocaleString('en-IN')} OFF`
      : 'Special Partner Discount';

  const safeLogoUrl = normalizeActionUrl(cr.logoUrl || OFFICIAL_SOLARKITS_LOGO_URL, OFFICIAL_SOLARKITS_LOGO_URL);
  const safeWebsiteHref = normalizeActionUrl(cr.contactWebsite, 'https://solarkits.in/');
  const safeEmail = cr.contactEmail || 'support@solarkits.in';
  const safePhone = cr.contactPhone || '+91 99134 21453';

  const systemTiers =
    Array.isArray(cr.systemTiers) && cr.systemTiers.length > 0
      ? cr.systemTiers
      : (formData.previewProducts || formData.selectedKitObjects || []).slice(0, 3).map((k) => ({
        kitId: k.id || k._id || '',
        eyebrow: k.is_govt_tender
          ? `${k.primary_badge || 'GOVT. TENDER'}${k.target_state ? ` • ${k.target_state}` : ''}`
          : [k.system_type || k.category_name || 'SOLAR KIT', k.brand_name].filter(Boolean).join(' • ').toUpperCase(),
        title: k.tender_name || k.name || 'Solar Combo Kit',
        desc: k.tender_description || k.description || k.sub_title || 'Pre-engineered Tier-1 solar kit ready for regional dispatch.',
        badge: k.capacity ? `${k.capacity} kW` : k.project_range || 'Explore Kit',
        imageUrl: k.tender_image_url || k.kit_image || k.image || '',
        ctaUrl: destUrl
      }));
  const trustMetrics =
    Array.isArray(cr.trustMetrics) && cr.trustMetrics.length > 0 ? cr.trustMetrics : DEFAULT_TRUST_METRICS;
  const previewProducts = formData.previewProducts || formData.selectedKitObjects || [];

  const sectionsOrder =
    Array.isArray(cr.sectionsOrder) && cr.sectionsOrder.length > 0 ? cr.sectionsOrder : DEFAULT_SECTIONS_ORDER;

  // Render hero visual: Clean centered headline + manually uploaded photo / GIF / video poster
  const renderHeroVisualHtml = () => {
    if (cr.mediaType === 'video' && cr.videoUrl) {
      const videoHref = normalizeActionUrl(cr.videoUrl, destUrl);
      const ytId = extractYoutubeVideoId(videoHref);
      const posterSrc = ytId
        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        : normalizeActionUrl(cr.videoPosterUrl, '');
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          ${posterSrc
          ? `
          <tr>
            <td align="center" style="padding: 8px 16px 4px;">
              <a href="${videoHref}" data-cta-slot="hero_video" data-cta-label="Hero Video Poster" target="_blank" style="display: block; text-decoration: none; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                <img src="${posterSrc}" alt="Watch SolarKits Explainer Video" width="558" style="width: 100%; max-width: 558px; height: auto; display: block; border: 0;" />
              </a>
            </td>
          </tr>
          `
          : ''
        }
          <tr>
            <td align="center" style="padding: 10px 16px 6px;">
              <a href="${videoHref}" data-cta-slot="hero_video_btn" data-cta-label="Watch Full Explainer Video" target="_blank" style="display: inline-block; padding: 8px 18px; border-radius: 20px; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: ${primaryCol}; font-size: 12px; font-weight: 800; text-decoration: none; font-family: Arial, Helvetica, sans-serif;">
                ▶ Watch Full Explainer Video
              </a>
            </td>
          </tr>
        </table>
      `;
    }

    const mediaSrc = normalizeActionUrl(cr.heroImageUrl, '');

    if (mediaSrc) {
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 6px 0 4px;">
              <a href="${destUrl}" data-cta-slot="hero_banner" data-cta-label="Hero Banner Visual" target="_blank" style="display: block; text-decoration: none;">
                <img src="${mediaSrc}" alt="${cr.headline || 'SolarKits Systems Showcase'}" width="590" style="width: 100%; max-width: 590px; height: auto; display: block; border: 0; border-radius: 6px; margin: 0 auto;" />
              </a>
            </td>
          </tr>
        </table>
      `;
    }

    return '';
  };

  // Render alternating zigzag system showcase cards (Boss Reference Screenshot #2)
  const renderZigzagTiersHtml = () => {
    const rowsHtml = systemTiers
      .map((tier, idx) => {
        const isImageRight = idx % 2 === 0;
        const imgUrl = normalizeActionUrl(tier.imageUrl, '');
        const tierHref = normalizeActionUrl(tier.ctaUrl || 'https://store.solarkits.in/preconfigured-combo-kit', 'https://store.solarkits.in/preconfigured-combo-kit');
        const tierLabel = escapeHtmlAttr(tier.title || `Kit #${idx + 1}`);
        const tierDlAttr = tier.isPdf || isPdfDownloadUrl(tierHref) ? ' data-cta-dl="1"' : '';

        const textCell = `
          <td width="${imgUrl ? '50%' : '100%'}" valign="middle" class="stack-col" style="width: ${imgUrl ? '50%' : '100%'}; padding: 14px 16px; text-align: left; vertical-align: middle;">
            <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: ${primaryCol}; font-family: Arial, Helvetica, sans-serif;">
              ${tier.eyebrow || 'SOLAR SERIES'}
            </p>
            <h3 style="margin: 0 0 8px; font-size: 20px; line-height: 26px; font-weight: 700; color: #1f2937; font-family: Arial, Helvetica, sans-serif;">
              ${tier.title}
            </h3>
            <p style="margin: 0 0 14px; font-size: 13px; line-height: 20px; color: #4b5563; font-family: Arial, Helvetica, sans-serif;">
              ${tier.desc}
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" bgcolor="${primaryCol}" style="background-color: ${primaryCol}; border-radius: 6px; padding: 7px 18px;">
                  <a href="${tierHref}" data-cta-slot="kit_card_${idx + 1}" data-cta-label="${tierLabel} (${escapeHtmlAttr(tier.badge || 'Explore')})"${tierDlAttr} target="_blank" style="font-size: 12px; font-weight: 700; color: #ffffff !important; text-decoration: none; font-family: Arial, Helvetica, sans-serif; display: inline-block;">
                    ${tier.badge || 'Explore Series'}
                  </a>
                </td>
                <td style="padding-left: 10px;">
                  <a href="${tierHref}" data-cta-slot="kit_card_specs_${idx + 1}" data-cta-label="${tierLabel} — View Specs"${tierDlAttr} target="_blank" style="font-size: 11.5px; font-weight: 700; color: ${primaryCol}; text-decoration: underline; font-family: Arial, Helvetica, sans-serif;">
                    View Components &amp; Specs →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        `;

        const imageCell = imgUrl
          ? `
          <td width="50%" valign="middle" align="center" class="stack-col" style="width: 50%; padding: 10px 8px; text-align: center; vertical-align: middle;">
            <a href="${tierHref}" data-cta-slot="kit_card_img_${idx + 1}" data-cta-label="${tierLabel} Photo"${tierDlAttr} target="_blank" style="display: block; text-decoration: none;">
              <img src="${imgUrl}" alt="${tier.title}" width="260" style="width: 100%; max-width: 260px; height: auto; display: block; border: 0; border-radius: 6px; margin: 0 auto;" />
            </a>
          </td>
        `
          : '';

        return `
          <tr>
            <td style="padding: 6px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" dir="${isImageRight || !imgUrl ? 'ltr' : 'rtl'}" style="border-bottom: 1px solid #e2e8f0;">
                <tr dir="ltr">
                  ${!imgUrl ? textCell : isImageRight ? `${textCell}${imageCell}` : `${imageCell}${textCell}`}
                </tr>
              </table>
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <tr>
        <td class="pad-mob" style="padding: 18px 20px 10px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td align="center" style="padding: 8px 12px 6px; text-align: center;">
                <h2 style="margin: 0 0 6px; font-size: 20px; line-height: 26px; font-weight: 700; color: ${primaryCol}; font-family: Arial, Helvetica, sans-serif;">
                  ${cr.showcaseHeading || 'Find your kit.'}
                </h2>
                <p style="margin: 0 0 12px; font-size: 14px; line-height: 21px; color: #666666; font-family: Arial, Helvetica, sans-serif;">
                  ${cr.showcaseSubheading || 'From residential rooftops to commercial &amp; industrial plants.'}
                </p>
              </td>
            </tr>
            ${rowsHtml}
          </table>
        </td>
      </tr>
    `;
  };

  // Optional bullet highlights if user explicitly added custom points
  const points = (cr.bulletPoints || []).map((pt, idx) => {
    if (typeof pt === 'object' && pt.title) return pt;
    const str = String(pt);
    if (str.includes(':')) {
      const parts = str.split(':');
      return { title: parts[0].trim(), desc: parts.slice(1).join(':').trim() };
    }
    return { title: `Highlight ${idx + 1}`, desc: str.trim() };
  });

  const renderSectionHtml = (sectionId) => {
    switch (sectionId) {
      case 'banner':
        return `
          <!-- HERO TITLE & ANIMATED VISUAL -->
          <tr>
            <td align="center" style="padding: 10px 24px 6px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <h2 class="mobile-h2" style="margin: 0 0 6px; font-size: 20px; line-height: 27px; font-weight: 700; color: ${primaryCol}; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                ${cr.headline || 'Three Systems. One Platform. Built for every solar load.'}
              </h2>
              ${cr.subheading
            ? `<p style="margin: 0 auto 8px; max-width: 490px; font-size: 13px; line-height: 19px; color: #64748b; font-family: Arial, Helvetica, sans-serif; text-align: center;">${cr.subheading}</p>`
            : ''
          }
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              ${renderHeroVisualHtml()}
            </td>
          </tr>
        `;

      case 'pitch':
        return `
          <!-- INTRO NARRATIVE & TAGLINE -->
          <tr>
            <td class="pad-mob" align="center" style="padding: 16px 32px 8px; text-align: center; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              ${cr.categoryTag
            ? `<p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 1.8px; font-weight: 700; color: ${accentCol}; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif;">${cr.categoryTag}</p>`
            : ''
          }
              <p style="margin: 0 auto; max-width: 510px; font-size: 14px; line-height: 24px; color: #666666 !important; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                ${formatMultilineHtml(cr.customBodyText)}
              </p>
              ${cr.h1Title
            ? `<p style="margin: 14px 0 0; font-size: 14px; line-height: 22px; font-weight: 600; color: ${primaryCol} !important; font-family: Arial, Helvetica, sans-serif; text-align: center;">${cr.h1Title}</p>`
            : ''
          }
            </td>
          </tr>
        `;

      case 'primary_cta':
        return `
          <!-- PRIMARY CTA BUTTON -->
          <tr>
            <td class="pad-mob" align="center" style="padding: 14px 20px 18px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" bgcolor="${primaryCol}" style="border-radius: 5px; background-color: ${primaryCol}; text-align: center;">
                    <a href="${destUrl}" data-cta-slot="primary_cta" data-cta-label="${escapeHtmlAttr(primaryCta)}"${primaryIsPdf ? ' data-cta-dl="1"' : ''} target="_blank" style="font-size: 14px; line-height: 18px; font-weight: 700; color: #ffffff !important; text-decoration: none; padding: 12px 30px; border-radius: 5px; display: inline-block; background-color: ${primaryCol}; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                      ${primaryCta}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;

      case 'system_showcase':
        return renderZigzagTiersHtml();

      case 'products':
        if (!previewProducts || previewProducts.length === 0) return '';
        return `
          <!-- SELECTED LIVE SOLAR KITS -->
          <tr>
            <td class="pad-mob" style="padding: 14px 28px 10px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: ${primaryCol}; letter-spacing: 1.4px; font-family: Arial, Helvetica, sans-serif;">
                    Featured Wholesale Kits (${previewProducts.length})
                  </td>
                </tr>
                ${previewProducts
            .map((k) => {
              const livePrice = Number(k.base_price || k.selling_price_cached || k.defaultPrice || k.price || 0);
              const priceLabel = livePrice > 0 ? `₹${livePrice.toLocaleString('en-IN')}` : 'Quote on Request';
              return `
                    <tr>
                      <td style="padding: 14px 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="font-size: 15px; font-weight: 700; color: #1f2937; font-family: Arial, Helvetica, sans-serif;">${k.name || 'Solar Combo Kit'}</td>
                            <td align="right" style="font-size: 14px; font-weight: 800; color: ${primaryCol}; white-space: nowrap; font-family: Arial, Helvetica, sans-serif;">${priceLabel}</td>
                          </tr>
                          <tr>
                            <td colspan="2" style="padding-top: 5px; font-size: 12px; line-height: 18px; color: #64748b; font-family: Arial, Helvetica, sans-serif;">
                              ${k.components_summary || k.sub_title || 'Tier-1 ALMM Certified Kit • 24-Hr Regional Depot Dispatch'}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td height="10"></td></tr>
                  `;
            })
            .join('')}
              </table>
            </td>
          </tr>
        `;

      case 'coupon':
        if (!hasCoupon) return '';
        return `
          <!-- MINIMALIST PROMO VOUCHER -->
          <tr>
            <td class="pad-mob" style="padding: 12px 32px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fffbeb; border: 1px dashed ${accentCol}; border-radius: 8px;">
                <tr>
                  <td align="center" style="padding: 14px 18px; text-align: center;">
                    <span style="font-size: 11px; font-weight: 700; color: ${accentCol}; text-transform: uppercase; letter-spacing: 1.2px; font-family: Arial, Helvetica, sans-serif;">Partner Wholesale Voucher</span>
                    <div style="font-size: 20px; font-weight: 900; color: #0f172a; font-family: monospace; margin: 4px 0;">${couponCode}</div>
                    <span style="font-size: 12px; color: #475569; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Save ${discountStr} at SolarKits Checkout</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;

      case 'intelligence': {
        const intelSrc = normalizeActionUrl(cr.intelligenceImageUrl, '');
        return `
          <!-- INTELLIGENCE & PORTAL + PHONE ANIMATION -->
          <tr>
            <td class="pad-mob" align="center" style="padding: 22px 26px 8px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <h3 style="margin: 0 0 10px; font-size: 18px; line-height: 24px; font-weight: 700; color: ${primaryCol}; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                ${cr.intelligenceHeading || 'Intelligence That Makes Solar Deployment Faster.'}
              </h3>
              <p style="margin: 0 auto ${intelSrc ? '14px' : '4px'}; max-width: 510px; font-size: 14px; line-height: 23px; color: #666666; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                ${formatMultilineHtml(cr.intelligenceText || DEFAULT_EXECUTIVE_CREATIVE.intelligenceText)}
              </p>
              ${intelSrc
            ? `
              <a href="${destUrl}" data-cta-slot="portal_banner" data-cta-label="Portal & Phone Animation" target="_blank" style="display: block; text-decoration: none;">
                <img src="${intelSrc}" alt="SolarKits Portal & Mobile App Live Telemetry" width="560" style="width: 100%; max-width: 560px; height: auto; display: block; border: 0; margin: 0 auto;" />
              </a>
              `
            : ''
          }
            </td>
          </tr>
        `;
      }

      case 'benefit_cards': {
        const metricsHtml =
          trustMetrics.length > 0
            ? `
          <tr>
            <td class="pad-mob" style="padding: 16px 12px 10px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  ${trustMetrics
              .slice(0, 3)
              .map(
                (m) => `
                    <td width="33.33%" valign="top" class="stack-col" style="width: 33.33%; padding: 5px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="${primaryCol}" style="background-color: ${primaryCol}; border-radius: 10px;">
                        <tr>
                          <td style="padding: 16px 14px; text-align: left; color: #ffffff;">
                            <div style="font-size: 19px; line-height: 24px; font-weight: 800; color: #ffffff; font-family: Arial, Helvetica, sans-serif; margin-bottom: 6px;">
                              ${m.value}
                            </div>
                            <div style="font-size: 11.5px; line-height: 16px; color: #e2e8f0; font-family: Arial, Helvetica, sans-serif;">
                              ${m.label}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  `
              )
              .join('')}
                </tr>
              </table>
            </td>
          </tr>
        `
            : '';

        const extraPointsHtml =
          points.length > 0
            ? `
          <tr>
            <td class="pad-mob" style="padding: 8px 28px 6px; background-color: #ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${points
              .map(
                (p, i) => `
                  <tr>
                    <td style="padding: 12px 16px; background-color: #f8fafc; border-left: 3px solid ${i % 2 === 0 ? primaryCol : accentCol}; border-radius: 6px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 14px; font-weight: 700; color: ${primaryCol}; font-family: Arial, Helvetica, sans-serif;">${p.title}</p>
                      <p style="margin: 4px 0 0; font-size: 12.5px; line-height: 19px; color: #475569; font-family: Arial, Helvetica, sans-serif;">${p.desc}</p>
                    </td>
                  </tr>
                  ${i < points.length - 1 ? '<tr><td height="8"></td></tr>' : ''}
                `
              )
              .join('')}
              </table>
            </td>
          </tr>
        `
            : '';

        return metricsHtml + extraPointsHtml;
      }

      case 'closing_pitch': {
        const leftLabel = cr.primaryDualCtaText || 'Download Datasheet';
        const leftUrl = normalizeActionUrl(cr.primaryDualCtaUrl || destUrl, destUrl);
        const leftDlAttr = cr.primaryDualCtaIsPdf || isPdfDownloadUrl(leftUrl) ? ' data-cta-dl="1"' : '';
        const rightLabel = cr.secondaryCtaText || 'Visit our Website';
        const rightUrl = normalizeActionUrl(cr.secondaryCtaUrl || safeWebsiteHref, safeWebsiteHref);
        const rightDlAttr = cr.secondaryCtaIsPdf || isPdfDownloadUrl(rightUrl) ? ' data-cta-dl="1"' : '';

        return `
          <!-- SIDE-BY-SIDE DUAL ACTION BUTTONS -->
          ${cr.closingPitch
            ? `
          <tr>
            <td class="pad-mob" align="center" style="padding: 16px 32px 4px; text-align: center; background-color: #ffffff;">
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: ${primaryCol}; font-family: Arial, Helvetica, sans-serif;">
                ${cr.closingPitch}
              </p>
            </td>
          </tr>`
            : ''
          }
          <tr>
            <td class="pad-mob" align="center" style="padding: 14px 20px 18px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 420px; margin: 0 auto;">
                <tr>
                  <td width="50%" align="center" class="stack-col" style="padding: 6px 8px; text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="180" style="width: 180px; margin: 0 auto;">
                      <tr>
                        <td align="center" bgcolor="${primaryCol}" style="border-radius: 5px; background-color: ${primaryCol};">
                          <a href="${leftUrl}" data-cta-slot="dual_left_cta" data-cta-label="${escapeHtmlAttr(leftLabel)}"${leftDlAttr} target="_blank" style="display: block; padding: 12px 14px; font-size: 13.5px; font-weight: 700; color: #ffffff !important; text-decoration: none; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                            ${leftLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" align="center" class="stack-col" style="padding: 6px 8px; text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="180" style="width: 180px; margin: 0 auto;">
                      <tr>
                        <td align="center" bgcolor="${accentCol}" style="border-radius: 5px; background-color: ${accentCol};">
                          <a href="${rightUrl}" data-cta-slot="dual_right_cta" data-cta-label="${escapeHtmlAttr(rightLabel)}"${rightDlAttr} target="_blank" style="display: block; padding: 12px 14px; font-size: 13.5px; font-weight: 700; color: #ffffff !important; text-decoration: none; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                            ${rightLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      }

      case 'custom_ctas':
        if (!ctaButtons || ctaButtons.length <= 1) return '';
        return `
          <!-- ADDITIONAL CUSTOM CTAS -->
          <tr>
            <td class="pad-mob" align="center" style="padding: 6px 36px 14px; background-color: #ffffff; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 420px; margin: 0 auto;">
                ${ctaButtons
                  .slice(1)
                  .map(
                    (btn, bIdx) => {
                      const btnHref = normalizeActionUrl(btn.url, destUrl);
                      const btnDlAttr = btn.isPdf || isPdfDownloadUrl(btnHref) ? ' data-cta-dl="1"' : '';
                      return `
                  <tr>
                    <td align="center" style="padding: 5px 0;">
                      <a href="${btnHref}" data-cta-slot="custom_cta_${bIdx + 2}" data-cta-label="${escapeHtmlAttr(btn.text)}"${btnDlAttr} target="_blank" style="display: block; width: 100%; box-sizing: border-box; padding: 10px 18px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700; color: #334155; text-decoration: none; text-align: center; font-family: Arial, Helvetica, sans-serif;">
                        ${btn.text}
                      </a>
                    </td>
                  </tr>
                `;
                    }
            )
            .join('')}
              </table>
            </td>
          </tr>
        `;

      default:
        return '';
    }
  };

  const icons = SOLARKITS_MEDIA_ASSETS.socialIcons;
  const waHref = `https://wa.me/${String(safePhone).replace(/\D/g, '')}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${subject}</title>
  <style>
    html, body { margin: 0 auto !important; padding: 0 !important; background-color: #f9fafc; font-family: Arial, Helvetica, sans-serif; color: #3b3f44; }
    table, td { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; }
    @media screen and (max-width: 620px) {
      .email-wrap { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .pad-mob { padding-left: 16px !important; padding-right: 16px !important; }
      .stack-col { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
      .mobile-h2 { font-size: 19px !important; line-height: 25px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafc;">

  <!-- Preheader -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafc;">
    <tr>
      <td align="center" style="padding: 24px 10px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="590" class="email-wrap" style="width: 590px; max-width: 590px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; margin: 0 auto;">

          <!-- 1. CLEAN CENTERED HEADER (PINNED TOP) -->
          <tr>
            <td align="center" style="padding: 24px 20px 10px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <a href="${safeWebsiteHref}" data-cta-slot="header_logo" data-cta-label="SolarKits Header Logo" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${safeLogoUrl}" alt="SolarKits Official Logo" width="175" style="width: 175px; max-width: 175px; height: auto; display: block; border: 0; margin: 0 auto;" />
              </a>
              ${cr.headerTagline
      ? `<div style="font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1.8px; text-transform: uppercase; margin-top: 6px; font-family: Arial, Helvetica, sans-serif; text-align: center;">${cr.headerTagline}</div>`
      : ''
    }
            </td>
          </tr>

          <!-- DYNAMIC REORDERABLE BODY SECTIONS -->
          ${sectionsOrder.map(renderSectionHtml).join('')}

          <!-- CLEAN HORIZONTAL DIVIDER -->
          <tr>
            <td style="padding: 12px 20px; background-color: #ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td height="1" style="border-top: 1px solid #94a3b8; font-size: 1px; line-height: 1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CLEAN 2-COLUMN FOOTER (PINNED BOTTOM) -->
          <tr>
            <td style="padding: 6px 20px 22px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="52%" valign="middle" class="stack-col" style="padding: 10px 6px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #58595b; text-align: left;">
                    <div><strong>Email address: <a href="mailto:${safeEmail}" style="color: ${primaryCol}; text-decoration: none;">${safeEmail}</a></strong></div>
                    <div><strong>Telephone: ${safePhone}</strong></div>
                    <div><strong>${cr.footerAddress || '© 2026 SolarKits (India) Pvt. Ltd.'}</strong></div>
                  </td>
                  <td width="48%" valign="middle" align="right" class="stack-col" style="padding: 10px 6px; text-align: right;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="right" style="margin-left: auto;">
                      <tr>
                        <td style="padding: 0 3px;"><a href="${safeWebsiteHref}" data-cta-slot="social_linkedin" data-cta-label="Social: LinkedIn" target="_blank"><img src="${icons.linkedin}" width="30" height="30" alt="LinkedIn" style="display: block; border: 0; border-radius: 50%;" /></a></td>
                        <td style="padding: 0 3px;"><a href="${safeWebsiteHref}" data-cta-slot="social_instagram" data-cta-label="Social: Instagram" target="_blank"><img src="${icons.instagram}" width="30" height="30" alt="Instagram" style="display: block; border: 0; border-radius: 50%;" /></a></td>
                        <td style="padding: 0 3px;"><a href="${safeWebsiteHref}" data-cta-slot="social_youtube" data-cta-label="Social: YouTube" target="_blank"><img src="${icons.youtube}" width="30" height="30" alt="YouTube" style="display: block; border: 0; border-radius: 50%;" /></a></td>
                        <td style="padding: 0 3px;"><a href="${safeWebsiteHref}" data-cta-slot="social_facebook" data-cta-label="Social: Facebook" target="_blank"><img src="${icons.facebook}" width="30" height="30" alt="Facebook" style="display: block; border: 0; border-radius: 50%;" /></a></td>
                        <td style="padding: 0 3px;"><a href="${waHref}" data-cta-slot="social_whatsapp" data-cta-label="Social: WhatsApp" target="_blank"><img src="${icons.whatsapp}" width="30" height="30" alt="WhatsApp" style="display: block; border: 0; border-radius: 50%;" /></a></td>
                        <td style="padding: 0 3px;"><a href="${safeWebsiteHref}" data-cta-slot="social_website" data-cta-label="Social: Website" target="_blank"><img src="${icons.website}" width="30" height="30" alt="Website" style="display: block; border: 0; border-radius: 50%;" /></a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${cr.footerDisclaimer
      ? `<p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8; text-align: left; font-family: Arial, Helvetica, sans-serif;">${cr.footerDisclaimer}</p>`
      : ''
    }
            </td>
          </tr>

        </table>

        <!-- CLEAN MICRO UNSUBSCRIBE LINE OUTSIDE CARD -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="590" class="email-wrap" style="width: 590px; max-width: 590px; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 12px 16px 20px; font-size: 11px; color: #727272; font-family: Arial, Helvetica, sans-serif; text-align: center;">
              If you wish to unsubscribe from our updates, click <a href="{{unsubscribe_url}}" target="_blank" style="color: ${primaryCol}; text-decoration: underline;">here</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
