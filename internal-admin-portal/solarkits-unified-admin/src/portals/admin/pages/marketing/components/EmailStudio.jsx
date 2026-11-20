import React, { useState, useMemo } from 'react';
import {
  Type, Heading1, Image as ImageIcon, Video, ShoppingBag, LayoutGrid, Tag, MousePointer,
  Minus, Share2, AlignLeft, Link2, Variable, Sparkles, Smartphone, Monitor,
  Plus, Trash2, X, Check, ExternalLink, Play, Smile, Phone, Layers, ShieldCheck
} from 'lucide-react';

const DYNAMIC_VARS = [
  { key: 'name', label: 'Partner Name', preview: 'Aarav Patel' },
  { key: 'company_name', label: 'Company / EPC Name', preview: 'SunVolt Solar Solutions' },
  { key: 'coupon_code', label: 'Coupon Code', preview: 'SOLARDIWALI5000' },
  { key: 'discount_value', label: 'Discount Value', preview: '₹5,000 OFF' },
  { key: 'kit_name', label: 'Kit Name', preview: '3 K.W. Solarkits DCR Combokit' },
  { key: 'warehouse_name', label: 'Serving Depot', preview: 'Bhiwandi Central Depot' },
  { key: 'tracking_url', label: 'Tracking / Cart URL', preview: 'https://solarkits.in/solar-kits/3kw-dcr?coupon=SOLARDIWALI5000' }
];

