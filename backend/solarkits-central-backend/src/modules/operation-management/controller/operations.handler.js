const { BenchmarkPriceRequest, ProductSkuPrice } = require('../models/core_db');

const create_price_request = async (req, res) => {
  try {
    const { sku_id, warehouse_id, requested_price, reason } = req.body;
    if (!sku_id || !warehouse_id || !requested_price || !reason) {
      return res.status(400).json({ status: "error", message: "All fields (sku_id, warehouse_id, requested_price, reason) are required." });
    }

    // Get current price if any
    const priceEntry = await ProductSkuPrice.findOne({ warehouse_id, sku_id });
    const current_benchmark_price = priceEntry ? priceEntry.price : 0;

    const priceReq = await BenchmarkPriceRequest.create({
      sku_id,
      warehouse_id,
      requested_price: Number(requested_price),
      current_benchmark_price,
      reason,
      requested_by: req.user.id,
      status: 'pending'
    });

    return res.status(201).json({ status: "success", message: "Benchmark price request submitted successfully.", data: priceReq });
  } catch (err) {
    console.error("Error in create_price_request:", err);
    return res.status(500).json({ status: "error", message: "Failed to submit price request." });
  }
};

const get_sku_benchmark_info = async (req, res) => {
  try {
    const { sku_id, warehouse_id } = req.query;
    if (!sku_id || !warehouse_id) {
      return res.status(400).json({ status: "error", message: "sku_id and warehouse_id are required." });
    }

    const [priceEntry, pendingReq] = await Promise.all([
      ProductSkuPrice.findOne({ warehouse_id, sku_id }),
      BenchmarkPriceRequest.findOne({ warehouse_id, sku_id, status: 'pending' }).sort({ created_at: -1 })
    ]);

    return res.status(200).json({
      status: "success",
      benchmark_price: priceEntry ? priceEntry.price : 0,
      currency_code: priceEntry ? priceEntry.currency_code : 'INR',
      pending_request: pendingReq ? {
        id: pendingReq._id,
        requested_price: pendingReq.requested_price,
        status: pendingReq.status,
        created_at: pendingReq.created_at
      } : null
    });
  } catch (err) {
    console.error("Error in get_sku_benchmark_info:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch benchmark info." });
  }
};

const { CompanyWarehouse, WarehouseStock, WarehouseInward, PurchaseOrder } = require('../models/company_warehouse_db');
const { ProductSku } = require('../models/core_db');
const ProductAttributeValue = require('../models/core_db/product_attribute_values.schema');
const SubtypeAttribute = require('../models/core_db/subtype_attributes.schema');
const Unit = require('../models/core_db/units.schema');
const AttributeOption = require('../models/core_db/attribute_options.schema');

