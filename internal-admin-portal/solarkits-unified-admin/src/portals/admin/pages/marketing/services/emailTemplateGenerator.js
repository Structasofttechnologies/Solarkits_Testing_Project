/**
 * SolarKits High-Conversion Email Template Generator
 * Bulletproof 600px Responsive Table Layout for Desktop, Mobile Web, Gmail & Outlook
 */

export const OFFICIAL_SOLARKITS_LOGO_URL =
  'https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png';

export const DEFAULT_EMAIL_SECTIONS = [
  { id: 'banner', label: 'Hero Media Banner', desc: 'Executive banner, photo, or video' },
  { id: 'pitch', label: 'Pitch Title & Body Text', desc: 'Category tag, H1 heading, and email copy' },
  { id: 'primary_cta', label: 'Primary Call to Action', desc: 'Main full-width action button' },
  { id: 'products', label: 'Featured Solar Kits', desc: 'Live pricing, specs, and MOQs' },
  { id: 'coupon', label: 'Promo Coupon Voucher', desc: 'Dashed discount voucher box' },
  { id: 'benefit_cards', label: 'Feature Benefit Cards', desc: 'Color-coded highlight value boxes' },
  { id: 'closing_pitch', label: 'Closing Pitch & Secondary CTA', desc: 'Bottom conversion pitch' },
  { id: 'custom_ctas', label: 'Additional Action CTAs', desc: 'Secondary action buttons' }
];

export const DEFAULT_SECTIONS_ORDER = [
  'banner',
  'pitch',
  'primary_cta',
  'products',
  'coupon',
  'benefit_cards',
  'closing_pitch',
  'custom_ctas'
];

export const DEFAULT_EXECUTIVE_CREATIVE = {
  logoUrl: OFFICIAL_SOLARKITS_LOGO_URL,
  headerTagline: 'B2B SOLAR KITS STORE',
  headline: "DON'T JUST SELL SOLAR. SELL COMPLETE BACKUP.",
  subheading: 'Tier-1 ALMM Modules + High-Efficiency Inverters + Pre-Engineered Structure in One Single Dispatch.',
  themeColor: '#263880',
  accentColor: '#f59e0b',
  stripColor: '#ea580c',
  contactPhone: '+91 99134 21453',
  contactWebsite: 'solarkits.in',
  categoryTag: 'B2B WHOLESALE KITS BY SOLARKITS',
  h1Title: 'Solar EPCs, this one is for you.',
  customBodyText:
    'Your customers want rooftop solar that keeps the power running during grid outages too. With SolarKits Pre-Engineered Hybrid & DCR Combos, quote solar plus battery storage in one complete package and win projects that on-grid-only EPCs lose.',
  primaryCtaText: 'Get SolarKits Pricing Today →',
  destinationUrl: 'https://solarkits.in/solar-kits',
  mediaType: 'banner', // 'banner' | 'image' | 'video'
  heroImageUrl: '',
  videoUrl: '',
  sectionsOrder: DEFAULT_SECTIONS_ORDER,
  valuePills: [
    '1. Add Backup to Quotes',
    '2. Higher Ticket Size',
    '3. Depot Support'
  ],
  bulletPoints: [
    'Higher Project Value & Margin: Sell complete combo (Panels + Inverter + Battery + Structure) in one order and maximize ticket size.',
    'Win More Quotes Against Competitors: Deliver unmatched power cut reliability with up to 98% inverter efficiency and guaranteed MNRE & ALMM compliance.',
    'Free Engineering Tools & Technical Helpdesk: Instant access to CAD drawings, SLDs, datasheets, sizing tools, and direct dedicated technical support.',
    'Regional Depots & Fast Dispatch Across India: Dispatches across regional warehouses with transit insurance.'
  ],
  closingPitch: 'Sell complete solar power, not just panels. Choose SolarKits.',
  secondaryCtaText: 'Explore Wholesale Solar Kits →',
  footerTitle: 'SOLARKITS INDIA',
  footerTagline: "Powering India's Leading Solar EPC Network",
  footerAddress: '© 2026 SolarKits (India) Pvt. Ltd. • All Rights Reserved. Verified Pan-India B2B Solar Supply Network.',
  unsubscribeBtnText: '🔕 Unsubscribe from this list',
  footerDisclaimer: '*Exclusive wholesale rates applicable for verified GST-registered EPC contractors only.'
};

