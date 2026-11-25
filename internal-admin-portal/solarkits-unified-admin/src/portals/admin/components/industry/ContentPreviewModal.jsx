import React, { useState } from "react";
import { FiX, FiMonitor, FiTablet, FiSmartphone, FiArrowRight, FiPlay } from "react-icons/fi";

export default function ContentPreviewModal({ content, onClose }) {
  const [device, setDevice] = useState("DESKTOP"); // DESKTOP | TABLET | MOBILE

  if (!content) return null;

  const mediaList = content.media || [];
  const primaryMedia =
    mediaList.find((m) => m.device_type === device && m.is_primary) ||
    mediaList.find((m) => m.device_type === device) ||
    mediaList.find((m) => m.device_type === "ALL" && m.is_primary) ||
    mediaList.find((m) => m.device_type === "ALL") ||
    mediaList[0] ||
    null;

  const widthClasses = {
    DESKTOP: "w-full max-w-4xl",
    TABLET: "w-[768px] max-w-full",
    MOBILE: "w-[375px] max-w-full",
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black tracking-wider uppercase text-primary">Live Simulated Preview</span>
            <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
              {content.title} ({content.content_type})
            </h3>
          </div>

          {/* Viewport switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setDevice("DESKTOP")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                device === "DESKTOP"
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <FiMonitor size={14} /> Desktop
            </button>
            <button
              onClick={() => setDevice("TABLET")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                device === "TABLET"
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <FiTablet size={14} /> Tablet
            </button>
            <button
              onClick={() => setDevice("MOBILE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                device === "MOBILE"
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <FiSmartphone size={14} /> Mobile
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Body / Simulation Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950/80 flex justify-center items-start">
          <div className={`${widthClasses[device]} transition-all duration-300`}>
            
            {/* Render based on content type */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              
              {/* Media layer */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                {primaryMedia?.media_type === "VIDEO" ? (
                  <video
                    src={primaryMedia.url}
                    autoPlay={content.autoplay !== false}
                    muted={content.muted !== false}
                    loop={content.loop !== false}
                    controls={content.show_controls !== false}
                    className="w-full h-full object-cover"
                  />
                ) : primaryMedia?.url ? (
                  <img
                    src={primaryMedia.url}
                    alt={primaryMedia.alt_text || "Preview"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 text-white">
                    <span className="font-bold text-sm">No media file uploaded</span>
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10 space-y-2 text-white">
                  {content.heading && (
                    <h2 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-md">
                      {content.heading}
                    </h2>
                  )}
                  {content.short_description && (
                    <p className="text-xs sm:text-sm text-white/90 max-w-lg line-clamp-3 leading-relaxed">
                      {content.short_description}
                    </p>
                  )}
                  {content.cta_label && (
                    <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 font-bold rounded-xl text-xs shadow-md">
                      {content.cta_label} <FiArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Metadata Panel */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                <div>
                  <span className="font-bold">Target Audience:</span> {content.target_audience} •{" "}
                  <span className="font-bold">Placement:</span> {content.placement}
                </div>
                <div>
                  <span className="font-bold">Device Asset:</span> {primaryMedia?.device_type || "N/A"}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
