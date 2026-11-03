const { WarehouseInward, WarehouseStock, CompanyWarehouse, PurchaseOrder } = require('../models/company_warehouse_db');
const { ProductSkuPrice, ProductSku, Product, Brand, ProductTemplate } = require('../models/core_db');
const { company_warehouse_db } = require('../config/databases');
const { sendAdminNotification } = require('../../admin-panel/services/admin.notification.service');
const GeoLevel2 = require('../models/geolocation_db/geolocation_level_2.schema');
const { Supplier } = require('../models/supplier_db');
const ProductAttributeValue = require('../models/core_db/product_attribute_values.schema');
const SubtypeAttribute = require('../models/core_db/subtype_attributes.schema');
const Unit = require('../models/core_db/units.schema');
const AttributeOption = require('../models/core_db/attribute_options.schema');

// Helper to resolve warehouse ID with fallback for super admin
const resolveWarehouseId = async (user, session = null) => {
  if (user.warehouse_id) return user.warehouse_id;
  if (user.is_super_admin === true) {
    const query = CompanyWarehouse.findOne({ is_active: true, deleted_at: null });
    if (session) query.session(session);
    const warehouse = await query.lean();
    return warehouse ? warehouse._id : null;
  }
  return null;
};

const get_active_skus = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    // Fetch warehouse details to get level_2 (District ID) and resolve cluster_id
    const warehouse = await CompanyWarehouse.findById(warehouse_id).lean();
    let cluster_id = null;
    if (warehouse && warehouse.level_2) {
      const district = await GeoLevel2.findById(warehouse.level_2).lean();
      if (district && district.cluster) {
        cluster_id = district.cluster;
      }
    }

    const priceQuery = { price: { $gt: 0 } };
    if (cluster_id) {
      priceQuery.$or = [
        { warehouse_id },
        { cluster_id }
      ];
    } else {
      priceQuery.warehouse_id = warehouse_id;
    }

    // Fetch priced SKUs for this warehouse or cluster
    const prices = await ProductSkuPrice.find(priceQuery)
      .populate({
        path: 'sku_id',
        populate: [
          {
            path: 'product_id',
            populate: [
              { path: 'brand_id' },
              { path: 'template_id' }
            ]
          },
          {
            path: 'attributes.subtype_attribute_id'
          },
          {
            path: 'attributes.unit_id'
          }
        ]
      });

    // Deduplicate prices by sku_id, giving precedence to warehouse-specific pricing
    const skuPricesMap = {};
    for (const p of prices) {
      const sku = p.sku_id;
      if (!sku || sku.deleted_at) continue;

      const skuIdStr = sku._id.toString();
      const existing = skuPricesMap[skuIdStr];

      if (!existing) {
        skuPricesMap[skuIdStr] = p;
      } else {
        const isNewWarehouseSpecific = p.warehouse_id && p.warehouse_id.toString() === warehouse_id.toString();
        const isExistingWarehouseSpecific = existing.warehouse_id && existing.warehouse_id.toString() === warehouse_id.toString();

        if (isNewWarehouseSpecific && !isExistingWarehouseSpecific) {
          skuPricesMap[skuIdStr] = p;
        }
      }
    }

    const finalPrices = Object.values(skuPricesMap);

    const skuIds = finalPrices.map(p => p.sku_id?._id).filter(Boolean);
    const productIds = finalPrices.map(p => p.sku_id?.product_id?._id || p.sku_id?.product_id).filter(Boolean);

    let allAttrs = [];
      try {
        allAttrs = await ProductAttributeValue.find({
          $or: [
            { sku_id: { $in: skuIds } },
            { product_id: { $in: productIds }, sku_id: null }
          ],
          deleted_at: null
        })
          .populate({ path: 'attribute_id', model: SubtypeAttribute })
          .populate({ path: 'unit_id', model: Unit })
          .populate({ path: 'value_option_id', model: AttributeOption })
          .lean();
      } catch (attrErr) {
        console.warn("Attribute population error in get_stock_status:", attrErr?.message || attrErr);
      }

    const skuAttrMap = {};
    const productAttrMap = {};
    allAttrs.forEach(a => {
      if (a.sku_id) {
        const key = a.sku_id.toString();
        if (!skuAttrMap[key]) skuAttrMap[key] = [];
        skuAttrMap[key].push(a);
      } else if (a.product_id) {
        const key = a.product_id.toString();
        if (!productAttrMap[key]) productAttrMap[key] = [];
        productAttrMap[key].push(a);
      }
    });

    const formattedSkus = finalPrices.map(p => {
      const sku = p.sku_id;
      if (!sku || sku.deleted_at) return null;
      const product = sku.product_id;
      if (!product || product.deleted_at) return null;

      const skuIdStr = sku._id.toString();
      const prodIdStr = product._id?.toString() || product.toString();
      const skuAttrs = skuAttrMap[skuIdStr] || [];
      const prodAttrs = productAttrMap[prodIdStr] || [];
      const combinedAttrs = [...skuAttrs, ...prodAttrs];

      // Find capacity attribute using standard attributes logic
      let capacity_w = 0;
      let capacity_unit = '';
      
      const capAttr = combinedAttrs.find(a => 
        a.attribute_id?.attribute_type === 'sku' ||
        ['capacity', 'power rating', 'ac capacity', 'pmax', 'power'].includes((a.attribute_id?.name || '').toLowerCase().trim())
      );
      if (capAttr) {
        const rawVal = parseFloat(capAttr.value_number ?? (capAttr.value_option_id ? capAttr.value_option_id.value : capAttr.value_text) ?? 0);
        const factor = capAttr.unit_id?.conversion_factor || 1;
        capacity_w = rawVal * factor;
        capacity_unit = capAttr.unit_id?.symbol || '';
      }

      const isSolar = (product.template_id?.name || '').toLowerCase().includes('solar panel');
      let benchmark_price_per_watt = p.price_per_watt || 0;
      if (isSolar && benchmark_price_per_watt === 0 && p.price > 0 && capacity_w > 0) {
        benchmark_price_per_watt = p.price / capacity_w;
      }

      return {
        id: sku._id,
        sku_id: sku._id,
        sku_code: sku.sku_code,
        product_name: product.name,
        brand_name: product.brand_id?.brand_name || 'N/A',
        category: product.template_id?.name || 'N/A',
        wattage: capacity_w || 0, // This is capacity in W
        capacity_w: capacity_w || 0,
        capacity_unit: capacity_unit || '',
        benchmark_price: p.price,
        benchmark_price_per_watt: benchmark_price_per_watt,
        currency_code: p.currency_code
      };
    }).filter(Boolean);

    return res.status(200).json({ status: "success", data: formattedSkus });
  } catch (err) {
    console.error("Error in get_active_skus:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch active SKUs." });
  }
};

