import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  FaVideo,
  FaPlus,
  FaSearch,
  FaFilter,
  FaTrash,
  FaEdit,
  FaPlay,
  FaUsers,
  FaBuilding,
  FaBoxOpen,
  FaTag,
  FaGlobeAsia,
  FaExternalLinkAlt,
  FaGraduationCap
} from "react-icons/fa";
import { FiCheckCircle, FiX, FiLayers } from "react-icons/fi";
import PageHeader from "@/components/PageHeader";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const MODULE_CATEGORIES = [
  { id: "all", name: "All Modules" },
  { id: "how_to_use", name: "How to Use / General" },
  { id: "combo_kits", name: "Pre-Configured Combo Kits" },
  { id: "margin_calculator", name: "Margin Calculator" },
  { id: "store_setup", name: "Store Setup & Operations" },
  { id: "epc_management", name: "EPC Management & Approvals" },
  { id: "purchase_orders", name: "Purchase Orders & Allocations" },
  { id: "cart_checkout", name: "Direct Cart & Wholesale Checkout" },
  { id: "wallet_commission", name: "Wallet & Commission Settlements" },
  { id: "gst_onboarding", name: "GSTIN Verification & Onboarding" },
  { id: "deliveries", name: "Warehouse Dispatch & Inward Tracking" },
  { id: "account_security", name: "Account & Security (PIN Login)" },
  { id: "custom", name: "+ Add New Custom Module..." },
];

const KIT_TYPES = [
  "All Kits",
  "1-3kW DCR Rooftop Kits",
  "5kW Hybrid Storage Kits",
  "10kW Commercial 3-Phase",
  "Solar Agriculture Pumps",
  "Custom BOS & Structures",
];

const AUDIENCES = [
  { id: "all", label: "All Users" },
  { id: "epc", label: "EPC Contractors Only" },
  { id: "franchisee", label: "Franchise Partners Only" },
];