export default function EmailStudio({
  formData,
  setFormData,
  selectedKitObjects = [],
  allKitsCatalog = [],
  warehousesList = []
}) {
  const [activeTab, setActiveTab] = useState('custom'); // 'custom' | 'template'
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [showVarDropdown, setShowVarDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // Derive active warehouse name dynamically from Step 2
  const activeWarehouseName = useMemo(() => {
    if (formData.servingWarehouses?.length > 0 && warehousesList?.length > 0) {
      const found = warehousesList.find(w =>
        formData.servingWarehouses.includes(w.id || w.warehouse_id || w.warehouse_code || w.code)
      );
      if (found) return found.name || found.warehouse_name || found.warehouse_code;
    }
    return formData.servingWarehouses?.[0] || 'IND_GUJ_001';
  }, [formData.servingWarehouses, warehousesList]);

  // Derive dynamic discount string
  const dynamicDiscountStr = useMemo(() => {
    if (!formData.discountValue) return '₹5,000 OFF';
    return formData.discountType === 'percent'
      ? `${formData.discountValue}% OFF`
      : `₹${Number(formData.discountValue).toLocaleString('en-IN')} OFF`;
  }, [formData.discountValue, formData.discountType]);

  // Derive dynamic primary kit names from Step 3
  const dynamicKitNames = useMemo(() => {
    if (selectedKitObjects.length > 0) {
      return selectedKitObjects.map(k => k.name).join(' & ');
    }
    return '3 K.W. & 5 K.W. Commercial Solar Kits';
  }, [selectedKitObjects]);

  // Form creative state with fallback to Step 3 values
  const creative = formData.customCreative || {
    headline: 'Diwali Mega B2B Solar Dhamaka',
    subheading: `Flat ${dynamicDiscountStr} per Kit with Zero Delay Dispatches`,
    themeColor: '#2563eb',
    mediaType: 'image',
    heroImageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=kYJqA3oFk7o',
    customBodyText: `Exclusive wholesale allocation for verified EPC contractors on ${dynamicKitNames}. Claim pre-booked subsidy approved kits directly from certified ${activeWarehouseName} with guaranteed zero dispatch delay.`,
    bulletPoints: [
      'MNRE & ALMM Approved Tier-1 High Efficiency Modules',
      'Instant Depot Dispatch within 24 Hours with Transit Insurance',
      'Special Festive Cashback Credited Directly to B2B Wallet',
      'End-to-End Subsidy Portal Documentation Assistance'
    ],
    footerDisclaimer: 'Valid for verified GST-registered EPC contractors only. Minimum order quantity applies as per Solar Shop rules. Stock reserved on first-come basis.'
  };

  // Selected products to display in the email (defaults to all Step 3 selected kits)
  const [selectedProductIds, setSelectedProductIds] = useState(() => {
    if (formData.selectedKitIds?.length > 0) {
      return formData.selectedKitIds;
    }
    return selectedKitObjects.map(k => k.id);
  });

  // Multiple CTA buttons list
  const [ctaButtons, setCtaButtons] = useState(() => {
    const baseCta = formData.ctaText || 'Claim Kit Offer & Apply Coupon';
    const baseUrl = formData.destinationUrl
      ? `${formData.destinationUrl}${formData.destinationUrl.includes('?') ? '&' : '?'}coupon=${formData.couponCode || 'SOLARDIWALI5000'}`
      : 'https://solarkits.in/solar-kits/3kw-dcr?coupon=SOLARDIWALI5000';

    return [
      { id: 'cta_1', text: baseCta, url: baseUrl, variant: 'primary' },
      { id: 'cta_2', text: '📥 Download Technical Datasheet', url: 'https://solarkits.in/datasheets/commercial-kits.pdf', variant: 'secondary' }
    ];
  });

  const updateCreative = (updates) => {
    setFormData((prev) => ({
      ...prev,
      customCreative: {
        ...prev.customCreative,
        ...updates
      }
    }));
  };

  const insertVariable = (key) => {
    updateCreative({ customBodyText: (creative.customBodyText || '') + ` {{${key}}}` });
    setShowVarDropdown(false);
  };

  const insertEmoji = (emoji) => {
    updateCreative({ customBodyText: (creative.customBodyText || '') + ` ${emoji}` });
    setShowEmojiPicker(false);
  };

  // Add a new CTA button
  const handleAddCtaButton = () => {
    const newBtn = {
      id: `cta_${Date.now()}`,
      text: '📞 Call Regional Sales Manager',
      url: 'tel:+919913421453',
      variant: 'secondary'
    };
    setCtaButtons([...ctaButtons, newBtn]);
  };

  const handleUpdateCta = (id, field, value) => {
    setCtaButtons(ctaButtons.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleRemoveCta = (id) => {
    if (ctaButtons.length <= 1) return;
    setCtaButtons(ctaButtons.filter(b => b.id !== id));
  };

  // Toggle products in multi-product modal
  const handleToggleProduct = (kitId) => {
    if (selectedProductIds.includes(kitId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== kitId));
    } else {
      setSelectedProductIds([...selectedProductIds, kitId]);
    }
  };

  // Filter products for preview
  const previewProducts = useMemo(() => {
    const pool = allKitsCatalog.length > 0 ? allKitsCatalog : selectedKitObjects;
    if (selectedProductIds.length === 0) return selectedKitObjects.slice(0, 2);
    return pool.filter(k => selectedProductIds.includes(k.id));
  }, [allKitsCatalog, selectedKitObjects, selectedProductIds]);

  // Toolbar elements for Email Studio
  const EMAIL_ELEMENTS = [
    { label: 'Heading', icon: Heading1, action: () => updateCreative({ headline: 'Diwali Mega B2B Solar Dhamaka' }) },
    { label: 'Text', icon: Type, action: () => {} },
    { label: 'Image', icon: ImageIcon, action: () => updateCreative({ mediaType: 'image' }) },
    { label: 'Video', icon: Video, action: () => updateCreative({ mediaType: 'video' }) },
    { label: 'Product', icon: ShoppingBag, action: () => setShowProductModal(true) },
    { label: 'Catalog', icon: LayoutGrid, action: () => {
      setSelectedProductIds(allKitsCatalog.map(k => k.id));
    }},
    { label: 'Coupon', icon: Tag, action: () => {
      setFormData(prev => ({ ...prev, hasCoupon: !prev.hasCoupon }));
    }},
    { label: 'CTA Btn', icon: MousePointer, action: handleAddCtaButton },
    { label: 'Link', icon: Link2, action: () => updateCreative({ customBodyText: (creative.customBodyText || '') + ' {{tracking_url}}' }) },
    { label: 'Emoji', icon: Smile, action: () => setShowEmojiPicker(!showEmojiPicker) },
    { label: 'Variable', icon: Variable, action: () => setShowVarDropdown(!showVarDropdown) },
    { label: 'Divider', icon: Minus, action: () => updateCreative({ customBodyText: (creative.customBodyText || '') + '\n\n— — — — — — — — — —\n\n' }) },
    { label: 'Social', icon: Share2, action: () => {} },
    { label: 'Footer', icon: AlignLeft, action: () => {} }
  ];

  // Dynamic variable resolver for live preview
  const getSubstitutedText = (text) => {
    if (!text) return '';
    let result = text;
    const lookup = {
      name: 'Aarav Patel',
      company_name: 'SunVolt Solar Solutions',
      coupon_code: formData.couponCode || 'SOLARDIWALI5000',
      discount_value: dynamicDiscountStr,
      kit_name: dynamicKitNames,
      warehouse_name: activeWarehouseName,
      tracking_url: formData.destinationUrl
        ? `${formData.destinationUrl}${formData.destinationUrl.includes('?') ? '&' : '?'}coupon=${formData.couponCode || 'SOLARDIWALI5000'}`
        : 'https://solarkits.in/solar-kits/3kw-dcr?coupon=SOLARDIWALI5000'
    };

    DYNAMIC_VARS.forEach((v) => {
      const val = lookup[v.key] || v.preview;
      result = result.replaceAll(`{{${v.key}}}`, val);
    });
    return result;
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            ✏️ Design Custom Email
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'template'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            📋 Use Saved Template
          </button>
        </div>

        {/* Device Switcher for Preview */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setPreviewDevice('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              previewDevice === 'desktop'
                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              previewDevice === 'mobile'
                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile
          </button>
        </div>
      </div>

      {/* ── EMAIL ELEMENTS TOOLBAR (Matches WhatsApp Elements Toolbar) ── */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Email Message Elements & Components
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
            Dynamic Components Ready
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-14 gap-2">
          {EMAIL_ELEMENTS.map((el) => {
            const Icon = el.icon;
            return (
              <button
                key={el.label}
                type="button"
                onClick={el.action}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100 cursor-pointer group"
              >
                <Icon className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-medium leading-tight">{el.label}</span>
              </button>
            );
          })}
        </div>

        {/* Variable Dropdown */}
        {showVarDropdown && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-900 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
              <span>Insert Dynamic Customer / Order Variable Token:</span>
              <button type="button" onClick={() => setShowVarDropdown(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DYNAMIC_VARS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-[11px] font-mono cursor-pointer transition-colors shadow-2xs"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Emoji Quick Picker */}
        {showEmojiPicker && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
            {['☀️', '⚡', '📦', '🏷️', '🚀', '📞', '📍', '🎁', '🛒', '🌟', '💼', '✅', '🔥', '🎉'].map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => insertEmoji(em)}
                className="text-base p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
              >
                {em}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Email Controls / Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === 'template' ? (
            /* Saved Templates Selector */
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-blue-600" /> Pre-Approved Responsive Email Templates
                </h4>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                  Verified HTML
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    id: 'em_hero_card',
                    name: 'Commercial Kit Slashed Price Offer',
                    category: 'Promotional',
                    subject: `Special Diwali Wholesale Offer: ${dynamicKitNames} with Discount`,
                    snippet: `Claim pre-booked subsidy approved kits from ${activeWarehouseName}.`
                  },
                  {
                    id: 'em_dubai_trip',
                    name: 'Dubai Champions EPC Reward Progress',
                    category: 'Reward Program',
                    subject: 'You are only 5 Kits away from Qualifying for Dubai Trip!',
                    snippet: 'Top performing EPC partners international reward tour qualification.'
                  },
                  {
                    id: 'em_reactivation',
                    name: 'Inactive EPC Welcome Back Voucher',
                    category: 'Reactivation',
                    subject: `We Miss You! Exclusive ${dynamicDiscountStr} voucher for your next order`,
                    snippet: 'Restock your commercial inventory with zero security deposit.'
                  }
                ].map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        emailSubject: tmpl.subject,
                        emailPreviewText: tmpl.snippet
                      }));
                      updateCreative({ headline: tmpl.name, subheading: tmpl.snippet });
                      setActiveTab('custom');
                    }}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{tmpl.name}</span>
                      <span className="text-[10px] font-semibold text-slate-400">{tmpl.category}</span>
                    </div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{tmpl.subject}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{tmpl.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Custom Email Designer */
            <div className="space-y-4">
              {/* Subject & Preheader */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Email Inbox Envelope
                </span>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Email Subject Line *
                    </label>
                    <input
                      type="text"
                      value={formData.emailSubject || `Special Wholesale Offer: ${dynamicKitNames} at Slashed Price`}
                      onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                      placeholder="Catchy subject line with emoji..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Preview Preheader Snippet
                    </label>
                    <input
                      type="text"
                      value={formData.emailPreviewText || `Exclusive wholesale allocation from ${activeWarehouseName}. Claim your kits today.`}
                      onChange={(e) => setFormData({ ...formData, emailPreviewText: e.target.value })}
                      placeholder="Short snippet visible before opening email..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Header & Media */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Creative Header & Banner Media
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Theme Accent:</span>
                    <input
                      type="color"
                      value={creative.themeColor || '#2563eb'}
                      onChange={(e) => updateCreative({ themeColor: e.target.value })}
                      className="w-7 h-7 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Media Type Switcher: Image vs Video */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateCreative({ mediaType: 'image' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      creative.mediaType === 'image'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Photo / Image Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCreative({ mediaType: 'video' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      creative.mediaType === 'video'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-red-500" /> Explainer Video
                  </button>
                </div>

                {creative.mediaType === 'image' ? (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                      Hero Banner Image URL:
                    </label>
                    <input
                      type="text"
                      value={creative.heroImageUrl || ''}
                      onChange={(e) => updateCreative({ heroImageUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                      Explainer Video URL (YouTube / MP4):
                    </label>
                    <input
                      type="text"
                      value={creative.videoUrl || ''}
                      onChange={(e) => updateCreative({ videoUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                    />
                  </div>
                )}

                {/* Headline & Subheading */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Banner Headline *
                    </label>
                    <input
                      type="text"
                      value={creative.headline || 'Diwali Mega B2B Solar Dhamaka'}
                      onChange={(e) => updateCreative({ headline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Promotional Subheading
                    </label>
                    <input
                      type="text"
                      value={creative.subheading || `Flat ${dynamicDiscountStr} per Kit with Zero Delay Dispatches`}
                      onChange={(e) => updateCreative({ subheading: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                    Email Body Typography
                  </label>
                  <textarea
                    rows={4}
                    value={creative.customBodyText || ''}
                    onChange={(e) => updateCreative({ customBodyText: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs leading-relaxed"
                  />
                </div>

                {/* Feature Bullet Highlights */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                      Feature Highlights (4 Key Bullet Points)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pts = creative.bulletPoints || [];
                        updateCreative({ bulletPoints: [...pts, 'New Feature Guarantee / Specification'] });
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      + Add Point
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {(creative.bulletPoints || []).map((bp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <input
                          type="text"
                          value={bp}
                          onChange={(e) => {
                            const updated = [...(creative.bulletPoints || [])];
                            updated[idx] = e.target.value;
                            updateCreative({ bulletPoints: updated });
                          }}
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (creative.bulletPoints || []).filter((_, i) => i !== idx);
                            updateCreative({ bulletPoints: updated });
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MULTIPLE CTA BUTTONS MANAGER */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                      <MousePointer className="w-3.5 h-3.5 text-blue-600" /> Action CTAs & Clickable Links ({ctaButtons.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCtaButton}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add CTA Button
                    </button>
                  </div>

                  <div className="space-y-2">
                    {ctaButtons.map((btn, idx) => (
                      <div key={btn.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Button #{idx + 1}</span>
                          {ctaButtons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCta(btn.id)}
                              className="text-slate-400 hover:text-red-500 text-xs cursor-pointer"
                              title="Delete Button"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={btn.text}
                            onChange={(e) => handleUpdateCta(btn.id, 'text', e.target.value)}
                            placeholder="CTA Button Label..."
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
                          />
                          <input
                            type="text"
                            value={btn.url}
                            onChange={(e) => handleUpdateCta(btn.id, 'url', e.target.value)}
                            placeholder="Destination URL (https://... or tel:...)"
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Multi-Product Selection Badge */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Included Solar Kits in Email ({previewProducts.length} Selected)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {previewProducts.map(k => k.name).join(', ') || 'No kits selected'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProductModal(true)}
                    className="px-3 py-1.5 rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ShoppingBag className="w-3 h-3" /> Select Products
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Live Email Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'max-w-[340px]' : 'w-full'}`}>
              
              {/* Outer Device Frame */}
              <div className={`bg-slate-900 text-white shadow-2xl overflow-hidden ${
                previewDevice === 'mobile'
                  ? 'rounded-[2.5rem] p-3 border-4 border-slate-700'
                  : 'rounded-2xl p-2 border border-slate-700'
              }`}>
                {/* Inbox Toolbar Mockup */}
                <div className="bg-slate-800 px-3 py-2 rounded-t-xl border-b border-slate-700 text-[11px] text-slate-300 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate">From: SolarKits B2B Wholesale &lt;orders@solarkits.in&gt;</span>
                    <span>Today, 10:30 AM</span>
                  </div>
                  <div className="font-bold text-white truncate text-xs">
                    {formData.emailSubject || `Special Wholesale Offer: ${dynamicKitNames}`}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {formData.emailPreviewText || `Exclusive wholesale allocation from ${activeWarehouseName}.`}
                  </div>
                </div>

                {/* Email Canvas */}
                <div className="bg-white text-slate-800 max-h-[520px] overflow-y-auto">
                  {/* Email Branded Header */}
                  <div
                    className="p-4 text-white"
                    style={{ backgroundColor: creative.themeColor || '#2563eb' }}
                  >
                    <span className="text-[9px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-full">
                      SOLARKITS B2B WHOLESALE
                    </span>
                    <h3 className="text-base font-black mt-1 leading-snug">
                      {creative.headline || 'Diwali Mega B2B Solar Dhamaka'}
                    </h3>
                    <p className="text-xs text-white/80 mt-0.5 font-medium">
                      {creative.subheading || `Flat ${dynamicDiscountStr} per Kit`}
                    </p>
                  </div>

                  {/* Hero Media: Photo or Video */}
                  {creative.mediaType === 'image' ? (
                    <img
                      src={creative.heroImageUrl || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800'}
                      alt="Banner"
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-36 bg-slate-900 flex items-center justify-center text-white">
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 text-white ml-0.5 fill-white" />
                      </div>
                      <span className="absolute bottom-2 left-3 text-[10px] font-bold bg-black/70 px-2 py-0.5 rounded-md">
                        45s Explainer Video
                      </span>
                    </div>
                  )}

                  <div className="p-4 space-y-3.5">
                    {/* Substituted Body Text */}
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {getSubstitutedText(creative.customBodyText)}
                    </p>

                    {/* DYNAMIC MULTI-PRODUCTS CARDS */}
                    {previewProducts.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          <span>Featured Solar Kits ({previewProducts.length})</span>
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            {activeWarehouseName}
                          </span>
                        </div>

                        {previewProducts.map((k) => (
                          <div key={k.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span>{k.name}</span>
                              <span className="text-blue-600 font-extrabold">
                                ₹{Number(k.base_price || 89317).toLocaleString('en-IN')} / kit
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {k.components_summary || k.sub_title}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                              <span>• 12-Yr Warranty • MOQ: {formData.kitMoqs?.[k.id] ?? k.moq ?? formData.minOrderQty ?? 25} Kits</span>
                              <span className="text-emerald-600 font-bold">Fast Dispatch</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Coupon Promo Card */}
                    {formData.hasCoupon && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-amber-700">Promo Voucher</span>
                          <p className="text-sm font-black font-mono text-amber-900">
                            {formData.couponCode || 'SOLARDIWALI5000'}
                          </p>
                          <span className="text-[10px] text-amber-800 block">
                            Valid on Orders ≥ {formData.minOrderQty || 25} Kits in Solar Shop
                          </span>
                        </div>
                        <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-2.5 py-1 rounded-lg">
                          {dynamicDiscountStr}
                        </span>
                      </div>
                    )}

                    {/* Bullet Highlights */}
                    {(creative.bulletPoints || []).length > 0 && (
                      <div className="space-y-1 text-xs">
                        {(creative.bulletPoints || []).map((pt, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-slate-700">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* MULTIPLE CTA ACTION BUTTONS */}
                    <div className="pt-2 space-y-2">
                      {ctaButtons.map((btn, idx) => (
                        <a
                          key={btn.id}
                          href={btn.url || '#'}
                          onClick={(e) => e.preventDefault()}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs text-center block transition-transform hover:scale-[1.01] ${
                            idx === 0
                              ? 'text-white shadow-md'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                          }`}
                          style={idx === 0 ? { backgroundColor: creative.themeColor || '#2563eb' } : {}}
                        >
                          <span>{btn.text}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ))}
                    </div>

                    {/* Footer Compliance */}
                    <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 space-y-1 text-center">
                      <p>{creative.footerDisclaimer || 'Valid for verified GST-registered EPC contractors only.'}</p>
                      <p>SolarKits India Pvt. Ltd. • All Rights Reserved • <span className="underline cursor-pointer">Unsubscribe</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-PRODUCT SELECTOR MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="text-blue-600" /> Select Products for Email Creative
                </h3>
                <p className="text-xs text-slate-500">Pick which solar kits will be embedded with live specs and pricing in the email.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(allKitsCatalog.length > 0 ? allKitsCatalog : selectedKitObjects).map((k) => {
                const isSelected = selectedProductIds.includes(k.id);
                return (
                  <div
                    key={k.id}
                    onClick={() => handleToggleProduct(k.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-white ${
                        isSelected ? 'bg-blue-600' : 'border border-slate-300'
                      }`}>
                        {isSelected && '✓'}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{k.name}</span>
                        <span className="text-[10px] text-slate-500">{k.sku} • Warranty: 12 Yrs • MOQ: {k.moq || 25}</span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-blue-600">
                      ₹{Number(k.base_price).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {selectedProductIds.length} Products Selected
              </span>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Apply to Creative
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
