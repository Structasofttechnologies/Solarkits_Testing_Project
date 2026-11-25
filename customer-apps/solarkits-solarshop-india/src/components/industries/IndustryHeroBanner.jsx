import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FiPlay,
  FiDownload,
  FiArrowRight,
  FiCheckCircle,
  FiEye,
  FiShare2,
  FiShield,
  FiZap,
} from "react-icons/fi";
import { MdOutlineFactory } from "react-icons/md";

export default function IndustryHeroBanner({
  featuredContent = null,
  activeIndustry = null,
  onOpenMedia = null,
  onOpenInquiry = null,
}) {
  const [copied, setCopied] = useState(false);

  if (!featuredContent && !activeIndustry) return null;

  const title =
    featuredContent?.heading ||
    featuredContent?.title ||
    (activeIndustry ? `${activeIndustry.name} Solutions` : "Solar Energy Solutions");

  const description =
    featuredContent?.short_description ||
    activeIndustry?.description ||
    "Engineered tier-1 solar kits, bifacial high-wattage modules, smart inverters, and BOS components curated for high performance and longevity.";

  const primaryMedia =
    featuredContent?.primary_media ||
    (featuredContent?.media && featuredContent.media[0]) ||
    null;

  const bgImage =
    primaryMedia?.poster_url ||
    primaryMedia?.url ||
    featuredContent?.thumbnail ||
    "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1800&auto=format&fit=crop&q=80";

  const isVideo =
    featuredContent?.content_type === "VIDEO" ||
    featuredContent?.content_type === "EXPLAINER_VIDEO" ||
    primaryMedia?.media_type === "VIDEO";

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownload = () => {
    if (primaryMedia?.url) {
      window.open(primaryMedia.url, "_blank");
    } else if (featuredContent?.thumbnail) {
      window.open(featuredContent.thumbnail, "_blank");
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-slate-950 text-white shadow-2xl border border-slate-800/80 mb-10 group">
      {/* Background Image / Gradient with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgImage}
          alt={title}
          className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105 filter brightness-75 contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 z-10" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-12 sm:py-16 lg:py-20 flex flex-col justify-between min-h-[460px]">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {activeIndustry && (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/90 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-blue-400/30 shadow-sm">
              <span className="text-sm">{activeIndustry.icon || "☀️"}</span>
              {activeIndustry.name}
            </span>
          )}

          {isVideo && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold tracking-wide backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              4K Video Showcase
            </span>
          )}

          {featuredContent?.content_type === "POSTER" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/90 text-slate-950 text-xs font-bold tracking-wide backdrop-blur-md">
              Marketing & Spec Poster
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs font-medium backdrop-blur-md border border-slate-700/60">
            <FiShield className="text-emerald-400" /> MNRE & BIS Compliant
          </span>
        </div>

        {/* Center Text & Heading */}
        <div className="max-w-2xl my-6">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-sm sm:text-base lg:text-lg text-slate-300 line-clamp-3 leading-relaxed"
          >
            {description}
          </motion.p>
        </div>

        {/* Bottom Actions & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            {/* Play or View Media Trigger */}
            {featuredContent && onOpenMedia && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenMedia(featuredContent)}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-white/10 cursor-pointer"
              >
                {isVideo ? (
                  <>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs">
                      <FiPlay className="ml-0.5" />
                    </span>
                    <span>Play 4K Showcase</span>
                  </>
                ) : (
                  <>
                    <FiEye className="text-base" />
                    <span>View High-Res Poster</span>
                  </>
                )}
              </motion.button>
            )}

            {/* Request Quote Button */}
            {onOpenInquiry && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenInquiry(activeIndustry)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-sm backdrop-blur-md border border-blue-400/40 transition-colors cursor-pointer"
              >
                <span>Request Custom Quote</span>
                <FiArrowRight />
              </motion.button>
            )}

            {/* Download Button */}
            {featuredContent?.allow_download !== false && (
              <button
                onClick={handleDownload}
                title="Download Poster / Media Asset"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors cursor-pointer"
              >
                <FiDownload className="text-slate-300" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              title="Share Industry Solution"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <FiShare2 className="text-base" />
            </button>
            {copied && (
              <span className="text-xs text-emerald-400 font-semibold animate-pulse">
                Link copied!
              </span>
            )}
          </div>

          {/* Quick Metrics */}
          {featuredContent && (
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <FiEye className="text-slate-500" /> {featuredContent.view_count || 450}+ Views
              </span>
              <span className="hidden md:flex items-center gap-1.5">
                <FiZap className="text-amber-400" /> Ready to Deploy
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
