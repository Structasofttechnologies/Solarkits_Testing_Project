import { useState, useEffect, useMemo } from "react";
import { 
  FiPlay, 
  FiX, 
  FiSearch, 
  FiVideo, 
  FiBookOpen, 
  FiLayers, 
  FiTag, 
  FiCheckCircle,
  FiShoppingBag,
  FiDollarSign,
  FiUsers,
  FiShield
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";

const RESELLER_FALLBACK_VIDEOS = [
  {
    _id: "reseller_v1",
    title: "Franchisee Store Operations & Territory Management",
    headline: "Franchisee Store Operations & Territory Management",
    description: "Learn how to manage your allocated state and district territories, set inventory levels, and handle customer demand.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "store_setup",
    category_name: "Store Setup",
    kit_type: "All",
    duration_label: "6 mins",
    duration: "6 mins",
    tags: ["Territory", "District", "Inventory", "Storefront"],
    target_audience: "franchisee"
  },
  {
    _id: "reseller_v2",
    title: "Managing EPC Buyers & Quote Approvals",
    headline: "Managing EPC Buyers & Quote Approvals",
    description: "How to review incoming EPC quotations, set custom profit margins, and approve B2B Solar Kit deals in your region.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "epc_management",
    category_name: "EPC Management",
    kit_type: "Commercial",
    duration_label: "5 mins",
    duration: "5 mins",
    tags: ["EPC", "Quotes", "Approvals", "B2B"],
    target_audience: "franchisee"
  },
  {
    _id: "reseller_v3",
    title: "PO Orders, Fulfillment & Warehouse Cluster Routing",
    headline: "PO Orders, Fulfillment & Warehouse Cluster Routing",
    description: "Step-by-step process of approving purchase orders and tracking dispatched consignments from central supplier warehouses.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "purchase_orders",
    category_name: "POs & Approvals",
    kit_type: "Residential",
    duration_label: "7 mins",
    duration: "7 mins",
    tags: ["PO Orders", "Dispatch", "Warehouse", "Delivery"],
    target_audience: "franchisee"
  },
  {
    _id: "reseller_v4",
    title: "Franchisee Commissions, Wallet & Payout Withdrawals",
    headline: "Franchisee Commissions, Wallet & Payout Withdrawals",
    description: "How your per-watt commission is credited into your franchisee wallet and how to request payouts directly to your bank account.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "wallet_commission",
    category_name: "Wallet & Commissions",
    kit_type: "All",
    duration_label: "4 mins",
    duration: "4 mins",
    tags: ["Commissions", "Wallet", "Payouts", "Earnings"],
    target_audience: "franchisee"
  },
  {
    _id: "reseller_v5",
    title: "Quick 4-Digit Security PIN & Multi-User Access",
    headline: "Quick 4-Digit Security PIN & Multi-User Access",
    description: "How to configure your team's quick 4-digit PIN for instant access on counter devices and POS terminals.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    category: "how_to_use",
    category_name: "Account & Security",
    kit_type: "All",
    duration_label: "3 mins",
    duration: "3 mins",
    tags: ["PIN", "Security", "Team", "Login"],
    target_audience: "franchisee"
  }
];

export default function KnowledgeCenter() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeVideo, setActiveVideo] = useState(null);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await api.get("/knowledge-center/list", {
        params: { audience: "franchisee" },
        timeout: 8000
      });
      if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        setVideos(res.data.data);
      } else {
        setVideos(RESELLER_FALLBACK_VIDEOS);
      }
    } catch {
      setVideos(RESELLER_FALLBACK_VIDEOS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Dynamically extract module/category filter pills from loaded videos
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

      const q = search.toLowerCase().trim();
      const title = (v.title || v.headline || "").toLowerCase();
      const desc = (v.description || "").toLowerCase();
      const matchSearch =
        !q ||
        title.includes(q) ||
        desc.includes(q) ||
        (Array.isArray(v.tags) && v.tags.some((t) => String(t).toLowerCase().includes(q)));

      return matchCat && matchSearch;
    });
  }, [videos, selectedCategory, search]);

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
      <div className="relative rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white overflow-hidden shadow-xl border border-blue-800/40">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <FiBookOpen className="text-sm" /> Franchisee Video Guides & Tutorials
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Knowledge Center: <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">How to Use</span>
            </h1>
            <p className="text-blue-200/80 text-sm max-w-2xl leading-relaxed">
              Video walkthroughs for Franchisee partners — learn to manage EPC buyers, approve purchase orders, track warehouse shipments, and monitor your earnings.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10">
            <FiVideo className="text-3xl text-amber-400" />
            <div>
              <div className="text-xl font-black text-white">{filteredVideos.length}</div>
              <div className="text-[11px] text-blue-200 uppercase font-semibold">Tutorial Videos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search tutorials by module, keywords, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FiX />
            </button>
          )}
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
            <FiVideo />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No video tutorials found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search terms or filters to find guides for orders, wallets, or quotes.
          </p>
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
                <div className="w-14 h-14 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center pl-1 shadow-lg group-hover:scale-110 transition-transform">
                  <FiPlay className="text-base fill-current" />
                </div>
                {/* Duration Badge */}
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold">
                  {video.duration_label || video.duration || "5 mins"}
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

                  <button
                    onClick={() => setActiveVideo(video)}
                    className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <FiPlay className="text-[10px] fill-current" /> Watch Tutorial
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl text-white flex flex-col"
            >
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
                  <FiX className="text-base" />
                </button>
              </div>

              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={getEmbedUrl(activeVideo.video_url)}
                  title={activeVideo.title || activeVideo.headline}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

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
