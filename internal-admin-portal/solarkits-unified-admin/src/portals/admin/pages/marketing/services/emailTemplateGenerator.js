/**
 * SolarKits High-Conversion Email Template Generator
 * Bulletproof 600px Responsive Table Layout matching Executive Qbits & SolarKits Reference
 */

<<<<<<< HEAD
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

=======
>>>>>>> origin/main
export const DEFAULT_EXECUTIVE_CREATIVE = {
  logoUrl: 'https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png',
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
  customBodyText: 'Your customers want rooftop solar that keeps the power running during grid outages too. With SolarKits Pre-Engineered Hybrid & DCR Combos, quote solar plus battery storage in one complete package and win projects that on-grid-only EPCs lose.',
  primaryCtaText: 'Get SolarKits Pricing Today →',
  destinationUrl: 'https://solarkits.in/solar-kits',
  mediaType: 'banner', // 'banner' | 'image' | 'video'
  heroImageUrl: '',
<<<<<<< HEAD
  sectionsOrder: DEFAULT_SECTIONS_ORDER,
=======
>>>>>>> origin/main
  valuePills: [
    '1. Add Backup to Quotes',
    '2. Higher Ticket Size',
    '3. Depot Support'
  ],
  bulletPoints: [
    'Higher Project Value & Margin: Sell complete combo (Panels + Inverter + Battery + Structure) in one order and maximize ticket size.',
    'Win More Quotes Against Competitors: Deliver unmatched power cut reliability with up to 98% inverter efficiency and guaranteed MNRE & ALMM compliance.',
    'Free Engineering Tools & Technical Helpdesk: Instant access to CAD drawings, SLDs, datasheets, sizing tools, and direct dedicated technical support.',
    'Regional Depots & Fast Dispatch Across India: Dispatches within 24 hours from regional warehouses (Bhiwandi, Surat, Ahmedabad, Pune, Jaipur) with full transit insurance.'
  ],
  closingPitch: 'Sell complete solar power, not just panels. Choose SolarKits.',
  secondaryCtaText: 'Explore Wholesale Solar Kits →',
  footerTitle: 'SOLARKITS INDIA',
  footerTagline: "Powering India's Leading Solar EPC Network",
  footerAddress: '© 2026 SolarKits (India) Pvt. Ltd. • All Rights Reserved. Central Depot: Bhiwandi Logistics Hub, Maharashtra, India.',
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
    customBodyText: 'Your customers want rooftop solar that keeps the power running during grid outages too. With SolarKits Pre-Engineered Hybrid & DCR Combos, quote solar plus battery storage in one complete package and win projects that on-grid-only EPCs lose.',
    primaryCtaText: 'Get SolarKits Pricing Today →',
    valuePills: ['1. Add Backup to Quotes', '2. Higher Ticket Size', '3. Depot Support'],
    bulletPoints: [
      'Higher Project Value & Margin: Sell complete combo (Panels + Inverter + Battery + Structure) in one order and maximize ticket size.',
      'Win More Quotes Against Competitors: Deliver unmatched power cut reliability with up to 98% inverter efficiency and guaranteed MNRE & ALMM compliance.',
      'Free Engineering Tools & Technical Helpdesk: Instant access to CAD drawings, SLDs, datasheets, sizing tools, and direct dedicated technical support.',
      'Regional Depots & Fast Dispatch Across India: Dispatches within 24 hours from regional warehouses (Bhiwandi, Surat, Ahmedabad, Pune, Jaipur) with full transit insurance.'
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
    customBodyText: 'Offer your customers next-generation N-Type TOPCon solar modules engineered for extreme heat endurance and up to 25% bifacial rear gain. Direct factory allocation available for certified regional installers.',
    primaryCtaText: 'Download Technical Datasheets & Pricing →',
    valuePills: ['1. 22.8% Efficiency', '2. 30-Year Warranty', '3. 25% Rear Gain'],
    bulletPoints: [
      'Bifacial Rear Power Gain: Generate up to 25% extra energy from ground and rooftop albedo reflection.',
      'Superior Low-Light & Temperature Performance: Generates more kWh even during cloudy mornings and peak summer heat.',
      '30-Year Performance Assurance: Underwritten linear warranty with less than 0.4% annual degradation.',
      'Zero-Delay Regional Depot Dispatch: Ready stock available across Bhiwandi, Ahmedabad, Pune, and Jaipur hubs.'
    ],
    closingPitch: 'Lead the technology curve in your region. Quote Next-Gen TOPCon Kits.',
    secondaryCtaText: 'Request Sample Datasheet & Quotation →'
  },
  {
    id: 'festive_offer',
    label: '🎉 Festive / Seasonal Mega Offer',
    purpose: 'festive_offer',
    headline: 'DIWALI MEGA B2B COMBO DHAMAKA — FLAT ₹5,000 OFF',
    subheading: 'Flat ₹5,000 Cash Voucher per Kit with Zero Delay Dispatches & Cashback to Wallet.',
    categoryTag: 'FESTIVE WHOLESALE BONANZA • LIMITED ALLOCATION',
    h1Title: 'Exclusive Festive Pre-Booking Allocation for EPCs',
    customBodyText: 'Festive season rooftop solar inquiries are peaking across India. Lock in pre-booked subsidy-approved commercial kits with instant voucher redemption and guaranteed 24-hour depot dispatch.',
    primaryCtaText: 'Claim Festive Voucher & Lock Pricing →',
    valuePills: ['1. Flat ₹5,000 Off', '2. Instant Cashback', '3. Zero Hold'],
    bulletPoints: [
      'Instant Cash Voucher Redemption: Save an additional ₹5,000 per kit on all DCR and Hybrid commercial combos.',
      'Assured 24-Hour Dispatch: Guaranteed transit-insured dispatches directly from your nearest certified regional warehouse.',
      'Direct B2B Wallet Cashback: Earn reward points and volume cashback directly into your SolarKits contractor wallet.',
      'Priority Documentation Support: Dedicated helpline for fast subsidy portal documentation and SLD generation.'
    ],
    closingPitch: 'Maximize your festive margins before allocations run out. Book now.',
    secondaryCtaText: 'Apply Voucher & Order Kits →'
  },
  {
    id: 'price_drop',
    label: '🔥 Flash Price Drop & Clearance',
    purpose: 'price_drop',
    headline: 'FLASH WHOLESALE PRICE DROP: ON-GRID & DCR KITS',
    subheading: 'Limited Regional Stock Cleared at Factory-Direct Wholesale Rates for Next 72 Hours.',
    categoryTag: 'FLASH CLEARANCE ALERT • 72 HOURS ONLY',
    h1Title: 'Slashed Wholesale Rates on In-Demand Commercial Kits',
    customBodyText: 'Take advantage of limited warehouse stock clearance at Bhiwandi and Pune central hubs. Tier-1 ALMM mono-PERC kits ready for immediate dispatch at rock-bottom factory-direct margins.',
    primaryCtaText: 'View Slashed Wholesale Prices →',
    valuePills: ['1. Rock-Bottom Rates', '2. Ready Stock', '3. 72-Hour Hold'],
    bulletPoints: [
      'Factory-Direct Margin Advantage: Pass on unbeatable prices to your rooftop clients and secure high-value contracts.',
      'Immediate Loading & Transit Insurance: Trucks depart within 12-24 hours with full transit liability protection.',
      'Zero Advance Payment Hold: Flexible payment settlement and instant GST tax invoice generation.',
      'Complete Installation Accessories Included: Pre-crimped MC4, DCDB, ACDB, and pre-engineered mounting rails.'
    ],
    closingPitch: 'Stock is strictly reserved on a first-come, first-served basis. Act fast.',
    secondaryCtaText: 'Claim Clearance Allocation Today →'
  },
  {
    id: 'onboarding',
    label: '🤝 EPC Partner Onboarding & Welcome',
    purpose: 'onboarding',
    headline: "WELCOME TO INDIA'S LARGEST SOLAR EPC NETWORK",
    subheading: 'Your Direct B2B Wholesale Portal Access & Credit Line Eligibility Are Now Active.',
    categoryTag: 'OFFICIAL PARTNER ONBOARDING • SOLARKITS',
    h1Title: 'Welcome Aboard! Here is Everything You Need to Scale',
    customBodyText: 'Thank you for registering with SolarKits India. As a verified installer partner, you now have direct access to India-wide depot dispatches, subsidized wholesale kit rates, and full engineering tools.',
    primaryCtaText: 'Access Your Partner Portal & Sizing Tools →',
    valuePills: ['1. Direct Depot Access', '2. Free CAD/SLD', '3. Dedicated Desk'],
    bulletPoints: [
      'Wholesale Partner Pricing Unlocked: Access transparent, volume-tiered rates across 3 kW, 5 kW, 10 kW and customized MW kits.',
      'Free Engineering Drawings & Sizing Tools: Instant access to CAD drawings, Single Line Diagrams (SLD), and BOM calculators.',
      'Dedicated Regional Account Manager: One direct point of contact for priority quotes, dispatch tracking, and site queries.',
      '24/7 Logistics Tracking: Live GPS shipment updates from our central Bhiwandi and regional fulfillment hubs.'
    ],
    closingPitch: 'We are committed to helping your solar contracting business grow faster.',
    secondaryCtaText: 'Explore Partner Dashboard & Products →'
  }
];

