import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { FiChevronRight, FiPlay, FiX, FiArrowRight } from "react-icons/fi";
import { MdOutlineFactory } from "react-icons/md";

export default function IndustryDashboardBanner() {
  const [industries, setIndustries] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);

  // 1. Fetch EPC's approved industries
  useEffect(() => {
    axiosInstance
      .get("/india/v1/shop/industry/my-industries")
      .then((res) => {
        if (res.data?.status === "success") {
          const list = res.data.data || [];
          setIndustries(list);
          if (list.length > 0) {
            setSelectedIndustry(list[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch content when selected industry changes
  const fetchContent = useCallback((industryId) => {
    if (!industryId) return;
    setLoading(true);
    axiosInstance
      .get(`/india/v1/shop/industry/dashboard-content?industry_type_id=${industryId}`)
      .then((res) => {
        if (res.data?.status === "success") {
          setContentList(res.data.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedIndustry) {
      fetchContent(selectedIndustry.id || selectedIndustry._id);
    }
  }, [selectedIndustry, fetchContent]);

  if (!industries || industries.length === 0) return null;

  const heroContent =
    contentList.find((c) => c.content_type === "HERO_BANNER") ||
    contentList.find((c) => c.content_type === "VIDEO_SLIDER") ||
    contentList[0] ||
    null;

  const primaryMedia = (heroContent?.media || []).find((m) => m.is_primary) || heroContent?.media?.[0] || null;

  return (
    <div className="space-y-4 mb-6">
      
      {/* Industry Chip Row */}
      {industries.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hover">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <MdOutlineFactory size={16} /> Industry:
          </span>
          {industries.map((ind) => {
            const isSelected = (selectedIndustry?.id || selectedIndustry?._id) === (ind.id || ind._id);
            return (
              <button
                key={ind.id || ind._id}
                onClick={() => setSelectedIndustry(ind)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400"
                }`}
              >
                <span>{ind.icon || "🏭"}</span>
                <span>{ind.name}</span>
                {isSelected && <FiChevronRight size={12} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Hero Banner / Highlight */}
      {heroContent && (
        <div className="relative rounded-2xl overflow-hidden shadow-sm min-h-[200px] sm:min-h-[240px] flex items-center bg-slate-900 text-white">
          {/* Media */}
          {primaryMedia?.media_type === "VIDEO" ? (
            <video
              src={primaryMedia.url}
              autoPlay={heroContent.autoplay !== false}
              muted={heroContent.muted !== false}
              loop={heroContent.loop !== false}
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          ) : primaryMedia?.url ? (
            <img
              src={primaryMedia.url}
              alt={heroContent.heading || "Banner"}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900" />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

          {/* Overlay Content */}
          <div className="relative z-10 p-6 sm:p-8 max-w-xl space-y-2">
            <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-sm inline-block">
              {selectedIndustry?.name || "Featured Solution"}
            </span>

            {heroContent.heading && (
              <h2 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-md">
                {heroContent.heading}
              </h2>
            )}

            {heroContent.short_description && (
              <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed line-clamp-2">
                {heroContent.short_description}
              </p>
            )}

            {heroContent.cta_label && (
              <div className="pt-2">
                <a
                  href={heroContent.cta_url || "#"}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-slate-900 font-bold rounded-xl text-xs shadow-md hover:bg-slate-100 transition-colors"
                >
                  {heroContent.cta_label} <FiArrowRight size={13} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Modal */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPlayingVideo(null)}
        >
          <div className="relative w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
              <span className="text-white font-bold text-xs">Video Player</span>
              <button
                onClick={() => setPlayingVideo(null)}
                className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="aspect-video">
              <video src={playingVideo} autoPlay controls playsInline className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
