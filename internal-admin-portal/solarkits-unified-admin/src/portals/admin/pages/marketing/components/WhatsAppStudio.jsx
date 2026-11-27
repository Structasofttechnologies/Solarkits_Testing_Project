import React, { useState, useMemo, useEffect } from 'react';
import {
  Type, Image as ImageIcon, Video, Mic, FileText, ShoppingBag, LayoutGrid, Smile,
  Variable, Tag, Link2, CreditCard, MapPin, Phone, MessageCircle, Globe,
  Wifi, CheckCheck, Smartphone, Monitor, Plus, Trash2, X, ChevronDown, Sparkles, Upload
} from 'lucide-react';
import { marketingHttp, extractApiError } from '../services/marketingApi';

const DYNAMIC_VARS = [
  { key: 'first_name', label: 'First Name', preview: 'Aarav' },
  { key: 'company_name', label: 'Company / EPC Name', preview: 'SunVolt Solar Solutions' },
  { key: 'coupon_code', label: 'Coupon Code', preview: 'SOLARDIWALI5000' },
  { key: 'discount_value', label: 'Discount Value', preview: '₹5,000 OFF' },
  { key: 'product_name', label: 'Solar Kit Name', preview: '3 K.W. Solarkits DCR Combokit' },
  { key: 'warehouse_name', label: 'Serving Depot', preview: 'Bhiwandi Central Warehouse' },
  { key: 'checkout_link', label: 'Cart Checkout URL', preview: 'https://solarkits.in/solar-kits/3kw-dcr?coupon=SOLARDIWALI5000' },
  { key: 'expiry_date', label: 'Offer Expiry', preview: '30th November 2026' }
];

