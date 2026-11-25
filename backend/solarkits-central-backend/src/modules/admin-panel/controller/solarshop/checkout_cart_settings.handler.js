const { SolarShopSettings, InventoryReservation, WarehouseComboKit } = require('../../models/india_solarshop_db');
const WarehouseStock = require('../../models/company_warehouse_db/WarehouseStock.schema') || null;

// Helper to ensure settings exist
const getOrCreateSettings = async () => {
  let settings = await SolarShopSettings.findOne({});
  if (!settings) {
    settings = await SolarShopSettings.create({
      enable_checkout_timer: true,
      checkout_timer_duration: 20,
      combokit_bulk_panels_limit: 30,
      gst_rate: 12
    });
  }
  return settings;
};

const get_settings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return res.status(200).json({ status: 'success', data: settings });
  } catch (error) {
    console.error("get_settings error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const update_settings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const updatedData = req.body;

    // Update setting fields
    if (updatedData.enable_checkout_timer !== undefined) settings.enable_checkout_timer = updatedData.enable_checkout_timer;
    if (updatedData.checkout_timer_duration !== undefined) settings.checkout_timer_duration = updatedData.checkout_timer_duration;
    if (updatedData.combokit_bulk_panels_limit !== undefined) settings.combokit_bulk_panels_limit = updatedData.combokit_bulk_panels_limit;
    if (updatedData.gst_rate !== undefined) settings.gst_rate = updatedData.gst_rate;

    settings.updated_at = new Date();
    await settings.save();

    return res.status(200).json({ status: 'success', data: settings });
  } catch (error) {
    console.error("update_settings error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const get_reservation_metrics = async (req, res) => {
  try {
    const now = new Date();

    // Fetch active reservations
    const activeReservations = await InventoryReservation.find({
      status: 'reserved',
      expiry_time: { $gt: now }
    }).populate('product_id').lean();

    // Fetch booked reservations
    const bookedReservations = await InventoryReservation.find({
      status: 'booked'
    }).populate('product_id').lean();

    const activeReservedQty = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
    const bookedQty = bookedReservations.reduce((sum, r) => sum + r.quantity, 0);
    const activeTimersCount = activeReservations.length;

    // Get list of unique product IDs and their details
    const reservedProductsMap = {};
    activeReservations.forEach(r => {
      if (r.product_id) {
        const idStr = r.product_id._id.toString();
        if (!reservedProductsMap[idStr]) {
          reservedProductsMap[idStr] = {
            id: idStr,
            name: r.product_id.name || 'Unnamed Kit',
            reservedQty: 0,
            bookedQty: 0
          };
        }
        reservedProductsMap[idStr].reservedQty += r.quantity;
      }
    });

    bookedReservations.forEach(r => {
      if (r.product_id) {
        const idStr = r.product_id._id.toString();
        if (!reservedProductsMap[idStr]) {
          reservedProductsMap[idStr] = {
            id: idStr,
            name: r.product_id.name || 'Unnamed Kit',
            reservedQty: 0,
            bookedQty: 0
          };
        }
        reservedProductsMap[idStr].bookedQty += r.quantity;
      }
    });

    const productMetrics = Object.values(reservedProductsMap);

    // Fallback or actual available stock estimate (total active kits count)
    const totalActiveKitsCount = await WarehouseComboKit.countDocuments({ is_active: true, deleted_at: null });

    return res.status(200).json({
      status: 'success',
      data: {
        activeReservedQty,
        bookedQty,
        activeTimersCount,
        productMetrics,
        totalActiveKitsCount
      }
    });
  } catch (error) {
    console.error("get_reservation_metrics error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  get_settings,
  update_settings,
  get_reservation_metrics
};
