'use strict';

const mongoose = require('mongoose');

/**
 * 1. Get BOSKIT Audit Logs with Actor and Action filters
 */
const get_audit_logs = async (req, res) => {
  try {
    const { actor_type, action, search } = req.query;

    const AuditLog = mongoose.model('audit_logs');
    const query = {
      entity_type: { $regex: /^boskit_/ },
    };

    if (actor_type && actor_type !== 'all') query.actor_type = actor_type;
    if (action && action !== 'all') query.action = action.toUpperCase();
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { entity_type: { $regex: search, $options: 'i' } },
      ];
    }

    const logs = await AuditLog.find(query)
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      logs: logs.map((l) => ({
        id: l._id,
        actor_type: l.actor_type,
        actor_id: l.actor_id,
        action: l.action,
        entity_type: l.entity_type,
        entity_id: l.entity_id,
        ip_address: l.ip_address,
        created_at: l.created_at || l.createdAt,
      })),
    });
  } catch (error) {
    console.error('[get_audit_logs Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch audit logs: ' + error.message,
    });
  }
};

module.exports = {
  get_audit_logs,
};
