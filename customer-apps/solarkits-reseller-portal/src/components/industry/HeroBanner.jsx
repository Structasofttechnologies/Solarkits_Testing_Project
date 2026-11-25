/**
 * HeroBanner.jsx
 *
 * High-Impact Poster & Full-Screen Video Banner.
 * - Bold Poster typography with rich 4K solar imagery / video background.
 * - Interactive full-screen video player modal trigger.
 * - Minimal text, maximum visual impact.
 */

import { useRef, useEffect, useState } from 'react';
import { FiArrowRight, FiPlay, FiMaximize2, FiZap } from 'react-icons/fi';
import VideoPlayerModal from './VideoPlayerModal';

const DEFAULT_POSTERS = {
  residential: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=1600&auto=format&fit=crop',
  commercial: 'https://images.unsplash.com/photo-1545208942-e1c9c916524b?q=80&w=1600&auto=format&fit=crop',
  agriculture: 'https://images.unsplash.com/photo-1592833159155-c62df1b65634?q=80&w=1600&auto=format&fit=crop',
  utility: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=1600&auto=format&fit=crop',
};

const DEFAULT_VIDEOS = {
  residential: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  commercial: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  agriculture: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  utility: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
};

function pick_media(media_arr = [], preferred_device = 'DESKTOP') {
  const byDevice = media_arr.filter(m => m.device_type === preferred_device || m.device_type === 'ALL');
  return (byDevice.find(m => m.is_primary) || byDevice[0] || media_arr[0] || null);
}

function pick_video(media_arr = []) {
  return media_arr.find(m => m.media_type === 'VIDEO');
}

function pick_poster(media_arr = []) {
  return media_arr.find(m => m.media_type === 'THUMBNAIL' || m.media_type === 'POSTER' || m.media_type === 'IMAGE');
}

export default function HeroBanner({ content, onCtaClick }) {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (!content) return null;

  const { media = [], heading, short_description, cta_label, cta_url,
          autoplay, muted, loop, video_url } = content;

  const videoMedia = pick_video(media);
  const imageMedia = pick_media(media, isMobile ? 'MOBILE' : 'DESKTOP');
  const posterMedia = pick_poster(media);

  // Fallback poster based on content heading keywords
  const lowerHeading = (heading || '').toLowerCase();
  const fallbackPoster = lowerHeading.includes('commercial') || lowerHeading.includes('c&i')
    ? DEFAULT_POSTERS.commercial
    : lowerHeading.includes('agri') || lowerHeading.includes('pump')
    ? DEFAULT_POSTERS.agriculture
    : lowerHeading.includes('utility') || lowerHeading.includes('ground')
    ? DEFAULT_POSTERS.utility
    : DEFAULT_POSTERS.residential;

  const fallbackVideo = lowerHeading.includes('commercial')
    ? DEFAULT_VIDEOS.commercial
    : lowerHeading.includes('agri')
    ? DEFAULT_VIDEOS.agriculture
    : lowerHeading.includes('utility')
    ? DEFAULT_VIDEOS.utility
    : DEFAULT_VIDEOS.residential;

  const bgUrl = (imageMedia && imageMedia.media_type !== 'VIDEO' && imageMedia.url)
    ? imageMedia.url
    : posterMedia?.url || fallbackPoster;

  const activeVideoUrl = video_url || videoMedia?.url || fallbackVideo;
  const showBackgroundVideo = Boolean(videoMedia && !videoError);

  const handleCta = () => {
    if (onCtaClick) onCtaClick(content);
    if (cta_url) {
      if (cta_url.startsWith('/')) window.location.href = cta_url;
      else window.open(cta_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="relative w-full rounded-3xl overflow-hidden min-h-[300px] sm:min-h-[380px] shadow-2xl group transition-all duration-300 border border-slate-700/30">
        
        {/* Background Visual Media (Video or 4K HD Image) */}
        {showBackgroundVideo ? (
          <video
            ref={videoRef}
            key={videoMedia.url}
            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
            src={videoMedia.url}
            autoPlay={autoplay !== false}
            muted={muted !== false}
            loop={loop !== false}
            playsInline
            poster={bgUrl}
            onError={() => setVideoError(true)}
          />
        ) : (
          <img
            src={bgUrl}
            alt={heading || 'Solar Showcase'}
            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
          />
        )}

        {/* High-End Dark Gradient Overlay for Crisp Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

        {/* Top Floating Badge & Fullscreen Play Hint */}
        <div className="absolute top-5 left-6 right-6 z-20 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-sm">
            <FiZap size={13} className="text-amber-400" />
            <span>Official Industry Showcase</span>
          </div>

          <button
            onClick={() => setShowVideoModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Watch Full-Screen Video"
          >
            <FiMaximize2 size={13} />
            <span className="hidden sm:inline">Full Screen 4K</span>
          </button>
        </div>

        {/* Content Poster Overlay */}
        <div className="relative z-10 flex flex-col justify-end h-full p-6 sm:p-10 min-h-[300px] sm:min-h-[380px]">
          <div className="max-w-2xl space-y-3">
            
            {heading && (
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-lg font-heading">
                {heading}
              </h2>
            )}

            {short_description && (
              <p className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed max-w-xl drop-shadow line-clamp-2">
                {short_description}
              </p>
            )}

            {/* Action Buttons: Play Video & Explore Kits */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Big 4K Video Play Button */}
              <button
                onClick={() => setShowVideoModal(true)}
                className="inline-flex items-center gap-2.5 px-5 py-3 bg-[#185ADB] hover:bg-blue-600 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200 cursor-pointer active:scale-95"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <FiPlay size={12} className="ml-0.5 text-white" />
                </div>
                <span>Watch 4K Video</span>
              </button>

              {/* Primary CTA Button */}
              <button
                onClick={handleCta}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/90 hover:bg-white text-slate-900 font-bold rounded-2xl text-xs sm:text-sm shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer active:scale-95 backdrop-blur-md"
              >
                <span>{cta_label || 'Explore Solar Kits'}</span>
                <FiArrowRight size={15} />
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ── Immersive Full-Screen Video Modal Player ────────────────────────── */}
      {showVideoModal && (
        <VideoPlayerModal
          video_url={activeVideoUrl}
          title={heading || 'Solar Solutions Showcase'}
          onClose={() => setShowVideoModal(false)}
        />
      )}
    </>
  );
}
