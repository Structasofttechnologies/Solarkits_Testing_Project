import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  listIndustryContent,
  getIndustryContentDetail,
  createIndustryContent,
  updateIndustryContent,
  uploadContentMedia,
  deleteContentMedia,
  setContentIndustries,
  publishContent,
  unpublishContent,
  scheduleContent,
  archiveContent,
  toggleActiveIndustryContent,
  duplicateIndustryContent,
  bulkActionIndustryContent,
  getIndustryTypes,
  getActiveStatesList,
  getDistrictsByState,
  getProductConfigKits,
} from "../../../api/industryContentApi";
import ContentStatusBadge from "../../../components/industry/ContentStatusBadge";
import MediaUploadZone from "../../../components/industry/MediaUploadZone";
import ContentPreviewModal from "../../../components/industry/ContentPreviewModal";
import SchedulePickerModal from "../../../components/industry/SchedulePickerModal";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPlay,
  FiEye,
  FiPause,
  FiCalendar,
  FiArchive,
  FiLayers,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiSliders,
  FiGrid,
  FiList,
  FiCopy,
  FiMaximize2,
  FiDownload,
  FiShare2,
  FiArrowRight,
  FiCheckSquare,
  FiSquare,
  FiMonitor,
  FiClock,
  FiImage,
  FiFileText,
  FiVideo,
  FiChevronDown,
  FiChevronUp,
  FiZap,
  FiSun,
  FiMapPin,
  FiNavigation,
  FiPackage,
  FiGlobe,
} from "react-icons/fi";
import { MdOutlineDashboardCustomize, MdOutlineFactory } from "react-icons/md";

const INDIAN_STATES_FALLBACK = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const CONTENT_TYPES = [
  { value: "", label: "All Types", icon: FiGrid },
  { value: "HERO_BANNER", label: "Hero Banner", icon: FiMonitor },
  { value: "VIDEO", label: "Video", icon: FiVideo },
  { value: "PHOTO", label: "Photo", icon: FiImage },
  { value: "POSTER", label: "Poster", icon: FiFileText },
  { value: "GALLERY", label: "Gallery", icon: FiLayers },
  { value: "EXPLAINER_VIDEO", label: "Explainer", icon: FiPlay },
  { value: "IMAGE_SLIDER", label: "Img Slider", icon: FiImage },
  { value: "VIDEO_SLIDER", label: "Vid Slider", icon: FiVideo },
];

const FORM_CONTENT_TYPES = CONTENT_TYPES.filter((t) => t.value !== "");

const PLACEMENTS = [
  { value: "HERO", label: "Hero Banner (Top Visual)" },
  { value: "GALLERY", label: "Main Gallery Grid" },
  { value: "POSTER_HIGHLIGHT", label: "Poster Highlight" },
  { value: "VIDEO_HIGHLIGHT", label: "Video Highlight" },
  { value: "DASHBOARD_TOP", label: "Dashboard Top" },
  { value: "STOREFRONT_TOP", label: "Storefront Top" },
];



