import React, { useState, useRef } from "react";
import { FiUploadCloud, FiTrash2, FiVideo, FiImage, FiLink, FiCheck, FiAlertCircle } from "react-icons/fi";

export default function MediaUploadZone({ mediaList = [], onUploadFile, onUploadExternalUrl, onDeleteMedia, loading }) {
  const [deviceType, setDeviceType] = useState("ALL");
  const [mediaType, setMediaType] = useState("IMAGE");
  const [altText, setAltText] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isExternal, setIsExternal] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const formData = new FormData();
    formData.append("file", file);
    formData.append("device_type", deviceType);
    formData.append("media_type", file.type.startsWith("video/") ? "VIDEO" : mediaType);
    formData.append("alt_text", altText);
    formData.append("is_primary", isPrimary ? "true" : "false");

    await onUploadFile(formData);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setAltText("");
  };

  const handleExternalSubmit = async (e) => {
    e.preventDefault();
    if (!externalUrl.trim()) return;

    await onUploadExternalUrl({
      external_url: externalUrl.trim(),
      device_type: deviceType,
      media_type: mediaType,
      alt_text: altText,
      is_primary: isPrimary,
    });
    setExternalUrl("");
    setAltText("");
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("device_type", deviceType);
      formData.append("media_type", file.type.startsWith("video/") ? "VIDEO" : mediaType);
      formData.append("alt_text", altText);
      formData.append("is_primary", isPrimary ? "true" : "false");

      await onUploadFile(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Controls Box */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800 dark:text-white">Media Configuration</span>
            <span className="text-xs text-slate-500">Configure target device & format</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExternal(false)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                !isExternal
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setIsExternal(true)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                isExternal
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              External URL
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Device</label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">All Devices</option>
              <option value="DESKTOP">Desktop (≥ 1024px)</option>
              <option value="TABLET">Tablet (768px - 1023px)</option>
              <option value="MOBILE">Mobile (&lt; 768px)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Media Role</label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="IMAGE">Image / Banner</option>
              <option value="VIDEO">Video Stream / MP4</option>
              <option value="THUMBNAIL">Thumbnail / Cover</option>
              <option value="POSTER">Video Poster</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Alt Text / Description</label>
            <input
              type="text"
              placeholder="e.g. Solar panel roof installation"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
            />
            <span>Set as Primary media for this device</span>
          </label>
        </div>

        {/* Upload Action */}
        {!isExternal ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-slate-300 dark:border-slate-700 hover:border-primary/50 bg-white dark:bg-slate-800/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
              <FiUploadCloud size={24} />
            </div>
            <p className="font-bold text-sm text-slate-800 dark:text-white mb-1">
              Click to select or drag & drop media file
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Images: JPG, PNG, WEBP (Max 10MB) • Videos: MP4, WEBM (Max 200MB)
            </p>
          </div>
        ) : (
          <form onSubmit={handleExternalSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <FiLink className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=... or direct CDN video URL"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer shrink-0"
            >
              Add Link
            </button>
          </form>
        )}
      </div>

      {/* Media Gallery / List */}
      <div>
        <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Attached Media Assets ({mediaList.length})
        </h4>

        {mediaList.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
            No media files uploaded yet. Add at least one image or video for this content.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {mediaList.map((m) => (
              <div
                key={m.id || m._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group"
              >
                <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {m.media_type === "VIDEO" ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                      <FiVideo size={28} className="text-blue-400" />
                      <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded text-white">
                        {m.is_external ? "External Video" : "Video Stream"}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={m.url}
                      alt={m.alt_text || "Content media"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}

                  {m.is_primary && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-black uppercase shadow-sm">
                      Primary
                    </span>
                  )}
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold">
                    {m.device_type}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {m.alt_text || m.media_type}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">
                      {m.media_type} • {m.device_type}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteMedia(m.id || m._id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete media"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
