import React, { useState, useMemo, useEffect } from 'react';
import {
  Type, Heading1, Image as ImageIcon, Video, ShoppingBag, LayoutGrid, Tag, MousePointer,
  Minus, Share2, AlignLeft, Link2, Variable, Sparkles, Smartphone, Monitor,
  Plus, Trash2, X, Check, ExternalLink, Play, Smile, Phone, Layers, ShieldCheck,
  ArrowUp, ArrowDown, Bookmark, Save, MoveVertical, RefreshCw, CheckCircle2,
  GripVertical, ChevronsUp, ChevronsDown, Lock, ListOrdered, LayoutList, Info,
  CornerDownRight, SlidersHorizontal, ArrowUpDown, Upload, Eye, Package, Wrench, FileText
} from 'lucide-react';
import {
  DEFAULT_EXECUTIVE_CREATIVE,
  PURPOSE_BASED_PRESETS,
  DEFAULT_EMAIL_SECTIONS,
  DEFAULT_SECTIONS_ORDER,
  DEFAULT_SYSTEM_TIERS,
  DEFAULT_TRUST_METRICS,
  COLOR_PALETTES,
  PLATFORM_LINK_GROUPS,
  SOLARKITS_MEDIA_ASSETS,
  DEFAULT_HERO_BANNER_URL,
  isPdfDownloadUrl,
  findPlatformLinkMeta,
  generateResponsiveEmailHtml
} from '../services/emailTemplateGenerator';
import { marketingHttp, extractApiError } from '../services/marketingApi';
import { fetchLiveComboKits } from '../services/marketingDataService';

// Rich Section Metadata with intuitive icons, color coding, and editor anchors
const SECTION_METADATA_MAP = {
  banner: {
    id: 'banner',
    label: 'Hero Title & Visual Animation',
    shortLabel: 'Hero Showcase',
    desc: 'Clean editorial headline + animated hero illustration or video',
    icon: ImageIcon,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-950/60',
    borderColor: 'border-purple-200 dark:border-purple-800',
    editorAnchor: 'editor-section-banner'
  },
  pitch: {
    id: 'pitch',
    label: 'Intro Narrative & Tagline',
    shortLabel: 'Narrative & Tagline',
    desc: 'Centered body story and brand sign-off tagline',
    icon: Type,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950/60',
    borderColor: 'border-blue-200 dark:border-blue-800',
    editorAnchor: 'editor-section-pitch'
  },
  primary_cta: {
    id: 'primary_cta',
    label: 'Primary Action CTA',
    shortLabel: 'Primary CTA',
    desc: 'Centered rounded action button (e.g. WhatsApp Quote)',
    icon: MousePointer,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/60',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    editorAnchor: 'editor-section-ctas'
  },
  system_showcase: {
    id: 'system_showcase',
    label: 'Zigzag System Lineup',
    shortLabel: 'System Showcase',
    desc: '3 alternating left/right solar kit showcase tiers',
    icon: LayoutGrid,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-950/60',
    borderColor: 'border-teal-200 dark:border-teal-800',
    editorAnchor: 'editor-section-showcase'
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
    desc: 'Minimalist discount voucher box with coupon code & savings',
    icon: Tag,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-950/60',
    borderColor: 'border-orange-200 dark:border-orange-800',
    editorAnchor: 'editor-section-coupon'
  },
  intelligence: {
    id: 'intelligence',
    label: 'Portal & Phone Animation',
    shortLabel: 'Portal & Phone GIF',
    desc: 'Smart SolarKits portal + mobile showcase animation block',
    icon: Smartphone,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-100 dark:bg-sky-950/60',
    borderColor: 'border-sky-200 dark:border-sky-800',
    editorAnchor: 'editor-section-intelligence'
  },
  benefit_cards: {
    id: 'benefit_cards',
    label: 'Trust Metrics & Highlights',
    shortLabel: 'Trust Metrics Strip',
    desc: '3 rounded brand metric cards + optional partner highlights',
    icon: Layers,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-950/60',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    editorAnchor: 'editor-section-benefits'
  },
  closing_pitch: {
    id: 'closing_pitch',
    label: 'Dual Bottom Action Buttons',
    shortLabel: 'Dual CTA Pair',
    desc: 'Side-by-side Datasheet and Website action buttons',
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
    desc: 'Extra contact or catalogue links',
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
  { key: 'tracking_url', label: 'Tracking / Cart URL', preview: 'https://store.solarkits.in/preconfigured-combo-kit?coupon=SOLARDIWALI5000' }
];

const extractPdfFilenameFromUrl = (rawUrl = '') => {
  try {
    const pathname = new URL(rawUrl).pathname;
    return decodeURIComponent(pathname.split('/').pop() || 'Datasheet.pdf');
  } catch {
    return String(rawUrl || '').split('/').pop() || 'Datasheet.pdf';
  }
};

/**
 * Reusable platform destination picker + custom URL + Cloudinary PDF upload control
 * used across Action CTAs, Dual Bottom Buttons, and Kit Showcase Cards.
 */
function DestinationLinkPicker({
  value = '',
  onChange,
  isPdf = false,
  uploadFieldKey,
  uploadingAssetField,
  onUploadPdf,
  compact = false
}) {
  const cleanVal = String(value || '').trim();
  const baseNoUtm = (() => {
    try {
      const u = new URL(cleanVal);
      return `${u.origin}${u.pathname === '/' ? '/' : u.pathname}`;
    } catch {
      return cleanVal;
    }
  })();
  const matchedMeta = findPlatformLinkMeta(cleanVal) || findPlatformLinkMeta(baseNoUtm);
  const currentIsPdf = Boolean(isPdf || isPdfDownloadUrl(cleanVal));
  const selectValue = matchedMeta ? matchedMeta.url : (currentIsPdf ? '__PDF__' : '__CUSTOM__');
  const isUploading = uploadingAssetField === uploadFieldKey;

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-center gap-1.5">
        <select
          value={selectValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '__CUSTOM__' || val === '__PDF__') return;
            onChange(val, false);
          }}
          className={`flex-1 min-w-0 rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold cursor-pointer ${
            compact ? 'px-2 py-1 text-[10.5px]' : 'px-2.5 py-1.5 text-[11px]'
          }`}
        >
          {currentIsPdf && (
            <option value="__PDF__">
              📄 Uploaded PDF: {extractPdfFilenameFromUrl(cleanVal)} — Downloads PDF on click
            </option>
          )}
          {PLATFORM_LINK_GROUPS.map((grp) => (
            <optgroup key={grp.group} label={grp.group}>
              {grp.items.map((item) => (
                <option key={item.url} value={item.url}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="__CUSTOM__">
            🔗 Custom URL — Enter manual destination link below
          </option>
        </select>

        {onUploadPdf && (
          <label
            className={`inline-flex items-center gap-1 rounded-lg font-bold cursor-pointer shrink-0 transition-colors ${
              currentIsPdf
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            } ${compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[10.5px]'}`}
            title="Upload PDF brochure/datasheet to Cloudinary (auto-downloads when user clicks this button)"
          >
            <Upload className="w-3 h-3" />
            <span>{isUploading ? 'Uploading...' : currentIsPdf ? 'Replace PDF' : 'Upload PDF'}</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onUploadPdf(file);
              }}
            />
          </label>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value, isPdfDownloadUrl(e.target.value))}
          placeholder="Destination URL or uploaded PDF link..."
          className={`flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 font-mono bg-white dark:bg-slate-800 ${
            compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-[10.5px]'
          }`}
        />
        {currentIsPdf && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9.5px] font-bold shrink-0">
            PDF Download
          </span>
        )}
      </div>

      {!compact && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
          {currentIsPdf ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              📥 Clicking this button will download: {extractPdfFilenameFromUrl(cleanVal)}
            </span>
          ) : matchedMeta ? (
            <span>
              <strong>Opens:</strong> {matchedMeta.group} — {matchedMeta.label}
            </span>
          ) : cleanVal ? (
            <span>
              <strong>Opens:</strong> {cleanVal}
            </span>
          ) : (
            <span>Select a SolarKits platform page above or upload a PDF datasheet.</span>
          )}
        </p>
      )}
    </div>
  );
}

