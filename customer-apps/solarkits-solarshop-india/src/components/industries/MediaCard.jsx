import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FiPlay,
  FiEye,
  FiDownload,
  FiShare2,
  FiMaximize2,
  FiVideo,
  FiFileText,
  FiImage,
  FiCheck,
} from "react-icons/fi";

export default function MediaCard({
  item,
  viewMode = "GRID",
  onOpenMedia,
  onOpenInquiry,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const primaryMedia =
    item?.primary_media ||
    (item?.media && item.media[0]) ||
    null;

  const thumbnail =
    primaryMedia?.thumbnail_url ||
    primaryMedia?.poster_url ||
    primaryMedia?.url ||
    item?.thumbnail ||
    "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80";

  const isVideo =
    item.content_type === "VIDEO" ||
    item.content_type === "EXPLAINER_VIDEO" ||
    primaryMedia?.media_type === "VIDEO";

  const isPoster = item.content_type === "POSTER";

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: item.short_description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/industries?contentId=${item.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (primaryMedia?.url) {
      window.open(primaryMedia.url, "_blank");
    } else if (thumbnail) {
      window.open(thumbnail, "_blank");
    }
  };

  if (viewMode === "LIST") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        onClick={() => onOpenMedia(item)}
        className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
      >
        {/* Thumbnail Box */}
        <div className="relative w-full sm:w-56 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-slate-950">
          <img
            src={thumbnail}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <span className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FiPlay className="ml-0.5 text-base" />
              </span>
            </div>
          )}
          {primaryMedia?.duration_sec && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white text-[11px] font-bold rounded">
              {formatDuration(primaryMedia.duration_sec)}
            </span>
          )}
        </div>

        {/* Content Info */}
        <div className="flex-1 flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {item.industries?.map((ind) => (
                <span
                  key={ind.id || ind._id}
                  className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold"
                >
                  {ind.icon} {ind.name}
                </span>
              ))}
              {isPoster && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold">
                  Spec Poster
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
              {item.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
              {item.short_description || item.heading}
            </p>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              {item.view_count || 320}+ Views
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                title="Download Asset"
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-colors"
              >
                <FiDownload />
              </button>
              <button
                onClick={handleShare}
                title="Share"
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-colors"
              >
                {copied ? <FiCheck className="text-emerald-500" /> : <FiShare2 />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default: GRID View
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -6 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenMedia(item)}
      className="flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer group"
    >
      {/* Visual Thumbnail Box */}
      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
        <img
          src={thumbnail}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20 opacity-80 group-hover:opacity-100 transition-opacity" />

        {/* Type Badge (Top-Left) */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {isVideo && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600/90 text-white text-[11px] font-bold tracking-wide backdrop-blur-md shadow">
              <FiVideo className="text-xs" /> Video
            </span>
          )}
          {isPoster && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/95 text-slate-950 text-[11px] font-bold tracking-wide backdrop-blur-md shadow">
              <FiFileText className="text-xs" /> Poster
            </span>
          )}
          {item.content_type === "PHOTO" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600/90 text-white text-[11px] font-bold tracking-wide backdrop-blur-md shadow">
              <FiImage className="text-xs" /> Photo
            </span>
          )}
        </div>

        {/* Video Play Button Overlay */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-12 h-12 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-2xl transform group-hover:scale-115 transition-transform duration-200">
              <FiPlay className="ml-0.5 text-lg text-blue-600" />
            </span>
          </div>
        )}

        {/* Duration / Fullscreen Indicator (Bottom Right) */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
          {primaryMedia?.duration_sec && (
            <span className="px-2 py-0.5 bg-black/80 text-white text-[11px] font-semibold rounded backdrop-blur-sm">
              {formatDuration(primaryMedia.duration_sec)}
            </span>
          )}
          <span className="p-1.5 rounded bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <FiMaximize2 />
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Industry Tags */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
            {item.industries?.slice(0, 2).map((ind) => (
              <span
                key={ind.id || ind._id}
                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold"
              >
                {ind.icon} {ind.name}
              </span>
            ))}
          </div>

          {/* Heading & Description */}
          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1.5 leading-snug">
            {item.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {item.short_description || item.heading}
          </p>
        </div>

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-400">
            {item.view_count || 240}+ views
          </span>

          <div className="flex items-center gap-1.5">
            {item.allow_download !== false && (
              <button
                onClick={handleDownload}
                title="Download Poster / Media Asset"
                className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-500 text-xs transition-colors cursor-pointer"
              >
                <FiDownload />
              </button>
            )}

            <button
              onClick={handleShare}
              title="Share Link"
              className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-500 text-xs transition-colors cursor-pointer"
            >
              {copied ? <FiCheck className="text-emerald-500" /> : <FiShare2 />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