const save_inward = async (req, res) => {
  const session = await company_warehouse_db.startSession();
  session.startTransaction();
  try {
    const warehouse_id = await resolveWarehouseId(req.user, session);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    // Resolve cluster_id first
    const warehouse = await CompanyWarehouse.findById(warehouse_id).lean();
    let cluster_id = null;
    if (warehouse && warehouse.level_2) {
      const district = await GeoLevel2.findById(warehouse.level_2).lean();
      if (district && district.cluster) {
        cluster_id = district.cluster;
      }
    }

    const { inward_type, supplier_name, invoice_no, invoice_date, items, invoice_pdf } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: "error", message: "At least one item is required." });
    }

    // Generate unique GRN No
    const count = await WarehouseInward.countDocuments({}).session(session);
    const year = new Date().getFullYear();
    const grnPrefix = inward_type === 'supplier' ? 'M' : 'S';
    const grn_no = `GRN-${year}-${grnPrefix}${String(count + 1).padStart(5, '0')}`;

    const processedItems = [];

    for (const item of items) {
      const { sku_id, qty, invoice_price, qc_status, damage_notes, serials, allocation_rack } = item;

      // 1. Fetch SKU details to get SKU Code and check solar capacity
      const skuDetail = await ProductSku.findById(sku_id)
        .populate({
          path: 'product_id',
          populate: { path: 'template_id' }
        });

      if (!skuDetail) {
        throw new Error(`SKU not found.`);
      }

      const productDetail = skuDetail.product_id || {};
      const templateDetail = productDetail.template_id;
      const isSolarPanel = (templateDetail?.name || '').toLowerCase().includes('solar panel');

      // Calculate capacity_w using unit conversion factor
      let capacity_w = 0;
      let capacity_unit = '';

      const attrs = await ProductAttributeValue.find({
        $or: [
          { sku_id: skuDetail._id },
          { product_id: skuDetail.product_id?._id || skuDetail.product_id, sku_id: null }
        ],
        deleted_at: null
      })
        .populate({ path: 'attribute_id', model: SubtypeAttribute })
        .populate({ path: 'unit_id', model: Unit })
        .populate({ path: 'value_option_id', model: AttributeOption })
        .lean();

      const capAttr = attrs.find(a => 
        a.attribute_id?.attribute_type === 'sku' ||
        ['capacity', 'power rating', 'ac capacity', 'pmax', 'power'].includes((a.attribute_id?.name || '').toLowerCase().trim())
      );
      if (capAttr) {
        const rawVal = parseFloat(capAttr.value_number ?? (capAttr.value_option_id ? capAttr.value_option_id.value : capAttr.value_text) ?? 0);
        const factor = capAttr.unit_id?.conversion_factor || 1;
        capacity_w = rawVal * factor;
        capacity_unit = capAttr.unit_id?.symbol || '';
      }

      // 2. Fetch benchmark price for this SKU in the warehouse or cluster
      let priceEntry = await ProductSkuPrice.findOne({ warehouse_id, sku_id, price: { $gt: 0 } });
      if (!priceEntry && cluster_id) {
        priceEntry = await ProductSkuPrice.findOne({ cluster_id, sku_id, price: { $gt: 0 } });
      }

      if (!priceEntry || priceEntry.price <= 0) {
        throw new Error(`SKU ${skuDetail.sku_code} is not configured with an active benchmark price in the Price Master for this warehouse or cluster.`);
      }

      let benchmark_price = priceEntry.price;
      let benchmark_price_per_watt = priceEntry.price_per_watt || 0;
      if (isSolarPanel && benchmark_price_per_watt === 0 && priceEntry.price > 0 && capacity_w > 0) {
        benchmark_price_per_watt = priceEntry.price / capacity_w;
      }

      const parsedInvoicePrice = Number(invoice_price); // Entered invoice price (per-watt for solar panel)
      let invoice_price_per_watt = 0;
      let finalInvoicePrice = parsedInvoicePrice;

      if (isSolarPanel) {
        invoice_price_per_watt = parsedInvoicePrice;
        finalInvoicePrice = invoice_price_per_watt * capacity_w;

        // Validate constraint per watt
        if (invoice_price_per_watt > benchmark_price_per_watt) {
          throw new Error(`Invoice price per watt (${invoice_price_per_watt}) cannot exceed the benchmark price per watt (${benchmark_price_per_watt}) for SKU ${skuDetail.sku_code}.`);
        }
      } else {
        // Validate constraint per piece
        if (parsedInvoicePrice > benchmark_price) {
          throw new Error(`Invoice price (${parsedInvoicePrice}) cannot exceed the benchmark price (${benchmark_price}) for SKU ${skuDetail.sku_code}.`);
        }
      }

      processedItems.push({
        sku_id,
        sku_code: skuDetail.sku_code,
        qty: Number(qty),
        benchmark_price,
        benchmark_price_per_watt,
        invoice_price: finalInvoicePrice,
        invoice_price_per_watt,
        qc_status: qc_status || 'Passed',
        damage_notes: damage_notes || '',
        serials: serials || [],
        allocation_rack: allocation_rack || ''
      });

      // Update Stocks immediately
      let stock = await WarehouseStock.findOne({ warehouse_id, sku_id }).session(session);
      const parsedQty = Number(qty);

      if (stock) {
        const oldQty = stock.qty;
        const newQty = oldQty + parsedQty;

        const oldAverageInvoice = stock.average_invoice_price || 0;
        const oldAverageBenchmark = stock.average_benchmark_price || 0;

        const newAverageInvoice = ((oldQty * oldAverageInvoice) + (parsedQty * finalInvoicePrice)) / newQty;
        const newAverageBenchmark = ((oldQty * oldAverageBenchmark) + (parsedQty * benchmark_price)) / newQty;

        // Calculate average per watt
        const oldAvgInvoicePerWatt = stock.average_invoice_price_per_watt || 0;
        const oldAvgBenchmarkPerWatt = stock.average_benchmark_price_per_watt || 0;
        const newAvgInvoicePerWatt = isSolarPanel 
          ? (((oldQty * oldAvgInvoicePerWatt) + (parsedQty * invoice_price_per_watt)) / newQty)
          : 0;
        const newAvgBenchmarkPerWatt = isSolarPanel
          ? (((oldQty * oldAvgBenchmarkPerWatt) + (parsedQty * benchmark_price_per_watt)) / newQty)
          : 0;

        stock.qty = newQty;
        stock.average_invoice_price = Math.round(newAverageInvoice * 100) / 100;
        stock.average_benchmark_price = Math.round(newAverageBenchmark * 100) / 100;
        stock.average_invoice_price_per_watt = Math.round(newAvgInvoicePerWatt * 100) / 100;
        stock.average_benchmark_price_per_watt = Math.round(newAvgBenchmarkPerWatt * 100) / 100;
        stock.total_valuation_invoice = Math.round(newQty * newAverageInvoice * 100) / 100;
        stock.total_valuation_benchmark = Math.round(newQty * newAverageBenchmark * 100) / 100;

        if (isSolarPanel) {
          stock.total_kw = Math.round((newQty * capacity_w / 1000) * 100) / 100;
        } else {
          stock.total_kw = 0;
        }
        await stock.save({ session });
      } else {
        const totalValuationInvoice = parsedQty * finalInvoicePrice;
        const totalValuationBenchmark = parsedQty * benchmark_price;
        const totalKw = isSolarPanel ? (parsedQty * capacity_w / 1000) : 0;

        await WarehouseStock.create([{
          warehouse_id,
          sku_id: skuDetail._id,
          sku_code: skuDetail.sku_code,
          qty: parsedQty,
          total_kw: Math.round(totalKw * 100) / 100,
          average_invoice_price: finalInvoicePrice,
          average_benchmark_price: benchmark_price,
          average_invoice_price_per_watt: isSolarPanel ? invoice_price_per_watt : 0,
          average_benchmark_price_per_watt: isSolarPanel ? benchmark_price_per_watt : 0,
          total_valuation_invoice: Math.round(totalValuationInvoice * 100) / 100,
          total_valuation_benchmark: Math.round(totalValuationBenchmark * 100) / 100
        }], { session });
      }
    }

    const inward = await WarehouseInward.create([{
      grn_no,
      warehouse_id,
      inward_type,
      supplier_name,
      invoice_no,
      invoice_date: new Date(invoice_date),
      status: 'approved',
      invoice_pdf: invoice_pdf || null,
      items: processedItems,
      received_by: req.user.id
    }], { session });

    await session.commitTransaction();
        sendAdminNotification({
      title: `📥 Direct GRN Created: ${grn_no}`,
      message: `Warehouse me ${inward_type === 'supplier' ? 'Supplier' : 'Direct'} inward complete hua (GRN: ${grn_no}, ${processedItems.length} items). Stock inventory update ho gayi hai.`,
      category: 'inventory',
      priority: 'normal',
      action_url: '/warehouse-panel/material-inward',
      metadata: {
        grn_no,
        event: 'inward_saved'
      }
    }).catch(err => console.warn('[Inward Saved Notification Error]:', err.message));

    return res.status(201).json({ status: "success", message: "Material inward logged successfully and stock updated.", data: inward[0] });
  } catch (err) {
    await session.abortTransaction();
    console.error("Error in save_inward:", err);
    return res.status(400).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
};

