const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder.schema');
const ProductSku = require('../models/core_db/product_skus.schema');
const Product = require('../models/core_db/products.schema');
const Brand = require('../models/core_db/brands.schema');
const ProductTemplate = require('../models/core_db/product_templates.schema');
const CompanyWarehouse = require('../models/CompanyWarehouse.schema');

const get_supplier_orders = async (req, res) => {
  try {
    const supplier_id = req.supplier.id;

    const list = await PurchaseOrder.find({ supplier_id })
      .populate('warehouse_id', 'warehouse_code warehouse_type address')
      .sort({ created_at: -1 })
      .lean();

    // Populate SKU details manually
    for (const po of list) {
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
    console.error("Error in get_supplier_orders:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch orders.", error: err.message });
  }
};

const accept_and_invoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoice_no, invoice_date } = req.body;
    const supplier_id = req.supplier.id;

    if (!invoice_no || !invoice_date) {
      return res.status(400).json({ status: "error", message: "Invoice number and invoice date are required." });
    }

    const po = await PurchaseOrder.findOne({ _id: id, supplier_id });
    if (!po) {
      return res.status(404).json({ status: "error", message: "Purchase order not found or unauthorized." });
    }

    if (po.status !== 'pending') {
      return res.status(400).json({ status: "error", message: `Order is already ${po.status}` });
    }

    if (!req.file) {
      return res.status(400).json({ status: "error", message: "Invoice PDF upload is required." });
    }

    // Attach local uploaded file path (relative path or complete URL)
    // The static path matches `/uploads/supplier_invoices/...`
    const relativePath = `/uploads/supplier_invoices/${req.file.filename}`;
    // Derive absolute URL using request host/port
    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}${relativePath}`;

    po.status = 'invoiced';
    // Store in proforma_invoice_* fields (distinct from the tax invoice set at delivery)
    po.proforma_invoice_no   = invoice_no;
    po.proforma_invoice_date = new Date(invoice_date);
    po.proforma_invoice_pdf  = fileUrl;

    await po.save();

    return res.status(200).json({ status: "success", message: "Order accepted and proforma invoice generated successfully.", data: po });
  } catch (err) {
    console.error("Error in accept_and_invoice:", err);
    return res.status(500).json({ status: "error", message: "Failed to accept and invoice order.", error: err.message });
  }
};

module.exports = {
  get_supplier_orders,
  accept_and_invoice
};
