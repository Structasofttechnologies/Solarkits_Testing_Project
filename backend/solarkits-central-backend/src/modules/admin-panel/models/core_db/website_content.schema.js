const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../../../keys/config/databases');

const WebsiteContentSchema = new mongoose.Schema(
  {
    website_key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    sections: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'CmsUser' },
  },
  { timestamps: true, strict: false }
);

module.exports = solarkits_core_db.model('WebsiteContent', WebsiteContentSchema, 'website_contents');