const get_inward_logs = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    let logs;
    try {
      logs = await WarehouseInward.find({ warehouse_id })
        .sort({ created_at: -1 })
        .populate('received_by', 'name email');
    } catch (populateErr) {
      console.warn("Populate failed, fetching logs without populate:", populateErr);
      logs = await WarehouseInward.find({ warehouse_id })
        .sort({ created_at: -1 })
        .lean();
    }

    return res.status(200).json({ status: "success", data: logs });
  } catch (err) {
    console.error("Error in get_inward_logs:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch inward logs." });
  }
};

const get_stock_status = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const stock = await WarehouseStock.find({ warehouse_id }).lean();
    
    const { india_solarshop_db, solarkits_core_db } = require('../config/databases');
    const mongoose = require('mongoose');

    const activationSchema = new mongoose.Schema({}, { strict: false, collection: 'warehouse_kit_activations' });
    const WarehouseKitActivation = solarkits_core_db.models['warehouse_kit_activations'] || solarkits_core_db.model('warehouse_kit_activations', activationSchema);

    const kitSchema = new mongoose.Schema({}, { strict: false, collection: 'pc_comobo_kit' });
    const ComboKit = solarkits_core_db.models['pc_comobo_kit'] || solarkits_core_db.model('pc_comobo_kit', kitSchema);

    const activations = await WarehouseKitActivation.find({
      warehouse_id,
      is_combokit_active: true,
      is_active: true,
      deleted_at: null
    }).lean();

    const activeSkuIdsMap = {};
    if (activations.length > 0) {
      const kitIds = activations.map(a => a.combo_kit_id).filter(Boolean);
      const kits = await ComboKit.find({ _id: { $in: kitIds }, deleted_at: null }).lean();
      
      kits.forEach(kit => {
        const components = [
          ...(kit.base_components || []),
          ...(kit.bos_kits || [])
        ];
        components.forEach(comp => {
          if (comp.sku_id) {
            activeSkuIdsMap[comp.sku_id.toString()] = true;
          }
        });
      });
    }

    const ProductSku = solarkits_core_db.models['pc_product_skus'] || solarkits_core_db.model('pc_product_skus', new mongoose.Schema({}, { strict: false, collection: 'pc_product_skus' }));
    
    // Ensure all active SKUs have at least a placeholder record in stock
    const existingSkuIds = new Set(stock.map(s => s.sku_id ? s.sku_id.toString() : null).filter(Boolean));
    for (const activeSkuId of Object.keys(activeSkuIdsMap)) {
      if (!existingSkuIds.has(activeSkuId)) {
        const skuObj = await ProductSku.findById(activeSkuId).lean();
        if (skuObj) {
          stock.push({
            warehouse_id,
            sku_id: new mongoose.Types.ObjectId(activeSkuId),
            sku_code: skuObj.sku_code,
            qty: 0,
            total_kw: 0,
            average_invoice_price: 0,
            average_invoice_price_per_watt: 0,
            average_benchmark_price: 0,
            average_benchmark_price_per_watt: 0,
            total_valuation_invoice: 0,
            total_valuation_benchmark: 0
          });
        }
      }
    }

    const activeStock = [];

    if (stock.length > 0) {
      const poSchema = new mongoose.Schema({}, { strict: false, collection: 'purchase_orders' });
      const CustomerOrder = india_solarshop_db.models['purchase_orders'] || india_solarshop_db.model('purchase_orders', poSchema);

      const resvSchema = new mongoose.Schema({}, { strict: false, collection: 'inventory_reservations' });
      const InventoryReservation = india_solarshop_db.models['inventory_reservations'] || india_solarshop_db.model('inventory_reservations', resvSchema);

      const physicalStockMap = {};
      stock.forEach(s => {
        if (s.sku_id) { physicalStockMap[s.sku_id.toString()] = s.qty || 0; }
      });

      const confirmedOrders = await CustomerOrder.find({
        warehouse_id,
        status: 'confirmed'
      }).sort({ created_at: 1 }).lean();

      // Prefetch EPC account names for breakdown display
      const epcCustomerIds = [...new Set(confirmedOrders.map(o => o.customer_id?.toString()).filter(Boolean))];
      const epcAccountSchema = new mongoose.Schema({}, { strict: false, collection: 'epc_accounts' });
      const EpcAccount = india_solarshop_db.models['epc_accounts'] || india_solarshop_db.model('epc_accounts', epcAccountSchema);
      const epcAccounts = epcCustomerIds.length > 0
        ? await EpcAccount.find({ _id: { $in: epcCustomerIds.map(id => new mongoose.Types.ObjectId(id)) } }).lean()
        : [];
      const epcAccountMap = new Map(epcAccounts.map(a => [a._id.toString(), a.name || null]));

      const bookedMap = {};
      const preBookedMap = {};
      const bookingsBreakdownMap = {};

      if (confirmedOrders.length > 0) {
        const kitIds = confirmedOrders.map(o => o.combo_kit_id).filter(Boolean);
        const kits = await ComboKit.find({ _id: { $in: kitIds } }).lean();
        const kitMap = new Map(kits.map(k => [k._id.toString(), k]));

        const remainingStock = { ...physicalStockMap };

        confirmedOrders.forEach(order => {
          if (!order.combo_kit_id) return;
          const kit = kitMap.get(order.combo_kit_id.toString());
          if (kit) {
            const components = [...(kit.base_components || []), ...(kit.bos_kits || [])];
            components.forEach(comp => {
              if (comp.sku_id) {
                const skuIdStr = comp.sku_id.toString();
                const reqQty = comp.quantity || 1;
                const currentRem = remainingStock[skuIdStr] || 0;

                const allocatedQty = Math.min(currentRem, reqQty);
                const pendingQty = reqQty - allocatedQty;

                if (currentRem >= reqQty) {
                  bookedMap[skuIdStr] = (bookedMap[skuIdStr] || 0) + reqQty;
                  remainingStock[skuIdStr] = currentRem - reqQty;
                } else {
                  bookedMap[skuIdStr] = (bookedMap[skuIdStr] || 0) + currentRem;
                  preBookedMap[skuIdStr] = (preBookedMap[skuIdStr] || 0) + (reqQty - currentRem);
                  remainingStock[skuIdStr] = 0;
                }

                // Build per-order breakdown
                if (!bookingsBreakdownMap[skuIdStr]) bookingsBreakdownMap[skuIdStr] = [];
                bookingsBreakdownMap[skuIdStr].push({
                  order_id: order._id,
                  customer_name: (order.customer_id && epcAccountMap.get(order.customer_id.toString())) || `EPC #${order.customer_id?.toString().slice(-6) || 'Unknown'}`,
                  required_qty: reqQty,
                  allocated_qty: allocatedQty,
                  pending_qty: pendingQty,
                  created_at: order.created_at
                });
              }
            });
          }
        });
      }

      const now = new Date();
      const activeResvs = await InventoryReservation.find({
        status: 'reserved',
        expiry_time: { $gt: now }
      }).lean();

      const reservedMap = {};
      const reservationsBreakdownMap = {};

      if (activeResvs.length > 0) {
        const kitIds = activeResvs.map(r => r.product_id).filter(Boolean);
        const kits = await ComboKit.find({ _id: { $in: kitIds } }).lean();
        
        const resolvedWarehouseMap = {};
        for (const kit of kits) {
          let resolvedWhId = kit.warehouse_id;
          if (!resolvedWhId) {
            const activation = await WarehouseKitActivation.findOne({
              combo_kit_id: kit._id,
              is_combokit_active: true,
              is_active: true,
              deleted_at: null
            }).lean();
            if (activation) {
              resolvedWhId = activation.warehouse_id;
            }
          }
          if (resolvedWhId) {
            resolvedWarehouseMap[kit._id.toString()] = resolvedWhId.toString();
          }
        }

        activeResvs.forEach(resv => {
          if (!resv.product_id) return;
          const whIdStr = resolvedWarehouseMap[resv.product_id.toString()];
          if (whIdStr && whIdStr === warehouse_id.toString()) {
            const kit = kits.find(k => k._id && resv.product_id && k._id.toString() === resv.product_id.toString());
            if (kit) {
              const components = [...(kit.base_components || []), ...(kit.bos_kits || [])];
              components.forEach(comp => {
                if (comp.sku_id) {
                  const skuIdStr = comp.sku_id.toString();
                  const reqQty = (comp.quantity || 1) * (resv.quantity || 1);
                  reservedMap[skuIdStr] = (reservedMap[skuIdStr] || 0) + reqQty;

                  // Build reservation breakdown
                  if (!reservationsBreakdownMap[skuIdStr]) reservationsBreakdownMap[skuIdStr] = [];
                  reservationsBreakdownMap[skuIdStr].push({
                    customer_name: resv.customer_name || resv.contact_name || `Cart #${resv._id?.toString().slice(-6)}`,
                    quantity: reqQty,
                    expiry_time: resv.expiry_time
                  });
                }
              });
            }
          }
        });
      }

      const skuIds = stock.map(s => s.sku_id).filter(Boolean);
      const skus = await ProductSku.find({ _id: { $in: skuIds }, deleted_at: null }).lean();
      const skuMap = new Map(skus.map(s => [s._id.toString(), s]));

      const productIds = [...new Set(skus.map(s => s.product_id?.toString()).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));
      const products = await Product.find({ _id: { $in: productIds }, deleted_at: null }).lean();
      const productMap = new Map(products.map(p => [p._id.toString(), p]));

      const brandIds = [...new Set(products.map(p => p.brand_id?.toString()).filter(Boolean))];
      const brands = await Brand.find({ _id: { $in: brandIds } }).lean();
      const brandMap = new Map(brands.map(b => [b._id.toString(), b]));

      const templateIds = [...new Set(products.map(p => p.template_id?.toString()).filter(Boolean))];
      const templates = await ProductTemplate.find({ _id: { $in: templateIds } }).lean();
      const templateMap = new Map(templates.map(t => [t._id.toString(), t]));

      // Fetch attributes
      let allAttrs = [];
      try {
        allAttrs = await ProductAttributeValue.find({
          $or: [
            { sku_id: { $in: skuIds } },
            { product_id: { $in: productIds }, sku_id: null }
          ],
          deleted_at: null
        })
          .populate({ path: 'attribute_id', model: SubtypeAttribute })
          .populate({ path: 'unit_id', model: Unit })
          .populate({ path: 'value_option_id', model: AttributeOption })
          .lean();
      } catch (attrErr) {
        console.warn("Attribute population error in get_stock_status:", attrErr?.message || attrErr);
      }

      const skuAttrMap = {};
      const productAttrMap = {};
      allAttrs.forEach(a => {
        if (a.sku_id) {
          const key = a.sku_id.toString();
          if (!skuAttrMap[key]) skuAttrMap[key] = [];
          skuAttrMap[key].push(a);
        } else if (a.product_id) {
          const key = a.product_id.toString();
          if (!productAttrMap[key]) productAttrMap[key] = [];
          productAttrMap[key].push(a);
        }
      });

      for (const item of stock) {
        if (item.sku_id) {
          const skuIdStr = item.sku_id.toString();
          const sku = skuMap.get(skuIdStr);
          if (sku) {
            const product = sku.product_id ? productMap.get(sku.product_id.toString()) : null;
            if (product) {
              const brand = product.brand_id ? brandMap.get(product.brand_id.toString()) : null;
              const template = product.template_id ? templateMap.get(product.template_id.toString()) : null;
              sku.product_id = {
                ...product,
                brand_id: brand || null,
                template_id: template || null
              };
              item.sku_id = sku;

              item.booked_qty = bookedMap[skuIdStr] || 0;
              item.pre_booked_qty = preBookedMap[skuIdStr] || 0;
              item.reserved_qty = reservedMap[skuIdStr] || 0;
              item.bookings_breakdown = bookingsBreakdownMap[skuIdStr] || [];
              item.reservations_breakdown = reservationsBreakdownMap[skuIdStr] || [];

              // Format attributes
              const skuAttrs = skuAttrMap[skuIdStr] || [];
              const prodAttrs = productAttrMap[product._id.toString()] || [];
              const combinedAttrs = [...skuAttrs, ...prodAttrs];
              item.attributes = combinedAttrs.map(a => {
                const name = a.attribute_id?.name || 'Attribute';
                const val = a.value_number !== undefined && a.value_number !== null 
                  ? a.value_number 
                  : (a.value_option_id ? a.value_option_id.value : a.value_text || 'N/A');
                const unit = a.unit_id?.symbol || '';
                return { name, value: val, unit };
              });

              activeStock.push(item);
            }
          }
        }
      }
    }

    return res.status(200).json({ status: "success", data: activeStock });
  } catch (err) {
    console.error("Error in get_stock_status:", err);
    return res.status(200).json({ status: "success", data: [] });
  }
};