export default function KnowledgeCenterManagement({ moduleUniqueId }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedAudience, setSelectedAudience] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedKitType, setSelectedKitType] = useState("All Kits");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    category: "how_to_use",
    custom_category_name: "",
    target_audience: "all",
    kit_type: "All Kits",
    state_name: "All States",
    district_name: "All Districts",
    tags: "",
    duration_label: "3:00 mins",
    display_order: 0,
    is_published: true,
  });

  const [saving, setSaving] = useState(false);
  const [activePreviewUrl, setActivePreviewUrl] = useState(null);

  // Compute dynamic module/category options for filters
  const allCategoryOptions = useMemo(() => {
    const list = [...MODULE_CATEGORIES.filter((c) => c.id !== "custom")];
    videos.forEach((v) => {
      const key = v.category;
      const name = v.category_name || v.category;
      if (key && name && !list.some((item) => item.id === key || item.name.toLowerCase() === name.toLowerCase())) {
        list.push({ id: key, name: name });
      }
    });
    return list;
  }, [videos]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAudience !== "all") params.append("audience", selectedAudience);
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (selectedKitType !== "All Kits") params.append("kit_type", selectedKitType);
      if (search.trim()) params.append("search", search.trim());

      const res = await axios.get(`${API_URL}/knowledge-center/list?${params.toString()}`, {
        headers: { ...authHeaderObj() },
      });

      if (res.data?.success || res.data?.status === "success") {
        setVideos(res.data.data || []);
      }
    } catch (err) {
      console.warn("Failed to load knowledge center videos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [selectedAudience, selectedCategory, selectedKitType]);

  const handleOpenCreate = () => {
    setEditingVideo(null);
    setFormData({
      title: "",
      description: "",
      video_url: "",
      category: "how_to_use",
      custom_category_name: "",
      target_audience: "all",
      kit_type: "All Kits",
      state_name: "All States",
      district_name: "All Districts",
      tags: "HowToUse, Guide",
      duration_label: "3:00 mins",
      display_order: videos.length + 1,
      is_published: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVideo(v);
    const isKnownCat = MODULE_CATEGORIES.some((c) => c.id === v.category && c.id !== "custom");
    setFormData({
      title: v.title || "",
      description: v.description || "",
      video_url: v.video_url || "",
      category: isKnownCat ? v.category : "custom",
      custom_category_name: !isKnownCat ? (v.category_name || v.category || "") : "",
      target_audience: v.target_audience || "all",
      kit_type: v.kit_type || "All Kits",
      state_name: v.state_name || "All States",
      district_name: v.district_name || "All Districts",
      tags: Array.isArray(v.tags) ? v.tags.join(", ") : (v.tags || ""),
      duration_label: v.duration_label || "3:00 mins",
      display_order: v.display_order || 0,
      is_published: v.is_published !== false,
    });
    setIsModalOpen(true);
  };

  // Convert normal YouTube watch link to embed format
  const formatEmbedUrl = (url) => {
    if (!url) return "";
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      return url.replace("youtu.be/", "www.youtube.com/embed/");
    }
    return url;
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.video_url) return;

    setSaving(true);
    try {
      let finalCat = formData.category;
      let finalCatName = MODULE_CATEGORIES.find((c) => c.id === formData.category)?.name || "General Guide";

      if (formData.category === "custom" && formData.custom_category_name?.trim()) {
        finalCatName = formData.custom_category_name.trim();
        finalCat = finalCatName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      }

      const payload = {
        ...formData,
        category: finalCat,
        category_name: finalCatName,
        video_url: formatEmbedUrl(formData.video_url),
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };

      if (editingVideo) {
        await axios.put(`${API_URL}/knowledge-center/${editingVideo._id || editingVideo.id}`, payload, {
          headers: { ...authHeaderObj() },
        });
      } else {
        await axios.post(`${API_URL}/knowledge-center/create`, payload, {
          headers: { ...authHeaderObj() },
        });
      }

      setIsModalOpen(false);
      fetchVideos();
    } catch (err) {
      console.error("Save video error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this tutorial video?")) return;
    try {
      await axios.delete(`${API_URL}/knowledge-center/${id}`, {
        headers: { ...authHeaderObj() },
      });
      fetchVideos();
    } catch (err) {
      console.error("Delete video error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Center & Training Videos"
        subtitle="Manage process walkthroughs, module-specific tutorials, and feature videos for EPCs and Franchise Partners."
        icon={FaGraduationCap}
        stats={[
          { label: "Total Videos", value: videos.length, description: "Active tutorials" },
          { label: "EPC Guides", value: videos.filter((v) => v.target_audience === "epc" || v.target_audience === "all").length, description: "Available for EPCs" },
          { label: "Franchise Guides", value: videos.filter((v) => v.target_audience === "franchisee" || v.target_audience === "all").length, description: "Available for Franchisees" },
        ]}
      />

      {/* Action Bar & Filter Controls */}
      <div className="card p-5 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search by title, tag, or module..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchVideos()}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Add Video Button */}
          <Button
            onClick={handleOpenCreate}
            variant="primary"
            size="sm"
            leftIcon={<FaPlus />}
            className="w-full md:w-auto shadow-sm"
          >
            Add Tutorial Video
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Audience Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Target Audience
            </label>
            <select
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200"
            >
              {AUDIENCES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Module Category Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Platform Module
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200"
            >
              {allCategoryOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kit Type Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Kit Type Alignment
            </label>
            <select
              value={selectedKitType}
              onChange={(e) => setSelectedKitType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200"
            >
              {KIT_TYPES.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading Knowledge Center videos...</div>
      ) : videos.length === 0 ? (
        <div className="card p-12 text-center bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
          <FaVideo size={36} className="mx-auto text-slate-400 mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200">No Tutorial Videos Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Get started by adding module walkthroughs and how-to-use videos for your EPC partners and franchisees.
          </p>
          <Button onClick={handleOpenCreate} variant="outline" size="sm" className="mt-4">
            Add First Video
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((vid) => (
            <div
              key={vid._id || vid.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
            >
              {/* Video Player Preview / Thumbnail */}
              <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                {vid.video_url.includes("embed") ? (
                  <iframe
                    src={vid.video_url}
                    title={vid.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-4">
                    <button
                      type="button"
                      onClick={() => setActivePreviewUrl(vid.video_url)}
                      className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg mx-auto mb-2 transition-transform group-hover:scale-110 cursor-pointer"
                    >
                      <FaPlay size={16} className="ml-0.5" />
                    </button>
                    <span className="text-[11px] text-slate-400">Click to Play Tutorial</span>
                  </div>
                )}
                {/* Duration Badge */}
                {vid.duration_label && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">
                    {vid.duration_label}
                  </span>
                )}
              </div>

              {/* Card Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  {/* Badges Row */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        vid.target_audience === "epc"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : vid.target_audience === "franchisee"
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {vid.target_audience === "epc"
                        ? "EPC Only"
                        : vid.target_audience === "franchisee"
                        ? "Franchise Only"
                        : "All Partners"}
                    </span>

                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      {vid.category_name || vid.category}
                    </span>

                    {vid.kit_type && vid.kit_type !== "All Kits" && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        {vid.kit_type}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {vid.title}
                  </h3>

                  {vid.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {vid.description}
                    </p>
                  )}
                </div>

                {/* Tags & Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
                    {vid.tags?.map((t, idx) => (
                      <span key={idx} className="truncate">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(vid)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit Tutorial"
                    >
                      <FaEdit size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(vid._id || vid.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Video"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Video Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVideo ? "Edit Tutorial Video" : "Add Knowledge Center Video"}
        size="lg"
      >
        <form onSubmit={handleSaveVideo} className="space-y-4 pt-2">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Video Title / Headline *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. How to Place 3kW Residential Combo Kit Order"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Video URL (YouTube or Direct Embed / MP4) *
            </label>
            <input
              type="url"
              required
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtube.com/embed/..."
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Standard YouTube watch URLs will automatically be formatted for responsive player embedding.
            </p>
          </div>

          {/* Audience & Module Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Target Audience *
              </label>
              <select
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
              >
                {AUDIENCES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Platform Module *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
              >
                {MODULE_CATEGORIES.filter((c) => c.id !== "all").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Module / Category Name input if selected */}
          {formData.category === "custom" && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1">
              <label className="block text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
                Custom Module / Category Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Solar Inverter Setup, Rooftop BOS Guide, etc."
                value={formData.custom_category_name}
                onChange={(e) => setFormData({ ...formData, custom_category_name: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                This custom module will automatically appear as an interactive filter tab for the target audience ({formData.target_audience === "all" ? "EPC & Franchisee" : formData.target_audience === "epc" ? "EPC Store only" : "Franchisee Portal only"}).
              </p>
            </div>
          )}

          {/* Kit Type & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Kit Type Filter
              </label>
              <select
                value={formData.kit_type}
                onChange={(e) => setFormData({ ...formData, kit_type: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50"
              >
                {KIT_TYPES.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Duration Label
              </label>
              <input
                type="text"
                placeholder="e.g. 3:45 mins"
                value={formData.duration_label}
                onChange={(e) => setFormData({ ...formData, duration_label: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
          </div>

          {/* State / District & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                State / District Filter
              </label>
              <input
                type="text"
                placeholder="e.g. Gujarat (or All States)"
                value={formData.state_name}
                onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="HowToUse, ComboKits, Orders"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Description / Step Summary
            </label>
            <textarea
              rows={3}
              placeholder="Short explanation of what the user will learn in this tutorial video..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
              leftIcon={<FiCheckCircle />}
            >
              {editingVideo ? "Update Video" : "Publish to Knowledge Center"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
