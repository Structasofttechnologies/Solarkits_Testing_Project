import React, { useState, useEffect, useCallback } from "react";
import {
  FiMonitor,
  FiEdit3,
  FiEye,
  FiEyeOff,
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
  FiUploadCloud,
  FiImage,
  FiSliders,
  FiCheck,
  FiChevronDown,
  FiHeart,
} from "react-icons/fi";
import { FaStore, FaBoxOpen, FaHandshake, FaComments, FaFire, FaBolt, FaSyncAlt } from "react-icons/fa";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  getWebsiteContent,
  updateWebsiteContent,
  resetWebsiteContent,
  uploadWebsiteImage,
} from "../../../../api/websiteContentApi";
import Loader from "../../../../components/Loader";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api";

const DEFAULT_SOLAR_STORE_STATE = {
  hero: {
    enabled: true,
    bg_image: "",
    slides: [],
    trust_badges: [],
    stats: [],
  },
  categories: {
    enabled: true,
    badge_text: "",
    heading: "",
    highlight_heading: "",
    subtitle: "",
    items: [],
    quality_note_1: "",
    quality_note_2: "",
  },
  featured_products: {
    enabled: true,
    badge_text: "Most Popular",
    heading: "Bestselling Solar Kits",
    subtitle: "Explore our most trusted pre-configured solar combo kits selected for high performance, durability and maximum subsidy benefits.",
    view_all_text: "View All Solar Kits",
    view_all_href: "/shop",
    field_visibility: {
      show_badge: true,
      show_watt: true,
      show_brand_category: true,
      show_price: true,
      show_mrp: true,
      show_discount: true,
      show_rating: true,
      show_reviews: true,
      show_stock_status: true,
      show_cta: true,
      show_quick_view: true,
    },
    items: [],
  },
  why_choose: {
    enabled: true,
    badge_text: "",
    heading: "",
    subtitle: "",
    items: [],
  },
  brands: {
    enabled: true,
    badge_text: "",
    heading: "",
    subtitle: "",
    cta_label: "",
    cta_href: "",
    items: [],
  },
  testimonials: {
    enabled: true,
    badge_text: "",
    heading: "",
    subtitle: "",
    overall_rating: "",
    review_count: "",
    platforms: [],
    items: [],
  },
  footer: {
    consultation_box: {
      badge: "",
      heading: "",
      subtitle: "",
      button_text: "",
    },
    description: "",
    phone: "",
    email: "",
    address: "",
    shop_links: [],
    help_links: [],
    policy_links: [],
    copyright_text: "",
    floating_whatsapp: {
      number: "",
      label: "",
    },
  },
};