const get_warehouse_purchase_orders = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const list = await PurchaseOrder.find({ warehouse_id, status: { $in: ['paid', 'delivered'] } })
      .populate('warehouse_id')
      .sort({ created_at: -1 })
      .lean();

    const supplierIds = [...new Set(list.map(po => po.supplier_id?.toString()).filter(Boolean))];
    const suppliers = await Supplier.find({ _id: { $in: supplierIds } }).lean();
    const supplierMap = Object.fromEntries(suppliers.map(s => [s._id.toString(), s]));

    for (const po of list) {
      if (po.supplier_id) {
        po.supplier_id = supplierMap[po.supplier_id.toString()] || null;
      }
      for (const item of po.items) {
        const sku = await ProductSku.findById(item.sku_id)
          .populate({
            path: 'product_id',
            populate: [
              { path: 'brand_id' },
              { path: 'template_id' }
            ]
          }).lean();
        if (sku) {
          item.sku_details = {
            sku_code: sku.sku_code,
            product_name: sku.product_id?.name || 'N/A',
            brand_name: sku.product_id?.brand_id?.brand_name || 'N/A',
            category: sku.product_id?.template_id?.name || 'N/A'
          };
        }
      }
    }

    return res.status(200).json({ status: "success", data: list });
  } catch (err) {
    console.error("Error in get_warehouse_purchase_orders:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch purchase orders.", error: err.message });
  }
};

