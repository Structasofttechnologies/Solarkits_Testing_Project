/**
 * VideoPlayerModal.jsx
 *
 * Cinematic Full-Screen Modal Player for Explainer & Showcase Videos.
 * Supports: Direct MP4/WebM videos, Cloudinary streams, YouTube embeds & Vimeo.
 */

import { useEffect, useRef, useState } from 'react';
import { FiX, FiMaximize, FiMinimize, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { createPortal } from 'react-dom';

function is_youtube(url) {
  return url && /youtube\.com|youtu\.be/.test(url);
}

function is_vimeo(url) {
  return url && /vimeo\.com/.test(url);
}

function youtube_embed(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0&modestbranding=1` : url;
}

function vimeo_embed(url) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : url;
}

export default function VideoPlayerModal({ video_url, title, onClose }) {
  const modalRef = useRef(null);
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!video_url) return null;

  const isYT = is_youtube(video_url);
  const isVimeo = is_vimeo(video_url);
  const isEmbed = isYT || isVimeo;
  const embedUrl = isYT ? youtube_embed(video_url) : isVimeo ? vimeo_embed(video_url) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Full Screen Video Player'}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[95vh]"
      >
        {/* Cinema Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/90 to-transparent z-20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              4K Solar Video Showcase
            </span>
            <h3 className="text-white font-black text-sm sm:text-base truncate max-w-md sm:max-w-xl">
              {title || 'Solar PV Systems & Component Technology'}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer hover:rotate-90"
              aria-label="Close video"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Video Canvas */}
        <div className="relative w-full bg-black flex-1 flex items-center justify-center min-h-[300px] sm:min-h-[480px]">
          {isEmbed ? (
            <iframe
              className="w-full h-full min-h-[300px] sm:min-h-[480px] border-0"
              src={embedUrl}
              title={title || 'Solar Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full max-h-[75vh] object-contain"
              src={video_url}
              autoPlay
              controls
              playsInline
              muted={isMuted}
            />
          )}
        </div>

        {/* Cinema Footer Bar */}
        <div className="px-6 py-3 bg-black/90 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>High Definition 4K • Solar PV Infrastructure</span>
          <button
            onClick={onClose}
            className="text-white font-bold hover:text-blue-400 transition-colors cursor-pointer"
          >
            Close Player (Esc)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
