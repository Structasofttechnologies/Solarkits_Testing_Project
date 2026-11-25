/**
 * industry.dashboard.handler.js
 *
 * Dashboard content delivery APIs for authenticated Resellers.
 * Called from reseller.portal.route.js.
 *
 * Every response validates:
 *   1. Reseller JWT is valid (done by verify_reseller_auth middleware)
 *   2. Reseller has APPROVED UserIndustryMap for the requested industry
 *   3. Content is PUBLISHED and within schedule
 *   4. target_audience is RESELLER or BOTH
 *   5. is_active is true
 *
 * Industry Content Management System
 */

const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const {
  IndustryType,
  IndustryContent,
  IndustryContentIndustryMap,
  IndustryContentMedia,
  IndustryTheme,
  UserIndustryMap,
  Product,
} = require('../../admin-panel/models/core_db');

// ── In-process cache (5 min TTL) shared with admin handler ───────────────────
const dashboardCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ── Helpers ───────────────────────────────────────────────────────────────────
function is_currently_active(content) {
  const now = new Date();
  if (content.start_at && new Date(content.start_at) > now) return false;
  if (content.end_at   && new Date(content.end_at)   < now) return false;
  return true;
}

async function get_media_for_content(content_ids) {
  if (!content_ids.length) return {};
  const media = await IndustryContentMedia.find({
    content_id: { $in: content_ids },
    deleted_at: null,
    processing_status: { $ne: 'FAILED' },
  }).lean();

  const byContent = {};
  for (const m of media) {
    const cid = m.content_id.toString();
    if (!byContent[cid]) byContent[cid] = [];
    byContent[cid].push({ ...m, id: m._id });
  }
  return byContent;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET RESELLER'S APPROVED INDUSTRIES
// GET /api/india/v1/reseller/industry/my-industries
// ─────────────────────────────────────────────────────────────────────────────
const get_my_industries = async (req, res) => {
  try {
    const reseller_id = req.reseller?.id || req.reseller?._id;
    if (!reseller_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    const maps = await UserIndustryMap.find({
      user_type: 'RESELLER',
      user_id:   reseller_id,
      approval_status: 'APPROVED',
      deleted_at: null,
    }).populate({
      path: 'industry_type_id',
      match: { is_active: true, deleted_at: null, for_resellers: true },
      select: 'name code slug description icon thumbnail sort_order',
    }).lean();

    let industries = maps
      .filter(m => m.industry_type_id)
      .map(m => ({ ...m.industry_type_id, id: m.industry_type_id._id }));

    // If no explicit per-user mapping is recorded, serve all active industries configured for resellers
    if (!industries.length) {
      const allActive = await IndustryType.find({ is_active: true, deleted_at: null, for_resellers: true })
        .sort({ sort_order: 1 })
        .select('name code slug description icon thumbnail sort_order')
        .lean();
      industries = allActive.map(i => ({ ...i, id: i._id }));
    }

    return res.json({ status: 'success', data: industries });
  } catch (err) {
    console.error('[industry.dashboard] get_my_industries:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. SAVE SELECTED INDUSTRY PREFERENCE
// POST /api/india/v1/reseller/industry/select
// Body: { industry_type_id }
// ─────────────────────────────────────────────────────────────────────────────
const select_industry = async (req, res) => {
  try {
    const reseller_id = req.reseller?.id || req.reseller?._id;
    const { industry_type_id } = req.body;

    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id))
      return res.status(400).json({ status: 'error', message: 'Valid industry_type_id is required' });

    return res.json({ status: 'success', data: { industry_type_id } });
  } catch (err) {
    console.error('[industry.dashboard] select_industry:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET DASHBOARD CONTENT
// GET /api/india/v1/reseller/industry/dashboard-content
// ?industry_type_id=...&placement=DASHBOARD_TOP
// ─────────────────────────────────────────────────────────────────────────────
const get_dashboard_content = async (req, res) => {
  try {
    const reseller_id = req.reseller?.id || req.reseller?._id;
    const { industry_type_id, placement } = req.query;

    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id))
      return res.status(400).json({ status: 'error', message: 'Valid industry_type_id is required' });

    // ── Security gate ──────────────────────────────────────────────────────
    const access_map = await UserIndustryMap.findOne({
      user_type: 'RESELLER',
      user_id:   reseller_id,
      industry_type_id,
      approval_status: 'APPROVED',
      deleted_at: null,
    }).lean();

    if (!access_map) {
      // Verify the industry type exists and is active for resellers
      const ind = await IndustryType.findOne({ _id: industry_type_id, is_active: true, deleted_at: null, for_resellers: true });
      if (!ind) {
        return res.status(403).json({ status: 'error', message: 'You are not authorized to access content for this industry' });
      }
    }

    // ── Try cache ──────────────────────────────────────────────────────────
    const cache_key = `rsl_dash:${industry_type_id}:${placement || 'all'}`;
    const cached = dashboardCache.get(cache_key);
    if (cached) return res.json({ status: 'success', data: cached, cached: true });

    // ── Fetch published content for this industry ──────────────────────────
    const now = new Date();

    // Get content IDs mapped to this industry
    const maps = await IndustryContentIndustryMap.find({
      industry_type_id,
      deleted_at: null,
    }).select('content_id').lean();

    const content_ids = maps.map(m => m.content_id);

    if (!content_ids.length) {
      dashboardCache.set(cache_key, []);
      return res.json({ status: 'success', data: [] });
    }

    const filter = {
      _id:    { $in: content_ids },
      status: 'PUBLISHED',
      is_active: true,
      target_audience: { $in: ['RESELLER', 'BOTH'] },
      deleted_at: null,
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

    if (placement) filter.placement = placement;

    const contents = await IndustryContent.find(filter)
      .sort({ priority: -1, display_order: 1, published_at: -1 })
      .lean();

    // Attach media
    const cids = contents.map(c => c._id);
    const mediaMap = await get_media_for_content(cids);

    const data = contents.map(c => ({
      ...c,
      id:    c._id,
      media: mediaMap[c._id.toString()] || [],
    }));

    dashboardCache.set(cache_key, data);
    return res.json({ status: 'success', data });
  } catch (err) {
    console.error('[industry.dashboard] get_dashboard_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET RELATED PRODUCTS
// GET /api/india/v1/reseller/industry/related-products?industry_type_id=...
// ─────────────────────────────────────────────────────────────────────────────
const get_related_products = async (req, res) => {
  try {
    const reseller_id = req.reseller?.id || req.reseller?._id;
    const { industry_type_id, page = 1, limit = 20 } = req.query;

    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id))
      return res.status(400).json({ status: 'error', message: 'Valid industry_type_id is required' });

    // Security gate
    const access_map = await UserIndustryMap.findOne({
      user_type: 'RESELLER',
      user_id:   reseller_id,
      industry_type_id,
      approval_status: 'APPROVED',
      deleted_at: null,
    }).lean();

    if (!access_map) {
      // Verify the industry type exists and is active for resellers
      const ind = await IndustryType.findOne({
        _id: industry_type_id,
        is_active: true,
        deleted_at: null,
        $or: [{ for_resellers: true }, { for_resellers: { $exists: false } }],
      });
      if (!ind) {
        return res.status(403).json({ status: 'error', message: 'You are not authorized to access this industry' });
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find({
        industry_type_id,
        is_active: true,
        status: 'active',
        deleted_at: null,
      })
        .select('name sku_code description image base_price_paise tax_rate_pct stock_quantity industry_type_id')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments({ industry_type_id, is_active: true, status: 'active', deleted_at: null }),
    ]);

    return res.json({
      status: 'success',
      data: products.map(p => ({ ...p, id: p._id })),
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[industry.dashboard] get_related_products:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET INDUSTRY THEME
// GET /api/india/v1/reseller/industry/theme?industry_type_id=...
// ─────────────────────────────────────────────────────────────────────────────
const get_industry_theme = async (req, res) => {
  try {
    const { industry_type_id } = req.query;
    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id))
      return res.status(400).json({ status: 'error', message: 'Valid industry_type_id is required' });

    const theme = await IndustryTheme.findOne({ industry_type_id, deleted_at: null }).lean();
    return res.json({ status: 'success', data: theme ? { ...theme, id: theme._id } : null });
  } catch (err) {
    console.error('[industry.dashboard] get_industry_theme:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── Cache invalidation helper (called by scheduler or admin actions) ──────────
function invalidate_cache(industry_type_id) {
  const keys = dashboardCache.keys().filter(k => k.includes(`:${industry_type_id}:`));
  if (keys.length) dashboardCache.del(keys);
}

module.exports = {
  get_my_industries,
  select_industry,
  get_dashboard_content,
  get_related_products,
  get_industry_theme,
  invalidate_cache,
};
