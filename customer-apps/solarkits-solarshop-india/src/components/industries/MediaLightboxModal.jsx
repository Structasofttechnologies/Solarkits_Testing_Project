import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiPlay,
  FiPause,
  FiDownload,
  FiShare2,
  FiCheck,
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiChevronLeft,
  FiChevronRight,
  FiArrowRight,
  FiEye,
  FiShield,
  FiLayers,
} from "react-icons/fi";

export default function MediaLightboxModal({
  isOpen,
  item,
  onClose,
  onOpenInquiry,
  itemsList = [],
  onNavigate,
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    setZoomLevel(1);
    setIsPlaying(true);
  }, [item]);

  // Lock scroll on body when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Keyboard navigation & close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onNavigate) onNavigate("prev");
      if (e.key === "ArrowRight" && onNavigate) onNavigate("next");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNavigate]);

  if (!isOpen || !item) return null;

  const primaryMedia =
    item?.primary_media ||
    (item?.media && item.media[0]) ||
    null;

  const mediaUrl =
    primaryMedia?.url ||
    item?.thumbnail ||
    "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1600&auto=format&fit=crop&q=80";

  const isVideo =
    item.content_type === "VIDEO" ||
    item.content_type === "EXPLAINER_VIDEO" ||
    primaryMedia?.media_type === "VIDEO";

  const isPoster = item.content_type === "POSTER";

  const handleDownload = () => {
    if (mediaUrl) {
      window.open(mediaUrl, "_blank");
    }
  };

  const handleShare = () => {
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

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-0"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-10 w-full max-w-6xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row"
        >
          {/* Close Button Top Right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center backdrop-blur-md border border-slate-700 transition-colors cursor-pointer"
          >
            <FiX className="text-xl" />
          </button>

          {/* LEFT: Media Player / Poster Viewer Box */}
          <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] sm:min-h-[460px] lg:min-h-[600px] overflow-hidden select-none">
            {isVideo ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  poster={primaryMedia?.poster_url || primaryMedia?.thumbnail_url}
                  autoPlay
                  controls
                  playsInline
                  className="max-h-[80vh] w-full object-contain"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center overflow-auto p-4">
                <img
                  src={mediaUrl}
                  alt={item.title}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transition: "transform 0.2s ease-out",
                  }}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
                />

                {/* Zoom Controls Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-700 text-white text-xs">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(0.7, prev - 0.25))}
                    title="Zoom Out"
                    className="p-1.5 hover:text-blue-400"
                  >
                    <FiZoomOut className="text-sm" />
                  </button>
                  <span className="px-1 font-mono text-[11px]">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                    title="Zoom In"
                    className="p-1.5 hover:text-blue-400"
                  >
                    <FiZoomIn className="text-sm" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    title="Reset Zoom"
                    className="p-1.5 hover:text-blue-400 ml-1 border-l border-slate-700 pl-2"
                  >
                    <FiRotateCcw className="text-xs" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Detail Sidebar */}
          <div className="w-full lg:w-96 p-6 sm:p-8 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
            <div>
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {item.industries?.map((ind) => (
                  <span
                    key={ind.id || ind._id}
                    className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold"
                  >
                    {ind.icon} {ind.name}
                  </span>
                ))}
                {isPoster && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                    Spec Poster
                  </span>
                )}
                {isVideo && (
                  <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">
                    4K Video
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2 leading-snug">
                {item.title}
              </h2>
              <h4 className="text-sm font-semibold text-blue-400 mb-3">
                {item.heading}
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                {item.short_description ||
                  "Detailed technical showcase and engineered specification sheet for solar power deployment across commercial, residential, and agricultural infrastructure."}
              </p>

              {/* Technical Specifications Specs List */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 mb-6 text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Content Type</span>
                  <span className="text-slate-200 font-semibold">{item.content_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Target Segment</span>
                  <span className="text-slate-200 font-semibold">{item.target_audience || "Public"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Compliance</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <FiShield /> MNRE / BIS Approved
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Resolution</span>
                  <span className="text-slate-200 font-semibold">
                    {isVideo ? "4K Ultra HD (60fps)" : "300 DPI High-Res Print"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              {/* Inquire Button */}
              {onOpenInquiry && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenInquiry(item.industries?.[0]);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Enquire About This Solution</span>
                  <FiArrowRight />
                </button>
              )}

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                {item.allow_download !== false && (
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <FiDownload />
                    <span>Download {isPoster ? "Poster PDF/JPG" : "Media Asset"}</span>
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copied ? <FiCheck className="text-emerald-400" /> : <FiShare2 />}
                  <span>{copied ? "Copied" : "Share"}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
