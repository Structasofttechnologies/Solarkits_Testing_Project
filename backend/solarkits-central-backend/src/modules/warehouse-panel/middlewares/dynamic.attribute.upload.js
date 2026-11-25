const multer = require("multer");
const path = require("path");
const { delete_uploaded_files, stream_upload } = require("../utils/upload.files");

const dynamic_attribute_upload = (type = "product") => {
  return (req, res, next) => {
    try {
      // Cloudinary folder derived from type
      const folder =
        type === "sku"
          ? "solarkits/solarkits-warehouse-panel-backend/public/uploads/skus"
          : "solarkits/solarkits-warehouse-panel-backend/public/uploads/products";

      // Use memory storage — files are uploaded to Cloudinary after multer parses
      const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      }).any();

      upload(req, res, async (err) => {
        if (err) {
          if (req.files) {
            delete_uploaded_files(req.files);
          }
          return res
            .status(400)
            .json({ status: "error", message: err.message });
        }

        if (!req.files || req.files.length === 0) {
          return next();
        }

        try {
          for (const file of req.files) {
            const ext = path.extname(file.originalname).slice(1).toLowerCase();
            const unique =
              Date.now() + "_" + Math.random().toString(36).slice(2);
            const public_id_name = `FILE_${unique}`;

            const result = await stream_upload(file.buffer, {
              folder,
              public_id: public_id_name,
              resource_type: "auto",
              ...(ext ? { format: ext } : {}),
            });

            // Attach Cloudinary info to file object
            file.path = result.secure_url;
            file.filename = result.public_id;
          }
          next();
        } catch (uploadErr) {
          console.error(
            "Cloudinary upload error:",
            uploadErr.message || uploadErr
          );
          return res.status(500).json({
            status: "error",
            message: "File upload to cloud storage failed",
          });
        }
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ status: "error", message: "Upload config error" });
    }
  };
};

module.exports = dynamic_attribute_upload;