export default function WhatsAppStudio({
  formData,
  setFormData,
  selectedKitObjects = [],
  allKitsCatalog = [],
  warehousesList = []
}) {
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'template'
  const [previewDevice, setPreviewDevice] = useState('mobile'); // 'mobile' | 'desktop'
  const [showVarDropdown, setShowVarDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [savedWaTemplates, setSavedWaTemplates] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    let active = true;
    marketingHttp
      .get('/templates?channel=whatsapp')
      .then((res) => {
        if (!active) return;
        const rows = res.data?.data || res.data?.templates || [];
        setSavedWaTemplates(rows);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleUploadWaMedia = async (file, mediaKind = 'image') => {
    if (!file) return;
    setUploadingMedia(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await marketingHttp.post('/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success && res.data?.url) {
        updateWa({
          mediaType: mediaKind,
          mediaDetails: {
            url: res.data.url,
            name: res.data.original_name || file.name,
            size: res.data.size ? `${(res.data.size / (1024 * 1024)).toFixed(2)} MB` : 'Uploaded'
          }
        });
      }
    } catch (err) {
      setUploadError(extractApiError(err, 'Failed to upload WhatsApp media'));
    } finally {
      setUploadingMedia(false);
    }
  };

  // Derive dynamic warehouse name from Step 2
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
    return '3 K.W. Solarkits DCR Combokit';
  }, [selectedKitObjects]);

  // Multi-product selection state
  const [selectedProductIds, setSelectedProductIds] = useState(() => {
    if (formData.selectedKitIds?.length > 0) {
      return formData.selectedKitIds;
    }
    return selectedKitObjects.map(k => k.id);
  });

  // Selected kit objects for preview
  const attachedProducts = useMemo(() => {
    const pool = allKitsCatalog.length > 0 ? allKitsCatalog : selectedKitObjects;
    if (selectedProductIds.length === 0) return selectedKitObjects.slice(0, 2);
    return pool.filter(k => selectedProductIds.includes(k.id));
  }, [allKitsCatalog, selectedKitObjects, selectedProductIds]);

  // Read or initialize custom whatsapp creative
  const wa = formData.customCreative?.whatsapp || {
    body: `⚡ *Exclusive EPC Wholesale Offer!*\n\nHello {{first_name}},\n\nGet flat {{discount_value}} on {{product_name}} directly dispatched from {{warehouse_name}}.\n\nUse coupon *{{coupon_code}}* at checkout.\n\nClick below to claim your kits:`,
    mediaType: 'product',
    mediaDetails: {
      name: 'Product Brochure.pdf',
      size: '2.4 MB'
    },
    buttons: [
      {
        id: 'btn_1',
        type: 'url',
        text: formData.ctaText || 'Claim Kit Offer',
        url: formData.destinationUrl
          ? `${formData.destinationUrl}${formData.destinationUrl.includes('?') ? '&' : '?'}coupon=${formData.couponCode || 'SOLARDIWALI5000'}`
          : 'https://solarkits.in/solar-kits/3kw-dcr?coupon=SOLARDIWALI5000'
      },
      { id: 'btn_2', type: 'call', text: 'Call Regional BDE', phone: '+919913421453' },
      { id: 'btn_3', type: 'quick_reply', text: 'Request Stock Datasheet' }
    ]
  };

  const updateWa = (updates) => {
    setFormData((prev) => ({
      ...prev,
      customCreative: {
        ...prev.customCreative,
        whatsapp: {
          ...wa,
          ...updates
        }
      }
    }));
  };

  const insertVariable = (key) => {
    updateWa({ body: (wa.body || '') + ` {{${key}}}` });
    setShowVarDropdown(false);
  };

  const insertEmoji = (emoji) => {
    updateWa({ body: (wa.body || '') + ` ${emoji}` });
    setShowEmojiPicker(false);
  };

  const handleToolbarClick = (label) => {
    switch (label) {
      case 'Image':
        updateWa({
          mediaType: 'image',
          mediaDetails: {
            url: formData.customCreative?.heroImageUrl || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
            name: 'Solar-Combo-Kit-Banner.jpg'
          }
        });
        break;
      case 'Video':
        updateWa({
          mediaType: 'video',
          mediaDetails: {
            title: 'SolarKits 45s Product Explainer',
            duration: '0:45',
            url: formData.customCreative?.videoUrl || 'https://www.youtube.com/watch?v=kYJqA3oFk7o'
          }
        });
        break;
      case 'Audio':
        updateWa({
          mediaType: 'audio',
          mediaDetails: {
            name: `${activeWarehouseName} Regional BDE Voice Note`,
            duration: '0:28'
          }
        });
        break;
      case 'PDF':
        updateWa({
          mediaType: 'document',
          mediaDetails: {
            name: `${selectedKitObjects[0]?.name || 'Commercial Kit'} Datasheet & Warranty.pdf`,
            size: '2.4 MB'
          }
        });
        break;
      case 'Product':
        updateWa({ mediaType: 'product' });
        setShowProductModal(true);
        break;
      case 'Catalog':
        updateWa({
          mediaType: 'catalog',
          mediaDetails: {
            title: `SolarKits 2026 ${activeWarehouseName} Catalog`,
            itemsCount: `${attachedProducts.length || selectedKitObjects.length || 6} Kits Available`
          }
        });
        break;
      case 'Emoji':
        setShowEmojiPicker(!showEmojiPicker);
        break;
      case 'Variable':
        setShowVarDropdown(!showVarDropdown);
        break;
      case 'Coupon':
        updateWa({ body: (wa.body || '') + ' {{coupon_code}}' });
        break;
      case 'Link':
        updateWa({ body: (wa.body || '') + ' {{checkout_link}}' });
        break;
      case 'Payment':
        updateWa({
          mediaType: 'payment',
          mediaDetails: {
            amount: `₹${Number(formData.discountValue || 5000).toLocaleString('en-IN')}`,
            purpose: 'B2B Wholesale Token Booking'
          }
        });
        break;
      case 'Location':
        updateWa({
          mediaType: 'location',
          mediaDetails: {
            depot: activeWarehouseName,
            address: 'Regional Solar Warehouse & Logistics Depot'
          }
        });
        break;
      case 'Call Btn':
        if ((wa.buttons || []).length < 3) {
          updateWa({
            buttons: [...(wa.buttons || []), { id: `btn_${Date.now()}`, type: 'call', text: '📞 Call Sales Desk', phone: '+919913421453' }]
          });
        }
        break;
      case 'Reply Btn':
        if ((wa.buttons || []).length < 3) {
          updateWa({
            buttons: [...(wa.buttons || []), { id: `btn_${Date.now()}`, type: 'quick_reply', text: 'Need More Info' }]
          });
        }
        break;
      case 'URL Btn':
        if ((wa.buttons || []).length < 3) {
          const dest = formData.destinationUrl
            ? `${formData.destinationUrl}${formData.destinationUrl.includes('?') ? '&' : '?'}coupon=${formData.couponCode || 'SOLARDIWALI5000'}`
            : 'https://solarkits.in/solar-kits/3kw-dcr?coupon=SOLARDIWALI5000';
          updateWa({
            buttons: [...(wa.buttons || []), { id: `btn_${Date.now()}`, type: 'url', text: '🌐 Open Storefront', url: dest }]
          });
        }
        break;
      default:
        break;
    }
  };

  const removeMedia = () => {
    updateWa({ mediaType: 'none', mediaDetails: null });
  };

  const removeButton = (btnId) => {
    updateWa({
      buttons: (wa.buttons || []).filter(b => b.id !== btnId)
    });
  };

  const updateButtonText = (btnId, text) => {
    updateWa({
      buttons: (wa.buttons || []).map(b => b.id === btnId ? { ...b, text } : b)
    });
  };

  const handleToggleProduct = (kitId) => {
    if (selectedProductIds.includes(kitId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== kitId));
    } else {
      setSelectedProductIds([...selectedProductIds, kitId]);
    }
  };

  // Interpolate dynamic variables for real-time preview
  const getSubstitutedText = (text) => {
    if (!text) return '';
    let result = text;
    const lookup = {
      first_name: 'Aarav',
      company_name: 'SunVolt Solar Solutions',
      coupon_code: formData.couponCode || 'SOLARDIWALI5000',
      discount_value: dynamicDiscountStr,
      product_name: dynamicKitNames,
      warehouse_name: activeWarehouseName,
      checkout_link: formData.destinationUrl
        ? `${formData.destinationUrl}${formData.destinationUrl.includes('?') ? '&' : '?'}coupon=${formData.couponCode || 'SOLARDIWALI5000'}`
        : 'https://solarkits.in/solar-kits/3kw-dcr?coupon=SOLARDIWALI5000',
      expiry_date: formData.couponExpiry
        ? new Date(formData.couponExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '30th November 2026'
    };

    DYNAMIC_VARS.forEach(v => {
      const val = lookup[v.key] || v.preview;
      result = result.replaceAll(`{{${v.key}}}`, val);
    });
    return result;
  };

  const TOOLBAR_ELEMENTS = [
    { label: 'Text', icon: Type },
    { label: 'Image', icon: ImageIcon },
    { label: 'Video', icon: Video },
    { label: 'Audio', icon: Mic },
    { label: 'PDF', icon: FileText },
    { label: 'Product', icon: ShoppingBag },
    { label: 'Catalog', icon: LayoutGrid },
    { label: 'Emoji', icon: Smile },
    { label: 'Variable', icon: Variable },
    { label: 'Coupon', icon: Tag },
    { label: 'Link', icon: Link2 },
    { label: 'Payment', icon: CreditCard },
    { label: 'Location', icon: MapPin },
    { label: 'Call Btn', icon: Phone },
    { label: 'Reply Btn', icon: MessageCircle },
    { label: 'URL Btn', icon: Globe }
  ];

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'write'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            ✏️ Write Your Message
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'template'
                ? 'bg-emerald-600 text-white shadow-xs'
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
            onClick={() => setPreviewDevice('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              previewDevice === 'mobile'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              previewDevice === 'desktop'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Builder or Template Picker (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === 'template' ? (
            /* Saved Templates Selector */
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Meta Approved Saved Templates
                </h4>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  Production Verified
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {savedWaTemplates.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                    No saved WhatsApp templates in MongoDB yet. Create or approve one in WhatsApp Templates first, or use the Message Builder tab.
                  </div>
                ) : (
                  savedWaTemplates.map((tmpl) => (
                    <div
                      key={tmpl._id}
                      onClick={() => {
                        updateWa({ body: tmpl.body_text || tmpl.body || '' });
                        setFormData((prev) => ({
                          ...prev,
                          selectedWhatsAppTemplateId: String(tmpl._id),
                          templateMode: 'preset'
                        }));
                        setActiveTab('write');
                      }}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{tmpl.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {tmpl.status || 'draft'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{tmpl.body_text || 'Template body'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Active Message Builder */
            <div className="space-y-4">
              {/* 1. Message Elements Toolbar */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  Message Elements
                </span>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {TOOLBAR_ELEMENTS.map((el) => {
                    const Icon = el.icon;
                    return (
                      <button
                        key={el.label}
                        type="button"
                        onClick={() => handleToolbarClick(el.label)}
                        className="flex flex-col items-center justify-center p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 cursor-pointer group"
                      >
                        <Icon className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-medium leading-tight">{el.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Variable Selector Popup */}
                {showVarDropdown && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <span>Insert Dynamic Customer / Kit Variable:</span>
                      <button type="button" onClick={() => setShowVarDropdown(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DYNAMIC_VARS.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => insertVariable(v.key)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 text-[11px] font-mono cursor-pointer transition-colors shadow-2xs"
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
                    {['☀️', '⚡', '📦', '🏷️', '🚀', '📞', '📍', '🎁', '🛒', '🌟', '💼', '✅'].map((em) => (
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

              {/* 2. Message Content Editor */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Message Content
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Draft Status • Auto-Formatted
                  </span>
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 font-semibold">
                    {uploadError}
                  </div>
                )}

                {/* Attached Media Chip */}
                {wa.mediaType && wa.mediaType !== 'none' && (
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {wa.mediaType === 'product' && (
                        <span>🛍️ Product Card: <strong>{attachedProducts.map(k => k.name).join(', ') || dynamicKitNames}</strong></span>
                      )}
                      {wa.mediaType === 'document' && <span>📄 Document Attached: <strong>{wa.mediaDetails?.name || 'Product Brochure.pdf'}</strong> (2.4 MB)</span>}
                      {wa.mediaType === 'image' && <span>🖼️ Image Banner Attached</span>}
                      {wa.mediaType === 'video' && <span>📹 Explainer Video Attached (0:45)</span>}
                      {wa.mediaType === 'audio' && <span>🎙️ Voice Note Attached (0:28)</span>}
                      {wa.mediaType === 'catalog' && <span>▦ Catalog Attached: <strong>{wa.mediaDetails?.title}</strong></span>}
                      {wa.mediaType === 'location' && <span>📍 Warehouse Location Pin: <strong>{wa.mediaDetails?.depot}</strong></span>}
                      {wa.mediaType === 'payment' && <span>💳 B2B Payment Request: <strong>{wa.mediaDetails?.amount}</strong></span>}
                    </div>

                    <div className="flex items-center gap-1">
                      {(wa.mediaType === 'image' || wa.mediaType === 'document') && (
                        <label className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 cursor-pointer flex items-center gap-1 mr-1">
                          <Upload className="w-3 h-3" />
                          <span>{uploadingMedia ? 'Uploading...' : 'Upload'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept={wa.mediaType === 'image' ? 'image/*' : '.pdf,application/pdf'}
                            disabled={uploadingMedia}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadWaMedia(file, wa.mediaType);
                            }}
                          />
                        </label>
                      )}
                      {wa.mediaType === 'product' && (
                        <button
                          type="button"
                          onClick={() => setShowProductModal(true)}
                          className="text-xs text-blue-600 font-bold px-2 py-0.5 rounded hover:bg-white cursor-pointer mr-1"
                        >
                          Change
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={removeMedia}
                        className="text-slate-400 hover:text-red-500 p-1 text-xs cursor-pointer"
                        title="Remove Attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Body Textarea */}
                <div className="relative">
                  <textarea
                    rows={6}
                    value={wa.body || ''}
                    onChange={(e) => updateWa({ body: e.target.value })}
                    placeholder="Write your WhatsApp message here or insert variables..."
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-normal leading-relaxed focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                  />
                  <div className="text-[10px] text-slate-400 text-right mt-1">
                    {(wa.body || '').length} characters • WhatsApp standard formatting (*bold*, _italic_) supported
                  </div>
                </div>

                {/* Action Buttons Editor */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                      Interactive Buttons ({wa.buttons?.length || 0}/3)
                    </span>
                    {(wa.buttons || []).length < 3 && (
                      <button
                        type="button"
                        onClick={() => handleToolbarClick('Reply Btn')}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Button
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {(wa.buttons || []).map((btn) => (
                      <div key={btn.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-400 w-16 shrink-0">
                          {btn.type === 'url' ? '🌐 URL' : btn.type === 'call' ? '📞 Call' : '💬 Reply'}
                        </span>
                        <input
                          type="text"
                          value={btn.text}
                          onChange={(e) => updateButtonText(btn.id, e.target.value)}
                          placeholder="Button label..."
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => removeButton(btn.id)}
                          className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Live WhatsApp Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'max-w-[340px]' : 'w-full'}`}>
              {/* Phone Mockup Frame */}
              <div className={`bg-slate-900 text-white shadow-2xl overflow-hidden ${
                previewDevice === 'mobile'
                  ? 'rounded-[2.5rem] p-3 border-4 border-slate-700'
                  : 'rounded-2xl p-2 border border-slate-700'
              }`}>
                {/* Mobile Status Bar */}
                {previewDevice === 'mobile' && (
                  <div className="flex items-center justify-between px-4 py-1 text-white text-[10px]">
                    <span className="font-semibold">9:41</span>
                    <div className="flex items-center gap-1.5">
                      <Wifi className="w-3 h-3" />
                      <div className="w-4 h-2 bg-white/90 rounded-xs" />
                    </div>
                  </div>
                )}

                {/* WhatsApp Chat Header */}
                <div className="bg-[#075E54] px-4 py-3 rounded-t-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-700 border-2 border-emerald-400 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    SK
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-xs font-bold truncate">SolarKits B2B Official</p>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    </div>
                    <p className="text-emerald-200 text-[10px]">online</p>
                  </div>
                </div>

                {/* WhatsApp Chat Area */}
                <div
                  className="min-h-[420px] max-h-[520px] overflow-y-auto px-3 py-4 space-y-2.5 bg-[#ECE5DD] dark:bg-[#0b141a]"
                  style={{
                    backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.04) 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                >
                  {/* Date Badge */}
                  <div className="flex justify-center mb-1">
                    <span className="px-3 py-0.5 bg-white/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-semibold shadow-2xs">
                      Today
                    </span>
                  </div>

                  {/* Outgoing Message Bubble */}
                  <div className="flex justify-end">
                    <div className="max-w-[92%] bg-[#DCF8C6] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-2xl rounded-tr-xs p-3 shadow-xs space-y-2">
                      
                      {/* Media Header Preview */}
                      {wa.mediaType && wa.mediaType !== 'none' && (
                        <div className="rounded-xl overflow-hidden bg-white/60 dark:bg-black/20 p-2 space-y-2">
                          {/* MULTI PRODUCT CARDS PREVIEW */}
                          {wa.mediaType === 'product' && (
                            <div className="space-y-1.5">
                              {attachedProducts.map((p) => (
                                <div key={p.id} className="p-2 bg-white dark:bg-slate-800 rounded-lg space-y-1 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px]">{p.name}</span>
                                    <span className="text-xs font-extrabold text-emerald-600">
                                      ₹{Number(p.base_price).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                                    <span>{p.sku}</span>
                                    <span>MOQ: {formData.kitMoqs?.[p.id] ?? p.moq ?? formData.minOrderQty ?? 25} Kits</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {wa.mediaType === 'document' && (
                            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 p-2.5 rounded-lg shadow-2xs">
                              <span className="text-2xl">📄</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {wa.mediaDetails?.name || 'Product Brochure.pdf'}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {wa.mediaDetails?.size || '2.4 MB'} • PDF Document
                                </p>
                              </div>
                            </div>
                          )}

                          {wa.mediaType === 'image' && (
                            <img
                              src={wa.mediaDetails?.url || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600'}
                              alt="Media"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          )}

                          {wa.mediaType === 'video' && (
                            <div className="relative w-full h-28 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                              <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center shadow-md">
                                <span className="ml-0.5 text-xs font-black">▶</span>
                              </div>
                              <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-black/70 px-2 py-0.5 rounded-md">
                                {wa.mediaDetails?.duration || '0:45'}
                              </span>
                            </div>
                          )}

                          {wa.mediaType === 'audio' && (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg">
                              <span className="text-lg">🎙️</span>
                              <div className="flex-1 h-1.5 bg-emerald-500 rounded-full" />
                              <span className="text-[10px] text-slate-500">0:28</span>
                            </div>
                          )}

                          {wa.mediaType === 'catalog' && (
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg space-y-1">
                              <div className="font-bold text-xs">{wa.mediaDetails?.title}</div>
                              <div className="text-[10px] text-emerald-600 font-bold">{wa.mediaDetails?.itemsCount}</div>
                            </div>
                          )}

                          {wa.mediaType === 'location' && (
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg flex items-center gap-2">
                              <MapPin className="text-rose-500 w-4 h-4 shrink-0" />
                              <div className="text-[11px] min-w-0">
                                <p className="font-bold truncate">{wa.mediaDetails?.depot}</p>
                                <p className="text-[9px] text-slate-400 truncate">{wa.mediaDetails?.address}</p>
                              </div>
                            </div>
                          )}

                          {wa.mediaType === 'payment' && (
                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-between">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400">Payment Request</span>
                                <p className="text-xs font-bold text-emerald-600">{wa.mediaDetails?.amount}</p>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                UPI Ready
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Text with Live Variable Resolution */}
                      <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                        {getSubstitutedText(wa.body)}
                      </p>

                      {/* Timestamp & Delivery Ticks */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-emerald-200/70 pt-0.5">
                        <span>10:30 AM</span>
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Action Buttons */}
                  {(wa.buttons || []).length > 0 && (
                    <div className="flex justify-end pt-1">
                      <div className="max-w-[92%] w-full space-y-1">
                        {(wa.buttons || []).map((btn) => (
                          <div
                            key={btn.id}
                            className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            {btn.type === 'url' && <Globe className="w-3.5 h-3.5 text-indigo-600" />}
                            {btn.type === 'call' && <Phone className="w-3.5 h-3.5 text-emerald-600" />}
                            {btn.type === 'quick_reply' && <MessageCircle className="w-3.5 h-3.5 text-amber-600" />}
                            <span>{btn.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-PRODUCT SELECTOR MODAL FOR WHATSAPP */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="text-emerald-600" /> Select Solar Kits for WhatsApp Card
                </h3>
                <p className="text-xs text-slate-500">Pick which solar kits will be attached to the WhatsApp broadcast message.</p>
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
                        ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-white ${
                        isSelected ? 'bg-emerald-600' : 'border border-slate-300'
                      }`}>
                        {isSelected && '✓'}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{k.name}</span>
                        <span className="text-[10px] text-slate-500">{k.sku} • Warranty: 12 Yrs • MOQ: {k.moq || 25}</span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600">
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Apply to Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
