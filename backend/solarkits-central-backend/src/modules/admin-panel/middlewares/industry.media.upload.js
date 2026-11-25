/**
 * industry.media.upload.js
 *
 * Multer + Cloudinary upload middleware specifically for industry content media.
 * Supports: JPEG, PNG, WebP (images) and MP4, WebM (videos).
 * Images: max 10 MB. Videos: max 200 MB.
 * Validates MIME type AND file signature (magic bytes) to prevent malicious uploads.
 *
 * Industry Content Management System
 */

const multer  = require('multer');
const path    = require('path');
const { stream_upload } = require('../utils/upload.files');

// ── Allowed types ────────────────────────────────────────────────────────────
const ALLOWED_IMAGE_MIMES  = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_MIMES  = new Set(['video/mp4', 'video/webm']);
const ALLOWED_MIMES        = new Set([...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES]);

const IMAGE_MAX_BYTES      = 10 * 1024 * 1024;   // 10 MB
const VIDEO_MAX_BYTES      = 200 * 1024 * 1024;  // 200 MB

// Blocked file extensions (safety net)
const BLOCKED_EXTS = new Set(['.exe', '.php', '.sh', '.bat', '.cmd', '.js', '.ts', '.py', '.rb', '.pl', '.cgi']);

// ── Magic byte signatures ─────────────────────────────────────────────────────
function check_magic_bytes(buffer, mime_type) {
  if (!buffer || buffer.length < 8) return false;
  const h = buffer.slice(0, 12);

  if (mime_type === 'image/jpeg')
    return h[0] === 0xFF && h[1] === 0xD8 && h[2] === 0xFF;

  if (mime_type === 'image/png')
    return h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4E && h[3] === 0x47;

  if (mime_type === 'image/webp')
    return h.slice(0,4).toString('ascii') === 'RIFF' && h.slice(8,12).toString('ascii') === 'WEBP';

  if (mime_type === 'video/mp4')
    return h[4] === 0x66 && h[5] === 0x74 && h[6] === 0x79 && h[7] === 0x70; // ftyp

  if (mime_type === 'video/webm')
    return h[0] === 0x1A && h[1] === 0x45 && h[2] === 0xDF && h[3] === 0xA3;

  return false;
}

// ── File filter ───────────────────────────────────────────────────────────────
const industry_file_filter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (BLOCKED_EXTS.has(ext)) {
    return cb(new Error(`File type "${ext}" is not allowed for security reasons.`), false);
  }

  if (!ALLOWED_MIMES.has(file.mimetype)) {
    return cb(new Error(`MIME type "${file.mimetype}" is not allowed. Allowed: JPEG, PNG, WebP, MP4, WebM.`), false);
  }

  cb(null, true);
};

// ── Main middleware factory ───────────────────────────────────────────────────
/**
 * Returns an Express middleware that:
 * 1. Parses multipart form with multer (memory storage)
 * 2. Validates magic bytes for each file
 * 3. Uploads to Cloudinary under the appropriate folder
 * 4. Attaches { path: cloudinaryUrl, filename: publicId } to each file
 *
 * @param {string} folder_suffix — e.g. 'banners', 'videos', 'thumbnails'
 */
function industry_media_upload(folder_suffix = 'media') {
  const cloudinary_folder = `solarkits/industry-content/${folder_suffix}`;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: VIDEO_MAX_BYTES },  // Largest limit; image size checked below
    fileFilter: industry_file_filter,
  }).any();

  return (req, res, next) => {
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ status: 'error', message: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ status: 'error', message: err.message });
      }

      if (!req.files || req.files.length === 0) {
        return next();
      }

      try {
        for (const file of req.files) {
          const is_video = ALLOWED_VIDEO_MIMES.has(file.mimetype);

          // Image size gate
          if (!is_video && file.size > IMAGE_MAX_BYTES) {
            return res.status(400).json({
              status: 'error',
              message: `Image file "${file.originalname}" exceeds the 10 MB limit.`,
            });
          }

          // Magic byte validation
          if (!check_magic_bytes(file.buffer, file.mimetype)) {
            return res.status(400).json({
              status: 'error',
              message: `File "${file.originalname}" failed signature validation. Ensure the file is a valid ${file.mimetype}.`,
            });
          }

          const ext        = path.extname(file.originalname).slice(1).toLowerCase();
          const unique     = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          const prefix     = is_video ? 'VID' : 'IMG';
          const public_id  = `${prefix}_${unique}`;

          const result = await stream_upload(file.buffer, {
            folder:        cloudinary_folder,
            public_id,
            resource_type: is_video ? 'video' : 'image',
            ...(ext ? { format: ext } : {}),
          });

          // Attach Cloudinary result to file object
          file.path     = result.secure_url;
          file.filename = result.public_id;
          file.cloudinary = {
            url:           result.secure_url,
            public_id:     result.public_id,
            resource_type: result.resource_type,
            width:         result.width || null,
            height:        result.height || null,
            duration:      result.duration || null,
            bytes:         result.bytes || file.size,
            format:        result.format || ext,
          };
        }

        next();
      } catch (uploadErr) {
        console.error('[industry_media_upload] Cloudinary error:', uploadErr.message || uploadErr);
        return res.status(500).json({ status: 'error', message: 'Media upload to cloud storage failed.' });
      }
    });
  };
}

module.exports = { industry_media_upload };
