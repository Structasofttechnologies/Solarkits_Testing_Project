// Replace this with any YouTube URL or 11-character video ID.
const DEFAULT_YOUTUBE_SOURCE =
  "https://youtu.be/EE_lzTCuOH0?si=OIF4sGNgzh8lSONA";

/** Extracts a YouTube video ID from standard, short, embed, or Shorts URLs. */
export function extractYouTubeId(urlOrId) {
  if (!urlOrId) return "";

  const value = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  const match = value.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );

  return match ? match[1] : "";
}

export default function HeroSection({ videoConfig }) {
  if (videoConfig && videoConfig.enabled === false) return null;

  const rawSource = videoConfig?.youtube_url || videoConfig?.video_id || DEFAULT_YOUTUBE_SOURCE;
  const videoId = extractYouTubeId(rawSource) || "EE_lzTCuOH0";

  if (!videoId) return null;

  return (
    <section
      id="hero"
      className="w-full bg-white px-4 pt-20 pb-6 sm:px-6 sm:pt-24 sm:pb-8 lg:px-8"
    >
      <div className="mx-auto aspect-video w-full max-w-7xl overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-slate-900/10 sm:rounded-3xl sm:shadow-2xl">
        <iframe
          className="h-full w-full border-0"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?controls=1&rel=0&playsinline=1`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
}