const get_warehouse_stock_report = async (req, res) => {
  try {
    const warehouses = await CompanyWarehouse.find({ deleted_at: null }).sort({ warehouse_code: 1 }).lean();

    const selectedWarehouseId = req.query.warehouseId;
    if (!selectedWarehouseId) {
      return res.status(200).json({ 
        status: "success", 
        warehouses, 
        currentStock: [], 
        awaitingInwards: [], 
        overdueInwards: [], 
        completedInwards: [] 
      });
    }

    // 1. Fetch current stock
    const stocks = await WarehouseStock.find({ warehouse_id: selectedWarehouseId })
      .populate({
        path: 'sku_id',
        populate: {
          path: 'product_id',
          populate: [
            { path: 'brand_id' },
            { path: 'template_id' }
          ]
        }
      })
      .lean();

    // Fetch attributes in bulk for the SKUs and products
    const skuIds = stocks.map(s => s.sku_id?._id).filter(Boolean);
    const productIds = stocks.map(s => s.sku_id?.product_id?._id || s.sku_id?.product_id).filter(Boolean);

    const allAttrs = await ProductAttributeValue.find({
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

    const currentStock = [];
    for (const stock of stocks) {
      if (!stock.sku_id) continue;
      const sku = stock.sku_id;
      const product = sku.product_id || {};
      const template = product.template_id || {};
      const isSolar = (template.name || '').toLowerCase().includes('solar panel');

      // Fetch latest completed inward for this SKU
      const latestInward = await WarehouseInward.findOne({
        warehouse_id: selectedWarehouseId,
        status: 'approved',
        'items.sku_id': sku._id
      }).sort({ created_at: -1 }).lean();

      let latestPrice = 0;
      let latestPricePerWatt = 0;
      let hasInward = false;

      if (latestInward) {
        const item = latestInward.items.find(it => it.sku_id.toString() === sku._id.toString());
        if (item) {
          latestPrice = item.invoice_price || 0;
          latestPricePerWatt = item.invoice_price_per_watt || 0;
          hasInward = true;
        }
      }

      let averagePrice = isSolar ? stock.average_invoice_price_per_watt : stock.average_invoice_price;
      let comparePrice = isSolar ? latestPricePerWatt : latestPrice;
      
      // Calculate wattage / capacity_w
      let capacity_w = 0;
      let capacity_unit = '';

      const skuIdStr = sku._id.toString();
      const prodIdStr = product._id?.toString() || product.toString();
      const skuAttrs = skuAttrMap[skuIdStr] || [];
      const prodAttrs = productAttrMap[prodIdStr] || [];
      const combinedAttrs = [...skuAttrs, ...prodAttrs];

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

      let priceStatus = 'no_inward';
      if (hasInward) {
        const diff = Math.abs(averagePrice - comparePrice);
        priceStatus = diff < 0.05 ? 'updated' : 'different';
      }

      currentStock.push({
        sku_id: sku._id,
        sku_code: sku.sku_code,
        product_name: product.name || 'N/A',
        brand_name: product.brand_id?.brand_name || 'N/A',
        category: template.name || 'N/A',
        qty: stock.qty,
        total_kw: stock.total_kw,
        average_price: averagePrice,
        latest_price: comparePrice,
        price_status: priceStatus,
        is_solar: isSolar,
        wattage: capacity_w,
        capacity_unit
      });
    }

    // 2. Fetch pending Purchase Orders
    const pendingPOs = await PurchaseOrder.find({
      warehouse_id: selectedWarehouseId,
      status: { $in: ['accepted', 'paid', 'invoiced'] }
    }).populate('supplier_id').lean();

    const awaitingInwards = [];
    const overdueInwards = [];
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    for (const po of pendingPOs) {
      const timelineDateObj = new Date(po.timeline);
      timelineDateObj.setHours(0, 0, 0, 0);
      const isOverdue = timelineDateObj < todayObj;
      const supplierName = po.supplier_id?.company_name || 'N/A';
      
      for (const item of po.items) {
        const sku = await ProductSku.findById(item.sku_id).populate('product_id').lean();
        const pName = sku?.product_id?.name || item.sku_code;

        const record = {
          po_number: po.po_number,
          status: po.status,
          supplier_name: supplierName,
          sku_code: item.sku_code,
          product_name: pName,
          qty: item.qty,
          price: item.order_price,
          timeline: po.timeline,
        };

        if (isOverdue) {
          overdueInwards.push(record);
        } else {
          awaitingInwards.push(record);
        }
      }
    }

    // 3. Fetch completed inwards
    const completedInwards = await WarehouseInward.find({
      warehouse_id: selectedWarehouseId,
      status: 'approved'
    }).sort({ created_at: -1 }).limit(50).lean();

    return res.status(200).json({
      status: "success",
      warehouses,
      currentStock,
      awaitingInwards,
      overdueInwards,
      completedInwards
    });
  } catch (err) {
    console.error("Error in get_warehouse_stock_report:", err);
    return res.status(500).json({ status: "error", message: "Failed to generate warehouse stock report.", error: err.message });
  }
};

module.exports = {
  create_price_request,
  get_sku_benchmark_info,
  get_warehouse_stock_report
};
