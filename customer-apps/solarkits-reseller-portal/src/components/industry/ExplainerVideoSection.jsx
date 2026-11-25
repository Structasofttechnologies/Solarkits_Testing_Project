import { useState } from 'react';
import { FiPlay, FiClock } from 'react-icons/fi';
import VideoPlayerModal from './VideoPlayerModal';

function pick_video_url(media = []) {
  const v = media.find(m => m.media_type === 'VIDEO');
  return v?.url || null;
}

function pick_thumbnail(media = []) {
  return media.find(m => m.media_type === 'THUMBNAIL' || m.media_type === 'POSTER' || m.media_type === 'IMAGE');
}

function format_duration(sec) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VideoCard({ item, onPlay }) {
  const [imgError, setImgError] = useState(false);
  const thumb = pick_thumbnail(item.media || []);
  const duration = item.media?.find(m => m.duration_sec)?.duration_sec;

  return (
    <button
      onClick={() => onPlay(item)}
      className="group text-left bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer w-full flex flex-col justify-between"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-slate-900 w-full">
        {thumb?.url && !imgError ? (
          <img
            src={thumb.url}
            alt={item.heading || item.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
              <FiPlay size={22} className="text-white ml-0.5" />
            </div>
            <span className="text-xs font-bold text-white/80 line-clamp-1">{item.heading || item.title}</span>
          </div>
        )}

        {/* Dark overlay with Play button */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <FiPlay size={20} className="ml-1" />
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-xl text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
            <FiClock size={11} />
            {format_duration(duration)}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
            {item.heading || item.title}
          </h4>
          {item.short_description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium leading-relaxed mt-1">
              {item.short_description}
            </p>
          )}
        </div>

        <div className="pt-2 flex items-center text-xs font-bold text-primary gap-1 group-hover:underline">
          <span>Watch Explainer</span>
          <FiPlay size={10} />
        </div>
      </div>
    </button>
  );
}

export default function ExplainerVideoSection({ items = [], loading }) {
  const [playing, setPlaying] = useState(null);

  const handlePlay = (item) => {
    const url = pick_video_url(item.media || []);
    if (url) setPlaying({ url, title: item.heading || item.title });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl overflow-hidden animate-pulse">
            <div className="aspect-video bg-slate-200 dark:bg-slate-800" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <h3 className="font-black text-slate-900 dark:text-white text-base">
            Technical & Explainer Videos
          </h3>
        </div>
        <span className="text-xs font-semibold text-slate-400">
          {items.length} video{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <VideoCard key={item.id || item._id || i} item={item} onPlay={handlePlay} />
        ))}
      </div>

      {playing && (
        <VideoPlayerModal
          video_url={playing.url}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}
