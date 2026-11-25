'use strict';

const mongoose = require('mongoose');
const { ComboKit: IndiaComboKit, CompanyMargin: IndiaCompanyMargin } = require('../../models/india_solarshop_db');
const { CompanyMargin: CoreCompanyMargin } = require('../../models/core_db');
const WarehouseKitActivation = require('../../../solarshop-india/models/india_core_db/warehouse_kit_activations.schema');

/**
 * GET /admin-api/solarshop/pipeline-status
 * Evaluates the connected pipeline state of Combo Kits:
 * 1. Checks if any active combo kits lack configured Company Margin
 * 2. Checks if any active combo kits lack active Warehouse Kit Activation
 * Returns counts and boolean flags for sidebar yellow dot indicators.
 */
const get_pipeline_status = async (req, res) => {
  try {
    const isIndia = (req.query.country || 'india').toLowerCase() === 'india';

    // 1. Fetch active combo kits
    const kitQuery = { is_active: true, deleted_at: null, is_custom: false };
    const kits = await IndiaComboKit.find(kitQuery).select('_id name capacity created_at').lean();

    if (!kits || kits.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          has_pending_any: false,
          total_kits: 0,
          company_margin: { has_pending: false, count: 0, pending_kits: [] },
          kit_activations: { has_pending: false, count: 0, pending_kits: [] },
        },
      });
    }

    const kitIds = kits.map(k => k._id);

    // 2. Fetch margins configured for these kits
    const MarginModel = isIndia ? IndiaCompanyMargin : CoreCompanyMargin;
    const margins = await MarginModel.find({
      combo_kit_id: { $in: kitIds },
      deleted_at: null,
      $or: [
        { standard_margin: { $gt: 0 } },
        { showcase_margin: { $gt: 0 } },
        { is_active: true },
      ],
    }).select('combo_kit_id standard_margin').lean();

    const kitsWithMarginSet = new Set(
      margins
        .filter(m => (m.standard_margin !== undefined && m.standard_margin > 0) || m.showcase_margin > 0)
        .map(m => m.combo_kit_id?.toString())
        .filter(Boolean)
    );

    const pendingMarginKits = kits
      .filter(k => !kitsWithMarginSet.has(k._id.toString()))
      .map(k => ({ id: k._id, name: k.name, capacity: k.capacity }));

    // 3. Fetch kit activations configured for these kits
    const activations = await WarehouseKitActivation.find({
      combo_kit_id: { $in: kitIds },
      is_combokit_active: true,
      deleted_at: null,
    }).select('combo_kit_id').lean();

    const kitsWithActivationSet = new Set(activations.map(a => a.combo_kit_id?.toString()).filter(Boolean));

    const pendingActivationKits = kits
      .filter(k => !kitsWithActivationSet.has(k._id.toString()))
      .map(k => ({ id: k._id, name: k.name, capacity: k.capacity }));

    const hasMarginPending = pendingMarginKits.length > 0;
    const hasActivationPending = pendingActivationKits.length > 0;

    return res.status(200).json({
      status: 'success',
      data: {
        has_pending_any: hasMarginPending || hasActivationPending,
        total_kits: kits.length,
        company_margin: {
          has_pending: hasMarginPending,
          count: pendingMarginKits.length,
          pending_kits: pendingMarginKits,
        },
        kit_activations: {
          has_pending: hasActivationPending,
          count: pendingActivationKits.length,
          pending_kits: pendingActivationKits,
        },
      },
    });
  } catch (error) {
    console.error('[get_pipeline_status error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to calculate pipeline status',
      error: error.message,
    });
  }
};

module.exports = {
  get_pipeline_status,
};