/**
 * 5 Purpose-Based Template Presets (Switchable with 1-click in Studio & Wizard)
 */
export const PURPOSE_BASED_PRESETS = [
  {
    id: 'wholesale_backup',
    label: '⚡ B2B Wholesale / Backup',
    purpose: 'wholesale',
    headline: "DON'T JUST SELL SOLAR. SELL COMPLETE BACKUP.",
    subheading: 'Tier-1 ALMM Modules + High-Efficiency Inverters + Pre-Engineered Structure in One Single Dispatch.',
    categoryTag: 'B2B WHOLESALE KITS BY SOLARKITS',
    h1Title: 'Solar EPCs, this one is for you.',
    customBodyText:
      'Your customers want rooftop solar that keeps the power running during grid outages too. With SolarKits Pre-Engineered Hybrid & DCR Combos, quote solar plus battery storage in one complete package and win projects that on-grid-only EPCs lose.',
    primaryCtaText: 'Get SolarKits Pricing Today →',
    valuePills: ['1. Add Backup to Quotes', '2. Higher Ticket Size', '3. Depot Support'],
    bulletPoints: [
      'Higher Project Value & Margin: Sell complete combo (Panels + Inverter + Battery + Structure) in one order and maximize ticket size.',
      'Win More Quotes Against Competitors: Deliver unmatched power cut reliability with up to 98% inverter efficiency and guaranteed MNRE & ALMM compliance.',
      'Free Engineering Tools & Technical Helpdesk: Instant access to CAD drawings, SLDs, datasheets, sizing tools, and direct dedicated technical support.',
      'Regional Depots & Fast Dispatch Across India: Dispatches across regional warehouses with full transit insurance.'
    ],
    closingPitch: 'Sell complete solar power, not just panels. Choose SolarKits.',
    secondaryCtaText: 'Explore Wholesale Solar Kits →'
  },
  {
    id: 'product_launch',
    label: '🚀 New Product Launch & Datasheet',
    purpose: 'product_launch',
    headline: 'INTRODUCING NEXT-GEN N-TYPE TOPCON MODULES',
    subheading: 'Up to 22.8% Module Efficiency with 30-Year Performance Warranty & Bifacial Generation.',
    categoryTag: 'NEW PRODUCT INNOVATION • TIER-1 ALMM',
    h1Title: 'Upgrade Your EPC Quotes with Next-Gen Efficiency',
    customBodyText:
      'Offer your customers next-generation N-Type TOPCon solar modules engineered for extreme heat endurance and up to 25% bifacial rear gain. Direct factory allocation available for certified regional installers.',
    primaryCtaText: 'Download Technical Datasheets & Pricing →',
    valuePills: ['1. 22.8% Efficiency', '2. 30-Year Warranty', '3. 25% Rear Gain'],
    bulletPoints: [
      'Bifacial Rear Power Gain: Generate up to 25% extra energy from ground and rooftop albedo reflection.',
      'Superior Low-Light & Temperature Performance: Generates more kWh even during cloudy mornings and peak summer heat.',
      '30-Year Performance Assurance: Underwritten linear warranty with less than 0.4% annual degradation.',
      'Zero-Delay Regional Depot Dispatch: Ready stock available across regional logistics hubs.'
    ],
    closingPitch: 'Lead the technology curve in your region. Quote Next-Gen TOPCon Kits.',
    secondaryCtaText: 'Request Sample Datasheet & Quotation →'
  },
  {
    id: 'festive_offer',
    label: '🎉 Festive / Seasonal Mega Offer',
    purpose: 'festive_offer',
    headline: 'SEASONAL B2B COMBO OFFER FOR SOLAR EPCs',
    subheading: 'Special Volume Voucher per Kit with Priority Regional Depot Dispatches & GST Tax Invoice.',
    categoryTag: 'FESTIVE WHOLESALE BONANZA • LIMITED ALLOCATION',
    h1Title: 'Exclusive Festive Pre-Booking Allocation for EPCs',
    customBodyText:
      'Seasonal rooftop solar inquiries are peaking across India. Lock in pre-booked subsidy-approved commercial kits with instant voucher redemption and priority depot dispatch.',
    primaryCtaText: 'Claim Voucher & Lock Pricing →',
    valuePills: ['1. Volume Voucher', '2. Priority Dispatch', '3. GST Credit'],
    bulletPoints: [
      'Instant Cash Voucher Redemption: Redeem campaign voucher directly at Solar Shop checkout on eligible commercial combos.',
      'Assured Priority Dispatch: Transit-insured dispatches directly from your nearest certified regional warehouse.',
      'Transparent B2B Margins: Instant GST tax invoice generation and volume-tiered EPC partner rates.',
      'Priority Documentation Support: Dedicated helpdesk for subsidy portal documentation and SLD generation.'
    ],
    closingPitch: 'Maximize your margins before allocations run out. Book now.',
    secondaryCtaText: 'Apply Voucher & Order Kits →'
  },
  {
    id: 'price_drop',
    label: '🔥 Flash Price Drop & Clearance',
    purpose: 'price_drop',
    headline: 'FLASH WHOLESALE PRICE DROP: ON-GRID & DCR KITS',
    subheading: 'Limited Regional Stock Cleared at Factory-Direct Wholesale Rates for Certified EPCs.',
    categoryTag: 'FLASH CLEARANCE ALERT • LIMITED STOCK',
    h1Title: 'Slashed Wholesale Rates on In-Demand Commercial Kits',
    customBodyText:
      'Take advantage of limited warehouse stock allocation at regional hubs. Tier-1 ALMM modules & combo kits ready for dispatch at factory-direct B2B margins.',
    primaryCtaText: 'View Wholesale Prices →',
    valuePills: ['1. Direct B2B Rates', '2. Ready Stock', '3. Full Insurance'],
    bulletPoints: [
      'Factory-Direct Margin Advantage: Pass on competitive pricing to your rooftop clients and win more contracts.',
      'Immediate Loading & Transit Insurance: Insured dispatch from serving regional depots.',
      'Zero Hassle Documentation: Instant GST tax invoice and dispatch tracking.',
      'Complete Installation Accessories Included: Pre-crimped MC4, DCDB, ACDB, and mounting components.'
    ],
    closingPitch: 'Stock is reserved on a first-come, first-served basis. Act fast.',
    secondaryCtaText: 'Claim Allocation Today →'
  },
  {
    id: 'onboarding',
    label: '🤝 EPC Partner Onboarding & Welcome',
    purpose: 'onboarding',
    headline: "WELCOME TO INDIA'S LARGEST SOLAR EPC NETWORK",
    subheading: 'Your Direct B2B Wholesale Portal Access & Regional Depot Support Are Now Active.',
    categoryTag: 'OFFICIAL PARTNER ONBOARDING • SOLARKITS',
    h1Title: 'Welcome Aboard! Here is Everything You Need to Scale',
    customBodyText:
      'Thank you for connecting with SolarKits India. As an installer partner, you get direct access to India-wide depot dispatches, transparent wholesale kit rates, and technical engineering tools.',
    primaryCtaText: 'Access Your Partner Portal & Sizing Tools →',
    valuePills: ['1. Direct Depot Access', '2. Free CAD/SLD', '3. Dedicated Desk'],
    bulletPoints: [
      'Wholesale Partner Pricing Unlocked: Access transparent, volume-tiered rates across residential and commercial solar kits.',
      'Free Engineering Drawings & Sizing Tools: Instant access to CAD drawings, Single Line Diagrams (SLD), and BOM calculators.',
      'Dedicated Regional Account Manager: One direct point of contact for priority quotes, dispatch tracking, and site queries.',
      '24/7 Logistics Tracking: Live shipment updates from regional fulfillment hubs.'
    ],
    closingPitch: 'We are committed to helping your solar contracting business grow faster.',
    secondaryCtaText: 'Explore Partner Dashboard & Products →'
  }
];

