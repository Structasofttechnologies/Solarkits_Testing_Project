import React, { useState, useMemo, useEffect } from 'react';
import {
  Type, Heading1, Image as ImageIcon, Video, ShoppingBag, LayoutGrid, Tag, MousePointer,
  Minus, Share2, AlignLeft, Link2, Variable, Sparkles, Smartphone, Monitor,
  Plus, Trash2, X, Check, ExternalLink, Play, Smile, Phone, Layers, ShieldCheck,
  ArrowUp, ArrowDown, Bookmark, Save, MoveVertical, RefreshCw, CheckCircle2,
  GripVertical, ChevronsUp, ChevronsDown, Lock, ListOrdered, LayoutList, Info,
  CornerDownRight, SlidersHorizontal, ArrowUpDown, Upload
} from 'lucide-react';
import {
  DEFAULT_EXECUTIVE_CREATIVE,
  PURPOSE_BASED_PRESETS,
  DEFAULT_EMAIL_SECTIONS,
  DEFAULT_SECTIONS_ORDER,
  generateResponsiveEmailHtml
} from '../services/emailTemplateGenerator';
import { marketingHttp, extractApiError } from '../services/marketingApi';

// Rich Section Metadata with intuitive icons, color coding, and editor anchors
const SECTION_METADATA_MAP = {
  banner: {
    id: 'banner',
    label: 'Hero Media Banner',
    shortLabel: 'Hero Banner',
    desc: 'Executive gradient banner, photo, or 45s explainer video',
    icon: ImageIcon,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-950/60',
    borderColor: 'border-purple-200 dark:border-purple-800',
    editorAnchor: 'editor-section-banner'
  },
  pitch: {
    id: 'pitch',
    label: 'Pitch Title & Body Copy',
    shortLabel: 'Pitch & Copy',
    desc: 'Category tag, main H1 headline, and custom value pitch text',
    icon: Type,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950/60',
    borderColor: 'border-blue-200 dark:border-blue-800',
    editorAnchor: 'editor-section-pitch'
  },
  primary_cta: {
    id: 'primary_cta',
    label: 'Primary Call to Action',
    shortLabel: 'Primary CTA Button',
    desc: 'Main high-contrast action button (e.g. Claim Kit Offer & Apply Coupon)',
    icon: MousePointer,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/60',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    editorAnchor: 'editor-section-ctas'
  },
  products: {
    id: 'products',
    label: 'Featured Solar Kits Catalog',
    shortLabel: 'Solar Kits Catalog',
    desc: 'Real-time pricing, specs, MOQs, and warehouse depot availability',
    icon: ShoppingBag,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-950/60',
    borderColor: 'border-amber-200 dark:border-amber-800',
    editorAnchor: 'editor-section-products'
  },
  coupon: {
    id: 'coupon',
    label: 'Promo Coupon Voucher',
    shortLabel: 'Discount Voucher',
    desc: 'Dashed discount voucher box with coupon code & savings breakdown',
    icon: Tag,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-950/60',
    borderColor: 'border-orange-200 dark:border-orange-800',
    editorAnchor: 'editor-section-coupon'
  },
  benefit_cards: {
    id: 'benefit_cards',
    label: 'Feature Benefit Cards',
    shortLabel: 'Executive Value Cards',
    desc: 'Color-coded highlight value boxes showcasing key contractor benefits',
    icon: Layers,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-950/60',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    editorAnchor: 'editor-section-benefits'
  },
  closing_pitch: {
    id: 'closing_pitch',
    label: 'Closing Pitch & Secondary CTA',
    shortLabel: 'Closing Pitch & CTA',
    desc: 'Bottom conversion pitch statement and secondary action button',
    icon: AlignLeft,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-950/60',
    borderColor: 'border-rose-200 dark:border-rose-800',
    editorAnchor: 'editor-section-closing'
  },
  custom_ctas: {
    id: 'custom_ctas',
    label: 'Additional Action CTAs',
    shortLabel: 'Secondary Buttons',
    desc: 'Datasheet download, catalogue links, and extra contact buttons',
    icon: ExternalLink,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-950/60',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    editorAnchor: 'editor-section-ctas'
  }
};

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

  // Saved templates fetched directly from MongoDB (`marketing_templates`)
  const [savedCustomTemplates, setSavedCustomTemplates] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateCategory, setSaveTemplateCategory] = useState('Promotional');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [uploadingAssetField, setUploadingAssetField] = useState(null);
  const [assetUploadError, setAssetUploadError] = useState('');

  const handleUploadEmailAsset = async (file, fieldKey) => {
    if (!file) return;
    setUploadingAssetField(fieldKey);
    setAssetUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await marketingHttp.post('/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success && res.data?.url) {
        updateCreative({ [fieldKey]: res.data.url });
      } else {
        setAssetUploadError(res.data?.message || 'Upload failed.');
      }
    } catch (err) {
      setAssetUploadError(extractApiError(err, 'Failed to upload image to Cloudinary'));
    } finally {
      setUploadingAssetField(null);
    }
  };

  const loadDbEmailTemplates = async () => {
    try {
      const res = await marketingHttp.get('/templates?channel=email');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const mapped = res.data.data.map((t) => ({
          id: t._id,
          _id: t._id,
          name: t.name,
          category: t.type || 'marketing',
          createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '',
          emailSubject: t.subject || '',
          emailPreviewText: t.preview_text || '',
          ctaText: t.blocks_json?.ctaText || 'Get SolarKits Pricing Today →',
          destinationUrl: t.blocks_json?.destinationUrl || 'https://solarkits.in/solar-kits',
          hasCoupon: Boolean(t.blocks_json?.hasCoupon),
          couponCode: t.blocks_json?.couponCode || '',
          selectedProductIds: t.blocks_json?.selectedProductIds || [],
          ctaButtons: t.blocks_json?.ctaButtons || [],
          customCreative: t.blocks_json?.customCreative || DEFAULT_EXECUTIVE_CREATIVE
        }));
        setSavedCustomTemplates(mapped);
      }
    } catch (err) {
      console.warn('EmailStudio templates fetch notice:', err.message);
    }
  };

  useEffect(() => {
    loadDbEmailTemplates();
  }, []);

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

  // Form creative state with fallback to Step 3 values and official Cloudinary logo
  const creative = {
    ...DEFAULT_EXECUTIVE_CREATIVE,
    logoUrl: 'https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png',
    subheading: `Flat ${dynamicDiscountStr} per Kit with Zero Delay Dispatches`,
    customBodyText: `Exclusive wholesale allocation for verified EPC contractors on ${dynamicKitNames}. Claim pre-booked subsidy approved kits directly from certified ${activeWarehouseName} with guaranteed zero dispatch delay.`,
    sectionsOrder: DEFAULT_SECTIONS_ORDER,
    ...(formData.customCreative || {})
  };

  // Active dynamic section ordering
  const activeSectionsOrder = useMemo(() => {
    if (Array.isArray(creative.sectionsOrder) && creative.sectionsOrder.length === DEFAULT_SECTIONS_ORDER.length) {
      return creative.sectionsOrder;
    }
    return DEFAULT_SECTIONS_ORDER;
  }, [creative.sectionsOrder]);

  const updateCreative = (updates) => {
    setFormData((prev) => ({
      ...prev,
      customCreative: {
        ...prev.customCreative,
        ...updates
      }
    }));
  };

  // Section Sequencer UI View Mode: 'flow' (recommended top-to-bottom pipeline) | 'compact'
  const [orderViewMode, setOrderViewMode] = useState('flow');

  // Drag and Drop & Live Preview Sync State
  const [draggedSectionId, setDraggedSectionId] = useState(null);
  const [dragOverSectionId, setDragOverSectionId] = useState(null);
  const [hoveredSectionId, setHoveredSectionId] = useState(null);

  // Step-by-step Reorder Handler
  const handleMoveSection = (sectionId, direction) => {
    const current = [...activeSectionsOrder];
    const index = current.indexOf(sectionId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;
    updateCreative({ sectionsOrder: current });
  };

  // Direct Position Selector Handler ("Apni man-chaahi jagah par choose karke daalna")
  const handleMoveToPosition = (sectionId, targetIndex) => {
    const current = [...activeSectionsOrder];
    const sourceIndex = current.indexOf(sectionId);
    if (sourceIndex === -1 || targetIndex < 0 || targetIndex >= current.length || sourceIndex === targetIndex) return;
    const [movedItem] = current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, movedItem);
    updateCreative({ sectionsOrder: current });
  };

  // Jump to extreme Top or Bottom
  const handleMoveToExtreme = (sectionId, to) => {
    if (to === 'top') {
      handleMoveToPosition(sectionId, 0);
    } else {
      handleMoveToPosition(sectionId, activeSectionsOrder.length - 1);
    }
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (e, sectionId) => {
    setDraggedSectionId(sectionId);
    e.dataTransfer.setData('text/plain', sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, sectionId) => {
    e.preventDefault();
    if (sectionId !== dragOverSectionId) {
      setDragOverSectionId(sectionId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSectionId(null);
  };

  const handleDrop = (e, targetSectionId) => {
    e.preventDefault();
    const sourceSectionId = draggedSectionId || e.dataTransfer.getData('text/plain');
    if (!sourceSectionId || sourceSectionId === targetSectionId) {
      setDraggedSectionId(null);
      setDragOverSectionId(null);
      return;
    }
    const current = [...activeSectionsOrder];
    const sourceIdx = current.indexOf(sourceSectionId);
    const targetIdx = current.indexOf(targetSectionId);
    if (sourceIdx !== -1 && targetIdx !== -1) {
      const [moved] = current.splice(sourceIdx, 1);
      current.splice(targetIdx, 0, moved);
      updateCreative({ sectionsOrder: current });
    }
    setDraggedSectionId(null);
    setDragOverSectionId(null);
  };

  const handleDragEnd = () => {
    setDraggedSectionId(null);
    setDragOverSectionId(null);
  };

  // Quick 1-Click Layout Presets
  const handleApplyLayoutPreset = (presetKey) => {
    switch (presetKey) {
      case 'standard':
        // Standard B2B sales flow
        updateCreative({ sectionsOrder: ['banner', 'pitch', 'primary_cta', 'products', 'coupon', 'benefit_cards', 'closing_pitch', 'custom_ctas'] });
        break;
      case 'offer_first':
        // Highlight coupon discount right after banner
        updateCreative({ sectionsOrder: ['banner', 'coupon', 'products', 'pitch', 'primary_cta', 'benefit_cards', 'closing_pitch', 'custom_ctas'] });
        break;
      case 'catalog_first':
        // Product showcase focus
        updateCreative({ sectionsOrder: ['banner', 'products', 'pitch', 'primary_cta', 'coupon', 'benefit_cards', 'closing_pitch', 'custom_ctas'] });
        break;
      case 'urgency_first':
        // Pitch headline at the very top
        updateCreative({ sectionsOrder: ['pitch', 'banner', 'coupon', 'primary_cta', 'products', 'benefit_cards', 'closing_pitch', 'custom_ctas'] });
        break;
      default:
        updateCreative({ sectionsOrder: DEFAULT_SECTIONS_ORDER });
    }
  };

  const handleResetSectionOrder = () => {
    updateCreative({ sectionsOrder: DEFAULT_SECTIONS_ORDER });
  };

  // Smooth scroll to an editor section
  const scrollToEditorSection = (anchorId) => {
    if (!anchorId) return;
    const el = document.getElementById(anchorId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-500');
      }, 1500);
    }
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
    if (formData.customCreative?.ctaButtons?.length > 0) {
      return formData.customCreative.ctaButtons;
    }
    const baseCta = formData.ctaText || 'Claim Kit Offer & Apply Coupon';
    const baseUrl = formData.destinationUrl
      ? `${formData.destinationUrl}${formData.destinationUrl.includes('?') ? '&' : '?'}coupon=${formData.couponCode || 'SOLARDIWALI5000'}`
      : 'https://solarkits.in/solar-kits/3kw-dcr?coupon=SOLARDIWALI5000';

    return [
      { id: 'cta_1', text: baseCta, url: baseUrl, variant: 'primary' },
      { id: 'cta_2', text: '📥 Download Technical Datasheet', url: 'https://solarkits.in/datasheets/commercial-kits.pdf', variant: 'secondary' }
    ];
  });


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
    const updated = [...ctaButtons, newBtn];
    setCtaButtons(updated);
    updateCreative({ ctaButtons: updated });
  };

  const handleUpdateCta = (id, field, value) => {
    const updated = ctaButtons.map(b => b.id === id ? { ...b, [field]: value } : b);
    setCtaButtons(updated);
    updateCreative({ ctaButtons: updated });
  };

  const handleRemoveCta = (id) => {
    if (ctaButtons.length <= 1) return;
    const updated = ctaButtons.filter(b => b.id !== id);
    setCtaButtons(updated);
    updateCreative({ ctaButtons: updated });
  };

  // Move CTA button up or down
  const handleMoveCta = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ctaButtons.length) return;
    const updated = [...ctaButtons];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCtaButtons(updated);
    updateCreative({ ctaButtons: updated });
  };

  // Custom Template Save & Delete Handlers (Persisted in MongoDB)
  const handleSaveCreativeAsTemplate = async (e) => {
    e?.preventDefault();
    const name = saveTemplateName.trim() || creative.headline || 'Custom Executive Creative';
    const subject = formData.emailSubject || `Special Wholesale Offer: ${dynamicKitNames}`;
    const previewText = formData.emailPreviewText || `Exclusive wholesale allocation from ${activeWarehouseName}.`;
    const blocksPayload = {
      emailSubject: subject,
      emailPreviewText: previewText,
      ctaText: formData.ctaText || 'Get SolarKits Pricing Today →',
      destinationUrl: formData.destinationUrl || 'https://solarkits.in/solar-kits',
      hasCoupon: formData.hasCoupon,
      couponCode: formData.couponCode,
      selectedProductIds,
      ctaButtons,
      customCreative: {
        ...creative,
        sectionsOrder: activeSectionsOrder
      }
    };

    try {
      await marketingHttp.post('/templates', {
        name,
        channel: 'email',
        type: 'marketing',
        tags: [saveTemplateCategory],
        subject,
        preview_text: previewText,
        html_content: generateResponsiveEmailHtml({
          ...formData,
          ...blocksPayload
        }),
        blocks_json: blocksPayload
      });
      await loadDbEmailTemplates();
      setSaveSuccessMsg(`Creative "${name}" saved to MongoDB Template Library!`);
      setTimeout(() => {
        setSaveSuccessMsg('');
        setShowSaveModal(false);
        setSaveTemplateName('');
      }, 1200);
    } catch (err) {
      setSaveSuccessMsg(`Failed to save template: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteSavedTemplate = async (id, e) => {
    e?.stopPropagation();
    try {
      await marketingHttp.delete(`/templates/${id}`);
      setSavedCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete saved template', err);
    }
  };

  const handleApplySavedTemplate = (tmpl) => {
    setFormData(prev => ({
      ...prev,
      emailSubject: tmpl.emailSubject || prev.emailSubject,
      emailPreviewText: tmpl.emailPreviewText || prev.emailPreviewText,
      ctaText: tmpl.ctaText || prev.ctaText,
      destinationUrl: tmpl.destinationUrl || prev.destinationUrl,
      hasCoupon: tmpl.hasCoupon !== undefined ? tmpl.hasCoupon : prev.hasCoupon,
      couponCode: tmpl.couponCode || prev.couponCode,
      customCreative: {
        ...DEFAULT_EXECUTIVE_CREATIVE,
        ...(tmpl.customCreative || {})
      }
    }));
    if (tmpl.selectedProductIds?.length > 0) {
      setSelectedProductIds(tmpl.selectedProductIds);
    }
    if (tmpl.ctaButtons?.length > 0) {
      setCtaButtons(tmpl.ctaButtons);
    }
    setActiveTab('custom');
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

  // Dynamic preview section renderer respecting activeSectionsOrder
  const renderPreviewSection = (sectionId) => {
    switch (sectionId) {
      case 'banner':
        return creative.mediaType === 'image' && creative.heroImageUrl ? (
          <img
            key="banner"
            src={creative.heroImageUrl}
            alt="Banner"
            className="w-full h-auto max-h-48 object-cover block"
          />
        ) : creative.mediaType === 'video' ? (
          <div key="banner" className="relative w-full h-36 bg-slate-900 flex items-center justify-center text-white">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-white ml-0.5 fill-white" />
            </div>
            <span className="absolute bottom-2 left-3 text-[10px] font-bold bg-black/70 px-2 py-0.5 rounded-md">
              45s Explainer Video
            </span>
          </div>
        ) : (
          <div
            key="banner"
            className="p-5 text-center text-white"
            style={{
              background: `linear-gradient(135deg, #1e2d66 0%, ${creative.themeColor || '#263880'} 60%, #3a56c9 100%)`
            }}
          >
            <div className="inline-block bg-white px-3 py-1 rounded-full mb-2.5 shadow-xs border-l-4" style={{ borderColor: creative.accentColor || '#f59e0b' }}>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: creative.themeColor || '#263880' }}>
                ⚡ SolarKits Hybrid & On-Grid Combos
              </span>
            </div>
            <h3 className="text-lg font-black leading-tight tracking-tight text-white mb-1.5">
              {creative.headline || "DON'T JUST SELL SOLAR. SELL COMPLETE BACKUP."}
            </h3>
            <p className="text-[11px] text-slate-200 line-clamp-2 max-w-xs mx-auto mb-3">
              {creative.subheading || 'Tier-1 ALMM Modules + High-Efficiency Inverters + Pre-Engineered Structure in One Single Dispatch.'}
            </p>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {(creative.valuePills || ['1. Add Backup to Quotes', '2. Higher Ticket Size', '3. Depot Support']).map((pill, i) => (
                <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/15 border border-white/20 text-white">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        );

      case 'pitch':
        return (
          <div key="pitch" className="p-4 space-y-2 text-center">
            <span className="text-[10px] font-extrabold tracking-widest uppercase block mb-1" style={{ color: creative.stripColor || '#ea580c' }}>
              {creative.categoryTag || 'B2B WHOLESALE KITS BY SOLARKITS'}
            </span>
            <h4 className="text-base font-black leading-snug" style={{ color: creative.themeColor || '#263880' }}>
              {creative.h1Title || 'Solar EPCs, this one is for you.'}
            </h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed text-center">
              {getSubstitutedText(creative.customBodyText)}
            </p>
          </div>
        );

      case 'primary_cta':
        return (
          <div key="primary_cta" className="p-3 text-center">
            <a
              href={formData.destinationUrl || '#'}
              onClick={(e) => e.preventDefault()}
              className="inline-block py-2.5 px-6 rounded-lg font-extrabold text-xs text-white shadow-md transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: creative.themeColor || '#263880' }}
            >
              {formData.ctaText || 'Get SolarKits Pricing Today →'}
            </a>
          </div>
        );

      case 'products':
        if (previewProducts.length === 0) return null;
        return (
          <div key="products" className="p-4 space-y-2 text-left pt-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              <span>Featured Solar Kits ({previewProducts.length})</span>
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
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
        );

      case 'coupon':
        if (!formData.hasCoupon) return null;
        return (
          <div key="coupon" className="p-4 pt-1">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-left">
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
          </div>
        );

      case 'benefit_cards':
        return (
          <div key="benefit_cards" className="p-4 space-y-2.5 text-left pt-2">
            {(creative.bulletPoints || []).map((pt, i) => {
              const str = String(pt);
              const hasColon = str.includes(':');
              const title = hasColon ? str.split(':')[0].trim() : `Feature Point ${i + 1}`;
              const desc = hasColon ? str.split(':').slice(1).join(':').trim() : str;
              const borderCol = i % 2 === 0 ? (creative.themeColor || '#263880') : (creative.accentColor || '#f59e0b');

              return (
                <div
                  key={i}
                  className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                  style={{ borderLeft: `4px solid ${borderCol}` }}
                >
                  <div className="text-xs font-extrabold" style={{ color: creative.themeColor || '#263880' }}>
                    {title}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                    {desc}
                  </p>
                </div>
              );
            })}
          </div>
        );

      case 'closing_pitch':
        return (
          <div key="closing_pitch" className="p-4 pt-2 text-center space-y-2">
            <p className="text-xs font-extrabold" style={{ color: creative.themeColor || '#263880' }}>
              {creative.closingPitch || 'Sell complete solar power, not just panels. Choose SolarKits.'}
            </p>
            <a
              href={formData.destinationUrl || '#'}
              onClick={(e) => e.preventDefault()}
              className="inline-block py-2 px-5 rounded-lg font-bold text-xs text-white shadow-xs"
              style={{ backgroundColor: creative.stripColor || '#ea580c' }}
            >
              {creative.secondaryCtaText || 'Explore Wholesale Solar Kits →'}
            </a>
          </div>
        );

      case 'custom_ctas':
        if (ctaButtons.length <= 1) return null;
        return (
          <div key="custom_ctas" className="p-4 pt-1 space-y-1.5">
            {ctaButtons.slice(1).map((btn) => (
              <a
                key={btn.id}
                href={btn.url || '#'}
                onClick={(e) => e.preventDefault()}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-1.5"
              >
                <span>{btn.text}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
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
            {savedCustomTemplates.length > 0 && (
              <span className="bg-amber-400 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1">
                {savedCustomTemplates.length} Custom
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setSaveTemplateName(creative.headline || 'Custom Executive Creative');
              setShowSaveModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save Creative as Template</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                emailSubject: 'Solar EPCs, this one is for you - SolarKits B2B Wholesale Pricing',
                emailPreviewText: "Quote solar plus battery backup in one system. Don't just sell solar, sell complete backup.",
                ctaText: 'Get SolarKits Pricing Today →',
                destinationUrl: 'https://solarkits.in/solar-kits',
                customCreative: {
                  ...DEFAULT_EXECUTIVE_CREATIVE
                }
              }));
              setActiveTab('custom');
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-600 to-amber-600 text-white text-xs font-extrabold shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Load Boss / Qbits Style Preset</span>
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

      {/* ── 5 PURPOSE-BASED TEMPLATE PRESETS (1-CLICK LOAD) ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 rounded-2xl text-white shadow-md border border-blue-700/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">
              Purpose-Based Email Templates (1-Click Switch)
            </span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">5 Commercial Presets</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {PURPOSE_BASED_PRESETS.map((pst) => (
            <button
              key={pst.id}
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  emailSubject: pst.h1Title ? `${pst.h1Title} - SolarKits B2B Pricing` : prev.emailSubject,
                  emailPreviewText: pst.subheading || prev.emailPreviewText,
                  ctaText: pst.primaryCtaText || prev.ctaText,
                  customCreative: {
                    ...DEFAULT_EXECUTIVE_CREATIVE,
                    headline: pst.headline,
                    subheading: pst.subheading,
                    categoryTag: pst.categoryTag,
                    h1Title: pst.h1Title,
                    customBodyText: pst.customBodyText,
                    primaryCtaText: pst.primaryCtaText,
                    valuePills: pst.valuePills || DEFAULT_EXECUTIVE_CREATIVE.valuePills,
                    bulletPoints: pst.bulletPoints || DEFAULT_EXECUTIVE_CREATIVE.bulletPoints,
                    closingPitch: pst.closingPitch || DEFAULT_EXECUTIVE_CREATIVE.closingPitch,
                    secondaryCtaText: pst.secondaryCtaText || DEFAULT_EXECUTIVE_CREATIVE.secondaryCtaText
                  }
                }));
                setActiveTab('custom');
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition-all hover:scale-[1.02] cursor-pointer group"
            >
              <div className="text-[11px] font-extrabold text-white truncate group-hover:text-amber-300">
                {pst.label}
              </div>
              <p className="text-[9px] text-slate-300 line-clamp-2 mt-1 leading-snug">
                {pst.headline}
              </p>
            </button>
          ))}
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
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              
              {/* User Saved Custom Templates Section */}
              {savedCustomTemplates.length > 0 && (
                <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-emerald-600" />
                      <span>My Saved Custom Templates</span>
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {savedCustomTemplates.length} Custom Templates
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {savedCustomTemplates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        onClick={() => handleApplySavedTemplate(tmpl)}
                        className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 transition-all cursor-pointer space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                              {tmpl.name}
                            </span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                              {tmpl.category || 'Custom'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono">{tmpl.createdAt}</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSavedTemplate(tmpl.id, e)}
                              className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                              title="Delete Saved Template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{tmpl.emailSubject}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{tmpl.emailPreviewText}</p>
                        <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-600 font-bold">
                          <span>Click to load into editor →</span>
                          {tmpl.customCreative?.sectionsOrder && (
                            <span className="text-slate-400 font-normal">
                              Custom layout ({tmpl.customCreative.sectionsOrder.length} sections)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {savedCustomTemplates.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                  <p className="text-xs font-semibold text-slate-500">No saved email templates in MongoDB yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('custom')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Design & Save New Template
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            /* Custom Email Designer */
            <div className="space-y-4">

              {/* ── CARD 1: 📌 1. HEADER (FIXED - TOP) ── */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-blue-500/40 dark:border-blue-700/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">1</span>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600" /> Header Section (Fixed at Top)
                      </h4>
                      <p className="text-[10px] text-slate-500">Official logo, brand subtitle, helpline strip & theme colors.</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase tracking-wider">
                    🔒 Pinned at Top
                  </span>
                </div>

                {/* Header Logo Upload/URL */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Header Brand Logo *
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCreative({
                        logoUrl: 'https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png'
                      })}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                    >
                      Reset Official Logo
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-28 h-12 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                      {creative.logoUrl ? (
                        <img
                          src={creative.logoUrl}
                          alt="SolarKits Logo"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png';
                          }}
                        />
                      ) : (
                        <span className="text-[9px] text-slate-400 font-bold">No Logo</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={creative.logoUrl || ''}
                          onChange={(e) => updateCreative({ logoUrl: e.target.value })}
                          placeholder="https://res.cloudinary.com/.../solarkits_official_logo.png"
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-mono bg-white dark:bg-slate-900 font-medium"
                        />
                        <label className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 shrink-0">
                          <Upload className="w-3 h-3" />
                          <span>{uploadingAssetField === 'logoUrl' ? 'Uploading...' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingAssetField === 'logoUrl'}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadEmailAsset(file, 'logoUrl');
                            }}
                          />
                        </label>
                      </div>
                      {assetUploadError && <p className="text-[10px] text-rose-500 font-semibold">{assetUploadError}</p>}
                      <p className="text-[10px] text-slate-400">
                        Upload to Cloudinary or paste your custom logo URL anytime.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logo Tagline, Helpline & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                      Header Brand Tagline
                    </label>
                    <input
                      type="text"
                      value={creative.headerTagline || 'B2B SOLAR KITS STORE'}
                      onChange={(e) => updateCreative({ headerTagline: e.target.value })}
                      placeholder="B2B SOLAR KITS STORE"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                      Contact Helpline Phone
                    </label>
                    <input
                      type="text"
                      value={creative.contactPhone || '+91 99134 21453'}
                      onChange={(e) => updateCreative({ contactPhone: e.target.value })}
                      placeholder="+91..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                      Website URL
                    </label>
                    <input
                      type="text"
                      value={creative.contactWebsite || 'solarkits.in'}
                      onChange={(e) => updateCreative({ contactWebsite: e.target.value })}
                      placeholder="solarkits.in"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Brand Colors */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Executive Brand Styling Colors</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5" title="Primary Theme (Deep Blue)">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Blue:</span>
                      <input
                        type="color"
                        value={creative.themeColor || '#263880'}
                        onChange={(e) => updateCreative({ themeColor: e.target.value })}
                        className="w-6 h-6 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5" title="Sunburst Accent (Amber)">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Amber:</span>
                      <input
                        type="color"
                        value={creative.accentColor || '#f59e0b'}
                        onChange={(e) => updateCreative({ accentColor: e.target.value })}
                        className="w-6 h-6 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5" title="Contact Strip (Orange)">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Strip:</span>
                      <input
                        type="color"
                        value={creative.stripColor || '#ea580c'}
                        onChange={(e) => updateCreative({ stripColor: e.target.value })}
                        className="w-6 h-6 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CARD 2: ✉️ 2. EMAIL INBOX ENVELOPE ── */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">2</span>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                      Email Inbox Envelope
                    </h4>
                    <p className="text-[10px] text-slate-500">Subject line and inbox preview snippet visible before opening email.</p>
                  </div>
                </div>

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

              {/* ── CARD 3: 🎨 3. EMAIL BODY CONTENT & ELEMENTS (CUSTOMIZABLE / POSITIONABLE) ── */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-black flex items-center justify-center">3</span>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                        Email Body Content & Elements
                      </h4>
                      <p className="text-[10px] text-slate-500">Hero banner, headline, pitch, value cards, CTAs, and solar kits catalog.</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Flexible / Positionable
                  </span>
                </div>

                {/* ── DYNAMIC SECTION LAYOUT & POSITION CONTROLLER ── */}
                <div className="bg-gradient-to-b from-slate-50 to-blue-50/30 dark:from-slate-900/80 dark:to-blue-950/20 p-4 rounded-2xl border-2 border-blue-200/90 dark:border-blue-900/70 shadow-sm space-y-3.5">
                  {/* Header with Title, Count, Preset layouts, and View Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-blue-100 dark:border-blue-900/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                              Email Middle Body Section Sequencer
                            </h5>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                              {activeSectionsOrder.length} Sections
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Apne anusaar order set karein — Drag karke sarkaayein, dropdown se exact position chunein, ya arrows dabayein.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* View mode toggle & reset */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setOrderViewMode('flow')}
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            orderViewMode === 'flow'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                          }`}
                          title="Vertical Flow List (Matches Email Structure)"
                        >
                          <LayoutList className="w-3 h-3" /> Flow List
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderViewMode('compact')}
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            orderViewMode === 'compact'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                          }`}
                          title="Compact Cards View"
                        >
                          <LayoutGrid className="w-3 h-3" /> Compact Cards
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetSectionOrder}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Reset order to default standard B2B layout"
                      >
                        <RefreshCw className="w-3 h-3" /> Reset Default
                      </button>
                    </div>
                  </div>

                  {/* Quick 1-Click Layout Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" /> Quick Presets:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyLayoutPreset('standard')}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                      title="Standard B2B: Banner → Pitch → CTA → Products → Coupon → Benefits"
                    >
                      ⚡ Standard B2B
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyLayoutPreset('offer_first')}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                      title="Discount First: Banner → Coupon Voucher → Products → Pitch"
                    >
                      🏷️ Offer / Coupon First
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyLayoutPreset('catalog_first')}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                      title="Catalog First: Banner → Solar Kits Catalog → Pitch → CTA"
                    >
                      📦 Kits Catalog First
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyLayoutPreset('urgency_first')}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                      title="Urgency First: Pitch Headline → Banner → Coupon → CTA"
                    >
                      🔥 Pitch & Urgency First
                    </button>
                  </div>

                  {/* Bilingual Helper Tip Banner */}
                  <div className="bg-blue-50/80 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-2.5">
                    <div className="p-1 rounded-md bg-blue-600 text-white shrink-0 mt-0.5">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                      <span className="font-bold text-blue-900 dark:text-blue-300">Section order badalne ke 3 aasaan tareeqe: </span>
                      <span className="inline-block mx-1"><b>① Drag & Drop:</b> ⠿ Handle pakad kar sarkaayein</span>
                      <span className="inline-block mx-1"><b>② Position Dropdown:</b> Direct man-chaahi position (jaise #1, #3) chunein</span>
                      <span className="inline-block mx-1"><b>③ Arrows:</b> ⬆️ / ⬇️ button dabayein.</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold ml-1">Right side preview me turant live dekhein!</span>
                    </div>
                  </div>

                  {/* ── FLOW LIST VIEW (Recommended Vertical Layout) ── */}
                  {orderViewMode === 'flow' ? (
                    <div className="space-y-2 pt-1">
                      {/* Pinned Top Header Visual Anchor */}
                      <div className="px-3 py-2 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700 flex items-center justify-between text-slate-600 dark:text-slate-400 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-slate-300 dark:bg-slate-700 flex items-center justify-center">
                            <Lock className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                          </div>
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                              📌 Pinned Header (Always at Top of Email)
                            </span>
                            <span className="text-[10px] text-slate-500">
                              SolarKits Official Logo • Helpline Hotline • Official Website
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Permanent Top
                        </span>
                      </div>

                      {/* Middle Reorderable Sections */}
                      <div className="space-y-1.5">
                        {activeSectionsOrder.map((secId, idx) => {
                          const meta = SECTION_METADATA_MAP[secId] || {
                            label: secId,
                            shortLabel: secId,
                            desc: 'Custom section content',
                            icon: LayoutGrid,
                            color: 'text-blue-600',
                            bgColor: 'bg-blue-100',
                            borderColor: 'border-blue-200'
                          };
                          const Icon = meta.icon;
                          const isDragging = draggedSectionId === secId;
                          const isDragOver = dragOverSectionId === secId;
                          const isHovered = hoveredSectionId === secId;

                          return (
                            <div
                              key={secId}
                              draggable
                              onDragStart={(e) => handleDragStart(e, secId)}
                              onDragOver={(e) => handleDragOver(e, secId)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, secId)}
                              onDragEnd={handleDragEnd}
                              onMouseEnter={() => setHoveredSectionId(secId)}
                              onMouseLeave={() => setHoveredSectionId(null)}
                              className={`p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 bg-white dark:bg-slate-800 shadow-2xs ${
                                isDragging
                                  ? 'opacity-40 border-dashed border-blue-500 scale-[0.98]'
                                  : isDragOver
                                  ? 'border-2 border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 shadow-md ring-2 ring-blue-400/40'
                                  : isHovered
                                  ? 'border-blue-300 dark:border-blue-600 shadow-xs ring-1 ring-blue-300/30'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {/* Left: Drag Grip Handle & Position Badge & Icon & Title */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                {/* Drag Handle */}
                                <div
                                  className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 shrink-0 touch-none"
                                  title="Click & drag to reposition anywhere"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>

                                {/* Position Number Pill */}
                                <div className="flex flex-col items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                                  <span className="text-[11px] font-black font-mono text-blue-700 dark:text-blue-300 leading-none">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-[8px] font-bold text-blue-500 leading-none mt-0.5">
                                    {idx === 0 ? 'TOP' : idx === activeSectionsOrder.length - 1 ? 'END' : 'MID'}
                                  </span>
                                </div>

                                {/* Icon Box */}
                                <div className={`w-8 h-8 rounded-lg ${meta.bgColor} ${meta.color} flex items-center justify-center shrink-0 border ${meta.borderColor}`}>
                                  <Icon className="w-4 h-4" />
                                </div>

                                {/* Title & Description */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                      {meta.label}
                                    </span>
                                    {idx === 0 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        Top of Body
                                      </span>
                                    )}
                                    {idx === activeSectionsOrder.length - 1 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        Bottom of Body
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                                    {meta.desc}
                                  </p>
                                </div>
                              </div>

                              {/* Right: Position Selector Dropdown & Up/Down Arrows & Jump to Edit */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Direct Position Selector Dropdown */}
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                                    Pos:
                                  </span>
                                  <select
                                    value={idx}
                                    onChange={(e) => handleMoveToPosition(secId, Number(e.target.value))}
                                    className="text-[11px] font-black text-slate-800 dark:text-slate-200 bg-transparent border-none cursor-pointer focus:outline-none"
                                    title="Directly select desired position (#1 to #8)"
                                  >
                                    {activeSectionsOrder.map((_, pIdx) => (
                                      <option key={pIdx} value={pIdx} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold">
                                        #{pIdx + 1} {pIdx === 0 ? '(Top)' : pIdx === activeSectionsOrder.length - 1 ? '(Bottom)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Move 1 step Up / Down Buttons */}
                                <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveSection(secId, 'up')}
                                    className="p-1 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    title="Move 1 step Up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === activeSectionsOrder.length - 1}
                                    onClick={() => handleMoveSection(secId, 'down')}
                                    className="p-1 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    title="Move 1 step Down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Jump to extreme top/bottom */}
                                <div className="hidden sm:flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveToExtreme(secId, 'top')}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="Move directly to very Top"
                                  >
                                    <ChevronsUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === activeSectionsOrder.length - 1}
                                    onClick={() => handleMoveToExtreme(secId, 'bottom')}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="Move directly to very Bottom"
                                  >
                                    <ChevronsDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Jump to edit form */}
                                {meta.editorAnchor && (
                                  <button
                                    type="button"
                                    onClick={() => scrollToEditorSection(meta.editorAnchor)}
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-500 hover:text-blue-600 cursor-pointer transition-colors"
                                    title="Jump to edit this section below"
                                  >
                                    <CornerDownRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pinned Bottom Footer Visual Anchor */}
                      <div className="px-3 py-2 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700 flex items-center justify-between text-slate-600 dark:text-slate-400 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-slate-300 dark:bg-slate-700 flex items-center justify-center">
                            <Lock className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                          </div>
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                              📌 Pinned Footer (Always at Bottom of Email)
                            </span>
                            <span className="text-[10px] text-slate-500">
                              SolarKits Corporate Address • Depot Logistics • 1-Click Unsubscribe
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Permanent Bottom
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* ── COMPACT GRID VIEW (Card View) ── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      {activeSectionsOrder.map((secId, idx) => {
                        const meta = SECTION_METADATA_MAP[secId] || {
                          label: secId,
                          shortLabel: secId,
                          desc: '',
                          icon: LayoutGrid,
                          color: 'text-blue-600',
                          bgColor: 'bg-blue-100',
                          borderColor: 'border-blue-200'
                        };
                        const Icon = meta.icon;
                        const isDragging = draggedSectionId === secId;
                        const isDragOver = dragOverSectionId === secId;

                        return (
                          <div
                            key={secId}
                            draggable
                            onDragStart={(e) => handleDragStart(e, secId)}
                            onDragOver={(e) => handleDragOver(e, secId)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, secId)}
                            onDragEnd={handleDragEnd}
                            onMouseEnter={() => setHoveredSectionId(secId)}
                            onMouseLeave={() => setHoveredSectionId(null)}
                            className={`p-2.5 rounded-xl border bg-white dark:bg-slate-800 shadow-2xs space-y-2 transition-all ${
                              isDragging
                                ? 'opacity-40 border-dashed border-blue-500'
                                : isDragOver
                                ? 'border-2 border-blue-500 bg-blue-50/70 dark:bg-blue-950/50'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-600">
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                  #{idx + 1}
                                </span>
                                <div className={`w-5 h-5 rounded ${meta.bgColor} ${meta.color} flex items-center justify-center shrink-0`}>
                                  <Icon className="w-3 h-3" />
                                </div>
                              </div>
                              {/* Position selector */}
                              <select
                                value={idx}
                                onChange={(e) => handleMoveToPosition(secId, Number(e.target.value))}
                                className="text-[10px] font-bold py-0.5 px-1 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 cursor-pointer"
                                title="Change position"
                              >
                                {activeSectionsOrder.map((_, pIdx) => (
                                  <option key={pIdx} value={pIdx}>
                                    #{pIdx + 1}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate block" title={meta.label}>
                                {meta.shortLabel || meta.label}
                              </span>
                              <p className="text-[9px] text-slate-400 truncate">{meta.desc}</p>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                              <span className="text-[9px] text-slate-400 font-semibold">
                                {idx === 0 ? 'Top' : idx === activeSectionsOrder.length - 1 ? 'Bottom' : `Pos ${idx + 1}`}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveSection(secId, 'up')}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-600 dark:text-slate-300 disabled:opacity-20 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === activeSectionsOrder.length - 1}
                                  onClick={() => handleMoveSection(secId, 'down')}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-600 dark:text-slate-300 disabled:opacity-20 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Media Type Switcher: Gradient Banner vs Image vs Video */}
                <div id="editor-section-banner" className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateCreative({ mediaType: 'banner' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      creative.mediaType === 'banner' || !creative.mediaType
                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Executive Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCreative({ mediaType: 'image' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      creative.mediaType === 'image'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Photo / Image
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCreative({ mediaType: 'video' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      creative.mediaType === 'video'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-red-500" /> Video
                  </button>
                </div>

                {creative.mediaType === 'image' && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                      Hero Banner Image URL:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={creative.heroImageUrl || ''}
                        onChange={(e) => updateCreative({ heroImageUrl: e.target.value })}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                      <label className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingAssetField === 'heroImageUrl' ? 'Uploading...' : 'Upload Banner'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingAssetField === 'heroImageUrl'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadEmailAsset(file, 'heroImageUrl');
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
                {creative.mediaType === 'video' && (
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

                {/* Banner Headline & Subheading */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Banner Headline *
                    </label>
                    <input
                      type="text"
                      value={creative.headline || "DON'T JUST SELL SOLAR. SELL COMPLETE BACKUP."}
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
                      value={creative.subheading || 'Tier-1 ALMM Modules + High-Efficiency Inverters + Pre-Engineered Structure in One Single Dispatch.'}
                      onChange={(e) => updateCreative({ subheading: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>
                </div>

                {/* Category Eyebrow & Main H1 Title */}
                <div id="editor-section-pitch" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Category Tag (Eyebrow)
                    </label>
                    <input
                      type="text"
                      value={creative.categoryTag || 'B2B WHOLESALE KITS BY SOLARKITS'}
                      onChange={(e) => updateCreative({ categoryTag: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                      Main H1 Pitch Title *
                    </label>
                    <input
                      type="text"
                      value={creative.h1Title || 'Solar EPCs, this one is for you.'}
                      onChange={(e) => updateCreative({ h1Title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                    Email Body Typography / Pitch Description
                  </label>
                  <textarea
                    rows={4}
                    value={creative.customBodyText || ''}
                    onChange={(e) => updateCreative({ customBodyText: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs leading-relaxed"
                  />
                </div>

                {/* Feature Bullet Highlights (4 Card Boxes) */}
                <div id="editor-section-benefits" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                      Feature Benefit Cards (Executive Boxes)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pts = creative.bulletPoints || [];
                        updateCreative({ bulletPoints: [...pts, 'New Feature Point: Add detail and specification here'] });
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      + Add Card Point
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(creative.bulletPoints || []).map((bp, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: idx % 2 === 0 ? (creative.themeColor || '#263880') : (creative.accentColor || '#f59e0b') }} />
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
                <div id="editor-section-ctas" className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                              Button #{idx + 1}
                            </span>
                            {idx === 0 && (
                              <span className="text-[9px] text-slate-400 font-bold">(Primary CTA)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveCta(idx, 'up')}
                              className="p-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-600 dark:text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Button Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === ctaButtons.length - 1}
                              onClick={() => handleMoveCta(idx, 'down')}
                              className="p-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-600 dark:text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                              title="Move Button Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            {ctaButtons.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCta(btn.id)}
                                className="p-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 text-xs cursor-pointer ml-1"
                                title="Delete Button"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
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
                <div id="editor-section-products" className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
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

                {/* Coupon Voucher Box Editor */}
                <div id="editor-section-coupon" className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-600" /> Promo Coupon Voucher Section
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.hasCoupon)}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasCoupon: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Include Coupon Box in Email
                      </span>
                    </label>
                  </div>
                  {formData.hasCoupon ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs">
                      <div>
                        <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">Coupon Code:</span>
                        <input
                          type="text"
                          value={formData.couponCode || 'SOLARDIWALI5000'}
                          onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value }))}
                          className="w-full mt-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-amber-300 bg-white dark:bg-slate-800 text-amber-950 dark:text-amber-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">Discount Value:</span>
                        <div className="mt-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200 border border-amber-200">
                          {dynamicDiscountStr}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">
                      Coupon voucher is currently hidden. Check the box above to enable it.
                    </p>
                  )}
                </div>

                {/* Closing Pitch & Secondary CTA Editor */}
                <div id="editor-section-closing" className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-rose-600" /> Closing Conversion Pitch & Secondary Action CTA
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Bottom Conversion Punchline:
                      </label>
                      <input
                        type="text"
                        value={creative.closingPitch || 'Sell complete solar power, not just panels. Choose SolarKits.'}
                        onChange={(e) => updateCreative({ closingPitch: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
                        placeholder="Compelling conversion pitch..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Secondary CTA Button Text:
                      </label>
                      <input
                        type="text"
                        value={creative.secondaryCtaText || 'Explore Wholesale Solar Kits →'}
                        onChange={(e) => updateCreative({ secondaryCtaText: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
                        placeholder="Secondary button label..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CARD 4: 📌 4. EMAIL FOOTER (FIXED - BOTTOM) ── */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-blue-500/40 dark:border-blue-700/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">4</span>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <AlignLeft className="w-4 h-4 text-blue-600" /> Footer Section (Fixed at Bottom)
                      </h4>
                      <p className="text-[10px] text-slate-500">Official company address, depot logistics, and 1-click unsubscribe button.</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase tracking-wider">
                    🔒 Pinned at Bottom
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                      Footer Brand Title
                    </label>
                    <input
                      type="text"
                      value={creative.footerTitle || 'SOLARKITS INDIA'}
                      onChange={(e) => updateCreative({ footerTitle: e.target.value })}
                      placeholder="SOLARKITS INDIA"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                      Network Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={creative.footerTagline || "Powering India's Leading Solar EPC Network"}
                      onChange={(e) => updateCreative({ footerTagline: e.target.value })}
                      placeholder="Powering India's Leading Solar EPC Network"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                    Registered Logistics Depot & Copyright Text
                  </label>
                  <input
                    type="text"
                    value={creative.footerAddress || '© 2026 SolarKits (India) Pvt. Ltd. • All Rights Reserved. Central Depot: Bhiwandi Logistics Hub, Maharashtra, India.'}
                    onChange={(e) => updateCreative({ footerAddress: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 mb-1 uppercase flex items-center gap-1">
                      <span>🔕 Unsubscribe Button Label</span>
                    </label>
                    <input
                      type="text"
                      value={creative.unsubscribeBtnText || '🔕 Unsubscribe from this list'}
                      onChange={(e) => updateCreative({ unsubscribeBtnText: e.target.value })}
                      placeholder="🔕 Unsubscribe from this list"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-xs font-bold bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-300 mb-1 uppercase">
                      Unsubscribe Action Status
                    </label>
                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200">
                      ✓ Auto-records to DB & Excludes from Future Sends
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                    Footer Disclaimer / Terms Note
                  </label>
                  <input
                    type="text"
                    value={creative.footerDisclaimer || '*Exclusive wholesale rates applicable for verified GST-registered EPC contractors only.'}
                    onChange={(e) => updateCreative({ footerDisclaimer: e.target.value })}
                    placeholder="*Exclusive wholesale rates applicable for verified GST-registered EPC contractors only."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
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

                {/* Email Canvas with PINNED Top Header and PINNED Bottom Footer */}
                <div className="bg-white text-slate-800 flex flex-col rounded-xl overflow-hidden shadow-xs border border-slate-200">
                  
                  {/* 1. PINNED FIXED HEADER (Permanently at Top) */}
                  <div className="bg-white border-b border-slate-200 shrink-0 text-center z-10 shadow-2xs">
                    <div className="bg-blue-900 text-white text-[8px] font-black uppercase tracking-widest py-0.5 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-amber-300" />
                      <span>Pinned Header • Fixed at Top</span>
                    </div>
                    <div className="py-2.5 px-4 bg-white">
                      {creative.logoUrl ? (
                        <img
                          src={creative.logoUrl}
                          alt="SolarKits Official Logo"
                          className="h-9 mx-auto object-contain block"
                          style={{ maxHeight: '38px' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://res.cloudinary.com/dggmbagax/image/upload/v1795252066/solarkits/branding/solarkits_official_logo.png';
                          }}
                        />
                      ) : (
                        <div>
                          <div className="text-lg font-black tracking-widest leading-none" style={{ color: creative.themeColor || '#263880' }}>
                            SOLAR<span style={{ color: creative.accentColor || '#f59e0b' }}>KITS</span>
                            <span className="text-[10px] align-super text-slate-400 font-bold ml-0.5">™</span>
                          </div>
                        </div>
                      )}
                      <div className="text-[8px] font-extrabold tracking-widest uppercase mt-0.5" style={{ color: creative.stripColor || '#ea580c' }}>
                        {creative.headerTagline || 'B2B SOLAR KITS STORE'}
                      </div>
                    </div>

                    {/* Orange Contact Helpline Strip Bar */}
                    <div className="py-1 px-3 text-center text-white font-extrabold text-[10px] tracking-wide" style={{ backgroundColor: creative.stripColor || '#ea580c' }}>
                      📞 {creative.contactPhone || '+91 99134 21453'} &nbsp;|&nbsp; 🌐 {creative.contactWebsite || 'solarkits.in'}
                    </div>
                  </div>

                  {/* 2. SCROLLABLE MIDDLE EMAIL CONTENT (ORDER CONTROLLED BY activeSectionsOrder) */}
                  <div className="bg-white text-slate-800 max-h-[420px] overflow-y-auto divide-y divide-slate-100">
                    {activeSectionsOrder.map((secId, sIdx) => {
                      const meta = SECTION_METADATA_MAP[secId] || { label: secId, shortLabel: secId };
                      const isHovered = hoveredSectionId === secId;
                      return (
                        <div
                          key={secId}
                          id={`preview-section-${secId}`}
                          onMouseEnter={() => setHoveredSectionId(secId)}
                          onMouseLeave={() => setHoveredSectionId(null)}
                          className={`relative transition-all duration-150 group ${
                            isHovered
                              ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/10'
                              : ''
                          }`}
                        >
                          {/* Live Section Marker Badge & Reorder Arrows in Preview */}
                          <div
                            className={`absolute top-1.5 right-1.5 z-30 flex items-center gap-1 transition-opacity duration-150 ${
                              isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-900/90 text-white shadow-sm flex items-center gap-1">
                              <span>#{sIdx + 1}</span>
                              <span className="font-medium opacity-90">{meta.shortLabel || meta.label}</span>
                            </span>
                            <div className="flex items-center bg-white/95 dark:bg-slate-900/95 rounded shadow-sm border border-slate-200 dark:border-slate-700 p-0.5">
                              <button
                                type="button"
                                disabled={sIdx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveSection(secId, 'up');
                                }}
                                className="p-0.5 text-slate-600 hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                                title="Move this section Up in email"
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                disabled={sIdx === activeSectionsOrder.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveSection(secId, 'down');
                                }}
                                className="p-0.5 text-slate-600 hover:text-blue-600 disabled:opacity-20 cursor-pointer"
                                title="Move this section Down in email"
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>

                          {renderPreviewSection(secId)}
                        </div>
                      );
                    })}
                  </div>

                  {/* 3. PINNED FIXED FOOTER (Permanently at Bottom) */}
                  <div
                    className="shrink-0 p-3.5 text-center text-white z-10 shadow-lg border-t-2"
                    style={{
                      backgroundColor: '#1a2552',
                      borderTopColor: creative.accentColor || '#f59e0b'
                    }}
                  >
                    <div className="bg-blue-950/80 text-amber-300 text-[8px] font-black uppercase tracking-widest py-0.5 rounded mb-1 flex items-center justify-center gap-1">
                      <AlignLeft className="w-2.5 h-2.5" />
                      <span>Pinned Footer • Fixed at Bottom</span>
                    </div>
                    <div className="text-xs font-black tracking-wider text-white">
                      {creative.footerTitle || 'SOLARKITS INDIA'}
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                      {creative.footerTagline || "Powering India's Leading Solar EPC Network"}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1 leading-snug">
                      {creative.footerAddress || '© 2026 SolarKits (India) Pvt. Ltd. • Central Depot: Bhiwandi Logistics Hub, Maharashtra.'}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1 italic">
                      {creative.footerDisclaimer || '*Terms and conditions apply.'}
                    </p>
                    <div className="pt-2">
                      <span className="inline-block px-3 py-1 rounded text-[10px] font-bold border border-amber-400/50 text-amber-300 bg-white/5 shadow-2xs">
                        {creative.unsubscribeBtnText || '🔕 Unsubscribe from this list'}
                      </span>
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

      {/* SAVE CREATIVE AS TEMPLATE MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bookmark className="text-emerald-600 w-5 h-5" /> Save Creative as Template
                </h3>
                <p className="text-xs text-slate-500">Save this email design into your template library to reuse anytime.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {saveSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSaveCreativeAsTemplate} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={saveTemplateName}
                    onChange={(e) => setSaveTemplateName(e.target.value)}
                    placeholder="e.g. Diwali 5kW Commercial Combo Offer"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase">
                    Template Category
                  </label>
                  <select
                    value={saveTemplateCategory}
                    onChange={(e) => setSaveTemplateCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-900"
                  >
                    <option value="Promotional">Promotional Offer</option>
                    <option value="Wholesale">B2B Wholesale / Discount</option>
                    <option value="Product Launch">New Product Launch</option>
                    <option value="Reward Program">EPC Reward Program</option>
                    <option value="Reactivation">Reactivation / Welcome</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700 dark:text-slate-300">Preset Attributes:</div>
                  <div>• Layout Order: {activeSectionsOrder.length} sections customized</div>
                  <div>• CTA Buttons: {ctaButtons.length} action buttons configured</div>
                  <div>• Kit Catalog: {previewProducts.length} solar products attached</div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Save to Template Library
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