export default function EmailStudio({
  formData,
  setFormData,
  selectedKitObjects = [],
  allKitsCatalog = [],
  warehousesList = [],
  campaignObjective = ''
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
  const [fetchedCatalog, setFetchedCatalog] = useState([]);
  const [loadingLiveCatalog, setLoadingLiveCatalog] = useState(false);
  const [viewingKitDetail, setViewingKitDetail] = useState(null);
  const [activeEditorSectionId, setActiveEditorSectionId] = useState(null);

  const effectiveKitsCatalog = useMemo(() => {
    const raw = Array.isArray(allKitsCatalog) && allKitsCatalog.length > 0 ? allKitsCatalog : fetchedCatalog;
    return [...raw].sort((a, b) => (Number(a.capacity) || 9999) - (Number(b.capacity) || 9999));
  }, [allKitsCatalog, fetchedCatalog]);

  useEffect(() => {
    let cancelled = false;
    if (Array.isArray(allKitsCatalog) && allKitsCatalog.length > 0) return undefined;
    setLoadingLiveCatalog(true);
    fetchLiveComboKits()
      .then((kits) => {
        if (!cancelled && Array.isArray(kits)) setFetchedCatalog(kits);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoadingLiveCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allKitsCatalog]);

  const handleUploadEmailAsset = async (file, fieldKey, onUploaded) => {
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
        if (typeof onUploaded === 'function') {
          onUploaded(res.data.url);
        } else {
          updateCreative({ [fieldKey]: res.data.url });
        }
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
    return formData.servingWarehouses?.[0] || 'Pan-India Regional Depots';
  }, [formData.servingWarehouses, warehousesList]);

  // Derive dynamic discount string
  const dynamicDiscountStr = useMemo(() => {
    const val = Number(formData.discountValue || 0);
    if (!val || val <= 0) return 'Special Partner Offer';
    return formData.discountType === 'percent'
      ? `${val}% OFF`
      : `₹${val.toLocaleString('en-IN')} OFF`;
  }, [formData.discountValue, formData.discountType]);

  // Derive dynamic primary kit names from Step 3
  const dynamicKitNames = useMemo(() => {
    if (selectedKitObjects.length > 0) {
      return selectedKitObjects.map(k => k.name).join(' & ');
    }
    return 'B2B Solar Combo Kits';
  }, [selectedKitObjects]);

  // Form creative state merging defaults cleanly with campaign customCreative
  const creative = {
    ...DEFAULT_EXECUTIVE_CREATIVE,
    ...(formData.customCreative || {}),
    logoUrl: (formData.customCreative && formData.customCreative.logoUrl) || DEFAULT_EXECUTIVE_CREATIVE.logoUrl,
    heroImageUrl: (() => {
      const raw = formData.customCreative?.heroImageUrl;
      if (!raw) return formData.customCreative?.heroImageCleared ? '' : DEFAULT_HERO_BANNER_URL;
      if (raw.includes('solarkits_default_hero_banner.jpg')) return DEFAULT_HERO_BANNER_URL;
      return raw;
    })(),
    sectionsOrder:
      Array.isArray(formData.customCreative?.sectionsOrder) && formData.customCreative.sectionsOrder.length > 0
        ? formData.customCreative.sectionsOrder
        : DEFAULT_SECTIONS_ORDER
  };

  // Active dynamic section ordering (preserves custom/saved order & safely includes new default sections)
  const activeSectionsOrder = useMemo(() => {
    if (Array.isArray(creative.sectionsOrder) && creative.sectionsOrder.length > 0) {
      const valid = creative.sectionsOrder.filter((id) => Boolean(SECTION_METADATA_MAP[id]));
      const missing = DEFAULT_SECTIONS_ORDER.filter((id) => !valid.includes(id));
      return valid.length > 0 ? [...valid, ...missing] : DEFAULT_SECTIONS_ORDER;
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
        updateCreative({ sectionsOrder: DEFAULT_SECTIONS_ORDER });
        break;
      case 'offer_first':
        updateCreative({
          sectionsOrder: ['banner', 'coupon', 'products', 'pitch', 'primary_cta', 'system_showcase', 'intelligence', 'benefit_cards', 'closing_pitch', 'custom_ctas']
        });
        break;
      case 'catalog_first':
        updateCreative({
          sectionsOrder: ['banner', 'system_showcase', 'products', 'pitch', 'primary_cta', 'coupon', 'intelligence', 'benefit_cards', 'closing_pitch', 'custom_ctas']
        });
        break;
      case 'urgency_first':
        updateCreative({
          sectionsOrder: ['pitch', 'primary_cta', 'banner', 'coupon', 'system_showcase', 'products', 'intelligence', 'benefit_cards', 'closing_pitch', 'custom_ctas']
        });
        break;
      default:
        updateCreative({ sectionsOrder: DEFAULT_SECTIONS_ORDER });
    }
  };

  const handleResetSectionOrder = () => {
    updateCreative({ sectionsOrder: DEFAULT_SECTIONS_ORDER });
  };

  const SECTION_FOCUS_SELECTOR_MAP = {
    banner: '[data-banner-focus="primary"], input[type="text"], input:not([type="hidden"])',
    pitch: 'textarea, input[type="text"]',
    primary_cta: '[data-cta-input="0"], input[type="text"]',
    system_showcase: '[data-kit-select="0"], select, input[type="text"]',
    products: 'button, select, input[type="text"]',
    coupon: 'input[type="text"], input[type="checkbox"]',
    intelligence: 'input[type="text"], textarea',
    benefit_cards: 'input[type="text"]',
    closing_pitch: 'input[type="text"]',
    custom_ctas: '[data-cta-input="1"], [data-cta-input="0"], input[type="text"]'
  };

  const buildTierFromKit = (kit, idx = 0) => {
    if (!kit) {
      return {
        kitId: '',
        eyebrow: 'SOLAR KIT',
        title: `Solar System #${idx + 1}`,
        desc: '',
        badge: 'View Specs',
        imageUrl: ''
      };
    }
    const isGovtTender = Boolean(kit.is_govt_tender || kit.tender_name);
    const eyebrow = (
      isGovtTender
        ? (kit.state_name || kit.category_name || 'GOVT TENDER KIT')
        : (kit.category_name || kit.system_type || kit.project_range || (kit.capacity ? `${kit.capacity} kW SOLAR KIT` : 'SOLAR KIT'))
    ).toUpperCase();
    const title = kit.tender_name || kit.name || kit.combo_kit_name || `Solar Kit #${idx + 1}`;
    const compParts = [];
    if (kit.brand_name) compParts.push(kit.brand_name);
    if (kit.system_type) compParts.push(kit.system_type);
    const baseCount = Array.isArray(kit.base_components_details) ? kit.base_components_details.length : 0;
    const bosCount = Array.isArray(kit.bos_kits_details) ? kit.bos_kits_details.length : 0;
    if (baseCount > 0 || bosCount > 0) {
      compParts.push(`${baseCount} Base + ${bosCount} BOS Items`);
    }
    const rawDesc = kit.tender_description || kit.tagline || kit.description || kit.components_summary || compParts.join(' • ');
    const cleanDesc = String(rawDesc || '').replace(/\s+/g, ' ').trim();
    const desc = cleanDesc.length > 175 ? `${cleanDesc.slice(0, 172)}...` : cleanDesc;
    const badge = kit.capacity
      ? `${kit.capacity} kW${kit.dcr_module_available ? ' DCR' : ''}`
      : (kit.secondary_badge_text || kit.primary_badge_text || kit.system_type || 'View Specs');
    const imageUrl =
      kit.tender_image_url ||
      kit.kit_image ||
      kit.image ||
      (Array.isArray(kit.available_photos) && kit.available_photos[0]?.url) ||
      '';
    const ctaUrl = kit.is_govt_tender
      ? 'https://store.solarkits.in/browse/govt-tender'
      : 'https://store.solarkits.in/preconfigured-combo-kit';
    return {
      kitId: kit.id != null ? String(kit.id) : '',
      eyebrow,
      title,
      desc,
      badge,
      imageUrl,
      ctaUrl,
      isPdf: false
    };
  };

  const findKitForTier = (tier) => {
    if (!tier) return null;
    const pool = [...effectiveKitsCatalog, ...selectedKitObjects];
    if (tier.kitId) {
      const byId = pool.find((k) => String(k.id) === String(tier.kitId));
      if (byId) return byId;
    }
    const normTitle = String(tier.title || '').trim().toLowerCase();
    if (normTitle) {
      const byTitle = pool.find((k) => {
        const kName = String(k.tender_name || k.name || k.combo_kit_name || '').trim().toLowerCase();
        return kName && kName === normTitle;
      });
      if (byTitle) return byTitle;
    }
    return null;
  };

  // Smooth scroll to an editor section and place cursor inside its primary control
  const scrollToEditorSection = (anchorId, secId = null) => {
    if (!anchorId) return;
    if (secId) setActiveEditorSectionId(secId);

    const runScrollAndFocus = () => {
      const el = document.getElementById(anchorId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-500');
      }, 1500);

      const selector = (secId && SECTION_FOCUS_SELECTOR_MAP[secId]) || '';
      let targetInput =
        (selector && document.querySelector(secId === 'banner' ? selector : `#${anchorId} ${selector}`)) ||
        (selector && el.querySelector(selector)) ||
        el.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
      if (!targetInput && el.parentElement) {
        targetInput = el.parentElement.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
      }
      if (targetInput && typeof targetInput.focus === 'function') {
        setTimeout(() => {
          try {
            targetInput.focus({ preventScroll: true });
          } catch {
            targetInput.focus();
          }
        }, 180);
      }
    };

    if (activeTab !== 'custom') {
      setActiveTab('custom');
      setTimeout(runScrollAndFocus, 100);
    } else {
      runScrollAndFocus();
    }
  };

  // Auto-sync Zigzag System Lineup cards with live Kits Configuration / Step 3 purpose-filtered kits
  // unless the user has manually customized the lineup for this objective.
  useEffect(() => {
    const sourceKits =
      Array.isArray(selectedKitObjects) && selectedKitObjects.length > 0
        ? selectedKitObjects
        : effectiveKitsCatalog;
    if (!Array.isArray(sourceKits) || sourceKits.length === 0) return;

    setFormData((prev) => {
      const existingCr = prev?.customCreative || {};
      const objectiveChanged =
        Boolean(campaignObjective) && existingCr.lastAutoKitObjective !== campaignObjective;
      if (existingCr.systemTiersCustomized && !objectiveChanged) {
        return prev;
      }

      const existingTiers = Array.isArray(existingCr.systemTiers) ? existingCr.systemTiers : [];
      const isUsingStaticDefaults =
        existingTiers.length === 0 ||
        existingTiers.every((t) => !t?.kitId);

      if (!existingCr.systemTiersCustomized || objectiveChanged || isUsingStaticDefaults) {
        const nextTiers = sourceKits.slice(0, 3).map((kit, idx) => buildTierFromKit(kit, idx));
        const sameTiers =
          existingTiers.length === nextTiers.length &&
          existingTiers.every((t, i) => t?.kitId && t.kitId === nextTiers[i]?.kitId && t.title === nextTiers[i]?.title) &&
          !objectiveChanged;
        if (sameTiers) return prev;

        return {
          ...prev,
          customCreative: {
            ...(prev?.customCreative || DEFAULT_EXECUTIVE_CREATIVE),
            systemTiers: nextTiers,
            systemTiersCustomized: false,
            lastAutoKitObjective: campaignObjective || ''
          }
        };
      }
      return prev;
    });
  }, [selectedKitObjects, effectiveKitsCatalog, campaignObjective, setFormData]);

  const handleSyncTiersFromLiveKits = () => {
    const sourceKits =
      Array.isArray(selectedKitObjects) && selectedKitObjects.length > 0
        ? selectedKitObjects
        : effectiveKitsCatalog;
    if (!Array.isArray(sourceKits) || sourceKits.length === 0) return;
    const nextTiers = sourceKits.slice(0, 3).map((kit, idx) => buildTierFromKit(kit, idx));
    setFormData((prev) => ({
      ...prev,
      customCreative: {
        ...(prev?.customCreative || DEFAULT_EXECUTIVE_CREATIVE),
        systemTiers: nextTiers,
        systemTiersCustomized: false,
        lastAutoKitObjective: campaignObjective || ''
      }
    }));
  };

  const handleSelectKitForTier = (idx, kitId) => {
    const pickedKit = effectiveKitsCatalog.find((k) => String(k.id) === String(kitId))
      || selectedKitObjects.find((k) => String(k.id) === String(kitId));
    setFormData((prev) => {
      const prevCr = prev?.customCreative || DEFAULT_EXECUTIVE_CREATIVE;
      const baseTiers =
        Array.isArray(prevCr.systemTiers) && prevCr.systemTiers.length > 0
          ? [...prevCr.systemTiers]
          : DEFAULT_SYSTEM_TIERS.map((t) => ({ ...t }));
      if (!pickedKit) {
        baseTiers[idx] = { ...(baseTiers[idx] || {}), kitId: '' };
      } else {
        baseTiers[idx] = buildTierFromKit(pickedKit, idx);
      }
      return {
        ...prev,
        customCreative: {
          ...prevCr,
          systemTiers: baseTiers,
          systemTiersCustomized: true,
          lastAutoKitObjective: campaignObjective || ''
        }
      };
    });
  };

  const handleUpdateTierField = (idx, fieldOrPatch, maybeValue) => {
    const patch = typeof fieldOrPatch === 'object' ? fieldOrPatch : { [fieldOrPatch]: maybeValue };
    setFormData((prev) => {
      const prevCr = prev?.customCreative || DEFAULT_EXECUTIVE_CREATIVE;
      const baseTiers =
        Array.isArray(prevCr.systemTiers) && prevCr.systemTiers.length > 0
          ? [...prevCr.systemTiers]
          : DEFAULT_SYSTEM_TIERS.map((t) => ({ ...t }));
      baseTiers[idx] = { ...(baseTiers[idx] || {}), ...patch };
      return {
        ...prev,
        customCreative: {
          ...prevCr,
          systemTiers: baseTiers,
          systemTiersCustomized: true
        }
      };
    });
  };

  const handleAddTierCard = () => {
    setFormData((prev) => {
      const prevCr = prev?.customCreative || DEFAULT_EXECUTIVE_CREATIVE;
      const baseTiers =
        Array.isArray(prevCr.systemTiers) && prevCr.systemTiers.length > 0
          ? [...prevCr.systemTiers]
          : [];
      const unusedKit = effectiveKitsCatalog.find(
        (k) => !baseTiers.some((t) => String(t.kitId) === String(k.id))
      ) || effectiveKitsCatalog[0];
      const nextCard = buildTierFromKit(unusedKit, baseTiers.length);
      return {
        ...prev,
        customCreative: {
          ...prevCr,
          systemTiers: [...baseTiers, nextCard],
          systemTiersCustomized: true
        }
      };
    });
  };

  const handleRemoveTierCard = (idx) => {
    setFormData((prev) => {
      const prevCr = prev?.customCreative || DEFAULT_EXECUTIVE_CREATIVE;
      const baseTiers = Array.isArray(prevCr.systemTiers) ? [...prevCr.systemTiers] : [];
      if (baseTiers.length <= 1) return prev;
      baseTiers.splice(idx, 1);
      return {
        ...prev,
        customCreative: {
          ...prevCr,
          systemTiers: baseTiers,
          systemTiersCustomized: true
        }
      };
    });
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
    const baseCta = formData.ctaText || DEFAULT_EXECUTIVE_CREATIVE.primaryCtaText || 'WhatsApp Quote';
    const rawDest = formData.destinationUrl || DEFAULT_EXECUTIVE_CREATIVE.destinationUrl || 'https://wa.me/919913421453';
    const baseUrl = formData.couponCode && !rawDest.includes('wa.me')
      ? `${rawDest}${rawDest.includes('?') ? '&' : '?'}coupon=${formData.couponCode}`
      : rawDest;

    return [
      { id: 'cta_1', text: baseCta, url: baseUrl, isPdf: isPdfDownloadUrl(baseUrl), variant: 'primary' },
      { id: 'cta_2', text: 'Explore Solar Kits Catalog', url: 'https://store.solarkits.in/preconfigured-combo-kit', isPdf: false, variant: 'secondary' }
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
      url: creative.contactPhone ? `tel:${String(creative.contactPhone).replace(/\s+/g, '')}` : 'https://solarkits.in/contact',
      variant: 'secondary'
    };
    const updated = [...ctaButtons, newBtn];
    setCtaButtons(updated);
    updateCreative({ ctaButtons: updated });
  };

  const handleUpdateCta = (id, fieldOrPatch, maybeValue) => {
    const patch = typeof fieldOrPatch === 'object' ? fieldOrPatch : { [fieldOrPatch]: maybeValue };
    const btnIndex = ctaButtons.findIndex((b) => b.id === id);
    const updated = ctaButtons.map((b) => (b.id === id ? { ...b, ...patch } : b));
    setCtaButtons(updated);
    setFormData((prev) => ({
      ...prev,
      ...(btnIndex === 0 && 'text' in patch ? { ctaText: patch.text } : {}),
      ...(btnIndex === 0 && 'url' in patch ? { destinationUrl: patch.url } : {}),
      customCreative: {
        ...prev.customCreative,
        ...(btnIndex === 0 && 'text' in patch ? { primaryCtaText: patch.text } : {}),
        ...(btnIndex === 0 && 'url' in patch ? { destinationUrl: patch.url } : {}),
        ctaButtons: updated
      }
    }));
  };

  const handleRemoveCta = (id) => {
    if (ctaButtons.length <= 1) return;
    const updated = ctaButtons.filter(b => b.id !== id);
    setCtaButtons(updated);
    const first = updated[0];
    setFormData((prev) => ({
      ...prev,
      ...(first ? { ctaText: first.text, destinationUrl: first.url } : {}),
      customCreative: {
        ...prev.customCreative,
        ...(first ? { primaryCtaText: first.text, destinationUrl: first.url } : {}),
        ctaButtons: updated
      }
    }));
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
    const first = updated[0];
    setFormData((prev) => ({
      ...prev,
      ...(first ? { ctaText: first.text, destinationUrl: first.url } : {}),
      customCreative: {
        ...prev.customCreative,
        ...(first ? { primaryCtaText: first.text, destinationUrl: first.url } : {}),
        ctaButtons: updated
      }
    }));
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

  // Toggle products in multi-product modal (and sync into customCreative for HTML generation)
  const handleToggleProduct = (kitId) => {
    const nextIds = selectedProductIds.includes(kitId)
      ? selectedProductIds.filter((id) => id !== kitId)
      : [...selectedProductIds, kitId];
    setSelectedProductIds(nextIds);
    updateCreative({ selectedProductIds: nextIds });
  };

  // Filter products for preview
  const previewProducts = useMemo(() => {
    const pool = effectiveKitsCatalog.length > 0 ? effectiveKitsCatalog : selectedKitObjects;
    if (selectedProductIds.length === 0) return selectedKitObjects.slice(0, 2);
    return pool.filter(k => selectedProductIds.includes(k.id));
  }, [effectiveKitsCatalog, selectedKitObjects, selectedProductIds]);

  // Toolbar elements for Email Studio
  const EMAIL_ELEMENTS = [
    { label: 'Heading', icon: Heading1, action: () => updateCreative({ headline: 'Diwali Mega B2B Solar Dhamaka' }) },
    { label: 'Text', icon: Type, action: () => { } },
    { label: 'Image', icon: ImageIcon, action: () => updateCreative({ mediaType: 'image' }) },
    { label: 'Video', icon: Video, action: () => updateCreative({ mediaType: 'video' }) },
    { label: 'Product', icon: ShoppingBag, action: () => setShowProductModal(true) },
    {
      label: 'Catalog', icon: LayoutGrid, action: () => {
        const allIds = effectiveKitsCatalog.map(k => k.id);
        setSelectedProductIds(allIds);
        updateCreative({ selectedProductIds: allIds });
      }
    },
    {
      label: 'Coupon', icon: Tag, action: () => {
        setFormData(prev => ({ ...prev, hasCoupon: !prev.hasCoupon }));
      }
    },
    { label: 'CTA Btn', icon: MousePointer, action: handleAddCtaButton },
    { label: 'Link', icon: Link2, action: () => updateCreative({ customBodyText: (creative.customBodyText || '') + ' {{tracking_url}}' }) },
    { label: 'Emoji', icon: Smile, action: () => setShowEmojiPicker(!showEmojiPicker) },
    { label: 'Variable', icon: Variable, action: () => setShowVarDropdown(!showVarDropdown) },
    { label: 'Divider', icon: Minus, action: () => updateCreative({ customBodyText: (creative.customBodyText || '') + '\n\n— — — — — — — — — —\n\n' }) },
    { label: 'Social', icon: Share2, action: () => { } },
    { label: 'Footer', icon: AlignLeft, action: () => { } }
  ];

  // Dynamic variable resolver for live preview
  const getSubstitutedText = (text) => {
    if (!text) return '';
    let result = text;
    const rawDest = formData.destinationUrl || 'https://solarkits.in/solar-kits';
    const lookup = {
      name: 'EPC Partner',
      company_name: 'Partner Solar Company',
      coupon_code: formData.couponCode || '{{coupon_code}}',
      discount_value: dynamicDiscountStr,
      kit_name: dynamicKitNames,
      warehouse_name: activeWarehouseName,
      tracking_url: formData.couponCode
        ? `${rawDest}${rawDest.includes('?') ? '&' : '?'}coupon=${formData.couponCode}`
        : rawDest
    };

    DYNAMIC_VARS.forEach((v) => {
      const val = lookup[v.key] || v.preview;
      result = result.replaceAll(`{{${v.key}}}`, val);
    });
    return result;
  };

  // Dynamic preview section renderer respecting activeSectionsOrder (mirrors clean Boss Reference HTML)
  const renderPreviewSection = (sectionId) => {
    const primaryCol = creative.themeColor || '#1E3A8A';
    const accentCol = creative.stripColor || '#EA580C';
    const liveFallbackTiers =
      (selectedKitObjects.length > 0 ? selectedKitObjects : effectiveKitsCatalog)
        .slice(0, 3)
        .map((kit, idx) => buildTierFromKit(kit, idx));
    const tiers =
      Array.isArray(creative.systemTiers) && creative.systemTiers.some((t) => t?.kitId || creative.systemTiersCustomized)
        ? creative.systemTiers
        : liveFallbackTiers.length > 0
          ? liveFallbackTiers
          : (Array.isArray(creative.systemTiers) && creative.systemTiers.length > 0 ? creative.systemTiers : DEFAULT_SYSTEM_TIERS);
    const metrics = Array.isArray(creative.trustMetrics) && creative.trustMetrics.length > 0 ? creative.trustMetrics : DEFAULT_TRUST_METRICS;

    switch (sectionId) {
      case 'banner': {
        const posterImg = creative.videoPosterUrl || '';
        const heroImg = creative.heroImageUrl || '';
        return (
          <div key="banner" className="bg-white text-center px-4 pt-2 pb-1">
            <h3 className="text-[15px] font-bold leading-snug mb-1" style={{ color: primaryCol }}>
              {creative.headline || 'Three Systems. One Platform. Built for every solar load.'}
            </h3>
            {creative.subheading && (
              <p className="text-[10.5px] text-slate-500 max-w-xs mx-auto mb-2.5 leading-snug">
                {creative.subheading}
              </p>
            )}
            {creative.mediaType === 'video' ? (
              <div className="space-y-2 pb-1">
                {posterImg ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white">
                    <img src={posterImg} alt="Explainer Video Preview" className="w-full h-auto block" />
                    <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-white" /> Video Link
                    </span>
                  </div>
                ) : (
                  <div className="py-5 px-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] font-semibold text-slate-500">
                    Upload Video / Poster GIF in Hero Section to preview
                  </div>
                )}
                {creative.videoUrl && (
                  <span className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold" style={{ color: primaryCol }}>
                    ▶ Watch Full Explainer Video
                  </span>
                )}
              </div>
            ) : heroImg ? (
              <img
                src={heroImg}
                alt={creative.headline || 'SolarKits Hero Visual'}
                className="w-full h-auto block rounded-md"
              />
            ) : (
              <div className="py-5 px-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] font-semibold text-slate-500">
                Upload Hero Photo / GIF in Hero Section below
              </div>
            )}
          </div>
        );
      }

      case 'pitch':
        return (
          <div key="pitch" className="px-5 py-3 text-center bg-white">
            {creative.categoryTag && (
              <span className="text-[9.5px] font-bold tracking-widest uppercase block mb-1" style={{ color: accentCol }}>
                {creative.categoryTag}
              </span>
            )}
            <p className="text-[11px] text-[#666666] leading-relaxed text-center whitespace-pre-line">
              {getSubstitutedText(creative.customBodyText)}
            </p>
            {creative.h1Title && (
              <p className="text-[11.5px] font-semibold mt-2.5" style={{ color: primaryCol }}>
                {creative.h1Title}
              </p>
            )}
          </div>
        );

      case 'primary_cta': {
        const firstBtn = ctaButtons[0];
        return (
          <div key="primary_cta" className="py-2.5 px-4 text-center bg-white">
            <a
              href={firstBtn?.url || formData.destinationUrl || '#'}
              onClick={(e) => e.preventDefault()}
              className="inline-block py-2 px-6 rounded font-bold text-[11.5px] text-white shadow-xs transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: primaryCol }}
            >
              {firstBtn?.text || formData.ctaText || creative.primaryCtaText || 'WhatsApp Quote'}
            </a>
          </div>
        );
      }

      case 'system_showcase':
        return (
          <div key="system_showcase" className="px-4 py-3 bg-white space-y-2.5">
            <div className="text-center pb-1">
              <h4 className="text-[14px] font-bold" style={{ color: primaryCol }}>
                {creative.showcaseHeading || 'Find your kit.'}
              </h4>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {creative.showcaseSubheading || 'From residential rooftops to commercial & industrial plants.'}
              </p>
            </div>
            <div className="divide-y divide-slate-200/80">
              {tiers.map((tier, idx) => {
                const isImgRight = idx % 2 === 0;
                const textEl = (
                  <div className="space-y-1 text-left">
                    <span className="text-[8.5px] font-bold uppercase tracking-widest block" style={{ color: primaryCol }}>
                      {tier.eyebrow}
                    </span>
                    <div className="text-[13px] font-bold text-slate-800 leading-tight">{tier.title}</div>
                    <p className="text-[10px] text-slate-600 leading-snug">{tier.desc}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-block px-2.5 py-1 rounded text-[9.5px] font-bold text-white"
                        style={{ backgroundColor: primaryCol }}
                      >
                        {tier.badge}
                      </span>
                      {(() => {
                        const matchedPreviewKit = findKitForTier(tier);
                        if (!matchedPreviewKit) return null;
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingKitDetail(matchedPreviewKit);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            title="View Full Components, BOS Kits & Technical Specs"
                          >
                            <Eye className="w-2.5 h-2.5" />
                            View Components &amp; Specs
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
                const imgEl = tier.imageUrl ? (
                  <img
                    src={tier.imageUrl}
                    alt={tier.title}
                    className="w-full h-auto object-contain block rounded"
                  />
                ) : (
                  <div className="py-5 px-2 rounded border border-dashed border-slate-300 bg-slate-50 text-center text-[9.5px] font-semibold text-slate-400">
                    Upload Card #{idx + 1} Image
                  </div>
                );
                return (
                  <div key={idx} className="grid grid-cols-2 gap-2.5 items-center py-2.5">
                    {isImgRight ? (
                      <>
                        {textEl}
                        {imgEl}
                      </>
                    ) : (
                      <>
                        {imgEl}
                        {textEl}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'products':
        if (previewProducts.length === 0) return null;
        return (
          <div key="products" className="p-4 space-y-2 text-left pt-2 bg-white">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={{ color: primaryCol }}>
              <span>Featured Solar Kits ({previewProducts.length})</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                {activeWarehouseName}
              </span>
            </div>
            {previewProducts.map((k) => {
              const livePrice = Number(k.base_price || k.selling_price_cached || k.defaultPrice || k.price || 0);
              return (
                <div key={k.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="text-[11px]">{k.name}</span>
                    <span className="font-extrabold text-[11px]" style={{ color: primaryCol }}>
                      {livePrice > 0 ? `₹${livePrice.toLocaleString('en-IN')}` : 'Quote on Request'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    {k.components_summary || k.sub_title}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>MOQ: {formData.kitMoqs?.[k.id] ?? k.moq ?? formData.minOrderQty ?? 25} Kits</span>
                    <span className="text-emerald-600 font-bold">24-Hr Dispatch</span>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'coupon':
        if (!formData.hasCoupon) return null;
        return (
          <div key="coupon" className="px-4 py-2 bg-white">
            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-dashed text-center" style={{ borderColor: accentCol }}>
              <span className="text-[9px] uppercase font-bold block" style={{ color: accentCol }}>Partner Wholesale Voucher</span>
              <p className="text-sm font-black font-mono text-slate-900 my-0.5">
                {formData.couponCode || 'COUPON_CODE'}
              </p>
              <span className="text-[10px] text-slate-600 font-semibold block">
                Save {dynamicDiscountStr} • Min {formData.minOrderQty || 1} Kits
              </span>
            </div>
          </div>
        );

      case 'intelligence':
        return (
          <div key="intelligence" className="px-4 py-3 text-center bg-white space-y-2">
            <h4 className="text-[13px] font-bold leading-snug" style={{ color: primaryCol }}>
              {creative.intelligenceHeading || 'Intelligence That Makes Solar Deployment Faster.'}
            </h4>
            <p className="text-[10.5px] text-slate-600 leading-relaxed">
              {creative.intelligenceText || DEFAULT_EXECUTIVE_CREATIVE.intelligenceText}
            </p>
            {creative.intelligenceImageUrl ? (
              <img
                src={creative.intelligenceImageUrl}
                alt="SolarKits Portal & Mobile App"
                className="w-full h-auto block rounded"
              />
            ) : (
              <div className="py-4 px-3 rounded border border-dashed border-slate-300 bg-slate-50 text-[10px] font-semibold text-slate-400">
                Upload Portal / Phone GIF in Intelligence section below
              </div>
            )}
          </div>
        );

      case 'benefit_cards':
        return (
          <div key="benefit_cards" className="px-3 py-2.5 bg-white space-y-2">
            {metrics.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {metrics.slice(0, 3).map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg text-white text-left" style={{ backgroundColor: primaryCol }}>
                    <div className="text-[12px] font-extrabold leading-tight">{m.value}</div>
                    <div className="text-[8.5px] text-slate-200 mt-1 leading-tight">{m.label}</div>
                  </div>
                ))}
              </div>
            )}
            {(creative.bulletPoints || []).length > 0 && (
              <div className="space-y-1.5 pt-1 text-left">
                {(creative.bulletPoints || []).map((pt, i) => {
                  const str = String(pt);
                  const hasColon = str.includes(':');
                  const title = hasColon ? str.split(':')[0].trim() : `Highlight ${i + 1}`;
                  const desc = hasColon ? str.split(':').slice(1).join(':').trim() : str;
                  return (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-50 rounded-md border border-slate-200"
                      style={{ borderLeft: `3px solid ${i % 2 === 0 ? primaryCol : accentCol}` }}
                    >
                      <div className="text-[11px] font-bold" style={{ color: primaryCol }}>{title}</div>
                      <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'closing_pitch':
        return (
          <div key="closing_pitch" className="px-4 py-3 text-center bg-white space-y-2">
            {creative.closingPitch && (
              <p className="text-[11.5px] font-bold" style={{ color: primaryCol }}>
                {creative.closingPitch}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2.5 max-w-[300px] mx-auto">
              <a
                href={creative.primaryDualCtaUrl || formData.destinationUrl || '#'}
                onClick={(e) => e.preventDefault()}
                className="py-2 px-2 rounded text-[10.5px] font-bold text-white text-center truncate"
                style={{ backgroundColor: primaryCol }}
              >
                {creative.primaryDualCtaText || 'Download Datasheet'}
              </a>
              <a
                href={creative.secondaryCtaUrl || creative.contactWebsite || formData.destinationUrl || '#'}
                onClick={(e) => e.preventDefault()}
                className="py-2 px-2 rounded text-[10.5px] font-bold text-white text-center truncate"
                style={{ backgroundColor: accentCol }}
              >
                {creative.secondaryCtaText || 'Visit our Website'}
              </a>
            </div>
          </div>
        );

      case 'custom_ctas':
        if (ctaButtons.length <= 1) return null;
        return (
          <div key="custom_ctas" className="px-4 py-2 space-y-1.5 bg-white">
            {ctaButtons.slice(1).map((btn) => (
              <a
                key={btn.id}
                href={btn.url || '#'}
                onClick={(e) => e.preventDefault()}
                className="w-full py-1.5 px-3 rounded text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5"
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'custom'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
          >
            ✏️ Design Custom Email
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'template'
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
              const flagship = PURPOSE_BASED_PRESETS[0];
              setFormData(prev => ({
                ...prev,
                emailSubject: flagship.emailSubject,
                emailPreviewText: flagship.emailPreviewText,
                ctaText: flagship.primaryCtaText,
                destinationUrl: 'https://wa.me/919913421453',
                customCreative: {
                  ...DEFAULT_EXECUTIVE_CREATIVE,
                  ...flagship
                }
              }));
              setActiveTab('custom');
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-700 via-blue-700 to-indigo-700 text-white text-xs font-extrabold shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Load Boss Reference Layout</span>
          </button>
        </div>

        {/* Device Switcher for Preview */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setPreviewDevice('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${previewDevice === 'desktop'
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${previewDevice === 'mobile'
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1">
          {PURPOSE_BASED_PRESETS.map((pst) => (
            <button
              key={pst.id}
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  emailSubject: pst.emailSubject || prev.emailSubject,
                  emailPreviewText: pst.emailPreviewText || pst.subheading || prev.emailPreviewText,
                  ctaText: pst.primaryCtaText || prev.ctaText,
                  customCreative: {
                    ...DEFAULT_EXECUTIVE_CREATIVE,
                    themeColor: pst.themeColor || DEFAULT_EXECUTIVE_CREATIVE.themeColor,
                    accentColor: pst.accentColor || DEFAULT_EXECUTIVE_CREATIVE.accentColor,
                    stripColor: pst.stripColor || DEFAULT_EXECUTIVE_CREATIVE.stripColor,
                    headline: pst.headline,
                    subheading: pst.subheading,
                    categoryTag: pst.categoryTag ?? '',
                    h1Title: pst.h1Title,
                    customBodyText: pst.customBodyText,
                    primaryCtaText: pst.primaryCtaText,
                    mediaType: pst.mediaType || 'image',
                    heroImageUrl: creative.heroImageUrl || pst.heroImageUrl || DEFAULT_HERO_BANNER_URL,
                    intelligenceImageUrl: creative.intelligenceImageUrl || pst.intelligenceImageUrl || '',
                    showcaseHeading: pst.showcaseHeading || DEFAULT_EXECUTIVE_CREATIVE.showcaseHeading,
                    showcaseSubheading: pst.showcaseSubheading || DEFAULT_EXECUTIVE_CREATIVE.showcaseSubheading,
                    systemTiers: (
                      Array.isArray(creative.systemTiers) && creative.systemTiers.some((t) => t?.kitId)
                        ? creative.systemTiers
                        : (selectedKitObjects.length > 0 || effectiveKitsCatalog.length > 0
                          ? (selectedKitObjects.length > 0 ? selectedKitObjects : effectiveKitsCatalog).slice(0, 3).map((k, idx) => buildTierFromKit(k, idx))
                          : (pst.systemTiers || DEFAULT_SYSTEM_TIERS).map((t, i) => ({
                            ...t,
                            imageUrl: creative.systemTiers?.[i]?.imageUrl || t.imageUrl || ''
                          })))
                    ),
                    intelligenceHeading: pst.intelligenceHeading || DEFAULT_EXECUTIVE_CREATIVE.intelligenceHeading,
                    intelligenceText: pst.intelligenceText || DEFAULT_EXECUTIVE_CREATIVE.intelligenceText,
                    trustMetrics: pst.trustMetrics || DEFAULT_TRUST_METRICS,
                    primaryDualCtaText: pst.primaryDualCtaText || DEFAULT_EXECUTIVE_CREATIVE.primaryDualCtaText,
                    secondaryCtaText: pst.secondaryCtaText || DEFAULT_EXECUTIVE_CREATIVE.secondaryCtaText,
                    bulletPoints: pst.bulletPoints || []
                  }
                }));
                setActiveTab('custom');
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left transition-all hover:scale-[1.02] cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold text-white truncate group-hover:text-amber-300">
                  {pst.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ backgroundColor: pst.themeColor || '#1E3A8A' }} />
                <span className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ backgroundColor: pst.stripColor || '#EA580C' }} />
                <span className="text-[9px] text-slate-300 truncate">{pst.badge || pst.purpose}</span>
              </div>
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

                {/* Logo Tagline, Email, Helpline & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                      Footer / Contact Email
                    </label>
                    <input
                      type="text"
                      value={creative.contactEmail ?? 'support@solarkits.in'}
                      onChange={(e) => updateCreative({ contactEmail: e.target.value })}
                      placeholder="support@solarkits.in"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase">
                      Header Subtitle (Optional)
                    </label>
                    <input
                      type="text"
                      value={creative.headerTagline ?? ''}
                      onChange={(e) => updateCreative({ headerTagline: e.target.value })}
                      placeholder="Leave blank for clean Unity-style header"
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

                {/* 1-Click Harmonious Color Palettes + Fine-tune Pickers */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Color Combination Themes</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {COLOR_PALETTES.map((pal) => (
                        <button
                          key={pal.id}
                          type="button"
                          onClick={() => updateCreative({
                            themeColor: pal.themeColor,
                            accentColor: pal.accentColor,
                            stripColor: pal.stripColor
                          })}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-400 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          title={pal.name}
                        >
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.themeColor }} />
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.stripColor }} />
                          <span className="text-slate-700 dark:text-slate-200">{pal.name.split(' ')[0]} {pal.name.split(' ')[1]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-4">
                    <div className="flex items-center gap-1.5" title="Primary Brand Color">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Primary:</span>
                      <input
                        type="color"
                        value={creative.themeColor || '#1E3A8A'}
                        onChange={(e) => updateCreative({ themeColor: e.target.value })}
                        className="w-6 h-6 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5" title="Secondary / Highlight Accent">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Highlight:</span>
                      <input
                        type="color"
                        value={creative.accentColor || '#F59E0B'}
                        onChange={(e) => updateCreative({ accentColor: e.target.value })}
                        className="w-6 h-6 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5" title="Secondary CTA Button Color">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Action:</span>
                      <input
                        type="color"
                        value={creative.stripColor || '#EA580C'}
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
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${orderViewMode === 'flow'
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
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${orderViewMode === 'compact'
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
                              onClick={() => scrollToEditorSection(meta.editorAnchor, secId)}
                              className={`p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer ${isDragging
                                ? 'opacity-40 border-dashed border-blue-500 scale-[0.98]'
                                : isDragOver
                                  ? 'border-2 border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 shadow-md ring-2 ring-blue-400/40'
                                  : activeEditorSectionId === secId
                                    ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/30 dark:bg-blue-950/30'
                                    : isHovered
                                      ? 'border-blue-300 dark:border-blue-600 shadow-xs ring-1 ring-blue-300/30'
                                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                                }`}
                            >
                              {/* Left: Drag Grip Handle & Position Badge & Icon & Title */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                {/* Drag Handle */}
                                <div
                                  onClick={(e) => e.stopPropagation()}
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
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600"
                                >
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                                    Pos:
                                  </span>
                                  <select
                                    value={idx}
                                    onClick={(e) => e.stopPropagation()}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveSection(secId, 'up');
                                    }}
                                    className="p-1 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    title="Move 1 step Up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === activeSectionsOrder.length - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveSection(secId, 'down');
                                    }}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveToExtreme(secId, 'top');
                                    }}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                    title="Move directly to very Top"
                                  >
                                    <ChevronsUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === activeSectionsOrder.length - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveToExtreme(secId, 'bottom');
                                    }}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      scrollToEditorSection(meta.editorAnchor, secId);
                                    }}
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
                            onClick={() => scrollToEditorSection(meta.editorAnchor, secId)}
                            className={`p-2.5 rounded-xl border bg-white dark:bg-slate-800 shadow-2xs space-y-2 transition-all cursor-pointer ${isDragging
                              ? 'opacity-40 border-dashed border-blue-500'
                              : isDragOver
                                ? 'border-2 border-blue-500 bg-blue-50/70 dark:bg-blue-950/50'
                                : activeEditorSectionId === secId
                                  ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/30 dark:bg-blue-950/30'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                              }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  onClick={(e) => e.stopPropagation()}
                                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-600"
                                >
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
                                onClick={(e) => e.stopPropagation()}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveSection(secId, 'up');
                                  }}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-600 dark:text-slate-300 disabled:opacity-20 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === activeSectionsOrder.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveSection(secId, 'down');
                                  }}
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
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${creative.mediaType === 'banner' || !creative.mediaType
                      ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Executive Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCreative({ mediaType: 'image' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${creative.mediaType === 'image'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Photo / Image
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCreative({ mediaType: 'video' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${creative.mediaType === 'video'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <Video className="w-3.5 h-3.5 text-red-500" /> Video
                  </button>
                </div>

                {creative.mediaType !== 'video' && (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                        Hero Photo / Animated GIF (Generated Banner Ready — Editable):
                      </label>
                      <button
                        type="button"
                        onClick={() => updateCreative({ heroImageUrl: DEFAULT_HERO_BANNER_URL, heroImageCleared: false })}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                        title="Apply custom-generated SolarKits Kit Overview Hero Banner"
                      >
                        <Sparkles className="w-3 h-3" />
                        Use Generated Kit Hero Banner
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        data-banner-focus="heroUrl"
                        value={creative.heroImageUrl || ''}
                        onChange={(e) => updateCreative({ heroImageUrl: e.target.value, heroImageCleared: !e.target.value })}
                        placeholder="Upload file or paste image/GIF URL..."
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                      <label className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingAssetField === 'heroImageUrl' ? 'Uploading...' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingAssetField === 'heroImageUrl'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadEmailAsset(file, 'heroImageUrl', (url) => {
                                updateCreative({ heroImageUrl: url, heroImageCleared: false });
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
                {creative.mediaType === 'video' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                        Explainer Video URL (YouTube / Upload MP4):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={creative.videoUrl || ''}
                          onChange={(e) => updateCreative({ videoUrl: e.target.value })}
                          placeholder="Upload MP4 or paste YouTube URL..."
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                        />
                        <label className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingAssetField === 'videoUrl' ? 'Uploading...' : 'Upload Video'}</span>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            disabled={uploadingAssetField === 'videoUrl'}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadEmailAsset(file, 'videoUrl');
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                        Email Video Poster / Animated GIF Preview:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={creative.videoPosterUrl || ''}
                          onChange={(e) => updateCreative({ videoPosterUrl: e.target.value })}
                          placeholder="Upload GIF/image poster or paste URL..."
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                        />
                        <label className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingAssetField === 'videoPosterUrl' ? 'Uploading...' : 'Upload Poster'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingAssetField === 'videoPosterUrl'}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadEmailAsset(file, 'videoPosterUrl');
                            }}
                          />
                        </label>
                      </div>
                    </div>
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
                      data-banner-focus="primary"
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

                {/* Zigzag System Showcase Lineup Editor */}
                <div id="editor-section-showcase" className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                        <LayoutGrid className="w-3.5 h-3.5 text-teal-600" /> Zigzag System Lineup (Find Your Kit)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${campaignObjective === 'govt_tender_promotion'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}>
                        {loadingLiveCatalog
                          ? 'Syncing Kits...'
                          : campaignObjective === 'govt_tender_promotion'
                            ? `Govt Tender Kits Active (${effectiveKitsCatalog.length})`
                            : `Live Kits Config Active (${effectiveKitsCatalog.length})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSyncTiersFromLiveKits}
                        disabled={effectiveKitsCatalog.length === 0 && selectedKitObjects.length === 0}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors"
                        title="Sync cards dynamically from selected Step 3 / live kits"
                      >
                        <RefreshCw className="w-3 h-3" /> Sync Live Kits
                      </button>
                      <button
                        type="button"
                        onClick={handleAddTierCard}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Kit Card
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={creative.showcaseHeading ?? 'Find your kit.'}
                      onChange={(e) => updateCreative({ showcaseHeading: e.target.value })}
                      placeholder="Section Heading (e.g. Find your kit.)"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                    <input
                      type="text"
                      value={creative.showcaseSubheading ?? 'From residential rooftops to commercial & industrial plants.'}
                      onChange={(e) => updateCreative({ showcaseSubheading: e.target.value })}
                      placeholder="Section Subheading..."
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2.5">
                    {((Array.isArray(creative.systemTiers) && creative.systemTiers.length > 0)
                      ? creative.systemTiers
                      : (effectiveKitsCatalog.length > 0
                        ? effectiveKitsCatalog.slice(0, 3).map((k, kIdx) => buildTierFromKit(k, kIdx))
                        : DEFAULT_SYSTEM_TIERS)
                    ).map((tier, idx, tiersArr) => {
                      const matchedKit = findKitForTier(tier);
                      const kitPhotos = Array.isArray(matchedKit?.available_photos) ? matchedKit.available_photos : [];
                      const baseCount = Array.isArray(matchedKit?.base_components_details) ? matchedKit.base_components_details.length : 0;
                      const bosCount = Array.isArray(matchedKit?.bos_kits_details) ? matchedKit.bos_kits_details.length : 0;

                      return (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2">
                          {/* Row 1: Kit Selector Dropdown from Live Kits Config / Purpose-Filtered Catalog + Details + Remove */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-[10px] font-black shrink-0">
                              #{idx + 1}
                            </span>
                            <select
                              data-kit-select={idx}
                              value={tier.kitId || (matchedKit?.id ? String(matchedKit.id) : '')}
                              onChange={(e) => handleSelectKitForTier(idx, e.target.value)}
                              className="flex-1 min-w-[180px] px-2 py-1 text-[11px] font-bold rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                            >
                              <option value="">
                                {effectiveKitsCatalog.length > 0
                                  ? '-- Select Live Kit from Kits Configuration --'
                                  : '-- Custom / Loading Live Kits --'}
                              </option>
                              {effectiveKitsCatalog.map((kit) => {
                                const kName = kit.tender_name || kit.name || kit.combo_kit_name || `Kit #${kit.id}`;
                                const kMeta = [
                                  kit.capacity ? `${kit.capacity} kW` : '',
                                  kit.state_name || kit.brand_name || kit.system_type || ''
                                ].filter(Boolean).join(' • ');
                                return (
                                  <option key={kit.id} value={String(kit.id)}>
                                    {kName}{kMeta ? ` (${kMeta})` : ''}
                                  </option>
                                );
                              })}
                            </select>

                            {matchedKit && (
                              <button
                                type="button"
                                onClick={() => setViewingKitDetail(matchedKit)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold shrink-0 cursor-pointer"
                                title="Inspect Full Base Components, BOS Kits & Technical Specs"
                              >
                                <Eye className="w-3 h-3" />
                                View Details ({baseCount} Base / {bosCount} BOS)
                              </button>
                            )}

                            {tiersArr.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTierCard(idx)}
                                className="p-1 rounded-lg bg-slate-200/70 hover:bg-red-100 text-slate-500 hover:text-red-600 cursor-pointer shrink-0"
                                title="Remove Kit Card"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Row 2: Main Summary Fields (Clean Card Data - All Editable) */}
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={tier.eyebrow || ''}
                              onChange={(e) => handleUpdateTierField(idx, 'eyebrow', e.target.value)}
                              placeholder="Eyebrow"
                              className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 font-bold uppercase bg-white dark:bg-slate-800"
                            />
                            <input
                              type="text"
                              value={tier.title || ''}
                              onChange={(e) => handleUpdateTierField(idx, 'title', e.target.value)}
                              placeholder="Kit Title"
                              className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800"
                            />
                            <input
                              type="text"
                              value={tier.badge || ''}
                              onChange={(e) => handleUpdateTierField(idx, 'badge', e.target.value)}
                              placeholder="kW Badge"
                              className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800"
                            />
                          </div>

                          {/* Row 3: Concise Card Description */}
                          <input
                            type="text"
                            value={tier.desc || ''}
                            onChange={(e) => handleUpdateTierField(idx, 'desc', e.target.value)}
                            placeholder="Concise kit summary shown on card (click card / View Details for full component list)..."
                            className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />

                          {/* Row 4: Image URL + Cloudinary Upload + Live Preview Thumbnail */}
                          <div className="flex items-center gap-2 pt-0.5">
                            {tier.imageUrl ? (
                              <img
                                src={tier.imageUrl}
                                alt={tier.title || `Kit ${idx + 1}`}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <input
                              type="text"
                              value={tier.imageUrl || ''}
                              onChange={(e) => handleUpdateTierField(idx, 'imageUrl', e.target.value)}
                              placeholder={`System card #${idx + 1} image/GIF URL or upload...`}
                              className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 font-mono bg-white dark:bg-slate-800"
                            />
                            <label className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold cursor-pointer inline-flex items-center gap-1 shrink-0">
                              <Upload className="w-3 h-3" />
                              <span>{uploadingAssetField === `tier_${idx}` ? 'Uploading...' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingAssetField === `tier_${idx}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUploadEmailAsset(file, `tier_${idx}`, (uploadedUrl) => {
                                      handleUpdateTierField(idx, 'imageUrl', uploadedUrl);
                                    });
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {/* Row 5: Quick-Pick System Photos (Cover + BOS Photos from Kits Configuration) */}
                          {kitPhotos.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70 dark:border-slate-700/70">
                              <span className="text-[9.5px] font-bold text-slate-500 uppercase">System Photos:</span>
                              {kitPhotos.map((photo, pIdx) => (
                                <button
                                  key={`${photo.url}_${pIdx}`}
                                  type="button"
                                  onClick={() => handleUpdateTierField(idx, 'imageUrl', photo.url)}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9.5px] font-semibold cursor-pointer transition-colors ${tier.imageUrl === photo.url
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                                  title={`Use ${photo.label}`}
                                >
                                  <img src={photo.url} alt="" className="w-4 h-4 rounded object-cover" />
                                  <span className="truncate max-w-[90px]">{photo.label}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Row 6: Kit Card Button Destination Link / Datasheet PDF */}
                          <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1">
                            <span className="text-[9.5px] font-bold text-slate-500 uppercase block">
                              Card Button Destination Link ("{tier.badge || 'Explore'}" &amp; "View Specs"):
                            </span>
                            <DestinationLinkPicker
                              compact
                              value={tier.ctaUrl || 'https://store.solarkits.in/preconfigured-combo-kit'}
                              isPdf={Boolean(tier.isPdf)}
                              uploadFieldKey={`tier_pdf_${idx}`}
                              uploadingAssetField={uploadingAssetField}
                              onChange={(url, isPdfFlag) =>
                                handleUpdateTierField(idx, { ctaUrl: url, isPdf: Boolean(isPdfFlag) })
                              }
                              onUploadPdf={(file) =>
                                handleUploadEmailAsset(file, `tier_pdf_${idx}`, (uploadedUrl) => {
                                  handleUpdateTierField(idx, { ctaUrl: uploadedUrl, isPdf: true });
                                })
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Portal & Phone Animation Section Editor */}
                <div id="editor-section-intelligence" className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-sky-600" /> Portal &amp; Phone Animation Section
                  </span>
                  <input
                    type="text"
                    value={creative.intelligenceHeading ?? DEFAULT_EXECUTIVE_CREATIVE.intelligenceHeading}
                    onChange={(e) => updateCreative({ intelligenceHeading: e.target.value })}
                    placeholder="Intelligence Section Title..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={creative.intelligenceImageUrl || ''}
                      onChange={(e) => updateCreative({ intelligenceImageUrl: e.target.value })}
                      placeholder="Upload portal/phone GIF or paste URL..."
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-mono"
                    />
                    <label className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingAssetField === 'intelligenceImageUrl' ? 'Uploading...' : 'Upload GIF'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAssetField === 'intelligenceImageUrl'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadEmailAsset(file, 'intelligenceImageUrl');
                        }}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={creative.intelligenceText ?? DEFAULT_EXECUTIVE_CREATIVE.intelligenceText}
                    onChange={(e) => updateCreative({ intelligenceText: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* Feature Bullet Highlights & 3-Card Trust Metrics */}
                <div id="editor-section-benefits" className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase block">
                    3-Column Trust Metrics Strip (Rounded Highlight Cards)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(Array.isArray(creative.trustMetrics) && creative.trustMetrics.length > 0 ? creative.trustMetrics : DEFAULT_TRUST_METRICS).slice(0, 3).map((m, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
                        <input
                          type="text"
                          value={m.value}
                          onChange={(e) => {
                            const base = Array.isArray(creative.trustMetrics) && creative.trustMetrics.length > 0 ? [...creative.trustMetrics] : [...DEFAULT_TRUST_METRICS];
                            base[idx] = { ...base[idx], value: e.target.value };
                            updateCreative({ trustMetrics: base });
                          }}
                          className="w-full px-2 py-1 text-xs font-extrabold rounded border border-slate-200 dark:border-slate-700"
                          placeholder="e.g. 500+ MW"
                        />
                        <input
                          type="text"
                          value={m.label}
                          onChange={(e) => {
                            const base = Array.isArray(creative.trustMetrics) && creative.trustMetrics.length > 0 ? [...creative.trustMetrics] : [...DEFAULT_TRUST_METRICS];
                            base[idx] = { ...base[idx], label: e.target.value };
                            updateCreative({ trustMetrics: base });
                          }}
                          className="w-full px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-700"
                          placeholder="Description..."
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                      Optional Extra Highlight Cards
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pts = creative.bulletPoints || [];
                        updateCreative({ bulletPoints: [...pts, 'New Feature Point: Add detail and specification here'] });
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      + Add Extra Highlight
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(creative.bulletPoints || []).map((bp, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: idx % 2 === 0 ? (creative.themeColor || '#1E3A8A') : (creative.accentColor || '#F59E0B') }} />
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
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                          <div className="md:col-span-4 space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase block">Button Label</label>
                            <input
                              type="text"
                              data-cta-input={idx}
                              value={btn.text}
                              onChange={(e) => handleUpdateCta(btn.id, 'text', e.target.value)}
                              placeholder="CTA Button Label..."
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold bg-white dark:bg-slate-800"
                            />
                          </div>
                          <div className="md:col-span-8 space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase block">
                              Opens Platform Page / PDF Download (Tracked per User &amp; Button)
                            </label>
                            <DestinationLinkPicker
                              value={btn.url}
                              isPdf={Boolean(btn.isPdf)}
                              uploadFieldKey={`cta_pdf_${btn.id}`}
                              uploadingAssetField={uploadingAssetField}
                              onChange={(url, isPdfFlag) =>
                                handleUpdateCta(btn.id, { url, isPdf: Boolean(isPdfFlag) })
                              }
                              onUploadPdf={(file) =>
                                handleUploadEmailAsset(file, `cta_pdf_${btn.id}`, (uploadedUrl) => {
                                  handleUpdateCta(btn.id, { url: uploadedUrl, isPdf: true });
                                })
                              }
                            />
                          </div>
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
                          value={formData.couponCode || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                          placeholder="e.g. WELCOME2026"
                          className="w-full mt-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-amber-300 bg-white dark:bg-slate-800 text-amber-950 dark:text-amber-200 uppercase"
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

                {/* Dual Bottom Action Buttons Editor */}
                <div id="editor-section-closing" className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-rose-600" /> Dual Bottom Action Buttons &amp; Optional Pitch
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                        Left Button (Primary — e.g. Download Datasheet):
                      </label>
                      <input
                        type="text"
                        value={creative.primaryDualCtaText ?? 'Download Datasheet'}
                        onChange={(e) => updateCreative({ primaryDualCtaText: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold bg-white dark:bg-slate-800"
                        placeholder="Download Datasheet"
                      />
                      <DestinationLinkPicker
                        value={creative.primaryDualCtaUrl ?? 'https://store.solarkits.in/preconfigured-combo-kit'}
                        isPdf={Boolean(creative.primaryDualCtaIsPdf)}
                        uploadFieldKey="dual_left_pdf"
                        uploadingAssetField={uploadingAssetField}
                        onChange={(url, isPdfFlag) =>
                          updateCreative({ primaryDualCtaUrl: url, primaryDualCtaIsPdf: Boolean(isPdfFlag) })
                        }
                        onUploadPdf={(file) =>
                          handleUploadEmailAsset(file, 'dual_left_pdf', (uploadedUrl) => {
                            updateCreative({ primaryDualCtaUrl: uploadedUrl, primaryDualCtaIsPdf: true });
                          })
                        }
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">
                        Right Button (Accent — e.g. Visit our Website):
                      </label>
                      <input
                        type="text"
                        value={creative.secondaryCtaText ?? 'Visit our Website'}
                        onChange={(e) => updateCreative({ secondaryCtaText: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold bg-white dark:bg-slate-800"
                        placeholder="Visit our Website"
                      />
                      <DestinationLinkPicker
                        value={creative.secondaryCtaUrl ?? 'https://solarkits.in/'}
                        isPdf={Boolean(creative.secondaryCtaIsPdf)}
                        uploadFieldKey="dual_right_pdf"
                        uploadingAssetField={uploadingAssetField}
                        onChange={(url, isPdfFlag) =>
                          updateCreative({ secondaryCtaUrl: url, secondaryCtaIsPdf: Boolean(isPdfFlag) })
                        }
                        onUploadPdf={(file) =>
                          handleUploadEmailAsset(file, 'dual_right_pdf', (uploadedUrl) => {
                            updateCreative({ secondaryCtaUrl: uploadedUrl, secondaryCtaIsPdf: true });
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Closing Line (Optional):
                    </label>
                    <input
                      type="text"
                      value={creative.closingPitch ?? ''}
                      onChange={(e) => updateCreative({ closingPitch: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
                      placeholder="Optional closing punchline..."
                    />
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
              <div className={`bg-slate-900 text-white shadow-2xl overflow-hidden ${previewDevice === 'mobile'
                ? 'rounded-[2.5rem] p-3 border-4 border-slate-700'
                : 'rounded-2xl p-2 border border-slate-700'
                }`}>
                {/* Inbox Toolbar Mockup */}
                <div className="bg-slate-800 px-3 py-2 rounded-t-xl border-b border-slate-700 text-[11px] text-slate-300 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate">From: SolarKits Marketing &lt;marketing@solarkits.in&gt;</span>
                    <span>Live Preview</span>
                  </div>
                  <div className="font-bold text-white truncate text-xs">
                    {formData.emailSubject || `Special Wholesale Offer: ${dynamicKitNames}`}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {formData.emailPreviewText || `Exclusive wholesale allocation from ${activeWarehouseName}.`}
                  </div>
                </div>

                {/* Email Canvas with Clean Boss-Reference Header & 2-Column Footer */}
                <div className="bg-[#f9fafc] p-2">
                  <div className="bg-white text-slate-800 flex flex-col rounded-lg overflow-hidden shadow-xs border border-slate-200">

                    {/* 1. CLEAN CENTERED HEADER (PINNED TOP) */}
                    <div className="bg-white shrink-0 text-center z-10 pt-4 pb-2 px-4">
                      <img
                        src={creative.logoUrl || DEFAULT_EXECUTIVE_CREATIVE.logoUrl}
                        alt="SolarKits Official Logo"
                        className="h-8 mx-auto object-contain block"
                        style={{ maxHeight: '34px' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_EXECUTIVE_CREATIVE.logoUrl;
                        }}
                      />
                      {creative.headerTagline && (
                        <div className="text-[8.5px] font-bold tracking-widest uppercase mt-1 text-slate-500">
                          {creative.headerTagline}
                        </div>
                      )}
                    </div>

                    {/* 2. SCROLLABLE MIDDLE EMAIL CONTENT (ORDER CONTROLLED BY activeSectionsOrder) */}
                    <div className="bg-white text-slate-800 max-h-[460px] overflow-y-auto">
                      {activeSectionsOrder.map((secId, sIdx) => {
                        const meta = SECTION_METADATA_MAP[secId] || { label: secId, shortLabel: secId };
                        const isHovered = hoveredSectionId === secId;
                        return (
                          <div
                            key={secId}
                            id={`preview-section-${secId}`}
                            onMouseEnter={() => setHoveredSectionId(secId)}
                            onMouseLeave={() => setHoveredSectionId(null)}
                            onClick={() => scrollToEditorSection(meta.editorAnchor, secId)}
                            className={`relative transition-all duration-150 group cursor-pointer ${isHovered || activeEditorSectionId === secId
                              ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/10'
                              : ''
                              }`}
                            title="Click to jump to this section's editor & focus cursor"
                          >
                            {/* Live Section Marker Badge & Reorder Arrows in Preview */}
                            <div
                              className={`absolute top-1.5 right-1.5 z-30 flex items-center gap-1 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
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

                    {/* 3. CLEAN 2-COLUMN FOOTER (PINNED BOTTOM) */}
                    <div className="bg-white px-4 pt-2 pb-4 border-t border-slate-300 mx-3">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                        <div className="text-[10px] font-bold text-slate-600 text-left space-y-0.5">
                          <div>Email: <span style={{ color: creative.themeColor || '#1E3A8A' }}>{creative.contactEmail || 'support@solarkits.in'}</span></div>
                          <div>Telephone: {creative.contactPhone || '+91 99134 21453'}</div>
                          <div>{creative.footerAddress || '© 2026 SolarKits (India) Pvt. Ltd.'}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {Object.entries(SOLARKITS_MEDIA_ASSETS.socialIcons).map(([k, src]) => (
                            <img key={k} src={src} alt={k} className="w-5 h-5 rounded-full block" />
                          ))}
                        </div>
                      </div>
                      {creative.footerDisclaimer && (
                        <p className="text-[8.5px] text-slate-400 mt-1.5 text-left">{creative.footerDisclaimer}</p>
                      )}
                    </div>

                  </div>
                  <p className="text-center text-[9px] text-slate-500 pt-2 pb-1">
                    If you wish to unsubscribe from our updates, <span className="underline">click here</span>.
                  </p>
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
              {(effectiveKitsCatalog.length > 0 ? effectiveKitsCatalog : selectedKitObjects).map((k) => {
                const isSelected = selectedProductIds.includes(k.id);
                return (
                  <div
                    key={k.id}
                    onClick={() => handleToggleProduct(k.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isSelected
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-white ${isSelected ? 'bg-blue-600' : 'border border-slate-300'
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

      {/* KIT DETAILS & FULL COMPONENTS MODAL (NO KHICHDI ON CARDS) */}
      {viewingKitDetail && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setViewingKitDetail(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {(viewingKitDetail.tender_image_url || viewingKitDetail.kit_image || viewingKitDetail.image) ? (
                  <img
                    src={viewingKitDetail.tender_image_url || viewingKitDetail.kit_image || viewingKitDetail.image}
                    alt={viewingKitDetail.tender_name || viewingKitDetail.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
                    <Package className="w-7 h-7 text-teal-600" />
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {viewingKitDetail.is_govt_tender && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                        Govt Tender Kit{viewingKitDetail.state_name ? ` • ${viewingKitDetail.state_name}` : ''}
                      </span>
                    )}
                    {viewingKitDetail.category_name && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {viewingKitDetail.category_name}
                      </span>
                    )}
                    {viewingKitDetail.capacity && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-white">
                        {viewingKitDetail.capacity} kW
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                    {viewingKitDetail.tender_name || viewingKitDetail.name || viewingKitDetail.combo_kit_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    {viewingKitDetail.brand_name && <span>Brand: <strong className="text-slate-700 dark:text-slate-200">{viewingKitDetail.brand_name}</strong></span>}
                    {viewingKitDetail.system_type && <span>System: <strong className="text-slate-700 dark:text-slate-200">{viewingKitDetail.system_type}</strong></span>}
                    {viewingKitDetail.project_range && <span>Range: <strong className="text-slate-700 dark:text-slate-200">{viewingKitDetail.project_range}</strong></span>}
                    {viewingKitDetail.price != null && Number(viewingKitDetail.price) > 0 && (
                      <span>Price: <strong className="text-emerald-600">₹{Number(viewingKitDetail.price).toLocaleString('en-IN')}</strong></span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingKitDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {(viewingKitDetail.tender_description || viewingKitDetail.tagline || viewingKitDetail.description) && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {viewingKitDetail.tender_description || viewingKitDetail.tagline || viewingKitDetail.description}
                </div>
              )}

              {/* Base Components Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-600" />
                    Base Kit Components ({Array.isArray(viewingKitDetail.base_components_details) ? viewingKitDetail.base_components_details.length : 0})
                  </h4>
                  {viewingKitDetail.datasheet && (
                    <a
                      href={viewingKitDetail.datasheet}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold"
                    >
                      <FileText className="w-3.5 h-3.5" /> Datasheet <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {Array.isArray(viewingKitDetail.base_components_details) && viewingKitDetail.base_components_details.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-900/80 text-[10px] font-black uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Component / Product</th>
                          <th className="px-3 py-2">Template &amp; Subtype</th>
                          <th className="px-3 py-2">Brand / SKU</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {viewingKitDetail.base_components_details.map((comp, cIdx) => (
                          <tr key={cIdx} className="bg-white dark:bg-slate-800/50">
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{cIdx + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">
                              {comp.product_name || comp.template_name || 'Solar Component'}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                              <div>{comp.template_name || '-'}</div>
                              {comp.subtype_name && <div className="text-[10px] text-slate-400">{comp.subtype_name}</div>}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                              <div>{comp.brand_name || '-'}</div>
                              {comp.sku && <div className="text-[10px] font-mono text-slate-400">{comp.sku}</div>}
                            </td>
                            <td className="px-3 py-2 text-right font-black text-slate-900 dark:text-white">
                              {comp.qty ?? 1}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                    {viewingKitDetail.components_summary || 'No base component rows linked in Kits Configuration for this kit yet.'}
                  </div>
                )}
              </div>

              {/* BOS Kits Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-teal-600" />
                  BOS Kits &amp; Balance of System ({Array.isArray(viewingKitDetail.bos_kits_details) ? viewingKitDetail.bos_kits_details.length : 0})
                </h4>
                {Array.isArray(viewingKitDetail.bos_kits_details) && viewingKitDetail.bos_kits_details.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {viewingKitDetail.bos_kits_details.map((bos, bIdx) => (
                      <div key={bIdx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex items-start gap-2.5">
                        {bos.image ? (
                          <img src={bos.image} alt={bos.name} className="w-11 h-11 rounded-lg object-cover border border-slate-200 bg-white shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                            <Wrench className="w-4 h-4 text-teal-600" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-0.5 text-[11px]">
                          <div className="font-bold text-slate-900 dark:text-white truncate">{bos.name || `BOS Kit #${bIdx + 1}`}</div>
                          <div className="text-slate-500 truncate">
                            {[bos.brand_name, bos.sku].filter(Boolean).join(' • ') || 'Standard BOS Package'}
                          </div>
                          {(bos.templates || bos.subtypes) && (
                            <div className="text-[10px] text-slate-400 truncate">
                              {[bos.templates, bos.subtypes].filter(Boolean).join(' — ')}
                            </div>
                          )}
                          <div className="text-[10px] font-black text-teal-700">Qty: {bos.qty ?? 1}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                    No separate BOS kits attached to this configuration.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingKitDetail(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