const normalizeActionUrl = (rawUrl, fallback = 'https://solarkits.in/solar-kits') => {
  const val = String(rawUrl || '').trim();
  if (!val) return fallback;
  if (/^({{.*}}|https?:\/\/|mailto:|tel:|#)/i.test(val)) return val;
  return `https://${val}`;
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
 * Generates production-ready 600px responsive table HTML
 */
export function generateResponsiveEmailHtml(formData = {}) {
  const cr = { ...DEFAULT_EXECUTIVE_CREATIVE, ...(formData.customCreative || {}) };
  const subject = formData.emailSubject || 'SolarKits B2B Wholesale Pricing';
  const preheader =
    formData.emailPreviewText ||
    cr.subheading ||
    'Exclusive B2B solar kit pricing & depot support for verified EPC contractors.';
  const primaryCta = formData.ctaText || cr.primaryCtaText || 'Get SolarKits Pricing Today →';
  const destUrl = normalizeActionUrl(formData.destinationUrl || cr.destinationUrl, 'https://solarkits.in/solar-kits');
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
  const safeWebsiteDisplay = String(cr.contactWebsite || 'solarkits.in')
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  const safeWebsiteHref = normalizeActionUrl(cr.contactWebsite, 'https://solarkits.in');

  // Parse bullet points into { title, desc }
  const points = (cr.bulletPoints || []).map((pt, idx) => {
    if (typeof pt === 'object' && pt.title) return pt;
    const str = String(pt);
    if (str.includes(':')) {
      const parts = str.split(':');
      return {
        title: parts[0].trim(),
        desc: parts.slice(1).join(':').trim(),
        borderColor: idx % 2 === 0 ? cr.themeColor : cr.accentColor
      };
    }
    return {
      title: `Highlight ${idx + 1}`,
      desc: str.trim(),
      borderColor: idx % 2 === 0 ? cr.themeColor : cr.accentColor
    };
  });

  const pointsHtml = points
    .map(
      (p, i) => `
    <tr>
      <td style="padding: 15px 18px; background-color: #f8fafc; background-image: linear-gradient(#f8fafc, #f8fafc) !important; border-left: 4px solid ${p.borderColor || (i % 2 === 0 ? cr.themeColor : cr.accentColor)}; border-radius: 6px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 15px; font-weight: 800; color: ${cr.themeColor} !important; font-family: Arial, sans-serif;">
          ${p.title}
        </p>
        <p style="margin: 5px 0 0; font-size: 13px; line-height: 20px; color: #475569 !important; font-family: Arial, sans-serif;">
          ${p.desc}
        </p>
      </td>
    </tr>
    ${i < points.length - 1 ? '<tr><td height="12"></td></tr>' : ''}
  `
    )
    .join('');

  const sectionsOrder =
    Array.isArray(cr.sectionsOrder) && cr.sectionsOrder.length > 0 ? cr.sectionsOrder : DEFAULT_SECTIONS_ORDER;

  const ctaButtons =
    Array.isArray(cr.ctaButtons) && cr.ctaButtons.length > 0 ? cr.ctaButtons : formData.ctaButtons || [];

  const previewProducts = formData.previewProducts || formData.selectedKitObjects || [];

  const renderHeroBanner = () => {
    if (cr.mediaType === 'image' && cr.heroImageUrl) {
      const heroSrc = normalizeActionUrl(cr.heroImageUrl, '');
      if (heroSrc) {
        return `<a href="${destUrl}" target="_blank" style="display: block; text-decoration: none;"><img src="${heroSrc}" alt="${cr.headline || 'SolarKits Campaign Banner'}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0; margin: 0 auto;" /></a>`;
      }
    }

    if (cr.mediaType === 'video' && cr.videoUrl) {
      const videoHref = normalizeActionUrl(cr.videoUrl, destUrl);
      const ytId = extractYoutubeVideoId(videoHref);
      if (ytId) {
        return `
          <a href="${videoHref}" target="_blank" style="display: block; text-decoration: none; background-color: #0f172a;">
            <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="Watch Explainer Video" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0; margin: 0 auto;" />
            <div style="padding: 12px 16px; background-color: #1e293b; color: #ffffff; font-size: 13px; font-weight: 800; text-align: center; font-family: Arial, sans-serif;">
              ▶ Watch Explainer Video on YouTube →
            </div>
          </a>
        `;
      }
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 34px 24px; background-color: #0f172a; text-align: center; color: #ffffff;">
              <p style="margin: 0 0 12px; font-size: 18px; font-weight: 900; color: #ffffff;">${cr.headline || 'Product Explainer Video'}</p>
              <a href="${videoHref}" target="_blank" style="display: inline-block; padding: 12px 26px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 800; font-family: Arial, sans-serif;">
                ▶ Watch Explainer Video
              </a>
            </td>
          </tr>
        </table>
      `;
    }

    const formattedHeadline = cr.headline.includes('SELL COMPLETE BACKUP')
      ? cr.headline.replace('SELL COMPLETE BACKUP', `<span style="color: ${cr.accentColor};">SELL COMPLETE BACKUP</span>`)
      : cr.headline;

    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 34px 24px 28px; background-color: ${cr.themeColor}; background: linear-gradient(135deg, #1e2d66 0%, ${cr.themeColor} 60%, #3a56c9 100%); text-align: center; color: #ffffff;">
            <!-- Clean Tag Badge -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 14px auto;">
              <tr>
                <td align="center" style="background-color: #ffffff; padding: 6px 16px; border-radius: 20px; border-left: 4px solid ${cr.accentColor}; text-align: center;">
                  <div style="font-size: 11px; line-height: 16px; font-weight: 800; color: ${cr.themeColor}; letter-spacing: 1px; text-transform: uppercase; font-family: Arial, sans-serif; margin: 0;">
                    ⚡ ${cr.headerTagline || 'SOLARKITS B2B NETWORK'}
                  </div>
                </td>
              </tr>
            </table>

            <h2 style="margin: 0 0 10px; font-size: 26px; line-height: 34px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; text-align: center;">
              ${formattedHeadline}
            </h2>

            <p style="margin: 0 0 18px; font-size: 13px; line-height: 20px; color: #e2e8f0; max-width: 480px; margin-left: auto; margin-right: auto; text-align: center;">
              ${cr.subheading}
            </p>

            <!-- Outlook-safe Responsive Value Badges -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 520px; margin: 0 auto;">
              <tr>
                <td align="center" style="text-align: center; padding: 0 4px;">
                  ${(cr.valuePills || [])
        .map(
          (pill) => `
                    <div style="display: inline-block; margin: 3px 4px; padding: 6px 12px; background-color: #2f4599; border: 1px solid #6b80d6; border-radius: 6px; font-size: 11px; font-weight: 700; color: #ffffff; font-family: Arial, sans-serif; line-height: 16px; text-align: center;">
                      ${pill}
                    </div>
                  `
        )
        .join('')}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  };

  const renderSectionHtml = (sectionId) => {
    switch (sectionId) {
      case 'banner':
        return `
          <!-- HERO BANNER -->
          <tr>
            <td align="center" style="background-color: ${cr.themeColor}; text-align: center;">
              ${renderHeroBanner()}
            </td>
          </tr>
        `;

      case 'pitch':
        return `
          <!-- PITCH & BODY INTRO -->
          <tr>
            <td class="pad-mob" align="center" style="padding: 34px 40px 10px; text-align: center; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 2px; font-weight: 800; color: ${cr.stripColor}; text-transform: uppercase;">
                ${cr.categoryTag}
              </p>
              <h1 style="margin: 0 0 14px; font-size: 26px; line-height: 34px; font-weight: 900; color: ${cr.themeColor} !important;">
                ${cr.h1Title || 'Solar EPCs, this one is for you.'}
              </h1>
              <p style="margin: 0; font-size: 15px; line-height: 25px; color: #334155 !important;">
                ${formatMultilineHtml(cr.customBodyText)}
              </p>
            </td>
          </tr>
        `;

      case 'primary_cta':
        return `
          <!-- PRIMARY CTA BUTTON -->
          <tr>
            <td class="pad-mob" align="center" style="padding: 22px 20px 14px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" bgcolor="${cr.themeColor}" style="border-radius: 8px; background-color: ${cr.themeColor}; text-align: center;">
                    <a href="${destUrl}" target="_blank" style="font-size: 16px; line-height: 22px; font-weight: 800; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 8px; display: inline-block; background-color: ${cr.themeColor}; text-align: center;">
                      ${primaryCta}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;

      case 'products':
        if (!previewProducts || previewProducts.length === 0) return '';
        return `
          <!-- FEATURED SOLAR KITS -->
          <tr>
            <td class="pad-mob" style="padding: 16px 36px 10px; background-color: #ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 8px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">
                    Featured Solar Kits (${previewProducts.length})
                  </td>
                </tr>
                ${previewProducts
            .map((k) => {
              const livePrice = Number(k.base_price || k.selling_price_cached || k.defaultPrice || k.price || 0);
              const priceLabel = livePrice > 0 ? `₹${livePrice.toLocaleString('en-IN')}` : 'Quote on Request';
              return `
                  <tr>
                    <td style="padding: 12px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="font-size: 14px; font-weight: 800; color: #0f172a;">${k.name || 'Solar Combo Kit'}</td>
                          <td align="right" style="font-size: 14px; font-weight: 800; color: #2563eb; white-space: nowrap;">${priceLabel}</td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 4px; font-size: 12px; color: #64748b;">
                            ${k.components_summary || k.sub_title || 'Tier-1 ALMM Certified Kit • Regional Depot Dispatch'}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td height="8"></td></tr>
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
          <!-- COUPON VOUCHER -->
          <tr>
            <td class="pad-mob" style="padding: 10px 40px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <div style="background-color: #fffbeb; border: 1px dashed #f59e0b; padding: 14px; border-radius: 8px; text-align: center;">
                <span style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">Exclusive EPC Discount Voucher</span>
                <div style="font-size: 20px; font-weight: 900; color: #78350f; font-family: monospace; margin: 4px 0;">${couponCode}</div>
                <span style="font-size: 12px; color: #92400e; font-weight: 700;">Get ${discountStr} on eligible orders in Solar Shop</span>
              </div>
            </td>
          </tr>
        `;

      case 'benefit_cards':
        if (points.length === 0) return '';
        return `
          <!-- VALUE PROPOSITION BOXES / HIGHLIGHT POINTS -->
          <tr>
            <td class="pad-mob" style="padding: 18px 40px 10px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${pointsHtml}
              </table>
            </td>
          </tr>
        `;

      case 'closing_pitch':
        return `
          <!-- SECONDARY CLOSING PITCH & SECONDARY CTA -->
          <tr>
            <td class="pad-mob" align="center" style="padding: 24px 40px 6px; text-align: center; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <p style="margin: 0; font-size: 17px; font-weight: 800; color: ${cr.themeColor} !important;">
                ${cr.closingPitch}
              </p>
            </td>
          </tr>

          <tr>
            <td class="pad-mob" align="center" style="padding: 14px 20px 10px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" bgcolor="${cr.stripColor}" style="border-radius: 8px; background-color: ${cr.stripColor}; text-align: center;">
                    <a href="${destUrl}" target="_blank" style="font-size: 15px; line-height: 20px; font-weight: 800; color: #ffffff !important; text-decoration: none; padding: 13px 32px; border-radius: 8px; display: inline-block; background-color: ${cr.stripColor}; text-align: center;">
                      ${cr.secondaryCtaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;

      case 'custom_ctas':
        if (!ctaButtons || ctaButtons.length <= 1) return '';
        return `
          <!-- ADDITIONAL CUSTOM CTAS -->
          <tr>
            <td class="pad-mob" align="center" style="padding: 10px 40px 16px; background-color: #ffffff; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 450px; margin: 0 auto;">
                ${ctaButtons
            .slice(1)
            .map(
              (btn) => `
                  <tr>
                    <td align="center" style="padding: 6px 0;">
                      <a href="${normalizeActionUrl(btn.url, destUrl)}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; padding: 11px 20px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 700; color: #334155; text-decoration: none; text-align: center;">
                        ${btn.text}
                      </a>
                    </td>
                  </tr>
                `
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${subject}</title>
  <style>
    html, body { margin: 0 auto !important; padding: 0 !important; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; }
    table, td { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    @media screen and (max-width: 620px) {
      .email-wrap { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .pad-mob { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">

  <!-- Preheader -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-wrap" style="width: 600px; max-width: 600px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; margin: 0 auto;">

          <!-- 1. HEADER (PINNED AT TOP) -->
          <tr>
            <td align="center" style="padding: 22px 20px 16px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; border-bottom: 2px solid #f1f5f9; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="text-align: center;">
                    <a href="${safeWebsiteHref}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${safeLogoUrl}" alt="SolarKits Official Logo" width="190" style="width: 190px; max-width: 190px; height: auto; display: block; border: 0; margin: 0 auto;" />
                    </a>
                    ${cr.headerTagline ? `
                      <div style="font-size: 10px; font-weight: 800; color: ${cr.stripColor}; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; font-family: Arial, sans-serif; text-align: center;">
                        ${cr.headerTagline}
                      </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTACT STRIP BAR (PINNED AS PART OF HEADER) -->
          <tr>
            <td align="center" style="background-color: ${cr.stripColor}; padding: 10px 20px; text-align: center;">
              <span style="font-size: 13px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
                📞 ${cr.contactPhone} &nbsp;|&nbsp; 🌐 <a href="${safeWebsiteHref}" target="_blank" style="color: #ffffff; text-decoration: underline;">${safeWebsiteDisplay}</a>
              </span>
            </td>
          </tr>

          <!-- DYNAMIC REORDERABLE BODY SECTIONS -->
          ${sectionsOrder.map(renderSectionHtml).join('')}

          <!-- DISCLAIMER (PINNED AT BOTTOM) -->
          <tr>
            <td align="center" style="padding: 16px 40px 18px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                ${cr.footerDisclaimer}
              </p>
            </td>
          </tr>

          <!-- FOOTER (PINNED AT BOTTOM) -->
          <tr>
            <td align="center" style="background-color: #1a2552; padding: 28px 25px; color: #ffffff; border-top: 4px solid ${cr.accentColor}; text-align: center;">
              <p style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #ffffff; text-align: center;">
                ${cr.footerTitle || 'SOLARKITS INDIA'}
              </p>
              <p style="margin: 4px 0 12px; font-size: 13px; color: #cbd5e1; text-align: center;">
                ${cr.footerTagline || "Powering India's Leading Solar EPC Network"}
              </p>
              <p style="margin: 0 0 8px; font-size: 11px; color: #94a3b8; line-height: 16px; text-align: center;">
                ${cr.footerAddress || '© 2026 SolarKits (India) Pvt. Ltd. • All Rights Reserved.'}
              </p>
              <p style="margin: 0; font-size: 11px; line-height: 18px; color: #94a3b8; text-align: center;">
                You are receiving this exclusive wholesale bulletin as a registered Solar EPC contractor in India.<br>
                Prefer not to receive commercial solar kit dispatches?
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 12px auto 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: #24336b; border: 1px solid #4c62a8; text-align: center;">
                    <a href="{{unsubscribe_url}}" target="_blank" style="display: inline-block; padding: 7px 18px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; color: ${cr.accentColor}; text-decoration: none; text-align: center;">
                      ${cr.unsubscribeBtnText || '🔕 Unsubscribe from this list'}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
