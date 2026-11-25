const multer = require("multer");
const path = require("path");
const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

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
// -----------------------------------------------
function upload_files(upload_dir, max_size_mb, field_name, files_length) {
  // Derive Cloudinary folder from local path convention
  const folder = `solarkits/solarkits-account-panel/${upload_dir.replace(/\\/g, "/")}`;

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

          // Attach Cloudinary URL & filename
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
};
