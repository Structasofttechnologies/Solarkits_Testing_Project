'use strict';

const mongoose = require('mongoose');
const { logBoskitAudit } = require('../../utils/audit_logger');

/**
 * 1. Public Content Delivery (Banners, Videos, Announcements)
 */
const get_public_content = async (req, res) => {
  try {
    const { position, type, channel = 'public' } = req.query;

    const BoskitContent = mongoose.model('boskit_content_items');
    const query = {
      target_platform: { $in: ['boskit', 'both'] },
      status: 'published',
    };

    if (position) query.display_position = position;
    if (type) query.content_type = type;
    if (channel) query.target_channel = { $in: [channel, 'all'] };

    const items = await BoskitContent.find(query).sort({ priority: 1, created_at: -1 }).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      items: items.map((i) => ({
        id: i._id,
        content_type: i.content_type,
        title: i.title,
        description: i.description,
        media_url: i.media_url,
        media_type: i.media_type,
        thumbnail_url: i.thumbnail_url,
        cta_text: i.cta_text,
        cta_url: i.cta_url,
        display_position: i.display_position,
        priority: i.priority,
      })),
    });
  } catch (error) {
    console.error('[get_public_content Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch public content: ' + error.message,
    });
  }
};

/**
 * 2. Admin Content List
 */
const get_admin_content = async (req, res) => {
  try {
    const { position, type, status, search } = req.query;

    const BoskitContent = mongoose.model('boskit_content_items');
    const query = { target_platform: { $in: ['boskit', 'both'] } };

    if (position && position !== 'all') query.display_position = position;
    if (type && type !== 'all') query.content_type = type;
    if (status && status !== 'all') query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };

    const items = await BoskitContent.find(query).sort({ priority: 1, created_at: -1 }).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      items: items.map((i) => ({
        id: i._id,
        content_type: i.content_type,
        title: i.title,
        description: i.description,
        media_url: i.media_url,
        media_type: i.media_type,
        cta_text: i.cta_text,
        cta_url: i.cta_url,
        display_position: i.display_position || 'hero',
        priority: i.priority || 100,
        status: i.status || 'published',
        created_at: i.created_at,
      })),
    });
  } catch (error) {
    console.error('[get_admin_content Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch admin content: ' + error.message,
    });
  }
};

/**
 * 3. Create Admin Content Item
 */
const create_admin_content = async (req, res) => {
  try {
    const {
      content_type = 'desktop_banner',
      title,
      description,
      media_url,
      media_type = 'image',
      cta_text,
      cta_url,
      display_position = 'hero',
      priority = 100,
      status = 'published',
    } = req.body;

    if (!title) {
      return res.status(400).json({ status: 'error', success: false, message: 'Title is required.' });
    }

    const BoskitContent = mongoose.model('boskit_content_items');
    const item = await BoskitContent.create({
      content_type,
      title,
      description,
      media_url,
      media_type,
      cta_text,
      cta_url,
      display_position,
      priority: parseInt(priority, 10) || 100,
      status,
      target_platform: 'boskit',
      target_channel: 'public',
      published_at: status === 'published' ? new Date() : null,
    });

    logBoskitAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'CONTENT_ITEM_CREATED',
      entity_type: 'boskit_content_items',
      entity_id: item._id,
      req,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'Content item created successfully.',
      item,
    });
  } catch (error) {
    console.error('[create_admin_content Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to create content: ' + error.message,
    });
  }
};

/**
 * 4. Update Admin Content Item
 */
const update_admin_content = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const BoskitContent = mongoose.model('boskit_content_items');
    const item = await BoskitContent.findByIdAndUpdate(id, updateData, { new: true });

    if (!item) {
      return res.status(404).json({ status: 'error', success: false, message: 'Content item not found.' });
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Content updated successfully.',
      item,
    });
  } catch (error) {
    console.error('[update_admin_content Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to update content: ' + error.message,
    });
  }
};

/**
 * 5. Delete Admin Content Item
 */
const delete_admin_content = async (req, res) => {
  try {
    const { id } = req.params;
    const BoskitContent = mongoose.model('boskit_content_items');
    await BoskitContent.findByIdAndDelete(id);

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Content item removed.',
    });
  } catch (error) {
    console.error('[delete_admin_content Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to delete content: ' + error.message,
    });
  }
};

module.exports = {
  get_public_content,
  get_admin_content,
  create_admin_content,
  update_admin_content,
  delete_admin_content,
};
