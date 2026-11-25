import { useState, useEffect, useMemo } from "react";
import { 
  FaPlay, 
  FaTimes, 
  FaSearch, 
  FaGraduationCap, 
  FaLayerGroup, 
  FaTag, 
  FaExternalLinkAlt, 
  FaCheckCircle,
  FaShieldAlt,
  FaShoppingCart,
  FaCalculator,
  FaFileInvoiceDollar
} from "react-icons/fa";
import { MdVideoLibrary, MdFilterList } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const FALLBACK_VIDEOS = [
  {
    _id: "demo_1",
    title: "How to Configure & Buy Solar Combo Kits",
    headline: "How to Configure & Buy Solar Combo Kits",
    description: "Step-by-step walkthrough on how to choose Solar Combo Kits according to system capacity (1kW to 50kW), select panels, inverters, and BOS accessories.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "combo_kits",
    category_name: "Combo Kits",
    kit_type: "All Kits",
    duration_label: "5 mins",
    duration: "5 mins",
    tags: ["Combo Kits", "Ordering", "BOS", "Inverter", "Panels"],
    target_audience: "epc"
  },
  {
    _id: "demo_2",
    title: "Know My Margin Calculator - Maximizing EPC Profit",
    headline: "Know My Margin Calculator - Maximizing EPC Profit",
    description: "Learn how to use the margin calculator to project customer quotes, calculate project margins, freight costs, and net earnings per kW.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "how_to_use",
    category_name: "Margin Calculator",
    kit_type: "Commercial",
    duration_label: "4 mins",
    duration: "4 mins",
    tags: ["Margin", "Profit", "ROI", "Quotation"],
    target_audience: "epc"
  },
  {
    _id: "demo_3",
    title: "Purchase Order (PO) Lifecycle & Cluster Delivery Tracking",
    headline: "Purchase Order (PO) Lifecycle & Cluster Delivery Tracking",
    description: "Understand how your PO is approved by franchise partners and how warehouse cluster routing dispatches kits directly to your project site.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "purchase_orders",
    category_name: "POs & Approvals",
    kit_type: "Residential",
    duration_label: "6 mins",
    duration: "6 mins",
    tags: ["PO", "Dispatch", "Warehouse", "Tracking"],
    target_audience: "epc"
  },
  {
    _id: "demo_4",
    title: "EPC Fast PIN Login & Account Security Setup",
    headline: "EPC Fast PIN Login & Account Security Setup",
    description: "How to set up your unique 4-digit security PIN for instant 1-click login without needing your password every time.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "how_to_use",
    category_name: "Account & Security",
    kit_type: "All Kits",
    duration_label: "3 mins",
    duration: "3 mins",
    tags: ["PIN", "Security", "Login", "Profile"],
    target_audience: "epc"
  },
  {
    _id: "demo_5",
    title: "Industrial & Agricultural High-Capacity Solutions",
    headline: "Industrial & Agricultural High-Capacity Solutions",
    description: "Complete guide for ground-mount, solar water pumping, and heavy industrial solar kits with custom structure configurations.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "combo_kits",
    category_name: "Combo Kits",
    kit_type: "Industrial",
    duration_label: "8 mins",
    duration: "8 mins",
    tags: ["Industrial", "Agriculture", "High Capacity", "HT Lines"],
    target_audience: "epc"
  }
];