const mark_purchase_order_delivered = async (req, res) => {
  const session = await company_warehouse_db.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const warehouse_id = await resolveWarehouseId(req.user, session);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const po = await PurchaseOrder.findOne({ _id: id, warehouse_id }).session(session);
    if (!po) {
      return res.status(404).json({ status: "error", message: "Purchase order not found." });
    }

    if (po.status !== 'paid') {
      return res.status(400).json({ status: "error", message: `Purchase order cannot be delivered. Status is ${po.status} (must be 'paid').` });
    }

    const { invoice_no, invoice_date, invoice_pdf, supplier_gst } = req.body;
    if (!invoice_no || !invoice_date) {
      return res.status(400).json({ status: "error", message: "Actual supplier invoice number and date are required." });
    }
    if (!supplier_gst) {
      return res.status(400).json({ status: "error", message: "Supplier GST number is required for verification." });
    }

    // Retrieve warehouse to get its state (level_1 ID)
    const warehouse = await CompanyWarehouse.findById(po.warehouse_id).session(session).lean();
    if (!warehouse) {
      return res.status(404).json({ status: "error", message: "Warehouse not found." });
    }

    // Retrieve supplier to get its registered GST number
    const supplier = await Supplier.findById(po.supplier_id).lean();
    if (!supplier) {
      return res.status(404).json({ status: "error", message: "Supplier not found." });
    }

    const warehouseStateId = warehouse.level_1 ? warehouse.level_1.toString() : null;
    const matchedGstEntry = (supplier.gst_list || []).find(g => g.state && g.state.toString() === warehouseStateId);
    const expectedGst = matchedGstEntry ? matchedGstEntry.gst_number : supplier.gst_number;

    if (!expectedGst) {
      return res.status(400).json({ status: "error", message: "Supplier does not have a registered GST number configured for this state." });
    }

    if (supplier_gst.trim().toUpperCase() !== expectedGst.trim().toUpperCase()) {
      return res.status(400).json({
        status: "error",
        message: `Supplier GST verification failed. The invoice GST (${supplier_gst.toUpperCase()}) does not match the supplier's registered GST (${expectedGst}) for the warehouse state.`
      });
    }

    po.status = 'delivered';
    po.delivery_date = new Date();
    po.invoice_no = invoice_no;
    po.invoice_date = new Date(invoice_date);
    po.supplier_gst = supplier_gst.trim().toUpperCase();
    if (invoice_pdf) {
      po.invoice_pdf = invoice_pdf;
    }
    await po.save({ session });

    const inwardCount = await WarehouseInward.countDocuments({}).session(session);
    const year = new Date().getFullYear();
    const grn_no = `GRN-${year}-P${String(inwardCount + 1).padStart(5, '0')}`;

    const processedItems = [];

    for (const item of po.items) {
      const { sku_id, sku_code, qty, benchmark_price, order_price, order_price_per_watt, benchmark_price_per_watt } = item;

      // ProductSku / Product / ProductTemplate live on solarkits_core_db —
      // sessions cannot cross MongoClient boundaries, so NO .session() here.
      const skuDetail = await ProductSku.findById(sku_id)
        .populate({
          path: 'product_id',
          populate: { path: 'template_id' }
        })
        .lean();

      if (!skuDetail) {
        throw new Error(`SKU ${sku_code} not found in database.`);
      }

      const productDetail = skuDetail.product_id || {};
      const templateDetail = productDetail.template_id;
      const isSolarPanel = (templateDetail?.name || '').toLowerCase().includes('solar panel');

      // Calculate capacity_w using unit conversion factor
      let capacity_w = 0;
      let capacity_unit = '';

      const attrs = await ProductAttributeValue.find({
        $or: [
          { sku_id: skuDetail._id },
          { product_id: skuDetail.product_id?._id || skuDetail.product_id, sku_id: null }
        ],
        deleted_at: null
      })
        .populate({ path: 'attribute_id', model: SubtypeAttribute })
        .populate({ path: 'unit_id', model: Unit })
        .populate({ path: 'value_option_id', model: AttributeOption })
        .lean();

      const capAttr = attrs.find(a => 
        a.attribute_id?.attribute_type === 'sku' ||
        ['capacity', 'power rating', 'ac capacity', 'pmax', 'power'].includes((a.attribute_id?.name || '').toLowerCase().trim())
      );
      if (capAttr) {
        const rawVal = parseFloat(capAttr.value_number ?? (capAttr.value_option_id ? capAttr.value_option_id.value : capAttr.value_text) ?? 0);
        const factor = capAttr.unit_id?.conversion_factor || 1;
        capacity_w = rawVal * factor;
        capacity_unit = capAttr.unit_id?.symbol || '';
      }

      const itemBenchmarkPricePerWatt = benchmark_price_per_watt || (isSolarPanel && capacity_w ? benchmark_price / capacity_w : 0);
      const itemOrderPricePerWatt = order_price_per_watt || (isSolarPanel && capacity_w ? order_price / capacity_w : 0);

      processedItems.push({
        sku_id,
        sku_code,
        qty,
        benchmark_price,
        benchmark_price_per_watt: itemBenchmarkPricePerWatt,
        invoice_price: order_price,
        invoice_price_per_watt: itemOrderPricePerWatt,
        qc_status: 'Passed',
        damage_notes: '',
        serials: [],
        allocation_rack: 'Aisle A - Section 1'
      });

      let stock = await WarehouseStock.findOne({ warehouse_id, sku_id }).session(session);

      if (stock) {
        const oldQty = stock.qty;
        const newQty = oldQty + qty;

        const oldAverageInvoice = stock.average_invoice_price || 0;
        const oldAverageBenchmark = stock.average_benchmark_price || 0;

        const newAverageInvoice = ((oldQty * oldAverageInvoice) + (qty * order_price)) / newQty;
        const newAverageBenchmark = ((oldQty * oldAverageBenchmark) + (qty * benchmark_price)) / newQty;

        // Calculate average per watt
        const oldAvgInvoicePerWatt = stock.average_invoice_price_per_watt || 0;
        const oldAvgBenchmarkPerWatt = stock.average_benchmark_price_per_watt || 0;
        const newAvgInvoicePerWatt = isSolarPanel 
          ? (((oldQty * oldAvgInvoicePerWatt) + (qty * itemOrderPricePerWatt)) / newQty)
          : 0;
        const newAvgBenchmarkPerWatt = isSolarPanel
          ? (((oldQty * oldAvgBenchmarkPerWatt) + (qty * itemBenchmarkPricePerWatt)) / newQty)
          : 0;

        stock.qty = newQty;
        stock.average_invoice_price = Math.round(newAverageInvoice * 100) / 100;
        stock.average_benchmark_price = Math.round(newAverageBenchmark * 100) / 100;
        stock.average_invoice_price_per_watt = Math.round(newAvgInvoicePerWatt * 100) / 100;
        stock.average_benchmark_price_per_watt = Math.round(newAvgBenchmarkPerWatt * 100) / 100;
        stock.total_valuation_invoice = Math.round(newQty * newAverageInvoice * 100) / 100;
        stock.total_valuation_benchmark = Math.round(newQty * newAverageBenchmark * 100) / 100;

        if (isSolarPanel) {
          stock.total_kw = Math.round((newQty * capacity_w / 1000) * 100) / 100;
        } else {
          stock.total_kw = 0;
        }
        await stock.save({ session });
      } else {
        const totalValuationInvoice = qty * order_price;
        const totalValuationBenchmark = qty * benchmark_price;
        const totalKw = isSolarPanel ? (qty * capacity_w / 1000) : 0;

        await WarehouseStock.create([{
          warehouse_id,
          sku_id,
          sku_code,
          qty,
          total_kw: Math.round(totalKw * 100) / 100,
          average_invoice_price: order_price,
          average_benchmark_price: benchmark_price,
          average_invoice_price_per_watt: isSolarPanel ? itemOrderPricePerWatt : 0,
          average_benchmark_price_per_watt: isSolarPanel ? itemBenchmarkPricePerWatt : 0,
          total_valuation_invoice: Math.round(totalValuationInvoice * 100) / 100,
          total_valuation_benchmark: Math.round(totalValuationBenchmark * 100) / 100
        }], { session });
      }
    }

    let supplier_name = 'Supplier';
    if (po.supplier_id) {
      const supplier = await Supplier.findById(po.supplier_id).lean();
      if (supplier) {
        supplier_name = supplier.company_name;
      }
    }

    const inward = await WarehouseInward.create([{
      grn_no,
      warehouse_id,
      inward_type: 'supplier',
      supplier_name,
      invoice_no: invoice_no,
      invoice_date: new Date(invoice_date),
      status: 'approved',
      invoice_pdf: invoice_pdf || null,
      items: processedItems,
      received_by: req.user.id
    }], { session });

    await session.commitTransaction();

    // ── Post-Commit: Component-wise Procurement Update for linked EPC / Franchise orders ──
    if (po.po_type && po.po_type !== 'supplier_manual' && po.source_orders && po.source_orders.length > 0) {
      try {
        const { EpcOrder, FpoOrder } = require('../../admin-panel/models/india_solarshop_db');
        const procType = po.procurement_type || 'mixed';
        const isPanelProc = procType === 'panel' || procType === 'mixed';
        const isInverterProc = procType === 'inverter' || procType === 'mixed';

        for (const src of po.source_orders) {
          const Model = src.order_type === 'epc' ? EpcOrder : FpoOrder;
          const doc = await Model.findById(src.order_id);
          if (!doc) continue;

          if (!doc.procurement_status) {
            doc.procurement_status = {
              panel: { required: true, status: 'pending_payment' },
              inverter: { required: true, status: 'pending_payment' },
              overall_status: 'awaiting_supplier_procurement'
            };
          }

          if (isPanelProc) {
            doc.procurement_status.panel = {
              ...(doc.procurement_status.panel || {}),
              required: true,
              status: 'inwarded',
              po_id: po._id,
              po_number: po.po_number,
              inward_grn_id: inward[0]?._id || null,
              inward_grn_no: grn_no,
              inward_at: new Date(),
            };
          }

          if (isInverterProc) {
            doc.procurement_status.inverter = {
              ...(doc.procurement_status.inverter || {}),
              required: true,
              status: 'inwarded',
              po_id: po._id,
              po_number: po.po_number,
              inward_grn_id: inward[0]?._id || null,
              inward_grn_no: grn_no,
              inward_at: new Date(),
            };
          }

          // Cross-check all delivered purchase orders linked to this source order
          const linkedDeliveredPOs = await PurchaseOrder.find({
            'source_orders.order_id': doc._id,
            status: 'delivered'
          }).lean();

          for (const lpo of linkedDeliveredPOs) {
            const ltype = lpo.procurement_type || 'mixed';
            if ((ltype === 'panel' || ltype === 'mixed') && doc.procurement_status.panel?.status !== 'inwarded') {
              doc.procurement_status.panel = {
                ...(doc.procurement_status.panel || {}),
                required: true,
                status: 'inwarded',
                po_id: lpo._id,
                po_number: lpo.po_number,
                inward_at: lpo.delivery_date || new Date(),
              };
            }
            if ((ltype === 'inverter' || ltype === 'mixed') && doc.procurement_status.inverter?.status !== 'inwarded') {
              doc.procurement_status.inverter = {
                ...(doc.procurement_status.inverter || {}),
                required: true,
                status: 'inwarded',
                po_id: lpo._id,
                po_number: lpo.po_number,
                inward_at: lpo.delivery_date || new Date(),
              };
            }
          }

          // Check if BOTH Panel and Inverter are inwarded (or not required)
          const panelRequired = doc.procurement_status.panel?.required !== false;
          const inverterRequired = doc.procurement_status.inverter?.required !== false;
          const panelInwarded = !panelRequired || doc.procurement_status.panel?.status === 'inwarded';
          const inverterInwarded = !inverterRequired || doc.procurement_status.inverter?.status === 'inwarded';
          const bothInwarded = panelInwarded && inverterInwarded;

          if (bothInwarded) {
            doc.procurement_status.overall_status = 'inward_completed';
            doc.warehouse_id = warehouse_id;
            doc.payment_status = 'captured';

            if (src.order_type === 'epc') {
              doc.order_status = 'processing';
            } else {
              doc.status = 'PROCESSING';
            }
            console.log(`[InwardHandler] Both Panel & Inverter inwarded for ${src.order_type} order ${doc.order_number || doc.po_number}. Released to delivery queue!`);
          } else {
            doc.procurement_status.overall_status = 'awaiting_material_inward';
            doc.warehouse_id = warehouse_id;
            console.log(`[InwardHandler] Partial inward (${procType}) for ${src.order_type} order ${doc.order_number || doc.po_number}. Still awaiting remaining component inward before queue release.`);
          }

          doc.markModified('procurement_status');
          await doc.save();
        }
      } catch (triggerErr) {
        // Non-fatal — stock was already received, log the error
        console.error('[InwardHandler] Error updating source order procurement lifecycle:', triggerErr.message);
      }
    }

        // 1. Notify Accounts team to release balance 70%
    sendAdminNotification({
      title: `✅ Material Inwarded & QC Passed: ${po.po_number}`,
      message: `Warehouse dock par PO ${po.po_number} ka material physical invoice (${invoice_no}) ke sath receive ho gaya hai. Stock bins update ho gaye hain. Accounts team ab remaining 70% balance payment release kar sakti hai.`,
      category: 'inventory',
      priority: 'urgent',
      action_url: '/account-panel/supplier-payments',
      metadata: {
        po_number: po.po_number,
        po_id: po._id,
        invoice_no: invoice_no,
        event: 'material_inwarded'
      }
    }).catch(err => console.warn('[Inward Delivered Notification Error]:', err.message));

    // 2. Notify Warehouse team that kit assembly is unlocked
    sendAdminNotification({
      title: `🚀 BOS Kit Assembly Unlocked: Stock Ready`,
      message: `PO ${po.po_number} ke inward hone ke baad sabhi raw materials verify ho chuke hain. BOS Kit 5-Stage Assembly Step 3 ab unlocked hai!`,
      category: 'inventory',
      priority: 'high',
      action_url: '/warehouse-panel/bos-kit-assembly',
      metadata: {
        po_number: po.po_number,
        event: 'boskit_assembly_unlocked'
      }
    }).catch(err => console.warn('[Assembly Ready Notification Error]:', err.message));

    return res.status(200).json({ status: "success", message: "Purchase order marked delivered and stock updated with supplier invoice." });
  } catch (err) {
    await session.abortTransaction();
    console.error("Error in mark_purchase_order_delivered:", err);
    return res.status(400).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
};

