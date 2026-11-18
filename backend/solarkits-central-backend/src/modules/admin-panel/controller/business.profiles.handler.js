/**
 * business.profiles.handler.js
 *
 * Admin & Client controller for Business Profile management.
 * Powers dynamic Business Profile configuration across franchise application forms and admin settings.
 *
 * NOTE: Stored directly inside the existing `solarshop_settings` collection to prevent
 * MongoDB Atlas Free/Shared tier quota violations ("already using 502 collections of 500").
 */

const mongoose = require('mongoose');
const { SolarShopSettings, FranchiseLead } = require('../models/india_solarshop_db');

const slugify = (str) =>
  (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

const getSettingsDoc = async () => {
  let doc = await SolarShopSettings.findOne({});
  if (!doc) {
    doc = await SolarShopSettings.create({});
  }
  if (!doc.business_profiles) {
    doc.business_profiles = [];
  }
  return doc;
};

// ─── 1. LIST BUSINESS PROFILES (Admin View with Live Usage Counts) ──────────────
const list_business_profiles = async (req, res) => {
  try {
    const doc = await getSettingsDoc();
    const allProfiles = (doc.business_profiles || []).map((p) => (p.toObject ? p.toObject() : p));

    const { search, status } = req.query;

    let filtered = allProfiles;

    if (status === 'active') {
      filtered = filtered.filter((p) => p.is_active !== false);
    } else if (status === 'inactive') {
      filtered = filtered.filter((p) => p.is_active === false);
    }

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.code && p.code.toLowerCase().includes(s))
      );
    }

    // Aggregate lead counts matching each business profile
    let leadCountsMap = {};
    try {
      const counts = await FranchiseLead.aggregate([
        { $match: { business_profile: { $ne: null } } },
        { $group: { _id: '$business_profile', count: { $sum: 1 } } },
      ]);
      counts.forEach((c) => {
        if (c._id) {
          leadCountsMap[c._id.toLowerCase().trim()] = c.count;
        }
      });
    } catch (aggErr) {
      console.warn('[business.profiles.handler] Lead count aggregate warning:', aggErr.message);
    }

    const profilesWithCounts = filtered.map((p) => {
      const nameKey = (p.name || '').toLowerCase().trim();
      const codeKey = (p.code || '').toLowerCase().trim();
      const count = leadCountsMap[nameKey] || leadCountsMap[codeKey] || 0;
      return {
        ...p,
        id: p._id,
        leads_count: count,
      };
    });

    const activeCount = allProfiles.filter((p) => p.is_active !== false).length;
    const inactiveCount = allProfiles.filter((p) => p.is_active === false).length;
    const totalLeads = Object.values(leadCountsMap).reduce((a, b) => a + b, 0);

    return res.status(200).json({
      status: 'success',
      data: profilesWithCounts,
      summary: {
        total_profiles: allProfiles.length,
        active_profiles: activeCount,
        inactive_profiles: inactiveCount,
        total_leads: totalLeads,
      },
    });
  } catch (error) {
    console.error('[business.profiles.handler] list_business_profiles error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch business profiles',
      error: error.message,
    });
  }
};

// ─── 2. LIST ACTIVE BUSINESS PROFILES (For Dropdowns & Public Forms) ────────────
const list_active_business_profiles = async (req, res) => {
  try {
    const doc = await SolarShopSettings.findOne({}).lean();
    const all = (doc?.business_profiles || []).filter((p) => p.is_active !== false);

    const data = all.map((p) => ({
      id: p._id,
      _id: p._id,
      name: p.name,
      code: p.code,
      is_active: p.is_active !== false,
    }));

    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    console.error('[business.profiles.handler] list_active_business_profiles error:', error);
    return res.status(200).json({
      status: 'success',
      data: [],
    });
  }
};