/**
 * Generates production-ready 600px responsive table HTML
 */
export function generateResponsiveEmailHtml(formData = {}) {
  const cr = { ...DEFAULT_EXECUTIVE_CREATIVE, ...(formData.customCreative || {}) };
  const subject = formData.emailSubject || 'Solar EPCs, this one is for you - SolarKits Wholesale Pricing';
  const preheader = formData.emailPreviewText || 'Quote solar plus battery backup in one system. Exclusive B2B pricing for verified EPC partners.';
  const primaryCta = formData.ctaText || cr.primaryCtaText || 'Get SolarKits Pricing Today →';
  const destUrl = formData.destinationUrl || cr.destinationUrl || 'https://solarkits.in/solar-kits';
  const couponCode = formData.couponCode;
  const hasCoupon = formData.hasCoupon && couponCode;
  const discountStr = formData.discountValue ? `₹${Number(formData.discountValue).toLocaleString('en-IN')} OFF` : '₹5,000 OFF';

  // Parse bullet points into { title, desc }
  const points = (cr.bulletPoints || []).map((pt, idx) => {
    if (typeof pt === 'object' && pt.title) return pt;
    const str = String(pt);
    if (str.includes(':')) {
      const parts = str.split(':');
      return { title: parts[0].trim(), desc: parts.slice(1).join(':').trim(), borderColor: idx % 2 === 0 ? cr.themeColor : cr.accentColor };
    }
    return { title: `Feature ${idx + 1}`, desc: str.trim(), borderColor: idx % 2 === 0 ? cr.themeColor : cr.accentColor };
  });

  const pointsHtml = points.map((p, i) => `
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
  `).join('');

<<<<<<< HEAD
  const sectionsOrder = Array.isArray(cr.sectionsOrder) && cr.sectionsOrder.length > 0
    ? cr.sectionsOrder
    : DEFAULT_SECTIONS_ORDER;

  const ctaButtons = Array.isArray(cr.ctaButtons) && cr.ctaButtons.length > 0
    ? cr.ctaButtons
    : (formData.ctaButtons || []);

  const previewProducts = formData.previewProducts || formData.selectedKitObjects || [];

  const renderSectionHtml = (sectionId) => {
    switch (sectionId) {
      case 'banner':
        return `
          <!-- HERO BANNER -->
=======
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

          <!-- 1. HEADER / OFFICIAL SOLARKITS LOGO -->
          <tr>
            <td align="center" style="padding: 22px 20px 18px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; border-bottom: 2px solid #f1f5f9; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="text-align: center;">
                    <a href="https://solarkits.in" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${cr.logoUrl || 'https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png'}" alt="SolarKits™ B2B Solar Kits Store" width="190" style="width: 190px; max-width: 190px; height: auto; display: block; border: 0; margin: 0 auto;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. HERO BANNER -->
>>>>>>> origin/main
          <tr>
            <td style="background-color: ${cr.themeColor}; text-align: center;">
              ${cr.mediaType === 'image' && cr.heroImageUrl ? `
                <img src="${cr.heroImageUrl}" alt="SolarKits Banner" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />
              ` : `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 34px 24px 28px; background: linear-gradient(135deg, #1e2d66 0%, ${cr.themeColor} 60%, #3a56c9 100%); text-align: center; color: #ffffff;">
                      <!-- Clean Tag Badge -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 14px auto;">
                        <tr>
                          <td align="center" style="background-color: #ffffff; padding: 6px 16px; border-radius: 20px; border-left: 4px solid ${cr.accentColor}; text-align: center;">
                            <div style="font-size: 11px; line-height: 16px; font-weight: 800; color: ${cr.themeColor}; letter-spacing: 1px; text-transform: uppercase; font-family: Arial, sans-serif; margin: 0; white-space: normal;">
                              ⚡ SolarKits Hybrid & On-Grid Combos
                            </div>
                          </td>
                        </tr>
                      </table>

                      <h2 style="margin: 0 0 10px; font-size: 26px; line-height: 34px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; text-align: center;">
                        ${cr.headline.replace('SELL COMPLETE BACKUP', `<span style="color: ${cr.accentColor};">SELL COMPLETE BACKUP</span>`)}
                      </h2>

                      <p style="margin: 0 0 18px; font-size: 13px; line-height: 20px; color: #e2e8f0; max-width: 480px; margin-left: auto; margin-right: auto; text-align: center;">
                        ${cr.subheading}
                      </p>

                      <!-- Responsive Badges (Inline wrap, no collision) -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 500px; margin: 0 auto;">
                        <tr>
                          <td align="center" style="text-align: center; padding: 0 5px;">
                            ${(cr.valuePills || []).map(pill => `
                              <div style="display: inline-block; margin: 3px 4px; padding: 6px 12px; background-color: rgba(255,255,255,0.18); border-radius: 6px; font-size: 11px; font-weight: 700; color: #ffffff; font-family: Arial, sans-serif; line-height: 16px; border: 1px solid rgba(255,255,255,0.3); text-align: center;">
                                ${pill}
                              </div>
                            `).join('')}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              `}
            </td>
          </tr>
<<<<<<< HEAD
        `;

      case 'pitch':
        return `
          <!-- PITCH & BODY INTRO -->
=======

          <!-- 3. CONTACT STRIP BAR -->
          <tr>
            <td style="background-color: ${cr.stripColor}; padding: 10px 20px; text-align: center;">
              <span style="font-size: 13px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
                📞 ${cr.contactPhone} &nbsp;|&nbsp; 🌐 <a href="https://${cr.contactWebsite}" target="_blank" style="color: #ffffff; text-decoration: underline;">${cr.contactWebsite}</a>
              </span>
            </td>
          </tr>

          <!-- 4. PITCH & BODY INTRO -->
>>>>>>> origin/main
          <tr>
            <td class="pad-mob" style="padding: 34px 40px 10px; text-align: center; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 2px; font-weight: 800; color: ${cr.stripColor}; text-transform: uppercase;">
                ${cr.categoryTag}
              </p>
              <h1 style="margin: 0 0 14px; font-size: 26px; line-height: 34px; font-weight: 900; color: ${cr.themeColor} !important;">
                ${cr.h1Title || 'Solar EPCs, this one is for you.'}
              </h1>
              <p style="margin: 0; font-size: 15px; line-height: 25px; color: #334155 !important;">
                ${cr.customBodyText}
              </p>
            </td>
          </tr>
<<<<<<< HEAD
        `;

      case 'primary_cta':
        return `
          <!-- PRIMARY CTA BUTTON -->
=======

          <!-- 5. PRIMARY CTA BUTTON (CENTERED) -->
>>>>>>> origin/main
          <tr>
            <td class="pad-mob" align="center" style="padding: 22px 20px 14px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" bgcolor="${cr.themeColor}" style="border-radius: 8px; background-color: ${cr.themeColor}; text-align: center;">
                    <a href="${destUrl}" target="_blank" style="font-size: 16px; font-weight: 800; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 8px; display: inline-block; background-color: ${cr.themeColor}; text-align: center;">
                      ${primaryCta}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
<<<<<<< HEAD
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
                ${previewProducts.map(k => `
                  <tr>
                    <td style="padding: 12px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="font-size: 14px; font-weight: 800; color: #0f172a;">${k.name}</td>
                          <td align="right" style="font-size: 14px; font-weight: 800; color: #2563eb;">₹${Number(k.base_price || 89317).toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 4px; font-size: 12px; color: #64748b;">
                            ${k.components_summary || k.sub_title || 'Tier-1 ALMM Certified Kit • Fast Depot Dispatch'}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td height="8"></td></tr>
                `).join('')}
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
                <span style="font-size: 12px; color: #92400e; font-weight: 700;">Get ${discountStr} on orders above MOQ in Solar Shop</span>
              </div>
            </td>
          </tr>
        `;

      case 'benefit_cards':
        return `
          <!-- VALUE PROPOSITION BOXES / HIGHLIGHT POINTS -->
=======

          <!-- COUPON VOUCHER (IF ACTIVE) -->
          ${hasCoupon ? `
            <tr>
              <td class="pad-mob" style="padding: 10px 40px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
                <div style="background-color: #fffbeb; border: 1px dashed #f59e0b; padding: 14px; border-radius: 8px; text-align: center;">
                  <span style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">Exclusive EPC Discount Voucher</span>
                  <div style="font-size: 20px; font-weight: 900; color: #78350f; font-family: monospace; margin: 4px 0;">${couponCode}</div>
                  <span style="font-size: 12px; color: #92400e; font-weight: 700;">Get ${discountStr} on orders above MOQ in Solar Shop</span>
                </div>
              </td>
            </tr>
          ` : ''}

          <!-- 6. VALUE PROPOSITION BOXES / 4 HIGHLIGHT POINTS -->
>>>>>>> origin/main
          <tr>
            <td class="pad-mob" style="padding: 18px 40px 10px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${pointsHtml}
              </table>
            </td>
          </tr>
<<<<<<< HEAD
        `;

      case 'closing_pitch':
        return `
          <!-- SECONDARY CLOSING PITCH & SECONDARY CTA -->
=======

          <!-- 7. SECONDARY CLOSING PITCH -->
>>>>>>> origin/main
          <tr>
            <td class="pad-mob" style="padding: 24px 40px 6px; text-align: center; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <p style="margin: 0; font-size: 17px; font-weight: 800; color: ${cr.themeColor} !important;">
                ${cr.closingPitch}
              </p>
            </td>
          </tr>
<<<<<<< HEAD
=======

          <!-- 8. SECONDARY CTA BUTTON (CENTERED) -->
>>>>>>> origin/main
          <tr>
            <td class="pad-mob" align="center" style="padding: 14px 20px 10px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" bgcolor="${cr.stripColor}" style="border-radius: 8px; background-color: ${cr.stripColor}; text-align: center;">
                    <a href="${destUrl}" target="_blank" style="font-size: 15px; font-weight: 800; color: #ffffff !important; text-decoration: none; padding: 13px 32px; border-radius: 8px; display: inline-block; background-color: ${cr.stripColor}; text-align: center;">
                      ${cr.secondaryCtaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
<<<<<<< HEAD
        `;

      case 'custom_ctas':
        if (!ctaButtons || ctaButtons.length <= 1) return '';
        return `
          <!-- ADDITIONAL CUSTOM CTAS -->
          <tr>
            <td class="pad-mob" align="center" style="padding: 10px 40px 16px; background-color: #ffffff; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 450px; margin: 0 auto;">
                ${ctaButtons.slice(1).map(btn => `
                  <tr>
                    <td align="center" style="padding: 6px 0;">
                      <a href="${btn.url || '#'}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; padding: 11px 20px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 700; color: #334155; text-decoration: none; text-align: center;">
                        ${btn.text}
                      </a>
                    </td>
                  </tr>
                `).join('')}
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
            <td align="center" style="padding: 22px 20px 18px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important; border-bottom: 2px solid #f1f5f9; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="text-align: center;">
                    <a href="https://solarkits.in" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${cr.logoUrl || 'https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png'}" alt="SolarKits™ B2B Solar Kits Store" width="190" style="width: 190px; max-width: 190px; height: auto; display: block; border: 0; margin: 0 auto;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTACT STRIP BAR (PINNED AS PART OF HEADER) -->
          <tr>
            <td style="background-color: ${cr.stripColor}; padding: 10px 20px; text-align: center;">
              <span style="font-size: 13px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
                📞 ${cr.contactPhone} &nbsp;|&nbsp; 🌐 <a href="https://${cr.contactWebsite}" target="_blank" style="color: #ffffff; text-decoration: underline;">${cr.contactWebsite}</a>
              </span>
            </td>
          </tr>

          <!-- DYNAMIC REORDERABLE BODY SECTIONS -->
          ${sectionsOrder.map(renderSectionHtml).join('')}

          <!-- DISCLAIMER (PINNED AT BOTTOM) -->
          <tr>
            <td align="center" style="padding: 16px 40px 18px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
=======

          <!-- Disclaimer -->
          <tr>
            <td align="center" style="padding: 0 40px 22px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff) !important;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
>>>>>>> origin/main
                ${cr.footerDisclaimer}
              </p>
            </td>
          </tr>

<<<<<<< HEAD
          <!-- FOOTER (PINNED AT BOTTOM) -->
=======
          <!-- 9. FOOTER -->
>>>>>>> origin/main
          <tr>
            <td align="center" style="background-color: #1a2552; padding: 28px 25px; color: #ffffff; border-top: 4px solid ${cr.accentColor};">
              <p style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">
                ${cr.footerTitle || 'SOLARKITS INDIA'}
              </p>
              <p style="margin: 4px 0 12px; font-size: 13px; color: #cbd5e1;">
                ${cr.footerTagline || "Powering India's Leading Solar EPC Network"}
              </p>
              <p style="margin: 0 0 8px; font-size: 11px; color: #94a3b8; line-height: 16px;">
                ${cr.footerAddress || '© 2026 SolarKits (India) Pvt. Ltd. • All Rights Reserved.<br>Central Depot: Bhiwandi Logistics Hub, Maharashtra, India.'}
              </p>
              <p style="margin: 0; font-size: 11px; line-height: 18px; color: #94a3b8; text-align: center;">
                You are receiving this exclusive wholesale bulletin as a registered Solar EPC contractor in India.<br>
                Prefer not to receive commercial solar kit dispatches?
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 10px auto 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.22); text-align: center;">
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
