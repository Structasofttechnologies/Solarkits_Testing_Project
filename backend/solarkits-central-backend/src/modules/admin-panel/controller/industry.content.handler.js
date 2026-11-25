/**
 * industry.content.handler.js
 *
 * Admin CRUD + lifecycle management for Industry Content items.
 * Industry Content Management System — Phase 1
 *
 * Supports: create, update, media upload, industry assignment, publish,
 * unpublish, schedule, archive, preview, reorder, and analytics tracking.
 */

const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const {
  IndustryContent,
  IndustryContentIndustryMap,
  IndustryContentMedia,
  IndustryType,
  IndustryContentAnalytics,
  SolarKit,
} = require('../models/core_db');
const { delete_uploaded_files } = require('../utils/upload.files');

// ── In-process cache (5 min TTL) ─────────────────────────────────────────────
const contentCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const CACHE_KEY = (industry_id, audience, placement) =>
  `ic:${industry_id}:${audience}:${placement}`;

function invalidate_industry_cache(industry_id) {
  const keys = contentCache.keys().filter(k => k.startsWith(`ic:${industry_id}:`));
  if (keys.length) contentCache.del(keys);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitize_html(str) {
  if (!str) return null;
  return str.replace(/<[^>]*>/g, '').trim();
}

function sanitize_url(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/)/.test(trimmed)) return trimmed;
  return null;  // Reject unsafe CTA URLs
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIST CONTENT (Admin paginated)
// GET /admin-api/industry-content/list
// ─────────────────────────────────────────────────────────────────────────────
const list_content = async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      status, content_type, target_audience, industry_type_id, placement, is_featured, search, content_category,
    } = req.query;

    const filter = { deleted_at: null };
    if (status)           filter.status = status;
    if (content_type)     filter.content_type = content_type;
    if (target_audience)  filter.target_audience = { $in: [target_audience, 'BOTH'] };
    if (placement)        filter.placement = placement;
    if (is_featured !== undefined && is_featured !== '') filter.is_featured = is_featured === 'true' || is_featured === true;
    if (search)           filter.title = { $regex: search, $options: 'i' };
    if (content_category) filter.content_category = content_category;

    const skip = (Number(page) - 1) * Number(limit);

    let contentIds = null;
    if (industry_type_id && mongoose.Types.ObjectId.isValid(industry_type_id)) {
      const maps = await IndustryContentIndustryMap.find({
        industry_type_id,
        deleted_at: null,
      }).select('content_id').lean();
      contentIds = maps.map(m => m.content_id);
      filter._id = { $in: contentIds };
    }

    const [items, total] = await Promise.all([
      IndustryContent.find(filter)
        .sort({ display_order: 1, priority: -1, created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      IndustryContent.countDocuments(filter),
    ]);

    // Enrich with industry assignments and media items
    const ids = items.map(i => i._id);
    const [maps, mediaList] = await Promise.all([
      IndustryContentIndustryMap.find({
        content_id: { $in: ids },
        deleted_at: null,
      }).populate('industry_type_id', 'name slug icon is_active').lean(),
      IndustryContentMedia.find({
        content_id: { $in: ids },
        deleted_at: null,
      }).sort({ is_primary: -1, sort_order: 1, created_at: 1 }).lean(),
    ]);

    const mapByContent = {};
    maps.forEach(m => {
      const cid = m.content_id.toString();
      if (!mapByContent[cid]) mapByContent[cid] = [];
      if (m.industry_type_id) mapByContent[cid].push(m.industry_type_id);
    });

    const mediaByContent = {};
    mediaList.forEach(m => {
      const cid = m.content_id.toString();
      if (!mediaByContent[cid]) mediaByContent[cid] = [];
      mediaByContent[cid].push({ ...m, id: m._id });
    });

    const data = items.map(item => {
      const contentMedia = mediaByContent[item._id.toString()] || [];
      const primaryMedia = contentMedia.find(m => m.is_primary) || contentMedia[0] || null;
      const thumbnail = primaryMedia?.thumbnail_url || primaryMedia?.poster_url || primaryMedia?.url || null;

      return {
        ...item,
        id: item._id,
        industries: mapByContent[item._id.toString()] || [],
        media: contentMedia,
        thumbnail,
        media_count: contentMedia.length,
      };
    });

    return res.json({
      status: 'success',
      data,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[industry.content] list_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET CONTENT DETAIL
// GET /admin-api/industry-content/detail/:id
// ─────────────────────────────────────────────────────────────────────────────
const get_content_detail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const [content, media, maps] = await Promise.all([
      IndustryContent.findOne({ _id: id, deleted_at: null }).lean(),
      IndustryContentMedia.find({ content_id: id, deleted_at: null }).sort({ is_primary: -1, sort_order: 1, device_type: 1 }).lean(),
      IndustryContentIndustryMap.find({ content_id: id, deleted_at: null })
        .populate('industry_type_id', 'name slug icon is_active')
        .lean(),
    ]);

    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    let relatedKits = [];
    if (content.related_kit_ids && content.related_kit_ids.length > 0) {
      const validKitIds = content.related_kit_ids.filter(kid => kid && mongoose.Types.ObjectId.isValid(kid));
      if (validKitIds.length > 0) {
        const foundKits = await SolarKit.find({ _id: { $in: validKitIds }, deleted_at: null })
          .populate('category_id', 'name')
          .populate('subcategory_id', 'name')
          .select('name description category_id subcategory_id image')
          .lean();
        relatedKits = foundKits.map(k => ({
          id: k._id,
          _id: k._id,
          name: k.name,
          description: k.description,
          category: k.category_id?.name || '',
          subCategory: k.subcategory_id?.name || '',
          image: k.image || null,
        }));
      }
    }

    return res.json({
      status: 'success',
      data: {
        ...content,
        id: content._id,
        is_all_states: content.is_all_states !== false,
        applicable_states: content.applicable_states || [],
        applicable_districts: content.applicable_districts || [],
        related_kit_ids: content.related_kit_ids || [],
        related_kits: relatedKits,
        media: media.map(m => ({ ...m, id: m._id })),
        industries: maps.filter(m => m.industry_type_id).map(m => ({
          map_id: m._id,
          ...m.industry_type_id,
        })),
      },
    });
  } catch (err) {
    console.error('[industry.content] get_content_detail:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. CREATE CONTENT (Draft / Published)
// POST /admin-api/industry-content/create
// ─────────────────────────────────────────────────────────────────────────────
const create_content = async (req, res) => {
  try {
    const {
      title, internal_name, content_type, content_category, target_audience, placement,
      heading, short_description, cta_label, cta_url,
      reseller_cta_label, reseller_cta_url, distributor_cta_label, distributor_cta_url,
      is_featured, priority, display_order, start_at, end_at, status, is_active,
      autoplay, show_controls, muted, loop, allow_download, allow_share, allow_fullscreen,
      focal_position, related_kit_ids,
      is_all_states, applicable_states, applicable_districts,
    } = req.body;

    if (!title || !internal_name || !content_type || !target_audience) {
      return res.status(400).json({ status: 'error', message: 'title, internal_name, content_type, and target_audience are required' });
    }

    const raw_industry_ids = req.body.industry_ids !== undefined ? req.body.industry_ids : req.body.industry_type_ids;
    const arr_industry_ids = raw_industry_ids ? (Array.isArray(raw_industry_ids) ? raw_industry_ids : [raw_industry_ids]) : [];
    const valid_ids = arr_industry_ids
      .map(i => (typeof i === 'object' && i ? (i._id || i.id || i.industry_type_id) : i))
      .filter(id => id && mongoose.Types.ObjectId.isValid(id))
      .map(id => id.toString());

    // Sanitize user-visible fields
    const safe_heading = sanitize_html(heading);
    const safe_desc    = sanitize_html(short_description);
    const safe_cta_url = sanitize_url(cta_url);

    const safe_states = Array.isArray(applicable_states) ? applicable_states.map(s => String(s).trim()).filter(Boolean) : [];
    const safe_districts = Array.isArray(applicable_districts) ? applicable_districts.map(d => String(d).trim()).filter(Boolean) : [];
    const safe_kit_ids = Array.isArray(related_kit_ids) ? related_kit_ids.map(k => String(k).trim()).filter(Boolean) : [];
    const is_all_states_val = is_all_states !== undefined ? !!is_all_states : (safe_states.length === 0);

    let initial_status = status || 'DRAFT';
    if (initial_status === 'PUBLISHED' && valid_ids.length === 0) {
      initial_status = 'DRAFT';
    }

    const content = await IndustryContent.create({
      title: title.trim(),
      internal_name: internal_name.trim(),
      content_type,
      content_category: content_category || 'INDUSTRY',
      target_audience,
      placement: placement || 'GALLERY',
      heading:           safe_heading,
      short_description: safe_desc,
      cta_label:         cta_label ? cta_label.trim().substring(0, 100) : null,
      cta_url:           safe_cta_url,
      reseller_cta_label:    reseller_cta_label ? reseller_cta_label.trim().substring(0, 100) : null,
      reseller_cta_url:      sanitize_url(reseller_cta_url),
      distributor_cta_label: distributor_cta_label ? distributor_cta_label.trim().substring(0, 100) : null,
      distributor_cta_url:   sanitize_url(distributor_cta_url),
      is_featured:       !!is_featured,
      priority:          priority != null ? Number(priority) : 0,
      display_order:     display_order != null ? Number(display_order) : 0,
      start_at:          start_at ? new Date(start_at) : null,
      end_at:            end_at ? new Date(end_at) : null,
      autoplay:          !!autoplay,
      show_controls:     show_controls !== false,
      muted:             muted !== false,
      loop:              !!loop,
      allow_download:    allow_download !== false,
      allow_share:       allow_share !== false,
      allow_fullscreen:  allow_fullscreen !== false,
      focal_position:    focal_position || 'center',
      related_kit_ids:   safe_kit_ids,
      is_all_states:     is_all_states_val,
      applicable_states: safe_states,
      applicable_districts: safe_districts,
      status:            initial_status,
      is_active:         is_active !== undefined ? !!is_active : true,
      created_by:        req.user?.id,
    });

    // Assign industries if provided
    if (valid_ids.length > 0) {
      for (const iid of valid_ids) {
        await IndustryContentIndustryMap.findOneAndUpdate(
          { content_id: content._id, industry_type_id: iid },
          { $set: { deleted_at: null, is_active: true } },
          { upsert: true, new: true }
        );
        invalidate_industry_cache(iid);
      }
    }

    return res.status(201).json({ status: 'success', data: { id: content._id, ...content.toObject() } });
  } catch (err) {
    console.error('[industry.content] create_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. UPDATE CONTENT
// PUT /admin-api/industry-content/update/:id
// ─────────────────────────────────────────────────────────────────────────────
const update_content = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const content = await IndustryContent.findOne({ _id: id, deleted_at: null });
    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    const allowed = [
      'title', 'internal_name', 'content_type', 'content_category', 'target_audience', 'placement',
      'heading', 'short_description', 'cta_label', 'cta_url',
      'reseller_cta_label', 'reseller_cta_url', 'distributor_cta_label', 'distributor_cta_url',
      'is_featured', 'priority', 'display_order', 'status', 'is_active',
      'start_at', 'end_at', 'autoplay', 'show_controls', 'muted', 'loop',
      'allow_download', 'allow_share', 'allow_fullscreen', 'focal_position', 'related_kit_ids',
      'is_all_states', 'applicable_states', 'applicable_districts'
    ];

    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        if (field === 'heading' || field === 'short_description') {
          update[field] = sanitize_html(req.body[field]);
        } else if (['cta_url', 'reseller_cta_url', 'distributor_cta_url'].includes(field)) {
          update[field] = sanitize_url(req.body[field]);
        } else if (['start_at', 'end_at'].includes(field)) {
          update[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else if (field === 'applicable_states' || field === 'applicable_districts' || field === 'related_kit_ids') {
          update[field] = Array.isArray(req.body[field]) ? req.body[field].map(x => String(x).trim()).filter(Boolean) : [];
        } else if (field === 'is_all_states') {
          update[field] = !!req.body[field];
        } else {
          update[field] = req.body[field];
        }
      }
    }
    update.updated_by = req.user?.id;

    // Sync industries if provided in body
    const raw_industry_ids = req.body.industry_ids !== undefined ? req.body.industry_ids : req.body.industry_type_ids;
    if (raw_industry_ids !== undefined) {
      const arr_industry_ids = Array.isArray(raw_industry_ids) ? raw_industry_ids : [raw_industry_ids];
      const valid_ids = arr_industry_ids
        .map(i => (typeof i === 'object' && i ? (i._id || i.id || i.industry_type_id) : i))
        .filter(iid => iid && mongoose.Types.ObjectId.isValid(iid))
        .map(iid => iid.toString());

      await IndustryContentIndustryMap.updateMany(
        { content_id: id, industry_type_id: { $nin: valid_ids }, deleted_at: null },
        { $set: { deleted_at: new Date(), is_active: false } }
      );

      for (const iid of valid_ids) {
        await IndustryContentIndustryMap.findOneAndUpdate(
          { content_id: id, industry_type_id: iid },
          { $set: { deleted_at: null, is_active: true } },
          { upsert: true, new: true }
        );
        invalidate_industry_cache(iid);
      }
    }

    const updated = await IndustryContent.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();

    // Invalidate cache if status-affecting fields changed
    if (update.status || update.start_at || update.end_at || update.target_audience || update.is_active !== undefined) {
      const maps = await IndustryContentIndustryMap.find({ content_id: id, deleted_at: null }).lean();
      maps.forEach(m => invalidate_industry_cache(m.industry_type_id.toString()));
    }

    return res.json({ status: 'success', data: { ...updated, id: updated._id } });
  } catch (err) {
    console.error('[industry.content] update_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. UPLOAD MEDIA (files already processed by industry_media_upload middleware)
// POST /admin-api/industry-content/upload-media/:id
// Body fields: device_type, media_type, alt_text, is_primary
// ─────────────────────────────────────────────────────────────────────────────
const upload_content_media = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const content = await IndustryContent.findOne({ _id: id, deleted_at: null });
    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    if (!req.files || req.files.length === 0) {
      // Check for external URL upload
      const { external_url, media_type, device_type, alt_text, is_primary, thumbnail_url, poster_url, caption, focal_point, sort_order } = req.body;
      if (!external_url) return res.status(400).json({ status: 'error', message: 'No file or external_url provided' });

      const safe_url = sanitize_url(external_url);
      if (!safe_url) return res.status(400).json({ status: 'error', message: 'Invalid external URL' });

      const media = await IndustryContentMedia.create({
        content_id: id,
        media_type:    media_type || 'VIDEO',
        device_type:   device_type || 'ALL',
        url:           safe_url,
        thumbnail_url: thumbnail_url ? sanitize_url(thumbnail_url) : null,
        poster_url:    poster_url ? sanitize_url(poster_url) : null,
        is_external:   true,
        alt_text:      sanitize_html(alt_text),
        caption:       sanitize_html(caption),
        focal_point:   focal_point || 'center',
        sort_order:    sort_order != null ? Number(sort_order) : 0,
        is_primary:    !!is_primary,
      });

      return res.status(201).json({ status: 'success', data: { ...media.toObject(), id: media._id } });
    }

    const { device_type = 'ALL', media_type, alt_text, is_primary, thumbnail_url, poster_url, caption, focal_point, sort_order } = req.body;

    const created = [];
    for (const file of req.files) {
      const is_video  = file.mimetype?.startsWith('video/');
      const auto_type = is_video ? 'VIDEO' : 'IMAGE';

      const media = await IndustryContentMedia.create({
        content_id:        id,
        media_type:        media_type || auto_type,
        device_type,
        url:               file.path,
        thumbnail_url:     thumbnail_url ? sanitize_url(thumbnail_url) : null,
        poster_url:        poster_url ? sanitize_url(poster_url) : null,
        storage_key:       file.filename,
        is_external:       false,
        mime_type:         file.mimetype,
        file_size:         file.cloudinary?.bytes || file.size,
        width:             file.cloudinary?.width || null,
        height:            file.cloudinary?.height || null,
        duration_sec:      file.cloudinary?.duration || null,
        processing_status: 'READY',
        alt_text:          sanitize_html(alt_text),
        caption:           sanitize_html(caption),
        focal_point:       focal_point || 'center',
        sort_order:        sort_order != null ? Number(sort_order) : 0,
        is_primary:        !!is_primary,
      });

      created.push({ ...media.toObject(), id: media._id });
    }

    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    console.error('[industry.content] upload_content_media:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. DELETE MEDIA ITEM
// DELETE /admin-api/industry-content/delete-media/:media_id
// ─────────────────────────────────────────────────────────────────────────────
const delete_content_media = async (req, res) => {
  try {
    const { media_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(media_id))
      return res.status(400).json({ status: 'error', message: 'Invalid media_id' });

    const media = await IndustryContentMedia.findOne({ _id: media_id, deleted_at: null });
    if (!media) return res.status(404).json({ status: 'error', message: 'Media not found' });

    // Delete from Cloudinary if not external
    if (!media.is_external && media.storage_key) {
      await delete_uploaded_files([{ path: media.url, filename: media.storage_key }]).catch(() => {});
    }

    media.deleted_at = new Date();
    await media.save();

    return res.json({ status: 'success', message: 'Media deleted' });
  } catch (err) {
    console.error('[industry.content] delete_content_media:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. SET INDUSTRY ASSIGNMENTS
// POST /admin-api/industry-content/set-industries/:id
// Body: { industry_ids: [...] } or { industry_type_ids: [...] }
// ─────────────────────────────────────────────────────────────────────────────
const set_industry_assignments = async (req, res) => {
  try {
    const { id } = req.params;
    const raw_industry_ids = req.body.industry_ids !== undefined ? req.body.industry_ids : (req.body.industry_type_ids !== undefined ? req.body.industry_type_ids : []);

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const content = await IndustryContent.findOne({ _id: id, deleted_at: null });
    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    // Validate and normalize all industry ids
    const arr_industry_ids = Array.isArray(raw_industry_ids) ? raw_industry_ids : [raw_industry_ids];
    const valid_ids = arr_industry_ids
      .map(i => (typeof i === 'object' && i ? (i._id || i.id || i.industry_type_id) : i))
      .filter(iid => iid && mongoose.Types.ObjectId.isValid(iid))
      .map(iid => iid.toString());

    // Soft-delete existing maps not in new list
    await IndustryContentIndustryMap.updateMany(
      { content_id: id, industry_type_id: { $nin: valid_ids }, deleted_at: null },
      { $set: { deleted_at: new Date(), is_active: false } }
    );

    // Upsert new mappings
    for (const iid of valid_ids) {
      await IndustryContentIndustryMap.findOneAndUpdate(
        { content_id: id, industry_type_id: iid },
        { $set: { deleted_at: null, is_active: true } },
        { upsert: true, new: true }
      );
      invalidate_industry_cache(iid);
    }

    return res.json({ status: 'success', message: 'Industry assignments updated' });
  } catch (err) {
    console.error('[industry.content] set_industry_assignments:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. PUBLISH CONTENT
// PUT /admin-api/industry-content/publish/:id
// ─────────────────────────────────────────────────────────────────────────────
const publish_content = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const content = await IndustryContent.findOne({ _id: id, deleted_at: null });
    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    if (['ARCHIVED'].includes(content.status))
      return res.status(409).json({ status: 'error', message: `Cannot publish content with status "${content.status}"` });

    // Sync any industries passed in the request body
    const raw_industry_ids = req.body?.industry_ids !== undefined ? req.body?.industry_ids : req.body?.industry_type_ids;
    if (raw_industry_ids) {
      const arr_industry_ids = Array.isArray(raw_industry_ids) ? raw_industry_ids : [raw_industry_ids];
      const valid_ids = arr_industry_ids
        .map(i => (typeof i === 'object' && i ? (i._id || i.id || i.industry_type_id) : i))
        .filter(iid => iid && mongoose.Types.ObjectId.isValid(iid))
        .map(iid => iid.toString());

      for (const iid of valid_ids) {
        await IndustryContentIndustryMap.findOneAndUpdate(
          { content_id: id, industry_type_id: iid },
          { $set: { deleted_at: null, is_active: true } },
          { upsert: true, new: true }
        );
      }
    }

    // Verify at least one industry is assigned
    const mapCount = await IndustryContentIndustryMap.countDocuments({ content_id: id, deleted_at: null });
    if (mapCount === 0)
      return res.status(409).json({ status: 'error', message: 'Assign at least one industry before publishing' });

    content.status       = 'PUBLISHED';
    content.published_at = new Date();
    content.approved_by  = req.user?.id;
    content.updated_by   = req.user?.id;
    await content.save();

    // Invalidate cache for all assigned industries
    const maps = await IndustryContentIndustryMap.find({ content_id: id, deleted_at: null }).lean();
    maps.forEach(m => invalidate_industry_cache(m.industry_type_id.toString()));

    return res.json({ status: 'success', message: 'Content published successfully', data: { id: content._id, status: content.status } });
  } catch (err) {
    console.error('[industry.content] publish_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. UNPUBLISH / PAUSE CONTENT
// PUT /admin-api/industry-content/unpublish/:id
// ─────────────────────────────────────────────────────────────────────────────
const unpublish_content = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const content = await IndustryContent.findOne({ _id: id, deleted_at: null });
    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    content.status     = 'PAUSED';
    content.updated_by = req.user?.id;
    await content.save();

    const maps = await IndustryContentIndustryMap.find({ content_id: id, deleted_at: null }).lean();
    maps.forEach(m => invalidate_industry_cache(m.industry_type_id.toString()));

    return res.json({ status: 'success', message: 'Content paused/unpublished', data: { id: content._id, status: content.status } });
  } catch (err) {
    console.error('[industry.content] unpublish_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. SCHEDULE CONTENT
// PUT /admin-api/industry-content/schedule/:id
// Body: { start_at, end_at }
// ─────────────────────────────────────────────────────────────────────────────
const schedule_content = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_at, end_at } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    if (!start_at) return res.status(400).json({ status: 'error', message: 'start_at is required for scheduling' });

    const content = await IndustryContent.findOne({ _id: id, deleted_at: null });
    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    // Sync any industries passed in the request body
    const raw_industry_ids = req.body?.industry_ids !== undefined ? req.body?.industry_ids : req.body?.industry_type_ids;
    if (raw_industry_ids) {
      const arr_industry_ids = Array.isArray(raw_industry_ids) ? raw_industry_ids : [raw_industry_ids];
      const valid_ids = arr_industry_ids
        .map(i => (typeof i === 'object' && i ? (i._id || i.id || i.industry_type_id) : i))
        .filter(iid => iid && mongoose.Types.ObjectId.isValid(iid))
        .map(iid => iid.toString());

      for (const iid of valid_ids) {
        await IndustryContentIndustryMap.findOneAndUpdate(
          { content_id: id, industry_type_id: iid },
          { $set: { deleted_at: null, is_active: true } },
          { upsert: true, new: true }
        );
      }
    }

    // Verify at least one industry is assigned
    const mapCount = await IndustryContentIndustryMap.countDocuments({ content_id: id, deleted_at: null });
    if (mapCount === 0)
      return res.status(409).json({ status: 'error', message: 'Assign at least one industry before scheduling' });

    content.status     = 'SCHEDULED';
    content.start_at   = new Date(start_at);
    content.end_at     = end_at ? new Date(end_at) : null;
    content.updated_by = req.user?.id;
    await content.save();

    return res.json({ status: 'success', message: 'Content scheduled', data: { id: content._id, status: content.status, start_at: content.start_at, end_at: content.end_at } });
  } catch (err) {
    console.error('[industry.content] schedule_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. ARCHIVE CONTENT
// PUT /admin-api/industry-content/archive/:id
// ─────────────────────────────────────────────────────────────────────────────
const archive_content = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const content = await IndustryContent.findOne({ _id: id, deleted_at: null });
    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    content.status     = 'ARCHIVED';
    content.updated_by = req.user?.id;
    await content.save();

    const maps = await IndustryContentIndustryMap.find({ content_id: id, deleted_at: null }).lean();
    maps.forEach(m => invalidate_industry_cache(m.industry_type_id.toString()));

    return res.json({ status: 'success', message: 'Content archived', data: { id: content._id, status: content.status } });
  } catch (err) {
    console.error('[industry.content] archive_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 12. PREVIEW CONTENT (formatted for frontend preview)
// GET /admin-api/industry-content/preview/:id
// ─────────────────────────────────────────────────────────────────────────────
const preview_content = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const [content, media] = await Promise.all([
      IndustryContent.findOne({ _id: id, deleted_at: null }).lean(),
      IndustryContentMedia.find({ content_id: id, deleted_at: null }).lean(),
    ]);

    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    const grouped_media = {};
    for (const m of media) {
      const key = m.device_type;
      if (!grouped_media[key]) grouped_media[key] = [];
      grouped_media[key].push({ ...m, id: m._id });
    }

    return res.json({
      status: 'success',
      data: { ...content, id: content._id, media: grouped_media },
    });
  } catch (err) {
    console.error('[industry.content] preview_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 13. REORDER CONTENT
// PUT /admin-api/industry-content/reorder
// Body: { items: [{ id, display_order }] }
// ─────────────────────────────────────────────────────────────────────────────
const reorder_content = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ status: 'error', message: 'items array is required' });

    const ops = items.map(item => ({
      updateOne: {
        filter: { _id: item.id, deleted_at: null },
        update: { $set: { display_order: Number(item.display_order), updated_by: req.user?.id } },
      },
    }));

    await IndustryContent.bulkWrite(ops);

    return res.json({ status: 'success', message: 'Content reordered' });
  } catch (err) {
    console.error('[industry.content] reorder_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 14. TRACK ANALYTICS EVENT
// POST /admin-api/industry-content/analytics
// Body: { content_id, industry_type_id, event_type, user_type, user_id, placement, device_type }
// ─────────────────────────────────────────────────────────────────────────────
const track_analytics = async (req, res) => {
  try {
    const { content_id, industry_type_id, event_type, user_type, user_id, placement, device_type } = req.body;

    if (!content_id || !event_type)
      return res.status(400).json({ status: 'error', message: 'content_id and event_type are required' });

    await IndustryContentAnalytics.create({
      content_id,
      industry_type_id: industry_type_id || null,
      event_type,
      user_type: user_type || 'ANONYMOUS',
      user_id:   user_id && mongoose.Types.ObjectId.isValid(user_id) ? user_id : null,
      placement:   placement || null,
      device_type: device_type || null,
      recorded_at: new Date(),
    });

    return res.json({ status: 'success' });
  } catch (err) {
    // Non-critical — do not surface errors to client
    console.error('[industry.content] track_analytics:', err.message);
    return res.json({ status: 'success' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 15. GET ANALYTICS SUMMARY
// GET /admin-api/industry-content/analytics/:id
// ─────────────────────────────────────────────────────────────────────────────
const get_analytics = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const pipeline = [
      { $match: { content_id: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: '$event_type', count: { $sum: 1 } } },
    ];

    const results = await IndustryContentAnalytics.aggregate(pipeline);
    const summary = {};
    results.forEach(r => { summary[r._id] = r.count; });

    return res.json({ status: 'success', data: summary });
  } catch (err) {
    console.error('[industry.content] get_analytics:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 16. DUPLICATE CONTENT
// POST /admin-api/industry-content/duplicate/:id
// ─────────────────────────────────────────────────────────────────────────────
const duplicate_content = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const original = await IndustryContent.findOne({ _id: id, deleted_at: null }).lean();
    if (!original) return res.status(404).json({ status: 'error', message: 'Content not found' });

    const [originalMedia, originalMaps] = await Promise.all([
      IndustryContentMedia.find({ content_id: id, deleted_at: null }).lean(),
      IndustryContentIndustryMap.find({ content_id: id, deleted_at: null }).lean(),
    ]);

    // Create cloned content record
    const { _id, id: _tempId, created_at, updated_at, ...cleanObj } = original;
    const cloned = await IndustryContent.create({
      ...cleanObj,
      title: `${cleanObj.title} (Copy)`,
      internal_name: `${cleanObj.internal_name}_COPY_${Date.now().toString().slice(-4)}`,
      status: 'DRAFT',
      created_by: req.user?.id,
      published_at: null,
      view_count: 0,
      likes_count: 0,
    });

    // Clone industry maps
    if (originalMaps.length > 0) {
      const mapsToInsert = originalMaps.map(m => ({
        content_id: cloned._id,
        industry_type_id: m.industry_type_id,
        is_active: m.is_active,
      }));
      await IndustryContentIndustryMap.insertMany(mapsToInsert, { ordered: false }).catch(() => {});
    }

    // Clone media
    if (originalMedia.length > 0) {
      const mediaToInsert = originalMedia.map(m => {
        const { _id: _mId, id: _mTempId, content_id, created_at: _ca, updated_at: _ua, ...cleanMedia } = m;
        return {
          ...cleanMedia,
          content_id: cloned._id,
        };
      });
      await IndustryContentMedia.insertMany(mediaToInsert, { ordered: false }).catch(() => {});
    }

    return res.status(201).json({
      status: 'success',
      message: 'Content duplicated successfully',
      data: { id: cloned._id, ...cloned.toObject() },
    });
  } catch (err) {
    console.error('[industry.content] duplicate_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 17. BULK ACTION
// POST /admin-api/industry-content/bulk-action
// Body: { ids: [...], action: 'publish' | 'pause' | 'archive' | 'delete' | 'activate' | 'deactivate' }
// ─────────────────────────────────────────────────────────────────────────────
const bulk_action = async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !action) {
      return res.status(400).json({ status: 'error', message: 'ids array and action are required' });
    }

    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No valid ids provided' });
    }

    let targetIds = validIds;
    let skippedCount = 0;

    if (action === 'publish') {
      const maps = await IndustryContentIndustryMap.find({
        content_id: { $in: validIds },
        deleted_at: null,
      }).select('content_id').lean();
      const idsWithIndustry = new Set(maps.map(m => m.content_id.toString()));
      targetIds = validIds.filter(id => idsWithIndustry.has(id.toString()));
      skippedCount = validIds.length - targetIds.length;

      if (targetIds.length === 0) {
        return res.status(409).json({
          status: 'error',
          message: 'None of the selected items have an industry assigned. Please assign at least one industry before publishing.',
        });
      }
    }

    let update = {};
    if (action === 'publish') {
      update = { status: 'PUBLISHED', is_active: true, published_at: new Date(), updated_by: req.user?.id };
    } else if (action === 'pause') {
      update = { status: 'PAUSED', updated_by: req.user?.id };
    } else if (action === 'archive') {
      update = { status: 'ARCHIVED', is_active: false, updated_by: req.user?.id };
    } else if (action === 'delete') {
      update = { deleted_at: new Date(), updated_by: req.user?.id };
    } else if (action === 'activate') {
      update = { is_active: true, updated_by: req.user?.id };
    } else if (action === 'deactivate') {
      update = { is_active: false, updated_by: req.user?.id };
    } else {
      return res.status(400).json({ status: 'error', message: `Unknown action: ${action}` });
    }

    await IndustryContent.updateMany(
      { _id: { $in: targetIds }, deleted_at: null },
      { $set: update }
    );

    // Invalidate affected industry caches
    const maps = await IndustryContentIndustryMap.find({ content_id: { $in: targetIds }, deleted_at: null }).lean();
    maps.forEach(m => invalidate_industry_cache(m.industry_type_id.toString()));

    const msg = skippedCount > 0
      ? `Bulk publish completed for ${targetIds.length} items (${skippedCount} skipped: no industry assigned)`
      : `Bulk ${action} completed for ${targetIds.length} items`;

    return res.json({ status: 'success', message: msg });
  } catch (err) {
    console.error('[industry.content] bulk_action:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 18. QUICK TOGGLE ACTIVE
// PUT /admin-api/industry-content/toggle-active/:id
// ─────────────────────────────────────────────────────────────────────────────
const toggle_active = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const content = await IndustryContent.findOne({ _id: id, deleted_at: null });
    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    content.is_active = !content.is_active;
    content.updated_by = req.user?.id;
    await content.save();

    const maps = await IndustryContentIndustryMap.find({ content_id: id, deleted_at: null }).lean();
    maps.forEach(m => invalidate_industry_cache(m.industry_type_id.toString()));

    return res.json({
      status: 'success',
      message: `Content ${content.is_active ? 'activated' : 'deactivated'}`,
      data: { id: content._id, is_active: content.is_active },
    });
  } catch (err) {
    console.error('[industry.content] toggle_active:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 19. PUBLIC LIST CONTENT (SolarShop India & public storefronts)
// GET /admin-api/industry-content/public/list
// ─────────────────────────────────────────────────────────────────────────────
const list_public_content = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      industry_type_id,
      industry_slug,
      content_type,
      content_category, // 'INDUSTRY' | 'GOVT_TENDER' — filter for browse tabs
      placement,
      is_featured,
      search,
      scheme,
      state,
      state_id,
      state_name,
      district,
      district_id,
      district_name,
      sort = 'featured', // 'featured' | 'newest' | 'popular'
    } = req.query;

    const now = new Date();
    const filter = {
      deleted_at: null,
      status: 'PUBLISHED',
      is_active: true,
      $or: [
        { start_at: null },
        { start_at: { $lte: now } },
      ],
      $and: [
        {
          $or: [
            { end_at: null },
            { end_at: { $gte: now } },
          ],
        },
      ],
    };

    if (content_type && content_type !== 'ALL') {
      filter.content_type = content_type;
    }
    if (content_category) {
      filter.content_category = content_category;
    }
    if (placement) {
      filter.placement = placement;
    }
    if (is_featured !== undefined && is_featured !== '') {
      filter.is_featured = is_featured === 'true' || is_featured === true;
    }
    const searchParam = (scheme || search || '').trim();
    if (searchParam) {
      filter.$and.push({
        $or: [
          { title: { $regex: searchParam, $options: 'i' } },
          { heading: { $regex: searchParam, $options: 'i' } },
          { short_description: { $regex: searchParam, $options: 'i' } },
          { internal_name: { $regex: searchParam, $options: 'i' } },
        ],
      });
    }

    // Geolocation state & district filtering
    const stateFilterVal = (state || state_name || state_id || '').trim();
    if (stateFilterVal && stateFilterVal.toLowerCase() !== 'all') {
      const stateEscaped = stateFilterVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and.push({
        $or: [
          { is_all_states: true },
          { applicable_states: { $size: 0 } },
          { applicable_states: { $exists: false } },
          { applicable_states: { $regex: new RegExp(`^${stateEscaped}$`, 'i') } },
          { applicable_states: stateFilterVal },
        ],
      });
    }

    const districtFilterVal = (district || district_name || district_id || '').trim();
    if (districtFilterVal && districtFilterVal.toLowerCase() !== 'all') {
      const distEscaped = districtFilterVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and.push({
        $or: [
          { applicable_districts: { $size: 0 } },
          { applicable_districts: { $exists: false } },
          { applicable_districts: { $regex: new RegExp(`^${distEscaped}$`, 'i') } },
          { applicable_districts: districtFilterVal },
        ],
      });
    }

    // Resolve industry filter
    let targetIndustryId = industry_type_id;
    if (!targetIndustryId && industry_slug && industry_slug !== 'all') {
      const ind = await IndustryType.findOne({ slug: industry_slug, deleted_at: null, is_active: true }).lean();
      if (ind) {
        targetIndustryId = ind._id;
      }
    }

    if (targetIndustryId && mongoose.Types.ObjectId.isValid(targetIndustryId)) {
      const maps = await IndustryContentIndustryMap.find({
        industry_type_id: targetIndustryId,
        deleted_at: null,
      }).select('content_id').lean();
      const contentIds = maps.map(m => m.content_id);
      filter._id = { $in: contentIds };
    }

    // Determine sort
    let sortObj = { priority: -1, display_order: 1, created_at: -1 };
    if (sort === 'newest') {
      sortObj = { published_at: -1, created_at: -1 };
    } else if (sort === 'popular') {
      sortObj = { view_count: -1, download_count: -1, created_at: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      IndustryContent.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      IndustryContent.countDocuments(filter),
    ]);

    const ids = items.map(i => i._id);
    const [maps, mediaList] = await Promise.all([
      IndustryContentIndustryMap.find({
        content_id: { $in: ids },
        deleted_at: null,
      }).populate('industry_type_id', 'name slug icon is_active sort_order').lean(),
      IndustryContentMedia.find({
        content_id: { $in: ids },
        deleted_at: null,
        processing_status: { $ne: 'FAILED' },
      }).sort({ is_primary: -1, sort_order: 1, created_at: 1 }).lean(),
    ]);

    // Fetch related kits details for these items
    const allKitIds = [];
    items.forEach(i => {
      if (Array.isArray(i.related_kit_ids)) {
        i.related_kit_ids.forEach(kid => {
          if (kid && mongoose.Types.ObjectId.isValid(kid)) allKitIds.push(kid);
        });
      }
    });

    const kitsMap = {};
    if (allKitIds.length > 0) {
      try {
        const foundKits = await SolarKit.find({ _id: { $in: allKitIds }, deleted_at: null })
          .populate('category_id', 'name')
          .populate('subcategory_id', 'name')
          .select('name description category_id subcategory_id image')
          .lean();
        foundKits.forEach(k => {
          kitsMap[k._id.toString()] = {
            id: k._id,
            _id: k._id,
            name: k.name,
            description: k.description,
            category: k.category_id?.name || '',
            subCategory: k.subcategory_id?.name || '',
            image: k.image || null,
          };
        });
      } catch (kitErr) {
        console.error('[industry.content] error populating kits:', kitErr);
      }
    }

    const mapByContent = {};
    maps.forEach(m => {
      const cid = m.content_id.toString();
      if (!mapByContent[cid]) mapByContent[cid] = [];
      if (m.industry_type_id) {
        mapByContent[cid].push({
          id: m.industry_type_id._id,
          name: m.industry_type_id.name,
          slug: m.industry_type_id.slug,
          icon: m.industry_type_id.icon,
        });
      }
    });

    const mediaByContent = {};
    mediaList.forEach(m => {
      const cid = m.content_id.toString();
      if (!mediaByContent[cid]) mediaByContent[cid] = [];
      mediaByContent[cid].push({ ...m, id: m._id });
    });

    const data = items.map(item => {
      const contentMedia = mediaByContent[item._id.toString()] || [];
      const primaryMedia = contentMedia.find(m => m.is_primary) || contentMedia[0] || null;
      const thumbnail = primaryMedia?.thumbnail_url || primaryMedia?.poster_url || primaryMedia?.url || null;

      const itemRelatedKitIds = Array.isArray(item.related_kit_ids) ? item.related_kit_ids : [];
      const itemRelatedKits = itemRelatedKitIds.map(kid => kitsMap[kid?.toString()]).filter(Boolean);

      return {
        id: item._id,
        _id: item._id,
        title: item.title,
        heading: item.heading || item.title,
        short_description: item.short_description,
        content_type: item.content_type,
        target_audience: item.target_audience,
        placement: item.placement,
        cta_label: item.cta_label,
        cta_url: item.cta_url,
        is_featured: item.is_featured,
        content_category: item.content_category || 'INDUSTRY',
        priority: item.priority,
        display_order: item.display_order,
        focal_position: item.focal_position,
        allow_download: item.allow_download,
        allow_share: item.allow_share,
        autoplay: item.autoplay,
        view_count: item.view_count || 0,
        download_count: item.download_count || 0,
        share_count: item.share_count || 0,
        published_at: item.published_at,
        is_all_states: item.is_all_states !== false,
        applicable_states: item.applicable_states || [],
        applicable_districts: item.applicable_districts || [],
        related_kit_ids: itemRelatedKitIds,
        related_kits: itemRelatedKits,
        industries: mapByContent[item._id.toString()] || [],
        media: contentMedia,
        thumbnail,
        primary_media: primaryMedia,
        media_count: contentMedia.length,
      };
    });

    return res.json({
      status: 'success',
      data,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[industry.content] list_public_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 20. GET PUBLIC CONTENT DETAIL
// GET /admin-api/industry-content/public/detail/:id
// ─────────────────────────────────────────────────────────────────────────────
const get_public_content_detail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ status: 'error', message: 'Invalid content id' });

    const content = await IndustryContent.findOne({
      _id: id,
      deleted_at: null,
      status: 'PUBLISHED',
      is_active: true,
    }).lean();

    if (!content) return res.status(404).json({ status: 'error', message: 'Content not found' });

    const [media, maps] = await Promise.all([
      IndustryContentMedia.find({ content_id: id, deleted_at: null }).sort({ is_primary: -1, sort_order: 1 }).lean(),
      IndustryContentIndustryMap.find({ content_id: id, deleted_at: null })
        .populate('industry_type_id', 'name slug icon is_active')
        .lean(),
    ]);

    const primaryMedia = media.find(m => m.is_primary) || media[0] || null;

    return res.json({
      status: 'success',
      data: {
        ...content,
        id: content._id,
        media: media.map(m => ({ ...m, id: m._id })),
        primary_media: primaryMedia,
        thumbnail: primaryMedia?.thumbnail_url || primaryMedia?.poster_url || primaryMedia?.url || null,
        industries: maps.filter(m => m.industry_type_id).map(m => ({
          id: m.industry_type_id._id,
          name: m.industry_type_id.name,
          slug: m.industry_type_id.slug,
          icon: m.industry_type_id.icon,
        })),
      },
    });
  } catch (err) {
    console.error('[industry.content] get_public_content_detail:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── Export cache for use by dashboard handler ─────────────────────────────
module.exports = {
  list_content,
  get_content_detail,
  create_content,
  update_content,
  upload_content_media,
  delete_content_media,
  set_industry_assignments,
  publish_content,
  unpublish_content,
  schedule_content,
  archive_content,
  preview_content,
  reorder_content,
  duplicate_content,
  bulk_action,
  toggle_active,
  list_public_content,
  get_public_content_detail,
  track_analytics,
  get_analytics,
  // Expose cache invalidation for scheduler
  invalidate_industry_cache,
  contentCache,
  CACHE_KEY,
};

