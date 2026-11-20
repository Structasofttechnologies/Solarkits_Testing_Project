const mongoose = require('mongoose');
const {
  TrialKitInventory,
  TrialKitStockHistory,
  TrialKitOrder,
  EpcAccount,
  EpcQuote
} = require('../models/india_solarshop_db');
const {
  WarehouseComboKit: ComboKit,
  SolarKit,
  Brand,
  ProjectCategory,
  ProjectSubcategory,
  ProjectType,
  ProjectSubcategoryType,
  ProjectRange,
  IndustryType
} = require('../models/core_db');
const EpcOrder = require('../models/india_solarshop_db/epc_orders.schema');
const { CompanyWarehouse } = require('../../warehouse-panel/models/company_warehouse_db');
const BDEProfile = require('../models/india_solarshop_db/bde_profiles.schema');
const { GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');

/**
 * 1. GET ALL TRIAL KIT STOCK (Admin & Account)
 * Dynamic Configured Combo Kits from pc_comobo_kit in Card Format with Warehouse-wise stock.
 */
exports.get_stock = async (req, res) => {
  try {
    const { warehouse_id, combo_kit_id, kit_type } = req.query;

    // 1. Fetch active configured combo kits from pc_comobo_kit
    const kitFilter = { deleted_at: null, is_custom: false };
    if (combo_kit_id && mongoose.Types.ObjectId.isValid(combo_kit_id)) {
      kitFilter._id = combo_kit_id;
    }

    const warehouseFilter = { deleted_at: null };
    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      warehouseFilter._id = warehouse_id;
    }

    const invFilter = { status: 'active' };
    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      invFilter.warehouse_id = warehouse_id;
    }

    const [
      configuredKits,
      warehouses,
      inventories,
      categories,
      subcategories,
      typeMaps,
      types,
      ranges,
      industries
    ] = await Promise.all([
      ComboKit.find(kitFilter)
        .populate('solar_kit_id', 'name capacity category_id subcategory_id type_id')
        .populate('base_components.brand_id', 'brand_name name logo')
        .populate('base_components.brand_ids', 'brand_name name logo')
        .populate('bos_kits.brand_id', 'brand_name name logo')
        .populate('bos_kits.brand_ids', 'brand_name name logo')
        .sort({ capacity: 1, name: 1 })
        .lean(),
      CompanyWarehouse.find(warehouseFilter)
        .populate('level_1', 'name')
        .populate('level_2', 'name')
        .sort({ warehouse_code: 1 })
        .lean(),
      TrialKitInventory.find(invFilter)
        .populate('warehouse_id', 'warehouse_name warehouse_code address state_name district_name')
        .lean(),
      ProjectCategory.find({ deleted_at: null }).lean().catch(() => []),
      ProjectSubcategory.find({ deleted_at: null }).lean().catch(() => []),
      ProjectSubcategoryType.find({ deleted_at: null }).lean().catch(() => []),
      ProjectType.find({ deleted_at: null }).lean().catch(() => []),
      ProjectRange.find({ deleted_at: null }).populate('unit_id').lean().catch(() => []),
      IndustryType.find({ deleted_at: null }).lean().catch(() => []),
    ]);

    // 3. Format Warehouses with human-readable names and geographic locations
    const formattedWarehouses = (warehouses || []).map((wh) => {
      const stateName = wh.level_1?.name || wh.state_name || 'Gujarat';
      const districtName = wh.level_2?.name || wh.district_name || (wh.warehouse_code === 'IND_GUJ_001' ? 'Ahmedabad' : (wh.warehouse_code === 'IND_GUJ_002' ? 'Surat' : ''));
      const rawName = wh.warehouse_name || '';
      const fallbackName = wh.warehouse_code === 'IND_GUJ_001'
        ? 'Ahmedabad Central Warehouse'
        : (wh.warehouse_code === 'IND_GUJ_002' ? 'Surat Regional Warehouse' : wh.warehouse_code);
      const cleanName = (rawName && rawName !== wh.warehouse_code) ? rawName : fallbackName;
      const cleanAddress = (wh.address || '')
        .replace(/^[A-Z0-9\+]+\s*,\s*/i, '') // strips Google Plus code prefix
        .trim();
      const displayLabel = `${cleanName} (${wh.warehouse_code} • ${districtName ? districtName + ', ' : ''}${stateName})`;

      return {
        ...wh,
        warehouse_name: cleanName,
        state_name: stateName,
        district_name: districtName,
        clean_address: cleanAddress,
        display_label: displayLabel
      };
    });

    // 4. Build Combo Kit Cards
    const comboKitCards = configuredKits.map((kit) => {
      // Gather unique brands
      const brandSet = new Set();
      kit.base_components?.forEach(b => {
        if (b.brand_id?.brand_name) brandSet.add(b.brand_id.brand_name);
        else if (b.brand_id?.name) brandSet.add(b.brand_id.name);
        b.brand_ids?.forEach(bi => {
          if (bi?.brand_name) brandSet.add(bi.brand_name);
          else if (bi?.name) brandSet.add(bi.name);
        });
      });
      kit.bos_kits?.forEach(b => {
        if (b.brand_id?.brand_name) brandSet.add(b.brand_id.brand_name);
        else if (b.brand_id?.name) brandSet.add(b.brand_id.name);
        b.brand_ids?.forEach(bi => {
          if (bi?.brand_name) brandSet.add(bi.brand_name);
          else if (bi?.name) brandSet.add(bi.name);
        });
      });
      const brandsList = Array.from(brandSet);

      let totalAvailable = 0;
      let totalReserved = 0;
      let totalOrdered = 0;
      let totalDispatched = 0;
      let totalDelivered = 0;

      const allocations = formattedWarehouses.map((wh) => {
        const inv = inventories.find(i =>
          (i.combo_kit_id && i.combo_kit_id.toString() === kit._id.toString() && i.warehouse_id?._id?.toString() === wh._id.toString()) ||
          (i.kit_type === kit.name && i.warehouse_id?._id?.toString() === wh._id.toString())
        );

        const available = inv ? inv.available_stock : 0;
        const reserved = inv ? inv.reserved_stock : 0;
        const ordered = inv ? inv.ordered_quantity : 0;
        const dispatched = inv ? inv.dispatched_quantity : 0;
        const delivered = inv ? inv.delivered_quantity : 0;
        const unitCost = inv ? inv.unit_cost_price_inr : (kit.capacity ? kit.capacity * 20000 : 25000);

        totalAvailable += available;
        totalReserved += reserved;
        totalOrdered += ordered;
        totalDispatched += dispatched;
        totalDelivered += delivered;

        return {
          inventory_id: inv ? inv._id : null,
          combo_kit_id: kit._id,
          warehouse_id: wh._id,
          warehouse_name: wh.warehouse_name || wh.warehouse_code,
          warehouse_code: wh.warehouse_code,
          available_stock: available,
          reserved_stock: reserved,
          ordered_quantity: ordered,
          dispatched_quantity: dispatched,
          delivered_quantity: delivered,
          unit_cost_price_inr: unitCost
        };
      });

      const sk = kit.solar_kit_id || {};
      const cat = (categories || []).find(c => String(c._id) === String(sk.category_id || kit.category_id)) || {};
      const ind = (industries || []).find(i => String(i._id) === String(cat.industry_type_id)) || {};
      const sub = (subcategories || []).find(s => String(s._id) === String(sk.subcategory_id || kit.subcategory_id)) || {};
      const tm = (typeMaps || []).find(t => String(t._id) === String(sk.type_id || kit.type_id)) || {};
      const typeObj = (types || []).find(t => String(t._id) === String(tm.type)) || {};
      const pr = (ranges || []).find(r => String(r._id) === String(kit.project_range_id)) || {};

      return {
        _id: kit._id,
        combo_kit_id: kit._id,
        name: kit.name,
        capacity: kit.capacity,
        kit_image: kit.kit_image,
        blueprint_name: kit.solar_kit_id?.name || `${kit.capacity || 0} kW Solar Kit System`,
        configured_brands: brandsList,
        industryType: ind.name || null,
        industry_type_id: ind._id || null,
        category: cat.name || null,
        category_id: cat._id || null,
        subCategory: sub.name || null,
        subcategory_id: sub._id || null,
        systemType: typeObj.name || null,
        type_id: typeObj._id || null,
        projectRange: pr.range_label || (pr.min_value !== undefined ? `${pr.min_value} - ${pr.max_value} ${pr.unit_id?.symbol || 'kW'}` : null),
        project_range_id: pr._id || null,
        allow_trial_kit: kit.allow_trial_kit !== false,
        trial_kit_quantity: kit.trial_kit_quantity || 1,
        trial_kit_max_orders_per_buyer: kit.trial_kit_max_orders_per_buyer || 1,
        total_available_stock: totalAvailable,
        total_reserved_stock: totalReserved,
        total_ordered_quantity: totalOrdered,
        total_delivered_quantity: totalDelivered,
        warehouse_allocations: allocations
      };
    });

    return res.status(200).json({
      success: true,
      data: comboKitCards,
      flat_stock: inventories,
      warehouses: formattedWarehouses,
      total: comboKitCards.length
    });
  } catch (err) {
    console.error('❌ Error fetching trial kit stock:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. ALLOCATE / RESTOCK TRIAL KIT STOCK (Admin & Account)
 * Add trial kit stock by kit type and allocate warehouse-wise.
 */
exports.allocate_stock = async (req, res) => {
  try {
    const { kit_type, warehouse_id, quantity, unit_cost_price_inr, remarks } = req.body;

    if (!kit_type || !warehouse_id || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Kit type, warehouse, and quantity are required.' });
    }

    const qtyNumber = parseInt(quantity, 10);
    if (isNaN(qtyNumber) || qtyNumber < 0) {
      return res.status(400).json({ success: false, message: 'Valid non-negative quantity required.' });
    }

    const warehouse = await CompanyWarehouse.findById(warehouse_id).lean();
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    let inventory = await TrialKitInventory.findOne({ kit_type, warehouse_id });
    const prevStock = inventory ? inventory.available_stock : 0;

    if (!inventory) {
      inventory = new TrialKitInventory({
        kit_type,
        warehouse_id,
        warehouse_name: warehouse.warehouse_name || warehouse.warehouse_code,
        available_stock: qtyNumber,
        unit_cost_price_inr: unit_cost_price_inr || 0
      });
    } else {
      inventory.available_stock += qtyNumber;
      if (unit_cost_price_inr !== undefined) {
        inventory.unit_cost_price_inr = unit_cost_price_inr;
      }
      inventory.warehouse_name = warehouse.warehouse_name || warehouse.warehouse_code;
    }

    await inventory.save();

    // Record History Audit Log
    const userName = req.user?.name || req.user?.email || 'Admin / Account User';
    const userRole = req.user?.role?.toLowerCase().includes('account') ? 'account' : 'admin';

    await TrialKitStockHistory.create({
      trial_kit_inventory_id: inventory._id,
      kit_type,
      warehouse_id,
      warehouse_name: warehouse.warehouse_name || warehouse.warehouse_code,
      adjustment_type: 'warehouse_allocation',
      quantity_change: qtyNumber,
      previous_available_stock: prevStock,
      new_available_stock: inventory.available_stock,
      user_name: userName,
      user_id: req.user?.id || req.user?._id || null,
      user_role: userRole,
      remarks: remarks || `Allocated ${qtyNumber} units to ${warehouse.warehouse_name || warehouse.warehouse_code}`
    });

    return res.status(200).json({
      success: true,
      message: `Successfully allocated ${qtyNumber} units of ${kit_type} to ${warehouse.warehouse_name || warehouse.warehouse_code}.`,
      data: inventory
    });
  } catch (err) {
    console.error('❌ Error allocating trial kit stock:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. UPDATE STOCK RECEIVED FROM VENDORS (Stock Inward)
 * Admin, Account, and Warehouse can record inward.
 */
exports.inward_stock = async (req, res) => {
  try {
    const { combo_kit_id, kit_type, warehouse_id, quantity_received, vendor_name, remarks } = req.body;

    if ((!kit_type && !combo_kit_id) || !warehouse_id || !quantity_received) {
      return res.status(400).json({ success: false, message: 'Kit, warehouse, and received quantity are required.' });
    }

    const qtyNumber = parseInt(quantity_received, 10);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      return res.status(400).json({ success: false, message: 'Received quantity must be greater than zero.' });
    }

    const warehouse = await CompanyWarehouse.findById(warehouse_id).lean();
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    let kitName = kit_type;
    let comboKitDoc = null;
    if (combo_kit_id) {
      comboKitDoc = await ComboKit.findById(combo_kit_id).lean();
      if (comboKitDoc) kitName = comboKitDoc.name;
    }

    let inventory = null;
    if (combo_kit_id) {
      inventory = await TrialKitInventory.findOne({ combo_kit_id, warehouse_id });
    }
    if (!inventory && kitName) {
      inventory = await TrialKitInventory.findOne({ kit_type: kitName, warehouse_id });
    }

    const prevStock = inventory ? inventory.available_stock : 0;

    if (!inventory) {
      inventory = new TrialKitInventory({
        combo_kit_id: combo_kit_id || null,
        kit_type: kitName || 'Trial Kit',
        warehouse_id,
        warehouse_name: warehouse.warehouse_name || warehouse.warehouse_code,
        available_stock: qtyNumber
      });
    } else {
      if (combo_kit_id && !inventory.combo_kit_id) {
        inventory.combo_kit_id = combo_kit_id;
      }
      inventory.available_stock += qtyNumber;
    }

    await inventory.save();

    const userName = req.user?.name || req.user?.email || 'Warehouse Operator';
    const userRole = req.user?.is_warehouse_user ? 'warehouse' : (req.user?.role?.toLowerCase().includes('account') ? 'account' : 'admin');

    await TrialKitStockHistory.create({
      trial_kit_inventory_id: inventory._id,
      combo_kit_id: combo_kit_id || inventory.combo_kit_id || null,
      kit_type: kitName,
      warehouse_id,
      warehouse_name: warehouse.warehouse_name || warehouse.warehouse_code,
      adjustment_type: 'vendor_inward',
      quantity_change: qtyNumber,
      previous_available_stock: prevStock,
      new_available_stock: inventory.available_stock,
      user_name: userName,
      user_id: req.user?.id || req.user?._id || null,
      user_role: userRole,
      remarks: remarks || `Vendor Inward: ${qtyNumber} units from ${vendor_name || 'Vendor'}`
    });

    return res.status(200).json({
      success: true,
      message: `Inward recorded: +${qtyNumber} units of ${kitName}.`,
      data: inventory
    });
  } catch (err) {
    console.error('❌ Error recording inward stock:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. INCREASE OR DECREASE AVAILABLE STOCK (Stock Adjustment)
 * With adjustment history, user name and timestamp.
 */
exports.adjust_stock = async (req, res) => {
  try {
    const { inventory_id, combo_kit_id, warehouse_id, adjustment_type, quantity_change, remarks } = req.body;

    let inventory = null;
    if (inventory_id && mongoose.Types.ObjectId.isValid(inventory_id)) {
      inventory = await TrialKitInventory.findById(inventory_id);
    } else if (combo_kit_id && warehouse_id) {
      inventory = await TrialKitInventory.findOne({ combo_kit_id, warehouse_id });
      if (!inventory) {
        const kit = await ComboKit.findById(combo_kit_id).lean();
        const wh = await CompanyWarehouse.findById(warehouse_id).lean();
        inventory = new TrialKitInventory({
          combo_kit_id,
          kit_type: kit?.name || 'Trial Kit',
          warehouse_id,
          warehouse_name: wh?.warehouse_name || wh?.warehouse_code || 'Warehouse',
          available_stock: 0
        });
      }
    }

    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Trial kit inventory record not found.' });
    }

    if (quantity_change === undefined) {
      return res.status(400).json({ success: false, message: 'Quantity change required.' });
    }

    const change = parseInt(quantity_change, 10);
    if (isNaN(change) || change === 0) {
      return res.status(400).json({ success: false, message: 'Valid non-zero quantity change required.' });
    }

    const prevStock = inventory.available_stock;
    const newStock = prevStock + change;

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: `Adjustment would result in negative available stock (${newStock}). Current available: ${prevStock}.`
      });
    }

    inventory.available_stock = newStock;
    await inventory.save();

    const userName = req.user?.name || req.user?.email || 'Admin / Account User';
    const userRole = req.user?.role?.toLowerCase().includes('account') ? 'account' : 'admin';
    const adjType = adjustment_type || (change > 0 ? 'increase_adjustment' : 'decrease_adjustment');

    await TrialKitStockHistory.create({
      trial_kit_inventory_id: inventory._id,
      kit_type: inventory.kit_type,
      warehouse_id: inventory.warehouse_id,
      warehouse_name: inventory.warehouse_name,
      adjustment_type: adjType,
      quantity_change: change,
      previous_available_stock: prevStock,
      new_available_stock: newStock,
      user_name: userName,
      user_id: req.user?.id || req.user?._id || null,
      user_role: userRole,
      remarks: remarks || `Manual adjustment: ${change > 0 ? '+' : ''}${change} units`
    });

    return res.status(200).json({
      success: true,
      message: `Stock successfully adjusted by ${change > 0 ? '+' : ''}${change}. New stock: ${newStock}.`,
      data: inventory
    });
  } catch (err) {
    console.error('❌ Error adjusting trial kit stock:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. GET STOCK ALLOCATION & ADJUSTMENT HISTORY
 */
exports.get_stock_history = async (req, res) => {
  try {
    const { inventory_id, warehouse_id, kit_type, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (inventory_id && mongoose.Types.ObjectId.isValid(inventory_id)) {
      filter.trial_kit_inventory_id = inventory_id;
    }
    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      filter.warehouse_id = warehouse_id;
    }
    if (kit_type && kit_type !== 'all') {
      filter.kit_type = kit_type;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await TrialKitStockHistory.countDocuments(filter);
    const history = await TrialKitStockHistory.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    return res.status(200).json({
      success: true,
      data: history,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (err) {
    console.error('❌ Error fetching stock history:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6A. GET FILTER OPTIONS & REAL-TIME COUNTS (Account & Warehouse)
 * For Account Panel Trial Kits Order Filter UI (Screenshot 2)
 */
exports.get_filter_options = async (req, res) => {
  try {
    const [
      warehouses,
      states,
      districts,
      industries,
      projects,
      orders,
      comboKits
    ] = await Promise.all([
      CompanyWarehouse.find({ deleted_at: null }).select('_id warehouse_name warehouse_code state_name district_name address').lean(),
      GeoLevel1.find({ is_active: { $ne: false }, deleted_at: null }).sort({ name: 1 }).lean().catch(() => []),
      GeoLevel2.find({ is_active: { $ne: false }, deleted_at: null }).sort({ name: 1 }).lean().catch(() => []),
      IndustryType.find({ deleted_at: null }).lean().catch(() => []),
      ProjectType.find({ deleted_at: null }).lean().catch(() => []),
      TrialKitOrder.find({}).lean(),
      ComboKit.find({ deleted_at: null, is_custom: false }).select('name capacity').lean().catch(() => [])
    ]);

    // Unique kit types
    const kitTypeSet = new Set(['1 kW Trial Kit', '2 kW Trial Kit', '3 kW Trial Kit', '5 kW Trial Kit']);
    comboKits.forEach(k => { if (k.name) kitTypeSet.add(k.name); });
    orders.forEach(o => { if (o.kit_type) kitTypeSet.add(o.kit_type); });

    // Compute live counts across orders
    const filterCounts = {
      total: orders.length,
      by_mode: {
        offline: orders.filter(o => (o.order_type || 'offline').toLowerCase() === 'offline').length,
        online: orders.filter(o => (o.order_type || '').toLowerCase() === 'online').length
      },
      by_origin: {
        epc: orders.filter(o => (o.order_origin || 'epc').toLowerCase() === 'epc').length,
        franchisee: orders.filter(o => (o.order_origin || '').toLowerCase() === 'franchisee').length,
        company: orders.filter(o => (o.order_origin || '').toLowerCase() === 'company').length
      },
      by_category: {
        govt_tender: orders.filter(o => (o.order_category || '').toLowerCase() === 'govt_tender').length,
        industry_kit: orders.filter(o => (o.order_category || 'industry_kit').toLowerCase() === 'industry_kit').length
      },
      by_warehouse: {},
      by_state: {},
      by_district: {},
      by_destination: {
        all: orders.length,
        epc: orders.filter(o => (o.delivery_destination_type || 'epc').toLowerCase() === 'epc').length,
        franchisee: orders.filter(o => (o.delivery_destination_type || '').toLowerCase() === 'franchisee').length,
        company: orders.filter(o => (o.delivery_destination_type || '').toLowerCase() === 'company').length
      },
      by_industry: {},
      by_project: {},
      by_kit: {}
    };

    orders.forEach(o => {
      const whId = o.warehouse_id?.toString();
      if (whId) filterCounts.by_warehouse[whId] = (filterCounts.by_warehouse[whId] || 0) + 1;

      const st = o.delivery_details?.shipping_address?.state || o.shipping_address?.state;
      if (st) filterCounts.by_state[st] = (filterCounts.by_state[st] || 0) + 1;

      const dist = o.delivery_details?.shipping_address?.district || o.shipping_address?.district;
      if (dist) filterCounts.by_district[dist] = (filterCounts.by_district[dist] || 0) + 1;

      const ind = o.industry_type || 'General Solar';
      filterCounts.by_industry[ind] = (filterCounts.by_industry[ind] || 0) + 1;

      const prj = o.project_type || 'Rooftop Solar';
      filterCounts.by_project[prj] = (filterCounts.by_project[prj] || 0) + 1;

      const kt = o.kit_type || 'Solar Trial Kit';
      filterCounts.by_kit[kt] = (filterCounts.by_kit[kt] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        warehouses,
        states: states.map(s => ({ _id: s._id, name: s.name })),
        districts: districts.map(d => ({ _id: d._id, name: d.name, state_id: d.level_1 || d.state_id })),
        kit_types: Array.from(kitTypeSet),
        industry_types: industries.length > 0 ? industries.map(i => i.name || i.title) : ['Residential Rooftop', 'Commercial & Industrial', 'Agricultural Solar', 'Ground Mounted Solar'],
        project_types: projects.length > 0 ? projects.map(p => p.name || p.title) : ['Rooftop Solar', 'Ground Mount', 'Solar Pump', 'Floating Solar'],
        origins: ['Solar EPC', 'Franchisee Store', 'Company Store'],
        order_modes: ['Offline Orders', 'Online Orders'],
        order_categories: ['Govt. Tenders Order', 'Industry Kits'],
        delivery_destinations: ['All Destinations', 'EPC Location', 'Franchisee Store', 'Company Store'],
        filter_counts: filterCounts
      }
    });
  } catch (err) {
    console.error('❌ Error fetching trial kit filter options:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6B. GET ALL TRIAL KIT ORDERS (Admin, Account, Warehouse, BDE)
 * Comprehensive Multi-Facet Filtering matching Screenshot 2
 */
exports.get_orders = async (req, res) => {
  try {
    const {
      warehouse_id,
      order_mode,
      order_type,
      order_origin,
      order_category,
      industry_type,
      project_type,
      kit_type,
      states,
      districts,
      pincode,
      pincodes,
      delivery_destination,
      account_workflow_status,
      is_grouped,
      group_id,
      order_status,
      gst_number,
      bde_id,
      search,
      startDate,
      endDate,
      limit = 50,
      page = 1
    } = req.query;

    const filter = {};

    // Scoping for warehouse users (own warehouse only)
    if (req.user?.is_warehouse_user && req.user.warehouse_id) {
      filter.warehouse_id = req.user.warehouse_id;
    } else if (warehouse_id && warehouse_id !== 'all' && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      filter.warehouse_id = warehouse_id;
    }

    const mode = order_mode || order_type;
    if (mode && mode !== 'all') {
      filter.order_type = mode.toLowerCase();
    }

    if (order_origin && order_origin !== 'all') {
      filter.order_origin = order_origin.toLowerCase();
    }

    if (order_category && order_category !== 'all') {
      filter.order_category = order_category.toLowerCase();
    }

    if (industry_type && industry_type !== 'all' && industry_type.trim() !== '') {
      filter.industry_type = industry_type;
    }

    if (project_type && project_type !== 'all' && project_type.trim() !== '') {
      filter.project_type = project_type;
    }

    if (kit_type && kit_type !== 'all' && kit_type.trim() !== '') {
      filter.kit_type = kit_type;
    }

    if (gst_number) {
      filter.gst_number = new RegExp(gst_number.trim(), 'i');
    }

    if (order_status && order_status !== 'all') {
      filter.order_status = order_status;
    }

    if (account_workflow_status && account_workflow_status !== 'all') {
      filter.account_workflow_status = account_workflow_status;
    }

    if (is_grouped !== undefined && is_grouped !== 'all' && is_grouped !== '') {
      filter.is_grouped = is_grouped === 'true' || is_grouped === true;
    }

    if (group_id && group_id !== 'all' && group_id.trim() !== '') {
      filter.group_id = new RegExp(group_id.trim(), 'i');
    }

    if (delivery_destination && delivery_destination !== 'all') {
      filter.delivery_destination_type = delivery_destination;
    }

    if (bde_id && mongoose.Types.ObjectId.isValid(bde_id)) {
      filter.bde_id = bde_id;
    }

    // State filter (supports single or comma-separated list)
    const stateList = (states || req.query.state || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (stateList.length > 0 && !stateList.includes('all')) {
      const stateRegexes = stateList.map(s => new RegExp(`^${s}$`, 'i'));
      filter.$or = [
        { 'delivery_details.shipping_address.state': { $in: stateRegexes } },
        { 'shipping_address.state': { $in: stateRegexes } }
      ];
    }

    // District filter
    const districtList = (districts || req.query.district || '')
      .split(',')
      .map(d => d.trim())
      .filter(Boolean);
    if (districtList.length > 0 && !districtList.includes('all')) {
      const distRegexes = districtList.map(d => new RegExp(`^${d}$`, 'i'));
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { 'delivery_details.shipping_address.district': { $in: distRegexes } },
          { 'shipping_address.district': { $in: distRegexes } }
        ]
      });
    }

    // Pincode filter
    const pin = pincode || pincodes;
    if (pin && pin.trim() !== '') {
      const pinRegex = new RegExp(pin.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { 'delivery_details.shipping_address.pincode': pinRegex },
          { 'shipping_address.pincode': pinRegex }
        ]
      });
    }

    // Text search
    if (search && search.trim() !== '') {
      const sRegex = new RegExp(search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { order_number: sRegex },
          { epc_name: sRegex },
          { epc_company_name: sRegex },
          { gst_number: sRegex },
          { group_id: sRegex },
          { group_name: sRegex },
          { kit_type: sRegex },
          { 'delivery_details.shipping_address.contact_name': sRegex },
          { 'delivery_details.shipping_address.phone': sRegex },
          { 'delivery_details.shipping_address.district': sRegex },
          { 'delivery_details.shipping_address.state': sRegex },
        ]
      });
    }

    if (startDate || endDate) {
      filter.order_date = {};
      if (startDate) filter.order_date.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.order_date.$lte = eDate;
      }
    }

    const parsedLimit = parseInt(limit, 10) || 50;
    const parsedPage = parseInt(page, 10) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const [total, orders, allForCounts] = await Promise.all([
      TrialKitOrder.countDocuments(filter),
      TrialKitOrder.find(filter)
        .populate('epc_id', 'name email whatsapp gstin state_name district_name company_name')
        .populate('warehouse_id', 'warehouse_name warehouse_code state_name district_name address')
        .populate('bde_id', 'full_name bde_id_code mobile')
        .sort({ order_date: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      TrialKitOrder.find({}).select('order_type order_origin order_category warehouse_id kit_type delivery_details shipping_address industry_type project_type delivery_destination_type').lean()
    ]);

    // Live counts calculation for filter tabs
    const filterCounts = {
      total: allForCounts.length,
      by_mode: {
        offline: allForCounts.filter(o => (o.order_type || 'offline').toLowerCase() === 'offline').length,
        online: allForCounts.filter(o => (o.order_type || '').toLowerCase() === 'online').length
      },
      by_origin: {
        epc: allForCounts.filter(o => (o.order_origin || 'epc').toLowerCase() === 'epc').length,
        franchisee: allForCounts.filter(o => (o.order_origin || '').toLowerCase() === 'franchisee').length,
        company: allForCounts.filter(o => (o.order_origin || '').toLowerCase() === 'company').length
      },
      by_category: {
        govt_tender: allForCounts.filter(o => (o.order_category || '').toLowerCase() === 'govt_tender').length,
        industry_kit: allForCounts.filter(o => (o.order_category || 'industry_kit').toLowerCase() === 'industry_kit').length
      },
      by_warehouse: {},
      by_state: {},
      by_district: {},
      by_destination: {
        all: allForCounts.length,
        epc: allForCounts.filter(o => (o.delivery_destination_type || 'epc').toLowerCase() === 'epc').length,
        franchisee: allForCounts.filter(o => (o.delivery_destination_type || '').toLowerCase() === 'franchisee').length,
        company: allForCounts.filter(o => (o.delivery_destination_type || '').toLowerCase() === 'company').length
      },
      by_industry: {},
      by_project: {},
      by_kit: {}
    };

    allForCounts.forEach(o => {
      const whId = o.warehouse_id?.toString();
      if (whId) filterCounts.by_warehouse[whId] = (filterCounts.by_warehouse[whId] || 0) + 1;

      const st = o.delivery_details?.shipping_address?.state || o.shipping_address?.state;
      if (st) filterCounts.by_state[st] = (filterCounts.by_state[st] || 0) + 1;

      const dist = o.delivery_details?.shipping_address?.district || o.shipping_address?.district;
      if (dist) filterCounts.by_district[dist] = (filterCounts.by_district[dist] || 0) + 1;

      const ind = o.industry_type || 'General Solar';
      filterCounts.by_industry[ind] = (filterCounts.by_industry[ind] || 0) + 1;

      const prj = o.project_type || 'Rooftop Solar';
      filterCounts.by_project[prj] = (filterCounts.by_project[prj] || 0) + 1;

      const kt = o.kit_type || 'Solar Trial Kit';
      filterCounts.by_kit[kt] = (filterCounts.by_kit[kt] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: orders,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
      filter_counts: filterCounts
    });
  } catch (err) {
    console.error('❌ Error fetching trial kit orders:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6C. GROUP AND SEND TRIAL KIT ORDERS DIRECT TO WAREHOUSE
 * Allows Account Manager to group multiple orders or send individually.
 * Bypasses Procurement completely.
 */
exports.group_and_send_orders = async (req, res) => {
  try {
    const { order_ids, dispatch_mode = 'group', group_name, warehouse_id, notes } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one order.' });
    }

    const validIds = order_ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid order IDs provided.' });
    }

    const isGroup = dispatch_mode === 'group';
    let generatedGroupId = null;

    if (isGroup) {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const count = await TrialKitOrder.countDocuments({ is_grouped: true });
      const seq = String(count + 1).padStart(3, '0');
      generatedGroupId = `TK-GRP-${year}-${seq}-${randomSuffix}`;
    }

    const updateFields = {
      is_grouped: isGroup,
      account_workflow_status: 'sent_to_warehouse',
      order_status: 'sent_to_warehouse',
      grouped_at: isGroup ? new Date() : null,
      grouped_by: req.user?._id || req.user?.id || null
    };

    if (isGroup) {
      updateFields.group_id = generatedGroupId;
      updateFields.group_name = group_name && group_name.trim() !== '' ? group_name.trim() : generatedGroupId;
    } else {
      updateFields.group_id = null;
      updateFields.group_name = '';
    }

    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      updateFields.warehouse_id = warehouse_id;
      const wh = await CompanyWarehouse.findById(warehouse_id).select('warehouse_name warehouse_code').lean();
      if (wh) {
        updateFields.warehouse_name = wh.warehouse_name || wh.warehouse_code;
      }
    }

    const updateOps = { $set: updateFields };
    if (notes && notes.trim() !== '') {
      updateOps.$set['delivery_details.delivery_notes'] = notes.trim();
    }

    const result = await TrialKitOrder.updateMany(
      { _id: { $in: validIds } },
      updateOps
    );

    return res.status(200).json({
      success: true,
      message: isGroup
        ? `Successfully grouped ${result.modifiedCount} trial order(s) into Batch [${generatedGroupId}] and sent directly to Warehouse!`
        : `Successfully sent ${result.modifiedCount} individual trial order(s) directly to Warehouse!`,
      group_id: generatedGroupId,
      modified_count: result.modifiedCount
    });
  } catch (err) {
    console.error('❌ Error grouping/sending trial kit orders:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6D. DIRECT OUT FOR DELIVERY (Warehouse Panel)
 * Direct dispatch of trial kit orders without procurement or assembly delay.
 */
exports.direct_out_for_delivery = async (req, res) => {
  try {
    const {
      order_id,
      order_ids,
      group_id,
      courier_name = 'Local Fleet / Transporter',
      tracking_number,
      tracking_url,
      vehicle_number,
      driver_name,
      driver_phone,
      delivery_notes
    } = req.body;

    const query = {};
    if (order_id && mongoose.Types.ObjectId.isValid(order_id)) {
      query._id = order_id;
    } else if (Array.isArray(order_ids) && order_ids.length > 0) {
      query._id = { $in: order_ids.filter(id => mongoose.Types.ObjectId.isValid(id)) };
    } else if (group_id) {
      query.group_id = group_id;
    } else {
      return res.status(400).json({ success: false, message: 'Please specify an order_id, order_ids, or group_id.' });
    }

    const generatedTracking = tracking_number && tracking_number.trim() !== ''
      ? tracking_number.trim()
      : `TRK-TK-${Date.now().toString().slice(-6)}`;

    const ordersToUpdate = await TrialKitOrder.find(query);
    if (!ordersToUpdate || ordersToUpdate.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching orders found to dispatch.' });
    }

    const updated = await TrialKitOrder.updateMany(query, {
      $set: {
        order_status: 'out_for_delivery',
        'delivery_details.courier_name': courier_name,
        'delivery_details.tracking_number': generatedTracking,
        'delivery_details.tracking_url': tracking_url || '',
        'delivery_details.dispatched_at': new Date(),
        'delivery_details.dispatched_by': req.user?._id || req.user?.id || null,
        'delivery_details.delivery_notes': delivery_notes || '',
        'delivery_details.vehicle_number': vehicle_number || '',
        'delivery_details.driver_name': driver_name || '',
        'delivery_details.driver_phone': driver_phone || '',
      }
    });

    return res.status(200).json({
      success: true,
      message: `Successfully set ${updated.modifiedCount} order(s) to Out for Delivery!`,
      tracking_number: generatedTracking,
      modified_count: updated.modifiedCount
    });
  } catch (err) {
    console.error('❌ Error updating trial kit out for delivery:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6E. MARK DELIVERED (Warehouse Panel)
 */
exports.mark_delivered = async (req, res) => {
  try {
    const { order_id, order_ids, group_id, delivery_notes } = req.body;

    const query = {};
    if (order_id && mongoose.Types.ObjectId.isValid(order_id)) {
      query._id = order_id;
    } else if (Array.isArray(order_ids) && order_ids.length > 0) {
      query._id = { $in: order_ids.filter(id => mongoose.Types.ObjectId.isValid(id)) };
    } else if (group_id) {
      query.group_id = group_id;
    } else {
      return res.status(400).json({ success: false, message: 'Please specify an order_id, order_ids, or group_id.' });
    }

    const updated = await TrialKitOrder.updateMany(query, {
      $set: {
        order_status: 'delivered',
        'delivery_details.delivered_at': new Date(),
        'delivery_details.delivered_by': req.user?._id || req.user?.id || null,
        ...(delivery_notes ? { 'delivery_details.delivery_notes': delivery_notes } : {}),
        'feedback.feedback_status': 'pending',
        'funnel.current_stage': 'feedback_pending',
        'funnel.stage_updated_at': new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: `Successfully marked ${updated.modifiedCount} order(s) as Delivered!`,
      modified_count: updated.modifiedCount
    });
  } catch (err) {
    console.error('❌ Error marking trial kit delivered:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6F. GET BADGE COUNT (Account & Warehouse Sidebar)
 */
exports.get_badge_count = async (req, res) => {
  try {
    const [pendingAccount, readyWarehouse, outForDelivery] = await Promise.all([
      TrialKitOrder.countDocuments({ account_workflow_status: { $in: ['pending_account', null] } }),
      TrialKitOrder.countDocuments({ account_workflow_status: 'sent_to_warehouse', order_status: { $in: ['sent_to_warehouse', 'ready_for_warehouse'] } }),
      TrialKitOrder.countDocuments({ order_status: 'out_for_delivery' })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        pending_account: pendingAccount,
        ready_warehouse: readyWarehouse,
        out_for_delivery: outForDelivery,
        total_active: pendingAccount + readyWarehouse + outForDelivery
      }
    });
  } catch (err) {
    console.error('❌ Error getting trial kit badge count:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 7. UPDATE DELIVERY (Dispatch & Delivery Confirmation)
 * Admin & Warehouse can update.
 */
exports.update_delivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, courier_name, tracking_number, tracking_url, delivery_notes } = req.body;

    const order = await TrialKitOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Trial kit order not found.' });
    }

    const inventory = await TrialKitInventory.findOne({
      kit_type: order.kit_type,
      warehouse_id: order.warehouse_id
    });

    if (action === 'dispatch') {
      if (order.order_status !== 'confirmed') {
        return res.status(400).json({ success: false, message: `Cannot dispatch order with status: ${order.order_status}` });
      }

      order.order_status = 'dispatched';
      order.delivery_details.courier_name = courier_name || order.delivery_details.courier_name;
      order.delivery_details.tracking_number = tracking_number || order.delivery_details.tracking_number;
      order.delivery_details.tracking_url = tracking_url || order.delivery_details.tracking_url;
      order.delivery_details.delivery_notes = delivery_notes || order.delivery_details.delivery_notes;
      order.delivery_details.dispatched_at = new Date();
      order.delivery_details.dispatched_by = req.user?.id || req.user?._id || null;

      if (inventory) {
        if (inventory.reserved_stock > 0) inventory.reserved_stock -= 1;
        inventory.dispatched_quantity += 1;
        await inventory.save();
      }

      await order.save();
      return res.status(200).json({ success: true, message: 'Order marked as Dispatched.', data: order });
    }

    if (action === 'deliver') {
      if (order.order_status === 'delivered') {
        return res.status(400).json({ success: false, message: 'Order is already marked as delivered.' });
      }

      order.order_status = 'delivered';
      order.delivery_details.delivered_at = new Date();
      order.delivery_details.delivered_by = req.user?.id || req.user?._id || null;
      order.delivery_details.delivery_notes = delivery_notes || order.delivery_details.delivery_notes;

      // Automatically initiate feedback & BDE Sales Funnel (Section 5 & 6)
      order.feedback.feedback_status = 'pending';
      order.funnel.current_stage = 'feedback_pending';
      order.funnel.stage_updated_at = new Date();

      if (inventory) {
        if (inventory.dispatched_quantity > 0) inventory.dispatched_quantity -= 1;
        inventory.delivered_quantity += 1;
        await inventory.save();
      }

      await order.save();
      return res.status(200).json({
        success: true,
        message: 'Order marked as Delivered. Automatically entered BDE Sales Funnel (Feedback Pending).',
        data: order
      });
    }

    return res.status(400).json({ success: false, message: 'Valid action (dispatch / deliver) required.' });
  } catch (err) {
    console.error('❌ Error updating order delivery:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 8. AUTHORIZED ADMIN CANCELLATION REVERSAL (Section 4 Mandatory Business Rule)
 * "Cancelled orders should release the restriction only after authorized Admin approval and stock reversal."
 */
exports.admin_cancel_reversal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await TrialKitOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Trial kit order not found.' });
    }

    if (order.order_status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an order that has already been delivered.' });
    }

    const previousStatus = order.order_status;
    order.order_status = 'cancelled';
    order.cancellation.is_cancelled = true;
    order.cancellation.cancelled_at = new Date();
    order.cancellation.cancellation_reason = reason || 'Admin cancelled and reversed restriction.';
    order.cancellation.admin_approved = true;
    order.cancellation.admin_approved_by = req.user?.id || req.user?._id || null;
    order.cancellation.admin_approved_by_name = req.user?.name || req.user?.email || 'Super Admin';
    order.cancellation.admin_approved_at = new Date();
    order.cancellation.stock_reversed = true;
    order.cancellation.restriction_released = true; // Releases the GST lock

    // Stock Reversal
    const inventory = await TrialKitInventory.findOne({
      kit_type: order.kit_type,
      warehouse_id: order.warehouse_id
    });

    if (inventory) {
      const prevStock = inventory.available_stock;
      inventory.available_stock += 1;
      if (previousStatus === 'confirmed' && inventory.reserved_stock > 0) {
        inventory.reserved_stock -= 1;
      } else if (previousStatus === 'dispatched' && inventory.dispatched_quantity > 0) {
        inventory.dispatched_quantity -= 1;
      }
      if (inventory.ordered_quantity > 0) {
        inventory.ordered_quantity -= 1;
      }
      await inventory.save();

      // Log Stock History
      await TrialKitStockHistory.create({
        trial_kit_inventory_id: inventory._id,
        kit_type: order.kit_type,
        warehouse_id: order.warehouse_id,
        warehouse_name: inventory.warehouse_name,
        adjustment_type: 'order_cancellation_reversal',
        quantity_change: 1,
        previous_available_stock: prevStock,
        new_available_stock: inventory.available_stock,
        user_name: req.user?.name || 'Super Admin',
        user_id: req.user?.id || req.user?._id || null,
        user_role: 'admin',
        remarks: `Authorized Admin cancellation reversal for order ${order.order_number}. GST restriction released.`
      });
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order ${order.order_number} cancelled. Stock reversed (+1) and GST restriction released.`,
      data: order
    });
  } catch (err) {
    console.error('❌ Error approving cancellation reversal:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 9. REASSIGN BDE TO TRIAL KIT LEAD (Admin Only)
 */
exports.reassign_bde = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { new_bde_id } = req.body;

    if (!new_bde_id || !mongoose.Types.ObjectId.isValid(new_bde_id)) {
      return res.status(400).json({ success: false, message: 'Valid BDE ID required.' });
    }

    const bde = await BDEProfile.findById(new_bde_id).lean();
    if (!bde) {
      return res.status(404).json({ success: false, message: 'BDE profile not found.' });
    }

    const order = await TrialKitOrder.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Trial kit order not found.' });
    }

    order.bde_id = bde._id;
    order.bde_name = bde.full_name;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Lead reassigned to BDE: ${bde.full_name}`,
      data: order
    });
  } catch (err) {
    console.error('❌ Error reassigning BDE:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 10. OVERALL TRIAL KIT SUMMARY & WAREHOUSE-WISE DASHBOARD (Section 7)
 */
exports.get_analytics_summary = async (req, res) => {
  try {
    // 1. Overall Stock Aggregations across all warehouses
    const stockAgg = await TrialKitInventory.aggregate([
      {
        $group: {
          _id: null,
          total_stock: { $sum: '$available_stock' },
          total_reserved: { $sum: '$reserved_stock' },
          total_ordered: { $sum: '$ordered_quantity' },
          total_dispatched: { $sum: '$dispatched_quantity' },
          total_delivered: { $sum: '$delivered_quantity' }
        }
      }
    ]);

    const totalStock = stockAgg[0]?.total_stock || 0;

    // 2. Orders Metrics
    const totalOrders = await TrialKitOrder.countDocuments({ order_status: { $ne: 'cancelled' } });
    const totalDelivered = await TrialKitOrder.countDocuments({ order_status: 'delivered' });
    const pendingDelivery = await TrialKitOrder.countDocuments({ order_status: { $in: ['confirmed', 'dispatched'] } });
    const feedbackPending = await TrialKitOrder.countDocuments({
      order_status: 'delivered',
      'feedback.feedback_status': 'pending'
    });

    // 3. Converted vs Non-converted EPCs
    // Find all unique EPC IDs who received a trial kit
    const trialEpcs = await TrialKitOrder.distinct('epc_id', { order_status: 'delivered' });

    // Find which of these EPCs placed a commercial order
    const commercialEpcs = await EpcOrder.distinct('epc_id', {
      epc_id: { $in: trialEpcs },
      order_status: { $nin: ['cancelled', 'pending'] },
      is_trial_order: { $ne: true }
    });

    const convertedEpcsCount = commercialEpcs.length;
    const nonConvertedEpcsCount = Math.max(0, trialEpcs.length - convertedEpcsCount);

    // 4. Warehouse-wise Dashboard Table (Section 7.B)
    const warehouseData = await TrialKitInventory.aggregate([
      {
        $group: {
          _id: '$warehouse_id',
          warehouse_name: { $first: '$warehouse_name' },
          available: { $sum: '$available_stock' },
          ordered: { $sum: '$ordered_quantity' },
          delivered: { $sum: '$delivered_quantity' }
        }
      },
      { $sort: { warehouse_name: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total_stock: totalStock,
          total_orders: totalOrders,
          total_delivered: totalDelivered,
          pending_delivery: pendingDelivery,
          feedback_pending: feedbackPending,
          converted_epcs: convertedEpcsCount,
          non_converted_epcs: nonConvertedEpcsCount
        },
        warehouse_table: warehouseData
      }
    });
  } catch (err) {
    console.error('❌ Error fetching analytics summary:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 11. TRIAL KIT VS DIRECT QUOTE CONVERSION ANALYSIS (Section 8 - Critical BI Feature)
 *
 * Rules:
 * - Channel A (Trial Kit Channel): EPC receives a trial kit, tests the product and subsequently purchases commercial kits.
 * - Channel B (Direct Commercial Quotation): EPC directly requests a commercial quote and places an order WITHOUT ordering a trial kit.
 * - An EPC must be counted only once in each acquisition channel.
 * - Commercial orders must be attributed to the correct originating channel.
 * - Trial kit orders themselves must NOT count as commercial sales conversions.
 * - Formula: ConversionRate = (EPCs with Commercial Orders / Unique EPCs in Channel) * 100
 */
exports.get_conversion_comparison = async (req, res) => {
  try {
    // Step 1: Identify all unique EPCs who ever ordered a trial kit
    const trialEpcIds = await TrialKitOrder.distinct('epc_id', {
      order_status: { $in: ['confirmed', 'dispatched', 'delivered'] }
    });

    const trialEpcIdStrings = new Set(trialEpcIds.map(id => id.toString()));

    // Step 2: Channel A Metrics (Trial Kit Channel)
    const channelAUniqueEpcCount = trialEpcIds.length;

    // Commercial orders placed by Channel A EPCs (excluding trial orders)
    const channelAOrders = await EpcOrder.find({
      epc_id: { $in: trialEpcIds },
      order_status: { $nin: ['cancelled', 'pending'] },
      is_trial_order: { $ne: true }
    }).lean();

    const channelAConvertedEpcIds = new Set(channelAOrders.map(o => o.epc_id.toString()));
    const channelAOrdersReceived = channelAOrders.length;
    const channelAConvertedEpcsCount = channelAConvertedEpcIds.size;
    const channelAConversionRate = channelAUniqueEpcCount > 0
      ? ((channelAConvertedEpcsCount / channelAUniqueEpcCount) * 100).toFixed(1)
      : 0;

    const channelATotalSalesPaise = channelAOrders.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0);
    const channelATotalSalesInr = Math.round(channelATotalSalesPaise / 100);
    const channelAAverageOrderValueInr = channelAOrdersReceived > 0
      ? Math.round(channelATotalSalesInr / channelAOrdersReceived)
      : 0;

    // Average Sales Cycle for Channel A: Days from trial kit delivery to first commercial order
    const trialDeliveryDates = await TrialKitOrder.find({
      epc_id: { $in: Array.from(channelAConvertedEpcIds) },
      order_status: 'delivered'
    }).select('epc_id delivery_details.delivered_at').lean();

    const deliveryMap = {};
    trialDeliveryDates.forEach(t => {
      if (t.delivery_details?.delivered_at) {
        deliveryMap[t.epc_id.toString()] = new Date(t.delivery_details.delivered_at).getTime();
      }
    });

    let channelATotalCycleDays = 0;
    let channelACycleCount = 0;

    channelAOrders.forEach(o => {
      const epcStr = o.epc_id.toString();
      if (deliveryMap[epcStr] && o.created_at) {
        const orderTime = new Date(o.created_at).getTime();
        const diffDays = Math.max(0, Math.round((orderTime - deliveryMap[epcStr]) / (1000 * 3600 * 24)));
        channelATotalCycleDays += diffDays;
        channelACycleCount++;
      }
    });

    const channelASalesCycleDays = channelACycleCount > 0
      ? Math.round(channelATotalCycleDays / channelACycleCount)
      : 14; // Default baseline if sample size is small

    // Step 3: Channel B Metrics (Direct Commercial Quote Channel)
    // EPCs who created a quote or inquiry, but NEVER ordered a trial kit
    const directQuoteEpcs = await EpcQuote.distinct('epc_id', {
      epc_id: { $nin: trialEpcIds }
    });

    // Also include any EPCs who placed commercial orders directly without trial kit
    const directOrderEpcs = await EpcOrder.distinct('epc_id', {
      epc_id: { $nin: trialEpcIds },
      is_trial_order: { $ne: true }
    });

    const channelBAllEpcIds = Array.from(new Set([
      ...directQuoteEpcs.map(id => id.toString()),
      ...directOrderEpcs.map(id => id.toString())
    ]));

    const channelBUniqueEpcCount = channelBAllEpcIds.length;

    const channelBOrders = await EpcOrder.find({
      epc_id: { $in: channelBAllEpcIds },
      order_status: { $nin: ['cancelled', 'pending'] },
      is_trial_order: { $ne: true }
    }).lean();

    const channelBConvertedEpcIds = new Set(channelBOrders.map(o => o.epc_id.toString()));
    const channelBOrdersReceived = channelBOrders.length;
    const channelBConvertedEpcsCount = channelBConvertedEpcIds.size;
    const channelBConversionRate = channelBUniqueEpcCount > 0
      ? ((channelBConvertedEpcsCount / channelBUniqueEpcCount) * 100).toFixed(1)
      : 0;

    const channelBTotalSalesPaise = channelBOrders.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0);
    const channelBTotalSalesInr = Math.round(channelBTotalSalesPaise / 100);
    const channelBAverageOrderValueInr = channelBOrdersReceived > 0
      ? Math.round(channelBTotalSalesInr / channelBOrdersReceived)
      : 0;

    // Sales Cycle for Channel B: Days from quote creation to order
    const quotes = await EpcQuote.find({
      epc_id: { $in: Array.from(channelBConvertedEpcIds) }
    }).select('epc_id created_at').lean();

    const quoteMap = {};
    quotes.forEach(q => {
      quoteMap[q.epc_id.toString()] = new Date(q.created_at).getTime();
    });

    let channelBTotalCycleDays = 0;
    let channelBCycleCount = 0;

    channelBOrders.forEach(o => {
      const epcStr = o.epc_id.toString();
      if (quoteMap[epcStr] && o.created_at) {
        const orderTime = new Date(o.created_at).getTime();
        const diffDays = Math.max(0, Math.round((orderTime - quoteMap[epcStr]) / (1000 * 3600 * 24)));
        channelBTotalCycleDays += diffDays;
        channelBCycleCount++;
      }
    });

    const channelBSalesCycleDays = channelBCycleCount > 0
      ? Math.round(channelBTotalCycleDays / channelBCycleCount)
      : 22; // Default baseline

    // Additional Section 8 Analytics
    // Trial kit cost versus commercial sales generated
    const trialKitsDeliveredCount = await TrialKitOrder.countDocuments({ order_status: 'delivered' });
    const estimatedTrialCostInr = trialKitsDeliveredCount * 25000; // Average ₹25,000 per demo kit
    const revenuePerTrialKitDelivered = trialKitsDeliveredCount > 0
      ? Math.round(channelATotalSalesInr / trialKitsDeliveredCount)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        comparison_table: {
          metric_names: [
            'Total EPC leads',
            'Orders received',
            'Conversion ratio',
            'Total sales value',
            'Average order value',
            'Sales cycle'
          ],
          channel_a_trial: {
            name: 'Trial Kit Channel',
            total_epc_leads: channelAUniqueEpcCount,
            orders_received: channelAOrdersReceived,
            conversion_ratio: `${channelAConversionRate}%`,
            total_sales_value_inr: channelATotalSalesInr,
            average_order_value_inr: channelAAverageOrderValueInr,
            sales_cycle_days: `${channelASalesCycleDays} Days`
          },
          channel_b_direct: {
            name: 'Direct Quote Channel',
            total_epc_leads: channelBUniqueEpcCount,
            orders_received: channelBOrdersReceived,
            conversion_ratio: `${channelBConversionRate}%`,
            total_sales_value_inr: channelBTotalSalesInr,
            average_order_value_inr: channelBAverageOrderValueInr,
            sales_cycle_days: `${channelBSalesCycleDays} Days`
          }
        },
        additional_analytics: {
          total_trial_kits_delivered: trialKitsDeliveredCount,
          estimated_trial_kit_cost_inr: estimatedTrialCostInr,
          commercial_sales_generated_inr: channelATotalSalesInr,
          revenue_per_trial_kit_delivered_inr: revenuePerTrialKitDelivered,
          avg_days_to_first_commercial_order: channelASalesCycleDays,
          repeat_commercial_orders: Math.max(0, channelAOrdersReceived - channelAConvertedEpcsCount)
        }
      }
    });
  } catch (err) {
    console.error('❌ Error calculating conversion comparison:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