const STATUS_FILTERS = [
  { value: "", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

// ΓöÇΓöÇΓöÇ Industry icon helper ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const INDUSTRY_ICONS = [FiSun, MdOutlineFactory, FiZap, FiMonitor, FiLayers, FiVideo];
function getIndustryIcon(index) {
  return INDUSTRY_ICONS[index % INDUSTRY_ICONS.length];
}

const INDUSTRY_COLORS = [
  { bg: "bg-amber-50 dark:bg-amber-900/20", icon: "text-amber-600 dark:text-amber-400", ring: "ring-amber-400" },
  { bg: "bg-blue-50 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400", ring: "ring-blue-400" },
  { bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-400" },
  { bg: "bg-violet-50 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400", ring: "ring-violet-400" },
  { bg: "bg-rose-50 dark:bg-rose-900/20", icon: "text-rose-600 dark:text-rose-400", ring: "ring-rose-400" },
  { bg: "bg-cyan-50 dark:bg-cyan-900/20", icon: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-400" },
];

// ΓöÇΓöÇΓöÇ Sub-components ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function FormField({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function FieldInput({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#185ADB]/25 focus:border-[#185ADB] transition-all placeholder:text-slate-400"
      {...rest}
    />
  );
}

function FieldSelect({ value, onChange, children, ...rest }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#185ADB]/25 focus:border-[#185ADB] transition-all"
      {...rest}
    >
      {children}
    </select>
  );
}

// ΓöÇΓöÇΓöÇ Main Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export default function IndustryContentManagement() {
  const configSectionRef = useRef(null);

  // Data
  const [contentList, setContentList] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Filters
  const [selectedIndustryId, setSelectedIndustryId] = useState(""); // "" = All Industries
  const [selectedTypeTab, setSelectedTypeTab] = useState(""); // "" = All Types
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("GRID");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [schedulingItem, setSchedulingItem] = useState(null);

  // Form state
  const [title, setTitle] = useState("");
  const [internalName, setInternalName] = useState("");
  const [contentType, setContentType] = useState("HERO_BANNER");
  const [contentCategory, setContentCategory] = useState("INDUSTRY");
  const [targetAudience, setTargetAudience] = useState("BOTH");
  const [placement, setPlacement] = useState("HERO");
  const [heading, setHeading] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [resellerCtaLabel, setResellerCtaLabel] = useState("");
  const [resellerCtaUrl, setResellerCtaUrl] = useState("");
  const [distributorCtaLabel, setDistributorCtaLabel] = useState("");
  const [distributorCtaUrl, setDistributorCtaUrl] = useState("");
  const [priority, setPriority] = useState(0);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [assignedIndustryIds, setAssignedIndustryIds] = useState([]);
  const [activeMediaList, setActiveMediaList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [ctaExpanded, setCtaExpanded] = useState(false);
  // Filter: browse tab category
  const [selectedCategory, setSelectedCategory] = useState(""); // "" = All, "INDUSTRY", "GOVT_TENDER"

  // Location targeting state
  const [isAllStates, setIsAllStates] = useState(true);
  const [applicableStates, setApplicableStates] = useState([]);
  const [applicableDistricts, setApplicableDistricts] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [stateSearchText, setStateSearchText] = useState("");
  const [districtSearchText, setDistrictSearchText] = useState("");

  // Product Configurations Kit Linkage
  const [allSolarKits, setAllSolarKits] = useState([]);
  const [relatedKitIds, setRelatedKitIds] = useState([]);
  const [kitSearchText, setKitSearchText] = useState("");

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4500);
  };

  // ΓöÇΓöÇ Data Fetching ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  const fetchIndustries = useCallback(async () => {
    try {
      const res = await getIndustryTypes();
      if (res.status === "success" || res.success) {
        setIndustries(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load industries:", err);
    }
  }, []);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedTypeTab) params.content_type = selectedTypeTab;
      if (selectedIndustryId) params.industry_type_id = selectedIndustryId;
      if (selectedStatus) params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.content_category = selectedCategory;

      const res = await listIndustryContent(params);
      if (res.status === "success" || res.success) {
        setContentList(res.data?.contents || res.data || []);
      }
    } catch (err) {
      console.error("Failed to load content:", err);
      showAlert("error", "Failed to load industry content.");
    } finally {
      setLoading(false);
    }
  }, [selectedTypeTab, selectedIndustryId, selectedStatus, searchQuery, selectedCategory]);

  useEffect(() => { fetchIndustries(); }, [fetchIndustries]);
  useEffect(() => { fetchContents(); }, [fetchContents]);

  // Load active states and solar kits on mount
  useEffect(() => {
    getActiveStatesList().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setStatesList(res);
      } else {
        setStatesList(INDIAN_STATES_FALLBACK.map((name) => ({ id: name, name })));
      }
    });

    getProductConfigKits().then((res) => {
      setAllSolarKits(Array.isArray(res) ? res : []);
    });
  }, []);

  // Fetch districts for selected states
  useEffect(() => {
    if (isAllStates || applicableStates.length === 0) {
      setDistrictsList([]);
      return;
    }
    setLoadingDistricts(true);
    Promise.all(
      applicableStates.map(async (stName) => {
        const matched = statesList.find(
          (s) =>
            s.name?.toLowerCase() === stName.toLowerCase() ||
            String(s.id) === String(stName) ||
            String(s._id) === String(stName)
        );
        const stateParam = matched?.id || matched?._id || stName;
        return getDistrictsByState(stateParam);
      })
    )
      .then((results) => {
        const combined = results.flat();
        const seen = new Set();
        const unique = [];
        combined.forEach((d) => {
          const name = d.name || d.text || d;
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            unique.push(d);
          }
        });
        setDistrictsList(unique);
      })
      .finally(() => setLoadingDistricts(false));
  }, [applicableStates, isAllStates, statesList]);

  // ΓöÇΓöÇ Industry card click ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  const handleSelectIndustry = (id) => {
    setSelectedIndustryId(id);
    setSelectedTypeTab("");
    setSelectedStatus("");
    setSearchQuery("");
    setSelectedIds([]);
    setTimeout(() => {
      configSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // Count of content per industry
  const contentCountByIndustry = useMemo(() => {
    const map = {};
    contentList.forEach((c) => {
      (c.industries || []).forEach((ind) => {
        const iid = ind.id || ind._id || ind.industry_type_id || ind;
        map[iid] = (map[iid] || 0) + 1;
      });
    });
    return map;
  }, [contentList]);

  // ΓöÇΓöÇ Form Reset ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  const resetForm = () => {
    setEditingContent(null);
    setTitle("");
    setInternalName("");
    setContentType("HERO_BANNER");
    setContentCategory("INDUSTRY");
    setTargetAudience("BOTH");
    setPlacement("HERO");
    setHeading("");
    setShortDescription("");
    setResellerCtaLabel("");
    setResellerCtaUrl("");
    setDistributorCtaLabel("");
    setDistributorCtaUrl("");
    setPriority(0);
    setDisplayOrder(0);
    setIsFeatured(false);
    setAssignedIndustryIds(selectedIndustryId ? [String(selectedIndustryId)] : []);
    setActiveMediaList([]);
    setCtaExpanded(false);
    setIsAllStates(true);
    setApplicableStates([]);
    setApplicableDistricts([]);
    setRelatedKitIds([]);
    setStateSearchText("");
    setDistrictSearchText("");
    setKitSearchText("");
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = async (item) => {
    resetForm();
    setEditingContent(item);
    setTitle(item.title || "");
    setInternalName(item.internal_name || "");
    setContentType(item.content_type || "HERO_BANNER");
    setContentCategory(item.content_category || "INDUSTRY");
    setTargetAudience(item.target_audience || "BOTH");
    setPlacement(item.placement || "HERO");
    setHeading(item.heading || "");
    setShortDescription(item.short_description || "");
    setResellerCtaLabel(item.reseller_cta_label || "");
    setResellerCtaUrl(item.reseller_cta_url || "");
    setDistributorCtaLabel(item.distributor_cta_label || "");
    setDistributorCtaUrl(item.distributor_cta_url || "");
    setPriority(item.priority || 0);
    setDisplayOrder(item.display_order || 0);
    setIsFeatured(Boolean(item.is_featured));
    setIsAllStates(item.is_all_states !== false && (!item.applicable_states || item.applicable_states.length === 0));
    setApplicableStates(item.applicable_states || []);
    setApplicableDistricts(item.applicable_districts || []);
    setRelatedKitIds(item.related_kit_ids || []);

    const extractId = (x) => {
      if (!x) return null;
      if (typeof x === "string") return x;
      if (x._id) return String(x._id);
      if (x.id) return String(x.id);
      if (x.industry_type_id) {
        if (typeof x.industry_type_id === "object") {
          return String(x.industry_type_id._id || x.industry_type_id.id || x.industry_type_id);
        }
        return String(x.industry_type_id);
      }
      return String(x);
    };

    const indIds = (item.industries || []).map(extractId).filter(Boolean);
    setAssignedIndustryIds(indIds);

    try {
      const detailRes = await getIndustryContentDetail(item.id || item._id);
      if (detailRes.status === "success" || detailRes.success) {
        const d = detailRes.data?.content || detailRes.data;
        setActiveMediaList(d.media || []);
        if (d.industries && Array.isArray(d.industries) && d.industries.length > 0) {
          const detailIndIds = d.industries.map(extractId).filter(Boolean);
          setAssignedIndustryIds(detailIndIds);
        }
        if (d.applicable_states) setApplicableStates(d.applicable_states);
        if (d.applicable_districts) setApplicableDistricts(d.applicable_districts);
        if (d.related_kit_ids) setRelatedKitIds(d.related_kit_ids);
        if (d.is_all_states !== undefined) setIsAllStates(d.is_all_states);
      }
    } catch (_) {
      setActiveMediaList(item.media || []);
    }
    setIsEditorOpen(true);
  };

  // ΓöÇΓöÇ Save ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  const handleSaveContent = async (publishAfterSave = false) => {
    if (!title.trim()) {
      showAlert("error", "Content Title is required.");
      return;
    }

    if (publishAfterSave && assignedIndustryIds.length === 0) {
      showAlert("error", "Please select at least one industry before publishing live.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        internal_name: internalName.trim() || title.trim(),
        content_type: contentType,
        content_category: contentCategory,
        target_audience: targetAudience,
        placement,
        heading: heading.trim(),
        short_description: shortDescription.trim(),
        reseller_cta_label: resellerCtaLabel.trim(),
        reseller_cta_url: resellerCtaUrl.trim(),
        distributor_cta_label: distributorCtaLabel.trim(),
        distributor_cta_url: distributorCtaUrl.trim(),
        priority: Number(priority),
        display_order: Number(displayOrder),
        is_featured: isFeatured,
        industry_ids: assignedIndustryIds,
        industry_type_ids: assignedIndustryIds,
        is_all_states: isAllStates,
        applicable_states: isAllStates ? [] : applicableStates,
        applicable_districts: isAllStates ? [] : applicableDistricts,
        related_kit_ids: relatedKitIds,
      };

      let savedId = editingContent?._id || editingContent?.id;

      if (editingContent) {
        await updateIndustryContent(savedId, payload);
        showAlert("success", "Content updated successfully!");
      } else {
        const createRes = await createIndustryContent(payload);
        savedId = createRes.data?.id || createRes.data?._id || createRes.data?.content?._id;
        showAlert("success", "Content created successfully!");
      }

      if (savedId) {
        await setContentIndustries(savedId, {
          industry_ids: assignedIndustryIds,
          industry_type_ids: assignedIndustryIds,
        });
      }

      if (publishAfterSave && savedId) {
        await publishContent(savedId, {
          industry_ids: assignedIndustryIds,
          industry_type_ids: assignedIndustryIds,
        });
        showAlert("success", "Content saved & published live!");
      }

      setIsEditorOpen(false);
      fetchContents();
    } catch (err) {
      console.error("Save error:", err);
      showAlert("error", err.response?.data?.message || err.message || "Failed to save content.");
    } finally {
      setSaving(false);
    }
  };

  // ΓöÇΓöÇ Media handlers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  const handleUploadFile = async (formData) => {
    const id = editingContent?._id || editingContent?.id;
    if (!id) {
      showAlert("error", "Please save content details first before uploading media.");
      return;
    }
    try {
      const res = await uploadContentMedia(id, formData);
      if (res.status === "success" || res.success) {
        setActiveMediaList((prev) => [...prev, res.data?.media || res.data]);
        showAlert("success", "Media uploaded!");
      }
    } catch (err) {
      showAlert("error", "Upload failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleUploadExternalUrl = async (body) => {
    const id = editingContent?._id || editingContent?.id;
    if (!id) {
      showAlert("error", "Please save first.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("external_url", body.external_url);
      formData.append("media_type", body.media_type);
      formData.append("device_type", body.device_type);
      formData.append("is_primary", body.is_primary ? "true" : "false");
      const res = await uploadContentMedia(id, formData);
      if (res.status === "success" || res.success) {
        setActiveMediaList((prev) => [...prev, res.data?.media || res.data]);
        showAlert("success", "External URL attached!");
      }
    } catch (err) {
      showAlert("error", "Failed to attach media: " + err.message);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    try {
      await deleteContentMedia(mediaId);
      setActiveMediaList((prev) => prev.filter((m) => (m._id || m.id) !== mediaId));
      showAlert("success", "Media removed.");
    } catch (err) {
      showAlert("error", "Failed to delete media.");
    }
  };

  // ΓöÇΓöÇ Quick Actions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  const handleToggleActive = async (item) => {
    try {
      const id = item.id || item._id;
      const res = await toggleActiveIndustryContent(id);
      if (res.status === "success" || res.success) {
        setContentList((prev) =>
          prev.map((c) => ((c.id || c._id) === id ? { ...c, is_active: !c.is_active } : c))
        );
        showAlert("success", `Media ${item.is_active ? "paused" : "activated"}.`);
      }
    } catch (err) {
      showAlert("error", "Failed to toggle active status.");
    }
  };

  const handleDuplicate = async (item) => {
    try {
      const id = item.id || item._id;
      const res = await duplicateIndustryContent(id);
      if (res.status === "success" || res.success) {
        showAlert("success", `Duplicated "${item.title}"!`);
        fetchContents();
      }
    } catch (err) {
      showAlert("error", "Failed to duplicate.");
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishContent(id);
      showAlert("success", "Content published live!");
      fetchContents();
    } catch (err) {
      showAlert("error", err.response?.data?.message || err.message || "Failed to publish.");
    }
  };

  const handleUnpublish = async (id) => {
    try {
      await unpublishContent(id);
      showAlert("success", "Content moved to Draft.");
      fetchContents();
    } catch (err) {
      showAlert("error", err.response?.data?.message || err.message || "Failed to unpublish.");
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Archive this content?")) return;
    try {
      await archiveContent(id);
      showAlert("success", "Content archived.");
      fetchContents();
    } catch (err) {
      showAlert("error", err.response?.data?.message || err.message || "Failed to archive.");
    }
  };

  // ΓöÇΓöÇ Bulk Actions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(contentList.map((c) => c.id || c._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;
    if (action === "delete" && !window.confirm(`Delete ${selectedIds.length} items?`)) return;
    try {
      await bulkActionIndustryContent({ ids: selectedIds, action });
      showAlert("success", `Bulk ${action} completed!`);
      setSelectedIds([]);
      fetchContents();
    } catch (err) {
      showAlert("error", "Bulk action failed: " + (err.response?.data?.message || err.message));
    }
  };

  // ΓöÇΓöÇ Active industry name ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  const activeIndustry = industries.find(
    (ind) => (ind._id || ind.id) === selectedIndustryId
  );

  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // RENDER
  // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* ΓöÇΓöÇ Alert Toast ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      {alert && (
        <div
          className={`fixed top-5 right-5 z-[9999] p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold shadow-xl animate-in slide-in-from-top-2 duration-300 ${alert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
        >
          {alert.type === "success" ? <FiCheck size={15} /> : <FiAlertCircle size={15} />}
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className="ml-2 opacity-60 hover:opacity-100">
            <FiX size={13} />
          </button>
        </div>
      )}

      {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
          SECTION 1 ΓÇö HEADER
      ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl px-6 py-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#185ADB]/10 text-[#185ADB] text-[10px] font-black uppercase tracking-wider">
              Industry CMS
            </span>
            <span className="text-xs text-slate-400 font-semibold">v2.0</span>
          </div>
          <h1 className="font-heading font-black text-2xl text-slate-900 dark:text-white tracking-tight">
            Industry Media Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Select an industry below, then configure its media content.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#185ADB] hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <FiPlus size={15} />
          <span>New Industry Content</span>
        </button>
      </div>

      {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
          SECTION 2 ΓÇö INDUSTRY SELECTOR
      ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1</p>
            <h2 className="font-heading font-black text-base text-slate-900 dark:text-white">
              Select Industry
            </h2>
          </div>
          {selectedIndustryId && (
            <button
              onClick={() => handleSelectIndustry("")}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <FiX size={11} /> Clear selection
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {/* All Industries card */}
          <button
            onClick={() => handleSelectIndustry("")}
            className={`group flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer min-h-[100px] ${selectedIndustryId === ""
                ? "border-[#185ADB] bg-[#185ADB]/5 dark:bg-[#185ADB]/10 shadow-md shadow-blue-500/10"
                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
              }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedIndustryId === ""
                  ? "bg-[#185ADB] text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-slate-300"
                }`}
            >
              <FiGrid size={18} />
            </div>
            <div className="text-center">
              <p className={`text-xs font-black leading-tight ${selectedIndustryId === "" ? "text-[#185ADB]" : "text-slate-700 dark:text-slate-200"}`}>
                All Industries
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                {contentList.length} items
              </p>
            </div>
            {selectedIndustryId === "" && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#185ADB]" />
            )}
          </button>

          {/* Industry cards */}
          {industries.map((ind, idx) => {
            const id = ind._id || ind.id;
            const isActive = selectedIndustryId === id;
            const color = INDUSTRY_COLORS[idx % INDUSTRY_COLORS.length];
            const Icon = getIndustryIcon(idx);
            const count = contentCountByIndustry[id] || 0;

            return (
              <button
                key={id}
                onClick={() => handleSelectIndustry(id)}
                className={`relative group flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer min-h-[100px] ${isActive
                    ? `border-[#185ADB] bg-[#185ADB]/5 dark:bg-[#185ADB]/10 shadow-md shadow-blue-500/10`
                    : `border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800`
                  }`}
              >
                {isActive && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#185ADB]" />
                )}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive
                      ? "bg-[#185ADB] text-white scale-105"
                      : `${color.bg} ${color.icon}`
                    }`}
                >
                  <Icon size={18} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-black leading-tight line-clamp-2 ${isActive ? "text-[#185ADB]" : "text-slate-700 dark:text-slate-200"}`}>
                    {ind.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {count} items
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
          SECTION 3 ΓÇö CONFIGURATION PANEL
      ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
      <div ref={configSectionRef} className="space-y-4">

        {/* Config Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2</p>
            <h2 className="font-heading font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              Configure Content
              {activeIndustry && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#185ADB]/10 text-[#185ADB]">
                  {activeIndustry.name}
                </span>
              )}
              {!activeIndustry && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500">
                  All Industries
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Filter toolbar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          {/* Content Type Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {CONTENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = selectedTypeTab === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedTypeTab(type.value)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                >
                  <Icon size={12} />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom row: status chips + search + view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status chips */}
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSelectedStatus(s.value)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer border ${selectedStatus === s.value
                      ? "bg-[#185ADB] border-[#185ADB] text-white"
                      : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                    }`}
                >
                  {s.label}
                </button>
              ))}

              {/* Search */}
              <div className="relative">
                <FiSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#185ADB]/30 w-40"
                />
              </div>
            </div>

            {/* Right: view toggle + refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode("GRID")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "GRID" ? "bg-white dark:bg-slate-700 text-[#185ADB] shadow-xs" : "text-slate-400"}`}
                  title="Grid View"
                >
                  <FiGrid size={13} />
                </button>
                <button
                  onClick={() => setViewMode("TABLE")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "TABLE" ? "bg-white dark:bg-slate-700 text-[#185ADB] shadow-xs" : "text-slate-400"}`}
                  title="List View"
                >
                  <FiList size={13} />
                </button>
              </div>
              <button
                onClick={fetchContents}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#185ADB] transition-colors cursor-pointer"
                title="Refresh"
              >
                <FiRefreshCw size={13} className={loading ? "animate-spin text-[#185ADB]" : ""} />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-black text-blue-800 dark:text-blue-200">
              <FiCheckSquare size={14} />
              <span>{selectedIds.length} items selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleBulkAction("publish")} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer">Publish All</button>
              <button onClick={() => handleBulkAction("pause")} className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer">Pause All</button>
              <button onClick={() => handleBulkAction("archive")} className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer">Archive</button>
              <button onClick={() => handleBulkAction("delete")} className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer">Delete</button>
              <button onClick={() => setSelectedIds([])} className="text-[11px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer">Clear</button>
            </div>
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
                <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl" />
                <div className="h-3.5 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              </div>
            ))}
          </div>
        ) : contentList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-14 text-center border border-slate-200 dark:border-slate-800 border-dashed space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <FiImage size={26} />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-slate-800 dark:text-white">No Content Found</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-medium max-w-xs mx-auto">
                {selectedIndustryId
                  ? `No media content for ${activeIndustry?.name || "this industry"} yet.`
                  : "No content matched the current filters."}
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#185ADB] text-white text-xs font-black shadow-md cursor-pointer"
            >
              <FiPlus size={14} /> Add First Media
            </button>
          </div>
        ) : viewMode === "GRID" ? (
          /* ΓöÇΓöÇΓöÇ Grid View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contentList.map((item) => {
              const id = item.id || item._id;
              const isSelected = selectedIds.includes(id);
              const thumb = item.media?.[0]?.thumbnail_url || item.media?.[0]?.url || item.thumbnail_url;
              const isVideo = item.content_type === "VIDEO" || item.content_type === "EXPLAINER_VIDEO";

              return (
                <div
                  key={id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col group ${isSelected
                      ? "border-[#185ADB] ring-2 ring-[#185ADB]/15 shadow-md"
                      : "border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                        <FiImage size={24} />
                        <span className="text-[10px] font-bold mt-1 opacity-60">No Media</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Checkbox */}
                    <button
                      onClick={() => handleSelectRow(id)}
                      className="absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-lg bg-black/50 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
                    >
                      {isSelected ? <FiCheckSquare size={13} className="text-blue-400" /> : <FiSquare size={13} />}
                    </button>

                    {/* Status */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <ContentStatusBadge status={item.status} />
                    </div>

                    {/* Video play icon */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-9 h-9 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                          <FiPlay size={14} className="text-white ml-0.5 fill-white" />
                        </div>
                      </div>
                    )}

                    {/* Bottom meta */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider">
                        {item.content_type?.replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-md backdrop-blur-sm text-[9px] font-black uppercase tracking-wider ${item.content_category === "GOVT_TENDER"
                            ? "bg-amber-500/80 text-white"
                            : "bg-[#185ADB]/80 text-white"
                          }`}>
                          {item.content_category === "GOVT_TENDER" ? "GOVT" : "INDUSTRY"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-0.5">
                      <h4 className="font-heading font-black text-[13px] text-slate-900 dark:text-white line-clamp-1">
                        {item.title}
                      </h4>
                      {item.heading && (
                        <p className="text-[11px] font-semibold text-[#185ADB] line-clamp-1">{item.heading}</p>
                      )}
                      {item.short_description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.short_description}</p>
                      )}
                    </div>

                    {/* Geolocation & Linked Kits Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <FiMapPin size={9} className="text-[#185ADB]" />
                        {item.is_all_states !== false && (!item.applicable_states || item.applicable_states.length === 0)
                          ? "Pan-India"
                          : item.applicable_states.slice(0, 2).join(", ") + (item.applicable_states.length > 2 ? ` +${item.applicable_states.length - 2}` : "")}
                      </span>
                      {item.related_kit_ids?.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200/40 flex items-center gap-1">
                          <FiPackage size={9} />
                          {item.related_kit_ids.length} Kit(s) Linked
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-all ${item.is_active
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {item.is_active ? "Active" : "Paused"}
                      </button>

                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleDuplicate(item)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer" title="Duplicate">
                          <FiCopy size={12} />
                        </button>
                        <button onClick={() => handleOpenEditModal(item)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-[#185ADB] transition-colors cursor-pointer" title="Edit">
                          <FiEdit2 size={12} />
                        </button>
                        {item.status === "PUBLISHED" ? (
                          <button onClick={() => handleUnpublish(id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors cursor-pointer" title="Unpublish">
                            <FiPause size={12} />
                          </button>
                        ) : (
                          <button onClick={() => handlePublish(id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors cursor-pointer" title="Publish">
                            <FiCheck size={12} />
                          </button>
                        )}
                        <button onClick={() => handleArchive(id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer" title="Archive">
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ΓöÇΓöÇΓöÇ Table View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === contentList.length && contentList.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="p-4">Asset</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Audience</th>
                  <th className="p-4">Placement</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contentList.map((item) => {
                  const id = item.id || item._id;
                  const isSelected = selectedIds.includes(id);
                  const thumb = item.media?.[0]?.thumbnail_url || item.thumbnail_url;
                  return (
                    <tr
                      key={id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                    >
                      <td className="p-4">
                        <input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(id)} className="rounded" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-8 rounded-lg bg-slate-900 overflow-hidden shrink-0">
                            {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{item.title}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{item.heading || "ΓÇö"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-[10px] uppercase text-slate-500">{item.content_type?.replace("_", " ")}</td>
                      <td className="p-4 font-bold text-[10px] uppercase text-[#185ADB]">
                        {item.target_audience === "RESELLER" ? "Franchise" : item.target_audience === "DISTRIBUTOR" ? "EPC" : item.target_audience}
                      </td>
                      <td className="p-4 text-[11px] font-semibold text-slate-500">{item.placement}</td>
                      <td className="p-4"><ContentStatusBadge status={item.status} /></td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleOpenEditModal(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#185ADB] cursor-pointer" title="Edit"><FiEdit2 size={12} /></button>
                          <button onClick={() => handleDuplicate(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" title="Duplicate"><FiCopy size={12} /></button>
                          <button onClick={() => handleArchive(id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 cursor-pointer" title="Delete"><FiTrash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
          CONTENT FORM MODAL (Simplified Single-Page)
      ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-8">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#185ADB]">
                  {editingContent ? "Edit Content" : "New Content"}
                </span>
                <h3 className="font-heading font-black text-base text-slate-900 dark:text-white mt-0.5">
                  {editingContent ? editingContent.title : "Create Industry Media"}
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-7">

              {/* ΓöÇΓöÇΓöÇ Section A: Content Info ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="w-5 h-5 rounded-md bg-[#185ADB] text-white text-[10px] font-black flex items-center justify-center">A</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Content Info</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Content Title" required>
                    <FieldInput
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Commercial Rooftop Solar Showcase"
                    />
                  </FormField>
                  <FormField label="Content Type" required>
                    <FieldSelect value={contentType} onChange={(e) => setContentType(e.target.value)}>
                      {FORM_CONTENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </FieldSelect>
                  </FormField>
                </div>

                {/* Browse Tab Category */}
                <FormField
                  label="Browse Tab Category"
                  required
                  hint="Determines which store browse tab this content appears under."
                >
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "INDUSTRY", label: "Browse by Industry", color: "bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-200" },
                      { value: "GOVT_TENDER", label: "Browse by Govt Tender", color: "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-200" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setContentCategory(opt.value)}
                        className={`px-3 py-2.5 rounded-xl border-2 text-[11px] font-black transition-all cursor-pointer ${contentCategory === opt.value
                            ? opt.color + " ring-2 ring-offset-1 ring-[#185ADB]/30"
                            : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Placement" required>
                    <FieldSelect value={placement} onChange={(e) => setPlacement(e.target.value)}>
                      {PLACEMENTS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </FieldSelect>
                  </FormField>
                  <FormField label="Display Priority" hint="Higher number shows first">
                    <FieldInput
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                </div>

                <FormField label="Headline (shown to partners)" hint="6ΓÇô9 words recommended">
                  <FieldInput
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    placeholder="e.g. Industrial & Factory Solar Power Systems"
                  />
                </FormField>

                <FormField label="Short Description / Caption">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="e.g. High-yield commercial bifacial panels engineered for factory rooftops..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#185ADB]/25 focus:border-[#185ADB] transition-all resize-none placeholder:text-slate-400"
                    />
                    <span className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-400">
                      {shortDescription.length}/160
                    </span>
                  </div>
                </FormField>
              </div>

              {/* ΓöÇΓöÇΓöÇ Section B: Targeting & Industries ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="w-5 h-5 rounded-md bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">B</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Targeting</h4>
                </div>

                {/* Audience selector */}
                <FormField label="Target Audience" required>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { key: "RESELLER", label: "Franchisees", desc: "SolarKits Portal" },
                      { key: "EPC", label: "EPC", desc: "EPC Partner Portal" },
                      { key: "BOTH", label: "Both", desc: "All partner portals" },
                    ].map((aud) => (
                      <button
                        key={aud.key}
                        type="button"
                        onClick={() => setTargetAudience(aud.key)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${targetAudience === aud.key
                            ? "border-[#185ADB] bg-blue-50/60 dark:bg-blue-950/40"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                      >
                        <div className={`text-xs font-black ${targetAudience === aud.key ? "text-[#185ADB]" : "text-slate-800 dark:text-slate-200"}`}>{aud.label}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{aud.desc}</div>
                      </button>
                    ))}
                  </div>
                </FormField>

                {/* Industry assignment */}
                <FormField
                  label="Assign to Industries"
                  required
                  hint={assignedIndustryIds.length === 0 ? "Required to publish live (at least 1)" : `${assignedIndustryIds.length} selected`}
                >
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] text-slate-500 font-semibold">Select industries this content appears in</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAssignedIndustryIds(
                            assignedIndustryIds.length === industries.length
                              ? []
                              : industries.map((i) => String(i._id || i.id))
                          )
                        }
                        className="text-[10px] font-bold text-[#185ADB] hover:underline cursor-pointer"
                      >
                        {assignedIndustryIds.length === industries.length ? "Clear All" : "Select All"}
                      </button>
                    </div>
                    {assignedIndustryIds.length === 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-2.5 flex items-center gap-1.5">
                        <FiAlertCircle size={12} className="shrink-0" />
                        No industries selected. Content will remain as Draft until at least one industry is assigned.
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {industries.map((ind) => {
                        const iid = String(ind._id || ind.id);
                        const isChecked = assignedIndustryIds.some((id) => String(id) === iid);
                        return (
                          <label
                            key={iid}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-semibold ${isChecked
                                ? "border-[#185ADB]/40 bg-blue-50 dark:bg-blue-900/20 text-[#185ADB]"
                                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                setAssignedIndustryIds((prev) =>
                                  prev.some((id) => String(id) === iid)
                                    ? prev.filter((id) => String(id) !== iid)
                                    : [...prev, iid]
                                )
                              }
                              className="rounded text-[#185ADB] shrink-0"
                            />
                            <span className="line-clamp-1">{ind.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </FormField>

                {/* ─── State & District Geolocation Targeting ─── */}
                <FormField
                  label="Target States & Districts"
                  hint={isAllStates ? "Applies to all Indian States & Districts (Pan-India)" : `${applicableStates.length} State(s), ${applicableDistricts.length} District(s) selected`}
                >
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    {/* Mode toggle */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAllStates(true);
                          setApplicableStates([]);
                          setApplicableDistricts([]);
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                          isAllStates
                            ? "border-[#185ADB] bg-blue-50/70 dark:bg-blue-950/40 text-[#185ADB]"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        <FiGlobe size={15} className="shrink-0" />
                        <div>
                          <div className="text-xs font-black">Pan-India</div>
                          <div className="text-[10px] text-slate-400">All States & Districts</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAllStates(false)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                          !isAllStates
                            ? "border-[#185ADB] bg-blue-50/70 dark:bg-blue-950/40 text-[#185ADB]"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        <FiMapPin size={15} className="shrink-0" />
                        <div>
                          <div className="text-xs font-black">Specific Region</div>
                          <div className="text-[10px] text-slate-400">Target States & Districts</div>
                        </div>
                      </button>
                    </div>

                    {/* Specific States Selection */}
                    {!isAllStates && (
                      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                        {/* States Selector */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <FiMapPin size={12} className="text-[#185ADB]" />
                              Select States ({applicableStates.length} selected)
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setApplicableStates(
                                    applicableStates.length === statesList.length
                                      ? []
                                      : statesList.map((s) => s.name || s.text || s)
                                  )
                                }
                                className="text-[10px] font-bold text-[#185ADB] hover:underline cursor-pointer"
                              >
                                {applicableStates.length === statesList.length ? "Clear States" : "Select All States"}
                              </button>
                            </div>
                          </div>

                          {/* Quick search state */}
                          <div className="relative">
                            <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={stateSearchText}
                              onChange={(e) => setStateSearchText(e.target.value)}
                              placeholder="Search state..."
                              className="w-full pl-7 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 outline-none"
                            />
                            {stateSearchText && (
                              <button
                                type="button"
                                onClick={() => setStateSearchText("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <FiX size={11} />
                              </button>
                            )}
                          </div>

                          <div className="max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            {statesList
                              .filter((s) => {
                                const name = s.name || s.text || s;
                                return !stateSearchText.trim() || name.toLowerCase().includes(stateSearchText.toLowerCase());
                              })
                              .map((st) => {
                                const stName = st.name || st.text || st;
                                const isChecked = applicableStates.includes(stName);
                                return (
                                  <label
                                    key={st.id || st._id || stName}
                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                                      isChecked
                                        ? "bg-blue-50 dark:bg-blue-900/30 text-[#185ADB] font-bold"
                                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setApplicableStates((prev) =>
                                          prev.includes(stName)
                                            ? prev.filter((x) => x !== stName)
                                            : [...prev, stName]
                                        )
                                      }
                                      className="rounded text-[#185ADB] shrink-0"
                                    />
                                    <span className="truncate">{stName}</span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>

                        {/* Districts Selector (Available when states are selected) */}
                        {applicableStates.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <FiNavigation size={12} className="text-[#185ADB]" />
                                Select Districts ({applicableDistricts.length === 0 ? "All Districts in selected states" : `${applicableDistricts.length} specific district(s)`})
                                {loadingDistricts && <span className="text-[10px] text-amber-500">(Loading...)</span>}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setApplicableDistricts(
                                      applicableDistricts.length === districtsList.length
                                        ? []
                                        : districtsList.map((d) => d.name || d.text || d)
                                    )
                                  }
                                  className="text-[10px] font-bold text-[#185ADB] hover:underline cursor-pointer"
                                >
                                  {applicableDistricts.length === districtsList.length ? "Clear Districts" : "Select All Districts"}
                                </button>
                              </div>
                            </div>

                            {districtsList.length > 0 && (
                              <>
                                <div className="relative">
                                  <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    type="text"
                                    value={districtSearchText}
                                    onChange={(e) => setDistrictSearchText(e.target.value)}
                                    placeholder="Search district..."
                                    className="w-full pl-7 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 outline-none"
                                  />
                                  {districtSearchText && (
                                    <button
                                      type="button"
                                      onClick={() => setDistrictSearchText("")}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                      <FiX size={11} />
                                    </button>
                                  )}
                                </div>

                                <div className="max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                  {districtsList
                                    .filter((d) => {
                                      const name = d.name || d.text || d;
                                      return !districtSearchText.trim() || name.toLowerCase().includes(districtSearchText.toLowerCase());
                                    })
                                    .map((dst) => {
                                      const dName = dst.name || dst.text || dst;
                                      const isChecked = applicableDistricts.includes(dName);
                                      return (
                                        <label
                                          key={dst.id || dst._id || dName}
                                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                                            isChecked
                                              ? "bg-blue-50 dark:bg-blue-900/30 text-[#185ADB] font-bold"
                                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() =>
                                              setApplicableDistricts((prev) =>
                                                prev.includes(dName)
                                                  ? prev.filter((x) => x !== dName)
                                                  : [...prev, dName]
                                              )
                                            }
                                            className="rounded text-[#185ADB] shrink-0"
                                          />
                                          <span className="truncate">{dName}</span>
                                        </label>
                                      );
                                    })}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </FormField>

                {/* ─── Product Configurations Kits Linkage ─── */}
                <FormField
                  label="Link Kits (Product Configurations)"
                  hint="Website & tender banners show an 'Explore This Tender Kits' button pointing to these configured kits"
                >
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FiPackage size={13} className="text-[#185ADB]" />
                        Select Configured Kits ({relatedKitIds.length} linked)
                      </span>
                      {relatedKitIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRelatedKitIds([])}
                          className="text-[10px] font-bold text-[#185ADB] hover:underline cursor-pointer"
                        >
                          Clear Kits
                        </button>
                      )}
                    </div>

                    {/* Search kits */}
                    <div className="relative">
                      <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={kitSearchText}
                        onChange={(e) => setKitSearchText(e.target.value)}
                        placeholder="Search product configuration kits by name or category..."
                        className="w-full pl-7 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 outline-none"
                      />
                      {kitSearchText && (
                        <button
                          type="button"
                          onClick={() => setKitSearchText("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <FiX size={11} />
                        </button>
                      )}
                    </div>

                    {allSolarKits.length === 0 ? (
                      <p className="text-[11px] text-slate-500 py-2">
                        No product configuration kits loaded yet. Create kits in Product Configurations &gt; Solar Kits to link them here.
                      </p>
                    ) : (
                      <div className="max-h-44 overflow-y-auto space-y-1.5 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        {allSolarKits
                          .filter((kit) => {
                            if (!kitSearchText.trim()) return true;
                            const q = kitSearchText.toLowerCase();
                            const kName = (kit.name || "").toLowerCase();
                            const catName = (kit.category_id?.name || kit.category || "").toLowerCase();
                            return kName.includes(q) || catName.includes(q);
                          })
                          .map((kit) => {
                            const kid = String(kit.id || kit._id);
                            const isChecked = relatedKitIds.includes(kid);
                            const catName = kit.category_id?.name || kit.category || "Solar Kit";
                            return (
                              <label
                                key={kid}
                                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                                  isChecked
                                    ? "border-[#185ADB]/50 bg-blue-50/70 dark:bg-blue-900/30 text-[#185ADB] font-bold"
                                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      setRelatedKitIds((prev) =>
                                        prev.includes(kid) ? prev.filter((x) => x !== kid) : [...prev, kid]
                                      )
                                    }
                                    className="rounded text-[#185ADB] shrink-0"
                                  />
                                  <span className="truncate">{kit.name}</span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold shrink-0 ml-2">
                                  {catName}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </FormField>

                {/* CTA Section (collapsible) */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCtaExpanded((p) => !p)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 text-xs font-black text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span>CTA Settings (optional)</span>
                    {ctaExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                  </button>
                  {ctaExpanded && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Franchisee CTA</p>
                        <FieldInput value={resellerCtaLabel} onChange={(e) => setResellerCtaLabel(e.target.value)} placeholder="Button label (e.g. View Kit ΓåÆ)" />
                        <FieldInput value={resellerCtaUrl} onChange={(e) => setResellerCtaUrl(e.target.value)} placeholder="URL (e.g. /catalog)" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-cyan-600 tracking-wider">EPC CTA</p>
                        <FieldInput value={distributorCtaLabel} onChange={(e) => setDistributorCtaLabel(e.target.value)} placeholder="Button label (e.g. View EPC Portal ΓåÆ)" />
                        <FieldInput value={distributorCtaUrl} onChange={(e) => setDistributorCtaUrl(e.target.value)} placeholder="URL (e.g. /epc/portal)" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ΓöÇΓöÇΓöÇ Section C: Media ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">C</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Media</h4>
                </div>

                {/* Media Upload */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Media Files / External URL
                  </label>
                  {!editingContent && (
                    <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                      <FiAlertCircle size={13} className="shrink-0 mt-0.5" />
                      <span>Save the content details first (use "Save Draft"), then upload media files.</span>
                    </div>
                  )}
                  <MediaUploadZone
                    mediaList={activeMediaList}
                    onUploadFile={handleUploadFile}
                    onUploadExternalUrl={handleUploadExternalUrl}
                    onDeleteMedia={handleDeleteMedia}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between gap-3">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer transition-all"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveContent(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600 transition-all disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveContent(true)}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#185ADB] hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  <FiCheck size={14} />
                  {saving ? "Publishing..." : "Save & Publish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