// ─── 3. ADD BUSINESS PROFILE (Simple: Profile Title / Name Only) ──────────────
const add_business_profile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Business Profile name is required' });
    }

    const cleanName = name.trim();
    const cleanCode = slugify(req.body.code || cleanName);

    if (!cleanCode) {
      return res.status(400).json({ status: 'error', message: 'Valid profile code could not be generated' });
    }

    const doc = await getSettingsDoc();

    const existing = (doc.business_profiles || []).find(
      (p) =>
        (p.name && p.name.toLowerCase() === cleanName.toLowerCase()) ||
        (p.code && p.code === cleanCode)
    );

    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: `Business Profile "${cleanName}" already exists.`,
      });
    }

    const newProfile = {
      _id: new mongoose.Types.ObjectId(),
      name: cleanName,
      code: cleanCode,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    doc.business_profiles.push(newProfile);
    await doc.save();

    return res.status(201).json({
      status: 'success',
      message: 'Business Profile created successfully',
      data: {
        ...newProfile,
        id: newProfile._id,
      },
    });
  } catch (error) {
    console.error('[business.profiles.handler] add_business_profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create business profile',
      error: error.message,
    });
  }
};

// ─── 4. UPDATE BUSINESS PROFILE (Simple: Name Only) ───────────────────────────
const update_business_profile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Invalid profile ID' });
    }

    const doc = await getSettingsDoc();
    const profile = (doc.business_profiles || []).find((p) => String(p._id) === String(id));

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Business Profile not found' });
    }

    if (name && name.trim()) {
      const cleanName = name.trim();
      const cleanCode = slugify(cleanName);

      const duplicate = (doc.business_profiles || []).find(
        (p) =>
          String(p._id) !== String(id) &&
          ((p.name && p.name.toLowerCase() === cleanName.toLowerCase()) || (p.code && p.code === cleanCode))
      );

      if (duplicate) {
        return res.status(400).json({
          status: 'error',
          message: `Business Profile "${cleanName}" already exists.`,
        });
      }

      profile.name = cleanName;
      profile.code = cleanCode;
    }

    if (req.body.is_active !== undefined) {
      profile.is_active = Boolean(req.body.is_active);
    }

    profile.updated_at = new Date();
    await doc.save();

    return res.status(200).json({
      status: 'success',
      message: 'Business Profile updated successfully',
      data: {
        ...profile.toObject ? profile.toObject() : profile,
        id: profile._id,
      },
    });
  } catch (error) {
    console.error('[business.profiles.handler] update_business_profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update business profile',
      error: error.message,
    });
  }
};

// ─── 5. TOGGLE BUSINESS PROFILE STATUS ────────────────────────────────────────
const toggle_business_profile_status = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Invalid profile ID' });
    }

    const doc = await getSettingsDoc();
    const profile = (doc.business_profiles || []).find((p) => String(p._id) === String(id));

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Business Profile not found' });
    }

    profile.is_active = !profile.is_active;
    profile.updated_at = new Date();
    await doc.save();

    return res.status(200).json({
      status: 'success',
      message: `Business Profile ${profile.is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        ...profile.toObject ? profile.toObject() : profile,
        id: profile._id,
      },
    });
  } catch (error) {
    console.error('[business.profiles.handler] toggle_business_profile_status error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to toggle status',
      error: error.message,
    });
  }
};

// ─── 6. DELETE BUSINESS PROFILE ───────────────────────────────────────────────
const delete_business_profile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Invalid profile ID' });
    }

    const doc = await getSettingsDoc();
    const idx = (doc.business_profiles || []).findIndex((p) => String(p._id) === String(id));

    if (idx === -1) {
      return res.status(404).json({ status: 'error', message: 'Business Profile not found' });
    }

    doc.business_profiles.splice(idx, 1);
    await doc.save();

    return res.status(200).json({
      status: 'success',
      message: 'Business Profile deleted successfully',
    });
  } catch (error) {
    console.error('[business.profiles.handler] delete_business_profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete business profile',
      error: error.message,
    });
  }
};

module.exports = {
  list_business_profiles,
  list_active_business_profiles,
  add_business_profile,
  update_business_profile,
  toggle_business_profile_status,
  delete_business_profile,
};
