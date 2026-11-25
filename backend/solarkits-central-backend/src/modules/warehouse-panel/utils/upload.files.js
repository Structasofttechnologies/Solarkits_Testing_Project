const multer = require("multer");
const path = require("path");
const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

// -------------------------------------------------
// Extract Cloudinary public_id and resource_type from a secure_url
// e.g. "https://res.cloudinary.com/xxx/image/upload/v123/solarkits/public/uploads/brands/FILE_abc"
// → { public_id: "solarkits/public/uploads/brands/FILE_abc", resource_type: "image" }
// -------------------------------------------------
function extract_cloudinary_info(url) {
  if (!url || !url.includes("cloudinary.com")) return null;
  const match = url.match(/\/(image|video|raw)\/(?:upload|authenticated|private)\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  if (match) {
    return {
      resource_type: match[1],
      public_id: match[2]
    };
  }
  // Fallback using simple extraction
  const simpleMatch = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  if (simpleMatch) {
    return {
      resource_type: "image",
      public_id: simpleMatch[1]
    };
  }
  return null;
}

// -----------------------------------------------
// Delete files from Cloudinary
// Accepts req.files array (file.filename = public_id)
// OR manual arrays like [{ path: cloudinaryUrl }]
// -----------------------------------------------
async function delete_uploaded_files(files = []) {
  if (!files || !files.length) return;
  for (const file of files) {
    try {
      let public_id = null;
      let resource_type = "image";

      if (file.filename && file.filename.includes("/")) {
        // public_id set directly (from Cloudinary upload)
        public_id = file.filename;
        if (file.path) {
          const info = extract_cloudinary_info(file.path);
          if (info) {
            resource_type = info.resource_type;
          }
        }
      } else if (file.path) {
        // Extract from Cloudinary URL
        const info = extract_cloudinary_info(file.path);
        if (info) {
          public_id = info.public_id;
          resource_type = info.resource_type;
        }
      }

      if (public_id) {
        await cloudinary.uploader.destroy(public_id, { resource_type });
      }
    } catch (err) {
      console.log("Error deleting file from Cloudinary:", err.message || err);
    }
  }
}

// -------------------------------------------------
// Upload a buffer to Cloudinary via upload_stream
// Returns the Cloudinary result object
// -------------------------------------------------
function stream_upload(buffer, options) {
  return new Promise((resolve, reject) => {
    const upload_stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(upload_stream);
  });
}

// -----------------------------------------------
// Dynamic Cloudinary Uploader for file uploading
// Replaces multer.diskStorage — same API signature
// upload_dir is used to derive Cloudinary folder:
//   "public/uploads/brands" → "solarkits/public/uploads/brands"
// -----------------------------------------------
function upload_files(upload_dir, max_size_mb, field_name, files_length) {
  // Derive Cloudinary folder from local path convention
  const folder = `solarkits/solarkits-warehouse-panel-backend/${upload_dir.replace(/\\/g, "/")}`;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: max_size_mb * 1024 * 1024 },
  });

  return (req, res, next) => {
    upload.array(field_name, files_length)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: "error",
          message: err.message,
        });
      }

      if (!req.files || req.files.length === 0) {
        return next();
      }

      try {
        for (const file of req.files) {
          const ext = path.extname(file.originalname).slice(1).toLowerCase();
          const unique = Date.now() + "_" + Math.round(Math.random() * 1e9);
          const public_id_name = `FILE_${unique}`;

          const result = await stream_upload(file.buffer, {
            folder,
            public_id: public_id_name,
            resource_type: "auto",
            ...(ext ? { format: ext } : {}),
          });

          // Attach Cloudinary info back to file object
          // file.path  → secure HTTPS URL (used by controllers)
          // file.filename → public_id   (used for deletion)
          file.path = result.secure_url;
          file.filename = result.public_id;
        }
        next();
      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr.message || uploadErr);
        return res.status(500).json({
          status: "error",
          message: "File upload to cloud storage failed",
        });
      }
    });
  };
}

module.exports = {
  upload_files,
  delete_uploaded_files,
  stream_upload,
};
