/**
 * industry.theme.handler.js
 *
 * Admin CRUD for Industry Theme configuration (design tokens per industry).
 * Industry Content Management System — Phase 1
 */

const mongoose = require('mongoose');
const { IndustryTheme, IndustryType } = require('../models/core_db');

// Regex: Only allow safe CSS color values (hex, rgb, rgba, hsl, hsla, named colors)
const COLOR_REGEX = /^(#[0-9A-Fa-f]{3,8}|rgb\([\d\s,]+\)|rgba\([\d\s,.]+\)|hsl\([\d\s,%]+\)|hsla\([\d\s,.%]+\)|[a-zA-Z]{3,30})$/;

function sanitize_color(value) {
  if (!value) return null;
  const trimmed = value.trim();
  return COLOR_REGEX.test(trimmed) ? trimmed : null;
}

function sanitize_url(url) {
  if (!url) return null;
  const trimmed = url.trim();
  return /^https?:\/\//.test(trimmed) ? trimmed : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET THEME FOR INDUSTRY
// GET /admin-api/industry-themes/get?industry_type_id=...
// ─────────────────────────────────────────────────────────────────────────────
const get_theme = async (req, res) => {
  try {
    const { industry_type_id } = req.query;
    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id))
      return res.status(400).json({ status: 'error', message: 'Valid industry_type_id is required' });

    const theme = await IndustryTheme.findOne({ industry_type_id, deleted_at: null }).lean();

    return res.json({ status: 'success', data: theme ? { ...theme, id: theme._id } : null });
  } catch (err) {
    console.error('[industry.theme] get_theme:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. UPSERT THEME
// POST /admin-api/industry-themes/upsert
// Body: { industry_type_id, primary_color, secondary_color, accent_color, bg_color,
//         text_color, section_bg, button_style, default_banner_url, default_video_thumbnail_url }
// ─────────────────────────────────────────────────────────────────────────────
const upsert_theme = async (req, res) => {
  try {
    const {
      industry_type_id,
      primary_color, secondary_color, accent_color, bg_color, text_color, section_bg,
      button_style, default_banner_url, default_video_thumbnail_url,
    } = req.body;

    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id))
      return res.status(400).json({ status: 'error', message: 'Valid industry_type_id is required' });

    const industry = await IndustryType.findOne({ _id: industry_type_id, deleted_at: null }).lean();
    if (!industry)
      return res.status(404).json({ status: 'error', message: 'Industry type not found' });

    const data = {
      primary_color:                sanitize_color(primary_color),
      secondary_color:              sanitize_color(secondary_color),
      accent_color:                 sanitize_color(accent_color),
      bg_color:                     sanitize_color(bg_color),
      text_color:                   sanitize_color(text_color),
      section_bg:                   sanitize_color(section_bg),
      button_style:                 ['SOLID','OUTLINE','GHOST'].includes(button_style) ? button_style : 'SOLID',
      default_banner_url:           sanitize_url(default_banner_url),
      default_video_thumbnail_url:  sanitize_url(default_video_thumbnail_url),
      updated_by:                   req.user?.id,
      deleted_at:                   null,
    };

    const theme = await IndustryTheme.findOneAndUpdate(
      { industry_type_id },
      { $set: data, $setOnInsert: { created_by: req.user?.id } },
      { upsert: true, new: true }
    ).lean();

    return res.json({ status: 'success', data: { ...theme, id: theme._id } });
  } catch (err) {
    console.error('[industry.theme] upsert_theme:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. DELETE THEME
// DELETE /admin-api/industry-themes/delete
// Body: { industry_type_id }
// ─────────────────────────────────────────────────────────────────────────────
const delete_theme = async (req, res) => {
  try {
    const { industry_type_id } = req.body;
    if (!industry_type_id || !mongoose.Types.ObjectId.isValid(industry_type_id))
      return res.status(400).json({ status: 'error', message: 'Valid industry_type_id is required' });

    const theme = await IndustryTheme.findOne({ industry_type_id, deleted_at: null });
    if (!theme) return res.status(404).json({ status: 'error', message: 'Theme not found' });

    theme.deleted_at = new Date();
    await theme.save();

    return res.json({ status: 'success', message: 'Theme deleted' });
  } catch (err) {
    console.error('[industry.theme] delete_theme:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = { get_theme, upsert_theme, delete_theme };
