const LooseOrderSettings = require('../../models/india_solarshop_db/loose_order_settings.schema');
const mongoose = require('mongoose');

const get_all_settings = async (req, res) => {
  try {
    const list = await LooseOrderSettings.find({ deleted_at: null }).lean();
    return res.status(200).json({ status: 'success', data: list });
  } catch (err) {
    console.error('get_all_settings error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

const get_warehouse_settings = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid warehouse ID' });
    }

    const doc = await LooseOrderSettings.findOne({
      warehouse_id: new mongoose.Types.ObjectId(warehouseId),
      deleted_at: null
    }).lean();

    return res.status(200).json({ status: 'success', data: doc || null });
  } catch (err) {
    console.error('get_warehouse_settings error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

const save_settings = async (req, res) => {
  try {
    const {
      warehouse_id,
      country_id,
      is_loose_order_enabled,
      min_order_quantity,
      max_order_quantity,
      allow_loose_panels,
      allow_loose_inverters,
      allow_loose_batteries,
      allow_loose_bos,
      loose_markup_percentage,
      custom_notes
    } = req.body;

    if (!warehouse_id || !mongoose.Types.ObjectId.isValid(warehouse_id)) {
      return res.status(400).json({ status: 'error', message: 'warehouse_id is required' });
    }

    const updatePayload = {
      warehouse_id: new mongoose.Types.ObjectId(warehouse_id),
      country_id: country_id && mongoose.Types.ObjectId.isValid(country_id) ? new mongoose.Types.ObjectId(country_id) : null,
      is_loose_order_enabled: is_loose_order_enabled ?? true,
      min_order_quantity: Number(min_order_quantity) || 1,
      max_order_quantity: Number(max_order_quantity) || 100,
      allow_loose_panels: allow_loose_panels ?? true,
      allow_loose_inverters: allow_loose_inverters ?? true,
      allow_loose_batteries: allow_loose_batteries ?? true,
      allow_loose_bos: allow_loose_bos ?? true,
      loose_markup_percentage: Number(loose_markup_percentage) || 0,
      custom_notes: custom_notes || '',
      is_active: is_loose_order_enabled ?? true,
      deleted_at: null
    };

    const doc = await LooseOrderSettings.findOneAndUpdate(
      { warehouse_id: new mongoose.Types.ObjectId(warehouse_id), deleted_at: null },
      updatePayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Loose Order settings saved successfully!',
      data: doc
    });
  } catch (err) {
    console.error('save_settings error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

module.exports = {
  get_all_settings,
  get_warehouse_settings,
  save_settings
};