export default function KnowledgeCenter() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedKitType, setSelectedKitType] = useState("All");
  const [activeVideo, setActiveVideo] = useState(null);

  const kitTypes = ["All", "Residential", "Commercial", "Industrial", "Agricultural"];

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/knowledge-center/list`, {
        params: { audience: "epc" },
        timeout: 8000
      });
      if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        setVideos(res.data.data);
      } else {
        setVideos(FALLBACK_VIDEOS);
      }
    } catch {
      // Fallback
      setVideos(FALLBACK_VIDEOS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Dynamically extract module/category pills from loaded videos
  const categories = useMemo(() => {
    const set = new Set(["All"]);
    videos.forEach((v) => {
      const cat = v.category_name || v.category;
      if (cat && cat.trim()) set.add(cat.trim());
    });
    return Array.from(set);
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      const catName = (v.category_name || "").toLowerCase();
      const catKey = (v.category || "").toLowerCase();
      const targetCat = selectedCategory.toLowerCase();
      const matchCat =
        selectedCategory === "All" ||
        catName === targetCat ||
        catKey === targetCat ||
        catKey.replace(/_/g, " ") === targetCat;

      const kit = (v.kit_type || "All").toLowerCase();
      const targetKit = selectedKitType.toLowerCase();
      const matchKit =
        selectedKitType === "All" ||
        kit === "all" ||
        kit === "all kits" ||
        kit.includes(targetKit);

      const q = search.toLowerCase().trim();
      const title = (v.title || v.headline || "").toLowerCase();
      const desc = (v.description || "").toLowerCase();
      const matchSearch =
        !q ||
        title.includes(q) ||
        desc.includes(q) ||
        (Array.isArray(v.tags) && v.tags.some((t) => String(t).toLowerCase().includes(q)));

      return matchCat && matchKit && matchSearch;
    });
  }, [videos, selectedCategory, selectedKitType, search]);

  const getEmbedUrl = (url) => {
    if (!url) return "";
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      return url.replace("youtu.be/", "www.youtube.com/embed/");
    }
    return url;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white overflow-hidden shadow-xl border border-blue-800/40">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <FaGraduationCap className="text-sm" /> EPC Video Tutorials & Guides
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Knowledge Center: <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">How to Use</span>
            </h1>
            <p className="text-blue-200/80 text-sm max-w-2xl leading-relaxed">
              Step-by-step video tutorials created to help you order solar combo kits, calculate EPC margins, track PO deliveries, and set up your quick 4-digit PIN access.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
            <MdVideoLibrary className="text-3xl text-amber-400" />
            <div>
              <div className="text-xl font-black text-white">{filteredVideos.length}</div>
              <div className="text-[11px] text-blue-200 uppercase font-semibold">Available Guides</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search tutorial videos by topic, tag, or kit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Kit Type Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Kit Type:</span>
            <select
              value={selectedKitType}
              onChange={(e) => setSelectedKitType(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {kitTypes.map((k) => (
                <option key={k} value={k}>
                  {k === "All" ? "All Kit Types" : `${k} Kits`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto text-2xl">
            <MdVideoLibrary />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No video tutorials found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search terms or filters to find guides for ordering, margins, or PO allocations.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedCategory("All");
              setSelectedKitType("All");
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors inline-block"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video._id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
            >
              {/* Video Thumbnail / Preview Area */}
              <div 
                onClick={() => setActiveVideo(video)}
                className="relative aspect-video bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-800 cursor-pointer overflow-hidden flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center pl-1 shadow-lg group-hover:scale-110 transition-transform">
                  <FaPlay className="text-base" />
                </div>
                {/* Duration Badge */}
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold">
                  {video.duration_label || video.duration || "3 mins"}
                </div>
                {/* Category Badge */}
                <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
                  {video.category_name || video.category || "Tutorial"}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 
                    onClick={() => setActiveVideo(video)}
                    className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer leading-snug"
                  >
                    {video.title || video.headline}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {video.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {/* Tags */}
                  {Array.isArray(video.tags) && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {video.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          onClick={() => setSearch(tag)}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => setActiveVideo(video)}
                    className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <FaPlay className="text-[10px]" /> Watch Tutorial
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Playback Modal */}
      <AnimatePresence>
        {activeVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl text-white flex flex-col"
            >
              {/* Modal Top Bar */}
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase">
                    {activeVideo.category_name || activeVideo.category || "Tutorial"}
                  </span>
                  <h4 className="text-sm font-bold text-white truncate max-w-md">
                    {activeVideo.title || activeVideo.headline}
                  </h4>
                </div>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <FaTimes className="text-base" />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={getEmbedUrl(activeVideo.video_url)}
                  title={activeVideo.title || activeVideo.headline}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Modal Details */}
              <div className="p-5 space-y-2 bg-slate-950">
                <h3 className="font-bold text-white text-base">{activeVideo.title || activeVideo.headline}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{activeVideo.description}</p>
                {Array.isArray(activeVideo.tags) && activeVideo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {activeVideo.tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