// ─── 7. Order Fulfillment Inward Progress ──────────────────────────────────────
const get_order_inward_fulfillment = async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    const { EpcOrder, FpoOrder } = require('../../admin-panel/models/india_solarshop_db');
    const { PurchaseOrder, PurchaseIndent } = require('../models/company_warehouse_db');

    const epcQuery = {
      order_status: { $in: ['confirmed', 'processing', 'ready_for_dispatch', 'pending'] }
    };
    const fpoQuery = {
      status: { $in: ['PAID', 'CONFIRMED', 'STOCK_ALLOCATED', 'PROCESSING'] },
      deleted_at: null
    };

    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      epcQuery.warehouse_id = warehouse_id;
      fpoQuery.warehouse_id = warehouse_id;
    }

    const [epcOrders, fpoOrders, existingPOs, existingPIs] = await Promise.all([
      EpcOrder.find(epcQuery)
        .populate('epc_id', 'name email whatsapp company_name')
        .populate('warehouse_id', 'warehouse_code address')
        .sort({ created_at: -1 })
        .limit(100)
        .lean(),
      FpoOrder.find(fpoQuery)
        .populate('franchisee_id', 'business_name name mobile')
        .sort({ created_at: -1 })
        .limit(100)
        .lean(),
      PurchaseOrder.find({
        status: { $in: ['paid', 'delivered'] }
      }).select('po_number procurement_type status source_orders').lean(),
      PurchaseIndent ? PurchaseIndent.find({}).sort({ created_at: -1 }).lean() : []
    ]);

    const poMap = new Map();
    for (const po of existingPOs) {
      const type = po.procurement_type || 'mixed';
      for (const so of po.source_orders || []) {
        if (!so.order_id) continue;
        const idStr = so.order_id.toString();
        if (!poMap.has(idStr)) poMap.set(idStr, {});
        const entry = poMap.get(idStr);
        if (type === 'panel' || type === 'mixed') {
          entry.panel = { po_number: po.po_number, po_status: po.status };
        }
        if (type === 'inverter' || type === 'mixed') {
          entry.inverter = { po_number: po.po_number, po_status: po.status };
        }
      }
    }

    const piMap = new Map();
    for (const pi of (existingPIs || [])) {
      const idKey = (pi.customer_order_id || '').toString();
      const numKey = (pi.customer_order_number || '').toString();
      if (idKey) {
        if (!piMap.has(idKey)) piMap.set(idKey, []);
        piMap.get(idKey).push(pi);
      }
      if (numKey && numKey !== idKey) {
        if (!piMap.has(numKey)) piMap.set(numKey, []);
        piMap.get(numKey).push(pi);
      }
    }

    const mapOrder = (o, orderType) => {
      const idStr = o._id.toString();
      const orderNo = (o.order_number || o.po_number || '').toString();
      const ref = poMap.get(idStr) || {};
      const orderPIs = piMap.get(idStr) || piMap.get(orderNo) || [];

      const panelProc = o.procurement_status?.panel || {};
      const inverterProc = o.procurement_status?.inverter || {};

      let isPanelInwarded = panelProc.status === 'inwarded' || ref.panel?.po_status === 'delivered';
      let isPanelPaid = panelProc.status === 'paid_awaiting_inward' || isPanelInwarded || !!ref.panel;

      let isInverterInwarded = inverterProc.status === 'inwarded' || ref.inverter?.po_status === 'delivered';
      let isInverterPaid = inverterProc.status === 'paid_awaiting_inward' || isInverterInwarded || !!ref.inverter;

      let panelPoNumber = panelProc.po_number || ref.panel?.po_number || null;
      let inverterPoNumber = inverterProc.po_number || ref.inverter?.po_number || null;
      let panelGrnNo = panelProc.inward_grn_no || null;
      let inverterGrnNo = inverterProc.inward_grn_no || null;

      // Check if order has Purchase Indents from the new Procurement Module
      if (orderPIs.length > 0) {
        for (const pi of orderPIs) {
          const piNumber = pi.pi_number;
          const isInward = pi.fulfilment?.supply_status === 'Inward Completed';
          const isPaid = ['Paid', 'Advance Paid'].includes(pi.payment?.payment_status);
          const grn = pi.audit_history?.find(a => a.action === 'INWARD_VERIFIED')?.grn_number || null;

          const hasSolar = (pi.items || []).some(it => (it.category || '').toLowerCase().includes('solar') || (it.sku_code || '').toLowerCase().includes('panel'));
          const hasInverter = (pi.items || []).some(it => (it.category || '').toLowerCase().includes('inverter') || (it.sku_code || '').toLowerCase().includes('inv'));

          if (hasSolar || (!hasSolar && !hasInverter)) {
            panelPoNumber = piNumber;
            if (isInward) isPanelInwarded = true;
            if (isPaid || isInward) isPanelPaid = true;
            if (grn) panelGrnNo = grn;
          }
          if (hasInverter) {
            inverterPoNumber = piNumber;
            if (isInward) isInverterInwarded = true;
            if (isPaid || isInward) isInverterPaid = true;
            if (grn) inverterGrnNo = grn;
          }
        }
      }

      const isBothInwarded = isPanelInwarded && isInverterInwarded;
      const isBothPaid = isPanelPaid && isInverterPaid;

      let overallReadiness = 'awaiting_supplier_payment';
      if (isBothInwarded) {
        overallReadiness = 'ready_for_dispatch';
      } else if (isBothPaid) {
        overallReadiness = 'awaiting_inward';
      }

      return {
        id: o._id,
        order_number: o.order_number || o.po_number,
        order_type: orderType,
        customer_name: orderType === 'epc' 
          ? (o.epc_id?.name || o.epc_id?.company_name || 'EPC Buyer') 
          : (o.franchisee_id?.business_name || o.franchisee_id?.name || 'Franchise Partner'),
        customer_phone: orderType === 'epc' ? (o.epc_id?.whatsapp || o.delivery_address?.contact_phone || '-') : (o.franchisee_id?.mobile || '-'),
        warehouse_code: o.warehouse_id?.warehouse_code || 'WH-01',
        destination: o.delivery_address?.district_name || o.destination_address || 'Direct Site',
        order_status: o.order_status || o.status,
        panel_status: isPanelInwarded ? 'inwarded' : (isPanelPaid ? 'paid_awaiting_inward' : 'pending_payment'),
        panel_po_number: panelPoNumber,
        panel_grn_no: panelGrnNo,
        panel_inward_at: panelProc.inward_at || null,
        inverter_status: isInverterInwarded ? 'inwarded' : (isInverterPaid ? 'paid_awaiting_inward' : 'pending_payment'),
        inverter_po_number: inverterPoNumber,
        inverter_grn_no: inverterGrnNo,
        inverter_inward_at: inverterProc.inward_at || null,
        overall_readiness: overallReadiness,
        created_at: o.created_at || o.createdAt,
        purchase_indents: orderPIs
      };
    };

    const combinedList = [
      ...epcOrders.map(o => mapOrder(o, 'epc')),
      ...fpoOrders.map(o => mapOrder(o, 'franchise'))
    ];

    return res.status(200).json({
      status: 'success',
      data: combinedList,
      summary: {
        total_orders: combinedList.length,
        ready_for_dispatch: combinedList.filter(o => o.overall_readiness === 'ready_for_dispatch').length,
        awaiting_inward: combinedList.filter(o => o.overall_readiness === 'awaiting_inward').length,
        awaiting_payment: combinedList.filter(o => o.overall_readiness === 'awaiting_supplier_payment').length,
      }
    });
  } catch (err) {
    console.error('Error in get_order_inward_fulfillment:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch order inward fulfillment.', error: err.message });
  }
};

module.exports = {
  get_active_skus,
  save_inward,
  get_inward_logs,
  get_stock_status,
  get_warehouse_purchase_orders,
  mark_purchase_order_delivered,
  get_order_inward_fulfillment
};
