/**
 * MediaSlider.jsx
 *
 * High-Impact Swipeable Media Slider for Featured Showcase Kits.
 * Features: High-res visual cards, video playback, fullscreen modal trigger, smooth controls.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlay, FiMaximize2 } from 'react-icons/fi';
import VideoPlayerModal from './VideoPlayerModal';

const SLIDE_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1508873696983-2df570464756?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1545208942-e1c9c916524b?q=80&w=1200&auto=format&fit=crop',
];

function pick_primary_media(media_arr = []) {
  const image = media_arr.find(m => m.is_primary && m.media_type === 'IMAGE')
    || media_arr.find(m => m.media_type === 'IMAGE')
    || media_arr.find(m => m.media_type === 'THUMBNAIL');
  const video = media_arr.find(m => m.media_type === 'VIDEO');
  return { image, video };
}

function SlideItem({ item, isActive, index, onOpenVideo }) {
  const { media = [], heading, short_description, cta_label, cta_url } = item;
  const { image, video } = pick_primary_media(media);

  const bgImage = image?.url || SLIDE_FALLBACK_IMAGES[index % SLIDE_FALLBACK_IMAGES.length];

  const handleCta = () => {
    if (!cta_url) return;
    if (cta_url.startsWith('/')) window.location.href = cta_url;
    else window.open(cta_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full h-full min-h-[260px] sm:min-h-[320px] rounded-3xl overflow-hidden shrink-0 group border border-slate-700/20 shadow-lg">
      {/* Media */}
      {video && isActive ? (
        <video
          className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
          src={video.url}
          autoPlay
          muted
          loop
          playsInline
          poster={bgImage}
        />
      ) : (
        <img
          src={bgImage}
          alt={heading || 'Featured Solar Kit'}
          className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
        />
      )}

      {/* Cinematic Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Video Badge / Play trigger if video available */}
      {video && (
        <button
          onClick={() => onOpenVideo && onOpenVideo(video.url, heading)}
          className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all"
        >
          <FiPlay size={12} className="text-amber-400" />
          <span>Play Fullscreen</span>
        </button>
      )}

      {/* Slide Text Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10 space-y-2">
        {heading && (
          <p className="text-white font-black text-xl sm:text-2xl leading-tight drop-shadow-md font-heading">
            {heading}
          </p>
        )}
        {short_description && (
          <p className="text-white/85 text-xs sm:text-sm max-w-xl line-clamp-2 drop-shadow">
            {short_description}
          </p>
        )}
        {cta_label && (
          <div className="pt-2">
            <button
              onClick={handleCta}
              className="px-5 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
            >
              {cta_label} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MediaSlider({ items = [], autoPlayInterval = 6000 }) {
  const [active, setActive] = useState(0);
  const [activeModalVideo, setActiveModalVideo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const timerRef = useRef(null);

  const total = items.length;

  const goTo = useCallback((index) => {
    setActive(((index % total) + total) % total);
  }, [total]);

  const prev = useCallback(() => goTo(active - 1), [active, goTo]);
  const next = useCallback(() => goTo(active + 1), [active, goTo]);

  // Autoplay
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, autoPlayInterval);
    return () => clearInterval(timerRef.current);
  }, [next, total, autoPlayInterval]);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, autoPlayInterval);
  };

  if (!items || items.length === 0) return null;

  return (
    <>
      <div
        className="relative w-full overflow-hidden rounded-3xl select-none"
        onMouseEnter={() => clearInterval(timerRef.current)}
        onMouseLeave={resetTimer}
      >
        {/* Slides Track */}
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {items.map((item, idx) => (
            <div key={item.id || item._id || idx} className="w-full shrink-0">
              <SlideItem
                item={item}
                isActive={idx === active}
                index={idx}
                onOpenVideo={(url, title) => setActiveModalVideo({ url, title })}
              />
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {total > 1 && (
          <>
            <button
              onClick={() => { prev(); resetTimer(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-all cursor-pointer hover:scale-110 z-20"
              aria-label="Previous slide"
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={() => { next(); resetTimer(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-all cursor-pointer hover:scale-110 z-20"
              aria-label="Next slide"
            >
              <FiChevronRight size={20} />
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { goTo(idx); resetTimer(); }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === active ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Video Modal */}
      {activeModalVideo && (
        <VideoPlayerModal
          video_url={activeModalVideo.url}
          title={activeModalVideo.title}
          onClose={() => setActiveModalVideo(null)}
        />
      )}
    </>
  );
}
