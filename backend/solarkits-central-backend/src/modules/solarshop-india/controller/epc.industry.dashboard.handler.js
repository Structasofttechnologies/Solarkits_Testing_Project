/**
 * epc.industry.dashboard.handler.js
 *
 * Dashboard content delivery APIs for authenticated EPC Buyers.
 * Mirrors industry.dashboard.handler.js but validates EPC access.
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

const epcDashboardCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

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

// ── Get EPC user ID from request (set by verify_auth middleware) ────────────
function get_epc_id(req) {
  return req.user?.id || req.user?._id || req.user?.userId;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET EPC'S APPROVED INDUSTRIES
// GET /api/india/v1/shop/industry/my-industries
// ─────────────────────────────────────────────────────────────────────────────
const get_my_industries = async (req, res) => {
  try {
    const epc_id = get_epc_id(req);
    if (!epc_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    const maps = await UserIndustryMap.find({
      user_type: 'EPC',
      user_id:   epc_id,
      approval_status: 'APPROVED',
      deleted_at: null,
    }).populate({
      path: 'industry_type_id',
      match: { is_active: true, deleted_at: null, for_epc: true },
      select: 'name code slug description icon thumbnail sort_order',
    }).lean();

    const industries = maps
      .filter(m => m.industry_type_id)
      .map(m => ({ ...m.industry_type_id, id: m.industry_type_id._id }));

    return res.json({ status: 'success', data: industries });
  } catch (err) {
    console.error('[epc.industry.dashboard] get_my_industries:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET DASHBOARD CONTENT
// GET /api/india/v1/shop/industry/dashboard-content?industry_type_id=...&placement=...
// ─────────────────────────────────────────────────────────────────────────────
const get_dashboard_content = async (req, res) => {
  try {
    const epc_id = get_epc_id(req);
    if (!epc_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    const { industry_type_id, placement } = req.query;

    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id))
      return res.status(400).json({ status: 'error', message: 'Valid industry_type_id is required' });

    // Security gate
    const access_map = await UserIndustryMap.findOne({
      user_type: 'EPC',
      user_id:   epc_id,
      industry_type_id,
      approval_status: 'APPROVED',
      deleted_at: null,
    }).lean();

    if (!access_map)
      return res.status(403).json({ status: 'error', message: 'You are not authorized to access content for this industry' });

    // Cache
    const cache_key = `epc_dash:${industry_type_id}:${placement || 'all'}`;
    const cached = epcDashboardCache.get(cache_key);
    if (cached) return res.json({ status: 'success', data: cached, cached: true });

    const now = new Date();
    const maps = await IndustryContentIndustryMap.find({ industry_type_id, deleted_at: null }).select('content_id').lean();
    const content_ids = maps.map(m => m.content_id);

    if (!content_ids.length) {
      epcDashboardCache.set(cache_key, []);
      return res.json({ status: 'success', data: [] });
    }

    const filter = {
      _id:    { $in: content_ids },
      status: 'PUBLISHED',
      is_active: true,
      target_audience: { $in: ['EPC', 'BOTH'] },
      deleted_at: null,
      $or: [{ start_at: null }, { start_at: { $lte: now } }],
      $and: [{ $or: [{ end_at: null }, { end_at: { $gte: now } }] }],
    };
    if (placement) filter.placement = placement;

    const contents = await IndustryContent.find(filter)
      .sort({ priority: -1, display_order: 1, published_at: -1 })
      .lean();

    const cids = contents.map(c => c._id);
    const mediaMap = await get_media_for_content(cids);

    const data = contents.map(c => ({
      ...c,
      id:    c._id,
      media: mediaMap[c._id.toString()] || [],
    }));

    epcDashboardCache.set(cache_key, data);
    return res.json({ status: 'success', data });
  } catch (err) {
    console.error('[epc.industry.dashboard] get_dashboard_content:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET INDUSTRY THEME
// ─────────────────────────────────────────────────────────────────────────────
const get_industry_theme = async (req, res) => {
  try {
    const { industry_type_id } = req.query;
    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id))
      return res.status(400).json({ status: 'error', message: 'Valid industry_type_id is required' });

    const theme = await IndustryTheme.findOne({ industry_type_id, deleted_at: null }).lean();
    return res.json({ status: 'success', data: theme ? { ...theme, id: theme._id } : null });
  } catch (err) {
    console.error('[epc.industry.dashboard] get_industry_theme:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

function invalidate_cache(industry_type_id) {
  const keys = epcDashboardCache.keys().filter(k => k.includes(`:${industry_type_id}:`));
  if (keys.length) epcDashboardCache.del(keys);
}

module.exports = {
  get_my_industries,
  get_dashboard_content,
  get_industry_theme,
  invalidate_cache,
};
