const { BenchmarkPriceRequest, ProductSkuPrice } = require('../models/core_db');
const { CompanyWarehouse, PurchaseOrder } = require('../models/company_warehouse_db');
const { GeoLevel0, GeoLevel2 } = require('../models/geolocation_db');
const { solarkits_core_db } = require('../config/databases');

const get_price_requests = async (req, res) => {
  try {
    const requests = await BenchmarkPriceRequest.find({})
      .sort({ created_at: -1 })
      .populate({
        path: 'sku_id',
        populate: { path: 'product_id' }
      })
      .populate({
        path: 'warehouse_id',
        model: CompanyWarehouse
      })
      .populate({
        path: 'purchase_order_id',
        model: PurchaseOrder
      });

    return res.status(200).json({ status: "success", data: requests });
  } catch (err) {
    console.error("Error in get_price_requests:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch price requests." });
  }
};

const approve_price_request = async (req, res) => {
  const session = await solarkits_core_db.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { updateBenchmarkPrice } = req.body || {};

    const request = await BenchmarkPriceRequest.findById(id).session(session);
    if (!request) {
      return res.status(404).json({ status: "error", message: "Price request not found." });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ status: "error", message: `Request cannot be approved. Current status: ${request.status}` });
    }

    // Update status to approved
    request.status = 'approved';
    await request.save({ session });

    let message = "Price request approved and Price Master updated successfully.";

    // If request is linked to a PO
    if (request.purchase_order_id) {
      const pendingRequests = await BenchmarkPriceRequest.find({
        purchase_order_id: request.purchase_order_id,
        status: 'pending',
        _id: { $ne: request._id }
      }).session(session);

      if (pendingRequests.length === 0) {
        const po = await PurchaseOrder.findById(request.purchase_order_id);
        if (po) {
          po.status = 'pending';
          await po.save();
        }
      }
      message = "Price request approved. Purchase Order has been activated.";
    }

    // Update the permanent Price Master if it is NOT a PO request OR if updateBenchmarkPrice is explicitly true
    if (!request.purchase_order_id || updateBenchmarkPrice) {
      // Resolve warehouse details to get country, state, cluster
      const warehouse = await CompanyWarehouse.findById(request.warehouse_id);
      if (!warehouse) {
        throw new Error("Warehouse linked to request not found.");
      }

      const country_id = warehouse.level_0;
      const state_id = warehouse.level_1;

      // Resolve cluster ID from warehouse level_2 (district)
      const district = await GeoLevel2.findById(warehouse.level_2).populate('cluster');
      const cluster_id = district?.cluster?._id;

      if (!country_id || !state_id || !cluster_id) {
        throw new Error("Failed to resolve location hierarchy (country, state, cluster) for the warehouse.");
      }

      // Fetch country to get currency code
      const country = await GeoLevel0.findById(country_id);
      const currency_code = country?.currency_code || 'INR';

      const updateFields = {
        country_id,
        state_id,
        warehouse_id: request.warehouse_id,
        price: request.requested_price,
        currency_code
      };

      const { ProductSku } = require('../models/core_db');
      const sku = await ProductSku.findById(request.sku_id).session(session);
      if (sku && sku.sku_code && sku.sku_code.startsWith("SOL-")) {
        updateFields.price_per_watt = request.requested_price;
      }

      // Update or insert price in pc_product_sku_prices
      await ProductSkuPrice.findOneAndUpdate(
        { sku_id: request.sku_id, cluster_id },
        { $set: updateFields },
        { upsert: true, session }
      );

      // Dynamic kit pricing update service trigger (if function exists)
      try {
        const { recalculateKitPricesForSku } = require('../services/kit_pricing.service');
        recalculateKitPricesForSku(request.sku_id, request.warehouse_id).catch(err => {
          console.error(`Error recalculating kit prices for SKU ${request.sku_id}:`, err);
        });
      } catch (e) {
        // ignore if not configured or different env
      }

      if (request.purchase_order_id) {
        message = "Price request approved. Purchase Order has been activated and Price Master updated.";
      }
    }

    await session.commitTransaction();
    return res.status(200).json({ status: "success", message });
  } catch (err) {
    await session.abortTransaction();
    console.error("Error in approve_price_request:", err);
    return res.status(500).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
};

const reject_price_request = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BenchmarkPriceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ status: "error", message: "Price request not found." });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ status: "error", message: `Request cannot be rejected. Current status: ${request.status}` });
    }

    // If request is linked to a PO, reject request and cancel linked PO
    if (request.purchase_order_id) {
      request.status = 'rejected';
      await request.save();

      const po = await PurchaseOrder.findById(request.purchase_order_id);
      if (po) {
        po.status = 'cancelled';
        await po.save();
      }

      await BenchmarkPriceRequest.updateMany(
        { purchase_order_id: request.purchase_order_id, status: 'pending' },
        { $set: { status: 'rejected' } }
      );

      return res.status(200).json({ status: "success", message: "Price request rejected. Linked Purchase Order has been cancelled." });
    }

    request.status = 'rejected';
    await request.save();

    return res.status(200).json({ status: "success", message: "Price request rejected successfully." });
  } catch (err) {
    console.error("Error in reject_price_request:", err);
    return res.status(500).json({ status: "error", message: "Failed to reject price request." });
  }
};

module.exports = {
  get_price_requests,
  approve_price_request,
  reject_price_request
};