export default function SolarStoreWebsite() {
  const [activeTab, setActiveTab] = useState("hero");
  const [sections, setSections] = useState(DEFAULT_SOLAR_STORE_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState(null);
  const [uploadingGlobalBg, setUploadingGlobalBg] = useState(false);

  // ── Best Seller Matrix & Catalog Kits Integration ──────────────────────────
  const [bestSellerKits, setBestSellerKits] = useState([]);
  const [loadingBestSellers, setLoadingBestSellers] = useState(false);
  const [bestSellerQuickAddId, setBestSellerQuickAddId] = useState("");
  const [previewCardIdx, setPreviewCardIdx] = useState(null);
  const [uploadingProductImgIdx, setUploadingProductImgIdx] = useState(null);

  const fetchBestSellerData = useCallback(async () => {
    setLoadingBestSellers(true);
    try {
      // 1. Fetch active configured best seller kits from the Best Seller Matrix
      const bsRes = await axios.get(
        `${API_URL}/best-seller-configs?status=active&limit=100&unique_id=ADM_COMBO_KITS&req_for=view`,
        { headers: authHeaderObj() }
      ).catch(() => null);

      // 2. Fetch catalog combo kits
      const ckRes = await axios.get(
        `${API_URL}/combo-kits/india/get-kits?limit=100&unique_id=ADM_COMBO_KITS&req_for=view`,
        { headers: authHeaderObj() }
      ).catch(() => null);

      const bsItems = bsRes?.data?.data || [];
      const ckItems = ckRes?.data?.data || [];

      const list = [];
      const seenIds = new Set();

      // Priority 1: Configured Best Seller items from Matrix
      bsItems.forEach((it) => {
        const kit = it.combo_kit_id || {};
        const id = (kit._id || kit.id || it._id)?.toString();
        seenIds.add(id);

        const sellingPrice = Number(kit.selling_price_cached || kit.selling_price || 95000);
        const basePrice = Number(kit.base_price_cached || kit.base_price || Math.round(sellingPrice * 1.25));
        const discount = Math.round(((basePrice - sellingPrice) / basePrice) * 100) || 20;
        const capacityNum = kit.capacity || (kit.name?.match(/(\d+(\.\d+)?)\s*k[wW]/i)?.[1]) || "";

        list.push({
          id: id,
          best_seller_id: it._id,
          source: "best_seller_matrix",
          name: kit.name || "Solar Combo Kit",
          brand: kit.brand_name || "SolarKits Prime",
          category: kit.inverter_mode === "multi" ? "Hybrid Solar Kit" : "On-Grid Solar Kit",
          badge: it.badge_text || "Our Best Seller",
          badgeColor: "bg-red-500 text-white",
          watt: capacityNum ? `${capacityNum}kW Kit` : "Complete Kit",
          price: sellingPrice,
          mrp: basePrice,
          discount: discount > 0 ? discount : 20,
          rating: 4.9,
          reviews: 189,
          img: kit.kit_image || "",
          region: it.state_name ? `${it.state_name}${it.district_name ? ` - ${it.district_name}` : ""}` : "All India",
          priority: it.priority || 1,
        });
      });

      // Priority 2: Catalog combo kits
      ckItems.forEach((ck) => {
        const id = (ck._id || ck.id)?.toString();
        if (!seenIds.has(id)) {
          const sellingPrice = Number(ck.selling_price_cached || ck.selling_price || 120000);
          const basePrice = Number(ck.base_price_cached || Math.round(sellingPrice * 1.25));
          const discount = Math.round(((basePrice - sellingPrice) / basePrice) * 100) || 20;
          const capacityNum = ck.capacity || (ck.name?.match(/(\d+(\.\d+)?)\s*k[wW]/i)?.[1]) || "";

          list.push({
            id: id,
            best_seller_id: null,
            source: "combo_kit_catalog",
            name: ck.name,
            brand: ck.brand_name || "SolarKits Prime",
            category: ck.inverter_mode === "multi" ? "Hybrid Solar Kit" : "On-Grid Solar Kit",
            badge: "Subsidy Eligible",
            badgeColor: "bg-emerald-500 text-white",
            watt: capacityNum ? `${capacityNum}kW Kit` : "Complete Kit",
            price: sellingPrice,
            mrp: basePrice,
            discount: discount > 0 ? discount : 20,
            rating: 4.8,
            reviews: 142,
            img: ck.kit_image || "",
            region: "Standard Catalog",
            priority: 99,
          });
        }
      });

      setBestSellerKits(list);
    } catch (e) {
      console.warn("Could not load best seller configurations:", e);
    } finally {
      setLoadingBestSellers(false);
    }
  }, []);

  useEffect(() => {
    fetchBestSellerData();
  }, [fetchBestSellerData]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWebsiteContent("solar-store");
      if (res && res.data && res.data.sections) {
        setSections({
          ...DEFAULT_SOLAR_STORE_STATE,
          ...res.data.sections,
        });
      }
    } catch (err) {
      console.warn("Could not load from API, using clean default store data:", err);
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
      const res = await updateWebsiteContent("solar-store", sections);
      if (res && res.status === "success") {
        setAlert({
          type: "success",
          message: "Solar Store landing page content saved & synced successfully!",
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
        message: err?.response?.data?.message || "Failed to save Solar Store content.",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all Solar Store content to factory defaults?")) return;
    setSaving(true);
    try {
      const res = await resetWebsiteContent("solar-store");
      if (res && res.status === "success") {
        setSections(res.data?.sections || DEFAULT_SOLAR_STORE_STATE);
        setAlert({ type: "success", message: "Solar Store reset to factory defaults successfully!" });
      }
    } catch (err) {
      setAlert({ type: "error", message: "Failed to reset content." });
    } finally {
      setSaving(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  // ── Slide Background Image Upload Handlers ─────────────────────────────────
  const handleSlideImageUpload = async (sIdx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAlert({ type: "error", message: "File size exceeds 10MB limit." });
      return;
    }

    setUploadingSlideIdx(sIdx);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await uploadWebsiteImage(formData);
      if (res && res.status === "success" && res.data?.url) {
        handleUpdateSlide(sIdx, "image", res.data.url);
        setAlert({
          type: "success",
          message: `Slide #${sIdx + 1} background image uploaded! Remember to click "Save All Changes" to publish.`,
        });
      } else {
        throw new Error(res?.message || "Upload failed");
      }
    } catch (err) {
      console.error("Slide image upload failed:", err);
      setAlert({
        type: "error",
        message: "Image upload failed: " + (err.response?.data?.message || err.message),
      });
    } finally {
      setUploadingSlideIdx(null);
      e.target.value = "";
    }
  };

  const handleGlobalBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAlert({ type: "error", message: "File size exceeds 10MB limit." });
      return;
    }

    setUploadingGlobalBg(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await uploadWebsiteImage(formData);
      if (res && res.status === "success" && res.data?.url) {
        setSections((prev) => ({
          ...prev,
          hero: {
            ...prev.hero,
            bg_image: res.data.url,
          },
        }));
        setAlert({
          type: "success",
          message: 'Global hero background image uploaded! Remember to click "Save All Changes" to publish.',
        });
      } else {
        throw new Error(res?.message || "Upload failed");
      }
    } catch (err) {
      console.error("Global background upload failed:", err);
      setAlert({
        type: "error",
        message: "Image upload failed: " + (err.response?.data?.message || err.message),
      });
    } finally {
      setUploadingGlobalBg(false);
      e.target.value = "";
    }
  };

  // ── Slide Helpers ──────────────────────────────────────────────────────────
  const handleAddSlide = () => {
    const newSlide = {
      id: Date.now(),
      tag: "⚡ New Solar Promotion",
      title: "New Seasonal Solar Kits\nExclusive Savings",
      subtitle: "Experience seamless clean energy with next-gen smart inverters and high-yield bifacial panels.",
      cta1: { label: "Shop Now", href: "#products" },
      cta2: { label: "Learn More", href: "#about" },
      bg: "from-[#0D3B6E] via-[#1565C0] to-[#29ABE2]",
      image: "",
      image_opacity: "30",
    };
    setSections((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        slides: [...(prev.hero?.slides || []), newSlide],
      },
    }));
  };

  const handleUpdateSlide = (idx, field, value) => {
    setSections((prev) => {
      const slides = [...(prev.hero?.slides || [])];
      slides[idx] = { ...slides[idx], [field]: value };
      return {
        ...prev,
        hero: { ...prev.hero, slides },
      };
    });
  };

  const handleDeleteSlide = (idx) => {
    setSections((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        slides: (prev.hero?.slides || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // ── Category Helpers ───────────────────────────────────────────────────────
  const handleAddCategory = () => {
    const newCat = {
      id: Date.now(),
      name: "New Solar Category",
      desc: "High-efficiency systems designed for reliability and savings.",
      count: "20+ Kits",
      label: "Special Kits",
      href: "#products",
    };
    setSections((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        items: [...(prev.categories?.items || []), newCat],
      },
    }));
  };

  const handleUpdateCategory = (idx, field, value) => {
    setSections((prev) => {
      const items = [...(prev.categories?.items || [])];
      items[idx] = { ...items[idx], [field]: value };
      return {
        ...prev,
        categories: { ...prev.categories, items },
      };
    });
  };

  const handleDeleteCategory = (idx) => {
    setSections((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        items: (prev.categories?.items || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // ── Featured Products Helpers & Best Seller Sync ──────────────────────────
  const handleAddProduct = () => {
    const newProd = {
      id: Date.now(),
      name: "SolarKits Custom Solar Combo Kit",
      category: "On-Grid Solar Kit",
      badge: "🔥 Best Seller",
      badgeColor: "bg-orange-500 text-white",
      rating: 4.9,
      reviews: 120,
      price: 145000,
      mrp: 195000,
      discount: 26,
      watt: "3kW Kit",
      brand: "SolarKits Prime",
      img: "",
      stock_status: "In Stock (Ready to Dispatch)",
      // Per-card visibility flags (all true by default)
      show_badge: true,
      show_watt: true,
      show_brand_category: true,
      show_price: true,
      show_mrp: true,
      show_discount: true,
      show_rating: true,
      show_reviews: true,
      show_stock_status: true,
      show_cta: true,
    };
    setSections((prev) => ({
      ...prev,
      featured_products: {
        ...prev.featured_products,
        items: [...(prev.featured_products?.items || []), newProd],
      },
    }));
  };

  // Sync / Import all active best seller items from Best Seller Configuration Matrix
  const handleSyncAllBestSellers = () => {
    if (!bestSellerKits || bestSellerKits.length === 0) {
      setAlert({
        type: "error",
        message: "No Best Seller kits found to sync. Configure kits in Best Seller Configuration first!",
      });
      return;
    }

    const currentVisibility = sections.featured_products?.field_visibility || {
      show_badge: true,
      show_watt: true,
      show_brand_category: true,
      show_price: true,
      show_mrp: true,
      show_discount: true,
      show_rating: true,
      show_reviews: true,
      show_stock_status: true,
      show_cta: true,
      show_quick_view: true,
    };

    // Filter to best seller matrix items first, or top catalog kits
    const matrixItems = bestSellerKits.filter((k) => k.source === "best_seller_matrix");
    const itemsToImport = matrixItems.length > 0 ? matrixItems : bestSellerKits.slice(0, 6);

    const formattedItems = itemsToImport.map((kit, idx) => ({
      id: kit.id || Date.now() + idx,
      best_seller_id: kit.best_seller_id,
      name: kit.name,
      brand: kit.brand,
      category: kit.category,
      badge: kit.badge,
      badgeColor: kit.badgeColor || "bg-red-500 text-white",
      watt: kit.watt,
      price: kit.price,
      mrp: kit.mrp,
      discount: kit.discount,
      rating: kit.rating || 4.9,
      reviews: kit.reviews || 150,
      img: kit.img || "",
      stock_status: "In Stock (Ready to Dispatch)",
      // Per-card visibility flags
      show_badge: true,
      show_watt: true,
      show_brand_category: true,
      show_price: true,
      show_mrp: true,
      show_discount: true,
      show_rating: true,
      show_reviews: true,
      show_stock_status: true,
      show_cta: true,
    }));

    setSections((prev) => ({
      ...prev,
      featured_products: {
        ...prev.featured_products,
        field_visibility: currentVisibility,
        items: formattedItems,
      },
    }));

    setAlert({
      type: "success",
      message: `✨ Successfully synced ${formattedItems.length} Best Seller Kits from Best Seller Configuration into showcase!`,
    });
    setTimeout(() => setAlert(null), 5000);
  };

  // Add a specific kit from Best Seller or Catalog
  const handleAddBestSellerKit = (kitId) => {
    const kit = bestSellerKits.find((k) => k.id === kitId || k.best_seller_id === kitId);
    if (!kit) return;

    const newProd = {
      id: kit.id || Date.now(),
      best_seller_id: kit.best_seller_id,
      name: kit.name,
      brand: kit.brand,
      category: kit.category,
      badge: kit.badge,
      badgeColor: kit.badgeColor || "bg-red-500 text-white",
      watt: kit.watt,
      price: kit.price,
      mrp: kit.mrp,
      discount: kit.discount,
      rating: kit.rating || 4.9,
      reviews: kit.reviews || 120,
      img: kit.img || "",
      stock_status: "In Stock (Ready to Dispatch)",
      show_badge: true,
      show_watt: true,
      show_brand_category: true,
      show_price: true,
      show_mrp: true,
      show_discount: true,
      show_rating: true,
      show_reviews: true,
      show_stock_status: true,
      show_cta: true,
    };

    setSections((prev) => ({
      ...prev,
      featured_products: {
        ...prev.featured_products,
        items: [...(prev.featured_products?.items || []), newProd],
      },
    }));

    setBestSellerQuickAddId("");
    setAlert({
      type: "success",
      message: `Added "${kit.name}" to Bestselling Kits showcase!`,
    });
    setTimeout(() => setAlert(null), 4000);
  };

  // Populate single card from a chosen kit
  const handlePopulateCardFromKit = (cardIdx, kitId) => {
    const kit = bestSellerKits.find((k) => k.id === kitId || k.best_seller_id === kitId);
    if (!kit) return;

    setSections((prev) => {
      const items = [...(prev.featured_products?.items || [])];
      const existing = items[cardIdx] || {};

      items[cardIdx] = {
        ...existing,
        id: kit.id || existing.id,
        best_seller_id: kit.best_seller_id,
        name: kit.name,
        brand: kit.brand,
        category: kit.category,
        badge: kit.badge,
        badgeColor: kit.badgeColor || existing.badgeColor || "bg-red-500 text-white",
        watt: kit.watt,
        price: kit.price,
        mrp: kit.mrp,
        discount: kit.discount,
        rating: kit.rating || existing.rating || 4.8,
        reviews: kit.reviews || existing.reviews || 120,
        img: kit.img || existing.img || "",
      };

      return {
        ...prev,
        featured_products: {
          ...prev.featured_products,
          items,
        },
      };
    });
  };

  // Toggle Global Visibility setting
  const handleToggleGlobalVisibility = (fieldKey) => {
    setSections((prev) => {
      const current = prev.featured_products?.field_visibility || {
        show_badge: true,
        show_watt: true,
        show_brand_category: true,
        show_price: true,
        show_mrp: true,
        show_discount: true,
        show_rating: true,
        show_reviews: true,
        show_stock_status: true,
        show_cta: true,
        show_quick_view: true,
      };

      return {
        ...prev,
        featured_products: {
          ...prev.featured_products,
          field_visibility: {
            ...current,
            [fieldKey]: !current[fieldKey],
          },
        },
      };
    });
  };

  // Toggle per-card Visibility setting
  const handleToggleProductFieldVisibility = (prodIdx, fieldKey) => {
    setSections((prev) => {
      const items = [...(prev.featured_products?.items || [])];
      const prod = items[prodIdx] || {};
      const currentVal = prod[fieldKey] !== false; // defaults to true
      items[prodIdx] = {
        ...prod,
        [fieldKey]: !currentVal,
      };
      return {
        ...prev,
        featured_products: {
          ...prev.featured_products,
          items,
        },
      };
    });
  };

  const handleUpdateProduct = (idx, field, value) => {
    setSections((prev) => {
      const items = [...(prev.featured_products?.items || [])];
      items[idx] = { ...items[idx], [field]: value };
      return {
        ...prev,
        featured_products: { ...prev.featured_products, items },
      };
    });
  };

  const handleDeleteProduct = (idx) => {
    setSections((prev) => ({
      ...prev,
      featured_products: {
        ...prev.featured_products,
        items: (prev.featured_products?.items || []).filter((_, i) => i !== idx),
      },
    }));
  };

  const handleProductImageUpload = async (prodIdx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAlert({ type: "error", message: "File size exceeds 10MB limit." });
      return;
    }

    try {
      setUploadingProductImgIdx(prodIdx);
      const formData = new FormData();
      formData.append("image", file);
      const res = await uploadWebsiteImage(formData);
      if (res && res.imageUrl) {
        handleUpdateProduct(prodIdx, "img", res.imageUrl);
        setAlert({ type: "success", message: "Product image uploaded successfully!" });
      }
    } catch (err) {
      console.error("Product image upload error:", err);
      setAlert({
        type: "error",
        message: err?.response?.data?.message || "Failed to upload product image.",
      });
    } finally {
      setUploadingProductImgIdx(null);
      setTimeout(() => setAlert(null), 4000);
    }
  };

  // ── Why Choose Us Helpers ──────────────────────────────────────────────────
  const handleAddFeature = () => {
    const newFeat = {
      emoji: "🌟",
      title: "New Feature Title",
      desc: "Description of the advantage or service benefit provided.",
      color: "bg-blue-50 border-blue-100",
      iconBg: "bg-primary-100",
    };
    setSections((prev) => ({
      ...prev,
      why_choose: {
        ...prev.why_choose,
        items: [...(prev.why_choose?.items || []), newFeat],
      },
    }));
  };

  const handleUpdateFeature = (idx, field, value) => {
    setSections((prev) => {
      const items = [...(prev.why_choose?.items || [])];
      items[idx] = { ...items[idx], [field]: value };
      return {
        ...prev,
        why_choose: { ...prev.why_choose, items },
      };
    });
  };

  const handleDeleteFeature = (idx) => {
    setSections((prev) => ({
      ...prev,
      why_choose: {
        ...prev.why_choose,
        items: (prev.why_choose?.items || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // ── Brand Helpers ──────────────────────────────────────────────────────────
  const handleAddBrand = () => {
    const newBrand = {
      id: Date.now(),
      name: "New Partner Brand",
      type: "Solar Kit Partner",
      description: "Certified component manufacturer integrated in complete SolarKits.",
    };
    setSections((prev) => ({
      ...prev,
      brands: {
        ...prev.brands,
        items: [...(prev.brands?.items || []), newBrand],
      },
    }));
  };

  const handleUpdateBrand = (idx, field, value) => {
    setSections((prev) => {
      const items = [...(prev.brands?.items || [])];
      items[idx] = { ...items[idx], [field]: value };
      return {
        ...prev,
        brands: { ...prev.brands, items },
      };
    });
  };

  const handleDeleteBrand = (idx) => {
    setSections((prev) => ({
      ...prev,
      brands: {
        ...prev.brands,
        items: (prev.brands?.items || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // ── Testimonial Helpers ────────────────────────────────────────────────────
  const handleAddTestimonial = () => {
    const newTestimonial = {
      id: Date.now(),
      name: "Happy Customer",
      city: "Ahmedabad, Gujarat",
      role: "Homeowner",
      rating: 5,
      review: "SolarKits transformed our rooftop energy! Very professional installation and genuine subsidy approval.",
      system: "3kW On-Grid System",
      savings: "₹2,500/mo",
      initials: "HC",
    };
    setSections((prev) => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        items: [...(prev.testimonials?.items || []), newTestimonial],
      },
    }));
  };

  const handleUpdateTestimonial = (idx, field, value) => {
    setSections((prev) => {
      const items = [...(prev.testimonials?.items || [])];
      items[idx] = { ...items[idx], [field]: value };
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

  if (loading) {
    return <Loader text="Loading Solar Store Landing Page configurations..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0 mt-1 shadow-sm">
            <FaStore size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-text-primary">Solar Store Landing Page CMS</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live on Port 5179
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                Full Dynamic Sync
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Customize the Solar Store Hero Carousels, Category Ribbons, Bestselling Products, Why Choose Us, Brand Partners, Customer Stories, and Footer Consultation desks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => window.open("http://localhost:5179", "_blank")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-hover text-text-primary text-sm font-semibold hover:border-primary/50 transition-all cursor-pointer"
          >
            <FiExternalLink />
            <span>Open Solar Store</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {[
          { id: "hero", label: "1. Hero Slides", icon: <FiMonitor /> },
          { id: "categories", label: "2. Categories", icon: <FaBoxOpen /> },
          { id: "featured_products", label: "3. Bestselling Kits", icon: <FiShoppingCart /> },
          { id: "why_choose", label: "4. Why Us", icon: <FiAward /> },
          { id: "brands", label: "5. Brands", icon: <FaHandshake /> },
          { id: "testimonials", label: "6. Reviews", icon: <FaComments /> },
          { id: "footer", label: "7. Footer & Desk", icon: <FiPhone /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                isActive
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

      {/* ── Tab 1: Hero Carousel & Stats ─────────────────────────────── */}
      {activeTab === "hero" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FiMonitor className="text-primary" size={20} />
                <span>Store Hero Carousel Slides & Quick Stats</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage promotional hero banners, sale announcements, trust badges, and floating statistics.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddSlide}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Hero Slide
            </button>
          </div>

          {/* Global Fallback Hero Background Banner */}
          <div className="p-4 rounded-xl border border-dashed border-border bg-surface-hover/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                  <FiImage className="text-primary" size={15} />
                  <span>Default Hero Background (Global fallback for all slides)</span>
                </h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Applies automatically to any carousel slide that does not have an individual custom background image.
                </p>
              </div>
              {sections.hero?.bg_image && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 shrink-0">
                  Global Image Configured
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={sections.hero?.bg_image || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, bg_image: e.target.value },
                  }))
                }
                placeholder="Global background image URL (e.g. https://... or Cloudinary link)"
                className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-primary focus:border-primary outline-none"
              />

              <label
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface border border-border hover:border-primary text-text-primary text-xs font-bold cursor-pointer transition-all shadow-xs shrink-0 ${
                  uploadingGlobalBg ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                <FiUploadCloud size={14} className={uploadingGlobalBg ? "animate-bounce text-primary" : "text-primary"} />
                <span>{uploadingGlobalBg ? "Uploading..." : "Upload Global Background"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  disabled={uploadingGlobalBg}
                  onChange={handleGlobalBgUpload}
                />
              </label>

              {sections.hero?.bg_image && (
                <button
                  type="button"
                  onClick={() =>
                    setSections((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, bg_image: "" },
                    }))
                  }
                  className="p-2 rounded-lg border border-border text-red-500 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                  title="Remove global fallback"
                >
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Slides List */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Hero Carousel Slides ({sections.hero?.slides?.length || 0})
            </h4>

            <div className="space-y-4">
              {(sections.hero?.slides || []).map((slide, sIdx) => (
                <div
                  key={slide.id || sIdx}
                  className="p-5 rounded-xl border border-border bg-surface-hover shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                      Slide #{sIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlide(sIdx)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="Delete Slide"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block mb-1">
                        Slide Badge / Tag
                      </label>
                      <input
                        type="text"
                        value={slide.tag || ""}
                        onChange={(e) => handleUpdateSlide(sIdx, "tag", e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block mb-1">
                        Gradient Theme
                      </label>
                      <input
                        type="text"
                        value={slide.bg || ""}
                        onChange={(e) => handleUpdateSlide(sIdx, "bg", e.target.value)}
                        placeholder="from-navy via-primary-700 to-primary-500"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-mono text-text-secondary"
                      />
                    </div>

                    {/* Slide Background Image Control */}
                    <div className="md:col-span-2 p-3.5 rounded-xl border border-border bg-surface space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-text-primary flex items-center gap-2">
                          <FiImage className="text-primary" size={16} />
                          <span>Slide Background Image</span>
                        </label>
                        {slide.image ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                            Custom Image Set
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-text-secondary bg-surface-hover px-2 py-0.5 rounded-md border border-border">
                            Using Default Hero Image
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Thumbnail Preview */}
                        <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-border bg-slate-900 shrink-0 group shadow-xs">
                          {slide.image ? (
                            <img
                              src={slide.image}
                              alt="Slide Background Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = "https://placehold.co/600x400?text=Preview+Error";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary text-[10px] p-2 text-center bg-surface-hover">
                              <FiImage size={20} className="mb-1 opacity-40 text-primary" />
                              <span className="text-[9px] font-medium">Default Solar Villa</span>
                            </div>
                          )}
                          {slide.image && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a
                                href={slide.image}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white text-[10px] font-bold bg-black/70 px-2 py-1 rounded flex items-center gap-1 hover:bg-black"
                              >
                                <FiEye size={12} /> Preview
                              </a>
                            </div>
                          )}
                        </div>

                        {/* URL input and upload button */}
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={slide.image || ""}
                              onChange={(e) => handleUpdateSlide(sIdx, "image", e.target.value)}
                              placeholder="Paste image URL (https://... or Cloudinary link) or click Upload"
                              className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-primary focus:border-primary outline-none"
                            />

                            <label
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-white hover:opacity-95 text-xs font-bold cursor-pointer transition-all shadow-xs shrink-0 ${
                                uploadingSlideIdx === sIdx ? "opacity-60 pointer-events-none" : ""
                              }`}
                            >
                              <FiUploadCloud size={14} className={uploadingSlideIdx === sIdx ? "animate-bounce" : ""} />
                              <span>{uploadingSlideIdx === sIdx ? "Uploading..." : "Upload Image"}</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/jpg"
                                className="hidden"
                                disabled={uploadingSlideIdx === sIdx}
                                onChange={(e) => handleSlideImageUpload(sIdx, e)}
                              />
                            </label>

                            {slide.image && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSlide(sIdx, "image", "")}
                                className="p-2 rounded-lg border border-border text-red-500 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                                title="Remove custom image (reset to default)"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-secondary">
                            <span>Recommended: 1920x800px or 16:9 banner (JPG, PNG, WEBP).</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[10px]">Image Opacity:</span>
                              <select
                                value={slide.image_opacity || "30"}
                                onChange={(e) => handleUpdateSlide(sIdx, "image_opacity", e.target.value)}
                                className="bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary font-semibold"
                              >
                                <option value="15">15% (Very Subtle)</option>
                                <option value="20">20%</option>
                                <option value="30">30% (Recommended)</option>
                                <option value="40">40%</option>
                                <option value="50">50% (Balanced)</option>
                                <option value="60">60%</option>
                                <option value="80">80% (Vibrant)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-text-secondary block mb-1">
                        Main Headline (Use \n for new line)
                      </label>
                      <input
                        type="text"
                        value={slide.title || ""}
                        onChange={(e) => handleUpdateSlide(sIdx, "title", e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-extrabold text-text-primary"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-text-secondary block mb-1">
                        Slide Subtitle / Description
                      </label>
                      <textarea
                        rows={2}
                        value={slide.subtitle || ""}
                        onChange={(e) => handleUpdateSlide(sIdx, "subtitle", e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block mb-1">
                        Primary CTA Label
                      </label>
                      <input
                        type="text"
                        value={slide.cta1?.label || ""}
                        onChange={(e) =>
                          handleUpdateSlide(sIdx, "cta1", { ...slide.cta1, label: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block mb-1">
                        Secondary CTA Label
                      </label>
                      <input
                        type="text"
                        value={slide.cta2?.label || ""}
                        onChange={(e) =>
                          handleUpdateSlide(sIdx, "cta2", { ...slide.cta2, label: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddSlide}
                className="w-full p-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer"
              >
                <FiPlus size={16} />
                <span>+ Add Another Hero Slide</span>
              </button>
            </div>
          </div>

          {/* Floating Stats & Trust Badges */}
          <div className="p-5 rounded-xl border border-border bg-surface-hover space-y-4">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Floating Stats & Trust Badges
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">
                  Stat 1 (Value & Label)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sections.hero?.stats?.[0]?.val || "10,000+"}
                    onChange={(e) => {
                      const stats = [...(sections.hero?.stats || [])];
                      stats[0] = { ...stats[0], val: e.target.value };
                      setSections((prev) => ({ ...prev, hero: { ...prev.hero, stats } }));
                    }}
                    className="w-1/3 px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
                  />
                  <input
                    type="text"
                    value={sections.hero?.stats?.[0]?.label || "Happy Customers"}
                    onChange={(e) => {
                      const stats = [...(sections.hero?.stats || [])];
                      stats[0] = { ...stats[0], label: e.target.value };
                      setSections((prev) => ({ ...prev, hero: { ...prev.hero, stats } }));
                    }}
                    className="w-2/3 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">
                  Stat 2 (Value & Label)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sections.hero?.stats?.[1]?.val || "50 MW+"}
                    onChange={(e) => {
                      const stats = [...(sections.hero?.stats || [])];
                      stats[1] = { ...stats[1], val: e.target.value };
                      setSections((prev) => ({ ...prev, hero: { ...prev.hero, stats } }));
                    }}
                    className="w-1/3 px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
                  />
                  <input
                    type="text"
                    value={sections.hero?.stats?.[1]?.label || "Installed Capacity"}
                    onChange={(e) => {
                      const stats = [...(sections.hero?.stats || [])];
                      stats[1] = { ...stats[1], label: e.target.value };
                      setSections((prev) => ({ ...prev, hero: { ...prev.hero, stats } }));
                    }}
                    className="w-2/3 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hero Quick Save Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <FiSave size={14} />
              <span>{saving ? "Saving Changes..." : "Save Hero Carousel & Background"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Tab 2: Categories ────────────────────────────────────────── */}
      {activeTab === "categories" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FaBoxOpen className="text-primary" size={20} />
                <span>Product Categories Ribbons</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Customize category cards, kit count counters, badges, and headline copy.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddCategory}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Category Card
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Badge Header
              </label>
              <input
                type="text"
                value={sections.categories?.badge_text || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    categories: { ...prev.categories, badge_text: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Main Heading
              </label>
              <input
                type="text"
                value={sections.categories?.heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    categories: { ...prev.categories, heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Highlighted Word(s)
              </label>
              <input
                type="text"
                value={sections.categories?.highlight_heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    categories: { ...prev.categories, highlight_heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-primary"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Subtitle Description
              </label>
              <input
                type="text"
                value={sections.categories?.subtitle || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    categories: { ...prev.categories, subtitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Category Cards ({sections.categories?.items?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handleAddCategory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <FiPlus size={14} /> Add Category
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(sections.categories?.items || []).map((cat, idx) => (
                <div
                  key={cat.id || idx}
                  className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-text-secondary bg-surface-hover px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete category"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleUpdateCategory(idx, "name", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        Count Label
                      </label>
                      <input
                        type="text"
                        value={cat.count}
                        onChange={(e) => handleUpdateCategory(idx, "count", e.target.value)}
                        placeholder="45+ Kits"
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        Badge Label
                      </label>
                      <input
                        type="text"
                        value={cat.label}
                        onChange={(e) => handleUpdateCategory(idx, "label", e.target.value)}
                        placeholder="On-Grid"
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={cat.desc}
                      onChange={(e) => handleUpdateCategory(idx, "desc", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary resize-none"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddCategory}
                className="p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer min-h-[200px]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                  <FiPlus size={20} />
                </div>
                <span className="font-bold text-sm">+ Add Category</span>
                <span className="text-[11px] text-text-secondary font-normal text-center">
                  Click to add another product category card
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Featured Products (Bestselling Solar Kits) ────────── */}
      {activeTab === "featured_products" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          {/* Top Header & Integration Info */}
          <div className="border-b border-border pb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <FiShoppingCart size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg font-bold text-text-primary tracking-tight">
                    Bestselling Solar Combo Kits Showcase
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Connected to Best Seller Matrix
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
                  Manage homepage showcase kits, sync with Best Seller Matrix, customize prices, and toggle field visibility (Show / Hide) for customer-facing cards.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={fetchBestSellerData}
                disabled={loadingBestSellers}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-primary text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="Refresh latest kits from Best Seller Configuration"
              >
                <FiRefreshCw className={loadingBestSellers ? "animate-spin text-blue-600" : "text-text-secondary"} />
                <span>Refresh Matrix</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAllBestSellers}
                disabled={loadingBestSellers || bestSellerKits.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                title="Import all active Best Seller configuration kits into this showcase form automatically"
              >
                <FaBolt className="text-amber-300 text-xs" />
                <span>Sync from Best Seller Matrix</span>
              </button>

              <button
                type="button"
                onClick={handleAddProduct}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-primary text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <FiPlus className="text-text-secondary" />
                <span>Add Blank Product</span>
              </button>
            </div>
          </div>

          {/* Quick Picker Bar: Add Specific Kit from Best Seller Matrix */}
          <div className="p-3.5 rounded-xl bg-surface-hover border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-200 flex items-center justify-center font-bold shrink-0">
                <FaStore size={14} />
              </div>
              <div>
                <span className="text-xs font-bold text-text-primary block">
                  Quick Add from Best Seller Matrix &amp; Catalog ({bestSellerKits.length} Kits Available)
                </span>
                <span className="text-[11px] text-text-secondary">
                  Select any pre-configured combo kit to instantly populate a showcase card with all details.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[340px] max-w-lg">
              <select
                value={bestSellerQuickAddId}
                onChange={(e) => setBestSellerQuickAddId(e.target.value)}
                className="flex-1 min-w-0 px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium text-text-primary shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">-- Choose Kit to Add to Showcase --</option>
                {bestSellerKits.map((k) => (
                  <option key={k.id || k.best_seller_id} value={k.id || k.best_seller_id}>
                    {k.source === "best_seller_matrix" ? "⭐ [Matrix] " : "📦 [Catalog] "}
                    {k.name} ({k.watt}) - ₹{Number(k.price || 0).toLocaleString("en-IN")} [{k.region || "All India"}]
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleAddBestSellerKit(bestSellerQuickAddId)}
                disabled={!bestSellerQuickAddId}
                className="shrink-0 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs whitespace-nowrap shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                + Add Kit
              </button>
            </div>
          </div>

          {/* ── Global Field Visibility Controls (Show / Hide) ── */}
          <div className="p-4 rounded-xl bg-surface border border-border shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-surface-hover text-text-primary">
                  <FiSliders size={14} />
                </span>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Storefront Card Display &amp; Field Visibility (Global Controls)
                </h4>
              </div>
              <span className="text-[11px] text-text-secondary">
                Click any field to toggle between <strong className="text-blue-600 font-semibold">Visible</strong> and <strong className="text-text-tertiary font-normal">Hidden</strong> on customer cards
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              {[
                { key: "show_badge", label: "Badge Tag", icon: FiTag, desc: "Best Seller / Subsidy Tag" },
                { key: "show_watt", label: "Watt / Capacity", icon: FiZap, desc: "kW Rating Badge" },
                { key: "show_brand_category", label: "Brand & Category", icon: FiAward, desc: "Brand • Category" },
                { key: "show_price", label: "Selling Price", icon: FiTag, desc: "Offer Price (₹)" },
                { key: "show_mrp", label: "MRP & Savings", icon: FiCheckCircle, desc: "Original MRP & You Save" },
                { key: "show_discount", label: "Discount %", icon: FiTag, desc: "Discount badge (X% OFF)" },
                { key: "show_rating", label: "Star Rating", icon: FiStar, desc: "Rating Stars & Score" },
                { key: "show_reviews", label: "Review Count", icon: FiMessageSquare, desc: "Total customer reviews" },
                { key: "show_stock_status", label: "Stock / Dispatch", icon: FiPackage, desc: "In Stock & Dispatch SLA" },
                { key: "show_cta", label: "Add to Cart CTA", icon: FiShoppingCart, desc: "Order / Cart CTA button" },
                { key: "show_quick_view", label: "Quick View Button", icon: FiEye, desc: "Quick View hover button" },
              ].map(({ key, label, icon: Icon, desc }) => {
                const isVisible = sections.featured_products?.field_visibility?.[key] !== false;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleGlobalVisibility(key)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isVisible
                        ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-xs"
                        : "bg-surface-hover text-text-tertiary border-border hover:bg-surface line-through opacity-70"
                    }`}
                    title={`${isVisible ? "Currently VISIBLE" : "Currently HIDDEN"}: ${desc}. Click to toggle.`}
                  >
                    <Icon className={`text-xs ${isVisible ? "text-blue-600" : "text-text-tertiary"}`} />
                    <span>{label}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isVisible ? "bg-blue-600" : "bg-text-tertiary/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Heading Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Badge Header
              </label>
              <input
                type="text"
                value={sections.featured_products?.badge_text || "Most Popular"}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    featured_products: { ...prev.featured_products, badge_text: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary shadow-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Section Heading
              </label>
              <input
                type="text"
                value={sections.featured_products?.heading || "Bestselling Solar Kits"}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    featured_products: { ...prev.featured_products, heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary shadow-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                View All CTA Label
              </label>
              <input
                type="text"
                value={sections.featured_products?.view_all_text || "View All Solar Kits"}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    featured_products: { ...prev.featured_products, view_all_text: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-primary shadow-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Subtitle Description
              </label>
              <input
                type="text"
                value={sections.featured_products?.subtitle || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    featured_products: { ...prev.featured_products, subtitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary shadow-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Showcase Products ({sections.featured_products?.items?.length || 0})
                </h4>
                <span className="text-[11px] text-text-tertiary">
                  (Changes reflect live on Solar Store homepage showcase)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddProduct}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs shadow-xs hover:bg-primary-600 transition-colors cursor-pointer"
              >
                <FiPlus size={14} /> Add Product Card
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(sections.featured_products?.items || []).map((prod, idx) => {
                const globalVis = sections.featured_products?.field_visibility || {};
                const cardShowBadge = prod.show_badge ?? globalVis.show_badge ?? true;
                const cardShowWatt = prod.show_watt ?? globalVis.show_watt ?? true;
                const cardShowBrand = prod.show_brand_category ?? globalVis.show_brand_category ?? true;
                const cardShowPrice = prod.show_price ?? globalVis.show_price ?? true;
                const cardShowMrp = prod.show_mrp ?? globalVis.show_mrp ?? true;
                const cardShowRating = prod.show_rating ?? globalVis.show_rating ?? true;
                const cardShowStock = prod.show_stock_status ?? globalVis.show_stock_status ?? true;
                const cardShowCta = prod.show_cta ?? globalVis.show_cta ?? true;
                const isPreviewActive = previewCardIdx === idx;

                return (
                  <div
                    key={prod.id || idx}
                    className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3.5 relative group hover:border-primary/40 transition-all"
                  >
                    {/* Card Top Action Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary bg-surface-hover border border-border px-2.5 py-1 rounded-lg">
                          Product #{idx + 1}
                        </span>
                        {prod.best_seller_id ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <FaFire className="text-amber-500 text-[10px]" /> Best Seller Tagged
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-hover text-text-secondary border border-border">
                            Custom Product
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {prod.category || "On-Grid Solar Kit"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewCardIdx(isPreviewActive ? null : idx)}
                          className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            isPreviewActive
                              ? "bg-primary text-white"
                              : "bg-surface-hover text-text-secondary hover:text-primary border border-border"
                          }`}
                          title="Toggle Live Card Preview"
                        >
                          <FiEye size={14} />
                          <span className="text-[11px]">{isPreviewActive ? "Edit" : "Preview"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(idx)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Auto-fill Dropdown: Pick from Best Seller Configuration */}
                    <div className="p-2.5 rounded-xl bg-surface-hover border border-border space-y-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase flex items-center justify-between">
                        <span>⚡ Load Data from Best Seller Kit</span>
                        <span className="text-[9px] font-semibold text-blue-600">Auto-fills card</span>
                      </label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) handlePopulateCardFromKit(idx, e.target.value);
                        }}
                        defaultValue=""
                        className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium text-text-primary outline-none focus:ring-1 focus:ring-primary shadow-xs"
                      >
                        <option value="">-- Choose Kit to Auto-Fill Card #{idx + 1} --</option>
                        {bestSellerKits.map((k) => (
                          <option key={k.id || k.best_seller_id} value={k.id || k.best_seller_id}>
                            {k.source === "best_seller_matrix" ? "⭐ " : "📦 "}
                            {k.name} [{k.kit_type || k.category || 'On-Grid'}] ({k.watt}) - ₹{Number(k.price || 0).toLocaleString("en-IN")}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Per-Card Field Visibility Chips */}
                    <div className="p-2.5 rounded-xl bg-surface-hover border border-border space-y-1.5">
                      <div className="text-[10px] font-bold text-text-secondary uppercase flex items-center justify-between">
                        <span>Card Field Visibility (Show / Hide):</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { key: "show_badge", label: "Badge", state: cardShowBadge },
                          { key: "show_watt", label: "Watt", state: cardShowWatt },
                          { key: "show_brand_category", label: "Brand", state: cardShowBrand },
                          { key: "show_price", label: "Price", state: cardShowPrice },
                          { key: "show_mrp", label: "MRP", state: cardShowMrp },
                          { key: "show_rating", label: "Rating", state: cardShowRating },
                          { key: "show_stock_status", label: "Stock", state: cardShowStock },
                          { key: "show_cta", label: "CTA", state: cardShowCta },
                        ].map(({ key, label, state }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleToggleProductFieldVisibility(idx, key)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer border ${
                              state
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-surface text-text-tertiary border-border line-through opacity-60"
                            }`}
                            title={`Click to ${state ? "Hide" : "Show"} ${label} for Product #${idx + 1}`}
                          >
                            {label}: {state ? "ON" : "OFF"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Preview Mode or Form Inputs */}
                    {isPreviewActive ? (
                      /* Live Visual Preview of Card */
                      <div className="p-4 rounded-xl border border-primary/40 bg-surface shadow-xs space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                          <span>📱 Live Storefront Card Preview</span>
                          <span className="text-[10px] text-text-tertiary font-normal">Only visible fields appear</span>
                        </div>

                        {/* Card Image Box */}
                        <div className="relative h-36 bg-surface-hover rounded-xl overflow-hidden flex items-center justify-center border border-border">
                          {cardShowBadge && prod.badge && (
                            <span className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold bg-orange-500 text-white shadow-xs">
                              {prod.badge}
                            </span>
                          )}

                          {prod.discount > 0 && globalVis.show_discount !== false && (
                            <span className="absolute right-2.5 top-2.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
                              {prod.discount}% OFF
                            </span>
                          )}

                          {prod.img ? (
                            <img src={prod.img} alt={prod.name} className="h-full w-full object-contain p-2" />
                          ) : (
                            <div className="text-text-tertiary text-center text-xs">
                              <FiPackage className="mx-auto mb-1 text-2xl" />
                              <span>Solar Combo Kit</span>
                            </div>
                          )}
                        </div>

                        {/* Card Info */}
                        <div className="space-y-1.5">
                          {cardShowBrand && (
                            <p className="text-[10px] font-bold uppercase text-primary tracking-wide">
                              {prod.brand ? `${prod.brand} • ` : ""}{prod.category || "Solar Kit"}
                            </p>
                          )}

                          <h5 className="font-bold text-xs text-text-primary leading-snug line-clamp-2">
                            {prod.name}
                          </h5>

                          {(cardShowWatt || cardShowRating) && (
                            <div className="flex items-center justify-between py-1">
                              {cardShowWatt ? (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  {prod.watt || "Complete Kit"}
                                </span>
                              ) : <span />}

                              {cardShowRating && (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                                  <FiStar className="fill-amber-400 text-amber-400" />
                                  <span>{prod.rating || 4.8}</span>
                                  {globalVis.show_reviews !== false && (
                                    <span className="text-[10px] text-text-tertiary">({prod.reviews || 120})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {cardShowStock && prod.stock_status && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>{prod.stock_status}</span>
                            </div>
                          )}

                          {(cardShowPrice || cardShowMrp) && (
                            <div className="pt-2 border-t border-border">
                              <div className="flex items-baseline gap-2">
                                {cardShowPrice && (
                                  <span className="text-base font-extrabold text-text-primary">
                                    ₹{Number(prod.price || 0).toLocaleString("en-IN")}
                                  </span>
                                )}
                                {cardShowMrp && prod.mrp > prod.price && (
                                  <span className="text-[11px] text-text-tertiary line-through">
                                    ₹{Number(prod.mrp || 0).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {cardShowCta && (
                            <div className="w-full py-2 bg-primary text-white text-center text-xs font-bold rounded-lg shadow-xs mt-2">
                              View &amp; Add to Cart
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Form Inputs for Editing */
                      <div className="space-y-3">
                        {/* Product Name */}
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary block mb-1">
                            Product Name
                          </label>
                          <input
                            type="text"
                            value={prod.name || ""}
                            onChange={(e) => handleUpdateProduct(idx, "name", e.target.value)}
                            placeholder="SolarKits Complete Combo Kit"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary shadow-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                          />
                        </div>

                        {/* Brand & Category */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary block mb-1 flex items-center justify-between">
                              <span>Brand</span>
                              {!cardShowBrand && <span className="text-[9px] text-red-500 font-semibold">(Hidden)</span>}
                            </label>
                            <input
                              type="text"
                              value={prod.brand || ""}
                              onChange={(e) => handleUpdateProduct(idx, "brand", e.target.value)}
                              placeholder="SolarKits Prime"
                              className={`w-full px-2.5 py-1.5 border border-border rounded-lg text-xs font-medium shadow-xs outline-none ${
                                !cardShowBrand ? "bg-surface-hover text-text-tertiary" : "bg-surface text-text-secondary focus:border-primary"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary block mb-1 flex items-center justify-between">
                              <span>Category / Kit Type</span>
                              {!cardShowBrand && <span className="text-[9px] text-red-500 font-semibold">(Hidden)</span>}
                            </label>
                            <input
                              type="text"
                              value={prod.category || ""}
                              onChange={(e) => handleUpdateProduct(idx, "category", e.target.value)}
                              placeholder="On-Grid Solar Kit"
                              className={`w-full px-2.5 py-1.5 border border-border rounded-lg text-xs font-medium shadow-xs outline-none ${
                                !cardShowBrand ? "bg-surface-hover text-text-tertiary" : "bg-surface text-text-secondary focus:border-primary"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Badge Tag & Capacity/Watt */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary block mb-1 flex items-center justify-between">
                              <span>Badge Tag</span>
                              {!cardShowBadge && <span className="text-[9px] text-red-500 font-semibold">(Hidden)</span>}
                            </label>
                            <input
                              type="text"
                              value={prod.badge || ""}
                              onChange={(e) => handleUpdateProduct(idx, "badge", e.target.value)}
                              placeholder="Our Best Seller"
                              className={`w-full px-2.5 py-1.5 border border-border rounded-lg text-xs font-bold shadow-xs outline-none ${
                                !cardShowBadge ? "bg-surface-hover text-text-tertiary" : "bg-surface text-emerald-600 focus:border-primary"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary block mb-1 flex items-center justify-between">
                              <span>Capacity / Watt</span>
                              {!cardShowWatt && <span className="text-[9px] text-red-500 font-semibold">(Hidden)</span>}
                            </label>
                            <input
                              type="text"
                              value={prod.watt || ""}
                              onChange={(e) => handleUpdateProduct(idx, "watt", e.target.value)}
                              placeholder="3kW Kit"
                              className={`w-full px-2.5 py-1.5 border border-border rounded-lg text-xs font-bold shadow-xs outline-none ${
                                !cardShowWatt ? "bg-surface-hover text-text-tertiary" : "bg-surface text-primary focus:border-primary"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Pricing Grid: Price, MRP, Discount */}
                        <div className={`p-3 rounded-xl border border-border space-y-2 ${
                          !cardShowPrice && !cardShowMrp ? "bg-surface-hover opacity-60" : "bg-surface-hover"
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-text-secondary uppercase">
                              Pricing &amp; Discounts
                            </span>
                            {(!cardShowPrice || !cardShowMrp) && (
                              <span className="text-[9px] text-red-500 font-semibold">
                                {!cardShowPrice && !cardShowMrp ? "(Prices Hidden)" : !cardShowPrice ? "(Price Hidden)" : "(MRP Hidden)"}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-text-secondary block mb-1">
                                Price (₹)
                              </label>
                              <input
                                type="number"
                                value={prod.price || 0}
                                onChange={(e) => handleUpdateProduct(idx, "price", Number(e.target.value))}
                                className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-xs font-black text-text-primary shadow-xs outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-text-secondary block mb-1">
                                MRP (₹)
                              </label>
                              <input
                                type="number"
                                value={prod.mrp || 0}
                                onChange={(e) => handleUpdateProduct(idx, "mrp", Number(e.target.value))}
                                className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary shadow-xs outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-text-secondary block mb-1">
                                Discount %
                              </label>
                              <input
                                type="number"
                                value={prod.discount || 0}
                                onChange={(e) => handleUpdateProduct(idx, "discount", Number(e.target.value))}
                                className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-xs font-bold text-red-500 shadow-xs outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Rating & Reviews */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary block mb-1 flex items-center justify-between">
                              <span>Star Rating</span>
                              {!cardShowRating && <span className="text-[9px] text-red-500 font-semibold">(Hidden)</span>}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              max="5"
                              value={prod.rating || 4.8}
                              onChange={(e) => handleUpdateProduct(idx, "rating", Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-bold text-amber-500 shadow-xs outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary block mb-1">
                              Review Count
                            </label>
                            <input
                              type="number"
                              value={prod.reviews || 100}
                              onChange={(e) => handleUpdateProduct(idx, "reviews", Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary shadow-xs outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        {/* Stock & Availability Status / Trial Kit */}
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary block mb-1 flex items-center justify-between">
                            <span>Stock Status &amp; Dispatch SLA</span>
                            {!cardShowStock && <span className="text-[9px] text-red-500 font-semibold">(Hidden)</span>}
                          </label>
                          <input
                            type="text"
                            value={prod.stock_status || ""}
                            onChange={(e) => handleUpdateProduct(idx, "stock_status", e.target.value)}
                            placeholder="In Stock (Dispatch in 24-48 Hrs) • Trial Kit Available"
                            className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium text-emerald-700 shadow-xs outline-none focus:border-primary"
                          />
                        </div>

                        {/* Product Image URL & Upload */}
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary block mb-1">
                            Product Image (URL or Upload)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={prod.img || ""}
                              onChange={(e) => handleUpdateProduct(idx, "img", e.target.value)}
                              placeholder="Image URL or upload..."
                              className="flex-1 px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary shadow-xs outline-none focus:border-primary"
                            />
                            <label className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text-primary text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-colors">
                              <FiUploadCloud size={14} />
                              <span>{uploadingProductImgIdx === idx ? "Uploading..." : "Upload"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleProductImageUpload(idx, e)}
                              />
                            </label>
                          </div>
                          {prod.img && (
                            <div className="mt-2 h-16 w-16 rounded-lg border border-border overflow-hidden bg-surface-hover flex items-center justify-center">
                              <img src={prod.img} alt={prod.name} className="h-full w-full object-contain" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add New Card Button */}
              <button
                type="button"
                onClick={handleAddProduct}
                className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-surface-hover/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-text-secondary hover:text-primary font-bold text-xs transition-all cursor-pointer min-h-[260px]"
              >
                <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-primary text-xl shadow-xs">
                  <FiPlus size={24} />
                </div>
                <span className="font-bold text-sm">+ Add Bestselling Product Card</span>
                <span className="text-[11px] text-text-tertiary font-normal text-center max-w-[200px]">
                  Add another combo kit card to the Solar Store showcase
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Why Choose Us ─────────────────────────────────────── */}
      {activeTab === "why_choose" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FiAward className="text-amber-500" size={20} />
                <span>Why Choose SolarKits (The Advantage)</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage the 6 value pillars highlighting warranty, certifications, pan-India delivery, and EMI.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddFeature}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Advantage Card
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Main Heading
              </label>
              <input
                type="text"
                value={sections.why_choose?.heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    why_choose: { ...prev.why_choose, heading: e.target.value },
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
                value={sections.why_choose?.subtitle || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    why_choose: { ...prev.why_choose, subtitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
              />
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(sections.why_choose?.items || []).map((feat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={feat.emoji}
                    onChange={(e) => handleUpdateFeature(idx, "emoji", e.target.value)}
                    className="w-10 text-center text-xl p-1 bg-surface-hover border border-border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteFeature(idx)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-secondary block">
                    Feature Title
                  </label>
                  <input
                    type="text"
                    value={feat.title}
                    onChange={(e) => handleUpdateFeature(idx, "title", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-secondary block">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={feat.desc}
                    onChange={(e) => handleUpdateFeature(idx, "desc", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary resize-none"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddFeature}
              className="p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer min-h-[180px]"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                <FiPlus size={20} />
              </div>
              <span className="font-bold text-sm">+ Add Advantage Card</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Tab 5: Brand Partners ────────────────────────────────────── */}
      {activeTab === "brands" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FaHandshake className="text-primary" size={20} />
                <span>Tier-1 Brand Partners Carousel</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage partner manufacturers (Waaree, Adani, Tata, Vikram, Sungrow, Growatt, etc.).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddBrand}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Partner Brand
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Section Heading
              </label>
              <input
                type="text"
                value={sections.brands?.heading || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    brands: { ...prev.brands, heading: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                CTA Button Text
              </label>
              <input
                type="text"
                value={sections.brands?.cta_label || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    brands: { ...prev.brands, cta_label: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-primary font-bold"
              />
            </div>
          </div>

          {/* Brands list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(sections.brands?.items || []).map((brand, idx) => (
              <div
                key={brand.id || idx}
                className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-text-secondary bg-surface-hover px-2 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteBrand(idx)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-secondary block">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={brand.name}
                    onChange={(e) => handleUpdateBrand(idx, "name", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-secondary block">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={brand.description}
                    onChange={(e) => handleUpdateBrand(idx, "description", e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddBrand}
              className="p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                <FiPlus size={20} />
              </div>
              <span className="font-bold text-sm">+ Add Brand Partner</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Tab 6: Customer Stories & Ratings ───────────────────────── */}
      {activeTab === "testimonials" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <FaComments className="text-emerald-500" size={20} />
                <span>Customer Stories, Reviews & Platform Ratings</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage customer feedback cards, star ratings, monthly savings proofs, and platform badges.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddTestimonial}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FiPlus /> Add Review Story
            </button>
          </div>

          {/* Overall Rating Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-hover border border-border">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Overall Star Rating
              </label>
              <input
                type="text"
                value={sections.testimonials?.overall_rating || "4.8"}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    testimonials: { ...prev.testimonials, overall_rating: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-black text-text-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                Review Count Copy
              </label>
              <input
                type="text"
                value={sections.testimonials?.review_count || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    testimonials: { ...prev.testimonials, review_count: e.target.value },
                  }))
                }
                placeholder="Based on 2,400+ reviews"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
              />
            </div>
          </div>

          {/* Testimonial Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Customer Story Cards ({sections.testimonials?.items?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handleAddTestimonial}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <FiPlus size={14} /> Add Story
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(sections.testimonials?.items || []).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-text-secondary bg-surface-hover px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTestimonial(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateTestimonial(idx, "name", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-bold text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        City / State
                      </label>
                      <input
                        type="text"
                        value={item.city}
                        onChange={(e) => handleUpdateTestimonial(idx, "city", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-secondary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        System Installed
                      </label>
                      <input
                        type="text"
                        value={item.system}
                        onChange={(e) => handleUpdateTestimonial(idx, "system", e.target.value)}
                        placeholder="3kW On-Grid System"
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-primary font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary block">
                        Monthly Savings
                      </label>
                      <input
                        type="text"
                        value={item.savings}
                        onChange={(e) => handleUpdateTestimonial(idx, "savings", e.target.value)}
                        placeholder="₹2,680/mo"
                        className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-emerald-600 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block">
                      Review Quote
                    </label>
                    <textarea
                      rows={3}
                      value={item.review}
                      onChange={(e) => handleUpdateTestimonial(idx, "review", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-hover border border-border rounded-lg text-xs text-text-primary resize-none"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddTestimonial}
                className="p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs transition-all cursor-pointer min-h-[220px]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                  <FiPlus size={22} />
                </div>
                <span className="font-bold text-sm">+ Add Review Story</span>
                <span className="text-[11px] text-text-secondary font-normal text-center">
                  Click to add another customer review card
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 7: Store Footer & Consultation Box ──────────────────── */}
      {activeTab === "footer" && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FiPhone className="text-primary" size={20} />
              <span>Store Footer, Consultation Desk & WhatsApp</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Configure the top quote CTA card, contact details, floating WhatsApp button, and copyright notice.
            </p>
          </div>

          {/* Consultation Box Card */}
          <div className="p-5 rounded-xl border border-border bg-surface-hover space-y-4">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Top Free Solar Consultation Box
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">
                  Box Headline
                </label>
                <input
                  type="text"
                  value={sections.footer?.consultation_box?.heading || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        consultation_box: {
                          ...prev.footer?.consultation_box,
                          heading: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">
                  Button Text
                </label>
                <input
                  type="text"
                  value={sections.footer?.consultation_box?.button_text || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        consultation_box: {
                          ...prev.footer?.consultation_box,
                          button_text: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary block mb-1">
                  Box Subtitle
                </label>
                <input
                  type="text"
                  value={sections.footer?.consultation_box?.subtitle || ""}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        consultation_box: {
                          ...prev.footer?.consultation_box,
                          subtitle: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text-secondary"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Store Company Description
              </label>
              <textarea
                rows={2}
                value={sections.footer?.description || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, description: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Support Phone Number
              </label>
              <input
                type="text"
                value={sections.footer?.phone || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, phone: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Support Email
              </label>
              <input
                type="text"
                value={sections.footer?.email || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, email: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Floating WhatsApp Number
              </label>
              <input
                type="text"
                value={sections.footer?.floating_whatsapp?.number || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      floating_whatsapp: {
                        ...prev.footer?.floating_whatsapp,
                        number: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="e.g. 919876543210"
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm font-mono text-emerald-600 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Office / Hub Location
              </label>
              <input
                type="text"
                value={sections.footer?.address || ""}
                onChange={(e) =>
                  setSections((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, address: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm text-text-primary"
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